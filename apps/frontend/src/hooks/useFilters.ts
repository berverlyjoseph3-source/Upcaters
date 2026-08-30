// enterprise-ai-agent-platform/apps/frontend/src/hooks/useFilters.ts
import { useState, useCallback, useEffect } from 'react';
import { FilterOptions } from '../types/dashboard.types';

const defaultFilters: FilterOptions = {
  dateRange: {
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
    label: 'Last 30 days',
  },
  productType: [],
  region: [],
  segment: undefined,
  minPrice: undefined,
  maxPrice: undefined,
};

interface UseFiltersOptions {
  initialFilters ? : Partial < FilterOptions > ;
  onFilterChange ? : (filters: FilterOptions) => void;
  debounceMs ? : number;
}

export const useFilters = ({ initialFilters, onFilterChange, debounceMs = 300 }: UseFiltersOptions = {}) => {
    const [filters, setFilters] = useState < FilterOptions > ({ ...defaultFilters, ...initialFilters });
    const [debouncedFilters, setDebouncedFilters] = useState < FilterOptions > (filters);
    
    // Update a specific filter field
    const updateFilter = useCallback(<K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters, ...initialFilters });
  }, [initialFilters]);

  // Clear a specific filter field
  const clearFilter = useCallback(<K extends keyof FilterOptions>(key: K) => {
    setFilters(prev => ({ ...prev, [key]: defaultFilters[key] }));
  }, []);

  // Check if any filter is active (besides default date range)
  const hasActiveFilters = useCallback((): boolean => {
    return !!(filters.productType?.length ||
      filters.region?.length ||
      filters.segment ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined);
  }, [filters]);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      onFilterChange?.(filters);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [filters, debounceMs, onFilterChange]);

  return {
    filters,
    debouncedFilters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters: hasActiveFilters(),
  };
};