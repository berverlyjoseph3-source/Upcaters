// apps/frontend/src/hooks/useAgents.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ============================================
// Types
// ============================================

export type AgentType =
  | 'orchestrator'
  | 'email'
  | 'drive'
  | 'content'
  | 'social'
  | 'calendar'
  | 'web'
  | 'task';

export type AgentStatus = 'idle' | 'running' | 'error' | 'degraded' | 'maintenance';

export interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  version: string;
  status: AgentStatus;
  icon?: string;
  color?: string;
  gradient?: string;
  isConnected?: boolean;
  lastHeartbeat?: Date;
}

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  lastExecutedAt?: Date;
  errorRate: number;
}

export interface AgentHealth {
  agentType: AgentType;
  status: AgentStatus;
  metrics: AgentMetrics;
  lastHeartbeat: Date;
  message?: string;
  isHealthy: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  requiresApiCall: boolean;
  cost: number;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  enum?: string[];
  default?: any;
}

export interface AgentExecutionRequest {
  input: string;
  sessionId?: string;
  agentType?: AgentType;
  action?: string;
  priority?: number;
  context?: Record<string, any>;
  stream?: boolean;
}

export interface AgentExecutionResponse {
  success: boolean;
  requestId: string;
  agentType: AgentType;
  output: any;
  error?: string;
  metadata: {
    executionTimeMs: number;
    tokensUsed: number;
    costUsd: number;
    retryCount: number;
  };
  timestamp: Date;
}

