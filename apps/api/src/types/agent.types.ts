// enterprise-ai-agent-platform/apps/api/src/types/agent.types.ts
import type { ClassificationComplexity } from '../agents/orchestrator/intent-classifier';

/**
 * Agent Types
 */
export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  EMAIL = 'email',
  DRIVE = 'drive',
  CONTENT = 'content',
  SOCIAL = 'social',
  CALENDAR = 'calendar',
  WEB = 'web',
  TASK = 'task',
}

/**
 * Agent Status
 */
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  ERROR = 'error',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
}

/**
 * Agent Execution Mode
 */
export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  PIPELINE = 'pipeline',
  FAN_OUT = 'fan_out',
  FAN_IN = 'fan_in',
}

/**
 * Task Priority
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Fallback Strategy
 */
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
// AGENT EXECUTION CONTRACT (ENHANCEMENT)
// ============================================

/**
 * STANDARDIZED execution contract that every agent MUST return.
 * This enforces a consistent output format across all agents,
 * enabling reliable chaining, error handling, and cost tracking.
 */
export interface AgentExecutionContract {
  /** Overall execution status */
  status: 'success' | 'partial_success' | 'failed';

  /** The actual output data from the agent */
  data: Record<string, any>;

  /** Errors encountered during execution (empty array if none) */
  errors?: Array<{
    /** Identifier of the step that failed */
    stepId: string;
    /** Human-readable error message */
    message: string;
    /** Whether this error can be recovered from by retrying */
    recoverable: boolean;
    /** Error code for programmatic handling */
    code?: string;
  }>;

  /** Cost breakdown for this execution */
  cost: {
    /** Number of tokens consumed */
    tokens: number;
    /** Cost in USD */
    usd: number;
  };

  /** Suggestions for next steps (optional) */
  nextSteps?: string[];

  /** Non-critical warnings (optional) */
  warnings?: string[];

  /** Additional metadata for debugging */
  metadata?: Record<string, any>;
}

// ============================================
// Agent Request Interface
// ============================================

export interface AgentRequest {
  id: string;
  userId: string;
  sessionId?: string;
  input: string | AgentInput;
  context?: AgentContext;
  metadata?: Record<string, any>;
  priority?: TaskPriority;
  timeout?: number;
}

/**
 * Agent Input Interface
 */
export interface AgentInput {
  type: string;
  data: any;
  parameters?: Record<string, any>;
}

// ============================================
// Agent Response Interface
// ============================================

export interface AgentResponse {
  id: string;
  success: boolean;
  output: any; // Should be AgentExecutionContract for enhanced agents
  error?: string;
  metadata: {
    agentType: AgentType;
    executionTimeMs: number;
    tokensUsed?: number;
    costUsd?: number;
    retryCount?: number;
    /** ENHANCEMENT: Status from the execution contract */
    status?: 'success' | 'partial_success' | 'failed';
  };
  timestamp: Date;
}

// ============================================
// Agent Context Interface
// ============================================

export interface AgentContext {
  sessionId: string;
  userId: string;
  previousResponses?: AgentResponse[];
  memory?: MemoryEntry[];
  preferences?: UserPreferences;
  plan?: PlanInfo;
}

/**
 * Memory Entry Interface
 */
