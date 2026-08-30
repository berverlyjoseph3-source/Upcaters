// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/RevenueAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, CreditCard, Download, RefreshCw, Calendar } from 'lucide-react';
import { RevenueChart } from '../../components/admin/RevenueChart';
import { adminService } from '../../services/admin.service';

interface RevenueSummary {
  totalRevenue: number;
  mrr: number;
  arr: number;
  growth: number;
  averageRevenuePerUser: number;
  churnRate: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
}

export const RevenueAnalytics: React.FC = () => {
  const [period, setPeriod] = useState < 'day' | 'week' | 'month' | 'year' > ('month');
  const [summary, setSummary] = useState < RevenueSummary | null > (null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    fetchRevenueSummary();
  }, [period]);
  
  const fetchRevenueSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const metrics = await adminService.getPlatformMetrics();
      setSummary({
        totalRevenue: metrics.revenue.total,
        mrr: metrics.revenue.mrr,
        arr: metrics.revenue.mrr * 12,
        growth: metrics.revenue.growth,
        averageRevenuePerUser: metrics.revenue.total / (metrics.users.total || 1),
        churnRate: 3.2, // Mock - replace with actual calculation
        newSubscriptions: 45, // Mock - replace with actual
        cancelledSubscriptions: 12, // Mock - replace with actual
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data');
      // Mock data
      setSummary({
        totalRevenue: 285000,
        mrr: 23500,
        arr: 282000,
        growth: 18.5,
        averageRevenuePerUser: 42.50,
        churnRate: 2.8,
        newSubscriptions: 156,
        cancelledSubscriptions: 48,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-primary-600" />
            <p className="text-sm text-secondary-500">Monthly Recurring Revenue</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(summary?.mrr || 0)}</p>
          <p className="text-xs text-green-600 mt-1">↑ {summary?.growth}% vs last month</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-sm text-secondary-500">Annual Recurring Revenue</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(summary?.arr || 0)}</p>
          <p className="text-xs text-secondary-500 mt-1">Projected</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-secondary-500">Avg Revenue Per User</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(summary?.averageRevenuePerUser || 0)}</p>
          <p className="text-xs text-secondary-500 mt-1">ARPU</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            <p className="text-sm text-secondary-500">Churn Rate</p>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{summary?.churnRate}%</p>
          <p className="text-xs text-secondary-500 mt-1">Net: {((summary?.newSubscriptions || 0) - (summary?.cancelledSubscriptions || 0))} new</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <RevenueChart period={period} onPeriodChange={(p) => setPeriod(p as any)} />

      {/* Subscription Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Subscription Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary-600">New Subscriptions</span>
              <span className="text-lg font-bold text-green-600">+{summary?.newSubscriptions}</span>
            </div>
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${((summary?.newSubscriptions || 0) / 200) * 100}%` }} />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-secondary-600">Cancellations</span>
              <span className="text-lg font-bold text-red-600">-{summary?.cancelledSubscriptions}</span>
            </div>
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${((summary?.cancelledSubscriptions || 0) / 200) * 100}%` }} />
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-secondary-200">
              <span className="text-sm font-medium text-secondary-700">Net Growth</span>
              <span className="text-lg font-bold text-primary-600">
                +{((summary?.newSubscriptions || 0) - (summary?.cancelledSubscriptions || 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Revenue by Plan</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>FREE</span>
              <span className="text-secondary-500">$0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>STARTER</span>
              <span className="text-secondary-900 dark:text-white font-medium">$8,700</span>
            </div>
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '37%' }} />
            </div>
            <div className="flex justify-between text-sm">
              <span>PROFESSIONAL</span>
              <span className="text-secondary-900 dark:text-white font-medium">$11,200</span>
            </div>
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: '48%' }} />
            </div>
            <div className="flex justify-between text-sm">
              <span>ENTERPRISE</span>
              <span className="text-secondary-900 dark:text-white font-medium">$3,600</span>
            </div>
            <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: '15%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 rounded-lg hover:bg-secondary-50">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>
    </div>
  );
};
export default RevenueAnalytics;
