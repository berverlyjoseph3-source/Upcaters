"use strict";
// enterprise-ai-agent-platform/apps/api/src/types/billing.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventType = exports.PLANS_CONFIG = exports.InvoiceStatus = exports.SubscriptionStatus = exports.BillingInterval = exports.PlanType = void 0;
/**
 * Subscription plan types
 */
var PlanType;
(function (PlanType) {
    PlanType["FREE"] = "FREE";
    PlanType["STARTER"] = "STARTER";
    PlanType["PROFESSIONAL"] = "PROFESSIONAL";
    PlanType["ENTERPRISE"] = "ENTERPRISE";
    PlanType["CUSTOM"] = "CUSTOM";
})(PlanType || (exports.PlanType = PlanType = {}));
/**
 * Billing interval
 */
var BillingInterval;
(function (BillingInterval) {
    BillingInterval["MONTHLY"] = "month";
    BillingInterval["YEARLY"] = "year";
})(BillingInterval || (exports.BillingInterval = BillingInterval = {}));
/**
 * Subscription status
 */
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "active";
    SubscriptionStatus["PAST_DUE"] = "past_due";
    SubscriptionStatus["UNPAID"] = "unpaid";
    SubscriptionStatus["CANCELLED"] = "cancelled";
    SubscriptionStatus["INCOMPLETE"] = "incomplete";
    SubscriptionStatus["INCOMPLETE_EXPIRED"] = "incomplete_expired";
    SubscriptionStatus["TRIALING"] = "trialing";
    SubscriptionStatus["PAUSED"] = "paused";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
/**
 * Invoice status
 */
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["OPEN"] = "open";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["UNCOLLECTIBLE"] = "uncollectible";
    InvoiceStatus["VOID"] = "void";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
/**
 * All available plans — Updated pricing as per 2025 analysis
 */
