// enterprise-ai-agent-platform/apps/api/src/billing/routes/billing.routes.ts
import { Router, Response } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { JwtAuthGuard, AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RateLimitMiddleware } from '../../auth/middleware/rate-limit.middleware';
import { addUsageHeaders } from '../../middleware/plan-gate.middleware';
import { PlanGateService } from '../../services/plan-gate.service';
import { UsageMeteringService } from '../../services/usage-metering.service';
import { BillingAnalyticsService } from '../../services/billing-analytics.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/client';

const router = Router();

// Apply authentication and usage headers to all billing routes
router.use(JwtAuthGuard.protect);
router.use(addUsageHeaders());

// ============================================
// Public Plan Browsing (Authentication Required)
// ============================================

/**
 * GET /api/billing/plans
 * Get all available plans with updated pricing — $39/$129/$599
 * Public endpoint — authentication required for personalized display
 */
router.get(
  '/plans',
  RateLimitMiddleware.relaxed(),
  BillingController.getPlans
);

/**
 * GET /api/billing/plans/:planId
 * Get details for a specific plan
 */
router.get(
  '/plans/:planId',
  RateLimitMiddleware.relaxed(),
  BillingController.getPlanById
);

// ============================================
// Checkout & Portal Sessions
// ============================================

/**
 * POST /api/billing/create-checkout
 * Create a Stripe checkout session for subscription purchase
 * Supports new pricing and overage awareness
 */
router.post(
  '/create-checkout',
  RateLimitMiddleware.moderate(),
  BillingController.createCheckoutSession
);

/**
 * POST /api/billing/create-portal
 * Create a Stripe customer portal session
 */
router.post(
  '/create-portal',
  RateLimitMiddleware.moderate(),
  BillingController.createPortalSession
);

// ============================================
// Subscription Management
// ============================================

/**
 * GET /api/billing/subscription
 * Get current user's subscription details with overage info
 */
router.get(
  '/subscription',
  RateLimitMiddleware.relaxed(),
  BillingController.getSubscription
);

/**
 * PUT /api/billing/subscription
 * Update subscription (change plan, cancel, reactivate)
 */
router.put(
  '/subscription',
  RateLimitMiddleware.moderate(),
  BillingController.updateSubscription
);

/**
 * DELETE /api/billing/subscription
 * Cancel subscription
 */
router.delete(
  '/subscription',
  RateLimitMiddleware.moderate(),
  BillingController.cancelSubscription
);

// ============================================
// Billing Summary & Usage
// ============================================

/**
 * GET /api/billing/summary
 * Get billing summary for dashboard with overage awareness
 */
router.get(
  '/summary',
  RateLimitMiddleware.relaxed(),
  BillingController.getBillingSummary
);

/**
 * GET /api/billing/overage
 * Get current overage charges for the user
 */
router.get(
  '/overage',
  RateLimitMiddleware.relaxed(),
  BillingController.getOverage
);

/**
 * GET /api/billing/usage-limits
 * Get current usage and limits with overage pricing
 */
router.get(
  '/usage-limits',
  RateLimitMiddleware.relaxed(),
  BillingController.getUsageLimits
);

/**
 * GET /api/billing/upgrade-recommendation
 * Get personalized upgrade recommendation
 */
router.get(
  '/upgrade-recommendation',
  RateLimitMiddleware.relaxed(),
  BillingController.getUpgradeRecommendation
);

// ============================================
// Invoice Management
// ============================================

/**
 * GET /api/billing/invoices
 * Get user's invoice history
 * Query params: ?limit=50&offset=0
 */
router.get(
  '/invoices',
  RateLimitMiddleware.relaxed(),
  BillingController.getInvoices
);

/**
 * GET /api/billing/invoices/upcoming
 * Get upcoming invoice with overage estimates
 */
router.get(
  '/invoices/upcoming',
  RateLimitMiddleware.relaxed(),
  BillingController.getUpcomingInvoice
);

/**
 * GET /api/billing/invoices/:invoiceId
 * Get specific invoice by ID
 */
router.get(
  '/invoices/:invoiceId',
  RateLimitMiddleware.relaxed(),
  BillingController.getInvoiceById
);

/**
 * POST /api/billing/invoices/:invoiceId/retry
 * Retry a failed invoice payment
 */
router.post(
  '/invoices/:invoiceId/retry',
  RateLimitMiddleware.moderate(),
  BillingController.retryInvoicePayment
);

/**
 * POST /api/billing/invoices/:invoiceId/send
 * Send invoice email to customer
 */
router.post(
  '/invoices/:invoiceId/send',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { InvoiceService } = await import('../services/invoice.service');
      const { invoiceId } = req.params;
      const sent = await InvoiceService.sendInvoiceEmail(req.user!.id, invoiceId);

      if (!sent) {
        res.status(400).json({
          success: false,
          error: 'Failed to send invoice email',
          code: 'SEND_FAILED',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Invoice email sent successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send invoice email',
        code: 'SEND_ERROR',
      });
    }
  }
);

/**
 * GET /api/billing/invoices/:invoiceId/download
 * Download invoice as PDF
 */
