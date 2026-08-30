// enterprise-ai-agent-platform/apps/frontend/src/components/admin/PlanChangeModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  DollarSign, Users, Zap, Activity, Shield, Star,
  ArrowUpRight, ArrowDownRight, CreditCard, RefreshCw,
  Info, Target, Award, Sparkles, Crown
} from 'lucide-react';
import { AdminUser, PlanId } from '../../types/admin.types';
import { formatCurrency, formatCompactNumber, formatDate } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

interface PlanOption {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  color: string;
  gradient: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ReactNode;
  limits: {
    aiActions: number | 'unlimited';
    apiCalls: number | 'unlimited';
    teamMembers: number;
    storageGB: number;
  };
  features: string[];
  overagePricing: {
    aiAction: number;
    apiCall: number;
    imageGeneration: number;
    videoGeneration: number;
  };
  popular?: boolean;
  displayOrder: number;
}

interface UserUsageData {
  aiActionsUsed: number;
  aiActionsLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  currentOverageCost: number;
  projectedOverageCost: number;
  usageTrend: 'increasing' | 'decreasing' | 'stable';
}

interface PlanChangeModalProps {
  user: AdminUser;
  currentUsage?: UserUsageData;
  onClose: () => void;
  onConfirm: (userId: string, planId: PlanId, sendNotification?: boolean) => Promise<void>;
  onNotifyUser?: (userId: string) => void;
}

// ============================================
// Plan Configurations
// ============================================

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'FREE',
    name: 'Free',
    description: 'Basic access for trying out the platform',
    priceMonthly: 0,
    priceYearly: 0,
    color: '#94a3b8',
    gradient: 'from-gray-400 to-gray-500',
    bgClass: 'bg-gray-50 dark:bg-gray-900/20',
    textClass: 'text-gray-700 dark:text-gray-300',
    borderClass: 'border-gray-200 dark:border-gray-800',
    icon: <Target className="h-5 w-5" />,
    limits: { aiActions: 50, apiCalls: 100, teamMembers: 1, storageGB: 0.1 },
    features: ['Email Agent', 'Calendar Agent', 'Web Agent', 'Basic Content', 'Community Support'],
    overagePricing: { aiAction: 0, apiCall: 0, imageGeneration: 0, videoGeneration: 0 },
    displayOrder: 1,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    description: 'For individuals and small teams',
    priceMonthly: 3900,
    priceYearly: 37440,
    color: '#3b82f6',
    gradient: 'from-blue-500 to-blue-600',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    icon: <Zap className="h-5 w-5" />,
    limits: { aiActions: 500, apiCalls: 2000, teamMembers: 3, storageGB: 1 },
    features: ['All Free features', 'Drive Agent', 'Social Posting', 'Task Agent', 'Priority Support'],
    overagePricing: { aiAction: 0.05, apiCall: 0.01, imageGeneration: 0.10, videoGeneration: 1.00 },
    displayOrder: 2,
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    description: 'For growing businesses and teams',
    priceMonthly: 12900,
    priceYearly: 123840,
    color: '#8b5cf6',
    gradient: 'from-purple-500 to-purple-600',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-200 dark:border-purple-800',
    icon: <Award className="h-5 w-5" />,
    limits: { aiActions: 2500, apiCalls: 15000, teamMembers: 10, storageGB: 10 },
    features: ['All Starter features', 'Image Generation', 'Multi-platform Posts', 'API Access', 'Email Support'],
    overagePricing: { aiAction: 0.05, apiCall: 0.01, imageGeneration: 0.10, videoGeneration: 1.00 },
    popular: true,
    displayOrder: 3,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    priceMonthly: 59900,
    priceYearly: 575040,
    color: '#f59e0b',
    gradient: 'from-amber-500 to-amber-600',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200 dark:border-amber-800',
    icon: <Crown className="h-5 w-5" />,
    limits: { aiActions: 10000, apiCalls: 50000, teamMembers: 100, storageGB: 100 },
    features: ['All Professional features', 'Video Generation', 'White-label', 'Custom Integrations', 'SLA Guarantee', '24/7 Support', 'Dedicated Manager'],
    overagePricing: { aiAction: 0.02, apiCall: 0.005, imageGeneration: 0.05, videoGeneration: 0.50 },
    displayOrder: 4,
  },
];

// ============================================
// Component
// ============================================

