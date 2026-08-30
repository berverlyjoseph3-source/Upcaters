// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/ComparisonSelector.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface ComparisonSelectorProps {
  value ? : 'previous' | 'year_over_year';
  onChange: (value: 'previous' | 'year_over_year' | undefined) => void;
  className ? : string;
}

const options = [
  { value: undefined, label: 'No comparison' },
  { value: 'previous', label: 'vs Previous Period' },
  { value: 'year_over_year', label: 'vs Same Period Last Year' },
];

export const ComparisonSelector: React.FC < ComparisonSelectorProps > = ({ value, onChange, className = '' }) => {
  const selectedLabel = options.find(o => o.value === value)?.label || 'No comparison';
  
  return (
    <div className={`relative ${className}`}>
      <select
        value={value || ''}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? undefined : val as 'previous' | 'year_over_year');
        }}
        className="w-full px-3 py-2 text-sm bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-primary-500"
      >
        {options.map(opt => (
          <option key={opt.label} value={opt.value || ''}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
    </div>
  );
};
export default ComparisonSelector;
