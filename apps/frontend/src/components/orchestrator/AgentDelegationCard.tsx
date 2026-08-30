// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/AgentDelegationCard.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  GitBranch,
  Globe,
  HardDrive,
  Info,
  Layers,
  Lightbulb,
  Mail,
  Maximize2,
  Minimize2,
  MoreVertical,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  SkipForward,
  Sparkles,
  Star,
  StopCircle,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
  Zap,
  AlertCircle,
  Loader2,
  Pause,
  Square,
  Filter,
  Bookmark,
  MessageSquare,
  FileText,
  Image,
  Video,
  Music,
  Code,
  Database,
  Cloud,
  Wifi,
  Lock,
  Unlock,
  Users,
  DollarSign,
  Gauge,
  Timer,
  GripVertical,
  Edit,
  Trash2,
  Save,
  Plus,
  Minus,
  History,
  GitMerge,
  GitPullRequest,
  Link,
  Unlink,
  Move,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { AgentDelegationRequest, AgentDelegationResult } from '../../../types/orchestrator.types';
import { AgentType } from '../../../types/agent.types';
import { format, formatDistanceToNow, formatDuration } from 'date-fns';

// ============================================
// Types
// ============================================

export type DelegationStatus = 'idle' | 'pending' | 'delegating' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'fallback' | 'timeout';

export interface AgentInfo {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bgColor: string;
  borderColor: string;
  capabilities: string[];
  status: 'idle' | 'running' | 'error' | 'degraded' | 'maintenance' | 'unknown';
  isAvailable: boolean;
  isConnected: boolean;
  metrics?: {
    totalExecutions: number;
    successRate: number;
    averageResponseTimeMs: number;
    errorRate: number;
    lastExecutedAt?: Date;
  };
  tools?: Array<{
    name: string;
    description: string;
    cost: number;
    requiresApiCall: boolean;
  }>;
}

