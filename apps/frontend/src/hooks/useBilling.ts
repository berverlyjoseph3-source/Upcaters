// enterprise-ai-agent-platform/apps/frontend/src/hooks/useBilling.ts
import { useState, useEffect, useCallback } from 'react';
import { billingService } from '../services/billing.service';
import {
  Plan,
  Subscription,
  Invoice,
  PaymentMethod,
  BillingSummary,
  CheckoutSessionRequest,
} from '../types/billing.types';

interface UseBillingReturn {
  // Data
  plans: Plan[];
  subscription: Subscription | null;
  billingSummary: BillingSummary | null;
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];
  upcomingInvoice: Invoice | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refresh: () => Promise < void > ;
  createCheckout: (request: CheckoutSessionRequest) => Promise < string > ;
  manageSubscription: () => Promise < void > ;
  cancelSubscription: (atPeriodEnd ? : boolean) => Promise < { success: boolean;message: string } > ;
  reactivateSubscription: () => Promise < { success: boolean;message: string } > ;
  updatePlan: (planId: string, interval: 'month' | 'year') => Promise < void > ;
  downloadInvoice: (invoiceId: string) => Promise < void > ;
}

export const useBilling = (): UseBillingReturn => {
  const [plans, setPlans] = useState < Plan[] > ([]);
  const [subscription, setSubscription] = useState < Subscription | null > (null);
  const [billingSummary, setBillingSummary] = useState < BillingSummary | null > (null);
  const [invoices, setInvoices] = useState < Invoice[] > ([]);
  const [paymentMethods, setPaymentMethods] = useState < PaymentMethod[] > ([]);
  const [upcomingInvoice, setUpcomingInvoice] = useState < Invoice | null > (null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansData, summaryData, invoicesData, paymentMethodsData, upcomingData] = await Promise.all([
        billingService.getPlans(),
        billingService.getBillingSummary(),
        billingService.getInvoices(10, 0),
        billingService.getPaymentMethods(),
        billingService.getUpcomingInvoice(),
      ]);
      setPlans(plansData);
      setBillingSummary(summaryData);
      setSubscription(summaryData.subscription);
      setInvoices(invoicesData.invoices);
      setPaymentMethods(paymentMethodsData);
      setUpcomingInvoice(upcomingData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load billing data';
      setError(message);
      console.error('Billing data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);
  
  const createCheckout = useCallback(async (request: CheckoutSessionRequest): Promise < string > => {
    const response = await billingService.createCheckoutSession(request);
    return response.sessionUrl;
  }, []);
  
  const manageSubscription = useCallback(async () => {
    const response = await billingService.createPortalSession(window.location.href);
    window.location.href = response.url;
  }, []);
  
  const cancelSubscription = useCallback(async (atPeriodEnd: boolean = true) => {
    const result = await billingService.cancelSubscription(atPeriodEnd);
    await refresh();
    return result;
  }, [refresh]);
  
  const reactivateSubscription = useCallback(async () => {
    const result = await billingService.reactivateSubscription();
    await refresh();
    return result;
  }, [refresh]);
  
  const updatePlan = useCallback(async (planId: string, interval: 'month' | 'year') => {
    await billingService.updateSubscriptionPlan(planId as any, interval);
    await refresh();
  }, [refresh]);
  
  const downloadInvoice = useCallback(async (invoiceId: string) => {
    const blob = await billingService.downloadInvoice(invoiceId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoiceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  
  return {
    plans,
    subscription,
    billingSummary,
    invoices,
    paymentMethods,
    upcomingInvoice,
    isLoading,
    error,
    refresh,
    createCheckout,
    manageSubscription,
    cancelSubscription,
    reactivateSubscription,
    updatePlan,
    downloadInvoice,
  };
};