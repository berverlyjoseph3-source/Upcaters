// enterprise-ai-agent-platform/apps/frontend/src/store/admin.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { adminService } from '../services/admin.service';
import {
  AdminUser,
  PlatformMetrics,
  AuditLogEntry,
  SupportTicket,
  Announcement,
  SystemSettings,
  UserFilters,
  PaginatedResponse,
  PlanId,
  UserRole,
  UserStatus,
  TicketStatus,
  TicketPriority,
  OverageAlert,
  PlanRevenue,
  UsageHeatMapData,
  RevenueData,
  UserAnalytics,
  ServiceHealth,
  SystemMetrics,
  UsageTrendSeries,
  UsageThreshold,
  UsageForecast,
  AdminNotification,
  BulkActionRequest,
  BulkActionResponse,
  ExportOptions,
  ExportResult,
  RevenuePeriod,
  Granularity,
  HeatMapMetric,
  ServiceCategory,
} from '../types/admin.types';

// ============================================
// Store State Interface
// ============================================

interface AdminState {
  // ============================================
  // Users
  // ============================================
  users: AdminUser[] | null;
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  usersTotalPages: number;
  usersLoading: boolean;
  usersError: string | null;
  selectedUsers: Set<string>;
  userFilters: UserFilters;
  userAnalytics: UserAnalytics | null;
  userAnalyticsLoading: boolean;
  userAnalyticsError: string | null;

  // ============================================
  // Platform Metrics
  // ============================================
  metrics: PlatformMetrics | null;
  metricsLoading: boolean;
  metricsError: string | null;

  // ============================================
  // Revenue
  // ============================================
  revenueData: RevenueData | null;
  revenueLoading: boolean;
  revenueError: string | null;
  revenuePeriod: RevenuePeriod;

  // ============================================
  // Plan Distribution
  // ============================================
  planDistribution: PlanRevenue[] | null;
  planDistributionLoading: boolean;
  planDistributionError: string | null;

  // ============================================
  // Overage Alerts
  // ============================================
  overageAlerts: OverageAlert[] | null;
  overageAlertsLoading: boolean;
  overageAlertsError: string | null;

  // ============================================
  // Usage Heat Map
  // ============================================
  usageHeatMap: UsageHeatMapData | null;
  usageHeatMapLoading: boolean;
  usageHeatMapError: string | null;

  // ============================================
  // Usage Trends
  // ============================================
  usageTrendSeries: UsageTrendSeries[] | null;
  usageTrendThresholds: UsageThreshold[] | null;
  usageForecast: UsageForecast | null;
  usageTrendLoading: boolean;
  usageTrendError: string | null;

  // ============================================
  // Audit Logs
  // ============================================
  auditLogs: PaginatedResponse<AuditLogEntry> | null;
  auditLogsLoading: boolean;
  auditLogsError: string | null;

