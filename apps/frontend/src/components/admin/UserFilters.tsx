// enterprise-ai-agent-platform/apps/frontend/src/components/admin/UserFilters.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UserFilters as UserFiltersType, PlanId, UserRole, UserStatus } from '../../types/admin.types';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFilterChange: (filters: Partial < UserFiltersType > ) => void;
  onClose: () => void;
}

const planOptions: PlanId[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
const roleOptions: UserRole[] = ['USER', 'ADMIN', 'SUPPORT'];
const statusOptions: UserStatus[] = ['active', 'inactive', 'suspended', 'pending'];

export const UserFilters: React.FC < UserFiltersProps > = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState({
    planId: filters.planId || '',
    role: filters.role || '',
    status: filters.status || '',
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
  });
  
  const handleApply = () => {
    onFilterChange({
      planId: localFilters.planId || undefined,
      role: localFilters.role as UserRole | undefined,
      status: localFilters.status as UserStatus | undefined,
      dateFrom: localFilters.dateFrom || undefined,
      dateTo: localFilters.dateTo || undefined,
      page: 1,
    });
    onClose();
  };
  
  const handleReset = () => {
    setLocalFilters({
      planId: '',
      role: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
    onFilterChange({
      planId: undefined,
      role: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      page: 1,
    });
    onClose();
  };
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Filters</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Plan</label>
          <select
            value={localFilters.planId}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, planId: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            <option value="">All Plans</option>
            {planOptions.map(plan => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Role</label>
          <select
            value={localFilters.role}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            <option value="">All Roles</option>
            {roleOptions.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
          <select
            value={localFilters.status}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">From Date</label>
          <input
            type="date"
            value={localFilters.dateFrom}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">To Date</label>
          <input
            type="date"
            value={localFilters.dateTo}
            onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={handleReset} className="px-4 py-2 text-sm border rounded-lg hover:bg-secondary-50">
          Reset
        </button>
        <button onClick={handleApply} className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
          Apply Filters
        </button>
      </div>
    </div>
  );
};
export default UserFilters;
