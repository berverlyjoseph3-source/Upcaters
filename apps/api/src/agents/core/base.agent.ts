// enterprise-ai-agent-platform/apps/api/src/agents/core/base.agent.ts
import { v4 as uuidv4 } from 'uuid';
import {
  AgentType,
  AgentRequest,
  AgentResponse,
  AgentContext,
  AgentTool,
  AgentMetrics,
  AgentHealthStatus,
  AgentStatus,
  StreamingChunk,
  AgentExecutionContract,
} from '../../types/agent.types';
import { IAgent, IToolExecutor } from './agent.interface';
import { logger } from '../../utils/logger';
import { UsageMeteringService } from '../../services/usage-metering.service';
import { ActionType } from '../../types/usage.types';

// ============================================
// ENHANCEMENT: Execution Contract Constants
// ============================================

const MAX_TOOL_RETRIES = 2;
const TOOL_RETRY_BASE_DELAY_MS = 500;
const TOOL_RETRY_MAX_DELAY_MS = 5000;
const DEFAULT_TIMEOUT_MS = 30000;
const METRICS_WINDOW_SIZE = 100; // Keep last 100 execution times for percentile calculation

// ============================================
// Abstract Base Agent Class
// ============================================

export abstract class BaseAgent implements IAgent, IToolExecutor {
  protected tools: Map<string, AgentTool> = new Map();
  protected metrics: AgentMetrics;
  protected isInitialized: boolean = false;
  protected agentStatus: AgentStatus = AgentStatus.IDLE;

  // ENHANCEMENT: Execution time tracking for percentile calculations
  private executionTimes: number[] = [];
  // ENHANCEMENT: Active tool executions for timeout tracking
  private activeToolExecutions: Map<string, NodeJS.Timeout> = new Map();
  // ENHANCEMENT: Tool error counters for circuit breaker
  private toolErrorCounts: Map<string, { count: number; lastError: number }> = new Map();

  constructor(
    protected agentType: AgentType,
    protected agentName: string,
    protected agentDescription: string,
    protected agentVersion: string,
  ) {
    this.metrics = this.initMetrics();
  }

  // ============================================
  // Metrics Initialization
  // ============================================

