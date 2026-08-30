// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/orchestrator.interfaces.ts
import {
  AgentType,
  AgentRequest,
  AgentResponse,
  AgentContext,
  AgentTool,
  StreamingChunk,
} from '../../types/agent.types';
import {
  OrchestratorStateType,
  IntentResult,
  ClassificationOptions,
  TaskPlan,
  PlanningOptions,
  ExecutionMode,
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
  TaskPlanStep,
  PlanValidationResult,
  PlanOptimizationResult,
  ResourceUsageSummary,
  MemoryType,
  MemoryStatistics,
} from './orchestrator.types';

// ============================================
// Core Orchestrator Interface
// ============================================

/**
 * IOrchestrator - Main orchestrator interface
 * All orchestrator implementations must fulfill this contract
 */
export interface IOrchestrator {
  // ==========================================
  // Lifecycle Methods
  // ==========================================

  /** Initialize the orchestrator */
  initialize(config?: Partial<OrchestratorConfig>): Promise<void>;

  /** Shutdown the orchestrator gracefully */
  shutdown(): Promise<void>;

  /** Get orchestrator health status */
  getHealth(): Promise<OrchestratorHealthStatus>;

  /** Get orchestrator metrics */
  getMetrics(): OrchestratorMetrics;

  /** Reset orchestrator metrics */
  resetMetrics(): void;

  // ==========================================
  // Intent Classification
  // ==========================================

  /** Classify user intent from input */
  classifyIntent(
    input: string,
    context?: Partial<AgentContext>,
    options?: ClassificationOptions
  ): Promise<IntentResult>;

  /** Batch classify multiple intents */
  classifyIntentsBatch(
    inputs: Array<{ id: string; input: string; context?: Partial<AgentContext> }>,
    options?: ClassificationOptions
  ): Promise<
    Array<{
      id: string;
      intent: IntentResult;
      error?: string;
    }>
  >;

  // ==========================================
  // Task Planning
  // ==========================================

  /** Create an execution plan from intent */
  createPlan(
    intent: IntentResult,
    context: Partial<AgentContext>,
    options?: PlanningOptions
  ): Promise<TaskPlan>;

  /** Optimize an existing plan */
  optimizePlan(
    plan: TaskPlan,
    optimizationGoal?: 'speed' | 'cost' | 'accuracy' | 'balanced'
  ): Promise<PlanOptimizationResult>;

  /** Validate a task plan */
  validatePlan(plan: TaskPlan): PlanValidationResult;

  // ==========================================
  // Execution
  // ==========================================

  /** Execute a task plan */
  executePlan(
    plan: TaskPlan,
    context: Partial<AgentContext>,
    options?: ExecutionOptions
  ): Promise<ChainExecutionResult>;

  /** Execute with streaming updates */
  executePlanStreaming(
    plan: TaskPlan,
    context: Partial<AgentContext>,
    onChunk: (chunk: OrchestratorStreamChunk) => void,
    options?: ExecutionOptions
  ): Promise<ChainExecutionResult>;

  /** Cancel an active execution */
  cancelExecution(executionId: string): Promise<boolean>;

  /** Get execution progress */
  getExecutionProgress(executionId: string): Promise<{
    state: OrchestratorStateType;
    progress: number;
    currentStep?: string;
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemainingMs?: number;
  } | null>;

  // ==========================================
  // Agent Delegation
  // ==========================================

  /** Delegate a task to a specialized agent */
  delegateToAgent(
    request: AgentDelegationRequest,
    context?: Partial<AgentContext>
  ): Promise<AgentDelegationResult>;

  /** Execute multiple agents in sequence or parallel */
  executeMultiAgent(
    agents: Array<{
      agentType: AgentType | string;
      task: string;
      input?: any;
      priority?: number;
    }>,
    mode: 'sequential' | 'parallel',
    context?: Partial<AgentContext>,
    options?: {
      stopOnError?: boolean;
      maxConcurrent?: number;
      sharedContext?: Record<string, any>;
    }
  ): Promise<{
    results: AgentDelegationResult[];
    mode: string;
    totalSuccess: number;
    totalFailed: number;
    totalTimeMs: number;
  }>;

  // ==========================================
  // Memory Management
  // ==========================================
  // NOTE: memory methods used to be duplicated here as well as in
  // IOrchestratorMemoryManager below, with a slightly different
  // consolidateMemories signature in each. That caused IFullOrchestrator
  // (which extends both) to fail to compile — TS correctly refused to let
  // one interface satisfy two incompatible versions of the same method.
  // Memory management now lives solely in IOrchestratorMemoryManager.