export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  user,
  currentUsage,
  onClose,
  onConfirm,
  onNotifyUser,
}) => {
  // State
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(user.planId);
  const [sendNotification, setSendNotification] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [confirmedPlan, setConfirmedPlan] = useState<PlanId | null>(null);

  // Current plan
  const currentPlanConfig = PLAN_OPTIONS.find(p => p.id === user.planId) || PLAN_OPTIONS[0];
  const selectedPlanConfig = PLAN_OPTIONS.find(p => p.id === selectedPlan) || PLAN_OPTIONS[0];

  // Upgrade/Downgrade analysis
  const planChange = useMemo(() => {
    const isUpgrade = PLAN_OPTIONS.findIndex(p => p.id === selectedPlan) > PLAN_OPTIONS.findIndex(p => p.id === user.planId);
    const isDowngrade = PLAN_OPTIONS.findIndex(p => p.id === selectedPlan) < PLAN_OPTIONS.findIndex(p => p.id === user.planId);
    
    // Calculate cost comparison
    const currentMonthlyCost = currentPlanConfig.priceMonthly;
    const newMonthlyCost = selectedPlanConfig.priceMonthly;
    const costDifference = newMonthlyCost - currentMonthlyCost;
    
    // Calculate potential overage savings
    let overageSavings = 0;
    if (currentUsage && isUpgrade) {
      const currentOverage = currentUsage.currentOverageCost;
      const projectedNewOverage = calculateProjectedOverage(currentUsage, selectedPlanConfig);
      overageSavings = currentOverage - projectedNewOverage;
    }

    return {
      isUpgrade,
      isDowngrade,
      currentMonthlyCost,
      newMonthlyCost,
      costDifference,
      overageSavings: Math.max(0, overageSavings),
      netMonthlyChange: costDifference - overageSavings,
    };
  }, [selectedPlan, user.planId, currentUsage, currentPlanConfig, selectedPlanConfig]);

  // Calculate projected overage on new plan
  const calculateProjectedOverage = (usage: UserUsageData, plan: PlanOption): number => {
    const aiActionsLimit = typeof plan.limits.aiActions === 'number' ? plan.limits.aiActions : Infinity;
    const apiCallsLimit = typeof plan.limits.apiCalls === 'number' ? plan.limits.apiCalls : Infinity;
    
    const aiOverage = Math.max(0, usage.aiActionsUsed - aiActionsLimit);
    const apiOverage = Math.max(0, usage.apiCallsUsed - apiCallsLimit);
    
    return (aiOverage * plan.overagePricing.aiAction) + (apiOverage * plan.overagePricing.apiCall);
  };

  // Handle confirm
  const handleConfirm = async () => {
    if (selectedPlan === user.planId) {
      onClose();
      return;
    }

    setConfirmedPlan(selectedPlan);
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(user.id, selectedPlan, sendNotification);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change plan');
      setConfirmedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Format limit display
  const formatLimit = (value: number | 'unlimited'): string => {
    if (value === 'unlimited') return 'Unlimited';
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Change Plan</h2>
              <p className="text-sm text-secondary-500">
                {user.name || user.email} • Current: <span className={`font-medium ${currentPlanConfig.textClass}`}>{currentPlanConfig.name}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* User Summary */}
          {currentUsage && (
            <div className="bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-700 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Current Usage Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-secondary-500">AI Actions</p>
                  <p className="text-sm font-medium">
                    {formatCompactNumber(currentUsage.aiActionsUsed)} / {formatLimit(currentUsage.aiActionsLimit)}
                  </p>
                  <div className="w-full h-1.5 bg-secondary-200 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentUsage.aiActionsUsed / currentUsage.aiActionsLimit) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">API Calls</p>
                  <p className="text-sm font-medium">
                    {formatCompactNumber(currentUsage.apiCallsUsed)} / {formatLimit(currentUsage.apiCallsLimit)}
                  </p>
                  <div className="w-full h-1.5 bg-secondary-200 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, (currentUsage.apiCallsUsed / currentUsage.apiCallsLimit) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Current Overage Cost</p>
                  <p className="text-sm font-medium text-red-600">{formatCurrency(currentUsage.currentOverageCost)}</p>
                  <p className="text-xs text-secondary-400 mt-1">
                    Trend: <span className={currentUsage.usageTrend === 'increasing' ? 'text-red-500' : currentUsage.usageTrend === 'decreasing' ? 'text-green-500' : 'text-secondary-500'}>
                      {currentUsage.usageTrend}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-secondary-500">Projected Overage</p>
                  <p className="text-sm font-medium text-orange-600">{formatCurrency(currentUsage.projectedOverageCost)}</p>
                  <p className="text-xs text-secondary-400 mt-1">End of period</p>
                </div>
              </div>
            </div>
          )}

          {/* Plan Selection Grid */}
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Select New Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {PLAN_OPTIONS.map(plan => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = user.planId === plan.id;
              const isRecommended = currentUsage && 
                calculateProjectedOverage(currentUsage, plan) < currentUsage.currentOverageCost &&
                plan.id !== user.planId;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg scale-105'
                      : isCurrent
                        ? 'border-secondary-300 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-800/50'
                        : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3" /> Most Popular
                      </span>
                    </div>
                  )}

                  {/* Current Badge */}
                  {isCurrent && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Current
                      </span>
                    </div>
                  )}

                  {/* Recommended Badge */}
                  {isRecommended && !isCurrent && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Recommended
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white`}>
                      {plan.icon}
                    </div>
                    <span className="font-semibold text-secondary-900 dark:text-white">{plan.name}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-3">
                    {plan.priceMonthly === 0 ? (
                      <p className="text-2xl font-bold text-secondary-900 dark:text-white">Free</p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                          {formatCurrency(plan.priceMonthly / 100)}
                          <span className="text-sm font-normal text-secondary-500">/mo</span>
                        </p>
                        <p className="text-xs text-secondary-400">
                          {formatCurrency(plan.priceYearly / 100)}/yr (save 20%)
                        </p>
                      </>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-1 mb-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary-500">AI Actions</span>
                      <span className="font-medium">{formatLimit(plan.limits.aiActions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">API Calls</span>
                      <span className="font-medium">{formatLimit(plan.limits.apiCalls)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Team</span>
                      <span className="font-medium">{plan.limits.teamMembers}</span>
                    </div>
                  </div>

                  {/* Overage Pricing */}
                  {plan.priceMonthly > 0 && (
                    <div className="mb-3 p-2 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg">
                      <p className="text-xs font-medium text-secondary-500 mb-1">Overage Rates:</p>
                      <div className="grid grid-cols-2 gap-x-2 text-xs">
                        <span className="text-secondary-400">AI: {formatCurrency(plan.overagePricing.aiAction)}</span>
                        <span className="text-secondary-400">API: {formatCurrency(plan.overagePricing.apiCall)}</span>
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-1">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-secondary-600 dark:text-secondary-400">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-xs text-secondary-400 pl-5">+{plan.features.length - 4} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Comparison Analysis */}
          {selectedPlan !== user.planId && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Change Analysis
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Plan Cost Change</p>
                  <p className={`text-lg font-bold flex items-center gap-1 ${
                    planChange.costDifference > 0 ? 'text-red-600' : planChange.costDifference < 0 ? 'text-green-600' : 'text-secondary-600'
                  }`}>
                    {planChange.costDifference > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {planChange.costDifference > 0 ? '+' : ''}{formatCurrency(planChange.costDifference / 100)}/mo
                  </p>
                </div>
                {currentUsage && (
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Est. Overage Savings</p>
                    <p className={`text-lg font-bold ${planChange.overageSavings > 0 ? 'text-green-600' : 'text-secondary-600'}`}>
                      {planChange.overageSavings > 0 ? '-' : ''}{formatCurrency(planChange.overageSavings)}/mo
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Net Monthly Change</p>
                  <p className={`text-lg font-bold flex items-center gap-1 ${
                    planChange.netMonthlyChange > 0 ? 'text-red-600' : planChange.netMonthlyChange < 0 ? 'text-green-600' : 'text-secondary-600'
                  }`}>
                    {planChange.netMonthlyChange > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {planChange.netMonthlyChange > 0 ? '+' : ''}{formatCurrency(planChange.netMonthlyChange / 100)}/mo
                  </p>
                </div>
              </div>

              {planChange.isDowngrade && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Downgrade Notice</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                        Downgrading will remove access to premium features immediately. The user may lose access to active data and integrations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentUsage && planChange.isUpgrade && planChange.overageSavings > 0 && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">Upgrade Benefit</p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Upgrading could save approximately {formatCurrency(planChange.overageSavings)}/mo in overage charges.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-secondary-200 dark:border-secondary-700 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-primary-600"
              />
              <span className="text-sm text-secondary-600 dark:text-secondary-400">
                Send email notification to user
              </span>
            </label>
            {onNotifyUser && (
              <button
                onClick={() => onNotifyUser(user.id)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Preview notification
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || selectedPlan === user.planId}
              className="px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Changing Plan...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  {selectedPlan === user.planId 
                    ? 'No Change' 
                    : `Change to ${selectedPlanConfig.name}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default PlanChangeModal;
