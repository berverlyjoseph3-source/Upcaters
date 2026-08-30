// enterprise-ai-agent-platform/apps/frontend/src/types/orchestrator.types.ts
import { AgentType, AgentRequest, AgentResponse, AgentContext } from './agent.types';

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

/**
 * Intent classification result
 */
export interface IntentResult {
  /** Primary classified intent */
  primaryIntent: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Alternative possible intents */
  alternativeIntents: Array<{
    intent: string;
    confidence: number;
    description?: string;
    suggestedAgent?: AgentType;
  }>;
  /** Extracted entities from the input */
  entities: Record<string, any>;
  /** Suggested agent to handle this intent */
  suggestedAgent: AgentType;
  /** Whether this task requires multiple agents */
  requiresMultipleAgents: boolean;
  /** Suggested agent execution chain */
  agentChain?: AgentType[];
  /** Classification method used */
  classificationMethod?: 'keyword' | 'ai' | 'hybrid' | 'rule_based' | 'fallback';
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Raw classification response from AI */
  rawResponse?: string;
  /** Whether the intent is ambiguous */
  isAmbiguous?: boolean;
  /** Clarification questions if ambiguous */
  clarificationQuestions?: string[];
  /** Expected complexity level */
  complexity?: 'simple' | 'moderate' | 'complex' | 'very_complex';
  /** Estimated execution time in ms */
  estimatedExecutionTimeMs?: number;
  /** Estimated cost in USD */
  estimatedCostUsd?: number;
}

/**
 * Intent classification options
 */
export interface ClassificationOptions {
  /** Minimum confidence threshold to accept classification */
  confidenceThreshold?: number;
  /** Maximum number of alternative intents */
  maxAlternatives?: number;
  /** Use cache for repeated queries */
  useCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Fallback to AI when keywords fail */
  useAIFallback?: boolean;
  /** Include entity extraction */
  extractEntities?: boolean;
  /** Include complexity estimation */
  includeComplexityEstimation?: boolean;
  /** Preferred classification method */
  preferredMethod?: 'keyword' | 'ai' | 'hybrid';
  /** Custom entity extraction patterns */
  entityPatterns?: Record<string, RegExp>;
  /** Domain-specific keywords */
  domainKeywords?: Record<string, string[]>;
}

/**
 * Intent history entry
 */
export interface IntentHistoryEntry {
  /** Unique entry ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session ID */
  sessionId?: string;
  /** User input */
  input: string;
  /** Classified intent */
  intent: IntentResult;
  /** Whether classification was correct (user feedback) */
  wasCorrect?: boolean;
  /** User's corrected intent if wrong */
  correctedIntent?: string;
  /** Timestamp */
  timestamp: Date;
  /** Processing time */
  processingTimeMs: number;
  /** Model used for classification */
  model?: string;
  /** Metadata */
  metadata?: Record<string, any>;
}

// ============================================
// Task Planning Types
// ============================================

/**
 * Execution mode for task plans
 */
export enum ExecutionMode {
  /** Execute steps one at a time in order */
  SEQUENTIAL = 'sequential',
  /** Execute independent steps simultaneously */
  PARALLEL = 'parallel',
  /** Execute based on conditions */
  CONDITIONAL = 'conditional',
  /** Execute in a loop until condition met */
  LOOP = 'loop',
  /** Pipeline execution (output of one feeds into next) */
  PIPELINE = 'pipeline',
  /** Fan-out: one step triggers multiple parallel steps */
  FAN_OUT = 'fan_out',
  /** Fan-in: multiple steps converge into one */
  FAN_IN = 'fan_in',
}

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Task plan step
 */
export interface TaskPlanStep {
  /** Unique step ID */
  id: string;
  /** Agent type to execute this step */
  agentType: AgentType;
  /** Action to perform */
  action: string;
  /** Input data for the step */
  input: any;
  /** Step IDs this step depends on */
  dependsOn: string[];
  /** Parallel execution group ID */
  parallelGroup?: string;
  /** Fallback step if this step fails */
  fallback?: TaskPlanStep;
  /** Maximum retry attempts */
  retryCount?: number;
  /** Maximum retries before fallback */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Step description for logging */
  description?: string;
  /** Estimated cost for this step */
  estimatedCostUsd?: number;
  /** Estimated tokens for this step */
  estimatedTokens?: number;
  /** Conditional execution expression */
  condition?: string;
  /** Loop configuration */
  loopConfig?: {
    maxIterations: number;
    condition: string;
    breakOnError?: boolean;
  };
  /** Step metadata */
  metadata?: Record<string, any>;
  /** Whether this step is optional */
  optional?: boolean;
  /** Whether to skip this step */
  skip?: boolean;
  /** Step timeout behavior */
  timeoutBehavior?: 'retry' | 'fallback' | 'skip' | 'fail';
}

