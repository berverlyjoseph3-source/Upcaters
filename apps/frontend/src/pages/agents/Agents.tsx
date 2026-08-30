// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/Agents.tsx
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
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Settings,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface AgentStatus {
  agentType: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'error' | 'degraded';
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageResponseTimeMs: number;
    errorRate: number;
  };
  lastHeartbeat: string;
}

const agentIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-6 w-6" />,
  calendar: <Calendar className="h-6 w-6" />,
  drive: <FileText className="h-6 w-6" />,
  social: <Share2 className="h-6 w-6" />,
  web: <Search className="h-6 w-6" />,
  task: <CheckSquare className="h-6 w-6" />,
  content: <Bot className="h-6 w-6" />,
  orchestrator: <Activity className="h-6 w-6" />,
};

const agentColors: Record<string, string> = {
  email: 'bg-blue-500',
  calendar: 'bg-green-500',
  drive: 'bg-yellow-500',
  social: 'bg-purple-500',
  web: 'bg-indigo-500',
  task: 'bg-pink-500',
  content: 'bg-orange-500',
  orchestrator: 'bg-secondary-500',
};

const agentPaths: Record<string, string> = {
  email: '/agents/email',
  calendar: '/agents/calendar',
  drive: '/agents/drive',
  social: '/agents/social',
  web: '/agents/web',
  task: '/agents/task',
  content: '/agents/content',
  orchestrator: '/agents/orchestrator',
};

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  const fetchAgentStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/api/agent/status');
      if (response.success && response.data) {
        const agentList = Object.entries(response.data.agents).map(([key, value]: [string, any]) => ({
          agentType: key,
          name: getAgentName(key),
          description: getAgentDescription(key),
          status: value.status,
          metrics: value.metrics,
          lastHeartbeat: value.lastHeartbeat,
        }));
        setAgents(agentList);
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
      setError('Failed to load agent status');
      // Fallback mock data
      setAgents(getMockAgentData());
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentName = (type: string): string => {
    const names: Record<string, string> = {
      email: 'Email Agent',
      calendar: 'Calendar Agent',
      drive: 'Drive Agent',
      social: 'Social Agent',
      web: 'Web Agent',
      task: 'Task Agent',
      content: 'Content Agent',
      orchestrator: 'Orchestrator',
    };
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getAgentDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      email: 'Manage Gmail emails - read, send, reply, organize',
      calendar: 'Schedule meetings and manage calendar events',
      drive: 'Upload, download, and manage files in Google Drive',
      social: 'Post to LinkedIn, Instagram, Facebook, and X',
      web: 'Search the web, get weather, research topics',
      task: 'Manage tasks across Google Tasks, Asana, Monday.com',
      content: 'Generate text, images, and videos with AI',
      orchestrator: 'Central coordinator for all agents',
    };
    return descriptions[type] || 'AI Agent';
  };

  const getMockAgentData = (): AgentStatus[] => {
    return [
      { agentType: 'email', name: 'Email Agent', description: 'Manage Gmail emails', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'calendar', name: 'Calendar Agent', description: 'Schedule meetings', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'drive', name: 'Drive Agent', description: 'Manage files', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'social', name: 'Social Agent', description: 'Post to social media', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'web', name: 'Web Agent', description: 'Search and research', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'task', name: 'Task Agent', description: 'Manage tasks', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'content', name: 'Content Agent', description: 'Generate content', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
      { agentType: 'orchestrator', name: 'Orchestrator', description: 'Central coordinator', status: 'idle', metrics: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageResponseTimeMs: 0, errorRate: 0 }, lastHeartbeat: new Date().toISOString() },
    ];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'idle':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300"><Activity className="h-3 w-3" /> Idle</span>;
      case 'running':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Play className="h-3 w-3" /> Running</span>;
      case 'error':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3" /> Error</span>;
      case 'degraded':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertCircle className="h-3 w-3" /> Degraded</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">AI Agents</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Manage and monitor your AI agents
          </p>
        </div>
        <button
          onClick={fetchAgentStatus}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="text-2xl font-bold text-secondary-900 dark:text-white">{agents.length}</div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400">Total Agents</div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="text-2xl font-bold text-green-600">{agents.filter(a => a.status === 'idle').length}</div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400">Idle</div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="text-2xl font-bold text-yellow-600">{agents.filter(a => a.status === 'running' || a.status === 'degraded').length}</div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400">Active</div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="text-2xl font-bold text-red-600">{agents.filter(a => a.status === 'error').length}</div>
          <div className="text-sm text-secondary-600 dark:text-secondary-400">Error</div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.agentType}
            className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${agentColors[agent.agentType]} bg-opacity-10`}>
                  <div className={agentColors[agent.agentType].replace('bg-', 'text-')}>
                    {agentIcons[agent.agentType] || <Bot className="h-6 w-6" />}
                  </div>
                </div>
                {getStatusBadge(agent.status)}
              </div>
              <h3 className="font-semibold text-secondary-900 dark:text-white mb-1">
                {agent.name}
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-3 line-clamp-2">
                {agent.description}
              </p>
              <div className="flex items-center justify-between text-xs text-secondary-500">
                <span>{agent.metrics.totalExecutions} executions</span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {((agent.metrics.successfulExecutions / (agent.metrics.totalExecutions || 1)) * 100).toFixed(0)}% success
                </span>
              </div>
            </div>
            <div className="border-t border-secondary-200 dark:border-secondary-700 p-3 bg-secondary-50 dark:bg-secondary-700/50">
              <Link
                to={agentPaths[agent.agentType] || `/agents/${agent.agentType}`}
                className="flex items-center justify-between text-sm text-primary-600 hover:text-primary-700"
              >
                <span>Manage Agent</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAgent(null)}>
          <div className="bg-white dark:bg-secondary-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${agentColors[selectedAgent.agentType]} bg-opacity-10`}>
                    <div className={agentColors[selectedAgent.agentType].replace('bg-', 'text-')}>
                      {agentIcons[selectedAgent.agentType] || <Bot className="h-6 w-6" />}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                      {selectedAgent.name}
                    </h2>
                    <p className="text-sm text-secondary-500">{selectedAgent.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-secondary-500 hover:text-secondary-700"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Status</h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedAgent.status)}
                  <span className="text-xs text-secondary-500">
                    Last heartbeat: {new Date(selectedAgent.lastHeartbeat).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-white">{selectedAgent.metrics.totalExecutions}</div>
                    <div className="text-xs text-secondary-500">Total Executions</div>
                  </div>
                  <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{selectedAgent.metrics.successfulExecutions}</div>
                    <div className="text-xs text-secondary-500">Successful</div>
                  </div>
                  <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-600">{selectedAgent.metrics.failedExecutions}</div>
                    <div className="text-xs text-secondary-500">Failed</div>
                  </div>
                  <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-white">{selectedAgent.metrics.averageResponseTimeMs}ms</div>
                    <div className="text-xs text-secondary-500">Avg Response</div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <Link
                  to={agentPaths[selectedAgent.agentType] || `/agents/${selectedAgent.agentType}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  onClick={() => setSelectedAgent(null)}
                >
                  <Settings className="h-4 w-4" />
                  Manage Agent
                </Link>
              </div>
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


export default Agents;