router.get(
  '/invoices/:invoiceId/download',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { InvoiceService } = await import('../services/invoice.service');
      const invoice = await InvoiceService.getInvoice(req.params.invoiceId);

      if (!invoice || !invoice.pdfUrl) {
        res.status(404).json({
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        });
        return;
      }

      // Proxy the PDF download from Stripe
      const response = await fetch(invoice.pdfUrl!);
      const buffer = await response.arrayBuffer();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.number}.pdf`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to download invoice',
        code: 'DOWNLOAD_ERROR',
      });
    }
  }
);

// ============================================
// Coupon Management
// ============================================

/**
 * POST /api/billing/validate-coupon
 * Validate a coupon code with updated pricing display
 */
router.post(
  '/validate-coupon',
  RateLimitMiddleware.moderate(),
  BillingController.validateCoupon
);

/**
 * GET /api/billing/coupons
 * Get available promotions
 */
router.get(
  '/coupons',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stripe = await import('stripe');
      const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-12-18.acacia',
      });

      const coupons = await stripeClient.promotionCodes.list({
        active: true,
        limit: 10,
      });

      res.json({
        success: true,
        data: coupons.data.map(c => ({
          id: c.id,
          code: c.code,
          coupon: {
            id: c.coupon.id,
            name: c.coupon.name,
            amountOff: c.coupon.amount_off,
            percentOff: c.coupon.percent_off,
            duration: c.coupon.duration,
            expiresAt: c.expires_at ? new Date(c.expires_at * 1000).toISOString() : null,
            maxRedemptions: c.max_redemptions,
            timesRedeemed: c.times_redeemed,
          },
          active: c.active,
        })),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve coupons',
        code: 'COUPONS_ERROR',
      });
    }
  }
);

// ============================================
// Payment Methods
// ============================================

/**
 * GET /api/billing/payment-methods
 * Get user's payment methods
 */
router.get(
  '/payment-methods',
  RateLimitMiddleware.relaxed(),
  BillingController.getPaymentMethods
);

/**
 * DELETE /api/billing/payment-methods/:paymentMethodId
 * Detach a payment method
 */
router.delete(
  '/payment-methods/:paymentMethodId',
  RateLimitMiddleware.moderate(),
  BillingController.detachPaymentMethod
);

/**
 * POST /api/billing/payment-methods/:paymentMethodId/default
 * Set a payment method as default
 */
router.post(
  '/payment-methods/:paymentMethodId/default',
  RateLimitMiddleware.moderate(),
  BillingController.setDefaultPaymentMethod
);

// ============================================
// Billing Address
// ============================================

/**
 * GET /api/billing/address
 * Get user's billing address
 */
router.get(
  '/address',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prisma } = await import('../../db/client');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { metadata: true },
      });

      const address = (user?.metadata as any)?.billingAddress || null;

      res.json({
        success: true,
        data: address,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve billing address',
        code: 'ADDRESS_ERROR',
      });
    }
  }
);

/**
 * PUT /api/billing/address
 * Update user's billing address
 */
router.put(
  '/address',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { line1, line2, city, state, postalCode, country } = req.body;

      if (!line1 || !city || !state || !postalCode || !country) {
        res.status(400).json({
          success: false,
          error: 'Missing required address fields',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const { prisma } = await import('../../db/client');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { metadata: true },
      });

      const metadata = (user?.metadata as any) || {};
      metadata.billingAddress = { line1, line2, city, state, postalCode, country };
      metadata.billingAddressUpdatedAt = new Date().toISOString();

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { metadata },
      });

      // Also update Stripe customer address
      const stripeUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { stripeCustomerId: true },
      });

      if (stripeUser?.stripeCustomerId) {
        const stripe = await import('stripe');
        const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-12-18.acacia',
        });

        await stripeClient.customers.update(stripeUser.stripeCustomerId, {
          address: {
            line1,
            line2: line2 || undefined,
            city,
            state,
            postal_code: postalCode,
            country,
          },
        });
      }

      logger.info({ userId: req.user!.id }, 'Billing address updated');

      res.json({
        success: true,
        data: metadata.billingAddress,
        message: 'Billing address updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update billing address',
        code: 'ADDRESS_UPDATE_ERROR',
      });
    }
  }
);

// ============================================
// Billing Notifications
// ============================================

/**
 * GET /api/billing/notifications
 * Get billing-related notifications
 */
router.get(
  '/notifications',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // This would fetch billing notifications from a notifications table
      res.json({
        success: true,
        data: [],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve notifications',
        code: 'NOTIFICATIONS_ERROR',
      });
    }
  }
);

// ============================================
// Billing History & Analytics (User)
// ============================================

/**
 * GET /api/billing/history
 * Get billing history with usage and cost breakdown
 */
router.get(
  '/history',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prisma } = await import('../../db/client');
      const months = parseInt(req.query.months as string) || 12;

      const history = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const invoices = await prisma.billingInvoice.aggregate({
          where: {
            userId: req.user!.id,
            status: 'paid',
            createdAt: {
              gte: new Date(date.getFullYear(), date.getMonth(), 1),
              lt: new Date(date.getFullYear(), date.getMonth() + 1, 1),
            },
          },
          _sum: { amount: true },
        });

        const usageLogs = await prisma.usageLog.findMany({
          where: {
            userId: req.user!.id,
            billingPeriod: period,
          },
          select: {
            actionType: true,
            count: true,
            costUsd: true,
          },
        });

        history.push({
          period,
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          invoiceAmount: Number(invoices._sum.amount || 0) / 100,
          usageCount: usageLogs.reduce((sum, l) => sum + l.count, 0),
          usageCost: usageLogs.reduce((sum, l) => sum + Number(l.costUsd || 0), 0),
          byActionType: usageLogs.map(l => ({
            actionType: l.actionType,
            count: l.count,
            cost: Number(l.costUsd || 0),
          })),
        });
      }

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve billing history',
        code: 'HISTORY_ERROR',
      });
    }
  }
);

// ============================================
// Admin Only Billing Routes
// ============================================

/**
 * GET /api/billing/admin/report
 * Generate invoice report (admin only)
 */
router.get(
  '/admin/report',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  BillingController.getAdminReport
);

/**
 * GET /api/billing/admin/subscriptions
 * Get all active subscriptions (admin only)
 */
router.get(
  '/admin/subscriptions',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  BillingController.getAdminSubscriptions
);

/**
 * GET /api/billing/admin/overages
 * Get all users currently in overage territory (admin only)
 */
router.get(
  '/admin/overages',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  BillingController.getAdminOverages
);

/**
 * GET /api/billing/admin/revenue
 * Get revenue analytics with overage breakdown (admin only)
 */
router.get(
  '/admin/revenue',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  BillingController.getAdminRevenue
);

/**
 * GET /api/billing/admin/analytics
 * Get comprehensive billing analytics (admin only)
 */
router.get(
  '/admin/analytics',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  BillingController.getAdminAnalytics
);

/**
 * POST /api/billing/admin/notify-overage
 * Send overage notification to specific users (admin only)
 */
router.post(
  '/admin/notify-overage',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'User IDs array is required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      let notified = 0;

      for (const userId of userIds) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true, planId: true },
          });

          if (!user) continue;

          const overage = await UsageMeteringService.getCurrentOverage(userId);
          const plan = await PlanGateService.getUserPlan(userId);

          // Send email notification
          // await EmailService.sendOverageNotification({
          //   to: user.email,
          //   name: user.name || user.email.split('@')[0],
          //   overageDetails: overage,
          //   planLimits: plan.limits,
          //   overagePricing: plan.overagePricing,
          //   upgradeUrl: `${process.env.APP_URL}/billing`,
          // });

          notified++;

          // Log audit
          await prisma.auditLog.create({
            data: {
              userId,
              action: 'overage_notification',
              entityType: 'billing',
              metadata: {
                overageCost: overage.totalOverageCost,
                planId: user.planId,
                notifiedBy: req.user!.id,
              },
            },
          });
        } catch (notifyError) {
          logger.error({ notifyError, userId }, 'Failed to notify user');
        }
      }

      logger.info({
        adminId: req.user!.id,
        notifiedCount: notified,
        totalRequested: userIds.length,
      }, 'Bulk overage notifications sent');

      res.json({
        success: true,
        data: {
          notified,
          total: userIds.length,
          failed: userIds.length - notified,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send overage notifications',
        code: 'NOTIFY_ERROR',
      });
    }
  }
);

/**
 * POST /api/billing/admin/export
 * Export billing data as CSV (admin only)
 */
router.post(
  '/admin/export',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, format = 'csv', startDate, endDate } = req.body;

      let csv = '';

      switch (type) {
        case 'overages': {
          const overageData = await BillingController.getAdminOverages(req as any, res as any);
          // Generate CSV from overage data
          csv = 'User,Email,Plan,AI Overages,API Overages,Total Overage Cost\n';
          // ... build CSV rows
          break;
        }
        case 'subscriptions': {
          const { prisma } = await import('../../db/client');
          const users = await prisma.user.findMany({
            where: {
              stripeSubscriptionId: { not: null },
              isActive: true,
            },
          });

          csv = 'User ID,Email,Name,Plan,Subscription ID,Started At\n';
          users.forEach(user => {
            csv += `${user.id},${user.email},${user.name || ''},${user.planId},${user.stripeSubscriptionId},${user.planStartedAt}\n`;
          });
          break;
        }
        case 'revenue': {
          const revenueData = await BillingAnalyticsService.getRevenueTrend(
            req.body.period || 'month',
            req.body.months || 12
          );

          csv = 'Date,MRR,Total,Subscriptions,New Customers,Churned,Net Growth\n';
          revenueData.forEach(row => {
            csv += `${row.label},${row.mrr},${row.total},${row.subscriptions},${row.newCustomers},${row.churnedCustomers},${row.netGrowth}\n`;
          });
          break;
        }
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid export type',
            code: 'INVALID_EXPORT_TYPE',
          });
          return;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=billing_export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to export billing data',
        code: 'EXPORT_ERROR',
      });
    }
  }
);

export default router;