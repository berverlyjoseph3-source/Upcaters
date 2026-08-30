// enterprise-ai-agent-platform/apps/api/src/queues/orchestrator-execution.queue.ts
import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import Redis, { Redis as RedisClient } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { agentRegistry } from '../agents/core/agent.registry';
import { IntentClassifier } from '../agents/orchestrator/intent-classifier';
import { TaskPlanner } from '../agents/orchestrator/task-planner';
import { MemoryManager } from '../agents/orchestrator/memory-manager';
import { OpenAIService } from '../services/ai/openai.service';
import { UsageMeteringService } from '../services/usage-metering.service';
import {
  OrchestratorStateType,
  IntentResult,
  TaskPlan,
  TaskPlanStep,
  ExecutionMode,
  ChainExecutionResult,
  StepExecutionResult,
  OrchestratorInternalState,
  ExecutionOptions,
  ExecutionProgress,
  AgentDelegationRequest,
  AgentDelegationResult,
} from '../agents/orchestrator/orchestrator.types';
import { AgentType, AgentRequest, AgentContext, AgentResponse } from '../types/agent.types';
import { ActionType } from '../types/usage.types';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';

// ============================================
// Redis Connection Setup
// ============================================

let redisConnection: RedisClient | null = null;

function getRedisConnection(): RedisClient {
  if (!redisConnection) {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ times, delay }, 'Redis connection retry orchestration queue');
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redisConnection.on('error', (error) => {
      logger.error({ error }, 'Redis connection error orchestration queue');
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connected for orchestration queue');
    });
  }

  return redisConnection;
}

// ============================================
// Queue Names & Configuration
// ============================================

export const ORCHESTRATOR_EXECUTION_QUEUE = 'orchestrator:execution';
export const ORCHESTRATOR_STEP_QUEUE = 'orchestrator:step';
export const ORCHESTRATOR_REFLECTION_QUEUE = 'orchestrator:reflection';
export const ORCHESTRATOR_MEMORY_QUEUE = 'orchestrator:memory';

// ============================================
// Queue Instances
// ============================================

/**
 * Main orchestrator execution queue
 * Handles the full state machine: INTENT_PARSE → PLAN → EXECUTE → REFLECT → RESPOND
 */
export const orchestratorExecutionQueue = new Queue(ORCHESTRATOR_EXECUTION_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      count: 500,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed — this was silently invalid/ignored). Enforce a 5-minute deadline in the worker itself if needed.
  },
});

/**
 * Individual step execution queue
 * Handles delegation to specialized agents
 */
export const orchestratorStepQueue = new Queue(ORCHESTRATOR_STEP_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 1800,
      count: 500,
    },
    removeOnFail: {
      age: 86400,
      count: 200,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed). Enforce a 1-minute per-step deadline in the worker itself if needed.
  },
});

/**
 * Reflection generation queue
 * Analyzes execution results and generates insights
 */
export const orchestratorReflectionQueue = new Queue(ORCHESTRATOR_REFLECTION_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      age: 7200,
      count: 500,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed).
  },
});

/**
 * Memory operations queue
 * Handles memory storage and consolidation
 */
export const orchestratorMemoryQueue = new Queue(ORCHESTRATOR_MEMORY_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,
      count: 200,
    },
    // NOTE: BullMQ's DefaultJobOptions has no 'timeout' field (removed).
  },
});

// ============================================
// Flow Producer for Complex Pipelines
// ============================================

const flowProducer = new FlowProducer({
  connection: getRedisConnection(),
});

// ============================================
// Job Data Types
// ============================================

export interface OrchestratorExecutionJobData {
  /** Unique execution ID */
  executionId: string;
  /** User ID who initiated the execution */
  userId: string;
  /** Session ID for context tracking */
  sessionId?: string;
  /** Original user input */
  input: string;
  /** Current orchestrator state */
  currentState: OrchestratorStateType;
  /** Pre-classified intent (if already classified) */
  preClassifiedIntent?: IntentResult;
  /** Pre-created plan (if already planned) */
  preCreatedPlan?: TaskPlan;
  /** Execution options */
  options?: {
    maxSteps?: number;
    maxRetries: number;
    enableFallbacks: boolean;
    enableParallelization: boolean;
    stopOnError: boolean;
    timeout: number;
    priority: number;
    modelFallbackChain: string[];
  };
  /** Notification preferences */
  notifications?: {
    notifyOnComplete: boolean;
    notifyOnError: boolean;
    webhookUrl?: string;
  };
  /** Metadata for tracking */
  metadata?: Record<string, any>;
}

export interface StepExecutionJobData {
  /** Parent execution ID */
  executionId: string;
  /** Plan ID */
  planId: string;
  /** Step to execute */
  step: TaskPlanStep;
  /** User ID */
  userId: string;
  /** Session ID */
  sessionId?: string;
  /** Previous step outputs (for dependency resolution) */
  previousOutputs?: Record<string, any>;
  /** Execution context */
  context: Partial<AgentContext>;
  /** Retry information */
  retryInfo?: {
    attempt: number;
    maxRetries: number;
    previousError?: string;
  };
}

export interface ReflectionJobData {
  /** Execution ID to reflect on */
  executionId: string;
  /** User ID */
  userId: string;
  /** Execution results */
  executionResults: ChainExecutionResult;
  /** Original user request */
  originalRequest?: string;
  /** Whether to store insights in memory */
  storeInsights: boolean;
  /** Whether to notify user */
  notifyUser: boolean;
}

export interface MemoryJobData {
  /** Operation type */
  operation: 'store' | 'consolidate' | 'cleanup' | 'retrieve';
  /** User ID */
  userId: string;
  /** Content to store */
  content?: string;
  /** Memory type */
  memoryType?: 'short_term' | 'long_term' | 'episodic' | 'semantic';
  /** Importance score */
  importance?: number;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Query for retrieval */
  query?: string;
  /** Limit for retrieval */
  limit?: number;
  /** Session ID */
  sessionId?: string;
}

// ============================================
// Execution State Manager
// ============================================

