// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/BudgetTracking.tsx
import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BudgetData {
  marketingCampaign: number;
  xeroing: number;
  productDevelopment: number;
  training: number;
}

interface BudgetTrackingProps {
  data: BudgetData;
}

const budgetCategories = [
  { key: 'marketingCampaign', label: 'Marketing Campaign', color: '#3b82f6' },
  { key: 'xeroing', label: 'Xeroing', color: '#10b981' },
  { key: 'productDevelopment', label: 'Product Development', color: '#f59e0b' },
  { key: 'training', label: 'Training', color: '#8b5cf6' },
];

// Mock budget targets for variance calculation
const budgetTargets: BudgetData = {
  marketingCampaign: 50000,
  xeroing: 30000,
  productDevelopment: 120000,
  training: 20000,
};

export const BudgetTracking: React.FC < BudgetTrackingProps > = ({ data }) => {
  const totalSpent = Object.values(data).reduce((sum, v) => sum + v, 0);
  const totalBudget = Object.values(budgetTargets).reduce((sum, v) => sum + v, 0);
  const overallVariance = totalBudget > 0 ? ((totalSpent - totalBudget) / totalBudget) * 100 : 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };
  
  const getVarianceIcon = (variance: number) => {
    if (variance > 5) return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (variance < -5) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-yellow-500" />;
  };
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Budget Tracking</h3>
        <DollarSign className="h-5 w-5 text-secondary-400" />
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
        <div>
          <p className="text-xs text-secondary-500">Total Budget</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatCurrency(totalBudget)}</p>
        </div>
        <div>
          <p className="text-xs text-secondary-500">Actual Spend</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatCurrency(totalSpent)}</p>
          <p className={`text-xs ${overallVariance > 0 ? 'text-red-500' : overallVariance < 0 ? 'text-green-500' : 'text-yellow-500'}`}>
            {overallVariance > 0 ? '+' : ''}{overallVariance.toFixed(1)}% vs budget
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        {budgetCategories.map((cat) => {
          const spent = data[cat.key as keyof BudgetData];
          const target = budgetTargets[cat.key as keyof BudgetData];
          const variance = target > 0 ? ((spent - target) / target) * 100 : 0;
          const percentOfBudget = target > 0 ? (spent / target) * 100 : 0;

          return (
            <div key={cat.key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-700 dark:text-secondary-300">{cat.label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-secondary-600">{formatCurrency(spent)}</span>
                  <span className="text-xs text-secondary-400">/ {formatCurrency(target)}</span>
                  {getVarianceIcon(variance)}
                </div>
              </div>
              <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, percentOfBudget)}%`, backgroundColor: cat.color }}
                />
              </div>
              <div className="flex justify-between text-xs text-secondary-400">
                <span>{percentOfBudget.toFixed(0)}% of budget</span>
                <span>{variance > 0 ? `+${variance.toFixed(0)}% over` : variance < 0 ? `${variance.toFixed(0)}% under` : 'on track'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700 text-xs text-secondary-500">
        <p>Data as of end of previous month. Projected Q2 spend on track.</p>
      </div>
    </div>
  );
};
export default BudgetTracking;
