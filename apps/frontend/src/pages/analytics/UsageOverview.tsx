// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/UsageOverview.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Activity, DollarSign, Database } from 'lucide-react';
import { MetricCard } from '../../components/analytics/MetricCard';
import { UsageSummary } from '../../types/analytics.types';

interface UsageOverviewProps {
  summary: UsageSummary;
}

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

export const UsageOverview: React.FC<UsageOverviewProps> = ({ summary }) => {
  const metrics = [
    {
      id: 'aiActions',
      title: 'AI Actions',
      value: formatNumber(summary.aiActions.current),
      previousValue: formatNumber(summary.aiActions.previous),
      change: summary.aiActions.changePercentage,
      trend: summary.aiActions.trend,
      icon: <Zap className="h-5 w-5" />,
      color: 'bg-blue-500',
      unit: '',
    },
    {
      id: 'apiCalls',
      title: 'API Calls',
      value: formatNumber(summary.apiCalls.current),
      previousValue: formatNumber(summary.apiCalls.previous),
      change: summary.apiCalls.changePercentage,
      trend: summary.apiCalls.trend,
      icon: <Activity className="h-5 w-5" />,
      color: 'bg-green-500',
      unit: '',
    },
    {
      id: 'cost',
      title: 'Total Cost',
      value: formatCurrency(summary.totalCost.current),
      previousValue: formatCurrency(summary.totalCost.previous),
      change: summary.totalCost.changePercentage,
      trend: summary.totalCost.trend,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-purple-500',
      unit: '',
    },
    {
      id: 'tokens',
      title: 'Tokens Used',
      value: formatNumber(summary.totalTokens.current),
      previousValue: formatNumber(summary.totalTokens.previous),
      change: summary.totalTokens.changePercentage,
      trend: summary.totalTokens.trend,
      icon: <Database className="h-5 w-5" />,
      color: 'bg-orange-500',
      unit: '',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <MetricCard key={metric.id} {...metric} />
        ))}
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-sm text-secondary-500">Average Daily Usage</p>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">
              {formatNumber(summary.averageDailyUsage)} actions/day
            </p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Active Days</p>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">
              {summary.activeDays} / {new Date().getDate()} days
            </p>
          </div>
          <div className="text-sm text-secondary-500">
            <span className="font-medium">Peak Day:</span> {formatNumber(Math.max(...(summary as any).peakDay || [0]))} actions
          </div>
        </div>
      </div>
    </div>
  );
};
export default UsageOverview;
