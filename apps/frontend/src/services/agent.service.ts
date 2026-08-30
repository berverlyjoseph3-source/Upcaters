// apps/frontend/src/services/agent.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type AgentType = 'orchestrator' | 'email' | 'drive' | 'content' | 'social' | 'calendar' | 'web' | 'task';
export type AgentStatus = 'idle' | 'running' | 'error' | 'degraded' | 'maintenance' | 'initializing' | 'shutting_down';
export type ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled' | 'retrying' | 'timeout';

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
  isInitialized?: boolean;
  lastHeartbeat?: Date;
  capabilities?: string[];
  dependencies?: string[];
}

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  averageResponseTimeMs: number;
  p50ResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  lastExecutedAt?: Date;
  errorRate: number;
  successRate: number;
  requestsPerMinute: number;
  uptimePercentage: number;
}

export interface AgentHealth {
  agentType: AgentType;
  status: AgentStatus;
  isHealthy: boolean;
  metrics: AgentMetrics;
  lastHeartbeat: Date;
  message?: string;
  warnings?: string[];
  errors?: string[];
  diagnostics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    activeConnections?: number;
    queueLength?: number;
    responseTimeMs?: number;
  };
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  requiresApiCall: boolean;
  cost: number;
  category?: string;
  rateLimit?: {
    maxPerMinute: number;
    currentUsage: number;
    resetAt?: Date;
  };
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  required: boolean;
  description: string;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: {
    type: string;
    description?: string;
  };
  properties?: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
}

export interface AgentExecutionRequest {
  id?: string;
  input: string;
  sessionId?: string;
  agentType?: AgentType;
  action?: string;
  tool?: string;
  priority?: number;
  context?: Record<string, any>;
  stream?: boolean;
  timeout?: number;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

export interface AgentExecutionResponse {
  success: boolean;
  requestId: string;
  agentType: AgentType;
  output: any;
  error?: string;
  errorCode?: string;
  errorStack?: string;
  metadata: {
    executionTimeMs: number;
    tokensUsed: number;
    costUsd: number;
    retryCount: number;
    modelUsed?: string;
    providerUsed?: string;
  };
  timestamp: Date;
  warnings?: string[];
  suggestions?: string[];
}

export interface AgentStreamEvent {
  type: 'start' | 'thought' | 'action' | 'observation' | 'output' | 'error' | 'progress' | 'complete' | 'cancelled';
  content?: string;
  data?: any;
  metadata?: {
    agentType?: AgentType;
    step?: string;
    progress?: number;
    tokensUsed?: number;
    timestamp?: Date;
  };
}

export interface AgentSession {
  sessionId: string;
  agentType: AgentType;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
}

export interface AgentSessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  agentType?: AgentType;
  metadata?: Record<string, any>;
  tokensUsed?: number;
  costUsd?: number;
  timestamp: Date;
}

export interface IntentResult {
  primaryIntent: string;
  confidence: number;
  alternativeIntents: Array<{
    intent: string;
    confidence: number;
  }>;
  entities: Record<string, any>;
  suggestedAgent: AgentType;
  requiresMultipleAgents: boolean;
  agentChain?: AgentType[];
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTokens?: number;
  estimatedCost?: number;
  processingTimeMs?: number;
}

export interface TaskPlanStep {
  id: string;
  agentType: AgentType;
  action: string;
  tool?: string;
  input: any;
  dependsOn: string[];
  parallelGroup?: string;
  fallback?: {
    agentType: AgentType;
    action: string;
    tool?: string;
    input: any;
  };
  retryCount: number;
  maxRetries: number;
  timeout: number;
  estimatedTokens: number;
  estimatedCost: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface TaskPlan {
  id: string;
  sessionId?: string;
  steps: TaskPlanStep[];
  mode: 'sequential' | 'parallel' | 'conditional' | 'loop';
  estimatedTokens: number;
  estimatedCost: number;
  createdAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  metadata?: Record<string, any>;
}

export interface StepExecutionResult {
  stepId: string;
  agentType: AgentType;
  success: boolean;
  output: any;
  error?: string;
  executionTimeMs: number;
  tokensUsed: number;
  costUsd: number;
  retryCount: number;
  startedAt: Date;
  completedAt: Date;
}

export interface ChainExecutionResult {
  planId: string;
  steps: StepExecutionResult[];
  finalOutput: any;
  totalTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  success: boolean;
  error?: string;
  reflection?: string;
  metadata?: Record<string, any>;
}

export interface OrchestratorState {
  state: 'idle' | 'classifying_intent' | 'creating_plan' | 'executing' | 'reflecting' | 'responding' | 'error';
  intent?: IntentResult;
  plan?: TaskPlan;
  executionResults: Map<string, StepExecutionResult>;
  currentStepIndex: number;
  finalOutput?: any;
  error?: string;
  totalTokensUsed: number;
  totalCostUsd: number;
  retryCount: number;
  progress: number;
  estimatedTimeRemaining?: number;
}

// ============================================
// Agent Service
// ============================================

class AgentService {
  // ============================================
  // Agent Discovery
  // ============================================

