// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/orchestrator.types.ts
import { AgentType, AgentRequest, AgentResponse, AgentContext, MemoryEntry, StreamingChunk } from '../../types/agent.types';

// ============================================
// Orchestrator State Machine
// ============================================

/**
 * Orchestrator state machine states
 * INTENT_PARSE → PLAN → EXECUTE → REFLECT → RESPOND
 */
export enum OrchestratorStateType {
  /** Idle state - ready to accept new requests */
  IDLE = 'idle',
  /** Parsing user intent from input */
  INTENT_PARSE = 'intent_parse',
  /** Creating execution plan */
  PLAN = 'plan',
  /** Executing the plan steps */
  EXECUTE = 'execute',
  /** Reflecting on execution results */
  REFLECT = 'reflect',
  /** Generating final response */
  RESPOND = 'respond',
  /** Error state - execution failed */
  ERROR = 'error',
  /** Maintenance mode */
  MAINTENANCE = 'maintenance',
  /** Waiting for external input */
  WAITING = 'waiting',
  /** Cancelling current execution */
  CANCELLING = 'cancelling',
}

/**
 * State transition map for validation
 */
export const VALID_STATE_TRANSITIONS: Record<OrchestratorStateType, OrchestratorStateType[]> = {
  [OrchestratorStateType.IDLE]: [
    OrchestratorStateType.INTENT_PARSE,
    OrchestratorStateType.MAINTENANCE,
  ],
  [OrchestratorStateType.INTENT_PARSE]: [
    OrchestratorStateType.PLAN,
    OrchestratorStateType.RESPOND,
    OrchestratorStateType.ERROR,
  ],
  [OrchestratorStateType.PLAN]: [
    OrchestratorStateType.EXECUTE,
    OrchestratorStateType.RESPOND,
    OrchestratorStateType.ERROR,
  ],
  [OrchestratorStateType.EXECUTE]: [
    OrchestratorStateType.REFLECT,
    OrchestratorStateType.RESPOND,
    OrchestratorStateType.ERROR,
    OrchestratorStateType.WAITING,
  ],
  [OrchestratorStateType.REFLECT]: [
    OrchestratorStateType.RESPOND,
    OrchestratorStateType.EXECUTE,
    OrchestratorStateType.ERROR,
  ],
  [OrchestratorStateType.RESPOND]: [
    OrchestratorStateType.IDLE,
    OrchestratorStateType.ERROR,
  ],
  [OrchestratorStateType.ERROR]: [
    OrchestratorStateType.IDLE,
    OrchestratorStateType.RESPOND,
  ],
  [OrchestratorStateType.MAINTENANCE]: [
    OrchestratorStateType.IDLE,
  ],
  [OrchestratorStateType.WAITING]: [
    OrchestratorStateType.EXECUTE,
    OrchestratorStateType.ERROR,
    OrchestratorStateType.CANCELLING,
  ],
  [OrchestratorStateType.CANCELLING]: [
    OrchestratorStateType.IDLE,
    OrchestratorStateType.RESPOND,
  ],
};

// ============================================
// Intent Classification Types
// ============================================

// NOTE: IntentResult used to be duplicated here as a separate interface from
// the one in ../../types/agent.types.ts. Having two independently-maintained
// interfaces with the same name caused real type errors (ClassificationResult
// in intent-classifier.ts extends the agent.types.ts version, so code that
// used *this* file's copy of IntentResult was structurally incompatible with
// it). Consolidated to a single source of truth, re-exported here so existing
// imports of `IntentResult` from this file keep working.
export type { IntentResult } from '../../types/agent.types';

export interface ClassificationOptions {
  confidenceThreshold?: number;
  maxAlternatives?: number;
  useCache?: boolean;
  cacheTTL?: number;
  useAIFallback?: boolean;
  extractEntities?: boolean;
  includeComplexityEstimation?: boolean;
  preferredMethod?: 'keyword' | 'ai' | 'hybrid';
  entityPatterns?: Record<string, RegExp>;
  domainKeywords?: Record<AgentType, string[]>;
}

