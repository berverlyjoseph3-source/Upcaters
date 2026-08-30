"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCheckoutDtoSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/billing/dto/create-checkout.dto.ts
const zod_1 = require("zod");
/**
 * Create Checkout Session Request DTO
 * Used when creating a new subscription checkout session
 */
exports.CreateCheckoutDtoSchema = zod_1.z.object({
    planId: zod_1.z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'], {
        required_error: 'Plan ID is required',
        invalid_type_error: 'Plan ID must be STARTER, PROFESSIONAL, or ENTERPRISE',
    }),
    interval: zod_1.z.enum(['month', 'year'], {
        required_error: 'Billing interval is required',
        invalid_type_error: 'Interval must be month or year',
    }),
    successUrl: zod_1.z.string()
        .url('Success URL must be a valid URL')
        .optional()
        .default(`${process.env.APP_URL}/billing/success`),
    cancelUrl: zod_1.z.string()
        .url('Cancel URL must be a valid URL')
        .optional()
        .default(`${process.env.APP_URL}/billing/cancel`),
    couponCode: zod_1.z.string()
        .min(1, 'Coupon code must be at least 1 character')
        .max(50, 'Coupon code too long')
        .optional()
        .nullable(),
    trialDays: zod_1.z.number()
        .int('Trial days must be an integer')
        .min(0, 'Trial days cannot be negative')
        .max(30, 'Trial days cannot exceed 30')
        .optional()
        .default(14),
    quantity: zod_1.z.number()
        .int('Quantity must be an integer')
        .min(1, 'Quantity must be at least 1')
        .max(100, 'Quantity cannot exceed 100')
        .optional()
        .default(1),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string())
        .optional()
        .default({}),
    customerEmail: zod_1.z.string()
        .email('Invalid customer email')
        .optional()
        .nullable(),
    paymentMethodTypes: zod_1.z.array(zod_1.z.string())
        .optional()
        .default(['card']),
    allowPromotionCodes: zod_1.z.boolean()
        .optional()
        .default(true),
    billingAddressCollection: zod_1.z.enum(['auto', 'required', 'never'])
        .optional()
        .default('auto'),
    customerUpdate: zod_1.z.object({
        name: zod_1.z.enum(['auto', 'never']).optional(),
        address: zod_1.z.enum(['auto', 'never']).optional(),
        shipping: zod_1.z.enum(['auto', 'never']).optional(),
    }).optional(),
    subscriptionData: zod_1.z.object({
        trialPeriodDays: zod_1.z.number().int().min(0).max(30).optional(),
        description: zod_1.z.string().max(255).optional(),
    }).optional(),
});
//# sourceMappingURL=create-checkout.dto.js.map