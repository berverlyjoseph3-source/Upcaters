// ============================================
// enterprise-ai-agent-platform/apps/frontend/src/types/agent.types.ts
// Agent Type System - Comprehensive type definitions
// for all AI agents and their interactions
// ============================================

// ============================================
// 1. ENUMS & CONSTANTS
// ============================================

/**
 * Supported AI agent types in the platform
 * IMPORTANT: This is an ENUM so it can be used as a value
 * in tests, components, and services.
 */
export enum AgentType {
  EMAIL = 'email',
  DRIVE = 'drive',
  CONTENT = 'content',
  SOCIAL = 'social',
  CALENDAR = 'calendar',
  WEB = 'web',
  TASK = 'task',
  ORCHESTRATOR = 'orchestrator',
}

/**
 * Agent status states
 */
export type AgentStatus =
  | 'idle'
  | 'running'
  | 'error'
  | 'degraded'
  | 'maintenance'
  | 'unknown';

/**
 * Agent execution status for individual tasks
 */
export type AgentExecutionStatus =
  | 'pending'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'waiting'
  | 'fallback';

/**
 * Agent category classification
 */
export type AgentCategory =
  | 'communication'
  | 'productivity'
  | 'content'
  | 'social'
  | 'research'
  | 'management'
  | 'orchestration'
  | 'custom';

/**
 * Agent capability priority
 */
export type AgentCapabilityPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical';

// ============================================
// 2. BASE AGENT INTERFACES
// ============================================

/**
 * Core agent information
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Agent type */
  type: AgentType;
  /** Human-readable agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version */
  version: string;
  /** Current agent status */
  status: AgentStatus;
  /** Whether the agent is available for use */
  isAvailable: boolean;
  /** Whether the agent is connected to its backend service */
  isConnected: boolean;
  /** Agent category */
  category: AgentCategory;
  /** Agent capabilities list */
  capabilities: string[];
  /** Whether agent requires setup */
  requiresSetup?: boolean;
  /** Plan required to use this agent */
  requiredPlan?: PlanRequirement;
  /** Supported providers/models */
  supportedProviders?: string[];
  /** Last heartbeat timestamp */
  lastHeartbeat?: Date;
  /** Health status message */
  healthMessage?: string;
  /** Agent metadata */
  metadata?: Record<string, any>;
  /** Agent configuration */
  config?: AgentConfig;
  /** Agent metrics */
  metrics?: AgentMetrics;
  /** Agent tools */
  tools?: AgentTool[];
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Plan requirement for agent access
 */
export type PlanRequirement = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

/**
 * Agent configuration options
 */
export interface AgentConfig {
  /** Default model to use */
  defaultModel?: string;
  /** Default provider */
  defaultProvider?: string;
  /** Maximum retries */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Temperature for AI models */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** Whether to enable streaming */
  streaming?: boolean;
  /** Whether to enable fallback */
  fallbackEnabled?: boolean;
  /** Fallback agent type */
  fallbackAgent?: AgentType;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Custom settings */
  settings?: Record<string, any>;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number;
  /** Maximum tokens per minute */
  tokensPerMinute: number;
  /** Whether to enable burst mode */
  burstEnabled?: boolean;
  /** Burst size */
  burstSize?: number;
}

/**
 * Agent metrics and performance data
 */
export interface AgentMetrics {
  /** Total number of executions */
  totalExecutions: number;
  /** Number of successful executions */
  successfulExecutions: number;
  /** Number of failed executions */
  failedExecutions: number;
  /** Average response time in milliseconds */
  averageResponseTimeMs: number;
  /** Error rate percentage (0-100) */
  errorRate: number;
  /** Last execution timestamp */
  lastExecutedAt?: Date;
  /** Success rate percentage (0-100) */
  successRate: number;
  /** Total tokens used */
  totalTokensUsed: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Average tokens per execution */
  averageTokensPerExecution?: number;
  /** Uptime percentage */
  uptime?: number;
  /** Peak requests per minute */
  peakRequestsPerMinute?: number;
  /** Average latency in milliseconds */
  averageLatencyMs?: number;
}

/**
 * Agent tool definition
 */
