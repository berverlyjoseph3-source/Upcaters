// enterprise-ai-agent-platform/apps/api/src/billing/dto/webhook.dto.ts
import { z } from 'zod';
import { WebhookEventType } from '../../types/billing.types';

/**
 * Stripe Webhook Request DTO
 * Validates incoming webhook requests from Stripe
 */
export const WebhookRequestDtoSchema = z.object({
  id: z.string().min(1, 'Webhook ID is required'),
  type: z.string().min(1, 'Event type is required'),
  created: z.number().int().positive('Invalid timestamp'),
  data: z.object({
    object: z.any(),
    previous_attributes: z.record(z.any()).optional(),
  }),
  api_version: z.string().optional(),
  livemode: z.boolean(),
  pending_webhooks: z.number().int().optional(),
  request: z.object({
    id: z.string().optional(),
    idempotency_key: z.string().optional(),
  }).optional(),
});

export type WebhookRequestDto = z.infer<typeof WebhookRequestDtoSchema>;

/**
 * Webhook Response DTO
 */
export interface WebhookResponseDto {
  received: boolean;
  eventId?: string;
  eventType?: string;
  message?: string;
}

/**
 * Webhook Error Response DTO
 */
export interface WebhookErrorResponseDto {
  error: string;
  code: string;
  eventId?: string;
  retryAfter?: number;
}

/**
 * Webhook Event Summary DTO
 */
export interface WebhookEventSummaryDto {
  id: string;
  eventId: string;
  eventType: string;
  source: string;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
  retryCount: number;
  processingError?: string;
}

/**
 * Webhook Event Detail DTO
 */
export interface WebhookEventDetailDto extends WebhookEventSummaryDto {
  payload: any;
  metadata?: Record<string, any>;
}

/**
 * Webhook Delivery Status
 */
export interface WebhookDeliveryStatusDto {
  eventId: string;
  eventType: string;
  deliveredAt: Date;
  statusCode: number;
  success: boolean;
  attemptCount: number;
  nextRetryAt?: Date;
}

/**
 * Webhook Retry Request DTO
 */
export const WebhookRetryRequestDtoSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  forceRetry: z.boolean().optional().default(false),
});

export type WebhookRetryRequestDto = z.infer<typeof WebhookRetryRequestDtoSchema>;

/**
 * Webhook Retry Response DTO
 */
export interface WebhookRetryResponseDto {
  success: boolean;
  eventId: string;
  retryAt?: Date;
  message: string;
}

/**
 * Webhook Filter Options
 */
