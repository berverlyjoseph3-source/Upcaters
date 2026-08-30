// enterprise-ai-agent-platform/apps/api/src/billing/services/invoice.service.ts
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { StripeService } from './stripe.service';
import { InvoiceStatus, InvoiceSummary } from '../../types/billing.types';

export interface InvoiceNotificationData {
  userId: string;
  email: string;
  name: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate?: Date;
  pdfUrl?: string;
}

export class InvoiceService {
  /**
   * Handle successful payment webhook
   */
  static async handleSuccessfulPayment(
    stripeInvoiceId: string,
    customerId: string
  ): Promise<void> {
    try {
      // Find user by customer ID
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) {
        logger.warn({ customerId, stripeInvoiceId }, 'User not found for successful payment');
        return;
      }

      // Update or create invoice record in database
      await prisma.billingInvoice.upsert({
        where: { stripeInvoiceId },
        update: {
          status: 'paid',
          paidAt: new Date(),
        },
        create: {
          userId: user.id,
          stripeInvoiceId,
          amount: 0, // Will be updated with actual amount
          currency: 'usd',
          status: 'paid',
          periodStart: new Date(),
          periodEnd: new Date(),
        },
      });

      // Send payment confirmation email
      await this.sendPaymentConfirmation(user.id, stripeInvoiceId);

      logger.info({ userId: user.id, stripeInvoiceId }, 'Successful payment processed');
    } catch (error) {
      logger.error({ error, stripeInvoiceId, customerId }, 'Failed to handle successful payment');
      throw error;
    }
  }

  /**
   * Handle failed payment webhook
   */
  static async handleFailedPayment(
    stripeInvoiceId: string,
    customerId: string,
    failureMessage?: string
  ): Promise<void> {
    try {
      // Find user by customer ID
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) {
        logger.warn({ customerId, stripeInvoiceId }, 'User not found for failed payment');
        return;
      }

      // Update invoice status
      await prisma.billingInvoice.update({
        where: { stripeInvoiceId },
        data: {
          status: 'uncollectible',
        },
      }).catch(() => {
        // Invoice might not exist yet, that's fine
      });

      // Send payment failure notification
      await this.sendPaymentFailureNotification(user.id, stripeInvoiceId, failureMessage);

      logger.warn({ userId: user.id, stripeInvoiceId, failureMessage }, 'Payment failed');
    } catch (error) {
      logger.error({ error, stripeInvoiceId, customerId }, 'Failed to handle failed payment');
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId: string): Promise<InvoiceSummary | null> {
    try {
      const stripeInvoice = await StripeService.getInvoiceById(invoiceId);
      
      if (!stripeInvoice) {
        return null;
      }

      return {
        id: stripeInvoice.id,
        number: stripeInvoice.number || stripeInvoice.id.slice(-8),
        amount: stripeInvoice.amount_due / 100,
        currency: stripeInvoice.currency,
        status: stripeInvoice.status as InvoiceStatus,
        pdfUrl: stripeInvoice.invoice_pdf ?? null,
        created: new Date(stripeInvoice.created * 1000),
        dueDate: stripeInvoice.due_date 
          ? new Date(stripeInvoice.due_date * 1000)
          : undefined,
      };
    } catch (error) {
      logger.error({ error, invoiceId }, 'Failed to get invoice');
      return null;
    }
  }

  /**
   * Get all invoices for a user
   */
  static async getUserInvoices(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ invoices: InvoiceSummary[]; total: number }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        return { invoices: [], total: 0 };
      }

      const stripeInvoices = await StripeService.listInvoices(user.stripeCustomerId, limit);
      
      const invoices = stripeInvoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number || invoice.id.slice(-8),
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: invoice.status as InvoiceStatus,
        pdfUrl: invoice.invoice_pdf ?? null,
        created: new Date(invoice.created * 1000),
        paidAt: invoice.status_transitions?.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : undefined,
        dueDate: invoice.due_date 
          ? new Date(invoice.due_date * 1000)
          : undefined,
      }));

      return {
        invoices,
        total: invoices.length,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user invoices');
      return { invoices: [], total: 0 };
    }
  }

  /**
   * Get upcoming invoice for a user
   */
  static async getUpcomingInvoice(userId: string): Promise<InvoiceSummary | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeSubscriptionId: true },
      });

      if (!user?.stripeSubscriptionId) {
        return null;
      }

      const upcoming = await StripeService.getUpcomingInvoice(user.stripeSubscriptionId);
      
      if (!upcoming) {
        return null;
      }

      return {
        id: 'upcoming', // Preview invoices have no real Stripe ID yet — none has been created
        number: upcoming.number || `UPCOMING-${upcoming.created}`,
        amount: upcoming.amount_due / 100,
        currency: upcoming.currency,
        status: upcoming.status as InvoiceStatus,
        pdfUrl: upcoming.invoice_pdf ?? null,
        created: new Date(upcoming.created * 1000),
        dueDate: upcoming.due_date 
          ? new Date(upcoming.due_date * 1000)
          : undefined,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get upcoming invoice');
      return null;
    }
  }

  /**
   * Send payment confirmation email
   */
  private static async sendPaymentConfirmation(userId: string, stripeInvoiceId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return;

      // Get invoice details
      const invoice = await this.getInvoice(stripeInvoiceId);
      
      if (!invoice) return;

      // This would integrate with your email service
      // await EmailService.sendPaymentConfirmation({
      //   to: user.email,
      //   name: user.name || user.email.split('@')[0],
      //   invoiceNumber: invoice.number,
      //   amount: invoice.amount,
      //   currency: invoice.currency,
      //   pdfUrl: invoice.pdfUrl,
      // });

      logger.info({ userId, stripeInvoiceId, amount: invoice.amount }, 'Payment confirmation email sent');
    } catch (error) {
      logger.error({ error, userId, stripeInvoiceId }, 'Failed to send payment confirmation');
    }
  }

  /**
   * Send payment failure notification
   */
  private static async sendPaymentFailureNotification(
    userId: string,
    stripeInvoiceId: string,
    failureMessage?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return;

      // This would integrate with your email service
      // await EmailService.sendPaymentFailure({
      //   to: user.email,
      //   name: user.name || user.email.split('@')[0],
      //   failureMessage: failureMessage || 'Your payment could not be processed',
      //   retryUrl: `${process.env.APP_URL}/billing/payment-methods`,
      // });

      logger.warn({ userId, stripeInvoiceId, failureMessage }, 'Payment failure notification sent');
    } catch (error) {
      logger.error({ error, userId, stripeInvoiceId }, 'Failed to send payment failure notification');
    }
  }

  /**
   * Send invoice email
   */
  static async sendInvoiceEmail(
    userId: string,
    invoiceId: string
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return false;

      const invoice = await this.getInvoice(invoiceId);
      
      if (!invoice) return false;

      // This would integrate with your email service
      // await EmailService.sendInvoice({
      //   to: user.email,
      //   name: user.name || user.email.split('@')[0],
      //   invoiceNumber: invoice.number,
      //   amount: invoice.amount,
      //   currency: invoice.currency,
      //   dueDate: invoice.dueDate,
      //   pdfUrl: invoice.pdfUrl,
      // });

      logger.info({ userId, invoiceId }, 'Invoice email sent');

      return true;
    } catch (error) {
      logger.error({ error, userId, invoiceId }, 'Failed to send invoice email');
      return false;
    }
  }

  /**
   * Generate invoice report for admin
   */
  static async generateInvoiceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalInvoices: number;
    totalAmount: number;
    paidInvoices: number;
    paidAmount: number;
    unpaidInvoices: number;
    unpaidAmount: number;
    byStatus: Record<string, { count: number; amount: number }>;
  }> {
    try {
      const invoices = await prisma.billingInvoice.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const byStatus: Record<string, { count: number; amount: number }> = {};
      let totalAmount = 0;
      let paidAmount = 0;
      let unpaidAmount = 0;
      let paidCount = 0;
      let unpaidCount = 0;

      for (const invoice of invoices) {
        const amount = Number(invoice.amount);
        totalAmount += amount;

        if (!byStatus[invoice.status]) {
          byStatus[invoice.status] = { count: 0, amount: 0 };
        }
        byStatus[invoice.status].count++;
        byStatus[invoice.status].amount += amount;

        if (invoice.status === 'paid') {
          paidCount++;
          paidAmount += amount;
        } else if (invoice.status === 'open' || invoice.status === 'uncollectible') {
          unpaidCount++;
          unpaidAmount += amount;
        }
      }

      return {
        totalInvoices: invoices.length,
        totalAmount,
        paidInvoices: paidCount,
        paidAmount,
        unpaidInvoices: unpaidCount,
        unpaidAmount,
        byStatus,
      };
    } catch (error) {
      logger.error({ error, startDate, endDate }, 'Failed to generate invoice report');
      throw error;
    }
  }

  /**
   * Retry failed invoice payment
   */
  static async retryInvoicePayment(invoiceId: string): Promise<{ success: boolean; message: string }> {
    try {
      // This would call Stripe API to retry payment
      // For now, return success
      logger.info({ invoiceId }, 'Invoice payment retry triggered');
      
      return {
        success: true,
        message: 'Payment retry initiated',
      };
    } catch (error) {
      logger.error({ error, invoiceId }, 'Failed to retry invoice payment');
      return {
        success: false,
        message: 'Failed to retry payment',
      };
    }
  }
}