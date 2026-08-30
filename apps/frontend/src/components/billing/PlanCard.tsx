// enterprise-ai-agent-platform/apps/frontend/src/components/billing/PlanCard.tsx
import React from 'react';
import { CheckCircle, Sparkles, AlertCircle } from 'lucide-react';

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
  overagePricing ? : {
    aiAction: number;
    apiCall: number;
    imageGeneration: number;
    videoGeneration: number;
  };
  popular ? : boolean;
  isActive: boolean;
  estimatedValue ? : string;
}

interface PlanCardProps {
  plan: Plan;
  interval: 'month' | 'year';
  isCurrentPlan: boolean;
  onSelect: () => void;
}

const formatPrice = (price: number): string => {
  if (price === 0) return 'Free';
  return `$${price / 100}`;
};

const formatOveragePrice = (price: number): string => {
  if (price === 0) return '—';
  if (price < 0.01) return `${(price * 100).toFixed(1)}¢`;
  return `$${price.toFixed(2)}`;
};

export const PlanCard: React.FC < PlanCardProps > = ({ plan, interval, isCurrentPlan, onSelect }) => {
  const price = interval === 'month' ? plan.priceMonthly : plan.priceYearly;
  const isFree = price === 0;
  const hasOverage = plan.overagePricing && plan.overagePricing.aiAction > 0;
  
  return (
    <div
      className={`
        relative bg-white dark:bg-secondary-800 rounded-xl border p-6 transition-all hover:shadow-lg
        ${plan.popular ? 'border-primary-300 dark:border-primary-700 shadow-md' : 'border-secondary-200 dark:border-secondary-700'}
        ${isCurrentPlan ? 'ring-2 ring-primary-500' : ''}
      `}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Current</span>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-secondary-900 dark:text-white">{plan.name}</h3>
        {plan.estimatedValue && (
          <p className="text-xs text-secondary-400 mt-0.5">{plan.estimatedValue}</p>
        )}
        <div className="mt-3">
          <span className="text-3xl font-bold">{formatPrice(price)}</span>
          {!isFree && (
            <span className="text-secondary-500 text-sm">/{interval}</span>
          )}
        </div>
        {interval === 'year' && plan.priceYearly > 0 && (
          <p className="text-xs text-green-600 mt-1">
            Save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%
          </p>
        )}
        <p className="text-xs text-secondary-500 mt-2">{plan.description}</p>
      </div>

      <ul className="space-y-2 mb-4">
        <li className="flex items-start gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-secondary-600 dark:text-secondary-400">
            <strong>{plan.limits.aiActions.toLocaleString()}</strong> AI Actions
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-secondary-600 dark:text-secondary-400">
            <strong>{plan.limits.apiCalls.toLocaleString()}</strong> API Calls
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-secondary-600 dark:text-secondary-400">
            Up to <strong>{plan.limits.teamMembers}</strong> team members
          </span>
        </li>
        <li className="flex items-start gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-secondary-600 dark:text-secondary-400">
            <strong>{plan.limits.storageGB}GB</strong> storage
          </span>
        </li>
        {plan.features.slice(0, 3).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-secondary-600 dark:text-secondary-400">{feature}</span>
          </li>
        ))}
        {plan.features.length > 3 && (
          <li className="text-xs text-secondary-500 pl-6">+{plan.features.length - 3} more features</li>
        )}
      </ul>

      {/* Overage Pricing Section */}
      {hasOverage && plan.overagePricing && (
        <div className="mb-4 p-3 bg-secondary-50 dark:bg-secondary-700/30 rounded-lg">
          <p className="text-xs font-medium text-secondary-500 mb-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Overage Pricing (after limit)
          </p>
          <div className="space-y-1 text-xs text-secondary-400">
            <div className="flex justify-between">
              <span>Extra AI Actions</span>
              <span className="font-medium">{formatOveragePrice(plan.overagePricing.aiAction)}/action</span>
            </div>
            <div className="flex justify-between">
              <span>Extra API Calls</span>
              <span className="font-medium">{formatOveragePrice(plan.overagePricing.apiCall)}/call</span>
            </div>
            {plan.overagePricing.imageGeneration > 0 && (
              <div className="flex justify-between">
                <span>Extra Images</span>
                <span className="font-medium">{formatOveragePrice(plan.overagePricing.imageGeneration)}/image</span>
              </div>
            )}
            {plan.overagePricing.videoGeneration > 0 && (
              <div className="flex justify-between">
                <span>Extra Videos</span>
                <span className="font-medium">{formatOveragePrice(plan.overagePricing.videoGeneration)}/video</span>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onSelect}
        disabled={isCurrentPlan || isFree}
        className={`
          w-full py-2 rounded-lg font-medium transition-colors
          ${isCurrentPlan
            ? 'bg-secondary-100 text-secondary-500 cursor-not-allowed'
            : isFree
              ? 'bg-secondary-200 text-secondary-500 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }
        `}
      >
        {isCurrentPlan ? 'Current Plan' : isFree ? 'Free Plan' : 'Upgrade'}
      </button>
    </div>
  );
};
export default PlanCard;
