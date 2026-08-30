// enterprise-ai-agent-platform/apps/frontend/src/types/billing.types.ts

export type PlanId = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: {
    aiActions: number | 'unlimited';
    apiCalls: number | 'unlimited';
    teamMembers: number;
    storageGB: number;
  };
  isActive: boolean;
  popular ? : boolean;
  displayOrder: number;
}

export interface Subscription {
  id: string;
  planId: PlanId;
  status: 'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceAmount: number;
  priceCurrency: string;
  interval: 'month' | 'year';
  trialEnd ? : Date;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  pdfUrl: string | null;
  created: Date;
  paidAt ? : Date;
  dueDate ? : Date;
  description ? : string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer';
  last4 ? : string;
  expMonth ? : number;
  expYear ? : number;
  brand ? : string;
  isDefault: boolean;
  name ? : string;
}

export interface BillingAddress {
  line1: string;
  line2 ? : string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface UsageSummary {
  aiActionsUsed: number;
  aiActionsLimit: number | 'unlimited';
  apiCallsUsed: number;
  apiCallsLimit: number | 'unlimited';
  percentageUsed: number;
  resetDate: Date;
}

export interface BillingSummary {
  currentPlan: Plan;
  subscription: Subscription | null;
  usage: UsageSummary;
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];
}

export interface CheckoutSessionRequest {
  planId: PlanId;
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  couponCode ? : string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  couponId ? : string;
  discountAmount ? : number;
  discountPercent ? : number;
  expiresAt ? : Date;
  error ? : string;
}