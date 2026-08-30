// enterprise-ai-agent-platform/apps/frontend/src/store/__tests__/orchestrator.store.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOrchestratorStore } from '../orchestrator.store';
import { apiClient } from '../../api/client';
import {
  OrchestratorStateType,
  IntentResult,
  TaskPlan,
  ExecutionMode,
  ChainExecutionResult,
  ExecutionReflection,
  MemoryType,
  AgentSelection,
  AgentDelegationRequest,
  AgentDelegationResult,
  BatchExecutionRequest,
  BatchExecutionResult,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
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
// Mock Data
// ============================================

const mockIntentResult: IntentResult = {
  primaryIntent: 'send_email',
  confidence: 0.92,
  alternativeIntents: [
    { intent: 'compose_email', confidence: 0.45, description: 'Compose an email' },
  ],
  entities: { to: 'john@example.com', subject: 'Hello' },
  suggestedAgent: AgentType.EMAIL,
  requiresMultipleAgents: false,
  classificationMethod: 'hybrid',
  processingTimeMs: 150,
  complexity: 'simple',
  estimatedExecutionTimeMs: 2000,
  estimatedCostUsd: 0.005,
};

const mockTaskPlan: TaskPlan = {
  id: 'plan_test_123',
  steps: [
    {
      id: 'step_1',
      agentType: AgentType.EMAIL,
      action: 'send_email',
      input: { to: 'john@example.com', subject: 'Hello' },
      dependsOn: [],
      retryCount: 0,
      maxRetries: 3,
      timeout: 30000,
    },
    {
      id: 'step_2',
      agentType: AgentType.CALENDAR,
      action: 'create_event',
      input: { title: 'Meeting' },
      dependsOn: ['step_1'],
      retryCount: 0,
      maxRetries: 3,
      timeout: 30000,
    },
  ],
  mode: ExecutionMode.SEQUENTIAL,
  estimatedTokens: 1000,
  estimatedCostUsd: 0.01,
  createdAt: new Date(),
  status: 'ready',
};

const mockChainExecutionResult: ChainExecutionResult = {
  planId: 'plan_test_123',
  steps: [
    {
      stepId: 'step_1',
      agentType: AgentType.EMAIL,
      success: true,
      output: { message: 'Email sent successfully' },
      executionTimeMs: 1500,
      tokensUsed: 500,
      costUsd: 0.005,
      retryCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      status: 'completed',
      fallbackUsed: false,
    },
    {
      stepId: 'step_2',
      agentType: AgentType.CALENDAR,
      success: true,
      output: { message: 'Event created successfully' },
      executionTimeMs: 800,
      tokensUsed: 300,
      costUsd: 0.003,
      retryCount: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      status: 'completed',
      fallbackUsed: false,
    },
  ],
  finalOutput: { message: 'All tasks completed successfully' },
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
};

const mockExecutionReflection: ExecutionReflection = {
  summary: 'The execution completed successfully with all steps passing.',
  insights: ['Email agent performed efficiently', 'Calendar agent successfully created the event'],
  improvements: ['Consider parallel execution for independent steps'],
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
  recommendedNextSteps: ['Review sent email', 'Check calendar event'],
  overallScore: 92,
  successRate: 100,
  timestamp: new Date(),
  generationTimeMs: 500,
  model: 'gpt-4',
  insightsStored: true,
};

// ============================================
// Helper to get fresh store state
// ============================================

const getStore = () => useOrchestratorStore.getState();

// ============================================
// Tests
// ============================================

describe('Orchestrator Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    act(() => {
      useOrchestratorStore.getState().resetStore();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Initial State
  // ============================================

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = getStore();
      expect(state.currentState).toBe('idle');
      expect(state.currentSessionId).toBeNull();
      expect(state.sessions).toHaveLength(0);
      expect(state.chatMessages).toHaveLength(0);
      expect(state.currentIntent).toBeNull();
      expect(state.currentPlan).toBeNull();
      expect(state.currentExecution).toBeNull();
      expect(state.currentReflection).toBeNull();
    });

    it('should have default configuration', () => {
      const state = getStore();
      expect(state.config).toEqual(DEFAULT_ORCHESTRATOR_CONFIG);
    });

    it('should have empty memory stats', () => {
      const state = getStore();
      expect(state.memoryStats).toBeNull();
      expect(state.memories).toHaveLength(0);
    });
  });

  // ============================================
  // Session Management
  // ============================================

  describe('Session Management', () => {
    it('should create a new session', () => {
      act(() => {
        getStore().createNewSession();
      });

      const state = getStore();
      expect(state.sessions).toHaveLength(1);
      expect(state.currentSessionId).toBeDefined();
      expect(state.currentState).toBe('idle');
      expect(state.chatMessages).toHaveLength(0);
    });

    it('should update session history on create', () => {
      act(() => {
        getStore().createNewSession();
      });

      const state = getStore();
      expect(state.sessionHistory).toHaveLength(1);
      expect(state.sessionHistory[0].title).toBeDefined();
    });

    it('should select an existing session', () => {
      act(() => {
        getStore().createNewSession();
      });

      const firstSessionId = getStore().currentSessionId;

      act(() => {
        getStore().createNewSession();
      });

      // Select the first session
      act(() => {
        getStore().selectSession(firstSessionId!);
      });

      expect(getStore().currentSessionId).toBe(firstSessionId);
    });

    it('should delete a session', () => {
      act(() => {
        getStore().createNewSession();
      });

      const sessionId = getStore().currentSessionId!;

      act(() => {
        getStore().deleteSession(sessionId);
      });

      expect(getStore().sessions).toHaveLength(0);
      expect(getStore().currentSessionId).toBeNull();
    });

    it('should delete session and reset if it was current', () => {
      act(() => {
        getStore().createNewSession();
      });

      const sessionId = getStore().currentSessionId!;

      act(() => {
        getStore().deleteSession(sessionId);
      });

      expect(getStore().currentSessionId).toBeNull();
      expect(getStore().chatMessages).toBeDefined();
    });

    it('should rename a session', () => {
      act(() => {
        getStore().createNewSession();
      });

      const sessionId = getStore().currentSessionId!;

      act(() => {
        getStore().renameSession(sessionId, 'My Custom Session');
      });

      const session = getStore().sessions.find(s => s.id === sessionId);
      expect(session?.title).toBe('My Custom Session');
    });
  });

  // ============================================
  // Chat Actions
  // ============================================

  describe('Chat Actions', () => {
    beforeEach(() => {
      act(() => {
        getStore().createNewSession();
      });
    });

    it('should send a message and process response', async () => {
      const mockResponse = {
        success: true,
        data: {
          output: { message: 'I will help you send that email!' },
          metadata: {
            tokensUsed: 150,
            costUsd: 0.0015,
            processingTimeMs: 2000,
            model: 'gpt-4',
            intent: mockIntentResult,
          },
        },
      };

      (apiClient.post as any).mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await getStore().sendMessage('Send an email to john@example.com');
      });

      const state = getStore();
      expect(state.chatMessages.length).toBeGreaterThanOrEqual(2);
      expect(state.chatMessages[0].role).toBe('user');
      expect(state.chatMessages[0].content).toBe('Send an email to john@example.com');
      expect(state.streamingStatus).toBe('complete');
      expect(state.currentState).toBe('respond');
    });

    it('should handle send message error', async () => {
      (apiClient.post as any).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await getStore().sendMessage('Test message');
      });

      const state = getStore();
      expect(state.chatMessages.some(m => m.role === 'error')).toBe(true);
      expect(state.streamingStatus).toBe('error');
      expect(state.error).toBeDefined();
    });

    it('should clear current chat', () => {
      act(() => {
        getStore().clearCurrentChat();
      });

      expect(getStore().chatMessages).toHaveLength(0);
      expect(getStore().currentIntent).toBeNull();
      expect(getStore().currentPlan).toBeNull();
      expect(getStore().streamingStatus).toBe('idle');
    });

    it('should stop streaming', () => {
      act(() => {
        getStore().stopStreaming();
      });

      expect(getStore().streamingStatus).toBe('cancelled');
    });

    it('should edit a message', () => {
      // Add message first
      act(() => {
        const state = getStore();
        state.chatMessages.push({
          id: 'msg_1',
          role: 'user',
          content: 'Original content',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        });
      });

      act(() => {
        getStore().editMessage('msg_1', 'Edited content');
      });

      const message = getStore().chatMessages.find(m => m.id === 'msg_1');
      expect(message?.content).toBe('Edited content');
      expect(message?.edited).toBe(true);
    });

    it('should delete a message', () => {
      act(() => {
        const state = getStore();
        state.chatMessages.push({
          id: 'msg_to_delete',
          role: 'user',
          content: 'Delete me',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        });
      });

      act(() => {
        getStore().deleteMessage('msg_to_delete');
      });

      expect(getStore().chatMessages.find(m => m.id === 'msg_to_delete')).toBeUndefined();
    });

    it('should star a message', () => {
      act(() => {
        const state = getStore();
        state.chatMessages.push({
          id: 'msg_star',
          role: 'orchestrator',
          content: 'Important response',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
          starred: false,
        });
      });

      act(() => {
        getStore().starMessage('msg_star');
      });

      const message = getStore().chatMessages.find(m => m.id === 'msg_star');
      expect(message?.starred).toBe(true);

      act(() => {
        getStore().starMessage('msg_star');
      });

      expect(getStore().chatMessages.find(m => m.id === 'msg_star')?.starred).toBe(false);
    });
  });

  // ============================================
  // Intent Classification
  // ============================================

  describe('Intent Classification', () => {
    it('should classify intent successfully', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: mockIntentResult,
      });

      let result: IntentResult | null = null;
      await act(async () => {
        result = await getStore().classifyIntent('Send an email to john@example.com');
      });

      expect(result).toEqual(mockIntentResult);
      expect(getStore().currentIntent).toEqual(mockIntentResult);
      expect(getStore().intentHistory).toHaveLength(1);
      expect(getStore().currentState).toBe('intent_parse');
    });

    it('should handle classification error', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: false,
        error: 'Classification failed',
      });

      let result: IntentResult | null = null;
      await act(async () => {
        result = await getStore().classifyIntent('test');
      });

      expect(result).toBeNull();
      expect(getStore().intentError).toBeDefined();
      expect(getStore().currentState).toBe('error');
    });

    it('should confirm an intent', () => {
      act(() => {
        getStore().setCurrentIntent(mockIntentResult);
        getStore().confirmIntent(mockIntentResult);
      });

      expect(getStore().currentState).toBe('plan');
    });

    it('should reject an intent', () => {
      act(() => {
        getStore().setCurrentIntent(mockIntentResult);
        getStore().rejectIntent(mockIntentResult);
      });

      expect(getStore().currentIntent).toBeNull();
      expect(getStore().currentState).toBe('idle');
    });
  });

  // ============================================
  // Plan Management
  // ============================================

  describe('Plan Management', () => {
    it('should create a plan successfully', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: mockTaskPlan,
      });

      let result: TaskPlan | null = null;
      await act(async () => {
        result = await getStore().createPlan(mockIntentResult);
      });

      expect(result).toEqual(mockTaskPlan);
      expect(getStore().currentPlan).toEqual(mockTaskPlan);
      expect(getStore().currentState).toBe('plan');
    });

    it('should handle plan creation error', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: false,
        error: 'Plan creation failed',
      });

      let result: TaskPlan | null = null;
      await act(async () => {
        result = await getStore().createPlan(mockIntentResult);
      });

      expect(result).toBeNull();
      expect(getStore().planError).toBeDefined();
      expect(getStore().currentState).toBe('error');
    });

    it('should optimize a plan', async () => {
      const optimizedPlan = {
        ...mockTaskPlan,
        estimatedTokens: 800,
        optimization: {
          originalSteps: 2,
          optimizedSteps: 1,
          savingsPercentage: 20,
          changes: ['Consolidated steps'],
        },
      };

      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: optimizedPlan,
      });

      let result: TaskPlan | null = null;
      await act(async () => {
        result = await getStore().optimizePlan(mockTaskPlan);
      });

      expect(result).toBeDefined();
      expect(getStore().currentPlan).toBeDefined();
    });

    it('should validate a plan', () => {
      act(() => {
        getStore().validatePlan(mockTaskPlan);
      });

      const validation = getStore().planValidation;
      expect(validation).toBeDefined();
      expect(validation?.valid).toBe(true);
    });

    it('should add a plan step', () => {
      act(() => {
        getStore().setCurrentPlan(mockTaskPlan);
        getStore().addPlanStep({
          id: 'step_3',
          agentType: AgentType.WEB,
          action: 'search',
          input: { query: 'test' },
          dependsOn: [],
          retryCount: 0,
          maxRetries: 3,
          timeout: 30000,
        });
      });

      expect(getStore().currentPlan?.steps).toHaveLength(3);
    });

    it('should remove a plan step', () => {
      act(() => {
        getStore().setCurrentPlan(mockTaskPlan);
        getStore().removePlanStep('step_1');
      });

      expect(getStore().currentPlan?.steps).toHaveLength(1);
      // Check that dependencies are cleaned up
      const remainingStep = getStore().currentPlan?.steps[0];
      expect(remainingStep?.dependsOn).not.toContain('step_1');
    });

    it('should update a plan step', () => {
      act(() => {
        getStore().setCurrentPlan(mockTaskPlan);
        getStore().updatePlanStep('step_1', {
          timeout: 60000,
          maxRetries: 5,
        });
      });

      const step = getStore().currentPlan?.steps.find(s => s.id === 'step_1');
      expect(step?.timeout).toBe(60000);
      expect(step?.maxRetries).toBe(5);
    });

    it('should reorder plan steps', () => {
      act(() => {
        getStore().setCurrentPlan(mockTaskPlan);
        getStore().reorderPlanSteps(['step_2', 'step_1']);
      });

      const steps = getStore().currentPlan?.steps;
      expect(steps?.[0].id).toBe('step_2');
      expect(steps?.[1].id).toBe('step_1');
    });
  });

  // ============================================
  // Execution
  // ============================================

  describe('Execution', () => {
    it('should execute a plan successfully', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: mockChainExecutionResult,
      });

      let result: ChainExecutionResult | null = null;
      await act(async () => {
        result = await getStore().executePlan(mockTaskPlan);
      });

      expect(result).toEqual(mockChainExecutionResult);
      expect(getStore().currentExecution).toEqual(mockChainExecutionResult);
      expect(getStore().executionTimeline).toHaveLength(2);
      expect(getStore().executionProgress?.progress).toBe(100);
      expect(getStore().currentState).toBe('respond');
    });

    it('should handle execution failure', async () => {
      const failedExecution = {
        ...mockChainExecutionResult,
        success: false,
        error: 'Step 2 failed',
        steps: [
          mockChainExecutionResult.steps[0],
          { ...mockChainExecutionResult.steps[1], success: false, error: 'Step 2 failed' },
        ],
      };

      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: failedExecution,
      });

      let result: ChainExecutionResult | null = null;
      await act(async () => {
        result = await getStore().executePlan(mockTaskPlan);
      });

      expect(result?.success).toBe(false);
      expect(getStore().currentState).toBe('reflect');
    });

    it('should cancel execution', () => {
      act(() => {
        getStore().cancelExecution();
      });

      expect(getStore().currentState).toBe('idle');
      expect(getStore().executionProgress).toBeNull();
    });

    it('should retry execution', () => {
      act(() => {
        getStore().setCurrentPlan(mockTaskPlan);
      });

      // Mock the executePlan call
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: mockChainExecutionResult,
      });

      act(() => {
        getStore().retryExecution();
      });

      expect(getStore().currentState).toBe('execute');
    });
  });

  // ============================================
  // Reflection
  // ============================================

  describe('Reflection', () => {
    it('should generate reflection successfully', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: mockExecutionReflection,
      });

      let result: ExecutionReflection | null = null;
      await act(async () => {
        result = await getStore().generateReflection(mockChainExecutionResult);
      });

      expect(result).toEqual(mockExecutionReflection);
      expect(getStore().currentReflection).toEqual(mockExecutionReflection);
      expect(getStore().reflectionHistory).toHaveLength(1);
      expect(getStore().currentState).toBe('respond');
    });

    it('should handle reflection error', async () => {
      (apiClient.post as any).mockRejectedValueOnce(new Error('Reflection failed'));

      let result: ExecutionReflection | null = null;
      await act(async () => {
        result = await getStore().generateReflection(mockChainExecutionResult);
      });

      expect(result).toBeNull();
      expect(getStore().reflectionError).toBeDefined();
      expect(getStore().currentState).toBe('error');
    });
  });

  // ============================================
  // Memory Management
  // ============================================

  describe('Memory Management', () => {
    it('should store a memory', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
        data: { id: 'mem_new_1' },
      });

      await act(async () => {
        await getStore().storeMemory('Test memory content', MemoryType.SHORT_TERM, 0.5);
      });

      expect(getStore().memories).toHaveLength(1);
      expect(getStore().memories[0].content).toBe('Test memory content');
    });

    it('should fetch memories', async () => {
      const mockMemories = [
        {
          id: 'mem_1',
          content: 'User prefers short emails',
          type: MemoryType.LONG_TERM,
          importance: 0.8,
          timestamp: new Date().toISOString(),
          accessCount: 3,
          source: 'user_input',
          tags: ['preference', 'email'],
        },
      ];

      (apiClient.get as any).mockResolvedValueOnce({
        success: true,
        data: { memories: mockMemories },
      });

      await act(async () => {
        await getStore().fetchMemories();
      });

      expect(getStore().memories).toHaveLength(1);
    });

    it('should delete a memory', async () => {
      // Add a memory first
      act(() => {
        getStore().memories.push({
          id: 'mem_to_delete',
          content: 'Delete me',
          type: MemoryType.SHORT_TERM,
          importance: 0.5,
          timestamp: new Date(),
          accessCount: 0,
        });
      });

      (apiClient.delete as any).mockResolvedValueOnce({ success: true });

      await act(async () => {
        await getStore().deleteMemory('mem_to_delete');
      });

      expect(getStore().memories.find(m => m.id === 'mem_to_delete')).toBeUndefined();
    });

    it('should clear memories', async () => {
      (apiClient.delete as any).mockResolvedValueOnce({ success: true });

      await act(async () => {
        await getStore().clearMemories(MemoryType.SHORT_TERM);
      });
    });

    it('should consolidate memories', async () => {
      (apiClient.post as any).mockResolvedValueOnce({
        success: true,
      });

      await act(async () => {
        getStore().fetchMemories = vi.fn();
        getStore().getMemoryStats = vi.fn();
        await getStore().consolidateMemories();
      });
    });

    it('should get memory stats', async () => {
      const mockStats = {
        totalMemories: 50,
        shortTermCount: 20,
        longTermCount: 25,
        averageImportance: 0.7,
      };

      (apiClient.get as any).mockResolvedValueOnce({
        success: true,
        data: mockStats,
      });

      await act(async () => {
        await getStore().getMemoryStats();
      });

      expect(getStore().memoryStats).toEqual(mockStats);
    });
  });

  // ============================================
  // State Management
  // ============================================

  describe('State Management', () => {
    it('should set current state', () => {
      act(() => {
        getStore().setCurrentState('intent_parse' as OrchestratorStateType);
      });

      expect(getStore().currentState).toBe('intent_parse');
    });

    it('should set current intent and update session', () => {
      act(() => {
        getStore().createNewSession();
        getStore().setCurrentIntent(mockIntentResult);
      });

      expect(getStore().currentIntent).toEqual(mockIntentResult);

      const session = getStore().sessions.find(s => s.id === getStore().currentSessionId);
      expect(session?.intent).toEqual(mockIntentResult);
      expect(session?.title).toBeDefined();
    });

    it('should set current plan', () => {
      act(() => {
        getStore().setCurrentPlan(mockTaskPlan);
      });

      expect(getStore().currentPlan).toEqual(mockTaskPlan);
    });

    it('should set current execution', () => {
      act(() => {
        getStore().setCurrentExecution(mockChainExecutionResult);
      });

      expect(getStore().currentExecution).toEqual(mockChainExecutionResult);
    });

    it('should set current reflection', () => {
      act(() => {
        getStore().setCurrentReflection(mockExecutionReflection);
      });

      expect(getStore().currentReflection).toEqual(mockExecutionReflection);
    });
  });

  // ============================================
  // Configuration
  // ============================================

  describe('Configuration', () => {
    it('should update config', () => {
      act(() => {
        getStore().updateConfig({
          maxStepsPerPlan: 20,
          defaultModel: 'claude-3',
          enableAutomaticFallbacks: false,
        });
      });

      const config = getStore().config;
      expect(config.maxStepsPerPlan).toBe(20);
      expect(config.defaultModel).toBe('claude-3');
      expect(config.enableAutomaticFallbacks).toBe(false);
    });

    it('should reset config to defaults', () => {
      act(() => {
        getStore().updateConfig({ maxStepsPerPlan: 50 });
        getStore().resetConfig();
      });

      const config = getStore().config;
      expect(config.maxStepsPerPlan).toBe(DEFAULT_ORCHESTRATOR_CONFIG.maxStepsPerPlan);
      expect(config).toEqual(DEFAULT_ORCHESTRATOR_CONFIG);
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  describe('Error Handling', () => {
    it('should clear all errors', () => {
      act(() => {
        const state = getStore();
        state.error = 'Some error';
        state.chatError = 'Chat error';
        state.intentError = 'Intent error';
        state.planError = 'Plan error';
        state.executionError = 'Execution error';
      });

      act(() => {
        getStore().clearError();
      });

      const state = getStore();
      expect(state.error).toBeNull();
      expect(state.chatError).toBeNull();
      expect(state.intentError).toBeNull();
      expect(state.planError).toBeNull();
      expect(state.executionError).toBeNull();
    });
  });

  // ============================================
  // Reset Store
  // ============================================

  describe('Reset Store', () => {
    it('should reset store to initial state', () => {
      // Set some state
      act(() => {
        getStore().createNewSession();
        getStore().setCurrentIntent(mockIntentResult);
        getStore().setCurrentPlan(mockTaskPlan);
      });

      expect(getStore().sessions.length).toBeGreaterThan(0);
      expect(getStore().currentIntent).not.toBeNull();

      // Reset
      act(() => {
        getStore().resetStore();
      });

      const state = getStore();
      expect(state.currentState).toBe('idle');
      expect(state.currentSessionId).toBeNull();
      expect(state.sessions).toHaveLength(0);
      expect(state.chatMessages).toHaveLength(0);
      expect(state.currentIntent).toBeNull();
      expect(state.currentPlan).toBeNull();
      expect(state.currentExecution).toBeNull();
      expect(state.currentReflection).toBeNull();
      expect(state.executionProgress).toBeNull();
    });
  });
});
