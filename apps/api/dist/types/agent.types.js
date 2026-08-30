"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryType = exports.OrchestratorStreamChunkType = exports.OrchestratorEventType = exports.OrchestratorState = exports.FallbackStrategy = exports.TaskPriority = exports.ExecutionMode = exports.AgentStatus = exports.AgentType = void 0;
/**
 * Agent Types
 */
var AgentType;
(function (AgentType) {
    AgentType["ORCHESTRATOR"] = "orchestrator";
    AgentType["EMAIL"] = "email";
    AgentType["DRIVE"] = "drive";
    AgentType["CONTENT"] = "content";
    AgentType["SOCIAL"] = "social";
    AgentType["CALENDAR"] = "calendar";
    AgentType["WEB"] = "web";
    AgentType["TASK"] = "task";
})(AgentType || (exports.AgentType = AgentType = {}));
/**
 * Agent Status
 */
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "idle";
    AgentStatus["RUNNING"] = "running";
    AgentStatus["ERROR"] = "error";
    AgentStatus["DEGRADED"] = "degraded";
    AgentStatus["MAINTENANCE"] = "maintenance";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
/**
 * Agent Execution Mode
 */
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
/**
 * Task Priority
 */
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["LOW"] = 0] = "LOW";
    TaskPriority[TaskPriority["NORMAL"] = 1] = "NORMAL";
    TaskPriority[TaskPriority["HIGH"] = 2] = "HIGH";
    TaskPriority[TaskPriority["CRITICAL"] = 3] = "CRITICAL";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
/**
 * Fallback Strategy
 */
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
/**
 * Orchestrator State
 */
var OrchestratorState;
(function (OrchestratorState) {
    OrchestratorState["IDLE"] = "idle";
    OrchestratorState["PARSING_INTENT"] = "parsing_intent";
    OrchestratorState["PLANNING"] = "planning";
    OrchestratorState["EXECUTING"] = "executing";
    OrchestratorState["REFLECTING"] = "reflecting";
    OrchestratorState["RESPONDING"] = "responding";
    OrchestratorState["ERROR"] = "error";
})(OrchestratorState || (exports.OrchestratorState = OrchestratorState = {}));
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
// Orchestrator Streaming Types
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
// ============================================
// Memory Types
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
//# sourceMappingURL=agent.types.js.map