export interface DelegationRequest {
  id: string;
  agentType: string;
  task: string;
  input?: any;
  priority: number;
  timeout?: number;
  retryOnFailure: boolean;
  maxRetries: number;
  fallbackAgents?: string[];
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DelegationResult {
  requestId: string;
  success: boolean;
  output: any;
  error?: string;
  errorStack?: string;
  agentType: string;
  fallbackUsed: boolean;
  fallbackChain: string[];
  executionTimeMs: number;
  tokensUsed: number;
  costUsd: number;
  retryCount: number;
  metadata?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
}

interface AgentDelegationCardProps {
  request?: DelegationRequest;
  result?: DelegationResult;
  agent?: AgentInfo;
  status?: DelegationStatus;
  onExecute?: (request: DelegationRequest) => void;
  onRetry?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  onSkip?: (requestId: string) => void;
  onSelectFallback?: (requestId: string, agentType: string) => void;
  onViewOutput?: (requestId: string) => void;
  onCopyOutput?: (requestId: string) => void;
  onDownloadOutput?: (requestId: string) => void;
  onFeedback?: (requestId: string, rating: 'positive' | 'negative' | 'neutral', notes?: string) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<string, {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bgColor: string;
  borderColor: string;
  capabilities: string[];
}> = {
  email: {
    name: 'Email Agent',
    description: 'Smart email management with AI-powered replies and organization',
    icon: <Mail className="h-6 w-6" />,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    capabilities: ['Send emails', 'Read inbox', 'Reply to emails', 'Organize with labels', 'Create drafts', 'Classify emails'],
  },
  drive: {
    name: 'Drive Agent',
    description: 'File management, search, sharing, and organization',
    icon: <HardDrive className="h-6 w-6" />,
    color: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-300 dark:border-green-700',
    capabilities: ['Upload files', 'Download files', 'Search files', 'Share files', 'Create folders', 'Manage permissions'],
  },
  content: {
    name: 'Content Agent',
    description: 'Generate text, images, and videos using AI',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
    capabilities: ['Generate text', 'Create images', 'Generate videos', 'Edit content', 'Translate text', 'Summarize content'],
  },
  social: {
    name: 'Social Agent',
    description: 'Post to LinkedIn, Instagram, Facebook, and X',
    icon: <Share2 className="h-6 w-6" />,
    color: 'text-pink-600',
    gradient: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    borderColor: 'border-pink-300 dark:border-pink-700',
    capabilities: ['Post to LinkedIn', 'Post to Instagram', 'Post to Facebook', 'Post to X', 'Schedule posts', 'Track analytics'],
  },
  calendar: {
    name: 'Calendar Agent',
    description: 'Smart scheduling, meeting management, and availability coordination',
    icon: <Calendar className="h-6 w-6" />,
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-300 dark:border-orange-700',
    capabilities: ['Create events', 'List events', 'Smart scheduling', 'Check availability', 'Manage reminders', 'Coordinate meetings'],
  },
  web: {
    name: 'Web Agent',
    description: 'Web search, research, weather, and data extraction',
    icon: <Globe className="h-6 w-6" />,
    color: 'text-teal-600',
    gradient: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    borderColor: 'border-teal-300 dark:border-teal-700',
    capabilities: ['Web search', 'Deep research', 'Get weather', 'Get news', 'Extract data', 'Compare topics'],
  },
  task: {
    name: 'Task Agent',
    description: 'Task management across Google Tasks, Asana, and Monday.com',
    icon: <CheckSquare className="h-6 w-6" />,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    capabilities: ['Create tasks', 'List tasks', 'Update tasks', 'Complete tasks', 'Batch operations', 'Get task summary'],
  },
  orchestrator: {
    name: 'Orchestrator',
    description: 'Central coordinator that manages all specialized agents',
    icon: <Cpu className="h-6 w-6" />,
    color: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-700',
    capabilities: ['Classify intent', 'Create plans', 'Delegate tasks', 'Manage memory', 'Reflect on results'],
  },
};

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<DelegationStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  animation?: string;
  description: string;
}> = {
  idle: {
    label: 'Ready',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Agent is ready to execute',
  },
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Waiting in queue',
  },
  delegating: {
    label: 'Delegating',
    icon: <Send className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animation: 'animate-pulse',
    description: 'Sending task to agent',
  },
  executing: {
    label: 'Executing',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animation: 'animate-pulse',
    description: 'Agent is processing the task',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Task completed successfully',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Task execution failed',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'Task was cancelled',
  },
  fallback: {
    label: 'Fallback Used',
    icon: <GitBranch className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: 'Used fallback agent',
  },
  timeout: {
    label: 'Timeout',
    icon: <Timer className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Task timed out',
  },
};

// ============================================
// Component
// ============================================

