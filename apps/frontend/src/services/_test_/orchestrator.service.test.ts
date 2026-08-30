// enterprise-ai-agent-platform/apps/frontend/src/services/__tests__/orchestrator.service.test.ts
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { OrchestratorService, orchestratorService } from '../orchestrator.service';
import { apiClient } from '../../api/client';
import {
  OrchestratorStateType,
  IntentResult,
  TaskPlan,
  ExecutionMode,
  ChainExecutionResult,
  StepExecutionResult,
  ExecutionReflection,
  MemoryType,
  OrchestratorMemoryEntry,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
  AgentDelegationRequest,
  AgentDelegationResult,
  BatchExecutionRequest,
  BatchExecutionResult,
  OrchestratorStreamChunkType,
  FollowUpSuggestion,
  AgentSelection,
  TaskPlanStep,
  ClassificationOptions,
  PlanningOptions,
  ExecutionOptions,
  ExecutionProgress,
  OrchestratorHealthStatus,
  OrchestratorMetrics,
} from '../../types/orchestrator.types';
import { AgentType } from '../../types/agent.types';

// ============================================
// Mock API Client
// ============================================

vi.mock('../../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getAccessToken: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// Mock Data Factories
// ============================================

const createMockIntentResult = (overrides?: Partial<IntentResult>): IntentResult => ({
  primaryIntent: 'send_email',
  confidence: 0.92,
  alternativeIntents: [
    { intent: 'compose_email', confidence: 0.45, description: 'Compose an email' },
    { intent: 'read_email', confidence: 0.31, description: 'Read emails' },
  ],
  entities: {
    to: 'john@example.com',
    subject: 'Hello',
    body: 'This is a test email',
  },
  suggestedAgent: AgentType.EMAIL,
  requiresMultipleAgents: false,
  agentChain: undefined,
  classificationMethod: 'hybrid',
  processingTimeMs: 150,
  isAmbiguous: false,
  complexity: 'simple',
  estimatedExecutionTimeMs: 2000,
  estimatedCostUsd: 0.005,
  ...overrides,
});

const createMockTaskPlanStep = (overrides?: Partial<TaskPlanStep>): TaskPlanStep => ({
  id: 'step_1',
  agentType: AgentType.EMAIL,
  action: 'send_email',
  input: {
    to: 'john@example.com',
    subject: 'Hello',
    body: 'This is a test email',
  },
  dependsOn: [],
  parallelGroup: undefined,
  fallback: undefined,
  retryCount: 0,
  maxRetries: 3,
  timeout: 30000,
  description: 'Send email to john@example.com',
  estimatedCostUsd: 0.005,
  estimatedTokens: 500,
  metadata: {},
  optional: false,
  skip: false,
  timeoutBehavior: 'retry',
  ...overrides,
});

const createMockTaskPlan = (overrides?: Partial<TaskPlan>): TaskPlan => ({
  id: 'plan_123',
  steps: [
    createMockTaskPlanStep({ id: 'step_1' }),
    createMockTaskPlanStep({
      id: 'step_2',
      agentType: AgentType.CALENDAR,
      action: 'create_event',
      input: { title: 'Meeting', start: new Date().toISOString() },
      dependsOn: ['step_1'],
    }),
  ],
  mode: ExecutionMode.SEQUENTIAL,
  estimatedTokens: 1000,
  estimatedCostUsd: 0.01,
  createdAt: new Date(),
  status: 'ready',
  version: 1,
  ...overrides,
});

const createMockStepExecutionResult = (overrides?: Partial<StepExecutionResult>): StepExecutionResult => ({
  stepId: 'step_1',
  agentType: AgentType.EMAIL,
  success: true,
  output: { message: 'Email sent successfully' },
  error: undefined,
  executionTimeMs: 1500,
  tokensUsed: 500,
  costUsd: 0.005,
  retryCount: 0,
  startedAt: new Date(),
  completedAt: new Date(),
  status: 'completed',
  fallbackUsed: false,
  ...overrides,
});

const createMockChainExecutionResult = (overrides?: Partial<ChainExecutionResult>): ChainExecutionResult => ({
  planId: 'plan_123',
  steps: [
    createMockStepExecutionResult({ stepId: 'step_1' }),
    createMockStepExecutionResult({
      stepId: 'step_2',
      agentType: AgentType.CALENDAR,
      output: { message: 'Event created successfully' },
      executionTimeMs: 800,
      tokensUsed: 300,
      costUsd: 0.003,
    }),
  ],
  finalOutput: {
    message: 'All tasks completed successfully',
    results: [],
  },
  totalTimeMs: 2300,
  totalTokensUsed: 800,
  totalCostUsd: 0.008,
  success: true,
  executionMode: ExecutionMode.SEQUENTIAL,
  successfulSteps: 2,
  failedSteps: 0,
  skippedSteps: 0,
  fallbackSteps: [],
  startedAt: new Date(),
  completedAt: new Date(),
  wasCancelled: false,
  ...overrides,
});

const createMockExecutionReflection = (overrides?: Partial<ExecutionReflection>): ExecutionReflection => ({
  summary: 'The execution completed successfully with all steps passing.',
  insights: [
    'Email agent performed efficiently',
    'Calendar agent successfully created the event',
  ],
  improvements: [
    'Consider parallel execution for independent steps',
    'Add fallback for email sending',
  ],
  agentPerformance: {
    email: {
      success: true,
      efficiency: 95,
      reliability: 98,
      averageResponseTimeMs: 1500,
      recommendations: ['Consider batching emails'],
    },
    calendar: {
      success: true,
      efficiency: 90,
      reliability: 95,
      averageResponseTimeMs: 800,
      recommendations: [],
    },
  },
  recommendedNextSteps: [
    'Review sent email',
    'Check calendar event',
  ],
  overallScore: 92,
  successRate: 100,
  timestamp: new Date(),
  generationTimeMs: 500,
  model: 'gpt-4',
  insightsStored: true,
  ...overrides,
});

const createMockMemoryEntry = (overrides?: Partial<OrchestratorMemoryEntry>): OrchestratorMemoryEntry => ({
  id: 'mem_123',
  content: 'User prefers emails sent in the morning',
  createdAt: new Date(),
  updatedAt: new Date(),
  type: MemoryType.LONG_TERM,
  importance: 0.85,
  accessCount: 5,
  source: 'user_input',
  tags: ['preference', 'email'],
  ...overrides,
});

const createMockAgentDelegationResult = (overrides?: Partial<AgentDelegationResult>): AgentDelegationResult => ({
  success: true,
  output: { message: 'Task completed' },
  agentType: AgentType.EMAIL,
  executionTimeMs: 1500,
  tokensUsed: 500,
  costUsd: 0.005,
  retryCount: 0,
  fallbackUsed: false,
  fallbackChain: [AgentType.EMAIL, AgentType.WEB],
  ...overrides,
});

// ============================================
// Test Suite: OrchestratorService
// ============================================

describe('OrchestratorService', () => {
  let service: OrchestratorService;

  beforeEach(() => {
    service = OrchestratorService.getInstance();
    vi.clearAllMocks();
    // Reset config to defaults
    service.resetConfig();
    // Clear any active streams
    service.cancelAllExecutions();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Singleton & Configuration
  // ============================================

  describe('Singleton & Configuration', () => {
    it('should return the same instance', () => {
      const instance1 = OrchestratorService.getInstance();
      const instance2 = OrchestratorService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return default config', () => {
      const config = service.getConfig();
      expect(config).toEqual(DEFAULT_ORCHESTRATOR_CONFIG);
    });

    it('should update config', () => {
      service.updateConfig({ maxStepsPerPlan: 20 });
      const config = service.getConfig();
      expect(config.maxStepsPerPlan).toBe(20);
    });

    it('should reset config to defaults', () => {
      service.updateConfig({ maxStepsPerPlan: 20, defaultModel: 'claude-3' });
      service.resetConfig();
      const config = service.getConfig();
      expect(config.maxStepsPerPlan).toBe(DEFAULT_ORCHESTRATOR_CONFIG.maxStepsPerPlan);
      expect(config.defaultModel).toBe(DEFAULT_ORCHESTRATOR_CONFIG.defaultModel);
    });

    it('should emit config:updated event', () => {
      const callback = vi.fn();
      service.on('config:updated', callback);
      service.updateConfig({ maxStepsPerPlan: 15 });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ maxStepsPerPlan: 15 })
      );
    });

    it('should emit config:reset event', () => {
      const callback = vi.fn();
      service.on('config:reset', callback);
      service.resetConfig();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should remove event listener', () => {
      const callback = vi.fn();
      service.on('config:updated', callback);
      service.off('config:updated', callback);
      service.updateConfig({ maxStepsPerPlan: 25 });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Intent Classification
  // ============================================

  describe('Intent Classification', () => {
    const mockIntent = createMockIntentResult();
    const input = 'Send an email to john@example.com saying hello';

    it('should classify intent successfully', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockIntent,
      });

      const result = await service.classifyIntent(input);
      expect(result).toEqual(mockIntent);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/classify-intent',
        expect.objectContaining({ input })
      );
    });

    it('should use cache for repeated classifications', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockIntent,
      });

      // First call
      await service.classifyIntent(input);
      // Second call - should use cache
      const result = await service.classifyIntent(input);

      expect(result).toEqual(mockIntent);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error on classification failure', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Classification failed',
      });

      await expect(service.classifyIntent(input)).rejects.toThrow('Classification failed');
    });

    it('should emit intent:classified event on success', async () => {
      const callback = vi.fn();
      service.on('intent:classified', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockIntent,
      });

      await service.classifyIntent(input);
      expect(callback).toHaveBeenCalledWith(mockIntent);
    });

    it('should emit intent:error event on failure', async () => {
      const callback = vi.fn();
      service.on('intent:error', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Classification failed',
      });

      await expect(service.classifyIntent(input)).rejects.toThrow();
      expect(callback).toHaveBeenCalled();
    });

    it('should classify intents in batch', async () => {
      const intents = [mockIntent, { ...mockIntent, primaryIntent: 'read_email' }];
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: intents,
      });

      const result = await service.classifyIntentBatch([input, 'Read my emails']);
      expect(result).toEqual(intents);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/classify-intent/batch',
        expect.objectContaining({ inputs: [input, 'Read my emails'] })
      );
    });

    it('should pass classification options', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockIntent,
      });

      const options: ClassificationOptions = {
        confidenceThreshold: 0.8,
        maxAlternatives: 5,
        preferredMethod: 'ai',
      };

      await service.classifyIntent(input, options);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/classify-intent',
        expect.objectContaining({
          options: expect.objectContaining({
            confidenceThreshold: 0.8,
            maxAlternatives: 5,
            preferredMethod: 'ai',
          }),
        })
      );
    });
  });

  // ============================================
  // Plan Management
  // ============================================

  describe('Plan Management', () => {
    const mockIntent = createMockIntentResult();
    const mockPlan = createMockTaskPlan();

    it('should create a plan successfully', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockPlan,
      });

      const result = await service.createPlan(mockIntent);
      expect(result).toEqual(mockPlan);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/create-plan',
        expect.objectContaining({ intent: mockIntent })
      );
    });

    it('should emit plan:created event', async () => {
      const callback = vi.fn();
      service.on('plan:created', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockPlan,
      });

      await service.createPlan(mockIntent);
      expect(callback).toHaveBeenCalledWith(mockPlan);
    });

    it('should throw error on plan creation failure', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Plan creation failed',
      });

      await expect(service.createPlan(mockIntent)).rejects.toThrow('Plan creation failed');
    });

    it('should optimize a plan', async () => {
      const optimizedPlan = {
        ...mockPlan,
        estimatedTokens: 800,
        estimatedCostUsd: 0.008,
        optimization: { originalSteps: 2, optimizedSteps: 2, savingsPercentage: 20, changes: ['Reduced tokens'] },
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: optimizedPlan,
        optimization: optimizedPlan.optimization,
      });

      const result = await service.optimizePlan(mockPlan, 'cost');
      expect(result.optimization).toBeDefined();
      expect(result.optimization?.savingsPercentage).toBe(20);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/optimize-plan',
        expect.objectContaining({ plan: mockPlan, optimizationGoal: 'cost' })
      );
    });

    it('should validate a plan via client-side validation', async () => {
      (apiClient.post as Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.validatePlan(mockPlan);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate step IDs in validation', async () => {
      (apiClient.post as Mock).mockRejectedValueOnce(new Error('Network error'));

      const invalidPlan = {
        ...mockPlan,
        steps: [
          createMockTaskPlanStep({ id: 'step_1' }),
          createMockTaskPlanStep({ id: 'step_1' }), // Duplicate ID
        ],
      };

      const result = await service.validatePlan(invalidPlan);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate step ID: step_1');
    });

    it('should detect self-referencing dependencies', async () => {
      (apiClient.post as Mock).mockRejectedValueOnce(new Error('Network error'));

      const invalidPlan = {
        ...mockPlan,
        steps: [
          createMockTaskPlanStep({ id: 'step_1', dependsOn: ['step_1'] }),
        ],
      };

      const result = await service.validatePlan(invalidPlan);
      expect(result.errors).toContain('Step "step_1" cannot depend on itself');
    });

    it('should suggest parallelization for independent steps', async () => {
      (apiClient.post as Mock).mockRejectedValueOnce(new Error('Network error'));

      const plan = {
        ...mockPlan,
        mode: ExecutionMode.SEQUENTIAL,
        steps: [
          createMockTaskPlanStep({ id: 'step_1', dependsOn: [] }),
          createMockTaskPlanStep({ id: 'step_2', dependsOn: [] }),
        ],
      };

      const result = await service.validatePlan(plan);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions![0]).toContain('parallel execution');
    });

    it('should pass planning options', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockPlan,
      });

      const options: PlanningOptions = {
        maxSteps: 5,
        enableParallelization: false,
        optimizationGoal: 'speed',
      };

      await service.createPlan(mockIntent, options);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/create-plan',
        expect.objectContaining({
          options: expect.objectContaining({
            maxSteps: 5,
            enableParallelization: false,
            optimizationGoal: 'speed',
          }),
        })
      );
    });
  });

  // ============================================
  // Execution
  // ============================================

  describe('Execution', () => {
    const mockPlan = createMockTaskPlan();
    const mockExecution = createMockChainExecutionResult();

    it('should execute a plan successfully', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockExecution,
      });

      const result = await service.executePlan(mockPlan);
      expect(result).toEqual(mockExecution);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/execute-plan',
        expect.objectContaining({ plan: mockPlan })
      );
    });

    it('should emit execution:completed event', async () => {
      const callback = vi.fn();
      service.on('execution:completed', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockExecution,
      });

      await service.executePlan(mockPlan);
      expect(callback).toHaveBeenCalledWith(mockExecution);
    });

    it('should throw error on execution failure', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Execution failed',
      });

      await expect(service.executePlan(mockPlan)).rejects.toThrow('Execution failed');
    });

    it('should emit execution:error event on failure', async () => {
      const callback = vi.fn();
      service.on('execution:error', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Execution failed',
      });

      await expect(service.executePlan(mockPlan)).rejects.toThrow();
      expect(callback).toHaveBeenCalled();
    });

    it('should pass execution options', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockExecution,
      });

      const options: ExecutionOptions = {
        maxRetries: 5,
        stopOnError: true,
        executionId: 'custom-exec-id',
      };

      await service.executePlan(mockPlan, options);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/execute-plan',
        expect.objectContaining({
          options: expect.objectContaining({
            maxRetries: 5,
            stopOnError: true,
            executionId: 'custom-exec-id',
          }),
        })
      );
    });

    it('should get execution progress', async () => {
      const mockProgress: ExecutionProgress = {
        executionId: 'exec_123',
        planId: 'plan_123',
        state: OrchestratorStateType.EXECUTE,
        totalSteps: 2,
        completedSteps: 1,
        failedSteps: 0,
        percentage: 50,
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockProgress,
      });

      const result = await service.getExecutionProgress('exec_123');
      expect(result).toEqual(mockProgress);
      expect(apiClient.get).toHaveBeenCalledWith('/api/agent/executions/exec_123/progress');
    });

    it('should return null when progress fetch fails', async () => {
      (apiClient.get as Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.getExecutionProgress('exec_123');
      expect(result).toBeNull();
    });

    it('should retry a failed step', async () => {
      const retryResult = createMockStepExecutionResult({ executionTimeMs: 2000 });
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: retryResult,
      });

      const result = await service.retryFailedStep('exec_123', 'step_1');
      expect(result).toEqual(retryResult);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/executions/exec_123/steps/step_1/retry'
      );
    });
  });

  // ============================================
  // Stream Execution
  // ============================================

  describe('Stream Execution', () => {
    const mockPlan = createMockTaskPlan();

    it('should handle stream execution with callbacks', async () => {
      // Mock fetch for streaming
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"thinking","content":"Processing...","timestamp":"2024-01-01T00:00:00Z"}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: {"type":"step_started","content":"Starting step","timestamp":"2024-01-01T00:00:00Z","metadata":{"stepId":"step_1","agentType":"email"}}\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: [DONE]\n'),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const callbacks = {
        onChunk: vi.fn(),
        onStepStart: vi.fn(),
        onError: vi.fn(),
        onComplete: vi.fn(),
      };

      const controller = await service.executePlanStream(mockPlan, callbacks);
      expect(controller).toBeDefined();
      expect(controller.isStreaming).toBeTypeOf('function');

      // Wait for stream processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callbacks.onChunk).toHaveBeenCalled();
      expect(callbacks.onStepStart).toHaveBeenCalledWith('step_1', 'email');
    });

    it('should handle stream abort', async () => {
      const abortController = new AbortController();

      const mockReader = {
        read: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

      const callbacks = {
        onChunk: vi.fn(),
        onError: vi.fn(),
      };

      const controller = await service.executePlanStream(mockPlan, callbacks);
      
      // Abort the stream
      controller.abort();

      expect(callbacks.onError).toHaveBeenCalledWith('Execution cancelled by user');
    });

    it('should handle stream errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const callbacks = {
        onChunk: vi.fn(),
        onError: vi.fn(),
      };

      await expect(
        service.executePlanStream(mockPlan, callbacks)
      ).rejects.toThrow('Network error');
    });

    it('should cancel execution by ID', () => {
      service.cancelExecution('non-existent-id');
      expect(service.getActiveStreamCount()).toBe(0);
    });

    it('should cancel all executions', async () => {
      const abortController = new AbortController();
      const mockReader = {
        read: vi.fn().mockImplementation(() => new Promise(() => {})),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      // Start a stream
      service.executePlanStream(mockPlan, {}).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cancelled = service.cancelAllExecutions();
      expect(cancelled).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Agent Management
  // ============================================

  describe('Agent Management', () => {
    it('should get available agents', async () => {
      const mockAgents = [
        { type: 'email', name: 'Email Agent', description: 'Email agent', version: '1.0', status: 'idle', tools: [], metrics: {} },
        { type: 'calendar', name: 'Calendar Agent', description: 'Calendar agent', version: '1.0', status: 'idle', tools: [], metrics: {} },
      ];

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockAgents,
      });

      const result = await service.getAvailableAgents();
      expect(result).toEqual(mockAgents);
      expect(apiClient.get).toHaveBeenCalledWith('/api/agent/agents', expect.any(Object));
    });

    it('should match agent for task', async () => {
      const mockMatch = {
        agentType: AgentType.EMAIL,
        confidence: 0.95,
        rationale: 'Best match for email tasks',
        alternatives: [AgentType.WEB],
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockMatch,
      });

      const result = await service.matchAgentForTask('Send an email');
      expect(result).toEqual(mockMatch);
    });

    it('should delegate to agent', async () => {
      const mockResult = createMockAgentDelegationResult();
      const request: AgentDelegationRequest = {
        agentType: AgentType.EMAIL,
        task: 'Send an email to john@example.com',
        priority: 1,
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      const result = await service.delegateToAgent(request);
      expect(result).toEqual(mockResult);
      expect(apiClient.post).toHaveBeenCalledWith('/api/agent/delegate', request);
    });

    it('should emit delegate:completed event', async () => {
      const callback = vi.fn();
      service.on('delegate:completed', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: createMockAgentDelegationResult(),
      });

      await service.delegateToAgent({
        agentType: AgentType.EMAIL,
        task: 'Test',
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  // ============================================
  // Batch Execution
  // ============================================

  describe('Batch Execution', () => {
    it('should execute batch successfully', async () => {
      const mockBatchResult: BatchExecutionResult = {
        results: [
          { requestId: 'req_1', output: { success: true }, success: true, executionTimeMs: 1000, tokensUsed: 500, costUsd: 0.005 },
          { requestId: 'req_2', output: { success: true }, success: true, executionTimeMs: 800, tokensUsed: 300, costUsd: 0.003 },
        ],
        totalRequests: 2,
        successfulRequests: 2,
        failedRequests: 0,
        totalTimeMs: 1800,
        totalTokensUsed: 800,
        totalCostUsd: 0.008,
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockBatchResult,
      });

      const request: BatchExecutionRequest = {
        requests: [
          { id: 'req_1', input: 'Send email' },
          { id: 'req_2', input: 'Create event' },
        ],
        maxConcurrent: 3,
      };

      const result = await service.executeBatch(request);
      expect(result).toEqual(mockBatchResult);
    });

    it('should emit batch:completed event', async () => {
      const callback = vi.fn();
      service.on('batch:completed', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: {
          results: [],
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalTimeMs: 0,
          totalTokensUsed: 0,
          totalCostUsd: 0,
        },
      });

      await service.executeBatch({ requests: [] });
      expect(callback).toHaveBeenCalled();
    });
  });

  // ============================================
  // Reflection & Analysis
  // ============================================

  describe('Reflection & Analysis', () => {
    const mockExecution = createMockChainExecutionResult();
    const mockReflection = createMockExecutionReflection();

    it('should generate reflection successfully', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockReflection,
      });

      const result = await service.generateReflection(mockExecution);
      expect(result).toEqual(mockReflection);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/reflect',
        expect.objectContaining({ executionResults: mockExecution })
      );
    });

    it('should emit reflection:generated event', async () => {
      const callback = vi.fn();
      service.on('reflection:generated', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockReflection,
      });

      await service.generateReflection(mockExecution);
      expect(callback).toHaveBeenCalledWith(mockReflection);
    });

    it('should get reflection history', async () => {
      const mockHistory = [
        {
          id: 'ref_1',
          executionId: 'exec_1',
          reflection: mockReflection,
          createdAt: new Date().toISOString(),
        },
      ];

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockHistory,
      });

      const result = await service.getReflectionHistory();
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('should suggest follow-ups', async () => {
      const mockFollowUps: FollowUpSuggestion[] = [
        {
          action: 'Review results',
          description: 'Check the execution output',
          agentType: AgentType.ORCHESTRATOR,
          confidence: 0.9,
          expectedBenefit: 'Ensure quality',
        },
      ];

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockFollowUps,
      });

      const result = await service.suggestFollowUps(mockExecution);
      expect(result).toEqual(mockFollowUps);
    });

    it('should submit reflection feedback', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({ success: true });

      const result = await service.submitReflectionFeedback({
        reflectionId: 'ref_1',
        helpful: true,
        helpfulInsights: ['Good analysis'],
        comments: 'Great reflection',
        suggestedImprovements: [],
        timestamp: new Date(),
      });

      expect(result).toBe(true);
    });
  });

  // ============================================
  // Memory Management
  // ============================================

  describe('Memory Management', () => {
    const mockMemory = createMockMemoryEntry();

    it('should store memory', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockMemory,
      });

      const result = await service.storeMemory('Test content', MemoryType.LONG_TERM, 0.8);
      expect(result).toBeDefined();
      expect(result.content).toBe('User prefers emails sent in the morning');
    });

    it('should emit memory:stored event', async () => {
      const callback = vi.fn();
      service.on('memory:stored', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockMemory,
      });

      await service.storeMemory('Test', MemoryType.SHORT_TERM, 0.5);
      expect(callback).toHaveBeenCalled();
    });

    it('should retrieve memories', async () => {
      const mockResult = {
        memories: [mockMemory],
        query: 'user preferences',
        totalFound: 1,
        retrievalTimeMs: 50,
        usedVectorSearch: true,
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      const result = await service.retrieveMemories('user preferences');
      expect(result).toEqual(mockResult);
    });

    it('should delete memory', async () => {
      (apiClient.delete as Mock).mockResolvedValueOnce({ success: true });

      const result = await service.deleteMemory('mem_123');
      expect(result).toBe(true);
    });

    it('should handle delete failure', async () => {
      (apiClient.delete as Mock).mockRejectedValueOnce(new Error('Not found'));

      const result = await service.deleteMemory('mem_999');
      expect(result).toBe(false);
    });

    it('should clear memories', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({ success: true });

      const result = await service.clearMemories(MemoryType.SHORT_TERM);
      expect(result).toBe(true);
    });

    it('should consolidate memories', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: { consolidated: 5 },
      });

      const result = await service.consolidateMemories();
      expect(result).toBe(5);
    });

    it('should get memory stats', async () => {
      const mockStats = {
        totalMemories: 100,
        shortTermCount: 50,
        longTermCount: 30,
        averageImportance: 0.7,
      };

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      const result = await service.getMemoryStats();
      expect(result).toEqual(mockStats);
    });

    it('should return default stats on failure', async () => {
      (apiClient.get as Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await service.getMemoryStats();
      expect(result).toEqual({
        totalMemories: 0,
        shortTermCount: 0,
        longTermCount: 0,
        averageImportance: 0,
      });
    });
  });

  // ============================================
  // Session Management
  // ============================================

  describe('Session Management', () => {
    it('should create session', async () => {
      const mockSession = {
        id: 'session_123',
        userId: 'user_1',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        messageCount: 0,
        context: {},
        messageHistory: [],
        isActive: true,
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await service.createSession('user_1');
      expect(result).toEqual(mockSession);
    });

    it('should get session', async () => {
      const mockSession = {
        id: 'session_123',
        userId: 'user_1',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        messageCount: 5,
        context: {},
        messageHistory: [],
        isActive: true,
      };

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await service.getSession('session_123');
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      (apiClient.get as Mock).mockResolvedValueOnce({
        success: false,
        error: 'Not found',
      });

      const result = await service.getSession('non-existent');
      expect(result).toBeNull();
    });

    it('should get user sessions', async () => {
      const mockSessions = [
        { id: 'session_1', userId: 'user_1', startedAt: new Date(), lastActivityAt: new Date(), messageCount: 1, context: {}, messageHistory: [], isActive: true },
        { id: 'session_2', userId: 'user_1', startedAt: new Date(), lastActivityAt: new Date(), messageCount: 3, context: {}, messageHistory: [], isActive: true },
      ];

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockSessions,
      });

      const result = await service.getUserSessions('user_1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no sessions', async () => {
      (apiClient.get as Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await service.getUserSessions();
      expect(result).toEqual([]);
    });

    it('should end session', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({ success: true });

      const result = await service.endSession('session_123');
      expect(result).toBe(true);
    });

    it('should export session', async () => {
      const mockData = { id: 'session_123', messages: [] };
      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockData,
      });

      const result = await service.exportSession('session_123');
      expect(result).toEqual(mockData);
    });

    it('should return null on export failure', async () => {
      (apiClient.get as Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await service.exportSession('session_123');
      expect(result).toBeNull();
    });

    it('should import session', async () => {
      const mockSession = {
        id: 'imported_session',
        userId: 'user_1',
        startedAt: new Date(),
        lastActivityAt: new Date(),
        messageCount: 10,
        context: {},
        messageHistory: [],
        isActive: true,
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockSession,
      });

      const result = await service.importSession({ id: 'imported_session', messages: [] });
      expect(result).toEqual(mockSession);
    });
  });

  // ============================================
  // AI Text Generation
  // ============================================

  describe('AI Text Generation', () => {
    it('should generate text', async () => {
      const mockResult = {
        content: 'Generated text content',
        model: 'gpt-4',
        provider: 'openai',
        tokensUsed: 100,
        costUsd: 0.001,
      };

      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockResult,
      });

      const result = await service.generateText('Hello world');
      expect(result).toEqual(mockResult);
    });

    it('should generate text with options', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: { content: 'Hello', model: 'gpt-4', provider: 'openai', tokensUsed: 10, costUsd: 0.0001 },
      });

      await service.generateText('Hello', {
        systemPrompt: 'Be helpful',
        temperature: 0.5,
        maxTokens: 100,
        preferredProvider: 'openai',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/agent/generate-text',
        expect.objectContaining({
          prompt: 'Hello',
          options: expect.objectContaining({
            systemPrompt: 'Be helpful',
            temperature: 0.5,
            maxTokens: 100,
          }),
        })
      );
    });
  });

  // ============================================
  // Feedback
  // ============================================

  describe('Feedback', () => {
    it('should submit feedback', async () => {
      (apiClient.post as Mock).mockResolvedValueOnce({ success: true });

      const result = await service.submitFeedback({
        messageId: 'msg_1',
        rating: 'positive',
        timestamp: new Date(),
      });

      expect(result).toBe(true);
    });

    it('should emit feedback:submitted event', async () => {
      const callback = vi.fn();
      service.on('feedback:submitted', callback);

      (apiClient.post as Mock).mockResolvedValueOnce({ success: true });

      const feedback = { messageId: 'msg_1', rating: 'positive' as const, timestamp: new Date() };
      await service.submitFeedback(feedback);
      expect(callback).toHaveBeenCalledWith(feedback);
    });

    it('should return false on feedback failure', async () => {
      (apiClient.post as Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await service.submitFeedback({
        messageId: 'msg_1',
        rating: 'positive',
        timestamp: new Date(),
      });

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Health & Monitoring
  // ============================================

  describe('Health & Monitoring', () => {
    it('should get health status', async () => {
      const mockHealth: OrchestratorHealthStatus = {
        state: OrchestratorStateType.IDLE,
        isHealthy: true,
        currentLoad: 0.5,
        queueLength: 10,
        activeExecutions: 2,
        waitingExecutions: 0,
        metrics: {} as OrchestratorMetrics,
        lastHeartbeat: new Date(),
        uptime: 3600,
        version: '1.0.0',
      };

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockHealth,
      });

      const result = await service.getHealth();
      expect(result).toEqual(mockHealth);
    });

    it('should get metrics', async () => {
      const mockMetrics: OrchestratorMetrics = {
        totalExecutions: 100,
        successfulExecutions: 95,
        failedExecutions: 5,
        averageExecutionTimeMs: 2000,
        p95ExecutionTimeMs: 5000,
        p99ExecutionTimeMs: 10000,
        totalTokensUsed: 500000,
        totalCostUsd: 5.0,
        averageStepsPerExecution: 3,
        averageAgentsPerExecution: 2,
        fallbackUsageRate: 0.05,
        classificationAccuracy: 0.92,
        optimizationSavingsUsd: 1.0,
        memoryHitRate: 0.85,
        errorRateByState: {},
        agentUsageDistribution: {},
        modelUsageDistribution: {},
      };

      (apiClient.get as Mock).mockResolvedValueOnce({
        success: true,
        data: mockMetrics,
      });

      const result = await service.getMetrics();
      expect(result).toEqual(mockMetrics);
    });

    it('should report healthy when active streams are within limits', () => {
      expect(service.isHealthy()).toBe(true);
    });

    it('should return active stream count', () => {
      expect(service.getActiveStreamCount()).toBe(0);
    });
  });

  // ============================================
  // Cache Management
  // ============================================

  describe('Cache Management', () => {
    it('should clear all cache', () => {
      // First store something in cache
      const mockIntent = createMockIntentResult();
      (apiClient.post as Mock).mockResolvedValueOnce({
        success: true,
        data: mockIntent,
      });

      // Access private method through service for testing
      service.clearCache();
      // Cache should be cleared without error
    });

    it('should clear cache by prefix', () => {
      service.clearCache('intent');
      // Should not throw
    });
  });

  // ============================================
  // Shutdown
  // ============================================

  describe('Shutdown', () => {
    it('should shut down gracefully', () => {
      // Should not throw
      expect(() => service.shutdown()).not.toThrow();
    });

    it('should cancel all active streams on shutdown', () => {
      const cancelSpy = vi.spyOn(service, 'cancelAllExecutions');
      service.shutdown();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
