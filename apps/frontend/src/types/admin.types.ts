// enterprise-ai-agent-platform/apps/frontend/src/types/admin.types.ts

// ============================================
// Enums & Constants
// ============================================

export type PlanId = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
export type UserRole = 'USER' | 'ADMIN' | 'SUPPORT';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type AuditAction =
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_suspend'
  | 'user_activate'
  | 'plan_change'
  | 'role_change'
  | 'login'
  | 'logout'
  | 'api_access'
  | 'settings_update'
  | 'announcement_create'
  | 'announcement_update'
  | 'announcement_delete'
  | 'oauth_login'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'subscription_updated';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type OverageAlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type UsageTrend = 'increasing' | 'decreasing' | 'stable';
export type RevenuePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type RevenueMetric = 'mrr' | 'arr' | 'total' | 'overage' | 'subscriptions';
export type ChartView = 'line' | 'bar' | 'area' | 'pie' | 'stacked' | 'donut';
export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
export type Granularity = 'hour' | 'day' | 'week' | 'month';
export type HeatMapMetric = 'executions' | 'tokens' | 'cost';
export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'maintenance' | 'unknown';
export type ServiceCategory = 'core' | 'database' | 'external' | 'infrastructure';

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
  totalExecutions?: number;
  totalSpent?: number;
  totalTokens?: number;
  averageResponseTimeMs?: number;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Usage tracking
  aiActionsUsed?: number;
  aiActionsLimit?: number;
  apiCallsUsed?: number;
  apiCallsLimit?: number;
  overageCost?: number;
  currentOverageCost?: number;
  projectedOverageCost?: number;
  usageTrend?: UsageTrend;
  // Teams
  teamMemberCount?: number;
  teamMembers?: Array<{
    id: string;
    email: string;
    name: string;
  }>;
  // Metadata
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
  oldPlan: PlanId;
  newPlan: PlanId;
  changedBy: string;
  reason: string;
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
  hasMore?: boolean;
  nextPage?: number;
  previousPage?: number;
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
    byCountry?: Array<{ country: string; count: number }>;
    retentionRate?: number;
    churnRate?: number;
    growthRate?: number;
  };
  executions: {
    total: number;
    last24h: number;
    last7d: number;
    last30d: number;
    byAgent: Array<{ agent: string; count: number; percentage: number }>;
    byStatus: Array<{ status: string; count: number }>;
    averagePerUser: number;
    averageDurationMs: number;
  };
  revenue: {
    total: number;
    mrr: number;
    arr: number;
    growth: number;
    averageRevenuePerUser: number;
    byPlan: Array<{ plan: PlanId; amount: number; percentage: number }>;
    overageRevenue: number;
    subscriptionRevenue: number;
    projectedMRR: number;
    projectedARR: number;
  };
  usage: {
    totalExecutions: number;
    executionsLast24h: number;
    executionsByAgent: Record<string, number>;
    totalTokens: number;
    totalCost: number;
    averageCostPerExecution: number;
    peakDayExecutions: number;
    peakDayDate: string;
  };
  system: {
    apiHealth: ServiceStatus;
    databaseHealth: ServiceStatus;
    redisHealth: ServiceStatus;
    queueHealth: ServiceStatus;
    uptime: number;
    version: string;
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    activeConnections?: number;
  };
}

// ============================================
// Usage Heat Map Types
// ============================================

