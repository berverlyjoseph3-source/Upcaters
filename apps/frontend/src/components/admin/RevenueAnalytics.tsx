// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/RevenueAnalytics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Users, CreditCard,
  Download, RefreshCw, Calendar, Filter, ChevronDown, ChevronUp,
  BarChart3, PieChart, LineChart, ArrowUpRight, ArrowDownRight,
  AlertCircle, CheckCircle, Target, Zap
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import {
  RevenueData,
  RevenueSummary,
  RevenueByPlan,
  RevenueTransaction,
  RevenuePeriod,
} from '../../types/admin.types';
import { formatCurrency, formatCompactNumber, formatDate } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

type RevenueView = 'overview' | 'by-plan' | 'transactions' | 'forecast';
type ChartType = 'line' | 'bar' | 'area';

interface DateFilter {
  label: string;
  period: RevenuePeriod;
  getRange: () => { start: Date; end: Date };
}

// ============================================
// Constants
// ============================================

const DATE_FILTERS: DateFilter[] = [
  { label: 'Today', period: 'day', getRange: () => {
    const now = new Date();
    return { start: new Date(now.setHours(0,0,0,0)), end: new Date() };
  }},
  { label: 'Last 7 Days', period: 'week', getRange: () => {
    const now = new Date();
    return { start: new Date(now.getTime() - 7 * 86400000), end: new Date() };
  }},
  { label: 'Last 30 Days', period: 'month', getRange: () => {
    const now = new Date();
    return { start: new Date(now.getTime() - 30 * 86400000), end: new Date() };
  }},
  { label: 'Last 90 Days', period: 'quarter', getRange: () => {
    const now = new Date();
    return { start: new Date(now.getTime() - 90 * 86400000), end: new Date() };
  }},
  { label: 'This Year', period: 'year', getRange: () => {
    const now = new Date();
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date() };
  }},
  { label: 'Last Year', period: 'year', getRange: () => {
    const now = new Date();
    return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31) };
  }},
];

const PLAN_COLORS: Record<string, string> = {
  FREE: '#94a3b8',
  STARTER: '#3b82f6',
  PROFESSIONAL: '#8b5cf6',
  ENTERPRISE: '#f59e0b',
};

// ============================================
// Component
// ============================================