  private initMetrics(): AgentMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      partialSuccessExecutions: 0,
      averageResponseTimeMs: 0,
      p95ResponseTimeMs: 0,
      p99ResponseTimeMs: 0,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      lastExecutedAt: undefined,
      errorRate: 0,
      toolExecutionStats: {},
    };
  }

  // ============================================
  // Getters
  // ============================================

  getType(): AgentType {
    return this.agentType;
  }

  getName(): string {
    return this.agentName;
  }

  getDescription(): string {
    return this.agentDescription;
  }

  getVersion(): string {
    return this.agentVersion;
  }

  getTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getTool(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName);
  }

  listTools(): AgentTool[] {
    return this.getTools();
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  getStatus(): AgentStatus {
    return this.agentStatus;
  }

  // ============================================
  // Tool Registration
  // ============================================

  protected registerTool(tool: AgentTool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(
        { agentType: this.agentType, toolName: tool.name },
        'Tool already registered, overwriting',
      );
    }

    // ENHANCEMENT: Wrap tool execution to enforce contract validation
    const originalExecute = tool.execute.bind(tool);
    tool.execute = async (params: any, context: AgentContext): Promise<any> => {
      return await this.executeToolWithContract(tool.name, params, context, originalExecute);
    };

    this.tools.set(tool.name, tool);
    logger.debug(
      { agentType: this.agentType, toolName: tool.name },
      'Tool registered',
    );
  }

  /**
   * ENHANCEMENT: Unregister a tool
   */
  protected unregisterTool(toolName: string): boolean {
    const deleted = this.tools.delete(toolName);
    if (deleted) {
      logger.debug(
        { agentType: this.agentType, toolName },
        'Tool unregistered',
      );
    }
    return deleted;
  }

  // ============================================
  // ENHANCEMENT: Tool Execution with Contract
  // ============================================

  /**
   * Execute a tool with contract enforcement, retry, timeout, and error tracking
   */

  async executeTool(toolName: string, params: any, context: AgentContext): Promise<any> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found for agent ${this.agentType}`);
    }

    return await this.executeToolWithContract(
      toolName,
      params,
      context,
      tool.execute.bind(tool),
    );
  }

  /**
   * ENHANCEMENT: Core tool execution with contract wrapping
   */
  private async executeToolWithContract(
    toolName: string,
    params: any,
    context: AgentContext,
    executor: (params: any, context: AgentContext) => Promise<any>,
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Validate parameters
    const validationResult = this.validateToolParams(toolName, params);
    if (!validationResult.valid) {
      logger.warn(
        { toolName, errors: validationResult.errors },
        'Tool parameter validation failed',
      );
      throw new Error(
        `Invalid parameters for tool "${toolName}": ${validationResult.errors.join('; ')}`,
      );
    }

    // Rate limit check
    if (tool.requiresApiCall) {
      await this.checkRateLimit(context.userId, toolName);
    }

    // ENHANCEMENT: Execute with retries
    let lastError: Error | null = null;
    const maxRetries = tool.retryCount || MAX_TOOL_RETRIES;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();

      try {
        // Track the result
        const rawResult = await executor(params, context);
        const executionTime = Date.now() - startTime;

        // ENHANCEMENT: Wrap result in execution contract
        const contract = this.wrapInContract(rawResult, toolName, executionTime);

        // Track API call usage
        if (tool.requiresApiCall) {
          await this.trackApiCall(context.userId, tool.cost);
        }

        // Update tool metrics
        this.updateToolMetrics(toolName, executionTime, contract);

        logger.debug(
          {
            agentType: this.agentType,
            toolName,
            executionTime,
            status: contract.status,
          },
          'Tool executed successfully',
        );

        return contract;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Track tool error
        this.trackToolError(toolName, lastError);

        if (attempt < maxRetries) {
          const delay = Math.min(
            TOOL_RETRY_BASE_DELAY_MS * Math.pow(2, attempt),
            TOOL_RETRY_MAX_DELAY_MS,
          );
          logger.warn(
            {
              agentType: this.agentType,
              toolName,
              attempt: attempt + 1,
              maxRetries,
              delay,
              error: lastError.message,
            },
            'Tool execution failed, retrying',
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted — return failed contract
    const failedContract: AgentExecutionContract = {
      status: 'failed',
      data: {},
      errors: [
        {
          stepId: toolName,
          message: lastError?.message || 'Tool execution failed after retries',
          recoverable: false,
          code: 'TOOL_EXECUTION_FAILED',
        },
      ],
      cost: {
        tokens: 0,
        usd: 0,
      },
    };

    logger.error(
      {
        agentType: this.agentType,
        toolName,
        error: lastError?.message,
      },
      'Tool execution failed after all retries',
    );

    return failedContract;
  }

  /**
   * ENHANCEMENT: Wrap raw result in standardized execution contract
   */
  private wrapInContract(
    rawResult: any,
    toolName: string,
    executionTime: number,
  ): AgentExecutionContract {
    // If result is already a contract, return it
    if (
      rawResult &&
      typeof rawResult === 'object' &&
      'status' in rawResult &&
      'data' in rawResult &&
      'cost' in rawResult
    ) {
      return rawResult as AgentExecutionContract;
    }

    // Otherwise, normalize into contract
    return {
      status: 'success',
      data: rawResult || {},
      cost: {
        tokens: rawResult?.tokensUsed || rawResult?.metadata?.tokensUsed || 0,
        usd: rawResult?.costUsd || rawResult?.metadata?.costUsd || 0,
      },
      metadata: {
        toolName,
        executionTime,
        agentType: this.agentType,
      },
    };
  }

  /**
   * ENHANCEMENT: Track tool error for monitoring
   */
  private trackToolError(toolName: string, error: Error): void {
    const existing = this.toolErrorCounts.get(toolName) || {
      count: 0,
      lastError: 0,
    };
    existing.count++;
    existing.lastError = Date.now();
    this.toolErrorCounts.set(toolName, existing);

    if (existing.count >= 5) {
      logger.error(
        {
          agentType: this.agentType,
          toolName,
          errorCount: existing.count,
          lastError: error.message,
        },
        'Tool has high error rate — consider circuit breaking',
      );
    }
  }

  /**
   * ENHANCEMENT: Update tool execution metrics
   */
  private updateToolMetrics(
    toolName: string,
    executionTime: number,
    contract: AgentExecutionContract,
  ): void {
    if (!this.metrics.toolExecutionStats) {
      this.metrics.toolExecutionStats = {};
    }

    const existing = this.metrics.toolExecutionStats[toolName] || {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      partialSuccessExecutions: 0,
      averageResponseTimeMs: 0,
      totalCostUsd: 0,
    };

    existing.totalExecutions++;
    if (contract.status === 'success') {
      existing.successfulExecutions++;
    } else if (contract.status === 'partial_success') {
      existing.partialSuccessExecutions++;
    } else {
      existing.failedExecutions++;
    }

    existing.averageResponseTimeMs =
      (existing.averageResponseTimeMs * (existing.totalExecutions - 1) +
        executionTime) /
      existing.totalExecutions;

    existing.totalCostUsd += contract.cost?.usd || 0;

    this.metrics.toolExecutionStats[toolName] = existing;
  }

  // ============================================
  // Parameter Validation
  // ============================================

  validateToolParams(
    toolName: string,
    params: any,
  ): { valid: boolean; errors: string[] } {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool ${toolName} not found`] };
    }

    const errors: string[] = [];

    for (const param of tool.parameters) {
      // Check required parameters
      if (
        param.required &&
        (params[param.name] === undefined || params[param.name] === null)
      ) {
        errors.push(`Required parameter "${param.name}" is missing`);
        continue;
      }

      // Skip type validation for undefined optional params
      if (params[param.name] === undefined || params[param.name] === null) {
        continue;
      }

      // Type validation
      const actualType = typeof params[param.name];
      const expectedType = param.type;

      if (expectedType === 'array') {
        if (!Array.isArray(params[param.name])) {
          errors.push(
            `Parameter "${param.name}" must be an array, got ${actualType}`,
          );
        }
      } else if (expectedType === 'object') {
        if (actualType !== 'object' || Array.isArray(params[param.name])) {
          errors.push(
            `Parameter "${param.name}" must be an object, got ${actualType}`,
          );
        }
      } else if (expectedType !== actualType) {
        errors.push(
          `Parameter "${param.name}" must be of type ${expectedType}, got ${actualType}`,
        );
      }

      // Enum validation
      if (param.enum && param.enum.length > 0) {
        if (!param.enum.includes(params[param.name])) {
          errors.push(
            `Parameter "${param.name}" must be one of [${param.enum.join(', ')}], got "${params[param.name]}"`,
          );
        }
      }

      // Range validation for numbers
      if (expectedType === 'number' && param.constraints) {
        const value = params[param.name];
        if (
          param.constraints.min !== undefined &&
          value < param.constraints.min
        ) {
          errors.push(
            `Parameter "${param.name}" must be >= ${param.constraints.min}, got ${value}`,
          );
        }
        if (
          param.constraints.max !== undefined &&
          value > param.constraints.max
        ) {
          errors.push(
            `Parameter "${param.name}" must be <= ${param.constraints.max}, got ${value}`,
          );
        }
      }

      // Length validation for strings and arrays
      if (
        (expectedType === 'string' || expectedType === 'array') &&
        param.constraints
      ) {
        const length =
          expectedType === 'string'
            ? params[param.name].length
            : params[param.name].length;
        if (
          param.constraints.minLength !== undefined &&
          length < param.constraints.minLength
        ) {
          errors.push(
            `Parameter "${param.name}" must have length >= ${param.constraints.minLength}, got ${length}`,
          );
        }
        if (
          param.constraints.maxLength !== undefined &&
          length > param.constraints.maxLength
        ) {
          errors.push(
            `Parameter "${param.name}" must have length <= ${param.constraints.maxLength}, got ${length}`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // Rate Limiting
  // ============================================

  protected async checkRateLimit(
    userId: string,
    toolName?: string,
  ): Promise<void> {
    try {
      const usage = await UsageMeteringService.getCurrentUsage(userId);

      // Log but don't block — overage handles excess
      if (usage.aiActions > 100000 || usage.apiCalls > 500000) {
        logger.warn(
          {
            userId,
            toolName,
            aiActions: usage.aiActions,
            apiCalls: usage.apiCalls,
          },
          'High usage detected for user',
        );
      }
    } catch (error) {
      logger.error(
        { error, userId, toolName },
        'Rate limit check failed, allowing execution',
      );
      // Don't block execution on rate limit check failure
    }
  }

  // ============================================
  // Usage Tracking
  // ============================================

  protected async trackApiCall(userId: string, cost: number): Promise<void> {
    try {
      const actionType = this.mapToActionType();
      await UsageMeteringService.incrementUsage(userId, actionType, 0);
    } catch (error) {
      logger.error(
        { error, userId, agentType: this.agentType },
        'Failed to track API call',
      );
    }
  }

  protected mapToActionType(): ActionType {
    const mapping: Record<AgentType, ActionType> = {
      [AgentType.ORCHESTRATOR]: ActionType.AI_ORCHESTRATOR,
      [AgentType.EMAIL]: ActionType.AI_EMAIL_PROCESS,
      [AgentType.DRIVE]: ActionType.API_DRIVE_UPLOAD,
      [AgentType.CONTENT]: ActionType.AI_CONTENT_TEXT,
      [AgentType.SOCIAL]: ActionType.AI_SOCIAL_POST,
      [AgentType.CALENDAR]: ActionType.AI_CALENDAR_SCHEDULE,
      [AgentType.WEB]: ActionType.AI_WEB_SEARCH,
      [AgentType.TASK]: ActionType.AI_TASK_CREATE,
    };

    return mapping[this.agentType] || ActionType.AI_ORCHESTRATOR;
  }

  // ============================================
  // Initialization
  // ============================================

  async initialize(): Promise<void> {
    try {
      this.registerTools();
      this.isInitialized = true;
      this.agentStatus = AgentStatus.IDLE;
      logger.info(
        { agentType: this.agentType, version: this.agentVersion },
        'Agent initialized',
      );
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      logger.error(
        { error, agentType: this.agentType },
        'Agent initialization failed',
      );
      throw error;
    }
  }

  protected abstract registerTools(): void;

  // ============================================
  // Core Execution
  // ============================================

  async execute(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    this.agentStatus = AgentStatus.RUNNING;

    this.metrics.totalExecutions++;

    try {
      // ENHANCEMENT: Validate request
      if (!this.canHandle(request)) {
        throw new Error(
          `Agent ${this.agentType} cannot handle this request`,
        );
      }

      // ENHANCEMENT: Execute with timeout
      const timeout = request.timeout || DEFAULT_TIMEOUT_MS;
      const result = await this.executeWithTimeout(request, context, timeout);

      // ENHANCEMENT: Validate output against execution contract
      const contract = this.validateAgentOutput(result, request.id);

      const executionTimeMs = Date.now() - startTime;

      this.metrics.successfulExecutions++;
      this.updateExecutionMetrics(executionTimeMs, contract);

      this.agentStatus = AgentStatus.IDLE;

      return {
        id: uuidv4(),
        success: contract.status === 'success' || contract.status === 'partial_success',
        output: contract,
        metadata: {
          agentType: this.agentType,
          executionTimeMs,
          tokensUsed: contract.cost?.tokens || 0,
          costUsd: contract.cost?.usd || 0,
          retryCount: 0,
          status: contract.status,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      this.metrics.failedExecutions++;
      this.updateExecutionMetrics(executionTimeMs, {
        status: 'failed',
        data: {},
        errors: [
          {
            stepId: request.id,
            message:
              error instanceof Error ? error.message : String(error),
            recoverable: false,
          },
        ],
        cost: { tokens: 0, usd: 0 },
      });

      this.agentStatus = AgentStatus.ERROR;

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(
        {
          agentType: this.agentType,
          requestId: request.id,
          userId: request.userId,
          error: errorMessage,
          executionTimeMs,
        },
        'Agent execution failed',
      );

      return {
        id: uuidv4(),
        success: false,
        output: {
          status: 'failed',
          data: {},
          errors: [
            {
              stepId: request.id,
              message: errorMessage,
              recoverable: false,
            },
          ],
          cost: { tokens: 0, usd: 0 },
        },
        error: errorMessage,
        metadata: {
          agentType: this.agentType,
          executionTimeMs,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
          status: 'failed',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * ENHANCEMENT: Execute with timeout protection
   */
  private async executeWithTimeout(
    request: AgentRequest,
    context: AgentContext,
    timeoutMs: number,
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Agent ${this.agentType} execution timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      this.doExecute(request, context)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * ENHANCEMENT: Validate agent output against execution contract
   */
  private validateAgentOutput(
    output: any,
    requestId: string,
  ): AgentExecutionContract {
    // If already a contract, validate and return
    if (
      output &&
      typeof output === 'object' &&
      'status' in output &&
      'data' in output
    ) {
      const contract = output as AgentExecutionContract;

      // Ensure required fields exist
      if (!contract.cost) {
        contract.cost = { tokens: 0, usd: 0 };
      }
      if (!contract.errors) {
        contract.errors = [];
      }
      if (!contract.data) {
        contract.data = {};
      }

      return contract;
    }

    // Wrap in contract
    return {
      status: 'success',
      data: output !== null && output !== undefined ? output : {},
      cost: {
        tokens: 0,
        usd: 0,
      },
      metadata: {
        agentType: this.agentType,
        requestId,
      },
    };
  }

  /**
   * ENHANCEMENT: Update execution metrics with percentile tracking
   */
  private updateExecutionMetrics(
    executionTimeMs: number,
    contract: AgentExecutionContract,
  ): void {
    // Track execution time
    this.executionTimes.push(executionTimeMs);
    if (this.executionTimes.length > METRICS_WINDOW_SIZE) {
      this.executionTimes.shift();
    }

    const sorted = [...this.executionTimes].sort((a, b) => a - b);

    // Update average
    const total = this.metrics.successfulExecutions + this.metrics.failedExecutions;
    this.metrics.averageResponseTimeMs =
      (this.metrics.averageResponseTimeMs * (total - 1) + executionTimeMs) /
      total;

    // Update percentiles
    if (sorted.length > 0) {
      this.metrics.p95ResponseTimeMs =
        sorted[Math.floor(sorted.length * 0.95)] || executionTimeMs;
      this.metrics.p99ResponseTimeMs =
        sorted[Math.floor(sorted.length * 0.99)] || executionTimeMs;
    } else {
      this.metrics.p95ResponseTimeMs = Math.max(
        this.metrics.p95ResponseTimeMs,
        executionTimeMs,
      );
      this.metrics.p99ResponseTimeMs = Math.max(
        this.metrics.p99ResponseTimeMs,
        executionTimeMs,
      );
    }

    // Track status-specific counts
    if (contract.status === 'partial_success') {
      this.metrics.partialSuccessExecutions =
        (this.metrics.partialSuccessExecutions || 0) + 1;
    }

    // Track tokens and cost
    this.metrics.totalTokensUsed += contract.cost?.tokens || 0;
    this.metrics.totalCostUsd += contract.cost?.usd || 0;

    // Track last execution time
    this.metrics.lastExecutedAt = new Date();

    // Update error rate
    this.metrics.errorRate =
      total > 0 ? this.metrics.failedExecutions / total : 0;
  }

  // ============================================
  // Abstract Methods
  // ============================================

  protected abstract doExecute(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<any>;

  canHandle(request: AgentRequest): boolean {
    return true;
  }

  // ============================================
  // Streaming Support
  // ============================================

  async executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void,
  ): Promise<AgentResponse> {
    onChunk({
      type: 'thought',
      content: `Processing your request with ${this.agentName}...`,
      timestamp: new Date(),
    });

    const response = await this.execute(request, context);

    if (response.success) {
      const contract = response.output as AgentExecutionContract;
      onChunk({
        type: 'output',
        content:
          typeof contract.data === 'string'
            ? contract.data
            : JSON.stringify(contract.data),
        metadata: contract.metadata,
        timestamp: new Date(),
      });
    } else {
      onChunk({
        type: 'error',
        content: response.error || 'Unknown error occurred',
        timestamp: new Date(),
      });
    }

    return response;
  }

  // ============================================
  // Health & Metrics
  // ============================================

  async getHealth(): Promise<AgentHealthStatus> {
    return {
      agentType: this.agentType,
      status: this.agentStatus,
      metrics: { ...this.metrics },
      lastHeartbeat: new Date(),
      message: this.isInitialized
        ? 'Agent is operational'
        : 'Agent not initialized',
    };
  }

  resetMetrics(): void {
    this.metrics = this.initMetrics();
    this.executionTimes = [];
    this.toolErrorCounts.clear();
    logger.info({ agentType: this.agentType }, 'Agent metrics reset');
  }

  /**
   * ENHANCEMENT: Get tool error statistics
   */
  getToolErrorStats(): Record<
    string,
    { count: number; lastError: number }
  > {
    const stats: Record<string, { count: number; lastError: number }> = {};
    for (const [toolName, info] of this.toolErrorCounts.entries()) {
      stats[toolName] = { ...info };
    }
    return stats;
  }

  /**
   * ENHANCEMENT: Reset tool error counts
   */
  resetToolErrorCounts(): void {
    this.toolErrorCounts.clear();
  }

  // ============================================
  // Shutdown
  // ============================================

  async shutdown(): Promise<void> {
    // Clear any active tool execution timeouts
    for (const [toolName, timeoutId] of this.activeToolExecutions.entries()) {
      clearTimeout(timeoutId);
      logger.info({ agentType: this.agentType, toolName }, 'Cancelled active tool execution');
    }
    this.activeToolExecutions.clear();

    this.isInitialized = false;
    this.agentStatus = AgentStatus.IDLE;
    logger.info({ agentType: this.agentType }, 'Agent shutdown complete');
  }

  // ============================================
  // Public Utility Methods
  // ============================================

  /**
   * ENHANCEMENT: Check if this agent has a specific tool
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * ENHANCEMENT: Get count of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * ENHANCEMENT: Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * ENHANCEMENT: Get execution times for debugging
   */
  getExecutionTimes(): number[] {
    return [...this.executionTimes];
  }

  /**
   * ENHANCEMENT: Get average execution time from window
   */
  getAverageExecutionTime(): number {
    if (this.executionTimes.length === 0) return 0;
    return (
      this.executionTimes.reduce((sum, t) => sum + t, 0) /
      this.executionTimes.length
    );
  }
}