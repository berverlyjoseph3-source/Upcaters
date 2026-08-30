// enterprise-ai-agent-platform/apps/api/src/billing/dto/billing.dto.ts
import { z } from 'zod';
import { PlanType, BillingInterval } from '../../types/billing.types';

/**
 * Create Checkout Session DTO
 */
export const CreateCheckoutSessionDtoSchema = z.object({
  planId: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
  interval: z.enum(['month', 'year']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  couponCode: z.string().optional(),
  trialDays: z.number().int().min(0).max(30).optional(),
});

export type CreateCheckoutSessionDto = z.infer < typeof CreateCheckoutSessionDtoSchema > ;

/**
 * Create Portal Session DTO
 */
export const CreatePortalSessionDtoSchema = z.object({
  returnUrl: z.string().url(),
});

export type CreatePortalSessionDto = z.infer < typeof CreatePortalSessionDtoSchema > ;

/**
 * Update Subscription DTO
 */
export const UpdateSubscriptionDtoSchema = z.object({
  planId: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  interval: z.enum(['month', 'year']).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional(),
});

export type UpdateSubscriptionDto = z.infer < typeof UpdateSubscriptionDtoSchema > ;

/**
 * Cancel Subscription DTO
 */
export const CancelSubscriptionDtoSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
});

export type CancelSubscriptionDto = z.infer < typeof CancelSubscriptionDtoSchema > ;

/**
 * Apply Coupon DTO
 */
export const ApplyCouponDtoSchema = z.object({
  couponCode: z.string().min(1).max(50),
});

export type ApplyCouponDto = z.infer < typeof ApplyCouponDtoSchema > ;

/**
 * Validate Coupon DTO
 */
export const ValidateCouponDtoSchema = z.object({
  couponCode: z.string().min(1).max(50),
  planId: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  interval: z.enum(['month', 'year']).optional(),
});

export type ValidateCouponDto = z.infer < typeof ValidateCouponDtoSchema > ;

/**
 * Webhook Event DTO
 */
export const WebhookEventDtoSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
  data: z.object({
    object: z.any(),
  }),
});

export type WebhookEventDto = z.infer < typeof WebhookEventDtoSchema > ;

/**
 * Checkout Session Response
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

/**
 * Portal Session Response
 */
export interface PortalSessionResponse {
  url: string;
}

/**
 * Subscription Response
 */
export interface SubscriptionResponseDto {
  id: string;
  planId: PlanType;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd ? : Date;
  priceAmount: number;
  priceCurrency: string;
  interval: BillingInterval;
}

/**
 * Billing Summary Response
 */
export interface BillingSummaryResponseDto {
  currentPlan: {
    id: PlanType;
    name: string;
    features: string[];
    limits: {
      aiActions: number | 'unlimited';
      apiCalls: number | 'unlimited';
    };
  };
  subscription: {
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    priceAmount: number;
    interval: BillingInterval;
  };
  usage: {
    aiActionsUsed: number;
    aiActionsLimit: number | 'unlimited';
    apiCallsUsed: number;
    apiCallsLimit: number | 'unlimited';
    percentageUsed: number;
  };
  invoices: InvoiceSummaryDto[];
}

/**
 * Invoice Summary DTO
 */
export interface InvoiceSummaryDto {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  created: Date;
  paidAt ? : Date;
  dueDate ? : Date;
}

/**
 * Coupon Validation Response
 */
export interface CouponValidationResponseDto {
  valid: boolean;
  couponId ? : string;
  discountAmount ? : number;
  discountPercent ? : number;
  expiresAt ? : Date;
  maxRedemptions ? : number;
  timesRedeemed ? : number;
  error ? : string;
}

/**
 * Payment Method Response
 */
export interface PaymentMethodResponseDto {
  id: string;
  type: string;
  last4 ? : string;
  expMonth ? : number;
  expYear ? : number;
  brand ? : string;
  isDefault: boolean;
}

/**
 * Billing Error Response
 */
export interface BillingErrorResponseDto {
  success: false;
  error: string;
  code: string;
  retryable ? : boolean;
}