export interface AgentTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool parameters */
  parameters: ToolParameter[];
  /** Execution cost */
  cost: number;
  /** Whether this tool requires an API call */
  requiresApiCall: boolean;
  /** Whether this tool is enabled */
  enabled?: boolean;
  /** Tool category */
  category?: string;
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  /** Whether parameter is required */
  required: boolean;
  /** Parameter description */
  description: string;
  /** Default value */
  defaultValue?: any;
  /** Enum options if type is enum */
  options?: string[];
  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

// ============================================
// 3. AGENT REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request to an AI agent
 */
export interface AgentRequest {
  /** Target agent type */
  agentType: AgentType;
  /** Action to perform */
  action: string;
  /** Input data */
  input: any;
  /** Request options */
  options?: AgentRequestOptions;
  /** Session ID for context */
  sessionId?: string;
  /** Request ID for tracking */
  requestId?: string;
  /** Parent execution ID */
  parentExecutionId?: string;
  /** Priority level */
  priority?: AgentCapabilityPriority;
  /** Dependencies that must complete first */
  dependsOn?: string[];
  /** Tags for categorizing */
  tags?: string[];
}

/**
 * Options for agent requests
 */
export interface AgentRequestOptions {
  /** Model override */
  model?: string;
  /** Provider override */
  provider?: string;
  /** Temperature override */
  temperature?: number;
  /** Maximum tokens override */
  maxTokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Timeout override in milliseconds */
  timeout?: number;
  /** Maximum retries */
  maxRetries?: number;
  /** Whether to enable fallback */
  fallbackEnabled?: boolean;
  /** Fallback agent type */
  fallbackAgent?: AgentType;
  /** Whether to store in memory */
  storeInMemory?: boolean;
  /** Memory type for storage */
  memoryType?: MemoryType;
  /** Priority level */
  priority?: AgentCapabilityPriority;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Response from an AI agent
 */
export interface AgentResponse {
  /** Agent type that handled the request */
  agentType: AgentType;
  /** Response output */
  output: any;
  /** Whether the execution was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Error stack trace if available */
  errorStack?: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Tokens used */
  tokensUsed: number;
  /** Cost in USD */
  costUsd: number;
  /** Model used */
  model?: string;
  /** Provider used */
  provider?: string;
  /** Retry count */
  retryCount: number;
  /** Whether fallback was used */
  fallbackUsed?: boolean;
  /** Fallback agent type if used */
  fallbackAgent?: AgentType;
  /** Step ID */
  stepId?: string;
  /** Response metadata */
  metadata?: AgentResponseMetadata;
  /** Timestamp when started */
  startedAt?: Date;
  /** Timestamp when completed */
  completedAt?: Date;
  /** Dependencies that were met */
  dependenciesMet?: string[];
  /** Agent-specific metadata */
  agentMetadata?: Record<string, any>;
}

/**
 * Metadata attached to agent responses
 */
export interface AgentResponseMetadata {
  /** Intent classification if applicable */
  intent?: string;
  /** Confidence score */
  confidence?: number;
  /** Classification method used */
  classificationMethod?: string;
  /** Processing time breakdown */
  processingTime?: {
    preProcessing: number;
    execution: number;
    postProcessing: number;
  };
  /** Token breakdown */
  tokenBreakdown?: {
    input: number;
    output: number;
    total: number;
  };
  /** Error categorization */
  errorCategory?: string;
  /** Error severity */
  errorSeverity?: 'low' | 'medium' | 'high' | 'critical';
  /** Whether this was cached */
  cached?: boolean;
  /** Cache hit/miss */
  cacheStatus?: 'hit' | 'miss' | 'bypass';
}

/**
 * Context passed to agents during execution
 */
export interface AgentContext {
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Plan ID if part of a plan */
  planId?: string;
  /** Execution ID if part of an execution */
  executionId?: string;
  /** Previous outputs from other agents */
  previousOutputs?: Record<string, any>;
  /** Agent memory entries */
  memory?: AgentMemoryEntry[];
  /** User preferences */
  preferences?: UserPreferences;
  /** Feature flags */
  featureFlags?: Record<string, boolean>;
  /** Environment */
  environment?: 'development' | 'staging' | 'production';
}

/**
 * User preferences for agent context
 */
export interface UserPreferences {
  /** Preferred language */
  language?: string;
  /** Timezone */
  timezone?: string;
  /** Preferred model */
  preferredModel?: string;
  /** Notification preferences */
  notifications?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
  };
}

