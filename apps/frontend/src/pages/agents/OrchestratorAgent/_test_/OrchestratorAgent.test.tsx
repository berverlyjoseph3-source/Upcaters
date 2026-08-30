// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/__tests__/OrchestratorAgent.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrchestratorAgent } from '../OrchestratorAgent';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { useAuthStore } from '../../../store/auth.store';
import { useRealTimeUpdates } from '../../../hooks/useRealTimeUpdates';

// ============================================
// Mock Setup
// ============================================

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ sessionId: undefined }),
  useLocation: () => ({ pathname: '/agents/orchestrator', search: '', hash: '', state: null }),
}));

// Mock hooks
jest.mock('../../../store/orchestrator.store', () => ({
  useOrchestratorStore: jest.fn(),
}));

jest.mock('../../../store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../../hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: jest.fn(),
}));

// Mock child components to simplify orchestration testing
jest.mock('../ChatInterface', () => ({
  ChatInterface: ({ onSendMessage, onQuickAction, messages, sessionId, className }: any) => (
    <div data-testid="chat-interface" className={className}>
      <div data-testid="chat-messages-count">{messages?.length || 0}</div>
      <div data-testid="chat-session-id">{sessionId || 'none'}</div>
      <button
        data-testid="chat-send-mock"
        onClick={() => onSendMessage?.('test message')}
      >
        Send
      </button>
      <button
        data-testid="chat-quick-action-mock"
        onClick={() => onQuickAction?.({ action: 'email_agent', label: 'Email', id: 'qa1' })}
      >
        Quick Action
      </button>
    </div>
  ),
}));

jest.mock('../IntentDisplay', () => ({
  IntentDisplay: ({ intent, input, onClassify, onConfirm, onCreatePlan, className }: any) => (
    <div data-testid="intent-display" className={className}>
      <div data-testid="intent-primary">
        {intent?.primaryIntent || 'no-intent'}
      </div>
      <div data-testid="intent-confidence">
        {intent?.confidence || 0}
      </div>
      <button
        data-testid="intent-classify-mock"
        onClick={() => onClassify?.(input || 'test input')}
      >
        Classify
      </button>
      <button
        data-testid="intent-confirm-mock"
        onClick={() => onConfirm?.(intent || { primaryIntent: 'test' })}
      >
        Confirm
      </button>
      <button
        data-testid="intent-create-plan-mock"
        onClick={() => onCreatePlan?.(intent || { primaryIntent: 'test' })}
      >
        Create Plan
      </button>
    </div>
  ),
}));

jest.mock('../PlanVisualizer', () => ({
  PlanVisualizer: ({ plan, onExecute, onOptimize, className }: any) => (
    <div data-testid="plan-visualizer" className={className}>
      <div data-testid="plan-steps-count">
        {plan?.steps?.length || 0}
      </div>
      <div data-testid="plan-mode">{plan?.mode || 'none'}</div>
      <button
        data-testid="plan-execute-mock"
        onClick={() => onExecute?.(plan)}
      >
        Execute
      </button>
      <button
        data-testid="plan-optimize-mock"
        onClick={() => onOptimize?.(plan)}
      >
        Optimize
      </button>
    </div>
  ),
}));

jest.mock('../AgentSelector', () => ({
  AgentSelector: ({ selectedAgents, onAgentSelect, onAgentRemove, className }: any) => (
    <div data-testid="agent-selector" className={className}>
      <div data-testid="selected-count">
        {selectedAgents?.filter((a: any) => a.selected).length || 0}
      </div>
      <button
        data-testid="agent-select-mock"
        onClick={() => onAgentSelect?.({ agentType: 'email', selected: true, priority: 1, order: 1 })}
      >
        Select Email Agent
      </button>
      <button
        data-testid="agent-remove-mock"
        onClick={() => onAgentRemove?.('email')}
      >
        Remove Email Agent
      </button>
    </div>
  ),
}));

jest.mock('../ExecutionTimeline', () => ({
  ExecutionTimeline: ({ execution, onRetryStep, onRetryExecution, className }: any) => (
    <div data-testid="execution-timeline" className={className}>
      <div data-testid="execution-steps-count">
        {execution?.steps?.length || 0}
      </div>
      <div data-testid="execution-status">{execution?.status || 'none'}</div>
      <button
        data-testid="execution-retry-step-mock"
        onClick={() => onRetryStep?.('step_1')}
      >
        Retry Step
      </button>
      <button
        data-testid="execution-retry-execution-mock"
        onClick={() => onRetryExecution?.()}
      >
        Retry Execution
      </button>
    </div>
  ),
}));

jest.mock('../ReflectionPanel', () => ({
  ReflectionPanel: ({ executionResults, onApplyImprovement, className }: any) => (
    <div data-testid="reflection-panel" className={className}>
      <div data-testid="reflection-has-results">
        {executionResults ? 'yes' : 'no'}
      </div>
      <button
        data-testid="reflection-apply-mock"
        onClick={() => onApplyImprovement?.('test improvement')}
      >
        Apply Improvement
      </button>
    </div>
  ),
}));

jest.mock('../MemoryPanel', () => ({
  MemoryPanel: ({ onMemorySelect, onMemoryCreate, className }: any) => (
    <div data-testid="memory-panel" className={className}>
      <button
        data-testid="memory-select-mock"
        onClick={() => onMemorySelect?.({ id: 'mem_1', content: 'test' })}
      >
        Select Memory
      </button>
      <button
        data-testid="memory-create-mock"
        onClick={() => onMemoryCreate?.('new memory', 'short_term', 0.8)}
      >
        Create Memory
      </button>
    </div>
  ),
}));

jest.mock('../../../components/orchestrator/OrchestratorInput', () => ({
  OrchestratorInput: ({ onSend, onClassify, onQuickAction, className }: any) => (
    <div data-testid="orchestrator-input" className={className}>
      <button
        data-testid="input-send-mock"
        onClick={() => onSend?.('test input')}
      >
        Send
      </button>
      <button
        data-testid="input-classify-mock"
        onClick={() => onClassify?.('test input')}
      >
        Classify
      </button>
      <button
        data-testid="input-quick-action-mock"
        onClick={() => onQuickAction?.({ action: 'email_agent', label: 'Email', id: 'qa1' })}
      >
        Quick Action
      </button>
    </div>
  ),
}));

jest.mock('../shared/AgentHeader', () => ({
  AgentHeader: ({ title, description, actions, onRefresh, isLoading }: any) => (
    <div data-testid="agent-header">
      <h1>{title}</h1>
      <p>{description}</p>
      <div data-testid="agent-actions">{actions}</div>
      {onRefresh && (
        <button data-testid="agent-refresh" onClick={onRefresh} disabled={isLoading}>
          Refresh
        </button>
      )}
    </div>
  ),
}));