/**
 * Task plan
 */
export interface TaskPlan {
  /** Unique plan ID */
  id: string;
  /** Plan steps */
  steps: TaskPlanStep[];
  /** Execution mode */
  mode: ExecutionMode;
  /** Estimated total tokens */
  estimatedTokens?: number;
  /** Estimated total cost in USD */
  estimatedCostUsd?: number;
  /** Plan creation timestamp */
  createdAt: Date;
  /** Plan expiration timestamp */
  expiresAt?: Date;
  /** Plan priority */
  priority?: TaskPriority;
  /** Plan metadata */
  metadata?: Record<string, any>;
  /** Parent plan ID (for sub-plans) */
  parentPlanId?: string;
  /** Plan version */
  version?: number;
  /** Plan status */
  status?: 'draft' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'optimized';
  /** Original user request that generated this plan */
  originalRequest?: string;
  /** Classified intent that generated this plan */
  sourceIntent?: IntentResult;
  /** Context snapshot at plan creation */
  contextSnapshot?: Partial<AgentContext>;
  /** Optimization data if plan was optimized */
  optimization?: {
    originalSteps: number;
    optimizedSteps: number;
    savingsPercentage: number;
    changes: string[];
  };
}

/**
 * Planning options
 */
export interface PlanningOptions {
  /** Maximum number of steps */
  maxSteps?: number;
  /** Enable parallelization where possible */
  enableParallelization?: boolean;
  /** Enable fallback steps */
  enableFallbacks?: boolean;
  /** Include cost estimates */
  estimatedCost?: boolean;
  /** Optimization goal */
  optimizationGoal?: 'speed' | 'cost' | 'accuracy' | 'balanced';
  /** Maximum plan depth (for nested plans) */
  maxDepth?: number;
  /** Timeout for plan creation */
  timeout?: number;
  /** Preferred agents to use */
  preferredAgents?: AgentType[];
  /** Agents to avoid */
  excludedAgents?: AgentType[];
}

/**
 * Plan validation rule
 */
