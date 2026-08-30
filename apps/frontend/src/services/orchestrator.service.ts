// enterprise-ai-agent-platform/apps/frontend/src/services/orchestrator.service.ts
import { apiClient } from '../api/client';
import {
  OrchestratorStateType,
  IntentResult,
  ClassificationOptions,
  TaskPlan,
  PlanningOptions,
  ExecutionMode,
  ChainExecutionResult,
  ExecutionOptions,
  StepExecutionResult,
  ExecutionProgress,
  ExecutionReflection,
  MemoryType,
  MemoryRetrievalOptions,
  MemoryRetrievalResult,
  OrchestratorMemoryEntry,
  OrchestratorConfig,
  OrchestratorMetrics,
  OrchestratorHealthStatus,
  OrchestratorSession,
  AgentDelegationRequest,
  AgentDelegationResult,
  BatchExecutionRequest,
  BatchExecutionResult,
  OrchestratorStreamChunk,
  OrchestratorStreamChunkType,
  FollowUpSuggestion,
  OrchestratorFeedback,
  ReflectionFeedback,
  AgentCapability,
  AgentMatchResult,
} from '../types/orchestrator.types';

// ============================================
// SSE Stream Types
// ============================================

export interface StreamCallbacks {
  onChunk?: (chunk: OrchestratorStreamChunk) => void;
  onIntent?: (intent: IntentResult) => void;
  onPlan?: (plan: TaskPlan) => void;
  onStepStart?: (stepId: string, agentType: string) => void;
  onStepProgress?: (stepId: string, progress: number) => void;
  onStepComplete?: (result: StepExecutionResult) => void;
  onError?: (error: string) => void;
  onComplete?: (response: any) => void;
  onStateChange?: (state: OrchestratorStateType) => void;
}

export interface StreamController {
  abort: () => void;
  isStreaming: () => boolean;
}

// ============================================
// Cache Types
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================
// API Response Helper Types
// ============================================

// These are the actual shapes returned by the API
interface ApiIntentResponse {
  success: boolean;
  data?: IntentResult;
  error?: string;
}

interface ApiPlanResponse {
  success: boolean;
  data?: TaskPlan;
  error?: string;
}

interface ApiPlanOptimizationResponse {
  success: boolean;
  data?: TaskPlan;
  optimization?: {
    originalSteps: number;
    optimizedSteps: number;
    savingsPercentage: number;
    changes: string[];
  };
  error?: string;
}

interface ApiExecutionResponse {
  success: boolean;
  data?: ChainExecutionResult;
  error?: string;
}

interface ApiTextGenerationResponse {
  success: boolean;
  data?: {
    content: string;
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
  };
  error?: string;
}

interface ApiStepExecutionResponse {
  success: boolean;
  data?: StepExecutionResult;
  error?: string;
}

interface ApiExecutionProgressResponse {
  success: boolean;
  data?: ExecutionProgress;
  error?: string;
}

interface ApiAgentsResponse {
  success: boolean;
  data?: AgentCapability[];
  error?: string;
}

interface ApiAgentMatchResponse {
  success: boolean;
  data?: AgentMatchResult;
  error?: string;
}

interface ApiDelegationResponse {
  success: boolean;
  data?: AgentDelegationResult;
  error?: string;
}

interface ApiBatchExecutionResponse {
  success: boolean;
  data?: BatchExecutionResult;
  error?: string;
}

interface ApiReflectionResponse {
  success: boolean;
  data?: ExecutionReflection;
  error?: string;
}

interface ApiReflectionHistoryResponse {
  success: boolean;
  data?: Array<{
    id: string;
    executionId: string;
    reflection: ExecutionReflection;
    createdAt: string;
  }>;
  error?: string;
}

interface ApiFollowUpsResponse {
  success: boolean;
  data?: FollowUpSuggestion[];
  error?: string;
}

interface ApiMemoryResponse {
  success: boolean;
  data?: OrchestratorMemoryEntry & { timestamp?: string };
  error?: string;
}

interface ApiMemoryRetrievalResponse {
  success: boolean;
  data?: MemoryRetrievalResult;
  error?: string;
}

interface ApiMemoryStatsResponse {
  success: boolean;
  data?: {
    totalMemories: number;
    shortTermCount: number;
    longTermCount: number;
    averageImportance: number;
  };
  error?: string;
}

interface ApiMemoryConsolidateResponse {
  success: boolean;
  data?: { consolidated: number };
  error?: string;
}

interface ApiSessionResponse {
  success: boolean;
  data?: OrchestratorSession;
  error?: string;
}

