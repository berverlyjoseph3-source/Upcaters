// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/SubscriptionDetails.tsx
import React from 'react';
import { Calendar, CreditCard, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Subscription, Plan } from '../../types/billing.types';

interface SubscriptionDetailsProps {
  subscription: Subscription;
  plan: Plan;
  onManage: () => void;
  onCancel: () => void;
  onReactivate: () => void;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getStatusBadge = (status: Subscription['status']) => {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> };
    case 'past_due':
      return { label: 'Past Due', className: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-3 w-3" /> };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-gray-100 text-gray-700', icon: <XCircle className="h-3 w-3" /> };
    case 'trialing':
      return { label: 'Trial', className: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="h-3 w-3" /> };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-700', icon: null };
  }
};

export const SubscriptionDetails: React.FC < SubscriptionDetailsProps > = ({
  subscription,
  plan,
  onManage,
  onCancel,
  onReactivate,
}) => {
  const statusBadge = getStatusBadge(subscription.status);
  const isCancelled = subscription.status === 'cancelled';
  const isCancelScheduled = subscription.cancelAtPeriodEnd && !isCancelled;
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Current Subscription</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                {statusBadge.icon}
                {statusBadge.label}
              </span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {plan.name} Plan
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              ${subscription.priceAmount / 100} / {subscription.interval}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onManage}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
            >
              Manage Subscription
            </button>
            {!isCancelled && !isCancelScheduled && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            )}
            {isCancelScheduled && (
              <button
                onClick={onReactivate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-secondary-400" />
            <span className="text-secondary-500">Current Period:</span>
            <span className="font-medium">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          {subscription.trialEnd && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-secondary-400" />
              <span className="text-secondary-500">Trial Ends:</span>
              <span className="font-medium">{formatDate(subscription.trialEnd)}</span>
            </div>
          )}
          {isCancelScheduled && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span>Your subscription will end on {formatDate(subscription.currentPeriodEnd)}</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Plan Features</h3>
          <ul className="space-y-1">
            {plan.features.slice(0, 5).map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-secondary-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {feature}
              </li>
            ))}
            {plan.features.length > 5 && (
              <li className="text-xs text-secondary-500 pl-5">+{plan.features.length - 5} more features</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
export default SubscriptionDetails;
