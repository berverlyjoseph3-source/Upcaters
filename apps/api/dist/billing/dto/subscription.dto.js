"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/billing/dto/subscription.dto.ts
const zod_1 = require("zod");
/**
 * Subscription Request DTO
 * Used for subscription operations
 */
exports.SubscriptionDtoSchema = zod_1.z.object({
    subscriptionId: zod_1.z.string()
        .min(1, 'Subscription ID is required')
        .optional(),
    planId: zod_1.z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'FREE'])
        .optional(),
    interval: zod_1.z.enum(['month', 'year'])
        .optional(),
    cancelAtPeriodEnd: zod_1.z.boolean()
        .optional(),
    prorationBehavior: zod_1.z.enum(['create_prorations', 'none', 'always_invoice'])
        .optional()
        .default('create_prorations'),
    paymentBehavior: zod_1.z.enum(['default_incomplete', 'error_if_incomplete', 'pending_if_incomplete'])
        .optional()
        .default('default_incomplete'),
    trialEnd: zod_1.z.string().datetime()
        .optional()
        .nullable(),
    quantity: zod_1.z.number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string())
        .optional(),
});
//# sourceMappingURL=subscription.dto.js.map