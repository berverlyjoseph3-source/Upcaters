// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/CostAnalysis.tsx
import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { BarChart, LineChart, PieChart } from '../../components/dashboard/charts';
import { CostBreakdown, DailyUsage } from '../../types/analytics.types';
import { format } from 'date-fns';

interface CostAnalysisProps {
  costBreakdown: CostBreakdown;
  dailyUsage: DailyUsage[];
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

export const CostAnalysis: React.FC < CostAnalysisProps > = ({ costBreakdown, dailyUsage }) => {
  const [costMetric, setCostMetric] = useState < 'daily' | 'byAgent' | 'byAction' > ('daily');
  
  const dailyCostData = dailyUsage.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    cost: day.cost,
  }));
  
  const agentCostData = costBreakdown.byAgent.map(agent => ({
    name: agent.agentType.charAt(0).toUpperCase() + agent.agentType.slice(1),
    cost: agent.cost,
  }));
  
  const actionCostData = costBreakdown.byAction.slice(0, 10).map(action => ({
    name: action.actionType.replace(/_/g, ' '),
    cost: action.cost,
  }));
  
  const totalCost = costBreakdown.totalCost;
  const averageDailyCost = dailyCostData.reduce((sum, d) => sum + d.cost, 0) / (dailyCostData.length || 1);
  const maxDailyCost = Math.max(...dailyCostData.map(d => d.cost), 0);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-primary-600" />
            <p className="text-sm text-secondary-500">Total Cost</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-sm text-secondary-500">Average Daily Cost</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(averageDailyCost)}</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-orange-600" />
            <p className="text-sm text-secondary-500">Highest Daily Cost</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(maxDailyCost)}</p>
        </div>
      </div>

      {/* Cost Metric Selector */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setCostMetric('daily')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            costMetric === 'daily'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          Daily Trend
        </button>
        <button
          onClick={() => setCostMetric('byAgent')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            costMetric === 'byAgent'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          By Agent
        </button>
        <button
          onClick={() => setCostMetric('byAction')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            costMetric === 'byAction'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          By Action (Top 10)
        </button>
      </div>

      {/* Chart */}
      <ChartContainer title="Cost Analysis" description="Breakdown of your spending">
        {costMetric === 'daily' && (
          <LineChart data={dailyCostData} xKey="date" yKey="cost" color="#8b5cf6" />
        )}
        {costMetric === 'byAgent' && (
          <BarChart data={agentCostData} xKey="name" yKey="cost" color="#f59e0b" />
        )}
        {costMetric === 'byAction' && (
          <BarChart data={actionCostData} xKey="name" yKey="cost" color="#ec489a" layout="vertical" />
        )}
      </ChartContainer>

      {/* Cost Efficiency Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-2">💡 Cost Optimization Tips</h3>
        <ul className="space-y-1 text-sm text-secondary-600 dark:text-secondary-400">
          <li>• Consider batching API calls to reduce per-call costs</li>
          <li>• Use caching for frequently requested data</li>
          <li>• Review top-cost actions for potential optimization</li>
          <li>• Upgrade to a higher plan for better per-unit pricing</li>
        </ul>
      </div>
    </div>
  );
};
export default CostAnalysis;
