"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWebhookEventDtoSchema = exports.VerifyWebhookSignatureDtoSchema = exports.WebhookRetryRequestDtoSchema = exports.WebhookRequestDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/billing/dto/webhook.dto.ts
const zod_1 = require("zod");
/**
 * Stripe Webhook Request DTO
 * Validates incoming webhook requests from Stripe
 */
exports.WebhookRequestDtoSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Webhook ID is required'),
    type: zod_1.z.string().min(1, 'Event type is required'),
    created: zod_1.z.number().int().positive('Invalid timestamp'),
    data: zod_1.z.object({
        object: zod_1.z.any(),
        previous_attributes: zod_1.z.record(zod_1.z.any()).optional(),
    }),
    api_version: zod_1.z.string().optional(),
    livemode: zod_1.z.boolean(),
    pending_webhooks: zod_1.z.number().int().optional(),
    request: zod_1.z.object({
        id: zod_1.z.string().optional(),
        idempotency_key: zod_1.z.string().optional(),
    }).optional(),
});
/**
 * Webhook Retry Request DTO
 */
exports.WebhookRetryRequestDtoSchema = zod_1.z.object({
    eventId: zod_1.z.string().min(1, 'Event ID is required'),
    forceRetry: zod_1.z.boolean().optional().default(false),
});
/**
 * Verify Webhook Signature DTO
 */
exports.VerifyWebhookSignatureDtoSchema = zod_1.z.object({
    payload: zod_1.z.string().min(1, 'Payload is required'),
    signature: zod_1.z.string().min(1, 'Signature is required'),
    secret: zod_1.z.string().min(1, 'Webhook secret is required'),
    timestamp: zod_1.z.number().int().positive().optional(),
});
/**
 * Create Webhook Event DTO (for manual testing)
 */
exports.CreateWebhookEventDtoSchema = zod_1.z.object({
    eventType: zod_1.z.string().min(1, 'Event type is required'),
    payload: zod_1.z.any(),
    source: zod_1.z.enum(['stripe', 'google', 'linkedin', 'facebook', 'twitter']).default('stripe'),
});
//# sourceMappingURL=Webhook.dto.js.map