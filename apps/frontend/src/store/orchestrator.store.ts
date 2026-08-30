// enterprise-ai-agent-platform/apps/frontend/src/store/orchestrator.store.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { apiClient } from '../api/client';
import {
  OrchestratorStateType,
  IntentResult,
  TaskPlan,
  TaskPlanStep,
  ExecutionMode,
  ChainExecutionResult,
  StepExecutionResult,
  ExecutionReflection,
  AgentSelection,
  OrchestratorMemoryEntry,
  MemoryType,
  MemoryRetrievalOptions,
  MemoryRetrievalResult,
  OrchestratorConfig,
  DEFAULT_ORCHESTRATOR_CONFIG,
  ClassificationOptions,
  PlanningOptions,
  ExecutionOptions,
  OrchestratorMetrics,
  OrchestratorHealthStatus,
  OrchestratorSession,
  OrchestratorEvent,
  OrchestratorEventType,
  OrchestratorEventListener,
  AgentDelegationRequest,
  AgentDelegationResult,
  BatchExecutionRequest,
  BatchExecutionResult,
  OrchestratorStreamChunk,
  OrchestratorStreamChunkType,
  FollowUpSuggestion,
} from '../types/orchestrator.types';
import { AgentType } from '../types/agent.types';

// ============================================
// Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'orchestrator' | 'agent' | 'system' | 'error';
  content: string;
  type: 'text' | 'code' | 'image' | 'plan' | 'intent' | 'execution' | 'reflection' | 'memory' | 'error' | 'loading';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'streaming';
  timestamp: Date;
  metadata?: Record<string, any>;
  attachments?: Array<{
    id: string;
    type: 'image' | 'file' | 'code';
    name: string;
    url?: string;
    content?: string;
    size?: number;
    mimeType?: string;
  }>;
  actions?: Array<{
    id: string;
    label: string;
    action: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  }>;
  isStreaming?: boolean;
  edited?: boolean;
  starred?: boolean;
}

export interface OrchestratorSessionData {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  state: OrchestratorStateType;
  messages: ChatMessage[];
  intent?: IntentResult;
  plan?: TaskPlan;
  execution?: ChainExecutionResult;
  reflection?: ExecutionReflection;
  selectedAgents?: AgentSelection[];
  memories?: OrchestratorMemoryEntry[];
  metadata?: Record<string, any>;
}

export interface AgentInfo {
  type: string;
  name: string;
  description: string;
  version: string;
  status: 'idle' | 'running' | 'error' | 'degraded' | 'maintenance' | 'unknown';
  isAvailable: boolean;
  isConnected: boolean;
  category: AgentCategory;
  tools?: AgentToolInfo[];
  metrics?: AgentMetricsInfo;
  capabilities?: string[];
  requiredPlan?: string;
  lastHeartbeat?: Date;
  healthMessage?: string;
  supportedProviders?: string[];
}

export type AgentCategory =
  | 'communication'
  | 'productivity'
  | 'content'
  | 'social'
  | 'research'
  | 'management'
  | 'orchestration';

export interface AgentToolInfo {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  cost: number;
  requiresApiCall: boolean;
}

export interface AgentMetricsInfo {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTimeMs: number;
  errorRate: number;
  lastExecutedAt?: Date;
  successRate: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

export interface OrchestratorStats {
  totalSessions: number;
  totalMessages: number;
  totalExecutions: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  successRate: number;
  averageResponseTime: number;
  agentsUsed: string[];
  lastActive?: Date;
}

export interface MemoryStore {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  timestamp: Date;
  accessCount: number;
  lastAccessedAt?: Date;
  ttlHours?: number;
  expiresAt?: Date;
  source?: string;
  sessionId?: string;
  agentType?: string;
  tags?: string[];
  similarity?: number;
  metadata?: Record<string, any>;
}

// ============================================
// Helper Functions
// ============================================

const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const generateSessionTitle = (intent?: IntentResult): string => {
  if (intent?.primaryIntent) {
    return intent.primaryIntent
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .substring(0, 50);
  }
  return `Session ${new Date().toLocaleDateString()}`;
};

const createDefaultSession = (): OrchestratorSessionData => ({
  id: generateId(),
  title: 'New Session',
  messageCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  state: OrchestratorStateType.IDLE,
  messages: [],
});

function mapAgentToCategory(type: string): AgentCategory {
  const categoryMap: Record<string, AgentCategory> = {
    email: 'communication',
    drive: 'productivity',
    content: 'content',
    social: 'social',
    calendar: 'productivity',
    web: 'research',
    task: 'management',
    orchestrator: 'orchestration',
  };
  return categoryMap[type.toLowerCase()] || 'orchestration';
}

// ============================================
// Store Interface
// ============================================

interface OrchestratorStore {
  // ============================================
  // State
  // ============================================

  // Core State
  currentState: OrchestratorStateType;
  currentSessionId: string | null;
  sessions: OrchestratorSessionData[];
  sessionHistory: Array<{
    id: string;
    title: string;
    lastMessage?: string;
    messageCount: number;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    state: OrchestratorStateType;
  }>;

  // Current Execution Data
  currentIntent: IntentResult | null;
  currentPlan: TaskPlan | null;
  currentExecution: ChainExecutionResult | null;
  currentReflection: ExecutionReflection | null;

  // Execution Progress
  executionProgress: {
    state: OrchestratorStateType;
    progress: number;
    currentStep?: string;
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemainingMs?: number;
  } | null;

  // Chat
  chatMessages: ChatMessage[];
  streamingStatus: string;
  isChatLoading: boolean;
  chatError: string | null;

  // Intent
  intentHistory: Array<{
    id: string;
    input: string;
    intent: IntentResult;
    wasCorrect?: boolean;
    correctedIntent?: string;
    timestamp: Date;
    processingTimeMs: number;
    model?: string;
    classificationMethod?: string;
  }>;
  isIntentLoading: boolean;
  intentError: string | null;

