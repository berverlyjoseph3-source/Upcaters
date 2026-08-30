// enterprise-ai-agent-platform/apps/api/src/billing/dto/create-checkout.dto.ts
import { z } from 'zod';
import { PlanType, BillingInterval } from '../../types/billing.types';

/**
 * Create Checkout Session Request DTO
 * Used when creating a new subscription checkout session
 */
export const CreateCheckoutDtoSchema = z.object({
  planId: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'], {
    required_error: 'Plan ID is required',
    invalid_type_error: 'Plan ID must be STARTER, PROFESSIONAL, or ENTERPRISE',
  }),
  
  interval: z.enum(['month', 'year'], {
    required_error: 'Billing interval is required',
    invalid_type_error: 'Interval must be month or year',
  }),
  
  successUrl: z.string()
    .url('Success URL must be a valid URL')
    .optional()
    .default(`${process.env.APP_URL}/billing/success`),
  
  cancelUrl: z.string()
    .url('Cancel URL must be a valid URL')
    .optional()
    .default(`${process.env.APP_URL}/billing/cancel`),
  
  couponCode: z.string()
    .min(1, 'Coupon code must be at least 1 character')
    .max(50, 'Coupon code too long')
    .optional()
    .nullable(),
  
  trialDays: z.number()
    .int('Trial days must be an integer')
    .min(0, 'Trial days cannot be negative')
    .max(30, 'Trial days cannot exceed 30')
    .optional()
    .default(14),
  
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100')
    .optional()
    .default(1),
  
  metadata: z.record(z.string(), z.string())
    .optional()
    .default({}),
  
  customerEmail: z.string()
    .email('Invalid customer email')
    .optional()
    .nullable(),
  
  paymentMethodTypes: z.array(z.string())
    .optional()
    .default(['card']),
  
  allowPromotionCodes: z.boolean()
    .optional()
    .default(true),
  
  billingAddressCollection: z.enum(['auto', 'required', 'never'])
    .optional()
    .default('auto'),
  
  customerUpdate: z.object({
    name: z.enum(['auto', 'never']).optional(),
    address: z.enum(['auto', 'never']).optional(),
    shipping: z.enum(['auto', 'never']).optional(),
  }).optional(),
  
  subscriptionData: z.object({
    trialPeriodDays: z.number().int().min(0).max(30).optional(),
    description: z.string().max(255).optional(),
  }).optional(),
});

export type CreateCheckoutDto = z.infer < typeof CreateCheckoutDtoSchema > ;

/**
 * Create Checkout Session Response DTO
 */
export interface CreateCheckoutResponseDto {
  sessionId: string;
  sessionUrl: string;
  publishableKey ? : string;
}

/**
 * Checkout Session Status
 */
export type CheckoutSessionStatus = 'open' | 'complete' | 'expired' | 'pending';

/**
 * Checkout Session Details Response
 */
export interface CheckoutSessionDetailsDto {
  id: string;
  status: CheckoutSessionStatus;
  customerId ? : string;
  customerEmail ? : string;
  subscriptionId ? : string;
  paymentIntentId ? : string;
  amountTotal: number;
  currency: string;
  createdAt: Date;
  expiresAt: Date;
  successUrl: string;
  cancelUrl: string;
  lineItems ? : Array < {
    priceId: string;
    quantity: number;
    amount: number;
    description: string;
  } > ;
}

/**
 * Checkout Session Validation Result
 */
export interface CheckoutSessionValidationResult {
  valid: boolean;
  error ? : string;
  session ? : CheckoutSessionDetailsDto;
}

/**
 * Checkout Session Line Item
 */
export interface CheckoutLineItem {
  priceId: string;
  quantity: number;
  adjustableQuantity ? : {
    enabled: boolean;
    minimum: number;
    maximum: number;
  };
  dynamicTaxRates ? : boolean;
}

/**
 * Checkout Session Metadata
 */
export interface CheckoutMetadata {
  userId: string;
  planId: string;
  interval: string;
  source: 'web' | 'api';
  utmSource ? : string;
  utmMedium ? : string;
  utmCampaign ? : string;
  utmTerm ? : string;
  utmContent ? : string;
  [key: string]: string | undefined;
}

/**
 * Checkout Session Created Event Data
 */
export interface CheckoutSessionCreatedData {
  sessionId: string;
  userId: string;
  planId: string;
  interval: string;
  amount: number;
  currency: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Checkout Session Completed Event Data
 */
export interface CheckoutSessionCompletedData {
  sessionId: string;
  userId: string;
  customerId: string;
  subscriptionId: string;
  planId: string;
  interval: string;
  amountPaid: number;
  currency: string;
  paidAt: Date;
  isFirstPayment: boolean;
}