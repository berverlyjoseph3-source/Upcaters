// enterprise-ai-agent-platform/apps/api/src/agents/core/agent.interface.ts
import {
  AgentType,
  AgentRequest,
  AgentResponse,
  AgentContext,
  AgentTool,
  AgentMetrics,
  AgentHealthStatus,
  StreamingChunk,
} from '../../types/agent.types';

/**
 * Base Agent Interface
 * All specialized agents must implement this interface
 */
export interface IAgent {
  /**
   * Get agent type identifier
   */
  getType(): AgentType;
  
  /**
   * Get agent name
   */
  getName(): string;
  
  /**
   * Get agent description
   */
  getDescription(): string;
  
  /**
   * Get agent version
   */
  getVersion(): string;
  
  /**
   * Get available tools for this agent
   */
  getTools(): AgentTool[];
  
  /**
   * Initialize the agent (called once on startup)
   */
  initialize(): Promise < void > ;
  
  /**
   * Execute an action with this agent
   */
  execute(request: AgentRequest, context: AgentContext): Promise < AgentResponse > ;
  
  /**
   * Execute with streaming support
   */
  executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise < AgentResponse > ;
  
  /**
   * Validate if the agent can handle a specific request
   */
  canHandle(request: AgentRequest): boolean;
  
  /**
   * Get agent health status
   */
  getHealth(): Promise < AgentHealthStatus > ;
  
  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics;
  
  /**
   * Reset agent metrics
   */
  resetMetrics(): void;
  
  /**
   * Shutdown the agent gracefully
   */
  shutdown(): Promise < void > ;
}

/**
 * Tool Executor Interface
 */
export interface IToolExecutor {
  /**
   * Execute a tool by name
   */
  executeTool(toolName: string, params: any, context: AgentContext): Promise < any > ;
  
  /**
   * Validate tool parameters
   */
  validateToolParams(toolName: string, params: any): boolean | { valid: boolean; errors: string[] };
  
  /**
   * Get tool by name
   */
  getTool(toolName: string): AgentTool | undefined;
  
  /**
   * List all available tools
   */
  listTools(): AgentTool[];
}

/**
 * Agent Factory Interface
 */
export interface IAgentFactory {
  /**
   * Create an agent instance
   */
  createAgent(type: AgentType): IAgent;
  
  /**
   * Register an agent type
   */
  registerAgent(type: AgentType, agentClass: new() => IAgent): void;
  
  /**
   * Get all registered agent types
   */
  getRegisteredTypes(): AgentType[];
}

/**
 * Agent Event Listener Interface
 */
export interface IAgentEventListener {
  /**
   * Called before agent execution
   */
  onBeforeExecute ? (request: AgentRequest, context: AgentContext) : Promise < void > ;
  
  /**
   * Called after agent execution
   */
  onAfterExecute ? (request: AgentRequest, response: AgentResponse, context: AgentContext) : Promise < void > ;
  
  /**
   * Called when agent execution fails
   */
  onError ? (request: AgentRequest, error: Error, context: AgentContext) : Promise < void > ;
  
  /**
   * Called on execution progress (for long-running tasks)
   */
  onProgress ? (request: AgentRequest, progress: number, message: string) : Promise < void > ;
}

/**
 * Agent Cache Interface
 */
export interface IAgentCache {
  /**
   * Get cached response
   */
  get(key: string): Promise < AgentResponse | null > ;
  
  /**
   * Set cached response
   */
  set(key: string, response: AgentResponse, ttlSeconds: number): Promise < void > ;
  
  /**
   * Invalidate cache for a user/session
   */
  invalidate(pattern: string): Promise < void > ;
  
  /**
   * Clear all cache
   */
  clear(): Promise < void > ;
}

/**
 * Agent Middleware Interface
 */
export interface IAgentMiddleware {
  /**
   * Process request before execution
   */
  preProcess(request: AgentRequest, context: AgentContext): Promise < AgentRequest > ;
  
  /**
   * Process response after execution
   */
  postProcess(response: AgentResponse, context: AgentContext): Promise < AgentResponse > ;
  
  /**
   * Handle errors
   */
  onError(error: Error, request: AgentRequest, context: AgentContext): Promise < AgentResponse | null > ;
}

/**
 * Rate Limiter Interface
 */
export interface IAgentRateLimiter {
  /**
   * Check if request is allowed
   */
  isAllowed(userId: string, agentType: AgentType): Promise < boolean > ;
  
  /**
   * Record a request
   */
  recordRequest(userId: string, agentType: AgentType): Promise < void > ;
  
  /**
   * Get remaining quota
   */
  getRemaining(userId: string, agentType: AgentType): Promise < number > ;
  
  /**
   * Get reset time
   */
  getResetTime(userId: string, agentType: AgentType): Promise < Date > ;
}