export interface PlanValidationRule {
  /** Rule ID */
  id: string;
  /** Rule description */
  description: string;
  /** Rule condition function */
  validate: (plan: TaskPlan) => boolean;
  /** Error message if rule fails */
  errorMessage: string;
  /** Rule severity */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Plan validation result
 */
export interface PlanValidationResult {
  /** Whether plan is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Validation info messages */
  info: string[];
  /** Suggested fixes */
  suggestions?: string[];
}

/**
 * Plan optimization result
 */
export interface PlanOptimizationResult {
  /** Original step count */
  originalSteps: number;
  /** Optimized step count */
  optimizedSteps: number;
  /** Original estimated tokens */
  originalEstimatedTokens: number;
  /** Optimized estimated tokens */
  optimizedEstimatedTokens: number;
  /** Savings percentage */
  savingsPercentage: number;
  /** Changes made */
  changes: string[];
  /** Optimized plan */
  optimizedPlan: TaskPlan;
  /** Optimization time in ms */
  optimizationTimeMs: number;
}

// ============================================
// Execution Types
// ============================================

/**
 * Step execution result
 */
export interface StepExecutionResult {
  /** Step ID */
  stepId: string;
  /** Agent type */
  agentType: AgentType;
  /** Whether step succeeded */
  success: boolean;
  /** Step output */
  output: any;
  /** Error message if failed */
  error?: string;
  /** Error stack if failed */
  errorStack?: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Tokens used */
  tokensUsed: number;
  /** Cost in USD */
  costUsd: number;
  /** Retry count */
  retryCount: number;
  /** Step start time */
  startedAt?: Date;
  /** Step end time */
  completedAt?: Date;
  /** Step status */
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  /** Fallback used */
  fallbackUsed?: boolean;
  /** Agent response metadata */
  agentMetadata?: Record<string, any>;
  /** Step input (for debugging) */
  input?: any;
  /** Step dependencies met at execution time */
  dependenciesMet?: string[];
}

/**
 * Chain execution result
 */
export interface ChainExecutionResult {
  /** Plan ID */
  planId: string;
  /** All step results */
  steps: StepExecutionResult[];
  /** Final combined output */
  finalOutput: any;
  /** Total execution time in ms */
  totalTimeMs: number;
  /** Total tokens used */
  totalTokensUsed: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Whether all steps succeeded */
  success: boolean;
  /** Error if execution failed */
  error?: string;
  /** Execution mode used */
  executionMode: ExecutionMode;
  /** Number of successful steps */
  successfulSteps: number;
  /** Number of failed steps */
  failedSteps: number;
  /** Number of skipped steps */
  skippedSteps: number;
  /** Steps that used fallbacks */
  fallbackSteps: string[];
  /** Execution start time */
  startedAt: Date;
  /** Execution end time */
  completedAt: Date;
  /** Whether execution was cancelled */
  wasCancelled?: boolean;
  /** Resource usage summary */
  resourceUsage?: ResourceUsageSummary;
}

/**
 * Resource usage summary
 */
export interface ResourceUsageSummary {
  /** CPU time used */
  cpuTimeMs: number;
  /** Memory peak in MB */
  memoryPeakMb: number;
  /** Total API calls made */
  apiCalls: number;
  /** Network bytes transferred */
  networkBytesTransferred: number;
  /** Cache hits */
  cacheHits: number;
  /** Cache misses */
  cacheMisses: number;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  /** Maximum retries per step */
  maxRetries?: number;
  /** Enable parallel execution */
  parallel?: boolean;
  /** Stop on first error */
  stopOnError?: boolean;
  /** Timeout for entire execution */
  timeout?: number;
  /** Priority */
  priority?: TaskPriority;
  /** Callback on each step completion */
  onStepComplete?: (result: StepExecutionResult) => void | Promise<void>;
  /** Callback on error */
  onError?: (error: Error, stepId: string) => void | Promise<void>;
  /** Context to pass to all steps */
  sharedContext?: Record<string, any>;
  /** Whether to store execution in memory */
  storeInMemory?: boolean;
  /** Whether to generate embeddings for outputs */
  generateEmbeddings?: boolean;
  /** Execution ID for tracking */
  executionId?: string;
}

/**
 * Execution progress
 */
export interface ExecutionProgress {
  /** Execution ID */
  executionId: string;
  /** Plan ID */
  planId: string;
  /** Current state */
  state: OrchestratorStateType;
  /** Total steps */
  totalSteps: number;
  /** Completed steps */
  completedSteps: number;
  /** Failed steps */
  failedSteps: number;
  /** Current step being executed */
  currentStep?: string;
  /** Progress percentage 0-100 */
  percentage: number;
  /** Estimated time remaining in ms */
  estimatedTimeRemainingMs?: number;
  /** Start time */
  startedAt: Date;
  /** Last update time */
  lastUpdatedAt: Date;
  /** Current step details */
  currentStepDetails?: {
    stepId: string;
    agentType: AgentType;
    action: string;
    startedAt: Date;
    elapsedMs: number;
  };
  /** Recent step results */
  recentResults?: StepExecutionResult[];
}

// ============================================
// Memory Management Types
// ============================================

/**
 * Memory type
 */
export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
}

/**
 * Memory entry base
 */
