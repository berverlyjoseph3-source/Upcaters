// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/FilterBar.tsx
import React, { useState } from 'react';
import { Filter, Calendar, X, ChevronDown } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { MetricSelector } from './MetricSelector';
import { FilterOptions } from '../../../types/dashboard.types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: Partial < FilterOptions > ) => void;
  showProductType ? : boolean;
  showRegion ? : boolean;
  showPriceRange ? : boolean;
  showSegment ? : boolean;
}

export const FilterBar: React.FC < FilterBarProps > = ({
  filters,
  onFilterChange,
  showProductType = true,
  showRegion = true,
  showPriceRange = true,
  showSegment = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const productTypes = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys'];
  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'];
  const segments = ['high-value', 'new-sales', 'at-risk', 'dormant'];
  
  const handleDateRangeChange = (start: Date, end: Date, label: string) => {
    onFilterChange({ dateRange: { start, end, label } });
  };
  
  const toggleProductType = (type: string) => {
    const current = filters.productType || [];
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    onFilterChange({ productType: updated });
  };
  
  const toggleRegion = (region: string) => {
    const current = filters.region || [];
    const updated = current.includes(region) ? current.filter(r => r !== region) : [...current, region];
    onFilterChange({ region: updated });
  };
  
  const handleSegmentChange = (segment: string) => {
    onFilterChange({ segment: segment as any });
  };
  
  const handlePriceChange = (min: number, max: number) => {
    onFilterChange({ minPrice: min, maxPrice: max });
  };
  
  const clearAllFilters = () => {
    onFilterChange({
      productType: [],
      region: [],
      minPrice: undefined,
      maxPrice: undefined,
      segment: undefined,
    });
  };
  
  const activeFilterCount = (filters.productType?.length || 0) + (filters.region?.length || 0) + (filters.segment ? 1 : 0) + (filters.minPrice !== undefined ? 1 : 0);
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-secondary-500" />
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            startDate={filters.dateRange.start}
            endDate={filters.dateRange.end}
            onChange={handleDateRangeChange}
          />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-secondary-600 hover:text-secondary-900 dark:text-secondary-400"
          >
            {isExpanded ? 'Show less' : 'More filters'}
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {showProductType && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Product Type</label>
                <div className="flex flex-wrap gap-2">
                  {productTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleProductType(type)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filters.productType?.includes(type)
                          ? 'bg-primary-600 text-white'
                          : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showRegion && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Region</label>
                <div className="flex flex-wrap gap-2">
                  {regions.map(region => (
                    <button
                      key={region}
                      onClick={() => toggleRegion(region)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filters.region?.includes(region)
                          ? 'bg-primary-600 text-white'
                          : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-300'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showPriceRange && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Price Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice ?? ''}
                    onChange={(e) => handlePriceChange(Number(e.target.value), filters.maxPrice ?? 1000)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                  />
                  <span className="text-secondary-500">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice ?? ''}
                    onChange={(e) => handlePriceChange(filters.minPrice ?? 0, Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                  />
                </div>
              </div>
            )}

            {showSegment && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Customer Segment</label>
                <div className="flex flex-wrap gap-2">
                  {segments.map(segment => (
                    <button
                      key={segment}
                      onClick={() => handleSegmentChange(segment)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors capitalize ${
                        filters.segment === segment
                          ? 'bg-primary-600 text-white'
                          : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-300'
                      }`}
                    >
                      {segment.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default FilterBar;