export interface MemoryEntry {
  id: string;
  content: string;
  type: 'short_term' | 'long_term' | 'episodic' | 'semantic' | 'procedural' | 'working';
  importance: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * User Preferences Interface
 */
export interface UserPreferences {
  language?: string;
  timezone?: string;
  emailSignature?: string;
  defaultCalendarId?: string;
  defaultDriveFolderId?: string;
  socialPlatforms?: string[];
  notificationSettings?: NotificationSettings;
}

/**
 * Notification Settings Interface
 */
export interface NotificationSettings {
  email: boolean;
  slack: boolean;
  webhook: boolean;
  onSuccess: boolean;
  onFailure: boolean;
}

/**
 * Plan Info Interface
 */
export interface PlanInfo {
  id: string;
  name: string;
  limits: {
    aiActions: number;
    apiCalls: number;
    teamMembers?: number;
    storageGB?: number;
  };
  features: string[];
  overagePricing?: {
    aiAction: number;
    apiCall: number;
    imageGeneration?: number;
    videoGeneration?: number;
  };
}

// ============================================
// Agent Tool Definition
// ============================================

export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: any, context: AgentContext) => Promise<any>;
  requiresApiCall: boolean;
  cost: number;
  /** ENHANCEMENT: Maximum retries for this tool */
  retryCount?: number;
  /** ENHANCEMENT: Tool category for analytics */
  category?: string;
}

/**
 * Tool Parameter Interface
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  enum?: any[];
  default?: any;
  /** ENHANCEMENT: Validation constraints */
  constraints?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => boolean;
  };
}

// ============================================
// Agent Configuration
// ============================================

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  version: string;
  tools: AgentTool[];
  maxRetries: number;
  timeoutMs: number;
  rateLimitPerMinute?: number;
  requiresApiKey?: boolean;
}

// ============================================
// Intent Classification Result
// ============================================

export interface IntentResult {
  primaryIntent: string;
  confidence: number;
  alternativeIntents: Array<{
    intent: string;
    confidence: number;
    description?: string;
    suggestedAgent?: AgentType;
  }>;
  entities: Record<string, any>;
  suggestedAgent: AgentType;
  requiresMultipleAgents: boolean;
  agentChain?: AgentType[];
  classificationMethod?: 'keyword' | 'ai' | 'hybrid' | 'rule_based' | 'fallback' | 'learned';
  processingTimeMs?: number;
  isAmbiguous?: boolean;
  clarificationQuestions?: string[];
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex' | ClassificationComplexity;
  estimatedExecutionTimeMs?: number;
  estimatedCostUsd?: number;
}

// ============================================
// Task Plan Step
// ============================================

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
  /** ENHANCEMENT: Step ID to execute on partial success */
  onPartial?: string;
}

/**
 * Task Plan
 */
export interface TaskPlan {
  id: string;
  steps: TaskPlanStep[];
  mode: ExecutionMode;
  estimatedTokens?: number;
  estimatedCostUsd?: number;
  createdAt: Date;
}

/**
 * Orchestrator State
 */
export enum OrchestratorState {
  IDLE = 'idle',
  PARSING_INTENT = 'parsing_intent',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  REFLECTING = 'reflecting',
  RESPONDING = 'responding',
  ERROR = 'error',
}

// ============================================
// Execution Result with Chain
// ============================================

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
}

/**
 * Step Execution Result
 */
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
  /** ENHANCEMENT: Step-level status */
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'skipped' | 'timeout';
  /** ENHANCEMENT: Whether fallback was used */
  fallbackUsed?: boolean;
  /** ENHANCEMENT: Which fallback agent was used */
  fallbackAgentType?: AgentType;
  /** ENHANCEMENT: Step start time */
  startedAt?: Date;
  /** ENHANCEMENT: Step completion time */
  completedAt?: Date;
}

// ============================================
// Pre-Execution Cost Check
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
// Circuit Breaker State
// ============================================

export interface CircuitBreakerState {
  failureCount: number;
  lastFailure: number;
  isOpen: boolean;
  openUntil: number;
}

// ============================================
// Execution State Persistence
// ============================================

export interface ExecutionTaskState {
  executionId: string;
  planId: string;
  stepStates: StepTaskState[];
  overallStatus: 'running' | 'completed' | 'failed' | 'partial_success' | 'cancelled';
  totalTokensUsed?: number;
  totalCostUsd?: number;
  startedAt?: Date;
  completedAt?: Date;
  persistedAt: Date;
  resumedAt?: Date;
  version?: number;
  metadata?: Record<string, any>;
}

