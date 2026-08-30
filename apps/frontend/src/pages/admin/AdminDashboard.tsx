// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/AdminDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Users,
  DollarSign,
  Activity,
  Server,
  Ticket,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Database,
  Mail,
  Bell,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle2,
  Award,
  Crown,
  Star,
  Target,
  Sparkles,
  AlertTriangle,
  Calendar,
  MapPin,
  CreditCard,
  Globe,
  Wifi,
  HardDrive,
  Cpu,
  Cloud,
  Bot,
  Layers,
  GitBranch,
  ExternalLink,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Copy,
  Share2,
  Heart,
  ThumbsUp,
  MessageSquare,
  Send,
  Bookmark,
  Flag,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { StatsCard } from '../../components/admin/StatsCard';
import { RevenueChart } from '../../components/admin/RevenueChart';
import { RevenueByPlanChart } from '../../components/admin/RevenueByPlanChart';
import { ServiceHealthBadge } from '../../components/admin/ServiceHealthBadge';
import { UsageTrendChart } from '../../components/admin/UsageTrendChart';
import { UsersManagement } from './UsersManagement';
import { RevenueAnalytics } from './RevenueAnalytics';
import { SystemHealth } from './SystemHealth';
import { AuditLogs } from './AuditLogs';
import { SupportTickets } from './SupportTickets';
import { Announcements } from './Announcements';
import { Settings as AdminSettings } from './Settings';
import { OverageAlerts } from './OverageAlerts';
import { UsageHeatMap } from './UsageHeatMap';
import { PlanDistribution } from './PlanDistribution';
import {
  AdminKpiCard,
  AdminChartData,
  ServiceStatus,
  OverageAlertSeverity,
} from '../../types/admin.types';

// ============================================
// Types
// ============================================

type AdminTab =
  | 'overview'
  | 'users'
  | 'revenue'
  | 'overages'
  | 'usage'
  | 'plans'
  | 'health'
  | 'audit'
  | 'tickets'
  | 'announcements'
  | 'settings';

interface TabDefinition {
  id: AdminTab;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: number;
  badgeColor?: string;
}

// ============================================
// Constants
// ============================================

const TABS: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" />, description: 'Platform metrics and KPIs' },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, description: 'User management' },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign className="h-4 w-4" />, description: 'Revenue analytics' },
  { id: 'overages', label: 'Overages', icon: <AlertTriangle className="h-4 w-4" />, description: 'Overage alerts' },
  { id: 'usage', label: 'Usage', icon: <BarChart3 className="h-4 w-4" />, description: 'Usage heat maps' },
  { id: 'plans', label: 'Plans', icon: <PieChart className="h-4 w-4" />, description: 'Plan distribution' },
  { id: 'health', label: 'System', icon: <Server className="h-4 w-4" />, description: 'System health' },
  { id: 'audit', label: 'Audit', icon: <FileText className="h-4 w-4" />, description: 'Audit logs' },
  { id: 'tickets', label: 'Support', icon: <Ticket className="h-4 w-4" />, description: 'Support tickets' },
  { id: 'announcements', label: 'News', icon: <Bell className="h-4 w-4" />, description: 'Announcements' },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, description: 'System settings' },
];

