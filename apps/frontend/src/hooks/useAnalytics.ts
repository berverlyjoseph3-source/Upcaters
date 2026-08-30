// enterprise-ai-agent-platform/apps/frontend/src/hooks/useAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analytics.service';
import { AnalyticsData, FilterOptions, ExportOptions, TimeRange } from '../types/analytics.types';

const defaultDateRange = (range: TimeRange): { start: Date;end: Date;label: string } => {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case 'day':
      start.setDate(end.getDate() - 1);
      return { start, end, label: 'Last 24 hours' };
    case 'week':
      start.setDate(end.getDate() - 7);
      return { start, end, label: 'Last 7 days' };
    case 'month':
      start.setMonth(end.getMonth() - 1);
      return { start, end, label: 'Last 30 days' };
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      return { start, end, label: 'Last 90 days' };
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      return { start, end, label: 'Last 12 months' };
    default:
      start.setMonth(end.getMonth() - 1);
      return { start, end, label: 'Last 30 days' };
  }
};

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  filters: FilterOptions;
  setDateRange: (start: Date, end: Date, label: string) => void;
  setTimeRange: (range: TimeRange) => void;
  setAgentFilter: (agentTypes: string[]) => void;
  setActionFilter: (actionTypes: string[]) => void;
  setComparisonPeriod: (period: 'previous' | 'year_over_year' | undefined) => void;
  refresh: () => Promise < void > ;
  exportData: (options: ExportOptions) => Promise < void > ;
}

export const useAnalytics = (initialTimeRange: TimeRange = 'month'): UseAnalyticsReturn => {
  const [data, setData] = useState < AnalyticsData | null > (null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  const [filters, setFilters] = useState < FilterOptions > ({
    dateRange: defaultDateRange(initialTimeRange),
    agentTypes: [],
    actionTypes: [],
    comparisonPeriod: undefined,
  });
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getAnalytics(filters);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(message);
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const setDateRange = useCallback((start: Date, end: Date, label: string) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end, label } }));
  }, []);
  
  const setTimeRange = useCallback((range: TimeRange) => {
    setFilters(prev => ({ ...prev, dateRange: defaultDateRange(range) }));
  }, []);
  
  const setAgentFilter = useCallback((agentTypes: string[]) => {
    setFilters(prev => ({ ...prev, agentTypes }));
  }, []);
  
  const setActionFilter = useCallback((actionTypes: string[]) => {
    setFilters(prev => ({ ...prev, actionTypes }));
  }, []);
  
  const setComparisonPeriod = useCallback((period: 'previous' | 'year_over_year' | undefined) => {
    setFilters(prev => ({ ...prev, comparisonPeriod: period }));
  }, []);
  
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);
  
  const exportData = useCallback(async (options: ExportOptions) => {
    const result = await analyticsService.exportData(options);
    if (result.url) {
      await analyticsService.downloadExport(result.url);
    }
  }, []);
  
  return {
    data,
    isLoading,
    error,
    filters,
    setDateRange,
    setTimeRange,
    setAgentFilter,
    setActionFilter,
    setComparisonPeriod,
    refresh,
    exportData,
  };
};