// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/ChatInterface.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  User,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  StopCircle,
  Maximize2,
  Minimize2,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Reply,
  Forward,
  Bookmark,
  Flag,
  Share2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  Paperclip,
  Image,
  FileText,
  Code,
  Zap,
  Brain,
  Cpu,
  Activity,
  GitBranch,
  Layers,
  Eye,
  EyeOff,
  Filter,
  Search,
  Settings,
  X,
  Plus,
  Minus,
  MessageSquare,
  Mic,
  Volume2,
  Languages,
  Smile,
  History,
  PanelLeft,
  PanelRight,
  GripHorizontal,
  Terminal,
  ExternalLink,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

export type MessageRole = 'user' | 'orchestrator' | 'agent' | 'system' | 'error';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error' | 'streaming';

export type MessageType = 'text' | 'code' | 'image' | 'plan' | 'intent' | 'execution' | 'reflection' | 'memory' | 'error' | 'loading';

export type StreamingStatus = 'idle' | 'thinking' | 'intent_classifying' | 'planning' | 'executing' | 'reflecting' | 'responding' | 'complete' | 'error' | 'cancelled';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'code';
  name: string;
  url?: string;
  content?: string;
  language?: string;
  size?: number;
  mimeType?: string;
}

export interface MessageAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
}

export interface MessageMetadata {
  intentId?: string;
  planId?: string;
  executionId?: string;
  reflectionId?: string;
  agentType?: string;
  tokensUsed?: number;
  costUsd?: number;
  processingTimeMs?: number;
  model?: string;
  confidence?: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: Date;
  metadata?: MessageMetadata;
  attachments?: MessageAttachment[];
  actions?: MessageAction[];
  replyTo?: string;
  edited?: boolean;
  editedAt?: Date;
  starred?: boolean;
  flagged?: boolean;
  reactions?: Record<string, number>;
  isStreaming?: boolean;
  threadId?: string;
  parentId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags?: string[];
  agentTypes?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: string;
  category: 'communication' | 'productivity' | 'content' | 'social' | 'research' | 'management' | 'other';
  color: string;
}

interface ChatInterfaceProps {
  sessionId?: string;
  messages?: ChatMessage[];
  sessions?: ChatSession[];
  onSendMessage?: (content: string, attachments?: MessageAttachment[]) => void;
  onStopStreaming?: () => void;
  onClearChat?: () => void;
  onNewSession?: () => void;
  onSessionSelect?: (sessionId: string) => void;
  onMessageAction?: (messageId: string, action: string) => void;
  onQuickAction?: (action: QuickAction) => void;
  onFeedback?: (messageId: string, type: 'positive' | 'negative', notes?: string) => void;
  onExport?: (messages: ChatMessage[]) => void;
  className?: string;
}

// ============================================
// Quick Actions Configuration
// ============================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'send_email',
    label: 'Send an Email',
    description: 'Compose and send an email',
    icon: <MessageSquare className="h-4 w-4" />,
    action: 'email_agent',
    category: 'communication',
    color: 'bg-blue-500',
  },
  {
    id: 'schedule_meeting',
    label: 'Schedule Meeting',
    description: 'Find best time and create event',
    icon: <Calendar className="h-4 w-4" />,
    action: 'calendar_agent',
    category: 'productivity',
    color: 'bg-orange-500',
  },
  {
    id: 'search_web',
    label: 'Search the Web',
    description: 'Search and research topics',
    icon: <Globe className="h-4 w-4" />,
    action: 'web_agent',
    category: 'research',
    color: 'bg-teal-500',
  },
  {
    id: 'generate_content',
    label: 'Generate Content',
    description: 'Create text, images, or code',
    icon: <Sparkles className="h-4 w-4" />,
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
  },
  {
    id: 'create_task',
    label: 'Create Task',
    description: 'Add a new task to your list',
    icon: <CheckSquare className="h-4 w-4" />,
    action: 'task_agent',
    category: 'management',
    color: 'bg-indigo-500',
  },
  {
    id: 'post_social',
    label: 'Post to Social Media',
    description: 'Share content on social platforms',
    icon: <Share2 className="h-4 w-4" />,
    action: 'social_agent',
    category: 'social',
    color: 'bg-pink-500',
  },
  {
    id: 'upload_file',
    label: 'Upload File',
    description: 'Upload to Google Drive',
    icon: <HardDrive className="h-4 w-4" />,
    action: 'drive_agent',
    category: 'productivity',
    color: 'bg-green-500',
  },
  {
    id: 'analyze_data',
    label: 'Analyze Data',
    description: 'Get insights from your data',
    icon: <BarChart3 className="h-4 w-4" />,
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
  },
];

