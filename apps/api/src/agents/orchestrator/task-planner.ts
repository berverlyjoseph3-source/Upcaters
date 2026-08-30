// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/task-planner.ts
import { v4 as uuidv4 } from 'uuid';
import {
  IntentResult,
  AgentType,
  AgentContext,
} from '../../types/agent.types';
import {
  TaskPlan,
  TaskPlanStep,
  ExecutionMode,
  FallbackStrategy,
  PlanValidationResult,
} from './orchestrator.types';
import { OpenAIClient } from '../../services/ai/openai.client';
import { logger } from '../../utils/logger';

// ============================================
// Types
// ============================================

export interface PlanningOptions {
  /** Maximum number of steps in the plan */
  maxSteps?: number;
  /** Maximum retries per step (falls back to DEFAULT_MAX_RETRIES if unset) */
  maxRetries?: number;
  /** Enable parallelization where possible */
  enableParallelization?: boolean;
  /** Enable fallback steps for error handling */
  enableFallbacks?: boolean;
  /** Include cost estimates in plan */
  estimatedCost?: boolean;
  /** Optimization goal for plan creation */
  optimizationGoal?: 'speed' | 'cost' | 'accuracy' | 'balanced';
  /** Maximum plan depth (for nested/sub-plans) */
  maxDepth?: number;
  /** Timeout for plan creation in ms */
  timeout?: number;
  /** Preferred agents to use */
  preferredAgents?: AgentType[];
  /** Agents to exclude */
  excludedAgents?: AgentType[];
  /** Whether to use AI for complex planning */
  useAIPlanning?: boolean;
  /** Minimum confidence threshold for step suggestions */
  minStepConfidence?: number;
  /** Whether to validate the plan after creation */
  validateAfterCreation?: boolean;
}

export interface PlanValidationOptions {
  /** Check for circular dependencies */
  checkCircularDependencies?: boolean;
  /** Check for missing agents */
  checkAgentAvailability?: boolean;
  /** Check for step timeout feasibility */
  checkTimeoutFeasibility?: boolean;
  /** Check for cost estimates */
  checkCostEstimates?: boolean;
  /** Maximum allowed plan depth */
  maxDepth?: number;
}

// ============================================
// Agent Cost Estimates (tokens per step)
// ============================================

const AGENT_COST_ESTIMATES: Record<AgentType, { tokens: number; costUsd: number; avgTimeMs: number }> = {
  [AgentType.EMAIL]: { tokens: 500, costUsd: 0.001, avgTimeMs: 1500 },
  [AgentType.DRIVE]: { tokens: 300, costUsd: 0.0005, avgTimeMs: 2000 },
  [AgentType.CONTENT]: { tokens: 1000, costUsd: 0.005, avgTimeMs: 5000 },
  [AgentType.SOCIAL]: { tokens: 400, costUsd: 0.001, avgTimeMs: 3000 },
  [AgentType.CALENDAR]: { tokens: 300, costUsd: 0.0005, avgTimeMs: 1200 },
  [AgentType.WEB]: { tokens: 600, costUsd: 0.002, avgTimeMs: 2500 },
  [AgentType.TASK]: { tokens: 300, costUsd: 0.0005, avgTimeMs: 1000 },
  [AgentType.ORCHESTRATOR]: { tokens: 200, costUsd: 0.0005, avgTimeMs: 500 },
};

// ============================================
// AI Planning Prompt Templates
// ============================================

const PLANNING_PROMPT_TEMPLATE = `
You are a task planning system. Create an execution plan for the following task.

Intent: {intent}
Confidence: {confidence}
Suggested Agent: {suggestedAgent}
Entities: {entities}
Requires Multiple Agents: {requiresMultipleAgents}
Agent Chain: {agentChain}
Complexity: {complexity}

Context: {context}

Create a step-by-step plan. Each step should have:
- id: Unique step identifier (e.g., "step_1")
- agentType: Which agent handles this step (EMAIL, DRIVE, CONTENT, SOCIAL, CALENDAR, WEB, TASK)
- action: What action to perform
- input: What input to pass to the agent
- dependsOn: Array of step IDs this step depends on (for ordering)
- description: Brief description of what this step does
- onFailure: What to do if step fails (retry, skip, fail_plan, fallback_agent)
- onPartial: Step ID to execute on partial success (optional)
- estimatedTokens: Estimated tokens for this step
- optional: Whether this step can be skipped on failure

Available Agents:
- EMAIL: Email tasks (send, read, reply, organize, classify)
- DRIVE: File management (upload, download, search, share, create_folder)
- CONTENT: Content creation (generate_text, generate_image, generate_video, analyze, translate)
- SOCIAL: Social media (post_to_linkedin, post_to_instagram, post_to_facebook, post_to_x, schedule)
- CALENDAR: Calendar management (list_events, create_event, update_event, get_free_busy, smart_schedule)
- WEB: Web operations (search_web, get_weather, research, get_news, fetch_page)
- TASK: Task management (create_task, list_tasks, update_task, complete_task, get_projects)

Fallback Strategies:
- retry: Retry the step up to maxRetries times
- skip: Skip the step and continue
- fail_plan: Stop execution if this step fails
- fallback_agent: Try an alternative agent if primary fails

Execution Modes:
- sequential: Steps execute one after another
- parallel: Independent steps execute simultaneously
- conditional: Steps execute based on conditions

Response must be valid JSON only:
{
  "steps": [
    {
      "id": "step_1",
      "agentType": "EMAIL",
      "action": "send_email",
      "input": {"to": "user@example.com", "subject": "Hello", "body": "..."},
      "dependsOn": [],
      "description": "Send email to user",
      "onFailure": "retry",
      "onPartial": null,
      "estimatedTokens": 500,
      "optional": false,
      "maxRetries": 3
    }
  ],
  "mode": "sequential",
  "estimatedTokens": 1500,
  "estimatedCostUsd": 0.015,
  "estimatedTimeMs": 5000,
  "warnings": ["Step 2 may need user confirmation"],
  "suggestions": ["Consider grouping steps 3 and 4 for parallelism"]
}
`;