  // ==========================================
  // Reflection & Analysis
  // ==========================================

  /** Reflect on execution results */
  reflectOnExecution(
    results: ChainExecutionResult,
    originalRequest?: string,
    storeInsights?: boolean,
    context?: Partial<AgentContext>
  ): Promise<ExecutionReflection>;

  /** Suggest follow-up actions */
  suggestFollowUps(
    executionResults: any,
    userPreferences?: Record<string, any>,
    count?: number
  ): Promise<FollowUpSuggestion[]>;

  // ==========================================
  // Batch Processing
  // ==========================================

  /** Execute multiple requests in batch */
  executeBatch(
    request: BatchExecutionRequest
  ): Promise<BatchExecutionResult>;

  /** Preprocess batch (classify intents) without executing */
  preprocessBatch(
    requests: Array<{ id: string; input: string; context?: Partial<AgentContext> }>
  ): Promise<
    Array<{
      id: string;
      intent: IntentResult;
      estimatedCostUsd: number;
      estimatedTimeMs: number;
    }>
  >;

  // ==========================================
  // AI Text Generation
  // ==========================================

  /** Generate text using AI with fallback */
  generateText(
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
  }>;

  /** Stream text generation */
  generateTextStreaming(
    prompt: string,
    onChunk: (chunk: { type: string; content: string; progress: number }) => void,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{
    content: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
  }>;

  // ==========================================
  // Session Management
  // ==========================================

  /** Create a new orchestrator session */
  createSession(userId: string): Promise<OrchestratorSession>;

  /** Get active session */
  getSession(sessionId: string): Promise<OrchestratorSession | null>;

  /** Get all sessions for a user */
  getUserSessions(userId: string): Promise<OrchestratorSession[]>;

  /** End a session */
  endSession(sessionId: string): Promise<boolean>;

  /** Add message to session */
  addSessionMessage(
    sessionId: string,
    role: 'user' | 'orchestrator' | 'agent',
    content: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  // ==========================================
  // Event Handling
  // ==========================================

  /** Add event listener */
  addEventListener(listener: OrchestratorEventListener): void;

  /** Remove event listener */
  removeEventListener(listener: OrchestratorEventListener): void;

  /** Emit an event */
  emitEvent(type: OrchestratorEventType, data: any): void;

  // ==========================================
  // Configuration
  // ==========================================

  /** Update configuration */
  updateConfig(config: Partial<OrchestratorConfig>): void;

  /** Get current configuration */
  getConfig(): OrchestratorConfig;

  /** Reset to default configuration */
  resetConfig(): void;

  // ==========================================
  // Capabilities & Discovery
  // ==========================================

  /** Get available agents */
  getAvailableAgents(options?: {
    includeTools?: boolean;
    includeMetrics?: boolean;
    filterByType?: AgentType | string;
  }): Promise<
    Array<{
      type: string;
      name: string;
      description: string;
      version: string;
      status: string;
      tools?: AgentTool[];
      metrics?: any;
    }>
  >;

  /** Get agent capabilities */
  getAgentCapabilities(
    agentType: AgentType | string
  ): Promise<{
    type: string;
    name: string;
    description: string;
    tools: AgentTool[];
    isAvailable: boolean;
    healthStatus: string;
  } | null>;

  /** Match the best agent for a task */
  matchAgentForTask(
    task: string
  ): Promise<{
    agentType: AgentType;
    confidence: number;
    rationale: string;
    alternatives: AgentType[];
  }>;
}

// ============================================
// Orchestrator Tool Executor Interface
// ============================================

/**
 * IToolExecutor - Tool execution interface for plugins
 */
export interface IOrchestratorToolExecutor {
  /** Execute a tool by name */
  executeTool(
    toolName: string,
    params: any,
    context: AgentContext
  ): Promise<any>;

  /** Validate tool parameters */
  validateToolParams(toolName: string, params: any): boolean;

  /** Get tool by name */
  getTool(toolName: string): AgentTool | undefined;

  /** List all available tools */
  listTools(): AgentTool[];

  /** Register a new tool */
  registerTool(tool: AgentTool): void;

  /** Unregister a tool */
  unregisterTool(toolName: string): boolean;
}

// ============================================
// Orchestrator Plugin Interface
// ============================================

/**
 * IOrchestratorPlugin - Plugin interface for extending orchestrator
 */
export interface IOrchestratorPlugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Initialize plugin */
  initialize(orchestrator: IOrchestrator): Promise<void>;

  /** Shutdown plugin */
  shutdown(): Promise<void>;

  /** Get plugin health */
  getHealth(): Promise<{ status: string; message?: string }>;

  /** Get plugin metrics */
  getMetrics(): Record<string, any>;

  /** Plugin hooks */
  hooks?: {
    /** Before intent classification */
    beforeClassifyIntent?: (input: string, context?: Partial<AgentContext>) => Promise<void>;
    /** After intent classification */
    afterClassifyIntent?: (input: string, intent: IntentResult) => Promise<void>;
    /** Before plan creation */
    beforeCreatePlan?: (intent: IntentResult, context?: Partial<AgentContext>) => Promise<void>;
    /** After plan creation */
    afterCreatePlan?: (plan: TaskPlan) => Promise<void>;
    /** Before step execution */
    beforeExecuteStep?: (step: TaskPlanStep, context?: Partial<AgentContext>) => Promise<void>;
    /** After step execution */
    afterExecuteStep?: (result: StepExecutionResult) => Promise<void>;
    /** Before agent delegation */
    beforeDelegateToAgent?: (request: AgentDelegationRequest) => Promise<void>;
    /** After agent delegation */
    afterDelegateToAgent?: (result: AgentDelegationResult) => Promise<void>;
    /** On error */
    onError?: (error: Error, context?: any) => Promise<void>;
  };
}

// ============================================
// Orchestrator Factory Interface
// ============================================

/**
 * IOrchestratorFactory - Factory for creating orchestrator instances
 */
export interface IOrchestratorFactory {
  /** Create a new orchestrator instance */
  create(config?: Partial<OrchestratorConfig>): IOrchestrator;

