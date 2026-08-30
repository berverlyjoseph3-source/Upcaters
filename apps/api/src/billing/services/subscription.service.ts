// enterprise-ai-agent-platform/apps/api/src/billing/services/subscription.service.ts
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { StripeService, stripe } from './stripe.service';
import { PlanGateService } from '../../services/plan-gate.service';
import { 
  PlanType, 
  BillingInterval, 
  SubscriptionStatus,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
  BillingSummary,
  InvoiceSummary,
} from '../../types/billing.types';
import { PLANS_CONFIG } from '../../types/billing.types';

export class SubscriptionService {
  /**
   * Get subscription for a user
   */
  static async getUserSubscription(userId: string): Promise<SubscriptionResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          stripeSubscriptionId: true,
          planId: true,
          planStartedAt: true,
          planExpiresAt: true,
        },
      });

      if (!user || !user.stripeSubscriptionId) {
        return null;
      }

      // Get latest subscription from Stripe
      const stripeSubscription = await StripeService.getSubscription(user.stripeSubscriptionId);
      
      if (!stripeSubscription) {
        return null;
      }

      return {
        id: stripeSubscription.id,
        userId: user.id,
        stripeSubscriptionId: stripeSubscription.id,
        planId: user.planId as PlanType,
        status: this.mapStripeStatus(stripeSubscription.status),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : undefined,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : undefined,
        priceAmount: stripeSubscription.items.data[0]?.price.unit_amount || 0,
        priceCurrency: stripeSubscription.items.data[0]?.price.currency || 'usd',
        interval: stripeSubscription.items.data[0]?.price.recurring?.interval === 'year' 
          ? BillingInterval.YEARLY 
          : BillingInterval.MONTHLY,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user subscription');
      return null;
    }
  }

  /**
   * Sync subscription from Stripe webhook to database
   */
  static async syncSubscription(
    stripeSubscriptionId: string,
    customerId: string
  ): Promise<void> {
    try {
      const stripeSubscription = await StripeService.getSubscription(stripeSubscriptionId);
      
      if (!stripeSubscription) {
        logger.warn({ stripeSubscriptionId }, 'Stripe subscription not found');
        return;
      }

      // Find user by Stripe customer ID
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) {
        logger.warn({ customerId, stripeSubscriptionId }, 'User not found for subscription sync');
        return;
      }

      // Determine plan from price ID
      const priceId = stripeSubscription.items.data[0]?.price.id;
      const planId = this.getPlanIdFromPriceId(priceId);

      // Update user's plan in database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          planId: planId,
          stripeSubscriptionId: stripeSubscription.id,
          planStartedAt: new Date(stripeSubscription.current_period_start * 1000),
          planExpiresAt: stripeSubscription.cancel_at_period_end 
            ? new Date(stripeSubscription.current_period_end * 1000)
            : null,
          updatedAt: new Date(),
        },
      });

      // Clear plan cache
      PlanGateService.clearUserPlanCache(user.id);

      // Create plan history entry
      await prisma.planHistory.create({
        data: {
          userId: user.id,
          oldPlan: user.planId,
          newPlan: planId,
          changedBy: 'stripe',
          reason: `Subscription ${stripeSubscription.status} from Stripe`,
          stripeEventId: stripeSubscription.id,
        },
      });

      logger.info({
        userId: user.id,
        oldPlan: user.planId,
        newPlan: planId,
        stripeSubscriptionId,
      }, 'Subscription synced to database');

    } catch (error) {
      logger.error({ error, stripeSubscriptionId, customerId }, 'Failed to sync subscription');
      throw error;
    }
  }

  /**
   * Update subscription (change plan, cancel, reactivate)
   */
  static async updateSubscription(
    userId: string,
    request: UpdateSubscriptionRequest
  ): Promise<SubscriptionResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true },
      });

      if (!user?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      let updatedStripeSubscription;

      // Handle plan change
      if (request.planId) {
        const plan = PLANS_CONFIG[request.planId];
        const priceId = request.interval === BillingInterval.MONTHLY
          ? plan.stripePriceIdMonthly
          : plan.stripePriceIdYearly;

        if (!priceId) {
          throw new Error(`No price ID found for plan ${request.planId}`);
        }

        updatedStripeSubscription = await StripeService.updateSubscriptionPlan(
          user.stripeSubscriptionId,
          priceId,
          request.prorationBehavior
        );
      }
      // Handle cancellation
      else if (request.cancelAtPeriodEnd !== undefined) {
        if (request.cancelAtPeriodEnd) {
          updatedStripeSubscription = await StripeService.cancelSubscription(
            user.stripeSubscriptionId,
            true
          );
        } else {
          updatedStripeSubscription = await StripeService.reactivateSubscription(
            user.stripeSubscriptionId
          );
        }
      }
      else {
        // Just refresh the subscription
        updatedStripeSubscription = await StripeService.getSubscription(
          user.stripeSubscriptionId
        );
      }

      if (!updatedStripeSubscription) {
        throw new Error('Failed to update subscription');
      }

      // Sync to database
      await this.syncSubscription(
        updatedStripeSubscription.id,
        updatedStripeSubscription.customer as string
      );

      // Get updated subscription
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        throw new Error('Failed to retrieve updated subscription');
      }

      logger.info({ userId, request }, 'Subscription updated successfully');

      return subscription;

    } catch (error) {
      logger.error({ error, userId, request }, 'Failed to update subscription');
      throw error;
    }
  }

  /**
   * Get billing summary for dashboard
   */
  static async getBillingSummary(userId: string): Promise<BillingSummary> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          planId: true,
          stripeSubscriptionId: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const planConfig = PLANS_CONFIG[user.planId as PlanType];
      const subscription = await this.getUserSubscription(userId);
      const usage = await this.getUsageForBilling(userId);
      const invoices = await this.getRecentInvoices(userId);

      const percentageUsed = (usage.aiActionsUsed / usage.aiActionsLimit) * 100;

      return {
        currentPlan: {
          id: user.planId as PlanType,
          name: planConfig.name,
          features: planConfig.features,
          limits: {
            aiActions: planConfig.limits.aiActions,
            apiCalls: planConfig.limits.apiCalls,
          },
          overagePricing: planConfig.overagePricing,
        },
        subscription: subscription ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          priceAmount: subscription.priceAmount,
          interval: subscription.interval,
        } : {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          priceAmount: 0,
          interval: BillingInterval.MONTHLY,
        },
        usage,
        invoices,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get billing summary');
      throw error;
    }
  }

  /**
   * Get usage data for billing display
   */
  private static async getUsageForBilling(userId: string): Promise<{
    aiActionsUsed: number;
    aiActionsLimit: number;
    apiCallsUsed: number;
    apiCallsLimit: number;
    percentageUsed: number;
  }> {
    try {
      const { UsageMeteringService } = await import('../../services/usage-metering.service');
      const { PlanGateService } = await import('../../services/plan-gate.service');
      
      const usage = await UsageMeteringService.getCurrentUsage(userId);
      const planLimits = await PlanGateService.getUserPlan(userId);
      
      const aiLimit = planLimits.limits.aiActions;
      const apiLimit = planLimits.limits.apiCalls;
      
      const aiPercentage = (usage.aiActions / aiLimit) * 100;
      
      return {
        aiActionsUsed: usage.aiActions,
        aiActionsLimit: aiLimit,
        apiCallsUsed: usage.apiCalls,
        apiCallsLimit: apiLimit,
        percentageUsed: Math.min(aiPercentage, 100),
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get usage for billing');
      return {
        aiActionsUsed: 0,
        aiActionsLimit: 0,
        apiCallsUsed: 0,
        apiCallsLimit: 0,
        percentageUsed: 0,
      };
    }
  }

  /**
   * Get recent invoices for a user
   */
  private static async getRecentInvoices(userId: string, limit: number = 10): Promise<InvoiceSummary[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        return [];
      }

      const invoices = await StripeService.listInvoices(user.stripeCustomerId, limit);
      
      return invoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number || invoice.id.slice(-8),
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: invoice.status as any,
        pdfUrl: invoice.invoice_pdf ?? null,
        created: new Date(invoice.created * 1000),
        paidAt: invoice.status_transitions?.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : undefined,
        dueDate: invoice.due_date 
          ? new Date(invoice.due_date * 1000)
          : undefined,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get recent invoices');
      return [];
    }
  }

  /**
   * Cancel subscription (immediate or at period end)
   */
  static async cancelSubscription(
    userId: string,
    atPeriodEnd: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true, planId: true },
      });

      if (!user?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      // If user is on FREE plan, nothing to cancel
      if (user.planId === 'FREE') {
        return {
          success: false,
          message: 'You are already on the Free plan',
        };
      }

      await StripeService.cancelSubscription(user.stripeSubscriptionId, atPeriodEnd);

      if (!atPeriodEnd) {
        // Immediate cancellation - downgrade to FREE now
        await prisma.user.update({
          where: { id: userId },
          data: {
            planId: 'FREE',
            stripeSubscriptionId: null,
            updatedAt: new Date(),
          },
        });
        
        PlanGateService.clearUserPlanCache(userId);
      }

      logger.info({ userId, atPeriodEnd }, 'Subscription cancelled');

      return {
        success: true,
        message: atPeriodEnd 
          ? 'Your subscription will be cancelled at the end of the billing period'
          : 'Your subscription has been cancelled immediately',
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to cancel subscription');
      throw error;
    }
  }

  /**
   * Map Stripe status to internal status
   */
  private static mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      unpaid: SubscriptionStatus.UNPAID,
      canceled: SubscriptionStatus.CANCELLED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      trialing: SubscriptionStatus.TRIALING,
      paused: SubscriptionStatus.PAUSED,
    };
    
    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }

  /**
   * Determine plan ID from Stripe price ID
   */
  private static getPlanIdFromPriceId(priceId: string): string {
    const priceMap: Record<string, string> = {
      [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!]: 'STARTER',
      [process.env.STRIPE_STARTER_YEARLY_PRICE_ID!]: 'STARTER',
      [process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID!]: 'PROFESSIONAL',
      [process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID!]: 'PROFESSIONAL',
      [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!]: 'ENTERPRISE',
      [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!]: 'ENTERPRISE',
    };
    
    return priceMap[priceId] || 'FREE';
  }

  /**
   * Handle subscription cancellation webhook
   */
  static async handleSubscriptionDeletion(stripeSubscriptionId: string): Promise<void> {
    try {
      const user = await prisma.user.findFirst({
        where: { stripeSubscriptionId },
      });

      if (!user) {
        logger.warn({ stripeSubscriptionId }, 'User not found for subscription deletion');
        return;
      }

      // Downgrade to FREE plan
      await prisma.user.update({
        where: { id: user.id },
        data: {
          planId: 'FREE',
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        },
      });

      // Create plan history entry
      await prisma.planHistory.create({
        data: {
          userId: user.id,
          oldPlan: user.planId,
          newPlan: 'FREE',
          changedBy: 'stripe',
          reason: 'Subscription deleted',
          stripeEventId: stripeSubscriptionId,
        },
      });

      // Clear cache
      PlanGateService.clearUserPlanCache(user.id);

      logger.info({ userId: user.id, oldPlan: user.planId }, 'User downgraded to FREE due to subscription deletion');
    } catch (error) {
      logger.error({ error, stripeSubscriptionId }, 'Failed to handle subscription deletion');
      throw error;
    }
  }

  /**
   * Get all users with expiring trials
   */
  static async getUsersWithExpiringTrials(daysThreshold: number = 3): Promise<Array<{ userId: string; email: string; trialEndsAt: Date }>> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
      
      const users = await prisma.user.findMany({
        where: {
          planId: { not: 'FREE' },
          planExpiresAt: {
            lte: thresholdDate,
            gt: new Date(),
          },
        },
        select: {
          id: true,
          email: true,
          planExpiresAt: true,
        },
      });

      return users.map(user => ({
        userId: user.id,
        email: user.email,
        trialEndsAt: user.planExpiresAt!,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get users with expiring trials');
      return [];
    }
  }
}