export interface StepTaskState {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'skipped' | 'timeout';
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

// ============================================
// Model Configuration
// ============================================

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * AI Service Response
 */
export interface AIServiceResponse {
  content: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  costUsd: number;
  finishReason: string;
  metadata?: Record<string, any>;
}

// ============================================
// Agent Metrics
// ============================================

export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  /** ENHANCEMENT: Count of partial successes */
  partialSuccessExecutions?: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  lastExecutedAt?: Date;
  errorRate: number;
  /** ENHANCEMENT: Per-tool execution statistics */
  toolExecutionStats?: Record<
    string,
    {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      partialSuccessExecutions: number;
      averageResponseTimeMs: number;
      totalCostUsd: number;
    }
  >;
}

/**
 * Agent Health Status
 */
export interface AgentHealthStatus {
  agentType: AgentType;
  status: AgentStatus;
  metrics: AgentMetrics;
  lastHeartbeat: Date;
  message?: string;
}

// ============================================
// Streaming Response Chunk
// ============================================

export interface StreamingChunk {
  type: 'thought' | 'action' | 'observation' | 'output' | 'error';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Rate Limit Info
 */
export interface AgentRateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

// ============================================
// Execution Progress Tracking
// ============================================

export interface ExecutionProgress {
  executionId: string;
  planId: string;
  state: string;
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
// Execution Recovery
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

/**
 * Orchestrator Event
 */
export interface OrchestratorEvent {
  type: OrchestratorEventType;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  executionId?: string;
  data: any;
  metadata?: Record<string, any>;
}

// ============================================
// Orchestrator Streaming Types
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

/**
 * Orchestrator streaming chunk
 */
export interface OrchestratorStreamChunk extends StreamingChunk {
  type: OrchestratorStreamChunkType | string;
  content: string;
  progress?: number;
  state?: string;
  currentStep?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
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
// Orchestrator Configuration
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

// ============================================
// Orchestrator Response
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
  followUpSuggestions?: Array<{
    action: string;
    description: string;
    agentType: AgentType;
    confidence: number;
  }>;
  generationTimeMs: number;
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
  circuitBreakerTriggered?: boolean;
  metadata?: Record<string, any>;
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
  }>;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

// ============================================
// Agent Capability
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
  circuitBreaker?: CircuitBreakerState;
}

// ============================================
// Agent Match Result
// ============================================

export interface AgentMatchResult {
  agentType: AgentType;
  confidence: number;
  rationale: string;
  alternatives: AgentType[];
}

// ============================================
// Orchestrator Health Status
// ============================================

export interface OrchestratorHealthStatus {
  state: string;
  isHealthy: boolean;
  currentLoad: number;
  queueLength: number;
  activeExecutions: number;
  waitingExecutions: number;
  rejectedExecutions: number;
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    partialSuccessExecutions?: number;
    rejectedExecutions?: number;
    averageExecutionTimeMs: number;
    p95ExecutionTimeMs?: number;
    p99ExecutionTimeMs?: number;
    totalTokensUsed: number;
    totalCostUsd: number;
    averageStepsPerExecution: number;
    averageAgentsPerExecution: number;
    fallbackUsageRate: number;
    circuitBreakerTriggerRate?: number;
    backpressureRejectionRate?: number;
    executionResumeRate?: number;
    errorRateByState?: Record<string, number>;
    agentUsageDistribution?: Record<string, number>;
    circuitBreakerStatus?: Record<string, CircuitBreakerState>;
  };
  lastHeartbeat: Date;
  uptime: number;
  errorMessage?: string;
  version: string;
}

// ============================================
// Memory Types
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
  accessCount: number;
  lastAccessedAt?: Date;
  ttlHours?: number;
  expiresAt?: Date;
  source?: 'user_input' | 'agent_output' | 'reflection' | 'system' | 'external';
  sessionId?: string;
  agentType?: AgentType;
  tags?: string[];
  similarity?: number;
}

// ============================================
// Reflection Types
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