export interface MemoryEntry {
  /** Unique memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** User ID */
  userId?: string;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * Memory entry with full metadata
 */
export interface OrchestratorMemoryEntry extends MemoryEntry {
  /** Memory type */
  type: MemoryType;
  /** Vector embedding for semantic search */
  embedding?: number[];
  /** Importance score 0-1 */
  importance: number;
  /** Access count */
  accessCount: number;
  /** Last accessed timestamp */
  lastAccessedAt?: Date;
  /** Time to live in hours */
  ttlHours?: number;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Source of the memory */
  source?: 'user_input' | 'agent_output' | 'reflection' | 'system' | 'external';
  /** Session ID */
  sessionId?: string;
  /** Agent type that generated this memory */
  agentType?: AgentType;
  /** Tags for categorization */
  tags?: string[];
  /** Embedding model used */
  embeddingModel?: string;
  /** Embedding dimensions */
  embeddingDimensions?: number;
  /** Similarity score (when retrieved) */
  similarity?: number;
}

/**
 * Memory retrieval options
 */
export interface MemoryRetrievalOptions {
  /** Maximum number of memories */
  limit?: number;
  /** Minimum importance threshold 0-1 */
  minImportance?: number;
  /** Memory types to include */
  includeTypes?: MemoryType[];
  /** Memory types to exclude */
  excludeTypes?: MemoryType[];
  /** Time range */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by agent type */
  agentType?: AgentType;
  /** Filter by session */
  sessionId?: string;
  /** Filter by tags */
  tags?: string[];
  /** Sort by */
  sortBy?: 'similarity' | 'importance' | 'recency' | 'accessCount';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Include similarity scores */
  includeSimilarity?: boolean;
  /** Use vector search */
  useVectorSearch?: boolean;
  /** Minimum similarity threshold */
  minSimilarity?: number;
  /** Deduplicate similar memories */
  deduplicate?: boolean;
  /** Maximum age in hours */
  maxAgeHours?: number;
}

/**
 * Memory retrieval result
 */
export interface MemoryRetrievalResult {
  /** Retrieved memories */
  memories: OrchestratorMemoryEntry[];
  /** Search query */
  query: string;
  /** Total matches found */
  totalFound: number;
  /** Retrieval time in ms */
  retrievalTimeMs: number;
  /** Whether vector search was used */
  usedVectorSearch: boolean;
  /** Embedding model used */
  embeddingModel?: string;
}

/**
 * Memory consolidation options
 */
export interface MemoryConsolidationOptions {
  /** Minimum importance for consolidation */
  minImportance?: number;
  /** Maximum short-term memories to process */
  maxShortTermMemories?: number;
  /** Consolidation strategy */
  strategy?: 'importance' | 'recency' | 'frequency' | 'hybrid';
  /** Generate embeddings for consolidated memories */
  generateEmbeddings?: boolean;
  /** Merge similar memories */
  mergeSimilar?: boolean;
  /** Similarity threshold for merging */
  mergeThreshold?: number;
}

/**
 * Memory statistics
 */
export interface MemoryStatistics {
  /** Total memories */
  totalMemories: number;
  /** Short-term memories count */
  shortTermCount: number;
  /** Long-term memories count */
  longTermCount: number;
  /** Episodic memories count */
  episodicCount: number;
  /** Semantic memories count */
  semanticCount: number;
  /** Procedural memories count */
  proceduralCount: number;
  /** Working memories count */
  workingCount: number;
  /** Average importance */
  averageImportance: number;
  /** Total tokens used for embeddings */
  totalEmbeddingTokens: number;
  /** Total embedding cost */
  totalEmbeddingCostUsd: number;
  /** Memory retrieval stats */
  retrievalStats: {
    totalRetrievals: number;
    averageRetrievalTimeMs: number;
    cacheHitRate: number;
  };
  /** By agent type */
  byAgentType: Record<string, number>;
  /** By session */
  bySession: Record<string, number>;
  /** By source */
  bySource: Record<string, number>;
}

// ============================================
// Reflection Types
// ============================================

/**
 * Reflection on execution results
 */
export interface ExecutionReflection {
  /** Summary of execution */
  summary: string;
  /** Key insights learned */
  insights: string[];
  /** Suggested improvements */
  improvements: string[];
  /** Agent performance evaluation */
  agentPerformance: Record<string, {
    success: boolean;
    efficiency: number;
    reliability: number;
    averageResponseTimeMs: number;
    recommendations: string[];
  }>;
  /** Recommended next steps */
  recommendedNextSteps: string[];
  /** Overall execution score 0-100 */
  overallScore: number;
  /** Success rate */
  successRate: number;
  /** Reflection timestamp */
  timestamp: Date;
  /** Reflection generation time in ms */
  generationTimeMs: number;
  /** Model used for reflection */
  model?: string;
  /** Whether insights were stored in memory */
  insightsStored: boolean;
}

/**
 * Follow-up suggestion
 */
export interface FollowUpSuggestion {
  /** Action name */
  action: string;
  /** Detailed description */
  description: string;
  /** Agent type to handle this */
  agentType: AgentType;
  /** Confidence score 0-1 */
  confidence: number;
  /** Expected benefit to the user */
  expectedBenefit: string;
  /** Estimated time to complete */
  estimatedTimeMs?: number;
  /** Priority */
  priority?: TaskPriority;
  /** Preconditions that must be met */
  preconditions?: string[];
  /** Sample prompt for the user */
  samplePrompt?: string;
}

// ============================================
// Orchestrator Response Types
// ============================================

/**
 * Orchestrator response
 */
export interface OrchestratorResponse {
  /** User-friendly response message */
  message: string;
  /** Response data */
  data: any;
  /** Execution summary */
  executionSummary: {
    /** Total execution time */
    totalTimeMs: number;
    /** Total steps executed */
    totalSteps: number;
    /** Successful steps */
    successfulSteps: number;
    /** Failed steps */
    failedSteps: number;
    /** Total tokens used */
    totalTokensUsed: number;
    /** Total cost in USD */
    totalCostUsd: number;
    /** Classified intent */
    intent?: string;
    /** Suggested agent */
    suggestedAgent?: AgentType;
    /** Execution mode used */
    executionMode?: ExecutionMode;
    /** Plan ID */
    planId?: string;
    /** Whether fallbacks were used */
    fallbacksUsed?: boolean;
  };
  /** Follow-up suggestions */
  followUpSuggestions?: FollowUpSuggestion[];
  /** Reflection insights */
  reflection?: Partial<ExecutionReflection>;
  /** Response generation time in ms */
  generationTimeMs: number;
}

// ============================================
// Orchestrator Configuration Types
// ============================================

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Maximum steps per plan */
  maxStepsPerPlan: number;
  /** Maximum retries per step */
  maxRetriesPerStep: number;
  /** Maximum concurrent agent executions */
  maxConcurrentExecutions: number;
  /** Default timeout for agent execution in ms */
  defaultTimeoutMs: number;
  /** Enable automatic fallbacks */
  enableAutomaticFallbacks: boolean;
  /** Enable plan optimization */
  enablePlanOptimization: boolean;
  /** Enable memory consolidation */
  enableMemoryConsolidation: boolean;
  /** Enable execution reflection */
  enableExecutionReflection: boolean;
  /** Default AI model for the orchestrator */
  defaultModel: string;
  /** AI model fallback chain */
  modelFallbackChain: string[];
  /** Stream generation enabled */
  streamGeneration: boolean;
  /** Classification options */
  classificationOptions: ClassificationOptions;
  /** Planning options */
  planningOptions: PlanningOptions;
  /** Execution options */
  executionOptions: ExecutionOptions;
  /** Memory options */
  memoryOptions: {
    maxShortTermEntries: number;
    shortTermTTLSeconds: number;
    longTermImportanceThreshold: number;
    enableVectorSearch: boolean;
  };
  /** Rate limiting */
  rateLimiting?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    costPerHour: number;
  };
}

