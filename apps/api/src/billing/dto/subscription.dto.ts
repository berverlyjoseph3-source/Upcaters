// enterprise-ai-agent-platform/apps/api/src/billing/dto/subscription.dto.ts
import { z } from 'zod';
import { PlanType, BillingInterval, SubscriptionStatus } from '../../types/billing.types';

/**
 * Subscription Request DTO
 * Used for subscription operations
 */
export const SubscriptionDtoSchema = z.object({
  subscriptionId: z.string()
    .min(1, 'Subscription ID is required')
    .optional(),
  
  planId: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'FREE'])
    .optional(),
  
  interval: z.enum(['month', 'year'])
    .optional(),
  
  cancelAtPeriodEnd: z.boolean()
    .optional(),
  
  prorationBehavior: z.enum(['create_prorations', 'none', 'always_invoice'])
    .optional()
    .default('create_prorations'),
  
  paymentBehavior: z.enum(['default_incomplete', 'error_if_incomplete', 'pending_if_incomplete'])
    .optional()
    .default('default_incomplete'),
  
  trialEnd: z.string().datetime()
    .optional()
    .nullable(),
  
  quantity: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(1),
  
  metadata: z.record(z.string(), z.string())
    .optional(),
});

export type SubscriptionDto = z.infer<typeof SubscriptionDtoSchema>;

/**
 * Subscription Response DTO
 */
export interface SubscriptionResponseDto {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  planId: PlanType;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  priceAmount: number;
  priceCurrency: string;
  interval: BillingInterval;
  quantity: number;
  discount?: {
    couponId: string;
    percentOff?: number;
    amountOff?: number;
    expiresAt?: Date;
  };
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription List Response DTO
 */
export interface SubscriptionListResponseDto {
  subscriptions: SubscriptionResponseDto[];
  total: number;
  hasMore: boolean;
  nextPageToken?: string;
}

/**
 * Update Subscription Request DTO
 */
export interface UpdateSubscriptionRequestDto {
  planId?: PlanType;
  interval?: BillingInterval;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  quantity?: number;
  metadata?: Record<string, string>;
}

/**
 * Cancel Subscription Request DTO
 */
export interface CancelSubscriptionRequestDto {
  atPeriodEnd: boolean;
  reason?: string;
  feedback?: string;
}

/**
 * Cancel Subscription Response DTO
 */
export interface CancelSubscriptionResponseDto {
  success: boolean;
  subscriptionId: string;
  status: SubscriptionStatus;
  effectiveDate: Date;
  message: string;
}

/**
 * Reactivate Subscription Request DTO
 */
export interface ReactivateSubscriptionRequestDto {
  subscriptionId: string;
}

/**
 * Reactivate Subscription Response DTO
 */
export interface ReactivateSubscriptionResponseDto {
  success: boolean;
  subscriptionId: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  message: string;
}

/**
 * Subscription Preview Response DTO
 */
export interface SubscriptionPreviewDto {
  currentPlan: {
    id: PlanType;
    name: string;
    amount: number;
    currency: string;
  };
  newPlan: {
    id: PlanType;
    name: string;
    amount: number;
    currency: string;
  };
  prorationAmount: number;
  creditAmount: number;
  totalAmount: number;
  currency: string;
  effectiveDate: Date;
  nextInvoiceAmount: number;
}

/**
 * Subscription History Entry
 */
export interface SubscriptionHistoryEntry {
  id: string;
  subscriptionId: string;
  eventType: 'created' | 'updated' | 'cancelled' | 'reactivated' | 'expired';
  oldPlanId?: PlanType;
  newPlanId?: PlanType;
  oldStatus?: SubscriptionStatus;
  newStatus?: SubscriptionStatus;
  changedBy: 'user' | 'system' | 'admin' | 'stripe';
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Subscription Metrics
 */
export interface SubscriptionMetrics {
  totalActiveSubscriptions: number;
  totalTrialingSubscriptions: number;
  totalPastDueSubscriptions: number;
  totalCancelledSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  newSubscriptionsThisMonth: number;
  cancelledSubscriptionsThisMonth: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  growthRate: number;
}

/**
 * Subscription Filter Options
 */
export interface SubscriptionFilterOptions {
  status?: SubscriptionStatus | SubscriptionStatus[];
  planId?: PlanType | PlanType[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'currentPeriodEnd' | 'priceAmount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Subscription Webhook Data
 */
export interface SubscriptionWebhookData {
  subscriptionId: string;
  customerId: string;
  eventType: 'created' | 'updated' | 'deleted' | 'past_due' | 'cancelled';
  previousAttributes?: {
    status?: SubscriptionStatus;
    planId?: PlanType;
    cancelAtPeriodEnd?: boolean;
  };
  currentAttributes: {
    status: SubscriptionStatus;
    planId: PlanType;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
  timestamp: Date;
}

/**
 * Subscription Validation Result
 */
export interface SubscriptionValidationResult {
  valid: boolean;
  errors: string[];
  subscription?: SubscriptionResponseDto;
}