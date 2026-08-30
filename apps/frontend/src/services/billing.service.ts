// enterprise-ai-agent-platform/apps/frontend/src/services/billing.service.ts
import { apiClient } from '../api/client';
import {
  Plan,
  Subscription,
  Invoice,
  PaymentMethod,
  BillingSummary,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PortalSessionResponse,
  CouponValidationResponse,
} from '../types/billing.types';

// PlanId type alias since it's not exported from billing.types
type PlanId = string;

class BillingService {
  /**
   * Get all available plans
   */
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<Plan[]>('/api/billing/plans');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch plans');
    }
    return response.data;
  }
  
  /**
   * Get current user's subscription
   */
  async getSubscription(): Promise<Subscription | null> {
    const response = await apiClient.get<Subscription>('/api/billing/subscription');
    if (!response.success) {
      return null;
    }
    return response.data || null;
  }
  
  /**
   * Get billing summary for dashboard
   */
  async getBillingSummary(): Promise<BillingSummary> {
    const response = await apiClient.get<BillingSummary>('/api/billing/summary');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch billing summary');
    }
    return response.data;
  }
  
  /**
   * Get invoice history
   */
  async getInvoices(limit: number = 50, offset: number = 0): Promise<{ invoices: Invoice[]; total: number }> {
    const response = await apiClient.get<{ invoices: Invoice[]; total: number }>(
      `/api/billing/invoices?limit=${limit}&offset=${offset}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch invoices');
    }
    return response.data;
  }
  
  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(): Promise<Invoice | null> {
    const response = await apiClient.get<Invoice>('/api/billing/invoices/upcoming');
    if (!response.success) {
      return null;
    }
    return response.data || null;
  }
  
  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await apiClient.get<PaymentMethod[]>('/api/billing/payment-methods');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch payment methods');
    }
    return response.data;
  }
  
  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    const response = await apiClient.post<CheckoutSessionResponse>('/api/billing/create-checkout', request);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create checkout session');
    }
    return response.data;
  }
  
  /**
   * Create customer portal session
   */
  async createPortalSession(returnUrl: string): Promise<PortalSessionResponse> {
    const response = await apiClient.post<PortalSessionResponse>('/api/billing/create-portal', { returnUrl });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create portal session');
    }
    return response.data;
  }
  
  /**
   * Cancel subscription
   * Uses POST with a body since apiClient.delete only accepts 1 argument
   */
  async cancelSubscription(atPeriodEnd: boolean = true): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/billing/subscription/cancel',
      { atPeriodEnd }
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to cancel subscription');
    }
    return response.data || { success: true, message: 'Subscription cancelled' };
  }
  
  /**
   * Reactivate subscription
   */
  async reactivateSubscription(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/api/billing/subscription/reactivate');
    if (!response.success) {
      throw new Error(response.error || 'Failed to reactivate subscription');
    }
    return response.data || { success: true, message: 'Subscription reactivated' };
  }
  
  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan(planId: PlanId, interval: 'month' | 'year'): Promise<Subscription> {
    const response = await apiClient.put<Subscription>('/api/billing/subscription', { planId, interval });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update subscription');
    }
    return response.data;
  }
  
  /**
   * Validate coupon
   */
  async validateCoupon(couponCode: string, planId?: PlanId, interval?: 'month' | 'year'): Promise<CouponValidationResponse> {
    const response = await apiClient.post<CouponValidationResponse>('/api/billing/validate-coupon', {
      couponCode,
      planId,
      interval,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to validate coupon');
    }
    return response.data;
  }
  
  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>('/api/billing/payment-methods/default', {
      paymentMethodId,
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to set default payment method');
    }
    return response.data || { success: true };
  }
  
  /**
   * Detach payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/api/billing/payment-methods/${paymentMethodId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to detach payment method');
    }
    return response.data || { success: true };
  }
  
  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/billing/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    if (!response.success || !response.data) {
      throw new Error('Failed to download invoice');
    }
    return response.data;
  }
}

export const billingService = new BillingService();
