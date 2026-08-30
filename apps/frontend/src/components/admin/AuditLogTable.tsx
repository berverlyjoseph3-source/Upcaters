// enterprise-ai-agent-platform/apps/frontend/src/components/admin/AuditLogTable.tsx
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Clock, User, Shield, CreditCard, Settings, FileText, Users, AlertCircle, Search, Filter } from 'lucide-react';
import { AuditLogEntry, AuditAction } from '../../types/admin.types';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  isLoading ? : boolean;
  onSort ? : (column: string) => void;
  sortBy ? : string;
  sortOrder ? : 'asc' | 'desc';
  onFilterChange ? : (filters: { action ? : string;entityType ? : string }) => void;
}

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
  user_create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  user_update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  user_delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  user_suspend: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  user_activate: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  plan_change: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  role_change: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  api_access: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  settings_update: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-400',
  announcement_create: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  announcement_update: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  announcement_delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const formatAction = (action: string): string => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const AuditLogTable: React.FC < AuditLogTableProps > = ({
  logs,
  isLoading = false,
  onSort,
  sortBy,
  sortOrder,
  onFilterChange,
}) => {
  const [expandedRow, setExpandedRow] = useState < string | null > (null);
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState < string > ('');
  const [entityFilter, setEntityFilter] = useState < string > ('');
  
  const handleFilterApply = () => {
    onFilterChange?.({
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
    });
    setShowFilters(false);
  };
  
  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };
  
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-secondary-100 dark:bg-secondary-700"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-secondary-50 dark:bg-secondary-800 border-t border-secondary-200"></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center">
        <Search className="h-12 w-12 mx-auto text-secondary-400 mb-3" />
        <p className="text-secondary-500">No audit logs found</p>
        <p className="text-sm text-secondary-400">Try adjusting your filters</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      {/* Filter Bar */}
      <div className="px-4 py-2 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-sm text-secondary-600 hover:text-secondary-900"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
        <span className="text-xs text-secondary-400">{logs.length} records</span>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-700/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-2 py-1 text-sm rounded border border-secondary-300"
              >
                <option value="">All Actions</option>
                {Object.keys(actionColors).map(action => (
                  <option key={action} value={action}>{formatAction(action)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Entity Type</label>
              <input
                type="text"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                placeholder="user, plan, settings..."
                className="w-full px-2 py-1 text-sm rounded border border-secondary-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setActionFilter('');
                setEntityFilter('');
                onFilterChange?.({});
                setShowFilters(false);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-white"
            >
              Reset
            </button>
            <button
              onClick={handleFilterApply}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              <th onClick={() => onSort?.('createdAt')} className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100">
                <div className="flex items-center gap-1">Timestamp <SortIcon column="createdAt" /></div>
              </th>
              <th onClick={() => onSort?.('userEmail')} className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100">
                <div className="flex items-center gap-1">User <SortIcon column="userEmail" /></div>
              </th>
              <th onClick={() => onSort?.('action')} className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100">
                <div className="flex items-center gap-1">Action <SortIcon column="action" /></div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">IP Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {logs.map(log => (
              <React.Fragment key={log.id}>
                <tr className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                  <td className="px-4 py-3 text-secondary-500 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-secondary-900 dark:text-white">{log.userEmail}</div>
                      <div className="text-xs text-secondary-500">{log.userId.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action as AuditAction] || 'bg-secondary-100'}`}>
                      {actionIcons[log.action as AuditAction]}
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {log.entityType}: <span className="font-mono text-xs">{log.entityId?.slice(0, 8)}...</span>
                  </td>
                  <td className="px-4 py-3 text-secondary-500 font-mono text-xs">{log.ipAddress || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      {expandedRow === log.id ? 'Hide details' : 'View changes'}
                    </button>
                  </td>
                </tr>
                {expandedRow === log.id && (log.oldValues || log.newValues) && (
                  <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        <p className="font-medium text-secondary-700 mb-1">Change Details:</p>
                        {log.oldValues && Object.entries(log.oldValues).map(([key, value]) => (
                          <div key={key} className="text-secondary-600">
                            <span className="font-medium">{key}:</span>{' '}
                            <span className="line-through text-red-600">{String(value)}</span>{' '}
                            →{' '}
                            <span className="text-green-600">{log.newValues?.[key] !== undefined ? String(log.newValues[key]) : 'deleted'}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default AuditLogTable;
