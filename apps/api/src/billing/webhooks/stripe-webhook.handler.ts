// enterprise-ai-agent-platform/apps/api/src/billing/webhooks/stripe-webhook.handler.ts
import Stripe from 'stripe';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { StripeService } from '../services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { InvoiceService } from '../services/invoice.service';
import { WebhookEventType } from '../../types/billing.types';

export interface WebhookHandlerResult {
  processed: boolean;
  success: boolean;
  eventId: string;
  eventType: string;
  message?: string;
  error?: string;
}

export class StripeWebhookHandler {
  /**
   * Main handler for all Stripe webhook events
   * Uses idempotency to prevent duplicate processing
   */
  static async handleEvent(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const eventId = event.id;
    const eventType = event.type;
    
    logger.info({ eventId, eventType }, 'Processing Stripe webhook event');
    
    try {
      // Check for duplicate processing
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });
      
      if (existingEvent && existingEvent.processed) {
        logger.info({ eventId, eventType }, 'Duplicate webhook event, skipping');
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
        await prisma.webhookEvent.create({
          data: {
            eventId,
            eventType,
            source: 'stripe',
            payload: event as any,
            processed: false,
          },
        });
      }
      
      // Process based on event type
      let result: WebhookHandlerResult;
      
      switch (eventType) {
        case WebhookEventType.CUSTOMER_SUBSCRIPTION_CREATED:
          result = await this.handleSubscriptionCreated(event);
          break;
          
        case WebhookEventType.CUSTOMER_SUBSCRIPTION_UPDATED:
          result = await this.handleSubscriptionUpdated(event);
          break;
          
        case WebhookEventType.CUSTOMER_SUBSCRIPTION_DELETED:
          result = await this.handleSubscriptionDeleted(event);
          break;
          
        case WebhookEventType.INVOICE_PAID:
          result = await this.handleInvoicePaid(event);
          break;
          
        case WebhookEventType.INVOICE_PAYMENT_FAILED:
          result = await this.handleInvoicePaymentFailed(event);
          break;
          
        case WebhookEventType.CHECKOUT_SESSION_COMPLETED:
          result = await this.handleCheckoutSessionCompleted(event);
          break;
          
        case WebhookEventType.CUSTOMER_CREATED:
          result = await this.handleCustomerCreated(event);
          break;
          
        case WebhookEventType.CUSTOMER_UPDATED:
          result = await this.handleCustomerUpdated(event);
          break;
          
        case WebhookEventType.INVOICE_CREATED:
          result = await this.handleInvoiceCreated(event);
          break;
          
        case WebhookEventType.CHECKOUT_SESSION_EXPIRED:
          result = await this.handleCheckoutSessionExpired(event);
          break;
          
        case WebhookEventType.PAYMENT_METHOD_ATTACHED:
          result = await this.handlePaymentMethodAttached(event);
          break;
          
        case WebhookEventType.PAYMENT_METHOD_DETACHED:
          result = await this.handlePaymentMethodDetached(event);
          break;
          
        default:
          logger.info({ eventType }, 'Unhandled webhook event type');
          result = {
            processed: true,
            success: true,
            eventId,
            eventType,
            message: 'Event type not handled but acknowledged',
          };
      }
      
      // Mark event as processed
      await prisma.webhookEvent.update({
        where: { eventId },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      
      return result;
      
    } catch (error) {
      logger.error({ error, eventId, eventType }, 'Webhook processing failed');
      
      // Update event with error
      await prisma.webhookEvent.update({
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
  private static async handleSubscriptionCreated(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    logger.info({
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
    }, 'Subscription created');
    
    await SubscriptionService.syncSubscription(subscription.id, customerId);
    
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
  private static async handleSubscriptionUpdated(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const previousAttributes = event.data.previous_attributes;
    
    logger.info({
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      previousAttributes,
    }, 'Subscription updated');
    
    await SubscriptionService.syncSubscription(subscription.id, customerId);
    
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
  private static async handleSubscriptionDeleted(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const subscription = event.data.object as Stripe.Subscription;
    
    logger.info({ subscriptionId: subscription.id }, 'Subscription deleted');
    
    await SubscriptionService.handleSubscriptionDeletion(subscription.id);
    
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
  private static async handleInvoicePaid(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    
    logger.info({
      invoiceId: invoice.id,
      customerId,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    }, 'Invoice paid');
    
    await InvoiceService.handleSuccessfulPayment(invoice.id, customerId);
    
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
  private static async handleInvoicePaymentFailed(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent | string | null;
    const failureMessage = (typeof paymentIntent === 'object' && paymentIntent?.last_payment_error?.message)
      || 'Payment failed';
    
    logger.warn({
      invoiceId: invoice.id,
      customerId,
      failureMessage,
      attemptCount: invoice.attempt_count,
    }, 'Invoice payment failed');
    
    await InvoiceService.handleFailedPayment(invoice.id, customerId, failureMessage);
    
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
  private static async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    logger.info({
      sessionId: session.id,
      customerId,
      subscriptionId,
      clientReferenceId: session.client_reference_id,
    }, 'Checkout session completed');
    
    if (subscriptionId) {
      await SubscriptionService.syncSubscription(subscriptionId, customerId);
    }
    
    // Update user metadata from checkout
    const userId = session.client_reference_id;
    if (userId) {
      await prisma.user.update({
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
  private static async handleCustomerCreated(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const customer = event.data.object as Stripe.Customer;
    const userId = customer.metadata?.user_id;
    
    logger.info({
      customerId: customer.id,
      email: customer.email,
      userId,
    }, 'Customer created');
    
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
      logger.info({ userId, customerId: customer.id }, 'User updated with Stripe customer ID');
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
  private static async handleCustomerUpdated(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const customer = event.data.object as Stripe.Customer;
    
    logger.info({
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
  private static async handleInvoiceCreated(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    
    logger.info({
      invoiceId: invoice.id,
      customerId,
      amount: invoice.amount_due,
      dueDate: invoice.due_date,
    }, 'Invoice created');
    
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
  private static async handleCheckoutSessionExpired(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const session = event.data.object as Stripe.Checkout.Session;
    
    logger.info({
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
  private static async handlePaymentMethodAttached(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const paymentMethod = event.data.object as Stripe.PaymentMethod;
    const customerId = paymentMethod.customer as string;
    
    logger.info({
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
  private static async handlePaymentMethodDetached(event: Stripe.Event): Promise<WebhookHandlerResult> {
    const paymentMethod = event.data.object as Stripe.PaymentMethod;
    const customerId = paymentMethod.customer as string;
    
    logger.info({
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