const OPTIMIZATION_PROMPT_TEMPLATE = `
Optimize the following execution plan for {goal}.

Current Plan:
{planJson}

Optimization Goals:
- speed: Minimize total execution time by parallelizing independent steps
- cost: Minimize cost by consolidating steps and reducing API calls
- accuracy: Maximize reliability by adding validation steps and fallbacks
- balanced: Balance all factors

Respond with valid JSON only:
{
  "steps": [...],
  "mode": "sequential or parallel",
  "changes": ["description of changes made"],
  "estimatedTokens": number,
  "estimatedCostUsd": number,
  "estimatedTimeMs": number,
  "savingsPercentage": number
}
`;

// ============================================
// Task Planner
// ============================================

export class TaskPlanner {
  private static readonly DEFAULT_MAX_STEPS = 10;
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly PLAN_TIMEOUT_MS = 15000;

  /**
   * Create a task plan from intent
   */
  static async createPlan(
    intent: IntentResult,
    context: AgentContext,
    options?: PlanningOptions,
  ): Promise<TaskPlan> {
    const startTime = Date.now();
    const maxSteps = options?.maxSteps || this.DEFAULT_MAX_STEPS;

    try {
      let steps: TaskPlanStep[] = [];
      let mode: ExecutionMode = ExecutionMode.SEQUENTIAL;
      let warnings: string[] = [];
      let suggestions: string[] = [];

      // For single agent tasks, create a simple plan
      if (!intent.requiresMultipleAgents) {
        steps = this.createSimplePlan(intent, options);
        mode = ExecutionMode.SEQUENTIAL;
      }
      // For multi-agent tasks, use AI planning if enabled
      else if (options?.useAIPlanning !== false) {
        try {
          const aiPlan = await this.createComplexPlan(
            intent,
            context,
            options,
          );
          steps = aiPlan.steps;
          mode = aiPlan.mode;
          warnings = aiPlan.warnings || [];
          suggestions = aiPlan.suggestions || [];
        } catch (aiError) {
          logger.warn(
            { error: aiError },
            'AI planning failed, using fallback plan',
          );
          const fallback = this.createFallbackPlan(intent, options);
          steps = fallback.steps;
          mode = fallback.mode;
          warnings = ['AI planning failed, using fallback plan'];
        }
      }
      // Fallback to simple chain
      else {
        const fallback = this.createFallbackPlan(intent, options);
        steps = fallback.steps;
        mode = fallback.mode;
      }

      // Apply max steps limit
      if (steps.length > maxSteps) {
        logger.warn(
          {
            originalSteps: steps.length,
            maxSteps,
          },
          'Truncating plan due to max steps limit',
        );
        steps = steps.slice(0, maxSteps);
      }

      // ENHANCEMENT: Add fallback strategies to each step
      if (options?.enableFallbacks !== false) {
        steps = this.addFallbackStrategies(steps);
      }

      // ENHANCEMENT: Optimize for parallel if enabled
      if (
        options?.enableParallelization &&
        mode === ExecutionMode.SEQUENTIAL
      ) {
        const optimized = this.optimizeForParallel(steps);
        if (optimized.mode === ExecutionMode.PARALLEL) {
          mode = ExecutionMode.PARALLEL;
          steps = optimized.steps;
        }
      }

      // Exclude specific agents
      if (options?.excludedAgents && options.excludedAgents.length > 0) {
        steps = steps.filter(
          (step) => !options.excludedAgents!.includes(step.agentType),
        );
      }

      // Calculate estimates
      let estimatedTokens = 0;
      let estimatedCost = 0;
      let estimatedTimeMs = 0;

      if (options?.estimatedCost !== false) {
        for (const step of steps) {
          const agentEstimate =
            AGENT_COST_ESTIMATES[step.agentType] ||
            AGENT_COST_ESTIMATES[AgentType.ORCHESTRATOR];
          step.estimatedTokens =
            step.estimatedTokens || agentEstimate.tokens;
          step.estimatedCostUsd =
            step.estimatedCostUsd || agentEstimate.costUsd;
          step.timeout =
            step.timeout || agentEstimate.avgTimeMs * 2;

          estimatedTokens += step.estimatedTokens || 0;
          estimatedCost += step.estimatedCostUsd || 0;

          if (mode === ExecutionMode.PARALLEL) {
            estimatedTimeMs = Math.max(
              estimatedTimeMs,
              agentEstimate.avgTimeMs,
            );
          } else {
            estimatedTimeMs += agentEstimate.avgTimeMs;
          }
        }
      }

      // Create the plan
      const plan: TaskPlan = {
        id: uuidv4(),
        steps,
        mode,
        estimatedTokens: estimatedTokens > 0 ? estimatedTokens : undefined,
        estimatedCostUsd: estimatedCost > 0 ? estimatedCost : undefined,
        createdAt: new Date(),
        metadata: {
          intentPrimary: intent.primaryIntent,
          intentConfidence: intent.confidence,
          suggestedAgent: intent.suggestedAgent,
          planningTimeMs: Date.now() - startTime,
          planningMethod: intent.requiresMultipleAgents
            ? 'ai'
            : 'simple',
          warnings: warnings.length > 0 ? warnings : undefined,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        },
      };

      // ENHANCEMENT: Validate plan if requested
      if (options?.validateAfterCreation !== false) {
        const validation = this.validatePlan(plan);
        if (!validation.valid) {
          logger.warn(
            { planId: plan.id, errors: validation.errors },
            'Plan validation failed',
          );
        }
        if (validation.warnings.length > 0) {
          logger.warn(
            { planId: plan.id, warnings: validation.warnings },
            'Plan has warnings',
          );
        }
      }

      logger.info(
        {
          planId: plan.id,
          stepCount: steps.length,
          mode,
          planningTimeMs: Date.now() - startTime,
          estimatedTokens,
          estimatedCost,
        },
        'Task plan created',
      );

      return plan;
    } catch (error) {
      logger.error({ error, intent }, 'Failed to create task plan');
      throw new Error(
        `Task planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a simple plan for single agent tasks
   */
  private static createSimplePlan(
    intent: IntentResult,
    options?: PlanningOptions,
  ): TaskPlanStep[] {
    const step: TaskPlanStep = {
      id: `step_${Date.now()}`,
      agentType: intent.suggestedAgent,
      action: 'execute',
      input: {
        intent: intent.primaryIntent,
        entities: intent.entities,
      },
      dependsOn: [],
      description: `Execute ${intent.primaryIntent} via ${intent.suggestedAgent}`,
      onFailure: FallbackStrategy.RETRY,
      maxRetries: options?.maxRetries || this.DEFAULT_MAX_RETRIES,
      optional: false,
    };

    return [step];
  }

  /**
   * Create a complex plan using AI
   */
  private static async createComplexPlan(
    intent: IntentResult,
    context: AgentContext,
    options?: PlanningOptions,
  ): Promise<{
    steps: TaskPlanStep[];
    mode: ExecutionMode;
    warnings?: string[];
    suggestions?: string[];
  }> {
    const openai = OpenAIClient.getInstance();

    const prompt = PLANNING_PROMPT_TEMPLATE.replace(
      '{intent}',
      intent.primaryIntent,
    )
      .replace('{confidence}', String(intent.confidence))
      .replace('{suggestedAgent}', intent.suggestedAgent)
      .replace('{entities}', JSON.stringify(intent.entities))
      .replace(
        '{requiresMultipleAgents}',
        String(intent.requiresMultipleAgents),
      )
      .replace(
        '{agentChain}',
        JSON.stringify(intent.agentChain || []),
      )
      .replace(
        '{complexity}',
        intent.complexity || 'moderate',
      )
      .replace(
        '{context}',
        JSON.stringify({
          userId: context.userId,
          sessionId: context.sessionId,
          previousResponses:
            context.previousResponses?.length || 0,
          preferences: context.preferences || {},
        }),
      );

    // ENHANCEMENT: Execute with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeout || this.PLAN_TIMEOUT_MS,
    );

    try {
      const response = await openai.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        maxTokens: 2000,
      });

      clearTimeout(timeoutId);

      // Parse response
      let parsed: any;
      try {
        // Try to extract JSON from response
        const jsonMatch =
          response.choices[0].message.content.match(
            /\{[\s\S]*\}/,
          );
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        logger.warn(
          { parseError, response: response.choices[0].message.content },
          'Failed to parse AI planning response',
        );
        throw parseError;
      }

      // Map to TaskPlanStep
      const steps: TaskPlanStep[] = (
        parsed.steps || []
      ).map((step: any, index: number) => ({
        id: step.id || `step_${index + 1}`,
        agentType: this.mapToAgentType(step.agentType),
        action: step.action || 'execute',
        input: step.input || {},
        dependsOn: step.dependsOn || [],
        parallelGroup: step.parallelGroup,
        fallback: step.fallback
          ? {
              id: `${step.id}_fallback`,
              agentType: this.mapToAgentType(
                step.fallback.agentType,
              ),
              action: step.fallback.action || 'handle_error',
              input:
                step.fallback.input || {
                  error: 'Primary step failed',
                },
              dependsOn: step.dependsOn,
            }
          : undefined,
        description: step.description,
        onFailure: this.mapToFallbackStrategy(
          step.onFailure || 'retry',
        ),
        onPartial: step.onPartial,
        estimatedTokens:
          step.estimatedTokens ||
          AGENT_COST_ESTIMATES[
            this.mapToAgentType(step.agentType)
          ]?.tokens,
        estimatedCostUsd:
          step.estimatedCostUsd ||
          AGENT_COST_ESTIMATES[
            this.mapToAgentType(step.agentType)
          ]?.costUsd,
        optional: step.optional || false,
        maxRetries:
          step.maxRetries ||
          options?.maxRetries ||
          this.DEFAULT_MAX_RETRIES,
        timeout:
          step.timeout ||
          AGENT_COST_ESTIMATES[
            this.mapToAgentType(step.agentType)
          ]?.avgTimeMs * 2,
      }));

      // Determine mode
      const mode: ExecutionMode =
        parsed.mode === 'parallel' &&
        options?.enableParallelization !== false
          ? ExecutionMode.PARALLEL
          : parsed.mode === 'conditional'
            ? ExecutionMode.CONDITIONAL
            : ExecutionMode.SEQUENTIAL;

      return {
        steps,
        mode,
        warnings: parsed.warnings,
        suggestions: parsed.suggestions,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * ENHANCEMENT: Create fallback plan when AI planning fails
   */
  private static createFallbackPlan(
    intent: IntentResult,
    options?: PlanningOptions,
  ): { steps: TaskPlanStep[]; mode: ExecutionMode } {
    const agentChain =
      intent.agentChain && intent.agentChain.length > 0
        ? intent.agentChain
        : [intent.suggestedAgent];

    const steps: TaskPlanStep[] = agentChain.map(
      (agent, i) => ({
        id: `step_${i + 1}`,
        agentType: agent,
        action: 'execute',
        input: {
          intent: intent.primaryIntent,
          entities: intent.entities,
          previousOutput:
            i > 0 ? `step_${i}` : undefined,
        },
        dependsOn: i > 0 ? [`step_${i}`] : [],
        description: `Execute ${intent.primaryIntent} step ${i + 1} via ${agent}`,
        onFailure: FallbackStrategy.RETRY,
        maxRetries:
          options?.maxRetries || this.DEFAULT_MAX_RETRIES,
        optional: false,
      }),
    );

    return { steps, mode: ExecutionMode.SEQUENTIAL };
  }

  // ============================================
  // ENHANCEMENT: Fallback Strategies
  // ============================================

  /**
   * Add fallback strategies to each step in the plan
   */
  static addFallbackStrategies(steps: TaskPlanStep[]): TaskPlanStep[] {
    return steps.map((step) => {
      // Skip if already has a fallback strategy
      if (step.onFailure) {
        return step;
      }

      // Determine best fallback strategy based on step characteristics
      let onFailure: FallbackStrategy = FallbackStrategy.RETRY;

      // Critical steps (no optional flag) should fail the plan
      if (!step.optional && step.dependsOn.length === 0) {
        onFailure = FallbackStrategy.FAIL_PLAN;
      }
      // Optional steps can be skipped
      else if (step.optional) {
        onFailure = FallbackStrategy.SKIP;
      }
      // Steps with fallback agent defined
      else if (step.fallback) {
        onFailure = FallbackStrategy.FALLBACK_AGENT;
      }

      // Add fallback step if not already present
      if (
        !step.fallback &&
        onFailure === FallbackStrategy.FALLBACK_AGENT
      ) {
        step.fallback = {
          id: `${step.id}_fallback`,
          agentType: AgentType.ORCHESTRATOR,
          action: 'handle_error',
          input: {
            originalStepId: step.id,
            error: 'Primary step failed',
          },
          dependsOn: step.dependsOn,
          onFailure: FallbackStrategy.FAIL_PLAN,
          optional: true,
        };
      }

      return {
        ...step,
        onFailure,
        maxRetries:
          step.maxRetries || this.DEFAULT_MAX_RETRIES,
      };
    });
  }

  /**
   * Map string to FallbackStrategy
   */
  static mapToFallbackStrategy(
    strategy: string,
  ): FallbackStrategy {
    const mapping: Record<string, FallbackStrategy> = {
      retry: FallbackStrategy.RETRY,
      skip: FallbackStrategy.SKIP,
      fail_plan: FallbackStrategy.FAIL_PLAN,
      fail: FallbackStrategy.FAIL_PLAN,
      fallback_agent: FallbackStrategy.FALLBACK_AGENT,
      fallback: FallbackStrategy.FALLBACK_AGENT,
      degrade: FallbackStrategy.DEGRADE,
      switch_model: FallbackStrategy.SWITCH_MODEL,
      switch_provider: FallbackStrategy.SWITCH_PROVIDER,
    };
    return mapping[strategy.toLowerCase()] || FallbackStrategy.RETRY;
  }

  // ============================================
  // ENHANCEMENT: Plan Optimization
  // ============================================

  /**
   * Optimize a task plan for parallel execution
   */
  static optimizeForParallel(steps: TaskPlanStep[]): {
    steps: TaskPlanStep[];
    mode: ExecutionMode;
  } {
    // Find steps that can run in parallel (no dependencies)
    const independentSteps = steps.filter(
      (s) => s.dependsOn.length === 0,
    );
    const dependentSteps = steps.filter(
      (s) => s.dependsOn.length > 0,
    );

    // If all steps are independent, they can run in parallel
    if (dependentSteps.length === 0 && steps.length > 1) {
      return {
        steps: steps.map((s) => ({
          ...s,
          parallelGroup: 'group_0',
        })),
        mode: ExecutionMode.PARALLEL,
      };
    }

    // If there's a mix, assign parallel groups
    const groups: Map<string, string[]> = new Map();

    for (const step of steps) {
      const depKey = step.dependsOn.sort().join('_');
      if (!groups.has(depKey)) {
        groups.set(depKey, []);
      }
      groups.get(depKey)!.push(step.id);
    }

    // Assign parallel groups
    let groupIndex = 0;
    for (const [key, groupSteps] of groups.entries()) {
      if (groupSteps.length > 1) {
        const groupName = `group_${groupIndex++}`;
        for (const stepId of groupSteps) {
          const step = steps.find((s) => s.id === stepId);
          if (step) {
            step.parallelGroup = groupName;
          }
        }
      }
    }

    const hasParallelGroups = groups.size > 0;
    return {
      steps,
      mode: hasParallelGroups
        ? ExecutionMode.PARALLEL
        : ExecutionMode.SEQUENTIAL,
    };
  }

  /**
   * Optimize plan using AI
   */
  static async optimizePlan(
    plan: TaskPlan,
    optimizationGoal: 'speed' | 'cost' | 'accuracy' | 'balanced' = 'balanced',
  ): Promise<{
    originalSteps: number;
    optimizedSteps: number;
    originalEstimatedTokens: number;
    optimizedEstimatedTokens: number;
    savingsPercentage: number;
    changes: string[];
    optimizedPlan: TaskPlan;
    optimizationTimeMs: number;
  }> {
    const startTime = Date.now();

    try {
      const openai = OpenAIClient.getInstance();

      const prompt = OPTIMIZATION_PROMPT_TEMPLATE.replace(
        '{goal}',
        optimizationGoal,
      ).replace(
        '{planJson}',
        JSON.stringify(
          {
            steps: plan.steps.map((s) => ({
              id: s.id,
              agentType: s.agentType,
              action: s.action,
              dependsOn: s.dependsOn,
              parallelGroup: s.parallelGroup,
              optional: s.optional,
              estimatedTokens: s.estimatedTokens,
            })),
            mode: plan.mode,
          },
          null,
          2,
        ),
      );

      const response = await openai.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 2000,
      });

      let parsed: any;
      try {
        const jsonMatch =
          response.choices[0].message.content.match(
            /\{[\s\S]*\}/,
          );
        parsed = jsonMatch
          ? JSON.parse(jsonMatch[0])
          : null;
      } catch {
        // If AI optimization fails, use heuristic optimization
        return this.heuristicOptimize(plan, optimizationGoal);
      }

      if (!parsed || !parsed.steps) {
        return this.heuristicOptimize(plan, optimizationGoal);
      }

      const optimizedSteps: TaskPlanStep[] = parsed.steps.map(
        (step: any, index: number) => ({
          id: step.id || `opt_step_${index + 1}`,
          agentType: this.mapToAgentType(step.agentType),
          action: step.action,
          input: step.input || {},
          dependsOn: step.dependsOn || [],
          parallelGroup: step.parallelGroup,
          description: step.description,
          onFailure: this.mapToFallbackStrategy(
            step.onFailure || 'retry',
          ),
          estimatedTokens: step.estimatedTokens,
          estimatedCostUsd: step.estimatedCostUsd,
          optional: step.optional || false,
          maxRetries: step.maxRetries || 3,
        }),
      );

      const optimizedPlan: TaskPlan = {
        ...plan,
        id: `${plan.id}_optimized`,
        steps: optimizedSteps,
        mode:
          parsed.mode === 'parallel'
            ? ExecutionMode.PARALLEL
            : ExecutionMode.SEQUENTIAL,
        estimatedTokens: parsed.estimatedTokens,
        estimatedCostUsd: parsed.estimatedCostUsd,
        version: (plan.version || 1) + 1,
        metadata: {
          ...plan.metadata,
          optimizedFrom: plan.id,
          optimizationGoal,
          optimizationTimeMs: Date.now() - startTime,
        },
      };

      const originalTokens =
        plan.estimatedTokens ||
        plan.steps.reduce(
          (sum, s) => sum + (s.estimatedTokens || 500),
          0,
        );
      const optimizedTokens =
        parsed.estimatedTokens ||
        optimizedSteps.reduce(
          (sum, s) => sum + (s.estimatedTokens || 400),
          0,
        );
      const savingsPercentage =
        originalTokens > 0
          ? ((originalTokens - optimizedTokens) /
              originalTokens) *
            100
          : 0;

      return {
        originalSteps: plan.steps.length,
        optimizedSteps: optimizedSteps.length,
        originalEstimatedTokens: originalTokens,
        optimizedEstimatedTokens: optimizedTokens,
        savingsPercentage: Math.round(savingsPercentage),
        changes: parsed.changes || [
          `Optimized for ${optimizationGoal}`,
        ],
        optimizedPlan,
        optimizationTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      logger.warn(
        { error, planId: plan.id },
        'AI optimization failed, using heuristic',
      );
      return this.heuristicOptimize(plan, optimizationGoal);
    }
  }

  /**
   * Heuristic plan optimization (no AI required)
   */
  private static heuristicOptimize(
    plan: TaskPlan,
    goal: string,
  ): {
    originalSteps: number;
    optimizedSteps: number;
    originalEstimatedTokens: number;
    optimizedEstimatedTokens: number;
    savingsPercentage: number;
    changes: string[];
    optimizedPlan: TaskPlan;
    optimizationTimeMs: number;
  } {
    const startTime = Date.now();
    let steps = [...plan.steps];
    const changes: string[] = [];

    switch (goal) {
      case 'speed':
        // Parallelize independent steps
        const speedResult = this.optimizeForParallel(steps);
        steps = speedResult.steps;
        if (speedResult.mode === ExecutionMode.PARALLEL) {
          changes.push(
            'Enabled parallel execution for independent steps',
          );
        }
        break;

      case 'cost':
        // Consolidate steps that can be handled by single agent
        steps = this.consolidateSteps(steps);
        changes.push(
          'Consolidated steps for cost efficiency',
        );
        break;

      case 'accuracy':
        // Add validation steps
        steps = this.addValidationSteps(steps);
        changes.push('Added validation steps for accuracy');
        break;

      case 'balanced':
      default:
        // Mix of optimizations
        const balancedParallel =
          this.optimizeForParallel(steps);
        steps = balancedParallel.steps;
        if (
          balancedParallel.mode === ExecutionMode.PARALLEL
        ) {
          changes.push(
            'Enabled parallel execution where possible',
          );
        }
        steps = steps.map((step) => ({
          ...step,
          fallback: step.fallback || {
            id: `${step.id}_fallback`,
            agentType: AgentType.ORCHESTRATOR,
            action: 'handle_error',
            input: {
              originalStepId: step.id,
            },
            dependsOn: step.dependsOn,
            onFailure: FallbackStrategy.FAIL_PLAN,
            optional: true,
          },
        }));
        if (!plan.steps.some((s) => s.fallback)) {
          changes.push('Added fallback steps for reliability');
        }
        break;
    }

    const originalTokens =
      plan.estimatedTokens ||
      plan.steps.reduce(
        (sum, s) => sum + (s.estimatedTokens || 500),
        0,
      );
    const optimizedTokens = steps.reduce(
      (sum, s) => sum + (s.estimatedTokens || 400),
      0,
    );
    const savingsPercentage =
      originalTokens > 0
        ? ((originalTokens - optimizedTokens) /
            originalTokens) *
          100
        : 0;

    const optimizedPlan: TaskPlan = {
      ...plan,
      id: `${plan.id}_optimized`,
      steps,
      estimatedTokens: optimizedTokens,
      estimatedCostUsd: optimizedTokens * 0.00001,
      version: (plan.version || 1) + 1,
      metadata: {
        ...plan.metadata,
        optimizedFrom: plan.id,
        optimizationGoal: goal,
        optimizationTimeMs: Date.now() - startTime,
      },
    };

    return {
      originalSteps: plan.steps.length,
      optimizedSteps: steps.length,
      originalEstimatedTokens: originalTokens,
      optimizedEstimatedTokens: optimizedTokens,
      savingsPercentage: Math.round(savingsPercentage),
      changes,
      optimizedPlan,
      optimizationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Consolidate steps for cost optimization
   */
  private static consolidateSteps(
    steps: TaskPlanStep[],
  ): TaskPlanStep[] {
    const agentStepMap = new Map<string, TaskPlanStep[]>();

    for (const step of steps) {
      const key = step.agentType;
      if (!agentStepMap.has(key)) {
        agentStepMap.set(key, []);
      }
      agentStepMap.get(key)!.push(step);
    }

    const consolidated: TaskPlanStep[] = [];

    for (const [
      agentType,
      agentSteps,
    ] of agentStepMap.entries()) {
      if (agentSteps.length > 1) {
        // Consolidate into single batch step
        consolidated.push({
          id: `consolidated_${agentSteps[0].id}`,
          agentType: this.mapToAgentType(agentType),
          action: 'batch_execute',
          input: {
            tasks: agentSteps.map((s) => ({
              action: s.action,
              input: s.input,
            })),
          },
          dependsOn: [
            ...new Set(
              agentSteps.flatMap(
                (s) => s.dependsOn || [],
              ),
            ),
          ],
          description: `Batch execute ${agentSteps.length} tasks via ${agentType}`,
          onFailure: FallbackStrategy.RETRY,
          estimatedTokens: agentSteps.reduce(
            (sum, s) => sum + (s.estimatedTokens || 300),
            0,
          ) * 0.7, // 30% savings from batching
          estimatedCostUsd: agentSteps.reduce(
            (sum, s) =>
              sum + (s.estimatedCostUsd || 0.0005),
            0,
          ) * 0.7,
          optional: false,
          maxRetries: 3,
        });
      } else {
        consolidated.push(agentSteps[0]);
      }
    }

    return consolidated;
  }

  /**
   * Add validation steps for accuracy optimization
   */
  private static addValidationSteps(
    steps: TaskPlanStep[],
  ): TaskPlanStep[] {
    const withValidation: TaskPlanStep[] = [];

    for (const step of steps) {
      withValidation.push(step);

      // Add validation step for non-orchestrator steps
      if (step.agentType !== AgentType.ORCHESTRATOR) {
        withValidation.push({
          id: `${step.id}_validation`,
          agentType: AgentType.ORCHESTRATOR,
          action: 'validate_output',
          input: {
            originalStep: step.id,
            outputToValidate: `$${step.id}`,
          },
          dependsOn: [step.id],
          description: `Validate output of ${step.id}`,
          onFailure: FallbackStrategy.SKIP,
          optional: true,
          maxRetries: 1,
        });
      }
    }

    return withValidation;
  }

  // ============================================
  // ENHANCEMENT: Plan Validation
  // ============================================

  /**
   * Validate a task plan
   */
  static validatePlan(
    plan: TaskPlan,
    options?: PlanValidationOptions,
  ): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];
    const suggestions: string[] = [];
    const stepIds = new Set<string>();

    // 1. Check for empty plan
    if (plan.steps.length === 0) {
      errors.push('Plan has no steps');
      return {
        valid: false,
        errors,
        warnings,
        info,
        suggestions: ['Add at least one step to the plan'],
      };
    }

    // 2. Check for duplicate step IDs
    for (const step of plan.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // 3. Check for missing dependencies
    for (const step of plan.steps) {
      for (const depId of step.dependsOn) {
        if (
          !stepIds.has(depId) &&
          !plan.steps.some((s) => s.id === depId)
        ) {
          errors.push(
            `Step "${step.id}" depends on non-existent step: ${depId}`,
          );
        }
      }
    }

    // 4. Check for circular dependencies (ENHANCEMENT)
    if (options?.checkCircularDependencies !== false) {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = (stepId: string): boolean => {
        visited.add(stepId);
        recursionStack.add(stepId);

        const step = plan.steps.find((s) => s.id === stepId);
        if (step) {
          for (const depId of step.dependsOn) {
            if (!visited.has(depId)) {
              if (hasCycle(depId)) return true;
            } else if (recursionStack.has(depId)) {
              return true;
            }
          }
        }

        recursionStack.delete(stepId);
        return false;
      };

      for (const step of plan.steps) {
        if (!visited.has(step.id)) {
          if (hasCycle(step.id)) {
            errors.push(
              `Circular dependency detected involving step: ${step.id}`,
            );
            break;
          }
        }
      }
    }

    // 5. Check for self-referencing dependencies
    for (const step of plan.steps) {
      if (step.dependsOn.includes(step.id)) {
        errors.push(
          `Step "${step.id}" depends on itself`,
        );
      }
    }

    // 6. Check for missing agent types
    if (options?.checkAgentAvailability !== false) {
      const validAgentTypes = Object.values(AgentType);
      for (const step of plan.steps) {
        if (!validAgentTypes.includes(step.agentType)) {
          warnings.push(
            `Step "${step.id}" uses unknown agent type: ${step.agentType}`,
          );
        }
      }
    }

    // 7. Check for steps with no action
    for (const step of plan.steps) {
      if (!step.action || step.action.trim().length === 0) {
        warnings.push(
          `Step "${step.id}" has no action defined`,
        );
      }
    }

    // 8. Check timeout feasibility
    if (options?.checkTimeoutFeasibility !== false) {
      const totalTimeout = plan.steps.reduce(
        (sum, s) => sum + (s.timeout || 30000),
        0,
      );
      if (totalTimeout > 300000) {
        // 5 minutes
        warnings.push(
          `Total estimated timeout (${Math.round(totalTimeout / 1000)}s) exceeds recommended maximum (300s)`,
        );
      }
    }

    // 9. Check for orphaned steps (no steps depend on them, not first step)
    if (plan.steps.length > 1) {
      const isDependedOn = new Set<string>();
      for (const step of plan.steps) {
        for (const depId of step.dependsOn) {
          isDependedOn.add(depId);
        }
      }

      for (let i = 1; i < plan.steps.length; i++) {
        if (!isDependedOn.has(plan.steps[i].id)) {
          warnings.push(
            `Step "${plan.steps[i].id}" is not depended on by any other step`,
          );
        }
      }
    }

    // 10. Check for too many sequential steps
    if (plan.mode === ExecutionMode.SEQUENTIAL && plan.steps.length > 5) {
      suggestions.push(
        'Consider parallelizing independent steps for better performance',
      );
    }

    // 11. Check for steps that could be consolidated
    const agentCounts = new Map<AgentType, number>();
    for (const step of plan.steps) {
      agentCounts.set(
        step.agentType,
        (agentCounts.get(step.agentType) || 0) + 1,
      );
    }
    for (const [agent, count] of agentCounts.entries()) {
      if (count >= 3) {
        suggestions.push(
          `Consider consolidating ${count} ${agent} steps into a batch operation`,
        );
      }
    }

    // 12. Check for missing fallback strategies on critical steps
    for (const step of plan.steps) {
      if (
        !step.onFailure &&
        !step.optional &&
        step.dependsOn.length === 0
      ) {
        warnings.push(
          `Critical step "${step.id}" has no failure strategy defined`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Map string to AgentType
   */
  private static mapToAgentType(
    agentString: string,
  ): AgentType {
    const mapping: Record<string, AgentType> = {
      EMAIL: AgentType.EMAIL,
      DRIVE: AgentType.DRIVE,
      CONTENT: AgentType.CONTENT,
      SOCIAL: AgentType.SOCIAL,
      CALENDAR: AgentType.CALENDAR,
      WEB: AgentType.WEB,
      TASK: AgentType.TASK,
      ORCHESTRATOR: AgentType.ORCHESTRATOR,
      email: AgentType.EMAIL,
      drive: AgentType.DRIVE,
      content: AgentType.CONTENT,
      social: AgentType.SOCIAL,
      calendar: AgentType.CALENDAR,
      web: AgentType.WEB,
      task: AgentType.TASK,
      orchestrator: AgentType.ORCHESTRATOR,
    };
    return (
      mapping[agentString.toUpperCase()] ||
      AgentType.ORCHESTRATOR
    );
  }

  /**
   * Get human-readable plan summary
   */
  static getPlanSummary(plan: TaskPlan): string {
    const stepsByAgent: Record<string, number> = {};
    for (const step of plan.steps) {
      stepsByAgent[step.agentType] =
        (stepsByAgent[step.agentType] || 0) + 1;
    }

    const hasFallbacks = plan.steps.some(
      (s) => s.fallback,
    );
    const hasParallel = plan.steps.some(
      (s) => s.parallelGroup,
    );

    return [
      `Plan: ${plan.id.substring(0, 8)}`,
      `Steps: ${plan.steps.length}`,
      `Mode: ${plan.mode}`,
      `Agents: ${Object.entries(stepsByAgent)
        .map(([a, c]) => `${a}(${c})`)
        .join(', ')}`,
      `Fallbacks: ${hasFallbacks ? 'Yes' : 'No'}`,
      `Parallel: ${hasParallel ? 'Yes' : 'No'}`,
      plan.estimatedTokens
        ? `Est. Tokens: ${plan.estimatedTokens}`
        : '',
      plan.estimatedCostUsd
        ? `Est. Cost: $${plan.estimatedCostUsd.toFixed(4)}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }

  /**
   * Estimate the cost of a plan
   */
  static estimatePlanCost(plan: TaskPlan): {
    tokens: number;
    costUsd: number;
    timeMs: number;
  } {
    let tokens = 0;
    let costUsd = 0;
    let timeMs = 0;

    for (const step of plan.steps) {
      const estimate =
        AGENT_COST_ESTIMATES[step.agentType] ||
        AGENT_COST_ESTIMATES[AgentType.ORCHESTRATOR];
      tokens += step.estimatedTokens || estimate.tokens;
      costUsd +=
        step.estimatedCostUsd || estimate.costUsd;

      if (plan.mode === ExecutionMode.PARALLEL) {
        timeMs = Math.max(timeMs, estimate.avgTimeMs);
      } else {
        timeMs += estimate.avgTimeMs;
      }
    }

    return { tokens, costUsd, timeMs };
  }

  /**
   * Create a plan from a simple task description (no intent required)
   */
  static async createPlanFromDescription(
    description: string,
    context: AgentContext,
    options?: PlanningOptions,
  ): Promise<TaskPlan> {
    const intent: IntentResult = {
      primaryIntent: description,
      confidence: 0.5,
      alternativeIntents: [],
      entities: {},
      suggestedAgent: AgentType.ORCHESTRATOR,
      requiresMultipleAgents: false,
      classificationMethod: 'fallback',
    };

    return this.createPlan(intent, context, {
      ...options,
      useAIPlanning: true,
    });
  }

  /**
   * Merge two plans together
   */
  static mergePlans(
    planA: TaskPlan,
    planB: TaskPlan,
  ): TaskPlan {
    // Offset step IDs from plan B
    const offsetSteps = planB.steps.map((step) => ({
      ...step,
      id: `${step.id}_b`,
      dependsOn: step.dependsOn.map(
        (depId) => `${depId}_b`,
      ),
      parallelGroup: step.parallelGroup
        ? `${step.parallelGroup}_b`
        : undefined,
    }));

    const mergedSteps = [...planA.steps, ...offsetSteps];

    return {
      id: uuidv4(),
      steps: mergedSteps,
      mode: ExecutionMode.SEQUENTIAL,
      estimatedTokens:
        (planA.estimatedTokens || 0) +
        (planB.estimatedTokens || 0),
      estimatedCostUsd:
        (planA.estimatedCostUsd || 0) +
        (planB.estimatedCostUsd || 0),
      createdAt: new Date(),
      metadata: {
        mergedFrom: [planA.id, planB.id],
      },
    };
  }
}