  static async listAgents(): Promise<AgentInfo[]> {
    const response = await apiClient.get<{ agents: AgentInfo[] }>('/api/agent/agents');

    if (response.success && response.data) {
      return (response.data.agents || []).map(AgentService.transformAgent);
    }

    throw new Error(response.error || 'Failed to list agents');
  }

  static async getAgent(agentType: AgentType): Promise<AgentInfo> {
    const response = await apiClient.get<AgentInfo>(
      `/api/agent/agents/${agentType}`
    );

    if (response.success && response.data) {
      return AgentService.transformAgent(response.data);
    }

    throw new Error(response.error || 'Failed to get agent');
  }

  static async getAgentHealth(agentType: AgentType): Promise<AgentHealth> {
    const response = await apiClient.get<AgentHealth>(
      `/api/agent/health/${agentType}`
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        lastHeartbeat: new Date(response.data.lastHeartbeat),
        metrics: {
          ...response.data.metrics,
          lastExecutedAt: response.data.metrics.lastExecutedAt
            ? new Date(response.data.metrics.lastExecutedAt)
            : undefined,
        },
      };
    }

    throw new Error(response.error || 'Failed to get agent health');
  }

  static async getAllAgentsHealth(): Promise<Record<AgentType, AgentHealth>> {
    const response = await apiClient.get<Record<AgentType, AgentHealth>>(
      '/api/agent/status'
    );

    if (response.success && response.data) {
      const health: Record<AgentType, AgentHealth> = {} as Record<AgentType, AgentHealth>;
      for (const [type, data] of Object.entries(response.data)) {
        health[type as AgentType] = {
          ...data,
          lastHeartbeat: new Date(data.lastHeartbeat),
          metrics: {
            ...data.metrics,
            lastExecutedAt: data.metrics.lastExecutedAt
              ? new Date(data.metrics.lastExecutedAt)
              : undefined,
          },
        };
      }
      return health;
    }

    throw new Error(response.error || 'Failed to get agents health');
  }

  // ============================================
  // Agent Tools
  // ============================================

  static async getAgentTools(agentType: AgentType): Promise<AgentTool[]> {
    const response = await apiClient.get<{ tools: AgentTool[] }>(
      `/api/agent/agents/${agentType}/tools`
    );

    if (response.success && response.data) {
      return response.data.tools || [];
    }

    throw new Error(response.error || 'Failed to get agent tools');
  }

  static async getAllTools(): Promise<Record<AgentType, AgentTool[]>> {
    const response = await apiClient.get<Record<AgentType, AgentTool[]>>(
      '/api/agent/tools'
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get tools');
  }

  // ============================================
  // Agent Metrics
  // ============================================

  static async getAgentMetrics(
    agentType: AgentType,
    options?: {
      startDate?: Date;
      endDate?: Date;
      granularity?: 'hour' | 'day' | 'week' | 'month';
    }
  ): Promise<AgentMetrics> {
    const params: Record<string, any> = {
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      granularity: options?.granularity || 'day',
    };

    const response = await apiClient.get<AgentMetrics>(
      `/api/agent/metrics/${agentType}`,
      { params }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        lastExecutedAt: response.data.lastExecutedAt
          ? new Date(response.data.lastExecutedAt)
          : undefined,
      };
    }

    throw new Error(response.error || 'Failed to get agent metrics');
  }