export interface UsageHeatMapData {
  cells: UsageHeatMapCell[][];
  rowLabels: string[];
  colLabels: string[];
  metadata: {
    metric: HeatMapMetric;
    granularity: Granularity;
    period: {
      start: string;
      end: string;
    };
    totalValue: number;
    averageValue: number;
    peakValue: number;
    peakLocation: {
      row: number;
      col: number;
      label: string;
    };
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
  metadata?: {
    agent?: string;
    plan?: string;
    percentage?: number;
    trend?: UsageTrend;
    changePercent?: number;
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
  metrics: {
    mrr: number;
    arr: number;
    overageRevenue: number;
    overagePercentage: number;
    averageRevenuePerUser: number;
    totalTransactions: number;
    successfulTransactions: number;
    successRate: number;
    growth: number;
    churnRate: number;
    newMrr: number;
    expansionMrr: number;
    contractionMrr: number;
    churnedMrr: number;
    netNewMrr: number;
  };
}

export interface RevenueSummary {
  totalRevenue: number;
  mrr: number;
  arr: number;
  subscriptionRevenue: number;
  overageRevenue: number;
  averageRevenuePerUser: number;
  totalTransactions: number;
  successfulTransactions?: number;
  growth: number;
  churnRate: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  netNewMrr: number;
}

export interface PlanRevenue {
  planId: PlanId;
  planName: string;
  userCount: number;
  subscriptionRevenue: number; // in cents
  overageRevenue: number; // in cents
  totalRevenue: number; // in cents
  averageRevenuePerUser: number; // in cents
  growth: number; // percentage
  churnRate: number; // percentage
  newSubscriptions: number;
  cancelledSubscriptions: number;
  netGrowth: number;
  mrr: number; // in cents
  arr: number; // in cents
  percentageOfTotal: number;
  color?: string;
}

export interface RevenueTrendPoint {
  date: string;
  label: string;
  revenue: number;
  mrr?: number;
  arr?: number;
  overage?: number;
  subscriptions?: number;
  upgrades?: number;
  downgrades?: number;
  newCustomers?: number;
  churnedCustomers?: number;
  netRevenue?: number;
}

export interface RevenueForecastPoint {
  date: string;
  label: string;
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
  amount: number; // in cents
  currency: string;
  type: 'subscription' | 'overage' | 'refund' | 'credit' | 'proration' | 'upgrade' | 'downgrade';
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  description?: string;
  invoiceId?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// ============================================
// Overage Alert Types
// ============================================

export interface OverageAlert {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  planId: PlanId;
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
  severity: OverageAlertSeverity;
  notifiedAt?: Date;
  lastActionAt?: Date;
  recommendation?: {
    suggestedPlan: PlanId;
    suggestedPlanName: string;
    savingsWithUpgrade: number;
    upgradeUrl: string;
    potentialNewLimit: {
      aiActions: number;
      apiCalls: number;
    };
  };
  usageTrend: UsageTrend;
  consecutiveMonthsInOverage: number;
  totalSpentThisPeriod: number;
  plan?: {
    priceMonthly: number;
    overagePricing: {
      aiAction: number;
      apiCall: number;
      imageGeneration: number;
      videoGeneration: number;
    };
  };
  usage?: {
    aiActions: { used: number; limit: number };
    apiCalls: { used: number; limit: number };
  };
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName?: string | null;
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
  createdByEmail?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

// ============================================
// System Settings Types
// ============================================

export interface SystemSettings {
  // General Settings
  companyName: string;
  companyLogo?: string | null;
  supportEmail: string;
  supportPhone?: string | null;
  defaultPlan: PlanId;
  trialDays: number;
  maxTeamMembers: number;
  maxStoragePerUser: number;
  
  // Registration Settings
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
  oauthProvidersEnabled: string[];
  
  // Security Settings
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordExpiryDays: number | null;
    twoFactorRequired: boolean;
    ipWhitelist?: string[];
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindowMs: number;
  };
  
  // Branding Settings
  primaryColor?: string;
  accentColor?: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    facebook?: string;
    instagram?: string;
  };
  
  // Maintenance Settings
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  maintenanceStartDate?: string | null;
  maintenanceEndDate?: string | null;
  
  // Notification Settings
  notifications: {
    dailyDigestEnabled: boolean;
    weeklyReportEnabled: boolean;
    usageWarningThreshold: number;
    criticalUsageThreshold: number;
    overageNotificationEnabled: boolean;
  };
  
  // API Settings
  api: {
    rateLimitEnabled: boolean;
    defaultRateLimit: number;
    maxRateLimit: number;
  };
  
  // System
  system: {
    version: string;
    environment: string;
    logLevel: string;
    timezone: string;
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
  averageTokens: number;
  planDistribution: Record<PlanId, number>;
  roleDistribution: Record<UserRole, number>;
  statusDistribution: Record<UserStatus, number>;
  geographicDistribution?: Record<string, number>;
  overageUsers: number;
  totalOverageCost: number;
  topUsers: Array<{
    userId: string;
    email: string;
    name: string;
    executions: number;
    spent: number;
    planId: PlanId;
  }>;
  recentSignups: AdminUser[];
  recentActivity: Array<{
    userId: string;
    email: string;
    name: string;
    action: string;
    timestamp: string;
  }>;
  growthTrend: Array<{
    date: string;
    newUsers: number;
    churnedUsers: number;
    netGrowth: number;
  }>;
  executionTrend: Array<{
    date: string;
    total: number;
    byAgent: Record<string, number>;
  }>;
}

// ============================================
// Service Health Types
// ============================================

export interface ServiceHealth {
  id: string;
  name: string;
  category: ServiceCategory;
  status: ServiceStatus;
  latency?: number;
  uptime?: number;
  version?: string;
  message?: string;
  lastChecked?: Date;
  metrics?: ServiceMetrics;
  endpoints?: string[];
  dependencies?: string[];
}

export interface ServiceMetrics {
  cpu?: number;
  memory?: number;
  disk?: number;
  connections?: number;
  requestsPerSecond?: number;
  errorRate?: number;
  queueLength?: number;
  responseTime?: number;
  throughput?: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  averageLatency: number;
  queueLength: number;
  uptime: number;
}

// ============================================
// Export Types
// ============================================

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  includeCharts?: boolean;
  sections?: string[];
}

export interface ExportResult {
  success: boolean;
  url?: string;
  downloadUrl?: string;
  fileId?: string;
  error?: string;
  expiresAt?: string;
  fileSize?: number;
}

// ============================================
// Bulk Action Types
// ============================================

export interface BulkActionRequest {
  userIds: string[];
  action: 'activate' | 'suspend' | 'delete' | 'notify' | 'change_plan' | 'export';
  data?: {
    planId?: PlanId;
    reason?: string;
    message?: string;
    notificationType?: 'email' | 'in_app';
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
    errors: Array<{
      userId: string;
      error: string;
    }>;
  };
}

// ============================================
// Dashboard Widget Types
// ============================================

export interface AdminKpiCard {
  id: string;
  title: string;
  value: string;
  previousValue?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
  subtitle?: string;
  description?: string;
  sparklineData?: number[];
  onClick?: () => void;
}

export interface AdminChartData {
  type: ChartView;
  data: any[];
  config: {
    title: string;
    description?: string;
    xKey?: string;
    yKey?: string;
    colors?: string[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
  };
}

// ============================================
// Usage Trend Types
// ============================================

export interface UsageDataPoint {
  timestamp: string | Date;
  value: number;
  label: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface UsageTrendSeries {
  id: string;
  name: string;
  color: string;
  data: UsageDataPoint[];
  visible?: boolean;
  type?: 'solid' | 'dashed' | 'dotted';
  yAxis?: 'left' | 'right';
  description?: string;
}

export interface UsageThreshold {
  value: number;
  label: string;
  color: string;
  type: 'warning' | 'critical' | 'info';
  dashed?: boolean;
  description?: string;
  action?: {
    label: string;
    url: string;
  };
}

export interface UsageForecast {
  data: UsageDataPoint[];
  confidence: number; // 0-1
  method: string;
  description?: string;
  accuracy?: number;
}

// ============================================
// Admin Notification Types
// ============================================

export interface AdminNotification {
  id: string;
  type: 'overage' | 'system' | 'ticket' | 'user' | 'revenue' | 'security';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  read: boolean;
  actionable: boolean;
  actionUrl?: string;
  actionLabel?: string;
  userId?: string;
  email?: string;
  createdAt: string;
  expiredAt?: string;
}