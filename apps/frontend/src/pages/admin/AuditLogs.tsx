// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/AuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, AlertCircle, User, Shield, Settings, CreditCard, Users, FileText, Clock } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { AuditLogEntry, AuditAction } from '../../types/admin.types';

const actionIcons: Record < AuditAction, React.ReactNode > = {
  user_create: <User className="h-3 w-3" />,
  user_update: <User className="h-3 w-3" />,
  user_delete: <User className="h-3 w-3" />,
  user_suspend: <User className="h-3 w-3" />,
  user_activate: <User className="h-3 w-3" />,
  plan_change: <CreditCard className="h-3 w-3" />,
  role_change: <Shield className="h-3 w-3" />,
  login: <User className="h-3 w-3" />,
  logout: <User className="h-3 w-3" />,
  api_access: <Settings className="h-3 w-3" />,
  settings_update: <Settings className="h-3 w-3" />,
  announcement_create: <FileText className="h-3 w-3" />,
  announcement_update: <FileText className="h-3 w-3" />,
  announcement_delete: <FileText className="h-3 w-3" />,
};

const actionColors: Record < AuditAction, string > = {
  user_create: 'bg-green-100 text-green-700',
  user_update: 'bg-blue-100 text-blue-700',
  user_delete: 'bg-red-100 text-red-700',
  user_suspend: 'bg-yellow-100 text-yellow-700',
  user_activate: 'bg-green-100 text-green-700',
  plan_change: 'bg-purple-100 text-purple-700',
  role_change: 'bg-orange-100 text-orange-700',
  login: 'bg-blue-100 text-blue-700',
  logout: 'bg-gray-100 text-gray-700',
  api_access: 'bg-indigo-100 text-indigo-700',
  settings_update: 'bg-secondary-100 text-secondary-700',
  announcement_create: 'bg-teal-100 text-teal-700',
  announcement_update: 'bg-teal-100 text-teal-700',
  announcement_delete: 'bg-red-100 text-red-700',
};

export const AuditLogs: React.FC = () => {
  const { auditLogs, auditLogsLoading, auditLogsError, fetchAuditLogs } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState < string > ('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    fetchAuditLogs({
      search: debouncedSearch || undefined,
      action: actionFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: currentPage,
      limit: 50,
    });
  }, [debouncedSearch, actionFilter, dateFrom, dateTo, currentPage, fetchAuditLogs]);
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };
  
  const formatAction = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const handleExport = async () => {
    const response = await fetch(`/api/admin/audit-logs/export?${new URLSearchParams({
      dateFrom: dateFrom,
      dateTo: dateTo,
      format: 'csv',
    }).toString()}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleRefresh = () => {
    fetchAuditLogs({
      search: debouncedSearch || undefined,
      action: actionFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: currentPage,
      limit: 50,
    });
  };
  
  if (auditLogsLoading && !auditLogs) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search by user or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="">All Actions</option>
          <option value="user_create">User Created</option>
          <option value="user_update">User Updated</option>
          <option value="user_delete">User Deleted</option>
          <option value="user_suspend">User Suspended</option>
          <option value="user_activate">User Activated</option>
          <option value="plan_change">Plan Changed</option>
          <option value="role_change">Role Changed</option>
          <option value="login">Login</option>
          <option value="settings_update">Settings Updated</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        />
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 rounded-lg hover:bg-secondary-50"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 hover:bg-secondary-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Audit Logs Table */}
      {auditLogsError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-300">{auditLogsError}</p>
          <button onClick={handleRefresh} className="mt-2 text-sm text-primary-600 hover:underline">Try again</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {auditLogs?.data.map((log: AuditLogEntry) => (
                  <tr key={log.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                    <td className="px-4 py-3 text-secondary-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-white">{log.userEmail}</div>
                        <div className="text-xs text-secondary-500">{log.userId}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action as AuditAction] || 'bg-secondary-100'}`}>
                        {actionIcons[log.action as AuditAction]}
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-600">
                      {log.entityType}: {log.entityId?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-secondary-500 font-mono text-xs">{log.ipAddress || '—'}</td>
                    <td className="px-4 py-3">
                      {log.oldValues || log.newValues ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-primary-600">View changes</summary>
                          <div className="mt-2 text-xs space-y-1">
                            {log.oldValues && Object.entries(log.oldValues).map(([key, value]) => (
                              <div key={key} className="text-secondary-500">
                                <span className="font-medium">{key}:</span> {String(value)} → {log.newValues?.[key] !== undefined ? String(log.newValues[key]) : 'deleted'}
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <span className="text-secondary-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {auditLogs?.data.length === 0 && (
            <div className="text-center py-8 text-secondary-500">No audit logs found</div>
          )}

          {/* Pagination */}
          {auditLogs && auditLogs.totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-secondary-200">
              <p className="text-sm text-secondary-500">
                Showing {((auditLogs.page - 1) * auditLogs.limit) + 1} to {Math.min(auditLogs.page * auditLogs.limit, auditLogs.total)} of {auditLogs.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg border disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">Page {currentPage} of {auditLogs.totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(auditLogs.totalPages, p + 1))}
                  disabled={currentPage === auditLogs.totalPages}
                  className="px-3 py-1 rounded-lg border disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AuditLogs;