export interface IntentHistoryEntry {
  id: string;
  userId: string;
  sessionId?: string;
  input: string;
  intent: IntentResult;
  wasCorrect?: boolean;
  correctedIntent?: string;
  timestamp: Date;
  processingTimeMs: number;
  model?: string;
  classificationMethod?: 'keyword' | 'ai' | 'hybrid' | 'rule_based' | 'fallback';
}

// ============================================
// Fallback Strategy Types
// ============================================

export enum FallbackStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  FAIL_PLAN = 'fail_plan',
  FALLBACK_AGENT = 'fallback_agent',
  DEGRADE = 'degrade',
  SWITCH_MODEL = 'switch_model',
  SWITCH_PROVIDER = 'switch_provider',
}

// ============================================
// Circuit Breaker Types
// ============================================

export interface CircuitBreakerState {
  failureCount: number;
  lastFailure: number;
  isOpen: boolean;
  openUntil: number;
}

// ============================================
// Execution State Persistence Types
// ============================================

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'skipped' | 'timeout';
export type ExecutionStatusType = 'running' | 'completed' | 'failed' | 'partial_success' | 'cancelled';

export interface StepTaskState {
  stepId: string;
  status: StepStatus;
  agentType: string;
  retryCount: number;
  maxRetries: number;
  startedAt?: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
  tokensUsed?: number;
  costUsd?: number;
  fallbackUsed?: boolean;
  fallbackAgentType?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionTaskState {
  executionId: string;
  planId: string;
  stepStates: StepTaskState[];
  overallStatus: ExecutionStatusType;
  totalTokensUsed?: number;
  totalCostUsd?: number;
  startedAt?: Date;
  completedAt?: Date;
  persistedAt: Date;
  resumedAt?: Date;
  version?: number;
  metadata?: Record<string, any>;
}

// ============================================
// Task Planning Types
// ============================================

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  PIPELINE = 'pipeline',
  FAN_OUT = 'fan_out',
  FAN_IN = 'fan_in',
}

export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface TaskPlanStep {
  id: string;
  agentType: AgentType;
  action: string;
  input: any;
  dependsOn: string[];
  parallelGroup?: string;
  fallback?: TaskPlanStep;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  description?: string;
  estimatedCostUsd?: number;
  estimatedTokens?: number;
  condition?: string;
  loopConfig?: {
    maxIterations: number;
    condition: string;
    breakOnError?: boolean;
  };
  metadata?: Record<string, any>;
  optional?: boolean;
  skip?: boolean;
  timeoutBehavior?: 'retry' | 'fallback' | 'skip' | 'fail';
  /** ENHANCEMENT: What to do when this step fails */
  onFailure?: FallbackStrategy;
  /** ENHANCEMENT: Which step to execute on partial success */
  onPartial?: string;
  /** ENHANCEMENT: Maximum time to wait before considering step as timed out */
  executionTimeoutMs?: number;
}

export interface TaskPlan {
  id: string;
  steps: TaskPlanStep[];
  mode: ExecutionMode;
  estimatedTokens?: number;
  estimatedCostUsd?: number;
  createdAt: Date;
  expiresAt?: Date;
  priority?: TaskPriority;
  metadata?: Record<string, any>;
  parentPlanId?: string;
  version?: number;
  /** ENHANCEMENT: Whether this plan was created from a saved state */
  resumedFromState?: boolean;
}

export interface PlanningOptions {
  maxSteps?: number;
  enableParallelization?: boolean;
  enableFallbacks?: boolean;
  estimatedCost?: boolean;
  optimizationGoal?: 'speed' | 'cost' | 'accuracy' | 'balanced';
  maxDepth?: number;
  timeout?: number;
  preferredAgents?: AgentType[];
  excludedAgents?: AgentType[];
  validationRules?: PlanValidationRule[];
}

export interface PlanValidationRule {
  id: string;
  description: string;
  validate: (plan: TaskPlan) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  suggestions?: string[];
}

/**
 * Result of optimizing a TaskPlan (see TaskPlanner.optimizePlan)
 */
export interface PlanOptimizationResult {
  originalSteps: number;
  optimizedSteps: number;
  originalEstimatedTokens: number;
  optimizedEstimatedTokens: number;
  savingsPercentage: number;
  changes: string[];
  optimizedPlan: TaskPlan;
  optimizationTimeMs: number;
}