/**
 * Default orchestrator configuration
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
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
  rateLimiting: {
    requestsPerMinute: 60,
    tokensPerMinute: 90000,
    costPerHour: 50,
  },
};

// ============================================
// Orchestrator Metrics Types
// ============================================

/**
 * Orchestrator metrics
 */
export interface OrchestratorMetrics {
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average execution time in ms */
  averageExecutionTimeMs: number;
  /** P95 execution time in ms */
  p95ExecutionTimeMs: number;
  /** P99 execution time in ms */
  p99ExecutionTimeMs: number;
  /** Total tokens used */
  totalTokensUsed: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Average steps per execution */
  averageStepsPerExecution: number;
  /** Average agents per execution */
  averageAgentsPerExecution: number;
  /** Fallback usage rate */
  fallbackUsageRate: number;
  /** Intent classification accuracy (from user feedback) */
  classificationAccuracy: number;
  /** Plan optimization savings */
  optimizationSavingsUsd: number;
  /** Memory hit rate */
  memoryHitRate: number;
  /** Error rate by state */
  errorRateByState: Record<string, number>;
  /** Agent usage distribution */
  agentUsageDistribution: Record<string, number>;
  /** Model usage distribution */
  modelUsageDistribution: Record<string, number>;
}

/**
 * Orchestrator health status
 */
export interface OrchestratorHealthStatus {
  /** Current state */
  state: OrchestratorStateType;
  /** Is healthy */
  isHealthy: boolean;
  /** Current load */
  currentLoad: number;
  /** Queue length */
  queueLength: number;
  /** Active executions */
  activeExecutions: number;
  /** Waiting executions */
  waitingExecutions: number;
  /** Metrics snapshot */
  metrics: OrchestratorMetrics;
  /** Last heartbeat */
  lastHeartbeat: Date;
  /** Uptime in seconds */
  uptime: number;
  /** Error message if unhealthy */
  errorMessage?: string;
  /** Version */
  version: string;
}