/**
 * Memory entry for agent context
 */
export interface AgentMemoryEntry {
  /** Memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Memory type */
  type: MemoryType;
  /** Importance score (0-1) */
  importance: number;
  /** Timestamp */
  timestamp: Date;
  /** Source */
  source?: string;
  /** Agent type that created this memory */
  agentType?: AgentType;
  /** Tags */
  tags?: string[];
  /** Access count */
  accessCount?: number;
  /** Last accessed timestamp */
  lastAccessedAt?: Date;
  /** Time to live in hours */
  ttlHours?: number;
  /** Session ID */
  sessionId?: string;
  /** Similarity score if from search */
  similarity?: number;
}

/**
 * Memory type classification
 */
export type MemoryType =
  | 'short_term'
  | 'long_term'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'working';

// ============================================
// 4. AGENT CAPABILITY TYPES
// ============================================

/**
 * Agent capability definition
 */
export interface AgentCapability {
  /** Capability name */
  name: string;
  /** Capability description */
  description?: string;
  /** Whether this is a premium feature */
  premium?: boolean;
  /** Whether this is coming soon */
  comingSoon?: boolean;
  /** Capability icon */
  icon?: string;
  /** Capability category */
  category?: AgentCapabilityCategory;
  /** Whether this capability is currently active */
  active?: boolean;
  /** Performance metric */
  metric?: {
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'stable';
  };
  /** Tooltip text */
  tooltip?: string;
  /** Whether this is a highlight feature */
  highlight?: boolean;
  /** Capability parameters */
  parameters?: ToolParameter[];
  /** Required plan for this capability */
  requiredPlan?: PlanRequirement;
}

/**
 * Agent capability category
 */
export type AgentCapabilityCategory =
  | 'core'
  | 'ai'
  | 'automation'
  | 'integration'
  | 'collaboration'
  | 'security'
  | 'analytics'
  | 'premium'
  | 'custom';

// ============================================
// 5. AGENT SELECTION & MATCHING
// ============================================

/**
 * Agent selection criteria
 */
export interface AgentSelectionCriteria {
  /** Required capabilities */
  requiredCapabilities?: string[];
  /** Preferred agent types */
  preferredAgentTypes?: AgentType[];
  /** Excluded agent types */
  excludedAgentTypes?: AgentType[];
  /** Minimum success rate */
  minSuccessRate?: number;
  /** Maximum cost per execution */
  maxCostPerExecution?: number;
  /** Maximum response time */
  maxResponseTimeMs?: number;
  /** Priority level */
  priority?: AgentCapabilityPriority;
  /** Whether to prefer available agents */
  preferAvailable?: boolean;
  /** Required plan level */
  requiredPlanLevel?: PlanRequirement;
}

/**
 * Agent match result
 */
export interface AgentMatchResult {
  /** Matched agent type */
  agentType: AgentType;
  /** Match confidence (0-1) */
  confidence: number;
  /** Match rationale */
  rationale: string;
  /** Alternative matches */
  alternatives: AgentMatchAlternative[];
  /** Whether the agent is available */
  isAvailable: boolean;
  /** Whether the agent is connected */
  isConnected: boolean;
  /** Estimated cost */
  estimatedCost?: number;
  /** Estimated execution time */
  estimatedExecutionTimeMs?: number;
  /** Agent capabilities matched */
  matchedCapabilities?: string[];
  /** Agent capabilities missing */
  missingCapabilities?: string[];
}

/**
 * Alternative agent match
 */
export interface AgentMatchAlternative {
  /** Agent type */
  agentType: AgentType;
  /** Confidence score */
  confidence: number;
  /** Why this is an alternative */
  reason: string;
}

// ============================================
// 6. AGENT DELEGATION
// ============================================

/**
 * Agent delegation request
 */
export interface AgentDelegationRequest {
  /** Primary agent to delegate to */
  agentType: AgentType;
  /** Task to delegate */
  task: string;
  /** Input data */
  input?: any;
  /** Delegation options */
  options?: AgentRequestOptions;
  /** Fallback chain */
  fallbackChain?: AgentType[];
  /** Whether to run in parallel */
  parallel?: boolean;
  /** Parallel agent types */
  parallelAgents?: AgentType[];
  /** Aggregation strategy */
  aggregationStrategy?: 'first' | 'all' | 'majority' | 'best';
  /** Timeout for delegation */
  timeout?: number;
  /** Context to pass */
  context?: AgentContext;
}

