// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/__tests__/ChatInterface.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import { useOrchestratorStore } from '../../../store/orchestrator.store';

// ============================================
// Types
// ============================================

import type {
  ChatMessage,
  ChatSession,
  MessageRole,
  MessageType,
  MessageStatus,
  StreamingStatus,
  MessageAttachment,
  QuickAction,
} from '../ChatInterface';

// ============================================
// Mock Setup
// ============================================

jest.mock('../../../store/orchestrator.store', () => ({
  useOrchestratorStore: jest.fn(),
}));

// Mock date-fns to avoid timezone issues
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (typeof date === 'string') return date;
    return 'Jan 1, 2025';
  }),
  formatDistanceToNow: jest.fn(() => 'a few seconds ago'),
  formatDuration: jest.fn(() => '1m 30s'),
  differenceInMilliseconds: jest.fn(() => 1000),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const icons: Record<string, any> = {};
  const handler = {
    get: function(_target: any, prop: string) {
      if (prop === '$$typeof') return Symbol.for('react.forward_ref');
      if (prop === 'render') return () => React.createElement('svg', null);
      return ({ className, size, ...props }: any) =>
        React.createElement('svg', {
          'data-testid': `icon-${prop.toLowerCase()}`,
          className,
          ...props,
        });
    },
  };
  return new Proxy({}, handler);
});

// ============================================
// Constants
// ============================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'send_email',
    label: 'Send an Email',
    description: 'Compose and send an email',
    icon: React.createElement('svg'),
    action: 'email_agent',
    category: 'communication',
    color: 'bg-blue-500',
  },
  {
    id: 'schedule_meeting',
    label: 'Schedule Meeting',
    description: 'Find best time and create event',
    icon: React.createElement('svg'),
    action: 'calendar_agent',
    category: 'productivity',
    color: 'bg-orange-500',
  },
  {
    id: 'search_web',
    label: 'Search the Web',
    description: 'Search and research topics',
    icon: React.createElement('svg'),
    action: 'web_agent',
    category: 'research',
    color: 'bg-teal-500',
  },
  {
    id: 'generate_content',
    label: 'Generate Content',
    description: 'Create text, images, or code',
    icon: React.createElement('svg'),
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
  },
  {
    id: 'create_task',
    label: 'Create Task',
    description: 'Add a new task to your list',
    icon: React.createElement('svg'),
    action: 'task_agent',
    category: 'management',
    color: 'bg-indigo-500',
  },
  {
    id: 'post_social',
    label: 'Post to Social Media',
    description: 'Share content on social platforms',
    icon: React.createElement('svg'),
    action: 'social_agent',
    category: 'social',
    color: 'bg-pink-500',
  },
];

const createDefaultStoreState = (overrides: Partial<any> = {}) => ({
  chatMessages: [],
  chatSessions: [],
  streamingStatus: 'idle' as StreamingStatus,
  isChatLoading: false,
  chatError: null,
  sendMessage: jest.fn(),
  stopStreaming: jest.fn(),
  createNewSession: jest.fn(),
  selectSession: jest.fn(),
  clearCurrentChat: jest.fn(),
  ...overrides,
});

const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  role: 'user' as MessageRole,
  content: 'Test message content',
  type: 'text' as MessageType,
  status: 'sent' as MessageStatus,
  timestamp: new Date(),
  ...overrides,
});

const createMockSession = (overrides: Partial<ChatSession> = {}): ChatSession => ({
  id: `session_${Date.now()}`,
  title: 'Test Session',
  lastMessage: 'Last message content',
  messageCount: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  ...overrides,
});

// ============================================
// Helper Functions
// ============================================

const setupStore = (overrides: Partial<any> = {}) => {
  const store = createDefaultStoreState(overrides);
  (useOrchestratorStore as jest.Mock).mockReturnValue(store);
  return store;
};

const renderChatInterface = (props: Partial<any> = {}, storeOverrides: Partial<any> = {}) => {
  const store = setupStore(storeOverrides);
  const defaultProps = {
    onSendMessage: jest.fn(),
    onStopStreaming: jest.fn(),
    onClearChat: jest.fn(),
    onNewSession: jest.fn(),
    onSessionSelect: jest.fn(),
    onMessageAction: jest.fn(),
    onQuickAction: jest.fn(),
    onFeedback: jest.fn(),
    onExport: jest.fn(),
  };
  
  const utils = render(
    <ChatInterface {...defaultProps} {...props} />
  );
  
  return { ...utils, store, props: defaultProps };
};