  // ============================================
  // Support Tickets
  // ============================================
  tickets: PaginatedResponse<SupportTicket> | null;
  ticketsLoading: boolean;
  ticketsError: string | null;
  selectedTicket: SupportTicket | null;
  ticketFilters: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    page: number;
    limit: number;
  };

  // ============================================
  // Announcements
  // ============================================
  announcements: Announcement[] | null;
  announcementsLoading: boolean;
  announcementsError: string | null;

  // ============================================
  // System Settings
  // ============================================
  settings: SystemSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;

  // ============================================
  // System Health
  // ============================================
  systemHealth: {
    services: ServiceHealth[];
    metrics: SystemMetrics | null;
    apiHealth: string;
    databaseHealth: string;
    redisHealth: string;
    queueHealth: string;
    uptime: number;
    version: string;
  } | null;
  systemHealthLoading: boolean;
  systemHealthError: string | null;

  // ============================================
  // Notifications
  // ============================================
  adminNotifications: AdminNotification[];
  adminNotificationsUnread: number;
  adminNotificationsLoading: boolean;

  // ============================================
  // Bulk Actions
  // ============================================
  bulkActionInProgress: boolean;
  bulkActionResult: BulkActionResponse | null;
  bulkActionError: string | null;

  // ============================================
  // Export
  // ============================================
  exportInProgress: boolean;
  exportResult: ExportResult | null;
  exportError: string | null;

  // ============================================
  // General
  // ============================================
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // ============================================
  // Actions - Users
  // ============================================
  fetchUsers: (filters?: UserFilters) => Promise<void>;
  fetchUserAnalytics: () => Promise<void>;
  updateUser: (userId: string, data: Partial<AdminUser>) => Promise<void>;
  suspendUser: (userId: string, reason?: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  impersonateUser: (userId: string) => Promise<string>;
  exportUsers: (filters?: Record<string, any>) => Promise<Blob>;
  setSelectedUsers: (userIds: Set<string>) => void;
  setUserFilters: (filters: Partial<UserFilters>) => void;
  clearUserSelection: () => void;

  // ============================================
  // Actions - Platform Metrics
  // ============================================
  fetchPlatformMetrics: () => Promise<void>;
  exportPlatformMetrics: (format?: string) => Promise<Blob>;

  // ============================================
  // Actions - Revenue
  // ============================================
  fetchRevenueData: (options?: { period?: RevenuePeriod; startDate?: Date; endDate?: Date }) => Promise<void>;
  exportRevenueData: (options?: { period?: string; format?: string }) => Promise<Blob>;
  setRevenuePeriod: (period: RevenuePeriod) => void;

  // ============================================
  // Actions - Plan Distribution
  // ============================================
  fetchPlanDistribution: () => Promise<void>;
  exportPlanDistribution: () => Promise<Blob>;

  // ============================================
  // Actions - Overage Alerts
  // ============================================
  fetchOverageAlerts: (filters?: { severity?: string; planId?: string }) => Promise<void>;
  sendOverageNotification: (userIds: string[]) => Promise<void>;
  exportOverageReport: (filters?: { severity?: string; planId?: string; format?: string }) => Promise<Blob>;

  // ============================================
  // Actions - Usage Heat Map
  // ============================================
  fetchUsageHeatMap: (options: {
    metric?: HeatMapMetric;
    granularity?: Granularity;
    agentType?: string;
    planId?: string;
  }) => Promise<void>;
  exportUsageHeatMap: (options: { metric?: string; granularity?: string; format?: string }) => Promise<Blob>;

  // ============================================
  // Actions - Usage Trends
  // ============================================
  fetchUsageTrends: (timeRange?: string) => Promise<void>;

  // ============================================
  // Actions - Audit Logs
  // ============================================
  fetchAuditLogs: (filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  exportAuditLogs: (filters?: { dateFrom?: string; dateTo?: string; format?: string }) => Promise<Blob>;

  // ============================================
  // Actions - Support Tickets
  // ============================================
  fetchTickets: (filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchTicketById: (ticketId: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  assignTicket: (ticketId: string, adminId: string) => Promise<void>;
  addTicketMessage: (ticketId: string, message: string, isAdmin?: boolean) => Promise<void>;
  exportTickets: (filters?: { status?: string; priority?: string; format?: string }) => Promise<Blob>;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
  setTicketFilters: (filters: Partial<AdminState['ticketFilters']>) => void;

  // ============================================
  // Actions - Announcements
  // ============================================
  fetchAnnouncements: (activeOnly?: boolean) => Promise<void>;
  createAnnouncement: (data: Partial<Announcement>) => Promise<void>;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  // ============================================
  // Actions - System Settings
  // ============================================
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;

  // ============================================
  // Actions - System Health
  // ============================================
  fetchSystemHealth: () => Promise<void>;
  clearCache: () => Promise<void>;
  toggleMaintenance: (enabled: boolean, message?: string) => Promise<void>;

  // ============================================
  // Actions - Bulk Actions
  // ============================================
  executeBulkAction: (request: BulkActionRequest) => Promise<void>;
  clearBulkActionResult: () => void;

  // ============================================
  // Actions - Export
  // ============================================
  exportAllData: (format?: string) => Promise<Blob>;
  clearExportResult: () => void;

  // ============================================
  // Actions - Notifications
  // ============================================
  fetchAdminNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addAdminNotification: (notification: Omit<AdminNotification, 'id' | 'createdAt'>) => void;
  clearNotifications: () => void;

  // ============================================
  // General Actions
  // ============================================
  refresh: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  users: null,
  usersTotal: 0,
  usersPage: 1,
  usersLimit: 25,
  usersTotalPages: 0,
  usersLoading: false,
  usersError: null,
  selectedUsers: new Set<string>(),
  userFilters: {
    page: 1,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  },
  userAnalytics: null,
  userAnalyticsLoading: false,
  userAnalyticsError: null,

  metrics: null,
  metricsLoading: false,
  metricsError: null,

  revenueData: null,
  revenueLoading: false,
  revenueError: null,
  revenuePeriod: 'month' as RevenuePeriod,

  planDistribution: null,
  planDistributionLoading: false,
  planDistributionError: null,

  overageAlerts: null,
  overageAlertsLoading: false,
  overageAlertsError: null,

  usageHeatMap: null,
  usageHeatMapLoading: false,
  usageHeatMapError: null,

  usageTrendSeries: null,
  usageTrendThresholds: null,
  usageForecast: null,
  usageTrendLoading: false,
  usageTrendError: null,

  auditLogs: null,
  auditLogsLoading: false,
  auditLogsError: null,

  tickets: null,
  ticketsLoading: false,
  ticketsError: null,
  selectedTicket: null,
  ticketFilters: {
    page: 1,
    limit: 20,
  },

  announcements: null,
  announcementsLoading: false,
  announcementsError: null,

  settings: null,
  settingsLoading: false,
  settingsError: null,

  systemHealth: null,
  systemHealthLoading: false,
  systemHealthError: null,

  adminNotifications: [],
  adminNotificationsUnread: 0,
  adminNotificationsLoading: false,

  bulkActionInProgress: false,
  bulkActionResult: null,
  bulkActionError: null,

  exportInProgress: false,
  exportResult: null,
  exportError: null,

  isLoading: false,
  error: null,
  lastUpdated: null,
};

// ============================================
// Store
// ============================================

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ============================================
      // Users
      // ============================================

      fetchUsers: async (filters) => {
        const currentFilters = filters || get().userFilters;
        set({ usersLoading: true, usersError: null });
        try {
          const response = await adminService.getUsers(currentFilters);
          set({
            users: response.data,
            usersTotal: response.total,
            usersPage: response.page,
            usersLimit: response.limit,
            usersTotalPages: response.totalPages,
            usersLoading: false,
            lastUpdated: new Date(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch users';
          set({ usersLoading: false, usersError: message });
        }
      },

      fetchUserAnalytics: async () => {
        set({ userAnalyticsLoading: true, userAnalyticsError: null });
        try {
          const data = await adminService.getUserAnalytics();
          set({ userAnalytics: data, userAnalyticsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch user analytics';
          set({ userAnalyticsLoading: false, userAnalyticsError: message });
        }
      },

      updateUser: async (userId, data) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.updateUser(userId, data);
          await get().fetchUsers();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update user';
          set({ isLoading: false, error: message });
        }
      },

      suspendUser: async (userId, reason = 'Manual suspension by admin') => {
        set({ isLoading: true, error: null });
        try {
          await adminService.suspendUser(userId, reason);
          await get().fetchUsers();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to suspend user';
          set({ isLoading: false, error: message });
        }
      },

      activateUser: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.activateUser(userId);
          await get().fetchUsers();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to activate user';
          set({ isLoading: false, error: message });
        }
      },

      deleteUser: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.deleteUser(userId);
          await get().fetchUsers();
          const selected = new Set(get().selectedUsers);
          selected.delete(userId);
          set({ selectedUsers: selected });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete user';
          set({ isLoading: false, error: message });
        }
      },

      impersonateUser: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          const token = await adminService.impersonateUser(userId);
          set({ isLoading: false });
          return token;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to impersonate user';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      exportUsers: async (filters) => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportUsers(filters);
          downloadBlob(blob, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export users';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      setSelectedUsers: (userIds) => set({ selectedUsers: userIds }),
      setUserFilters: (filters) => set({ userFilters: { ...get().userFilters, ...filters, page: 1 } }),
      clearUserSelection: () => set({ selectedUsers: new Set() }),

      // ============================================
      // Platform Metrics
      // ============================================

      fetchPlatformMetrics: async () => {
        set({ metricsLoading: true, metricsError: null });
        try {
          const data = await adminService.getPlatformMetrics();
          set({ metrics: data, metricsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch platform metrics';
          set({ metricsLoading: false, metricsError: message });
        }
      },

      exportPlatformMetrics: async (format = 'csv') => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportPlatformMetrics(format);
          downloadBlob(blob, `platform_metrics_${new Date().toISOString().split('T')[0]}.${format}`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export metrics';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      // ============================================
      // Revenue
      // ============================================

      fetchRevenueData: async (options) => {
        set({ revenueLoading: true, revenueError: null });
        try {
          const data = await adminService.getRevenueData({
            period: options?.period || get().revenuePeriod,
            startDate: options?.startDate,
            endDate: options?.endDate,
          });
          set({ revenueData: data, revenueLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch revenue data';
          set({ revenueLoading: false, revenueError: message });
        }
      },

      exportRevenueData: async (options) => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportRevenueData(options);
          downloadBlob(blob, `revenue_export_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export revenue data';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      setRevenuePeriod: (period) => set({ revenuePeriod: period }),

      // ============================================
      // Plan Distribution
      // ============================================

      fetchPlanDistribution: async () => {
        set({ planDistributionLoading: true, planDistributionError: null });
        try {
          const data = await adminService.getPlanDistribution();
          set({ planDistribution: data, planDistributionLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch plan distribution';
          set({ planDistributionLoading: false, planDistributionError: message });
        }
      },

      exportPlanDistribution: async () => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportPlanDistribution();
          downloadBlob(blob, `plan_distribution_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export plan distribution';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      // ============================================
      // Overage Alerts
      // ============================================

      fetchOverageAlerts: async (filters) => {
        set({ overageAlertsLoading: true, overageAlertsError: null });
        try {
          const data = await adminService.getOverageAlerts(filters);
          set({ overageAlerts: data, overageAlertsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch overage alerts';
          set({ overageAlertsLoading: false, overageAlertsError: message });
        }
      },

      sendOverageNotification: async (userIds) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.sendOverageNotification(userIds);
          set({ isLoading: false });
          addAdminNotificationWrapper(set, {
            type: 'overage',
            severity: 'info',
            title: 'Overage Notifications Sent',
            message: `Successfully sent notifications to ${userIds.length} user(s).`,
            read: false,
            actionable: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send notifications';
          set({ isLoading: false, error: message });
        }
      },

      exportOverageReport: async (filters) => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportOverageReport(filters);
          downloadBlob(blob, `overage_report_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export overage report';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      // ============================================
      // Usage Heat Map
      // ============================================

      fetchUsageHeatMap: async (options) => {
        set({ usageHeatMapLoading: true, usageHeatMapError: null });
        try {
          // Cast options to the expected type expected by adminService
          const data = await adminService.getUsageHeatMap(options as any);
          set({ usageHeatMap: data, usageHeatMapLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch usage heat map';
          set({ usageHeatMapLoading: false, usageHeatMapError: message });
        }
      },

      exportUsageHeatMap: async (options) => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportUsageHeatMap(options);
          downloadBlob(blob, `usage_heatmap_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export usage heat map';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      // ============================================
      // Usage Trends
      // ============================================

      fetchUsageTrends: async (timeRange) => {
        set({ usageTrendLoading: true, usageTrendError: null });
        try {
          // This would fetch from the API — for now we rely on components to handle mock data
          set({ usageTrendLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch usage trends';
          set({ usageTrendLoading: false, usageTrendError: message });
        }
      },

      // ============================================
      // Audit Logs
      // ============================================

      fetchAuditLogs: async (filters) => {
        set({ auditLogsLoading: true, auditLogsError: null });
        try {
          const data = await adminService.getAuditLogs(filters || { page: 1, limit: 50 });
          set({ auditLogs: data, auditLogsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
          set({ auditLogsLoading: false, auditLogsError: message });
        }
      },

      exportAuditLogs: async (filters) => {
        set({ exportInProgress: true, exportError: null });
        try {
          // Cast to ensure format is narrowed to 'json' | 'csv'
          const exportFilters: { dateFrom?: string; dateTo?: string; format?: 'json' | 'csv' } = {
            ...(filters || {}),
            format: (filters?.format === 'json' || filters?.format === 'csv') ? filters.format as 'json' | 'csv' : undefined,
          };
          const blob = await adminService.exportAuditLogs(exportFilters);
          downloadBlob(blob, `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export audit logs';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      // ============================================
      // Support Tickets
      // ============================================

      fetchTickets: async (filters) => {
        set({ ticketsLoading: true, ticketsError: null });
        try {
          const data = await adminService.getTickets({
            ...get().ticketFilters,
            ...filters,
          });
          set({ tickets: data, ticketsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch tickets';
          set({ ticketsLoading: false, ticketsError: message });
        }
      },

      fetchTicketById: async (ticketId) => {
        set({ isLoading: true, error: null });
        try {
          const ticket = await adminService.getTicketById(ticketId);
          set({ selectedTicket: ticket, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch ticket';
          set({ isLoading: false, error: message });
        }
      },

      updateTicketStatus: async (ticketId, status) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.updateTicketStatus(ticketId, status);
          await get().fetchTickets();
          if (get().selectedTicket?.id === ticketId) {
            get().fetchTicketById(ticketId);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update ticket status';
          set({ isLoading: false, error: message });
        }
      },

      assignTicket: async (ticketId, adminId) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.assignTicket(ticketId, adminId);
          await get().fetchTickets();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to assign ticket';
          set({ isLoading: false, error: message });
        }
      },

      addTicketMessage: async (ticketId, message, isAdmin = true) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.addTicketMessage(ticketId, message, isAdmin);
          if (get().selectedTicket?.id === ticketId) {
            get().fetchTicketById(ticketId);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add message';
          set({ isLoading: false, error: message });
        }
      },

      exportTickets: async (filters) => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportTickets(filters);
          downloadBlob(blob, `tickets_export_${new Date().toISOString().split('T')[0]}.csv`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export tickets';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
      setTicketFilters: (filters) => set({ ticketFilters: { ...get().ticketFilters, ...filters } }),

      // ============================================
      // Announcements
      // ============================================

      fetchAnnouncements: async (activeOnly = false) => {
        set({ announcementsLoading: true, announcementsError: null });
        try {
          const data = await adminService.getAnnouncements(activeOnly);
          set({ announcements: data, announcementsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch announcements';
          set({ announcementsLoading: false, announcementsError: message });
        }
      },

      createAnnouncement: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.createAnnouncement(data);
          await get().fetchAnnouncements();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create announcement';
          set({ isLoading: false, error: message });
        }
      },

      updateAnnouncement: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.updateAnnouncement(id, data);
          await get().fetchAnnouncements();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update announcement';
          set({ isLoading: false, error: message });
        }
      },

      deleteAnnouncement: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.deleteAnnouncement(id);
          await get().fetchAnnouncements();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete announcement';
          set({ isLoading: false, error: message });
        }
      },

      // ============================================
      // System Settings
      // ============================================

      fetchSettings: async () => {
        set({ settingsLoading: true, settingsError: null });
        try {
          const data = await adminService.getSystemSettings();
          set({ settings: data, settingsLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch settings';
          set({ settingsLoading: false, settingsError: message });
        }
      },

      updateSettings: async (settings) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await adminService.updateSystemSettings(settings);
          set({ settings: updated, isLoading: false, lastUpdated: new Date() });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update settings';
          set({ isLoading: false, error: message });
        }
      },

      // ============================================
      // System Health
      // ============================================

      fetchSystemHealth: async () => {
        set({ systemHealthLoading: true, systemHealthError: null });
        try {
          const health = await adminService.getSystemHealth();
          set({
            systemHealth: {
              services: [],
              metrics: null,
              apiHealth: health.apiHealth,
              databaseHealth: health.databaseHealth,
              redisHealth: health.redisHealth,
              queueHealth: health.queueHealth,
              uptime: health.uptime || 0,
              version: health.version || '1.0.0',
            },
            systemHealthLoading: false,
            lastUpdated: new Date(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch system health';
          set({ systemHealthLoading: false, systemHealthError: message });
        }
      },

      clearCache: async () => {
        set({ isLoading: true, error: null });
        try {
          await adminService.clearCache();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to clear cache';
          set({ isLoading: false, error: message });
        }
      },

      toggleMaintenance: async (enabled, message) => {
        set({ isLoading: true, error: null });
        try {
          await adminService.toggleMaintenanceMode(enabled, message);
          await get().fetchSettings();
          set({ isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to toggle maintenance';
          set({ isLoading: false, error: message });
        }
      },

      // ============================================
      // Bulk Actions
      // ============================================

      executeBulkAction: async (request) => {
        set({ bulkActionInProgress: true, bulkActionError: null, bulkActionResult: null });
        try {
          const result: BulkActionResponse = {
            success: true,
            results: [],
            summary: { total: request.userIds.length, successful: 0, failed: 0, errors: [] },
          };

          for (const userId of request.userIds) {
            try {
              switch (request.action) {
                case 'activate':
                  await adminService.activateUser(userId);
                  break;
                case 'suspend':
                  await adminService.suspendUser(userId, request.data?.reason || 'Bulk action');
                  break;
                case 'delete':
                  await adminService.deleteUser(userId);
                  break;
                case 'notify':
                  // Handled separately
                  break;
              }
              result.results.push({ userId, success: true });
              result.summary.successful++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed';
              result.results.push({ userId, success: false, error: errorMessage });
              result.summary.failed++;
              result.summary.errors.push({ userId, error: errorMessage });
            }
          }

          if (request.action === 'notify') {
            await adminService.sendOverageNotification(request.userIds);
            result.summary.successful = request.userIds.length;
          }

          result.success = result.summary.failed === 0;
          set({ bulkActionInProgress: false, bulkActionResult: result });
          await get().fetchUsers();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Bulk action failed';
          set({ bulkActionInProgress: false, bulkActionError: message });
        }
      },

      clearBulkActionResult: () => set({ bulkActionResult: null, bulkActionError: null }),

      // ============================================
      // Export
      // ============================================

      exportAllData: async (format = 'csv') => {
        set({ exportInProgress: true, exportError: null });
        try {
          const blob = await adminService.exportAllData(format);
          downloadBlob(blob, `full_export_${new Date().toISOString().split('T')[0]}.${format}`);
          set({ exportInProgress: false });
          return blob;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export data';
          set({ exportInProgress: false, exportError: message });
          throw error;
        }
      },

      clearExportResult: () => set({ exportResult: null, exportError: null }),

      // ============================================
      // Notifications
      // ============================================

      fetchAdminNotifications: async () => {
        set({ adminNotificationsLoading: true });
        try {
          // API call would go here — for now keep existing state
          set({ adminNotificationsLoading: false });
        } catch (error) {
          set({ adminNotificationsLoading: false });
        }
      },

      markNotificationRead: (id) => {
        const notifications = get().adminNotifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        );
        const unread = notifications.filter(n => !n.read).length;
        set({ adminNotifications: notifications, adminNotificationsUnread: unread });
      },

      markAllNotificationsRead: () => {
        const notifications = get().adminNotifications.map(n => ({ ...n, read: true }));
        set({ adminNotifications: notifications, adminNotificationsUnread: 0 });
      },

      addAdminNotification: (notification) => {
        addAdminNotificationWrapper(set, notification);
      },

      clearNotifications: () => {
        set({ adminNotifications: [], adminNotificationsUnread: 0 });
      },

      // ============================================
      // General
      // ============================================

      refresh: async () => {
        const { fetchPlatformMetrics, fetchUsers } = get();
        await Promise.all([
          fetchPlatformMetrics(),
          fetchUsers(),
        ]);
      },

      clearError: () => set({ error: null }),

      reset: () => {
        set({
          ...initialState,
          selectedUsers: new Set(),
        });
      },
    }),
    { name: 'admin-store' }
  )
);

// ============================================
// Helper Functions
// ============================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addAdminNotificationWrapper(
  set: (partial: Partial<AdminState> | ((state: AdminState) => Partial<AdminState>)) => void,
  notification: Omit<AdminNotification, 'id' | 'createdAt'>
): void {
  const newNotification: AdminNotification = {
    ...notification,
    id: `admin_note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  set((state: AdminState) => ({
    adminNotifications: [newNotification, ...state.adminNotifications].slice(0, 50),
    adminNotificationsUnread: state.adminNotificationsUnread + 1,
  }) as Partial<AdminState>);
}