  /** Get the default orchestrator instance */
  getDefault(): IOrchestrator;

  /** Get all active orchestrator instances */
  getActiveInstances(): IOrchestrator[];

  /** Shutdown all instances */
  shutdownAll(): Promise<void>;
}

// ============================================
// Orchestrator State Manager Interface
// ============================================

/**
 * IStateManager - Manages orchestrator state machine
 */
export interface IOrchestratorStateManager {
  /** Get current state */
  getCurrentState(): OrchestratorStateType;

  /** Transition to a new state */
  transitionTo(
    newState: OrchestratorStateType,
    reason?: string
  ): Promise<boolean>;

  /** Check if transition is valid */
  canTransitionTo(newState: OrchestratorStateType): boolean;

  /** Get state history */
  getStateHistory(): Array<{
    from: OrchestratorStateType;
    to: OrchestratorStateType;
    timestamp: Date;
    reason?: string;
  }>;

  /** Save current state snapshot */
  saveSnapshot(): OrchestratorInternalState;

  /** Restore state from snapshot */
  restoreSnapshot(snapshot: OrchestratorInternalState): void;

  /** Reset state to idle */
  reset(): void;
}

// ============================================
// Memory Manager Interface
// ============================================

/**
 * IMemoryManager - Manages orchestrator memory operations
 */
export interface IOrchestratorMemoryManager {
  /** Store short-term memory */
  storeShortTerm(
    userId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<OrchestratorMemoryEntry>;

  /** Store long-term memory */
  storeLongTerm(
    userId: string,
    content: string,
    importance: number,
    metadata?: Record<string, any>,
    generateEmbedding?: boolean
  ): Promise<OrchestratorMemoryEntry>;

  /** Get short-term memories */
  getShortTerm(
    userId: string,
    limit?: number
  ): Promise<OrchestratorMemoryEntry[]>;

  /** Retrieve relevant long-term memories */
  retrieveRelevantMemories(
    userId: string,
    query: string,
    limit?: number,
    minImportance?: number
  ): Promise<OrchestratorMemoryEntry[]>;

  /** Get session memories */
  getSessionMemories(
    sessionId: string,
    limit?: number
  ): Promise<OrchestratorMemoryEntry[]>;

  /** Store session memory */
  storeSessionMemory(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<OrchestratorMemoryEntry>;

  /** Build context from memories */
  buildContext(
    userId: string,
    sessionId: string,
    query: string
  ): Promise<string>;

  /** Consolidate memories */
  consolidateMemories(userId: string): Promise<number>;

  /** Clear short-term memories */
  clearShortTerm(userId: string): Promise<void>;

  /** Clear session memories */
  clearSession(sessionId: string): Promise<void>;

  /** Clean up expired memories */
  cleanupExpiredMemories(): Promise<number>;

  /** Get memory statistics */
  getMemoryStats(userId: string): Promise<{
    shortTermCount: number;
    longTermCount: number;
    averageImportance: number;
  }>;

  /** Generate embedding for text */
  generateEmbedding(text: string): Promise<number[]>;
}

// ============================================
// Intent Classifier Interface
// ============================================

/**
 * IIntentClassifier - Classifies user intent
 */
export interface IIntentClassifier {
  /** Classify intent using various methods */
  classify(
    input: string,
    options?: ClassificationOptions
  ): Promise<IntentResult>;

  /** Classify using keywords (fast path) */
  classifyByKeywords(input: string): IntentResult | null;

  /** Classify using AI (slow but accurate) */
  classifyByAI(
    input: string,
    options?: ClassificationOptions
  ): Promise<IntentResult>;

  /** Extract entities from input */
  extractEntities(input: string): Record<string, any>;

  /** Get confidence level label */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low';

  /** Add custom keywords for an agent */
  addKeywords(agentType: AgentType, keywords: string[]): void;

  /** Remove keywords for an agent */
  removeKeywords(agentType: AgentType, keywords: string[]): void;

  /** Get keywords for an agent */
  getKeywords(agentType: AgentType): string[];

  /** Clear all custom keywords */
  clearCustomKeywords(): void;
}

// ============================================
// Task Planner Interface
// ============================================

/**
 * ITaskPlanner - Creates and manages task plans
 */
export interface ITaskPlanner {
  /** Create a plan from intent */
  createPlan(
    intent: IntentResult,
    context: Partial<AgentContext>,
    options?: PlanningOptions
  ): Promise<TaskPlan>;

  /** Create a simple plan for single agent */
  createSimplePlan(intent: IntentResult): TaskPlanStep[];

  /** Create a complex plan using AI */
  createComplexPlan(
    intent: IntentResult,
    context: Partial<AgentContext>
  ): Promise<{ steps: TaskPlanStep[]; mode: ExecutionMode }>;

  /** Create a fallback plan */
  createFallbackPlan(
    intent: IntentResult
  ): { steps: TaskPlanStep[]; mode: ExecutionMode };

  /** Validate a plan */
  validatePlan(plan: TaskPlan): PlanValidationResult;

  /** Optimize a plan */
  optimizePlan(plan: TaskPlan): PlanOptimizationResult;

  /** Optimize for parallel execution */
  optimizeForParallel(plan: TaskPlan): TaskPlan;

  /** Add fallback steps to a plan */
  addFallbacks(plan: TaskPlan): TaskPlan;

  /** Get plan summary */
  getPlanSummary(plan: TaskPlan): string;
}

// ============================================
// Execution Engine Interface
// ============================================

/**
 * IExecutionEngine - Executes task plans
 */
export interface IExecutionEngine {
  /** Execute a complete plan */
  execute(
    plan: TaskPlan,
    context: Partial<AgentContext>,
    options?: ExecutionOptions
  ): Promise<ChainExecutionResult>;

  /** Execute a single step */
  executeStep(
    step: TaskPlanStep,
    previousOutputs: Map<string, any>,
    context: Partial<AgentContext>,
    options?: ExecutionOptions
  ): Promise<StepExecutionResult>;

  /** Execute steps in parallel */
  executeParallel(
    steps: TaskPlanStep[],
    previousOutputs: Map<string, any>,
    context: Partial<AgentContext>,
    options?: ExecutionOptions
  ): Promise<StepExecutionResult[]>;

  /** Execute steps sequentially */
  executeSequential(
    steps: TaskPlanStep[],
    previousOutputs: Map<string, any>,
    context: Partial<AgentContext>,
    options?: ExecutionOptions
  ): Promise<StepExecutionResult[]>;

  /** Group steps for parallel execution */
  groupStepsByDependencies(steps: TaskPlanStep[]): TaskPlanStep[][];

  /** Resolve step input dependencies */
  resolveStepInput(
    input: any,
    previousOutputs: Map<string, any>
  ): any;

  /** Cancel execution */
  cancel(executionId: string): Promise<boolean>;

  /** Get execution status */
  getStatus(executionId: string): Promise<{
    state: OrchestratorStateType;
    progress: number;
    currentStep?: string;
    startedAt: Date;
    estimatedTimeRemainingMs?: number;
  } | null>;
}

// ============================================
// Reflection Engine Interface
// ============================================

/**
 * IReflectionEngine - Analyzes execution results
 */
export interface IReflectionEngine {
  /** Reflect on execution results */
  reflect(
    results: ChainExecutionResult,
    originalRequest?: string,
    context?: Partial<AgentContext>
  ): Promise<ExecutionReflection>;

  /** Generate follow-up suggestions */
  suggestFollowUps(
    results: any,
    userPreferences?: Record<string, any>,
    count?: number
  ): Promise<FollowUpSuggestion[]>;

  /** Analyze agent performance */
  analyzeAgentPerformance(
    results: ChainExecutionResult
  ): Record<string, {
    efficiency: number;
    reliability: number;
    recommendations: string[];
  }>;

  /** Store reflection insights */
  storeInsights(
    userId: string,
    reflection: ExecutionReflection
  ): Promise<void>;

  /** Learn from execution patterns */
  learnFromHistory(
    userId: string,
    maxEntries?: number
  ): Promise<{
    patterns: string[];
    recommendations: string[];
    confidence: number;
  }>;
}

// ============================================
// Orchestrator Cache Interface
// ============================================

/**
 * IOrchestratorCache - Caching interface for orchestrator
 */
export interface IOrchestratorCache {
  /** Get cached value */
  get<T>(key: string): Promise<T | null>;

  /** Set cached value */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /** Delete cached value */
  delete(key: string): Promise<void>;

  /** Clear all cached values */
  clear(): Promise<void>;

  /** Check if key exists */
  exists(key: string): Promise<boolean>;

  /** Get cache size */
  size(): Promise<number>;

  /** Get cache statistics */
  getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  }>;
}

// ============================================
// Orchestrator Rate Limiter Interface
// ============================================

/**
 * IOrchestratorRateLimiter - Rate limiting interface
 */
export interface IOrchestratorRateLimiter {
  /** Check if request is allowed */
  checkLimit(userId: string, agentType?: AgentType): Promise<{
    allowed: boolean;
    remaining: number;
    resetAfter: number;
    limit: number;
  }>;