export const AgentDelegationCard: React.FC<AgentDelegationCardProps> = ({
  request,
  result,
  agent: agentProp,
  status: initialStatus = 'idle',
  onExecute,
  onRetry,
  onCancel,
  onSkip,
  onSelectFallback,
  onViewOutput,
  onCopyOutput,
  onDownloadOutput,
  onFeedback,
  className = '',
  isExpanded: externalIsExpanded,
  onToggleExpand,
}) => {
  // Store
  const {
    delegationResults,
    isDelegationLoading,
    delegationError,
    executeDelegation,
    retryDelegation,
    cancelDelegation,
  } = useOrchestratorStore();

  // Local state
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [status, setStatus] = useState<DelegationStatus>(initialStatus);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showFallbackOptions, setShowFallbackOptions] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<'positive' | 'negative' | 'neutral' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const currentResult = result || delegationResults?.find(r => r.requestId === request?.id);
  const agentConfig = AGENT_CONFIG[request?.agentType || agentProp?.type || 'orchestrator'] || AGENT_CONFIG.orchestrator;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const isActive = status === 'delegating' || status === 'executing' || status === 'pending';
  const isTerminal = status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'timeout';

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Simulate progress for executing state
  useEffect(() => {
    if (status === 'executing') {
      setProgress(0);
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);
    } else if (status === 'delegating') {
      setProgress(0);
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => Math.min(100, prev + 20));
      }, 300);
    } else {
      if (status === 'completed') setProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [status]);

  // Track elapsed time for active executions
  useEffect(() => {
    if (isActive) {
      setElapsedTime(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 100);
      }, 100);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }

    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [isActive]);

  // ============================================
  // Handlers
  // ============================================

  const handleToggleExpand = useCallback(() => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalIsExpanded(prev => !prev);
    }
  }, [onToggleExpand]);

  const handleExecute = useCallback(() => {
    if (!request) return;
    setStatus('delegating');
    onExecute?.(request);
    
    // Simulate state transitions
    setTimeout(() => setStatus('executing'), 1000);
  }, [request, onExecute]);

  const handleRetry = useCallback(() => {
    if (!request) return;
    setStatus('delegating');
    setProgress(0);
    onRetry?.(request.id);
  }, [request, onRetry]);

  const handleCancel = useCallback(() => {
    if (!request) return;
    setStatus('cancelled');
    onCancel?.(request.id);
  }, [request, onCancel]);

  const handleSkip = useCallback(() => {
    if (!request) return;
    setStatus('cancelled');
    onSkip?.(request.id);
  }, [request, onSkip]);

  const handleCopyOutput = useCallback(() => {
    if (currentResult?.output) {
      const outputStr = typeof currentResult.output === 'string' 
        ? currentResult.output 
        : JSON.stringify(currentResult.output, null, 2);
      navigator.clipboard.writeText(outputStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyOutput?.(currentResult.requestId);
    }
  }, [currentResult, onCopyOutput]);

  const handleFeedbackSubmit = useCallback(() => {
    if (currentResult && feedbackRating) {
      onFeedback?.(currentResult.requestId, feedbackRating, feedbackNotes);
      setShowFeedbackForm(false);
      setFeedbackNotes('');
    }
  }, [currentResult, feedbackRating, feedbackNotes, onFeedback]);

  // ============================================
  // Formatting Helpers
  // ============================================

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const formatCost = (usd: number): string => {
    if (usd < 0.001) return `${(usd * 1000000).toFixed(0)}μ¢`;
    if (usd < 0.01) return `${(usd * 1000).toFixed(1)}m¢`;
    return `$${usd.toFixed(4)}`;
  };

  const formatOutput = (output: any): string => {
    if (typeof output === 'string') return output;
    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  };

  const getProgressColor = (): string => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed' || status === 'timeout') return 'bg-red-500';
    if (status === 'fallback') return 'bg-orange-500';
    if (status === 'executing') return 'bg-blue-500';
    if (status === 'delegating') return 'bg-indigo-500';
    return 'bg-secondary-300';
  };

  // ============================================
  // Render: Compact View
  // ============================================

  const renderCompactView = () => (
    <div
      className={`relative bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-md ${
        status === 'completed' ? 'border-green-300 dark:border-green-700' :
        status === 'failed' ? 'border-red-300 dark:border-red-700' :
        status === 'executing' ? 'border-blue-300 dark:border-blue-700' :
        isActive ? 'border-blue-200 dark:border-blue-800' :
        agentConfig.borderColor
      } ${isHovered ? 'shadow-lg' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleToggleExpand}
    >
      {/* Progress Bar (top) */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary-200 dark:bg-secondary-700 rounded-t-xl overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 rounded-t-xl`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Agent Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agentConfig.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0 ${
              isActive ? 'animate-pulse' : ''
            }`}>
              {agentConfig.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-secondary-900 dark:text-white truncate">
                  {agentConfig.name}
                </h4>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.animation || ''}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                {currentResult?.fallbackUsed && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <GitBranch className="h-3 w-3" />
                    Fallback
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary-500 truncate mt-0.5">
                {request?.task || agentConfig.description}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {status === 'executing' && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="text-blue-600">{formatDuration(elapsedTime)}</span>
              </div>
            )}
            {currentResult?.executionTimeMs !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-secondary-400" />
                <span>{formatDuration(currentResult.executionTimeMs)}</span>
              </div>
            )}
            {currentResult?.tokensUsed !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <Zap className="h-3 w-3 text-secondary-400" />
                <span>{currentResult.tokensUsed.toLocaleString()}</span>
              </div>
            )}
            {currentResult?.costUsd !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="h-3 w-3 text-secondary-400" />
                <span>{formatCost(currentResult.costUsd)}</span>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-secondary-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-secondary-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // Render: Expanded View
  // ============================================

  const renderExpandedView = () => (
    <div
      className={`relative bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-300 ${
        status === 'completed' ? 'border-green-300 dark:border-green-700 shadow-lg' :
        status === 'failed' ? 'border-red-300 dark:border-red-700 shadow-lg' :
        status === 'executing' ? 'border-blue-300 dark:border-blue-700 shadow-lg' :
        isActive ? 'border-blue-200 dark:border-blue-800 shadow-lg' :
        'border-primary-300 dark:border-primary-700 shadow-lg'
      }`}
    >
      {/* Progress Bar (top) */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-200 dark:bg-secondary-700 rounded-t-xl overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 rounded-t-xl`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div
        className="p-5 cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agentConfig.gradient} flex items-center justify-center text-white shadow-lg ${
              isActive ? 'animate-pulse' : ''
            }`}>
              {agentConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-secondary-900 dark:text-white">
                  {agentConfig.name}
                </h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.animation || ''}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                {currentResult?.fallbackUsed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <GitBranch className="h-3 w-3" />
                    Fallback Used
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary-500">{agentConfig.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleToggleExpand(); }}>
              <ChevronUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-5">
        {/* Execution Progress */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-secondary-500">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor()} rounded-full transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-secondary-400">
              <span>Elapsed: {formatDuration(elapsedTime)}</span>
              {request?.timeout && (
                <span>Timeout: {formatDuration(request.timeout)}</span>
              )}
            </div>
          </div>
        )}

        {/* Task Details */}
        {request && (
          <div>
            <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Task</h4>
            <div className="p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
              <p className="text-sm text-secondary-700 dark:text-secondary-300">{request.task}</p>
              {request.input && (
                <div className="mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showDetails ? 'Hide Input' : 'Show Input'}
                  </button>
                  {showDetails && (
                    <pre className="mt-2 text-xs bg-white dark:bg-secondary-900 p-2 rounded font-mono max-h-32 overflow-y-auto">
                      {JSON.stringify(request.input, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent Capabilities */}
        <div>
          <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Capabilities</h4>
          <div className="flex flex-wrap gap-1.5">
            {agentConfig.capabilities.map((capability, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded-full text-xs"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {currentResult?.executionTimeMs !== undefined && (
            <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-secondary-900 dark:text-white">
                {formatDuration(currentResult.executionTimeMs)}
              </p>
              <p className="text-xs text-secondary-500">Execution Time</p>
            </div>
          )}
          {currentResult?.tokensUsed !== undefined && (
            <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
              <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-secondary-900 dark:text-white">
                {currentResult.tokensUsed.toLocaleString()}
              </p>
              <p className="text-xs text-secondary-500">Tokens Used</p>
            </div>
          )}
          {currentResult?.costUsd !== undefined && (
            <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
              <DollarSign className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-secondary-900 dark:text-white">
                {formatCost(currentResult.costUsd)}
              </p>
              <p className="text-xs text-secondary-500">Cost</p>
            </div>
          )}
          {currentResult?.retryCount !== undefined && (
            <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-3 text-center">
              <RotateCcw className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <p className="text-sm font-bold text-secondary-900 dark:text-white">
                {currentResult.retryCount}
              </p>
              <p className="text-xs text-secondary-500">Retries</p>
            </div>
          )}
          {currentResult?.success !== undefined && (
            <div className={`rounded-lg p-3 text-center ${
              currentResult.success ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
            }`}>
              {currentResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
              )}
              <p className={`text-sm font-bold ${currentResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {currentResult.success ? 'Success' : 'Failed'}
              </p>
              <p className="text-xs text-secondary-500">Status</p>
            </div>
          )}
        </div>

        {/* Output */}
        {currentResult?.output !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider">Output</h4>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => { e.stopPropagation(); handleCopyOutput(); }}
                >
                  {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
                {onDownloadOutput && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => { e.stopPropagation(); onDownloadOutput(currentResult.requestId); }}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className={`relative ${!outputExpanded ? 'max-h-32' : ''} overflow-hidden`}>
              <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-3 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap">
                {formatOutput(currentResult.output)}
              </pre>
              {!outputExpanded && formatOutput(currentResult.output).length > 300 && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-secondary-50 dark:from-secondary-900 to-transparent" />
              )}
            </div>
            {formatOutput(currentResult.output).length > 300 && (
              <button
                onClick={(e) => { e.stopPropagation(); setOutputExpanded(!outputExpanded); }}
                className="text-xs text-primary-600 hover:text-primary-700 mt-1 w-full text-center"
              >
                {outputExpanded ? 'Show Less' : 'Show All'}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {currentResult?.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Error</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{currentResult.error}</p>
                {currentResult.errorStack && showDetails && (
                  <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-x-auto max-h-32">
                    {currentResult.errorStack}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fallback Chain */}
        {request?.fallbackAgents && request.fallbackAgents.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-2">Fallback Chain</h4>
            <div className="flex flex-wrap items-center gap-2">
              {request.fallbackAgents.map((agentType, idx) => {
                const config = AGENT_CONFIG[agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
                const isUsed = currentResult?.fallbackChain?.includes(agentType);
                return (
                  <React.Fragment key={agentType}>
                    {idx > 0 && <ArrowRight className="h-4 w-4 text-secondary-400" />}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isUsed ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        config.bgColor
                      } ${config.color}`}
                    >
                      {config.icon}
                      {config.name}
                      {isUsed && <span className="text-[10px]">(used)</span>}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
          {status === 'idle' || status === 'pending' ? (
            <>
              <Button
                variant="primary"
                onClick={(e) => { e.stopPropagation(); handleExecute(); }}
              >
                <Play className="h-4 w-4 mr-1" />
                Execute
              </Button>
              {onSkip && (
                <Button
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              )}
            </>
          ) : isActive ? (
            <Button
              variant="danger"
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            >
              <Square className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          ) : status === 'failed' || status === 'timeout' ? (
            <>
              <Button
                variant="primary"
                onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry
              </Button>
              {onSkip && (
                <Button
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); handleSkip(); }}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip
                </Button>
              )}
              {request?.fallbackAgents && request.fallbackAgents.length > 0 && (
                <Button
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); setShowFallbackOptions(!showFallbackOptions); }}
                >
                  <GitBranch className="h-4 w-4 mr-1" />
                  Use Fallback
                </Button>
              )}
            </>
          ) : status === 'completed' ? (
            <>
              <Button
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Run Again
              </Button>
              {onViewOutput && (
                <Button
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); onViewOutput(currentResult?.requestId || ''); }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              )}
            </>
          ) : null}

          {/* Feedback Buttons */}
          {isTerminal && currentResult && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-secondary-400 mr-2">Was this helpful?</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => { e.stopPropagation(); setFeedbackRating('positive'); onFeedback?.(currentResult.requestId, 'positive'); }}
                className={feedbackRating === 'positive' ? 'text-green-600' : ''}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => { e.stopPropagation(); setFeedbackRating('negative'); onFeedback?.(currentResult.requestId, 'negative'); }}
                className={feedbackRating === 'negative' ? 'text-red-600' : ''}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Fallback Options Dropdown */}
        {showFallbackOptions && request?.fallbackAgents && (
          <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">Select Fallback Agent:</p>
            <div className="flex flex-wrap gap-2">
              {request.fallbackAgents.map(agentType => {
                const config = AGENT_CONFIG[agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
                return (
                  <button
                    key={agentType}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFallback?.(request.id, agentType);
                      setShowFallbackOptions(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${config.bgColor} ${config.color} hover:bg-opacity-80 transition-colors`}
                  >
                    {config.icon}
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // Loading State
  // ============================================

  if (isDelegationLoading && !request) {
    return (
      <LoadingSkeleton type="card" className={className} />
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div
        className={`${className} transition-all duration-500 ${
          animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {isExpanded ? renderExpandedView() : renderCompactView()}
      </div>
    </ErrorBoundary>
  );
};


export default AgentDelegationCard;
