// apps/frontend/src/hooks/useOrchestrator.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { useAgents } from './useAgents';
import type { AgentType, AgentExecutionResponse, AgentStreamChunk, AgentSession } from './useAgents';

// ============================================
// Types
// ============================================

export interface IntentResult {
  primaryIntent: string;
  confidence: number;
  alternativeIntents: Array<{ intent: string; confidence: number }>;
  entities: Record<string, any>;
  suggestedAgent: AgentType;
  requiresMultipleAgents: boolean;
  agentChain?: AgentType[];
}

export interface TaskPlanStep {
  id: string;
  agentType: AgentType;
  action: string;
  input: any;
  dependsOn: string[];
  parallelGroup?: string;
  fallback?: {
    agentType: AgentType;
    action: string;
    input: any;
  };
  retryCount: number;
  timeout: number;
  estimatedTokens: number;
  estimatedCost: number;
}

export interface TaskPlan {
  id: string;
  steps: TaskPlanStep[];
  mode: 'sequential' | 'parallel' | 'conditional' | 'loop';
  estimatedTokens: number;
  estimatedCost: number;
  createdAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface StepExecutionResult {
  stepId: string;
  agentType: AgentType;
  success: boolean;
  output: any;
  error?: string;
  executionTimeMs: number;
  tokensUsed: number;
  costUsd: number;
  retryCount: number;
}

export interface ChainExecutionResult {
  planId: string;
  steps: StepExecutionResult[];
  finalOutput: any;
  totalTimeMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  success: boolean;
  error?: string;
  reflection?: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  type: 'short_term' | 'long_term' | 'episodic' | 'semantic';
  importance: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  similarity?: number;
}

export interface MemoryQueryOptions {
  query: string;
  limit?: number;
  minImportance?: number;
  type?: 'short_term' | 'long_term' | 'episodic' | 'semantic';
  useVectorSearch?: boolean;
}

export interface OrchestratorState {
  state: 'idle' | 'intent_parse' | 'plan' | 'execute' | 'reflect' | 'respond' | 'error';
  intent: IntentResult | null;
  plan: TaskPlan | null;
  executionResults: Map<string, StepExecutionResult>;
  currentStepIndex: number;
  finalOutput: any;
  error: string | null;
  totalTokensUsed: number;
  totalCostUsd: number;
  retryCount: number;
  injectedMemories: MemoryEntry[];
}

export interface OrchestratorResponse {
  message: string;
  data: any;
  executionSummary: {
    totalTimeMs: number;
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    totalTokensUsed: number;
    totalCostUsd: number;
    intent?: string;
    suggestedAgent?: AgentType;
    reflection?: string;
  };
}

export interface OrchestratorRequest {
  input: string;
  sessionId?: string;
  preferredAgent?: AgentType;
  maxSteps?: number;
  enableParallelization?: boolean;
  enableFallbacks?: boolean;
  enableMemory?: boolean;
  enableReflection?: boolean;
  timeout?: number;
  context?: Record<string, any>;
  maxRetries?: number;
  temperature?: number;
  model?: string;
}

export interface OrchestratorConfig {
  maxSteps: number;
  maxRetries: number;
  defaultTimeout: number;
  enableParallelization: boolean;
  enableFallbacks: boolean;
  enableMemory: boolean;
  enableReflection: boolean;
  confidenceThreshold: number;
  memoryLimit: number;
  streamingEnabled: boolean;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxSteps: 10,
  maxRetries: 3,
  defaultTimeout: 60000,
  enableParallelization: true,
  enableFallbacks: true,
  enableMemory: true,
  enableReflection: true,
  confidenceThreshold: 0.3,
  memoryLimit: 10,
  streamingEnabled: true,
};

// ============================================
// Hook
// ============================================

export function useOrchestrator(config: Partial<OrchestratorConfig> = {}) {
  const { user, isAuthenticated } = useAuthStore();
  const { executeAgent, executeAgentStream, cancelStream } = useAgents();

  // Merge config with defaults
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // State
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState>({
    state: 'idle',
    intent: null,
    plan: null,
    executionResults: new Map(),
    currentStepIndex: 0,
    finalOutput: null,
    error: null,
    totalTokensUsed: 0,
    totalCostUsd: 0,
    retryCount: 0,
    injectedMemories: [],
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamOutput, setStreamOutput] = useState('');
  const [streamChunks, setStreamChunks] = useState<AgentStreamChunk[]>([]);
  const [currentStateLabel, setCurrentStateLabel] = useState('');
  const [lastResponse, setLastResponse] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // Intent Classification
  // ============================================

  const classifyIntent = useCallback(async (input: string): Promise<IntentResult | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await apiClient.post<IntentResult>('/api/agent/intent', {
        input,
        useAI: true,
      });

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (err) {
      console.error('Failed to classify intent:', err);
      return null;
    }
  }, [isAuthenticated]);

  // ============================================
  // Create Task Plan
  // ============================================

  const createPlan = useCallback(async (
    intent: IntentResult,
    input: string,
    previousResults?: StepExecutionResult[]
  ): Promise<TaskPlan | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await apiClient.post<TaskPlan>('/api/agent/plan', {
        intent,
        input,
        options: {
          maxSteps: mergedConfig.maxSteps,
          enableParallelization: mergedConfig.enableParallelization,
          enableFallbacks: mergedConfig.enableFallbacks,
        },
        context: {
          previousResults,
          memories: orchestratorState.injectedMemories.slice(0, mergedConfig.memoryLimit),
        },
      });

      if (response.success && response.data) {
        return {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          status: 'pending',
        };
      }

      return null;
    } catch (err) {
      console.error('Failed to create plan:', err);
      return null;
    }
  }, [isAuthenticated, mergedConfig, orchestratorState.injectedMemories]);

  // ============================================
  // Execute Plan Step
  // ============================================

  const executeStep = useCallback(async (
    step: TaskPlanStep,
    previousOutputs: Map<string, any>,
    sessionId?: string
  ): Promise<StepExecutionResult> => {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= mergedConfig.maxRetries) {
      try {
        // Resolve input dependencies from previous step outputs
        const resolvedInput = resolveInput(step.input, previousOutputs);

        const response = await executeAgent({
          input: typeof resolvedInput === 'string' ? resolvedInput : JSON.stringify(resolvedInput),
          agentType: step.agentType,
          sessionId,
          action: step.action,
        });

        if (response && response.success) {
          return {
            stepId: step.id,
            agentType: step.agentType,
            success: true,
            output: response.output,
            executionTimeMs: Date.now() - startTime,
            tokensUsed: response.metadata.tokensUsed,
            costUsd: response.metadata.costUsd,
            retryCount,
          };
        }

        throw new Error(response?.error || 'Step execution failed');
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        retryCount++;

        if (retryCount <= mergedConfig.maxRetries) {
          // Exponential backoff
          await delay(1000 * Math.pow(2, retryCount - 1));
        }
      }
    }

    // Try fallback if available
    if (step.fallback) {
      try {
        const response = await executeAgent({
          input: `Handle error from step ${step.id}: ${lastError}`,
          agentType: step.fallback.agentType,
          sessionId,
          action: step.fallback.action,
        });

        if (response && response.success) {
          return {
            stepId: step.id,
            agentType: step.fallback.agentType,
            success: true,
            output: response.output,
            executionTimeMs: Date.now() - startTime,
            tokensUsed: response.metadata.tokensUsed,
            costUsd: response.metadata.costUsd,
            retryCount,
          };
        }
      } catch (fallbackErr) {
        lastError = fallbackErr instanceof Error ? fallbackErr.message : 'Fallback also failed';
      }
    }

    return {
      stepId: step.id,
      agentType: step.agentType,
      success: false,
      output: null,
      error: lastError,
      executionTimeMs: Date.now() - startTime,
      tokensUsed: 0,
      costUsd: 0,
      retryCount,
    };
  }, [executeAgent, mergedConfig]);

  // ============================================
  // Execute Full Plan
  // ============================================

  const executePlan = useCallback(async (
    plan: TaskPlan,
    sessionId?: string
  ): Promise<ChainExecutionResult> => {
    setOrchestratorState(prev => ({ ...prev, state: 'execute' }));

    const startTime = Date.now();
    const stepResults: StepExecutionResult[] = [];
    const stepOutputs = new Map<string, any>();
    const steps = plan.steps;

    if (plan.mode === 'parallel' && mergedConfig.enableParallelization) {
      // Group steps by parallel group
      const groups = groupStepsByParallel(steps);
      
      for (const group of groups) {
        const groupResults = await Promise.all(
          group.map(step => executeStep(step, stepOutputs, sessionId))
        );
        stepResults.push(...groupResults);
        groupResults.forEach((result, idx) => {
          if (result.success && result.output) {
            stepOutputs.set(group[idx].id, result.output);
          }
        });
      }
    } else {
      // Sequential execution
      for (let i = 0; i < steps.length; i++) {
        setOrchestratorState(prev => ({ ...prev, currentStepIndex: i }));

        const step = steps[i];

        // Check if all dependencies have been met
        const dependenciesSatisfied = step.dependsOn.every(depId =>
          stepResults.some(r => r.stepId === depId && r.success)
        );

        if (!dependenciesSatisfied && step.dependsOn.length > 0) {
          stepResults.push({
            stepId: step.id,
            agentType: step.agentType,
            success: false,
            output: null,
            error: 'Dependencies not satisfied',
            executionTimeMs: 0,
            tokensUsed: 0,
            costUsd: 0,
            retryCount: 0,
          });
          break;
        }

        const result = await executeStep(step, stepOutputs, sessionId);
        stepResults.push(result);

        if (result.success && result.output) {
          stepOutputs.set(step.id, result.output);
        }

        // If critical step fails without fallback, stop execution
        if (!result.success && !step.fallback) {
          break;
        }
      }
    }

    const finalOutput = stepResults.length > 0 ? stepResults[stepResults.length - 1].output : null;
    const allSuccessful = stepResults.every(r => r.success);

    const result: ChainExecutionResult = {
      planId: plan.id,
      steps: stepResults,
      finalOutput,
      totalTimeMs: Date.now() - startTime,
      totalTokensUsed: stepResults.reduce((sum, r) => sum + r.tokensUsed, 0),
      totalCostUsd: stepResults.reduce((sum, r) => sum + r.costUsd, 0),
      success: allSuccessful,
      error: allSuccessful ? undefined : stepResults.find(r => !r.success)?.error,
    };

    setOrchestratorState(prev => ({
      ...prev,
      executionResults: new Map(stepResults.map(r => [r.stepId, r])),
      totalTokensUsed: prev.totalTokensUsed + result.totalTokensUsed,
      totalCostUsd: prev.totalCostUsd + result.totalCostUsd,
    }));

    return result;
  }, [executeStep, mergedConfig]);

  // ============================================
  // Reflect on Execution
  // ============================================

  const reflectOnExecution = useCallback(async (
    request: OrchestratorRequest,
    results: ChainExecutionResult
  ): Promise<string> => {
    if (!isAuthenticated || !mergedConfig.enableReflection) return '';

    setOrchestratorState(prev => ({ ...prev, state: 'reflect' }));

    try {
      const successfulSteps = results.steps.filter(s => s.success);
      const failedSteps = results.steps.filter(s => !s.success);

      const response = await apiClient.post<{ reflection: string }>('/api/agent/reflect', {
        originalRequest: request.input,
        successfulSteps: successfulSteps.map(s => ({
          stepId: s.stepId,
          agentType: s.agentType,
          output: s.output,
        })),
        failedSteps: failedSteps.map(s => ({
          stepId: s.stepId,
          agentType: s.agentType,
          error: s.error,
        })),
        totalTimeMs: results.totalTimeMs,
      });

      if (response.success && response.data) {
        return response.data.reflection;
      }

      return '';
    } catch (err) {
      console.error('Reflection failed:', err);
      return '';
    }
  }, [isAuthenticated, mergedConfig]);

  // ============================================
  // Generate Response
  // ============================================

  const generateResponse = useCallback(async (
    request: OrchestratorRequest,
    results: ChainExecutionResult,
    reflection: string
  ): Promise<string> => {
    if (!isAuthenticated) return '';

    setOrchestratorState(prev => ({ ...prev, state: 'respond' }));

    try {
      const response = await apiClient.post<{ message: string }>('/api/agent/respond', {
        originalRequest: request.input,
        executionOutput: results.finalOutput,
        summary: {
          totalTimeMs: results.totalTimeMs,
          totalSteps: results.steps.length,
          successfulSteps: results.steps.filter(s => s.success).length,
          failedSteps: results.steps.filter(s => !s.success).length,
          error: results.error,
        },
        reflection,
      });

      if (response.success && response.data) {
        return response.data.message;
      }

      return generateFallbackResponse(results);
    } catch (err) {
      console.error('Response generation failed:', err);
      return generateFallbackResponse(results);
    }
  }, [isAuthenticated]);

  // ============================================
  // Main Execute Function
  // ============================================

  const execute = useCallback(async (
    request: OrchestratorRequest
  ): Promise<OrchestratorResponse | null> => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return null;
    }

    setIsProcessing(true);
    setError(null);
    setLastResponse(null);

    const startTime = Date.now();

    try {
      // STEP 1: Intent Parse
      setCurrentStateLabel('Analyzing your request...');
      const intent = await classifyIntent(request.input);
      if (!intent || intent.confidence < mergedConfig.confidenceThreshold) {
        // Fall through to orchestrator directly
      }

      setOrchestratorState(prev => ({
        ...prev,
        state: 'intent_parse',
        intent,
        injectedMemories: await retrieveMemories({
          query: request.input,
          limit: mergedConfig.memoryLimit,
        }),
      }));

      // STEP 2: Plan
      setCurrentStateLabel('Creating execution plan...');
      const plan = await createPlan(
        intent || {
          primaryIntent: 'general_assistance',
          confidence: 0.5,
          alternativeIntents: [],
          entities: {},
          suggestedAgent: request.preferredAgent || 'orchestrator',
          requiresMultipleAgents: false,
        },
        request.input
      );

      if (!plan) {
        throw new Error('Failed to create execution plan');
      }

      setOrchestratorState(prev => ({ ...prev, state: 'plan', plan }));

      // STEP 3: Execute
      setCurrentStateLabel('Executing tasks...');
      const executionResult = await executePlan(plan, request.sessionId);

      // Retry if failed
      let finalResult = executionResult;
      if (!executionResult.success) {
        setOrchestratorState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
        }));

        if (orphanedOrchestratorState.retryCount < mergedConfig.maxRetries) {
          const retryPlan = await createPlan(
            intent || {
              primaryIntent: 'general_assistance',
              confidence: 0.5,
              alternativeIntents: [],
              entities: {},
              suggestedAgent: 'orchestrator',
              requiresMultipleAgents: false,
            },
            request.input,
            executionResult.steps
          );

          if (retryPlan) {
            finalResult = await executePlan(retryPlan, request.sessionId);
          }
        }
      }

      // STEP 4: Reflect
      const reflection = await reflectOnExecution(request, finalResult);

      // STEP 5: Respond
      setCurrentStateLabel('Generating response...');
      const message = await generateResponse(request, finalResult, reflection);

      // Store memory
      if (mergedConfig.enableMemory) {
        await storeMemory(
          `Processed request: ${request.input.substring(0, 200)}`,
          'short_term',
          finalResult.success ? 0.6 : 0.3,
          { type: 'execution', success: finalResult.success }
        );
      }

      const response: OrchestratorResponse = {
        message,
        data: finalResult.finalOutput,
        executionSummary: {
          totalTimeMs: Date.now() - startTime,
          totalSteps: finalResult.steps.length,
          successfulSteps: finalResult.steps.filter(s => s.success).length,
          failedSteps: finalResult.steps.filter(s => !s.success).length,
          totalTokensUsed: finalResult.totalTokensUsed,
          totalCostUsd: finalResult.totalCostUsd,
          intent: intent?.primaryIntent,
          suggestedAgent: intent?.suggestedAgent,
          reflection,
        },
      };

      setLastResponse(response);
      setOrchestratorState(prev => ({ ...prev, state: 'idle', finalOutput: response.data }));
      return response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      setError(errorMessage);
      setOrchestratorState(prev => ({ ...prev, state: 'error', error: errorMessage }));
      return null;
    } finally {
      setIsProcessing(false);
      setCurrentStateLabel('');
    }
  }, [
    isAuthenticated,
    mergedConfig,
    classifyIntent,
    createPlan,
    executePlan,
    reflectOnExecution,
    generateResponse,
    retrieveMemories,
    storeMemory,
  ]);

  // ============================================
  // Streaming Execute
  // ============================================

  const executeStream = useCallback(async (
    request: OrchestratorRequest,
    onStateChange?: (state: string) => void,
    onChunk?: (chunk: AgentStreamChunk) => void
  ): Promise<OrchestratorResponse | null> => {
    if (!isAuthenticated) {
      setError('Not authenticated');
      return null;
    }

    // Clean up previous stream
    cancelStream();

    setIsProcessing(true);
    setIsStreaming(true);
    setStreamOutput('');
    setStreamChunks([]);
    setError(null);
    setLastResponse(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = Date.now();

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');

      const payload = {
        input: request.input,
        sessionId: request.sessionId,
        preferredAgent: request.preferredAgent,
        maxSteps: request.maxSteps || mergedConfig.maxSteps,
        enableParallelization: request.enableParallelization ?? mergedConfig.enableParallelization,
        enableFallbacks: request.enableFallbacks ?? mergedConfig.enableFallbacks,
        enableMemory: request.enableMemory ?? mergedConfig.enableMemory,
        enableReflection: request.enableReflection ?? mergedConfig.enableReflection,
        context: request.context,
        stream: true,
      };

      const response = await fetch(`${apiUrl}/api/agent/orchestrator/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: OrchestratorResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            const chunk: AgentStreamChunk = {
              type: parsed.type || 'output',
              content: parsed.content || parsed.message || '',
              metadata: parsed.metadata,
              timestamp: new Date(),
            };

            // Update state label based on chunk type
            if (parsed.state && onStateChange) {
              onStateChange(mapStateToLabel(parsed.state));
              setCurrentStateLabel(mapStateToLabel(parsed.state));
            }

            setStreamChunks(prev => [...prev, chunk]);
            setStreamOutput(prev => prev + (chunk.content || ''));

            if (onChunk) onChunk(chunk);

            // Check for completion
            if (parsed.type === 'complete') {
              finalResponse = {
                message: parsed.data?.message || streamOutput,
                data: parsed.data?.data,
                executionSummary: {
                  totalTimeMs: Date.now() - startTime,
                  totalSteps: parsed.data?.executionSummary?.totalSteps || 0,
                  successfulSteps: parsed.data?.executionSummary?.successfulSteps || 0,
                  failedSteps: parsed.data?.executionSummary?.failedSteps || 0,
                  totalTokensUsed: parsed.data?.executionSummary?.totalTokensUsed || 0,
                  totalCostUsd: parsed.data?.executionSummary?.totalCostUsd || 0,
                  intent: parsed.data?.executionSummary?.intent,
                  suggestedAgent: parsed.data?.executionSummary?.suggestedAgent,
                  reflection: parsed.data?.executionSummary?.reflection,
                },
              };
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }

      if (finalResponse) {
        setLastResponse(finalResponse);
        setOrchestratorState(prev => ({
          ...prev,
          state: 'idle',
          finalOutput: finalResponse!.data,
        }));
      }

      setIsStreaming(false);
      return finalResponse;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Stream cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'Stream failed');
      }
      setIsStreaming(false);
      return null;
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [isAuthenticated, mergedConfig, cancelStream]);

  // ============================================
  // Memory Management
  // ============================================

  const retrieveMemories = useCallback(async (
    options: MemoryQueryOptions
  ): Promise<MemoryEntry[]> => {
    if (!isAuthenticated || !mergedConfig.enableMemory) return [];

    try {
      const response = await apiClient.post<{ memories: MemoryEntry[] }>(
        '/api/agent/memory/retrieve',
        {
          query: options.query,
          limit: options.limit || mergedConfig.memoryLimit,
          minImportance: options.minImportance || 0.3,
          type: options.type,
          useVectorSearch: options.useVectorSearch !== false,
        }
      );

      if (response.success && response.data) {
        const retrieved = response.data.memories.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMemories(retrieved);
        return retrieved;
      }

      return [];
    } catch (err) {
      console.error('Failed to retrieve memories:', err);
      return [];
    }
  }, [isAuthenticated, mergedConfig]);

  const storeMemory = useCallback(async (
    content: string,
    type: MemoryEntry['type'] = 'short_term',
    importance: number = 0.5,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    if (!isAuthenticated || !mergedConfig.enableMemory) return false;

    try {
      const response = await apiClient.post('/api/agent/memory/store', {
        content,
        type,
        importance,
        metadata,
      });

      if (response.success) {
        setOrchestratorState(prev => ({
          ...prev,
          injectedMemories: [
            {
              id: `mem_${Date.now()}`,
              content,
              type,
              importance,
              timestamp: new Date(),
              metadata,
            },
            ...prev.injectedMemories.slice(0, 49),
          ],
        }));
      }

      return response.success;
    } catch (err) {
      console.error('Failed to store memory:', err);
      return false;
    }
  }, [isAuthenticated, mergedConfig]);

  const clearMemories = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await apiClient.delete('/api/agent/memory');
      setOrchestratorState(prev => ({ ...prev, injectedMemories: [] }));
      setMemories([]);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  }, [isAuthenticated]);

  // ============================================
  // Cancel
  // ============================================

  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setIsStreaming(false);
    setOrchestratorState(prev => ({ ...prev, state: 'idle' }));
  }, []);

  // ============================================
  // Reset
  // ============================================

  const reset = useCallback(() => {
    setOrchestratorState({
      state: 'idle',
      intent: null,
      plan: null,
      executionResults: new Map(),
      currentStepIndex: 0,
      finalOutput: null,
      error: null,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      retryCount: 0,
      injectedMemories: [],
    });
    setLastResponse(null);
    setStreamOutput('');
    setStreamChunks([]);
    setError(null);
  }, []);

  // ============================================
  // Helpers
  // ============================================

  const resolveInput = (input: any, outputs: Map<string, any>): any => {
    if (typeof input === 'string' && input.startsWith('$')) {
      const key = input.substring(1);
      return outputs.get(key) || input;
    }

    if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(input)) {
        resolved[key] = resolveInput(value, outputs);
      }
      return resolved;
    }

    return input;
  };

  const groupStepsByParallel = (steps: TaskPlanStep[]): TaskPlanStep[][] => {
    const groups: TaskPlanStep[][] = [];
    const processed = new Set<string>();

    for (const step of steps) {
      if (processed.has(step.id)) continue;

      const group: TaskPlanStep[] = [step];
      processed.add(step.id);

      for (const other of steps) {
        if (!processed.has(other.id) && other.parallelGroup === step.parallelGroup) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  };

  const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

  const mapStateToLabel = (state: string): string => {
    const labels: Record<string, string> = {
      idle: 'Ready',
      intent_parse: 'Analyzing your request...',
      plan: 'Creating execution plan...',
      execute: 'Executing tasks...',
      reflect: 'Reflecting on results...',
      respond: 'Generating response...',
      error: 'An error occurred',
    };
    return labels[state] || state;
  };

  const generateFallbackResponse = (results: ChainExecutionResult): string => {
    if (results.success) {
      return 'Task completed successfully!';
    }
    if (results.steps.some(s => s.success)) {
      const successCount = results.steps.filter(s => s.success).length;
      return `Partially completed: ${successCount} of ${results.steps.length} steps succeeded. Some steps encountered issues.`;
    }
    return results.error || 'An error occurred while processing your request. Please try again.';
  };

  // ============================================
  // Cleanup on unmount
  // ============================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // Return
  // ============================================

  return {
    // State
    state: orchestratorState.state,
    intent: orchestratorState.intent,
    plan: orchestratorState.plan,
    executionResults: orchestratorState.executionResults,
    finalOutput: orchestratorState.finalOutput,
    totalTokensUsed: orchestratorState.totalTokensUsed,
    totalCostUsd: orchestratorState.totalCostUsd,
    isProcessing,
    isStreaming,
    streamOutput,
    streamChunks,
    currentStateLabel,
    lastResponse,
    error,
    memories,

    // Actions
    execute,
    executeStream,
    cancelExecution,
    reset,

    // Memory
    retrieveMemories,
    storeMemory,
    clearMemories,

    // Utility
    classifyIntent,
    createPlan,
    executePlan,
  };
}

export default useOrchestrator;