/**
 * Agent delegation result
 */
export interface AgentDelegationResult {
  /** Primary agent result */
  output: any;
  /** Agent type that produced the result */
  agentType: AgentType;
  /** Execution time */
  executionTimeMs: number;
  /** Tokens used */
  tokensUsed: number;
  /** Cost in USD */
  costUsd: number;
  /** Whether fallback was used */
  fallbackUsed: boolean;
  /** Fallback chain used */
  fallbackChainUsed?: AgentType[];
  /** Parallel results */
  parallelResults?: AgentDelegationResult[];
  /** Aggregation metadata */
  aggregationMetadata?: {
    strategy: string;
    totalResponses: number;
    selectedResponse: number;
    confidence: number;
  };
  /** Error if failed */
  error?: string;
  /** Error stack */
  errorStack?: string;
}

// ============================================
// 7. BATCH EXECUTION
// ============================================

/**
 * Batch execution request
 */
export interface BatchExecutionRequest {
  /** Array of agent requests */
  requests: AgentRequest[];
  /** Execution mode */
  mode: 'sequential' | 'parallel' | 'smart';
  /** Whether to stop on first failure */
  stopOnFailure?: boolean;
  /** Maximum concurrent executions */
  maxConcurrency?: number;
  /** Timeout for entire batch */
  totalTimeout?: number;
  /** Per-request timeout */
  perRequestTimeout?: number;
  /** Batch priority */
  priority?: AgentCapabilityPriority;
  /** Notification callback URL */
  callbackUrl?: string;
}

/**
 * Batch execution result
 */
export interface BatchExecutionResult {
  /** Individual results */
  results: AgentResponse[];
  /** Total number of requests */
  totalRequests: number;
  /** Number of successful requests */
  successfulRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Number of skipped requests */
  skippedRequests: number;
  /** Total execution time */
  totalExecutionTimeMs: number;
  /** Total tokens used */
  totalTokensUsed: number;
  /** Total cost */
  totalCostUsd: number;
  /** Whether the batch succeeded overall */
  success: boolean;
  /** Error if batch failed */
  error?: string;
  /** Per-request timing */
  timing?: Record<string, number>;
}

// ============================================
// 8. AGENT STREAMING
// ============================================

/**
 * Streaming chunk from an agent
 */
export interface AgentStreamingChunk {
  /** Chunk ID */
  id: string;
  /** Chunk type */
  type: AgentStreamingChunkType;
  /** Chunk content */
  content: string;
  /** Agent type */
  agentType: AgentType;
  /** Sequence number */
  sequence: number;
  /** Whether this is the last chunk */
  isLast: boolean;
  /** Chunk metadata */
  metadata?: {
    /** Token count for this chunk */
    tokens?: number;
    /** Progress percentage */
    progress?: number;
    /** Status message */
    status?: string;
    /** Timestamp */
    timestamp?: Date;
  };
}

/**
 * Types of streaming chunks
 */
export type AgentStreamingChunkType =
  | 'text'
  | 'code'
  | 'status'
  | 'error'
  | 'metadata'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'reflecting'
  | 'complete'
  | 'heartbeat';

// ============================================
// 9. AGENT STATE MANAGEMENT
// ============================================

/**
 * Agent state for state management
 */
export interface AgentState {
  /** Agent type */
  agentType: AgentType;
  /** Current status */
  status: AgentExecutionStatus;
  /** Last execution result */
  lastResult?: AgentResponse;
  /** Execution history (recent) */
  recentHistory?: AgentResponse[];
  /** Current request being processed */
  currentRequest?: AgentRequest;
  /** Queue of pending requests */
  pendingQueue?: AgentRequest[];
  /** Error state */
  errorState?: {
    error: string;
    timestamp: Date;
    retryCount: number;
  };
  /** Performance metrics */
  metrics: AgentMetrics;
  /** Last state update timestamp */
  lastUpdated: Date;
}

/**
 * Agent health status
 */
