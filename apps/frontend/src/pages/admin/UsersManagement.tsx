// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/UsersManagement.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Filter, Download, UserPlus, MoreVertical, Edit,
  Ban, CheckCircle, Trash2, Eye, RefreshCw, AlertCircle,
  Mail, TrendingUp, TrendingDown, DollarSign, Users,
  ChevronDown, ChevronUp, X, Zap, Activity, Target,
  ArrowUpRight, ArrowDownRight, BarChart3, Shield
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { UserTable } from '../../components/admin/UserTable';
import { UserFilters } from '../../components/admin/UserFilters';
import { BulkActions } from '../../components/admin/BulkActions';
import { PlanChangeModal } from '../../components/admin/PlanChangeModal';
import { ConfirmActionModal } from '../../components/admin/ConfirmActionModal';
import { OverageUserTable } from '../../components/admin/OverageUserTable';
import { UsageTrendChart } from '../../components/admin/UsageTrendChart';
import { UserFilters as UserFiltersType, AdminUser, PlanId } from '../../types/admin.types';
import { formatCompactNumber, formatCurrency, formatDate } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

type UsersView = 'all' | 'overages' | 'analytics' | 'recent';

interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  churnedThisMonth: number;
  averageExecutions: number;
  averageSpent: number;
  planDistribution: Record<string, number>;
  roleDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  overageUsers: number;
  totalOverageCost: number;
  topUsers: Array<{
    userId: string;
    email: string;
    name: string;
    executions: number;
    spent: number;
  }>;
  recentSignups: AdminUser[];
  recentActivity: Array<{
    userId: string;
    email: string;
    action: string;
    timestamp: Date;
  }>;
}

// ============================================
// Component
// ============================================