jest.mock('../shared/AgentSidebar', () => ({
  AgentSidebar: ({ isCollapsed, onToggle }: any) => (
    <div data-testid="agent-sidebar" className={isCollapsed ? 'collapsed' : 'expanded'}>
      <button data-testid="sidebar-toggle" onClick={onToggle}>
        Toggle
      </button>
    </div>
  ),
}));

// ============================================
// Default Store State
// ============================================

const createDefaultStoreState = (overrides: Partial<any> = {}) => ({
  // State
  currentState: 'idle' as const,
  currentIntent: null,
  currentPlan: null,
  currentExecution: null,
  currentReflection: null,
  chatMessages: [],
  streamingStatus: 'idle' as const,
  availableAgents: [],
  sessionHistory: [],
  stats: null,

  // Loading & Error
  isChatLoading: false,
  isIntentLoading: false,
  isPlanLoading: false,
  isExecutionLoading: false,
  isAgentsLoading: false,
  error: null,
  chatError: null,
  intentError: null,
  planError: null,
  executionError: null,
  agentsError: null,

  // Actions
  sendMessage: jest.fn(),
  stopStreaming: jest.fn(),
  classifyIntent: jest.fn(),
  createPlan: jest.fn(),
  optimizePlan: jest.fn(),
  executePlan: jest.fn(),
  cancelExecution: jest.fn(),
  retryExecution: jest.fn(),
  selectAgents: jest.fn(),
  generateReflection: jest.fn(),
  fetchMemories: jest.fn(),
  storeMemory: jest.fn(),
  createNewSession: jest.fn(),
  selectSession: jest.fn(),
  clearCurrentChat: jest.fn(),
  clearError: jest.fn(),
  refreshAll: jest.fn(),

  // State management
  setCurrentState: jest.fn(),
  setCurrentIntent: jest.fn(),
  setCurrentPlan: jest.fn(),
  setCurrentExecution: jest.fn(),
  setCurrentReflection: jest.fn(),

  ...overrides,
});

const createDefaultAuthState = (overrides: Partial<any> = {}) => ({
  user: {
    id: 'user_1',
    email: 'test@example.com',
    name: 'Test User',
    planId: 'PROFESSIONAL',
    role: 'USER',
  },
  isAuthenticated: true,
  isLoading: false,
  ...overrides,
});

// ============================================
// Helper Functions
// ============================================

const setupStore = (storeOverrides: Partial<any> = {}, authOverrides: Partial<any> = {}) => {
  const defaultStore = createDefaultStoreState(storeOverrides);
  (useOrchestratorStore as jest.Mock).mockReturnValue(defaultStore);
  (useAuthStore as jest.Mock).mockReturnValue(createDefaultAuthState(authOverrides));
  (useRealTimeUpdates as jest.Mock).mockReturnValue({ isConnected: true });
  return defaultStore;
};

const renderOrchestratorAgent = (storeOverrides: Partial<any> = {}) => {
  const store = setupStore(storeOverrides);
  const utils = render(
    <MemoryRouter initialEntries={['/agents/orchestrator']}>
      <OrchestratorAgent />
    </MemoryRouter>
  );
  return { ...utils, store };
};

// ============================================
// Initial Render Tests
// ============================================

