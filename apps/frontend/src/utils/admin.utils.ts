// enterprise-ai-agent-platform/apps/frontend/src/utils/admin.utils.ts
import { UserRole, UserStatus, PlanId, AuditAction, TicketStatus, TicketPriority } from '../types/admin.types';

export const formatUserRole = (role: UserRole): string => {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

export const formatUserStatus = (status: UserStatus): string => {
  const statusMap: Record<UserStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    pending: 'Pending',
  };
  return statusMap[status];
};

export const formatPlanName = (planId: PlanId): string => {
  const planMap: Record<PlanId, string> = {
    FREE: 'Free',
    STARTER: 'Starter',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
    CUSTOM: 'Custom',
  };
  return planMap[planId] || planId;
};

export const formatAuditAction = (action: AuditAction): string => {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const formatTicketStatus = (status: TicketStatus): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const formatTicketPriority = (priority: TicketPriority): string => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export const getStatusColor = (status: UserStatus): string => {
  const colors: Record<UserStatus, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return colors[status];
};

export const getPlanColor = (planId: PlanId): string => {
  const colors: Record<PlanId, string> = {
    FREE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    STARTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PROFESSIONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ENTERPRISE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    CUSTOM: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };
  return colors[planId] || 'bg-secondary-100 text-secondary-700';
};

export const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    USER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    SUPPORT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return colors[role];
};

export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString();
};

export const formatRelativeTime = (dateString: string | Date): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return formatDate(dateString);
};

export const calculatePlanDistribution = (
  users: Array<{ planId: PlanId }>
): Record<PlanId, number> => {
  const distribution: Record<PlanId, number> = {
    FREE: 0,
    STARTER: 0,
    PROFESSIONAL: 0,
    ENTERPRISE: 0,
    CUSTOM: 0,
  };
  users.forEach((user) => {
    if (distribution[user.planId] !== undefined) {
      distribution[user.planId]++;
    }
  });
  return distribution;
};

export const calculateUserGrowth = (
  users: Array<{ createdAt: string | Date }>
): {
  total: number;
  newThisMonth: number;
  newThisWeek: number;
  growthRate: number;
} => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);

  const total = users.length;
  const newThisMonth = users.filter(
    (u) => new Date(u.createdAt) >= lastMonth
  ).length;
  const newThisWeek = users.filter(
    (u) => new Date(u.createdAt) >= lastWeek
  ).length;

  return {
    total,
    newThisMonth,
    newThisWeek,
    growthRate: total > 0 ? (newThisMonth / total) * 100 : 0,
  };
};

export const getMetricTrend = (
  current: number,
  previous: number
): 'up' | 'down' | 'stable' => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const formatCompactNumber = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const getStatusBadge = (
  status: UserStatus
): { bg: string; text: string; label: string } => {
  const config: Record<
    UserStatus,
    { bg: string; text: string; label: string }
  > = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      label: 'Active',
    },
    inactive: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      label: 'Inactive',
    },
    suspended: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      label: 'Suspended',
    },
    pending: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'Pending',
    },
  };
  return config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
};

export const getPlanBadge = (
  planId: PlanId
): { bg: string; text: string; label: string; icon?: string } => {
  const config: Record<
    PlanId,
    { bg: string; text: string; label: string; icon?: string }
  > = {
    FREE: {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-700 dark:text-gray-400',
      label: 'Free',
      icon: '🎯',
    },
    STARTER: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      label: 'Starter',
      icon: '⚡',
    },
    PROFESSIONAL: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
      label: 'Pro',
      icon: '🏆',
    },
    ENTERPRISE: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Enterprise',
      icon: '👑',
    },
    CUSTOM: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      text: 'text-teal-700 dark:text-teal-400',
      label: 'Custom',
      icon: '🔧',
    },
  };
  return config[planId] || { bg: 'bg-gray-100', text: 'text-gray-700', label: planId };
};

export const getRoleBadge = (
  role: UserRole
): { bg: string; text: string; label: string } => {
  const config: Record<
    UserRole,
    { bg: string; text: string; label: string }
  > = {
    USER: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      label: 'User',
    },
    ADMIN: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      label: 'Admin',
    },
    SUPPORT: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      label: 'Support',
    },
  };
  return config[role] || { bg: 'bg-gray-100', text: 'text-gray-700', label: role };
};

export const getAuditActionColor = (action: AuditAction): string => {
  const colors: Record<string, string> = {
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
  return colors[action] || 'bg-gray-100 text-gray-700';
};

export const getTicketStatusColor = (status: TicketStatus): string => {
  const colors: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getTicketPriorityColor = (priority: TicketPriority): string => {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

export const formatPaginationInfo = (
  page: number,
  limit: number,
  total: number
): string => {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start} to ${end} of ${total}`;
};
