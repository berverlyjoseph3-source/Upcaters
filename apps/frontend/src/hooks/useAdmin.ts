// enterprise-ai-agent-platform/apps/frontend/src/hooks/useAdmin.ts
import { useCallback, useEffect, useRef } from 'react';
import { useAdminStore } from '../store/admin.store';
import { adminService } from '../services/admin.service';
import { realtimeService } from '../services/realtime.service';
import {
  AdminUser,
  UserFilters,
  PlanId,
  TicketStatus,
  TicketPriority,
  SupportTicket,
  Announcement,
  SystemSettings,
  OverageAlert,
  RevenuePeriod,
  HeatMapMetric,
  Granularity,
  BulkActionRequest,
} from '../types/admin.types';

// ============================================
// useAdmin Hook
// ============================================

export function useAdmin() {
  const store = useAdminStore();
  const realtimeCleanup = useRef<(() => void) | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Initialize real-time subscriptions
  // ============================================

  useEffect(() => {
    const unsubOverage = realtimeService.onAgentUpdate((data) => {
      if (data.agentType === 'admin' && data.status === 'overage_update') {
        store.fetchOverageAlerts();
      }
    });

    const unsubHealth = realtimeService.onAgentUpdate((data) => {
      if (data.agentType === 'system' && data.status === 'health_update') {
        store.fetchSystemHealth();
      }
    });

    realtimeCleanup.current = () => {
      unsubOverage();
      unsubHealth();
    };

    return () => {
      realtimeCleanup.current?.();
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [store]);

  // ============================================
  // Auto-refresh for critical data
  // ============================================

  const startAutoRefresh = useCallback((intervalMs: number = 60000) => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    autoRefreshInterval.current = setInterval(() => {
      store.fetchPlatformMetrics();
      store.fetchOverageAlerts();
    }, intervalMs);
  }, [store]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // ============================================
  // Return consolidated API
  // ============================================

  return {
    // ============================================
    // State
    // ============================================

    // Users
    users: store.users,
    usersTotal: store.usersTotal,
    usersPage: store.usersPage,
    usersLimit: store.usersLimit,
    usersTotalPages: store.usersTotalPages,
    usersLoading: store.usersLoading,
    usersError: store.usersError,
    selectedUsers: store.selectedUsers,
    userFilters: store.userFilters,
    userAnalytics: store.userAnalytics,
    userAnalyticsLoading: store.userAnalyticsLoading,
    userAnalyticsError: store.userAnalyticsError,

    // Platform Metrics
    metrics: store.metrics,
    metricsLoading: store.metricsLoading,
    metricsError: store.metricsError,

    // Revenue
    revenueData: store.revenueData,
    revenueLoading: store.revenueLoading,
    revenueError: store.revenueError,
    revenuePeriod: store.revenuePeriod,

    // Plan Distribution
    planDistribution: store.planDistribution,
    planDistributionLoading: store.planDistributionLoading,
    planDistributionError: store.planDistributionError,

    // Overage Alerts
    overageAlerts: store.overageAlerts,
    overageAlertsLoading: store.overageAlertsLoading,
    overageAlertsError: store.overageAlertsError,

    // Usage Heat Map
    usageHeatMap: store.usageHeatMap,
    usageHeatMapLoading: store.usageHeatMapLoading,
    usageHeatMapError: store.usageHeatMapError,

    // Usage Trends
    usageTrendSeries: store.usageTrendSeries,
    usageTrendThresholds: store.usageTrendThresholds,
    usageForecast: store.usageForecast,
    usageTrendLoading: store.usageTrendLoading,
    usageTrendError: store.usageTrendError,

    // Audit Logs
    auditLogs: store.auditLogs,
    auditLogsLoading: store.auditLogsLoading,
    auditLogsError: store.auditLogsError,

    // Support Tickets
    tickets: store.tickets,
    ticketsLoading: store.ticketsLoading,
    ticketsError: store.ticketsError,
    selectedTicket: store.selectedTicket,
    ticketFilters: store.ticketFilters,

    // Announcements
    announcements: store.announcements,
    announcementsLoading: store.announcementsLoading,
    announcementsError: store.announcementsError,

    // System Settings
    settings: store.settings,
    settingsLoading: store.settingsLoading,
    settingsError: store.settingsError,

    // System Health
    systemHealth: store.systemHealth,
    systemHealthLoading: store.systemHealthLoading,
    systemHealthError: store.systemHealthError,

    // Notifications
    adminNotifications: store.adminNotifications,
    adminNotificationsUnread: store.adminNotificationsUnread,
    adminNotificationsLoading: store.adminNotificationsLoading,

    // Bulk Actions
    bulkActionInProgress: store.bulkActionInProgress,
    bulkActionResult: store.bulkActionResult,
    bulkActionError: store.bulkActionError,

    // Export
    exportInProgress: store.exportInProgress,
    exportResult: store.exportResult,
    exportError: store.exportError,

    // General
    isLoading: store.isLoading,
    error: store.error,
    lastUpdated: store.lastUpdated,

    // ============================================
    // Actions - Users
    // ============================================

    fetchUsers: store.fetchUsers,
    fetchUserAnalytics: store.fetchUserAnalytics,
    updateUser: store.updateUser,
    suspendUser: store.suspendUser,
    activateUser: store.activateUser,
    deleteUser: store.deleteUser,
    impersonateUser: store.impersonateUser,
    exportUsers: store.exportUsers,
    setSelectedUsers: store.setSelectedUsers,
    setUserFilters: store.setUserFilters,
    clearUserSelection: store.clearUserSelection,

    // ============================================
    // Actions - Platform Metrics
    // ============================================

    fetchPlatformMetrics: store.fetchPlatformMetrics,
    exportPlatformMetrics: store.exportPlatformMetrics,

    // ============================================
    // Actions - Revenue
    // ============================================

    fetchRevenueData: store.fetchRevenueData,
    exportRevenueData: store.exportRevenueData,
    setRevenuePeriod: store.setRevenuePeriod,

    // ============================================
    // Actions - Plan Distribution
    // ============================================

    fetchPlanDistribution: store.fetchPlanDistribution,
    exportPlanDistribution: store.exportPlanDistribution,

    // ============================================
    // Actions - Overage Alerts
    // ============================================

    fetchOverageAlerts: store.fetchOverageAlerts,
    sendOverageNotification: store.sendOverageNotification,
    exportOverageReport: store.exportOverageReport,

    // ============================================
    // Actions - Usage Heat Map
    // ============================================

    fetchUsageHeatMap: store.fetchUsageHeatMap,
    exportUsageHeatMap: store.exportUsageHeatMap,

    // ============================================
    // Actions - Usage Trends
    // ============================================

    fetchUsageTrends: store.fetchUsageTrends,

    // ============================================
    // Actions - Audit Logs
    // ============================================

    fetchAuditLogs: store.fetchAuditLogs,
    exportAuditLogs: store.exportAuditLogs,

    // ============================================
    // Actions - Support Tickets
    // ============================================

    fetchTickets: store.fetchTickets,
    fetchTicketById: store.fetchTicketById,
    updateTicketStatus: store.updateTicketStatus,
    assignTicket: store.assignTicket,
    addTicketMessage: store.addTicketMessage,
    exportTickets: store.exportTickets,
    setSelectedTicket: store.setSelectedTicket,
    setTicketFilters: store.setTicketFilters,

    // ============================================
    // Actions - Announcements
    // ============================================

    fetchAnnouncements: store.fetchAnnouncements,
    createAnnouncement: store.createAnnouncement,
    updateAnnouncement: store.updateAnnouncement,
    deleteAnnouncement: store.deleteAnnouncement,

    // ============================================
    // Actions - System Settings
    // ============================================

    fetchSettings: store.fetchSettings,
    updateSettings: store.updateSettings,

    // ============================================
    // Actions - System Health
    // ============================================

    fetchSystemHealth: store.fetchSystemHealth,
    clearCache: store.clearCache,
    toggleMaintenance: store.toggleMaintenance,

    // ============================================
    // Actions - Bulk Actions
    // ============================================

    executeBulkAction: store.executeBulkAction,
    clearBulkActionResult: store.clearBulkActionResult,

    // ============================================
    // Actions - Export
    // ============================================

    exportAllData: store.exportAllData,
    clearExportResult: store.clearExportResult,

    // ============================================
    // Actions - Notifications
    // ============================================

    fetchAdminNotifications: store.fetchAdminNotifications,
    markNotificationRead: store.markNotificationRead,
    markAllNotificationsRead: store.markAllNotificationsRead,
    addAdminNotification: store.addAdminNotification,
    clearNotifications: store.clearNotifications,

    // ============================================
    // General Actions
    // ============================================

    refresh: store.refresh,
    clearError: store.clearError,
    reset: store.reset,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

// ============================================
// Export hook
// ============================================

export default useAdmin;