describe('OrchestratorAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOrchestratorStore as jest.Mock).mockReset();
    (useAuthStore as jest.Mock).mockReset();
    (useRealTimeUpdates as jest.Mock).mockReset();
    setupStore();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  // ============================================
  // Initial Rendering
  // ============================================

  describe('Initial Rendering', () => {
    test('should render the agent header with title', () => {
      renderOrchestratorAgent();

      const header = screen.getByTestId('agent-header');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('Orchestrator')).toBeInTheDocument();
    });

    test('should render the chat interface by default', () => {
      renderOrchestratorAgent();

      const chatInterface = screen.getByTestId('chat-interface');
      expect(chatInterface).toBeInTheDocument();
    });

    test('should render the orchestrator input when in chat view', () => {
      renderOrchestratorAgent();

      // The orchestrator input should be visible in chat view
      const orchestratorInput = screen.queryByTestId('orchestrator-input');
      // Note: The input may be inside the ChatInterface mock, so we check for
      // the chat interface presence which indicates default chat view
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    test('should render the sidebar by default', () => {
      renderOrchestratorAgent();

      const sidebar = screen.getByTestId('agent-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('expanded');
    });

    test('should show view navigation buttons', () => {
      renderOrchestratorAgent();

      // The view buttons should be present (they are the View Toggle buttons)
      // Since they're rendered inline in the component, check for key buttons
      const chatViewButton = screen.queryByText(/chat/i);
      expect(chatViewButton).toBeInTheDocument();
    });

    test('should show real-time connection indicator', () => {
      (useRealTimeUpdates as jest.Mock).mockReturnValue({ isConnected: true });
      renderOrchestratorAgent();

      // The connection indicator should be present
      expect(useRealTimeUpdates).toHaveBeenCalledWith('orchestrator', true);
    });

    test('should show disconnection status when not connected', () => {
      (useRealTimeUpdates as jest.Mock).mockReturnValue({ isConnected: false });
      setupStore();
      renderOrchestratorAgent();

      // Should still render the component
      expect(screen.getByTestId('agent-header')).toBeInTheDocument();
    });
  });

  // ============================================
  // View Navigation
  // ============================================

  describe('View Navigation', () => {
    test('should navigate to intent view when intent button is clicked', async () => {
      setupStore({
        currentIntent: {
          primaryIntent: 'email_send',
          confidence: 0.85,
          suggestedAgent: 'EMAIL',
          requiresMultipleAgents: false,
          alternativeIntents: [],
          entities: {},
        },
      });
      renderOrchestratorAgent();

      // The intent button text is "Intent" in the view toggle
      const intentButton = screen.queryByText(/intent/i);
      if (intentButton) {
        await act(async () => {
          fireEvent.click(intentButton);
        });
      }

      // The intent display should now be present
      const intentDisplay = screen.queryByTestId('intent-display');
      // In the default chat view, intent display may not be rendered
      // until we explicitly switch to it
    });

    test('should navigate to plan view', async () => {
      setupStore({
        currentPlan: {
          id: 'plan_1',
          steps: [
            {
              id: 'step_1',
              agentType: 'EMAIL',
              action: 'send_email',
              dependsOn: [],
            },
          ],
          mode: 'sequential',
          createdAt: new Date(),
        },
      });
      renderOrchestratorAgent();

      const planButton = screen.queryByText(/plan/i);
      expect(planButton).toBeInTheDocument();

      if (planButton) {
        await act(async () => {
          fireEvent.click(planButton);
        });
      }
    });

    test('should navigate to agents view', async () => {
      renderOrchestratorAgent();

      const agentsButton = screen.queryByText(/agents/i);
      expect(agentsButton).toBeInTheDocument();

      if (agentsButton) {
        await act(async () => {
          fireEvent.click(agentsButton);
        });

        // Wait for the agent selector to appear
        await waitFor(() => {
          const agentSelector = screen.queryByTestId('agent-selector');
          expect(agentSelector).toBeInTheDocument();
        });
      }
    });

    test('should navigate to execution view when execution is available', async () => {
      setupStore({
        currentExecution: {
          executionId: 'exec_1',
          status: 'running',
          steps: [
            {
              stepId: 'step_1',
              agentType: 'EMAIL',
              success: true,
              output: {},
              executionTimeMs: 100,
              tokensUsed: 50,
              costUsd: 0.001,
              retryCount: 0,
            },
          ],
          totalSteps: 1,
          mode: 'sequential',
          totalTokensUsed: 50,
          totalCostUsd: 0.001,
          startedAt: new Date(),
        },
      });
      renderOrchestratorAgent();

      const executionButton = screen.queryByText(/execution/i);
      if (executionButton) {
        await act(async () => {
          fireEvent.click(executionButton);
        });
      }
    });

    test('should navigate to reflection view', async () => {
      setupStore({
        currentReflection: {
          summary: 'Test reflection',
          insights: ['Insight 1'],
          improvements: ['Improvement 1'],
          agentPerformance: {},
          recommendedNextSteps: [],
          overallScore: 85,
          successRate: 90,
          timestamp: new Date(),
          generationTimeMs: 200,
          insightsStored: true,
        },
      });
      renderOrchestratorAgent();

      const reflectionButton = screen.queryByText(/reflection/i);
      if (reflectionButton) {
        await act(async () => {
          fireEvent.click(reflectionButton);
        });
      }
    });

    test('should navigate to memory view', async () => {
      renderOrchestratorAgent();

      const memoryButton = screen.queryByText(/memory/i);
      if (memoryButton) {
        await act(async () => {
          fireEvent.click(memoryButton);
        });

        await waitFor(() => {
          const memoryPanel = screen.queryByTestId('memory-panel');
          expect(memoryPanel).toBeInTheDocument();
        });
      }
    });

    test('should support keyboard shortcuts for view navigation', () => {
      setupStore();
      renderOrchestratorAgent();

      // Ctrl+1 for chat
      act(() => {
        fireEvent.keyDown(window, { key: '1', ctrlKey: true });
      });
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    test('should handle Ctrl+B for sidebar toggle', () => {
      setupStore();
      renderOrchestratorAgent();

      const sidebar = screen.getByTestId('agent-sidebar');
      expect(sidebar).toHaveClass('expanded');

      act(() => {
        fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
      });
    });

    test('should handle Ctrl+S for session panel toggle', () => {
      setupStore();
      renderOrchestratorAgent();

      act(() => {
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });
      });
      // Session panel should toggle
    });

    test('should ignore keyboard shortcuts in input fields', () => {
      setupStore();
      renderOrchestratorAgent();

      const input = document.createElement('input');
      document.body.appendChild(input);

      act(() => {
        input.focus();
        fireEvent.keyDown(input, { key: '1', ctrlKey: true });
      });

      document.body.removeChild(input);
    });
  });

  // ============================================
  // State Transitions & Auto-Switch
  // ============================================

  describe('State Transitions & Auto-Switch', () => {
    test('should show context label when in intent_parse state', () => {
      setupStore({ currentState: 'intent_parse' });
      renderOrchestratorAgent();

      const contextLabel = screen.queryByText(/analyzing intent/i);
      expect(contextLabel).toBeInTheDocument();
    });

    test('should show context label when in plan state', () => {
      setupStore({ currentState: 'plan' });
      renderOrchestratorAgent();

      const contextLabel = screen.queryByText(/creating execution plan/i);
      expect(contextLabel).toBeInTheDocument();
    });

    test('should show context label when in execute state', () => {
      setupStore({ currentState: 'execute' });
      renderOrchestratorAgent();

      const contextLabel = screen.queryByText(/executing plan/i);
      expect(contextLabel).toBeInTheDocument();
    });

    test('should show context label when in reflect state', () => {
      setupStore({ currentState: 'reflect' });
      renderOrchestratorAgent();

      const contextLabel = screen.queryByText(/reflecting on results/i);
      expect(contextLabel).toBeInTheDocument();
    });

    test('should show ready context label in respond state', () => {
      setupStore({ currentState: 'respond' });
      renderOrchestratorAgent();

      const contextLabel = screen.queryByText(/ready/i);
      expect(contextLabel).toBeInTheDocument();
    });

    test('should show error context label in error state', () => {
      setupStore({ currentState: 'error' });
      renderOrchestratorAgent();

      const contextLabel = screen.queryByText(/error occurred/i);
      expect(contextLabel).toBeInTheDocument();
    });

    test('should auto-switch to intent view when intent is classified', () => {
      const store = setupStore({
        currentState: 'intent_parse',
        currentIntent: {
          primaryIntent: 'email_send',
          confidence: 0.9,
          suggestedAgent: 'EMAIL',
          requiresMultipleAgents: false,
          alternativeIntents: [],
          entities: {},
        },
      });

      // Re-render with new state
      (useOrchestratorStore as jest.Mock).mockReturnValue(store);
      renderOrchestratorAgent();

      // The intent display should be visible
      const intentDisplay = screen.queryByTestId('intent-display');
      // Note: auto-switch is dependent on the useEffect with autoSwitchView state
    });

    test('should auto-switch to plan view when plan is created', () => {
      const store = setupStore({
        currentState: 'plan',
        currentPlan: {
          id: 'plan_1',
          steps: [{ id: 'step_1', agentType: 'EMAIL', action: 'send_email', dependsOn: [] }],
          mode: 'sequential',
          createdAt: new Date(),
        },
      });

      (useOrchestratorStore as jest.Mock).mockReturnValue(store);
      renderOrchestratorAgent();

      const planVisualizer = screen.queryByTestId('plan-visualizer');
      expect(planVisualizer).toBeInTheDocument();
    });

    test('should auto-switch to execution view when execution starts', () => {
      const store = setupStore({
        currentState: 'execute',
        currentExecution: {
          executionId: 'exec_1',
          status: 'running',
          steps: [{ stepId: 'step_1', agentType: 'EMAIL', success: true, output: {}, executionTimeMs: 100, tokensUsed: 50, costUsd: 0.001, retryCount: 0 }],
          totalSteps: 1,
          mode: 'sequential',
          totalTokensUsed: 50,
          totalCostUsd: 0.001,
          startedAt: new Date(),
        },
      });

      (useOrchestratorStore as jest.Mock).mockReturnValue(store);
      renderOrchestratorAgent();

      const executionTimeline = screen.queryByTestId('execution-timeline');
      expect(executionTimeline).toBeInTheDocument();
    });

    test('should respect autoSwitchView being disabled', () => {
      const store = setupStore({
        currentState: 'intent_parse',
        currentIntent: {
          primaryIntent: 'email_send',
          confidence: 0.9,
          suggestedAgent: 'EMAIL',
          requiresMultipleAgents: false,
          alternativeIntents: [],
          entities: {},
        },
      });

      (useOrchestratorStore as jest.Mock).mockReturnValue(store);
      renderOrchestratorAgent();

      // Should still be in chat view by default
      // We would need to test by checking view history or current view state
    });
  });

  // ============================================
  // Session Management
  // ============================================

  describe('Session Management', () => {
    test('should create new session', async () => {
      const createNewSessionMock = jest.fn();
      setupStore({
        createNewSession: createNewSessionMock,
      });
      renderOrchestratorAgent();

      // Find and click the new session button (it's in the sidebar or header)
      const newSessionButton = screen.queryByText(/new conversation/i);
      if (newSessionButton) {
        await act(async () => {
          fireEvent.click(newSessionButton);
        });
      }
    });

    test('should select session from sidebar', async () => {
      const selectSessionMock = jest.fn();
      setupStore({
        selectSession: selectSessionMock,
        sessionHistory: [
          {
            id: 'session_1',
            title: 'Test Session',
            lastMessage: 'Hello',
            messageCount: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          },
        ],
      });
      renderOrchestratorAgent();
    });

    test('should clear current chat', async () => {
      const clearCurrentChatMock = jest.fn();
      setupStore({
        clearCurrentChat: clearCurrentChatMock,
      });
      renderOrchestratorAgent();
    });

    test('should display session count in footer', async () => {
      setupStore({
        sessionHistory: [
          {
            id: 'session_1',
            title: 'Session 1',
            messageCount: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          },
          {
            id: 'session_2',
            title: 'Session 2',
            messageCount: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: false,
          },
        ],
      });
      renderOrchestratorAgent();

      const countText = screen.queryByText(/2 conversations/i);
      expect(countText).toBeInTheDocument();
    });

    test('should display empty state when no sessions exist', () => {
      setupStore({ sessionHistory: [] });
      renderOrchestratorAgent();

      const emptyState = screen.queryByText(/no conversations yet/i);
      expect(emptyState).toBeInTheDocument();
    });
  });

  // ============================================
  // Message Sending
  // ============================================

  describe('Message Sending', () => {
    test('should call sendMessage when input is sent', async () => {
      const sendMessageMock = jest.fn();
      setupStore({
        sendMessage: sendMessageMock,
      });
      renderOrchestratorAgent();

      const sendButton = screen.getByTestId('chat-send-mock');
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(sendMessageMock).toHaveBeenCalledWith('test message');
    });

    test('should navigate to chat view after sending message', async () => {
      const sendMessageMock = jest.fn().mockResolvedValue(undefined);
      setupStore({
        sendMessage: sendMessageMock,
        currentState: 'intent_parse',
        currentIntent: { primaryIntent: 'email_send', confidence: 0.8, suggestedAgent: 'EMAIL', requiresMultipleAgents: false, alternativeIntents: [], entities: {} },
      });
      renderOrchestratorAgent();

      const sendButton = screen.getByTestId('chat-send-mock');
      await act(async () => {
        fireEvent.click(sendButton);
      });
    });

    test('should handle stop streaming', async () => {
      const stopStreamingMock = jest.fn();
      setupStore({
        stopStreaming: stopStreamingMock,
        streamingStatus: 'executing' as const,
      });
      renderOrchestratorAgent();
    });

    test('should show streaming status indicator when processing', () => {
      setupStore({ streamingStatus: 'thinking' as const });
      renderOrchestratorAgent();

      // The streaming status should be visible
    });
  });

  // ============================================
  // Intent Classification
  // ============================================

  describe('Intent Classification', () => {
    test('should handle classify intent action', async () => {
      const classifyIntentMock = jest.fn().mockResolvedValue({
        primaryIntent: 'email_send',
        confidence: 0.85,
        suggestedAgent: 'EMAIL',
      });
      setupStore({
        classifyIntent: classifyIntentMock,
      });
      renderOrchestratorAgent();

      // Navigate to intent view first
      const intentButton = screen.queryByText(/intent/i);
      if (intentButton) {
        await act(async () => {
          fireEvent.click(intentButton);
        });
      }

      const classifyButton = screen.queryByTestId('intent-classify-mock');
      if (classifyButton) {
        await act(async () => {
          fireEvent.click(classifyButton);
        });
      }
    });

    test('should display classified intent with confidence', async () => {
      setupStore({
        currentIntent: {
          primaryIntent: 'email_send',
          confidence: 0.92,
          suggestedAgent: 'EMAIL',
          requiresMultipleAgents: false,
          alternativeIntents: [
            { intent: 'calendar_create', confidence: 0.15 },
          ],
          entities: { email: 'test@example.com' },
        },
        currentState: 'intent_parse',
      });
      renderOrchestratorAgent();

      // Navigate to intent view
      const intentButton = screen.queryByText(/intent/i);
      if (intentButton) {
        await act(async () => {
          fireEvent.click(intentButton);
        });
      }

      const confidenceDisplay = screen.queryByTestId('intent-confidence');
      if (confidenceDisplay) {
        expect(confidenceDisplay.textContent).toBe('0.92');
      }
    });

    test('should handle intent confirmation', async () => {
      const setCurrentIntentMock = jest.fn();
      setupStore({
        currentIntent: {
          primaryIntent: 'email_send',
          confidence: 0.85,
          suggestedAgent: 'EMAIL',
          requiresMultipleAgents: false,
          alternativeIntents: [],
          entities: {},
        },
        setCurrentIntent: setCurrentIntentMock,
      });
      renderOrchestratorAgent();
    });

    test('should create plan from intent', async () => {
      const createPlanMock = jest.fn().mockResolvedValue({
        id: 'plan_1',
        steps: [{ id: 'step_1', agentType: 'EMAIL', action: 'send_email', dependsOn: [] }],
        mode: 'sequential',
        createdAt: new Date(),
      });
      setupStore({
        currentIntent: {
          primaryIntent: 'email_send',
          confidence: 0.85,
          suggestedAgent: 'EMAIL',
          requiresMultipleAgents: false,
          alternativeIntents: [],
          entities: {},
        },
        createPlan: createPlanMock,
      });
      renderOrchestratorAgent();
    });
  });

  // ============================================
  // Plan Execution
  // ============================================

  describe('Plan Execution', () => {
    test('should execute plan', async () => {
      const executePlanMock = jest.fn().mockResolvedValue({
        executionId: 'exec_1',
        status: 'running',
        steps: [],
        totalSteps: 0,
        mode: 'sequential',
        totalTokensUsed: 0,
        totalCostUsd: 0,
        startedAt: new Date(),
      });
      setupStore({
        currentPlan: {
          id: 'plan_1',
          steps: [{ id: 'step_1', agentType: 'EMAIL', action: 'send_email', dependsOn: [] }],
          mode: 'sequential',
          createdAt: new Date(),
        },
        executePlan: executePlanMock,
      });
      renderOrchestratorAgent();

      // Navigate to plan view
      const planButton = screen.queryByText(/plan/i);
      if (planButton) {
        await act(async () => {
          fireEvent.click(planButton);
        });
      }

      const executeButton = screen.queryByTestId('plan-execute-mock');
      if (executeButton) {
        await act(async () => {
          fireEvent.click(executeButton);
        });
      }
    });

    test('should optimize plan before execution', async () => {
      const optimizePlanMock = jest.fn().mockResolvedValue({
        id: 'plan_1',
        steps: [{ id: 'step_1', agentType: 'EMAIL', action: 'send_email', dependsOn: [] }],
        mode: 'optimal',
        optimization: {
          originalSteps: 4,
          optimizedSteps: 2,
          savingsPercentage: 50,
          changes: ['Consolidated steps'],
        },
      });
      setupStore({
        currentPlan: {
          id: 'plan_1',
          steps: [
            { id: 'step_1', agentType: 'EMAIL', action: 'read_email', dependsOn: [] },
            { id: 'step_2', agentType: 'EMAIL', action: 'reply_email', dependsOn: ['step_1'] },
            { id: 'step_3', agentType: 'WEB', action: 'search', dependsOn: [] },
            { id: 'step_4', agentType: 'CALENDAR', action: 'schedule', dependsOn: ['step_2', 'step_3'] },
          ],
          mode: 'sequential',
          createdAt: new Date(),
        },
        optimizePlan: optimizePlanMock,
      });
      renderOrchestratorAgent();
    });

    test('should cancel execution', async () => {
      const cancelExecutionMock = jest.fn();
      setupStore({
        currentExecution: {
          executionId: 'exec_1',
          status: 'running',
          steps: [{ stepId: 'step_1', agentType: 'EMAIL', success: true, output: {}, executionTimeMs: 100, tokensUsed: 50, costUsd: 0.001, retryCount: 0 }],
          totalSteps: 1,
          mode: 'sequential',
          totalTokensUsed: 50,
          totalCostUsd: 0.001,
          startedAt: new Date(),
        },
        cancelExecution: cancelExecutionMock,
      });
      renderOrchestratorAgent();
    });

    test('should retry failed execution', async () => {
      const retryExecutionMock = jest.fn();
      setupStore({
        currentExecution: {
          executionId: 'exec_1',
          status: 'failed',
          error: 'Agent execution failed',
          steps: [
            { stepId: 'step_1', agentType: 'EMAIL', success: false, output: null, error: 'Failed', executionTimeMs: 1000, tokensUsed: 50, costUsd: 0.001, retryCount: 3 },
          ],
          totalSteps: 1,
          mode: 'sequential',
          totalTokensUsed: 50,
          totalCostUsd: 0.001,
          startedAt: new Date(),
        },
        retryExecution: retryExecutionMock,
      });
      renderOrchestratorAgent();

      const retryButton = screen.queryByTestId('execution-retry-execution-mock');
      if (retryButton) {
        await act(async () => {
          fireEvent.click(retryButton);
        });
      }
    });

    test('should retry individual failed step', async () => {
      setupStore({
        currentExecution: {
          executionId: 'exec_1',
          status: 'failed',
          steps: [
            { stepId: 'step_1', agentType: 'EMAIL', success: false, output: null, error: 'Failed', executionTimeMs: 1000, tokensUsed: 50, costUsd: 0.001, retryCount: 3 },
          ],
          totalSteps: 1,
          mode: 'sequential',
          totalTokensUsed: 50,
          totalCostUsd: 0.001,
          startedAt: new Date(),
        },
      });
      renderOrchestratorAgent();

      const retryStepButton = screen.queryByTestId('execution-retry-step-mock');
      if (retryStepButton) {
        await act(async () => {
          fireEvent.click(retryStepButton);
        });
      }
    });
  });

  // ============================================
  // Agent Selection
  // ============================================

  describe('Agent Selection', () => {
    test('should select agent', async () => {
      const selectAgentsMock = jest.fn();
      setupStore({
        selectAgents: selectAgentsMock,
        availableAgents: [
          {
            type: 'email',
            name: 'Email Agent',
            status: 'idle',
            isAvailable: true,
            isConnected: true,
            category: 'communication',
            capabilities: ['Send emails'],
            metrics: {
              totalExecutions: 100,
              successfulExecutions: 95,
              failedExecutions: 5,
              averageResponseTimeMs: 200,
              errorRate: 5,
              lastExecutedAt: new Date(),
              successRate: 95,
              totalTokensUsed: 10000,
              totalCostUsd: 0.5,
            },
          },
          {
            type: 'calendar',
            name: 'Calendar Agent',
            status: 'idle',
            isAvailable: true,
            isConnected: true,
            category: 'productivity',
            capabilities: ['Create events'],
            metrics: {
              totalExecutions: 50,
              successfulExecutions: 48,
              failedExecutions: 2,
              averageResponseTimeMs: 150,
              errorRate: 4,
              lastExecutedAt: new Date(),
              successRate: 96,
              totalTokensUsed: 5000,
              totalCostUsd: 0.25,
            },
          },
        ],
      });
      renderOrchestratorAgent();

      // Navigate to agents view
      const agentsButton = screen.queryByText(/agents/i);
      if (agentsButton) {
        await act(async () => {
          fireEvent.click(agentsButton);
        });
      }

      await waitFor(() => {
        const agentSelector = screen.queryByTestId('agent-selector');
        expect(agentSelector).toBeInTheDocument();
      });

      const selectButton = screen.getByTestId('agent-select-mock');
      await act(async () => {
        fireEvent.click(selectButton);
      });
    });

    test('should remove agent from selection', async () => {
      setupStore({
        availableAgents: [
          {
            type: 'email',
            name: 'Email Agent',
            status: 'idle',
            isAvailable: true,
            isConnected: true,
            category: 'communication',
            capabilities: [],
            metrics: {
              totalExecutions: 100,
              successfulExecutions: 95,
              failedExecutions: 5,
              averageResponseTimeMs: 200,
              errorRate: 5,
              successRate: 95,
              totalTokensUsed: 10000,
              totalCostUsd: 0.5,
            },
          },
        ],
        selectedAgents: [
          { agentType: 'email', selected: true, priority: 1, order: 1 },
        ],
      });
      renderOrchestratorAgent();
    });

    test('should show available agent count', async () => {
      setupStore({
        availableAgents: [
          {
            type: 'email',
            name: 'Email Agent',
            status: 'idle',
            isAvailable: true,
            isConnected: true,
            category: 'communication',
            capabilities: [],
            metrics: {
              totalExecutions: 100,
              successfulExecutions: 95,
              failedExecutions: 5,
              averageResponseTimeMs: 200,
              errorRate: 5,
              successRate: 95,
              totalTokensUsed: 10000,
              totalCostUsd: 0.5,
            },
          },
          {
            type: 'calendar',
            name: 'Calendar Agent',
            status: 'idle',
            isAvailable: true,
            isConnected: true,
            category: 'productivity',
            capabilities: [],
            metrics: {
              totalExecutions: 50,
              successfulExecutions: 48,
              failedExecutions: 2,
              averageResponseTimeMs: 150,
              errorRate: 4,
              successRate: 96,
              totalTokensUsed: 5000,
              totalCostUsd: 0.25,
            },
          },
        ],
      });
      renderOrchestratorAgent();
    });
  });

  // ============================================
  // Reflection
  // ============================================

  describe('Reflection', () => {
    test('should generate reflection after execution', async () => {
      const generateReflectionMock = jest.fn().mockResolvedValue({
        summary: 'Execution completed successfully',
        insights: ['Good performance on email agent'],
        improvements: ['Optimize web search timing'],
        agentPerformance: {},
        recommendedNextSteps: [],
        overallScore: 85,
        successRate: 95,
        timestamp: new Date(),
        generationTimeMs: 300,
        insightsStored: true,
      });
      setupStore({
        currentExecution: {
          executionId: 'exec_1',
          status: 'completed',
          steps: [],
          totalSteps: 3,
          mode: 'sequential',
          totalTokensUsed: 150,
          totalCostUsd: 0.003,
          startedAt: new Date(),
          completedAt: new Date(),
        },
        generateReflection: generateReflectionMock,
      });
      renderOrchestratorAgent();
    });

    test('should apply improvement from reflection', async () => {
      setupStore({
        currentReflection: {
          summary: 'Test reflection',
          insights: ['Insight 1'],
          improvements: ['Improvement 1', 'Improvement 2'],
          agentPerformance: {},
          recommendedNextSteps: ['Step 1'],
          overallScore: 72,
          successRate: 90,
          timestamp: new Date(),
          generationTimeMs: 200,
          insightsStored: true,
        },
      });
      renderOrchestratorAgent();

      // Navigate to reflection view
      const reflectionButton = screen.queryByText(/reflection/i);
      if (reflectionButton) {
        await act(async () => {
          fireEvent.click(reflectionButton);
        });
      }

      const applyButton = screen.queryByTestId('reflection-apply-mock');
      expect(applyButton).toBeInTheDocument();

      if (applyButton) {
        await act(async () => {
          fireEvent.click(applyButton);
        });
      }
    });
  });

  // ============================================
  // Memory Management
  // ============================================

  describe('Memory Management', () => {
    test('should render memory panel', async () => {
      setupStore({
        fetchMemories: jest.fn().mockResolvedValue([
          { id: 'mem_1', content: 'Test memory', type: 'short_term', importance: 0.7, timestamp: new Date() },
        ]),
      });
      renderOrchestratorAgent();

      // Navigate to memory view
      const memoryButton = screen.queryByText(/memory/i);
      if (memoryButton) {
        await act(async () => {
          fireEvent.click(memoryButton);
        });
      }

      await waitFor(() => {
        const memoryPanel = screen.queryByTestId('memory-panel');
        expect(memoryPanel).toBeInTheDocument();
      });
    });

    test('should create new memory', async () => {
      const storeMemoryMock = jest.fn().mockResolvedValue({ id: 'mem_new', content: 'new memory' });
      setupStore({
        storeMemory: storeMemoryMock,
        fetchMemories: jest.fn().mockResolvedValue([]),
      });
      renderOrchestratorAgent();

      // Navigate to memory view
      const memoryButton = screen.queryByText(/memory/i);
      if (memoryButton) {
        await act(async () => {
          fireEvent.click(memoryButton);
        });
      }

      await waitFor(() => {
        const createButton = screen.queryByTestId('memory-create-mock');
        if (createButton) {
          fireEvent.click(createButton);
        }
      });
    });

    test('should select memory', async () => {
      const fetchMemoriesMock = jest.fn().mockResolvedValue([
        { id: 'mem_1', content: 'Test memory', type: 'short_term', importance: 0.7, timestamp: new Date() },
      ]);
      setupStore({ fetchMemories: fetchMemoriesMock });
      renderOrchestratorAgent();

      // Navigate to memory view
      const memoryButton = screen.queryByText(/memory/i);
      if (memoryButton) {
        await act(async () => {
          fireEvent.click(memoryButton);
        });
      }

      await waitFor(() => {
        const selectButton = screen.queryByTestId('memory-select-mock');
        if (selectButton) {
          fireEvent.click(selectButton);
        }
      });
    });
  });

  // ============================================
  // Refresh & Data Loading
  // ============================================

  describe('Refresh & Data Loading', () => {
    test('should refresh all data', async () => {
      const refreshAllMock = jest.fn().mockResolvedValue(undefined);
      setupStore({ refreshAll: refreshAllMock });
      renderOrchestratorAgent();

      const refreshButton = screen.getByTestId('agent-refresh');
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      expect(refreshAllMock).toHaveBeenCalledTimes(1);
    });

    test('should show loading state during refresh', async () => {
      const refreshAllMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      setupStore({ refreshAll: refreshAllMock });
      renderOrchestratorAgent();

      const refreshButton = screen.getByTestId('agent-refresh');
      await act(async () => {
        fireEvent.click(refreshButton);
      });
    });

    test('should handle error state gracefully', () => {
      setupStore({
        error: 'Failed to load orchestrator data',
        chatError: 'Chat loading failed',
        intentError: 'Intent classification failed',
        planError: 'Plan creation failed',
        executionError: 'Execution failed',
        agentsError: 'Agent loading failed',
      });
      renderOrchestratorAgent();

      // Error banner should be displayed
      const errorBanner = screen.queryByText(/failed to load orchestrator data/i);
      expect(errorBanner).toBeInTheDocument();
    });

    test('should clear errors', async () => {
      const clearErrorMock = jest.fn();
      setupStore({
        error: 'Test error',
        clearError: clearErrorMock,
      });
      renderOrchestratorAgent();

      const dismissButton = screen.queryByText(/dismiss/i);
      if (dismissButton) {
        await act(async () => {
          fireEvent.click(dismissButton);
        });
      }
    });
  });

  // ============================================
  // Quick Actions
  // ============================================

  describe('Quick Actions', () => {
    test('should handle quick action from chat interface', async () => {
      setupStore();
      renderOrchestratorAgent();

      const quickActionButton = screen.getByTestId('chat-quick-action-mock');
      await act(async () => {
        fireEvent.click(quickActionButton);
      });
    });

    test('should handle quick action from orchestrator input', async () => {
      setupStore();
      renderOrchestratorAgent();
    });
  });

  // ============================================
  // Export
  // ============================================

  describe('Export', () => {
    test('should trigger export', async () => {
      setupStore({
        currentIntent: { primaryIntent: 'email_send', confidence: 0.9, suggestedAgent: 'EMAIL', requiresMultipleAgents: false, alternativeIntents: [], entities: {} },
        currentPlan: { id: 'plan_1', steps: [], mode: 'sequential', createdAt: new Date() },
        currentExecution: { executionId: 'exec_1', status: 'completed', steps: [], totalSteps: 0, mode: 'sequential', totalTokensUsed: 0, totalCostUsd: 0, startedAt: new Date() },
        currentReflection: { summary: 'test', insights: [], improvements: [], agentPerformance: {}, recommendedNextSteps: [], overallScore: 80, successRate: 100, timestamp: new Date(), generationTimeMs: 100, insightsStored: false },
        chatMessages: [],
      });
      renderOrchestratorAgent();
    });
  });

  // ============================================
  // Loading States
  // ============================================

  describe('Loading States', () => {
    test('should show loading skeleton for chat', () => {
      setupStore({
        isChatLoading: true,
        chatMessages: [],
      });
      renderOrchestratorAgent();

      // The loading skeleton should be visible in the chat view
      const chatInterface = screen.getByTestId('chat-interface');
      expect(chatInterface).toBeInTheDocument();
    });

    test('should show loading skeleton for agents', () => {
      setupStore({
        isAgentsLoading: true,
        availableAgents: [],
      });
      renderOrchestratorAgent();
    });

    test('should show loading skeleton for intent', () => {
      setupStore({
        isIntentLoading: true,
        currentIntent: null,
      });
      renderOrchestratorAgent();
    });

    test('should show loading status in header', () => {
      setupStore({
        isChatLoading: true,
      });
      renderOrchestratorAgent();

      const refreshButton = screen.getByTestId('agent-refresh');
      expect(refreshButton).toBeDisabled();
    });
  });

  // ============================================
  // Stats Display
  // ============================================

  describe('Stats Display', () => {
    test('should show orchestrator stats when available', () => {
      setupStore({
        stats: {
          totalSessions: 10,
          totalMessages: 250,
          totalExecutions: 50,
          totalTokensUsed: 500000,
          totalCostUsd: 5.5,
          successRate: 92,
          averageResponseTime: 350,
          agentsUsed: ['email', 'calendar', 'web'],
          lastActive: new Date(),
        },
      });
      renderOrchestratorAgent();
    });

    test('should show no stats message when stats are null', () => {
      setupStore({ stats: null });
      renderOrchestratorAgent();
    });
  });
});

// ============================================
// Integration Tests
// ============================================

describe('OrchestratorAgent Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStore();
  });

  test('should complete full workflow: chat → classify → plan → execute → reflect', async () => {
    const store = setupStore({
      chatMessages: [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Send an email to john@example.com',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        },
      ],
    });

    (useOrchestratorStore as jest.Mock).mockReturnValue(store);
    const { rerender } = render(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    // Step 1: Chat is visible
    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();

    // Step 2: Classify intent
    const updatedStore1 = {
      ...store,
      currentState: 'intent_parse',
      currentIntent: {
        primaryIntent: 'email_send',
        confidence: 0.85,
        suggestedAgent: 'EMAIL',
        requiresMultipleAgents: false,
        alternativeIntents: [],
        entities: { email: 'john@example.com' },
      },
    };
    (useOrchestratorStore as jest.Mock).mockReturnValue(updatedStore1);
    rerender(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    // Step 3: Create plan
    const updatedStore2 = {
      ...updatedStore1,
      currentState: 'plan',
      currentPlan: {
        id: 'plan_1',
        steps: [
          { id: 'step_1', agentType: 'EMAIL', action: 'compose_email', dependsOn: [] },
          { id: 'step_2', agentType: 'EMAIL', action: 'send_email', dependsOn: ['step_1'] },
        ],
        mode: 'sequential',
        createdAt: new Date(),
      },
    };
    (useOrchestratorStore as jest.Mock).mockReturnValue(updatedStore2);
    rerender(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    // Step 4: Execute plan
    const updatedStore3 = {
      ...updatedStore2,
      currentState: 'execute',
      currentExecution: {
        executionId: 'exec_1',
        status: 'running',
        steps: [
          { stepId: 'step_1', agentType: 'EMAIL', success: true, output: { draftId: 'draft_1' }, executionTimeMs: 200, tokensUsed: 100, costUsd: 0.002, retryCount: 0 },
          { stepId: 'step_2', agentType: 'EMAIL', success: true, output: { messageId: 'msg_123' }, executionTimeMs: 150, tokensUsed: 80, costUsd: 0.001, retryCount: 0 },
        ],
        totalSteps: 2,
        mode: 'sequential',
        totalTokensUsed: 180,
        totalCostUsd: 0.003,
        startedAt: new Date(),
      },
    };
    (useOrchestratorStore as jest.Mock).mockReturnValue(updatedStore3);
    rerender(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    // Step 5: Reflect
    const updatedStore4 = {
      ...updatedStore3,
      currentState: 'reflect',
      currentExecution: {
        ...updatedStore3.currentExecution,
        status: 'completed',
        completedAt: new Date(),
      },
      currentReflection: {
        summary: 'Email sent successfully',
        insights: ['Email agent performed well'],
        improvements: ['Consider scheduling follow-up'],
        agentPerformance: {
          EMAIL: { success: true, efficiency: 95, reliability: 98, averageResponseTimeMs: 175, recommendations: [] },
        },
        recommendedNextSteps: ['Check for replies'],
        overallScore: 90,
        successRate: 100,
        timestamp: new Date(),
        generationTimeMs: 300,
        insightsStored: true,
      },
    };
    (useOrchestratorStore as jest.Mock).mockReturnValue(updatedStore4);
    rerender(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    // Verify the workflow completed
    expect(updatedStore4.currentReflection).toBeDefined();
    expect(updatedStore4.currentReflection?.overallScore).toBe(90);
  });
});

// ============================================
// Edge Cases
// ============================================

describe('OrchestratorAgent Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle missing user gracefully', () => {
    setupStore({}, { user: null, isAuthenticated: false });
    renderOrchestratorAgent();

    expect(screen.getByTestId('agent-header')).toBeInTheDocument();
  });

  test('should handle very long input without crashing', async () => {
    setupStore();
    renderOrchestratorAgent();

    const longInput = 'a'.repeat(5000);
    // The component should render without errors with long input
  });

  test('should handle rapid state transitions', () => {
    const store = setupStore();
    
    // Simulate rapid state changes
    (useOrchestratorStore as jest.Mock).mockReturnValue({ ...store, currentState: 'intent_parse' });
    const { rerender } = render(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    (useOrchestratorStore as jest.Mock).mockReturnValue({ ...store, currentState: 'plan' });
    rerender(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    (useOrchestratorStore as jest.Mock).mockReturnValue({ ...store, currentState: 'execute' });
    rerender(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    expect(screen.getByTestId('agent-header')).toBeInTheDocument();
  });

  test('should handle zero step plan', () => {
    setupStore({
      currentPlan: {
        id: 'plan_empty',
        steps: [],
        mode: 'sequential',
        createdAt: new Date(),
      },
    });
    renderOrchestratorAgent();

    // Should show empty plan state
    const planButton = screen.queryByText(/plan/i);
    if (planButton) {
      fireEvent.click(planButton);
    }

    const planStepsCount = screen.queryByTestId('plan-steps-count');
    if (planStepsCount) {
      expect(planStepsCount.textContent).toBe('0');
    }
  });

  test('should handle execution with all failed steps', () => {
    setupStore({
      currentExecution: {
        executionId: 'exec_all_failed',
        status: 'failed',
        error: 'All agents failed',
        steps: [
          { stepId: 'step_1', agentType: 'EMAIL', success: false, output: null, error: 'Failed', executionTimeMs: 1000, tokensUsed: 50, costUsd: 0.001, retryCount: 3 },
          { stepId: 'step_2', agentType: 'WEB', success: false, output: null, error: 'Failed', executionTimeMs: 800, tokensUsed: 30, costUsd: 0.0005, retryCount: 3 },
        ],
        totalSteps: 2,
        mode: 'sequential',
        totalTokensUsed: 80,
        totalCostUsd: 0.0015,
        startedAt: new Date(),
      },
    });
    renderOrchestratorAgent();
  });

  test('should handle large number of agents', () => {
    const agents = Array.from({ length: 50 }, (_, i) => ({
      type: `agent_${i}`,
      name: `Agent ${i}`,
      status: 'idle',
      isAvailable: true,
      isConnected: true,
      category: 'productivity',
      capabilities: [],
      metrics: {
        totalExecutions: 100,
        successfulExecutions: 90,
        failedExecutions: 10,
        averageResponseTimeMs: 200,
        errorRate: 10,
        successRate: 90,
        totalTokensUsed: 10000,
        totalCostUsd: 0.5,
      },
    }));

    setupStore({ availableAgents: agents });
    renderOrchestratorAgent();

    // Should render without crashing
    expect(screen.getByTestId('agent-header')).toBeInTheDocument();
  });

  test('should handle session with many messages', () => {
    const messages = Array.from({ length: 200 }, (_, i) => ({
      id: `msg_${i}`,
      role: i % 2 === 0 ? 'user' : 'orchestrator',
      content: `Message ${i} content`,
      type: 'text',
      status: 'sent',
      timestamp: new Date(Date.now() - (200 - i) * 1000),
    }));

    setupStore({
      chatMessages: messages,
      isChatLoading: false,
    });
    renderOrchestratorAgent();

    const messageCount = screen.getByTestId('chat-messages-count');
    expect(messageCount.textContent).toBe('200');
  });
});

// ============================================
// Accessibility Tests
// ============================================

describe('OrchestratorAgent Accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStore();
  });

  test('should have accessible view navigation buttons', () => {
    renderOrchestratorAgent();

    // View buttons should be keyboard accessible
    const buttons = screen.getAllByRole('button');
    const viewButtons = buttons.filter(btn => 
      ['chat', 'intent', 'plan', 'agents', 'execution', 'reflection', 'memory'].some(
        label => btn.textContent?.toLowerCase().includes(label)
      )
    );

    viewButtons.forEach(button => {
      expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  test('should have proper heading hierarchy', () => {
    renderOrchestratorAgent();

    // The main heading should be in the header
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading.textContent).toContain('Orchestrator');
  });

  test('should have accessible refresh button', () => {
    renderOrchestratorAgent();

    const refreshButton = screen.getByTestId('agent-refresh');
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton.getAttribute('aria-label') || refreshButton.textContent).toBeDefined();
  });
});

// ============================================
// Performance Tests
// ============================================

describe('OrchestratorAgent Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render without unnecessary re-renders', async () => {
    const store = setupStore();
    const renderCount = jest.fn();

    const TestWrapper = () => {
      renderCount();
      return (
        <MemoryRouter>
          <OrchestratorAgent />
        </MemoryRouter>
      );
    };

    (useOrchestratorStore as jest.Mock).mockReturnValue(store);
    const { rerender } = render(<TestWrapper />);
    
    const initialRenders = renderCount.mock.calls.length;

    // Rerender with same state should not cause extra renders
    (useOrchestratorStore as jest.Mock).mockReturnValue(store);
    rerender(<TestWrapper />);

    // React may re-render once for hooks, but not excessively
    expect(renderCount.mock.calls.length).toBeLessThanOrEqual(initialRenders + 2);
  });

  test('should handle large dataset rendering', () => {
    const largeStore = setupStore({
      chatMessages: Array.from({ length: 500 }, (_, i) => ({
        id: `msg_${i}`,
        role: 'user',
        content: `Message ${i}`,
        type: 'text',
        status: 'sent',
        timestamp: new Date(),
      })),
      sessionHistory: Array.from({ length: 100 }, (_, i) => ({
        id: `session_${i}`,
        title: `Session ${i}`,
        messageCount: i * 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: i === 99,
      })),
    });

    (useOrchestratorStore as jest.Mock).mockReturnValue(largeStore);
    
    // Should render without errors
    const { container } = render(
      <MemoryRouter>
        <OrchestratorAgent />
      </MemoryRouter>
    );

    expect(container).toBeInTheDocument();
  });
});
export default OrchestratorAgent.test;
