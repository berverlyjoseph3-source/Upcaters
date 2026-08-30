// enterprise-ai-agent-platform/apps/api/src/billing/controllers/webhook.controller.ts
import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { InvoiceService } from '../services/invoice.service';
import { logger } from '../../utils/logger';
import stripeConfig from '../../config/stripe.config';
import { WebhookEventType } from '../../types/billing.types';

export class WebhookController {
  /**
   * POST /api/webhooks/stripe
   * Handle Stripe webhook events
   */
  static async handleStripeWebhook(req: Request, res: Response): Promise < void > {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      logger.warn('No Stripe signature found in webhook request');
      res.status(400).json({ error: 'No signature provided' });
      return;
    }
    
    try {
      // Construct the webhook event
      const event = StripeService.constructWebhookEvent(
        req.body,
        signature,
        stripeConfig.webhookSecret!
      );
      
      logger.info({
        eventId: event.id,
        eventType: event.type,
        eventCreated: event.created,
      }, 'Processing Stripe webhook event');
      
      // Process webhook events
      switch (event.type) {
        case WebhookEventType.CUSTOMER_SUBSCRIPTION_CREATED:
          await this.handleSubscriptionCreated(event);
          break;
          
        case WebhookEventType.CUSTOMER_SUBSCRIPTION_UPDATED:
          await this.handleSubscriptionUpdated(event);
          break;
          
        case WebhookEventType.CUSTOMER_SUBSCRIPTION_DELETED:
          await this.handleSubscriptionDeleted(event);
          break;
          
        case WebhookEventType.INVOICE_PAID:
          await this.handleInvoicePaid(event);
          break;
          
        case WebhookEventType.INVOICE_PAYMENT_FAILED:
          await this.handleInvoicePaymentFailed(event);
          break;
          
        case WebhookEventType.CHECKOUT_SESSION_COMPLETED:
          await this.handleCheckoutSessionCompleted(event);
          break;
          
        case WebhookEventType.CUSTOMER_CREATED:
          await this.handleCustomerCreated(event);
          break;
          
        case WebhookEventType.INVOICE_CREATED:
          await this.handleInvoiceCreated(event);
          break;
          
        case WebhookEventType.CHECKOUT_SESSION_EXPIRED:
          await this.handleCheckoutSessionExpired(event);
          break;
          
        default:
          logger.info({ eventType: event.type }, 'Unhandled webhook event type');
      }
      
      // Acknowledge receipt of the event
      res.status(200).json({ received: true });
      
    } catch (error: any) {
      logger.error({ error, signature: signature.substring(0, 20) }, 'Stripe webhook verification failed');
      
      if (error.type === 'StripeSignatureVerificationError') {
        res.status(401).json({ error: 'Invalid signature' });
      } else {
        res.status(400).json({ error: 'Webhook error' });
      }
    }
  }
  
  /**
   * Handle customer.subscription.created event
   */
  private static async handleSubscriptionCreated(event: any): Promise < void > {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    
    logger.info({
      subscriptionId: subscription.id,
      customerId,
      planId: subscription.items.data[0]?.price.id,
    }, 'Subscription created');
    
    await SubscriptionService.syncSubscription(subscription.id, customerId);
  }
  
  /**
   * Handle customer.subscription.updated event
   */
  private static async handleSubscriptionUpdated(event: any): Promise < void > {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    
    logger.info({
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    }, 'Subscription updated');
    
    await SubscriptionService.syncSubscription(subscription.id, customerId);
  }
  
  /**
   * Handle customer.subscription.deleted event
   */
  private static async handleSubscriptionDeleted(event: any): Promise < void > {
    const subscription = event.data.object;
    
    logger.info({ subscriptionId: subscription.id }, 'Subscription deleted');
    
    await SubscriptionService.handleSubscriptionDeletion(subscription.id);
  }
  
  /**
   * Handle invoice.paid event
   */
  private static async handleInvoicePaid(event: any): Promise < void > {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    
    logger.info({
      invoiceId: invoice.id,
      customerId,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    }, 'Invoice paid');
    
    await InvoiceService.handleSuccessfulPayment(invoice.id, customerId);
  }
  
  /**
   * Handle invoice.payment_failed event
   */
  private static async handleInvoicePaymentFailed(event: any): Promise < void > {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const failureMessage = invoice.last_payment_error?.message;
    
    logger.warn({
      invoiceId: invoice.id,
      customerId,
      failureMessage,
      attemptCount: invoice.attempt_count,
    }, 'Invoice payment failed');
    
    await InvoiceService.handleFailedPayment(invoice.id, customerId, failureMessage);
  }
  
  /**
   * Handle checkout.session.completed event
   */
  private static async handleCheckoutSessionCompleted(event: any): Promise < void > {
    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    logger.info({
      sessionId: session.id,
      customerId,
      subscriptionId,
      clientReferenceId: session.client_reference_id,
    }, 'Checkout session completed');
    
    if (subscriptionId) {
      await SubscriptionService.syncSubscription(subscriptionId, customerId);
    }
  }
  
  /**
   * Handle customer.created event
   */
  private static async handleCustomerCreated(event: any): Promise < void > {
    const customer = event.data.object;
    
    logger.info({
      customerId: customer.id,
      email: customer.email,
    }, 'Customer created');
    
    // Update user with Stripe customer ID if not already set
    const userId = customer.metadata?.user_id;
    if (userId) {
      const { prisma } = await import('../../db/client');
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
      logger.info({ userId, customerId: customer.id }, 'User updated with Stripe customer ID');
    }
  }
  
  /**
   * Handle invoice.created event
   */
  private static async handleInvoiceCreated(event: any): Promise < void > {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    
    logger.info({
      invoiceId: invoice.id,
      customerId,
      amount: invoice.amount_due,
      dueDate: invoice.due_date,
    }, 'Invoice created');
    
    // Store invoice in database for reference
    const { prisma } = await import('../../db/client');
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
  private static async handleCheckoutSessionExpired(event: any): Promise < void > {
    const session = event.data.object;
    
    logger.info({
      sessionId: session.id,
      customerId: session.customer,
    }, 'Checkout session expired');
    
    // Clean up any temporary data associated with this session
  }
}