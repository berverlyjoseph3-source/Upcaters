// enterprise-ai-agent-platform/apps/frontend/src/components/billing/UsageMeter.tsx
import React from 'react';
import { TrendingUp, Zap, AlertTriangle } from 'lucide-react';

interface UsageMeterProps {
  aiActionsUsed: number;
  aiActionsLimit: number | 'unlimited';
  apiCallsUsed: number;
  apiCallsLimit: number | 'unlimited';
  resetDate: Date;
}

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const getPercentage = (used: number, limit: number | 'unlimited'): number => {
  if (limit === 'unlimited') return 0;
  return Math.min(100, (used / limit) * 100);
};

const getColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

const getStatusText = (percentage: number): { text: string;icon: React.ReactNode } => {
  if (percentage >= 90) {
    return { text: 'Critical', icon: <AlertTriangle className="h-4 w-4 text-red-500" /> };
  }
  if (percentage >= 70) {
    return { text: 'Warning', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> };
  }
  return { text: 'Good', icon: <TrendingUp className="h-4 w-4 text-green-500" /> };
};

export const UsageMeter: React.FC < UsageMeterProps > = ({
  aiActionsUsed,
  aiActionsLimit,
  apiCallsUsed,
  apiCallsLimit,
  resetDate,
}) => {
  const aiPercentage = getPercentage(aiActionsUsed, aiActionsLimit);
  const apiPercentage = getPercentage(apiCallsUsed, apiCallsLimit);
  const aiStatus = getStatusText(aiPercentage);
  const apiStatus = getStatusText(apiPercentage);
  
  const daysUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Current Usage</h3>
        <div className="text-xs text-secondary-500">
          Resets in {daysUntilReset} days
        </div>
      </div>

      <div className="space-y-4">
        {/* AI Actions Meter */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary-500" />
              <span className="font-medium">AI Actions</span>
              {aiStatus.icon}
              <span className={`text-xs ${aiPercentage >= 90 ? 'text-red-500' : aiPercentage >= 70 ? 'text-yellow-500' : 'text-green-500'}`}>
                {aiStatus.text}
              </span>
            </div>
            <span>
              {formatNumber(aiActionsUsed)} / {aiActionsLimit === 'unlimited' ? '∞' : formatNumber(aiActionsLimit)}
            </span>
          </div>
          {aiActionsLimit !== 'unlimited' && (
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getColor(aiPercentage)} rounded-full transition-all duration-500`}
                style={{ width: `${aiPercentage}%` }}
              />
            </div>
          )}
        </div>

        {/* API Calls Meter */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="font-medium">API Calls</span>
              {apiStatus.icon}
              <span className={`text-xs ${apiPercentage >= 90 ? 'text-red-500' : apiPercentage >= 70 ? 'text-yellow-500' : 'text-green-500'}`}>
                {apiStatus.text}
              </span>
            </div>
            <span>
              {formatNumber(apiCallsUsed)} / {apiCallsLimit === 'unlimited' ? '∞' : formatNumber(apiCallsLimit)}
            </span>
          </div>
          {apiCallsLimit !== 'unlimited' && (
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getColor(apiPercentage)} rounded-full transition-all duration-500`}
                style={{ width: `${apiPercentage}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700 text-xs text-secondary-500 text-center">
        Usage resets on {resetDate.toLocaleDateString()}. Upgrade to increase limits.
      </div>
    </div>
  );
};
export default UsageMeter;