class OrchestratorExecutionState {
  private redis: RedisClient;
  private readonly STATE_PREFIX = 'orchestrator:state:';
  private readonly PROGRESS_PREFIX = 'orchestrator:progress:';
  private readonly LOCK_PREFIX = 'orchestrator:lock:';
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  async getState(executionId: string): Promise<OrchestratorInternalState | null> {
    const stateStr = await this.redis.get(`${this.STATE_PREFIX}${executionId}`);
    if (!stateStr) return null;
    try {
      return JSON.parse(stateStr);
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to parse orchestrator state');
      return null;
    }
  }

  async setState(executionId: string, state: OrchestratorInternalState): Promise<void> {
    await this.redis.setex(
      `${this.STATE_PREFIX}${executionId}`,
      this.DEFAULT_TTL,
      JSON.stringify(state)
    );
  }

  async updateState(executionId: string, updates: Partial<OrchestratorInternalState>): Promise<void> {
    const current = await this.getState(executionId);
    if (!current) {
      logger.warn({ executionId }, 'No existing state found for update, creating new');
      await this.setState(executionId, updates as OrchestratorInternalState);
      return;
    }
    await this.setState(executionId, { ...current, ...updates });
  }

  async setProgress(executionId: string, progress: ExecutionProgress): Promise<void> {
    await this.redis.setex(
      `${this.PROGRESS_PREFIX}${executionId}`,
      600,
      JSON.stringify(progress)
    );
  }

  async getProgress(executionId: string): Promise<ExecutionProgress | null> {
    const progressStr = await this.redis.get(`${this.PROGRESS_PREFIX}${executionId}`);
    if (!progressStr) return null;
    try {
      return JSON.parse(progressStr);
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to parse execution progress');
      return null;
    }
  }

  async acquireLock(executionId: string, ttlMs: number = 30000): Promise<boolean> {
    const key = `${this.LOCK_PREFIX}${executionId}`;
    const token = uuidv4();
    const acquired = await this.redis.set(key, token, 'PX', ttlMs, 'NX');
    return acquired === 'OK';
  }

  async releaseLock(executionId: string): Promise<void> {
    await this.redis.del(`${this.LOCK_PREFIX}${executionId}`);
  }