  static async getAllMetrics(
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<Record<AgentType, AgentMetrics>> {
    const params: Record<string, any> = {
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
    };

    const response = await apiClient.get<Record<AgentType, AgentMetrics>>(
      '/api/agent/metrics',
      { params }
    );

    if (response.success && response.data) {
      const metrics: Record<AgentType, AgentMetrics> = {} as Record<AgentType, AgentMetrics>;
      for (const [type, data] of Object.entries(response.data)) {
        metrics[type as AgentType] = {
          ...data,
          lastExecutedAt: data.lastExecutedAt ? new Date(data.lastExecutedAt) : undefined,
        };
      }
      return metrics;
    }

    throw new Error(response.error || 'Failed to get metrics');
  }

  // ============================================
  // Agent Reset
  // ============================================

  static async resetAgentMetrics(agentType?: AgentType): Promise<void> {
    const response = await apiClient.post('/api/agent/reset-metrics', {
      agentType,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to reset metrics');
    }
  }

  static async resetAgent(agentType: AgentType): Promise<void> {
    const response = await apiClient.post(`/api/agent/agents/${agentType}/reset`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to reset agent');
    }
  }

  // ============================================
  // Agent Initialization
  // ============================================

  static async initializeAgent(agentType: AgentType): Promise<void> {
    const response = await apiClient.post(`/api/agent/agents/${agentType}/initialize`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to initialize agent');
    }
  }

  static async shutdownAgent(agentType: AgentType): Promise<void> {
    const response = await apiClient.post(`/api/agent/agents/${agentType}/shutdown`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to shutdown agent');
    }
  }

  static async restartAgent(agentType: AgentType): Promise<void> {
    const response = await apiClient.post(`/api/agent/agents/${agentType}/restart`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to restart agent');
    }
  }

  // ============================================
  // Agent Execution
  // ============================================

  static async executeAgent(
    request: AgentExecutionRequest
  ): Promise<AgentExecutionResponse> {
    const response = await apiClient.post<AgentExecutionResponse>(
      '/api/agent/execute',
      {
        input: request.input,
        sessionId: request.sessionId,
        agentType: request.agentType || 'orchestrator',
        action: request.action,
        tool: request.tool,
        priority: request.priority || 1,
        context: request.context,
        timeout: request.timeout,
        maxRetries: request.maxRetries,
        metadata: request.metadata,
      }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        timestamp: new Date(response.data.timestamp || Date.now()),
      };
    }

    throw new Error(response.error || 'Failed to execute agent');
  }

  static async executeAgentStream(
    request: AgentExecutionRequest,
    onEvent: (event: AgentStreamEvent) => void
  ): Promise<AgentExecutionResponse> {
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
        sessionId: request.sessionId,
        agentType: request.agentType || 'orchestrator',
        action: request.action,
        tool: request.tool,
        priority: request.priority || 1,
        context: request.context,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

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
            const event: AgentStreamEvent = {
              type: parsed.type || 'output',
              content: parsed.content || parsed.message,
              data: parsed.data,
              metadata: {
                agentType: parsed.metadata?.agentType || request.agentType,
                step: parsed.metadata?.step,
                progress: parsed.metadata?.progress,
                tokensUsed: parsed.metadata?.tokensUsed,
                timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
              },
            };

            onEvent(event);

            if (parsed.type === 'complete') {
              finalResponse = {
                success: true,
                requestId: parsed.data?.requestId || '',
                agentType: parsed.data?.agentType || request.agentType || 'orchestrator',
                output: parsed.data?.output,
                metadata: {
                  executionTimeMs: parsed.data?.metadata?.executionTimeMs || 0,
                  tokensUsed: parsed.data?.metadata?.tokensUsed || 0,
                  costUsd: parsed.data?.metadata?.costUsd || 0,
                  retryCount: parsed.data?.metadata?.retryCount || 0,
                  modelUsed: parsed.data?.metadata?.modelUsed,
                  providerUsed: parsed.data?.metadata?.providerUsed,
                },
                timestamp: new Date(),
              };
            }
          } catch (e) {}
        }
      }
    }

    if (finalResponse) return finalResponse;
    throw new Error('Stream ended without completion');
  }

  static async executeSpecificAgent(
    agentType: AgentType,
    input: string,
    options?: {
      sessionId?: string;
      action?: string;
      tool?: string;
      context?: Record<string, any>;
      stream?: boolean;
    }
  ): Promise<AgentExecutionResponse> {
    return AgentService.executeAgent({
      input,
      agentType,
      ...options,
    });
  }

  // ============================================
  // Intent Classification
  // ============================================

  static async classifyIntent(
    input: string,
    context?: Record<string, any>
  ): Promise<IntentResult> {
    const response = await apiClient.post<IntentResult>(
      '/api/agent/intent',
      { input, context }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to classify intent');
  }

  static async suggestAgents(
    input: string
  ): Promise<Array<{ agentType: AgentType; confidence: number; reason: string }>> {
    const response = await apiClient.post<{
      suggestions: Array<{ agentType: AgentType; confidence: number; reason: string }>;
    }>('/api/agent/suggest', { input });

    if (response.success && response.data) {
      return response.data.suggestions;
    }

    throw new Error(response.error || 'Failed to suggest agents');
  }

  // ============================================
  // Task Planning
  // ============================================

  static async createTaskPlan(
    intent: IntentResult,
    input: string,
    options?: {
      maxSteps?: number;
      sessionId?: string;
      enableParallelization?: boolean;
      enableFallbacks?: boolean;
      context?: Record<string, any>;
    }
  ): Promise<TaskPlan> {
    const response = await apiClient.post<TaskPlan>(
      '/api/agent/plan',
      {
        intent,
        input,
        maxSteps: options?.maxSteps || 10,
        sessionId: options?.sessionId,
        enableParallelization: options?.enableParallelization !== false,
        enableFallbacks: options?.enableFallbacks !== false,
        context: options?.context,
      }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        status: response.data.status || 'pending',
        progress: 0,
      };
    }

    throw new Error(response.error || 'Failed to create task plan');
  }

  static async getTaskPlan(planId: string): Promise<TaskPlan> {
    const response = await apiClient.get<TaskPlan>(
      `/api/agent/plan/${planId}`
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        status: response.data.status || 'pending',
        progress: response.data.progress || 0,
      };
    }

    throw new Error(response.error || 'Failed to get task plan');
  }

  static async executeTaskPlan(planId: string): Promise<ChainExecutionResult> {
    const response = await apiClient.post<ChainExecutionResult>(
      `/api/agent/plan/${planId}/execute`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to execute task plan');
  }

  // ============================================
  // Session Management
  // ============================================

  static async startSession(
    agentType?: AgentType
  ): Promise<AgentSession> {
    const response = await apiClient.post<AgentSession>(
      '/api/agent/session/start',
      { agentType }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        expiresAt: new Date(response.data.expiresAt),
        lastActivityAt: new Date(response.data.lastActivityAt),
      };
    }

    throw new Error(response.error || 'Failed to start session');
  }

  static async getSession(sessionId: string): Promise<AgentSession> {
    const response = await apiClient.get<AgentSession>(
      `/api/agent/session/${sessionId}`
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
        expiresAt: new Date(response.data.expiresAt),
        lastActivityAt: new Date(response.data.lastActivityAt),
      };
    }

    throw new Error(response.error || 'Failed to get session');
  }

  static async endSession(sessionId: string): Promise<void> {
    const response = await apiClient.post(`/api/agent/session/${sessionId}/end`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to end session');
    }
  }

  static async getSessionMessages(
    sessionId: string,
    limit: number = 50
  ): Promise<AgentSessionMessage[]> {
    const response = await apiClient.get<{ messages: AgentSessionMessage[] }>(
      `/api/agent/session/${sessionId}/messages`,
      { params: { limit } }
    );

    if (response.success && response.data) {
      return (response.data.messages || []).map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }

    throw new Error(response.error || 'Failed to get session messages');
  }

  static async listUserSessions(
    limit: number = 20
  ): Promise<AgentSession[]> {
    const response = await apiClient.get<{ sessions: AgentSession[] }>(
      '/api/agent/sessions',
      { params: { limit } }
    );

    if (response.success && response.data) {
      return (response.data.sessions || []).map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
        expiresAt: new Date(s.expiresAt),
        lastActivityAt: new Date(s.lastActivityAt),
      }));
    }

    throw new Error(response.error || 'Failed to list sessions');
  }

  static async deleteAllSessions(): Promise<void> {
    const response = await apiClient.delete('/api/agent/sessions');

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete sessions');
    }
  }

  // ============================================
  // Orchestrator
  // ============================================

  static async getOrchestratorState(): Promise<OrchestratorState> {
    const response = await apiClient.get<OrchestratorState>(
      '/api/agent/orchestrator/state'
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get orchestrator state');
  }

  static async cancelExecution(requestId: string): Promise<void> {
    const response = await apiClient.post(`/api/agent/execution/${requestId}/cancel`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to cancel execution');
    }
  }

  static async retryExecution(requestId: string): Promise<AgentExecutionResponse> {
    const response = await apiClient.post<AgentExecutionResponse>(
      `/api/agent/execution/${requestId}/retry`
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        timestamp: new Date(response.data.timestamp || Date.now()),
      };
    }

    throw new Error(response.error || 'Failed to retry execution');
  }

  // ============================================
  // Execution History
  // ============================================

  static async getExecutionHistory(
    options?: {
      agentType?: AgentType;
      status?: ExecutionStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ executions: AgentExecutionResponse[]; total: number }> {
    const params: Record<string, any> = {
      agentType: options?.agentType,
      status: options?.status,
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    };

    const response = await apiClient.get<{
      executions: AgentExecutionResponse[];
      total: number;
    }>('/api/agent/executions', { params });

    if (response.success && response.data) {
      return {
        executions: (response.data.executions || []).map(e => ({
          ...e,
          timestamp: new Date(e.timestamp || Date.now()),
        })),
        total: response.data.total || 0,
      };
    }

    throw new Error(response.error || 'Failed to get execution history');
  }

  static async getExecution(requestId: string): Promise<AgentExecutionResponse> {
    const response = await apiClient.get<AgentExecutionResponse>(
      `/api/agent/execution/${requestId}`
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        timestamp: new Date(response.data.timestamp || Date.now()),
      };
    }

    throw new Error(response.error || 'Failed to get execution');
  }

  static async deleteExecution(requestId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/execution/${requestId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete execution');
    }
  }

  static async clearExecutionHistory(): Promise<void> {
    const response = await apiClient.delete('/api/agent/executions');

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear history');
    }
  }

  // ============================================
  // Agent Configuration
  // ============================================

  static async getAgentConfig(agentType: AgentType): Promise<Record<string, any>> {
    const response = await apiClient.get<Record<string, any>>(
      `/api/agent/config/${agentType}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get agent config');
  }

  static async updateAgentConfig(
    agentType: AgentType,
    config: Record<string, any>
  ): Promise<void> {
    const response = await apiClient.put(
      `/api/agent/config/${agentType}`,
      config
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update agent config');
    }
  }

  // ============================================
  // Cost Estimation
  // ============================================

  static async estimateCost(
    input: string,
    agentType?: AgentType,
    options?: {
      maxTokens?: number;
      includeFallbacks?: boolean;
    }
  ): Promise<{
    estimatedTokens: number;
    estimatedCostUsd: number;
    estimatedTimeMs: number;
    breakdown?: Record<string, { tokens: number; cost: number }>;
  }> {
    const response = await apiClient.post<{
      estimatedTokens: number;
      estimatedCostUsd: number;
      estimatedTimeMs: number;
      breakdown?: Record<string, { tokens: number; cost: number }>;
    }>('/api/agent/estimate-cost', {
      input,
      agentType,
      ...options,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to estimate cost');
  }

  // ============================================
  // Rate Limits
  // ============================================

  static async getRateLimits(agentType?: AgentType): Promise<{
    global: { limit: number; remaining: number; resetAt: Date };
    agents: Record<string, { limit: number; remaining: number; resetAt: Date }>;
  }> {
    const response = await apiClient.get<{
      global: { limit: number; remaining: number; resetAt: string };
      agents: Record<string, { limit: number; remaining: number; resetAt: string }>;
    }>('/api/agent/rate-limits', { params: { agentType } });

    if (response.success && response.data) {
      return {
        global: {
          ...response.data.global,
          resetAt: new Date(response.data.global.resetAt),
        },
        agents: Object.entries(response.data.agents).reduce((acc, [key, val]) => ({
          ...acc,
          [key]: { ...val, resetAt: new Date(val.resetAt) },
        }), {}),
      };
    }

    throw new Error(response.error || 'Failed to get rate limits');
  }

  // ============================================
  // Diagnostics
  // ============================================

  static async runDiagnostics(agentType?: AgentType): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    results: Array<{
      test: string;
      passed: boolean;
      message?: string;
      durationMs: number;
    }>;
    summary: {
      total: number;
      passed: number;
      failed: number;
      durationMs: number;
    };
  }> {
    const response = await apiClient.post<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      results: Array<{
        test: string;
        passed: boolean;
        message?: string;
        durationMs: number;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        durationMs: number;
      };
    }>('/api/agent/diagnostics', { agentType });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to run diagnostics');
  }

  // ============================================
  // Transform Helpers
  // ============================================

  private static transformAgent(agent: any): AgentInfo {
    return {
      type: agent.type,
      name: agent.name,
      description: agent.description,
      version: agent.version || '1.0.0',
      status: agent.status || 'idle',
      icon: agent.icon,
      color: agent.color,
      gradient: agent.gradient,
      isConnected: agent.isConnected,
      isInitialized: agent.isInitialized,
      lastHeartbeat: agent.lastHeartbeat ? new Date(agent.lastHeartbeat) : undefined,
      capabilities: agent.capabilities,
      dependencies: agent.dependencies,
    };
  }

  // ============================================
  // Utility
  // ============================================

  static getAgentColor(agentType: AgentType): string {
    const colors: Record<AgentType, string> = {
      orchestrator: '#64748b',
      email: '#3b82f6',
      drive: '#10b981',
      content: '#8b5cf6',
      social: '#ec4899',
      calendar: '#f97316',
      web: '#14b8a6',
      task: '#6366f1',
    };
    return colors[agentType] || '#64748b';
  }

  static getAgentGradient(agentType: AgentType): string {
    const gradients: Record<AgentType, string> = {
      orchestrator: 'from-slate-500 to-slate-600',
      email: 'from-blue-500 to-blue-600',
      drive: 'from-green-500 to-green-600',
      content: 'from-purple-500 to-purple-600',
      social: 'from-pink-500 to-pink-600',
      calendar: 'from-orange-500 to-orange-600',
      web: 'from-teal-500 to-teal-600',
      task: 'from-indigo-500 to-indigo-600',
    };
    return gradients[agentType] || 'from-slate-500 to-slate-600';
  }

  static getAgentIcon(agentType: AgentType): string {
    const icons: Record<AgentType, string> = {
      orchestrator: '🧠',
      email: '📧',
      drive: '📁',
      content: '✨',
      social: '📱',
      calendar: '📅',
      web: '🌐',
      task: '✅',
    };
    return icons[agentType] || '🤖';
  }

  static getAgentName(agentType: AgentType): string {
    const names: Record<AgentType, string> = {
      orchestrator: 'Ultimate AI Agent',
      email: 'Email Agent',
      drive: 'Drive Agent',
      content: 'Content Agent',
      social: 'Social Agent',
      calendar: 'Calendar Agent',
      web: 'Web Agent',
      task: 'Task Agent',
    };
    return names[agentType] || agentType;
  }

  static getAgentDescription(agentType: AgentType): string {
    const descriptions: Record<AgentType, string> = {
      orchestrator: 'Central orchestrator that coordinates all agents for complex workflows',
      email: 'Smart email management with AI-powered replies and organization',
      drive: 'File management, search, sharing, and organization across Google Drive',
      content: 'Generate text, images, and videos using state-of-the-art AI models',
      social: 'Post to LinkedIn, Instagram, Facebook, and X (Twitter)',
      calendar: 'Smart scheduling, meeting management, and availability coordination',
      web: 'Web search, research, weather, and data extraction',
      task: 'Manage tasks across Google Tasks, Asana, and Monday.com',
    };
    return descriptions[agentType] || '';
  }
}

export default AgentService;