// ============================================
// Streaming Status Configuration
// ============================================

const STREAMING_STATUS_CONFIG: Record<StreamingStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  animation?: string;
  description: string;
}> = {
  idle: {
    label: 'Ready',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    description: 'Ready to process your request',
  },
  thinking: {
    label: 'Thinking...',
    icon: <Brain className="h-4 w-4" />,
    color: 'text-purple-600 animate-pulse',
    description: 'Analyzing your request',
  },
  intent_classifying: {
    label: 'Classifying Intent...',
    icon: <Target className="h-4 w-4" />,
    color: 'text-blue-600 animate-pulse',
    description: 'Determining what you want to do',
  },
  planning: {
    label: 'Creating Plan...',
    icon: <GitBranch className="h-4 w-4" />,
    color: 'text-indigo-600 animate-pulse',
    description: 'Building execution strategy',
  },
  executing: {
    label: 'Executing...',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-green-600 animate-pulse',
    description: 'Running agent tasks',
  },
  reflecting: {
    label: 'Reflecting...',
    icon: <RefreshCw className="h-4 w-4" />,
    color: 'text-yellow-600 animate-spin',
    description: 'Analyzing results',
  },
  responding: {
    label: 'Writing Response...',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-pink-600 animate-pulse',
    description: 'Composing your answer',
  },
  complete: {
    label: 'Complete',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    description: 'Response ready',
  },
  error: {
    label: 'Error',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    description: 'An error occurred',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    description: 'Processing cancelled',
  },
};

