// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/PlanDistribution.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Users, DollarSign, TrendingUp, TrendingDown,
  BarChart3, RefreshCw, Download, ChevronDown, ChevronUp,
  CreditCard, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { PlanRevenue, PlanDistributionData } from '../../types/admin.types';
import { formatCurrency, formatNumber } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

type MetricType = 'users' | 'revenue' | 'growth';
type ChartType = 'bar' | 'pie' | 'table';

interface PlanMetric {
  planId: string;
  planName: string;
  userCount: number;
  percentageOfTotal: number;
  mrr: number;
  arr: number;
  averageRevenuePerUser: number;
  overageRevenue: number;
  totalRevenue: number;
  growth: number;
  churnRate: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  netGrowth: number;
  color: string;
  gradient: string;
}

// ============================================
// Component
// ============================================

export const PlanDistribution: React.FC = () => {
  const {
    planDistribution,
    planDistributionLoading,
    planDistributionError,
    fetchPlanDistribution,
    exportPlanDistribution,
  } = useAdmin();

  // State
  const [primaryMetric, setPrimaryMetric] = useState<MetricType>('revenue');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [sortBy, setSortBy] = useState<string>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchPlanDistribution();
  }, [fetchPlanDistribution]);

  // ============================================
  // Derive Plan Data
  // ============================================

  const planMetrics = useMemo((): PlanMetric[] => {
    if (!planDistribution) return [];

    const planConfigs: Record<string, { name: string; color: string; gradient: string; priceMonthly: number }> = {
      FREE: { name: 'Free', color: 'bg-secondary-400', gradient: 'from-secondary-400 to-secondary-500', priceMonthly: 0 },
      STARTER: { name: 'Starter', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', priceMonthly: 3900 },
      PROFESSIONAL: { name: 'Professional', color: 'bg-primary-500', gradient: 'from-primary-500 to-primary-600', priceMonthly: 12900 },
      ENTERPRISE: { name: 'Enterprise', color: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600', priceMonthly: 59900 },
    };

    const totalUsers = planDistribution.reduce((sum, p) => sum + p.userCount, 0);

    return planDistribution.map(plan => {
      const config = planConfigs[plan.planId] || { name: plan.planId, color: 'bg-secondary-400', gradient: 'from-secondary-400 to-secondary-500', priceMonthly: 0 };
      const percentageOfTotal = totalUsers > 0 ? (plan.userCount / totalUsers) * 100 : 0;
      const totalRevenue = (plan.mrr || 0) + (plan.overageRevenue || 0);

      return {
        planId: plan.planId,
        planName: config.name,
        userCount: plan.userCount,
        percentageOfTotal,
        mrr: plan.mrr || 0,
        arr: (plan.mrr || 0) * 12,
        averageRevenuePerUser: plan.userCount > 0 ? totalRevenue / plan.userCount : 0,
        overageRevenue: plan.overageRevenue || 0,
        totalRevenue,
        growth: plan.growth || 0,
        churnRate: plan.churnRate || 0,
        newSubscriptions: plan.newSubscriptions || 0,
        cancelledSubscriptions: plan.cancelledSubscriptions || 0,
        netGrowth: (plan.newSubscriptions || 0) - (plan.cancelledSubscriptions || 0),
        color: config.color,
        gradient: config.gradient,
      };
    });
  }, [planDistribution]);

  // Sort plans
  const sortedPlans = useMemo(() => {
    return [...planMetrics].sort((a, b) => {
      const aVal = (a as any)[sortBy] || 0;
      const bVal = (b as any)[sortBy] || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [planMetrics, sortBy, sortDirection]);

  // Summary
  const summary = useMemo(() => ({
    totalUsers: planMetrics.reduce((sum, p) => sum + p.userCount, 0),
    totalMrr: planMetrics.reduce((sum, p) => sum + p.mrr, 0),
    totalArr: planMetrics.reduce((sum, p) => sum + p.arr, 0),
    totalOverageRevenue: planMetrics.reduce((sum, p) => sum + p.overageRevenue, 0),
    totalRevenue: planMetrics.reduce((sum, p) => sum + p.totalRevenue, 0),
    averageRevenuePerUser: planMetrics.length > 0 
      ? planMetrics.reduce((sum, p) => sum + p.totalRevenue, 0) / planMetrics.reduce((sum, p) => sum + p.userCount, 0)
      : 0,
    totalNewSubscriptions: planMetrics.reduce((sum, p) => sum + p.newSubscriptions, 0),
    totalCancelled: planMetrics.reduce((sum, p) => sum + p.cancelledSubscriptions, 0),
  }), [planMetrics]);

  // ============================================
  // Handlers
  // ============================================

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportPlanDistribution();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getMetricValue = (plan: PlanMetric): string => {
    switch (primaryMetric) {
      case 'users': return formatNumber(plan.userCount);
      case 'revenue': return formatCurrency(plan.totalRevenue / 100);
      case 'growth': return `${plan.growth > 0 ? '+' : ''}${plan.growth}%`;
      default: return formatCurrency(plan.totalRevenue / 100);
    }
  };

  // ============================================
  // Loading State
  // ============================================

  if (planDistributionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (planDistributionError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
        <p className="text-red-700 dark:text-red-300">{planDistributionError}</p>
        <button onClick={() => fetchPlanDistribution()} className="mt-2 text-sm text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (planMetrics.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-12 text-center">
        <PieChart className="h-12 w-12 mx-auto text-secondary-400 mb-3" />
        <p className="text-secondary-500">No plan distribution data available</p>
        <p className="text-sm text-secondary-400">Data will appear as users sign up and subscribe</p>
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
            <PieChart className="h-5 w-5 text-primary-600" />
            Plan Distribution
          </h2>
          <p className="text-sm text-secondary-500 mt-1">
            Revenue and user breakdown by plan tier
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-400">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatNumber(summary.totalUsers)}</p>
          <p className="text-xs text-blue-600 mt-1">Across all plans</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">Monthly Recurring Revenue</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(summary.totalMrr / 100)}</p>
          <p className="text-xs text-green-600 mt-1">ARR: {formatCurrency(summary.totalArr / 100)}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">Overage Revenue</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(summary.totalOverageRevenue / 100)}</p>
          <p className="text-xs text-yellow-600 mt-1">
            {((summary.totalOverageRevenue / (summary.totalRevenue || 1)) * 100).toFixed(1)}% of total revenue
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-purple-700 dark:text-purple-400">Avg Revenue Per User</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(summary.averageRevenuePerUser / 100)}</p>
          <p className="text-xs text-purple-600 mt-1">Including overage</p>
        </div>
      </div>

      {/* Chart / Table Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${chartType === 'pie' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setChartType('table')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${chartType === 'table' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
          >
            Table
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPrimaryMetric('revenue')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${primaryMetric === 'revenue' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600'}`}
          >
            Revenue
          </button>
          <button
            onClick={() => setPrimaryMetric('users')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${primaryMetric === 'users' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600'}`}
          >
            Users
          </button>
          <button
            onClick={() => setPrimaryMetric('growth')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${primaryMetric === 'growth' ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600'}`}
          >
            Growth
          </button>
        </div>
      </div>

      {/* Bar Chart View */}
      {chartType === 'bar' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="space-y-6">
            {sortedPlans.map(plan => {
              const maxValue = Math.max(...planMetrics.map(p => 
                primaryMetric === 'users' ? p.userCount : 
                primaryMetric === 'growth' ? Math.abs(p.growth) : 
                p.totalRevenue
              ));
              const value = primaryMetric === 'users' ? plan.userCount : 
                           primaryMetric === 'growth' ? Math.abs(plan.growth) : 
                           plan.totalRevenue;
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

              return (
                <div key={plan.planId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${plan.color}`} />
                      <span className="font-medium text-secondary-900 dark:text-white">{plan.planName}</span>
                      <span className="text-xs text-secondary-500">({plan.userCount} users)</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-semibold text-secondary-900 dark:text-white">
                        {getMetricValue(plan)}
                      </span>
                      {primaryMetric === 'revenue' && (
                        <span className="text-xs text-secondary-500">
                          {formatCurrency(plan.averageRevenuePerUser / 100)}/user
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative h-8 bg-secondary-100 dark:bg-secondary-700 rounded-lg overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${plan.gradient} rounded-lg transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                    {/* Overage segment */}
                    {primaryMetric === 'revenue' && plan.overageRevenue > 0 && (
                      <div
                        className="absolute top-0 h-full bg-yellow-400/50 rounded-r-lg transition-all duration-500"
                        style={{ 
                          left: `${((plan.mrr / (plan.totalRevenue || 1)) * percentage)}%`,
                          width: `${((plan.overageRevenue / (plan.totalRevenue || 1)) * percentage)}%` 
                        }}
                      />
                    )}
                  </div>
                  {primaryMetric === 'revenue' && plan.overageRevenue > 0 && (
                    <div className="flex justify-end text-xs text-yellow-600">
                      Overage: {formatCurrency(plan.overageRevenue / 100)} ({(plan.overageRevenue / (plan.totalRevenue || 1) * 100).toFixed(1)}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
              <span className="text-secondary-600">Subscription Revenue</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-yellow-400/50" />
              <span className="text-secondary-600">Overage Revenue</span>
            </div>
          </div>
        </div>
      )}

      {/* Pie Chart View */}
      {chartType === 'pie' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-64">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {sortedPlans.reduce((acc, plan, index) => {
                  const total = planMetrics.reduce((sum, p) => sum + (
                    primaryMetric === 'users' ? p.userCount : 
                    primaryMetric === 'growth' ? Math.abs(p.growth) : 
                    p.totalRevenue
                  ), 0);
                  const value = primaryMetric === 'users' ? plan.userCount : 
                               primaryMetric === 'growth' ? Math.abs(plan.growth) : 
                               plan.totalRevenue;
                  const percentage = total > 0 ? (value / total) * 100 : 0;
                  const startAngle = acc.offset;
                  const sweepAngle = (percentage / 100) * 360;
                  const endAngle = startAngle + sweepAngle;

                  // Calculate SVG arc path
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);
                  const largeArc = sweepAngle > 180 ? 1 : 0;

                  acc.paths.push(
                    <path
                      key={plan.planId}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={plan.color.replace('bg-', '')}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={() => setSelectedPlan(plan.planId === selectedPlan ? null : plan.planId)}
                      stroke="white"
                      strokeWidth="1"
                    />
                  );

                  acc.offset = endAngle;
                  return acc;
                }, { offset: 0, paths: [] as React.ReactNode[] }).paths}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {primaryMetric === 'users' ? formatNumber(summary.totalUsers) :
                     primaryMetric === 'growth' ? `${summary.totalNewSubscriptions}` :
                     formatCurrency(summary.totalRevenue / 100)}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {primaryMetric === 'users' ? 'Total Users' :
                     primaryMetric === 'growth' ? 'New Subs' :
                     'Total Revenue'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4">
            {sortedPlans.map(plan => (
              <button
                key={plan.planId}
                onClick={() => setSelectedPlan(plan.planId === selectedPlan ? null : plan.planId)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedPlan === plan.planId ? 'bg-secondary-100 dark:bg-secondary-700' : ''
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${plan.color}`} />
                <span>{plan.planName}</span>
                <span className="font-medium">{getMetricValue(plan)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table View */}
      {chartType === 'table' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Plan</th>
                  <th 
                    onClick={() => handleSort('userCount')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Users {sortBy === 'userCount' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('mrr')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      MRR {sortBy === 'mrr' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('overageRevenue')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Overage {sortBy === 'overageRevenue' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('totalRevenue')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total Revenue {sortBy === 'totalRevenue' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('averageRevenuePerUser')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      ARPU {sortBy === 'averageRevenuePerUser' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('growth')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Growth {sortBy === 'growth' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('netGrowth')}
                    className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Net New {sortBy === 'netGrowth' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {sortedPlans.map(plan => (
                  <tr 
                    key={plan.planId}
                    className={`hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors ${
                      selectedPlan === plan.planId ? 'bg-secondary-50 dark:bg-secondary-700/30' : ''
                    }`}
                    onClick={() => setSelectedPlan(plan.planId === selectedPlan ? null : plan.planId)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${plan.color}`} />
                        <span className="font-medium text-secondary-900 dark:text-white">{plan.planName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <span className="font-medium">{formatNumber(plan.userCount)}</span>
                        <span className="text-xs text-secondary-400 ml-1">({plan.percentageOfTotal.toFixed(1)}%)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {plan.planId === 'FREE' ? '—' : formatCurrency(plan.mrr / 100)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {plan.overageRevenue > 0 ? (
                        <span className="text-yellow-600 font-medium">{formatCurrency(plan.overageRevenue / 100)}</span>
                      ) : (
                        <span className="text-secondary-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(plan.totalRevenue / 100)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(plan.averageRevenuePerUser / 100)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`flex items-center justify-end gap-1 ${plan.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {plan.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {plan.growth >= 0 ? '+' : ''}{plan.growth}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`flex items-center justify-end gap-1 ${plan.netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {plan.netGrowth >= 0 ? (
                          <span>+{plan.netGrowth}</span>
                        ) : (
                          <span>{plan.netGrowth}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-secondary-50 dark:bg-secondary-700/50 font-semibold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{formatNumber(summary.totalUsers)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(summary.totalMrr / 100)}</td>
                  <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(summary.totalOverageRevenue / 100)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(summary.totalRevenue / 100)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(summary.averageRevenuePerUser / 100)}</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right text-green-600">+{summary.totalNewSubscriptions - summary.totalCancelled}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Selected Plan Details */}
      {selectedPlan && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          {sortedPlans.filter(p => p.planId === selectedPlan).map(plan => (
            <div key={plan.planId} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-secondary-500">New Subscriptions</p>
                <p className="text-lg font-bold text-green-600">+{plan.newSubscriptions}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Cancelled</p>
                <p className="text-lg font-bold text-red-600">-{plan.cancelledSubscriptions}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Churn Rate</p>
                <p className="text-lg font-bold text-secondary-900 dark:text-white">{plan.churnRate}%</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">ARR</p>
                <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatCurrency(plan.arr / 100)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default PlanDistribution;
