// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/KpiCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KpiCardData } from '../../../types/dashboard.types';

interface KpiCardProps extends KpiCardData {
  onClick ? : () => void;
}

const trendIcon = {
  up: <TrendingUp className="h-4 w-4 text-green-600" />,
  down: <TrendingDown className="h-4 w-4 text-red-600" />,
  stable: <Minus className="h-4 w-4 text-yellow-600" />,
};

const formatValue = (value: number, unit ? : string): string => {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'USD') return `$${value.toLocaleString()}`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

export const KpiCard: React.FC < KpiCardProps > = ({
  id,
  title,
  value,
  icon,
  color = 'bg-primary-500',
  description,
  onClick,
}) => {
  const { current, previous, trend, percentageChange } = value;
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  const changeColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-yellow-600';
  
  return (
    <div
      className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
          <div className={`${color.replace('bg-', 'text-')}`}>{icon}</div>
        </div>
        {trendIcon[trend]}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">{title}</p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">
          {formatValue(current, value.unit)}
        </p>
        {previous !== undefined && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-secondary-400">vs previous:</span>
            <span className={`font-medium ${changeColor}`}>
              {isPositive ? '+' : ''}{percentageChange}%
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-secondary-400 mt-2">{description}</p>
        )}
      </div>
    </div>
  );
};
export default KpiCard;
