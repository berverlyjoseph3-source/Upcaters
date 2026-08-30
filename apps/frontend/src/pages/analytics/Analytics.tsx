// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/Analytics.tsx
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Bot,
  Mail,
  Share2,
  FileText,
  Search,
  CheckSquare,
  Calendar as CalendarIcon
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface UsageStats {
  currentPeriod: {
    period: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    aiActionsUsed: number;
    aiActionsLimit: number | string;
    apiCallsUsed: number;
    apiCallsLimit: number | string;
    percentageUsed: number;
  };
  byAgent: Record<string, { count: number; cost: number }>;
  byActionType: Record<string, { count: number; cost: number; category: string }>;
  historical: Array<{
    month: string;
    aiActions: number;
    apiCalls: number;
    totalCost: number;
  }>;
  topActions: Array<{
    actionType: string;
    count: number;
    cost: number;
  }>;
}

const agentIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  calendar: <CalendarIcon className="h-4 w-4" />,
  drive: <FileText className="h-4 w-4" />,
  social: <Share2 className="h-4 w-4" />,
  web: <Search className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  content: <Bot className="h-4 w-4" />,
  orchestrator: <Activity className="h-4 w-4" />,
};

const agentColors: Record<string, string> = {
  email: 'bg-blue-500',
  calendar: 'bg-green-500',
  drive: 'bg-yellow-500',
  social: 'bg-purple-500',
  web: 'bg-indigo-500',
  task: 'bg-pink-500',
  content: 'bg-orange-500',
  orchestrator: 'bg-secondary-500',
};

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/api/usage/stats');
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats(getMockStats());
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
      setStats(getMockStats());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockStats = (): UsageStats => {
    return {
      currentPeriod: {
        period: '2024-01',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 15,
        aiActionsUsed: 1250,
        aiActionsLimit: 2500,
        apiCallsUsed: 5600,
        apiCallsLimit: 15000,
        percentageUsed: 50,
      },
      byAgent: {
        email: { count: 450, cost: 4.50 },
        calendar: { count: 120, cost: 1.20 },
        drive: { count: 80, cost: 0.80 },
        social: { count: 200, cost: 2.00 },
        web: { count: 300, cost: 3.00 },
        task: { count: 150, cost: 1.50 },
        content: { count: 100, cost: 5.00 },
      },
      byActionType: {
        email_send: { count: 200, cost: 2.00, category: 'ai_action' },
        email_read: { count: 250, cost: 2.50, category: 'api_call' },
        calendar_create: { count: 120, cost: 1.20, category: 'ai_action' },
        social_post: { count: 200, cost: 2.00, category: 'ai_action' },
        web_search: { count: 300, cost: 3.00, category: 'api_call' },
      },
      historical: [
        { month: '2024-10', aiActions: 800, apiCalls: 3000, totalCost: 11.00 },
        { month: '2024-11', aiActions: 950, apiCalls: 3800, totalCost: 13.30 },
        { month: '2024-12', aiActions: 1100, apiCalls: 4200, totalCost: 15.20 },
        { month: '2025-01', aiActions: 1250, apiCalls: 5600, totalCost: 18.50 },
      ],
      topActions: [
        { actionType: 'web_search', count: 300, cost: 3.00 },
        { actionType: 'email_read', count: 250, cost: 2.50 },
        { actionType: 'email_send', count: 200, cost: 2.00 },
        { actionType: 'social_post', count: 200, cost: 2.00 },
        { actionType: 'calendar_create', count: 120, cost: 1.20 },
      ],
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 70) return 'text-green-600';
    if (percentage < 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get('/api/usage/export');
      if (response.success && response.data) {
        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usage_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900">No data available</h3>
        <p className="text-secondary-500 mt-1">Start using agents to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Analytics</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Monitor your usage and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'year'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-secondary-800 text-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700 border border-secondary-200 dark:border-secondary-700'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary-500">AI Actions</span>
            <TrendingUp className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white">
            {stats.currentPeriod.aiActionsUsed.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-secondary-500">
              Limit: {stats.currentPeriod.aiActionsLimit === 'unlimited' ? '∞' : stats.currentPeriod.aiActionsLimit}
            </span>
            <span className={`text-xs font-medium ${getUsageColor(stats.currentPeriod.percentageUsed)}`}>
              {Math.round(stats.currentPeriod.percentageUsed)}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary-500">API Calls</span>
            <Activity className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white">
            {stats.currentPeriod.apiCallsUsed.toLocaleString()}
          </div>
          <div className="text-xs text-secondary-500 mt-1">
            Limit: {stats.currentPeriod.apiCallsLimit === 'unlimited' ? '∞' : stats.currentPeriod.apiCallsLimit}
          </div>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary-500">Total Cost</span>
            <DollarSign className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white">
            {formatCurrency(stats.historical.reduce((sum, h) => sum + h.totalCost, 0))}
          </div>
          <div className="text-xs text-secondary-500 mt-1">
            This period
          </div>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary-500">Days Remaining</span>
            <Calendar className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="text-2xl font-bold text-secondary-900 dark:text-white">
            {stats.currentPeriod.daysRemaining}
          </div>
          <div className="text-xs text-secondary-500 mt-1">
            Until period reset
          </div>
        </div>
      </div>

      {/* Usage by Agent Chart */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Usage by Agent</h2>
        <div className="space-y-3">
          {Object.entries(stats.byAgent).map(([agent, data]) => {
            const maxCount = Math.max(...Object.values(stats.byAgent).map(d => d.count));
            const percentage = (data.count / maxCount) * 100;
            const agentKey = agent.toLowerCase();
            
            return (
              <div key={agent} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${agentColors[agentKey] || 'bg-secondary-500'} bg-opacity-10`}>
                      <span className={agentColors[agentKey]?.replace('bg-', 'text-') || 'text-secondary-500'}>
                        {agentIcons[agentKey] || <Activity className="h-3 w-3" />}
                      </span>
                    </div>
                    <span className="capitalize text-secondary-700 dark:text-secondary-300">{agent}</span>
                  </div>
                  <span className="text-secondary-600 dark:text-secondary-400">{data.count.toLocaleString()} calls</span>
                </div>
                <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${agentColors[agentKey] || 'bg-secondary-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Historical Trend</h2>
        <div className="h-64 flex items-end gap-2">
          {stats.historical.map((data, index) => {
            const maxActions = Math.max(...stats.historical.map(h => h.aiActions));
            const height = (data.aiActions / maxActions) * 100;
            
            return (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full max-w-[60px] bg-primary-500 rounded-t-lg transition-all duration-500 hover:bg-primary-600"
                    style={{ height: `${height}px`, minHeight: '4px' }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-secondary-600">
                      {data.aiActions}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-secondary-500">{data.month.split('-')[1]}</div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-6 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary-500 rounded"></div>
            <span className="text-xs text-secondary-600">AI Actions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-xs text-secondary-600">API Calls</span>
          </div>
        </div>
      </div>

      {/* Top Actions & Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Actions */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Top Actions</h2>
          <div className="space-y-3">
            {stats.topActions.map((action, index) => (
              <div key={action.actionType} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-secondary-500 w-6">{index + 1}</span>
                  <span className="text-secondary-700 dark:text-secondary-300 capitalize">
                    {action.actionType.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary-500">{action.count.toLocaleString()} calls</span>
                  <span className="text-sm font-medium text-secondary-900 dark:text-white">
                    {formatCurrency(action.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Cost Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(stats.byAgent).map(([agent, data]) => {
              const totalCost = Object.values(stats.byAgent).reduce((sum, d) => sum + d.cost, 0);
              const percentage = (data.cost / totalCost) * 100;
              
              return (
                <div key={agent} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-secondary-700 dark:text-secondary-300">{agent}</span>
                    <span className="text-secondary-600 dark:text-secondary-400">{formatCurrency(data.cost)}</span>
                  </div>
                  <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-secondary-900 dark:text-white">Total</span>
              <span className="text-secondary-900 dark:text-white">
                {formatCurrency(Object.values(stats.byAgent).reduce((sum, d) => sum + d.cost, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Period Information */}
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4 text-center">
        <p className="text-sm text-secondary-600 dark:text-secondary-400">
          Current period: {stats.currentPeriod.period} ({new Date(stats.currentPeriod.startDate).toLocaleDateString()} - {new Date(stats.currentPeriod.endDate).toLocaleDateString()})
        </p>
        <p className="text-xs text-secondary-500 mt-1">
          Usage resets on {new Date(stats.currentPeriod.endDate).toLocaleDateString()}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:bg-red-600 rounded px-1">
            ×
          </button>
        </div>
      )}
    </div>
  );
};


export default Analytics;