export interface WebhookFilterOptions {
  eventType?: WebhookEventType | WebhookEventType[];
  source?: 'stripe' | 'google' | 'linkedin' | 'facebook' | 'twitter';
  processed?: boolean;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'eventType' | 'processedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Webhook Statistics DTO
 */
export interface WebhookStatisticsDto {
  totalEvents: number;
  processedEvents: number;
  pendingEvents: number;
  failedEvents: number;
  byEventType: Record<string, {
    total: number;
    processed: number;
    failed: number;
  }>;
  bySource: Record<string, {
    total: number;
    processed: number;
    failed: number;
  }>;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  averageProcessingTimeMs: number;
}

/**
 * Webhook Event Type Summary
 */
export interface WebhookEventTypeSummaryDto {
  eventType: string;
  count: number;
  lastReceivedAt?: Date;
  successRate: number;
  averageProcessingTimeMs: number;
}

/**
 * Subscription Webhook Data DTO
 */
export interface SubscriptionWebhookDataDto {
  subscriptionId: string;
  customerId: string;
  eventType: 'created' | 'updated' | 'deleted' | 'past_due' | 'cancelled' | 'renewed';
  previousStatus?: string;
  currentStatus: string;
  previousPlanId?: string;
  currentPlanId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Invoice Webhook Data DTO
 */
export interface InvoiceWebhookDataDto {
  invoiceId: string;
  customerId: string;
  subscriptionId?: string;
  eventType: 'created' | 'paid' | 'payment_failed' | 'updated' | 'void' | 'deleted';
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  status: string;
  dueDate?: Date;
  paidAt?: Date;
  pdfUrl?: string;
  failureMessage?: string;
  attemptCount: number;
  nextPaymentAttempt?: Date;
}

/**
 * Checkout Webhook Data DTO
 */
export interface CheckoutWebhookDataDto {
  sessionId: string;
  customerId?: string;
  subscriptionId?: string;
  eventType: 'completed' | 'expired' | 'async_payment_failed' | 'async_payment_succeeded';
  clientReferenceId?: string;
  amountTotal: number;
  amountSubtotal: number;
  currency: string;
  paymentStatus: string;
  status: string;
  customerEmail?: string;
  customerName?: string;
  lineItems?: Array<{
    priceId: string;
    quantity: number;
    amount: number;
    description: string;
  }>;
  metadata?: Record<string, string>;
  completedAt?: Date;
  expiresAt: Date;
}

/**
 * Customer Webhook Data DTO
 */
export interface CustomerWebhookDataDto {
  customerId: string;
  eventType: 'created' | 'updated' | 'deleted' | 'subscription_created' | 'subscription_deleted';
  email?: string;
  name?: string;
  phone?: string;
  defaultPaymentMethodId?: string;
  metadata?: Record<string, string>;
  subscriptions?: Array<{
    id: string;
    status: string;
    planId: string;
  }>;
}

/**
 * Payment Method Webhook Data DTO
 */
export interface PaymentMethodWebhookDataDto {
  paymentMethodId: string;
  customerId: string;
  eventType: 'attached' | 'detached' | 'updated';
  type: 'card' | 'link' | 'cashapp' | 'us_bank_account' | 'sepa_debit';
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

/**
 * Webhook Idempotency Key DTO
 */
export interface WebhookIdempotencyDto {
  eventId: string;
  idempotencyKey: string;
  processedAt: Date;
  expiresAt: Date;
}

/**
 * Webhook Processing Result DTO
 */
export interface WebhookProcessingResultDto {
  success: boolean;
  eventId: string;
  eventType: string;
  processedAt: Date;
  processingTimeMs: number;
  message?: string;
  error?: string;
  shouldRetry: boolean;
  retryAfterMs?: number;
}

/**
 * Webhook Configuration DTO
 */
export interface WebhookConfigurationDto {
  endpoint: string;
  enabledEvents: string[];
  status: 'enabled' | 'disabled' | 'testing';
  secretVerified: boolean;
  lastDeliveryAt?: Date;
  lastSuccessAt?: Date;
  consecutiveFailures: number;
  url: string;
  apiVersion: string;
}

/**
 * Verify Webhook Signature DTO
 */
export const VerifyWebhookSignatureDtoSchema = z.object({
  payload: z.string().min(1, 'Payload is required'),
  signature: z.string().min(1, 'Signature is required'),
  secret: z.string().min(1, 'Webhook secret is required'),
  timestamp: z.number().int().positive().optional(),
});

export type VerifyWebhookSignatureDto = z.infer<typeof VerifyWebhookSignatureDtoSchema>;

/**
 * Webhook Signature Verification Result
 */
export interface WebhookSignatureVerificationResultDto {
  valid: boolean;
  error?: string;
  event?: WebhookRequestDto;
  timestamp?: number;
}

/**
 * Webhook Delivery Attempt DTO
 */
export interface WebhookDeliveryAttemptDto {
  attemptNumber: number;
  attemptedAt: Date;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  success: boolean;
  durationMs: number;
}

/**
 * Webhook Metrics DTO
 */
export interface WebhookMetricsDto {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  deliveriesByHour: Record<string, number>;
  failuresByReason: Record<string, number>;
}

/**
 * Create Webhook Event DTO (for manual testing)
 */
export const CreateWebhookEventDtoSchema = z.object({
  eventType: z.string().min(1, 'Event type is required'),
  payload: z.any(),
  source: z.enum(['stripe', 'google', 'linkedin', 'facebook', 'twitter']).default('stripe'),
});

export type CreateWebhookEventDto = z.infer<typeof CreateWebhookEventDtoSchema>;

/**
 * Webhook Event Batch DTO
 */
export interface WebhookEventBatchDto {
  events: WebhookEventSummaryDto[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Webhook Alert DTO (for monitoring)
 */
export interface WebhookAlertDto {
  severity: 'info' | 'warning' | 'critical';
  eventType?: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Webhook Dead Letter Queue Entry
 */
export interface WebhookDeadLetterEntryDto {
  eventId: string;
  eventType: string;
  source: string;
  payload: any;
  failureReason: string;
  failureCount: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: 'manual' | 'retry_succeeded' | 'ignored';
}