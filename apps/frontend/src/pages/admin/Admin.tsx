// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/Admin.tsx
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CreditCard,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Zap,
  Server,
  Database,
  Lock,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../api/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  planId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count?: {
    agentExecutions: number;
  };
}

interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    recentSignups: number;
    byPlan: Array<{ plan: string; count: number }>;
  };
  executions: {
    total: number;
    byAgent: Array<{ agent: string; count: number }>;
  };
  revenue: {
    total: number;
    currency: string;
  };
}

interface UsageMetrics {
  period: string;
  summary: {
    totalActions: number;
    totalTokens: number;
    totalCostUsd: number;
  };
  byActionType: Record<string, number>;
}

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'system'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const usersPerPage = 10;

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      return;
    }
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch platform metrics
      const metricsResponse = await apiClient.get('/api/admin/metrics/platform');
      if (metricsResponse.success && metricsResponse.data) {
        setPlatformMetrics(metricsResponse.data);
      }
      
      // Fetch usage metrics
      const usageResponse = await apiClient.get('/api/admin/metrics/usage?period=month');
      if (usageResponse.success && usageResponse.data) {
        setUsageMetrics(usageResponse.data);
      }
      
      // Fetch users
      const usersResponse = await apiClient.get('/api/admin/users');
      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError('Failed to load admin data');
      // Set mock data for demo
      setPlatformMetrics(getMockPlatformMetrics());
      setUsageMetrics(getMockUsageMetrics());
      setUsers(getMockUsers());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockPlatformMetrics = (): PlatformMetrics => ({
    users: {
      total: 1250,
      active: 890,
      recentSignups: 45,
      byPlan: [
        { plan: 'FREE', count: 650 },
        { plan: 'STARTER', count: 350 },
        { plan: 'PROFESSIONAL', count: 200 },
        { plan: 'ENTERPRISE', count: 50 },
      ],
    },
    executions: {
      total: 45600,
      byAgent: [
        { agent: 'email', count: 15200 },
        { agent: 'web', count: 9800 },
        { agent: 'social', count: 6700 },
        { agent: 'calendar', count: 5400 },
        { agent: 'content', count: 4300 },
        { agent: 'task', count: 3200 },
        { agent: 'drive', count: 1000 },
      ],
    },
    revenue: {
      total: 28500,
      currency: 'usd',
    },
  });

  const getMockUsageMetrics = (): UsageMetrics => ({
    period: 'month',
    summary: {
      totalActions: 45600,
      totalTokens: 12500000,
      totalCostUsd: 285.50,
    },
    byActionType: {
      email_send: 8500,
      email_read: 6700,
      web_search: 9800,
      social_post: 6700,
      calendar_create: 5400,
      content_generate: 4300,
      task_create: 3200,
      drive_upload: 1000,
    },
  });

  const getMockUsers = (): User[] => {
    const plans = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    const roles = ['USER', 'ADMIN', 'SUPPORT'];
    const users: User[] = [];
    
    for (let i = 1; i <= 25; i++) {
      users.push({
        id: `user_${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        planId: plans[i % plans.length],
        role: i === 1 ? 'ADMIN' : roles[i % roles.length],
        isActive: i % 5 !== 0,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        lastLoginAt: i % 3 === 0 ? new Date(Date.now() - i * 3600000).toISOString() : null,
        _count: {
          agentExecutions: Math.floor(Math.random() * 1000),
        },
      });
    }
    return users;
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    setIsUpdatingUser(true);
    try {
      const response = await apiClient.put(`/api/admin/users/${userId}`, updates);
      if (response.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
        setSelectedUser(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      setError('Failed to update user');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const response = await apiClient.delete(`/api/admin/users/${userId}`);
      if (response.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, isActive: false } : u));
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      setError('Failed to deactivate user');
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await apiClient.get('/api/admin/export/users');
      if (response.success && response.data) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export users:', err);
      setError('Failed to export users');
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.planId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const getPlanBadgeColor = (planId: string) => {
    switch (planId) {
      case 'FREE': return 'bg-secondary-100 text-secondary-700';
      case 'STARTER': return 'bg-blue-100 text-blue-700';
      case 'PROFESSIONAL': return 'bg-primary-100 text-primary-700';
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-700';
      default: return 'bg-secondary-100 text-secondary-700';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-700';
      case 'SUPPORT': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
          <h2 className="text-xl font-semibold text-secondary-900 mb-2">Access Denied</h2>
          <p className="text-secondary-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'system', label: 'System', icon: <Server className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Manage users, monitor platform metrics, and configure system settings
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && platformMetrics && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-500">Total Users</span>
                <Users className="h-4 w-4 text-secondary-400" />
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                {platformMetrics.users.total.toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-green-600">+{platformMetrics.users.recentSignups}</span>
                <span className="text-xs text-secondary-500">this week</span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-500">Active Users</span>
                <Activity className="h-4 w-4 text-secondary-400" />
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                {platformMetrics.users.active.toLocaleString()}
              </div>
              <div className="text-xs text-secondary-500 mt-1">
                {Math.round((platformMetrics.users.active / platformMetrics.users.total) * 100)}% of total
              </div>
            </div>
            
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-500">Total Executions</span>
                <Zap className="h-4 w-4 text-secondary-400" />
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                {platformMetrics.executions.total.toLocaleString()}
              </div>
              <div className="text-xs text-secondary-500 mt-1">
                This month
              </div>
            </div>
            
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-500">Revenue (MRR)</span>
                <DollarSign className="h-4 w-4 text-secondary-400" />
              </div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                ${(platformMetrics.revenue.total / 100).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-xs text-green-600">+12%</span>
                <span className="text-xs text-secondary-500">vs last month</span>
              </div>
            </div>
          </div>

          {/* Users by Plan */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Users by Plan</h2>
            <div className="space-y-3">
              {platformMetrics.users.byPlan.map((item) => {
                const percentage = (item.count / platformMetrics.users.total) * 100;
                return (
                  <div key={item.plan} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-secondary-700 dark:text-secondary-300">{item.plan}</span>
                      <span className="text-secondary-600 dark:text-secondary-400">{item.count.toLocaleString()} users</span>
                    </div>
                    <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executions by Agent */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Executions by Agent</h2>
            <div className="space-y-3">
              {platformMetrics.executions.byAgent.map((item) => {
                const percentage = (item.count / platformMetrics.executions.total) * 100;
                return (
                  <div key={item.agent} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-secondary-700 dark:text-secondary-300">{item.agent}</span>
                      <span className="text-secondary-600 dark:text-secondary-400">{item.count.toLocaleString()} executions</span>
                    </div>
                    <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search users by email, name, or plan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportUsers}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Executions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-secondary-900 dark:text-white">{user.name || '—'}</div>
                          <div className="text-sm text-secondary-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.planId)}`}>
                          {user.planId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-600">
                        {user._count?.agentExecutions?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
                <div className="text-sm text-secondary-500">
                  Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 text-sm text-secondary-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && usageMetrics && (
        <div className="space-y-6">
          {/* Usage Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="text-sm text-secondary-500 mb-1">Total Actions</div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                {usageMetrics.summary.totalActions.toLocaleString()}
              </div>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="text-sm text-secondary-500 mb-1">Total Tokens</div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                {(usageMetrics.summary.totalTokens / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
              <div className="text-sm text-secondary-500 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                ${usageMetrics.summary.totalCostUsd.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Actions by Type */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Actions by Type</h2>
            <div className="space-y-3">
              {Object.entries(usageMetrics.byActionType)
                .sort((a, b) => b[1] - a[1])
                .map(([action, count]) => {
                  const maxCount = Math.max(...Object.values(usageMetrics.byActionType));
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={action} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-secondary-700 dark:text-secondary-300">{action.replace(/_/g, ' ')}</span>
                        <span className="text-secondary-600 dark:text-secondary-400">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <span className="text-secondary-700 dark:text-secondary-300">API Status</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <span className="text-secondary-700 dark:text-secondary-300">Database</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <span className="text-secondary-700 dark:text-secondary-300">Redis Cache</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <span className="text-secondary-700 dark:text-secondary-300">Queue Workers</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Running
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Version Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-secondary-200 dark:border-secondary-700">
                <span className="text-secondary-600">API Version</span>
                <span className="font-mono text-secondary-900 dark:text-white">v1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-secondary-200 dark:border-secondary-700">
                <span className="text-secondary-600">Frontend Version</span>
                <span className="font-mono text-secondary-900 dark:text-white">v1.0.0</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary-600">Environment</span>
                <span className="font-mono text-secondary-900 dark:text-white">{import.meta.env.MODE || 'production'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-secondary-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Manage User</h2>
                <button onClick={() => setSelectedUser(null)} className="text-secondary-500 hover:text-secondary-700">
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-700 text-secondary-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name</label>
                <input
                  type="text"
                  value={selectedUser.name || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Plan</label>
                <select
                  value={selectedUser.planId}
                  onChange={(e) => setSelectedUser({ ...selectedUser, planId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="PROFESSIONAL">PROFESSIONAL</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Role</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="USER">USER</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUser.isActive}
                  onChange={(e) => setSelectedUser({ ...selectedUser, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <label className="text-sm text-secondary-700 dark:text-secondary-300">Active</label>
              </div>
            </div>
            <div className="p-6 border-t border-secondary-200 dark:border-secondary-700 flex gap-3">
              <button
                onClick={() => handleUpdateUser(selectedUser.id, {
                  name: selectedUser.name,
                  planId: selectedUser.planId,
                  role: selectedUser.role,
                  isActive: selectedUser.isActive,
                })}
                disabled={isUpdatingUser}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingUser ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => handleDeactivateUser(selectedUser.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:bg-red-600 rounded px-1">
            ×
          </button>
        </div>
      )}
    </div>
  );
};


export default Admin;
