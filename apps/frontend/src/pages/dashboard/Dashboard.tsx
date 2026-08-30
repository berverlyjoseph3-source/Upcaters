// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bot, 
  Mail, 
  Calendar, 
  FileText, 
  Share2, 
  Search, 
  CheckSquare,
  TrendingUp,
  Activity,
  Clock,
  AlertCircle,
  Zap,
  Shield,
  Users,
  CreditCard,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../api/client';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'idle' | 'error';
  color: string;
  path: string;
}

interface UsageStats {
  aiActionsUsed: number;
  aiActionsLimit: number | 'unlimited';
  apiCallsUsed: number;
  apiCallsLimit: number | 'unlimited';
  percentageUsed: number;
  resetDate: string;
}

interface RecentActivity {
  id: string;
  type: string;
  agent: string;
  status: 'success' | 'error' | 'pending';
  timestamp: string;
  details: string;
}

const agents: Agent[] = [
  { id: 'email', name: 'Email Agent', description: 'Manage Gmail emails', icon: <Mail className="h-5 w-5" />, status: 'active', color: 'bg-blue-500', path: '/agents/email' },
  { id: 'calendar', name: 'Calendar Agent', description: 'Schedule meetings', icon: <Calendar className="h-5 w-5" />, status: 'active', color: 'bg-green-500', path: '/agents/calendar' },
  { id: 'drive', name: 'Drive Agent', description: 'Manage files', icon: <FileText className="h-5 w-5" />, status: 'active', color: 'bg-yellow-500', path: '/agents/drive' },
  { id: 'social', name: 'Social Agent', description: 'Post to social media', icon: <Share2 className="h-5 w-5" />, status: 'active', color: 'bg-purple-500', path: '/agents/social' },
  { id: 'web', name: 'Web Agent', description: 'Search and research', icon: <Search className="h-5 w-5" />, status: 'active', color: 'bg-indigo-500', path: '/agents/web' },
  { id: 'task', name: 'Task Agent', description: 'Manage tasks', icon: <CheckSquare className="h-5 w-5" />, status: 'active', color: 'bg-pink-500', path: '/agents/task' },
  { id: 'content', name: 'Content Agent', description: 'Generate content', icon: <Bot className="h-5 w-5" />, status: 'active', color: 'bg-orange-500', path: '/agents/content' },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch usage stats
      const usageResponse = await apiClient.get('/api/usage/percentage');
      if (usageResponse.success && usageResponse.data) {
        setUsageStats(usageResponse.data);
      }
      
      // Fetch recent activities
      const activitiesResponse = await apiClient.get('/api/agent/executions?limit=5');
      if (activitiesResponse.success && activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 70) return 'text-green-600 bg-green-100';
    if (percentage < 90) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityIcon = (agent: string) => {
    const icons: Record<string, React.ReactNode> = {
      email: <Mail className="h-4 w-4" />,
      calendar: <Calendar className="h-4 w-4" />,
      drive: <FileText className="h-4 w-4" />,
      social: <Share2 className="h-4 w-4" />,
      web: <Search className="h-4 w-4" />,
      task: <CheckSquare className="h-4 w-4" />,
      content: <Bot className="h-4 w-4" />,
    };
    return icons[agent] || <Activity className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.name || user?.email?.split('@')[0]}!
            </h1>
            <p className="text-primary-100 mb-4">
              Your AI agents are ready to help you automate your workflow.
            </p>
            <Link
              to="/agents"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg text-sm font-medium"
            >
              Explore Agents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Usage Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-xs text-secondary-500">Current period</span>
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {usageStats?.aiActionsUsed || 0}
            <span className="text-sm font-normal text-secondary-500">
              /{usageStats?.aiActionsLimit === 'unlimited' ? '∞' : usageStats?.aiActionsLimit || 0}
            </span>
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">AI Actions used</p>
          {usageStats && usageStats.aiActionsLimit !== 'unlimited' && (
            <div className="mt-3">
              <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (usageStats.percentageUsed || 0) > 90 ? 'bg-red-500' : 
                    (usageStats.percentageUsed || 0) > 70 ? 'bg-yellow-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${usageStats.percentageUsed || 0}%` }}
                />
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                {Math.round(usageStats.percentageUsed || 0)}% of monthly limit
              </p>
            </div>
          )}
        </div>

        {/* API Calls Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-secondary-500">API usage</span>
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {usageStats?.apiCallsUsed || 0}
            <span className="text-sm font-normal text-secondary-500">
              /{usageStats?.apiCallsLimit === 'unlimited' ? '∞' : usageStats?.apiCallsLimit || 0}
            </span>
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">API Calls this month</p>
        </div>

        {/* Active Agents Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Bot className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {agents.filter(a => a.status === 'active').length}/7
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Active Agents</p>
        </div>

        {/* Plan Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            {user?.planId === 'FREE' && (
              <Link to="/billing" className="text-xs text-primary-600 hover:text-primary-700">
                Upgrade
              </Link>
            )}
          </div>
          <h3 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {user?.planId || 'FREE'}
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">Current Plan</p>
          {usageStats?.resetDate && (
            <p className="text-xs text-secondary-500 mt-2">
              Resets on {new Date(usageStats.resetDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Agents Grid */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">AI Agents</h2>
          <Link to="/agents" className="text-sm text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to={agent.path}
              className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${agent.color} bg-opacity-10`}>
                  <div className={agent.color.replace('bg-', 'text-')}>
                    {agent.icon}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
              </div>
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-1">
                {agent.name}
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                {agent.description}
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary-600 group-hover:gap-2 transition-all">
                <span>Launch</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Activity</h2>
          <Link to="/analytics" className="text-sm text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          {recentActivities.length === 0 ? (
            <div className="p-8 text-center text-secondary-500">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity yet</p>
              <p className="text-sm">Start using agents to see activity here</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                    activity.status === 'error' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'
                  }`}>
                    {getActivityIcon(activity.agent)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-secondary-900 dark:text-white capitalize">
                        {activity.agent}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        activity.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        activity.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {activity.details}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-secondary-500">
                    <Clock className="h-3 w-3" />
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right">
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


export default Dashboard;
