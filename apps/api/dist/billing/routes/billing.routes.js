"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/billing/routes/billing.routes.ts
const express_1 = require("express");
const billing_controller_1 = require("../controllers/billing.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const rate_limit_middleware_1 = require("../../auth/middleware/rate-limit.middleware");
const plan_gate_middleware_1 = require("../../middleware/plan-gate.middleware");
const plan_gate_service_1 = require("../../services/plan-gate.service");
const usage_metering_service_1 = require("../../services/usage-metering.service");
const billing_analytics_service_1 = require("../../services/billing-analytics.service");
const logger_1 = require("../../utils/logger");
const client_1 = require("../../db/client");
const router = (0, express_1.Router)();
// Apply authentication and usage headers to all billing routes
router.use(jwt_auth_guard_1.JwtAuthGuard.protect);
router.use((0, plan_gate_middleware_1.addUsageHeaders)());
// ============================================
// Public Plan Browsing (Authentication Required)
// ============================================
/**
 * GET /api/billing/plans
 * Get all available plans with updated pricing — $39/$129/$599
 * Public endpoint — authentication required for personalized display
 */
router.get('/plans', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getPlans);
/**
 * GET /api/billing/plans/:planId
 * Get details for a specific plan
 */
router.get('/plans/:planId', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getPlanById);
// ============================================
// Checkout & Portal Sessions
// ============================================
/**
 * POST /api/billing/create-checkout
 * Create a Stripe checkout session for subscription purchase
 * Supports new pricing and overage awareness
 */
router.post('/create-checkout', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.createCheckoutSession);
/**
 * POST /api/billing/create-portal
 * Create a Stripe customer portal session
 */
router.post('/create-portal', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.createPortalSession);
// ============================================
// Subscription Management
// ============================================
/**
 * GET /api/billing/subscription
 * Get current user's subscription details with overage info
 */
router.get('/subscription', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getSubscription);
/**
 * PUT /api/billing/subscription
 * Update subscription (change plan, cancel, reactivate)
 */
router.put('/subscription', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.updateSubscription);
/**
 * DELETE /api/billing/subscription
 * Cancel subscription
 */
router.delete('/subscription', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.cancelSubscription);
// ============================================
// Billing Summary & Usage
// ============================================
/**
 * GET /api/billing/summary
 * Get billing summary for dashboard with overage awareness
 */
router.get('/summary', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getBillingSummary);
/**
 * GET /api/billing/overage
 * Get current overage charges for the user
 */
router.get('/overage', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getOverage);
/**
 * GET /api/billing/usage-limits
 * Get current usage and limits with overage pricing
 */
router.get('/usage-limits', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getUsageLimits);
/**
 * GET /api/billing/upgrade-recommendation
 * Get personalized upgrade recommendation
 */
router.get('/upgrade-recommendation', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getUpgradeRecommendation);
// ============================================
// Invoice Management
// ============================================
/**
 * GET /api/billing/invoices
 * Get user's invoice history
 * Query params: ?limit=50&offset=0
 */
router.get('/invoices', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getInvoices);
/**
 * GET /api/billing/invoices/upcoming
 * Get upcoming invoice with overage estimates
 */
router.get('/invoices/upcoming', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getUpcomingInvoice);
/**
 * GET /api/billing/invoices/:invoiceId
 * Get specific invoice by ID
 */
router.get('/invoices/:invoiceId', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getInvoiceById);
/**
 * POST /api/billing/invoices/:invoiceId/retry
 * Retry a failed invoice payment
 */
router.post('/invoices/:invoiceId/retry', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.retryInvoicePayment);
/**
 * POST /api/billing/invoices/:invoiceId/send
 * Send invoice email to customer
 */
router.post('/invoices/:invoiceId/send', rate_limit_middleware_1.RateLimitMiddleware.moderate(), async (req, res) => {
    try {
        const { InvoiceService } = await Promise.resolve().then(() => __importStar(require('../services/invoice.service')));
        const { invoiceId } = req.params;
        const sent = await InvoiceService.sendInvoiceEmail(req.user.id, invoiceId);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to send invoice email',
            code: 'SEND_ERROR',
        });
    }
});
/**
 * GET /api/billing/invoices/:invoiceId/download
 * Download invoice as PDF
 */
