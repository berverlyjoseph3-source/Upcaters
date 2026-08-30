// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/MetricCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  value: string;
  previousValue ? : string;
  change ? : number;
  trend ? : 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  unit ? : string;
  onClick ? : () => void;
}

const trendIcon = {
  up: <TrendingUp className="h-4 w-4 text-green-600" />,
  down: <TrendingDown className="h-4 w-4 text-red-600" />,
  stable: <Minus className="h-4 w-4 text-yellow-600" />,
};

const getChangeColor = (change ? : number): string => {
  if (!change) return 'text-secondary-500';
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-yellow-600';
};

export const MetricCard: React.FC < MetricCardProps > = ({
  title,
  value,
  previousValue,
  change,
  trend = 'stable',
  icon,
  color,
  unit = '',
  onClick,
}) => {
  const changeColor = getChangeColor(change);
  
  return (
    <div
      className={`
        bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5
        transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
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
          {value}{unit && <span className="text-sm font-normal text-secondary-500 ml-1">{unit}</span>}
        </p>
        
        {previousValue && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-secondary-400">vs previous:</span>
            <span className={`font-medium ${changeColor}`}>
              {change !== undefined && (change > 0 ? '+' : '')}{change}%
            </span>
            <span className="text-secondary-400">({previousValue})</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default MetricCard;
