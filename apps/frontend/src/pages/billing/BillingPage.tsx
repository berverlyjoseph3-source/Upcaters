// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/BillingPage.tsx
import React, { useState } from 'react';
import { CreditCard, Zap, Shield, Users, Database, Headphones, CheckCircle, AlertCircle } from 'lucide-react';
import { useBilling } from '../../hooks/useBilling';
import { PlanCard } from '../../components/billing/PlanCard';
import { FeatureComparison } from '../../components/billing/FeatureComparison';
import { UsageMeter } from '../../components/billing/UsageMeter';
import { SubscriptionDetails } from './SubscriptionDetails';
import { InvoiceHistory } from './InvoiceHistory';
import { PaymentMethods } from './PaymentMethods';
import { UpgradeModal } from './UpgradeModal';
import { CancelModal } from './CancelModal';

type BillingTab = 'overview' | 'plans' | 'invoices' | 'payment';

export const BillingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState < BillingTab > ('overview');
  const [billingInterval, setBillingInterval] = useState < 'month' | 'year' > ('month');
  const [selectedPlan, setSelectedPlan] = useState < string | null > (null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  const {
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
    cancelSubscription,
    reactivateSubscription,
    updatePlan,
  } = useBilling();
  
  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setIsUpgradeModalOpen(true);
  };
  
  const handleConfirmUpgrade = async () => {
    if (selectedPlan) {
      const url = await createCheckout({
        planId: selectedPlan as any,
        interval: billingInterval,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing`,
      });
      window.location.href = url;
    }
  };
  
  const handleCancelSubscription = async () => {
    await cancelSubscription(true);
    setIsCancelModalOpen(false);
    refresh();
  };
  
  const handleReactivateSubscription = async () => {
    await reactivateSubscription();
    refresh();
  };
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'plans', label: 'Plans', icon: <Zap className="h-4 w-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <Database className="h-4 w-4" /> },
    { id: 'payment', label: 'Payment Methods', icon: <CreditCard className="h-4 w-4" /> },
  ];
  
  if (isLoading && !billingSummary) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button onClick={refresh} className="mt-2 text-sm text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Billing & Subscription</h1>
        <p className="text-secondary-600 dark:text-secondary-400 mt-1">
          Manage your plan, payment methods, and billing history
        </p>
      </div>

      {/* Current Usage Summary */}
      {billingSummary && (
        <UsageMeter
          aiActionsUsed={billingSummary.usage.aiActionsUsed}
          aiActionsLimit={billingSummary.usage.aiActionsLimit}
          apiCallsUsed={billingSummary.usage.apiCallsUsed}
          apiCallsLimit={billingSummary.usage.apiCallsLimit}
          resetDate={billingSummary.usage.resetDate}
        />
      )}

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BillingTab)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && subscription && billingSummary && (
          <>
            <SubscriptionDetails
              subscription={subscription}
              plan={billingSummary.currentPlan}
              onManage={async () => {
                const { url } = await createCheckout({} as any);
                window.location.href = url;
              }}
              onCancel={() => setIsCancelModalOpen(true)}
              onReactivate={handleReactivateSubscription}
            />
            
            {upcomingInvoice && (
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
                <h3 className="text-sm font-semibold mb-2">Upcoming Invoice</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold">
                      ${(upcomingInvoice.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-secondary-500">
                      Due {upcomingInvoice.dueDate?.toLocaleDateString()}
                    </p>
                  </div>
                  <button className="px-3 py-1.5 text-sm border rounded-lg hover:bg-secondary-50">
                    View Details
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-8">
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

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  interval={billingInterval}
                  isCurrentPlan={subscription?.planId === plan.id}
                  onSelect={() => handleUpgrade(plan.id)}
                />
              ))}
            </div>

            {/* Feature Comparison Table */}
            <FeatureComparison plans={plans} />
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <InvoiceHistory invoices={invoices} onDownload={(id) => console.log('Download', id)} />
        )}

        {/* Payment Methods Tab */}
        {activeTab === 'payment' && (
          <PaymentMethods paymentMethods={paymentMethods} onRefresh={refresh} />
        )}
      </div>

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && selectedPlan && (
        <UpgradeModal
          planId={selectedPlan}
          interval={billingInterval}
          onClose={() => setIsUpgradeModalOpen(false)}
          onConfirm={handleConfirmUpgrade}
        />
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && subscription && (
        <CancelModal
          planName={billingSummary?.currentPlan.name || ''}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleCancelSubscription}
        />
      )}
    </div>
  );
};
export default BillingPage;
