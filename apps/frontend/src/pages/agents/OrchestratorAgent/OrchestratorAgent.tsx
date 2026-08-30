// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/OrchestratorAgent.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Cpu, Sparkles, Settings, RefreshCw, PanelLeft, PanelRight,
  MessageSquare, GitBranch, Activity, Brain, Target, Layers, Clock,
  History, Bookmark, Download, Upload, Maximize2, Minimize2, X,
  ChevronLeft, ChevronRight, ArrowRight, Plus, Trash2, Copy, Share2,
  MoreVertical, Search, Filter, Zap, AlertCircle, CheckCircle, XCircle,
  Loader2, Eye, EyeOff, Star, Flag, Shield, Award, TrendingUp,
  TrendingDown, BarChart3, PieChart, Users, DollarSign, Timer,
  Cloud, Database, Wifi, Lock, Unlock, Send, Play, Pause, Square,
  RotateCcw, SkipForward,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Tooltip } from '../../../components/common/Tooltip';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { AgentHeader } from '../shared/AgentHeader';
import { AgentSidebar } from '../shared/AgentSidebar';
import { OrchestratorInput } from '../../../components/orchestrator/OrchestratorInput';
import { ChatInterface } from './ChatInterface';
import { IntentDisplay } from './IntentDisplay';
import { PlanVisualizer } from './PlanVisualizer';
import { AgentSelector } from './AgentSelector';
import { ExecutionTimeline } from './ExecutionTimeline';
import { MultiAgentOutput } from '../../../components/orchestrator/MultiAgentOutput';
import { ReflectionPanel } from './ReflectionPanel';
import { MemoryPanel } from './MemoryPanel';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { useAuthStore } from '../../../store/auth.store';
import { useRealTimeUpdates } from '../../../hooks/useRealTimeUpdates';
import {
  OrchestratorState,
  OrchestratorStateType,
  IntentResult,
  TaskPlan,
  ChainExecutionResult,
  AgentSelection,
  ExecutionReflection,
} from '../../../types/orchestrator.types';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

type OrchestratorView =
  | 'chat'
  | 'intent'
  | 'plan'
  | 'agents'
  | 'execution'
  | 'output'
  | 'reflection'
  | 'memory';

interface OrchestratorSession {
  id: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  state: OrchestratorStateType;
  intent?: IntentResult;
  plan?: TaskPlan;
  execution?: ChainExecutionResult;
  hasOutput?: boolean;
  hasReflection?: boolean;
}