interface ApiSessionsResponse {
  success: boolean;
  data?: OrchestratorSession[];
  error?: string;
}

interface ApiHealthResponse {
  success: boolean;
  data?: OrchestratorHealthStatus;
  error?: string;
}

interface ApiMetricsResponse {
  success: boolean;
  data?: OrchestratorMetrics;
  error?: string;
}

interface ApiIntentBatchResponse {
  success: boolean;
  data?: IntentResult[];
  error?: string;
}

// ============================================
// Orchestrator Service Class
// ============================================

export class OrchestratorService {
  private static instance: OrchestratorService;
  private config: OrchestratorConfig;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private activeStreams: Map<string, AbortController> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private metricsBuffer: Array<{ name: string; value: number; timestamp: Date }> = [];
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly METRICS_FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.config = this.getDefaultConfig();
    this.startMetricsFlush();
  }

  // ============================================
  // Singleton
  // ============================================

  static getInstance(): OrchestratorService {
    if (!OrchestratorService.instance) {
      OrchestratorService.instance = new OrchestratorService();
    }
    return OrchestratorService.instance;
  }

  // ============================================
  // Configuration
  // ============================================

  private getDefaultConfig(): OrchestratorConfig {
    return {
      maxStepsPerPlan: 10,
      maxRetriesPerStep: 3,
      maxConcurrentExecutions: 3,
      defaultTimeoutMs: 30000,
      enableAutomaticFallbacks: true,
      enablePlanOptimization: true,
      enableMemoryConsolidation: true,
      enableExecutionReflection: true,
      defaultModel: 'gpt-4',
      modelFallbackChain: ['openai', 'anthropic', 'gemini'],
      streamGeneration: true,
      classificationOptions: {
        confidenceThreshold: 0.6,
        maxAlternatives: 3,
        useCache: true,
        cacheTTL: 3600,
        useAIFallback: true,
        extractEntities: true,
        includeComplexityEstimation: true,
        preferredMethod: 'hybrid',
      },
      planningOptions: {
        maxSteps: 10,
        enableParallelization: true,
        enableFallbacks: true,
        estimatedCost: true,
        optimizationGoal: 'balanced',
        maxDepth: 3,
        timeout: 15000,
      },
      executionOptions: {
        maxRetries: 3,
        parallel: true,
        stopOnError: false,
        timeout: 60000,
        storeInMemory: true,
        generateEmbeddings: true,
      },
      memoryOptions: {
        maxShortTermEntries: 50,
        shortTermTTLSeconds: 3600,
        longTermImportanceThreshold: 0.7,
        enableVectorSearch: true,
      },
      rateLimiting: {
        requestsPerMinute: 60,
        tokensPerMinute: 90000,
        costPerHour: 50,
      },
    };
  }

  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config:updated', this.config);
  }

  resetConfig(): void {
    this.config = this.getDefaultConfig();
    this.emit('config:reset', this.config);
  }

  // ============================================
  // Cache Management
  // ============================================

  private getCacheKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_CACHE_TTL): void {
    // Evict oldest entries if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clearCache(prefix?: string): void {
    if (prefix) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // ============================================
  // Event System
  // ============================================

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // ============================================
  // Metrics
  // ============================================

  private startMetricsFlush(): void {
    setInterval(() => {
      this.flushMetrics();
    }, this.METRICS_FLUSH_INTERVAL);
  }

  private recordMetric(name: string, value: number): void {
    this.metricsBuffer.push({
      name,
      value,
      timestamp: new Date(),
    });
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await apiClient.post('/api/agent/metrics/batch', { metrics });
    } catch (error) {
      // Re-queue failed metrics
      this.metricsBuffer.unshift(...metrics.slice(-50));
    }
  }

  // ============================================
  // Intent Classification
  // ============================================

  async classifyIntent(
    input: string,
    options?: ClassificationOptions
  ): Promise<IntentResult> {
    const cacheKey = this.getCacheKey('intent', { input, ...options });

    // Check cache
    if (options?.useCache !== false) {
      const cached = this.getFromCache<IntentResult>(cacheKey);
      if (cached) {
        this.recordMetric('intent.cache.hit', 1);
        return cached;
      }
    }

    this.recordMetric('intent.cache.miss', 1);

    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiIntentResponse>('/api/agent/classify-intent', {
        input,
        options: {
          ...this.config.classificationOptions,
          ...options,
        },
      });

      if (response.success && response.data) {
        const intent = response.data as unknown as IntentResult;
        this.setCache(cacheKey, intent, (options?.cacheTTL || 3600) * 1000);
        this.recordMetric('intent.classify.success', 1);
        this.recordMetric('intent.classify.duration', performance.now() - startTime);
        this.emit('intent:classified', intent);
        return intent;
      }

      throw new Error(response.error || 'Classification failed');
    } catch (error) {
      this.recordMetric('intent.classify.error', 1);
      this.emit('intent:error', error);
      throw error;
    }
  }

  async classifyIntentBatch(
    inputs: string[],
    options?: ClassificationOptions
  ): Promise<IntentResult[]> {
    try {
      const response = await apiClient.post<ApiIntentBatchResponse>(
        '/api/agent/classify-intent/batch',
        {
          inputs,
          options: {
            ...this.config.classificationOptions,
            ...options,
          },
        }
      );

      if (response.success && response.data) {
        return response.data as unknown as IntentResult[];
      }

      throw new Error(response.error || 'Batch classification failed');
    } catch (error) {
      this.emit('intent:batch:error', error);
      throw error;
    }
  }

  // ============================================
  // Plan Management
  // ============================================

  async createPlan(
    intent: IntentResult,
    options?: PlanningOptions
  ): Promise<TaskPlan> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiPlanResponse>('/api/agent/create-plan', {
        intent,
        options: {
          ...this.config.planningOptions,
          ...options,
        },
      });

      if (response.success && response.data) {
        const plan = response.data as unknown as TaskPlan;
        this.recordMetric('plan.create.success', 1);
        this.recordMetric('plan.create.duration', performance.now() - startTime);
        this.emit('plan:created', plan);
        return plan;
      }

      throw new Error(response.error || 'Plan creation failed');
    } catch (error) {
      this.recordMetric('plan.create.error', 1);
      this.emit('plan:error', error);
      throw error;
    }
  }

  async optimizePlan(
    plan: TaskPlan,
    optimizationGoal?: 'speed' | 'cost' | 'accuracy' | 'balanced'
  ): Promise<TaskPlan> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiPlanOptimizationResponse>(
        '/api/agent/optimize-plan',
        {
          plan,
          optimizationGoal: optimizationGoal || 'balanced',
        }
      );

      if (response.success && response.data) {
        const responseData = response as unknown as ApiPlanOptimizationResponse;
        const optimizedPlan: TaskPlan = {
          ...responseData.data,
        } as unknown as TaskPlan;

        if (responseData.optimization) {
          (optimizedPlan as any).optimization = responseData.optimization;
        }

        this.recordMetric('plan.optimize.success', 1);
        this.recordMetric('plan.optimize.duration', performance.now() - startTime);
        this.emit('plan:optimized', optimizedPlan);
        return optimizedPlan;
      }

      throw new Error(response.error || 'Plan optimization failed');
    } catch (error) {
      this.recordMetric('plan.optimize.error', 1);
      this.emit('plan:optimize:error', error);
      throw error;
    }
  }

  async validatePlan(plan: TaskPlan): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    info: string[];
    suggestions?: string[];
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data?: {
          valid: boolean;
          errors: string[];
          warnings: string[];
          info: string[];
          suggestions?: string[];
        };
      }>('/api/agent/validate-plan', { plan });

      if (response.success && response.data) {
        const data = response.data as unknown as {
          valid: boolean;
          errors: string[];
          warnings: string[];
          info: string[];
          suggestions?: string[];
        };
        return {
          valid: data.valid,
          errors: data.errors,
          warnings: data.warnings,
          info: data.info,
          suggestions: data.suggestions,
        };
      }

      return this.clientSideValidatePlan(plan);
    } catch (error) {
      return this.clientSideValidatePlan(plan);
    }
  }

  private clientSideValidatePlan(plan: TaskPlan): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    info: string[];
    suggestions?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];
    const suggestions: string[] = [];
    const stepIds = new Set<string>();

    for (const step of plan.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      for (const depId of step.dependsOn) {
        if (depId === step.id) {
          errors.push(`Step "${step.id}" cannot depend on itself`);
        }
      }

      if (!step.agentType) {
        errors.push(`Step "${step.id}" has no agent type specified`);
      }
    }

    if (plan.steps.length > 1) {
      plan.steps.forEach((step, index) => {
        if (index > 0 && step.dependsOn.length === 0) {
          info.push(`Step "${step.id}" has no dependencies - may execute independently`);
        }
        if (step.dependsOn.length > 0) {
          for (const depId of step.dependsOn) {
            if (!stepIds.has(depId)) {
              warnings.push(`Step "${step.id}" depends on non-existent step: ${depId}`);
            }
          }
        }
      });
    }

    if (plan.steps.length === 0) {
      errors.push('Plan has no steps');
    }

    const independentSteps = plan.steps.filter((s) => s.dependsOn.length === 0);
    if (independentSteps.length > 1 && plan.mode === ExecutionMode.SEQUENTIAL) {
      suggestions.push(
        `Consider using parallel execution for ${independentSteps.length} independent steps`
      );
    }

    const stepsWithoutFallbacks = plan.steps.filter((s) => !s.fallback);
    if (stepsWithoutFallbacks.length > 3) {
      suggestions.push(`Consider adding fallbacks for critical steps`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  // ============================================
  // Execution
  // ============================================

  async executePlan(
    plan: TaskPlan,
    options?: ExecutionOptions
  ): Promise<ChainExecutionResult> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiExecutionResponse>(
        '/api/agent/execute-plan',
        {
          plan,
          options: {
            ...this.config.executionOptions,
            ...options,
            executionId: options?.executionId || `exec_${Date.now()}`,
          },
        }
      );

      if (response.success && response.data) {
        const execution = response.data as unknown as ChainExecutionResult;
        this.recordMetric('execution.success', 1);
        if (execution.totalTimeMs) {
          this.recordMetric('execution.total_time', execution.totalTimeMs);
        }
        if (execution.totalTokensUsed) {
          this.recordMetric('execution.tokens', execution.totalTokensUsed);
        }
        if (execution.totalCostUsd) {
          this.recordMetric('execution.cost', execution.totalCostUsd);
        }
        this.emit('execution:completed', execution);

        if (this.config.enableExecutionReflection && !execution.success) {
          this.generateReflection(execution).catch(console.error);
        }

        return execution;
      }

      throw new Error(response.error || 'Execution failed');
    } catch (error) {
      this.recordMetric('execution.error', 1);
      this.emit('execution:error', error);
      throw error;
    }
  }

  async executePlanStream(
    plan: TaskPlan,
    callbacks: StreamCallbacks,
    options?: ExecutionOptions
  ): Promise<StreamController> {
    const abortController = new AbortController();
    const executionId = options?.executionId || `exec_${Date.now()}`;
    let isStreaming = true;

    this.activeStreams.set(executionId, abortController);

    const streamController: StreamController = {
      abort: () => {
        abortController.abort();
        isStreaming = false;
        this.activeStreams.delete(executionId);
        callbacks.onError?.('Execution cancelled by user');
      },
      isStreaming: () => isStreaming,
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/agent/execute-plan/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiClient.getAccessToken()}`,
          },
          body: JSON.stringify({
            plan,
            options: {
              ...this.config.executionOptions,
              ...options,
              executionId,
            },
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Stream error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader not available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              isStreaming = false;
              this.activeStreams.delete(executionId);
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  isStreaming = false;
                  this.activeStreams.delete(executionId);
                  continue;
                }

                try {
                  const parsed = JSON.parse(data) as OrchestratorStreamChunk;
                  this.processStreamChunk(parsed, callbacks);
                } catch (parseError) {
                  console.warn('Failed to parse stream chunk:', parseError);
                }
              }
            }
          }

          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6);
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data) as OrchestratorStreamChunk;
                this.processStreamChunk(parsed, callbacks);
              } catch {
                // Ignore
              }
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            callbacks.onError?.((error as Error).message);
            this.emit('stream:error', error);
          }
        }
      };

      processStream();

      return streamController;
    } catch (error) {
      isStreaming = false;
      this.activeStreams.delete(executionId);

      if ((error as Error).name !== 'AbortError') {
        callbacks.onError?.((error as Error).message);
      }

      throw error;
    }
  }

  private processStreamChunk(
    chunk: OrchestratorStreamChunk,
    callbacks: StreamCallbacks
  ): void {
    callbacks.onChunk?.(chunk);

    switch (chunk.type) {
      case OrchestratorStreamChunkType.INTENT_RESULT:
        if (chunk.metadata?.intent) {
          callbacks.onIntent?.(chunk.metadata.intent);
          this.emit('stream:intent', chunk.metadata.intent);
        }
        if (chunk.metadata?.state) {
          callbacks.onStateChange?.(chunk.metadata.state);
        }
        break;

      case OrchestratorStreamChunkType.PLAN_CREATED:
        if (chunk.metadata?.plan) {
          callbacks.onPlan?.(chunk.metadata.plan);
          this.emit('stream:plan', chunk.metadata.plan);
        }
        break;

      case OrchestratorStreamChunkType.STEP_STARTED:
        if (chunk.metadata?.stepId) {
          callbacks.onStepStart?.(
            chunk.metadata.stepId,
            chunk.metadata.agentType || 'unknown'
          );
        }
        break;

      case OrchestratorStreamChunkType.STEP_PROGRESS:
        if (chunk.metadata?.stepId && chunk.progress) {
          callbacks.onStepProgress?.(chunk.metadata.stepId, chunk.progress);
        }
        break;

      case OrchestratorStreamChunkType.STEP_COMPLETED:
        if (chunk.metadata?.result) {
          callbacks.onStepComplete?.(chunk.metadata.result);
        }
        break;

      case OrchestratorStreamChunkType.ERROR:
        callbacks.onError?.(chunk.content);
        break;

      case OrchestratorStreamChunkType.FINAL_OUTPUT:
        if (chunk.metadata?.response) {
          callbacks.onComplete?.(chunk.metadata.response);
          this.emit('stream:complete', chunk.metadata.response);
        }
        break;
    }
  }

  cancelExecution(executionId: string): boolean {
    const controller = this.activeStreams.get(executionId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(executionId);
      this.emit('execution:cancelled', executionId);
      return true;
    }
    return false;
  }

  cancelAllExecutions(): number {
    let count = 0;
    for (const controller of this.activeStreams.values()) {
      controller.abort();
      count++;
    }
    this.activeStreams.clear();
    this.emit('execution:all:cancelled', count);
    return count;
  }

  async getExecutionProgress(executionId: string): Promise<ExecutionProgress | null> {
    try {
      const response = await apiClient.get<ApiExecutionProgressResponse>(
        `/api/agent/executions/${executionId}/progress`
      );

      if (response.success && response.data) {
        return response.data as unknown as ExecutionProgress;
      }
      return null;
    } catch (error) {
      this.emit('execution:progress:error', error);
      return null;
    }
  }

  async retryFailedStep(
    executionId: string,
    stepId: string
  ): Promise<StepExecutionResult | null> {
    try {
      const response = await apiClient.post<ApiStepExecutionResponse>(
        `/api/agent/executions/${executionId}/steps/${stepId}/retry`
      );

      if (response.success && response.data) {
        const result = response.data as unknown as StepExecutionResult;
        this.emit('step:retried', { executionId, stepId, result });
        return result;
      }

      return null;
    } catch (error) {
      this.emit('step:retry:error', { executionId, stepId, error });
      return null;
    }
  }

  // ============================================
  // Agent Management
  // ============================================

  async getAvailableAgents(
    includeTools: boolean = true,
    includeMetrics: boolean = true
  ): Promise<AgentCapability[]> {
    const cacheKey = this.getCacheKey('agents', { includeTools, includeMetrics });
    const cached = this.getFromCache<AgentCapability[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.get<ApiAgentsResponse>('/api/agent/agents', {
        includeTools,
        includeMetrics,
      });

      if (response.success && response.data) {
        const agents = response.data as unknown as AgentCapability[];
        this.setCache(cacheKey, agents, 60000);
        return agents;
      }

      throw new Error(response.error || 'Failed to fetch agents');
    } catch (error) {
      this.emit('agents:error', error);
      throw error;
    }
  }

  async matchAgentForTask(task: string): Promise<AgentMatchResult> {
    try {
      const response = await apiClient.post<ApiAgentMatchResponse>(
        '/api/agent/match',
        { task }
      );

      if (response.success && response.data) {
        return response.data as unknown as AgentMatchResult;
      }

      throw new Error(response.error || 'Agent matching failed');
    } catch (error) {
      this.emit('agents:match:error', error);
      throw error;
    }
  }

  async delegateToAgent(
    request: AgentDelegationRequest
  ): Promise<AgentDelegationResult> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiDelegationResponse>(
        '/api/agent/delegate',
        request
      );

      if (response.success && response.data) {
        const result = response.data as unknown as AgentDelegationResult;
        this.recordMetric('delegate.success', 1);
        this.recordMetric('delegate.duration', performance.now() - startTime);
        this.emit('delegate:completed', result);
        return result;
      }

      throw new Error(response.error || 'Delegation failed');
    } catch (error) {
      this.recordMetric('delegate.error', 1);
      this.emit('delegate:error', error);
      throw error;
    }
  }

  // ============================================
  // Batch Execution
  // ============================================

  async executeBatch(
    request: BatchExecutionRequest
  ): Promise<BatchExecutionResult> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiBatchExecutionResponse>(
        '/api/agent/batch-execute',
        request
      );

      if (response.success && response.data) {
        const result = response.data as unknown as BatchExecutionResult;
        this.recordMetric('batch.success', 1);
        this.recordMetric('batch.duration', performance.now() - startTime);
        this.emit('batch:completed', result);
        return result;
      }

      throw new Error(response.error || 'Batch execution failed');
    } catch (error) {
      this.recordMetric('batch.error', 1);
      this.emit('batch:error', error);
      throw error;
    }
  }

  // ============================================
  // Reflection & Analysis
  // ============================================

  async generateReflection(
    executionResults: ChainExecutionResult
  ): Promise<ExecutionReflection> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiReflectionResponse>(
        '/api/agent/reflect',
        {
          executionResults,
          options: {
            storeInsights: this.config.enableMemoryConsolidation,
            generateEmbeddings: this.config.memoryOptions.enableVectorSearch,
          },
        }
      );

      if (response.success && response.data) {
        const reflection = response.data as unknown as ExecutionReflection;
        this.recordMetric('reflection.success', 1);
        this.recordMetric('reflection.duration', performance.now() - startTime);
        this.emit('reflection:generated', reflection);
        return reflection;
      }

      throw new Error(response.error || 'Reflection generation failed');
    } catch (error) {
      this.recordMetric('reflection.error', 1);
      this.emit('reflection:error', error);
      throw error;
    }
  }

  async getReflectionHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<
    Array<{
      id: string;
      executionId: string;
      reflection: ExecutionReflection;
      createdAt: Date;
    }>
  > {
    try {
      const response = await apiClient.get<ApiReflectionHistoryResponse>(
        '/api/agent/reflections',
        { limit, offset }
      );

      if (response.success && response.data) {
        const data = response.data as unknown as Array<{
          id: string;
          executionId: string;
          reflection: ExecutionReflection;
          createdAt: string;
        }>;
        return data.map((r) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        }));
      }

      return [];
    } catch (error) {
      this.emit('reflection:history:error', error);
      return [];
    }
  }

  async suggestFollowUps(
    executionResults: any,
    count: number = 3
  ): Promise<FollowUpSuggestion[]> {
    try {
      const response = await apiClient.post<ApiFollowUpsResponse>(
        '/api/agent/suggest-follow-ups',
        {
          executionResults,
          count,
        }
      );

      if (response.success && response.data) {
        const suggestions = response.data as unknown as FollowUpSuggestion[];
        this.emit('followups:generated', suggestions);
        return suggestions;
      }

      return [];
    } catch (error) {
      this.emit('followups:error', error);
      return [];
    }
  }

  // ============================================
  // Memory Management
  // ============================================

  async storeMemory(
    content: string,
    type: MemoryType = MemoryType.SHORT_TERM,
    importance: number = 0.5,
    metadata?: Record<string, any>
  ): Promise<OrchestratorMemoryEntry> {
    try {
      const response = await apiClient.post<ApiMemoryResponse>(
        '/api/agent/memories',
        {
          content,
          type,
          importance,
          metadata,
          generateEmbedding: this.config.memoryOptions.enableVectorSearch,
        }
      );

      if (response.success && response.data) {
        const responseData = response.data as unknown as OrchestratorMemoryEntry & { timestamp?: string };
        const memory: OrchestratorMemoryEntry = {
          ...responseData,
          timestamp: responseData.timestamp
            ? new Date(responseData.timestamp)
            : new Date(),
        } as unknown as OrchestratorMemoryEntry;
        this.emit('memory:stored', memory);
        return memory;
      }

      throw new Error(response.error || 'Failed to store memory');
    } catch (error) {
      this.emit('memory:error', error);
      throw error;
    }
  }

  async retrieveMemories(
    query: string,
    options?: MemoryRetrievalOptions
  ): Promise<MemoryRetrievalResult> {
    const cacheKey = this.getCacheKey('memories', { query, ...options });
    const cached = this.getFromCache<MemoryRetrievalResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await apiClient.post<ApiMemoryRetrievalResponse>(
        '/api/agent/memories/search',
        {
          query,
          options: {
            limit: 10,
            minImportance: 0.3,
            sortBy: 'similarity',
            ...options,
          },
        }
      );

      if (response.success && response.data) {
        const result = response.data as unknown as MemoryRetrievalResult;
        this.setCache(cacheKey, result, 30000);
        this.emit('memory:retrieved', result);
        return result;
      }

      throw new Error(response.error || 'Memory retrieval failed');
    } catch (error) {
      this.emit('memory:retrieve:error', error);
      throw error;
    }
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/agent/memories/${memoryId}`);
      if (response.success) {
        this.emit('memory:deleted', memoryId);
        return true;
      }
      return false;
    } catch (error) {
      this.emit('memory:delete:error', error);
      return false;
    }
  }

  async clearMemories(type?: MemoryType): Promise<boolean> {
    try {
      const params = type ? { type } : {};
      const response = await apiClient.post('/api/agent/memories/clear', params);
      if (response.success) {
        this.clearCache('memories');
        this.emit('memory:cleared', type);
        return true;
      }
      return false;
    } catch (error) {
      this.emit('memory:clear:error', error);
      return false;
    }
  }

  async consolidateMemories(): Promise<number> {
    try {
      const response = await apiClient.post<ApiMemoryConsolidateResponse>(
        '/api/agent/memories/consolidate',
        {
          options: {
            minImportance: this.config.memoryOptions.longTermImportanceThreshold,
            generateEmbeddings: this.config.memoryOptions.enableVectorSearch,
          },
        }
      );

      if (response.success && response.data) {
        const responseData = response.data as unknown as { consolidated: number };
        const count = responseData.consolidated || 0;
        this.clearCache('memories');
        this.emit('memory:consolidated', count);
        return count;
      }

      return 0;
    } catch (error) {
      this.emit('memory:consolidate:error', error);
      return 0;
    }
  }

  async getMemoryStats(): Promise<{
    totalMemories: number;
    shortTermCount: number;
    longTermCount: number;
    averageImportance: number;
  }> {
    try {
      const response = await apiClient.get<ApiMemoryStatsResponse>(
        '/api/agent/memories/stats'
      );

      if (response.success && response.data) {
        const data = response.data as unknown as {
          totalMemories: number;
          shortTermCount: number;
          longTermCount: number;
          averageImportance: number;
        };
        return {
          totalMemories: data.totalMemories,
          shortTermCount: data.shortTermCount,
          longTermCount: data.longTermCount,
          averageImportance: data.averageImportance,
        };
      }

      return {
        totalMemories: 0,
        shortTermCount: 0,
        longTermCount: 0,
        averageImportance: 0,
      };
    } catch (error) {
      return {
        totalMemories: 0,
        shortTermCount: 0,
        longTermCount: 0,
        averageImportance: 0,
      };
    }
  }

  // ============================================
  // Session Management
  // ============================================

  async createSession(userId?: string): Promise<OrchestratorSession> {
    try {
      const response = await apiClient.post<ApiSessionResponse>(
        '/api/agent/sessions',
        { userId }
      );

      if (response.success && response.data) {
        const session = response.data as unknown as OrchestratorSession;
        this.emit('session:created', session);
        return session;
      }

      throw new Error(response.error || 'Failed to create session');
    } catch (error) {
      this.emit('session:error', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<OrchestratorSession | null> {
    try {
      const response = await apiClient.get<ApiSessionResponse>(
        `/api/agent/sessions/${sessionId}`
      );

      if (response.success && response.data) {
        return response.data as unknown as OrchestratorSession;
      }
      return null;
    } catch (error) {
      this.emit('session:error', error);
      return null;
    }
  }

  async getUserSessions(userId?: string): Promise<OrchestratorSession[]> {
    try {
      const response = await apiClient.get<ApiSessionsResponse>(
        '/api/agent/sessions',
        { userId }
      );

      if (response.success && response.data) {
        return response.data as unknown as OrchestratorSession[];
      }
      return [];
    } catch (error) {
      this.emit('sessions:error', error);
      return [];
    }
  }

  async endSession(sessionId: string): Promise<boolean> {
    try {
      const response = await apiClient.post(
        `/api/agent/sessions/${sessionId}/end`
      );
      if (response.success) {
        this.emit('session:ended', sessionId);
        return true;
      }
      return false;
    } catch (error) {
      this.emit('session:end:error', error);
      return false;
    }
  }

  async exportSession(sessionId: string, format: 'json' | 'csv' = 'json'): Promise<any> {
    try {
      const response = await apiClient.get(
        `/api/agent/sessions/${sessionId}/export`,
        { format }
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.emit('session:export:error', error);
      return null;
    }
  }

  async importSession(data: any): Promise<OrchestratorSession | null> {
    try {
      const response = await apiClient.post<ApiSessionResponse>(
        '/api/agent/sessions/import',
        { data }
      );

      if (response.success && response.data) {
        const session = response.data as unknown as OrchestratorSession;
        this.emit('session:imported', session);
        return session;
      }
      return null;
    } catch (error) {
      this.emit('session:import:error', error);
      return null;
    }
  }

  // ============================================
  // AI Text Generation (with fallback)
  // ============================================

  async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      preferredProvider?: string;
    }
  ): Promise<{
    content: string;
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
  }> {
    const startTime = performance.now();

    try {
      const response = await apiClient.post<ApiTextGenerationResponse>(
        '/api/agent/generate-text',
        {
          prompt,
          options,
          preferredProvider: options?.preferredProvider || this.config.defaultModel,
          fallbackChain: this.config.modelFallbackChain,
        }
      );

      if (response.success && response.data) {
        const data = response.data as unknown as {
          content: string;
          model: string;
          provider: string;
          tokensUsed: number;
          costUsd: number;
        };
        this.recordMetric('text.generate.success', 1);
        this.recordMetric('text.generate.tokens', data.tokensUsed);
        this.recordMetric('text.generate.duration', performance.now() - startTime);
        return data;
      }

      throw new Error(response.error || 'Text generation failed');
    } catch (error) {
      this.recordMetric('text.generate.error', 1);
      throw error;
    }
  }

  async generateTextStream(
    prompt: string,
    onChunk: (chunk: { type: string; content: string; progress: number }) => void,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      preferredProvider?: string;
    }
  ): Promise<{
    content: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
  }> {
    const abortController = new AbortController();
    const streamId = `text_${Date.now()}`;
    this.activeStreams.set(streamId, abortController);
    let fullContent = '';

    onChunk({ type: 'start', content: 'Starting text generation...', progress: 0 });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/agent/generate-text/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiClient.getAccessToken()}`,
          },
          body: JSON.stringify({
            prompt,
            options: {
              ...options,
              preferredProvider:
                options?.preferredProvider || this.config.defaultModel,
              fallbackChain: this.config.modelFallbackChain,
            },
          }),
          signal: abortController.signal,
        }
      );

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream reader not available');

      const decoder = new TextDecoder();
      let buffer = '';
      let result: {
        content: string;
        provider: string;
        tokensUsed: number;
        costUsd: number;
      } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content' && parsed.content) {
                fullContent += parsed.content;
                onChunk({
                  type: 'content',
                  content: parsed.content,
                  progress: parsed.progress || 50,
                });
              } else if (parsed.type === 'complete') {
                result = parsed;
              } else if (parsed.type === 'error') {
                onChunk({ type: 'error', content: parsed.content, progress: 0 });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      onChunk({ type: 'complete', content: '', progress: 100 });

      if (result) {
        return result;
      }

      return {
        content: fullContent,
        provider: 'unknown',
        tokensUsed: Math.ceil(fullContent.length / 4),
        costUsd: 0,
      };
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  // ============================================
  // Feedback
  // ============================================

  async submitFeedback(feedback: OrchestratorFeedback): Promise<boolean> {
    try {
      const response = await apiClient.post('/api/agent/feedback', feedback);
      if (response.success) {
        this.emit('feedback:submitted', feedback);
        return true;
      }
      return false;
    } catch (error) {
      this.emit('feedback:error', error);
      return false;
    }
  }

  async submitReflectionFeedback(feedback: ReflectionFeedback): Promise<boolean> {
    try {
      const response = await apiClient.post(
        '/api/agent/reflections/feedback',
        feedback
      );
      if (response.success) {
        this.emit('reflection:feedback:submitted', feedback);
        return true;
      }
      return false;
    } catch (error) {
      this.emit('reflection:feedback:error', error);
      return false;
    }
  }

  // ============================================
  // Health & Monitoring
  // ============================================

  async getHealth(): Promise<OrchestratorHealthStatus> {
    try {
      const response = await apiClient.get<ApiHealthResponse>(
        '/health/orchestrator'
      );

      if (response.success && response.data) {
        return response.data as unknown as OrchestratorHealthStatus;
      }

      throw new Error(response.error || 'Health check failed');
    } catch (error) {
      this.emit('health:error', error);
      throw error;
    }
  }

  async getMetrics(): Promise<OrchestratorMetrics> {
    try {
      const response = await apiClient.get<ApiMetricsResponse>(
        '/api/agent/metrics'
      );

      if (response.success && response.data) {
        return response.data as unknown as OrchestratorMetrics;
      }

      throw new Error(response.error || 'Failed to fetch metrics');
    } catch (error) {
      this.emit('metrics:error', error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.activeStreams.size < 100;
  }

  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  // ============================================
  // Shutdown
  // ============================================

  shutdown(): void {
    this.cancelAllExecutions();
    this.flushMetrics();
    this.clearCache();
    this.eventListeners.clear();
    console.log('OrchestratorService shutdown complete');
  }
}

// Export singleton instance
export const orchestratorService = OrchestratorService.getInstance();

export default OrchestratorService;
