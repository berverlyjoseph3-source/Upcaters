// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/DashboardHub.tsx
import React, { useEffect, useState } from 'react';
import { useDashboardStore } from '../../store/dashboard.store';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { DashboardType } from '../../types/dashboard.types';
import { OperationalDashboard } from './OperationalDashboard';
import { AnalyticalDashboard } from './AnalyticalDashboard';
import { StrategicDashboard } from './StrategicDashboard';
import { TacticalDashboard } from './TacticalDashboard';
import { InformationalDashboard } from './InformationalDashboard';
import { FilterBar } from '../../components/dashboard/common/FilterBar';
import { RealTimeIndicator } from '../../components/dashboard/common/RealTimeIndicator';
import { RefreshCw, AlertCircle } from 'lucide-react';

const dashboardTabs: { id: DashboardType;label: string;description: string } [] = [
  { id: 'operational', label: 'Operational', description: 'Real-time operational metrics' },
  { id: 'analytical', label: 'Analytical', description: 'Deep analytics and correlations' },
  { id: 'strategic', label: 'Strategic', description: 'High-level KPIs and long-term trends' },
  { id: 'tactical', label: 'Tactical', description: 'Project tracking and team performance' },
  { id: 'informational', label: 'Informational', description: 'Public-facing statistics' },
];

export const DashboardHub: React.FC = () => {
  const {
    activeDashboard,
    setActiveDashboard,
    filters,
    isLoading,
    error,
    lastUpdated,
    loadDashboardData,
    refreshAll,
    clearError,
  } = useDashboardStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Enable real-time updates for the active dashboard
  const { isConnected } = useRealTimeUpdates(activeDashboard, true);
  
  // Load initial data when dashboard or filters change
  useEffect(() => {
    loadDashboardData(activeDashboard);
  }, [activeDashboard, loadDashboardData]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  };
  
  const renderActiveDashboard = () => {
    switch (activeDashboard) {
      case 'operational':
        return <OperationalDashboard />;
      case 'analytical':
        return <AnalyticalDashboard />;
      case 'strategic':
        return <StrategicDashboard />;
      case 'tactical':
        return <TacticalDashboard />;
      case 'informational':
        return <InformationalDashboard />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Dashboards</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Monitor and analyze your business performance in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealTimeIndicator isConnected={isConnected} lastUpdated={lastUpdated} />
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex flex-wrap gap-1">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDashboard(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all
                ${activeDashboard === tab.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                  : 'text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-800'
                }
              `}
            >
              {tab.label}
              <span className="hidden sm:inline ml-1 text-xs text-secondary-400">({tab.description})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={(newFilters) => {
        // Partial filter update handled by store
        useDashboardStore.getState().setFilters(newFilters);
      }} />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-secondary-600">Loading dashboard data...</span>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && renderActiveDashboard()}
    </div>
  );
};
export default DashboardHub;