export interface AgentStreamChunk {
  type: 'thought' | 'action' | 'observation' | 'output' | 'error';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AgentSession {
  sessionId: string;
  agentType: AgentType;
  status: 'active' | 'completed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  messageCount: number;
  lastActivityAt: Date;
}

export interface RecentExecution {
  id: string;
  agentType: AgentType;
  actionType: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  input: string;
  output?: string;
  error?: string;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface AgentsHubState {
  agents: AgentInfo[];
  selectedAgent: AgentType | null;
  agentSessions: AgentSession[];
  recentExecutions: RecentExecution[];
  isExecuting: boolean;
  isStreaming: boolean;
  currentStream: string;
  streamChunks: AgentStreamChunk[];
  error: string | null;
}

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<AgentType, { name: string; description: string; color: string; gradient: string; icon: string }> = {
  orchestrator: {
    name: 'Ultimate AI Agent',
    description: 'Central orchestrator that coordinates all agents for complex workflows',
    color: 'bg-slate-500',
    gradient: 'bg-gradient-to-br from-slate-500 to-slate-600',
    icon: '🧠',
  },
  email: {
    name: 'Email Agent',
    description: 'Smart email management with AI-powered replies and organization',
    color: 'bg-blue-500',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    icon: '📧',
  },
  drive: {
    name: 'Drive Agent',
    description: 'File management, search, sharing, and organization across Google Drive',
    color: 'bg-green-500',
    gradient: 'bg-gradient-to-br from-green-500 to-green-600',
    icon: '📁',
  },
  content: {
    name: 'Content Agent',
    description: 'Generate text, images, and videos using state-of-the-art AI models',
    color: 'bg-purple-500',
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
    icon: '✨',
  },
  social: {
    name: 'Social Agent',
    description: 'Post to LinkedIn, Instagram, Facebook, and X (Twitter)',
    color: 'bg-pink-500',
    gradient: 'bg-gradient-to-br from-pink-500 to-pink-600',
    icon: '📱',
  },
  calendar: {
    name: 'Calendar Agent',
    description: 'Smart scheduling, meeting management, and availability coordination',
    color: 'bg-orange-500',
    gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
    icon: '📅',
  },
  web: {
    name: 'Web Agent',
    description: 'Web search, research, weather, and data extraction',
    color: 'bg-teal-500',
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-600',
    icon: '🌐',
  },
  task: {
    name: 'Task Agent',
    description: 'Manage tasks across Google Tasks, Asana, and Monday.com',
    color: 'bg-indigo-500',
    gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    icon: '✅',
  },
};

// ============================================
// Hook
// ============================================

export function useAgents() {
  const { user, isAuthenticated } = useAuthStore();

  // State
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [agentHealth, setAgentHealth] = useState<Record<AgentType, AgentHealth> | null>(null);
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([]);
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [streamChunks, setStreamChunks] = useState<AgentStreamChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<AgentExecutionResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ============================================
  // Fetch Agents
  // ============================================

  const fetchAgents = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoadingAgents(true);
    setError(null);

    try {
      const response = await apiClient.get<{ agents: AgentInfo[] }>('/api/agent/agents');

      if (response.success && response.data) {
        const enrichedAgents = response.data.agents.map(agent => ({
          ...agent,
          ...AGENT_CONFIG[agent.type],
          lastHeartbeat: agent.lastHeartbeat ? new Date(agent.lastHeartbeat) : undefined,
        }));
        setAgents(enrichedAgents);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      // Set default agents from config
      setAgents(
        Object.entries(AGENT_CONFIG).map(([type, config]) => ({
          type: type as AgentType,
          ...config,
          version: '1.0.0',
          status: 'idle' as AgentStatus,
        }))
      );
    } finally {
      setIsLoadingAgents(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Fetch Agent Health
  // ============================================

  const fetchAgentHealth = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoadingHealth(true);

    try {
      const response = await apiClient.get<Record<AgentType, AgentHealth>>('/api/agent/status');

      if (response.success && response.data) {
        const health: Record<AgentType, AgentHealth> = {};
        
        for (const [type, data] of Object.entries(response.data)) {
          health[type as AgentType] = {
            ...data,
            lastHeartbeat: new Date(data.lastHeartbeat),
            isHealthy: data.status !== 'error' && data.status !== 'down',
          };
        }

        setAgentHealth(health);

        // Update agent statuses
        setAgents(prev =>
          prev.map(agent => ({
            ...agent,
            status: health[agent.type]?.status || agent.status,
            lastHeartbeat: health[agent.type]?.lastHeartbeat || agent.lastHeartbeat,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch agent health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Fetch Agent By Type
  // ============================================

  const getAgentByType = useCallback((type: AgentType): AgentInfo | undefined => {
    return agents.find(a => a.type === type);
  }, [agents]);

  // ============================================
  // Fetch Agent Tools
  // ============================================

  const fetchAgentTools = useCallback(async (agentType: AgentType): Promise<AgentTool[]> => {
    if (!isAuthenticated) return [];

    try {
      const response = await apiClient.get<{ tools: AgentTool[] }>(
        `/api/agent/agents/${agentType}/tools`
      );

      if (response.success && response.data) {
        return response.data.tools;
      }

      return [];
    } catch (err) {
      console.error(`Failed to fetch tools for ${agentType}:`, err);
      return [];
    }
  }, [isAuthenticated]);

  // ============================================
  // Execute Agent
  // ============================================

  const executeAgent = useCallback(async (
    request: AgentExecutionRequest
  ): Promise<AgentExecutionResponse | null> => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return null;
    }

    setIsExecuting(true);
    setError(null);
    setLastResponse(null);

    try {
      const response = await apiClient.post<AgentExecutionResponse>('/api/agent/execute', {
        input: request.input,
        sessionId: request.sessionId || activeSession?.sessionId,
        agentType: request.agentType || selectedAgent || 'orchestrator',
        action: request.action,
        priority: request.priority || 1,
        context: request.context,
      });

      if (response.success && response.data) {
        const executionResponse: AgentExecutionResponse = {
          ...response.data,
          timestamp: new Date(response.data.timestamp || new Date()),
        };

        setLastResponse(executionResponse);

        // Add to recent executions
        setRecentExecutions(prev => [
          {
            id: executionResponse.requestId,
            agentType: executionResponse.agentType,
            actionType: request.action || 'execute',
            status: 'success',
            input: request.input,
            output: typeof executionResponse.output === 'string'
              ? executionResponse.output
              : JSON.stringify(executionResponse.output),
            durationMs: executionResponse.metadata.executionTimeMs,
            tokensUsed: executionResponse.metadata.tokensUsed,
            costUsd: executionResponse.metadata.costUsd,
            createdAt: new Date(),
            completedAt: new Date(),
          },
          ...prev.slice(0, 49),
        ]);

        return executionResponse;
      }

      setError(response.error || 'Agent execution failed');
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent execution failed';
      setError(message);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [isAuthenticated, selectedAgent, activeSession]);

  // ============================================
  // Execute Agent with Streaming
  // ============================================

  const executeAgentStream = useCallback(async (
    request: AgentExecutionRequest,
    onChunk?: (chunk: AgentStreamChunk) => void
  ): Promise<AgentExecutionResponse | null> => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return null;
    }

    // Clean up previous stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsExecuting(true);
    setIsStreaming(true);
    setCurrentStream('');
    setStreamChunks([]);
    setError(null);
    setLastResponse(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiUrl}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: request.input,
          sessionId: request.sessionId || activeSession?.sessionId,
          agentType: request.agentType || selectedAgent || 'orchestrator',
          action: request.action,
          priority: request.priority || 1,
          context: request.context,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: AgentExecutionResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'connected') {
                continue;
              }

              const chunk: AgentStreamChunk = {
                type: parsed.type || 'output',
                content: parsed.content || parsed.data || '',
                metadata: parsed.metadata,
                timestamp: new Date(parsed.timestamp || new Date()),
              };

              setStreamChunks(prev => [...prev, chunk]);
              setCurrentStream(prev => prev + (chunk.content || ''));

              if (onChunk) {
                onChunk(chunk);
              }

              // Check for completion
              if (parsed.type === 'complete') {
                finalResponse = {
                  success: true,
                  requestId: parsed.data?.requestId || '',
                  agentType: parsed.data?.agentType || (request.agentType as AgentType) || 'orchestrator',
                  output: parsed.data?.output || currentStream,
                  metadata: {
                    executionTimeMs: parsed.data?.metadata?.executionTimeMs || 0,
                    tokensUsed: parsed.data?.metadata?.tokensUsed || 0,
                    costUsd: parsed.data?.metadata?.costUsd || 0,
                    retryCount: 0,
                  },
                  timestamp: new Date(),
                };
              }
            } catch (e) {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      if (finalResponse) {
        setLastResponse(finalResponse);
        
        setRecentExecutions(prev => [
          {
            id: finalResponse!.requestId,
            agentType: finalResponse!.agentType,
            actionType: request.action || 'execute',
            status: 'success',
            input: request.input,
            output: currentStream,
            durationMs: finalResponse!.metadata.executionTimeMs,
            tokensUsed: finalResponse!.metadata.tokensUsed,
            costUsd: finalResponse!.metadata.costUsd,
            createdAt: new Date(),
            completedAt: new Date(),
          },
          ...prev.slice(0, 49),
        ]);
      }

      setIsStreaming(false);
      return finalResponse;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Stream cancelled');
      } else {
        const message = err instanceof Error ? err.message : 'Stream execution failed';
        setError(message);
      }
      setIsStreaming(false);
      return null;
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  }, [isAuthenticated, selectedAgent, activeSession]);

  // ============================================
  // Cancel Stream
  // ============================================

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsExecuting(false);
    setIsStreaming(false);
  }, []);

  // ============================================
  // Session Management
  // ============================================

  const startSession = useCallback(async (): Promise<AgentSession | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await apiClient.post<AgentSession>('/api/agent/session/start');

      if (response.success && response.data) {
        const session: AgentSession = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          expiresAt: new Date(response.data.expiresAt),
          lastActivityAt: new Date(response.data.lastActivityAt),
        };

        setActiveSession(session);
        setAgentSessions(prev => [session, ...prev]);
        return session;
      }

      return null;
    } catch (err) {
      console.error('Failed to start session:', err);
      return null;
    }
  }, [isAuthenticated]);

  const endSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated) return;