  /** Record a request */
  recordRequest(
    userId: string,
    agentType?: AgentType,
    tokensUsed?: number,
    costUsd?: number
  ): Promise<void>;

  /** Get remaining quota */
  getRemaining(userId: string, agentType?: AgentType): Promise<number>;

  /** Get reset time */
  getResetTime(userId: string, agentType?: AgentType): Promise<Date>;

  /** Check global rate limit */
  checkGlobalLimit(): Promise<{
    allowed: boolean;
    remaining: number;
    resetAfter: number;
  }>;

  /** Reset limits for a user */
  resetLimits(userId: string): Promise<void>;
}

// ============================================
// Orchestrator Logger Interface
// ============================================

/**
 * IOrchestratorLogger - Logging interface for orchestrator
 */
export interface IOrchestratorLogger {
  /** Log info message */
  info(message: string, metadata?: Record<string, any>): void;

  /** Log warning message */
  warn(message: string, metadata?: Record<string, any>): void;

  /** Log error message */
  error(message: string, error?: Error, metadata?: Record<string, any>): void;

  /** Log debug message */
  debug(message: string, metadata?: Record<string, any>): void;

  /** Log state transition */
  logStateTransition(
    from: OrchestratorStateType,
    to: OrchestratorStateType,
    reason?: string
  ): void;

