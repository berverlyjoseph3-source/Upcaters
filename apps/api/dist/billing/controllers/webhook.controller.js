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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const stripe_service_1 = require("../services/stripe.service");
const subscription_service_1 = require("../services/subscription.service");
const invoice_service_1 = require("../services/invoice.service");
const logger_1 = require("../../utils/logger");
const stripe_config_1 = __importDefault(require("../../config/stripe.config"));
const billing_types_1 = require("../../types/billing.types");
class WebhookController {
    /**
     * POST /api/webhooks/stripe
     * Handle Stripe webhook events
     */
    static async handleStripeWebhook(req, res) {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            logger_1.logger.warn('No Stripe signature found in webhook request');
            res.status(400).json({ error: 'No signature provided' });
            return;
        }
        try {
            // Construct the webhook event
            const event = stripe_service_1.StripeService.constructWebhookEvent(req.body, signature, stripe_config_1.default.webhookSecret);
            logger_1.logger.info({
                eventId: event.id,
                eventType: event.type,
                eventCreated: event.created,
            }, 'Processing Stripe webhook event');
            // Process webhook events
            switch (event.type) {
                case billing_types_1.WebhookEventType.CUSTOMER_SUBSCRIPTION_CREATED:
                    await this.handleSubscriptionCreated(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_SUBSCRIPTION_UPDATED:
                    await this.handleSubscriptionUpdated(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_SUBSCRIPTION_DELETED:
                    await this.handleSubscriptionDeleted(event);
                    break;
                case billing_types_1.WebhookEventType.INVOICE_PAID:
                    await this.handleInvoicePaid(event);
                    break;
                case billing_types_1.WebhookEventType.INVOICE_PAYMENT_FAILED:
                    await this.handleInvoicePaymentFailed(event);
                    break;
                case billing_types_1.WebhookEventType.CHECKOUT_SESSION_COMPLETED:
                    await this.handleCheckoutSessionCompleted(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_CREATED:
                    await this.handleCustomerCreated(event);
                    break;
                case billing_types_1.WebhookEventType.INVOICE_CREATED:
                    await this.handleInvoiceCreated(event);
                    break;
                case billing_types_1.WebhookEventType.CHECKOUT_SESSION_EXPIRED:
                    await this.handleCheckoutSessionExpired(event);
                    break;
                default:
                    logger_1.logger.info({ eventType: event.type }, 'Unhandled webhook event type');
            }
            // Acknowledge receipt of the event
            res.status(200).json({ received: true });
        }
        catch (error) {
            logger_1.logger.error({ error, signature: signature.substring(0, 20) }, 'Stripe webhook verification failed');
            if (error.type === 'StripeSignatureVerificationError') {
                res.status(401).json({ error: 'Invalid signature' });
            }
            else {
                res.status(400).json({ error: 'Webhook error' });
            }
        }
    }
    /**
     * Handle customer.subscription.created event
     */
    static async handleSubscriptionCreated(event) {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        logger_1.logger.info({
            subscriptionId: subscription.id,
            customerId,
            planId: subscription.items.data[0]?.price.id,
        }, 'Subscription created');
        await subscription_service_1.SubscriptionService.syncSubscription(subscription.id, customerId);
    }
    /**
     * Handle customer.subscription.updated event
     */
    static async handleSubscriptionUpdated(event) {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        logger_1.logger.info({
            subscriptionId: subscription.id,
            customerId,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }, 'Subscription updated');
        await subscription_service_1.SubscriptionService.syncSubscription(subscription.id, customerId);
    }
    /**
     * Handle customer.subscription.deleted event
     */
    static async handleSubscriptionDeleted(event) {
        const subscription = event.data.object;
        logger_1.logger.info({ subscriptionId: subscription.id }, 'Subscription deleted');
        await subscription_service_1.SubscriptionService.handleSubscriptionDeletion(subscription.id);
    }
    /**
     * Handle invoice.paid event
     */
    static async handleInvoicePaid(event) {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        logger_1.logger.info({
            invoiceId: invoice.id,
            customerId,
            amount: invoice.amount_paid,
            currency: invoice.currency,
        }, 'Invoice paid');
        await invoice_service_1.InvoiceService.handleSuccessfulPayment(invoice.id, customerId);
    }
    /**
     * Handle invoice.payment_failed event
     */
    static async handleInvoicePaymentFailed(event) {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const failureMessage = invoice.last_payment_error?.message;
        logger_1.logger.warn({
            invoiceId: invoice.id,
            customerId,
            failureMessage,
            attemptCount: invoice.attempt_count,
        }, 'Invoice payment failed');
        await invoice_service_1.InvoiceService.handleFailedPayment(invoice.id, customerId, failureMessage);
    }
    /**
     * Handle checkout.session.completed event
     */
    static async handleCheckoutSessionCompleted(event) {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        logger_1.logger.info({
            sessionId: session.id,
            customerId,
            subscriptionId,
            clientReferenceId: session.client_reference_id,
        }, 'Checkout session completed');
        if (subscriptionId) {
            await subscription_service_1.SubscriptionService.syncSubscription(subscriptionId, customerId);
        }
    }
    /**
     * Handle customer.created event
     */
    static async handleCustomerCreated(event) {
        const customer = event.data.object;
        logger_1.logger.info({
            customerId: customer.id,
            email: customer.email,
        }, 'Customer created');
        // Update user with Stripe customer ID if not already set
        const userId = customer.metadata?.user_id;
        if (userId) {
            const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customer.id },
            });
            logger_1.logger.info({ userId, customerId: customer.id }, 'User updated with Stripe customer ID');
        }
    }
    /**
     * Handle invoice.created event
     */
    static async handleInvoiceCreated(event) {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        logger_1.logger.info({
            invoiceId: invoice.id,
            customerId,
            amount: invoice.amount_due,
            dueDate: invoice.due_date,
        }, 'Invoice created');
        // Store invoice in database for reference
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
        const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
        });
        if (user) {
            await prisma.billingInvoice.upsert({
                where: { stripeInvoiceId: invoice.id },
                update: {
                    amount: invoice.amount_due / 100,
                    currency: invoice.currency,
                    status: invoice.status,
                    pdfUrl: invoice.invoice_pdf,
                    periodStart: new Date(invoice.period_start * 1000),
                    periodEnd: new Date(invoice.period_end * 1000),
                },
                create: {
                    userId: user.id,
                    stripeInvoiceId: invoice.id,
                    invoiceNumber: invoice.number,
                    amount: invoice.amount_due / 100,
                    currency: invoice.currency,
                    status: invoice.status,
                    pdfUrl: invoice.invoice_pdf,
                    periodStart: new Date(invoice.period_start * 1000),
                    periodEnd: new Date(invoice.period_end * 1000),
                },
            });
        }
    }
    /**
     * Handle checkout.session.expired event
     */
    static async handleCheckoutSessionExpired(event) {
        const session = event.data.object;
        logger_1.logger.info({
            sessionId: session.id,
            customerId: session.customer,
        }, 'Checkout session expired');
        // Clean up any temporary data associated with this session
    }
}
exports.WebhookController = WebhookController;
//# sourceMappingURL=webhook.controller.js.map