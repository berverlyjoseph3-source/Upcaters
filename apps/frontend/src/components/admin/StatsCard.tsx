// enterprise-ai-agent-platform/apps/frontend/src/components/admin/StatsCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  id: string;
  title: string;
  value: string;
  previousValue ? : string;
  change ? : number;
  trend ? : 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
  subtitle ? : string;
  onClick ? : () => void;
}

const trendIcon = {
  up: <TrendingUp className="h-4 w-4 text-green-600" />,
  down: <TrendingDown className="h-4 w-4 text-red-600" />,
  stable: <Minus className="h-4 w-4 text-yellow-600" />,
};

export const StatsCard: React.FC < StatsCardProps > = ({
  title,
  value,
  previousValue,
  change,
  trend = 'stable',
  icon,
  color,
  subtitle,
  onClick,
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  
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
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value}</p>
        
        {previousValue && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-secondary-400">vs previous:</span>
            <span className={`font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-yellow-600'}`}>
              {change !== undefined && (change > 0 ? '+' : '')}{change?.toFixed(1)}%
            </span>
            <span className="text-secondary-400">({previousValue})</span>
          </div>
        )}
        
        {subtitle && (
          <p className="text-xs text-secondary-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
export default StatsCard;