export interface AgentHealthStatus {
  /** Agent type */
  agentType: AgentType;
  /** Whether the agent is healthy */
  isHealthy: boolean;
  /** Current state */
  state: AgentExecutionStatus;
  /** Current load (0-100) */
  currentLoad: number;
  /** Queue length */
  queueLength: number;
  /** Uptime in seconds */
  uptime: number;
  /** Memory usage percentage */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Number of active connections */
  activeConnections: number;
  /** Response time trend */
  responseTimeTrend: 'improving' | 'stable' | 'degrading';
  /** Last health check timestamp */
  lastHealthCheck: Date;
  /** Health issues */
  issues?: string[];
  /** Version */
  version: string;
}

/**
 * Agent execution progress
 */
export interface AgentExecutionProgress {
  /** Execution ID */
  executionId: string;
  /** Plan ID */
  planId: string;
  /** Current state */
  state: AgentExecutionStatus;
  /** Total steps */
  totalSteps: number;
  /** Completed steps */
  completedSteps: number;
  /** Failed steps */
  failedSteps: number;
  /** Skipped steps */
  skippedSteps: number;
  /** Progress percentage */
  progress: number;
  /** Current step */
  currentStep?: string;
  /** Time elapsed */
  elapsedMs: number;
  /** Estimated time remaining */
  estimatedRemainingMs?: number;
  /** Per-agent progress */
  agentProgress?: Record<string, {
    status: AgentExecutionStatus;
    progress: number;
    startTime?: Date;
    estimatedCompletion?: Date;
  }>;
  /** Last updated */
  lastUpdated: Date;
}

// ============================================
// 10. UTILITY TYPES
// ============================================

/**
 * Agent information for UI display
 */
export interface AgentInfo {
  /** Agent type */
  type: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Version */
  version: string;
  /** Current status */
  status: AgentStatus;
  /** Whether agent is available */
  isAvailable: boolean;
  /** Whether agent is connected */
  isConnected: boolean;
  /** Category */
  category: AgentCategory;
  /** Agent tools */
  tools?: AgentTool[];
  /** Agent metrics */
  metrics?: AgentMetrics;
  /** Capabilities */
  capabilities?: string[];
  /** Required plan */
  requiredPlan?: PlanRequirement;
  /** Supported providers */
  supportedProviders?: string[];
  /** Last heartbeat */
  lastHeartbeat?: Date;
  /** Health message */
  healthMessage?: string;
}

/**
 * Agent event for real-time updates
 */
export interface AgentEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: AgentEventType;
  /** Agent type */
  agentType: AgentType;
  /** Event data */
  data: any;
  /** Timestamp */
  timestamp: Date;
  /** Session ID */
  sessionId?: string;
  /** Whether event is for a specific execution */
  executionId?: string;
}

/**
 * Types of agent events
 */
export type AgentEventType =
  | 'status_changed'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_progress'
  | 'health_changed'
  | 'connection_changed'
  | 'streaming_chunk'
  | 'error'
  | 'warning'
  | 'heartbeat';

/**
 * Agent filter for querying agents
 */
export interface AgentFilter {
  /** Filter by agent types */
  types?: AgentType[];
  /** Filter by status */
  status?: AgentStatus[];
  /** Filter by category */
  categories?: AgentCategory[];
  /** Filter by availability */
  isAvailable?: boolean;
  /** Filter by connection */
  isConnected?: boolean;
  /** Filter by required plan */
  requiredPlan?: PlanRequirement;
  /** Search query */
  search?: string;
  /** Sort field */
  sortBy?: 'name' | 'status' | 'category' | 'executions' | 'cost' | 'successRate';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Pagination */
  page?: number;
  /** Items per page */
  limit?: number;
}

/**
 * Agent settings for configuration
 */
export interface AgentSettings {
  /** Agent type */
  agentType: AgentType;
  /** Whether agent is enabled */
  enabled: boolean;
  /** Default model */
  defaultModel?: string;
  /** Default provider */
  defaultProvider?: string;
  /** Configuration */
  config?: AgentConfig;
  /** Custom settings */
  customSettings?: Record<string, any>;
  /** Notification preferences */
  notifications?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    onTimeout?: boolean;
    onFallback?: boolean;
    notifyEmail?: string;
  };
  /** Auto-retry settings */
  autoRetry?: {
    enabled: boolean;
    maxRetries: number;
    backoffMultiplier: number;
  };
}
