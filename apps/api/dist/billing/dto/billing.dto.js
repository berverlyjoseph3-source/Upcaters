"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventDtoSchema = exports.ValidateCouponDtoSchema = exports.ApplyCouponDtoSchema = exports.CancelSubscriptionDtoSchema = exports.UpdateSubscriptionDtoSchema = exports.CreatePortalSessionDtoSchema = exports.CreateCheckoutSessionDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/billing/dto/billing.dto.ts
const zod_1 = require("zod");
/**
 * Create Checkout Session DTO
 */
exports.CreateCheckoutSessionDtoSchema = zod_1.z.object({
    planId: zod_1.z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
    interval: zod_1.z.enum(['month', 'year']),
    successUrl: zod_1.z.string().url().optional(),
    cancelUrl: zod_1.z.string().url().optional(),
    couponCode: zod_1.z.string().optional(),
    trialDays: zod_1.z.number().int().min(0).max(30).optional(),
});
/**
 * Create Portal Session DTO
 */
exports.CreatePortalSessionDtoSchema = zod_1.z.object({
    returnUrl: zod_1.z.string().url(),
});
/**
 * Update Subscription DTO
 */
exports.UpdateSubscriptionDtoSchema = zod_1.z.object({
    planId: zod_1.z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    interval: zod_1.z.enum(['month', 'year']).optional(),
    cancelAtPeriodEnd: zod_1.z.boolean().optional(),
    prorationBehavior: zod_1.z.enum(['create_prorations', 'none', 'always_invoice']).optional(),
});
/**
 * Cancel Subscription DTO
 */
exports.CancelSubscriptionDtoSchema = zod_1.z.object({
    atPeriodEnd: zod_1.z.boolean().default(true),
});
/**
 * Apply Coupon DTO
 */
exports.ApplyCouponDtoSchema = zod_1.z.object({
    couponCode: zod_1.z.string().min(1).max(50),
});
/**
 * Validate Coupon DTO
 */
exports.ValidateCouponDtoSchema = zod_1.z.object({
    couponCode: zod_1.z.string().min(1).max(50),
    planId: zod_1.z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    interval: zod_1.z.enum(['month', 'year']).optional(),
});
/**
 * Webhook Event DTO
 */
exports.WebhookEventDtoSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(),
    created: zod_1.z.number(),
    data: zod_1.z.object({
        object: zod_1.z.any(),
    }),
});
//# sourceMappingURL=billing.dto.js.map