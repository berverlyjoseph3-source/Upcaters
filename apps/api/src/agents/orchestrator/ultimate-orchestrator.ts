// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/ultimate-orchestrator.ts

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../core/base.agent';
import { agentRegistry } from '../core/agent.registry';
import { IntentClassifier } from './intent-classifier';
import { TaskPlanner } from './task-planner';
import { MemoryManager } from './memory-manager';
import { OpenAIService } from '../../services/ai/openai.service';
import { UsageMeteringService } from '../../services/usage-metering.service';
import { PlanGateService } from '../../services/plan-gate.service';
import { prisma } from '../../db/client';
import { AgentRepository } from '../../db/repositories/agent.repository';
import {
  AgentType,
  AgentRequest,
  AgentContext,
  AgentResponse,
  IntentResult,
  TaskPlan,
  ChainExecutionResult,
  StepExecutionResult,
  StreamingChunk,
  ExecutionMode,
  AgentExecutionContract,
} from '../../types/agent.types';
import {
  OrchestratorStateType,
  ExecutionTaskState,
  StepTaskState,
  FallbackStrategy,
  CircuitBreakerState,
} from './orchestrator.types';
import { logger } from '../../utils/logger';
import { ActionType } from '../../types/usage.types';

// ============================================
// Constants
// ============================================

const MAX_RETRIES_PER_STEP = 3;
const MAX_PLAN_RETRIES = 2;
const MAX_STEPS = 10;
const MAX_CONCURRENT_EXECUTIONS = 10;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000;
const EXECUTION_TIMEOUT_MS = 300000; // 5 minutes
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30000;

// ============================================
// Interfaces
// ============================================

interface OrchestratorInternalState {
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
  injectedMemories: any[];
  totalTokensUsed: number;
  totalCostUsd: number;
  retryCount: number;
  // ENHANCEMENT: Track steps that should be skipped on retry
  completedSteps: Set<string>;
}

interface PreExecutionCheck {
  allowed: boolean;
  estimatedCost: number;
  estimatedTokens: number;
  currentUsage: { aiActions: number; apiCalls: number };
  limits: { aiActions: number; apiCalls: number };
  remainingAfter: { aiActions: number; apiCalls: number };
  overageCost: number;
  reason?: string;
}

// ============================================
// Static Circuit Breakers (shared across instances)
// ============================================

const agentCircuitBreakers = new Map<string, CircuitBreakerState>();

// ============================================
// Static Concurrency Control
// ============================================

let activeExecutions = 0;

export class UltimateOrchestrator extends BaseAgent {
  private state: OrchestratorInternalState;
  private modelProviders: string[] = ['openai', 'anthropic', 'google'];
  private executionTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    super(
      AgentType.ORCHESTRATOR,
      'Ultimate AI Agent',
      'Central orchestrator that coordinates all 7 specialized agents with memory, fallback, and fault tolerance',
      '3.0.0', // Enhanced version
    );