  /** Log intent classification */
  logIntentClassification(input: string, intent: IntentResult): void;

  /** Log plan creation */
  logPlanCreation(plan: TaskPlan): void;

  /** Log step execution */
  logStepExecution(
    stepId: string,
    agentType: AgentType,
    result: StepExecutionResult
  ): void;

  /** Log agent delegation */
  logAgentDelegation(
    request: AgentDelegationRequest,
    result: AgentDelegationResult
  ): void;

  /** Get recent logs */
  getRecentLogs(limit?: number): Array<{
    level: string;
    message: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}

// ============================================
// Orchestrator Monitor Interface
// ============================================

/**
 * IOrchestratorMonitor - Monitoring interface
 */
export interface IOrchestratorMonitor {
  /** Record a metric */
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void;

  /** Increment a counter */
  incrementCounter(
    name: string,
    tags?: Record<string, string>
  ): void;

  /** Start timing an operation */
  startTimer(name: string, tags?: Record<string, string>): () => void;

  /** Record an error */
  recordError(
    errorType: string,
    error: Error,
    context?: Record<string, any>
  ): void;

  /** Record a state transition */
  recordStateTransition(
    from: string,
    to: string
  ): void;

  /** Record resource usage */
  recordResourceUsage(usage: ResourceUsageSummary): void;

