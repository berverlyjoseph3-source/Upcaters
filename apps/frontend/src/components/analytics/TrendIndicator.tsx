// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/TrendIndicator.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface TrendIndicatorProps {
  value: number;
  previousValue: number;
  format ? : 'percentage' | 'absolute' | 'both';
  size ? : 'sm' | 'md' | 'lg';
  showIcon ? : boolean;
  className ? : string;
}

const sizeStyles = {
  sm: { text: 'text-xs', icon: 'h-3 w-3', gap: 'gap-0.5' },
  md: { text: 'text-sm', icon: 'h-4 w-4', gap: 'gap-1' },
  lg: { text: 'text-base', icon: 'h-5 w-5', gap: 'gap-1.5' },
};

const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
};

const getChangePercentage = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const getChangeAbsolute = (current: number, previous: number): number => {
  return current - previous;
};

const formatNumber = (num: number): string => {
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

export const TrendIndicator: React.FC < TrendIndicatorProps > = ({
  value,
  previousValue,
  format = 'percentage',
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const trend = getTrend(value, previousValue);
  const changePercent = getChangePercentage(value, previousValue);
  const changeAbsolute = getChangeAbsolute(value, previousValue);
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  
  const colorClass = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-yellow-600';
  const bgClass = isPositive ? 'bg-green-100 dark:bg-green-900/30' : isNegative ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30';
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const ArrowIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  
  const sizeStyle = sizeStyles[size];
  
  const getDisplayValue = (): string => {
    if (format === 'percentage') {
      return `${isPositive ? '+' : ''}${changePercent.toFixed(1)}%`;
    }
    if (format === 'absolute') {
      return `${isPositive ? '+' : ''}${formatNumber(Math.abs(changeAbsolute))}`;
    }
    // both
    return `${isPositive ? '+' : ''}${changePercent.toFixed(1)}% (${isPositive ? '+' : ''}${formatNumber(Math.abs(changeAbsolute))})`;
  };
  
  // Don't show if no change
  if (trend === 'stable' && changePercent === 0) {
    return (
      <div className={`inline-flex items-center ${sizeStyle.gap} ${className}`}>
        {showIcon && <Minus className={`${sizeStyle.icon} text-secondary-400`} />}
        <span className={`${sizeStyle.text} text-secondary-500`}>No change</span>
      </div>
    );
  }
  
  return (
    <div className={`inline-flex items-center ${sizeStyle.gap} ${className}`}>
      {showIcon && (
        <div className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full ${bgClass}`}>
          <ArrowIcon className={`${sizeStyle.icon} ${colorClass}`} />
        </div>
      )}
      <span className={`${sizeStyle.text} font-medium ${colorClass}`}>
        {getDisplayValue()}
      </span>
    </div>
  );
};

// Simplified version for use in metric cards
export const SimpleTrend: React.FC < { change: number;size ? : 'sm' | 'md' | 'lg' } > = ({ change, size = 'sm' }) => {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const colorClass = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-yellow-600';
  const sizeStyle = sizeStyles[size];
  
  return (
    <div className={`inline-flex items-center ${sizeStyle.gap}`}>
      {isPositive ? <TrendingUp className={`${sizeStyle.icon} ${colorClass}`} /> : 
       isNegative ? <TrendingDown className={`${sizeStyle.icon} ${colorClass}`} /> : 
       <Minus className={`${sizeStyle.icon} ${colorClass}`} />}
      <span className={`${sizeStyle.text} font-medium ${colorClass}`}>
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    </div>
  );
};
export default TrendIndicator;
