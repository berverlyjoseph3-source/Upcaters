// enterprise-ai-agent-platform/apps/frontend/src/services/admin.service.ts
import { apiClient } from '../api/client';
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
  AuditAction,
  OverageAlert,
  PlanRevenue,
  UsageHeatMapData,
  RevenueData,
  UserAnalytics,
  ServiceHealth,
  SystemMetrics,
  BulkActionRequest,
  BulkActionResponse,
  ExportOptions,
  ExportResult,
} from '../types/admin.types';

// ============================================
// Types
// ============================================

interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  isAdmin: boolean;
  message: string;
  attachments: string[];
  createdAt: string;
}

interface FetchOptions {
  page?: number;
  limit?: number;
  search?: string;
  planId?: string;
  role?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  format?: string;
  [key: string]: any;
}

interface RevenueMetricsResponse {
  revenue: Array<{ date: string; amount: number }>;
  total: number;
  growth: number;
}

// ============================================
// Admin Service Class
// ============================================

class AdminService {
  // ============================================
  // Users Management
  // ============================================

  /**
   * Get paginated list of users with filters
   */
  async getUsers(filters: UserFilters): Promise<PaginatedResponse<AdminUser>> {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get<PaginatedResponse<AdminUser>>(
      `/api/admin/users?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch users');
    }
    return response.data;
  }

  /**
   * Get a single user by ID with full details
   */
  async getUserById(userId: string): Promise<AdminUser> {
    const response = await apiClient.get<AdminUser>(`/api/admin/users/${userId}`);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch user');
    }
    return response.data;
  }

  /**
   * Update user details (plan, role, status, metadata)
   */
  async updateUser(userId: string, data: Partial<AdminUser>): Promise<AdminUser> {
    const response = await apiClient.put<AdminUser>(`/api/admin/users/${userId}`, data);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update user');
    }
    return response.data;
  }

  /**
   * Suspend a user account
   */
  async suspendUser(userId: string, reason: string = 'Manual suspension by admin'): Promise<void> {
    const response = await apiClient.post(`/api/admin/users/${userId}/suspend`, { reason });

    if (!response.success) {
      throw new Error(response.error || 'Failed to suspend user');
    }
  }

  /**
   * Activate a suspended user account
   */
  async activateUser(userId: string): Promise<void> {
    const response = await apiClient.post(`/api/admin/users/${userId}/activate`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to activate user');
    }
  }

  /**
   * Permanently delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    const response = await apiClient.delete(`/api/admin/users/${userId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete user');
    }
  }

  /**
   * Impersonate a user (returns JWT token for impersonation)
   */
  async impersonateUser(userId: string): Promise<string> {
    const response = await apiClient.post<{ token: string }>(
      `/api/admin/users/${userId}/impersonate`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to impersonate user');
    }
    return response.data.token;
  }

  /**
   * Export users as CSV/JSON
   */
  async exportUsers(filters?: Record<string, any>): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await apiClient.get<Blob>(
      `/api/admin/export/users?${params.toString()}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export users');
    }
    return response.data;
  }

  // ============================================
  // User Analytics
  // ============================================

  /**
   * Get user analytics and growth metrics
   */
  async getUserAnalytics(): Promise<UserAnalytics> {
    const response = await apiClient.get<UserAnalytics>('/api/admin/users/analytics');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch user analytics');
    }
    return response.data;
  }

  // ============================================
  // Overage Management
  // ============================================

  /**
   * Get all users currently in overage territory
   */
  async getOverageAlerts(filters?: {
    severity?: string;
    planId?: string;
    search?: string;
  }): Promise<OverageAlert[]> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.planId) params.append('planId', filters.planId);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get<OverageAlert[]>(
      `/api/admin/overages?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch overage alerts');
    }
    return response.data;
  }

