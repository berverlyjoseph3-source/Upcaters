"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = exports.StripeService = void 0;
// enterprise-ai-agent-platform/apps/api/src/billing/services/stripe.service.ts
const stripe_1 = __importDefault(require("stripe"));
const uuid_1 = require("uuid");
const stripe_config_1 = __importDefault(require("../../config/stripe.config"));
const logger_1 = require("../../utils/logger");
const billing_types_1 = require("../../types/billing.types");
const billing_types_2 = require("../../types/billing.types");
// Initialize Stripe with configuration
const stripe = new stripe_1.default(stripe_config_1.default.secretKey, {
    apiVersion: stripe_config_1.default.apiVersion,
    maxNetworkRetries: stripe_config_1.default.maxNetworkRetries,
    timeout: stripe_config_1.default.timeout,
});
exports.stripe = stripe;
class StripeService {
    /**
     * Create a checkout session for subscription purchase
     */
    static async createCheckoutSession(request) {
        try {
            const plan = billing_types_2.PLANS_CONFIG[request.planId];
            if (!plan) {
                throw new Error(`Invalid plan: ${request.planId}`);
            }
            // Get the correct price ID based on interval
            const priceId = request.interval === billing_types_1.BillingInterval.MONTHLY
                ? plan.stripePriceIdMonthly
                : plan.stripePriceIdYearly;
            if (!priceId) {
                throw new Error(`No price ID found for plan ${request.planId} (${request.interval})`);
            }
            // Prepare line items
            const lineItems = [
                {
                    price: priceId,
                    quantity: 1,
                },
            ];
            // Prepare metadata
            const metadata = {
                [stripe_config_1.default.metadataFields.userId]: request.userId || '',
                [stripe_config_1.default.metadataFields.planId]: request.planId,
                [stripe_config_1.default.metadataFields.environment]: process.env.NODE_ENV || 'development',
                checkout_session_id: (0, uuid_1.v4)(),
            };
            // Prepare checkout session parameters
            const sessionParams = {
                mode: 'subscription',
                payment_method_types: stripe_config_1.default.checkout.paymentMethodTypes,
                line_items: lineItems,
                success_url: request.successUrl || stripe_config_1.default.checkout.successUrl,
                cancel_url: request.cancelUrl || stripe_config_1.default.checkout.cancelUrl,
                metadata,
                allow_promotion_codes: stripe_config_1.default.checkout.allowPromotionCodes,
                billing_address_collection: stripe_config_1.default.checkout.billingAddressCollection,
                subscription_data: {
                    trial_period_days: request.trialDays || stripe_config_1.default.subscription.trialPeriodDays,
                    metadata,
                },
                customer_email: request.userId ? undefined : undefined, // Will be set if user not logged in
            };
            // Add coupon if provided
            if (request.couponCode) {
                sessionParams.discounts = [{ coupon: request.couponCode }];
            }
            // Create the checkout session
            const session = await stripe.checkout.sessions.create(sessionParams);
            logger_1.logger.info({
                sessionId: session.id,
                planId: request.planId,
                interval: request.interval,
                userId: request.userId,
            }, 'Checkout session created');
            return {
                sessionId: session.id,
                sessionUrl: session.url,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, request }, 'Failed to create checkout session');
            throw error;
        }
    }
    /**
     * Create a customer portal session for subscription management
     */
    static async createPortalSession(request) {
        try {
            // Get the Stripe customer ID for the user
            const customerId = await this.getCustomerIdByUserId(request.userId);
            if (!customerId) {
                throw new Error(`No Stripe customer found for user: ${request.userId}`);
            }
            // Create portal session
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: request.returnUrl,
            });
            logger_1.logger.info({
                userId: request.userId,
                customerId,
                sessionId: session.id,
            }, 'Customer portal session created');
            return {
                url: session.url,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, request }, 'Failed to create portal session');
            throw error;
        }
    }
    /**
     * Get or create Stripe customer for a user
     */
    static async getOrCreateCustomer(userId, email, name) {
        try {
            // Check if customer already exists
            const existingCustomerId = await this.getCustomerIdByUserId(userId);
            if (existingCustomerId) {
                const customer = await stripe.customers.retrieve(existingCustomerId);
                if (!customer.deleted) {
                    return customer;
                }
            }
            // Create new customer
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    [stripe_config_1.default.metadataFields.userId]: userId,
                    [stripe_config_1.default.metadataFields.environment]: process.env.NODE_ENV || 'development',
                },
            });
            logger_1.logger.info({
                userId,
                customerId: customer.id,
                email,
            }, 'New Stripe customer created');
            return customer;
        }
        catch (error) {
            logger_1.logger.error({ error, userId, email }, 'Failed to get or create customer');
            throw error;
        }
    }
    /**
     * Get Stripe customer ID by user ID from database
     */
    static async getCustomerIdByUserId(userId) {
        // This should query your database for the user's stripe_customer_id
        // Implementation will be in the subscription service
        // For now, return null - will be implemented in the subscription service
        return null;
    }
    /**
     * Cancel subscription at period end
     */
    static async cancelSubscription(subscriptionId, atPeriodEnd = true) {
        try {
            let subscription;
            if (atPeriodEnd) {
                subscription = await stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true,
                });
            }
            else {
                subscription = await stripe.subscriptions.cancel(subscriptionId);
            }
            logger_1.logger.info({
                subscriptionId,
                atPeriodEnd,
                status: subscription.status,
            }, 'Subscription cancelled');
            return subscription;
        }
        catch (error) {
            logger_1.logger.error({ error, subscriptionId }, 'Failed to cancel subscription');
            throw error;
        }
    }
    /**
     * Reactivate a subscription that was set to cancel at period end
     */
    static async reactivateSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
            });
            logger_1.logger.info({ subscriptionId }, 'Subscription reactivated');
            return subscription;
        }
        catch (error) {
            logger_1.logger.error({ error, subscriptionId }, 'Failed to reactivate subscription');
            throw error;
        }
    }
    /**
     * Update subscription plan
     */
    static async updateSubscriptionPlan(subscriptionId, newPriceId, prorationBehavior = 'create_prorations') {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                items: [
                    {
                        id: subscription.items.data[0].id,
                        price: newPriceId,
                    },
                ],
                proration_behavior: prorationBehavior,
            });
            logger_1.logger.info({
                subscriptionId,
                oldPriceId: subscription.items.data[0].price.id,
                newPriceId,
                prorationBehavior,
            }, 'Subscription plan updated');
            return updatedSubscription;
        }
        catch (error) {
            logger_1.logger.error({ error, subscriptionId, newPriceId }, 'Failed to update subscription plan');
            throw error;
        }
    }
    /**
     * Retrieve subscription by ID
     */
    static async getSubscription(subscriptionId) {
        try {
            return await stripe.subscriptions.retrieve(subscriptionId);
        }
        catch (error) {
            logger_1.logger.error({ error, subscriptionId }, 'Failed to retrieve subscription');
            return null;
        }
    }
    /**
     * List invoices for a customer
     */
    static async listInvoices(customerId, limit = 10) {
        try {
            const invoices = await stripe.invoices.list({
                customer: customerId,
                limit,
            });
            return invoices.data;
        }
        catch (error) {
            logger_1.logger.error({ error, customerId }, 'Failed to list invoices');
            throw error;
        }
    }
    /**
     * Get a specific invoice by its Stripe invoice ID
     */
    static async getInvoiceById(invoiceId) {
        try {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            return invoice;
        }
        catch (error) {
            logger_1.logger.error({ error, invoiceId }, 'Failed to retrieve invoice');
            return null;
        }
    }
    /**
     * Get upcoming invoice for a subscription
     */
    static async getUpcomingInvoice(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const upcoming = await stripe.invoices.retrieveUpcoming({
                subscription: subscriptionId,
                subscription_items: subscription.items.data.map(item => ({
                    id: item.id,
                    price: item.price.id,
                    quantity: item.quantity,
                })),
            });
            return upcoming;
        }
        catch (error) {
            logger_1.logger.error({ error, subscriptionId }, 'Failed to get upcoming invoice');
            return null;
        }
    }
    /**
     * Create usage record for metered billing
     */
    static async createUsageRecord(request) {
        try {
            const usageRecord = await stripe.subscriptionItems.createUsageRecord(request.subscriptionItemId, {
                quantity: request.quantity,
                timestamp: request.timestamp,
                action: request.action || 'increment',
            });
            logger_1.logger.info({
                subscriptionItemId: request.subscriptionItemId,
                quantity: request.quantity,
                action: request.action,
            }, 'Usage record created');
            return usageRecord;
        }
        catch (error) {
            logger_1.logger.error({ error, request }, 'Failed to create usage record');
            throw error;
        }
    }
    /**
     * Validate a coupon code
     */
    static async validateCoupon(couponCode) {
        try {
            const coupon = await stripe.coupons.retrieve(couponCode);
            // Check if coupon is valid
            if (!coupon.valid) {
                return {
                    valid: false,
                    error: 'Coupon is no longer valid',
                };
            }
            // Check expiration
            if (coupon.expires_at && coupon.expires_at < Date.now() / 1000) {
                return {
                    valid: false,
                    error: 'Coupon has expired',
                };
            }
            // Check max redemptions
            if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
                return {
                    valid: false,
                    error: 'Coupon has reached maximum redemptions',
                };
            }
            return {
                valid: true,
                couponId: coupon.id,
                discountAmount: coupon.amount_off || undefined,
                discountPercent: coupon.percent_off || undefined,
                expiresAt: coupon.expires_at ? new Date(coupon.expires_at * 1000) : undefined,
                maxRedemptions: coupon.max_redemptions || undefined,
                timesRedeemed: coupon.times_redeemed,
            };
        }
        catch (error) {
            if (error.type === 'invalid_request_error' && error.message.includes('No such coupon')) {
                return {
                    valid: false,
                    error: 'Coupon not found',
                };
            }
            logger_1.logger.error({ error, couponCode }, 'Failed to validate coupon');
            return {
                valid: false,
                error: 'Failed to validate coupon',
            };
        }
    }
    /**
     * Retrieve a payment method
     */
    static async getPaymentMethod(paymentMethodId) {
        try {
            return await stripe.paymentMethods.retrieve(paymentMethodId);
        }
        catch (error) {
            logger_1.logger.error({ error, paymentMethodId }, 'Failed to retrieve payment method');
            return null;
        }
    }
    /**
     * Set default payment method for a customer
     */
    static async setDefaultPaymentMethod(customerId, paymentMethodId) {
        try {
            const customer = await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            logger_1.logger.info({ customerId, paymentMethodId }, 'Default payment method set');
            return customer;
        }
        catch (error) {
            logger_1.logger.error({ error, customerId, paymentMethodId }, 'Failed to set default payment method');
            throw error;
        }
    }
    /**
     * Detach a payment method
     */
    static async detachPaymentMethod(paymentMethodId) {
        try {
            const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
            logger_1.logger.info({ paymentMethodId }, 'Payment method detached');
            return paymentMethod;
        }
        catch (error) {
            logger_1.logger.error({ error, paymentMethodId }, 'Failed to detach payment method');
            throw error;
        }
    }
    /**
     * Construct webhook event from request
     */
    static constructWebhookEvent(payload, signature, secret) {
        try {
            return stripe.webhooks.constructEvent(payload, signature, secret);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to construct webhook event');
            throw error;
        }
    }
    /**
     * Get product by ID
     */
    static async getProduct(productId) {
        try {
            return await stripe.products.retrieve(productId);
        }
        catch (error) {
            logger_1.logger.error({ error, productId }, 'Failed to retrieve product');
            return null;
        }
    }
    /**
     * Get price by ID
     */
    static async getPrice(priceId) {
        try {
            return await stripe.prices.retrieve(priceId);
        }
        catch (error) {
            logger_1.logger.error({ error, priceId }, 'Failed to retrieve price');
            return null;
        }
    }
}
exports.StripeService = StripeService;
//# sourceMappingURL=stripe.service.js.map