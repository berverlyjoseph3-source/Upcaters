// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/MetricSelector.tsx
import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MetricOption {
  id: string;
  label: string;
  category ? : string;
}

interface MetricSelectorProps {
  options: MetricOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder ? : string;
  multiSelect ? : boolean;
}

export const MetricSelector: React.FC < MetricSelectorProps > = ({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select metrics',
  multiSelect = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  
  const toggleMetric = (id: string) => {
    if (multiSelect) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter(s => s !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange([id]);
      setIsOpen(false);
    }
  };
  
  const selectedLabels = options.filter(o => selectedIds.includes(o.id)).map(o => o.label);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-sm bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
      >
        <span className="truncate">
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 ml-2" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50">
          <div className="p-2 border-b border-secondary-200 dark:border-secondary-700">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggleMetric(opt.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <span>{opt.label}</span>
                {selectedIds.includes(opt.id) && <Check className="h-4 w-4 text-primary-600" />}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-secondary-500">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default MetricSelector;