exports.PLANS_CONFIG = {
    [PlanType.FREE]: {
        id: PlanType.FREE,
        name: 'Free',
        description: 'Perfect for trying out the platform',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'usd',
        features: [
            '50 AI Actions per month',
            '100 API Calls per month',
            'Email Agent',
            'Calendar Agent',
            'Web Agent',
            'Basic Content Generation',
            'Community Support',
        ],
        limits: {
            aiActions: 50,
            apiCalls: 100,
            teamMembers: 1,
            storageGB: 0.1,
        },
        overagePricing: {
            aiAction: 0,
            apiCall: 0,
            imageGeneration: 0,
            videoGeneration: 0,
        },
        isActive: true,
        displayOrder: 1,
        estimatedValue: '$15 value',
    },
    [PlanType.STARTER]: {
        id: PlanType.STARTER,
        name: 'Starter',
        description: 'For individuals and small teams',
        priceMonthly: 3900, // $39.00 — updated from $29
        priceYearly: 37440, // $374.40 ($31.20/month, 20% off)
        currency: 'usd',
        features: [
            '500 AI Actions per month',
            '2,000 API Calls per month',
            'All FREE features',
            'Drive Agent',
            'Social Media Posting',
            'Task Agent',
            'Priority Support',
        ],
        limits: {
            aiActions: 500,
            apiCalls: 2000,
            teamMembers: 3,
            storageGB: 1,
        },
        overagePricing: {
            aiAction: 0.05,
            apiCall: 0.01,
            imageGeneration: 0.10,
            videoGeneration: 1.00,
        },
        isActive: true,
        displayOrder: 2,
        estimatedValue: '$75 value',
    },
    [PlanType.PROFESSIONAL]: {
        id: PlanType.PROFESSIONAL,
        name: 'Professional',
        description: 'For growing businesses',
        priceMonthly: 12900, // $129.00 — updated from $99
        priceYearly: 123840, // $1,238.40 ($103.20/month, 20% off)
        currency: 'usd',
        features: [
            '2,500 AI Actions per month',
            '15,000 API Calls per month',
            'All STARTER features',
            'Image Generation',
            'Multi-platform Posts',
            'API Access',
            'Email Support',
        ],
        limits: {
            aiActions: 2500,
            apiCalls: 15000,
            teamMembers: 10,
            storageGB: 10,
        },
        overagePricing: {
            aiAction: 0.05,
            apiCall: 0.01,
            imageGeneration: 0.10,
            videoGeneration: 1.00,
        },
        isActive: true,
        displayOrder: 3,
        popular: true,
        estimatedValue: '$250 value',
    },
    [PlanType.ENTERPRISE]: {
        id: PlanType.ENTERPRISE,
        name: 'Enterprise',
        description: 'For large organizations',
        priceMonthly: 59900, // $599.00 — updated from $499
        priceYearly: 575040, // $5,750.40 ($479.20/month, 20% off)
        currency: 'usd',
        features: [
            '10,000 AI Actions per month',
            '50,000 API Calls per month',
            'All PROFESSIONAL features',
            'Video Generation',
            'White-label',
            'Custom Integrations',
            'SLA Guarantee',
            '24/7 Phone Support',
            'Dedicated Account Manager',
        ],
        limits: {
            aiActions: 10000, // Soft cap — was 'unlimited'
            apiCalls: 50000, // Soft cap — was 'unlimited'
            teamMembers: 100,
            storageGB: 100,
        },
        overagePricing: {
            aiAction: 0.02,
            apiCall: 0.005,
            imageGeneration: 0.05,
            videoGeneration: 0.50,
        },
        isActive: true,
        displayOrder: 4,
        estimatedValue: '$1,000+ value',
    },
    [PlanType.CUSTOM]: {
        id: PlanType.CUSTOM,
        name: 'Custom',
        description: 'Tailored for your needs',
        priceMonthly: 0,
        priceYearly: 0,
        currency: 'usd',
        features: [
            'Custom AI Actions',
            'Custom API Calls',
            'All ENTERPRISE features',
            'Custom Integrations',
            'On-premise Deployment',
            'Custom SLA',
        ],
        limits: {
            aiActions: 100000,
            apiCalls: 500000,
            teamMembers: 500,
            storageGB: 1000,
        },
        overagePricing: {
            aiAction: 0.01,
            apiCall: 0.002,
            imageGeneration: 0.03,
            videoGeneration: 0.30,
        },
        isActive: true,
        displayOrder: 5,
    },
};
/**
 * Webhook event types
 */
var WebhookEventType;
(function (WebhookEventType) {
    WebhookEventType["CUSTOMER_CREATED"] = "customer.created";
    WebhookEventType["CUSTOMER_UPDATED"] = "customer.updated";
    WebhookEventType["CUSTOMER_DELETED"] = "customer.deleted";
    WebhookEventType["CUSTOMER_SUBSCRIPTION_CREATED"] = "customer.subscription.created";
    WebhookEventType["CUSTOMER_SUBSCRIPTION_UPDATED"] = "customer.subscription.updated";
    WebhookEventType["CUSTOMER_SUBSCRIPTION_DELETED"] = "customer.subscription.deleted";
    WebhookEventType["INVOICE_CREATED"] = "invoice.created";
    WebhookEventType["INVOICE_PAID"] = "invoice.paid";
    WebhookEventType["INVOICE_PAYMENT_FAILED"] = "invoice.payment_failed";
    WebhookEventType["INVOICE_PAYMENT_SUCCEEDED"] = "invoice.payment_succeeded";
    WebhookEventType["PAYMENT_METHOD_ATTACHED"] = "payment_method.attached";
    WebhookEventType["PAYMENT_METHOD_DETACHED"] = "payment_method.detached";
    WebhookEventType["CHECKOUT_SESSION_COMPLETED"] = "checkout.session.completed";
    WebhookEventType["CHECKOUT_SESSION_EXPIRED"] = "checkout.session.expired";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
//# sourceMappingURL=billing.types.js.map