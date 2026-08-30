// enterprise-ai-agent-platform/apps/frontend/src/components/admin/OverageUserTable.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Filter, Download, Mail, ChevronDown, ChevronUp,
  AlertTriangle, DollarSign, Zap, Activity, TrendingUp,
  ExternalLink, MoreVertical, Eye, Ban, CheckCircle,
  RefreshCw, X, ArrowUpRight, ArrowDownRight, Users,
  Clock, BarChart3, Target
} from 'lucide-react';
import { formatCurrency, formatCompactNumber, formatDate } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

export interface OverageUser {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  planId: string;
  planName: string;
  planPrice: number; // in cents
  aiActionsUsed: number;
  aiActionsLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  overageDetails: {
    aiOverageAmount: number;
    apiOverageAmount: number;
    aiOverageCost: number;
    apiOverageCost: number;
    totalOverageCost: number;
    imageOverageAmount?: number;
    imageOverageCost?: number;
    videoOverageAmount?: number;
    videoOverageCost?: number;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  notifiedAt?: Date;
  lastActionAt?: Date;
  recommendation?: {
    suggestedPlan: string;
    savingsWithUpgrade: number;
    upgradeUrl: string;
  };
  usageTrend: 'increasing' | 'decreasing' | 'stable';
  consecutiveMonthsInOverage: number;
  totalSpentThisPeriod: number;
}

type SortField = keyof OverageUser | 'overageDetails.totalOverageCost' | 'overageDetails.aiOverageAmount';
type SortDirection = 'asc' | 'desc';

interface OverageUserTableProps {
  users: OverageUser[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onExport?: () => void;
  onNotifyUser?: (userId: string) => void;
  onViewUser?: (userId: string) => void;
  onChangePlan?: (userId: string) => void;
  onSuspendUser?: (userId: string) => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    label: 'Critical',
    description: 'Over $100 in overage charges',
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
    label: 'High',
    description: '$50-$100 in overage charges',
  },
  medium: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    label: 'Medium',
    description: '$20-$50 in overage charges',
  },
  low: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <AlertTriangle className="h-4 w-4 text-blue-600" />,
    label: 'Low',
    description: 'Under $20 in overage charges',
  },
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FREE: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  STARTER: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  PROFESSIONAL: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  ENTERPRISE: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
};

const TREND_CONFIG = {
  increasing: { icon: <ArrowUpRight className="h-3 w-3" />, color: 'text-red-600', label: 'Increasing' },
  decreasing: { icon: <ArrowDownRight className="h-3 w-3" />, color: 'text-green-600', label: 'Decreasing' },
  stable: { icon: <Target className="h-3 w-3" />, color: 'text-secondary-500', label: 'Stable' },
};

// ============================================
// Component
// ============================================

