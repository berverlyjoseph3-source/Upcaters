"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorStreamChunkType = exports.OrchestratorEventType = exports.DEFAULT_ORCHESTRATOR_CONFIG = exports.MemoryType = exports.TaskPriority = exports.ExecutionMode = exports.FallbackStrategy = exports.VALID_STATE_TRANSITIONS = exports.OrchestratorStateType = void 0;
// ============================================
// Orchestrator State Machine
// ============================================
/**
 * Orchestrator state machine states
 * INTENT_PARSE → PLAN → EXECUTE → REFLECT → RESPOND
 */
var OrchestratorStateType;
(function (OrchestratorStateType) {
    /** Idle state - ready to accept new requests */
    OrchestratorStateType["IDLE"] = "idle";
    /** Parsing user intent from input */
    OrchestratorStateType["INTENT_PARSE"] = "intent_parse";
    /** Creating execution plan */
    OrchestratorStateType["PLAN"] = "plan";
    /** Executing the plan steps */
    OrchestratorStateType["EXECUTE"] = "execute";
    /** Reflecting on execution results */
    OrchestratorStateType["REFLECT"] = "reflect";
    /** Generating final response */
    OrchestratorStateType["RESPOND"] = "respond";
    /** Error state - execution failed */
    OrchestratorStateType["ERROR"] = "error";
    /** Maintenance mode */
    OrchestratorStateType["MAINTENANCE"] = "maintenance";
    /** Waiting for external input */
    OrchestratorStateType["WAITING"] = "waiting";
    /** Cancelling current execution */
    OrchestratorStateType["CANCELLING"] = "cancelling";
})(OrchestratorStateType || (exports.OrchestratorStateType = OrchestratorStateType = {}));
/**
 * State transition map for validation
 */