  /** Get current metrics snapshot */
  getMetricsSnapshot(): OrchestratorMetrics;

  /** Get metrics time series */
  getMetricsTimeSeries(
    metricName: string,
    timeRange: { start: Date; end: Date }
  ): Array<{ timestamp: Date; value: number }>;

  /** Export metrics */
  exportMetrics(
    format: 'json' | 'csv' | 'prometheus'
  ): Promise<string>;
}

// ============================================
// Orchestrator Notification Interface
// ============================================

/**
 * IOrchestratorNotifier - Notification interface
 */
export interface IOrchestratorNotifier {
  /** Send notification to user */
  notifyUser(
    userId: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error',
    data?: Record<string, any>
  ): Promise<void>;

  /** Send execution complete notification */
  notifyExecutionComplete(
    userId: string,
    result: ChainExecutionResult
  ): Promise<void>;

  /** Send execution error notification */
  notifyExecutionError(
    userId: string,
    error: Error,
    executionId?: string
  ): Promise<void>;

  /** Send rate limit warning */
  notifyRateLimitWarning(
    userId: string,
    limit: number,
    remaining: number
  ): Promise<void>;

  /** Broadcast to all connected users */
  broadcast(
    message: string,
    type?: string,
    data?: Record<string, any>
  ): Promise<void>;
}

// ============================================
// Orchestrator Service Provider Interface (SPI)
// ============================================

/**
 * IOrchestratorServiceProvider - Service provider interface
 * for dependency injection of external services
 */
export interface IOrchestratorServiceProvider {
  /** Get AI text generation service */
  getTextGenerationService(): {
    generateText(prompt: string, options?: any): Promise<{
      content: string;
      model: string;
      provider: string;
      tokensUsed: number;
      costUsd: number;
    }>;
    generateTextStreaming(
      prompt: string,
      onChunk: (chunk: any) => void,
      options?: any
    ): Promise<{
      content: string;
      provider: string;
      tokensUsed: number;
      costUsd: number;
    }>;
  };

  /** Get intent classification service */
  getIntentClassificationService(): {
    classify(input: string, options?: ClassificationOptions): Promise<IntentResult>;
    classifyBatch(inputs: string[], options?: ClassificationOptions): Promise<IntentResult[]>;
  };

  /** Get memory service */
  getMemoryService(): {
    store(userId: string, content: string, type?: string, importance?: number): Promise<any>;
    retrieve(userId: string, query: string, limit?: number): Promise<any[]>;
    consolidate(userId: string): Promise<number>;
  };

  /** Get notification service */
  getNotificationService(): {
    send(userId: string, message: string, type?: string): Promise<void>;
    sendEmail(userId: string, subject: string, body: string): Promise<void>;
  };

  /** Get analytics service */
  getAnalyticsService(): {
    trackEvent(event: string, data: Record<string, any>): Promise<void>;
    getMetrics(timeRange?: { start: Date; end: Date }): Promise<any>;
    generateReport(options?: any): Promise<any>;
  };

