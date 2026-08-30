// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/AnalyticsPage.tsx
import React, { useState } from 'react';
import { BarChart3, Download, Calendar, Filter, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { UsageOverview } from './UsageOverview';
import { UsageCharts } from './UsageCharts';
import { UsageBreakdown } from './UsageBreakdown';
import { CostAnalysis } from './CostAnalysis';
import { ExportPanel } from './ExportPanel';
import { ForecastPanel } from './ForecastPanel';
import { DateRangeFilter } from '../../components/analytics/DateRangeFilter';
import { AgentFilter } from '../../components/analytics/AgentFilter';
import { ActionTypeFilter } from '../../components/analytics/ActionTypeFilter';
import { ComparisonSelector } from '../../components/analytics/ComparisonSelector';

type AnalyticsTab = 'overview' | 'breakdown' | 'cost' | 'forecast';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState < AnalyticsTab > ('overview');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const {
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
  } = useAnalytics('month');
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'breakdown', label: 'Breakdown', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'cost', label: 'Cost Analysis', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'forecast', label: 'Forecast', icon: <TrendingDown className="h-4 w-4" /> },
  ];
  
  const activeFilterCount = (filters.agentTypes?.length || 0) + (filters.actionTypes?.length || 0);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Analytics</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Monitor your usage patterns, track costs, and forecast future consumption
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Filters</h3>
            <button onClick={() => setShowFilters(false)} className="text-secondary-500 hover:text-secondary-700">
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DateRangeFilter
              startDate={filters.dateRange.start}
              endDate={filters.dateRange.end}
              onChange={setDateRange}
              onPreset={setTimeRange}
            />
            <AgentFilter selected={filters.agentTypes || []} onChange={setAgentFilter} />
            <ActionTypeFilter selected={filters.actionTypes || []} onChange={setActionFilter} />
            <ComparisonSelector value={filters.comparisonPeriod} onChange={setComparisonPeriod} />
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AnalyticsTab)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && !data && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={refresh} className="mt-2 text-sm text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && data && (
        <>
          {activeTab === 'overview' && (
            <>
              <UsageOverview summary={data.summary} />
              <UsageCharts
                dailyUsage={data.dailyUsage}
                byAgent={data.byAgent}
                byAction={data.byAction}
                topActions={data.topActions}
              />
            </>
          )}
          {activeTab === 'breakdown' && (
            <UsageBreakdown
              byAgent={data.byAgent}
              byAction={data.byAction}
              topActions={data.topActions}
            />
          )}
          {activeTab === 'cost' && (
            <CostAnalysis costBreakdown={data.costBreakdown} dailyUsage={data.dailyUsage} />
          )}
          {activeTab === 'forecast' && (
            <ForecastPanel forecast={data.forecast} dailyUsage={data.dailyUsage} />
          )}
        </>
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <ExportPanel
          filters={filters}
          onClose={() => setIsExportOpen(false)}
          onExport={exportData}
        />
      )}
    </div>
  );
};
export default AnalyticsPage;
