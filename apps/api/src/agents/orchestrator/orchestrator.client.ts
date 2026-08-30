// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/orchestrator.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { OpenAIClient } from '../../services/ai/openai.client';
import { AnthropicClient } from '../../services/ai/anthropic.client';
import { GeminiClient } from '../../services/ai/gemini.client';
import { agentRegistry } from '../core/agent.registry';
import { logger } from '../../utils/logger';
import {
  OrchestratorStateType,
  IntentResult,
  ClassificationOptions,
  TaskPlan,
  PlanningOptions,
  ExecutionOptions,
  ChainExecutionResult,
  StepExecutionResult,
  OrchestratorMemoryEntry,
  MemoryRetrievalOptions,
  MemoryRetrievalResult,
  MemoryConsolidationOptions,
  ExecutionReflection,
  FollowUpSuggestion,
  OrchestratorResponse,
  OrchestratorConfig,
  OrchestratorMetrics,
  OrchestratorHealthStatus,
  OrchestratorInternalState,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventListener,
  AgentDelegationRequest,
  AgentDelegationResult,
  BatchExecutionRequest,
  BatchExecutionResult,
  OrchestratorStreamChunk,
  OrchestratorStreamChunkType,
  OrchestratorSession,
  CircuitBreakerState,
  ExecutionTaskState,
  PreExecutionCheck,
  AgentExecutionContract,
  FallbackStrategy,
} from './orchestrator.types';
import { AgentType, AgentContext, AgentRequest, ExecutionMode } from '../../types/agent.types';

// ============================================
// Default Configuration
// ============================================

const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxStepsPerPlan: 10,
  maxRetriesPerStep: 3,
  maxPlanRetries: 2,
  maxConcurrentExecutions: 10,
  defaultTimeoutMs: 30000,
  executionTimeoutMs: 300000,
  enableAutomaticFallbacks: true,
  enablePlanOptimization: true,
  enableMemoryConsolidation: true,
  enableExecutionReflection: true,
  enablePreExecutionCostCheck: true,
  enableCircuitBreaker: true,
  enableBackpressure: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeoutMs: 60000,
  retryBaseDelayMs: 1000,
  retryMaxDelayMs: 30000,
  defaultModel: 'gpt-4',
  modelFallbackChain: ['openai', 'anthropic', 'gemini'],
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
    priority: 1,
    storeInMemory: true,
    generateEmbeddings: true,
  },
  memoryOptions: {
    maxShortTermEntries: 50,
    shortTermTTLSeconds: 3600,
    longTermImportanceThreshold: 0.7,
    enableVectorSearch: true,
  },
  streamingOptions: {
    enabled: true,
    chunkDelayMs: 50,
    maxChunkSize: 200,
  },
  rateLimiting: {
    requestsPerMinute: 60,
    tokensPerMinute: 90000,
    costPerHour: 50,
  },
};

// ============================================
// Orchestrator Client
// ============================================

export class OrchestratorClient {
  // AI model providers
  private openaiClient: OpenAIClient;
  private anthropicClient: AnthropicClient;
  private geminiClient: GeminiClient;

  // Configuration
  private config: OrchestratorConfig;

  // HTTP client for external API calls
  private httpClient: AxiosInstance;

  // ============================================
  // ENHANCEMENT: Caching
  // ============================================

  private intentCache: Map<string, { intent: IntentResult; cachedAt: number }> = new Map();
  private readonly INTENT_CACHE_TTL = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 1000;

  private planCache: Map<string, { plan: TaskPlan; cachedAt: number }> = new Map();
  private readonly PLAN_CACHE_TTL = 1800000; // 30 minutes

  private memoryCache: Map<string, { memories: OrchestratorMemoryEntry[]; cachedAt: number }> = new Map();
  private readonly MEMORY_CACHE_TTL = 300000; // 5 minutes

  // ============================================
  // ENHANCEMENT: Circuit Breakers
  // ============================================

  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  // ============================================
  // ENHANCEMENT: Rate Limiting
  // ============================================

  private requestCount: number = 0;
  private tokenCount: number = 0;
  private costAccumulated: number = 0;
  private rateLimitWindowStart: number = Date.now();
  private readonly RATE_LIMIT_WINDOW_MS = 60000;

  // ============================================
  // ENHANCEMENT: Metrics
  // ============================================