  /** Get billing service */
  getBillingService(): {
    checkLimits(userId: string): Promise<{ allowed: boolean; limits: any }>;
    trackUsage(userId: string, action: string, cost: number): Promise<void>;
  };
}

// ============================================
// Composite Orchestrator Interface
// ============================================

/**
 * IFullOrchestrator - Complete orchestrator interface
 * Combines all sub-interfaces for the ultimate orchestrator
 */
export interface IFullOrchestrator
  extends IOrchestrator,
    IOrchestratorToolExecutor,
    IOrchestratorStateManager,
    IOrchestratorMemoryManager {
  
  /** Get intent classifier */
  getIntentClassifier(): IIntentClassifier;

  /** Get task planner */
  getTaskPlanner(): ITaskPlanner;

  /** Get execution engine */
  getExecutionEngine(): IExecutionEngine;

  /** Get reflection engine */
  getReflectionEngine(): IReflectionEngine;

  /** Get cache */
  getCache(): IOrchestratorCache;

  /** Get rate limiter */
  getRateLimiter(): IOrchestratorRateLimiter;

  /** Get logger */
  getLogger(): IOrchestratorLogger;

  /** Get monitor */
  getMonitor(): IOrchestratorMonitor;

  /** Get notifier */
  getNotifier(): IOrchestratorNotifier;

  /** Get service provider */
  getServiceProvider(): IOrchestratorServiceProvider;

  /** Set service provider */
  setServiceProvider(provider: IOrchestratorServiceProvider): void;

  /** Get plugin manager */
  getPluginManager(): {
    register(plugin: IOrchestratorPlugin): void;
    unregister(pluginName: string): void;
    getPlugins(): IOrchestratorPlugin[];
  };
}

// ============================================
// Orchestrator Response Builder Interface
// ============================================

/**
 * IOrchestratorResponseBuilder - Builds user-facing responses
 */
export interface IOrchestratorResponseBuilder {
  /** Build response from execution results */
  buildResponse(
    results: ChainExecutionResult,
    intent: IntentResult,
    reflection?: ExecutionReflection,
    followUps?: FollowUpSuggestion[]
  ): OrchestratorResponse;

  /** Build error response */
  buildErrorResponse(
    error: Error,
    intent?: IntentResult,
    executionId?: string
  ): OrchestratorResponse;

  /** Build streaming response chunk */
  buildStreamChunk(
    type: OrchestratorStreamChunkType,
    content: string,
    metadata?: Record<string, any>
  ): OrchestratorStreamChunk;

  /** Build progress update */
  buildProgressUpdate(
    executionId: string,
    progress: number,
    currentStep?: string
  ): OrchestratorStreamChunk;
}

// ============================================
// Orchestrator Context Builder Interface
// ============================================

/**
 * IOrchestratorContextBuilder - Builds agent context
 */
export interface IOrchestratorContextBuilder {
  /** Build context for agent execution */
  buildContext(
    userId: string,
    sessionId: string,
    intent: IntentResult,
    memories?: OrchestratorMemoryEntry[]
  ): AgentContext;

  /** Enrich context with user preferences */
  enrichWithPreferences(
    context: AgentContext,
    userId: string
  ): Promise<AgentContext>;

  /** Enrich context with memories */
  enrichWithMemories(
    context: AgentContext,
    memories: OrchestratorMemoryEntry[]
  ): AgentContext;

