// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/CustomTooltip.tsx
import React from 'react';
import { format } from 'date-fns';

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey ? : string;
}

interface CustomTooltipProps {
  active ? : boolean;
  payload ? : TooltipPayload[];
  label ? : string;
  valuePrefix ? : string;
  valueSuffix ? : string;
  dateFormat ? : string;
}

const formatValue = (value: number, prefix ? : string, suffix ? : string): string => {
  let formatted = value.toString();
  if (value >= 1_000_000) formatted = `${(value / 1_000_000).toFixed(1)}M`;
  else if (value >= 1_000) formatted = `${(value / 1_000).toFixed(1)}K`;
  else formatted = value.toLocaleString();
  
  if (prefix === '$') return `$${formatted}`;
  if (prefix === '%') return `${formatted}%`;
  if (suffix === 'ms') return `${formatted}ms`;
  if (suffix === ' tokens') return `${formatted} tokens`;
  return formatted;
};

export const CustomTooltip: React.FC < CustomTooltipProps > = ({
  active,
  payload,
  label,
  valuePrefix,
  valueSuffix,
  dateFormat = 'MMM dd, yyyy'
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  
  const formattedDate = label ? format(new Date(label), dateFormat) : label;
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 p-3 min-w-[180px]">
      <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-2 border-b border-secondary-200 dark:border-secondary-700 pb-1">
        {formattedDate}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-secondary-700 dark:text-secondary-300 capitalize">
                {entry.name.replace(/_/g, ' ')}
              </span>
            </div>
            <span className="text-sm font-semibold text-secondary-900 dark:text-white">
              {formatValue(entry.value, valuePrefix, valueSuffix)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CustomCostTooltip: React.FC < CustomTooltipProps > = (props) => (
  <CustomTooltip {...props} valuePrefix="$" />
);

export const CustomPercentageTooltip: React.FC < CustomTooltipProps > = (props) => (
  <CustomTooltip {...props} valueSuffix="%" />
);

export const CustomDurationTooltip: React.FC < CustomTooltipProps > = (props) => (
  <CustomTooltip {...props} valueSuffix="ms" />
);
export default CustomTooltip;