export const UsersManagement: React.FC = () => {
  const {
    users,
    usersLoading,
    usersError,
    fetchUsers,
    updateUser,
    suspendUser,
    activateUser,
    deleteUser,
    impersonateUser,
    overageAlerts,
    fetchOverageAlerts,
    sendOverageNotification,
    userAnalytics,
    fetchUserAnalytics,
  } = useAdmin();

  // State
  const [activeView, setActiveView] = useState<UsersView>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<UserFiltersType>({
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [planChangeUser, setPlanChangeUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'delete';
    userId: string;
    userName: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showBulkNotifyModal, setShowBulkNotifyModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users on filter change
  useEffect(() => {
    fetchUsers({
      ...filters,
      search: debouncedSearch || undefined,
    });
  }, [filters, debouncedSearch, fetchUsers]);

  // Fetch analytics on mount
  useEffect(() => {
    fetchUserAnalytics();
    fetchOverageAlerts();
  }, [fetchUserAnalytics, fetchOverageAlerts]);

  // ============================================
  // Handlers
  // ============================================

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    setSelectedUsers(new Set());
  };

  const handleSort = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleFilterChange = (newFilters: Partial<UserFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
    setSelectedUsers(new Set());
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === (users?.data?.length || 0)) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set((users?.data || []).map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleBulkAction = async (action: string) => {
    const userIds = Array.from(selectedUsers);
    
    for (const userId of userIds) {
      try {
        switch (action) {
          case 'activate':
            await activateUser(userId);
            break;
          case 'suspend':
            await suspendUser(userId, 'Bulk action by admin');
            break;
          case 'delete':
            await deleteUser(userId);
            break;
          case 'notify':
            await sendOverageNotification([userId]);
            break;
        }
      } catch (error) {
        console.error(`Bulk action failed for user ${userId}:`, error);
      }
    }
    
    setSelectedUsers(new Set());
    await fetchUsers(filters);
    if (action === 'notify') await fetchOverageAlerts();
  };

  const handleImpersonate = async (userId: string) => {
    const token = await impersonateUser(userId);
    localStorage.setItem('impersonateToken', token);
    window.location.href = '/dashboard';
  };

  const handlePlanChange = async (userId: string, planId: PlanId, sendNotification?: boolean) => {
    await updateUser(userId, { planId } as any);
    setPlanChangeUser(null);
    await fetchUsers(filters);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    switch (confirmAction.type) {
      case 'suspend':
        await suspendUser(confirmAction.userId, 'Manual suspension by admin');
        break;
      case 'activate':
        await activateUser(confirmAction.userId);
        break;
      case 'delete':
        await deleteUser(confirmAction.userId);
        break;
    }
    
    setConfirmAction(null);
    await fetchUsers(filters);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.planId) params.append('planId', filters.planId);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      
      const response = await fetch(`/api/admin/export/users?${params.toString()}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNotifyUser = async (userId: string) => {
    await sendOverageNotification([userId]);
  };

  const handleViewUser = (userId: string) => {
    // Navigate to user detail page or open modal
    console.log('View user:', userId);
  };

  // ============================================
  // Analytics Summary
  // ============================================

  const analyticsSummary = useMemo(() => {
    if (!userAnalytics) return null;
    
    const growthRate = userAnalytics.totalUsers > 0
      ? ((userAnalytics.newThisMonth - (userAnalytics.churnedThisMonth || 0)) / userAnalytics.totalUsers) * 100
      : 0;

    return {
      totalUsers: userAnalytics.totalUsers,
      activeUsers: userAnalytics.activeUsers,
      newToday: userAnalytics.newToday,
      newThisWeek: userAnalytics.newThisWeek,
      newThisMonth: userAnalytics.newThisMonth,
      churnedThisMonth: userAnalytics.churnedThisMonth || 0,
      growthRate,
      averageExecutions: userAnalytics.averageExecutions,
      averageSpent: userAnalytics.averageSpent,
      overageUsers: userAnalytics.overageUsers || 0,
      totalOverageCost: userAnalytics.totalOverageCost || 0,
      planDistribution: userAnalytics.planDistribution || {},
      recentSignups: userAnalytics.recentSignups || [],
    };
  }, [userAnalytics]);

  // ============================================
  // Views
  // ============================================

  const views = [
    { id: 'all', label: 'All Users', icon: <Users className="h-4 w-4" />, count: users?.total || 0 },
    { id: 'overages', label: 'Overages', icon: <AlertCircle className="h-4 w-4" />, count: overageAlerts?.length || 0 },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'recent', label: 'Recent Activity', icon: <Activity className="h-4 w-4" /> },
  ];

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            User Management
          </h2>
          <p className="text-sm text-secondary-500 mt-1">
            Manage users, monitor overages, and track user analytics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </button>
          <button
            onClick={() => fetchUsers(filters)}
            disabled={usersLoading}
            className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1 overflow-x-auto">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => {
                setActiveView(view.id as UsersView);
                setSelectedUsers(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeView === view.id
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
              }`}
            >
              {view.icon}
              {view.label}
              {view.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeView === view.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-secondary-100 text-secondary-600'
                }`}>
                  {view.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Analytics Summary (shown on All Users and Analytics views) */}
      {(activeView === 'all' || activeView === 'analytics') && analyticsSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatCompactNumber(analyticsSummary.totalUsers)}</p>
            <p className="text-xs text-secondary-500">Total Users</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{formatCompactNumber(analyticsSummary.newToday)}</p>
            <p className="text-xs text-secondary-500">New Today</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{formatCompactNumber(analyticsSummary.newThisWeek)}</p>
            <p className="text-xs text-secondary-500">New This Week</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{formatCompactNumber(analyticsSummary.overageUsers)}</p>
            <p className="text-xs text-secondary-500">In Overage</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className={`text-xl font-bold flex items-center justify-center gap-1 ${analyticsSummary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analyticsSummary.growthRate >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(analyticsSummary.growthRate).toFixed(1)}%
            </p>
            <p className="text-xs text-secondary-500">Growth Rate</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xl font-bold text-purple-600">{formatCurrency(analyticsSummary.totalOverageCost / 100)}</p>
            <p className="text-xs text-secondary-500">Overage Revenue</p>
          </div>
        </div>
      )}

      {/* Search & Filters (All Users view) */}
      {activeView === 'all' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by email, name, or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700'
                : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-600 hover:bg-secondary-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {(filters.planId || filters.role || filters.status) && (
              <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">!</span>
            )}
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && activeView === 'all' && (
        <UserFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && activeView === 'all' && (
        <BulkActions
          selectedCount={selectedUsers.size}
          onActivate={() => handleBulkAction('activate')}
          onSuspend={() => handleBulkAction('suspend')}
          onDelete={() => handleBulkAction('delete')}
          onNotify={() => handleBulkAction('notify')}
          onClear={() => setSelectedUsers(new Set())}
        />
      )}

      {/* All Users View */}
      {activeView === 'all' && (
        <>
          <UserTable
            users={users?.data || []}
            selectedUsers={selectedUsers}
            onSelectUser={handleSelectUser}
            onSelectAll={handleSelectAll}
            onSort={handleSort}
            sortBy={filters.sortBy || 'createdAt'}
            sortOrder={(filters.sortOrder as 'asc' | 'desc') || 'desc'}
            onEdit={(user) => setPlanChangeUser(user)}
            onSuspend={(user) => setConfirmAction({ type: 'suspend', userId: user.id, userName: user.email })}
            onActivate={(user) => setConfirmAction({ type: 'activate', userId: user.id, userName: user.email })}
            onDelete={(user) => setConfirmAction({ type: 'delete', userId: user.id, userName: user.email })}
            onImpersonate={handleImpersonate}
            onNotifyUser={handleNotifyUser}
            onViewUser={handleViewUser}
            isLoading={usersLoading}
            error={usersError}
            onRefresh={() => fetchUsers(filters)}
            onExport={handleExport}
          />

          {/* Pagination */}
          {users && users.totalPages > 1 && (
            <div className="flex flex-wrap justify-between items-center gap-4">
              <p className="text-sm text-secondary-500">
                Showing {((users.page - 1) * users.limit) + 1} to {Math.min(users.page * users.limit, users.total)} of {users.total} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(users.page - 1)}
                  disabled={users.page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 disabled:opacity-50 hover:bg-secondary-50"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1 text-sm">
                  {Array.from({ length: Math.min(5, users.totalPages) }, (_, i) => {
                    const page = i + Math.max(1, users.page - 2);
                    if (page > users.totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-8 h-8 rounded-lg text-sm ${
                          page === users.page
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-secondary-100 dark:hover:bg-secondary-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(users.page + 1)}
                  disabled={users.page === users.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 disabled:opacity-50 hover:bg-secondary-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Overages View */}
      {activeView === 'overages' && (
        <OverageUserTable
          users={overageAlerts || []}
          isLoading={false}
          onRefresh={fetchOverageAlerts}
          onExport={handleExport}
          onNotifyUser={handleNotifyUser}
          onViewUser={handleViewUser}
          onChangePlan={(userId) => {
            const user = (users?.data || []).find(u => u.id === userId);
            if (user) setPlanChangeUser(user);
          }}
        />
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && analyticsSummary && (
        <div className="space-y-6">
          {/* Plan Distribution */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Plan Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(analyticsSummary.planDistribution).map(([plan, count]) => {
                const percentage = analyticsSummary.totalUsers > 0 ? ((count as number) / analyticsSummary.totalUsers) * 100 : 0;
                return (
                  <div key={plan} className="text-center">
                    <p className="text-2xl font-bold text-secondary-900 dark:text-white">{count as number}</p>
                    <p className="text-xs text-secondary-500">{plan}</p>
                    <div className="w-full h-1.5 bg-secondary-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-secondary-400 mt-1">{percentage.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Distribution */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Role Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(analyticsSummary.roleDistribution).map(([role, count]) => (
                <div key={role} className="text-center">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">{count as number}</p>
                  <p className="text-xs text-secondary-500 capitalize">{role.toLowerCase()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Status Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(analyticsSummary.statusDistribution).map(([status, count]) => (
                <div key={status} className="text-center">
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">{count as number}</p>
                  <p className="text-xs text-secondary-500 capitalize">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Average Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCompactNumber(analyticsSummary.averageExecutions)}</p>
              <p className="text-xs text-secondary-500">Avg Executions per User</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(analyticsSummary.averageSpent / 100)}</p>
              <p className="text-xs text-secondary-500">Avg Revenue per User</p>
            </div>
          </div>

          {/* Top Users */}
          {analyticsSummary.topUsers && analyticsSummary.topUsers.length > 0 && (
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Top Users by Usage</h3>
              <div className="space-y-3">
                {analyticsSummary.topUsers.slice(0, 10).map((user, idx) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-secondary-400 w-6">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-secondary-900 dark:text-white">{user.name || user.email}</p>
                        <p className="text-xs text-secondary-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-secondary-600">{formatCompactNumber(user.executions)} exec</span>
                      <span className="font-medium">{formatCurrency(user.spent / 100)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity View */}
      {activeView === 'recent' && analyticsSummary?.recentSignups && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Recent Signups</h3>
          </div>
          <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {analyticsSummary.recentSignups.length === 0 ? (
              <div className="p-8 text-center text-secondary-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent signups</p>
              </div>
            ) : (
              analyticsSummary.recentSignups.map(user => (
                <div key={user.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900 dark:text-white">{user.name || 'Unknown'}</p>
                      <p className="text-xs text-secondary-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-secondary-500">Joined {formatDate(user.createdAt)}</p>
                    <p className={`text-xs ${user.planId === 'FREE' ? 'text-secondary-400' : 'text-green-600'}`}>
                      {user.planId} Plan
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {planChangeUser && (
        <PlanChangeModal
          user={planChangeUser}
          currentUsage={{
            aiActionsUsed: planChangeUser.aiActionsUsed || 0,
            aiActionsLimit: planChangeUser.aiActionsLimit || 0,
            apiCallsUsed: planChangeUser.apiCallsUsed || 0,
            apiCallsLimit: planChangeUser.apiCallsLimit || 0,
            currentOverageCost: planChangeUser.overageCost || 0,
            projectedOverageCost: (planChangeUser.overageCost || 0) * 1.1,
            usageTrend: planChangeUser.overageCost && planChangeUser.overageCost > 0 ? 'increasing' : 'stable',
          }}
          onClose={() => setPlanChangeUser(null)}
          onConfirm={handlePlanChange}
          onNotifyUser={handleNotifyUser}
        />
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <ConfirmActionModal
          action={confirmAction.type}
          userName={confirmAction.userName}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
};


export default UsersManagement;