    this.state = {
      currentState: OrchestratorStateType.IDLE,
      intent: null,
      plan: null,
      executionId: null,
      executionResults: new Map(),
      currentStepIndex: 0,
      finalOutput: null,
      error: null,
      startTime: 0,
      modelFallbackChain: ['openai', 'anthropic', 'google'],
      currentModelIndex: 0,
      injectedMemories: [],
      totalTokensUsed: 0,
      totalCostUsd: 0,
      retryCount: 0,
      completedSteps: new Set(),
    };
  }

  // ============================================
  // ENHANCEMENT 1: Static Concurrency Control
  // ============================================

  private async acquireExecutionSlot(): Promise<boolean> {
    if (activeExecutions >= MAX_CONCURRENT_EXECUTIONS) {
      logger.warn({
        activeExecutions,
        max: MAX_CONCURRENT_EXECUTIONS,
      }, 'Orchestrator at capacity — rejecting execution');
      return false;
    }
    activeExecutions++;
    return true;
  }

  private releaseExecutionSlot(): void {
    activeExecutions = Math.max(0, activeExecutions - 1);
  }

  // ============================================
  // ENHANCEMENT 2: Circuit Breaker
  // ============================================

  private getOrCreateCircuitBreaker(agentType: string): CircuitBreakerState {
    if (!agentCircuitBreakers.has(agentType)) {
      agentCircuitBreakers.set(agentType, {
        failureCount: 0,
        lastFailure: 0,
        isOpen: false,
        openUntil: 0,
      });
    }
    return agentCircuitBreakers.get(agentType)!;
  }

  private async executeWithCircuitBreaker<T>(
    agentType: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const breaker = this.getOrCreateCircuitBreaker(agentType);

    // Check if circuit is open
    if (breaker.isOpen) {
      if (Date.now() < breaker.openUntil) {
        throw new Error(
          `Circuit breaker open for agent "${agentType}" until ${new Date(breaker.openUntil).toISOString()}`,
        );
      }
      // Transition to half-open
      logger.info({ agentType }, 'Circuit breaker entering half-open state');
    }

    try {
      const result = await fn();

      // Success — reset breaker
      breaker.failureCount = 0;
      breaker.isOpen = false;
      breaker.openUntil = 0;
      agentCircuitBreakers.set(agentType, breaker);

      return result;
    } catch (error) {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      agentCircuitBreakers.set(agentType, breaker);

      if (breaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        breaker.openUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS;
        agentCircuitBreakers.set(agentType, breaker);
        logger.error(
          { agentType, failureCount: breaker.failureCount },
          'Circuit breaker opened',
        );
      }

      throw error;
    }
  }

  // ============================================
  // ENHANCEMENT 3: Pre-Execution Cost Check
  // ============================================

  private async preExecutionCostCheck(
    userId: string,
    estimatedCost: number,
    estimatedTokens: number,
  ): Promise<PreExecutionCheck> {
    try {
      const usage = await UsageMeteringService.getCurrentUsage(userId);
      const plan = await PlanGateService.getUserPlan(userId);

      const aiLimit = plan.limits.aiActions;
      const apiLimit = plan.limits.apiCalls;
      const overagePricing = plan.overagePricing;

      // Estimate AI actions and API calls from the plan
      const estimatedAiActions = Math.ceil(estimatedTokens / 500); // Rough estimate
      const estimatedApiCalls = (this.state.plan?.steps.length || 1) * 2;

      const newAiActions = usage.aiActions + estimatedAiActions;
      const newApiCalls = usage.apiCalls + estimatedApiCalls;

      // Calculate overage
      const aiOverage = Math.max(0, newAiActions - aiLimit);
      const apiOverage = Math.max(0, newApiCalls - apiLimit);
      const overageCost =
        aiOverage * overagePricing.aiAction +
        apiOverage * overagePricing.apiCall;

      // Always allow — overage handles excess costs
      const allowed = true;
      let reason: string | undefined;

      if (aiOverage > 0 || apiOverage > 0) {
        reason = `This execution will incur overage charges of approximately $${overageCost.toFixed(4)}`;
      }

      logger.info(
        {
          userId,
          estimatedCost,
          overageCost,
          newAiActions,
          newApiCalls,
          limits: { aiLimit, apiLimit },
        },
        'Pre-execution cost check',
      );

      return {
        allowed,
        estimatedCost: estimatedCost + overageCost,
        estimatedTokens,
        currentUsage: usage,
        limits: { aiActions: aiLimit, apiCalls: apiLimit },
        remainingAfter: {
          aiActions: Math.max(0, aiLimit - newAiActions),
          apiCalls: Math.max(0, apiLimit - newApiCalls),
        },
        overageCost,
        reason,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Pre-execution cost check failed');
      // Allow execution on cost check failure — don't block users
      return {
        allowed: true,
        estimatedCost: 0,
        estimatedTokens: 0,
        currentUsage: { aiActions: 0, apiCalls: 0 },
        limits: { aiActions: 0, apiCalls: 0 },
        remainingAfter: { aiActions: 0, apiCalls: 0 },
        overageCost: 0,
      };
    }
  }

  // ============================================
  // ENHANCEMENT 4: Task State Persistence
  // ============================================

  private async saveExecutionState(): Promise<void> {
    if (!this.state.executionId || !this.state.plan) return;

    const stepStates: StepTaskState[] = this.state.plan.steps.map((step) => {
      const result = this.state.executionResults.get(step.id);
      return {
        stepId: step.id,
        status: this.state.completedSteps.has(step.id)
          ? 'completed'
          : result
            ? result.success
              ? 'completed'
              : 'failed'
            : 'pending',
        agentType: step.agentType,
        retryCount: result?.retryCount || 0,
        maxRetries: step.maxRetries || step.retryCount || MAX_RETRIES_PER_STEP,
        startedAt: undefined,
        completedAt: result?.success ? new Date() : undefined,
        error: result?.error,
      };
    });

    const overallStatus = this.determineOverallStatus(stepStates);

    const taskState: ExecutionTaskState = {
      executionId: this.state.executionId,
      planId: this.state.plan.id,
      stepStates,
      overallStatus,
      persistedAt: new Date(),
    };

    try {
      await AgentRepository.saveExecutionState(taskState);
      logger.debug({ executionId: this.state.executionId }, 'Execution state persisted');
    } catch (error) {
      logger.error({ error, executionId: this.state.executionId }, 'Failed to persist execution state');
    }
  }

  private async loadExecutionState(
    executionId: string,
  ): Promise<ExecutionTaskState | null> {
    try {
      const state = await AgentRepository.loadExecutionState(executionId);
      if (state) {
        logger.info({ executionId, status: state.overallStatus }, 'Loaded execution state');
      }
      return state;
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to load execution state');
      return null;
    }
  }

  private determineOverallStatus(
    stepStates: StepTaskState[],
  ): 'running' | 'completed' | 'failed' | 'partial_success' {
    const completed = stepStates.filter((s) => s.status === 'completed').length;
    const failed = stepStates.filter((s) => s.status === 'failed').length;
    const pending = stepStates.filter((s) => s.status === 'pending').length;
    const running = stepStates.filter((s) => s.status === 'running').length;

    if (running > 0 || pending > 0) return 'running';
    if (failed === 0) return 'completed';
    if (completed === 0 && failed > 0) return 'failed';
    return 'partial_success';
  }

  // ============================================
  // ENHANCEMENT 5: Agent Execution Contract Validation
  // ============================================

  private validateAgentOutput(
    response: AgentResponse,
    stepId: string,
  ): AgentExecutionContract {
    // If agent already returns contract shape, use it
    if (
      response.output &&
      typeof response.output === 'object' &&
      'status' in response.output &&
      'data' in response.output
    ) {
      return response.output as AgentExecutionContract;
    }

    // Otherwise, wrap in standard contract
    return {
      status: response.success ? 'success' : 'failed',
      data: response.output || {},
      errors: response.error
        ? [{ stepId, message: response.error, recoverable: true }]
        : undefined,
      cost: {
        tokens: response.metadata.tokensUsed || 0,
        usd: response.metadata.costUsd || 0,
      },
      nextSteps: [],
    };
  }

  // ============================================
  // Register orchestrator tools
  // ============================================

  protected registerTools(): void {
    this.registerTool({
      name: 'delegate_to_agent',
      description: 'Delegate a task to a specialized agent',
      parameters: [
        {
          name: 'agentType',
          type: 'string',
          required: true,
          description: 'The agent type to delegate to',
        },
        {
          name: 'task',
          type: 'string',
          required: true,
          description: 'The task to execute',
        },
        {
          name: 'input',
          type: 'object',
          required: false,
          description: 'Additional input parameters',
        },
      ],
      execute: async (params, context) => {
        return await this.delegateToAgent(
          params.agentType,
          params.task,
          params.input,
          context,
        );
      },
      requiresApiCall: false,
      cost: 0,
    });

    this.registerTool({
      name: 'get_memory',
      description: 'Retrieve relevant memories for context',
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'Query to search for',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Maximum number of memories',
        },
      ],
      execute: async (params, context) => {
        return await MemoryManager.retrieveRelevantMemories(
          context.userId,
          params.query,
          params.limit || 5,
        );
      },
      requiresApiCall: true,
      cost: 0.5,
    });

    this.registerTool({
      name: 'store_memory',
      description: 'Store important information in long-term memory',
      parameters: [
        {
          name: 'content',
          type: 'string',
          required: true,
          description: 'Content to store',
        },
        {
          name: 'importance',
          type: 'number',
          required: false,
          description: 'Importance level (0-1)',
        },
      ],
      execute: async (params, context) => {
        return await MemoryManager.storeLongTerm(
          context.userId,
          params.content,
          params.importance || 0.7,
          { source: 'orchestrator' },
        );
      },
      requiresApiCall: false,
      cost: 0,
    });
  }

  // ============================================
  // Delegate to a specialized agent
  // ============================================

  private async delegateToAgent(
    agentTypeStr: string,
    task: string,
    input: any,
    context: AgentContext,
  ): Promise<any> {
    const agentType = this.mapToAgentType(agentTypeStr);
    const agent = agentRegistry.getAgent(agentType);

    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }

    // ENHANCEMENT: Use circuit breaker
    return await this.executeWithCircuitBreaker(agentTypeStr, async () => {
      const request: AgentRequest = {
        id: uuidv4(),
        userId: context.userId,
        sessionId: context.sessionId,
        input: {
          type: 'task',
          data: { task, ...input },
        },
        context,
      };

      const response = await agent.execute(request, context);

      if (!response.success) {
        throw new Error(response.error || `Agent ${agentType} execution failed`);
      }

      return response.output;
    });
  }

  // ============================================
  // Map string to AgentType
  // ============================================

  private mapToAgentType(agentTypeStr: string): AgentType {
    const mapping: Record<string, AgentType> = {
      EMAIL: AgentType.EMAIL,
      DRIVE: AgentType.DRIVE,
      CONTENT: AgentType.CONTENT,
      SOCIAL: AgentType.SOCIAL,
      CALENDAR: AgentType.CALENDAR,
      WEB: AgentType.WEB,
      TASK: AgentType.TASK,
      ORCHESTRATOR: AgentType.ORCHESTRATOR,
    };
    return mapping[agentTypeStr.toUpperCase()] || AgentType.ORCHESTRATOR;
  }

  // ============================================
  // Main Execution (State Machine)
  // ============================================

  protected async doExecute(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<any> {
    // ENHANCEMENT: Concurrency control
    const slotAcquired = await this.acquireExecutionSlot();
    if (!slotAcquired) {
      return {
        message:
          'The system is currently at capacity. Please try again in a moment.',
        data: null,
        executionSummary: {
          status: 'rejected',
          reason: 'backpressure',
          totalTimeMs: 0,
        },
      };
    }

    this.state.startTime = Date.now();
    this.state.currentState = OrchestratorStateType.INTENT_PARSE;
    this.state.error = null;
    this.state.executionId = uuidv4();

    // Set execution timeout
    this.executionTimeoutId = setTimeout(() => {
      logger.error({ executionId: this.state.executionId }, 'Execution timeout');
      this.state.error = 'Execution timed out';
      this.state.currentState = OrchestratorStateType.ERROR;
    }, EXECUTION_TIMEOUT_MS);

    try {
      // STEP 1: INTENT_PARSE
      await this.intentParse(request, context);

      // STEP 2: PLAN with cost check
      await this.plan(request, context);

      // ENHANCEMENT: Pre-execution cost check
      const costCheck = await this.preExecutionCostCheck(
        request.userId,
        this.state.plan?.estimatedCostUsd || 0,
        this.state.plan?.estimatedTokens || 0,
      );

      if (costCheck.reason) {
        logger.info({ userId: request.userId, reason: costCheck.reason }, 'Cost warning for execution');
      }

      // STEP 3: EXECUTE with branching
      await this.execute(request, context);

      // STEP 4: REFLECT
      await this.reflect(request, context);

      // STEP 5: RESPOND
      const response = await this.respond(request, context);

      // Track usage
      await UsageMeteringService.incrementUsage(
        request.userId,
        ActionType.AI_ORCHESTRATOR,
        this.state.totalTokensUsed,
      );

      this.state.currentState = OrchestratorStateType.IDLE;

      return response;
    } catch (error) {
      this.state.currentState = OrchestratorStateType.ERROR;
      this.state.error =
        error instanceof Error ? error.message : String(error);
      logger.error(
        { error, state: this.state.currentState },
        'Orchestrator execution failed',
      );

      // Return graceful error response
      return {
        message: `I encountered an issue while processing your request. ${this.state.error}. Please try again or rephrase your request.`,
        data: null,
        executionSummary: {
          totalTimeMs: Date.now() - this.state.startTime,
          totalSteps: this.state.executionResults.size,
          successfulSteps: 0,
          failedSteps: this.state.executionResults.size,
          totalTokensUsed: this.state.totalTokensUsed,
          totalCostUsd: this.state.totalCostUsd,
          error: this.state.error,
          status: 'failed',
        },
      };
    } finally {
      this.releaseExecutionSlot();
      if (this.executionTimeoutId) {
        clearTimeout(this.executionTimeoutId);
        this.executionTimeoutId = null;
      }
    }
  }

  // ============================================
  // STEP 1: INTENT_PARSE
  // ============================================

  private async intentParse(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<void> {
    const inputText =
      typeof request.input === 'string'
        ? request.input
        : JSON.stringify(request.input);

    const shortTermMemories = await MemoryManager.getShortTerm(
      request.userId,
      10,
    );
    const sessionMemories = await MemoryManager.getSessionMemories(
      request.sessionId || '',
      10,
    );

    this.state.injectedMemories = [...shortTermMemories, ...sessionMemories];

    let enhancedInput = inputText;
    if (this.state.injectedMemories.length > 0) {
      const memoryContext = this.state.injectedMemories
        .map((m) => m.content)
        .slice(-5)
        .join('\n');
      enhancedInput = `Previous context:\n${memoryContext}\n\nCurrent request:\n${inputText}`;
    }

    const intent = await IntentClassifier.classify(enhancedInput);

    if (intent.confidence < 0.3) {
      logger.warn(
        {
          userId: request.userId,
          intent: intent.primaryIntent,
          confidence: intent.confidence,
        },
        'Low confidence intent classification',
      );
      intent.suggestedAgent = AgentType.ORCHESTRATOR;
      intent.primaryIntent = 'general_assistance';
    }

    this.state.intent = intent;

    if (intent.confidence > 0.7) {
      await MemoryManager.storeShortTerm(request.userId, `Intent: ${intent.primaryIntent} (confidence: ${Math.round(intent.confidence * 100)}%)`, {
        type: 'intent',
        suggestedAgent: intent.suggestedAgent,
      });
    }
  }

  // ============================================
  // STEP 2: PLAN
  // ============================================

  private async plan(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<void> {
    if (!this.state.intent) {
      throw new Error('No intent available for planning');
    }

    const inputText =
      typeof request.input === 'string'
        ? request.input
        : JSON.stringify(request.input);
    const longTermMemories = await MemoryManager.retrieveRelevantMemories(
      request.userId,
      inputText,
      5,
      0.5,
    );

    this.state.injectedMemories = [
      ...this.state.injectedMemories,
      ...longTermMemories,
    ];

    const enhancedContext = {
      ...context,
      longTermMemories,
    };

    // ENHANCEMENT: Use task planner with fallback strategies
    const plan = await TaskPlanner.createPlan(
      this.state.intent,
      enhancedContext,
      {
        maxSteps: MAX_STEPS,
        enableParallelization: true,
        enableFallbacks: true,
        estimatedCost: true,
      },
    );

    // ENHANCEMENT: Add fallback strategies
    const planWithFallbacks: TaskPlan = {
      ...plan,
      steps: TaskPlanner.addFallbackStrategies(plan.steps),
    };

    const validation = TaskPlanner.validatePlan(planWithFallbacks);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors }, 'Plan validation warnings');
      if (planWithFallbacks.steps.length === 0) {
        planWithFallbacks.steps = [
          {
            id: `step_${Date.now()}`,
            agentType: this.state.intent.suggestedAgent,
            action: 'execute',
            input: {
              intent: this.state.intent.primaryIntent,
              entities: this.state.intent.entities,
            },
            dependsOn: [],
          },
        ];
      }
    }

    this.state.plan = planWithFallbacks;

    logger.info(
      {
        planId: planWithFallbacks.id,
        steps: planWithFallbacks.steps.length,
        mode: planWithFallbacks.mode,
        estimatedTokens: planWithFallbacks.estimatedTokens,
        estimatedCost: planWithFallbacks.estimatedCostUsd,
      },
      'Execution plan created',
    );
  }

  // ============================================
  // STEP 3: EXECUTE with Branching
  // ============================================

  async execute(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<void> {
    if (!this.state.plan) {
      throw new Error('No plan available for execution');
    }

    const executionResult = await this.executePlanWithBranching(
      request,
      context,
    );

    for (const step of executionResult.steps) {
      this.state.executionResults.set(step.stepId, step);
      if (step.success) {
        this.state.completedSteps.add(step.stepId);
      }
    }

    this.state.finalOutput = executionResult.finalOutput;
    this.state.totalTokensUsed = executionResult.totalTokensUsed;
    this.state.totalCostUsd = executionResult.totalCostUsd;

    // ENHANCEMENT: Persist state after execution
    await this.saveExecutionState();

    if (
      !executionResult.success &&
      this.state.retryCount < MAX_PLAN_RETRIES
    ) {
      logger.warn(
        {
          planId: this.state.plan.id,
          retryCount: this.state.retryCount,
          error: executionResult.error,
        },
        'Plan execution partially failed, will retry',
      );

      this.state.retryCount++;

      if (this.state.intent) {
        // ENHANCEMENT: Only retry failed steps, not completed ones
        const retryPlan = await TaskPlanner.createPlan(
          this.state.intent,
          context,
          {
            maxSteps: MAX_STEPS,
            enableParallelization: false,
            enableFallbacks: true,
          },
        );

        this.state.plan = retryPlan;

        const retryResult = await this.executePlanWithBranching(
          request,
          context,
        );
        for (const step of retryResult.steps) {
          this.state.executionResults.set(step.stepId, step);
          if (step.success) {
            this.state.completedSteps.add(step.stepId);
          }
        }
        this.state.finalOutput = retryResult.finalOutput;
        this.state.totalTokensUsed += retryResult.totalTokensUsed;
        this.state.totalCostUsd += retryResult.totalCostUsd;

        // Persist after retry
        await this.saveExecutionState();
      }
    }
  }

  // ============================================
  // ENHANCEMENT 6: Execute Plan with Branching
  // ============================================

  private async executePlanWithBranching(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<ChainExecutionResult> {
    const startTime = Date.now();
    const stepResults: StepExecutionResult[] = [];
    const stepOutputs: Map<string, any> = new Map();

    if (!this.state.plan) {
      throw new Error('No plan to execute');
    }

    // Restore completed steps from previous execution
    for (const stepId of this.state.completedSteps) {
      const existingResult = this.state.executionResults.get(stepId);
      if (existingResult) {
        stepResults.push(existingResult);
        if (existingResult.success && existingResult.output) {
          stepOutputs.set(stepId, existingResult.output);
        }
      }
    }

    const steps = this.state.plan.steps;

    if (
      this.state.plan.mode === ExecutionMode.SEQUENTIAL ||
      steps.length <= 1
    ) {
      // ENHANCEMENT: Sequential with branching
      for (const step of steps) {
        // Skip already completed steps
        if (this.state.completedSteps.has(step.id)) {
          continue;
        }

        const result = await this.executeStepWithRetry(
          step,
          stepOutputs,
          request,
          context,
        );
        stepResults.push(result);

        if (result.success && result.output) {
          stepOutputs.set(step.id, result.output);
        }

        // ENHANCEMENT: Handle step failure based on strategy
        if (!result.success) {
          const failureStrategy = (step as any).onFailure || 'fail_plan';

          switch (failureStrategy) {
            case 'skip':
              logger.info({ stepId: step.id }, 'Skipping failed step');
              continue;
            case 'fail_plan':
              logger.warn(
                { stepId: step.id, error: result.error },
                'Step failed, stopping plan',
              );
              break;
            case 'fallback_agent':
              if (step.fallback) {
                logger.info(
                  { stepId: step.id, fallback: step.fallback.agentType },
                  'Executing fallback step',
                );
                try {
                  const fallbackResult = await this.executeStepWithRetry(
                    step.fallback as any,
                    stepOutputs,
                    request,
                    context,
                  );
                  stepResults.push(fallbackResult);
                  if (fallbackResult.success && fallbackResult.output) {
                    stepOutputs.set(step.id, fallbackResult.output);
                  }
                } catch (fallbackError) {
                  logger.error(
                    { fallbackError, stepId: step.id },
                    'Fallback execution failed',
                  );
                }
              }
              break;
          }
        }
      }
    } else {
      // Parallel execution
      const groups = this.groupStepsByParallel(steps);
      for (const group of groups) {
        const groupResults = await Promise.all(
          group.map((step) =>
            this.state.completedSteps.has(step.id)
              ? Promise.resolve(
                  this.state.executionResults.get(step.id)!,
                )
              : this.executeStepWithRetry(
                  step,
                  stepOutputs,
                  request,
                  context,
                ),
          ),
        );
        stepResults.push(...groupResults);
        groupResults.forEach((result, idx) => {
          if (result.success && result.output) {
            stepOutputs.set(group[idx].id, result.output);
          }
        });
      }
    }

    const finalOutput =
      stepResults[stepResults.length - 1]?.output || null;
    const allSuccessful = stepResults.every((r) => r.success);

    return {
      planId: this.state.plan.id,
      steps: stepResults,
      finalOutput,
      totalTimeMs: Date.now() - startTime,
      totalTokensUsed: stepResults.reduce(
        (sum, r) => sum + r.tokensUsed,
        0,
      ),
      totalCostUsd: stepResults.reduce((sum, r) => sum + r.costUsd, 0),
      success: allSuccessful,
      error: allSuccessful
        ? undefined
        : stepResults.find((r) => !r.success)?.error,
      executionMode: this.state.plan.mode,
      successfulSteps: stepResults.filter((r) => r.success).length,
      failedSteps: stepResults.filter((r) => !r.success).length,
      skippedSteps: 0,
      fallbackSteps: [],
      startedAt: new Date(this.state.startTime),
      completedAt: new Date(),
    };
  }

  // ============================================
  // ENHANCEMENT 7: Execute Step with Retry
  // ============================================

  private async executeStepWithRetry(
    step: any,
    previousOutputs: Map<string, any>,
    request: AgentRequest,
    context: AgentContext,
  ): Promise<StepExecutionResult> {
    const maxRetries = step.maxRetries || step.retryCount || MAX_RETRIES_PER_STEP;
    let lastError: Error | null = null;
    let totalTokens = 0;
    let totalCost = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const resolvedInput = this.resolveInput(
          step.input,
          previousOutputs,
        );
        const agent = agentRegistry.getAgent(step.agentType);

        if (!agent) {
          throw new Error(`Agent ${step.agentType} not found`);
        }

        const subRequest: AgentRequest = {
          id: `${request.id}_${step.id}_${attempt}`,
          userId: request.userId,
          sessionId: request.sessionId,
          input: {
            type: step.action,
            data: resolvedInput,
          },
          context,
        };

        // ENHANCEMENT: Use circuit breaker
        const response = await this.executeWithCircuitBreaker(
          step.agentType,
          async () => agent.execute(subRequest, context),
        );

        const executionTime = Date.now() - startTime;
        totalTokens += response.metadata.tokensUsed || 0;
        totalCost += response.metadata.costUsd || 0;

        // ENHANCEMENT: Validate agent output contract
        const contract = this.validateAgentOutput(response, step.id);

        if (contract.status === 'success' || contract.status === 'partial_success') {
          return {
            stepId: step.id,
            agentType: step.agentType,
            success: contract.status === 'success',
            output: contract.data,
            error: contract.errors?.map((e) => e.message).join('; '),
            executionTimeMs: executionTime,
            tokensUsed: totalTokens,
            costUsd: totalCost,
            retryCount: attempt,
            status: contract.status === 'success' ? 'completed' : 'failed',
            startedAt: new Date(startTime),
            completedAt: new Date(),
          };
        }

        // Contract says failed — throw to trigger retry
        throw new Error(
          contract.errors?.[0]?.message || 'Agent execution failed',
        );
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = Math.min(
            RETRY_BASE_DELAY_MS * Math.pow(2, attempt),
            RETRY_MAX_DELAY_MS,
          );
          logger.warn(
            {
              stepId: step.id,
              agentType: step.agentType,
              retry: attempt + 1,
              maxRetries,
              delay,
              error: lastError.message,
            },
            'Step execution failed, retrying with backoff',
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    return {
      stepId: step.id,
      agentType: step.agentType,
      success: false,
      output: null,
      error: lastError?.message || 'Step execution failed after retries',
      executionTimeMs: 0,
      tokensUsed: totalTokens,
      costUsd: totalCost,
      retryCount: maxRetries,
      status: 'failed',
      startedAt: new Date(),
      completedAt: new Date(),
    };
  }

  // ============================================
  // Group steps for parallel execution
  // ============================================

  private groupStepsByParallel(steps: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set<string>();

    for (const step of steps) {
      if (processed.has(step.id)) continue;

      const group: any[] = [step];
      processed.add(step.id);

      for (const other of steps) {
        if (
          !processed.has(other.id) &&
          other.parallelGroup === step.parallelGroup
        ) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  // ============================================
  // Resolve input dependencies
  // ============================================

  private resolveInput(
    input: any,
    previousOutputs: Map<string, any>,
  ): any {
    if (typeof input === 'string' && input.startsWith('$')) {
      const key = input.substring(1);
      return previousOutputs.get(key) || input;
    }

    if (
      typeof input === 'object' &&
      input !== null &&
      !Array.isArray(input)
    ) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(input)) {
        resolved[key] = this.resolveInput(value, previousOutputs);
      }
      return resolved;
    }

    return input;
  }

  // ============================================
  // STEP 4: REFLECT
  // ============================================

  private async reflect(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<void> {
    const results = Array.from(
      this.state.executionResults.values(),
    );
    const successfulSteps = results.filter((r) => r.success);
    const failedSteps = results.filter((r) => !r.success);

    let reflectionNotes = `Execution completed. Successful: ${successfulSteps.length}, Failed: ${failedSteps.length}. `;

    if (failedSteps.length > 0) {
      reflectionNotes += `Failed steps: ${failedSteps
        .map((s) => s.stepId)
        .join(', ')}. `;
      reflectionNotes += `Errors: ${failedSteps
        .map((s) => s.error)
        .join('; ')}. `;
    }

    await MemoryManager.storeShortTerm(request.userId, reflectionNotes, {
      type: 'reflection',
      successfulSteps: successfulSteps.length,
      failedSteps: failedSteps.length,
    });

    if (failedSteps.length > 0 && this.state.finalOutput) {
      const refinementPrompt = `
The execution encountered some issues. Please refine the response.

Original Request: ${
        typeof request.input === 'string'
          ? request.input
          : JSON.stringify(request.input)
      }
Successful outputs: ${JSON.stringify(
        successfulSteps
          .map((s) => s.output)
          .filter(Boolean)
          .slice(0, 3),
      )}
Errors: ${failedSteps.map((s) => s.error).join('; ')}

Please provide a helpful response explaining what was accomplished and what couldn't be done.
`;

      try {
        const refined = await this.callAIWithFallback(refinementPrompt);
        this.state.finalOutput = {
          ...(this.state.finalOutput || {}),
          partialSuccess: successfulSteps.length > 0,
          errors: failedSteps.map((s) => ({
            step: s.stepId,
            error: s.error,
          })),
          suggestion: refined,
          status: successfulSteps.length > 0 ? 'partial_success' : 'failed',
        };
      } catch (error) {
        logger.error({ error }, 'Refinement failed');
      }
    }
  }

  // ============================================
  // STEP 5: RESPOND
  // ============================================

  private async respond(
    request: AgentRequest,
    context: AgentContext,
  ): Promise<any> {
    const executionTime = Date.now() - this.state.startTime;

    const responsePrompt = `
Based on the execution results, generate a natural response to the user.

Original Request: ${
      typeof request.input === 'string'
        ? request.input
        : JSON.stringify(request.input)
    }
Execution Output: ${JSON.stringify(this.state.finalOutput, null, 2).substring(0, 2000)}

Provide a friendly, concise response summarizing the results.
${this.state.error ? `Note: There was an issue: ${this.state.error}` : ''}
`;

    let responseMessage = '';

    try {
      responseMessage = await this.callAIWithFallback(responsePrompt);
    } catch (error) {
      responseMessage =
        this.state.finalOutput?.message ||
        (this.state.error
          ? `Execution encountered issues: ${this.state.error}`
          : 'Task completed successfully');
    }

    await MemoryManager.storeShortTerm(
      request.userId,
      `Response: ${responseMessage.substring(0, 300)}`,
      { type: 'response', success: !this.state.error },
    );

    // ENHANCEMENT: Determine final status
    const results = Array.from(this.state.executionResults.values());
    const completedCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    const totalCount = results.length;

    let finalStatus = 'success';
    if (failedCount > 0 && completedCount > 0) finalStatus = 'partial_success';
    else if (failedCount === totalCount) finalStatus = 'failed';

    return {
      message: responseMessage,
      data: this.state.finalOutput,
      executionSummary: {
        totalTimeMs: executionTime,
        totalSteps: totalCount,
        successfulSteps: completedCount,
        failedSteps: failedCount,
        totalTokensUsed: this.state.totalTokensUsed,
        totalCostUsd: this.state.totalCostUsd,
        intent: this.state.intent?.primaryIntent,
        suggestedAgent: this.state.intent?.suggestedAgent,
        status: finalStatus,
      },
    };
  }

  // ============================================
  // Call AI with model fallback chain
  // ============================================

  private async callAIWithFallback(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.modelProviders.length; i++) {
      const provider = this.modelProviders[i];

      try {
        let response: string;

        switch (provider) {
          case 'openai':
            const openaiResult = await OpenAIService.complete({
              prompt,
              temperature: 0.7,
              maxTokens: 1000,
            });
            response = openaiResult.content;
            break;

          case 'anthropic':
            try {
              const { AnthropicService } = await import(
                '../../services/ai/anthropic.service'
              );
              const anthropicResult = await AnthropicService.complete({
                prompt,
                temperature: 0.7,
                maxTokens: 1000,
              });
              response = anthropicResult.content;
            } catch {
              logger.warn(
                'Anthropic not configured, falling back to OpenAI',
              );
              const fallbackResult = await OpenAIService.complete({
                prompt,
                temperature: 0.7,
                maxTokens: 1000,
              });
              response = fallbackResult.content;
            }
            break;

          case 'google':
            try {
              const { GeminiService } = await import(
                '../../services/ai/gemini.service'
              );
              const geminiResult = await GeminiService.complete({
                prompt,
                temperature: 0.7,
                maxTokens: 1000,
              });
              response = geminiResult.content;
            } catch {
              logger.warn(
                'Gemini not configured, falling back to OpenAI',
              );
              const geminiFallback = await OpenAIService.complete({
                prompt,
                temperature: 0.7,
                maxTokens: 1000,
              });
              response = geminiFallback.content;
            }
            break;

          default:
            throw new Error(`Unknown provider: ${provider}`);
        }

        return response;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        logger.warn(
          { provider, error: lastError.message },
          'AI provider failed, trying next',
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  // ============================================
  // Public APIs
  // ============================================

  /**
   * Get circuit breaker status for all agents (for monitoring)
   */
  static getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    for (const [agentType, breaker] of agentCircuitBreakers.entries()) {
      status[agentType] = { ...breaker };
    }
    return status;
  }

  /**
   * Reset all circuit breakers (for admin/debugging)
   */
  static resetAllCircuitBreakers(): void {
    agentCircuitBreakers.clear();
    logger.info('All circuit breakers reset');
  }

  /**
   * Reset circuit breaker for specific agent
   */
  static resetCircuitBreaker(agentType: string): void {
    agentCircuitBreakers.delete(agentType);
    logger.info({ agentType }, 'Circuit breaker reset');
  }

  /**
   * Get current active executions count
   */
  static getActiveExecutionsCount(): number {
    return activeExecutions;
  }

  /**
   * Load and resume a previously failed execution
   */
  async resumeExecution(executionId: string, context: AgentContext): Promise<any> {
    const savedState = await this.loadExecutionState(executionId);

    if (!savedState) {
      throw new Error(`No saved execution state found for ${executionId}`);
    }

    if (savedState.overallStatus === 'completed') {
      return { message: 'Execution already completed', status: 'already_completed' };
    }

    // Restore completed steps
    for (const stepState of savedState.stepStates) {
      if (stepState.status === 'completed') {
        this.state.completedSteps.add(stepState.stepId);
      }
    }

    this.state.executionId = executionId;
    logger.info({ executionId, completedSteps: this.state.completedSteps.size }, 'Resuming execution');

    // Resume execution — will skip completed steps
    const request: AgentRequest = {
      id: `resume_${executionId}`,
      userId: context.userId,
      sessionId: context.sessionId,
      input: { type: 'resume', data: { executionId } },
      context,
    };

    return await this.doExecute(request, context);
  }

  // ============================================
  // Execute with streaming support
  // ============================================

  async executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      onChunk({
        type: 'thought',
        content: 'Analyzing your request...',
        timestamp: new Date(),
      });

      onChunk({
        type: 'thought',
        content: 'Understanding intent...',
        timestamp: new Date(),
      });

      const result = await this.doExecute(request, context);

      onChunk({
        type: 'output',
        content: result.message || JSON.stringify(result),
        timestamp: new Date(),
      });

      return {
        id: `exec_${Date.now()}`,
        success: true,
        output: result,
        metadata: {
          agentType: AgentType.ORCHESTRATOR,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: this.state.totalTokensUsed,
          costUsd: this.state.totalCostUsd,
          retryCount: this.state.retryCount,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      onChunk({
        type: 'error',
        content:
          error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date(),
      });

      return {
        id: `exec_${Date.now()}`,
        success: false,
        output: null,
        error:
          error instanceof Error ? error.message : 'Execution failed',
        metadata: {
          agentType: AgentType.ORCHESTRATOR,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    }
  }
}