// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/Billing.tsx
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
  RefreshCw,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../api/client';
import PlanCard from '../../components/billing/PlanCard';
import UsageMeter from '../../components/billing/UsageMeter';
import FeatureComparison from '../../components/billing/FeatureComparison';
import { InvoiceHistory } from './InvoiceHistory';
import { PaymentMethods } from './PaymentMethods';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: {
    aiActions: number;
    apiCalls: number;
    teamMembers: number;
    storageGB: number;
  };
  overagePricing?: {
    aiAction: number;
    apiCall: number;
    imageGeneration: number;
    videoGeneration: number;
  };
  popular?: boolean;
  isActive: boolean;
  estimatedValue?: string;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceAmount: number;
  interval: 'month' | 'year';
}

interface BillingSummary {
  currentPlan: {
    id: string;
    name: string;
    features: string[];
    limits: { aiActions: number; apiCalls: number };
    overagePricing: { aiAction: number; apiCall: number };
  };
  subscription: {
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    priceAmount: number;
    interval: string;
  };
  usage: {
    aiActionsUsed: number;
    aiActionsLimit: number;
    apiCallsUsed: number;
    apiCallsLimit: number;
    percentageUsed: number;
    overageEstimate?: number;
  };
  invoices: any[];
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price / 100);
};

const TABS = [
  { id: 'plans', label: 'Plans' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payment', label: 'Payment Methods' },
] as const;

export const BillingPage: React.FC = () => {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<string>('plans');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansRes, subRes, summaryRes] = await Promise.all([
        apiClient.get('/api/billing/plans'),
        apiClient.get('/api/billing/subscription'),
        apiClient.get('/api/billing/summary'),
      ]);

      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (subRes.success && subRes.data) setSubscription(subRes.data);
      if (summaryRes.success && summaryRes.data) setBillingSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/billing/create-checkout', {
        planId,
        interval: billingInterval,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing`,
      });

      if (response.success && response.data?.sessionUrl) {
        window.location.href = response.data.sessionUrl;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Failed to create checkout:', err);
      setError('Failed to initiate checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const response = await apiClient.post('/api/billing/create-portal', {
        returnUrl: `${window.location.origin}/billing`,
      });
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Failed to open portal:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 dark:text-secondary-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Billing & Subscription</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Manage your plan, billing, and subscription
          </p>
        </div>
        <button
          onClick={fetchBillingData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Current Subscription Banner */}
      {subscription && billingSummary && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Current Plan</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  subscription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {subscription.status === 'active' ? 'Active' : subscription.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {billingSummary.currentPlan.name}
              </p>
              <p className="text-sm text-secondary-500 mt-1">
                {formatPrice(subscription.priceAmount)} / {subscription.interval}
              </p>
              <p className="text-sm text-secondary-500 mt-1">
                Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {isProcessing ? 'Loading...' : 'Manage Subscription'}
            </button>
          </div>
        </div>
      )}

      {/* Usage Meter */}
      {billingSummary && (
        <UsageMeter
          aiActionsUsed={billingSummary.usage.aiActionsUsed}
          aiActionsLimit={billingSummary.usage.aiActionsLimit}
          apiCallsUsed={billingSummary.usage.apiCallsUsed}
          apiCallsLimit={billingSummary.usage.apiCallsLimit}
          resetDate={billingSummary.subscription.currentPeriodEnd}
          overagePricing={billingSummary.currentPlan.overagePricing}
          overageEstimate={billingSummary.usage.overageEstimate}
        />
      )}

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingInterval === 'month'
                ? 'bg-white dark:bg-secondary-700 text-primary-600 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingInterval === 'year'
                ? 'bg-white dark:bg-secondary-700 text-primary-600 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Yearly <span className="text-green-600 text-xs">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={billingInterval}
            isCurrentPlan={subscription?.planId === plan.id}
            onSelect={() => handleUpgrade(plan.id)}
          />
        ))}
      </div>

      {/* Feature Comparison */}
      {plans.length > 0 && (
        <FeatureComparison plans={plans} />
      )}

      {/* Tabbed Content: Invoices & Payment Methods */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'invoices' && billingSummary && (
        <InvoiceHistory invoices={billingSummary.invoices} onDownload={(id) => console.log('Download', id)} />
      )}

      {activeTab === 'payment' && (
        <PaymentMethods paymentMethods={[]} onRefresh={fetchBillingData} />
      )}

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:bg-red-600 rounded px-1">×</button>
        </div>
      )}
    </div>
  );
};


export default Billing;
