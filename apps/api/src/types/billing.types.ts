// enterprise-ai-agent-platform/apps/api/src/types/billing.types.ts

/**
 * Subscription plan types
 */
export enum PlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

/**
 * Billing interval
 */
export enum BillingInterval {
  MONTHLY = 'month',
  YEARLY = 'year',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  CANCELLED = 'cancelled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  PAUSED = 'paused',
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  UNCOLLECTIBLE = 'uncollectible',
  VOID = 'void',
}

/**
 * Overage pricing configuration per plan
 */
export interface OveragePricing {
  aiAction: number;
  apiCall: number;
  imageGeneration: number;
  videoGeneration: number;
}

/**
 * Plan configuration
 */
export interface PlanConfig {
  id: PlanType;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents (usually 20% discount)
  currency: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  stripeProductId?: string;
  features: string[];
  limits: {
    aiActions: number;
    apiCalls: number;
    teamMembers: number;
    storageGB: number;
  };
  overagePricing: OveragePricing;
  isActive: boolean;
  displayOrder: number;
  popular?: boolean;
  estimatedValue?: string;
}

/**
 * All available plans — Updated pricing as per 2025 analysis
 */
export const PLANS_CONFIG: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    id: PlanType.FREE,
    name: 'Free',
    description: 'Perfect for trying out the platform',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    features: [
      '50 AI Actions per month',
      '100 API Calls per month',
      'Email Agent',
      'Calendar Agent',
      'Web Agent',
      'Basic Content Generation',
      'Community Support',
    ],
    limits: {
      aiActions: 50,
      apiCalls: 100,
      teamMembers: 1,
      storageGB: 0.1,
    },
    overagePricing: {
      aiAction: 0,
      apiCall: 0,
      imageGeneration: 0,
      videoGeneration: 0,
    },
    isActive: true,
    displayOrder: 1,
    estimatedValue: '$15 value',
  },
  [PlanType.STARTER]: {
    id: PlanType.STARTER,
    name: 'Starter',
    description: 'For individuals and small teams',
    priceMonthly: 3900, // $39.00 — updated from $29
    priceYearly: 37440, // $374.40 ($31.20/month, 20% off)
    currency: 'usd',
    features: [
      '500 AI Actions per month',
      '2,000 API Calls per month',
      'All FREE features',
      'Drive Agent',
      'Social Media Posting',
      'Task Agent',
      'Priority Support',
    ],
    limits: {
      aiActions: 500,
      apiCalls: 2000,
      teamMembers: 3,
      storageGB: 1,
    },
    overagePricing: {
      aiAction: 0.05,
      apiCall: 0.01,
      imageGeneration: 0.10,
      videoGeneration: 1.00,
    },
    isActive: true,
    displayOrder: 2,
    estimatedValue: '$75 value',
  },
  [PlanType.PROFESSIONAL]: {
    id: PlanType.PROFESSIONAL,
    name: 'Professional',
    description: 'For growing businesses',
    priceMonthly: 12900, // $129.00 — updated from $99
    priceYearly: 123840, // $1,238.40 ($103.20/month, 20% off)
    currency: 'usd',
    features: [
      '2,500 AI Actions per month',
      '15,000 API Calls per month',
      'All STARTER features',
      'Image Generation',
      'Multi-platform Posts',
      'API Access',
      'Email Support',
    ],
    limits: {
      aiActions: 2500,
      apiCalls: 15000,
      teamMembers: 10,
      storageGB: 10,
    },
    overagePricing: {
      aiAction: 0.05,
      apiCall: 0.01,
      imageGeneration: 0.10,
      videoGeneration: 1.00,
    },
    isActive: true,
    displayOrder: 3,
    popular: true,
    estimatedValue: '$250 value',
  },
  [PlanType.ENTERPRISE]: {
    id: PlanType.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large organizations',
    priceMonthly: 59900, // $599.00 — updated from $499
    priceYearly: 575040, // $5,750.40 ($479.20/month, 20% off)
    currency: 'usd',
    features: [
      '10,000 AI Actions per month',
      '50,000 API Calls per month',
      'All PROFESSIONAL features',
      'Video Generation',
      'White-label',
      'Custom Integrations',
      'SLA Guarantee',
      '24/7 Phone Support',
      'Dedicated Account Manager',
    ],
    limits: {
      aiActions: 10000, // Soft cap — was 'unlimited'
      apiCalls: 50000, // Soft cap — was 'unlimited'
      teamMembers: 100,
      storageGB: 100,
    },
    overagePricing: {
      aiAction: 0.02,
      apiCall: 0.005,
      imageGeneration: 0.05,
      videoGeneration: 0.50,
    },
    isActive: true,
    displayOrder: 4,
    estimatedValue: '$1,000+ value',
  },
  [PlanType.CUSTOM]: {
    id: PlanType.CUSTOM,
    name: 'Custom',
    description: 'Tailored for your needs',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    features: [
      'Custom AI Actions',
      'Custom API Calls',
      'All ENTERPRISE features',
      'Custom Integrations',
      'On-premise Deployment',
      'Custom SLA',
    ],
    limits: {
      aiActions: 100000,
      apiCalls: 500000,
      teamMembers: 500,
      storageGB: 1000,
    },
    overagePricing: {
      aiAction: 0.01,
      apiCall: 0.002,
      imageGeneration: 0.03,
      videoGeneration: 0.30,
    },
    isActive: true,
    displayOrder: 5,
  },
};

