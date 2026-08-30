// enterprise-ai-agent-platform/apps/api/src/types/admin.types.ts

// ============================================
// Enums
// ============================================

export enum PlanId {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum AuditAction {
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  USER_SUSPEND = 'user_suspend',
  USER_ACTIVATE = 'user_activate',
  PLAN_CHANGE = 'plan_change',
  ROLE_CHANGE = 'role_change',
  LOGIN = 'login',
  LOGOUT = 'logout',
  API_ACCESS = 'api_access',
  SETTINGS_UPDATE = 'settings_update',
  ANNOUNCEMENT_CREATE = 'announcement_create',
  ANNOUNCEMENT_UPDATE = 'announcement_update',
  ANNOUNCEMENT_DELETE = 'announcement_delete',
  OAUTH_LOGIN = 'oauth_login',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  OVERAGE_NOTIFICATION = 'overage_notification',
  BULK_ACTION = 'bulk_action',
  IMPERSONATION = 'impersonation',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum OverageAlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum UsageTrend {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown',
}

// ============================================
// User Types
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  planId: PlanId;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  isEmailVerified: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  totalExecutions: number;
  totalSpent: number;
  totalTokens: number;
  averageResponseTimeMs: number;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  aiActionsUsed?: number;
  aiActionsLimit?: number;
  apiCallsUsed?: number;
  apiCallsLimit?: number;
  overageCost?: number;
  currentOverageCost?: number;
  projectedOverageCost?: number;
  usageTrend?: UsageTrend;
  teamMemberCount?: number;
  teamMembers?: Array<{
    id: string;
    email: string;
    name: string;
  }>;
  metadata?: Record<string, any>;
  oauthConnections?: OAuthConnection[];
  planHistory?: PlanHistoryEntry[];
}

export interface OAuthConnection {
  provider: string;
  providerEmail: string;
  syncStatus: string;
  lastSyncedAt: string;
  createdAt: string;
}

export interface PlanHistoryEntry {
  id: string;
  userId: string;
  oldPlan: PlanId;
  newPlan: PlanId;
  changedBy: string;
  reason: string;
  stripeEventId?: string;
  metadata?: Record<string, any>;
  changedAt: string;
}

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  planId?: PlanId;
  role?: UserRole;
  status?: UserStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Pagination Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Platform Metrics Types
// ============================================

export interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byPlan: Array<{ plan: PlanId; count: number }>;
    byRole: Array<{ role: UserRole; count: number }>;
    byStatus: Array<{ status: UserStatus; count: number }>;
    retentionRate: number;
    churnRate: number;
  };
  executions: {
    total: number;
    last24h: number;
    byAgent: Array<{ agent: string; count: number; percentage: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  revenue: {
    total: number;
    mrr: number;
    arr: number;
    growth: number;
    averageRevenuePerUser: number;
  };
  usage: {
    totalExecutions: number;
    executionsLast24h: number;
    executionsByAgent: Record<string, number>;
  };
  system: {
    apiHealth: ServiceStatus;
    databaseHealth: ServiceStatus;
    redisHealth: ServiceStatus;
    queueHealth: ServiceStatus;
    uptime: number;
    version: string;
  };
}

// ============================================
// Revenue Types
// ============================================

export interface RevenueData {
  summary: RevenueSummary;
  byPlan: PlanRevenue[];
  trend: RevenueTrendPoint[];
  forecast: RevenueForecastPoint[];
  transactions: RevenueTransaction[];
}

export interface RevenueSummary {
  totalRevenue: number;
  mrr: number;
  arr: number;
  subscriptionRevenue: number;
  overageRevenue: number;
  averageRevenuePerUser: number;
  totalTransactions: number;
  successfulTransactions: number;
  growth: number;
  churnRate: number;
}

export interface PlanRevenue {
  planId: PlanId;
  planName: string;
  userCount: number;
  subscriptionRevenue: number;
  overageRevenue: number;
  totalRevenue: number;
  averageRevenuePerUser: number;
  growth: number;
  churnRate: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  netGrowth: number;
}

export interface RevenueTrendPoint {
  date: string;
  label: string;
  revenue: number;
  mrr: number;
  arr: number;
  overage: number;
  subscriptions: number;
}

export interface RevenueForecastPoint {
  date: string;
  forecast: number;
  optimistic: number;
  pessimistic: number;
  confidence: number;
}

export interface RevenueTransaction {
  id: string;
  userId: string;
  userName?: string;
  userEmail: string;
  planId: PlanId;
  amount: number;
  currency: string;
  type: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description?: string;
  invoiceId?: string;
  createdAt: string;
}

// ============================================
// Overage Alert Types
// ============================================

export interface OverageAlert {
  userId: string;
  email: string;
  name: string;
  planId: PlanId;
  planName: string;
  planPrice: number;
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
  };
  severity: OverageAlertSeverity;
  notifiedAt?: Date;
  lastActionAt?: Date;
  recommendation?: {
    suggestedPlan: PlanId;
    savingsWithUpgrade: number;
    upgradeUrl: string;
  };
  usageTrend: UsageTrend;
  consecutiveMonthsInOverage: number;
  totalSpentThisPeriod: number;
}