  private metrics: OrchestratorMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    partialSuccessExecutions: 0,
    rejectedExecutions: 0,
    averageExecutionTimeMs: 0,
    p95ExecutionTimeMs: 0,
    p99ExecutionTimeMs: 0,
    totalTokensUsed: 0,
    totalCostUsd: 0,
    averageStepsPerExecution: 0,
    averageAgentsPerExecution: 0,
    fallbackUsageRate: 0,
    circuitBreakerTriggerRate: 0,
    classificationAccuracy: 0,
    planOptimizationSavingsUsd: 0,
    memoryHitRate: 0,
    backpressureRejectionRate: 0,
    executionResumeRate: 0,
    errorRateByState: {} as Record<OrchestratorStateType, number>,
    agentUsageDistribution: {} as Record<string, number>,
    modelUsageDistribution: {} as Record<string, number>,
    circuitBreakerStatus: {} as Record<string, CircuitBreakerState>,
  };

  private executionTimes: number[] = [];

  // ============================================
  // ENHANCEMENT: Event Listeners
  // ============================================

  private eventListeners: OrchestratorEventListener[] = [];

  // ============================================
  // ENHANCEMENT: Sessions
  // ============================================

  private activeSessions: Map<string, OrchestratorSession> = new Map();

  // ============================================
  // ENHANCEMENT: Backpressure
  // ============================================

  private activeExecutions: number = 0;
  private pendingExecutions: Array<{
    requestId: string;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };

    // Initialize AI clients
    this.openaiClient = OpenAIClient.getInstance();
    this.anthropicClient = AnthropicClient.getInstance();
    this.geminiClient = GeminiClient.getInstance();

    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: this.config.defaultTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Agent-Orchestrator/3.0.0',
      },
    });

    this.setupHttpInterceptors();

    // Start periodic tasks
    this.startCacheCleanup();
    this.startRateLimitReset();
    this.startCircuitBreakerMonitor();

    logger.info('Orchestrator client initialized', {
      version: '3.0.0',
      maxConcurrent: this.config.maxConcurrentExecutions,
      circuitBreakerEnabled: this.config.enableCircuitBreaker,
      backpressureEnabled: this.config.enableBackpressure,
      preExecutionCostCheck: this.config.enablePreExecutionCostCheck,
    });
  }

  // ============================================
  // HTTP Interceptors
  // ============================================

  private setupHttpInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug(
          { method: config.method, url: config.url },
          'Orchestrator HTTP request',
        );
        config.headers['X-Request-ID'] =
          config.headers['X-Request-ID'] ||
          `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(
          { status: response.status, url: response.config.url },
          'Orchestrator HTTP response',
        );
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          logger.warn('Orchestrator rate limit exceeded');
        } else if (error.response?.status === 503) {
          logger.warn('Service unavailable');
        }
        throw error;
      },
    );
  }

  // ============================================
  // ENHANCEMENT: Circuit Breaker
  // ============================================

  private getOrCreateCircuitBreaker(
    agentType: string,
  ): CircuitBreakerState {
    if (!this.circuitBreakers.has(agentType)) {
      this.circuitBreakers.set(agentType, {
        failureCount: 0,
        lastFailure: 0,
        isOpen: false,
        openUntil: 0,
      });
    }
    return this.circuitBreakers.get(agentType)!;
  }

  private async withCircuitBreaker<T>(
    agentType: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!this.config.enableCircuitBreaker) {
      return operation();
    }

    const breaker = this.getOrCreateCircuitBreaker(agentType);

    if (breaker.isOpen && Date.now() < breaker.openUntil) {
      this.emitEvent(OrchestratorEventType.CIRCUIT_BREAKER_OPENED, {
        agentType,
        breaker,
      });
      throw new Error(
        `Circuit breaker open for agent "${agentType}" until ${new Date(breaker.openUntil).toISOString()}`,
      );
    }

    try {
      const result = await operation();

      // Success - reset breaker
      breaker.failureCount = 0;
      breaker.isOpen = false;
      breaker.openUntil = 0;
      this.circuitBreakers.set(agentType, breaker);

      this.emitEvent(OrchestratorEventType.CIRCUIT_BREAKER_CLOSED, {
        agentType,
        breaker,
      });

      return result;
    } catch (error) {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      this.circuitBreakers.set(agentType, breaker);

      if (
        breaker.failureCount >=
        this.config.circuitBreakerThreshold
      ) {
        breaker.isOpen = true;
        breaker.openUntil =
          Date.now() + this.config.circuitBreakerTimeoutMs;
        this.circuitBreakers.set(agentType, breaker);

        logger.error(
          {
            agentType,
            failureCount: breaker.failureCount,
            openUntil: new Date(breaker.openUntil).toISOString(),
          },
          'Circuit breaker opened',
        );

        this.emitEvent(
          OrchestratorEventType.CIRCUIT_BREAKER_OPENED,
          { agentType, breaker },
        );
      }

      throw error;
    }
  }

  private startCircuitBreakerMonitor(): void {
    setInterval(() => {
      for (const [agentType, breaker] of this
        .circuitBreakers.entries()) {
        if (
          breaker.isOpen &&
          Date.now() >= breaker.openUntil
        ) {
          // Auto-close after timeout
          breaker.isOpen = false;
          breaker.failureCount = 0;
          this.circuitBreakers.set(agentType, breaker);

          logger.info(
            { agentType },
            'Circuit breaker auto-closed',
          );
        }
      }
    }, 30000);
  }

  /**
   * ENHANCEMENT: Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    for (const [agentType, breaker] of this.circuitBreakers.entries()) {
      status[agentType] = { ...breaker };
    }
    return status;
  }

  /**
   * ENHANCEMENT: Reset circuit breaker for an agent
   */
  resetCircuitBreaker(agentType: string): void {
    this.circuitBreakers.delete(agentType);
    logger.info({ agentType }, 'Circuit breaker reset');
  }

  // ============================================
  // ENHANCEMENT: Backpressure Control
  // ============================================

  private async acquireExecutionSlot(): Promise<boolean> {
    if (!this.config.enableBackpressure) {
      return true;
    }

    if (
      this.activeExecutions >=
      this.config.maxConcurrentExecutions
    ) {
      this.metrics.rejectedExecutions++;
      this.metrics.backpressureRejectionRate =
        this.metrics.rejectedExecutions /
        Math.max(1, this.metrics.totalExecutions);

      this.emitEvent(
        OrchestratorEventType.BACKPRESSURE_REJECTED,
        {
          activeExecutions: this.activeExecutions,
          max: this.config.maxConcurrentExecutions,
        },
      );

      return false;
    }

    this.activeExecutions++;
    return true;
  }

  private releaseExecutionSlot(): void {
    if (this.activeExecutions > 0) {
      this.activeExecutions--;
    }

    // Process pending executions
    if (
      this.pendingExecutions.length > 0 &&
      this.activeExecutions <
        this.config.maxConcurrentExecutions
    ) {
      const pending = this.pendingExecutions.shift();
      if (pending) {
        this.activeExecutions++;
        // Process pending request (would need full execution context)
        logger.info(
          { requestId: pending.requestId },
          'Processing pending execution',
        );
      }
    }
  }

  // ============================================
  // ENHANCEMENT: Rate Limiting
  // ============================================

  private checkRateLimit(
    tokens: number = 0,
    cost: number = 0,
  ): void {
    if (!this.config.rateLimiting) return;

    const now = Date.now();

    // Reset window if expired
    if (
      now - this.rateLimitWindowStart >=
      this.RATE_LIMIT_WINDOW_MS
    ) {
      this.requestCount = 0;
      this.tokenCount = 0;
      this.costAccumulated = 0;
      this.rateLimitWindowStart = now;
    }

    this.requestCount++;

    const { requestsPerMinute, tokensPerMinute, costPerHour } =
      this.config.rateLimiting;

    if (
      requestsPerMinute &&
      this.requestCount > requestsPerMinute
    ) {
      throw new Error(
        `Rate limit exceeded: ${requestsPerMinute} req/min`,
      );
    }

    if (tokensPerMinute && this.tokenCount > tokensPerMinute) {
      throw new Error(
        `Token limit exceeded: ${tokensPerMinute} tokens/min`,
      );
    }

    if (costPerHour && this.costAccumulated > costPerHour) {
      throw new Error(
        `Cost limit exceeded: $${costPerHour}/hr`,
      );
    }

    this.tokenCount += tokens;
    this.costAccumulated += cost;
  }

  private startRateLimitReset(): void {
    setInterval(() => {
      const now = Date.now();
      if (
        now - this.rateLimitWindowStart >=
        this.RATE_LIMIT_WINDOW_MS
      ) {
        this.requestCount = 0;
        this.tokenCount = 0;
        this.rateLimitWindowStart = now;
      }
    }, this.RATE_LIMIT_WINDOW_MS);
  }

  // ============================================
  // ENHANCEMENT: Cache Management
  // ============================================

  private getFromCache<T extends { cachedAt: number }>(
    cache: Map<string, T>,
    key: string,
    ttl: number,
  ): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.cachedAt < ttl) {
      return cached;
    }
    return null;
  }

  private addToCache<T extends { cachedAt: number }>(
    cache: Map<string, T>,
    key: string,
    value: T,
    maxSize: number,
  ): void {
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(key, value);
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [key, value] of this.intentCache.entries()) {
        if (now - value.cachedAt > this.INTENT_CACHE_TTL) {
          this.intentCache.delete(key);
        }
      }

      for (const [key, value] of this.planCache.entries()) {
        if (now - value.cachedAt > this.PLAN_CACHE_TTL) {
          this.planCache.delete(key);
        }
      }

      for (const [key, value] of this.memoryCache.entries()) {
        if (now - value.cachedAt > this.MEMORY_CACHE_TTL) {
          this.memoryCache.delete(key);
        }
      }
    }, this.INTENT_CACHE_TTL);
  }

  // ============================================
  // ENHANCEMENT: Event System
  // ============================================

  addEventListener(listener: OrchestratorEventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: OrchestratorEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  private emitEvent(
    type: OrchestratorEventType,
    data: any,
  ): void {
    const event: OrchestratorEvent = {
      type,
      timestamp: new Date(),
      data,
    };

    for (const listener of this.eventListeners) {
      try {
        switch (type) {
          case OrchestratorEventType.STATE_CHANGE:
            listener.onStateChange?.(
              data.from,
              data.to,
              data.state,
            );
            break;
          case OrchestratorEventType.INTENT_CLASSIFIED:
            listener.onIntentClassified?.(
              data.intent,
              data.state,
            );
            break;
          case OrchestratorEventType.PLAN_CREATED:
            listener.onPlanCreated?.(
              data.plan,
              data.state,
            );
            break;
          case OrchestratorEventType.STEP_COMPLETED:
            listener.onStepCompleted?.(
              data.result,
              data.state,
            );
            break;
          case OrchestratorEventType.STEP_FAILED:
            listener.onStepFailed?.(
              data.result,
              data.state,
            );
            break;
          case OrchestratorEventType.EXECUTION_COMPLETED:
            listener.onExecutionCompleted?.(
              data.result,
              data.state,
            );
            break;
          case OrchestratorEventType.ERROR_OCCURRED:
            listener.onError?.(
              data.error,
              data.state,
            );
            break;
          case OrchestratorEventType.CIRCUIT_BREAKER_OPENED:
          case OrchestratorEventType.CIRCUIT_BREAKER_CLOSED:
            listener.onCircuitBreakerChange?.(
              data.agentType,
              data.breaker,
            );
            break;
          case OrchestratorEventType.BACKPRESSURE_REJECTED:
            listener.onBackpressureRejected?.(
              data.userId || 'unknown',
              data.reason || 'Backpressure',
            );
            break;
        }
      } catch (error) {
        logger.error(
          { error, eventType: type },
          'Event listener error',
        );
      }
    }
  }

  // ============================================
  // ENHANCEMENT: Metrics
  // ============================================

  private updateMetrics(
    success: boolean,
    tokensUsed: number,
    costUsd: number,
    executionTimeMs: number,
    stepCount: number,
    agentTypes: string[],
    status?: string,
  ): void {
    this.metrics.totalExecutions++;

    if (status === 'partial_success') {
      this.metrics.partialSuccessExecutions++;
    } else if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    this.metrics.totalTokensUsed += tokensUsed;
    this.metrics.totalCostUsd += costUsd;

    // Track execution times for percentiles
    this.executionTimes.push(executionTimeMs);
    if (this.executionTimes.length > 1000) {
      this.executionTimes.shift();
    }

    const sorted = [...this.executionTimes].sort(
      (a, b) => a - b,
    );
    const total = this.metrics.totalExecutions;

    this.metrics.averageExecutionTimeMs =
      (this.metrics.averageExecutionTimeMs *
        (total - 1) +
        executionTimeMs) /
      total;

    if (sorted.length > 0) {
      this.metrics.p95ExecutionTimeMs =
        sorted[
          Math.floor(sorted.length * 0.95)
        ] || executionTimeMs;
      this.metrics.p99ExecutionTimeMs =
        sorted[
          Math.floor(sorted.length * 0.99)
        ] || executionTimeMs;
    }

    this.metrics.averageStepsPerExecution =
      (this.metrics.averageStepsPerExecution *
        (total - 1) +
        stepCount) /
      total;

    const uniqueAgents = new Set(agentTypes);
    this.metrics.averageAgentsPerExecution =
      (this.metrics.averageAgentsPerExecution *
        (total - 1) +
        uniqueAgents.size) /
      total;

    for (const agent of agentTypes) {
      this.metrics.agentUsageDistribution[agent] =
        (this.metrics.agentUsageDistribution[agent] || 0) +
        1;
    }

    this.metrics.circuitBreakerStatus =
      this.getCircuitBreakerStatus();
  }

  getMetrics(): OrchestratorMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      partialSuccessExecutions: 0,
      rejectedExecutions: 0,
      averageExecutionTimeMs: 0,
      p95ExecutionTimeMs: 0,
      p99ExecutionTimeMs: 0,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      averageStepsPerExecution: 0,
      averageAgentsPerExecution: 0,
      fallbackUsageRate: 0,
      circuitBreakerTriggerRate: 0,
      classificationAccuracy: 0,
      planOptimizationSavingsUsd: 0,
      memoryHitRate: 0,
      backpressureRejectionRate: 0,
      executionResumeRate: 0,
      errorRateByState: {} as Record<
        OrchestratorStateType,
        number
      >,
      agentUsageDistribution: {} as Record<
        string,
        number
      >,
      modelUsageDistribution: {} as Record<
        string,
        number
      >,
      circuitBreakerStatus: {} as Record<
        string,
        CircuitBreakerState
      >,
    };
    this.executionTimes = [];
    logger.info('Orchestrator metrics reset');
  }

  // ============================================
  // AI Text Generation with Fallback
  // ============================================

  async generateText(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      preferredProvider?: string;
    },
  ): Promise<{
    content: string;
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
    attempts: number;
  }> {
    const providerChain = options?.preferredProvider
      ? [
          options.preferredProvider,
          ...this.config.modelFallbackChain.filter(
            (p) => p !== options.preferredProvider,
          ),
        ]
      : this.config.modelFallbackChain;

    let lastError: Error | null = null;
    let totalTokens = 0;
    let totalCost = 0;

    for (
      let attempt = 0;
      attempt < providerChain.length;
      attempt++
    ) {
      const provider = providerChain[attempt];

      try {
        this.checkRateLimit(
          options?.maxTokens || 1000,
          0.01,
        );

        let result: {
          content: string;
          model: string;
          tokensUsed: number;
          costUsd: number;
        };

        switch (provider) {
          case 'openai': {
            const openaiResult =
              await this.openaiClient.complete({
                messages: [
                  ...(options?.systemPrompt
                    ? [
                        {
                          role: 'system' as const,
                          content: options.systemPrompt,
                        },
                      ]
                    : []),
                  {
                    role: 'user' as const,
                    content: prompt,
                  },
                ],
                temperature:
                  options?.temperature ?? 0.7,
                maxTokens: options?.maxTokens ?? 1000,
              });
            result = {
              content:
                openaiResult.choices[0].message.content,
              model: openaiResult.model,
              tokensUsed:
                openaiResult.usage.total_tokens,
              costUsd: this.openaiClient.calculateCost(
                openaiResult.model,
                openaiResult.usage.total_tokens,
              ),
            };
            break;
          }
          case 'anthropic': {
            const anthropicResult =
              await this.anthropicClient.complete({
                messages: [
                  { role: 'user', content: prompt },
                ],
                system: options?.systemPrompt,
                temperature:
                  options?.temperature ?? 0.7,
                maxTokens: options?.maxTokens ?? 1000,
              });
            result = {
              content:
                anthropicResult.content[0]?.text ||
                '',
              model: anthropicResult.model,
              tokensUsed:
                anthropicResult.usage.output_tokens,
              costUsd:
                this.anthropicClient.calculateCost(
                  anthropicResult.model,
                  anthropicResult.usage.input_tokens,
                  anthropicResult.usage.output_tokens,
                ),
            };
            break;
          }
          case 'gemini': {
            const geminiResult =
              await this.geminiClient.complete({
                contents: [
                  ...(options?.systemPrompt
                    ? [
                        {
                          parts: [
                            {
                              text: options.systemPrompt,
                            },
                          ],
                          role: 'user' as const,
                        },
                        {
                          parts: [
                            { text: 'Understood.' },
                          ],
                          role: 'model' as const,
                        },
                      ]
                    : []),
                  {
                    parts: [{ text: prompt }],
                    role: 'user' as const,
                  },
                ],
                temperature:
                  options?.temperature ?? 0.7,
                maxOutputTokens:
                  options?.maxTokens ?? 1000,
              });
            result = {
              content:
                geminiResult.candidates[0]?.content
                  .parts[0]?.text || '',
              model: geminiResult.modelVersion,
              tokensUsed:
                geminiResult.usageMetadata
                  .totalTokenCount,
              costUsd: this.geminiClient.calculateCost(
                geminiResult.modelVersion,
                geminiResult.usageMetadata
                  .promptTokenCount,
                geminiResult.usageMetadata
                  .candidatesTokenCount,
              ),
            };
            break;
          }
          default:
            continue;
        }

        totalTokens = result.tokensUsed;
        totalCost = result.costUsd;

        this.metrics.modelUsageDistribution[provider] =
          (this.metrics.modelUsageDistribution[
            provider
          ] || 0) + 1;

        return {
          content: result.content,
          model: result.model,
          provider,
          tokensUsed: totalTokens,
          costUsd: totalCost,
          attempts: attempt + 1,
        };
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error(String(error));
        logger.warn(
          {
            error: lastError.message,
            provider,
            attempt: attempt + 1,
          },
          'AI provider failed, trying next',
        );
      }
    }

    throw (
      lastError ||
      new Error('All AI providers failed to generate text')
    );
  }

  /**
   * Stream text generation with progress updates
   */
  async generateTextStreaming(
    prompt: string,
    onChunk: (chunk: {
      type: string;
      content: string;
      progress: number;
      provider?: string;
    }) => void,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<{
    content: string;
    provider: string;
    model: string;
    tokensUsed: number;
    costUsd: number;
  }> {
    let fullContent = '';

    onChunk({
      type: 'start',
      content: 'Starting text generation...',
      progress: 0,
    });

    // Use OpenAI for streaming (most reliable)
    try {
      const result = await this.openaiClient.streamComplete(
        {
          messages: [
            ...(options?.systemPrompt
              ? [
                  {
                    role: 'system' as const,
                    content: options.systemPrompt,
                  },
                ]
              : []),
            { role: 'user' as const, content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens ?? 1000,
        },
        (chunk: string) => {
          fullContent += chunk;
          onChunk({
            type: 'content',
            content: chunk,
            progress: Math.min(
              20 +
                (fullContent.length /
                  ((options?.maxTokens || 1000) * 4)) *
                  70,
              90,
            ),
            provider: 'openai',
          });
        },
      );

      onChunk({
        type: 'complete',
        content: '',
        progress: 100,
        provider: 'openai',
      });

      return {
        content: fullContent,
        provider: 'openai',
        model: result.model,
        tokensUsed: result.usage.total_tokens,
        costUsd: this.openaiClient.calculateCost(
          result.model,
          result.usage.total_tokens,
        ),
      };
    } catch (error) {
      onChunk({
        type: 'error',
        content: `Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0,
      });
      throw error;
    }
  }

  // ============================================
  // Intent Classification
  // ============================================

  async classifyIntent(
    input: string,
    options?: ClassificationOptions,
  ): Promise<IntentResult> {
    // Check cache
    const cacheKey = `${input.substring(0, 200)}:${options?.preferredMethod || 'default'}`;
    const cached = this.getFromCache(
      this.intentCache,
      cacheKey,
      this.INTENT_CACHE_TTL,
    );
    if (cached) {
      this.metrics.memoryHitRate =
        (this.metrics.memoryHitRate *
          this.metrics.totalExecutions +
          1) /
        (this.metrics.totalExecutions + 1);
      return cached.intent;
    }

    this.checkRateLimit(500, 0.001);

    const classificationPrompt = `
You are an intent classification system. Classify this input and respond with JSON.

Input: "${input}"

Respond with:
{
  "primaryIntent": "string",
  "confidence": number (0-1),
  "alternativeIntents": [{"intent": "string", "confidence": number}],
  "entities": {"key": "value"},
  "suggestedAgent": "EMAIL|DRIVE|CONTENT|SOCIAL|CALENDAR|WEB|TASK|ORCHESTRATOR",
  "requiresMultipleAgents": boolean,
  "agentChain": ["AGENT_TYPE1", "AGENT_TYPE2"],
  "complexity": "simple|moderate|complex|very_complex",
  "estimatedTimeMs": number,
  "estimatedCostUsd": number
}
`;

    const result = await this.generateText(
      classificationPrompt,
      {
        temperature: 0.1,
        maxTokens: 500,
      },
    );

    let intent: IntentResult;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      intent = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            primaryIntent: 'general_assistance',
            confidence: 0.3,
            alternativeIntents: [],
            entities: {},
            suggestedAgent: 'ORCHESTRATOR',
            requiresMultipleAgents: false,
            classificationMethod: 'fallback',
          };
    } catch {
      intent = {
        primaryIntent: 'general_assistance',
        confidence: 0.3,
        alternativeIntents: [],
        entities: {},
        suggestedAgent: 'ORCHESTRATOR' as any,
        requiresMultipleAgents: false,
        classificationMethod: 'fallback',
      };
    }

    intent.classificationMethod = 'ai';
    intent.processingTimeMs = 0;

    // Cache
    this.addToCache(
      this.intentCache,
      cacheKey,
      { intent, cachedAt: Date.now() },
      this.MAX_CACHE_SIZE,
    );

    return intent;
  }

  // ============================================
  // Agent Delegation
  // ============================================

  async delegateToAgent(
    request: AgentDelegationRequest,
    context?: Partial<AgentContext>,
  ): Promise<AgentDelegationResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let fallbackUsed = false;
    let circuitBreakerTriggered = false;
    const fallbackChain: AgentType[] = [
      request.agentType,
      ...(request.fallbackAgents || []),
    ];

    for (const agentType of fallbackChain) {
      try {
        this.checkRateLimit(300, 0.001);
        await this.acquireExecutionSlot();

        const agent = agentRegistry.getAgent(agentType);
        if (!agent) {
          logger.warn(
            { agentType },
            'Agent not found, trying next',
          );
          continue;
        }

        const agentRequest: AgentRequest = {
          id: `delegation_${Date.now()}`,
          userId: context?.userId || 'system',
          sessionId: context?.sessionId,
          input: {
            type: 'task',
            data: {
              task: request.task,
              ...request.input,
            },
          },
          priority: request.priority || 1,
          timeout: request.timeout,
          context: context as AgentContext,
        };

        const response = await this.withCircuitBreaker(
          agentType,
          async () => agent.execute(
            agentRequest,
            context as AgentContext,
          ),
        );

        this.releaseExecutionSlot();

        const contract = response.output as AgentExecutionContract;
        const success =
          contract?.status === 'success' ||
          contract?.status === 'partial_success';

        this.updateMetrics(
          success,
          contract?.cost?.tokens || 0,
          contract?.cost?.usd || 0,
          Date.now() - startTime,
          1,
          [agentType],
          contract?.status,
        );

        return {
          success,
          output: contract?.data || response.output,
          error: contract?.errors?.[0]?.message,
          agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: contract?.cost?.tokens || 0,
          costUsd: contract?.cost?.usd || 0,
          retryCount,
          fallbackUsed,
          fallbackChain,
          circuitBreakerTriggered,
          metadata: contract?.metadata,
        };
      } catch (error) {
        this.releaseExecutionSlot();
        retryCount++;
        fallbackUsed = agentType !== request.agentType;

        if (
          error instanceof Error &&
          error.message.includes('Circuit breaker')
        ) {
          circuitBreakerTriggered = true;
          this.metrics.circuitBreakerTriggerRate =
            this.metrics.circuitBreakerTriggerRate +
            1 / Math.max(1, this.metrics.totalExecutions);
        }
      }
    }

    this.updateMetrics(
      false,
      0,
      0,
      Date.now() - startTime,
      0,
      [],
    );

    return {
      success: false,
      output: null,
      error: 'All agents in chain failed',
      agentType: request.agentType,
      executionTimeMs: Date.now() - startTime,
      tokensUsed: 0,
      costUsd: 0,
      retryCount,
      fallbackUsed: true,
      fallbackChain,
      circuitBreakerTriggered,
    };
  }

  // ============================================
  // Multi-Agent Execution
  // ============================================

  async executeMultiAgent(
    agents: Array<{
      agentType: string;
      task: string;
      input?: any;
      priority?: number;
    }>,
    mode: 'sequential' | 'parallel' = 'sequential',
    context?: Partial<AgentContext>,
    options?: {
      stopOnError?: boolean;
      maxConcurrent?: number;
      sharedContext?: Record<string, any>;
    },
  ): Promise<{
    results: AgentDelegationResult[];
    mode: string;
    totalSuccess: number;
    totalFailed: number;
    totalTimeMs: number;
  }> {
    const startTime = Date.now();
    const results: AgentDelegationResult[] = [];

    if (mode === 'parallel') {
      const maxConcurrent =
        options?.maxConcurrent ||
        this.config.maxConcurrentExecutions;

      for (
        let i = 0;
        i < agents.length;
        i += maxConcurrent
      ) {
        const chunk = agents.slice(i, i + maxConcurrent);
        const chunkResults = await Promise.all(
          chunk.map((agent) =>
            this.delegateToAgent(
              {
                agentType:
                  agent.agentType as AgentType,
                task: agent.task,
                input: {
                  ...agent.input,
                  ...options?.sharedContext,
                },
                priority: agent.priority,
              },
              context,
            ),
          ),
        );
        results.push(...chunkResults);
      }
    } else {
      for (const agent of agents) {
        const result = await this.delegateToAgent(
          {
            agentType: agent.agentType as AgentType,
            task: agent.task,
            input: {
              ...agent.input,
              ...options?.sharedContext,
              previousResults: results
                .slice(-3)
                .map((r) => ({
                  agentType: r.agentType,
                  success: r.success,
                  output: r.output,
                })),
            },
          },
          context,
        );
        results.push(result);

        if (!result.success && options?.stopOnError) {
          break;
        }
      }
    }

    return {
      results,
      mode,
      totalSuccess: results.filter((r) => r.success)
        .length,
      totalFailed: results.filter((r) => !r.success)
        .length,
      totalTimeMs: Date.now() - startTime,
    };
  }

  // ============================================
  // Batch Execution
  // ============================================

  async executeBatch(
    request: BatchExecutionRequest,
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();
    const results: BatchExecutionResult['results'] = [];
    let totalTokens = 0;
    let totalCost = 0;

    const maxConcurrent =
      request.maxConcurrent ||
      this.config.maxConcurrentExecutions;

    for (
      let i = 0;
      i < request.requests.length;
      i += maxConcurrent
    ) {
      const chunk = request.requests.slice(
        i,
        i + maxConcurrent,
      );

      const chunkResults = await Promise.all(
        chunk.map(async (req) => {
          const reqStart = Date.now();
          try {
            const intent = await this.classifyIntent(
              req.input,
            );

            let output: any;
            let tokens = 0;
            let cost = 0;

            if (
              intent.requiresMultipleAgents &&
              intent.agentChain
            ) {
              const multiResult =
                await this.executeMultiAgent(
                  intent.agentChain.map((a) => ({
                    agentType: a,
                    task: req.input,
                    input: intent.entities,
                  })),
                  'sequential',
                  req.context,
                );
              output = multiResult;
              tokens = multiResult.results.reduce(
                (s, r) => s + r.tokensUsed,
                0,
              );
              cost = multiResult.results.reduce(
                (s, r) => s + r.costUsd,
                0,
              );
            } else {
              const delegation =
                await this.delegateToAgent(
                  {
                    agentType: intent.suggestedAgent,
                    task: req.input,
                    input: intent.entities,
                    priority: req.priority,
                  },
                  req.context,
                );
              output = delegation.output;
              tokens = delegation.tokensUsed;
              cost = delegation.costUsd;
            }

            return {
              requestId: req.id,
              intent: {
                primaryIntent: intent.primaryIntent,
                confidence: intent.confidence,
                suggestedAgent: intent.suggestedAgent,
              },
              output,
              success: true,
              executionTimeMs:
                Date.now() - reqStart,
              tokensUsed: tokens,
              costUsd: cost,
            };
          } catch (error) {
            return {
              requestId: req.id,
              output: null,
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
              executionTimeMs:
                Date.now() - reqStart,
              tokensUsed: 0,
              costUsd: 0,
            };
          }
        }),
      );

      for (const r of chunkResults) {
        results.push(r);
        totalTokens += r.tokensUsed;
        totalCost += r.costUsd;
      }
    }

    return {
      results,
      totalRequests: request.requests.length,
      successfulRequests: results.filter(
        (r) => r.success,
      ).length,
      failedRequests: results.filter(
        (r) => !r.success,
      ).length,
      partialSuccessRequests: 0,
      totalTimeMs: Date.now() - startTime,
      totalTokensUsed: totalTokens,
      totalCostUsd: totalCost,
    };
  }

  // ============================================
  // Session Management
  // ============================================

  createSession(userId: string): OrchestratorSession {
    const session: OrchestratorSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      messageCount: 0,
      context: { sessionId: '', userId },
      messageHistory: [],
      isActive: true,
    };

    this.activeSessions.set(session.id, session);
    return session;
  }

  getSession(
    sessionId: string,
  ): OrchestratorSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  getUserSessions(userId: string): OrchestratorSession[] {
    return Array.from(
      this.activeSessions.values(),
    ).filter((s) => s.userId === userId);
  }

  endSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.set(sessionId, session);
      return true;
    }
    return false;
  }

  // ============================================
  // Health & Status
  // ============================================

  async getHealth(): Promise<OrchestratorHealthStatus> {
    return {
      state: OrchestratorStateType.IDLE,
      isHealthy: true,
      currentLoad:
        this.activeExecutions /
        this.config.maxConcurrentExecutions,
      queueLength: this.pendingExecutions.length,
      activeExecutions: this.activeExecutions,
      waitingExecutions:
        this.pendingExecutions.length,
      rejectedExecutions:
        this.metrics.rejectedExecutions,
      metrics: this.getMetrics(),
      lastHeartbeat: new Date(),
      uptime: process.uptime(),
      version: '3.0.0',
    };
  }

  // ============================================
  // Configuration
  // ============================================

  updateConfig(
    config: Partial<OrchestratorConfig>,
  ): void {
    this.config = { ...this.config, ...config };
    logger.info(
      'Orchestrator configuration updated',
      { keys: Object.keys(config) },
    );
  }

  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  // ============================================
  // Shutdown
  // ============================================

  async shutdown(): Promise<void> {
    logger.info('Orchestrator client shutting down...');

    this.intentCache.clear();
    this.planCache.clear();
    this.memoryCache.clear();
    this.circuitBreakers.clear();
    this.activeSessions.clear();
    this.eventListeners = [];

    this.resetMetrics();

    logger.info('Orchestrator client shutdown complete');
  }
}

// ============================================
// Singleton Instance
// ============================================

let orchestratorClientInstance: OrchestratorClient | null =
  null;

export function getOrchestratorClient(
  config?: Partial<OrchestratorConfig>,
): OrchestratorClient {
  if (!orchestratorClientInstance) {
    orchestratorClientInstance = new OrchestratorClient(
      config,
    );
  }
  return orchestratorClientInstance;
}

export function resetOrchestratorClient(): void {
  if (orchestratorClientInstance) {
    orchestratorClientInstance.shutdown();
    orchestratorClientInstance = null;
  }
}