const PLAN_CONFIG: Record<string, { label: string; color: string; gradient: string; icon: React.ReactNode }> = {
  FREE: { label: 'Free', color: 'bg-gray-500', gradient: 'from-gray-400 to-gray-500', icon: <Target className="h-4 w-4" /> },
  STARTER: { label: 'Starter', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', icon: <Zap className="h-4 w-4" /> },
  PROFESSIONAL: { label: 'Professional', color: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600', icon: <Award className="h-4 w-4" /> },
  ENTERPRISE: { label: 'Enterprise', color: 'bg-amber-500', gradient: 'from-amber-500 to-amber-600', icon: <Crown className="h-4 w-4" /> },
};

// ============================================
// Component
// ============================================

export const AdminDashboard: React.FC = () => {
  const {
    metrics,
    metricsLoading,
    metricsError,
    users,
    usersTotal,
    revenueData,
    overageAlerts,
    overageAlertsLoading,
    planDistribution,
    systemHealth,
    auditLogs,
    tickets,
    settings,
    adminNotifications,
    adminNotificationsUnread,
    isLoading,
    error,
    lastUpdated,
    fetchPlatformMetrics,
    fetchUsers,
    fetchRevenueData,
    fetchOverageAlerts,
    fetchPlanDistribution,
    fetchSystemHealth,
    fetchAuditLogs,
    fetchTickets,
    fetchSettings,
    refresh,
    clearError,
    startAutoRefresh,
    stopAutoRefresh,
  } = useAdmin();

  // State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');

  // Initialize data
  useEffect(() => {
    loadOverviewData();
    startAutoRefresh(60000); // Auto-refresh every 60 seconds

    return () => {
      stopAutoRefresh();
    };
  }, []);

  // Load data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
        loadOverviewData();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'revenue':
        fetchRevenueData({ period: 'month' });
        break;
      case 'overages':
        fetchOverageAlerts();
        break;
      case 'plans':
        fetchPlanDistribution();
        break;
      case 'health':
        fetchSystemHealth();
        break;
      case 'audit':
        fetchAuditLogs({ page: 1, limit: 50 });
        break;
      case 'tickets':
        fetchTickets();
        break;
      case 'settings':
        fetchSettings();
        break;
    }
  }, [activeTab]);

  // ============================================
  // Data Loading
  // ============================================

  const loadOverviewData = useCallback(async () => {
    await Promise.all([
      fetchPlatformMetrics(),
      fetchOverageAlerts(),
    ]);
  }, [fetchPlatformMetrics, fetchOverageAlerts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // ============================================
  // Derived Data
  // ============================================

  const overviewMetrics = useMemo((): AdminKpiCard[] => {
    if (!metrics) return [];

    const mrr = metrics.revenue?.mrr || 0;
    const arr = mrr * 12;
    const activeUsers = metrics.users?.active || 0;
    const totalUsers = metrics.users?.total || 0;
    const totalExecutions = metrics.executions?.total || 0;
    const overageRevenue = metrics.revenue?.overageRevenue || 0;

    return [
      {
        id: 'totalUsers',
        title: 'Total Users',
        value: totalUsers.toLocaleString(),
        previousValue: (totalUsers - (metrics.users?.newThisMonth || 0)).toLocaleString(),
        change: metrics.users?.growthRate || 0,
        trend: (metrics.users?.growthRate || 0) >= 0 ? 'up' : 'down',
        icon: <Users className="h-5 w-5" />,
        color: 'bg-blue-500',
        subtitle: `${metrics.users?.newToday || 0} new today`,
        description: `${metrics.users?.active || 0} active users`,
      },
      {
        id: 'mrr',
        title: 'Monthly Recurring Revenue',
        value: `$${mrr.toLocaleString()}`,
        previousValue: `$${(mrr * 0.95).toLocaleString()}`,
        change: metrics.revenue?.growth || 0,
        trend: (metrics.revenue?.growth || 0) >= 0 ? 'up' : 'down',
        icon: <DollarSign className="h-5 w-5" />,
        color: 'bg-green-500',
        subtitle: `ARR: $${arr.toLocaleString()}`,
        description: `Overage: $${overageRevenue.toLocaleString()}`,
      },
      {
        id: 'executions',
        title: 'Total Executions',
        value: totalExecutions.toLocaleString(),
        previousValue: (totalExecutions * 0.8).toLocaleString(),
        change: 25,
        trend: 'up',
        icon: <Zap className="h-5 w-5" />,
        color: 'bg-purple-500',
        subtitle: `${(metrics.executions?.last24h || 0).toLocaleString()} in last 24h`,
        description: `${(metrics.usage?.averageCostPerExecution || 0).toFixed(4)} avg cost/exec`,
      },
      {
        id: 'overages',
        title: 'Users in Overage',
        value: `${overageAlerts?.length || 0}`,
        previousValue: `${(overageAlerts?.length || 0) - 5}`,
        change: overageAlerts ? ((overageAlerts.length - 5) / 5) * 100 : 0,
        trend: 'up',
        icon: <AlertTriangle className="h-5 w-5" />,
        color: 'bg-amber-500',
        subtitle: `$${overageRevenue.toLocaleString()} total overage`,
        description: `${metrics.revenue?.overageRevenue || 0 > 0 ? '⚠️ Revenue opportunity' : 'All within limits'}`,
      },
    ];
  }, [metrics, overageAlerts]);

  const systemStatusCards = useMemo(() => {
    if (!systemHealth) return [];

    return [
      {
        name: 'API Gateway',
        status: (systemHealth.apiHealth as ServiceStatus) || 'healthy',
        latency: 45,
        version: 'v2.1.0',
      },
      {
        name: 'Database (PostgreSQL)',
        status: (systemHealth.databaseHealth as ServiceStatus) || 'healthy',
        latency: 3,
        version: 'PostgreSQL 16',
      },
      {
        name: 'Redis Cache',
        status: (systemHealth.redisHealth as ServiceStatus) || 'healthy',
        latency: 1,
        version: 'Redis 7.2',
      },
      {
        name: 'Background Worker',
        status: (systemHealth.queueHealth as ServiceStatus) || 'healthy',
        latency: 120,
        version: 'v2.0.0',
      },
    ];
  }, [systemHealth]);

  // ============================================
  // Quick Actions
  // ============================================

  const quickActions = [
    {
      label: 'New Announcement',
      icon: <Bell className="h-4 w-4" />,
      action: () => setActiveTab('announcements'),
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: 'View Overages',
      icon: <AlertTriangle className="h-4 w-4" />,
      action: () => setActiveTab('overages'),
      color: 'bg-amber-600 hover:bg-amber-700',
    },
    {
      label: 'Export Data',
      icon: <Download className="h-4 w-4" />,
      action: () => {/* Open export modal */},
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      label: 'System Health',
      icon: <Server className="h-4 w-4" />,
      action: () => setActiveTab('health'),
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  // ============================================
  // Render: Overview Tab
  // ============================================

  const renderOverview = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewMetrics.map(metric => (
          <StatsCard
            key={metric.id}
            id={metric.id}
            title={metric.title}
            value={metric.value}
            previousValue={metric.previousValue}
            change={metric.change}
            trend={metric.trend}
            icon={metric.icon}
            color={metric.color}
            subtitle={metric.subtitle}
            onClick={() => {
              if (metric.id === 'overages') setActiveTab('overages');
              if (metric.id === 'totalUsers') setActiveTab('users');
              if (metric.id === 'mrr') setActiveTab('revenue');
            }}
          />
        ))}
      </div>

      {/* Revenue & Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          period="month"
          onPeriodChange={() => {}}
        />
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
              Usage Trend (Last 30 Days)
            </h3>
          </div>

          {/* Simplified usage trend - would use UsageTrendChart in production */}
          <div className="h-64 flex items-end gap-2">
            {Array.from({ length: 30 }, (_, i) => {
              const height = 30 + Math.random() * 70;
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                  title={`Day ${i + 1}: ${Math.round(height * 100)} executions`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Plan Distribution & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
              Plan Distribution
            </h3>
            <button
              onClick={() => setActiveTab('plans')}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              View Details
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(metrics?.users?.byPlan || {}).map(([plan, count]) => {
              const config = PLAN_CONFIG[plan] || PLAN_CONFIG.FREE;
              const total = metrics?.users?.total || 1;
              const percentage = ((count as number) / total) * 100;

              return (
                <div key={plan} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <span>{count as number} users ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
              Service Health
            </h3>
            <button
              onClick={() => setActiveTab('health')}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {systemStatusCards.slice(0, 4).map(service => (
              <ServiceHealthBadge
                key={service.name}
                name={service.name}
                status={service.status}
                latency={service.latency}
              />
            ))}
          </div>
          {systemHealth && (
            <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700 flex justify-between text-xs text-secondary-500">
              <span>
                Uptime: {Math.floor((systemHealth.uptime || 0) / 3600)}h{' '}
                {Math.floor(((systemHealth.uptime || 0) % 3600) / 60)}m
              </span>
              <span>Version: {systemHealth.version || '1.0.0'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity / Audit Logs Preview */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white">
            Recent Activity
          </h3>
          <button
            onClick={() => setActiveTab('audit')}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            View Audit Logs
          </button>
        </div>
        <div className="space-y-2">
          {auditLogs?.data?.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  log.action.includes('create') ? 'bg-green-500' :
                  log.action.includes('delete') ? 'bg-red-500' :
                  log.action.includes('update') ? 'bg-blue-500' :
                  'bg-secondary-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-secondary-500">
                    {log.userEmail || 'System'} • {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {log.entityType && (
                <span className="text-xs text-secondary-400 capitalize">
                  {log.entityType}
                </span>
              )}
            </div>
          ))}
          {(!auditLogs?.data || auditLogs.data.length === 0) && (
            <div className="text-center py-4 text-secondary-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // Render: Main Component
  // ============================================

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-secondary-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-xs text-secondary-500">
                  {lastUpdated
                    ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
                    : 'Loading...'}
                </p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 ml-6">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
                    ${activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white hover:bg-secondary-100 dark:hover:bg-secondary-700'
                    }
                  `}
                >
                  {tab.icon}
                  <span className="hidden xl:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <div className="relative">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Zap className="h-4 w-4" />
                Actions
                <ChevronDown className={`h-3 w-3 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
              </button>

              {showQuickActions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowQuickActions(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-20 overflow-hidden">
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          action.action();
                          setShowQuickActions(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm text-white flex items-center gap-2 ${action.color} transition-colors`}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setActiveTab('announcements')}
              className="relative p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {adminNotificationsUnread > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden overflow-x-auto border-t border-secondary-200 dark:border-secondary-700">
          <div className="flex gap-1 p-2 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        {/* Loading State */}
        {isLoading && !metrics && (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-secondary-500">Loading admin dashboard...</p>
              <p className="text-xs text-secondary-400 mt-1">Fetching platform metrics and data</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !metrics && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-2">
              Failed to load dashboard
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && !error && (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && <UsersManagement />}
            {activeTab === 'revenue' && <RevenueAnalytics />}
            {activeTab === 'overages' && <OverageAlerts />}
            {activeTab === 'usage' && <UsageHeatMap />}
            {activeTab === 'plans' && <PlanDistribution />}
            {activeTab === 'health' && <SystemHealth />}
            {activeTab === 'audit' && <AuditLogs />}
            {activeTab === 'tickets' && <SupportTickets />}
            {activeTab === 'announcements' && <Announcements />}
            {activeTab === 'settings' && <AdminSettings />}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 lg:px-6 py-3 border-t border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-secondary-400">
          <span>
            AI Agent Platform Admin • Version 1.0.0
          </span>
          <div className="flex items-center gap-4">
            <span>Environment: {import.meta.env.MODE || 'production'}</span>
            <span>Uptime: {systemHealth ? `${Math.floor((systemHealth.uptime || 0) / 3600)}h` : 'N/A'}</span>
            {lastUpdated && (
              <span>Last refresh: {new Date(lastUpdated).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && metrics && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in-right">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-2 hover:bg-red-600 rounded px-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};


export default AdminDashboard;