  async deleteState(executionId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${this.STATE_PREFIX}${executionId}`),
      this.redis.del(`${this.PROGRESS_PREFIX}${executionId}`),
      this.redis.del(`${this.LOCK_PREFIX}${executionId}`),
    ]);
  }
}

const executionState = new OrchestratorExecutionState(getRedisConnection());

// ============================================
// Helper: Step Dependency Resolution
// ============================================

function resolveStepDependencies(
  step: TaskPlanStep,
  previousOutputs: Record<string, any>
): any {
  let resolvedInput = { ...(step.input || {}) };

  if (step.dependsOn && step.dependsOn.length > 0) {
    for (const depId of step.dependsOn) {
      if (previousOutputs[depId] !== undefined) {
        resolvedInput[`from_${depId}`] = previousOutputs[depId];
      }
    }
  }

  // Resolve template variables in input
  resolvedInput = resolveTemplateVariables(resolvedInput, previousOutputs);

  return resolvedInput;
}

function resolveTemplateVariables(
  input: any,
  outputs: Record<string, any>
): any {
  if (typeof input === 'string') {
    return input.replace(/\$\{([^}]+)\}/g, (_, path) => {
      const value = getNestedValue(outputs, path);
      return value !== undefined ? String(value) : `\${${path}}`;
    });
  }

  if (Array.isArray(input)) {
    return input.map(item => resolveTemplateVariables(item, outputs));
  }

  if (typeof input === 'object' && input !== null) {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      resolved[key] = resolveTemplateVariables(value, outputs);
    }
    return resolved;
  }

  return input;
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

// ============================================
// Helper: Group Steps for Parallel Execution
// ============================================

function groupStepsByDependencies(steps: TaskPlanStep[]): TaskPlanStep[][] {
  const groups: TaskPlanStep[][] = [];
  const completed = new Set<string>();
  const stepMap = new Map(steps.map(s => [s.id, s]));

  // First pass: collect all step IDs
  const stepIds = new Set(steps.map(s => s.id));

  // Sort steps by number of dependencies (fewer dependencies first)
  const sortedSteps = [...steps].sort(
    (a, b) => (a.dependsOn?.length || 0) - (b.dependsOn?.length || 0)
  );

  let processedCount = 0;
  const maxIterations = steps.length * 2;

  while (processedCount < sortedSteps.length && maxIterations > 0) {
    const group: TaskPlanStep[] = [];

    for (const step of sortedSteps) {
      if (completed.has(step.id)) continue;

      const allDepsMet = (step.dependsOn || []).every(depId => {
        // If dependency doesn't exist in steps, consider it met
        if (!stepIds.has(depId)) return true;
        // Otherwise, it must be completed
        return completed.has(depId);
      });

      if (allDepsMet) {
        group.push(step);
        completed.add(step.id);
        processedCount++;
      }
    }

    if (group.length > 0) {
      groups.push(group);
    }

    // Prevent infinite loop
    if (group.length === 0) break;
  }

  return groups;
}

// ============================================
// Helper: Agent Delegation
// ============================================

async function delegateToAgent(
  agentType: AgentType,
  userId: string,
  sessionId: string | undefined,
  input: any,
  context: Partial<AgentContext>,
  timeout: number = 30000
): Promise<AgentDelegationResult> {
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    try {
      const agent = agentRegistry.getAgent(agentType);
      if (!agent) {
        throw new Error(`Agent ${agentType} not found in registry`);
      }

      const request: AgentRequest = {
        id: uuidv4(),
        userId,
        sessionId,
        input: {
          type: 'task',
          data: input,
        },
        priority: 1,
        timeout,
        context: context as AgentContext,
      };

      const responseWithTimeout = await Promise.race([
        agent.execute(request, context as AgentContext),
        new Promise<AgentResponse>((_, reject) =>
          setTimeout(() => reject(new Error(`Agent ${agentType} execution timeout`)), timeout)
        ),
      ]);

      const executionTimeMs = Date.now() - startTime;

      // Track usage
      try {
        await UsageMeteringService.incrementUsage(
          userId,
          ActionType.AI_ORCHESTRATOR,
          responseWithTimeout.metadata.tokensUsed || 0
        );
      } catch (usageError) {
        logger.warn({ usageError, userId, agentType }, 'Failed to track usage');
      }

      return {
        success: responseWithTimeout.success,
        output: responseWithTimeout.output,
        error: responseWithTimeout.error,
        agentType,
        executionTimeMs,
        tokensUsed: responseWithTimeout.metadata.tokensUsed || 0,
        costUsd: responseWithTimeout.metadata.costUsd || 0,
        retryCount,
        metadata: responseWithTimeout.metadata,
      };
    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.warn({
        error: errorMessage,
        agentType,
        userId,
        retry: retryCount,
        maxRetries,
      }, 'Agent delegation failed, retrying');

      if (retryCount > maxRetries) {
        return {
          success: false,
          output: null,
          error: errorMessage,
          agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount,
        };
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
    }
  }

  return {
    success: false,
    output: null,
    error: 'Max retries exceeded',
    agentType,
    executionTimeMs: Date.now() - startTime,
    tokensUsed: 0,
    costUsd: 0,
    retryCount,
  };
}

// ============================================
// Helper: Intent Classification
// ============================================

async function classifyUserIntent(
  input: string,
  userId: string,
  sessionId?: string
): Promise<IntentResult> {
  try {
    // Enhance input with memory context
    const memoryContext = await MemoryManager.buildContext(
      userId,
      sessionId || '',
      input,
      true,
      true,
      5
    );

    const enhancedInput = memoryContext
      ? `${memoryContext}\n\nCurrent request: ${input}`
      : input;

    const intent = await IntentClassifier.classify(enhancedInput);

    // Store intent in memory for future context
    if (intent.confidence > 0.5) {
      await MemoryManager.storeShortTerm(
        userId,
        `Intent classified: ${intent.primaryIntent} (confidence: ${Math.round(intent.confidence * 100)}%)`,
        {
          type: 'intent',
          sessionId,
          intent: intent.primaryIntent,
          confidence: intent.confidence,
          suggestedAgent: intent.suggestedAgent,
        }
      );
    }

    logger.info({
      userId,
      intent: intent.primaryIntent,
      confidence: Math.round(intent.confidence * 100),
      suggestedAgent: intent.suggestedAgent,
      requiresMultipleAgents: intent.requiresMultipleAgents,
    }, 'Intent classified');

    return intent;
  } catch (error) {
    logger.error({ error, userId, input }, 'Intent classification failed');
    
    // Return fallback intent
    return {
      primaryIntent: 'general_assistance',
      confidence: 0.5,
      alternativeIntents: [],
      entities: {},
      suggestedAgent: AgentType.ORCHESTRATOR,
      requiresMultipleAgents: false,
      classificationMethod: 'fallback',
    };
  }
}

// ============================================
// Helper: Plan Creation
// ============================================

async function createExecutionPlan(
  intent: IntentResult,
  userId: string,
  sessionId?: string,
  options?: {
    maxSteps?: number;
    enableParallelization?: boolean;
    enableFallbacks?: boolean;
    estimatedCost?: boolean;
  }
): Promise<TaskPlan> {
  try {
    const plan = await TaskPlanner.createPlan(intent, {
      userId,
      sessionId,
    } as any, {
      maxSteps: options?.maxSteps || 10,
      enableParallelization: options?.enableParallelization !== false,
      enableFallbacks: options?.enableFallbacks !== false,
      estimatedCost: options?.estimatedCost !== false,
    });

    // Validate plan
    const validation = TaskPlanner.validatePlan(plan);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, planId: plan.id }, 'Plan validation failed');
      // Attempt to fix plan if needed
      if (plan.steps.length === 0) {
        plan.steps = [{
          id: `step_${Date.now()}`,
          agentType: intent.suggestedAgent,
          action: 'execute',
          input: { intent: intent.primaryIntent, entities: intent.entities },
          dependsOn: [],
        }];
      }
    }

    logger.info({
      planId: plan.id,
      steps: plan.steps.length,
      mode: plan.mode,
      estimatedTokens: plan.estimatedTokens,
      estimatedCost: plan.estimatedTokens,
    }, 'Execution plan created');

    return plan;
  } catch (error) {
    logger.error({ error, userId }, 'Plan creation failed');
    
    // Return simple plan
    return {
      id: uuidv4(),
      steps: [{
        id: `step_${Date.now()}`,
        agentType: intent.suggestedAgent,
        action: 'execute',
        input: { intent: intent.primaryIntent, entities: intent.entities },
        dependsOn: [],
      }],
      mode: ExecutionMode.SEQUENTIAL,
      estimatedTokens: 500,
      estimatedCostUsd: 0.001,
      createdAt: new Date(),
    };
  }
}

// ============================================
// Main Orchestration Worker
// ============================================

/**
 * Primary worker that processes full orchestration jobs
 * Implements the state machine: IDLE → INTENT_PARSE → PLAN → EXECUTE → REFLECT → RESPOND → IDLE
 */
export const orchestratorExecutionWorker = new Worker(
  ORCHESTRATOR_EXECUTION_QUEUE,
  async (job: Job<OrchestratorExecutionJobData>) => {
    const {
      executionId,
      userId,
      sessionId,
      input,
      preClassifiedIntent,
      preCreatedPlan,
      options,
      notifications,
    } = job.data;

    const startTime = Date.now();
    let currentState: OrchestratorStateType = OrchestratorStateType.IDLE;
    let intent: IntentResult | null = preClassifiedIntent || null;
    let plan: TaskPlan | null = preCreatedPlan || null;
    let executionResult: ChainExecutionResult | null = null;
    const stepResults: Map<string, StepExecutionResult> = new Map();
    let totalTokensUsed = 0;
    let totalCostUsd = 0;
    let error: string | null = null;

    logger.info({
      executionId,
      userId,
      input: input.substring(0, 200),
      hasPreClassifiedIntent: !!preClassifiedIntent,
      hasPreCreatedPlan: !!preCreatedPlan,
    }, 'Orchestrator execution started');

    try {
      // ============================================
      // STEP 1: INTENT_PARSE
      // ============================================
      currentState = OrchestratorStateType.INTENT_PARSE;
      await job.updateProgress(10);

      if (!intent) {
        logger.info({ executionId }, 'Classifying intent...');

        intent = await classifyUserIntent(input, userId, sessionId);

        // Store state
        await executionState.setState(executionId, {
          currentState,
          intent,
          plan: null,
          executionResults: new Map(),
          currentStepIndex: 0,
          finalOutput: null,
          error: null,
          startTime,
          modelFallbackChain: options?.modelFallbackChain || ['openai', 'anthropic', 'google'],
          currentModelIndex: 0,
          injectedMemories: [],
          totalTokensUsed: 0,
          totalCostUsd: 0,
          retryCount: 0,
          stateHistory: [{ from: OrchestratorStateType.IDLE, to: currentState, timestamp: new Date(), reason: 'Starting intent classification' }],
        });
      }

      // Update progress
      await executionState.setProgress(executionId, {
        executionId,
        planId: plan?.id || 'pending',
        state: currentState,
        totalSteps: plan?.steps.length || 0,
        completedSteps: 0,
        failedSteps: 0,
        percentage: 20,
        startedAt: new Date(startTime),
        lastUpdatedAt: new Date(),
      });

      // ============================================
      // STEP 2: PLAN
      // ============================================
      currentState = OrchestratorStateType.PLAN;
      await job.updateProgress(25);

      if (!plan && intent) {
        logger.info({ executionId }, 'Creating execution plan...');

        plan = await createExecutionPlan(intent, userId, sessionId, {
          maxSteps: options?.maxSteps || 10,
          enableParallelization: options?.enableParallelization !== false,
          enableFallbacks: options?.enableFallbacks !== false,
          estimatedCost: true,
        });

        await executionState.updateState(executionId, {
          currentState,
          plan,
        });
      }

      // Update progress
      await executionState.setProgress(executionId, {
        executionId,
        planId: plan?.id || 'unknown',
        state: currentState,
        totalSteps: plan?.steps.length || 0,
        completedSteps: 0,
        failedSteps: 0,
        percentage: 30,
        startedAt: new Date(startTime),
        lastUpdatedAt: new Date(),
      });

      // ============================================
      // STEP 3: EXECUTE
      // ============================================
      currentState = OrchestratorStateType.EXECUTE;
      await job.updateProgress(35);

      if (plan && plan.steps.length > 0) {
        logger.info({
          executionId,
          totalSteps: plan.steps.length,
          mode: plan.mode,
        }, 'Executing plan...');

        // Execute plan based on mode
        if (plan.mode === ExecutionMode.PARALLEL && plan.steps.length > 1) {
          // Parallel execution using step queue
          executionResult = await executePlanParallel(
            executionId,
            plan,
            userId,
            sessionId,
            options
          );
        } else {
          // Sequential execution
          executionResult = await executePlanSequential(
            executionId,
            plan,
            userId,
            sessionId,
            stepResults,
            options
          );
        }

        // Store step results
        for (const step of executionResult.steps) {
          stepResults.set(step.stepId, step);
        }

        totalTokensUsed += executionResult.totalTokensUsed;
        totalCostUsd += executionResult.totalCostUsd;

        if (executionResult.success) {
          logger.info({
            executionId,
            successfulSteps: executionResult.successfulSteps,
            totalSteps: executionResult.steps.length,
            timeMs: executionResult.totalTimeMs,
          }, 'Plan executed successfully');
        } else {
          logger.warn({
            executionId,
            failedSteps: executionResult.failedSteps,
            error: executionResult.error,
          }, 'Plan executed with failures');
        }
      }

      await executionState.updateState(executionId, {
        currentState,
        executionResults: stepResults,
        currentStepIndex: plan?.steps.length || 0,
        totalTokensUsed,
        totalCostUsd,
      });

      await executionState.setProgress(executionId, {
        executionId,
        planId: plan?.id || 'unknown',
        state: currentState,
        totalSteps: plan?.steps.length || 0,
        completedSteps: executionResult?.successfulSteps || 0,
        failedSteps: executionResult?.failedSteps || 0,
        percentage: 70,
        currentStep: executionResult?.steps[executionResult.steps.length - 1]?.stepId,
        startedAt: new Date(startTime),
        lastUpdatedAt: new Date(),
      });

      // ============================================
      // STEP 4: REFLECT
      // ============================================
      currentState = OrchestratorStateType.REFLECT;
      await job.updateProgress(80);

      // Schedule reflection as a separate job
      if (executionResult) {
        await orchestratorReflectionQueue.add(
          `reflection-${executionId}`,
          {
            executionId,
            userId,
            executionResults: executionResult,
            originalRequest: input,
            storeInsights: true,
            notifyUser: false,
          } as ReflectionJobData,
          {
            jobId: `reflection-${executionId}`,
            priority: 5,
          }
        );
      }

      // ============================================
      // STEP 5: RESPOND
      // ============================================
      currentState = OrchestratorStateType.RESPOND;
      await job.updateProgress(95);

      // Generate final response via AI
      const finalOutput = executionResult?.finalOutput || {};
      let responseMessage = '';

      try {
        const responsePrompt = `
Based on the execution results, generate a natural, user-friendly response.

Original Request: ${input}
Execution Summary: 
- ${executionResult?.successfulSteps || 0} of ${executionResult?.steps.length || 0} steps completed
- Time: ${executionResult?.totalTimeMs || 0}ms
- Tokens: ${totalTokensUsed}
- Cost: $${totalCostUsd.toFixed(4)}

Key Output: ${JSON.stringify(finalOutput, null, 2).substring(0, 1000)}

${executionResult?.failedSteps ? `Errors: ${executionResult.steps.filter(s => !s.success).map(s => s.error).join('; ')}` : ''}

Provide a concise, helpful response to the user.`;

        const aiResponse = await OpenAIService.complete({
          prompt: responsePrompt,
          systemPrompt: 'You are a helpful AI assistant. Provide clear, concise summaries of task execution results.',
          temperature: 0.7,
          maxTokens: 500,
        });

        responseMessage = aiResponse.content;
      } catch (aiError) {
        logger.warn({ aiError, executionId }, 'AI response generation failed, using fallback');
        responseMessage = executionResult?.success
          ? 'Your task has been completed successfully.'
          : 'Your task encountered some issues. Please review the results.';
      }

      // Store response in memory
      await MemoryManager.storeShortTerm(
        userId,
        `Response: ${responseMessage.substring(0, 200)}`,
        {
          type: 'response',
          executionId,
          sessionId,
          success: executionResult?.success,
        }
      );

      // Update final state
      await executionState.updateState(executionId, {
        currentState,
        finalOutput: {
          ...finalOutput,
          message: responseMessage,
        },
        totalTokensUsed,
        totalCostUsd,
      });

      // Notify user if requested
      if (notifications?.notifyOnComplete) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          });

          if (user?.email) {
            await EmailService.sendEmail({
              to: user.email,
              toName: user.name || user.email.split('@')[0],
              subject: 'AI Agent Execution Complete',
              template: 'execution_complete',
              data: {
                executionId,
                input: input.substring(0, 200),
                success: executionResult?.success,
                stepsCompleted: executionResult?.successfulSteps,
                totalSteps: executionResult?.steps.length,
                timeMs: executionResult?.totalTimeMs,
                cost: totalCostUsd,
              },
            });
          }
        } catch (notifyError) {
          logger.error({ notifyError, userId }, 'Failed to send execution complete notification');
        }
      }

      // ============================================
      // FINAL: Return to IDLE
      // ============================================
      currentState = OrchestratorStateType.IDLE;
      const totalTime = Date.now() - startTime;

      // Log execution completion
      await prisma.agentExecution.create({
        data: {
          userId,
          sessionId,
          agentType: 'ORCHESTRATOR' as any,
          actionType: 'full_execution',
          input: { originalInput: input.substring(0, 1000) },
          output: { finalOutput, message: responseMessage },
          status: executionResult?.success ? 'SUCCESS' : 'ERROR',
          tokensUsed: totalTokensUsed,
          costUsd: totalCostUsd,
          durationMs: totalTime,
          metadata: {
            executionId,
            planId: plan?.id,
            totalSteps: plan?.steps.length,
            completedSteps: executionResult?.successfulSteps,
            failedSteps: executionResult?.failedSteps,
            intent: intent?.primaryIntent,
            confidence: intent?.confidence,
          },
        },
      });

      logger.info({
        executionId,
        userId,
        totalTimeMs: totalTime,
        totalTokens: totalTokensUsed,
        totalCost: totalCostUsd,
        success: executionResult?.success,
      }, 'Orchestrator execution completed');

      return {
        executionId,
        success: executionResult?.success ?? false,
        intent: intent?.primaryIntent,
        planId: plan?.id,
        steps: {
          total: plan?.steps.length || 0,
          completed: executionResult?.successfulSteps || 0,
          failed: executionResult?.failedSteps || 0,
        },
        output: finalOutput,
        message: responseMessage,
        totalTimeMs: totalTime,
        totalTokensUsed,
        totalCostUsd,
        error: executionResult?.error || null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error({
        error: errorMessage,
        executionId,
        userId,
        currentState,
        durationMs: Date.now() - startTime,
      }, 'Orchestrator execution failed');

      // Update error state
      await executionState.updateState(executionId, {
        currentState: OrchestratorStateType.ERROR,
        error: errorMessage,
        totalTokensUsed,
        totalCostUsd,
      });

      // Notify on error
      if (notifications?.notifyOnError) {
        try {
          await EmailService.sendEmail({
            to: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email || '',
            toName: 'User',
            subject: 'AI Agent Execution Failed',
            template: 'execution_error',
            data: {
              executionId,
              input: input.substring(0, 200),
              error: errorMessage,
            },
          });
        } catch (notifyError) {
          logger.error({ notifyError }, 'Failed to send error notification');
        }
      }

      // Log failed execution
      await prisma.agentExecution.create({
        data: {
          userId,
          sessionId,
          agentType: 'ORCHESTRATOR' as any,
          actionType: 'full_execution',
          input: { originalInput: input.substring(0, 1000) },
          status: 'ERROR',
          errorMessage: errorMessage,
          tokensUsed: totalTokensUsed,
          costUsd: totalCostUsd,
          durationMs: Date.now() - startTime,
          metadata: {
            executionId,
            errorState: currentState,
          },
        },
      });

      throw error; // Rethrow for BullMQ retry handling
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 10000,
    },
  }
);

// ============================================
// Step Execution Worker
// ============================================

export const orchestratorStepWorker = new Worker(
  ORCHESTRATOR_STEP_QUEUE,
  async (job: Job<StepExecutionJobData>) => {
    const { executionId, planId, step, userId, sessionId, previousOutputs, context, retryInfo } = job.data;

    const startTime = Date.now();
    let resolvedInput = step.input;

    // Resolve dependencies
    if (previousOutputs && Object.keys(previousOutputs).length > 0) {
      resolvedInput = resolveStepDependencies(step, previousOutputs);
    }

    logger.info({
      executionId,
      stepId: step.id,
      agentType: step.agentType,
      action: step.action,
      retryAttempt: retryInfo?.attempt || 0,
    }, 'Executing step');

    try {
      const result = await delegateToAgent(
        step.agentType,
        userId,
        sessionId,
        resolvedInput,
        { ...context, sessionId },
        step.timeout || 60000
      );

      const executionTimeMs = Date.now() - startTime;

      // Update progress
      await executionState.updateState(executionId, {
        executionResults: new Map([[step.id, {
          stepId: step.id,
          agentType: step.agentType,
          success: result.success,
          output: result.output,
          error: result.error,
          executionTimeMs,
          tokensUsed: result.tokensUsed,
          costUsd: result.costUsd,
          retryCount: retryInfo?.attempt || 0,
          status: result.success ? 'completed' : 'failed',
        } as StepExecutionResult]]),
      });

      return {
        stepId: step.id,
        success: result.success,
        output: result.output,
        error: result.error,
        executionTimeMs,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        retryCount: retryInfo?.attempt || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionTimeMs = Date.now() - startTime;

      logger.error({
        error: errorMessage,
        executionId,
        stepId: step.id,
        agentType: step.agentType,
      }, 'Step execution failed');

      return {
        stepId: step.id,
        success: false,
        output: null,
        error: errorMessage,
        executionTimeMs,
        tokensUsed: 0,
        costUsd: 0,
        retryCount: retryInfo?.attempt || 0,
      };
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 10,
  }
);

// ============================================
// Reflection Worker
// ============================================

export const orchestratorReflectionWorker = new Worker(
  ORCHESTRATOR_REFLECTION_QUEUE,
  async (job: Job<ReflectionJobData>) => {
    const { executionId, userId, executionResults, originalRequest, storeInsights, notifyUser } = job.data;

    const startTime = Date.now();

    logger.info({ executionId, userId }, 'Generating execution reflection');

    try {
      const successfulSteps = executionResults.steps.filter(s => s.success);
      const failedSteps = executionResults.steps.filter(s => !s.success);

      // Generate reflection prompt
      const reflectionPrompt = `
Analyze the following execution results and provide a comprehensive reflection.

Original Request: ${originalRequest || 'Not provided'}

Execution Summary:
- Total Steps: ${executionResults.steps.length}
- Successful: ${successfulSteps.length}
- Failed: ${failedSteps.length}
- Total Time: ${executionResults.totalTimeMs}ms
- Total Tokens: ${executionResults.totalTokensUsed}
- Total Cost: $${executionResults.totalCostUsd}
- Mode: ${executionResults.executionMode}

Step Details:
${executionResults.steps.map(s => 
  `  - ${s.stepId} (${s.agentType}): ${s.success ? '✓ Success' : '✗ Failed'} in ${s.executionTimeMs}ms, ${s.tokensUsed} tokens, $${s.costUsd}${s.error ? `, Error: ${s.error}` : ''}`
).join('\n')}

Provide a JSON response with:
{
  "summary": "overall summary of execution",
  "insights": ["key insight 1", "key insight 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "agentPerformance": {
    "AGENT_TYPE": { "success": true/false, "efficiency": 0-100, "reliability": 0-100, "averageResponseTimeMs": number, "recommendations": [] }
  },
  "recommendedNextSteps": ["step 1", "step 2", ...],
  "overallScore": 0-100,
  "successRate": 0-100
}`;

      let reflection: any;
      try {
        const aiResponse = await OpenAIService.complete({
          prompt: reflectionPrompt,
          temperature: 0.3,
          maxTokens: 1500,
        });

        reflection = JSON.parse(aiResponse.content);
      } catch (parseError) {
        logger.warn({ parseError, executionId }, 'Failed to parse AI reflection, using fallback');
        
        // Fallback reflection
        reflection = {
          summary: `Execution completed with ${successfulSteps.length} of ${executionResults.steps.length} steps successful.`,
          insights: [
            'Execution completed, review steps for optimization opportunities.',
          ],
          improvements: [
            'Monitor agent performance and adjust timeouts.',
            'Review cost patterns for optimization.',
          ],
          agentPerformance: {},
          recommendedNextSteps: successfulSteps.length > 0
            ? ['Review outputs', 'Check for follow-up tasks']
            : ['Retry failed steps', 'Consider alternative approaches'],
          overallScore: executionResults.success ? 75 : 40,
          successRate: Math.round((successfulSteps.length / (executionResults.steps.length || 1)) * 100),
          generationTimeMs: Date.now() - startTime,
          timestamp: new Date(),
          insightsStored: false,
        };
      }

      // Store insights in memory
      if (storeInsights && reflection.insights && reflection.insights.length > 0) {
        for (const insight of reflection.insights) {
          await orchestratorMemoryQueue.add(
            `store-memory-${executionId}-${Date.now()}`,
            {
              operation: 'store',
              userId,
              content: `Reflection insight from ${executionId}: ${insight}`,
              memoryType: 'long_term',
              importance: 0.8,
              metadata: {
                type: 'reflection',
                executionId,
                timestamp: new Date().toISOString(),
              },
            } as MemoryJobData,
            {
              jobId: `reflection-memory-${executionId}-${Date.now()}`,
            }
          );
        }
      }

      // Store reflection in database
      await prisma.$executeRaw`
        INSERT INTO agent_memory (
          id, user_id, memory_type, content, importance, metadata, created_at
        ) VALUES (
          ${uuidv4()}::uuid,
          ${userId}::uuid,
          'SEMANTIC',
          ${JSON.stringify(reflection)},
          ${0.85},
          ${JSON.stringify({ type: 'execution_reflection', executionId, timestamp: new Date().toISOString() })}::jsonb,
          NOW()
        )
      `;

      // Notify user if requested
      if (notifyUser) {
        try {
          await NotificationService.sendNotification({
            userId,
            type: 'email',
            title: 'Execution Reflection Available',
            message: `Your execution ${executionId} has been analyzed. Score: ${reflection.overallScore}/100, Success Rate: ${reflection.successRate}%`,
            data: { executionId, reflection },
          });
        } catch (notifyError) {
          logger.error({ notifyError, userId }, 'Failed to send reflection notification');
        }
      }

      logger.info({
        executionId,
        score: reflection.overallScore,
        insights: reflection.insights?.length,
        improvements: reflection.improvements?.length,
        timeMs: Date.now() - startTime,
      }, 'Reflection generated');

      return {
        executionId,
        reflection,
        generationTimeMs: Date.now() - startTime,
        insightsStored: storeInsights,
      };
    } catch (error) {
      logger.error({ error, executionId }, 'Reflection generation failed');
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 3,
  }
);

// ============================================
// Memory Operations Worker
// ============================================

export const orchestratorMemoryWorker = new Worker(
  ORCHESTRATOR_MEMORY_QUEUE,
  async (job: Job<MemoryJobData>) => {
    const { operation, userId, content, memoryType, importance, metadata, query, limit, sessionId } = job.data;

    logger.info({ operation, userId }, 'Processing memory operation');

    try {
      switch (operation) {
        case 'store': {
          if (!content) throw new Error('Content is required for store operation');
          const entry = await MemoryManager.storeLongTerm(
            userId,
            content,
            importance || 0.7,
            metadata || {},
            true // Generate embedding
          );
          return { stored: true, entryId: entry.id };
        }

        case 'consolidate': {
          const consolidated = await MemoryManager.consolidateMemories(userId);
          return { consolidated, timestamp: new Date().toISOString() };
        }

        case 'cleanup': {
          const cleanedCount = await MemoryManager.cleanupExpiredMemories();
          return { cleanedCount, timestamp: new Date().toISOString() };
        }

        case 'retrieve': {
          if (!query) throw new Error('Query is required for retrieve operation');
          const memories = await MemoryManager.retrieveRelevantMemories(
            userId,
            query,
            limit || 10,
            0.3
          );
          return { memories: memories.map(m => ({ id: m.id, content: m.content, importance: m.importance })), count: memories.length };
        }

        default:
          throw new Error(`Unknown memory operation: ${operation}`);
      }
    } catch (error) {
      logger.error({ error, operation, userId }, 'Memory operation failed');
      throw error;
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
  }
);

// ============================================
// Plan Execution: Sequential
// ============================================

async function executePlanSequential(
  executionId: string,
  plan: TaskPlan,
  userId: string,
  sessionId: string | undefined,
  stepResults: Map<string, StepExecutionResult>,
  options?: OrchestratorExecutionJobData['options']
): Promise<ChainExecutionResult> {
  const startTime = Date.now();
  const results: StepExecutionResult[] = [];
  const previousOutputs: Record<string, any> = {};
  let totalTokensUsed = 0;
  let totalCostUsd = 0;

  for (const step of plan.steps) {
    const stepStart = Date.now();
    let success = false;
    let output: any = null;
    let error: string | undefined;
    let retries = 0;
    const maxRetries = step.maxRetries || options?.maxRetries || 2;

    // Execute step with retries
    while (retries <= maxRetries && !success) {
      try {
        const resolvedInput = resolveStepDependencies(step, previousOutputs);

        const result = await delegateToAgent(
          step.agentType,
          userId,
          sessionId,
          resolvedInput,
          { userId, sessionId } as any,
          step.timeout || 60000
        );

        results.push({
          stepId: step.id,
          agentType: step.agentType,
          success: result.success,
          output: result.output,
          error: result.error,
          executionTimeMs: Date.now() - stepStart,
          tokensUsed: result.tokensUsed,
          costUsd: result.costUsd,
          retryCount: retries,
          status: result.success ? 'completed' : 'failed',
        });

        if (result.success) {
          output = result.output;
          success = true;
          totalTokensUsed += result.tokensUsed;
          totalCostUsd += result.costUsd;
          previousOutputs[step.id] = result.output;
          stepResults.set(step.id, results[results.length - 1]);
        } else {
          error = result.error;
          retries++;

          if (retries <= maxRetries) {
            logger.warn({
              executionId,
              stepId: step.id,
              error,
              retry: retries,
            }, 'Step failed, retrying');
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
          }
        }
      } catch (execError) {
        error = execError instanceof Error ? execError.message : String(execError);
        retries++;
        
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Try fallback if step failed
    if (!success && step.fallback) {
      logger.info({ executionId, stepId: step.id, fallback: step.fallback.agentType }, 'Executing fallback step');

      try {
        const fallbackResult = await delegateToAgent(
          step.fallback.agentType,
          userId,
          sessionId,
          {
            originalStepId: step.id,
            errorMessage: error,
            originalInput: step.input,
          },
          { userId, sessionId } as any,
          step.timeout || 60000
        );

        if (fallbackResult.success) {
          previousOutputs[step.id] = fallbackResult.output;
          success = true;
          output = fallbackResult.output;
        }
      } catch (fallbackError) {
        logger.error({ fallbackError, executionId, stepId: step.id }, 'Fallback execution failed');
      }
    }

    // Stop on error if configured
    if (!success && options?.stopOnError !== false) {
      logger.warn({ executionId, stepId: step.id, error }, 'Stopping execution due to step failure');
      break;
    }
  }

  const completedSteps = results.filter(r => r.success).length;
  const failedSteps = results.filter(r => !r.success).length;

  return {
    planId: plan.id,
    steps: results,
    finalOutput: results.length > 0 ? results[results.length - 1].output : null,
    totalTimeMs: Date.now() - startTime,
    totalTokensUsed,
    totalCostUsd,
    success: failedSteps === 0,
    error: failedSteps > 0 ? results.find(r => !r.success)?.error : undefined,
    executionMode: ExecutionMode.SEQUENTIAL,
    successfulSteps: completedSteps,
    failedSteps,
    skippedSteps: 0,
    fallbackSteps: [],
    startedAt: new Date(startTime),
    completedAt: new Date(),
  };
}

// ============================================
// Plan Execution: Parallel
// ============================================

async function executePlanParallel(
  executionId: string,
  plan: TaskPlan,
  userId: string,
  sessionId: string | undefined,
  options?: OrchestratorExecutionJobData['options']
): Promise<ChainExecutionResult> {
  const startTime = Date.now();
  const results: StepExecutionResult[] = [];
  const previousOutputs: Record<string, any> = {};
  let totalTokensUsed = 0;
  let totalCostUsd = 0;

  // Group steps by dependencies for parallel execution
  const stepGroups = groupStepsByDependencies(plan.steps);

  for (const group of stepGroups) {
    // Execute group in parallel
    const groupPromises = group.map(async (step) => {
      const stepStart = Date.now();
      const resolvedInput = resolveStepDependencies(step, previousOutputs);

      try {
        const result = await delegateToAgent(
          step.agentType,
          userId,
          sessionId,
          resolvedInput,
          { userId, sessionId } as any,
          step.timeout || 60000
        );

        const stepResult: StepExecutionResult = {
          stepId: step.id,
          agentType: step.agentType,
          success: result.success,
          output: result.output,
          error: result.error,
          executionTimeMs: Date.now() - stepStart,
          tokensUsed: result.tokensUsed,
          costUsd: result.costUsd,
          retryCount: 0,
          status: result.success ? 'completed' : 'failed',
        };

        if (result.success) {
          previousOutputs[step.id] = result.output;
        }

        return stepResult;
      } catch (error) {
        return {
          stepId: step.id,
          agentType: step.agentType,
          success: false,
          output: null,
          error: error instanceof Error ? error.message : String(error),
          executionTimeMs: Date.now() - stepStart,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
          status: 'failed',
        } as StepExecutionResult;
      }
    });

    const groupResults = await Promise.all(groupPromises);
    results.push(...groupResults);

    for (const result of groupResults) {
      totalTokensUsed += result.tokensUsed;
      totalCostUsd += result.costUsd;
    }
  }

  const completedSteps = results.filter(r => r.success).length;
  const failedSteps = results.filter(r => !r.success).length;

  return {
    planId: plan.id,
    steps: results,
    finalOutput: results.length > 0 ? results[results.length - 1].output : null,
    totalTimeMs: Date.now() - startTime,
    totalTokensUsed,
    totalCostUsd,
    success: failedSteps === 0,
    error: failedSteps > 0 ? results.find(r => !r.success)?.error : undefined,
    executionMode: ExecutionMode.PARALLEL,
    successfulSteps: completedSteps,
    failedSteps,
    skippedSteps: 0,
    fallbackSteps: [],
    startedAt: new Date(startTime),
    completedAt: new Date(),
  };
}

// ============================================
// Queue Events & Event Handlers
// ============================================

// Main execution worker events
orchestratorExecutionWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    executionId: (job.data as OrchestratorExecutionJobData).executionId,
    success: result.success,
    totalSteps: result.steps?.total,
    totalTimeMs: result.totalTimeMs,
  }, 'Orchestrator execution job completed');
});

orchestratorExecutionWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    executionId: (job?.data as OrchestratorExecutionJobData)?.executionId,
    error: err.message,
    failedReason: (job as any)?.failedReason,
    attempts: job?.attemptsMade,
  }, 'Orchestrator execution job failed');
});

orchestratorExecutionWorker.on('error', (err) => {
  logger.error({ error: err }, 'Orchestrator execution worker error');
});

orchestratorExecutionWorker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'Orchestrator execution job stalled');
});

// Step worker events
orchestratorStepWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    stepId: result.stepId,
    success: result.success,
    executionTimeMs: result.executionTimeMs,
  }, 'Step execution completed');
});

orchestratorStepWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    stepId: (job?.data as StepExecutionJobData)?.step?.id,
    error: err.message,
  }, 'Step execution failed');
});

// Reflection worker events
orchestratorReflectionWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Reflection job completed');
});

orchestratorReflectionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Reflection job failed');
});

// Memory worker events
orchestratorMemoryWorker.on('completed', (job, result) => {
  logger.info({
    jobId: job.id,
    operation: (job.data as MemoryJobData).operation,
    result,
  }, 'Memory operation completed');
});

orchestratorMemoryWorker.on('failed', (job, err) => {
  logger.error({
    jobId: job?.id,
    operation: (job?.data as MemoryJobData)?.operation,
    error: err.message,
  }, 'Memory operation failed');
});

// ============================================
// Queue Events for Monitoring
// ============================================

const queueEvents = new QueueEvents(ORCHESTRATOR_EXECUTION_QUEUE, {
  connection: getRedisConnection(),
});

queueEvents.on('waiting', ({ jobId }) => {
  logger.debug({ jobId }, 'Job waiting in execution queue');
});

queueEvents.on('delayed', ({ jobId, delay }) => {
  logger.debug({ jobId, delayMs: delay }, 'Job delayed in execution queue');
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug({ jobId, progress: data }, 'Job progress updated');
});

// ============================================
// Scheduled Cleanup Jobs
// ============================================

let cleanupInterval: NodeJS.Timeout | null = null;

export function startPeriodicCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(async () => {
    try {
      // Clean up old memory entries
      await orchestratorMemoryQueue.add(
        `cleanup-${Date.now()}`,
        {
          operation: 'cleanup',
          userId: 'system',
        } as MemoryJobData,
        {
          jobId: `memory-cleanup-${Date.now()}`,
          priority: 1,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );

      // Clean up old orchestration state from Redis
      const redis = getRedisConnection();
      const stateKeys = await redis.keys('orchestrator:state:*');
      const progressKeys = await redis.keys('orchestrator:progress:*');

      const oldKeys = [...stateKeys, ...progressKeys].filter(key => {
        // Remove keys older than 24 hours
        return true; // Redis TTL handles this, but we can add additional logic
      });

      if (oldKeys.length > 0) {
        // We don't delete here, Redis TTL handles expiration
        logger.info({ stateKeys: stateKeys.length, progressKeys: progressKeys.length }, 'Orchestration state cleanup check');
      }

      // Clean up old execution logs
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deletedLogs = await prisma.agentExecution.deleteMany({
        where: {
          agentType: 'ORCHESTRATOR' as any,
          status: { in: ['SUCCESS', 'ERROR', 'CANCELLED'] },
          createdAt: { lt: dayAgo },
        },
      });

      if (deletedLogs.count > 0) {
        logger.info({ deletedCount: deletedLogs.count }, 'Old orchestration execution logs cleaned up');
      }
    } catch (error) {
      logger.error({ error }, 'Periodic cleanup failed');
    }
  }, 3600000); // Every hour

  logger.info('Orchestrator periodic cleanup started (hourly)');
}

export function stopPeriodicCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Orchestrator periodic cleanup stopped');
  }
}

// ============================================
// Graceful Shutdown
// ============================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Shutting down orchestration workers...`);

  stopPeriodicCleanup();

  const shutdownTimeout = setTimeout(() => {
    logger.error('Orchestration worker shutdown timeout, force closing');
    process.exit(1);
  }, 30000);

  try {
    await Promise.all([
      orchestratorExecutionWorker.close(),
      orchestratorStepWorker.close(),
      orchestratorReflectionWorker.close(),
      orchestratorMemoryWorker.close(),
    ]);

    await Promise.all([
      orchestratorExecutionQueue.close(),
      orchestratorStepQueue.close(),
      orchestratorReflectionQueue.close(),
      orchestratorMemoryQueue.close(),
    ]);

    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
    }

    clearTimeout(shutdownTimeout);
    logger.info('Orchestration workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during orchestration worker shutdown');
    process.exit(1);
  }
}

// ============================================
// Process Handlers
// ============================================

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception in orchestration worker');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in orchestration worker');
});

// ============================================
// Auto-start cleanup on import
// ============================================

export function initializeOrchestrationQueues(): void {
  startPeriodicCleanup();
  logger.info('Orchestration queue system initialized');
}

// Auto-initialize
initializeOrchestrationQueues();