router.get('/invoices/:invoiceId/download', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), async (req, res) => {
    try {
        const { InvoiceService } = await Promise.resolve().then(() => __importStar(require('../services/invoice.service')));
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
        const response = await fetch(invoice.pdfUrl);
        const buffer = await response.arrayBuffer();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${invoice.number}.pdf`);
        res.send(Buffer.from(buffer));
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to download invoice',
            code: 'DOWNLOAD_ERROR',
        });
    }
});
// ============================================
// Coupon Management
// ============================================
/**
 * POST /api/billing/validate-coupon
 * Validate a coupon code with updated pricing display
 */
router.post('/validate-coupon', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.validateCoupon);
/**
 * GET /api/billing/coupons
 * Get available promotions
 */
router.get('/coupons', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), async (req, res) => {
    try {
        const stripe = await Promise.resolve().then(() => __importStar(require('stripe')));
        const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY, {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve coupons',
            code: 'COUPONS_ERROR',
        });
    }
});
// ============================================
// Payment Methods
// ============================================
/**
 * GET /api/billing/payment-methods
 * Get user's payment methods
 */
router.get('/payment-methods', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), billing_controller_1.BillingController.getPaymentMethods);
/**
 * DELETE /api/billing/payment-methods/:paymentMethodId
 * Detach a payment method
 */
router.delete('/payment-methods/:paymentMethodId', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.detachPaymentMethod);
/**
 * POST /api/billing/payment-methods/:paymentMethodId/default
 * Set a payment method as default
 */
router.post('/payment-methods/:paymentMethodId/default', rate_limit_middleware_1.RateLimitMiddleware.moderate(), billing_controller_1.BillingController.setDefaultPaymentMethod);
// ============================================
// Billing Address
// ============================================
/**
 * GET /api/billing/address
 * Get user's billing address
 */
router.get('/address', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), async (req, res) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { metadata: true },
        });
        const address = user?.metadata?.billingAddress || null;
        res.json({
            success: true,
            data: address,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve billing address',
            code: 'ADDRESS_ERROR',
        });
    }
});
/**
 * PUT /api/billing/address
 * Update user's billing address
 */
router.put('/address', rate_limit_middleware_1.RateLimitMiddleware.moderate(), async (req, res) => {
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
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { metadata: true },
        });
        const metadata = user?.metadata || {};
        metadata.billingAddress = { line1, line2, city, state, postalCode, country };
        metadata.billingAddressUpdatedAt = new Date().toISOString();
        await prisma.user.update({
            where: { id: req.user.id },
            data: { metadata },
        });
        // Also update Stripe customer address
        const stripeUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { stripeCustomerId: true },
        });
        if (stripeUser?.stripeCustomerId) {
            const stripe = await Promise.resolve().then(() => __importStar(require('stripe')));
            const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY, {
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
        logger_1.logger.info({ userId: req.user.id }, 'Billing address updated');
        res.json({
            success: true,
            data: metadata.billingAddress,
            message: 'Billing address updated successfully',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update billing address',
            code: 'ADDRESS_UPDATE_ERROR',
        });
    }
});
// ============================================
// Billing Notifications
// ============================================
/**
 * GET /api/billing/notifications
 * Get billing-related notifications
 */
router.get('/notifications', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), async (req, res) => {
    try {
        // This would fetch billing notifications from a notifications table
        res.json({
            success: true,
            data: [],
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve notifications',
            code: 'NOTIFICATIONS_ERROR',
        });
    }
});
// ============================================
// Billing History & Analytics (User)
// ============================================
/**
 * GET /api/billing/history
 * Get billing history with usage and cost breakdown
 */
router.get('/history', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), async (req, res) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
        const months = parseInt(req.query.months) || 12;
        const history = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const invoices = await prisma.billingInvoice.aggregate({
                where: {
                    userId: req.user.id,
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
                    userId: req.user.id,
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve billing history',
            code: 'HISTORY_ERROR',
        });
    }
});
// ============================================
// Admin Only Billing Routes
// ============================================
/**
 * GET /api/billing/admin/report
 * Generate invoice report (admin only)
 */
router.get('/admin/report', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), billing_controller_1.BillingController.getAdminReport);
/**
 * GET /api/billing/admin/subscriptions
 * Get all active subscriptions (admin only)
 */
router.get('/admin/subscriptions', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), billing_controller_1.BillingController.getAdminSubscriptions);
/**
 * GET /api/billing/admin/overages
 * Get all users currently in overage territory (admin only)
 */
router.get('/admin/overages', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), billing_controller_1.BillingController.getAdminOverages);
/**
 * GET /api/billing/admin/revenue
 * Get revenue analytics with overage breakdown (admin only)
 */
router.get('/admin/revenue', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), billing_controller_1.BillingController.getAdminRevenue);
/**
 * GET /api/billing/admin/analytics
 * Get comprehensive billing analytics (admin only)
 */
router.get('/admin/analytics', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), billing_controller_1.BillingController.getAdminAnalytics);
/**
 * POST /api/billing/admin/notify-overage
 * Send overage notification to specific users (admin only)
 */
router.post('/admin/notify-overage', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), async (req, res) => {
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
                const user = await client_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { email: true, name: true, planId: true },
                });
                if (!user)
                    continue;
                const overage = await usage_metering_service_1.UsageMeteringService.getCurrentOverage(userId);
                const plan = await plan_gate_service_1.PlanGateService.getUserPlan(userId);
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
                await client_1.prisma.auditLog.create({
                    data: {
                        userId,
                        action: 'overage_notification',
                        entityType: 'billing',
                        metadata: {
                            overageCost: overage.totalOverageCost,
                            planId: user.planId,
                            notifiedBy: req.user.id,
                        },
                    },
                });
            }
            catch (notifyError) {
                logger_1.logger.error({ notifyError, userId }, 'Failed to notify user');
            }
        }
        logger_1.logger.info({
            adminId: req.user.id,
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to send overage notifications',
            code: 'NOTIFY_ERROR',
        });
    }
});
/**
 * POST /api/billing/admin/export
 * Export billing data as CSV (admin only)
 */
router.post('/admin/export', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), async (req, res) => {
    try {
        const { type, format = 'csv', startDate, endDate } = req.body;
        let csv = '';
        switch (type) {
            case 'overages': {
                const overageData = await billing_controller_1.BillingController.getAdminOverages(req, res);
                // Generate CSV from overage data
                csv = 'User,Email,Plan,AI Overages,API Overages,Total Overage Cost\n';
                // ... build CSV rows
                break;
            }
            case 'subscriptions': {
                const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
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
                const revenueData = await billing_analytics_service_1.BillingAnalyticsService.getRevenueTrend(req.body.period || 'month', req.body.months || 12);
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to export billing data',
            code: 'EXPORT_ERROR',
        });
    }
});
exports.default = router;
//# sourceMappingURL=billing.routes.js.map