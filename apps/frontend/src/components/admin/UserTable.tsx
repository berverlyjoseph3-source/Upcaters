// enterprise-ai-agent-platform/apps/frontend/src/components/admin/UserTable.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Filter, Download, MoreVertical, Edit, Ban, CheckCircle,
  Trash2, Eye, UserCog, Mail, ChevronDown, ChevronUp, X,
  RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Target,
  Zap, Activity, DollarSign, Clock, Shield, Users, ArrowUpRight,
  ArrowDownRight, Star, Crown, Award
} from 'lucide-react';
import { AdminUser, PlanId, UserRole, UserStatus } from '../../types/admin.types';
import { formatCompactNumber, formatCurrency, formatDate, formatRelativeTime } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

type SortField = 'email' | 'planId' | 'role' | 'status' | 'createdAt' | 'lastLoginAt' | 'totalExecutions' | 'totalSpent' | 'aiActionsUsed' | 'apiCallsUsed' | 'overageCost';
type SortDirection = 'asc' | 'desc';

interface UserTableProps {
  users: AdminUser[];
  selectedUsers: Set<string>;
  onSelectUser: (userId: string) => void;
  onSelectAll: () => void;
  onSort: (column: string) => void;
  sortBy: string;
  sortOrder: SortDirection;
  onEdit: (user: AdminUser) => void;
  onSuspend: (user: AdminUser) => void;
  onActivate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onImpersonate: (userId: string) => void;
  onNotifyUser?: (userId: string) => void;
  onViewUser?: (userId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

const PLAN_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  FREE: { label: 'Free', bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', icon: <Target className="h-3 w-3" /> },
  STARTER: { label: 'Starter', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: <Zap className="h-3 w-3" /> },
  PROFESSIONAL: { label: 'Pro', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: <Award className="h-3 w-3" /> },
  ENTERPRISE: { label: 'Enterprise', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: <Crown className="h-3 w-3" /> },
};

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  USER: { label: 'User', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  ADMIN: { label: 'Admin', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  SUPPORT: { label: 'Support', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  active: { label: 'Active', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: <CheckCircle className="h-3 w-3" /> },
  inactive: { label: 'Inactive', bg: 'bg-secondary-100 dark:bg-secondary-800', text: 'text-secondary-700 dark:text-secondary-400', icon: <Clock className="h-3 w-3" /> },
  suspended: { label: 'Suspended', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <Ban className="h-3 w-3" /> },
  pending: { label: 'Pending', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: <Clock className="h-3 w-3" /> },
};

const SORTABLE_COLUMNS = [
  { key: 'email', label: 'User' },
  { key: 'planId', label: 'Plan' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Joined' },
  { key: 'lastLoginAt', label: 'Last Login' },
  { key: 'totalExecutions', label: 'Executions' },
  { key: 'totalSpent', label: 'Spent' },
  { key: 'aiActionsUsed', label: 'AI Actions' },
  { key: 'apiCallsUsed', label: 'API Calls' },
  { key: 'overageCost', label: 'Overage' },
];

// ============================================
// Component
// ============================================

export const UserTable: React.FC<UserTableProps> = ({
  users,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onSort,
  sortBy,
  sortOrder,
  onEdit,
  onSuspend,
  onActivate,
  onDelete,
  onImpersonate,
  onNotifyUser,
  onViewUser,
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  className = '',
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['email', 'planId', 'role', 'status', 'totalExecutions', 'totalSpent', 'overageCost', 'lastLoginAt'])
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ============================================
  // Filters
  // ============================================

  const planOptions = useMemo(() => {
    const plans = new Set(users.map(u => u.planId));
    return Array.from(plans);
  }, [users]);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email?.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query)
      );
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(u => u.planId === planFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    return filtered;
  }, [users, searchQuery, planFilter, roleFilter, statusFilter]);

  // ============================================
  // Summary
  // ============================================

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    freePlan: users.filter(u => u.planId === 'FREE').length,
    paidPlan: users.filter(u => u.planId !== 'FREE').length,
    enterprisePlan: users.filter(u => u.planId === 'ENTERPRISE').length,
    totalRevenue: users.reduce((sum, u) => sum + (u.totalSpent || 0), 0),
    totalExecutions: users.reduce((sum, u) => sum + (u.totalExecutions || 0), 0),
    usersInOverage: users.filter(u => (u.overageCost || 0) > 0).length,
    totalOverage: users.reduce((sum, u) => sum + (u.overageCost || 0), 0),
  }), [users]);

  // ============================================
  // Helpers
  // ============================================

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const getInitials = (name?: string | null, email?: string): string => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    return email?.charAt(0).toUpperCase() || '?';
  };

  const getUsageColor = (used: number, limit: number): string => {
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const handleColumnToggle = (key: string) => {
    const newSet = new Set(visibleColumns);
    if (newSet.has(key)) {
      if (newSet.size > 3) newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setVisibleColumns(newSet);
  };

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-secondary-100 dark:bg-secondary-700 border-b border-secondary-200 dark:border-secondary-600 flex items-center px-4">
            <div className="h-4 w-32 bg-secondary-200 rounded"></div>
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 border-b border-secondary-100 dark:border-secondary-700 flex items-center px-4 gap-4">
              <div className="h-4 w-4 bg-secondary-200 rounded"></div>
              <div className="h-8 w-8 bg-secondary-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-secondary-200 rounded"></div>
                <div className="h-2 w-48 bg-secondary-200 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-secondary-200 rounded-full"></div>
              <div className="h-6 w-16 bg-secondary-200 rounded-full"></div>
              <div className="h-4 w-16 bg-secondary-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center ${className}`}>
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load users</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (users.length === 0) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-12 text-center ${className}`}>
        <Users className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Users Found</h3>
        <p className="text-secondary-500">Users will appear here once they sign up for the platform.</p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden ${className}`}>
      {/* Summary Bar */}
      <div className="p-3 border-b border-secondary-200 dark:border-secondary-700 bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatCompactNumber(summary.total)}</p>
            <p className="text-xs text-secondary-500">Total Users</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{formatCompactNumber(summary.active)}</p>
            <p className="text-xs text-secondary-500">Active</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{formatCompactNumber(summary.paidPlan)}</p>
            <p className="text-xs text-secondary-500">Paid Plans</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-600">{formatCompactNumber(summary.enterprisePlan)}</p>
            <p className="text-xs text-secondary-500">Enterprise</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600">{formatCompactNumber(summary.usersInOverage)}</p>
            <p className="text-xs text-secondary-500">In Overage</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalOverage / 100)}</p>
            <p className="text-xs text-secondary-500">Total Overage</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalRevenue / 100)}</p>
            <p className="text-xs text-secondary-500">Total Revenue</p>
          </div>
          <div>
            <p className="text-lg font-bold text-indigo-600">{formatCompactNumber(summary.totalExecutions)}</p>
            <p className="text-xs text-secondary-500">Executions</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 border-b border-secondary-200 dark:border-secondary-700 flex flex-wrap gap-3 items-center bg-secondary-50/50 dark:bg-secondary-800/50">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Plans</option>
          {planOptions.map(plan => (
            <option key={plan} value={plan}>{PLAN_CONFIG[plan]?.label || plan}</option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPPORT">Support</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>

        <div className="flex-1" />

        {/* Column Selector */}
        <div className="relative">
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            <Filter className="h-4 w-4" />
            Columns
          </button>
          {showColumnSelector && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-20 p-2">
                {SORTABLE_COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      onChange={() => handleColumnToggle(col.key)}
                      className="w-4 h-4 rounded border-secondary-300"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Export */}
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Download className="h-4 w-4" />
            Export
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={onSelectAll}
                  className="w-4 h-4 rounded border-secondary-300"
                />
              </th>
              {SORTABLE_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                <th
                  key={col.key}
                  onClick={() => onSort(col.key)}
                  className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-600 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {getSortIcon(col.key)}
                  </div>
                </th>
              ))}
              <th className="w-10 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.size + 2} className="px-4 py-12 text-center text-secondary-500">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No users match your filters</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUsers.has(user.id);
                const planConfig = PLAN_CONFIG[user.planId] || PLAN_CONFIG.FREE;
                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
                const statusConfig = STATUS_CONFIG[user.status] || STATUS_CONFIG.active;
                const isOverage = (user.overageCost || 0) > 0;
                const isExpanded = expandedUser === user.id;

                return (
                  <React.Fragment key={user.id}>
                    {/* Main Row */}
                    <tr
                      className={`hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                      } ${isOverage ? 'border-l-2 border-l-yellow-500' : ''}`}
                      onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectUser(user.id)}
                          className="w-4 h-4 rounded border-secondary-300"
                        />
                      </td>

                      {/* Email / Name */}
                      {visibleColumns.has('email') && (
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                              {getInitials(user.name, user.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-secondary-900 dark:text-white truncate">
                                {user.name || 'Unknown User'}
                              </p>
                              <p className="text-xs text-secondary-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Plan */}
                      {visibleColumns.has('planId') && (
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${planConfig.bg} ${planConfig.text}`}>
                            {planConfig.icon}
                            {planConfig.label}
                          </span>
                        </td>
                      )}

                      {/* Role */}
                      {visibleColumns.has('role') && (
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleConfig.bg} ${roleConfig.text}`}>
                            {roleConfig.label}
                          </span>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.has('status') && (
                        <td className="px-3 py-3">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </div>
                        </td>
                      )}

                      {/* Total Executions */}
                      {visibleColumns.has('totalExecutions') && (
                        <td className="px-3 py-3 text-sm text-secondary-600 dark:text-secondary-400">
                          {formatCompactNumber(user.totalExecutions || 0)}
                        </td>
                      )}

                      {/* Total Spent */}
                      {visibleColumns.has('totalSpent') && (
                        <td className="px-3 py-3 text-sm font-medium text-secondary-900 dark:text-white">
                          {formatCurrency((user.totalSpent || 0) / 100)}
                        </td>
                      )}

                      {/* AI Actions */}
                      {visibleColumns.has('aiActionsUsed') && (
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-xs font-mono">
                              {formatCompactNumber(user.aiActionsUsed || 0)} / {formatCompactNumber(user.aiActionsLimit || 0)}
                            </p>
                            <div className="w-16 h-1.5 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full transition-all ${getUsageColor(user.aiActionsUsed || 0, user.aiActionsLimit || 1)}`}
                                style={{ width: `${Math.min(100, ((user.aiActionsUsed || 0) / (user.aiActionsLimit || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* API Calls */}
                      {visibleColumns.has('apiCallsUsed') && (
                        <td className="px-3 py-3">
                          <div>
                            <p className="text-xs font-mono">
                              {formatCompactNumber(user.apiCallsUsed || 0)} / {formatCompactNumber(user.apiCallsLimit || 0)}
                            </p>
                            <div className="w-16 h-1.5 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full transition-all ${getUsageColor(user.apiCallsUsed || 0, user.apiCallsLimit || 1)}`}
                                style={{ width: `${Math.min(100, ((user.apiCallsUsed || 0) / (user.apiCallsLimit || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Overage Cost */}
                      {visibleColumns.has('overageCost') && (
                        <td className="px-3 py-3 text-right">
                          {isOverage ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              {formatCurrency((user.overageCost || 0) / 100)}
                            </span>
                          ) : (
                            <span className="text-xs text-secondary-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Joined */}
                      {visibleColumns.has('createdAt') && (
                        <td className="px-3 py-3 text-xs text-secondary-500 whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </td>
                      )}

                      {/* Last Login */}
                      {visibleColumns.has('lastLoginAt') && (
                        <td className="px-3 py-3 text-xs text-secondary-500 whitespace-nowrap">
                          {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                            className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-secondary-500" />
                          </button>

                          {menuOpen === user.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-20 overflow-hidden">
                                <div className="py-1">
                                  {onViewUser && (
                                    <button
                                      onClick={() => { onViewUser(user.id); setMenuOpen(null); }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-secondary-500" />
                                      View Details
                                    </button>
                                  )}
                                  {onNotifyUser && (
                                    <button
                                      onClick={() => { onNotifyUser(user.id); setMenuOpen(null); }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                    >
                                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                                      Notify User
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { onEdit(user); setMenuOpen(null); }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                  >
                                    <Edit className="h-3.5 w-3.5 text-secondary-500" />
                                    Edit / Change Plan
                                  </button>
                                  <button
                                    onClick={() => { onImpersonate(user.id); setMenuOpen(null); }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                  >
                                    <UserCog className="h-3.5 w-3.5 text-purple-500" />
                                    Impersonate
                                  </button>
                                  <hr className="my-1 border-secondary-200 dark:border-secondary-600" />
                                  {user.status === 'active' ? (
                                    <button
                                      onClick={() => { onSuspend(user); setMenuOpen(null); }}
                                      className="w-full text-left px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                      Suspend User
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { onActivate(user); setMenuOpen(null); }}
                                      className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Activate User
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { onDelete(user); setMenuOpen(null); }}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete User
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                        <td colSpan={visibleColumns.size + 2} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* User Info */}
                            <div>
                              <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">User Info</h4>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-secondary-500">ID:</span> <span className="font-mono text-xs">{user.id?.substring(0, 12)}...</span></p>
                                <p><span className="text-secondary-500">Email:</span> {user.email}</p>
                                <p><span className="text-secondary-500">Name:</span> {user.name || 'N/A'}</p>
                                <p><span className="text-secondary-500">Verified:</span> {user.isEmailVerified ? '✅ Yes' : '❌ No'}</p>
                                <p><span className="text-secondary-500">Joined:</span> {formatDate(user.createdAt)}</p>
                                <p><span className="text-secondary-500">Last Login:</span> {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}</p>
                              </div>
                            </div>

                            {/* Plan & Billing */}
                            <div>
                              <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Plan & Billing</h4>
                              <div className="space-y-1 text-sm">
                                <p>
                                  <span className="text-secondary-500">Plan:</span>
                                  <span className={`inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${planConfig.bg} ${planConfig.text}`}>
                                    {planConfig.icon} {planConfig.label}
                                  </span>
                                </p>
                                <p><span className="text-secondary-500">Role:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.bg} ${roleConfig.text}`}>{roleConfig.label}</span></p>
                                <p><span className="text-secondary-500">Total Spent:</span> <span className="font-medium">{formatCurrency((user.totalSpent || 0) / 100)}</span></p>
                                <p><span className="text-secondary-500">Overage Cost:</span> <span className={isOverage ? 'text-red-600 font-medium' : ''}>{isOverage ? formatCurrency((user.overageCost || 0) / 100) : 'None'}</span></p>
                                <p><span className="text-secondary-500">Stripe ID:</span> <span className="font-mono text-xs">{user.stripeCustomerId || 'N/A'}</span></p>
                              </div>
                            </div>

                            {/* Usage Stats */}
                            <div>
                              <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Usage Stats</h4>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-secondary-500">Total Executions:</span> <span className="font-medium">{formatCompactNumber(user.totalExecutions || 0)}</span></p>
                                <p>
                                  <span className="text-secondary-500">AI Actions:</span>
                                  <span className="font-medium ml-1">{formatCompactNumber(user.aiActionsUsed || 0)} / {formatCompactNumber(user.aiActionsLimit || 0)}</span>
                                  {user.aiActionsUsed > user.aiActionsLimit && (
                                    <span className="text-red-600 text-xs ml-1">(+{formatCompactNumber(user.aiActionsUsed - user.aiActionsLimit)})</span>
                                  )}
                                </p>
                                <p>
                                  <span className="text-secondary-500">API Calls:</span>
                                  <span className="font-medium ml-1">{formatCompactNumber(user.apiCallsUsed || 0)} / {formatCompactNumber(user.apiCallsLimit || 0)}</span>
                                  {user.apiCallsUsed > user.apiCallsLimit && (
                                    <span className="text-red-600 text-xs ml-1">(+{formatCompactNumber(user.apiCallsUsed - user.apiCallsLimit)})</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div>
                              <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Quick Actions</h4>
                              <div className="space-y-2">
                                <button
                                  onClick={() => { onEdit(user); setExpandedUser(null); }}
                                  className="w-full px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center gap-1"
                                >
                                  <Edit className="h-3.5 w-3.5" /> Change Plan
                                </button>
                                <button
                                  onClick={() => { onImpersonate(user.id); setExpandedUser(null); }}
                                  className="w-full px-3 py-1.5 text-sm border border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg flex items-center justify-center gap-1"
                                >
                                  <UserCog className="h-3.5 w-3.5" /> Impersonate
                                </button>
                                {onNotifyUser && (
                                  <button
                                    onClick={() => { onNotifyUser(user.id); setExpandedUser(null); }}
                                    className="w-full px-3 py-1.5 text-sm border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1"
                                  >
                                    <Mail className="h-3.5 w-3.5" /> Send Notification
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-700/30 flex justify-between items-center text-xs text-secondary-500">
        <span>Showing {filteredUsers.length} of {users.length} users</span>
        <span>{selectedUsers.size} selected</span>
      </div>
    </div>
  );
};


export default UserTable;
