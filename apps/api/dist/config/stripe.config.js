"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeConfig = void 0;
// enterprise-ai-agent-platform/apps/api/src/config/stripe.config.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.stripeConfig = {
    // API Keys
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    // API Configuration
    apiVersion: '2024-12-18.acacia',
    maxNetworkRetries: 3,
    timeout: 30000, // 30 seconds
    // Webhook Configuration
    webhookTolerance: 300, // 5 minutes tolerance for webhook timestamp
    // Product & Price IDs (set these after creating in Stripe Dashboard)
    productIds: {
        free: process.env.STRIPE_FREE_PRODUCT_ID,
        starter: process.env.STRIPE_STARTER_PRODUCT_ID,
        professional: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID,
        enterprise: process.env.STRIPE_ENTERPRISE_PRODUCT_ID,
    },
    priceIds: {
        starterMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
        starterYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
        professionalMonthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
        professionalYearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
        enterpriseMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
        enterpriseYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    },
    // Usage-based price IDs (for overages)
    usagePriceIds: {
        aiActionsOverage: process.env.STRIPE_AI_ACTIONS_OVERAGE_PRICE_ID,
        apiCallsOverage: process.env.STRIPE_API_CALLS_OVERAGE_PRICE_ID,
    },
    // Subscription Settings
    subscription: {
        trialPeriodDays: 14, // Days for free trial on paid plans
        cancelAtPeriodEnd: true, // Default to cancel at period end
        prorationBehavior: 'create_prorations',
        paymentBehavior: 'default_incomplete',
    },
    // Invoice Settings
    invoice: {
        daysUntilDue: 30,
        autoAdvance: true,
        statementDescriptor: 'AI Agent Platform',
        statementDescriptorSuffix: 'AI Platform',
    },
    // Checkout Settings
    checkout: {
        successUrl: `${process.env.APP_URL}/billing/success`,
        cancelUrl: `${process.env.APP_URL}/billing/cancel`,
        allowPromotionCodes: true,
        billingAddressCollection: 'auto',
        paymentMethodTypes: ['card', 'link'],
    },
    // Customer Portal Settings
    customerPortal: {
        configuration: {
            features: {
                customer_update: {
                    allowed_updates: ['address', 'email', 'phone', 'shipping', 'tax_id'],
                    enabled: true,
                },
                invoice_history: { enabled: true },
                payment_method_update: { enabled: true },
                subscription_cancel: { enabled: true, mode: 'at_period_end' },
                subscription_pause: { enabled: true },
                subscription_update: { enabled: true },
            },
            default_return_url: `${process.env.APP_URL}/billing`,
        },
    },
    // Metadata Field Names
    metadataFields: {
        userId: 'user_id',
        planId: 'plan_id',
        environment: 'environment',
        source: 'source',
    },
    // Idempotency Settings
    idempotency: {
        keyPrefix: 'stripe_',
        ttlSeconds: 86400, // 24 hours
    },
    // Webhook Event Types to Handle
    webhookEvents: [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.paid',
        'invoice.payment_failed',
        'checkout.session.completed',
    ],
};
// Validate required configuration
const requiredConfigs = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
];
for (const configKey of requiredConfigs) {
    if (!process.env[configKey]) {
        console.warn(`⚠️  Warning: Missing required environment variable: ${configKey}`);
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`Missing required environment variable: ${configKey}`);
        }
    }
}
// Log configuration status
if (process.env.NODE_ENV !== 'production') {
    console.log('Stripe Configuration:', {
        hasSecretKey: !!exports.stripeConfig.secretKey,
        hasWebhookSecret: !!exports.stripeConfig.webhookSecret,
        hasPublishableKey: !!exports.stripeConfig.publishableKey,
        apiVersion: exports.stripeConfig.apiVersion,
    });
}
exports.default = exports.stripeConfig;
//# sourceMappingURL=stripe.config.js.map