  /** Enrich context with plan */
  enrichWithPlan(
    context: AgentContext,
    plan: TaskPlan
  ): AgentContext;
}

// ============================================
// Default No-Op Implementations for Testing
// ============================================

/**
 * Create a no-op orchestrator for testing
 */
export function createNoopOrchestrator(): IOrchestrator {
  return {
    initialize: async () => {},
    shutdown: async () => {},
    getHealth: async () => ({
      state: OrchestratorStateType.IDLE,
      isHealthy: true,
      currentLoad: 0,
      queueLength: 0,
      activeExecutions: 0,
      waitingExecutions: 0,
      metrics: {} as OrchestratorMetrics,
      lastHeartbeat: new Date(),
      uptime: 0,
      version: 'noop',
    }),
    getMetrics: () => ({} as OrchestratorMetrics),
    resetMetrics: () => {},
    classifyIntent: async (input) => ({
      primaryIntent: 'general_assistance',
      confidence: 1,
      alternativeIntents: [],
      entities: {},
      suggestedAgent: AgentType.ORCHESTRATOR,
      requiresMultipleAgents: false,
      classificationMethod: 'noop',
    }),
    classifyIntentsBatch: async (inputs) => inputs.map(i => ({
      id: i.id,
      intent: {
        primaryIntent: 'general_assistance',
        confidence: 1,
        alternativeIntents: [],
        entities: {},
        suggestedAgent: AgentType.ORCHESTRATOR,
        requiresMultipleAgents: false,
        classificationMethod: 'noop',
      },
    })),
    createPlan: async (intent) => ({
      id: 'noop_plan',
      steps: [],
      mode: ExecutionMode.SEQUENTIAL,
      createdAt: new Date(),
    }),
    optimizePlan: async (plan) => ({
      originalSteps: plan.steps.length,
      optimizedSteps: plan.steps.length,
      originalEstimatedTokens: 0,
      optimizedEstimatedTokens: 0,
      savingsPercentage: 0,
      changes: [],
      optimizedPlan: plan,
      optimizationTimeMs: 0,
    }),
    validatePlan: (plan) => ({
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    }),
    executePlan: async () => ({
      planId: 'noop',
      steps: [],
      finalOutput: null,
      totalTimeMs: 0,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      success: true,
      executionMode: ExecutionMode.SEQUENTIAL,
      successfulSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      fallbackSteps: [],
      startedAt: new Date(),
      completedAt: new Date(),
    }),
    executePlanStreaming: async (plan, context, onChunk) => ({
      planId: 'noop',
      steps: [],
      finalOutput: null,
      totalTimeMs: 0,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      success: true,
      executionMode: ExecutionMode.SEQUENTIAL,
      successfulSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      fallbackSteps: [],
      startedAt: new Date(),
      completedAt: new Date(),
    }),
    cancelExecution: async () => true,
    getExecutionProgress: async () => null,
    delegateToAgent: async () => ({
      success: true,
      output: null,
      agentType: AgentType.ORCHESTRATOR,
      executionTimeMs: 0,
      tokensUsed: 0,
      costUsd: 0,
      retryCount: 0,
    }),
    executeMultiAgent: async (agents, mode) => ({
      results: [],
      mode,
      totalSuccess: 0,
      totalFailed: 0,
      totalTimeMs: 0,
    }),
    storeMemory: async () => ({
      id: 'noop',
      content: '',
      type: MemoryType.SHORT_TERM,
      importance: 0,
      timestamp: new Date(),
      accessCount: 0,
    }),
    retrieveMemories: async () => ({
      memories: [],
      query: '',
      totalFound: 0,
      retrievalTimeMs: 0,
      usedVectorSearch: false,
    }),
    consolidateMemories: async () => 0,
    getMemoryStatistics: async () => ({
      totalMemories: 0,
      shortTermCount: 0,
      longTermCount: 0,
      episodicCount: 0,
      semanticCount: 0,
      averageImportance: 0,
      totalEmbeddingTokens: 0,
      totalEmbeddingCostUsd: 0,
      retrievalStats: {
        totalRetrievals: 0,
        averageRetrievalTimeMs: 0,
        cacheHitRate: 0,
      },
      byAgentType: {},
      bySession: {},
    }),
    clearMemories: async () => true,
    reflectOnExecution: async () => ({
      summary: '',
      insights: [],
      improvements: [],
      agentPerformance: {},
      recommendedNextSteps: [],
      overallScore: 0,
      successRate: 100,
      timestamp: new Date(),
      generationTimeMs: 0,
      insightsStored: false,
    }),
    suggestFollowUps: async () => [],
    executeBatch: async () => ({
      results: [],
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTimeMs: 0,
      totalTokensUsed: 0,
      totalCostUsd: 0,
    }),
    preprocessBatch: async (requests) => requests.map(r => ({
      id: r.id,
      intent: {
        primaryIntent: 'general_assistance',
        confidence: 1,
        alternativeIntents: [],
        entities: {},
        suggestedAgent: AgentType.ORCHESTRATOR,
        requiresMultipleAgents: false,
        classificationMethod: 'noop',
      },
      estimatedCostUsd: 0,
      estimatedTimeMs: 0,
    })),
    generateText: async (prompt) => ({
      content: prompt,
      model: 'noop',
      provider: 'noop',
      tokensUsed: 0,
      costUsd: 0,
    }),
    generateTextStreaming: async (prompt, onChunk) => {
      onChunk({ type: 'content', content: prompt, progress: 100 });
      return { content: prompt, provider: 'noop', tokensUsed: 0, costUsd: 0 };
    },
    createSession: async (userId) => ({
      id: 'noop_session',
      userId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      messageCount: 0,
      context: {},
      messageHistory: [],
      isActive: true,
    }),
    getSession: async () => null,
    getUserSessions: async () => [],
    endSession: async () => true,
    addSessionMessage: async () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    emitEvent: () => {},
    updateConfig: () => {},
    getConfig: () => ({} as OrchestratorConfig),
    resetConfig: () => {},
    getAvailableAgents: async () => [],
    getAgentCapabilities: async () => null,
    matchAgentForTask: async () => ({
      agentType: AgentType.ORCHESTRATOR,
      confidence: 1,
      rationale: 'noop',
      alternatives: [],
    }),
  };
}