// ============================================
// Execution Types
// ============================================

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
  startedAt?: Date;
  completedAt?: Date;
  status?: StepStatus;
  fallbackUsed?: boolean;
  fallbackAgentType?: AgentType;
  agentMetadata?: Record<string, any>;
  input?: any;
  dependenciesMet?: string[];
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
  executionMode: ExecutionMode;
  successfulSteps: number;
  failedSteps: number;
  skippedSteps: number;
  fallbackSteps: string[];
  startedAt: Date;
  completedAt: Date;
  wasCancelled?: boolean;
  resourceUsage?: ResourceUsageSummary;
}

export interface ResourceUsageSummary {
  cpuTimeMs: number;
  memoryPeakMb: number;
  apiCalls: number;
  networkBytesTransferred: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface ExecutionOptions {
  maxRetries?: number;
  parallel?: boolean;
  stopOnError?: boolean;
  timeout?: number;
  priority?: TaskPriority;
  onStepComplete?: (result: StepExecutionResult) => void | Promise<void>;
  onError?: (error: Error, stepId: string) => void | Promise<void>;
  sharedContext?: Record<string, any>;
  storeInMemory?: boolean;
  generateEmbeddings?: boolean;
  executionId?: string;
}

// ============================================
// Pre-Execution Check Types
// ============================================

export interface PreExecutionCheck {
  allowed: boolean;
  estimatedCost: number;
  estimatedTokens: number;
  currentUsage: {
    aiActions: number;
    apiCalls: number;
  };
  limits: {
    aiActions: number;
    apiCalls: number;
  };
  remainingAfter: {
    aiActions: number;
    apiCalls: number;
  };
  overageCost: number;
  reason?: string;
  recommendation?: {
    planId: string;
    planName: string;
    savings: number;
    upgradeUrl: string;
  };
}

// ============================================
// Memory Management Types
// ============================================

export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
}

export interface OrchestratorMemoryEntry extends MemoryEntry {
  type: MemoryType;
  embedding?: number[];
  importance: number;
  accessCount: number;
  lastAccessedAt?: Date;
  ttlHours?: number;
  expiresAt?: Date;
  source?: 'user_input' | 'agent_output' | 'reflection' | 'system' | 'external';
  sessionId?: string;
  agentType?: AgentType;
  tags?: string[];
  embeddingModel?: string;
  embeddingDimensions?: number;
  similarity?: number;
}

