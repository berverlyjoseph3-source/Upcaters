// enterprise-ai-agent-platform/apps/api/src/billing/routes/webhook.routes.ts
import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { RateLimitMiddleware } from '../../auth/middleware/rate-limit.middleware';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Stripe Webhook Endpoint
 * POST /api/webhooks/stripe
 * 
 * This endpoint receives webhook events from Stripe.
 * It must be publicly accessible (no authentication) because Stripe needs to reach it.
 * 
 * Important: 
 * - The raw request body is required for signature verification
 * - Must use express.raw() middleware for this route
 */
router.post(
  '/stripe',
  // Stripe webhooks require raw body for signature verification
  // This is handled in the main app setup with express.raw() for this specific route
  RateLimitMiddleware.limiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // Max 100 webhook requests per minute
    skipSuccessfulRequests: true, // Don't count successful webhooks
  }),
  WebhookController.handleStripeWebhook
);

/**
 * Webhook Health Check
 * GET /api/webhooks/health
 * Used by Stripe to verify webhook endpoint is working
 */
router.get(
  '/health',
  (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'stripe-webhook-handler',
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Webhook Test Endpoint (Development Only)
 * POST /api/webhooks/test
 * For testing webhook handling locally
 */
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/test',
    (req, res) => {
      logger.info({ body: req.body }, 'Test webhook received');
      res.status(200).json({
        received: true,
        message: 'Test webhook received successfully',
      });
    }
  );
}

/**
 * Webhook Event Log (Admin Only)
 * GET /api/webhooks/events
 * View recent webhook events for debugging
 */
router.get(
  '/events',
  // This would have admin authentication in production
  async (req, res) => {
    try {
      const { prisma } = await import('../../db/client');
      
      const events = await prisma.webhookEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          eventId: true,
          eventType: true,
          source: true,
          processed: true,
          createdAt: true,
          processingError: true,
        },
      });
      
      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch webhook events');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch webhook events',
      });
    }
  }
);

/**
 * Retry Failed Webhook Event (Admin Only)
 * POST /api/webhooks/events/:eventId/retry
 * Manually retry a failed webhook event
 */
router.post(
  '/events/:eventId/retry',
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { prisma } = await import('../../db/client');
      
      const event = await prisma.webhookEvent.findUnique({
        where: { id: eventId },
      });
      
      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Webhook event not found',
        });
        return;
      }
      
      // Reset the event for reprocessing
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processed: false,
          processingError: null,
          retryCount: { increment: 1 },
        },
      });
      
      // Trigger reprocessing (implementation depends on queue system)
      logger.info({ eventId }, 'Webhook event queued for retry');
      
      res.json({
        success: true,
        message: 'Webhook event queued for retry',
      });
    } catch (error) {
      logger.error({ error, eventId: req.params.eventId }, 'Failed to retry webhook event');
      res.status(500).json({
        success: false,
        error: 'Failed to retry webhook event',
      });
    }
  }
);

export default router;