// ============================================
// Orchestrator Internal State Types
// ============================================

/**
 * Orchestrator internal state
 */
export interface OrchestratorInternalState {
  /** Current state in the state machine */
  currentState: OrchestratorStateType;
  /** Classified intent */
  intent: IntentResult | null;
  /** Current execution plan */
  plan: TaskPlan | null;
  /** Step execution results */
  executionResults: Map<string, StepExecutionResult>;
  /** Current step index */
  currentStepIndex: number;
  /** Final output to be returned */
  finalOutput: any;
  /** Error message if in error state */
  error: string | null;
  /** Execution start time */
  startTime: number;
  /** AI model fallback chain */
  modelFallbackChain: string[];
  /** Current model index in fallback chain */
  currentModelIndex: number;
  /** Injected memories for context */
  injectedMemories: OrchestratorMemoryEntry[];
  /** Total tokens used */
  totalTokensUsed: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Retry count for replanning */
  retryCount: number;
  /** State transition history */
  stateHistory: Array<{
    from: OrchestratorStateType;
    to: OrchestratorStateType;
    timestamp: Date;
    reason?: string;
  }>;
  /** Pending follow-up actions */
  pendingFollowUps?: FollowUpSuggestion[];
  /** User preferences for personalization */
  userPreferences?: Record<string, any>;
  /** Session context */
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

/**
 * Orchestrator event types for monitoring
 */
export enum OrchestratorEventType {
  STATE_CHANGE = 'state_change',
  INTENT_CLASSIFIED = 'intent_classified',
  PLAN_CREATED = 'plan_created',
  PLAN_OPTIMIZED = 'plan_optimized',
  STEP_STARTED = 'step_started',
  STEP_COMPLETED = 'step_completed',
  STEP_FAILED = 'step_failed',
  FALLBACK_USED = 'fallback_used',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed',
  REFLECTION_GENERATED = 'reflection_generated',
  MEMORY_STORED = 'memory_stored',
  MEMORY_RETRIEVED = 'memory_retrieved',
  FOLLOW_UP_SUGGESTED = 'follow_up_suggested',
  ERROR_OCCURRED = 'error_occurred',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  TIMEOUT_OCCURRED = 'timeout_occurred',
}

/**
 * Orchestrator event
 */
export interface OrchestratorEvent {
  /** Event type */
  type: OrchestratorEventType;
  /** Event timestamp */
  timestamp: Date;
  /** User ID */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Execution ID */
  executionId?: string;
  /** Event data */
  data: any;
  /** Event metadata */
  metadata?: Record<string, any>;
}

/**
 * Orchestrator event listener
 */
export interface OrchestratorEventListener {
  /** Called on state change */
  onStateChange?: (from: OrchestratorStateType, to: OrchestratorStateType, state: OrchestratorInternalState) => void;
  /** Called on intent classified */
  onIntentClassified?: (intent: IntentResult, state: OrchestratorInternalState) => void;
  /** Called on plan created */
  onPlanCreated?: (plan: TaskPlan, state: OrchestratorInternalState) => void;
  /** Called on step completed */
  onStepCompleted?: (result: StepExecutionResult, state: OrchestratorInternalState) => void;
  /** Called on step failed */
  onStepFailed?: (result: StepExecutionResult, state: OrchestratorInternalState) => void;
  /** Called on execution completed */
  onExecutionCompleted?: (result: ChainExecutionResult, state: OrchestratorInternalState) => void;
  /** Called on error */
  onError?: (error: Error, state: OrchestratorInternalState) => void;
}

// ============================================
// Agent Delegation Types
// ============================================

/**
 * Agent delegation request
 */
export interface AgentDelegationRequest {
  /** Target agent type */
  agentType: AgentType;
  /** Task to execute */
  task: string;
  /** Additional input */
  input?: any;
  /** Context to pass */
  context?: Partial<AgentContext>;
  /** Priority */
  priority?: TaskPriority;
  /** Timeout in ms */
  timeout?: number;
  /** Whether to cache the result */
  useCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Fallback agent types in order */
  fallbackAgents?: AgentType[];
  /** Whether to retry on failure */
  retryOnFailure?: boolean;
  /** Maximum retries */
  maxRetries?: number;
}

/**
 * Agent delegation result
 */
export interface AgentDelegationResult {
  /** Whether delegation succeeded */
  success: boolean;
  /** Agent output */
  output: any;
  /** Error if failed */
  error?: string;
  /** Agent type that executed */
  agentType: AgentType;
  /** Execution time in ms */
  executionTimeMs: number;
  /** Tokens used */
  tokensUsed: number;
  /** Cost in USD */
  costUsd: number;
  /** Retry count */
  retryCount: number;
  /** Fallback used */
  fallbackUsed?: boolean;
  /** Original fallback chain */
  fallbackChain?: AgentType[];
  /** Agent metadata */
  metadata?: Record<string, any>;
}

// ============================================
// Agent Selection Types
// ============================================

/**
 * Agent selection for orchestrator
 */
export interface AgentSelection {
  /** Agent type */
  agentType: string;
  /** Whether this agent is selected */
  selected: boolean;
  /** Priority level (higher = more important) */
  priority: number;
  /** Execution order */
  order: number;
  /** Reason for selection */
  reason?: string;
  /** Confidence in selection */
  confidence?: number;
}

// ============================================
// Batch Execution Types
// ============================================

/**
 * Batch execution request
 */
export interface BatchExecutionRequest {
  /** Batch of requests */
  requests: Array<{
    id: string;
    input: string;
    context?: Partial<AgentContext>;
    priority?: TaskPriority;
  }>;
  /** Maximum concurrent executions */
  maxConcurrent?: number;
  /** Stop on first error */
  stopOnError?: boolean;
  /** Timeout for entire batch */
  timeout?: number;
  /** Whether to prioritize speed over cost */
  prioritizeSpeed?: boolean;
}

/**
 * Batch execution result
 */
export interface BatchExecutionResult {
  /** Individual results */
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
  /** Total requests */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Total execution time */
  totalTimeMs: number;
  /** Total tokens used */
  totalTokensUsed: number;
  /** Total cost */
  totalCostUsd: number;
}

// ============================================
// Streaming Types
// ============================================

/**
 * Orchestrator streaming chunk types
 */
export enum OrchestratorStreamChunkType {
  /** Thinking/processing */
  THINKING = 'thinking',
  /** Intent classification progress */
  INTENT_CLASSIFYING = 'intent_classifying',
  /** Intent result */
  INTENT_RESULT = 'intent_result',
  /** Planning progress */
  PLANNING = 'planning',
  /** Plan created */
  PLAN_CREATED = 'plan_created',
  /** Step execution started */
  STEP_STARTED = 'step_started',
  /** Step execution progress */
  STEP_PROGRESS = 'step_progress',
  /** Step execution completed */
  STEP_COMPLETED = 'step_completed',
  /** Agent output */
  AGENT_OUTPUT = 'agent_output',
  /** Reflecting on results */
  REFLECTING = 'reflecting',
  /** Final output */
  FINAL_OUTPUT = 'final_output',
  /** Error occurred */
  ERROR = 'error',
  /** Warning */
  WARNING = 'warning',
}

/**
 * Orchestrator streaming chunk
 */
export interface OrchestratorStreamChunk {
  /** Chunk ID */
  id?: string;
  /** Chunk type */
  type: OrchestratorStreamChunkType | string;
  /** Chunk content */
  content: string;
  /** Progress percentage */
  progress?: number;
  /** Current state */
  state?: OrchestratorStateType;
  /** Current step */
  currentStep?: string;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Timestamp */
  timestamp: Date;
}

// ============================================
// Orchestrator Session Types
// ============================================

/**
 * Orchestrator session
 */
export interface OrchestratorSession {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Session start time */
  startedAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Number of messages in session */
  messageCount: number;
  /** Current context */
  context: Partial<AgentContext>;
  /** Message history */
  messageHistory: Array<{
    role: 'user' | 'orchestrator' | 'agent';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  /** Active plan */
  activePlan?: TaskPlan;
  /** Pending follow-ups */
  pendingFollowUps?: FollowUpSuggestion[];
  /** Session metadata */
  metadata?: Record<string, any>;
  /** Whether session is active */
  isActive: boolean;
}

// ============================================
// Orchestrator Utility Types
// ============================================

/**
 * Agent capability descriptor
 */
export interface AgentCapability {
  /** Agent type */
  type: AgentType;
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Version */
  version: string;
  /** Available tools */
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
  /** Status */
  status: 'idle' | 'running' | 'error' | 'degraded' | 'maintenance';
  /** Metrics */
  metrics?: {
    totalExecutions: number;
    successRate: number;
    averageResponseTimeMs: number;
    errorRate: number;
  };
  /** Required OAuth scopes */
  requiredScopes?: string[];
  /** Minimum plan required */
  minimumPlan?: string;
}

/**
 * Agent match result
 */
export interface AgentMatchResult {
  /** Matched agent type */
  agentType: AgentType;
  /** Match confidence */
  confidence: number;
  /** Why this agent was chosen */
  rationale: string;
  /** Alternative matches */
  alternatives: AgentType[];
}

// ============================================
// Orchestrator State Type (Legacy compatibility)
// ============================================

/**
 * @deprecated Use OrchestratorStateType instead
 */
export type OrchestratorState = OrchestratorStateType;

/**
 * @deprecated Use OrchestratorStateType enum values
 */
export const OrchestratorStateValues = {
  IDLE: OrchestratorStateType.IDLE,
  INTENT_PARSE: OrchestratorStateType.INTENT_PARSE,
  PLAN: OrchestratorStateType.PLAN,
  EXECUTE: OrchestratorStateType.EXECUTE,
  REFLECT: OrchestratorStateType.REFLECT,
  RESPOND: OrchestratorStateType.RESPOND,
  ERROR: OrchestratorStateType.ERROR,
  MAINTENANCE: OrchestratorStateType.MAINTENANCE,
  WAITING: OrchestratorStateType.WAITING,
  CANCELLING: OrchestratorStateType.CANCELLING,
} as const;

// ============================================
// Request/Response Types for API Communication
// ============================================

/**
 * Orchestrator request sent to the API
 */
export interface OrchestratorRequest {
  /** User input or task description */
  input: string;
  /** Session ID for context */
  sessionId?: string;
  /** Previous messages for context */
  conversation?: Array<{
    role: 'user' | 'orchestrator' | 'agent';
    content: string;
  }>;
  /** User preferences */
  preferences?: Record<string, any>;
  /** Force specific agent */
  forceAgent?: AgentType;
  /** Skip intent classification */
  skipIntentClassification?: boolean;
  /** Pre-existing intent */
  preClassifiedIntent?: IntentResult;
  /** Execution options */
  executionOptions?: ExecutionOptions;
  /** Request priority */
  priority?: TaskPriority;
}

/**
 * Orchestrator response from the API
 */
export interface OrchestratorAPIResponse {
  /** Success indicator */
  success: boolean;
  /** Response data */
  data?: {
    /** User-friendly response */
    message: string;
    /** Classified intent */
    intent?: IntentResult;
    /** Execution plan */
    plan?: TaskPlan;
    /** Execution results */
    execution?: ChainExecutionResult;
    /** Reflection */
    reflection?: ExecutionReflection;
    /** Raw agent outputs */
    agentOutputs?: Record<string, any>;
    /** Follow-up suggestions */
    followUps?: FollowUpSuggestion[];
    /** Response metadata */
    metadata?: {
      tokensUsed: number;
      costUsd: number;
      processingTimeMs: number;
      model: string;
      state: OrchestratorStateType;
    };
  };
  /** Error message if failed */
  error?: string;
  /** Error code */
  code?: string;
}

// ============================================
// Orchestrator Feedback Types
// ============================================

/**
 * User feedback for orchestrator actions
 */
export interface OrchestratorFeedback {
  /** Message ID being rated */
  messageId: string;
  /** Rating */
  rating: 'positive' | 'negative' | 'neutral';
  /** Optional notes */
  notes?: string;
  /** Corrected intent (if classification was wrong) */
  correctedIntent?: string;
  /** Rating timestamp */
  timestamp: Date;
}

/**
 * Reflection feedback
 */
export interface ReflectionFeedback {
  /** Reflection ID */
  reflectionId: string;
  /** Whether reflection was helpful */
  helpful: boolean;
  /** Which insights were most useful */
  helpfulInsights: string[];
  /** Additional comments */
  comments?: string;
  /** Suggested improvements */
  suggestedImprovements?: string[];
  /** Feedback timestamp */
  timestamp: Date;
}
