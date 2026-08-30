"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookHandler = void 0;
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
const subscription_service_1 = require("../services/subscription.service");
const invoice_service_1 = require("../services/invoice.service");
const billing_types_1 = require("../../types/billing.types");
class StripeWebhookHandler {
    /**
     * Main handler for all Stripe webhook events
     * Uses idempotency to prevent duplicate processing
     */
    static async handleEvent(event) {
        const eventId = event.id;
        const eventType = event.type;
        logger_1.logger.info({ eventId, eventType }, 'Processing Stripe webhook event');
        try {
            // Check for duplicate processing
            const existingEvent = await client_1.prisma.webhookEvent.findUnique({
                where: { eventId },
            });
            if (existingEvent && existingEvent.processed) {
                logger_1.logger.info({ eventId, eventType }, 'Duplicate webhook event, skipping');
                return {
                    processed: false,
                    success: true,
                    eventId,
                    eventType,
                    message: 'Duplicate event skipped',
                };
            }
            // Store the event if not exists
            if (!existingEvent) {
                await client_1.prisma.webhookEvent.create({
                    data: {
                        eventId,
                        eventType,
                        source: 'stripe',
                        payload: event,
                        processed: false,
                    },
                });
            }
            // Process based on event type
            let result;
            switch (eventType) {
                case billing_types_1.WebhookEventType.CUSTOMER_SUBSCRIPTION_CREATED:
                    result = await this.handleSubscriptionCreated(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_SUBSCRIPTION_UPDATED:
                    result = await this.handleSubscriptionUpdated(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_SUBSCRIPTION_DELETED:
                    result = await this.handleSubscriptionDeleted(event);
                    break;
                case billing_types_1.WebhookEventType.INVOICE_PAID:
                    result = await this.handleInvoicePaid(event);
                    break;
                case billing_types_1.WebhookEventType.INVOICE_PAYMENT_FAILED:
                    result = await this.handleInvoicePaymentFailed(event);
                    break;
                case billing_types_1.WebhookEventType.CHECKOUT_SESSION_COMPLETED:
                    result = await this.handleCheckoutSessionCompleted(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_CREATED:
                    result = await this.handleCustomerCreated(event);
                    break;
                case billing_types_1.WebhookEventType.CUSTOMER_UPDATED:
                    result = await this.handleCustomerUpdated(event);
                    break;
                case billing_types_1.WebhookEventType.INVOICE_CREATED:
                    result = await this.handleInvoiceCreated(event);
                    break;
                case billing_types_1.WebhookEventType.CHECKOUT_SESSION_EXPIRED:
                    result = await this.handleCheckoutSessionExpired(event);
                    break;
                case billing_types_1.WebhookEventType.PAYMENT_METHOD_ATTACHED:
                    result = await this.handlePaymentMethodAttached(event);
                    break;
                case billing_types_1.WebhookEventType.PAYMENT_METHOD_DETACHED:
                    result = await this.handlePaymentMethodDetached(event);
                    break;
                default:
                    logger_1.logger.info({ eventType }, 'Unhandled webhook event type');
                    result = {
                        processed: true,
                        success: true,
                        eventId,
                        eventType,
                        message: 'Event type not handled but acknowledged',
                    };
            }
            // Mark event as processed
            await client_1.prisma.webhookEvent.update({
                where: { eventId },
                data: {
                    processed: true,
                    processedAt: new Date(),
                },
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error({ error, eventId, eventType }, 'Webhook processing failed');
            // Update event with error
            await client_1.prisma.webhookEvent.update({
                where: { eventId },
                data: {
                    processingError: error instanceof Error ? error.message : 'Unknown error',
                },
            });
            return {
                processed: false,
                success: false,
                eventId,
                eventType,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
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
            status: subscription.status,
        }, 'Subscription created');
        await subscription_service_1.SubscriptionService.syncSubscription(subscription.id, customerId);
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Subscription ${subscription.id} synced successfully`,
        };
    }
    /**
     * Handle customer.subscription.updated event
     */
    static async handleSubscriptionUpdated(event) {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const previousAttributes = event.data.previous_attributes;
        logger_1.logger.info({
            subscriptionId: subscription.id,
            customerId,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            previousAttributes,
        }, 'Subscription updated');
        await subscription_service_1.SubscriptionService.syncSubscription(subscription.id, customerId);
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Subscription ${subscription.id} updated successfully`,
        };
    }
    /**
     * Handle customer.subscription.deleted event
     */
    static async handleSubscriptionDeleted(event) {
        const subscription = event.data.object;
        logger_1.logger.info({ subscriptionId: subscription.id }, 'Subscription deleted');
        await subscription_service_1.SubscriptionService.handleSubscriptionDeletion(subscription.id);
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Subscription ${subscription.id} deleted and user downgraded`,
        };
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
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Invoice ${invoice.id} paid successfully`,
        };
    }
    /**
     * Handle invoice.payment_failed event
     */
    static async handleInvoicePaymentFailed(event) {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const paymentIntent = invoice.payment_intent;
        const failureMessage = (typeof paymentIntent === 'object' && paymentIntent?.last_payment_error?.message)
            || 'Payment failed';
        logger_1.logger.warn({
            invoiceId: invoice.id,
            customerId,
            failureMessage,
            attemptCount: invoice.attempt_count,
        }, 'Invoice payment failed');
        await invoice_service_1.InvoiceService.handleFailedPayment(invoice.id, customerId, failureMessage);
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Invoice ${invoice.id} payment failed, notification sent`,
        };
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
        // Update user metadata from checkout
        const userId = session.client_reference_id;
        if (userId) {
            await client_1.prisma.user.update({
                where: { id: userId },
                data: {
                    stripeCustomerId: customerId,
                    metadata: {
                        checkoutCompletedAt: new Date().toISOString(),
                        checkoutSessionId: session.id,
                    },
                },
            });
        }
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Checkout session ${session.id} completed`,
        };
    }
    /**
     * Handle customer.created event
     */
    static async handleCustomerCreated(event) {
        const customer = event.data.object;
        const userId = customer.metadata?.user_id;
        logger_1.logger.info({
            customerId: customer.id,
            email: customer.email,
            userId,
        }, 'Customer created');
        if (userId) {
            await client_1.prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customer.id },
            });
            logger_1.logger.info({ userId, customerId: customer.id }, 'User updated with Stripe customer ID');
        }
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Customer ${customer.id} created`,
        };
    }
    /**
     * Handle customer.updated event
     */
    static async handleCustomerUpdated(event) {
        const customer = event.data.object;
        logger_1.logger.info({
            customerId: customer.id,
            email: customer.email,
            hasDefaultPaymentMethod: !!customer.invoice_settings?.default_payment_method,
        }, 'Customer updated');
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Customer ${customer.id} updated`,
        };
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
        const user = await client_1.prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
        });
        if (user) {
            await client_1.prisma.billingInvoice.upsert({
                where: { stripeInvoiceId: invoice.id },
                update: {
                    amount: invoice.amount_due / 100,
                    currency: invoice.currency,
                    status: invoice.status ?? 'draft',
                    pdfUrl: invoice.invoice_pdf ?? null,
                    periodStart: new Date(invoice.period_start * 1000),
                    periodEnd: new Date(invoice.period_end * 1000),
                },
                create: {
                    userId: user.id,
                    stripeInvoiceId: invoice.id,
                    invoiceNumber: invoice.number ?? invoice.id,
                    amount: invoice.amount_due / 100,
                    currency: invoice.currency,
                    status: invoice.status ?? 'draft',
                    pdfUrl: invoice.invoice_pdf ?? null,
                    periodStart: new Date(invoice.period_start * 1000),
                    periodEnd: new Date(invoice.period_end * 1000),
                },
            });
        }
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Invoice ${invoice.id} created`,
        };
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
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Checkout session ${session.id} expired`,
        };
    }
    /**
     * Handle payment_method.attached event
     */
    static async handlePaymentMethodAttached(event) {
        const paymentMethod = event.data.object;
        const customerId = paymentMethod.customer;
        logger_1.logger.info({
            paymentMethodId: paymentMethod.id,
            customerId,
            type: paymentMethod.type,
            last4: paymentMethod.card?.last4,
        }, 'Payment method attached');
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Payment method ${paymentMethod.id} attached to customer ${customerId}`,
        };
    }
    /**
     * Handle payment_method.detached event
     */
    static async handlePaymentMethodDetached(event) {
        const paymentMethod = event.data.object;
        const customerId = paymentMethod.customer;
        logger_1.logger.info({
            paymentMethodId: paymentMethod.id,
            customerId,
        }, 'Payment method detached');
        return {
            processed: true,
            success: true,
            eventId: event.id,
            eventType: event.type,
            message: `Payment method ${paymentMethod.id} detached from customer ${customerId}`,
        };
    }
}
exports.StripeWebhookHandler = StripeWebhookHandler;
//# sourceMappingURL=stripe-webhook.handler.js.map