exports.VALID_STATE_TRANSITIONS = {
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
// Fallback Strategy Types
// ============================================
var FallbackStrategy;
(function (FallbackStrategy) {
    FallbackStrategy["RETRY"] = "retry";
    FallbackStrategy["SKIP"] = "skip";
    FallbackStrategy["FAIL_PLAN"] = "fail_plan";
    FallbackStrategy["FALLBACK_AGENT"] = "fallback_agent";
    FallbackStrategy["DEGRADE"] = "degrade";
    FallbackStrategy["SWITCH_MODEL"] = "switch_model";
    FallbackStrategy["SWITCH_PROVIDER"] = "switch_provider";
})(FallbackStrategy || (exports.FallbackStrategy = FallbackStrategy = {}));
// ============================================
// Task Planning Types
// ============================================
var ExecutionMode;
(function (ExecutionMode) {
    ExecutionMode["SEQUENTIAL"] = "sequential";
    ExecutionMode["PARALLEL"] = "parallel";
    ExecutionMode["CONDITIONAL"] = "conditional";
    ExecutionMode["LOOP"] = "loop";
    ExecutionMode["PIPELINE"] = "pipeline";
    ExecutionMode["FAN_OUT"] = "fan_out";
    ExecutionMode["FAN_IN"] = "fan_in";
})(ExecutionMode || (exports.ExecutionMode = ExecutionMode = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["LOW"] = 0] = "LOW";
    TaskPriority[TaskPriority["NORMAL"] = 1] = "NORMAL";
    TaskPriority[TaskPriority["HIGH"] = 2] = "HIGH";
    TaskPriority[TaskPriority["CRITICAL"] = 3] = "CRITICAL";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
// ============================================
// Memory Management Types
// ============================================
var MemoryType;
(function (MemoryType) {
    MemoryType["SHORT_TERM"] = "short_term";
    MemoryType["LONG_TERM"] = "long_term";
    MemoryType["EPISODIC"] = "episodic";
    MemoryType["SEMANTIC"] = "semantic";
    MemoryType["PROCEDURAL"] = "procedural";
    MemoryType["WORKING"] = "working";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
exports.DEFAULT_ORCHESTRATOR_CONFIG = {
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
// Orchestrator Event Types
// ============================================
var OrchestratorEventType;
(function (OrchestratorEventType) {
    OrchestratorEventType["STATE_CHANGE"] = "state_change";
    OrchestratorEventType["INTENT_CLASSIFIED"] = "intent_classified";
    OrchestratorEventType["PLAN_CREATED"] = "plan_created";
    OrchestratorEventType["PLAN_OPTIMIZED"] = "plan_optimized";
    OrchestratorEventType["STEP_STARTED"] = "step_started";
    OrchestratorEventType["STEP_COMPLETED"] = "step_completed";
    OrchestratorEventType["STEP_FAILED"] = "step_failed";
    OrchestratorEventType["STEP_RETRYING"] = "step_retrying";
    OrchestratorEventType["FALLBACK_USED"] = "fallback_used";
    OrchestratorEventType["EXECUTION_COMPLETED"] = "execution_completed";
    OrchestratorEventType["EXECUTION_FAILED"] = "execution_failed";
    OrchestratorEventType["EXECUTION_TIMEOUT"] = "execution_timeout";
    OrchestratorEventType["EXECUTION_RESUMED"] = "execution_resumed";
    OrchestratorEventType["REFLECTION_GENERATED"] = "reflection_generated";
    OrchestratorEventType["MEMORY_STORED"] = "memory_stored";
    OrchestratorEventType["MEMORY_RETRIEVED"] = "memory_retrieved";
    OrchestratorEventType["FOLLOW_UP_SUGGESTED"] = "follow_up_suggested";
    OrchestratorEventType["ERROR_OCCURRED"] = "error_occurred";
    OrchestratorEventType["RATE_LIMIT_HIT"] = "rate_limit_hit";
    OrchestratorEventType["TIMEOUT_OCCURRED"] = "timeout_occurred";
    OrchestratorEventType["CIRCUIT_BREAKER_OPENED"] = "circuit_breaker_opened";
    OrchestratorEventType["CIRCUIT_BREAKER_CLOSED"] = "circuit_breaker_closed";
    OrchestratorEventType["BACKPRESSURE_REJECTED"] = "backpressure_rejected";
    OrchestratorEventType["COST_THRESHOLD_EXCEEDED"] = "cost_threshold_exceeded";
})(OrchestratorEventType || (exports.OrchestratorEventType = OrchestratorEventType = {}));
// ============================================
// Streaming Types
// ============================================
var OrchestratorStreamChunkType;
(function (OrchestratorStreamChunkType) {
    OrchestratorStreamChunkType["THINKING"] = "thinking";
    OrchestratorStreamChunkType["INTENT_CLASSIFYING"] = "intent_classifying";
    OrchestratorStreamChunkType["INTENT_RESULT"] = "intent_result";
    OrchestratorStreamChunkType["PLANNING"] = "planning";
    OrchestratorStreamChunkType["PLAN_CREATED"] = "plan_created";
    OrchestratorStreamChunkType["STEP_STARTED"] = "step_started";
    OrchestratorStreamChunkType["STEP_PROGRESS"] = "step_progress";
    OrchestratorStreamChunkType["STEP_COMPLETED"] = "step_completed";
    OrchestratorStreamChunkType["AGENT_OUTPUT"] = "agent_output";
    OrchestratorStreamChunkType["REFLECTING"] = "reflecting";
    OrchestratorStreamChunkType["FINAL_OUTPUT"] = "final_output";
    OrchestratorStreamChunkType["ERROR"] = "error";
    OrchestratorStreamChunkType["WARNING"] = "warning";
    OrchestratorStreamChunkType["CIRCUIT_BREAKER_WARNING"] = "circuit_breaker_warning";
    OrchestratorStreamChunkType["COST_WARNING"] = "cost_warning";
    OrchestratorStreamChunkType["BACKPRESSURE_WARNING"] = "backpressure_warning";
})(OrchestratorStreamChunkType || (exports.OrchestratorStreamChunkType = OrchestratorStreamChunkType = {}));
//# sourceMappingURL=orchestrator.types.js.map