// ============================================
// Component
// ============================================

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  messages: initialMessages,
  sessions: initialSessions,
  onSendMessage,
  onStopStreaming,
  onClearChat,
  onNewSession,
  onSessionSelect,
  onMessageAction,
  onQuickAction,
  onFeedback,
  onExport,
  className = '',
}) => {
  // Store
  const {
    chatMessages,
    chatSessions,
    streamingStatus,
    isChatLoading,
    chatError,
    sendMessage,
    stopStreaming,
    createNewSession,
    selectSession,
    clearCurrentChat,
  } = useOrchestratorStore();

  // Local state
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative'>('positive');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived data
  const messages = initialMessages || chatMessages || [];
  const sessions = initialSessions || chatSessions || [];
  const currentStatus = streamingStatus || 'idle';
  const statusConfig = STREAMING_STATUS_CONFIG[currentStatus];

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && attachments.length === 0) return;
    if (isSending || currentStatus !== 'idle' && currentStatus !== 'complete' && currentStatus !== 'error') return;

    setIsSending(true);
    try {
      await sendMessage?.(trimmedInput, attachments.length > 0 ? attachments : undefined);
      onSendMessage?.(trimmedInput, attachments.length > 0 ? attachments : undefined);
      setInput('');
      setAttachments([]);
      setAutoScroll(true);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [input, attachments, isSending, currentStatus, sendMessage, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleStop = useCallback(() => {
    stopStreaming?.();
    onStopStreaming?.();
  }, [stopStreaming, onStopStreaming]);

  const handleClearChat = useCallback(() => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      clearCurrentChat?.();
      onClearChat?.();
    }
  }, [clearCurrentChat, onClearChat]);

  const handleNewSession = useCallback(() => {
    createNewSession?.();
    onNewSession?.();
    setShowQuickActions(true);
  }, [createNewSession, onNewSession]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: MessageAttachment[] = Array.from(files).map((file, index) => ({
      id: `attachment_${Date.now()}_${index}`,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, []);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleMessageAction = useCallback((messageId: string, action: string) => {
    onMessageAction?.(messageId, action);
    setShowMessageMenu(null);
  }, [onMessageAction]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    setInput(action.description || action.label);
    onQuickAction?.(action);
    inputRef.current?.focus();
  }, [onQuickAction]);

  const handleFeedbackSubmit = useCallback(() => {
    if (feedbackMessage) {
      onFeedback?.(feedbackMessage, feedbackType, feedbackNotes);
      setFeedbackMessage(null);
      setFeedbackNotes('');
    }
  }, [feedbackMessage, feedbackType, feedbackNotes, onFeedback]);

  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isAtBottom);
  }, []);

  // ============================================
  // Render: Streaming Status Indicator
  // ============================================

  const renderStreamingStatus = () => {
    if (currentStatus === 'idle' || currentStatus === 'complete') return null;

    return (
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm border-b border-secondary-200 dark:border-secondary-700 shadow-sm">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="text-sm font-medium">{statusConfig.label}</span>
            </div>
            <span className="text-xs text-secondary-400">{statusConfig.description}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress Dots */}
            <div className="flex gap-1">
              {['thinking', 'intent_classifying', 'planning', 'executing', 'reflecting', 'responding'].map((stage, idx) => {
                const isActive = currentStatus === stage;
                const isCompleted = ['thinking', 'intent_classifying', 'planning', 'executing', 'reflecting', 'responding'].indexOf(currentStatus) > idx;
                return (
                  <div
                    key={stage}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      isActive ? 'bg-primary-500 animate-pulse' :
                      isCompleted ? 'bg-green-500' : 'bg-secondary-300 dark:bg-secondary-600'
                    }`}
                  />
                );
              })}
            </div>
            <Button variant="danger" size="xs" onClick={handleStop}>
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-0.5 bg-secondary-200 dark:bg-secondary-700">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000"
            style={{
              width: currentStatus === 'thinking' ? '15%' :
                     currentStatus === 'intent_classifying' ? '30%' :
                     currentStatus === 'planning' ? '45%' :
                     currentStatus === 'executing' ? '70%' :
                     currentStatus === 'reflecting' ? '85%' :
                     currentStatus === 'responding' ? '95%' : '0%'
            }}
          />
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Message Bubble
  // ============================================

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isOrchestrator = message.role === 'orchestrator';
    const isStreaming = message.isStreaming || (isOrchestrator && currentStatus !== 'complete' && index === messages.length - 1);
    const isHovered = hoveredMessage === message.id;
    const isSelected = selectedMessage === message.id;
    const showMenu = showMessageMenu === message.id;

    return (
      <div
        key={message.id}
        id={`message-${message.id}`}
        className={`group flex gap-3 px-4 py-3 transition-all duration-300 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
        style={{ transitionDelay: `${index * 50}ms` }}
        onMouseEnter={() => setHoveredMessage(message.id)}
        onMouseLeave={() => setHoveredMessage(null)}
        onClick={() => setSelectedMessage(isSelected ? null : message.id)}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center text-white text-sm font-bold">
              <User className="h-4 w-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
              <Cpu className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Message Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-secondary-900 dark:text-white">
              {isUser ? 'You' : 'Ultimate AI Agent'}
            </span>
            <span className="text-xs text-secondary-400">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </span>
            {message.edited && (
              <span className="text-xs text-secondary-400">(edited)</span>
            )}
            {message.type === 'error' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                <AlertCircle className="h-3 w-3" /> Error
              </span>
            )}
          </div>

          {/* Message Body */}
          <div
            className={`relative rounded-2xl ${
              isUser
                ? 'bg-primary-600 text-white'
                : isOrchestrator
                  ? 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700'
                  : 'bg-secondary-100 dark:bg-secondary-700'
            } ${isUser ? 'rounded-br-lg' : 'rounded-bl-lg'} ${
              message.type === 'code' ? 'p-0 overflow-hidden' : 'p-4'
            }`}
          >
            {/* Code Block */}
            {message.type === 'code' && (
              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-secondary-900 text-secondary-400 text-xs border-b border-secondary-700">
                  <div className="flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    <span>{message.metadata?.language || 'code'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-secondary-400 hover:text-white"
                      onClick={() => handleCopyMessage(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <pre className="p-4 overflow-x-auto text-sm font-mono text-green-400 bg-secondary-900">
                  <code>{message.content}</code>
                </pre>
              </div>
            )}

            {/* Regular Text */}
            {message.type !== 'code' && (
              <div
                className={`prose dark:prose-invert max-w-none text-sm ${
                  isUser ? 'prose-invert' : ''
                }`}
                dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code class="bg-black/10 dark:bg-white/10 rounded px-1">$1</code>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg text-xs"
                  >
                    {attachment.type === 'image' ? (
                      <Image className="h-4 w-4" />
                    ) : attachment.type === 'code' ? (
                      <Code className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span>{attachment.name}</span>
                    {attachment.size && (
                      <span className="text-secondary-400">
                        {attachment.size > 1024 * 1024
                          ? `${(attachment.size / (1024 * 1024)).toFixed(1)}MB`
                          : `${(attachment.size / 1024).toFixed(1)}KB`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-0.5" />
            )}

            {/* Metadata */}
            {message.metadata && !isUser && showDetails && (
              <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                <div className="flex flex-wrap gap-2 text-xs text-secondary-400">
                  {message.metadata.tokensUsed && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {message.metadata.tokensUsed.toLocaleString()} tokens
                    </span>
                  )}
                  {message.metadata.costUsd !== undefined && (
                    <span className="flex items-center gap-1">
                      ${message.metadata.costUsd.toFixed(4)}
                    </span>
                  )}
                  {message.metadata.processingTimeMs && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {message.metadata.processingTimeMs}ms
                    </span>
                  )}
                  {message.metadata.model && (
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {message.metadata.model}
                    </span>
                  )}
                  {message.metadata.confidence !== undefined && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {(message.metadata.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Message Actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.actions.map(action => (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="xs"
                  disabled={action.disabled}
                  onClick={() => handleMessageAction(message.id, action.action)}
                >
                  {action.icon}
                  <span className="ml-1">{action.label}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Hover Actions */}
          {isHovered && !isStreaming && (
            <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="xs" onClick={() => handleCopyMessage(message.content)}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setFeedbackMessage(message.id);
                  setFeedbackType('positive');
                }}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setFeedbackMessage(message.id);
                  setFeedbackType('negative');
                }}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
              {isOrchestrator && (
                <>
                  <Button variant="ghost" size="xs" onClick={() => {
                    setInput(message.content);
                    inputRef.current?.focus();
                  }}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="xs">
                    <Bookmark className="h-3 w-3" />
                  </Button>
                </>
              )}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowMessageMenu(showMenu ? null : message.id)}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
                {showMenu && (
                  <div className="absolute bottom-full left-0 mb-1 w-40 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-30 overflow-hidden">
                    <button
                      onClick={() => handleMessageAction(message.id, 'copy')}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                    >
                      <Copy className="h-3 w-3" /> Copy Text
                    </button>
                    <button
                      onClick={() => handleMessageAction(message.id, 'reply')}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </button>
                    <button
                      onClick={() => handleMessageAction(message.id, 'bookmark')}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                    >
                      <Bookmark className="h-3 w-3" /> Bookmark
                    </button>
                    <button
                      onClick={() => handleMessageAction(message.id, 'flag')}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 text-red-600"
                    >
                      <Flag className="h-3 w-3" /> Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Star indicator */}
        {message.starred && (
          <div className="flex-shrink-0 mt-1">
            <Bookmark className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Feedback Modal
  // ============================================

  const renderFeedbackModal = () => {
    if (!feedbackMessage) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md">
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {feedbackType === 'positive' ? '👍 Helpful Response?' : '👎 Not Helpful?'}
            </h3>
            <button onClick={() => setFeedbackMessage(null)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {feedbackType === 'positive'
                ? 'Thanks for the feedback! What did you like about this response?'
                : 'We\'re sorry this wasn\'t helpful. What could we improve?'}
            </p>
            <textarea
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Add your thoughts (optional)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm resize-y"
            />
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-secondary-200 dark:border-secondary-700">
            <Button variant="ghost" onClick={() => setFeedbackMessage(null)}>
              Skip
            </Button>
            <Button variant="primary" onClick={handleFeedbackSubmit}>
              Submit Feedback
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isChatLoading && messages.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="list" count={5} />
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div className={`flex h-full ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-secondary-900' : ''}`}>
        {/* Sessions Sidebar */}
        {showSidebar && (
          <div className="w-72 flex-shrink-0 border-r border-secondary-200 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-800/50 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-secondary-200 dark:border-secondary-700">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleNewSession}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Conversation
              </Button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-secondary-200 dark:border-secondary-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                />
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-secondary-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No conversations yet</p>
                </div>
              ) : (
                sessions
                  .filter(s => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(session => (
                    <button
                      key={session.id}
                      onClick={() => {
                        onSessionSelect?.(session.id);
                        selectSession?.(session.id);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        session.id === sessionId
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-secondary-100 dark:hover:bg-secondary-700'
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{session.title}</p>
                      <p className="text-xs text-secondary-500 truncate mt-0.5">{session.lastMessage}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-secondary-400">
                        <span>{formatDistanceToNow(session.updatedAt, { addSuffix: true })}</span>
                        <span>•</span>
                        <span>{session.messageCount} messages</span>
                      </div>
                    </button>
                  ))
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-between text-xs text-secondary-400">
              <button onClick={() => setShowSidebar(false)} className="hover:text-secondary-600">
                <PanelLeft className="h-4 w-4" />
              </button>
              <span>{sessions.length} conversations</span>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <button onClick={() => setShowSidebar(true)} className="p-1 rounded-md hover:bg-secondary-100">
                  <PanelRight className="h-5 w-5 text-secondary-500" />
                </button>
              )}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-secondary-900 dark:text-white">Ultimate AI Agent</h2>
                <p className="text-xs text-secondary-500">
                  {messages.length > 0 ? `${messages.length} messages` : 'New conversation'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearChat}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              {onExport && (
                <Button variant="ghost" size="sm" onClick={() => onExport(messages)}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Streaming Status Bar */}
          {renderStreamingStatus()}

          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto bg-secondary-50/30 dark:bg-secondary-900/30"
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl mb-6">
                  <Cpu className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
                  Ultimate AI Agent
                </h2>
                <p className="text-secondary-500 text-center max-w-md mb-8">
                  I can help you with email, calendar, file management, social media, web research, task management, and content generation.
                </p>

                {/* Quick Actions */}
                {showQuickActions && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className={`p-4 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all text-center group`}
                      >
                        <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center text-white mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                          {action.icon}
                        </div>
                        <p className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{action.label}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-secondary-400 mb-3">Try asking me:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      'Send an email to my team about the project update',
                      'Schedule a meeting with John next Tuesday',
                      'Search for latest AI trends',
                      'Create a to-do list for today',
                      'Generate an image of a sunset over mountains',
                    ].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-full hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Messages */
              <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
                {messages.map((message, index) => renderMessage(message, index))}
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />

            {/* Scroll to bottom button */}
            {!autoScroll && messages.length > 0 && (
              <button
                onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  setAutoScroll(true);
                }}
                className="absolute bottom-24 right-8 w-10 h-10 bg-white dark:bg-secondary-800 rounded-full shadow-lg border border-secondary-200 dark:border-secondary-700 flex items-center justify-center hover:bg-secondary-50 z-10"
              >
                <ArrowDown className="h-5 w-5 text-secondary-600" />
              </button>
            )}
          </div>

          {/* Error Banner */}
          {chatError && (
            <div className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {chatError}
              </div>
              <button onClick={() => {/* clear error */}} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 flex flex-wrap gap-2">
              {attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-lg text-sm"
                >
                  {attachment.type === 'image' ? (
                    <Image className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-secondary-500" />
                  )}
                  <span className="max-w-[150px] truncate">{attachment.name}</span>
                  <button
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    className="text-secondary-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
            <div className="flex items-end gap-3">
              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                title="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.kt,.swift,.html,.css"
              />

              {/* Input Field */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message the Ultimate AI Agent... (Shift+Enter for new line)"
                  rows={1}
                  className="w-full px-4 py-3 pr-16 rounded-xl border border-secondary-300 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-900 text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                  }}
                  disabled={isSending || (currentStatus !== 'idle' && currentStatus !== 'complete' && currentStatus !== 'error')}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <span className="text-xs text-secondary-400">{input.length}</span>
                </div>
              </div>

              {/* Send Button */}
              {currentStatus !== 'idle' && currentStatus !== 'complete' && currentStatus !== 'error' ? (
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleStop}
                  className="rounded-xl"
                >
                  <Square className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSend}
                  disabled={!input.trim() && attachments.length === 0}
                  className="rounded-xl"
                >
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </div>

            {/* Input Footer */}
            <div className="flex justify-between items-center mt-2 text-xs text-secondary-400">
              <div className="flex items-center gap-3">
                <span>AI responses may not be perfect. Verify important information.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="hover:text-secondary-600"
                >
                  {showQuickActions ? 'Hide suggestions' : 'Show suggestions'}
                </button>
                <span>|</span>
                <button onClick={handleClearChat} className="hover:text-red-500">
                  Clear chat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Modal */}
        {renderFeedbackModal()}

        {/* Action Confirmation Modal */}
        {showMessageMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMessageMenu(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};


export default ChatInterface;