// ============================================
// Usage Heat Map Types
// ============================================

export interface UsageHeatMapData {
  cells: UsageHeatMapCell[][];
  rowLabels: string[];
  colLabels: string[];
  metadata: {
    metric: string;
    granularity: string;
    period: { start: string; end: string };
    totalValue: number;
    averageValue: number;
    peakValue: number;
    peakLocation: { row: number; col: number; label: string };
    dataPoints: number;
  };
  availableAgents: string[];
  availablePlans: string[];
}

export interface UsageHeatMapCell {
  value: number;
  label: string;
  rowIndex: number;
  colIndex: number;
  metadata?: Record<string, any>;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  changes: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

// ============================================
// Support Ticket Types
// ============================================

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string;
  assignedToEmail?: string;
  category?: string;
  messages?: TicketMessage[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  isAdmin: boolean;
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  search?: string;
  page: number;
  limit: number;
}

// ============================================
// Announcement Types
// ============================================

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// System Settings Types
// ============================================

export interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  defaultPlan: PlanId;
  trialDays: number;
  supportEmail: string;
  supportPhone?: string | null;
  companyName: string;
  companyLogo?: string | null;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    facebook?: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordExpiryDays: number | null;
    twoFactorRequired: boolean;
  };
  notifications: {
    usageWarningThreshold: number;
    criticalUsageThreshold: number;
    overageNotificationEnabled: boolean;
    dailyDigestEnabled: boolean;
    weeklyReportEnabled: boolean;
  };
}

// ============================================
// User Analytics Types
// ============================================

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  churnedThisMonth: number;
  averageExecutions: number;
  averageSpent: number;
  planDistribution: Record<string, number>;
  roleDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  overageUsers: number;
  totalOverageCost: number;
  topUsers: Array<{
    userId: string;
    email: string;
    name: string;
    executions: number;
    spent: number;
  }>;
  recentSignups: AdminUser[];
  recentActivity: Array<{
    userId: string;
    email: string;
    action: string;
    timestamp: string;
  }>;
}

// ============================================
// Service Health Types
// ============================================

export interface ServiceHealth {
  id: string;
  name: string;
  category: string;
  status: ServiceStatus;
  latency?: number;
  uptime?: number;
  version?: string;
  message?: string;
  lastChecked?: Date;
  metrics?: {
    cpu?: number;
    memory?: number;
    disk?: number;
    connections?: number;
    requestsPerSecond?: number;
    errorRate?: number;
    queueLength?: number;
  };
  endpoints?: string[];
  dependencies?: string[];
}

export interface SystemHealthResponse {
  apiHealth: ServiceStatus;
  databaseHealth: ServiceStatus;
  redisHealth: ServiceStatus;
  queueHealth: ServiceStatus;
  services?: ServiceHealth[];
  uptime: number;
  version: string;
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
    errorRate: number;
    averageLatency: number;
    queueLength: number;
  };
}

// ============================================
// Bulk Action Types
// ============================================

export interface BulkActionRequest {
  userIds: string[];
  action: 'activate' | 'suspend' | 'delete' | 'notify' | 'change_plan';
  data?: {
    planId?: PlanId;
    reason?: string;
    message?: string;
  };
}

export interface BulkActionResponse {
  success: boolean;
  results: Array<{
    userId: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// ============================================
// Export Types
// ============================================

export interface ExportRequest {
  format: 'csv' | 'json' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, any>;
  sections?: string[];
}

export interface ExportResponse {
  success: boolean;
  url?: string;
  fileId?: string;
  error?: string;
  expiresAt?: string;
}

// ============================================
// Usage Trend Types
// ============================================

export interface UsageTrendData {
  series: Array<{
    id: string;
    name: string;
    color: string;
    data: Array<{
      timestamp: string;
      value: number;
      label: string;
    }>;
  }>;
  thresholds: Array<{
    value: number;
    label: string;
    color: string;
    type: 'warning' | 'critical' | 'info';
  }>;
  forecast: {
    data: Array<{
      timestamp: string;
      value: number;
      label: string;
    }>;
    confidence: number;
  };
}

// ============================================
// Admin Notification Types
// ============================================

export interface AdminNotification {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  read: boolean;
  actionable: boolean;
  actionUrl?: string;
  actionLabel?: string;
  userId?: string;
  createdAt: string;
}