  /**
   * Send overage notification to specific users
   */
  async sendOverageNotification(userIds: string[]): Promise<{
    success: boolean;
    notified: number;
    total: number;
    failed: number;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      notified: number;
      total: number;
      failed: number;
    }>('/api/admin/overages/notify', { userIds });

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send overage notifications');
    }
    return response.data;
  }

  /**
   * Export overage report as CSV
   */
  async exportOverageReport(filters?: {
    severity?: string;
    planId?: string;
    format?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.planId) params.append('planId', filters.planId);
    params.append('format', filters?.format || 'csv');

    const response = await apiClient.get<Blob>(
      `/api/admin/overages/export?${params.toString()}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export overage report');
    }
    return response.data;
  }

  // ============================================
  // Plan Distribution & Revenue
  // ============================================

  /**
   * Get plan distribution with revenue per plan
   */
  async getPlanDistribution(): Promise<PlanRevenue[]> {
    const response = await apiClient.get<PlanRevenue[]>(
      '/api/admin/plans/distribution'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch plan distribution');
    }
    return response.data;
  }

  /**
   * Export plan distribution as CSV
   */
  async exportPlanDistribution(): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      '/api/admin/plans/distribution/export',
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export plan distribution');
    }
    return response.data;
  }

  /**
   * Get comprehensive revenue data with trends and forecasts
   */
  async getRevenueData(options?: {
    period?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<RevenueData> {
    const params = new URLSearchParams();
    if (options?.period) params.append('period', options.period);
    if (options?.startDate) params.append('startDate', options.startDate.toISOString());
    if (options?.endDate) params.append('endDate', options.endDate.toISOString());

    const response = await apiClient.get<RevenueData>(
      `/api/admin/revenue?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch revenue data');
    }
    return response.data;
  }

  /**
   * Export revenue data as CSV
   */
  async exportRevenueData(options?: {
    period?: string;
    format?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.period) params.append('period', options.period);
    params.append('format', options?.format || 'csv');

    const response = await apiClient.get<Blob>(
      `/api/admin/revenue/export?${params.toString()}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export revenue data');
    }
    return response.data;
  }

  // ============================================
  // Usage Heat Map
  // ============================================

  /**
   * Get usage heat map data for visualization
   */
  async getUsageHeatMap(options: {
    metric?: 'executions' | 'tokens' | 'cost';
    granularity?: 'hour' | 'day' | 'week';
    agentType?: string;
    planId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UsageHeatMapData> {
    const params = new URLSearchParams();
    if (options.metric) params.append('metric', options.metric);
    if (options.granularity) params.append('granularity', options.granularity);
    if (options.agentType) params.append('agentType', options.agentType);
    if (options.planId) params.append('planId', options.planId);
    if (options.startDate) params.append('startDate', options.startDate.toISOString());
    if (options.endDate) params.append('endDate', options.endDate.toISOString());

    const response = await apiClient.get<UsageHeatMapData>(
      `/api/admin/usage/heatmap?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch usage heat map');
    }
    return response.data;
  }

  /**
   * Export usage heat map as CSV
   */
  async exportUsageHeatMap(options: {
    metric?: string;
    granularity?: string;
    format?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.metric) params.append('metric', options.metric);
    if (options.granularity) params.append('granularity', options.granularity);
    params.append('format', options?.format || 'csv');

    const response = await apiClient.get<Blob>(
      `/api/admin/usage/heatmap/export?${params.toString()}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export usage heat map');
    }
    return response.data;
  }

  // ============================================
  // Platform Metrics
  // ============================================

  /**
   * Get comprehensive platform metrics
   */
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const response = await apiClient.get<PlatformMetrics>(
      '/api/admin/metrics/platform'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch platform metrics');
    }
    return response.data;
  }

  /**
   * Get revenue metrics for a specific period
   */
  async getRevenueMetrics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<RevenueMetricsResponse> {
    const response = await apiClient.get<RevenueMetricsResponse>(
      `/api/admin/metrics/revenue?period=${period}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch revenue metrics');
    }
    return response.data;
  }

  /**
   * Export platform metrics as CSV/JSON
   */
  async exportPlatformMetrics(format: string = 'csv'): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/api/admin/metrics/export?format=${format}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export platform metrics');
    }
    return response.data;
  }

  // ============================================
  // Audit Logs
  // ============================================

  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AuditLogEntry>> {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.entityType) params.append('entityType', filters.entityType);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    params.append('page', String(filters.page || 1));
    params.append('limit', String(filters.limit || 50));

    const response = await apiClient.get<PaginatedResponse<AuditLogEntry>>(
      `/api/admin/audit-logs?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch audit logs');
    }
    return response.data;
  }

  /**
   * Export audit logs as CSV/JSON
   */
  async exportAuditLogs(filters?: {
    dateFrom?: string;
    dateTo?: string;
    format?: 'csv' | 'json';
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    params.append('format', filters?.format || 'csv');

    const response = await apiClient.get<Blob>(
      `/api/admin/audit-logs/export?${params.toString()}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export audit logs');
    }
    return response.data;
  }

  // ============================================
  // Support Tickets
  // ============================================

  /**
   * Get paginated support tickets with filters
   */
  async getTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SupportTicket>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.search) params.append('search', filters.search);
    params.append('page', String(filters?.page || 1));
    params.append('limit', String(filters?.limit || 20));

    const response = await apiClient.get<PaginatedResponse<SupportTicket>>(
      `/api/admin/tickets?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tickets');
    }
    return response.data;
  }

  /**
   * Get a single ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicket> {
    const response = await apiClient.get<SupportTicket>(
      `/api/admin/tickets/${ticketId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch ticket');
    }
    return response.data;
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus
  ): Promise<void> {
    const response = await apiClient.patch(
      `/api/admin/tickets/${ticketId}/status`,
      { status }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update ticket status');
    }
  }

  /**
   * Assign ticket to an admin
   */
  async assignTicket(ticketId: string, adminId: string): Promise<void> {
    const response = await apiClient.patch(
      `/api/admin/tickets/${ticketId}/assign`,
      { adminId }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to assign ticket');
    }
  }

  /**
   * Add a message to a ticket
   */
  async addTicketMessage(
    ticketId: string,
    message: string,
    isAdmin: boolean = true
  ): Promise<TicketMessage> {
    const response = await apiClient.post<TicketMessage>(
      `/api/admin/tickets/${ticketId}/messages`,
      { message, isAdmin }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add message');
    }
    return response.data;
  }

  /**
   * Export tickets as CSV
   */
  async exportTickets(filters?: {
    status?: string;
    priority?: string;
    format?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    params.append('format', filters?.format || 'csv');

    const response = await apiClient.get<Blob>(
      `/api/admin/tickets/export?${params.toString()}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export tickets');
    }
    return response.data;
  }

  // ============================================
  // Announcements
  // ============================================

  /**
   * Get all announcements
   */
  async getAnnouncements(activeOnly: boolean = false): Promise<Announcement[]> {
    const response = await apiClient.get<Announcement[]>(
      `/api/admin/announcements?activeOnly=${activeOnly}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch announcements');
    }
    return response.data;
  }

  /**
   * Create a new announcement
   */
  async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    const response = await apiClient.post<Announcement>(
      '/api/admin/announcements',
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create announcement');
    }
    return response.data;
  }

  /**
   * Update an existing announcement
   */
  async updateAnnouncement(
    id: string,
    data: Partial<Announcement>
  ): Promise<Announcement> {
    const response = await apiClient.put<Announcement>(
      `/api/admin/announcements/${id}`,
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update announcement');
    }
    return response.data;
  }

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(id: string): Promise<void> {
    const response = await apiClient.delete(`/api/admin/announcements/${id}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete announcement');
    }
  }

  // ============================================
  // System Settings
  // ============================================

  /**
   * Get current system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    const response = await apiClient.get<SystemSettings>(
      '/api/admin/settings'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch system settings');
    }
    return response.data;
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(
    settings: Partial<SystemSettings>
  ): Promise<SystemSettings> {
    const response = await apiClient.put<SystemSettings>(
      '/api/admin/settings',
      settings
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update system settings');
    }
    return response.data;
  }

  // ============================================
  // System Health
  // ============================================

  /**
   * Get system health status for all services
   */
  async getSystemHealth(): Promise<PlatformMetrics['system']> {
    const response = await apiClient.get<PlatformMetrics['system']>(
      '/api/admin/health'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch system health');
    }
    return response.data;
  }

  /**
   * Clear all system caches
   */
  async clearCache(): Promise<void> {
    const response = await apiClient.post('/api/admin/cache/clear');

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear cache');
    }
  }

  /**
   * Toggle maintenance mode
   */
  async toggleMaintenanceMode(
    enabled: boolean,
    message?: string
  ): Promise<void> {
    const response = await apiClient.post('/api/admin/maintenance', {
      enabled,
      message,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to toggle maintenance mode');
    }
  }

  // ============================================
  // Bulk Actions
  // ============================================

  /**
   * Execute bulk action on multiple users
   */
  async executeBulkAction(
    request: BulkActionRequest
  ): Promise<BulkActionResponse> {
    const response = await apiClient.post<BulkActionResponse>(
      '/api/admin/bulk-action',
      request
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Bulk action failed');
    }
    return response.data;
  }

  // ============================================
  // Export
  // ============================================

  /**
   * Export all data as a single archive
   */
  async exportAllData(format: string = 'csv'): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/api/admin/export/all?format=${format}`,
      { responseType: 'blob' } as any
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to export all data');
    }
    return response.data;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Build URL query parameters from filter object
   */
  private buildQueryParams(filters: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return params;
  }
}

// ============================================
// Export Singleton
// ============================================

export const adminService = new AdminService();

export default AdminService;