  // Plan
  planValidation: { valid: boolean; errors: string[]; warnings: string[]; info: string[] } | null;
  isPlanLoading: boolean;
  planError: string | null;

  // Execution
  executionTimeline: StepExecutionResult[];
  isExecutionLoading: boolean;
  executionError: string | null;

  // Agents
  availableAgents: AgentInfo[];
  selectedAgents: AgentSelection[];
  isAgentsLoading: boolean;
  agentsError: string | null;

  // Reflection
  reflectionHistory: Array<{
    id: string;
    executionId: string;
    reflection: ExecutionReflection;
    createdAt: Date;
  }>;
  isReflectionLoading: boolean;
  reflectionError: string | null;

  // Memory
  memories: MemoryStore[];
  memoryStats: {
    totalMemories: number;
    shortTermCount: number;
    longTermCount: number;
    episodicCount: number;
    semanticCount: number;
    workingCount: number;
    proceduralCount: number;
    averageImportance: number;
    totalEmbeddingTokens: number;
    totalEmbeddingCostUsd: number;
  } | null;
  isMemoryLoading: boolean;
  memoryError: string | null;

  // Configuration
  config: OrchestratorConfig;
  metrics: OrchestratorMetrics | null;
  health: OrchestratorHealthStatus | null;
  stats: OrchestratorStats | null;
  lastUpdated: Date | null;
  error: string | null;
  isConnected: boolean;

  // ============================================
  // Actions
  // ============================================

  // State Management
  setCurrentState: (state: OrchestratorStateType) => void;
  setCurrentIntent: (intent: IntentResult | null) => void;
  setCurrentPlan: (plan: TaskPlan | null) => void;
  setCurrentExecution: (execution: ChainExecutionResult | null) => void;
  setCurrentReflection: (reflection: ExecutionReflection | null) => void;

  // Session Management
  createNewSession: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  getSessionHistory: () => void;

  // Chat Actions
  sendMessage: (content: string, options?: any) => Promise<void>;
  stopStreaming: () => void;
  clearCurrentChat: () => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  starMessage: (messageId: string) => void;

  // Intent Actions
  classifyIntent: (input: string, options?: ClassificationOptions) => Promise<IntentResult | null>;
  getIntentHistory: () => void;
  confirmIntent: (intent: IntentResult) => void;
  rejectIntent: (intent: IntentResult) => void;

  // Plan Actions
  createPlan: (intent: IntentResult, options?: PlanningOptions) => Promise<TaskPlan | null>;
  optimizePlan: (plan: TaskPlan) => Promise<TaskPlan | null>;
  validatePlan: (plan: TaskPlan) => void;
  updatePlanStep: (stepId: string, updates: Partial<TaskPlanStep>) => void;
  addPlanStep: (step: TaskPlanStep) => void;
  removePlanStep: (stepId: string) => void;
  reorderPlanSteps: (stepIds: string[]) => void;

  // Execution Actions
  executePlan: (plan: TaskPlan, options?: ExecutionOptions) => Promise<ChainExecutionResult | null>;
  cancelExecution: () => void;
  retryExecution: () => void;
  getExecutionProgress: (executionId: string) => void;

  // Agent Actions
  fetchAvailableAgents: () => void;
  selectAgents: (selections: AgentSelection[]) => void;
  delegateToAgent: (request: AgentDelegationRequest) => Promise<AgentDelegationResult | null>;
  executeBatch: (request: BatchExecutionRequest) => Promise<BatchExecutionResult | null>;

  // Reflection Actions
  generateReflection: (executionResults: ChainExecutionResult) => Promise<ExecutionReflection | null>;
  storeReflectionInsight: (data: any) => void;
  getReflectionHistory: () => void;

  // Memory Actions
  fetchMemories: (options?: { type?: MemoryType; source?: string; sessionId?: string }) => void;
  searchMemories: (query: string, options?: MemoryRetrievalOptions) => void;
  storeMemory: (content: string, type: MemoryType, importance: number, metadata?: Record<string, any>) => void;
  updateMemory: (memoryId: string, updates: Partial<MemoryStore>) => void;
  deleteMemory: (memoryId: string) => void;
  clearMemories: (type?: MemoryType) => void;
  consolidateMemories: () => void;
  getMemoryStats: () => void;

  // Configuration Actions
  updateConfig: (config: Partial<OrchestratorConfig>) => void;
  resetConfig: () => void;

  // Utility Actions
  clearError: () => void;
  refreshAll: () => Promise<void>;
  resetStore: () => void;
  exportSession: (sessionId: string) => Promise<any>;
  importSession: (data: any) => void;

  // Event Listeners
  addEventListener: (listener: OrchestratorEventListener) => void;
  removeEventListener: (listener: OrchestratorEventListener) => void;
}

// ============================================
// Store
// ============================================

export const useOrchestratorStore = create<OrchestratorStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // ============================================
          // Initial State
          // ============================================

          currentState: OrchestratorStateType.IDLE,
          currentSessionId: null,
          sessions: [],
          sessionHistory: [],

          currentIntent: null,
          currentPlan: null,
          currentExecution: null,
          currentReflection: null,

          executionProgress: null,

          chatMessages: [],
          streamingStatus: 'idle',
          isChatLoading: false,
          chatError: null,

          intentHistory: [],
          isIntentLoading: false,
          intentError: null,

          planValidation: null,
          isPlanLoading: false,
          planError: null,

          executionTimeline: [],
          isExecutionLoading: false,
          executionError: null,

          availableAgents: [],
          selectedAgents: [],
          isAgentsLoading: false,
          agentsError: null,

          reflectionHistory: [],
          isReflectionLoading: false,
          reflectionError: null,

          memories: [],
          memoryStats: null,
          isMemoryLoading: false,
          memoryError: null,

          config: DEFAULT_ORCHESTRATOR_CONFIG,
          metrics: null,
          health: null,
          stats: null,
          lastUpdated: null,
          error: null,
          isConnected: false,

          // ============================================
          // State Management
          // ============================================