export const RevenueAnalytics: React.FC = () => {
  const {
    revenueData,
    revenueLoading,
    revenueError,
    fetchRevenueData,
    exportRevenueData,
  } = useAdmin();

  // State
  const [activeView, setActiveView] = useState<RevenueView>('overview');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>(DATE_FILTERS[2]); // Last 30 Days
  const [chartType, setChartType] = useState<ChartType>('area');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [sortField, setSortField] = useState<string>('amount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showForecast, setShowForecast] = useState(false);

  // Fetch data
  useEffect(() => {
    const { start, end } = selectedDateFilter.getRange();
    fetchRevenueData({
      period: selectedDateFilter.period,
      startDate: start,
      endDate: end,
    });
  }, [fetchRevenueData, selectedDateFilter]);

  // ============================================
  // Derived Data
  // ============================================

  const revenueSummary = useMemo((): RevenueSummary | null => {
    if (!revenueData?.summary) return null;
    return revenueData.summary;
  }, [revenueData]);

  const revenueByPlan = useMemo((): RevenueByPlan[] => {
    if (!revenueData?.byPlan) return [];
    return revenueData.byPlan;
  }, [revenueData]);

  const transactions = useMemo((): RevenueTransaction[] => {
    if (!revenueData?.transactions) return [];
    return revenueData.transactions;
  }, [revenueData]);

  const revenueTrend = useMemo(() => {
    if (!revenueData?.trend) return [];
    return revenueData.trend;
  }, [revenueData]);

  const forecastData = useMemo(() => {
    if (!revenueData?.forecast) return [];
    return revenueData.forecast;
  }, [revenueData]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (selectedPlan !== 'all') {
      filtered = filtered.filter(t => t.planId === selectedPlan);
    }
    return filtered.sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [transactions, selectedPlan, sortField, sortDirection]);

  // Key metrics
  const metrics = useMemo(() => {
    if (!revenueSummary) return null;

    const overagePercentage = revenueSummary.totalRevenue > 0
      ? (revenueSummary.overageRevenue / revenueSummary.totalRevenue) * 100
      : 0;

    return {
      totalRevenue: revenueSummary.totalRevenue,
      mrr: revenueSummary.mrr,
      arr: revenueSummary.arr,
      overageRevenue: revenueSummary.overageRevenue,
      overagePercentage,
      averageRevenuePerUser: revenueSummary.averageRevenuePerUser,
      totalTransactions: revenueSummary.totalTransactions,
      successRate: revenueSummary.totalTransactions > 0
        ? ((revenueSummary.successfulTransactions || 0) / revenueSummary.totalTransactions) * 100
        : 0,
      growth: revenueSummary.growth || 0,
      churnRate: revenueSummary.churnRate || 0,
      newMrr: revenueSummary.newMrr || 0,
      expansionMrr: revenueSummary.expansionMrr || 0,
      contractionMrr: revenueSummary.contractionMrr || 0,
      churnedMrr: revenueSummary.churnedMrr || 0,
      netNewMrr: (revenueSummary.newMrr || 0) + (revenueSummary.expansionMrr || 0) - (revenueSummary.contractionMrr || 0) - (revenueSummary.churnedMrr || 0),
    };
  }, [revenueSummary]);

  // ============================================
  // Handlers
  // ============================================

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportRevenueData({
        period: selectedDateFilter.period,
        format: 'csv',
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ============================================
  // Chart Rendering (Simplified SVG Charts)
  // ============================================

  const renderRevenueTrendChart = () => {
    if (revenueTrend.length === 0) return null;

    const data = showForecast ? [...revenueTrend, ...forecastData] : revenueTrend;
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue || 0, d.forecast || 0)));
    const chartWidth = 800;
    const chartHeight = 300;
    const padding = { top: 20, right: 40, bottom: 40, left: 60 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * plotWidth;
    const yScale = (v: number) => padding.top + plotHeight - (v / maxVal) * plotHeight;

    const linePath = (key: 'revenue' | 'forecast') => {
      return data.map((d, i) => {
        const x = xScale(i);
        const y = yScale(d[key] || 0);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    const areaPath = (key: 'revenue' | 'forecast') => {
      const line = data.map((d, i) => {
        const x = xScale(i);
        const y = yScale(d[key] || 0);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
      return `${line} L ${xScale(data.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;
    };

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-80">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <g key={pct}>
            <line
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={yScale(maxVal * pct)}
              y2={yScale(maxVal * pct)}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={yScale(maxVal * pct) + 4}
              textAnchor="end"
              className="text-xs fill-secondary-400"
            >
              {formatCompactNumber(maxVal * pct)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath('revenue')} fill="url(#revenueGradient)" opacity="0.3" />

        {/* Revenue line */}
        <path d={linePath('revenue')} fill="none" stroke="#3b82f6" strokeWidth="2.5" />

        {/* Forecast line */}
        {showForecast && (
          <>
            <path d={linePath('forecast')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
            <path d={areaPath('forecast')} fill="url(#forecastGradient)" opacity="0.15" />
          </>
        )}

        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d, i) => (
          <text
            key={i}
            x={xScale(data.indexOf(d))}
            y={chartHeight - 10}
            textAnchor="middle"
            className="text-xs fill-secondary-500"
          >
            {d.date || d.label}
          </text>
        ))}

        {/* Gradients */}
        <defs>
          <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="forecastGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  const renderPlanRevenueChart = () => {
    if (revenueByPlan.length === 0) return null;

    const maxVal = Math.max(...revenueByPlan.map(p => p.totalRevenue));
    const chartWidth = 600;
    const chartHeight = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 70 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    const barWidth = Math.min(80, plotWidth / revenueByPlan.length - 10);

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-72">
        {revenueByPlan.map((plan, i) => {
          const x = padding.left + (i / revenueByPlan.length) * plotWidth + barWidth / 2;
          const subHeight = (plan.subscriptionRevenue / maxVal) * plotHeight;
          const overageHeight = (plan.overageRevenue / maxVal) * plotHeight;
          const totalHeight = subHeight + overageHeight;
          const y = padding.top + plotHeight - totalHeight;

          return (
            <g key={plan.planId}>
              {/* Subscription bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={subHeight}
                fill={PLAN_COLORS[plan.planId] || '#94a3b8'}
                rx={4}
              />
              {/* Overage bar on top */}
              {plan.overageRevenue > 0 && (
                <rect
                  x={x}
                  y={y + subHeight}
                  width={barWidth}
                  height={overageHeight}
                  fill="#fbbf24"
                  rx={4}
                  opacity="0.8"
                />
              )}
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 15}
                textAnchor="middle"
                className="text-xs font-medium fill-secondary-600"
              >
                {plan.planName}
              </text>
              {/* Value */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="text-xs font-semibold fill-secondary-900 dark:fill-white"
              >
                {formatCompactNumber(plan.totalRevenue)}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${chartWidth / 2 - 80}, 10)`}>
          <rect x="0" y="0" width="12" height="12" fill="#3b82f6" rx="2" />
          <text x="18" y="10" className="text-xs fill-secondary-500">Subscription</text>
          <rect x="100" y="0" width="12" height="12" fill="#fbbf24" rx="2" />
          <text x="118" y="10" className="text-xs fill-secondary-500">Overage</text>
        </g>
      </svg>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (revenueLoading && !revenueData) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-500">Loading revenue analytics...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (revenueError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load revenue data</p>
        <p className="text-sm text-red-500 mt-1">{revenueError}</p>
        <button 
          onClick={() => fetchRevenueData({ period: selectedDateFilter.period })}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Revenue Analytics
          </h2>
          <p className="text-sm text-secondary-500 mt-1">
            Track subscription revenue, overage charges, and growth metrics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </button>
          <button
            onClick={() => fetchRevenueData({ period: selectedDateFilter.period })}
            className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-2">
        {DATE_FILTERS.map(filter => (
          <button
            key={filter.label}
            onClick={() => setSelectedDateFilter(filter)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              selectedDateFilter.label === filter.label
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-600 hover:bg-secondary-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowForecast(!showForecast)}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            showForecast
              ? 'bg-yellow-600 text-white'
              : 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-600'
          }`}
        >
          {showForecast ? 'Hide Forecast' : 'Show Forecast'}
        </button>
      </div>

      {/* View Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {(['overview', 'by-plan', 'transactions', 'forecast'] as RevenueView[]).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${
                activeView === view
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {view.replace('-', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <p className="text-xs text-secondary-500 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatCurrency(metrics.totalRevenue / 100)}</p>
              <p className={`text-xs mt-1 ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.growth >= 0 ? '+' : ''}{metrics.growth}%
              </p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <p className="text-xs text-secondary-500 mb-1">MRR</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatCurrency(metrics.mrr / 100)}</p>
              <p className="text-xs text-secondary-500 mt-1">ARR: {formatCurrency(metrics.arr / 100)}</p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <p className="text-xs text-secondary-500 mb-1">Overage Revenue</p>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(metrics.overageRevenue / 100)}</p>
              <p className="text-xs text-secondary-500 mt-1">{metrics.overagePercentage.toFixed(1)}% of total</p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <p className="text-xs text-secondary-500 mb-1">Net New MRR</p>
              <p className={`text-xl font-bold ${metrics.netNewMrr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.netNewMrr >= 0 ? '+' : ''}{formatCurrency(metrics.netNewMrr / 100)}
              </p>
              <p className="text-xs text-secondary-500 mt-1">New + Expansion - Churn</p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <p className="text-xs text-secondary-500 mb-1">ARPU</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatCurrency(metrics.averageRevenuePerUser / 100)}</p>
              <p className="text-xs text-secondary-500 mt-1">Per paying user</p>
            </div>

            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <p className="text-xs text-secondary-500 mb-1">Churn Rate</p>
              <p className="text-xl font-bold text-red-600">{metrics.churnRate}%</p>
              <p className="text-xs text-secondary-500 mt-1">Monthly churn</p>
            </div>
          </div>

          {/* MRR Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">New MRR</span>
              </div>
              <p className="text-lg font-bold text-green-700">{formatCurrency(metrics.newMrr / 100)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700">Expansion MRR</span>
              </div>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(metrics.expansionMrr / 100)}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-xs text-orange-700">Contraction MRR</span>
              </div>
              <p className="text-lg font-bold text-orange-700">-{formatCurrency(metrics.contractionMrr / 100)}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200 dark:border-red-800 p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowDownRight className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-700">Churned MRR</span>
              </div>
              <p className="text-lg font-bold text-red-700">-{formatCurrency(metrics.churnedMrr / 100)}</p>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
                Revenue Trend {showForecast && '(with Forecast)'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('area')}
                  className={`px-2 py-1 text-xs rounded ${chartType === 'area' ? 'bg-primary-100 text-primary-700' : 'text-secondary-500'}`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2 py-1 text-xs rounded ${chartType === 'line' ? 'bg-primary-100 text-primary-700' : 'text-secondary-500'}`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-2 py-1 text-xs rounded ${chartType === 'bar' ? 'bg-primary-100 text-primary-700' : 'text-secondary-500'}`}
                >
                  Bar
                </button>
              </div>
            </div>
            {renderRevenueTrendChart()}
          </div>
        </div>
      )}

      {/* By Plan View */}
      {activeView === 'by-plan' && (
        <div className="space-y-6">
          {/* Plan Revenue Chart */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">
              Revenue by Plan (with Overage Breakdown)
            </h3>
            {renderPlanRevenueChart()}
          </div>

          {/* Plan Revenue Table */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Users</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Subscription</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Overage</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">ARPU</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {revenueByPlan.map(plan => (
                    <tr key={plan.planId} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[plan.planId] || '#94a3b8' }} />
                          <span className="font-medium">{plan.planName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{plan.userCount}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(plan.subscriptionRevenue / 100)}</td>
                      <td className="px-4 py-3 text-right">
                        {plan.overageRevenue > 0 ? (
                          <span className="text-yellow-600 font-medium">{formatCurrency(plan.overageRevenue / 100)}</span>
                        ) : (
                          <span className="text-secondary-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(plan.totalRevenue / 100)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(plan.averageRevenuePerUser / 100)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={plan.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {plan.growth >= 0 ? '+' : ''}{plan.growth}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary-50 dark:bg-secondary-700/50 font-semibold">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{revenueByPlan.reduce((s, p) => s + p.userCount, 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(revenueByPlan.reduce((s, p) => s + p.subscriptionRevenue, 0) / 100)}</td>
                    <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(revenueByPlan.reduce((s, p) => s + p.overageRevenue, 0) / 100)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(revenueByPlan.reduce((s, p) => s + p.totalRevenue, 0) / 100)}</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transactions View */}
      {activeView === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
            >
              <option value="all">All Plans</option>
              {revenueByPlan.map(p => (
                <option key={p.planId} value={p.planId}>{p.planName}</option>
              ))}
            </select>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                  <tr>
                    <th 
                      onClick={() => handleSort('createdAt')}
                      className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer"
                    >
                      <div className="flex items-center gap-1">Date {sortField === 'createdAt' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Type</th>
                    <th 
                      onClick={() => handleSort('amount')}
                      className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer"
                    >
                      <div className="flex items-center justify-end gap-1">Amount {sortField === 'amount' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-secondary-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(txn => (
                      <tr key={txn.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                        <td className="px-4 py-3 text-secondary-500">{formatDate(txn.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-secondary-900 dark:text-white">{txn.userName || txn.userEmail}</p>
                          <p className="text-xs text-secondary-500">{txn.userEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            txn.planId === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                            txn.planId === 'PROFESSIONAL' ? 'bg-primary-100 text-primary-700' :
                            txn.planId === 'STARTER' ? 'bg-blue-100 text-blue-700' :
                            'bg-secondary-100 text-secondary-700'
                          }`}>
                            {txn.planId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs capitalize">
                            {txn.type?.replace('_', ' ') || 'Payment'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-secondary-900 dark:text-white">
                          {formatCurrency(txn.amount / 100)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {txn.status === 'succeeded' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" /> Success
                            </span>
                          ) : txn.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <AlertCircle className="h-3 w-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                              <Clock className="h-3 w-3" /> {txn.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Forecast View */}
      {activeView === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">
              90-Day Revenue Forecast
            </h3>
            {renderRevenueTrendChart()}
          </div>

          {/* Forecast Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-700 mb-1">Projected MRR (30 days)</p>
              <p className="text-2xl font-bold text-blue-800">
                {metrics ? formatCurrency((metrics.mrr * 1.05) / 100) : '—'}
              </p>
              <p className="text-xs text-blue-600 mt-1">+5% projected growth</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 p-4">
              <p className="text-xs text-green-700 mb-1">Projected Overage Revenue</p>
              <p className="text-2xl font-bold text-green-800">
                {metrics ? formatCurrency((metrics.overageRevenue * 1.12) / 100) : '—'}
              </p>
              <p className="text-xs text-green-600 mt-1">+12% projected growth</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 p-4">
              <p className="text-xs text-purple-700 mb-1">Projected ARR</p>
              <p className="text-2xl font-bold text-purple-800">
                {metrics ? formatCurrency((metrics.arr * 1.15) / 100) : '—'}
              </p>
              <p className="text-xs text-purple-600 mt-1">+15% YoY projected</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-secondary-400 py-4">
        Data as of {new Date().toLocaleString()} • Revenue figures in USD • Refresh for latest data
      </div>
    </div>
  );
};
export default RevenueAnalytics;
