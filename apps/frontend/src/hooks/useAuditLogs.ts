// enterprise-ai-agent-platform/apps/frontend/src/hooks/useAuditLogs.ts
import { useState, useCallback, useEffect } from 'react';
import { adminService } from '../services/admin.service';
import { AuditLogEntry, PaginatedResponse } from '../types/admin.types';

interface UseAuditLogsOptions {
  autoFetch ? : boolean;
  pageSize ? : number;
}

interface UseAuditLogsReturn {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    userId ? : string;
    action ? : string;
    entityType ? : string;
    dateFrom ? : string;
    dateTo ? : string;
  };
  setFilters: (filters: Partial < UseAuditLogsReturn['filters'] > ) => void;
  setPage: (page: number) => void;
  refresh: () => Promise < void > ;
  exportLogs: (format ? : 'csv' | 'json') => Promise < void > ;
}

export const useAuditLogs = (options: UseAuditLogsOptions = {}): UseAuditLogsReturn => {
  const { autoFetch = true, pageSize = 50 } = options;
  
  const [logs, setLogs] = useState < AuditLogEntry[] > ([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const [filters, setFiltersState] = useState < UseAuditLogsReturn['filters'] > ({});
  
  const setFilters = useCallback((newFilters: Partial < UseAuditLogsReturn['filters'] > ) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);
  
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getAuditLogs({
        ...filters,
        page,
        limit: pageSize,
      });
      setLogs(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(message);
      console.error('Audit logs fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);
  
  const exportLogs = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const blob = await adminService.exportAuditLogs({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        format,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      throw err;
    }
  }, [filters.dateFrom, filters.dateTo]);
  
  useEffect(() => {
    if (autoFetch) {
      fetchLogs();
    }
  }, [autoFetch, fetchLogs]);
  
  return {
    logs,
    total,
    page,
    totalPages,
    isLoading,
    error,
    filters,
    setFilters,
    setPage,
    refresh: fetchLogs,
    exportLogs,
  };
};