export interface MemoryRetrievalOptions {
  limit?: number;
  minImportance?: number;
  includeTypes?: MemoryType[];
  excludeTypes?: MemoryType[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  agentType?: AgentType;
  sessionId?: string;
  tags?: string[];
  sortBy?: 'similarity' | 'importance' | 'recency' | 'accessCount';
  sortDirection?: 'asc' | 'desc';
  includeSimilarity?: boolean;
  useVectorSearch?: boolean;
  minSimilarity?: number;
  deduplicate?: boolean;
  maxAgeHours?: number;
}

export interface MemoryRetrievalResult {
  memories: OrchestratorMemoryEntry[];
  query: string;
  totalFound: number;
  retrievalTimeMs: number;
  usedVectorSearch: boolean;
  embeddingModel?: string;
}

export interface MemoryConsolidationOptions {
  minImportance?: number;
  maxShortTermMemories?: number;
  strategy?: 'importance' | 'recency' | 'frequency' | 'hybrid';
  generateEmbeddings?: boolean;
  mergeSimilar?: boolean;
  mergeThreshold?: number;
}

export interface MemoryStatistics {
  totalMemories: number;
  shortTermCount: number;
  longTermCount: number;
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  workingCount: number;
  averageImportance: number;
  totalEmbeddingTokens: number;
  totalEmbeddingCostUsd: number;
  retrievalStats: {
    totalRetrievals: number;
    averageRetrievalTimeMs: number;
    cacheHitRate: number;
  };
  byAgentType: Record<string, number>;
  bySession: Record<string, number>;
  bySource: Record<string, number>;
}

// ============================================
// Reflection & Analysis Types
// ============================================

export interface AgentPerformance {
  success: boolean;
  efficiency: number;
  reliability: number;
  averageResponseTimeMs: number;
  recommendations: string[];
}

export interface ExecutionReflection {
  summary: string;
  insights: string[];
  improvements: string[];
  agentPerformance: Record<string, AgentPerformance>;
  recommendedNextSteps: string[];
  overallScore: number;
  successRate: number;
  timestamp: Date;
  generationTimeMs: number;
  model?: string;
  insightsStored: boolean;
}

export interface FollowUpSuggestion {
  action: string;
  description: string;
  agentType: AgentType;
  confidence: number;
  expectedBenefit: string;
  estimatedTimeMs?: number;
  priority?: TaskPriority;
  preconditions?: string[];
  samplePrompt?: string;
}

// ============================================
// Orchestrator Response Types
// ============================================

export interface OrchestratorResponse {
  message: string;
  data: any;
  executionSummary: {
    totalTimeMs: number;
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalTokensUsed: number;
    totalCostUsd: number;
    intent?: string;
    suggestedAgent?: AgentType;
    executionMode?: ExecutionMode;
    planId?: string;
    fallbacksUsed?: boolean;
    status: 'success' | 'partial_success' | 'failed' | 'cancelled' | 'rejected';
    error?: string;
  };
  followUpSuggestions?: FollowUpSuggestion[];
  reflection?: Partial<ExecutionReflection>;
  generationTimeMs: number;
}

// ============================================
// Orchestrator Configuration Types
// ============================================

export interface OrchestratorConfig {
  maxStepsPerPlan: number;
  maxRetriesPerStep: number;
  maxPlanRetries: number;
  maxConcurrentExecutions: number;
  defaultTimeoutMs: number;
  executionTimeoutMs: number;
  enableAutomaticFallbacks: boolean;
  enablePlanOptimization: boolean;
  enableMemoryConsolidation: boolean;
  enableExecutionReflection: boolean;
  enablePreExecutionCostCheck: boolean;
  enableCircuitBreaker: boolean;
  enableBackpressure: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  defaultModel: string;
  modelFallbackChain: string[];
  classificationOptions: ClassificationOptions;
  planningOptions: PlanningOptions;
  executionOptions: ExecutionOptions;
  memoryOptions: {
    maxShortTermEntries: number;
    shortTermTTLSeconds: number;
    longTermImportanceThreshold: number;
    enableVectorSearch: boolean;
  };
  streamingOptions?: {
    enabled: boolean;
    chunkDelayMs: number;
    maxChunkSize: number;
  };
  rateLimiting?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    costPerHour: number;
  };
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxStepsPerPlan: 10,
  maxRetriesPerStep: 3,
  maxPlanRetries: 2,
  maxConcurrentExecutions: 10,
  defaultTimeoutMs: 30000,
  executionTimeoutMs: 300000, // 5 minutes
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
    priority: TaskPriority.NORMAL,
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
// Orchestrator Metrics Types
// ============================================

export interface OrchestratorMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  partialSuccessExecutions: number;
  rejectedExecutions: number;
  averageExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  averageStepsPerExecution: number;
  averageAgentsPerExecution: number;
  fallbackUsageRate: number;
  circuitBreakerTriggerRate: number;
  classificationAccuracy: number;
  planOptimizationSavingsUsd: number;
  memoryHitRate: number;
  backpressureRejectionRate: number;
  executionResumeRate: number;
  errorRateByState: Record<OrchestratorStateType, number>;
  agentUsageDistribution: Record<string, number>;
  modelUsageDistribution: Record<string, number>;
  circuitBreakerStatus: Record<string, CircuitBreakerState>;
}

export interface OrchestratorHealthStatus {
  state: OrchestratorStateType;
  isHealthy: boolean;
  currentLoad: number;
  queueLength: number;
  activeExecutions: number;
  waitingExecutions: number;
  rejectedExecutions: number;
  metrics: OrchestratorMetrics;
  lastHeartbeat: Date;
  uptime: number;
  errorMessage?: string;
  version: string;
}

// ============================================
// Orchestrator Internal State Types
// ============================================