          setCurrentState: (state) => {
            set((store) => {
              store.currentState = state;
              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.state = state;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          setCurrentIntent: (intent) => {
            set((store) => {
              store.currentIntent = intent;
              if (intent && store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.intent = intent;
                  session.title = generateSessionTitle(intent);
                  session.updatedAt = new Date();
                }
              }
            });
          },

          setCurrentPlan: (plan) => {
            set((store) => {
              store.currentPlan = plan;
              if (plan && store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.plan = plan;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          setCurrentExecution: (execution) => {
            set((store) => {
              store.currentExecution = execution;
              if (execution && store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.execution = execution;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          setCurrentReflection: (reflection) => {
            set((store) => {
              store.currentReflection = reflection;
              if (reflection && store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.reflection = reflection;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          // ============================================
          // Session Management
          // ============================================

          createNewSession: () => {
            const newSession = createDefaultSession();
            set((store) => {
              store.sessions.unshift(newSession);
              store.currentSessionId = newSession.id;
              store.sessionHistory.unshift({
                id: newSession.id,
                title: newSession.title,
                messageCount: 0,
                createdAt: newSession.createdAt,
                updatedAt: newSession.updatedAt,
                isActive: true,
                state: OrchestratorStateType.IDLE,
              });
              store.chatMessages = [];
              store.currentIntent = null;
              store.currentPlan = null;
              store.currentExecution = null;
              store.currentReflection = null;
              store.executionProgress = null;
              store.streamingStatus = 'idle';
              store.currentState = OrchestratorStateType.IDLE;
              store.error = null;
              store.chatError = null;
            });
          },

          selectSession: (sessionId) => {
            set((store) => {
              const session = store.sessions.find((s) => s.id === sessionId);
              if (session) {
                store.currentSessionId = sessionId;
                store.chatMessages = session.messages;
                store.currentIntent = session.intent || null;
                store.currentPlan = session.plan || null;
                store.currentExecution = session.execution || null;
                store.currentReflection = session.reflection || null;
                store.selectedAgents = session.selectedAgents || [];
                store.currentState = session.state;
                store.streamingStatus = 'idle';
                store.error = null;
                store.chatError = null;
                session.updatedAt = new Date();

                // Update session history
                const historyEntry = store.sessionHistory.find((s) => s.id === sessionId);
                if (historyEntry) {
                  historyEntry.lastMessage = session.lastMessage;
                  historyEntry.messageCount = session.messageCount;
                  historyEntry.updatedAt = session.updatedAt;
                  historyEntry.state = session.state;
                }
              }
            });
          },

          deleteSession: (sessionId) => {
            set((store) => {
              store.sessions = store.sessions.filter((s) => s.id !== sessionId);
              store.sessionHistory = store.sessionHistory.filter((s) => s.id !== sessionId);
              if (store.currentSessionId === sessionId) {
                store.currentSessionId = null;
                store.chatMessages = [];
                store.currentIntent = null;
                store.currentPlan = null;
                store.currentExecution = null;
                store.currentReflection = null;
                store.executionProgress = null;
                store.streamingStatus = 'idle';
                store.currentState = OrchestratorStateType.IDLE;
                store.error = null;
                store.chatError = null;
              }
            });
          },

          renameSession: (sessionId, title) => {
            set((store) => {
              const session = store.sessions.find((s) => s.id === sessionId);
              if (session) {
                session.title = title;
                session.updatedAt = new Date();
              }
              const historyEntry = store.sessionHistory.find((s) => s.id === sessionId);
              if (historyEntry) {
                historyEntry.title = title;
                historyEntry.updatedAt = new Date();
              }
            });
          },

          getSessionHistory: () => {
            const { sessions } = get();
            set((store) => {
              store.sessionHistory = sessions.map((s) => ({
                id: s.id,
                title: s.title,
                lastMessage: s.messages.length > 0
                  ? s.messages[s.messages.length - 1].content.substring(0, 100)
                  : undefined,
                messageCount: s.messages.length,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
                isActive: s.isActive,
                state: s.state,
              }));
            });
          },

          // ============================================
          // Chat Actions
          // ============================================

          sendMessage: async (content, options) => {
            const messageId = generateId();
            const userMessage: ChatMessage = {
              id: messageId,
              role: 'user',
              content,
              type: 'text',
              status: 'sent',
              timestamp: new Date(),
            };

            set((store) => {
              store.chatMessages.push(userMessage);
              store.streamingStatus = 'thinking';
              store.isChatLoading = true;
              store.chatError = null;
              store.currentState = OrchestratorStateType.INTENT_PARSE;

              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.messages = store.chatMessages;
                  session.messageCount = store.chatMessages.length;
                  session.updatedAt = new Date();
                  session.lastMessage = content;
                  session.state = OrchestratorStateType.INTENT_PARSE;
                }
              }
            });

            try {
              const response = await apiClient.post('/api/agent/execute', {
                input: content,
                sessionId: get().currentSessionId,
                ...options,
              });

              if (response.success && response.data) {
                // Cast response.data to handle unknown type
                const responseData = response.data as unknown as {
                  output?: { message?: string; actions?: any[] };
                  metadata?: {
                    intent?: IntentResult;
                    processingTimeMs?: number;
                    model?: string;
                    classificationMethod?: string;
                    tokensUsed?: number;
                    costUsd?: number;
                  };
                };

                // Determine the content string safely
                const outputContent: string = typeof responseData.output === 'string'
                  ? responseData.output
                  : responseData.output?.message
                    || JSON.stringify(responseData.output)
                    || 'Task completed successfully.';

                const agentMessage: ChatMessage = {
                  id: generateId(),
                  role: 'orchestrator',
                  content: outputContent,
                  type: 'text',
                  status: 'sent',
                  timestamp: new Date(),
                  metadata: responseData.metadata,
                  actions: responseData.output?.actions || [],
                };

                set((store) => {
                  store.chatMessages.push(agentMessage);
                  store.streamingStatus = 'complete';
                  store.isChatLoading = false;
                  store.currentState = OrchestratorStateType.RESPOND;

                  if (responseData.metadata?.intent) {
                    store.currentIntent = responseData.metadata.intent;
                    store.intentHistory.unshift({
                      id: generateId(),
                      input: content,
                      intent: responseData.metadata.intent,
                      timestamp: new Date(),
                      processingTimeMs: responseData.metadata.processingTimeMs || 0,
                      model: responseData.metadata.model,
                      classificationMethod: responseData.metadata.classificationMethod,
                    });
                  }

                  if (store.currentSessionId) {
                    const session = store.sessions.find((s) => s.id === store.currentSessionId);
                    if (session) {
                      session.messages = store.chatMessages;
                      session.messageCount = store.chatMessages.length;
                      session.updatedAt = new Date();
                      session.lastMessage = agentMessage.content.substring(0, 100);
                      session.state = OrchestratorStateType.RESPOND;
                      if (responseData.metadata?.intent) {
                        session.intent = responseData.metadata.intent;
                      }
                    }
                  }

                  store.stats = {
                    totalSessions: store.sessions.length,
                    totalMessages: store.sessions.reduce((sum, s) => sum + s.messages.length, 0),
                    totalExecutions: (store.stats?.totalExecutions || 0) + 1,
                    totalTokensUsed: (store.stats?.totalTokensUsed || 0) + (responseData.metadata?.tokensUsed || 0),
                    totalCostUsd: (store.stats?.totalCostUsd || 0) + (responseData.metadata?.costUsd || 0),
                    successRate: store.stats?.successRate || 100,
                    averageResponseTime: store.stats?.averageResponseTime || 0,
                    agentsUsed: store.stats?.agentsUsed || [],
                  };

                  store.lastUpdated = new Date();
                });
              } else {
                throw new Error(response.error || 'Failed to execute');
              }
            } catch (error) {
              const errorMessage: ChatMessage = {
                id: generateId(),
                role: 'error',
                content: error instanceof Error ? error.message : 'An error occurred while processing your request',
                type: 'error',
                status: 'error',
                timestamp: new Date(),
              };

              set((store) => {
                store.chatMessages.push(errorMessage);
                store.streamingStatus = 'error';
                store.isChatLoading = false;
                store.chatError = error instanceof Error ? error.message : 'Unknown error';
                store.error = error instanceof Error ? error.message : 'Unknown error';
                store.currentState = OrchestratorStateType.ERROR;

                if (store.currentSessionId) {
                  const session = store.sessions.find((s) => s.id === store.currentSessionId);
                  if (session) {
                    session.messages = store.chatMessages;
                    session.messageCount = store.chatMessages.length;
                    session.updatedAt = new Date();
                    session.state = OrchestratorStateType.ERROR;
                  }
                }
              });
            }
          },

          stopStreaming: () => {
            set((store) => {
              store.streamingStatus = 'cancelled';
              store.isChatLoading = false;
              store.currentState = OrchestratorStateType.IDLE;
            });
          },

          clearCurrentChat: () => {
            set((store) => {
              store.chatMessages = [];
              store.currentIntent = null;
              store.currentPlan = null;
              store.currentExecution = null;
              store.currentReflection = null;
              store.executionProgress = null;
              store.streamingStatus = 'idle';
              store.currentState = OrchestratorStateType.IDLE;
              store.error = null;
              store.chatError = null;

              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.messages = [];
                  session.messageCount = 0;
                  session.intent = undefined;
                  session.plan = undefined;
                  session.execution = undefined;
                  session.reflection = undefined;
                  session.state = OrchestratorStateType.IDLE;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          editMessage: (messageId, content) => {
            set((store) => {
              const message = store.chatMessages.find((m) => m.id === messageId);
              if (message) {
                message.content = content;
                message.edited = true;
              }
            });
          },

          deleteMessage: (messageId) => {
            set((store) => {
              store.chatMessages = store.chatMessages.filter((m) => m.id !== messageId);
              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.messages = store.chatMessages;
                  session.messageCount = store.chatMessages.length;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          starMessage: (messageId) => {
            set((store) => {
              const message = store.chatMessages.find((m) => m.id === messageId);
              if (message) {
                message.starred = !message.starred;
              }
            });
          },

          // ============================================
          // Intent Actions
          // ============================================

          classifyIntent: async (input, options) => {
            set((store) => {
              store.isIntentLoading = true;
              store.intentError = null;
              store.currentState = OrchestratorStateType.INTENT_PARSE;
            });

            try {
              const response = await apiClient.post('/api/agent/classify-intent', {
                input,
                ...options,
              });

              if (response.success && response.data) {
                const intent: IntentResult = response.data as unknown as IntentResult;
                set((store) => {
                  store.currentIntent = intent;
                  store.intentHistory.unshift({
                    id: generateId(),
                    input,
                    intent,
                    timestamp: new Date(),
                    processingTimeMs: (intent as any).processingTimeMs || 0,
                    model: (options as any)?.model || 'gpt-4',
                    classificationMethod: (intent as any).classificationMethod || 'hybrid',
                  });
                  store.isIntentLoading = false;
                  store.currentState = intent.requiresMultipleAgents ? OrchestratorStateType.PLAN : OrchestratorStateType.INTENT_PARSE;

                  if (store.currentSessionId) {
                    const session = store.sessions.find((s) => s.id === store.currentSessionId);
                    if (session) {
                      session.intent = intent;
                      session.title = generateSessionTitle(intent);
                      session.state = OrchestratorStateType.INTENT_PARSE;
                      session.updatedAt = new Date();
                    }
                  }

                  store.lastUpdated = new Date();
                });
                return intent;
              }
              throw new Error(response.error || 'Classification failed');
            } catch (error) {
              set((store) => {
                store.isIntentLoading = false;
                store.intentError = error instanceof Error ? error.message : 'Classification failed';
                store.error = error instanceof Error ? error.message : 'Classification failed';
                store.currentState = OrchestratorStateType.ERROR;
              });
              return null;
            }
          },

          getIntentHistory: () => {
            // History is already maintained in memory
            // This method exists for API consistency and potential future server-side fetching
          },

          confirmIntent: (intent) => {
            set((store) => {
              if (store.currentIntent?.primaryIntent === intent.primaryIntent) {
                store.currentState = OrchestratorStateType.PLAN;
                if (store.currentSessionId) {
                  const session = store.sessions.find((s) => s.id === store.currentSessionId);
                  if (session) {
                    session.state = OrchestratorStateType.PLAN;
                    session.updatedAt = new Date();
                  }
                }
              }
            });
          },

          rejectIntent: (intent) => {
            set((store) => {
              store.currentIntent = null;
              store.currentState = OrchestratorStateType.IDLE;
              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.intent = undefined;
                  session.state = OrchestratorStateType.IDLE;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          // ============================================
          // Plan Actions
          // ============================================

          createPlan: async (intent, options) => {
            set((store) => {
              store.isPlanLoading = true;
              store.planError = null;
              store.currentState = OrchestratorStateType.PLAN;
            });

            try {
              const response = await apiClient.post('/api/agent/create-plan', {
                intent,
                ...options,
              });

              if (response.success && response.data) {
                const plan: TaskPlan = response.data as unknown as TaskPlan;
                set((store) => {
                  store.currentPlan = plan;
                  store.planValidation = null;
                  store.isPlanLoading = false;

                  if (store.currentSessionId) {
                    const session = store.sessions.find((s) => s.id === store.currentSessionId);
                    if (session) {
                      session.plan = plan;
                      session.state = OrchestratorStateType.PLAN;
                      session.updatedAt = new Date();
                    }
                  }

                  store.lastUpdated = new Date();
                });
                return plan;
              }
              throw new Error(response.error || 'Plan creation failed');
            } catch (error) {
              set((store) => {
                store.isPlanLoading = false;
                store.planError = error instanceof Error ? error.message : 'Plan creation failed';
                store.error = error instanceof Error ? error.message : 'Plan creation failed';
                store.currentState = OrchestratorStateType.ERROR;
              });
              return null;
            }
          },

          optimizePlan: async (plan) => {
            set((store) => {
              store.isPlanLoading = true;
            });

            try {
              const response = await apiClient.post('/api/agent/optimize-plan', { plan });
              if (response.success && response.data) {
                const optimizedPlan: TaskPlan = response.data as unknown as TaskPlan;
                set((store) => {
                  store.currentPlan = optimizedPlan;
                  store.isPlanLoading = false;
                  store.lastUpdated = new Date();
                });
                return optimizedPlan;
              }
              throw new Error(response.error || 'Optimization failed');
            } catch (error) {
              set((store) => {
                store.isPlanLoading = false;
                store.error = error instanceof Error ? error.message : 'Optimization failed';
              });
              return null;
            }
          },

          validatePlan: (plan) => {
            const errors: string[] = [];
            const warnings: string[] = [];
            const info: string[] = [];
            const stepIds = new Set<string>();

            plan.steps.forEach((step) => {
              if (stepIds.has(step.id)) {
                errors.push(`Duplicate step ID: ${step.id}`);
              }
              stepIds.add(step.id);

              step.dependsOn.forEach((depId) => {
                if (!plan.steps.some((s) => s.id === depId) && !stepIds.has(depId)) {
                  warnings.push(`Step "${step.id}" depends on non-existent step: ${depId}`);
                }
              });

              if (step.dependsOn.includes(step.id)) {
                errors.push(`Step "${step.id}" cannot depend on itself`);
              }
            });

            plan.steps.forEach((step, index) => {
              if (index > 0 && step.dependsOn.length === 0) {
                info.push(`Step "${step.id}" has no dependencies - may execute independently`);
              }
            });

            // Check for circular dependencies
            const visited = new Set<string>();
            const recursionStack = new Set<string>();
            const stepMap = new Map(plan.steps.map((s) => [s.id, s]));

            const hasCycle = (stepId: string): boolean => {
              visited.add(stepId);
              recursionStack.add(stepId);

              const step = stepMap.get(stepId);
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
                  errors.push(`Circular dependency detected involving step: ${step.id}`);
                  break;
                }
              }
            }

            set((store) => {
              store.planValidation = { valid: errors.length === 0, errors, warnings, info };
            });
          },

          updatePlanStep: (stepId, updates) => {
            set((store) => {
              if (store.currentPlan) {
                const stepIndex = store.currentPlan.steps.findIndex((s) => s.id === stepId);
                if (stepIndex !== -1) {
                  Object.assign(store.currentPlan.steps[stepIndex], updates);
                }
              }
            });
          },

          addPlanStep: (step) => {
            set((store) => {
              if (store.currentPlan) {
                store.currentPlan.steps.push(step);
              }
            });
          },

          removePlanStep: (stepId) => {
            set((store) => {
              if (store.currentPlan) {
                store.currentPlan.steps = store.currentPlan.steps.filter((s) => s.id !== stepId);
                store.currentPlan.steps.forEach((step) => {
                  step.dependsOn = step.dependsOn.filter((depId) => depId !== stepId);
                });
              }
            });
          },

          reorderPlanSteps: (stepIds) => {
            set((store) => {
              if (store.currentPlan) {
                const stepMap = new Map(store.currentPlan.steps.map((s) => [s.id, s]));
                store.currentPlan.steps = stepIds
                  .map((id) => stepMap.get(id))
                  .filter((s): s is TaskPlanStep => s !== undefined);
              }
            });
          },

          // ============================================
          // Execution Actions
          // ============================================

          executePlan: async (plan, options) => {
            set((store) => {
              store.isExecutionLoading = true;
              store.executionError = null;
              store.currentState = OrchestratorStateType.EXECUTE;
              store.executionProgress = {
                state: OrchestratorStateType.EXECUTE,
                progress: 0,
                completedSteps: 0,
                totalSteps: plan.steps.length,
              };

              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.state = OrchestratorStateType.EXECUTE;
                  session.updatedAt = new Date();
                }
              }
            });

            try {
              const response = await apiClient.post('/api/agent/execute-plan', {
                plan,
                ...options,
              });

              if (response.success && response.data) {
                const execution: ChainExecutionResult = response.data as unknown as ChainExecutionResult;
                set((store) => {
                  store.currentExecution = execution;
                  store.executionTimeline = execution.steps;
                  store.executionProgress = {
                    state: execution.success ? OrchestratorStateType.RESPOND : OrchestratorStateType.REFLECT,
                    progress: 100,
                    completedSteps: execution.steps.length,
                    totalSteps: execution.steps.length,
                  };
                  store.isExecutionLoading = false;

                  if (store.currentSessionId) {
                    const session = store.sessions.find((s) => s.id === store.currentSessionId);
                    if (session) {
                      session.execution = execution;
                      session.state = execution.success ? OrchestratorStateType.RESPOND : OrchestratorStateType.REFLECT;
                      session.updatedAt = new Date();
                    }
                  }

                  if (execution.success) {
                    store.currentState = OrchestratorStateType.RESPOND;
                  } else {
                    store.currentState = OrchestratorStateType.REFLECT;
                  }

                  store.stats = {
                    totalSessions: store.sessions.length,
                    totalMessages: store.sessions.reduce((sum, s) => sum + s.messages.length, 0),
                    totalExecutions: (store.stats?.totalExecutions || 0) + 1,
                    totalTokensUsed: (store.stats?.totalTokensUsed || 0) + execution.totalTokensUsed,
                    totalCostUsd: (store.stats?.totalCostUsd || 0) + execution.totalCostUsd,
                    successRate: execution.success ? 100 : (store.stats?.successRate || 100),
                    averageResponseTime: execution.totalTimeMs / Math.max(execution.steps.length, 1),
                    agentsUsed: store.stats?.agentsUsed || [],
                  };

                  store.lastUpdated = new Date();
                });
                return execution;
              }
              throw new Error(response.error || 'Execution failed');
            } catch (error) {
              set((store) => {
                store.isExecutionLoading = false;
                store.executionError = error instanceof Error ? error.message : 'Execution failed';
                store.error = error instanceof Error ? error.message : 'Execution failed';
                store.currentState = OrchestratorStateType.ERROR;
              });
              return null;
            }
          },

          cancelExecution: () => {
            set((store) => {
              store.currentState = OrchestratorStateType.IDLE;
              store.executionProgress = null;
              store.isExecutionLoading = false;
              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.state = OrchestratorStateType.IDLE;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          retryExecution: () => {
            const state = get();
            if (state.currentPlan) {
              get().executePlan(state.currentPlan);
            }
          },

          getExecutionProgress: (executionId) => {
            // Progress is already tracked in executionProgress
            // This exists for API consistency with polling support
          },

          // ============================================
          // Agent Actions
          // ============================================

          fetchAvailableAgents: async () => {
            set((store) => {
              store.isAgentsLoading = true;
              store.agentsError = null;
            });

            try {
              const response = await apiClient.get('/api/agent/agents');
              if (response.success && response.data) {
                const responseData = response.data as unknown as { agents?: any[] };
                const agents: AgentInfo[] = (responseData.agents || []).map((agent: any) => ({
                  type: agent.type,
                  name: agent.name,
                  description: agent.description,
                  version: agent.version,
                  status: agent.status || 'idle',
                  isAvailable: agent.status !== 'error' && agent.status !== 'maintenance',
                  isConnected: true,
                  category: mapAgentToCategory(agent.type),
                  tools: agent.tools,
                  metrics: agent.metrics,
                  capabilities: agent.capabilities || [],
                  requiredPlan: agent.requiredPlan,
                  lastHeartbeat: agent.lastHeartbeat ? new Date(agent.lastHeartbeat) : undefined,
                  healthMessage: agent.healthMessage,
                  supportedProviders: agent.supportedProviders,
                }));
                set((store) => {
                  store.availableAgents = agents;
                  store.isAgentsLoading = false;
                  store.lastUpdated = new Date();
                });
              }
            } catch (error) {
              set((store) => {
                store.isAgentsLoading = false;
                store.agentsError = error instanceof Error ? error.message : 'Failed to fetch agents';
                store.error = error instanceof Error ? error.message : 'Failed to fetch agents';
              });
            }
          },

          selectAgents: (selections) => {
            set((store) => {
              store.selectedAgents = selections;
              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.selectedAgents = selections;
                  session.updatedAt = new Date();
                }
              }
            });
          },

          delegateToAgent: async (request) => {
            try {
              const response = await apiClient.post('/api/agent/delegate', request);
              if (response.success && response.data) {
                return response.data as unknown as AgentDelegationResult;
              }
              return null;
            } catch (error) {
              set((store) => {
                store.error = error instanceof Error ? error.message : 'Delegation failed';
              });
              return null;
            }
          },

          executeBatch: async (request) => {
            try {
              const response = await apiClient.post('/api/agent/batch-execute', request);
              if (response.success && response.data) {
                return response.data as unknown as BatchExecutionResult;
              }
              return null;
            } catch (error) {
              set((store) => {
                store.error = error instanceof Error ? error.message : 'Batch execution failed';
              });
              return null;
            }
          },

          // ============================================
          // Reflection Actions
          // ============================================

          generateReflection: async (executionResults) => {
            set((store) => {
              store.isReflectionLoading = true;
              store.reflectionError = null;
              store.currentState = OrchestratorStateType.REFLECT;
            });

            try {
              const response = await apiClient.post('/api/agent/reflect', {
                executionResults,
              });

              if (response.success && response.data) {
                const reflection: ExecutionReflection = response.data as unknown as ExecutionReflection;
                set((store) => {
                  store.currentReflection = reflection;
                  store.reflectionHistory.unshift({
                    id: generateId(),
                    executionId: executionResults.planId || generateId(),
                    reflection,
                    createdAt: new Date(),
                  });
                  store.isReflectionLoading = false;
                  store.currentState = OrchestratorStateType.RESPOND;

                  if (store.currentSessionId) {
                    const session = store.sessions.find((s) => s.id === store.currentSessionId);
                    if (session) {
                      session.reflection = reflection;
                      session.state = OrchestratorStateType.RESPOND;
                      session.updatedAt = new Date();
                    }
                  }

                  store.lastUpdated = new Date();
                });
                return reflection;
              }
              throw new Error(response.error || 'Reflection generation failed');
            } catch (error) {
              set((store) => {
                store.isReflectionLoading = false;
                store.reflectionError = error instanceof Error ? error.message : 'Reflection generation failed';
                store.error = error instanceof Error ? error.message : 'Reflection generation failed';
                store.currentState = OrchestratorStateType.ERROR;
              });
              return null;
            }
          },

          storeReflectionInsight: (data) => {
            set((store) => {
              if (store.currentSessionId) {
                const session = store.sessions.find((s) => s.id === store.currentSessionId);
                if (session) {
                  session.metadata = {
                    ...session.metadata,
                    reflectionFeedback: {
                      ...((session.metadata?.reflectionFeedback as any) || {}),
                      [data.reflectionId || 'default']: data,
                    },
                  };
                  session.updatedAt = new Date();
                }
              }
            });
          },

          getReflectionHistory: () => {
            // History is already maintained in memory
          },

          // ============================================
          // Memory Actions
          // ============================================

          fetchMemories: async (options) => {
            set((store) => {
              store.isMemoryLoading = true;
              store.memoryError = null;
            });

            try {
              const queryParams = new URLSearchParams();
              if (options?.type) queryParams.set('type', options.type);
              if (options?.source) queryParams.set('source', options.source);
              if (options?.sessionId) queryParams.set('sessionId', options.sessionId);

              const response = await apiClient.get(`/api/agent/memories?${queryParams.toString()}`);

              if (response.success && response.data) {
                const responseData = response.data as unknown as { memories?: any[] };
                const memories: MemoryStore[] = (responseData.memories || []).map((m: any) => ({
                  id: m.id,
                  content: m.content,
                  type: m.type as MemoryType,
                  importance: m.importance || 0.5,
                  timestamp: new Date(m.timestamp || m.createdAt || Date.now()),
                  accessCount: m.accessCount || 0,
                  lastAccessedAt: m.lastAccessedAt ? new Date(m.lastAccessedAt) : undefined,
                  ttlHours: m.ttlHours,
                  expiresAt: m.expiresAt ? new Date(m.expiresAt) : undefined,
                  source: m.source,
                  sessionId: m.sessionId,
                  agentType: m.agentType,
                  tags: m.tags,
                  similarity: m.similarity,
                  metadata: m.metadata,
                }));

                set((store) => {
                  store.memories = memories;
                  store.isMemoryLoading = false;
                  store.lastUpdated = new Date();
                });
              }
            } catch (error) {
              set((store) => {
                store.isMemoryLoading = false;
                store.memoryError = error instanceof Error ? error.message : 'Failed to fetch memories';
                store.error = error instanceof Error ? error.message : 'Failed to fetch memories';
              });
            }
          },

          searchMemories: async (query, options) => {
            set((store) => {
              store.isMemoryLoading = true;
              store.memoryError = null;
            });

            try {
              const response = await apiClient.post('/api/agent/memories/search', {
                query,
                ...options,
              });

              if (response.success && response.data) {
                const responseData = response.data as unknown as { memories?: any[] };
                const memories: MemoryStore[] = (responseData.memories || []).map((m: any) => ({
                  id: m.id,
                  content: m.content,
                  type: m.type as MemoryType,
                  importance: m.importance || 0.5,
                  timestamp: new Date(m.timestamp || m.createdAt || Date.now()),
                  accessCount: m.accessCount || 0,
                  lastAccessedAt: m.lastAccessedAt ? new Date(m.lastAccessedAt) : undefined,
                  ttlHours: m.ttlHours,
                  expiresAt: m.expiresAt ? new Date(m.expiresAt) : undefined,
                  source: m.source,
                  sessionId: m.sessionId,
                  agentType: m.agentType,
                  tags: m.tags,
                  similarity: m.similarity,
                  metadata: m.metadata,
                }));

                set((store) => {
                  store.memories = memories;
                  store.isMemoryLoading = false;
                });
              }
            } catch (error) {
              set((store) => {
                store.isMemoryLoading = false;
                store.memoryError = error instanceof Error ? error.message : 'Memory search failed';
              });
            }
          },

          storeMemory: async (content, type, importance, metadata) => {
            try {
              const response = await apiClient.post('/api/agent/memories', {
                content,
                type,
                importance,
                metadata,
                sessionId: get().currentSessionId,
              });

              if (response.success && response.data) {
                const responseData = response.data as unknown as { id?: string };
                const newMemory: MemoryStore = {
                  id: responseData.id || generateId(),
                  content,
                  type,
                  importance,
                  timestamp: new Date(),
                  accessCount: 0,
                  tags: metadata?.tags,
                  metadata,
                  sessionId: get().currentSessionId || undefined,
                };

                set((store) => {
                  store.memories.unshift(newMemory);
                });
              }
            } catch (error) {
              set((store) => {
                store.memoryError = error instanceof Error ? error.message : 'Failed to store memory';
              });
            }
          },

          updateMemory: async (memoryId, updates) => {
            try {
              await apiClient.put(`/api/agent/memories/${memoryId}`, updates);
              set((store) => {
                const index = store.memories.findIndex((m) => m.id === memoryId);
                if (index !== -1) {
                  Object.assign(store.memories[index], updates);
                }
              });
            } catch (error) {
              set((store) => {
                store.memoryError = error instanceof Error ? error.message : 'Failed to update memory';
              });
            }
          },

          deleteMemory: async (memoryId) => {
            try {
              await apiClient.delete(`/api/agent/memories/${memoryId}`);
              set((store) => {
                store.memories = store.memories.filter((m) => m.id !== memoryId);
              });
            } catch (error) {
              set((store) => {
                store.memoryError = error instanceof Error ? error.message : 'Failed to delete memory';
              });
            }
          },

          clearMemories: async (type) => {
            try {
              const queryParams = type ? `?type=${type}` : '';
              await apiClient.delete(`/api/agent/memories${queryParams}`);
              set((store) => {
                if (type) {
                  store.memories = store.memories.filter((m) => m.type !== type);
                } else {
                  store.memories = [];
                }
              });
            } catch (error) {
              set((store) => {
                store.memoryError = error instanceof Error ? error.message : 'Failed to clear memories';
              });
            }
          },

          consolidateMemories: async () => {
            try {
              const response = await apiClient.post('/api/agent/memories/consolidate');
              if (response.success) {
                await get().fetchMemories();
                await get().getMemoryStats();
              }
            } catch (error) {
              set((store) => {
                store.memoryError = error instanceof Error ? error.message : 'Memory consolidation failed';
              });
            }
          },

          getMemoryStats: async () => {
            try {
              const response = await apiClient.get('/api/agent/memories/stats');
              if (response.success && response.data) {
                set((store) => {
                  store.memoryStats = response.data as unknown as OrchestratorStore['memoryStats'];
                });
              }
            } catch (error) {
              set((store) => {
                store.memoryError = error instanceof Error ? error.message : 'Failed to get memory stats';
              });
            }
          },

          // ============================================
          // Configuration Actions
          // ============================================

          updateConfig: (config) => {
            set((store) => {
              store.config = { ...store.config, ...config };
            });
          },

          resetConfig: () => {
            set((store) => {
              store.config = { ...DEFAULT_ORCHESTRATOR_CONFIG };
            });
          },

          // ============================================
          // Utility Actions
          // ============================================

          clearError: () => {
            set((store) => {
              store.error = null;
              store.chatError = null;
              store.intentError = null;
              store.planError = null;
              store.executionError = null;
              store.agentsError = null;
              store.reflectionError = null;
              store.memoryError = null;
            });
          },

          refreshAll: async () => {
            const state = get();
            const promises: Promise<void>[] = [];

            promises.push(
              (async () => {
                try {
                  await state.fetchAvailableAgents();
                } catch (error) {
                  // Silently handle individual refresh failures
                }
              })(),
            );

            promises.push(
              (async () => {
                try {
                  await state.getMemoryStats();
                } catch (error) {
                  // Silently handle
                }
              })(),
            );

            if (state.currentSessionId) {
              promises.push(
                (async () => {
                  try {
                    const response = await apiClient.get(`/api/agent/sessions/${state.currentSessionId}`);
                    if (response.success && response.data) {
                      set((store) => {
                        const session = store.sessions.find((s) => s.id === state.currentSessionId);
                        if (session && response.data) {
                          Object.assign(session, response.data);
                          session.updatedAt = new Date();
                        }
                      });
                    }
                  } catch (error) {
                    // Silently handle
                  }
                })(),
              );
            }

            await Promise.allSettled(promises);
            set((store) => {
              store.lastUpdated = new Date();
            });
          },

          resetStore: () => {
            set((store) => {
              store.currentState = OrchestratorStateType.IDLE;
              store.currentSessionId = null;
              store.sessions = [];
              store.sessionHistory = [];
              store.currentIntent = null;
              store.currentPlan = null;
              store.currentExecution = null;
              store.currentReflection = null;
              store.executionProgress = null;
              store.chatMessages = [];
              store.streamingStatus = 'idle';
              store.isChatLoading = false;
              store.chatError = null;
              store.intentHistory = [];
              store.isIntentLoading = false;
              store.intentError = null;
              store.planValidation = null;
              store.isPlanLoading = false;
              store.planError = null;
              store.executionTimeline = [];
              store.isExecutionLoading = false;
              store.executionError = null;
              store.availableAgents = [];
              store.selectedAgents = [];
              store.isAgentsLoading = false;
              store.agentsError = null;
              store.reflectionHistory = [];
              store.isReflectionLoading = false;
              store.reflectionError = null;
              store.memories = [];
              store.memoryStats = null;
              store.isMemoryLoading = false;
              store.memoryError = null;
              store.config = { ...DEFAULT_ORCHESTRATOR_CONFIG };
              store.metrics = null;
              store.health = null;
              store.stats = null;
              store.lastUpdated = null;
              store.error = null;
            });
          },

          exportSession: async (sessionId) => {
            try {
              const response = await apiClient.get(`/api/agent/sessions/${sessionId}/export`);
              if (response.success && response.data) {
                return response.data;
              }
              return null;
            } catch (error) {
              set((store) => {
                store.error = error instanceof Error ? error.message : 'Export failed';
              });
              return null;
            }
          },

          importSession: (data) => {
            if (data && data.id) {
              set((store) => {
                const existingIndex = store.sessions.findIndex((s) => s.id === data.id);
                if (existingIndex !== -1) {
                  store.sessions[existingIndex] = data;
                } else {
                  store.sessions.unshift(data);
                }
              });
            }
          },

          // ============================================
          // Event Listeners
          // ============================================

          addEventListener: (_listener) => {
            // Event listeners managed internally
            // Placeholder for future event system integration
          },

          removeEventListener: (_listener) => {
            // Event listeners managed internally
            // Placeholder for future event system integration
          },
        })),
        {
          name: 'orchestrator-store',
          partialize: (state) => ({
            sessions: state.sessions.map((s) => ({
              ...s,
              messages: s.messages.slice(-100), // Keep last 100 messages per session
            })),
            config: state.config,
            intentHistory: state.intentHistory.slice(0, 100),
            reflectionHistory: state.reflectionHistory.slice(0, 50),
          }),
        },
      ),
    ),
  ),
);

// Export default
export default useOrchestratorStore;
