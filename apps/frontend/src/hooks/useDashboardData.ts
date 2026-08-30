// enterprise-ai-agent-platform/apps/frontend/src/hooks/useDashboardData.ts
import { useEffect } from 'react';
import { useDashboardStore } from '../store/dashboard.store';
import { DashboardType, FilterOptions } from '../types/dashboard.types';

interface UseDashboardDataOptions {
  dashboardType: DashboardType;
  filters ? : FilterOptions;
  autoRefresh ? : boolean;
  refreshInterval ? : number;
}

export const useDashboardData = ({
  dashboardType,
  filters,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseDashboardDataOptions) => {
  const {
    loadDashboardData,
    isLoading,
    error,
    lastUpdated,
    [dashboardType]: data,
  } = useDashboardStore();
  
  useEffect(() => {
    loadDashboardData(dashboardType, filters);
  }, [dashboardType, filters, loadDashboardData]);
  
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadDashboardData(dashboardType, filters);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, dashboardType, filters, loadDashboardData]);
  
  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: () => loadDashboardData(dashboardType, filters),
  };
};