export interface OrchestratorInternalState {
  currentState: OrchestratorStateType;
  intent: IntentResult | null;
  plan: TaskPlan | null;
  executionId: string | null;
  executionResults: Map<string, StepExecutionResult>;
  currentStepIndex: number;
  finalOutput: any;
  error: string | null;
  startTime: number;
  modelFallbackChain: string[];
  currentModelIndex: number;
  injectedMemories: OrchestratorMemoryEntry[];
  totalTokensUsed: number;
  totalCostUsd: number;
  retryCount: number;
  /** ENHANCEMENT: Completed steps to skip on retry */
  completedSteps: Set<string>;
  stateHistory: Array<{
    from: OrchestratorStateType;
    to: OrchestratorStateType;
    timestamp: Date;
    reason?: string;
  }>;
  pendingFollowUps?: FollowUpSuggestion[];
  userPreferences?: Record<string, any>;
  sessionContext?: {
    id: string;
    startedAt: Date;
    messageCount: number;
    topicShiftDetected: boolean;
  };
}

// ============================================
// Orchestrator Event Types
// ============================================

export enum OrchestratorEventType {
  STATE_CHANGE = 'state_change',
  INTENT_CLASSIFIED = 'intent_classified',
  PLAN_CREATED = 'plan_created',
  PLAN_OPTIMIZED = 'plan_optimized',
  STEP_STARTED = 'step_started',
  STEP_COMPLETED = 'step_completed',
  STEP_FAILED = 'step_failed',
  STEP_RETRYING = 'step_retrying',
  FALLBACK_USED = 'fallback_used',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed',
  EXECUTION_TIMEOUT = 'execution_timeout',
  EXECUTION_RESUMED = 'execution_resumed',
  REFLECTION_GENERATED = 'reflection_generated',
  MEMORY_STORED = 'memory_stored',
  MEMORY_RETRIEVED = 'memory_retrieved',
  FOLLOW_UP_SUGGESTED = 'follow_up_suggested',
  ERROR_OCCURRED = 'error_occurred',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  TIMEOUT_OCCURRED = 'timeout_occurred',
  CIRCUIT_BREAKER_OPENED = 'circuit_breaker_opened',
  CIRCUIT_BREAKER_CLOSED = 'circuit_breaker_closed',
  BACKPRESSURE_REJECTED = 'backpressure_rejected',
  COST_THRESHOLD_EXCEEDED = 'cost_threshold_exceeded',
}

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  executionId?: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface OrchestratorEventListener {
  onStateChange?: (
    from: OrchestratorStateType,
    to: OrchestratorStateType,
    state: OrchestratorInternalState,
  ) => void;
  onIntentClassified?: (
    intent: IntentResult,
    state: OrchestratorInternalState,
  ) => void;
  onPlanCreated?: (
    plan: TaskPlan,
    state: OrchestratorInternalState,
  ) => void;
  onStepCompleted?: (
    result: StepExecutionResult,
    state: OrchestratorInternalState,
  ) => void;
  onStepFailed?: (
    result: StepExecutionResult,
    state: OrchestratorInternalState,
  ) => void;
  onExecutionCompleted?: (
    result: ChainExecutionResult,
    state: OrchestratorInternalState,
  ) => void;
  onError?: (
    error: Error,
    state: OrchestratorInternalState,
  ) => void;
  onCircuitBreakerChange?: (
    agentType: string,
    breaker: CircuitBreakerState,
  ) => void;
  onBackpressureRejected?: (
    userId: string,
    reason: string,
  ) => void;
}

// ============================================
// Agent Delegation Types
// ============================================

