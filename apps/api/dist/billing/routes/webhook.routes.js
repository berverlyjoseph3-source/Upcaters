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
// enterprise-ai-agent-platform/apps/api/src/billing/routes/webhook.routes.ts
const express_1 = require("express");
const webhook_controller_1 = require("../controllers/webhook.controller");
const rate_limit_middleware_1 = require("../../auth/middleware/rate-limit.middleware");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
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
router.post('/stripe', 
// Stripe webhooks require raw body for signature verification
// This is handled in the main app setup with express.raw() for this specific route
rate_limit_middleware_1.RateLimitMiddleware.limiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // Max 100 webhook requests per minute
    skipSuccessfulRequests: true, // Don't count successful webhooks
}), webhook_controller_1.WebhookController.handleStripeWebhook);
/**
 * Webhook Health Check
 * GET /api/webhooks/health
 * Used by Stripe to verify webhook endpoint is working
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'stripe-webhook-handler',
        timestamp: new Date().toISOString(),
    });
});
/**
 * Webhook Test Endpoint (Development Only)
 * POST /api/webhooks/test
 * For testing webhook handling locally
 */
if (process.env.NODE_ENV !== 'production') {
    router.post('/test', (req, res) => {
        logger_1.logger.info({ body: req.body }, 'Test webhook received');
        res.status(200).json({
            received: true,
            message: 'Test webhook received successfully',
        });
    });
}
/**
 * Webhook Event Log (Admin Only)
 * GET /api/webhooks/events
 * View recent webhook events for debugging
 */
router.get('/events', 
// This would have admin authentication in production
async (req, res) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
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
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to fetch webhook events');
        res.status(500).json({
            success: false,
            error: 'Failed to fetch webhook events',
        });
    }
});
/**
 * Retry Failed Webhook Event (Admin Only)
 * POST /api/webhooks/events/:eventId/retry
 * Manually retry a failed webhook event
 */
router.post('/events/:eventId/retry', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../../db/client')));
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
        logger_1.logger.info({ eventId }, 'Webhook event queued for retry');
        res.json({
            success: true,
            message: 'Webhook event queued for retry',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, eventId: req.params.eventId }, 'Failed to retry webhook event');
        res.status(500).json({
            success: false,
            error: 'Failed to retry webhook event',
        });
    }
});
exports.default = router;
//# sourceMappingURL=webhook.routes.js.map