/**
 * Checkout session request
 */
export interface CreateCheckoutSessionRequest {
  planId: PlanType;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  userId?: string;
  couponCode?: string;
  trialDays?: number;
}

/**
 * Checkout session response
 */
export interface CreateCheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

/**
 * Subscription response
 */
export interface SubscriptionResponse {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  planId: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  priceAmount: number;
  priceCurrency: string;
  interval: BillingInterval;
}

/**
 * Billing portal session request
 */
export interface CreatePortalSessionRequest {
  userId: string;
  returnUrl: string;
}

/**
 * Billing portal session response
 */
export interface CreatePortalSessionResponse {
  url: string;
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  CUSTOMER_SUBSCRIPTION_CREATED = 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  INVOICE_PAYMENT_SUCCEEDED = 'invoice.payment_succeeded',
  PAYMENT_METHOD_ATTACHED = 'payment_method.attached',
  PAYMENT_METHOD_DETACHED = 'payment_method.detached',
  CHECKOUT_SESSION_COMPLETED = 'checkout.session.completed',
  CHECKOUT_SESSION_EXPIRED = 'checkout.session.expired',
}

/**
 * Webhook event handler result
 */
export interface WebhookHandlerResult {
  processed: boolean;
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Subscription update request
 */
export interface UpdateSubscriptionRequest {
  subscriptionId?: string; // unused by SubscriptionService.updateSubscription, which looks this up via userId
  planId?: PlanType;
  interval?: BillingInterval;
  cancelAtPeriodEnd?: boolean;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

/**
 * Usage record request for Stripe
 */
export interface UsageRecordRequest {
  subscriptionItemId: string;
  quantity: number;
  timestamp: number;
  action?: 'increment' | 'set';
}

/**
 * Billing summary for dashboard
 */
export interface BillingSummary {
  currentPlan: {
    id: PlanType;
    name: string;
    features: string[];
    limits: {
      aiActions: number;
      apiCalls: number;
    };
    overagePricing: OveragePricing;
  };
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    priceAmount: number;
    interval: BillingInterval;
  };
  usage: {
    aiActionsUsed: number;
    aiActionsLimit: number;
    apiCallsUsed: number;
    apiCallsLimit: number;
    percentageUsed: number;
    overageEstimate?: number;
  };
  invoices: InvoiceSummary[];
}

/**
 * Invoice summary for dashboard
 */
export interface InvoiceSummary {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  pdfUrl: string | null;
  created: Date;
  paidAt?: Date;
  dueDate?: Date;
}

/**
 * Payment method response
 */
export interface PaymentMethodResponse {
  id: string;
  type: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  brand?: string;
  isDefault: boolean;
}

/**
 * Coupon validation result
 */
export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountAmount?: number;
  discountPercent?: number;
  expiresAt?: Date;
  maxRedemptions?: number;
  timesRedeemed?: number;
  error?: string;
}

/**
 * Billing error response
 */
export interface BillingErrorResponse {
  success: false;
  error: string;
  code: string;
  retryable?: boolean;
}