export const OverageUserTable: React.FC<OverageUserTableProps> = ({
  users,
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  onNotifyUser,
  onViewUser,
  onChangePlan,
  onSuspendUser,
  className = '',
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('overageDetails.totalOverageCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============================================
  // Filtered & Sorted Data
  // ============================================

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.planName?.toLowerCase().includes(query)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(user => user.severity === severityFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(user => user.planId === planFilter);
    }

    // Trend filter
    if (trendFilter !== 'all') {
      filtered = filtered.filter(user => user.usageTrend === trendFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'overageDetails.totalOverageCost') {
        aVal = a.overageDetails.totalOverageCost;
        bVal = b.overageDetails.totalOverageCost;
      } else if (sortField === 'overageDetails.aiOverageAmount') {
        aVal = a.overageDetails.aiOverageAmount;
        bVal = b.overageDetails.aiOverageAmount;
      } else {
        aVal = a[sortField as keyof OverageUser];
        bVal = b[sortField as keyof OverageUser];
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortDirection === 'asc' 
        ? (Number(aVal) || 0) - (Number(bVal) || 0)
        : (Number(bVal) || 0) - (Number(aVal) || 0);
    });

    return filtered;
  }, [users, debouncedSearch, severityFilter, planFilter, trendFilter, sortField, sortDirection]);

  // Summary
  const summary = useMemo(() => ({
    totalOverageUsers: users.length,
    criticalCount: users.filter(u => u.severity === 'critical').length,
    highCount: users.filter(u => u.severity === 'high').length,
    totalOverageCost: users.reduce((sum, u) => sum + u.overageDetails.totalOverageCost, 0),
    totalAiOverages: users.reduce((sum, u) => sum + u.overageDetails.aiOverageAmount, 0),
    totalApiOverages: users.reduce((sum, u) => sum + u.overageDetails.apiOverageAmount, 0),
    avgConsecutiveMonths: users.length > 0 
      ? users.reduce((sum, u) => sum + u.consecutiveMonthsInOverage, 0) / users.length 
      : 0,
    upgradeCandidates: users.filter(u => u.recommendation?.savingsWithUpgrade > 0).length,
    potentialSavings: users.reduce((sum, u) => sum + (u.recommendation?.savingsWithUpgrade || 0), 0),
  }), [users]);

  // Plan options for filter
  const planOptions = useMemo(() => {
    const plans = new Set(users.map(u => u.planId));
    return Array.from(plans);
  }, [users]);

  // ============================================
  // Handlers
  // ============================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.userId)));
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    return email?.charAt(0).toUpperCase() || '?';
  };

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 ${className}`}>
        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-5 w-40 bg-secondary-200 rounded"></div>
          </div>
        </div>
        <div className="animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700 flex items-center px-4">
              <div className="h-4 w-8 bg-secondary-200 rounded mr-4"></div>
              <div className="h-4 w-32 bg-secondary-200 rounded mr-4"></div>
              <div className="h-4 w-20 bg-secondary-200 rounded mr-4"></div>
              <div className="flex-1"></div>
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
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load overage data</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
            Try Again
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
        <CheckCircle className="h-16 w-16 mx-auto text-green-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">All Users Within Limits</h3>
        <p className="text-secondary-500 max-w-md mx-auto">
          No users are currently exceeding their plan limits. All usage is within the allocated quotas.
        </p>
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
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{summary.totalOverageUsers}</p>
            <p className="text-xs text-secondary-500">Users in Overage</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{summary.criticalCount}</p>
            <p className="text-xs text-secondary-500">Critical</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-orange-600">{summary.highCount}</p>
            <p className="text-xs text-secondary-500">High</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.totalOverageCost)}</p>
            <p className="text-xs text-secondary-500">Total Overage Cost</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{formatCompactNumber(summary.totalAiOverages)}</p>
            <p className="text-xs text-secondary-500">AI Overages</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">{formatCompactNumber(summary.totalApiOverages)}</p>
            <p className="text-xs text-secondary-500">API Overages</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{summary.upgradeCandidates}</p>
            <p className="text-xs text-secondary-500">Upgrade Candidates</p>
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

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Plans</option>
          {planOptions.map(plan => (
            <option key={plan} value={plan}>{plan}</option>
          ))}
        </select>

        {/* Trend Filter */}
        <select
          value={trendFilter}
          onChange={(e) => setTrendFilter(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Trends</option>
          <option value="increasing">Increasing</option>
          <option value="decreasing">Decreasing</option>
          <option value="stable">Stable</option>
        </select>

        <div className="flex-1" />

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkActions(true)}
              className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
            >
              Bulk Actions ({selectedUsers.size})
            </button>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="px-2 py-1.5 text-sm text-secondary-500 hover:text-secondary-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && selectedUsers.size > 0 && (
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 flex items-center gap-3">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
            {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => {
              selectedUsers.forEach(id => onNotifyUser?.(id));
              setShowBulkActions(false);
              setSelectedUsers(new Set());
            }}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
          >
            <Mail className="h-3 w-3" />
            Notify All
          </button>
          <button
            onClick={() => setShowBulkActions(false)}
            className="px-3 py-1 text-sm border rounded-lg hover:bg-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-secondary-300"
                />
              </th>
              <th 
                onClick={() => handleSort('email')}
                className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-600"
              >
                <div className="flex items-center gap-1">User {getSortIcon('email')}</div>
              </th>
              <th 
                onClick={() => handleSort('planId')}
                className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
              >
                <div className="flex items-center gap-1">Plan {getSortIcon('planId')}</div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500 uppercase">AI Actions</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500 uppercase">API Calls</th>
              <th 
                onClick={() => handleSort('overageDetails.totalOverageCost')}
                className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Overage Cost {getSortIcon('overageDetails.totalOverageCost')}
                </div>
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Severity</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Trend</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Months</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-secondary-500">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No users match your filters</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <React.Fragment key={user.userId}>
                  {/* Main Row */}
                  <tr 
                    className={`hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer ${
                      selectedUsers.has(user.userId) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                    }`}
                    onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.userId)}
                        onChange={() => handleSelectUser(user.userId)}
                        className="w-4 h-4 rounded border-secondary-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {getInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-secondary-900 dark:text-white truncate">{user.name || 'Unknown User'}</p>
                          <p className="text-xs text-secondary-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[user.planId]?.bg} ${PLAN_COLORS[user.planId]?.text}`}>
                        {user.planId}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-center">
                        <p className="text-xs font-mono">
                          {formatCompactNumber(user.aiActionsUsed)} / {formatCompactNumber(user.aiActionsLimit)}
                        </p>
                        <div className="w-16 h-1.5 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden mx-auto mt-1">
                          <div 
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${Math.min(120, (user.aiActionsUsed / (user.aiActionsLimit || 1)) * 100)}%` }}
                          />
                        </div>
                        {user.aiActionsUsed > user.aiActionsLimit && (
                          <p className="text-xs text-red-600 mt-0.5">
                            +{formatCompactNumber(user.overageDetails.aiOverageAmount)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-center">
                        <p className="text-xs font-mono">
                          {formatCompactNumber(user.apiCallsUsed)} / {formatCompactNumber(user.apiCallsLimit)}
                        </p>
                        <div className="w-16 h-1.5 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden mx-auto mt-1">
                          <div 
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ width: `${Math.min(120, (user.apiCallsUsed / (user.apiCallsLimit || 1)) * 100)}%` }}
                          />
                        </div>
                        {user.apiCallsUsed > user.apiCallsLimit && (
                          <p className="text-xs text-red-600 mt-0.5">
                            +{formatCompactNumber(user.overageDetails.apiOverageAmount)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(user.overageDetails.totalOverageCost)}
                      </p>
                      <p className="text-xs text-secondary-500">
                        {formatCurrency(user.overageDetails.aiOverageCost)} AI
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_CONFIG[user.severity].bg} ${SEVERITY_CONFIG[user.severity].text}`}>
                        {SEVERITY_CONFIG[user.severity].icon}
                        {SEVERITY_CONFIG[user.severity].label}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center gap-1 ${TREND_CONFIG[user.usageTrend].color}`}>
                        {TREND_CONFIG[user.usageTrend].icon}
                        <span className="text-xs">{TREND_CONFIG[user.usageTrend].label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-sm font-medium ${
                        user.consecutiveMonthsInOverage >= 3 ? 'text-red-600' : 
                        user.consecutiveMonthsInOverage >= 2 ? 'text-orange-600' : 
                        'text-yellow-600'
                      }`}>
                        {user.consecutiveMonthsInOverage}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuUser(actionMenuUser === user.userId ? null : user.userId)}
                          className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                        >
                          <MoreVertical className="h-4 w-4 text-secondary-500" />
                        </button>

                        {actionMenuUser === user.userId && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuUser(null)} />
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-20 overflow-hidden">
                              {onViewUser && (
                                <button
                                  onClick={() => { onViewUser(user.userId); setActionMenuUser(null); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                >
                                  <Eye className="h-3 w-3" /> View Details
                                </button>
                              )}
                              {onNotifyUser && (
                                <button
                                  onClick={() => { onNotifyUser(user.userId); setActionMenuUser(null); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                >
                                  <Mail className="h-3 w-3" /> Notify User
                                </button>
                              )}
                              {onChangePlan && (
                                <button
                                  onClick={() => { onChangePlan(user.userId); setActionMenuUser(null); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                                >
                                  <TrendingUp className="h-3 w-3" /> Change Plan
                                </button>
                              )}
                              {onSuspendUser && (
                                <button
                                  onClick={() => { onSuspendUser(user.userId); setActionMenuUser(null); }}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                  <Ban className="h-3 w-3" /> Suspend
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {expandedUser === user.userId && (
                    <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Overage Breakdown */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
                              <Zap className="h-4 w-4 text-yellow-600" />
                              Overage Breakdown
                            </h4>
                            <div className="bg-white dark:bg-secondary-800 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">AI Action Overages</span>
                                <span className="font-medium text-red-600">
                                  {formatCompactNumber(user.overageDetails.aiOverageAmount)} ({formatCurrency(user.overageDetails.aiOverageCost)})
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">API Call Overages</span>
                                <span className="font-medium text-red-600">
                                  {formatCompactNumber(user.overageDetails.apiOverageAmount)} ({formatCurrency(user.overageDetails.apiOverageCost)})
                                </span>
                              </div>
                              {user.overageDetails.imageOverageAmount && user.overageDetails.imageOverageAmount > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-secondary-500">Image Generation Overages</span>
                                  <span className="font-medium text-red-600">
                                    {formatCompactNumber(user.overageDetails.imageOverageAmount)} ({formatCurrency(user.overageDetails.imageOverageCost || 0)})
                                  </span>
                                </div>
                              )}
                              {user.overageDetails.videoOverageAmount && user.overageDetails.videoOverageAmount > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-secondary-500">Video Generation Overages</span>
                                  <span className="font-medium text-red-600">
                                    {formatCompactNumber(user.overageDetails.videoOverageAmount)} ({formatCurrency(user.overageDetails.videoOverageCost || 0)})
                                  </span>
                                </div>
                              )}
                              <hr className="border-secondary-200 dark:border-secondary-600" />
                              <div className="flex justify-between text-sm font-semibold">
                                <span>Total Overage</span>
                                <span className="text-red-600">{formatCurrency(user.overageDetails.totalOverageCost)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Usage History */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              Usage & History
                            </h4>
                            <div className="bg-white dark:bg-secondary-800 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">Consecutive Months in Overage</span>
                                <span className={`font-medium ${
                                  user.consecutiveMonthsInOverage >= 3 ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                  {user.consecutiveMonthsInOverage} month{user.consecutiveMonthsInOverage !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">Total Spent This Period</span>
                                <span className="font-medium">{formatCurrency(user.totalSpentThisPeriod)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">Plan Price</span>
                                <span className="font-medium">{formatCurrency(user.planPrice / 100)}/mo</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">Total Cost (Plan + Overage)</span>
                                <span className="font-semibold text-secondary-900 dark:text-white">
                                  {formatCurrency((user.planPrice + user.overageDetails.totalOverageCost * 100) / 100)}/mo
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">Last Notified</span>
                                <span>{user.notifiedAt ? formatDate(user.notifiedAt) : 'Never'}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-secondary-500">Last Action</span>
                                <span>{user.lastActionAt ? formatDate(user.lastActionAt) : 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Upgrade Recommendation */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              Recommendation
                            </h4>
                            {user.recommendation ? (
                              <div className="bg-white dark:bg-secondary-800 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-secondary-500">Suggested Plan</span>
                                  <span className="font-medium text-primary-600">{user.recommendation.suggestedPlan}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-secondary-500">Savings with Upgrade</span>
                                  <span className="font-medium text-green-600">
                                    {formatCurrency(user.recommendation.savingsWithUpgrade)}/mo
                                  </span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-secondary-200 dark:border-secondary-600">
                                  <a
                                    href={user.recommendation.upgradeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    View Upgrade Options
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-secondary-800 rounded-lg p-3">
                                <p className="text-xs text-secondary-500">
                                  User is on the highest available plan. Consider reaching out to discuss custom pricing.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-700/30 flex justify-between items-center text-xs text-secondary-500">
        <span>
          Showing {filteredUsers.length} of {users.length} users • 
          Total overage cost: <span className="font-medium text-red-600">{formatCurrency(summary.totalOverageCost)}</span>
        </span>
        <span>
          Potential savings from upgrades: <span className="font-medium text-green-600">{formatCurrency(summary.potentialSavings)}</span>
        </span>
      </div>
    </div>
  );
};

// Default export

export default OverageUserTable;