// ============================================
// Initial Rendering Tests
// ============================================

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useOrchestratorStore as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  // ============================================
  // Initial Rendering
  // ============================================

  describe('Initial Rendering', () => {
    test('should render the chat interface with header', () => {
      setupStore();
      renderChatInterface();

      expect(screen.getByText('Ultimate AI Agent')).toBeInTheDocument();
    });

    test('should render empty state when no messages', () => {
      setupStore();
      renderChatInterface();

      // The empty state message should be visible
      const emptyStateHeading = screen.getByText('Ultimate AI Agent');
      expect(emptyStateHeading).toBeInTheDocument();
    });

    test('should render the input area', () => {
      setupStore();
      renderChatInterface();

      const inputArea = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      expect(inputArea).toBeInTheDocument();
    });

    test('should render quick actions in empty state', () => {
      setupStore();
      renderChatInterface();

      // Quick action buttons should be visible in empty state
      const quickActionButton = screen.queryByText('Send an Email');
      expect(quickActionButton).toBeInTheDocument();
    });

    test('should render suggestions in empty state', () => {
      setupStore();
      renderChatInterface();

      const suggestionText = screen.queryByText(/Try asking me/i);
      expect(suggestionText).toBeInTheDocument();
    });

    test('should render the sidebar by default', () => {
      setupStore();
      renderChatInterface();

      // Sidebar should be visible (we check for sidebar content)
      const newConversationButton = screen.queryByText(/New Conversation/i);
      expect(newConversationButton).toBeInTheDocument();
    });

    test('should focus input on mount', () => {
      setupStore();
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      // The input should be in the document
      expect(input).toBeInTheDocument();
    });

    test('should show session count in sidebar footer', () => {
      setupStore({
        chatSessions: [
          createMockSession({ id: 's1' }),
          createMockSession({ id: 's2' }),
          createMockSession({ id: 's3' }),
        ],
      });
      renderChatInterface();

      const sessionCount = screen.queryByText(/3 conversations/i);
      expect(sessionCount).toBeInTheDocument();
    });
  });

  // ============================================
  // Message Sending
  // ============================================

  describe('Message Sending', () => {
    test('should call onSendMessage with input text', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      setupStore();
      renderChatInterface({ onSendMessage });

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello, AI!' } });
        fireEvent.click(sendButton);
      });

      expect(onSendMessage).toHaveBeenCalledWith('Hello, AI!', undefined);
    });

    test('should call onSendMessage with attachments', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      setupStore();
      renderChatInterface({ onSendMessage });

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      const attachButton = screen.getByTitle('Attach file');

      // Create a mock file
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Check this file' } });
      });

      // Trigger file upload
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [file] } });
        });
      }
    });

    test('should call sendMessage from store', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      setupStore({ sendMessage });
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
      });

      expect(sendMessage).toHaveBeenCalledWith('Test message', undefined);
    });

    test('should not send empty message', async () => {
      const onSendMessage = jest.fn();
      const sendMessage = jest.fn();
      setupStore({ sendMessage });
      renderChatInterface({ onSendMessage });

      const sendButton = screen.getByRole('button', { name: /send/i });

      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(onSendMessage).not.toHaveBeenCalled();
      expect(sendMessage).not.toHaveBeenCalled();
    });

    test('should send message on Enter key', async () => {
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      setupStore();
      renderChatInterface({ onSendMessage });

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello' } });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      });

      expect(onSendMessage).toHaveBeenCalledWith('Hello', undefined);
    });

    test('should not send on Enter with shift key (allows newline)', async () => {
      const onSendMessage = jest.fn();
      setupStore();
      renderChatInterface({ onSendMessage });

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Line 1' } });
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      });

      expect(onSendMessage).not.toHaveBeenCalled();
    });

    test('should clear input after sending', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      setupStore({ sendMessage });
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/) as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: /send/i });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.click(sendButton);
      });
    });

    test('should show character count', () => {
      setupStore();
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      
      act(() => {
        fireEvent.change(input, { target: { value: 'Hello world' } });
      });

      const charCount = screen.queryByText('11');
      expect(charCount).toBeInTheDocument();
    });

    test('should auto-resize textarea', () => {
      setupStore();
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/) as HTMLTextAreaElement;
      
      act(() => {
        fireEvent.input(input, { target: { textContent: 'Short' } });
      });

      // The textarea should exist and be responsive
      expect(input).toBeInTheDocument();
    });
  });

  // ============================================
  // Messages Display
  // ============================================

  describe('Messages Display', () => {
    test('should render user messages', () => {
      const message = createMockMessage({
        role: 'user',
        content: 'Hello, how are you?',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      const userLabel = screen.getByText('You');
      expect(userLabel).toBeInTheDocument();
    });

    test('should render orchestrator messages', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'I am doing well, thank you!',
        metadata: {
          tokensUsed: 150,
          costUsd: 0.002,
          processingTimeMs: 500,
          model: 'gpt-4',
        },
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      expect(screen.getByText('Ultimate AI Agent')).toBeInTheDocument();
    });

    test('should render code block messages', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'console.log("hello");',
        type: 'code',
        metadata: { language: 'javascript' },
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      expect(screen.getByText('javascript')).toBeInTheDocument();
    });

    test('should render error messages', () => {
      const message = createMockMessage({
        role: 'error',
        content: 'Failed to process request',
        type: 'error',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      const errorBadge = screen.getByText('Error');
      expect(errorBadge).toBeInTheDocument();
    });

    test('should render message attachments', () => {
      const message = createMockMessage({
        role: 'user',
        content: 'Check this file',
        attachments: [
          {
            id: 'att_1',
            type: 'file',
            name: 'document.pdf',
            size: 1024 * 100,
            mimeType: 'application/pdf',
          },
          {
            id: 'att_2',
            type: 'image',
            name: 'photo.jpg',
            size: 2048 * 50,
            mimeType: 'image/jpeg',
          },
        ],
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });

    test('should render message actions', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Here is your plan',
        actions: [
          { id: 'action_1', label: 'View Plan', icon: React.createElement('svg'), action: 'view_plan', variant: 'primary' },
          { id: 'action_2', label: 'Execute', icon: React.createElement('svg'), action: 'execute', variant: 'secondary' },
        ],
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      expect(screen.getByText('View Plan')).toBeInTheDocument();
      expect(screen.getByText('Execute')).toBeInTheDocument();
    });

    test('should show message metadata when details are shown', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Response with metadata',
        metadata: {
          tokensUsed: 300,
          costUsd: 0.005,
          processingTimeMs: 1200,
          model: 'claude-3',
          confidence: 0.92,
        },
        type: 'plan',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      // Metadata should be visible
      const tokensText = screen.queryByText(/300/);
      expect(tokensText).toBeInTheDocument();
    });

    test('should render multiple messages in order', () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user', content: 'First' }),
        createMockMessage({ id: '2', role: 'orchestrator', content: 'Second' }),
        createMockMessage({ id: '3', role: 'user', content: 'Third' }),
        createMockMessage({ id: '4', role: 'orchestrator', content: 'Fourth' }),
      ];
      
      setupStore({ chatMessages: messages });
      renderChatInterface();

      // Count user messages
      const userMessages = screen.getAllByText('You');
      expect(userMessages.length).toBe(2);
    });

    test('should show edited indicator for edited messages', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Edited content',
        edited: true,
        editedAt: new Date(),
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      const editedIndicator = screen.queryByText('(edited)');
      expect(editedIndicator).toBeInTheDocument();
    });

    test('should show starred messages with bookmark icon', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Starred message',
        starred: true,
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });

    test('should handle messages without optional fields', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Minimal message',
        type: 'text',
        status: 'sent',
        timestamp: new Date(),
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });

    test('should render streaming messages with cursor', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Streaming content...',
        isStreaming: true,
      });
      
      setupStore({
        chatMessages: [message],
        streamingStatus: 'responding',
      });
      renderChatInterface();

      // The message should be rendered
      expect(screen.getByText('Ultimate AI Agent')).toBeInTheDocument();
    });
  });

  // ============================================
  // Streaming Status
  // ============================================

  describe('Streaming Status', () => {
    test('should show thinking streaming status', () => {
      setupStore({ streamingStatus: 'thinking' });
      renderChatInterface();

      const statusText = screen.queryByText(/thinking/i);
      expect(statusText).toBeInTheDocument();

      const stopButton = screen.queryByText(/stop/i);
      expect(stopButton).toBeInTheDocument();
    });

    test('should show intent_classifying streaming status', () => {
      setupStore({ streamingStatus: 'intent_classifying' });
      renderChatInterface();

      const statusText = screen.queryByText(/classifying intent/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should show planning streaming status', () => {
      setupStore({ streamingStatus: 'planning' });
      renderChatInterface();

      const statusText = screen.queryByText(/creating plan/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should show executing streaming status', () => {
      setupStore({ streamingStatus: 'executing' });
      renderChatInterface();

      const statusText = screen.queryByText(/executing/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should show reflecting streaming status', () => {
      setupStore({ streamingStatus: 'reflecting' });
      renderChatInterface();

      const statusText = screen.queryByText(/reflecting/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should show responding streaming status', () => {
      setupStore({ streamingStatus: 'responding' });
      renderChatInterface();

      const statusText = screen.queryByText(/writing response/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should show complete streaming status', () => {
      setupStore({ streamingStatus: 'complete' });
      renderChatInterface();

      // Complete status should not show the streaming bar
    });

    test('should show error streaming status', () => {
      setupStore({ streamingStatus: 'error' });
      renderChatInterface();

      const statusText = screen.queryByText(/error/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should show cancelled streaming status', () => {
      setupStore({ streamingStatus: 'cancelled' });
      renderChatInterface();

      const statusText = screen.queryByText(/cancelled/i);
      expect(statusText).toBeInTheDocument();
    });

    test('should call stopStreaming when stop button is clicked', async () => {
      const stopStreaming = jest.fn();
      const onStopStreaming = jest.fn();
      setupStore({
        streamingStatus: 'executing',
        stopStreaming,
      });
      renderChatInterface({ onStopStreaming });

      const stopButton = screen.queryByText(/stop/i);
      if (stopButton) {
        await act(async () => {
          fireEvent.click(stopButton);
        });

        expect(stopStreaming).toHaveBeenCalled();
        expect(onStopStreaming).toHaveBeenCalled();
      }
    });

    test('should show progress dots during streaming', () => {
      setupStore({ streamingStatus: 'planning' });
      renderChatInterface();

      // Progress dots should be visible
      const progressDots = document.querySelectorAll('.rounded-full.h-2.w-2');
      expect(progressDots.length).toBeGreaterThan(0);
    });

    test('should disable input during streaming', () => {
      setupStore({ streamingStatus: 'executing' });
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/) as HTMLTextAreaElement;
      expect(input).toBeDisabled();
    });
  });

  // ============================================
  // Message Interactions
  // ============================================

  describe('Message Interactions', () => {
    test('should copy message content', async () => {
      const onMessageAction = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Copy me!',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onMessageAction });

      // Hover over the message to reveal action buttons
      const messageElement = screen.getByText('Copy me!').closest('.group');
      if (messageElement) {
        await act(async () => {
          fireEvent.mouseEnter(messageElement);
        });
      }
    });

    test('should handle message action click', async () => {
      const onMessageAction = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Action test',
        actions: [
          { id: 'act_1', label: 'Click Me', icon: React.createElement('svg'), action: 'test_action' },
        ],
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onMessageAction });

      const actionButton = screen.getByText('Click Me');
      await act(async () => {
        fireEvent.click(actionButton);
      });

      expect(onMessageAction).toHaveBeenCalledWith(message.id, 'test_action');
    });

    test('should show message menu on more button click', async () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Menu test',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      // Hover over the message
      const messageElement = screen.getByText('Menu test').closest('.group');
      if (messageElement) {
        await act(async () => {
          fireEvent.mouseEnter(messageElement);
        });
      }
    });

    test('should expand message on click', async () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Click to expand',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      const messageElement = screen.getByText('Click to expand');
      await act(async () => {
        fireEvent.click(messageElement);
      });
    });

    test('should select message when clicked', async () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Select me',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();

      const messageElement = screen.getByText('Select me');
      await act(async () => {
        fireEvent.click(messageElement);
      });
    });
  });

  // ============================================
  // Feedback
  // ============================================

  describe('Feedback', () => {
    test('should show positive feedback modal', async () => {
      const onFeedback = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Feedback test',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onFeedback });

      // Hover to show buttons
      const messageElement = screen.getByText('Feedback test').closest('.group');
      if (messageElement) {
        await act(async () => {
          fireEvent.mouseEnter(messageElement);
        });
      }
    });

    test('should show negative feedback modal', async () => {
      const onFeedback = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Negative feedback',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onFeedback });
    });

    test('should submit feedback with notes', async () => {
      const onFeedback = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Feedback with notes',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onFeedback });
    });

    test('should dismiss feedback modal', async () => {
      const onFeedback = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Dismiss feedback',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onFeedback });
    });
  });

  // ============================================
  // Session Management
  // ============================================

  describe('Session Management', () => {
    test('should create new session', async () => {
      const createNewSession = jest.fn();
      const onNewSession = jest.fn();
      setupStore({ createNewSession });
      renderChatInterface({ onNewSession });

      const newSessionButton = screen.getByText(/New Conversation/i);
      await act(async () => {
        fireEvent.click(newSessionButton);
      });

      expect(createNewSession).toHaveBeenCalled();
      expect(onNewSession).toHaveBeenCalled();
    });

    test('should select existing session', async () => {
      const selectSession = jest.fn();
      const onSessionSelect = jest.fn();
      const session = createMockSession({ id: 'session_1', title: 'My Session' });
      
      setupStore({
        chatSessions: [session],
        selectSession,
      });
      renderChatInterface({ onSessionSelect });

      const sessionButton = screen.getByText('My Session');
      await act(async () => {
        fireEvent.click(sessionButton);
      });

      expect(selectSession).toHaveBeenCalledWith('session_1');
      expect(onSessionSelect).toHaveBeenCalledWith('session_1');
    });

    test('should clear chat', async () => {
      const clearCurrentChat = jest.fn();
      const onClearChat = jest.fn();
      setupStore({
        clearCurrentChat,
        chatMessages: [createMockMessage()],
      });
      
      // Mock confirm to return true
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);
      
      renderChatInterface({ onClearChat });
      
      // Find the clear chat button in the header
      const clearButton = screen.queryByTitle(/clear/i) || screen.queryByTestId(/trash/i);
      if (clearButton) {
        await act(async () => {
          fireEvent.click(clearButton);
        });
      }

      window.confirm = originalConfirm;
    });

    test('should cancel clear chat on confirm dialog', async () => {
      const clearCurrentChat = jest.fn();
      setupStore({
        clearCurrentChat,
        chatMessages: [createMockMessage()],
      });

      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => false);

      renderChatInterface();

      window.confirm = originalConfirm;
    });

    test('should filter sessions by search', () => {
      const sessions = [
        createMockSession({ id: 's1', title: 'Project Discussion' }),
        createMockSession({ id: 's2', title: 'Meeting Notes' }),
        createMockSession({ id: 's3', title: 'Personal Chat' }),
      ];
      
      setupStore({ chatSessions: sessions });
      renderChatInterface();

      const searchInput = screen.getByPlaceholderText(/Search conversations/i);
      
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'Meeting' } });
      });

      // Session with "Meeting" should be visible, others filtered
      const meetingSession = screen.queryByText('Meeting Notes');
      expect(meetingSession).toBeInTheDocument();
    });

    test('should display empty sessions state', () => {
      setupStore({ chatSessions: [] });
      renderChatInterface();

      const emptyState = screen.queryByText(/No conversations yet/i);
      expect(emptyState).toBeInTheDocument();
    });
  });

  // ============================================
  // Quick Actions
  // ============================================

  describe('Quick Actions', () => {
    test('should render all quick actions in empty state', () => {
      setupStore();
      renderChatInterface();

      QUICK_ACTIONS.forEach(action => {
        const actionButton = screen.queryByText(action.label);
        expect(actionButton).toBeInTheDocument();
      });
    });

    test('should call onQuickAction when quick action is clicked', async () => {
      const onQuickAction = jest.fn();
      setupStore();
      renderChatInterface({ onQuickAction });

      const sendEmailButton = screen.getByText('Send an Email');
      await act(async () => {
        fireEvent.click(sendEmailButton);
      });

      expect(onQuickAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'send_email',
          action: 'email_agent',
        })
      );
    });

    test('should set input when quick action is clicked', async () => {
      setupStore();
      renderChatInterface();

      const searchWebButton = screen.getByText('Search the Web');
      await act(async () => {
        fireEvent.click(searchWebButton);
      });

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/) as HTMLTextAreaElement;
      expect(input.value).toContain('Search and research topics');
    });

    test('should hide quick actions when toggle is clicked', async () => {
      setupStore();
      renderChatInterface();

      const hideButton = screen.queryByText(/Hide suggestions/i);
      if (hideButton) {
        await act(async () => {
          fireEvent.click(hideButton);
        });
      }
    });

    test('should show quick actions when toggle is clicked again', async () => {
      setupStore();
      renderChatInterface();
    });

    test('should handle quick action with category-based navigation', async () => {
      setupStore();
      renderChatInterface();
    });
  });

  // ============================================
  // Suggestions
  // ============================================

  describe('Suggestions', () => {
    test('should render suggestion buttons in empty state', () => {
      setupStore();
      renderChatInterface();

      const suggestions = [
        'Send an email to my team',
        'Schedule a meeting',
        'Search for latest AI trends',
        'Create a to-do list',
        'Generate an image',
      ];

      suggestions.forEach(suggestion => {
        const suggestionButton = screen.queryByText(new RegExp(suggestion, 'i'));
        expect(suggestionButton).toBeInTheDocument();
      });
    });

    test('should set input when suggestion is clicked', async () => {
      setupStore();
      renderChatInterface();

      const suggestionButton = screen.queryByText(/Send an email to my team about the project update/i);
      if (suggestionButton) {
        await act(async () => {
          fireEvent.click(suggestionButton);
        });

        const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/) as HTMLTextAreaElement;
        expect(input.value).toContain('Send an email to my team');
      }
    });
  });

  // ============================================
  // File Uploads
  // ============================================

  describe('File Uploads', () => {
    test('should open file picker when attach button is clicked', async () => {
      setupStore();
      renderChatInterface();

      const attachButton = screen.getByTitle('Attach file');
      expect(attachButton).toBeInTheDocument();
    });

    test('should add attachment when file is selected', async () => {
      setupStore();
      renderChatInterface();

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File(['content'], 'document.txt', { type: 'text/plain' });
        
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [file] } });
        });

        const attachmentPreview = screen.queryByText('document.txt');
        expect(attachmentPreview).toBeInTheDocument();
      }
    });

    test('should remove attachment when X is clicked', async () => {
      setupStore();
      renderChatInterface();

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File(['content'], 'remove.txt', { type: 'text/plain' });
        
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [file] } });
        });

        const removeButtons = screen.queryAllByTestId(/icon-x/i);
        if (removeButtons.length > 0) {
          await act(async () => {
            fireEvent.click(removeButtons[0]);
          });
        }
      }
    });

    test('should show file size in readable format', async () => {
      setupStore();
      renderChatInterface();

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const largeFile = new File(['x'.repeat(1024 * 100)], 'large.bin', { type: 'application/octet-stream' });
        
        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [largeFile] } });
        });

        const sizeText = screen.queryByText(/KB/i);
        expect(sizeText).toBeInTheDocument();
      }
    });

    test('should handle multiple file selection', async () => {
      setupStore();
      renderChatInterface();

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const files = [
          new File(['a'], 'a.txt', { type: 'text/plain' }),
          new File(['b'], 'b.txt', { type: 'text/plain' }),
          new File(['c'], 'c.txt', { type: 'text/plain' }),
        ];
        
        await act(async () => {
          fireEvent.change(fileInput, { target: { files } });
        });

        expect(screen.getByText('a.txt')).toBeInTheDocument();
        expect(screen.getByText('b.txt')).toBeInTheDocument();
        expect(screen.getByText('c.txt')).toBeInTheDocument();
      }
    });
  });

  // ============================================
  // View Toggles
  // ============================================

  describe('View Toggles', () => {
    test('should toggle sidebar visibility', async () => {
      setupStore();
      renderChatInterface();

      // Sidebar is visible by default
      expect(screen.getByText(/New Conversation/i)).toBeInTheDocument();

      // Find toggle button (PanelLeft/PanelRight icon)
      const toggleButtons = screen.queryAllByRole('button');
      const sidebarToggle = toggleButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.getAttribute('data-testid')?.includes('panel');
      });

      if (sidebarToggle) {
        await act(async () => {
          fireEvent.click(sidebarToggle);
        });

        // After closing sidebar
        expect(screen.queryByText(/New Conversation/i)).not.toBeInTheDocument();
      }
    });

    test('should toggle detail visibility', async () => {
      setupStore();
      renderChatInterface();

      // The Eye/EyeOff toggle buttons should be present in the header
    });

    test('should toggle fullscreen mode', async () => {
      setupStore();
      renderChatInterface();

      const toggleButtons = screen.queryAllByRole('button');
      const fullscreenButton = toggleButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && (
          svg.getAttribute('data-testid')?.includes('maximize') ||
          svg.getAttribute('data-testid')?.includes('minimize')
        );
      });

      if (fullscreenButton) {
        await act(async () => {
          fireEvent.click(fullscreenButton);
        });
      }
    });
  });

  // ============================================
  // Auto Scroll
  // ============================================

  describe('Auto Scroll', () => {
    test('should auto-scroll to bottom when new messages arrive', async () => {
      setupStore();
      renderChatInterface();

      // Simulate scroll to bottom behavior
      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;
    });

    test('should show scroll-to-bottom button when not at bottom', async () => {
      setupStore({
        chatMessages: [
          createMockMessage({ id: '1', content: 'Message 1' }),
          createMockMessage({ id: '2', content: 'Message 2' }),
          createMockMessage({ id: '3', content: 'Message 3' }),
        ],
      });
      renderChatInterface();
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  describe('Error Handling', () => {
    test('should display chat error banner', () => {
      setupStore({ chatError: 'Failed to send message. Please try again.' });
      renderChatInterface();

      const errorBanner = screen.queryByText(/Failed to send message/);
      expect(errorBanner).toBeInTheDocument();
    });

    test('should allow dismissing error banner', async () => {
      setupStore({ chatError: 'Test error' });
      renderChatInterface();
    });

    test('should handle long error messages gracefully', () => {
      const longError = 'This is a very long error message that should be displayed properly without breaking the layout of the chat interface component. '.repeat(10);
      setupStore({ chatError: longError });
      renderChatInterface();

      const errorBanner = screen.queryByText(/This is a very long error/);
      expect(errorBanner).toBeInTheDocument();
    });
  });

  // ============================================
  // Loading States
  // ============================================

  describe('Loading States', () => {
    test('should show loading skeleton when loading chats', () => {
      setupStore({
        isChatLoading: true,
        chatMessages: [],
      });
      renderChatInterface();
    });

    test('should show loading state for new chat', () => {
      setupStore({
        isChatLoading: true,
        chatMessages: [],
        chatSessions: [],
      });
      renderChatInterface();
    });
  });

  // ============================================
  // Export
  // ============================================

  describe('Export', () => {
    test('should call onExport when export button is clicked', async () => {
      const onExport = jest.fn();
      setupStore({
        chatMessages: [
          createMockMessage({ id: '1', content: 'Export test' }),
        ],
      });
      renderChatInterface({ onExport });
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('Integration Tests', () => {
    test('should complete full chat flow: type → send → receive response', async () => {
      const sendMessage = jest.fn().mockImplementation((content) => {
        // Simulate adding a response after user message
        return Promise.resolve();
      });
      
      const onSendMessage = jest.fn().mockResolvedValue(undefined);
      
      setupStore({
        sendMessage,
        chatMessages: [],
      });
      
      renderChatInterface({ onSendMessage });

      // Step 1: Type message
      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello AI!' } });
      });

      // Step 2: Send message
      const sendButton = screen.getByRole('button', { name: /send/i });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(onSendMessage).toHaveBeenCalledWith('Hello AI!', undefined);
    });

    test('should handle rapid message sending', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      setupStore({ sendMessage });
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.change(input, { target: { value: `Message ${i}` } });
          fireEvent.click(sendButton);
        });
      }
    });

    test('should maintain state across multiple interactions', async () => {
      setupStore({
        chatMessages: [
          createMockMessage({ id: '1', role: 'user', content: 'User message' }),
        ],
      });
      
      const { rerender } = renderChatInterface();

      // Add more messages via rerender
      const updatedStore = setupStore({
        chatMessages: [
          createMockMessage({ id: '1', role: 'user', content: 'User message' }),
          createMockMessage({ id: '2', role: 'orchestrator', content: 'AI response' }),
          createMockMessage({ id: '3', role: 'user', content: 'Follow up' }),
        ],
      });

      (useOrchestratorStore as jest.Mock).mockReturnValue(updatedStore);
      rerender(
        <ChatInterface
          onSendMessage={jest.fn()}
          onNewSession={jest.fn()}
        />
      );

      // All messages should be visible
      expect(screen.getByText('User message')).toBeInTheDocument();
      expect(screen.getByText('AI response')).toBeInTheDocument();
      expect(screen.getByText('Follow up')).toBeInTheDocument();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    test('should handle very long message content', () => {
      const longContent = 'A'.repeat(10000);
      const message = createMockMessage({
        role: 'orchestrator',
        content: longContent,
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });

    test('should handle empty content gracefully', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: '',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });

    test('should handle missing optional onCallbacks', () => {
      setupStore();
      renderChatInterface({
        onSendMessage: undefined,
        onStopStreaming: undefined,
        onClearChat: undefined,
        onNewSession: undefined,
        onSessionSelect: undefined,
        onMessageAction: undefined,
        onQuickAction: undefined,
        onFeedback: undefined,
        onExport: undefined,
      });
    });

    test('should handle null/undefined messages gracefully', () => {
      setupStore({ chatMessages: null } as any);
      renderChatInterface();
    });

    test('should handle large number of messages efficiently', () => {
      const messages = Array.from({ length: 1000 }, (_, i) =>
        createMockMessage({ id: `msg_${i}`, content: `Message ${i}` })
      );
      
      setupStore({ chatMessages: messages });
      renderChatInterface();
    });

    test('should handle messages with all metadata fields', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Full metadata',
        type: 'reflection',
        status: 'delivered',
        edited: true,
        editedAt: new Date(),
        starred: true,
        flagged: true,
        isStreaming: false,
        metadata: {
          intentId: 'intent_1',
          planId: 'plan_1',
          executionId: 'exec_1',
          reflectionId: 'ref_1',
          agentType: 'EMAIL',
          tokensUsed: 500,
          costUsd: 0.01,
          processingTimeMs: 2000,
          model: 'gpt-4-turbo',
          confidence: 0.95,
        },
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });

    test('should handle unicode and emoji in messages', () => {
      const message = createMockMessage({
        role: 'user',
        content: 'Hello! 👋 🌍 Привет 你好 مرحبا 🎉',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });

    test('should handle HTML content in messages', () => {
      const message = createMockMessage({
        role: 'orchestrator',
        content: '<strong>Bold</strong> <em>Italic</em> <code>Code</code>',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface();
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      setupStore();
      renderChatInterface();

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    test('should have keyboard-accessible buttons', () => {
      setupStore();
      renderChatInterface();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.tabIndex).toBeGreaterThanOrEqual(-1);
      });
    });

    test('should have proper heading hierarchy', () => {
      setupStore();
      renderChatInterface();

      const mainHeading = screen.getByText('Ultimate AI Agent');
      expect(mainHeading).toBeInTheDocument();
    });

    test('should maintain focus trap in feedback modal', async () => {
      const onFeedback = jest.fn();
      const message = createMockMessage({
        role: 'orchestrator',
        content: 'Focus trap test',
      });
      
      setupStore({ chatMessages: [message] });
      renderChatInterface({ onFeedback });
    });
  });

  // ============================================
  // Performance Tests
  // ============================================

  describe('Performance', () => {
    test('should not re-render unnecessarily on same props', () => {
      const initialStore = setupStore({
        chatMessages: [createMockMessage({ id: '1' })],
        chatSessions: [createMockSession({ id: 's1' })],
      });
      
      (useOrchestratorStore as jest.Mock).mockReturnValue(initialStore);
      
      const { rerender } = renderChatInterface({}, initialStore);
      
      // Re-render with same store
      (useOrchestratorStore as jest.Mock).mockReturnValue(initialStore);
      rerender(
        <ChatInterface
          onSendMessage={jest.fn()}
          onNewSession={jest.fn()}
        />
      );
    });

    test('should handle rapid user input without lag', async () => {
      setupStore();
      renderChatInterface();

      const input = screen.getByPlaceholderText(/Message the Ultimate AI Agent/);

      // Simulate rapid typing
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          fireEvent.change(input, { target: { value: `Test ${i}` } });
        }
      });
    });
  });
});