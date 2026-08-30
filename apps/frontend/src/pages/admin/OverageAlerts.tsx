// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/OverageAlerts.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, DollarSign, TrendingUp, TrendingDown, Users,
  Search, Filter, Download, RefreshCw, Mail, ChevronDown,
  ChevronUp, ExternalLink, Zap, Activity, BarChart3
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { OverageAlert, OverageAlertSeverity } from '../../types/admin.types';
import { formatCurrency, formatNumber } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

type SortField = 'totalOverageCost' | 'aiOverageAmount' | 'apiOverageAmount' | 'planId' | 'email';
type SortDirection = 'asc' | 'desc';
type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';

interface OverageAlertExtended extends OverageAlert {
  severity: OverageAlertSeverity;
  aiOverageAmount: number;
  apiOverageAmount: number;
  aiOverageCost: number;
  apiOverageCost: number;
  totalOverageCost: number;
  planId: string;
  email: string;
  name: string;
  percentageOverAiLimit: number;
  percentageOverApiLimit: number;
}

// ============================================
// Component
// ============================================

export const OverageAlerts: React.FC = () => {
  const { 
    overageAlerts, 
    overageAlertsLoading, 
    overageAlertsError, 
    fetchOverageAlerts,
    sendOverageNotification,
    exportOverageReport 
  } = useAdmin();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('totalOverageCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchOverageAlerts();
  }, [fetchOverageAlerts]);

  // ============================================
  // Derived Data
  // ============================================

  const enrichedAlerts = useMemo((): OverageAlertExtended[] => {
    if (!overageAlerts) return [];
    
    return overageAlerts.map(alert => {
      const aiOverage = Math.max(0, (alert.usage?.aiActions?.used || 0) - (alert.usage?.aiActions?.limit || 0));
      const apiOverage = Math.max(0, (alert.usage?.apiCalls?.used || 0) - (alert.usage?.apiCalls?.limit || 0));
      const aiCost = aiOverage * (alert.plan?.overagePricing?.aiAction || 0.05);
      const apiCost = apiOverage * (alert.plan?.overagePricing?.apiCall || 0.01);
      const totalCost = aiCost + apiCost;
      
      let severity: OverageAlertSeverity = 'low';
      if (totalCost > 100) severity = 'critical';
      else if (totalCost > 50) severity = 'high';
      else if (totalCost > 20) severity = 'medium';

      return {
        ...alert,
        severity,
        aiOverageAmount: aiOverage,
        apiOverageAmount: apiOverage,
        aiOverageCost: aiCost,
        apiOverageCost: apiCost,
        totalOverageCost: totalCost,
        percentageOverAiLimit: alert.usage?.aiActions?.limit > 0 
          ? ((alert.usage.aiActions.used / alert.usage.aiActions.limit) * 100) - 100 
          : 0,
        percentageOverApiLimit: alert.usage?.apiCalls?.limit > 0 
          ? ((alert.usage.apiCalls.used / alert.usage.apiCalls.limit) * 100) - 100 
          : 0,
      } as OverageAlertExtended;
    });
  }, [overageAlerts]);

  // Filter and sort
  const filteredAlerts = useMemo(() => {
    let filtered = enrichedAlerts;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.email?.toLowerCase().includes(query) ||
        a.name?.toLowerCase().includes(query)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(a => a.planId === planFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return filtered;
  }, [enrichedAlerts, searchQuery, severityFilter, planFilter, sortField, sortDirection]);

  // Summary statistics
  const summary = useMemo(() => ({
    totalUsersInOverage: enrichedAlerts.length,
    criticalOverages: enrichedAlerts.filter(a => a.severity === 'critical').length,
    highOverages: enrichedAlerts.filter(a => a.severity === 'high').length,
    totalOverageRevenue: enrichedAlerts.reduce((sum, a) => sum + a.totalOverageCost, 0),
    totalAiOverages: enrichedAlerts.reduce((sum, a) => sum + a.aiOverageAmount, 0),
    totalApiOverages: enrichedAlerts.reduce((sum, a) => sum + a.apiOverageAmount, 0),
    averageOverageCost: enrichedAlerts.length > 0 
      ? enrichedAlerts.reduce((sum, a) => sum + a.totalOverageCost, 0) / enrichedAlerts.length 
      : 0,
    upgradeCandidates: enrichedAlerts.filter(a => a.totalOverageCost > a.plan?.priceMonthly * 0.5).length,
  }), [enrichedAlerts]);

  // Plan options for filter
  const planOptions = useMemo(() => {
    const plans = new Set(enrichedAlerts.map(a => a.planId));
    return Array.from(plans);
  }, [enrichedAlerts]);

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
    if (selectedUsers.size === filteredAlerts.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredAlerts.map(a => a.userId)));
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

  const handleNotifyUsers = async () => {
    setIsNotifying(true);
    try {
      await sendOverageNotification(Array.from(selectedUsers));
      setSelectedUsers(new Set());
    } catch (error) {
      console.error('Failed to send notifications:', error);
    } finally {
      setIsNotifying(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportOverageReport();
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================
  // Helpers
  // ============================================

  const getSeverityBadge = (severity: OverageAlertSeverity) => {
    const config = {
      critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Critical' },
      high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'High' },
      medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' },
      low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Low' },
    };
    const c = config[severity];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        <AlertTriangle className="h-3 w-3" />
        {c.label}
      </span>
    );
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // ============================================
  // Loading State
  // ============================================

  if (overageAlertsLoading && !overageAlerts) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (overageAlertsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300">{overageAlertsError}</p>
        <button 
          onClick={() => fetchOverageAlerts()} 
          className="mt-2 text-sm text-primary-600 hover:underline"
        >
          Try again
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
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Overage Alerts
          </h2>
          <p className="text-sm text-secondary-500 mt-1">
            Users currently exceeding their plan limits with estimated overage costs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Report
          </button>
          <button
            onClick={() => fetchOverageAlerts()}
            className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-secondary-500">Users in Overage</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{summary.totalUsersInOverage}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-red-600">{summary.criticalOverages} critical</span>
            <span className="text-xs text-orange-600">{summary.highOverages} high</span>
          </div>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm text-secondary-500">Est. Overage Revenue</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">
            {formatCurrency(summary.totalOverageRevenue)}
          </p>
          <p className="text-xs text-secondary-500 mt-1">
            Avg: {formatCurrency(summary.averageOverageCost)}/user
          </p>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-secondary-500">AI Action Overages</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">
            {formatNumber(summary.totalAiOverages)}
          </p>
          <p className="text-xs text-secondary-500 mt-1">Extra actions beyond limits</p>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-secondary-500">Upgrade Candidates</span>
          </div>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{summary.upgradeCandidates}</p>
          <p className="text-xs text-secondary-500 mt-1">Would save by upgrading</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Plans</option>
          {planOptions.map(plan => (
            <option key={plan} value={plan}>{plan}</option>
          ))}
        </select>

        {selectedUsers.size > 0 && (
          <button
            onClick={handleNotifyUsers}
            disabled={isNotifying}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {isNotifying ? 'Sending...' : `Notify ${selectedUsers.size} Users`}
          </button>
        )}
      </div>

      {/* Overage Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 dark:bg-secondary-700/50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredAlerts.length && filteredAlerts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-secondary-300"
                  />
                </th>
                <th 
                  onClick={() => handleSort('email')}
                  className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                >
                  <div className="flex items-center gap-1">User {getSortIcon('email')}</div>
                </th>
                <th 
                  onClick={() => handleSort('planId')}
                  className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                >
                  <div className="flex items-center gap-1">Plan {getSortIcon('planId')}</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                  AI Actions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">
                  API Calls
                </th>
                <th 
                  onClick={() => handleSort('totalOverageCost')}
                  className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    Overage Cost {getSortIcon('totalOverageCost')}
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">
                  Severity
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-secondary-500">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No overage alerts found</p>
                    <p className="text-sm mt-1">All users are within their plan limits</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => (
                  <React.Fragment key={alert.userId}>
                    <tr className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(alert.userId)}
                          onChange={() => handleSelectUser(alert.userId)}
                          className="w-4 h-4 rounded border-secondary-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-secondary-900 dark:text-white">{alert.name}</p>
                          <p className="text-xs text-secondary-500">{alert.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          alert.planId === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                          alert.planId === 'PROFESSIONAL' ? 'bg-primary-100 text-primary-700' :
                          alert.planId === 'STARTER' ? 'bg-blue-100 text-blue-700' :
                          'bg-secondary-100 text-secondary-700'
                        }`}>
                          {alert.planId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm">
                            {formatNumber(alert.usage?.aiActions?.used || 0)} / {formatNumber(alert.usage?.aiActions?.limit || 0)}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-16 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(120, ((alert.usage?.aiActions?.used || 0) / (alert.usage?.aiActions?.limit || 1)) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-red-600">
                              +{alert.percentageOverAiLimit.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono text-sm">
                            {formatNumber(alert.usage?.apiCalls?.used || 0)} / {formatNumber(alert.usage?.apiCalls?.limit || 0)}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-16 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(120, ((alert.usage?.apiCalls?.used || 0) / (alert.usage?.apiCalls?.limit || 1)) * 100)}%` }} />
                            </div>
                            <span className="text-xs text-red-600">
                              +{alert.percentageOverApiLimit.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-red-600">{formatCurrency(alert.totalOverageCost)}</p>
                        <p className="text-xs text-secondary-500">
                          AI: {formatCurrency(alert.aiOverageCost)} | API: {formatCurrency(alert.apiOverageCost)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getSeverityBadge(alert.severity)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedUser(expandedUser === alert.userId ? null : alert.userId)}
                          className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                        >
                          {expandedUser === alert.userId ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedUser === alert.userId && (
                      <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Usage Details */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-secondary-900 dark:text-white">Usage Breakdown</h4>
                              <div className="bg-white dark:bg-secondary-800 rounded-lg p-3 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>AI Actions Used</span>
                                  <span className="font-medium">{formatNumber(alert.usage?.aiActions?.used || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>AI Actions Limit</span>
                                  <span>{formatNumber(alert.usage?.aiActions?.limit || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-red-600">
                                  <span>AI Overage</span>
                                  <span className="font-medium">+{formatNumber(alert.aiOverageAmount)}</span>
                                </div>
                                <hr className="border-secondary-200" />
                                <div className="flex justify-between text-xs">
                                  <span>API Calls Used</span>
                                  <span className="font-medium">{formatNumber(alert.usage?.apiCalls?.used || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>API Calls Limit</span>
                                  <span>{formatNumber(alert.usage?.apiCalls?.limit || 0)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-red-600">
                                  <span>API Overage</span>
                                  <span className="font-medium">+{formatNumber(alert.apiOverageAmount)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-secondary-900 dark:text-white">Cost Breakdown</h4>
                              <div className="bg-white dark:bg-secondary-800 rounded-lg p-3 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>AI Overage Rate</span>
                                  <span className="font-medium">{formatCurrency(alert.plan?.overagePricing?.aiAction || 0)}/action</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>AI Overage Cost</span>
                                  <span className="font-medium text-red-600">{formatCurrency(alert.aiOverageCost)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>API Overage Rate</span>
                                  <span className="font-medium">{formatCurrency(alert.plan?.overagePricing?.apiCall || 0)}/call</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span>API Overage Cost</span>
                                  <span className="font-medium text-red-600">{formatCurrency(alert.apiOverageCost)}</span>
                                </div>
                                <hr className="border-secondary-200" />
                                <div className="flex justify-between text-sm font-semibold">
                                  <span>Total Overage</span>
                                  <span className="text-red-600">{formatCurrency(alert.totalOverageCost)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Upgrade Recommendation */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-secondary-900 dark:text-white">Upgrade Recommendation</h4>
                              <div className="bg-white dark:bg-secondary-800 rounded-lg p-3">
                                <p className="text-xs text-secondary-600 mb-2">
                                  {alert.totalOverageCost > (alert.plan?.priceMonthly || 0) * 0.5
                                    ? `This user would save money by upgrading to a higher plan.`
                                    : `Current overage cost is manageable, but consider monitoring.`}
                                </p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span>Current Plan Cost</span>
                                    <span className="font-medium">{formatCurrency(alert.plan?.priceMonthly || 0)}/mo</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Est. Overage Cost</span>
                                    <span className="font-medium text-red-600">{formatCurrency(alert.totalOverageCost)}/mo</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>Total Est. Cost</span>
                                    <span>{formatCurrency((alert.plan?.priceMonthly || 0) + alert.totalOverageCost)}/mo</span>
                                  </div>
                                </div>
                              </div>
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

        {/* Footer Stats */}
        <div className="px-6 py-3 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-700/30 flex justify-between items-center text-xs text-secondary-500">
          <span>{filteredAlerts.length} users with overage • Est. revenue: {formatCurrency(summary.totalOverageRevenue)}</span>
          <span>Data refreshes hourly</span>
        </div>
      </div>
    </div>
  );
};
export default OverageAlerts;