interface OrchestratorStats {
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

// ============================================
// View Configuration
// ============================================

const VIEW_CONFIG: Record<OrchestratorView, {
  label: string;
  icon: React.ReactNode;
  description: string;
  shortcut?: string;
  requiresState?: OrchestratorStateType[];
}> = {
  chat: {
    label: 'Chat',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Natural language conversation',
    shortcut: 'Ctrl+1',
    requiresState: [],
  },
  intent: {
    label: 'Intent',
    icon: <Target className="h-4 w-4" />,
    description: 'View classified intent',
    shortcut: 'Ctrl+2',
    requiresState: ['intent_parse', 'plan', 'execute', 'reflect', 'respond'],
  },
  plan: {
    label: 'Plan',
    icon: <GitBranch className="h-4 w-4" />,
    description: 'View execution plan',
    shortcut: 'Ctrl+3',
    requiresState: ['plan', 'execute', 'reflect', 'respond'],
  },
  agents: {
    label: 'Agents',
    icon: <Layers className="h-4 w-4" />,
    description: 'Select and manage agents',
    shortcut: 'Ctrl+4',
    requiresState: [],
  },
  execution: {
    label: 'Execution',
    icon: <Activity className="h-4 w-4" />,
    description: 'Monitor execution progress',
    shortcut: 'Ctrl+5',
    requiresState: ['execute', 'reflect', 'respond'],
  },
  output: {
    label: 'Output',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'View agent outputs',
    shortcut: 'Ctrl+6',
    requiresState: ['execute', 'reflect', 'respond'],
  },
  reflection: {
    label: 'Reflection',
    icon: <Brain className="h-4 w-4" />,
    description: 'View execution analysis',
    shortcut: 'Ctrl+7',
    requiresState: ['reflect', 'respond'],
  },
  memory: {
    label: 'Memory',
    icon: <Database className="h-4 w-4" />,
    description: 'View stored memories',
    shortcut: 'Ctrl+8',
    requiresState: [],
  },
};

// ============================================
// Component
// ============================================

export const OrchestratorAgent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId?: string }>();

  // ============================================
  // Store
  // ============================================

  const {
    // State
    currentState,
    currentIntent,
    currentPlan,
    currentExecution,
    currentReflection,
    chatMessages,
    streamingStatus,
    availableAgents,
    sessionHistory,
    stats,

    // Loading & Error
    isChatLoading,
    isIntentLoading,
    isPlanLoading,
    isExecutionLoading,
    isAgentsLoading,
    error,
    chatError,
    intentError,
    planError,
    executionError,
    agentsError,

    // Actions
    sendMessage,
    stopStreaming,
    classifyIntent,
    createPlan,
    optimizePlan,
    executePlan,
    cancelExecution,
    retryExecution,
    selectAgents,
    generateReflection,
    fetchMemories,
    storeMemory,
    createNewSession,
    selectSession,
    clearCurrentChat,
    clearError,
    refreshAll,

    // State management
    setCurrentState,
    setCurrentIntent,
    setCurrentPlan,
    setCurrentExecution,
    setCurrentReflection,
  } = useOrchestratorStore();

  const { user } = useAuthStore();

  // ============================================
  // Local State
  // ============================================

  const [activeView, setActiveView] = useState<OrchestratorView>('chat');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchSessions, setSearchSessions] = useState('');
  const [contextLabel, setContextLabel] = useState<string>('');
  const [viewHistory, setViewHistory] = useState<OrchestratorView[]>(['chat']);
  const [autoSwitchView, setAutoSwitchView] = useState(true);

  // Refs
  const mainContentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Real-time Updates
  // ============================================

  const { isConnected } = useRealTimeUpdates('orchestrator', true);

  // ============================================
  // Effects
  // ============================================

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-switch view based on state
  useEffect(() => {
    if (!autoSwitchView) return;

    switch (currentState) {
      case 'intent_parse':
        if (currentIntent) {
          navigateToView('intent');
        }
        break;
      case 'plan':
        if (currentPlan) {
          navigateToView('plan');
        }
        break;
      case 'execute':
        if (currentExecution) {
          navigateToView('execution');
        }
        break;
      case 'reflect':
        if (currentReflection) {
          navigateToView('reflection');
        }
        break;
      case 'respond':
        // Stay in chat or output view
        break;
      case 'error':
        // Stay in current view, show error
        break;
    }
  }, [currentState, currentIntent, currentPlan, currentExecution, currentReflection, autoSwitchView]);

  // Update context label based on state
  useEffect(() => {
    switch (currentState) {
      case 'intent_parse':
        setContextLabel('Analyzing intent...');
        break;
      case 'plan':
        setContextLabel('Creating execution plan...');
        break;
      case 'execute':
        setContextLabel('Executing plan...');
        break;
      case 'reflect':
        setContextLabel('Reflecting on results...');
        break;
      case 'respond':
        setContextLabel('Ready');
        break;
      case 'error':
        setContextLabel('Error occurred');
        break;
      default:
        setContextLabel('');
    }
  }, [currentState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only if not in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // View shortcuts
      if (e.ctrlKey) {
        const viewMap: Record<string, OrchestratorView> = {
          '1': 'chat',
          '2': 'intent',
          '3': 'plan',
          '4': 'agents',
          '5': 'execution',
          '6': 'output',
          '7': 'reflection',
          '8': 'memory',
        };
        if (viewMap[e.key]) {
          e.preventDefault();
          navigateToView(viewMap[e.key]);
        }
      }

      // Sidebar toggle
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      }

      // Session panel toggle
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        setShowSessionPanel((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const navigateToView = useCallback((view: OrchestratorView) => {
    setActiveView(view);
    // Add to view history (for back navigation)
    setViewHistory((prev) => {
      const filtered = prev.filter((v) => v !== view);
      return [...filtered, view].slice(-10);
    });
  }, []);

  const handleBack = useCallback(() => {
    setViewHistory((prev) => {
      if (prev.length <= 1) return prev;
      const newHistory = prev.slice(0, -1);
      setActiveView(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  }, [refreshAll]);

  const handleSendMessage = useCallback(
    async (input: string, options?: any) => {
      await sendMessage(input, options);
      // Auto-switch to chat view
      navigateToView('chat');
    },
    [sendMessage, navigateToView],
  );

  const handleClassifyIntent = useCallback(
    async (input: string) => {
      const intent = await classifyIntent(input);
      if (intent) {
        navigateToView('intent');
      }
    },
    [classifyIntent, navigateToView],
  );

  const handleCreatePlan = useCallback(
    async (intent: IntentResult) => {
      const plan = await createPlan(intent);
      if (plan) {
        navigateToView('plan');
      }
    },
    [createPlan, navigateToView],
  );

  const handleExecutePlan = useCallback(
    async (plan: TaskPlan) => {
      const execution = await executePlan(plan);
      if (execution) {
        navigateToView('execution');
      }
    },
    [executePlan, navigateToView],
  );

  const handleGenerateReflection = useCallback(
    async (execution: ChainExecutionResult) => {
      const reflection = await generateReflection(execution);
      if (reflection) {
        navigateToView('reflection');
      }
    },
    [generateReflection, navigateToView],
  );

  const handleNewSession = useCallback(() => {
    createNewSession();
    setSelectedSessionId(null);
    navigateToView('chat');
  }, [createNewSession, navigateToView]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setSelectedSessionId(sessionId);
      selectSession(sessionId);
      navigateToView('chat');
    },
    [selectSession, navigateToView],
  );

  const handleQuickAction = useCallback(
    (action: any) => {
      // Handle quick actions from the input component
      switch (action.action) {
        case 'email_agent':
        case 'calendar_agent':
        case 'web_agent':
        case 'content_agent':
        case 'task_agent':
        case 'social_agent':
        case 'drive_agent':
          navigateToView('agents');
          break;
        default:
          break;
      }
    },
    [navigateToView],
  );

  const handleExport = useCallback(
    (format: 'json' | 'csv' | 'pdf' = 'json') => {
      // Export current session data
      const data = {
        intent: currentIntent,
        plan: currentPlan,
        execution: currentExecution,
        reflection: currentReflection,
        messages: chatMessages,
      };

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else if (format === 'csv') {
        const headers = ['Type', 'Content', 'Timestamp'];
        const rows = chatMessages.map((m) => [
          m.role,
          `"${m.content.substring(0, 200).replace(/"/g, '""')}"`,
          m.timestamp.toISOString(),
        ]);
        content = [headers, ...rows].map((r) => r.join(',')).join('\n');
        mimeType = 'text/csv';
        extension = 'csv';
      } else {
        // PDF would require a library - fallback to JSON
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orchestrator_export_${formatDateTime(new Date())}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [currentIntent, currentPlan, currentExecution, currentReflection, chatMessages],
  );

  // ============================================
  // Helper: Format date-time for filename
  // ============================================

  const formatDateTime = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${hh}${min}${ss}`;
  };

  // ============================================
  // Derived Data
  // ============================================

  const currentSession = useMemo(() => {
    return selectedSessionId
      ? sessionHistory.find((s) => s.id === selectedSessionId)
      : null;
  }, [selectedSessionId, sessionHistory]);

  const filteredSessions = useMemo(() => {
    if (!searchSessions) return sessionHistory;
    return sessionHistory.filter(
      (s) =>
        s.title.toLowerCase().includes(searchSessions.toLowerCase()) ||
        s.lastMessage?.toLowerCase().includes(searchSessions.toLowerCase()),
    );
  }, [sessionHistory, searchSessions]);

  const availableViews = useMemo(() => {
    return Object.entries(VIEW_CONFIG).filter(([key, config]) => {
      if (config.requiresState?.length === 0) return true;
      return config.requiresState?.includes(currentState) ?? false;
    });
  }, [currentState]);

  // ============================================
  // Render: Stats Panel
  // ============================================

  const renderStatsPanel = () => {
    if (!stats && !showStats) return null;

    return (
      <Card variant="bordered" className="animate-slide-in-bottom mx-4 mt-2">
        <CardHeader
          icon={<BarChart3 className="h-4 w-4" />}
          action={
            <button onClick={() => setShowStats(false)} className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">
              <X className="h-4 w-4" />
            </button>
          }
        >
          Session Statistics
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {sessionHistory.length}
              </p>
              <p className="text-xs text-secondary-500">Total Sessions</p>
            </div>
            <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {sessionHistory.reduce((sum, s) => sum + s.messageCount, 0)}
              </p>
              <p className="text-xs text-secondary-500">Total Messages</p>
            </div>
            <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {availableAgents.filter((a) => a.isAvailable).length}/{availableAgents.length}
              </p>
              <p className="text-xs text-secondary-500">Agents Available</p>
            </div>
            <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {isConnected ? 'Online' : 'Offline'}
              </p>
              <p className="text-xs text-secondary-500">Connection Status</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  // ============================================
  // Render: Session Panel
  // ============================================

  const renderSessionPanel = () => {
    if (!showSessionPanel) return null;

    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSessionPanel(false)}
        />

        {/* Panel */}
        <div className="relative w-80 bg-white dark:bg-secondary-800 h-full shadow-xl border-r border-secondary-200 dark:border-secondary-700 flex flex-col animate-slide-in-left">
          <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-secondary-900 dark:text-white">Sessions</h3>
              <button
                onClick={handleNewSession}
                className="p-1 rounded-md bg-primary-600 text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchSessions}
                onChange={(e) => setSearchSessions(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-secondary-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No sessions found</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    handleSelectSession(session.id);
                    setShowSessionPanel(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    session.id === selectedSessionId
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-secondary-100 dark:hover:bg-secondary-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate flex-1">{session.title}</p>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${
                        session.state === 'error'
                          ? 'bg-red-100 text-red-700'
                          : session.state === 'execute'
                            ? 'bg-blue-100 text-blue-700'
                            : session.state === 'respond'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {session.state}
                    </span>
                  </div>
                  {session.lastMessage && (
                    <p className="text-xs text-secondary-500 truncate mt-1">{session.lastMessage}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-secondary-400">
                    <span>{formatDistanceToNow(session.updatedAt, { addSuffix: true })}</span>
                    <span>•</span>
                    <span>{session.messageCount} messages</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t border-secondary-200 dark:border-secondary-700">
            <p className="text-xs text-secondary-400 text-center">
              {filteredSessions.length} sessions •{' '}
              {filteredSessions.filter((s) => s.isActive).length} active
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Context Bar
  // ============================================

  const renderContextBar = () => (
    <div className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button */}
          {viewHistory.length > 1 && (
            <button
              onClick={handleBack}
              className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500"
              title="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs text-secondary-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* State indicator */}
          {contextLabel && (
            <>
              <div className="w-1 h-4 bg-secondary-300 dark:bg-secondary-600 rounded" />
              <span
                className={`text-xs font-medium ${
                  currentState === 'error'
                    ? 'text-red-600'
                    : currentState === 'execute'
                      ? 'text-blue-600 animate-pulse'
                      : 'text-secondary-600'
                }`}
              >
                {contextLabel}
              </span>
            </>
          )}

          {/* Session info */}
          {currentSession && (
            <>
              <div className="w-1 h-4 bg-secondary-300 dark:bg-secondary-600 rounded" />
              <span className="text-xs text-secondary-500 truncate max-w-[200px]">
                {currentSession.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-switch toggle */}
          <label className="flex items-center gap-1 text-xs text-secondary-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSwitchView}
              onChange={(e) => setAutoSwitchView(e.target.checked)}
              className="w-3 h-3 rounded border-secondary-300"
            />
            Auto-switch
          </label>

          {/* Refresh */}
          <Button variant="ghost" size="xs" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Toggle sidebar */}
          <Button variant="ghost" size="xs" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // Render: View Navigation
  // ============================================

  const renderViewNavigation = () => (
    <div className="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-800/50">
      <nav className="flex overflow-x-auto scrollbar-hide">
        {availableViews.map(([key, config]) => (
          <button
            key={key}
            onClick={() => navigateToView(key as OrchestratorView)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeView === key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 hover:border-secondary-300'
            }`}
            title={config.shortcut}
          >
            {config.icon}
            {config.label}
          </button>
        ))}
      </nav>
    </div>
  );

  // ============================================
  // Render: Active View
  // ============================================

  const renderActiveView = () => {
    switch (activeView) {
      case 'chat':
        return (
          <ChatInterface
            sessionId={selectedSessionId || undefined}
            messages={chatMessages}
            sessions={sessionHistory}
            onSendMessage={handleSendMessage}
            onStopStreaming={() => stopStreaming()}
            onClearChat={() => clearCurrentChat()}
            onNewSession={handleNewSession}
            onSessionSelect={handleSelectSession}
            onQuickAction={handleQuickAction}
            onExport={handleExport}
            className="h-full"
          />
        );

      case 'intent':
        return (
          <IntentDisplay
            intent={currentIntent || undefined}
            input={chatMessages.filter((m) => m.role === 'user').pop()?.content}
            onClassify={handleClassifyIntent}
            onConfirm={(intent) => {
              setCurrentIntent(intent);
              handleCreatePlan(intent);
            }}
            onCreatePlan={handleCreatePlan}
            className="h-full overflow-auto p-4"
          />
        );

      case 'plan':
        return (
          <PlanVisualizer
            planData={currentPlan || undefined}
            onEditStep={(stepId) => console.log('Edit step:', stepId)}
            onAddStep={() => console.log('Add step')}
            onExecute={(plan) => handleExecutePlan(plan as TaskPlan)}
            onOptimize={async (plan) => {
              const optimized = await optimizePlan(plan as TaskPlan);
              return optimized || undefined;
            }}
            onExport={() => handleExport()}
            className="h-full overflow-auto p-4"
          />
        );

      case 'agents':
        return (
          <AgentSelector
            selectedAgents={[]}
            onAgentSelect={(selection) => {
              selectAgents([selection]);
            }}
            onAgentRemove={(agentType) => {
              selectAgents([]);
            }}
            onExecuteSelected={(selections) => {
              selectAgents(selections);
              navigateToView('chat');
            }}
            className="h-full overflow-auto p-4"
          />
        );

      case 'execution':
        return (
          <ExecutionTimeline
            executionResults={currentExecution || undefined}
            onRetryStep={(stepId) => console.log('Retry step:', stepId)}
            onSkipStep={(stepId) => console.log('Skip step:', stepId)}
            onRetryExecution={() => retryExecution()}
            onCancelExecution={() => cancelExecution()}
            className="h-full overflow-auto p-4"
          />
        );

      case 'output':
        return (
          <MultiAgentOutput
            executionResults={
              currentExecution
                ? {
                    results: currentExecution.steps.map((step) => ({
                      agentType: step.agentType,
                      success: step.success,
                      output: step.output,
                      error: step.error,
                      executionTimeMs: step.executionTimeMs,
                    })),
                    totalTimeMs: currentExecution.totalTimeMs,
                    totalTokensUsed: currentExecution.totalTokensUsed,
                    totalCostUsd: currentExecution.totalCostUsd,
                  }
                : undefined
            }
            onRetryAgent={(agentType) => console.log('Retry agent:', agentType)}
            onViewDetails={(agentType) => navigateToView('execution')}
            className="h-full overflow-auto p-4"
          />
        );

      case 'reflection':
        return (
          <ReflectionPanel
            executionResults={currentExecution || undefined}
            onApplyImprovement={(improvement) => console.log('Apply improvement:', improvement)}
            onExecuteNextStep={(nextStep) => console.log('Execute next step:', nextStep)}
            onExportReflection={(reflection) => handleExport()}
            className="h-full overflow-auto p-4"
          />
        );

      case 'memory':
        return (
          <MemoryPanel
            sessionId={selectedSessionId || undefined}
            onMemorySelect={(memory) => console.log('Memory selected:', memory.id)}
            onMemoryDelete={(memoryId) => console.log('Delete memory:', memoryId)}
            onMemoryExport={(memories) => handleExport()}
            className="h-full overflow-auto p-4"
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-secondary-500">
            <p>Select a view to get started</p>
          </div>
        );
    }
  };

  // ============================================
  // Render: Error Banner
  // ============================================

  const renderErrorBanner = () => {
    if (!error) return null;

    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300 flex items-center justify-between animate-slide-in-bottom">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => handleRefresh()}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Welcome Screen (when no session)
  // ============================================

  const renderWelcomeScreen = () => {
    if (sessionHistory.length > 0) return null;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white shadow-2xl mb-6">
          <Cpu className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-3">
          Ultimate AI Agent
        </h1>
        <p className="text-secondary-500 max-w-lg mb-8">
          The central orchestrator that coordinates all specialized AI agents.
          Start a conversation to classify your intent, create an execution plan,
          and let the agents work together to accomplish your goals.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Button variant="primary" size="lg" onClick={() => {
            handleNewSession();
            navigateToView('chat');
          }}>
            <MessageSquare className="h-5 w-5 mr-2" />
            Start Chatting
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigateToView('agents')}>
            <Layers className="h-5 w-5 mr-2" />
            Browse Agents
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
          {[
            { icon: <MessageSquare className="h-5 w-5" />, label: 'Natural Chat', desc: 'Conversational interface' },
            { icon: <Target className="h-5 w-5" />, label: 'Intent Detection', desc: 'Smart classification' },
            { icon: <GitBranch className="h-5 w-5" />, label: 'Plan Creation', desc: 'Automatic workflows' },
            { icon: <Activity className="h-5 w-5" />, label: 'Execution', desc: 'Real-time monitoring' },
            { icon: <Brain className="h-5 w-5" />, label: 'Reflection', desc: 'Learning & improvement' },
            { icon: <Database className="h-5 w-5" />, label: 'Memory', desc: 'Persistent context' },
            { icon: <Layers className="h-5 w-5" />, label: 'Multi-Agent', desc: 'Collaboration' },
            { icon: <Shield className="h-5 w-5" />, label: 'Fallbacks', desc: 'Error recovery' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 text-center">
              <div className="text-primary-600 dark:text-primary-400 mb-1 flex justify-center">{item.icon}</div>
              <p className="text-xs font-medium text-secondary-900 dark:text-white">{item.label}</p>
              <p className="text-xs text-secondary-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-secondary-50 dark:bg-secondary-900">
        {/* Agent Header */}
        <AgentHeader
          title="Ultimate AI Agent"
          description="Central orchestrator that coordinates all 7 specialized agents with memory and fallback"
          icon={<Cpu className="h-6 w-6" />}
          gradient="bg-gradient-to-br from-gray-700 to-gray-900"
          backLink="/agents"
          actions={
            <div className="flex items-center gap-1">
              <Tooltip content="New Session (Ctrl+N)">
                <Button variant="ghost" size="sm" onClick={handleNewSession}>
                  <Plus className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="View Sessions (Ctrl+S)">
                <Button variant="ghost" size="sm" onClick={() => setShowSessionPanel(true)}>
                  <History className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Toggle Stats">
                <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)}>
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Export">
                <Button variant="ghost" size="sm" onClick={() => handleExport()}>
                  <Download className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          }
        />

        {/* Welcome Screen or Main Content */}
        {sessionHistory.length === 0 && !selectedSessionId ? (
          renderWelcomeScreen()
        ) : (
          <>
            {/* Context Bar */}
            {renderContextBar()}

            {/* Error Banner */}
            {renderErrorBanner()}

            {/* Stats Panel */}
            {renderStatsPanel()}

            {/* View Navigation */}
            {renderViewNavigation()}

            {/* Main Content */}
            <div ref={mainContentRef} className="flex-1 overflow-hidden">
              {renderActiveView()}
            </div>
          </>
        )}

        {/* Session Panel Modal */}
        {renderSessionPanel()}

        {/* Mobile Quick Action Button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowSessionPanel(true)}
            className="rounded-full shadow-lg w-14 h-14 flex items-center justify-center"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default OrchestratorAgent;