export interface AgentDelegationRequest {
  agentType: AgentType;
  task: string;
  input?: any;
  context?: Partial<AgentContext>;
  priority?: TaskPriority;
  timeout?: number;
  useCache?: boolean;
  cacheTTL?: number;
  fallbackAgents?: AgentType[];
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface AgentDelegationResult {
  success: boolean;
  output: any;
  error?: string;
  agentType: AgentType;
  executionTimeMs: number;
  tokensUsed: number;
  costUsd: number;
  retryCount: number;
  fallbackUsed?: boolean;
  fallbackChain?: AgentType[];
  metadata?: Record<string, any>;
  /** ENHANCEMENT: Whether circuit breaker was triggered */
  circuitBreakerTriggered?: boolean;
}

// ============================================
// Batch Execution Types
// ============================================

export interface BatchExecutionRequest {
  requests: Array<{
    id: string;
    input: string;
    context?: Partial<AgentContext>;
    priority?: TaskPriority;
  }>;
  maxConcurrent?: number;
  stopOnError?: boolean;
  timeout?: number;
  prioritizeSpeed?: boolean;
}

export interface BatchExecutionResult {
  results: Array<{
    requestId: string;
    intent?: Partial<IntentResult>;
    output: any;
    success: boolean;
    error?: string;
    executionTimeMs: number;
    tokensUsed: number;
    costUsd: number;
    status?: ExecutionStatusType;
  }>;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  partialSuccessRequests: number;
  totalTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

// ============================================
// Streaming Types
// ============================================

export enum OrchestratorStreamChunkType {
  THINKING = 'thinking',
  INTENT_CLASSIFYING = 'intent_classifying',
  INTENT_RESULT = 'intent_result',
  PLANNING = 'planning',
  PLAN_CREATED = 'plan_created',
  STEP_STARTED = 'step_started',
  STEP_PROGRESS = 'step_progress',
  STEP_COMPLETED = 'step_completed',
  AGENT_OUTPUT = 'agent_output',
  REFLECTING = 'reflecting',
  FINAL_OUTPUT = 'final_output',
  ERROR = 'error',
  WARNING = 'warning',
  CIRCUIT_BREAKER_WARNING = 'circuit_breaker_warning',
  COST_WARNING = 'cost_warning',
  BACKPRESSURE_WARNING = 'backpressure_warning',
}

export interface OrchestratorStreamChunk extends StreamingChunk {
  type: OrchestratorStreamChunkType | string;
  content: string;
  progress?: number;
  state?: OrchestratorStateType;
  currentStep?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// ============================================
// Orchestrator Session Types
// ============================================

export interface OrchestratorSession {
  id: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  context: Partial<AgentContext>;
  messageHistory: Array<{
    role: 'user' | 'orchestrator' | 'agent';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  activePlan?: TaskPlan;
  activeExecution?: ExecutionTaskState;
  pendingFollowUps?: FollowUpSuggestion[];
  metadata?: Record<string, any>;
  isActive: boolean;
}

// ============================================
// Agent Capability Types
// ============================================

export interface AgentCapability {
  type: AgentType;
  name: string;
  description: string;
  version: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
    cost: number;
  }>;
  status: 'idle' | 'running' | 'error' | 'degraded' | 'maintenance';
  metrics?: {
    totalExecutions: number;
    successRate: number;
    averageResponseTimeMs: number;
    errorRate: number;
  };
  requiredScopes?: string[];
  minimumPlan?: string;
  /** ENHANCEMENT: Circuit breaker status */
  circuitBreaker?: CircuitBreakerState;
}

export interface AgentMatchResult {
  agentType: AgentType;
  confidence: number;
  rationale: string;
  alternatives: AgentType[];
}

// ============================================
// Agent Execution Contract (ENHANCEMENT)
// ============================================

export interface AgentExecutionContract {
  status: 'success' | 'partial_success' | 'failed';
  data: Record<string, any>;
  errors?: Array<{
    stepId: string;
    message: string;
    recoverable: boolean;
    code?: string;
  }>;
  cost: {
    tokens: number;
    usd: number;
  };
  nextSteps?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

// ============================================
// Agent Selection Types
// ============================================

export interface AgentSelection {
  agentType: string;
  selected: boolean;
  priority: number;
  order: number;
  reason?: string;
  confidence?: number;
}

// ============================================
// Progress Tracking Types
// ============================================

export interface ExecutionProgress {
  executionId: string;
  planId: string;
  state: OrchestratorStateType;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  currentStep?: string;
  percentage: number;
  estimatedTimeRemainingMs?: number;
  startedAt: Date;
  lastUpdatedAt: Date;
  currentStepDetails?: {
    stepId: string;
    agentType: AgentType;
    action: string;
    startedAt: Date;
    elapsedMs: number;
    retryCount: number;
    maxRetries: number;
  };
  recentResults?: StepExecutionResult[];
}

// ============================================
// Error Recovery Types
// ============================================

export interface ExecutionRecoveryResult {
  success: boolean;
  executionId: string;
  resumedFromState: boolean;
  completedSteps: number;
  retriedSteps: number;
  skippedSteps: number;
  totalTimeMs: number;
  message: string;
}