    try {
      await apiClient.post(`/api/agent/session/${sessionId}/end`);
      
      if (activeSession?.sessionId === sessionId) {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  }, [isAuthenticated, activeSession]);

  const getSession = useCallback(async (sessionId: string): Promise<AgentSession | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await apiClient.get<AgentSession>(`/api/agent/session/${sessionId}`);
      
      if (response.success && response.data) {
        return {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          expiresAt: new Date(response.data.expiresAt),
          lastActivityAt: new Date(response.data.lastActivityAt),
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to get session:', err);
      return null;
    }
  }, [isAuthenticated]);

  // ============================================
  // Fetch Recent Executions
  // ============================================

  const fetchRecentExecutions = useCallback(async (limit: number = 20) => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<{ executions: RecentExecution[] }>(
        '/api/agent/executions',
        { params: { limit } }
      );

      if (response.success && response.data) {
        const executions = response.data.executions.map((e: any) => ({
          ...e,
          createdAt: new Date(e.createdAt),
          completedAt: e.completedAt ? new Date(e.completedAt) : undefined,
        }));
        setRecentExecutions(executions);
      }
    } catch (err) {
      console.error('Failed to fetch recent executions:', err);
    }
  }, [isAuthenticated]);

  // ============================================
  // Execute Specific Agent Action
  // ============================================

  const executeEmailAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'email', sessionId });
  }, [executeAgent]);

  const executeDriveAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'drive', sessionId });
  }, [executeAgent]);

  const executeContentAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'content', sessionId });
  }, [executeAgent]);

  const executeSocialAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'social', sessionId });
  }, [executeAgent]);

  const executeCalendarAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'calendar', sessionId });
  }, [executeAgent]);

  const executeWebAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'web', sessionId });
  }, [executeAgent]);

  const executeTaskAgent = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'task', sessionId });
  }, [executeAgent]);

  const executeOrchestrator = useCallback(async (input: string, sessionId?: string) => {
    return executeAgent({ input, agentType: 'orchestrator', sessionId });
  }, [executeAgent]);

  // ============================================
  // Clear
  // ============================================

  const clearStream = useCallback(() => {
    setCurrentStream('');
    setStreamChunks([]);
    setLastResponse(null);
  }, []);

  const clearExecutions = useCallback(() => {
    setRecentExecutions([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // Computed Values
  // ============================================

  const healthyAgents = useMemo(() => {
    return agents.filter(a => a.status === 'idle' || a.status === 'running');
  }, [agents]);

  const degradedAgents = useMemo(() => {
    return agents.filter(a => a.status === 'degraded' || a.status === 'maintenance');
  }, [agents]);

  const errorAgents = useMemo(() => {
    return agents.filter(a => a.status === 'error');
  }, [agents]);

  const overallStatus = useMemo((): AgentStatus => {
    if (agents.length === 0) return 'idle';
    if (errorAgents.length === agents.length) return 'error';
    if (degradedAgents.length > 0) return 'degraded';
    if (healthyAgents.length === agents.length) return 'idle';
    return 'running';
  }, [agents, healthyAgents, degradedAgents, errorAgents]);

  const isAnyExecuting = useMemo(() => {
    return isExecuting || isStreaming;
  }, [isExecuting, isStreaming]);

  // ============================================
  // Initialize
  // ============================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchAgents();
      fetchAgentHealth();
      fetchRecentExecutions();
    }
  }, [isAuthenticated]);

  // ============================================
  // Auto-health check every 30 seconds
  // ============================================

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchAgentHealth();
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchAgentHealth]);

  // ============================================
  // Cleanup on unmount
  // ============================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // ============================================
  // Return
  // ============================================

  return {
    // State
    agents,
    selectedAgent,
    agentHealth,
    agentSessions,
    activeSession,
    recentExecutions,
    isExecuting,
    isStreaming,
    currentStream,
    streamChunks,
    isLoading,
    isLoadingAgents,
    isLoadingHealth,
    error,
    lastResponse,

    // Computed
    healthyAgents,
    degradedAgents,
    errorAgents,
    overallStatus,
    isAnyExecuting,

    // Agent CRUD
    fetchAgents,
    fetchAgentHealth,
    getAgentByType,
    fetchAgentTools,
    setSelectedAgent,

    // Execution
    executeAgent,
    executeAgentStream,
    cancelStream,
    executeEmailAgent,
    executeDriveAgent,
    executeContentAgent,
    executeSocialAgent,
    executeCalendarAgent,
    executeWebAgent,
    executeTaskAgent,
    executeOrchestrator,

    // Session
    startSession,
    endSession,
    getSession,

    // History
    fetchRecentExecutions,

    // Clear
    clearStream,
    clearExecutions,
    clearError,
  };
}

export default useAgents;