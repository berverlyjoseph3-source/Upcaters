// enterprise-ai-agent-platform/apps/api/src/billing/controllers/billing.controller.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../../db/client';
import { StripeService } from '../services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { InvoiceService } from '../services/invoice.service';
import { UsageMeteringService } from '../../services/usage-metering.service';
import { PlanGateService } from '../../services/plan-gate.service';
import { BillingAnalyticsService } from '../../services/billing-analytics.service';
import { logger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../middleware/plan-gate.middleware';
import { requirePlanFeature } from '../../middleware/plan-gate.middleware';
import {
  CreateCheckoutSessionDtoSchema,
  CreatePortalSessionDtoSchema,
  UpdateSubscriptionDtoSchema,
  CancelSubscriptionDtoSchema,
  ValidateCouponDtoSchema,
} from '../dto/billing.dto';
import { PlanType, BillingInterval, PLANS_CONFIG, UpdateSubscriptionRequest } from '../../types/billing.types';
import { OVERAGE_PRICING_CONFIG } from '../../types/usage.types';

export class BillingController {
  // ============================================
  // Plan Management
  // ============================================

  /**
   * GET /api/billing/plans
   * Get all available plans with updated pricing and overage info
   */
  static async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = Object.values(PlanType)
        .filter(planId => planId !== 'CUSTOM' || req.query.includeCustom === 'true')
        .map(planId => {
          const planConfig = PLANS_CONFIG[planId];
          const overageConfig = OVERAGE_PRICING_CONFIG[planId] || OVERAGE_PRICING_CONFIG.FREE;

          return {
            id: planId,
            name: planConfig.name,
            description: planConfig.description,
            priceMonthly: planConfig.priceMonthly,
            priceYearly: planConfig.priceYearly,
            currency: planConfig.currency,
            features: planConfig.features,
            limits: planConfig.limits,
            overagePricing: overageConfig,
            estimatedValue: planConfig.estimatedValue,
            isActive: planConfig.isActive,
            popular: planConfig.popular,
            displayOrder: planConfig.displayOrder,
            yearlySavings: planConfig.priceMonthly > 0
              ? Math.round((1 - planConfig.priceYearly / (planConfig.priceMonthly * 12)) * 100)
              : 0,
            monthlyEquivalent: planConfig.priceYearly > 0
              ? Math.round(planConfig.priceYearly / 12)
              : 0,
          };
        })
        .filter(plan => plan.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const comparison = {
        lowestPaidPlan: plans.find(p => p.priceMonthly > 0)?.id || null,
        highestValuePlan: plans.find(p => p.popular)?.id || null,
        totalPlans: plans.length,
        freePlanAvailable: plans.some(p => p.id === 'FREE'),
      };

      res.json({
        success: true,
        data: plans,
        meta: comparison,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get plans');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve plans',
        code: 'PLANS_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/plans/:planId
   * Get details for a specific plan
   */
  static async getPlanById(req: Request, res: Response): Promise<void> {
    try {
      const planId = req.params.planId.toUpperCase();

      if (!PLANS_CONFIG[planId as PlanType]) {
        res.status(404).json({
          success: false,
          error: 'Plan not found',
          code: 'PLAN_NOT_FOUND',
        });
        return;
      }

      const planConfig = PLANS_CONFIG[planId as PlanType];
      const overageConfig = OVERAGE_PRICING_CONFIG[planId] || OVERAGE_PRICING_CONFIG.FREE;

      res.json({
        success: true,
        data: {
          ...planConfig,
          overagePricing: overageConfig,
          savings: planConfig.priceYearly > 0
            ? Math.round((1 - planConfig.priceYearly / (planConfig.priceMonthly * 12)) * 100)
            : 0,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get plan');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve plan',
        code: 'PLAN_ERROR',
      });
    }
  }

  // ============================================
  // Checkout & Subscription
  // ============================================

  /**
   * POST /api/billing/create-checkout
   * Create a Stripe checkout session for subscription purchase
   */
  static async createCheckoutSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const validation = CreateCheckoutSessionDtoSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const { planId, interval, successUrl, cancelUrl, couponCode, trialDays } = validation.data;

      // Validate plan exists and is active
      const planConfig = PLANS_CONFIG[planId];
      if (!planConfig || !planConfig.isActive) {
        res.status(400).json({
          success: false,
          error: `Plan "${planId}" is not available`,
          code: 'INVALID_PLAN',
        });
        return;
      }

      // NOTE: a "prevent downgrading to FREE via checkout" guard used to live
      // here, but CreateCheckoutSessionDtoSchema only accepts
      // STARTER/PROFESSIONAL/ENTERPRISE — FREE can never reach this point,
      // so the check was unreachable dead code (confirmed by the compiler:
      // zero type overlap between planId's type and PlanType.FREE).
      // If user already has this plan, prevent duplicate purchase
      const userPlan = await PlanGateService.getUserPlan(req.user.id);
      if (userPlan.planId === planId) {
        res.status(400).json({
          success: false,
          error: `You are already on the ${planConfig.name} plan`,
          code: 'ALREADY_SUBSCRIBED',
          currentPlan: userPlan.planId,
        });
        return;
      }

      const session = await StripeService.createCheckoutSession({
        planId: planId as PlanType,
        interval: interval as unknown as BillingInterval,
        successUrl: successUrl || `${process.env.APP_URL}/billing/success`,
        cancelUrl: cancelUrl || `${process.env.APP_URL}/billing/cancel`,
        userId: req.user.id,
        couponCode,
        trialDays,
      });

      logger.info({
        userId: req.user.id,
        planId,
        interval,
        sessionId: session.sessionId,
      }, 'Checkout session created');

      res.json({
        success: true,
        data: {
          sessionId: session.sessionId,
          sessionUrl: session.sessionUrl,
          planDetails: {
            name: planConfig.name,
            price: interval === BillingInterval.MONTHLY
              ? planConfig.priceMonthly
              : planConfig.priceYearly,
            interval,
            currency: planConfig.currency,
            overagePricing: OVERAGE_PRICING_CONFIG[planId],
          },
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to create checkout session');
      res.status(500).json({
        success: false,
        error: 'Failed to create checkout session',
        code: 'CHECKOUT_ERROR',
      });
    }
  }

  /**
   * POST /api/billing/create-portal
   * Create a Stripe customer portal session
   */
  static async createPortalSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const validation = CreatePortalSessionDtoSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const session = await StripeService.createPortalSession({
        userId: req.user.id,
        returnUrl: validation.data.returnUrl,
      });

      logger.info({ userId: req.user.id }, 'Customer portal session created');

      res.json({
        success: true,
        data: {
          url: session.url,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to create portal session');
      res.status(500).json({
        success: false,
        error: 'Failed to create customer portal session',
        code: 'PORTAL_ERROR',
      });
    }
  }

  // ============================================
  // Subscription Management
  // ============================================

  /**
   * GET /api/billing/subscription
   * Get current user's subscription details with overage info
   */
  static async getSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const [subscription, overage] = await Promise.all([
        SubscriptionService.getUserSubscription(req.user.id),
        UsageMeteringService.getCurrentOverage(req.user.id),
      ]);

      if (!subscription) {
        const plan = await PlanGateService.getUserPlan(req.user.id);

        res.json({
          success: true,
          data: {
            subscription: null,
            plan: {
              id: plan.planId,
              name: PLANS_CONFIG[plan.planId as PlanType]?.name || 'Free',
              limits: plan.limits,
              overagePricing: plan.overagePricing,
              currentOverage: overage,
            },
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          subscription,
          currentOverage: overage,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get subscription');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscription',
        code: 'SUBSCRIPTION_ERROR',
      });
    }
  }

  /**
   * PUT /api/billing/subscription
   * Update subscription (change plan, cancel, reactivate)
   */
  static async updateSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const validation = UpdateSubscriptionDtoSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      if (validation.data.planId) {
        logger.info({
          userId: req.user.id,
          newPlan: validation.data.planId,
          interval: validation.data.interval,
        }, 'Subscription plan change requested');
      }

      const subscription = await SubscriptionService.updateSubscription(
        req.user.id,
        validation.data as unknown as UpdateSubscriptionRequest
      );

      res.json({
        success: true,
        data: subscription,
        message: validation.data.cancelAtPeriodEnd === false
          ? 'Subscription reactivated successfully'
          : 'Subscription updated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to update subscription');
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription',
        code: 'SUBSCRIPTION_UPDATE_ERROR',
      });
    }
  }

  /**
   * DELETE /api/billing/subscription
   * Cancel subscription
   */
  static async cancelSubscription(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const validation = CancelSubscriptionDtoSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const result = await SubscriptionService.cancelSubscription(
        req.user.id,
        validation.data.atPeriodEnd
      );

      logger.info({
        userId: req.user.id,
        atPeriodEnd: validation.data.atPeriodEnd,
      }, 'Subscription cancelled');

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to cancel subscription');
      res.status(500).json({
        success: false,
        error: 'Failed to cancel subscription',
        code: 'CANCEL_ERROR',
      });
    }
  }

  // ============================================
  // Billing Summary & Overages
  // ============================================

  /**
   * GET /api/billing/summary
   * Get billing summary for dashboard with overage awareness
   */
  static async getBillingSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const summary = await SubscriptionService.getBillingSummary(req.user.id);
      const overage = await UsageMeteringService.getCurrentOverage(req.user.id);
      const plan = await PlanGateService.getUserPlan(req.user.id);
      const usagePercentage = await PlanGateService.getUsagePercentage(req.user.id);

      // Get upgrade recommendation
      let upgradeRecommendation = null;
      if (usagePercentage.aiActions.isOverLimit || usagePercentage.apiCalls.isOverLimit) {
        const optimization = await BillingAnalyticsService.getPricingOptimization(req.user.id);
        if (optimization) {
          upgradeRecommendation = optimization;
        }
      }

      res.json({
        success: true,
        data: {
          ...summary,
          overagePricing: plan.overagePricing,
          currentOverage: overage,
          usagePercentage,
          upgradeRecommendation,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get billing summary');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve billing summary',
        code: 'SUMMARY_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/overage
   * Get current overage charges for the user
   */
  static async getOverage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const overage = await UsageMeteringService.getCurrentOverage(req.user.id);
      const plan = await PlanGateService.getUserPlan(req.user.id);
      const usage = await UsageMeteringService.getCurrentUsage(req.user.id);

      res.json({
        success: true,
        data: {
          ...overage,
          planLimits: plan.limits,
          currentUsage: usage,
          overagePricing: plan.overagePricing,
          resetDate: UsageMeteringService.getBillingPeriodEndDate(),
          billingPeriod: UsageMeteringService.getCurrentBillingPeriod(),
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get overage');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overage data',
        code: 'OVERAGE_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/usage-limits
   * Get current usage and limits with overage pricing
   */
  static async getUsageLimits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const userId = req.user.id;
      const [plan, usage, percentage, overage] = await Promise.all([
        PlanGateService.getUserPlan(userId),
        UsageMeteringService.getCurrentUsage(userId),
        PlanGateService.getUsagePercentage(userId),
        UsageMeteringService.getCurrentOverage(userId),
      ]);

      res.json({
        success: true,
        data: {
          planId: plan.planId,
          limits: {
            aiActions: plan.limits.aiActions,
            apiCalls: plan.limits.apiCalls,
            teamMembers: plan.limits.teamMembers,
            storageGB: plan.limits.storageGB,
          },
          usage: {
            aiActions: usage.aiActions,
            apiCalls: usage.apiCalls,
          },
          percentage: {
            aiActions: percentage.aiActions,
            apiCalls: percentage.apiCalls,
          },
          overagePricing: plan.overagePricing,
          currentOverage: overage,
          resetDate: UsageMeteringService.getBillingPeriodEndDate(),
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage limits');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage limits',
        code: 'USAGE_LIMITS_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/upgrade-recommendation
   * Get personalized upgrade recommendation
   */
  static async getUpgradeRecommendation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const optimization = await BillingAnalyticsService.getPricingOptimization(req.user.id);

      if (!optimization) {
        res.json({
          success: true,
          data: {
            currentPlan: req.user.planId,
            recommendation: 'No changes needed',
            shouldUpgrade: false,
            reasons: ['Your current plan is the most cost-effective option.'],
          },
        });
        return;
      }

      const shouldUpgrade = optimization.recommendedPlan !== optimization.currentPlan;

      res.json({
        success: true,
        data: {
          currentPlan: optimization.currentPlan,
          recommendedPlan: optimization.recommendedPlan,
          currentCost: optimization.currentCost,
          recommendedCost: optimization.recommendedCost,
          currentOverage: optimization.currentOverage,
          projectedOverage: optimization.projectedOverage,
          savingsWithUpgrade: optimization.savingsWithUpgrade,
          savingsPercentage: optimization.savingsPercentage,
          shouldUpgrade,
          upgradeUrl: optimization.upgradeUrl,
          reason: optimization.reason,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get upgrade recommendation');
      res.status(500).json({
        success: false,
        error: 'Failed to get upgrade recommendation',
        code: 'RECOMMENDATION_ERROR',
      });
    }
  }

  // ============================================
  // Invoice Management
  // ============================================

  /**
   * GET /api/billing/invoices
   * Get user's invoice history
   */
  static async getInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const invoices = await InvoiceService.getUserInvoices(req.user.id, limit, offset);

      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get invoices');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve invoices',
        code: 'INVOICES_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/invoices/upcoming
   * Get upcoming invoice with overage estimates
   */
  static async getUpcomingInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const invoice = await InvoiceService.getUpcomingInvoice(req.user.id);
      const overage = await UsageMeteringService.getCurrentOverage(req.user.id);

      res.json({
        success: true,
        data: {
          invoice,
          overageEstimate: overage.totalOverageCost > 0 ? overage : undefined,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get upcoming invoice');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve upcoming invoice',
        code: 'UPCOMING_INVOICE_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/invoices/:invoiceId
   * Get specific invoice by ID
   */
  static async getInvoiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { invoiceId } = req.params;
      const invoice = await InvoiceService.getInvoice(invoiceId);

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get invoice');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve invoice',
        code: 'INVOICE_ERROR',
      });
    }
  }

  /**
   * POST /api/billing/invoices/:invoiceId/retry
   * Retry a failed invoice payment
   */
  static async retryInvoicePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { invoiceId } = req.params;
      const result = await InvoiceService.retryInvoicePayment(invoiceId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
          code: 'RETRY_FAILED',
        });
        return;
      }

      logger.info({ userId: req.user.id, invoiceId }, 'Invoice payment retry initiated');

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to retry invoice payment');
      res.status(500).json({
        success: false,
        error: 'Failed to retry payment',
        code: 'RETRY_ERROR',
      });
    }
  }

  // ============================================
  // Coupon Management
  // ============================================

  /**
   * POST /api/billing/validate-coupon
   * Validate a coupon code with updated pricing display
   */
  static async validateCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = ValidateCouponDtoSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const { couponCode, planId, interval } = validation.data;
      const couponResult = await StripeService.validateCoupon(couponCode);

      if (!couponResult.valid) {
        res.json({
          success: true,
          data: {
            valid: false,
            couponCode,
            error: couponResult.error,
          },
        });
        return;
      }

      let pricingDetails = null;

      if (planId && interval) {
        const planConfig = PLANS_CONFIG[planId];
        if (planConfig) {
          const priceBeforeDiscount = interval === BillingInterval.MONTHLY
            ? planConfig.priceMonthly
            : planConfig.priceYearly;

          let priceAfterDiscount = priceBeforeDiscount;
          let savings = 0;
          let savingsPercentage = 0;

          if (couponResult.discountPercent) {
            savingsPercentage = couponResult.discountPercent;
            priceAfterDiscount = Math.round(priceBeforeDiscount * (1 - savingsPercentage / 100));
            savings = priceBeforeDiscount - priceAfterDiscount;
          } else if (couponResult.discountAmount) {
            priceAfterDiscount = Math.max(0, priceBeforeDiscount - couponResult.discountAmount);
            savings = couponResult.discountAmount;
            savingsPercentage = Math.round((savings / priceBeforeDiscount) * 100);
          }

          const formatPrice = (cents: number): string => {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
            }).format(cents / 100);
          };

          pricingDetails = {
            planId,
            planName: planConfig.name,
            interval: interval || 'month',
            originalPrice: priceBeforeDiscount,
            originalPriceFormatted: formatPrice(priceBeforeDiscount),
            finalPrice: priceAfterDiscount,
            finalPriceFormatted: formatPrice(priceAfterDiscount),
            savings,
            savingsFormatted: formatPrice(savings),
            savingsPercentage,
          };
        }
      }

      res.json({
        success: true,
        data: {
          valid: true,
          couponCode,
          discount: {
            type: couponResult.discountPercent ? 'percentage' : 'fixed_amount',
            percentOff: couponResult.discountPercent,
            amountOff: couponResult.discountAmount,
          },
          pricing: pricingDetails,
          details: {
            couponId: couponResult.couponId,
            expiresAt: couponResult.expiresAt,
            maxRedemptions: couponResult.maxRedemptions,
            timesRedeemed: couponResult.timesRedeemed,
            remaining: couponResult.maxRedemptions
              ? couponResult.maxRedemptions - (couponResult.timesRedeemed ?? 0)
              : undefined,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to validate coupon');
      res.status(500).json({
        success: false,
        error: 'Failed to validate coupon',
        code: 'COUPON_VALIDATION_ERROR',
      });
    }
  }

  // ============================================
  // Payment Methods
  // ============================================

  /**
   * GET /api/billing/payment-methods
   * Get user's payment methods
   */
  static async getPaymentMethods(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        res.json({ success: true, data: [] });
        return;
      }

      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-12-18.acacia',
      });

      const paymentMethods = await stripeClient.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      const customer = await stripeClient.customers.retrieve(user.stripeCustomerId);
      const defaultPaymentMethod = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        brand: pm.card?.brand,
        isDefault: pm.id === defaultPaymentMethod,
      }));

      res.json({
        success: true,
        data: formattedMethods,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get payment methods');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment methods',
        code: 'PAYMENT_METHODS_ERROR',
      });
    }
  }

  /**
   * DELETE /api/billing/payment-methods/:paymentMethodId
   * Detach a payment method
   */
  static async detachPaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { paymentMethodId } = req.params;
      await StripeService.detachPaymentMethod(paymentMethodId);

      logger.info({ userId: req.user.id, paymentMethodId }, 'Payment method detached');

      res.json({
        success: true,
        message: 'Payment method removed successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to detach payment method');
      res.status(500).json({
        success: false,
        error: 'Failed to remove payment method',
        code: 'DETACH_ERROR',
      });
    }
  }

  /**
   * POST /api/billing/payment-methods/:paymentMethodId/default
   * Set a payment method as default
   */
  static async setDefaultPaymentMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { paymentMethodId } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        res.status(400).json({
          success: false,
          error: 'No Stripe customer found',
          code: 'NO_STRIPE_CUSTOMER',
        });
        return;
      }

      await StripeService.setDefaultPaymentMethod(user.stripeCustomerId, paymentMethodId);

      res.json({
        success: true,
        message: 'Default payment method updated',
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to set default payment method');
      res.status(500).json({
        success: false,
        error: 'Failed to set default payment method',
        code: 'PAYMENT_METHOD_ERROR',
      });
    }
  }

  // ============================================
  // Admin Only Billing Routes
  // ============================================

  /**
   * GET /api/billing/admin/report
   * Generate invoice report (admin only)
   */
  static async getAdminReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const report = await InvoiceService.generateInvoiceReport(
        startDate ? new Date(startDate as string) : thirtyDaysAgo,
        endDate ? new Date(endDate as string) : now
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to generate admin report');
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        code: 'REPORT_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/admin/overages
   * Get all users currently in overage territory (admin only)
   */
  static async getAdminOverages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          planId: { not: 'FREE' },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          planId: true,
        },
      });

      const usersWithOverage = [];

      for (const user of users) {
        const overage = await UsageMeteringService.getCurrentOverage(user.id);
        if (overage.totalOverageCost > 0) {
          const plan = await PlanGateService.getUserPlan(user.id);
          const usage = await UsageMeteringService.getCurrentUsage(user.id);

          usersWithOverage.push({
            userId: user.id,
            email: user.email,
            name: user.name,
            planId: user.planId,
            planLimits: plan.limits,
            currentUsage: usage,
            overageDetails: overage,
            overagePricing: plan.overagePricing,
          });
        }
      }

      res.json({
        success: true,
        data: {
          totalUsersWithOverage: usersWithOverage.length,
          users: usersWithOverage.sort((a, b) => b.overageDetails.totalOverageCost - a.overageDetails.totalOverageCost),
          totalOverageRevenue: usersWithOverage.reduce((sum, u) => sum + u.overageDetails.totalOverageCost, 0),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get admin overages');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overage data',
        code: 'OVERAGE_ADMIN_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/admin/revenue
   * Get revenue analytics (admin only)
   */
  static async getAdminRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const { period } = req.query;
      const summary = await BillingAnalyticsService.getBillingMetricsSummary();
      const trends = await BillingAnalyticsService.getRevenueTrend(period as any || 'month');
      const forecast = await BillingAnalyticsService.getRevenueForecast(6);
      const planPerformance = await BillingAnalyticsService.getPlanPerformance();
      const overageAnalytics = await BillingAnalyticsService.getOverageAnalytics();

      res.json({
        success: true,
        data: {
          summary,
          trends,
          forecast,
          planPerformance,
          overageAnalytics,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get admin revenue');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve revenue analytics',
        code: 'REVENUE_ADMIN_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/admin/subscriptions
   * Get all active subscriptions (admin only)
   */
  static async getAdminSubscriptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const subscriptions = await prisma.user.findMany({
        where: {
          stripeSubscriptionId: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          planId: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true,
          planStartedAt: true,
          planExpiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get admin subscriptions');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscriptions',
        code: 'SUBSCRIPTIONS_ADMIN_ERROR',
      });
    }
  }

  /**
   * GET /api/billing/admin/analytics
   * Get comprehensive billing analytics (admin only)
   */
  static async getAdminAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const { type, startDate, endDate } = req.query;

      let data: any = {};

      switch (type) {
        case 'churn':
          data = await BillingAnalyticsService.getChurnAnalysis();
          break;
        case 'ltv':
          data = await BillingAnalyticsService.getCustomerLifetimeValue(
            parseInt(req.query.limit as string) || 50,
            req.query.segment as any
          );
          break;
        case 'overage':
          data = await BillingAnalyticsService.getOverageAnalytics(
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
          );
          break;
        case 'plans':
          data = await BillingAnalyticsService.getPlanPerformance(
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
          );
          break;
        default:
          data = await BillingAnalyticsService.getBillingMetricsSummary(
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
          );
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get admin analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics',
        code: 'ANALYTICS_ADMIN_ERROR',
      });
    }
  }
}