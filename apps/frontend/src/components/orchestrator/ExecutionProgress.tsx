// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/ExecutionProgress.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Cpu,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Flag,
  Gauge,
  GitBranch,
  Globe,
  HardDrive,
  Info,
  Layers,
  Lightbulb,
  Link,
  Loader2,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoreVertical,
  Pause,
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
  Square,
  Star,
  StopCircle,
  Target,
  ThumbsDown,
  ThumbsUp,
  Timer,
  TrendingDown,
  TrendingUp,
  Unlink,
  X,
  XCircle,
  Zap,
  Database,
  Cloud,
  Code,
  FileText,
  Image,
  Video,
  Music,
  Users,
  Wifi,
  Lock,
  Unlock,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { Progress } from '../common/Progress';
import { StepStatusBadge, StatusProgressBar, StatusTimeline, StatusLegend } from './StepStatusBadge';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { format, formatDistanceToNow, formatDuration, differenceInMilliseconds } from 'date-fns';

// ============================================
// Types
// ============================================

export type ExecutionPhase = 
  | 'initializing'
  | 'intent_classifying'
  | 'planning'
  | 'optimizing'
  | 'delegating'
  | 'executing'
  | 'monitoring'
  | 'reflecting'
  | 'finalizing'
  | 'complete'
  | 'failed'
  | 'cancelled';

export type ResourceType = 'cpu' | 'memory' | 'tokens' | 'api_calls' | 'cost' | 'time' | 'network';

export interface ResourceUsage {
  type: ResourceType;
  used: number;
  limit: number;
  unit: string;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  color: string;
  icon: React.ReactNode;
}

export interface PhaseInfo {
  phase: ExecutionPhase;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  progressColor: string;
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  runningSteps: number;
  pendingSteps: number;
  retryingSteps: number;
  successRate: number;
  averageStepTime: number;
  estimatedTimeRemaining: number;
  elapsedTime: number;
  tokensUsed: number;
  tokensLimit: number;
  costUsd: number;
  costLimit: number;
  apiCalls: number;
  apiCallsLimit: number;
  cpuUsage: number;
  memoryUsage: number;
  activeAgents: number;
  totalAgents: number;
  bottlenecks: string[];
  warnings: string[];
  errors: string[];
}

export interface AgentProgress {
  agentType: string;
  agentName: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  stepsAssigned: number;
  stepsCompleted: number;
  stepsFailed: number;
  currentStep?: string;
  tokensUsed: number;
  costUsd: number;
  averageResponseTime: number;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

interface ExecutionProgressProps {
  executionId?: string;
  planName?: string;
  phase?: ExecutionPhase;
  metrics?: ExecutionMetrics;
  agentProgress?: AgentProgress[];
  resourceUsage?: ResourceUsage[];
  phaseHistory?: Array<{ phase: ExecutionPhase; timestamp: Date; duration: number }>;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onViewDetails?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  pollingInterval?: number;
}

// ============================================
// Phase Configuration
// ============================================

const PHASE_CONFIG: Record<ExecutionPhase, PhaseInfo> = {
  initializing: {
    phase: 'initializing',
    label: 'Initializing',
    description: 'Setting up execution environment',
    icon: <Settings className="h-5 w-5" />,
    color: '#6366f1',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    progressColor: 'bg-indigo-500',
  },
  intent_classifying: {
    phase: 'intent_classifying',
    label: 'Classifying Intent',
    description: 'Analyzing the request to determine the best approach',
    icon: <Brain className="h-5 w-5" />,
    color: '#8b5cf6',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    progressColor: 'bg-purple-500',
  },
  planning: {
    phase: 'planning',
    label: 'Creating Plan',
    description: 'Building execution strategy and task plan',
    icon: <GitBranch className="h-5 w-5" />,
    color: '#3b82f6',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    progressColor: 'bg-blue-500',
  },
  optimizing: {
    phase: 'optimizing',
    label: 'Optimizing Plan',
    description: 'Improving execution efficiency',
    icon: <Sparkles className="h-5 w-5" />,
    color: '#06b6d4',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    progressColor: 'bg-cyan-500',
  },
  delegating: {
    phase: 'delegating',
    label: 'Delegating Tasks',
    description: 'Assigning tasks to specialized agents',
    icon: <Send className="h-5 w-5" />,
    color: '#f59e0b',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    progressColor: 'bg-amber-500',
  },
  executing: {
    phase: 'executing',
    label: 'Executing',
    description: 'Running agent tasks and processing results',
    icon: <Activity className="h-5 w-5" />,
    color: '#10b981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    progressColor: 'bg-emerald-500',
  },
  monitoring: {
    phase: 'monitoring',
    label: 'Monitoring',
    description: 'Watching execution progress and metrics',
    icon: <Gauge className="h-5 w-5" />,
    color: '#14b8a6',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    progressColor: 'bg-teal-500',
  },
  reflecting: {
    phase: 'reflecting',
    label: 'Reflecting',
    description: 'Analyzing results and generating insights',
    icon: <Lightbulb className="h-5 w-5" />,
    color: '#f97316',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    progressColor: 'bg-orange-500',
  },
  finalizing: {
    phase: 'finalizing',
    label: 'Finalizing',
    description: 'Compiling final response and cleaning up',
    icon: <CheckCircle className="h-5 w-5" />,
    color: '#059669',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    progressColor: 'bg-green-500',
  },
  complete: {
    phase: 'complete',
    label: 'Complete',
    description: 'Execution completed successfully',
    icon: <CheckCircle className="h-5 w-5" />,
    color: '#059669',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    progressColor: 'bg-green-500',
  },
  failed: {
    phase: 'failed',
    label: 'Failed',
    description: 'Execution encountered an error',
    icon: <XCircle className="h-5 w-5" />,
    color: '#dc2626',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    progressColor: 'bg-red-500',
  },
  cancelled: {
    phase: 'cancelled',
    label: 'Cancelled',
    description: 'Execution was cancelled',
    icon: <Square className="h-5 w-5" />,
    color: '#6b7280',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    progressColor: 'bg-gray-500',
  },
};

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}> = {
  email: { name: 'Email Agent', icon: <Mail className="h-5 w-5" />, color: '#3b82f6', gradient: 'from-blue-500 to-blue-600' },
  drive: { name: 'Drive Agent', icon: <HardDrive className="h-5 w-5" />, color: '#10b981', gradient: 'from-green-500 to-green-600' },
  content: { name: 'Content Agent', icon: <Sparkles className="h-5 w-5" />, color: '#8b5cf6', gradient: 'from-purple-500 to-purple-600' },
  social: { name: 'Social Agent', icon: <Share2 className="h-5 w-5" />, color: '#ec4899', gradient: 'from-pink-500 to-pink-600' },
  calendar: { name: 'Calendar Agent', icon: <Calendar className="h-5 w-5" />, color: '#f97316', gradient: 'from-orange-500 to-orange-600' },
  web: { name: 'Web Agent', icon: <Globe className="h-5 w-5" />, color: '#14b8a6', gradient: 'from-teal-500 to-teal-600' },
  task: { name: 'Task Agent', icon: <CheckSquare className="h-5 w-5" />, color: '#6366f1', gradient: 'from-indigo-500 to-indigo-600' },
  orchestrator: { name: 'Orchestrator', icon: <Cpu className="h-5 w-5" />, color: '#64748b', gradient: 'from-gray-500 to-gray-600' },
};

// ============================================
// Resource Configuration
// ============================================

const RESOURCE_CONFIG: Record<ResourceType, {
  label: string;
  icon: React.ReactNode;
  unit: string;
  color: string;
  warningThreshold: number;
  criticalThreshold: number;
}> = {
  cpu: { label: 'CPU Usage', icon: <Cpu className="h-4 w-4" />, unit: '%', color: '#3b82f6', warningThreshold: 70, criticalThreshold: 90 },
  memory: { label: 'Memory', icon: <Database className="h-4 w-4" />, unit: '%', color: '#8b5cf6', warningThreshold: 75, criticalThreshold: 92 },
  tokens: { label: 'Tokens Used', icon: <Zap className="h-4 w-4" />, unit: '', color: '#f59e0b', warningThreshold: 80, criticalThreshold: 95 },
  api_calls: { label: 'API Calls', icon: <Wifi className="h-4 w-4" />, unit: '', color: '#10b981', warningThreshold: 80, criticalThreshold: 95 },
  cost: { label: 'Cost', icon: <DollarSign className="h-4 w-4" />, unit: '$', color: '#ef4444', warningThreshold: 75, criticalThreshold: 90 },
  time: { label: 'Time Elapsed', icon: <Timer className="h-4 w-4" />, unit: '', color: '#6366f1', warningThreshold: 0, criticalThreshold: 0 },
  network: { label: 'Network', icon: <Cloud className="h-4 w-4" />, unit: 'MB', color: '#14b8a6', warningThreshold: 70, criticalThreshold: 90 },
};

// ============================================
// Component
// ============================================

export const ExecutionProgress: React.FC<ExecutionProgressProps> = ({
  executionId,
  planName,
  phase: externalPhase,
  metrics: externalMetrics,
  agentProgress: externalAgentProgress,
  resourceUsage: externalResourceUsage,
  phaseHistory: externalPhaseHistory,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onViewDetails,
  onExport,
  onRefresh,
  className = '',
  isFullscreen: externalFullscreen,
  onToggleFullscreen,
  pollingInterval = 2000,
}) => {
  // Store
  const {
    executionProgress,
    executionMetrics,
    agentProgress,
    resourceUsage,
    phaseHistory,
    isExecutionLoading,
    executionError,
    getExecutionProgress,
    getExecutionMetrics,
    pauseExecution,
    resumeExecution,
    cancelExecution,
  } = useOrchestratorStore();

  // Local state
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'resources' | 'timeline' | 'analytics'>('overview');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showBottlenecks, setShowBottlenecks] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<ExecutionPhase>('initializing');
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState(0);

  // Refs
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressSimRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;
  const phase = externalPhase || currentPhase;
  const metrics = externalMetrics || executionMetrics;
  const agents = externalAgentProgress || agentProgress || [];
  const resources = externalResourceUsage || resourceUsage || [];
  const history = externalPhaseHistory || phaseHistory || [];
  const phaseConfig = PHASE_CONFIG[phase] || PHASE_CONFIG.initializing;

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Poll execution progress
  useEffect(() => {
    if (executionId && (phase !== 'complete' && phase !== 'failed' && phase !== 'cancelled')) {
      pollingRef.current = setInterval(() => {
        getExecutionProgress?.(executionId);
        getExecutionMetrics?.(executionId);
      }, pollingInterval);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [executionId, phase, pollingInterval, getExecutionProgress, getExecutionMetrics]);

  // Track elapsed time
  useEffect(() => {
    if (phase !== 'complete' && phase !== 'failed' && phase !== 'cancelled') {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 100);
      }, 100);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [phase]);

  // Simulate phase progress for demo
  useEffect(() => {
    if (phase === 'initializing') {
      setPhaseProgress(prev => Math.min(100, prev + 5));
    } else if (phase === 'executing') {
      progressSimRef.current = setInterval(() => {
        setPhaseProgress(prev => Math.min(95, prev + Math.random() * 3));
      }, 1000);
    }
    return () => {
      if (progressSimRef.current) clearInterval(progressSimRef.current);
    };
  }, [phase]);

  // ============================================
  // Handlers
  // ============================================

  const handleToggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setInternalFullscreen(prev => !prev);
    }
  }, [onToggleFullscreen]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const formatCost = (usd: number): string => {
    return `$${usd.toFixed(4)}`;
  };

  const getPhaseColor = (): string => {
    if (phase === 'complete') return 'border-green-500 bg-green-50 dark:bg-green-900/20';
    if (phase === 'failed') return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (phase === 'cancelled') return 'border-gray-400 bg-gray-50 dark:bg-gray-800';
    return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
  };

  // ============================================
  // Render: Phase Progress Header
  // ============================================

  const renderPhaseHeader = () => (
    <div className={`rounded-2xl border-2 p-6 ${getPhaseColor()} transition-colors duration-500`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${phaseConfig.progressColor} flex items-center justify-center shadow-lg`}>
            <div className="text-white">{phaseConfig.icon}</div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
                {phaseConfig.label}
              </h2>
              {phase !== 'complete' && phase !== 'failed' && phase !== 'cancelled' && (
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              )}
            </div>
            <p className="text-secondary-600 dark:text-secondary-400 mt-1">
              {phaseConfig.description}
            </p>
            {planName && (
              <p className="text-xs text-secondary-500 mt-1">
                Plan: {planName} • Execution: {executionId?.substring(0, 12)}...
              </p>
            )}
          </div>
        </div>

        {/* Time Display */}
        <div className="text-right">
          <div className="flex items-center gap-2 text-2xl font-mono font-bold text-secondary-900 dark:text-white">
            <Clock className="h-6 w-6 text-secondary-400" />
            {formatDuration(elapsedTime)}
          </div>
          <p className="text-xs text-secondary-500">Elapsed Time</p>
          {estimatedRemaining > 0 && (
            <p className="text-xs text-secondary-400 mt-1">
              ~{formatDuration(estimatedRemaining)} remaining
            </p>
          )}
        </div>
      </div>

      {/* Phase Progress Bar */}
      {phase !== 'complete' && phase !== 'failed' && phase !== 'cancelled' && (
        <div className="mt-4">
          <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${phaseConfig.progressColor} rounded-full transition-all duration-1000`}
              style={{ width: `${phaseProgress}%` }}
            >
              <div className="h-full w-full bg-white/20 animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Phase Timeline */}
      <div className="mt-4 flex items-center justify-center gap-1">
        {Object.values(PHASE_CONFIG).slice(0, -3).map((config, idx) => {
          const historyEntry = history.find(h => h.phase === config.phase);
          const isCompleted = historyEntry !== undefined;
          const isCurrent = config.phase === phase;
          
          return (
            <React.Fragment key={config.phase}>
              <div
                className={`flex flex-col items-center ${isCurrent ? 'scale-110' : ''}`}
                title={`${config.label}${historyEntry ? ` (${formatDuration(historyEntry.duration)})` : ''}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                  isCompleted ? 'bg-green-500 border-green-500' :
                  isCurrent ? 'bg-blue-500 border-blue-500 animate-pulse' :
                  'bg-secondary-200 dark:bg-secondary-600 border-secondary-300 dark:border-secondary-500'
                }`} />
                <span className={`text-[9px] mt-1 ${isCurrent ? 'font-bold text-blue-600' : 'text-secondary-400'}`}>
                  {config.label.split(' ')[0]}
                </span>
              </div>
              {idx < Object.values(PHASE_CONFIG).length - 4 && (
                <div className={`w-8 h-0.5 ${
                  isCompleted ? 'bg-green-400' : 'bg-secondary-200 dark:bg-secondary-600'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  // ============================================
  // Render: Overview Tab
  // ============================================

  const renderOverview = () => {
    if (!metrics) return null;

    const stepMetrics = [
      { label: 'Total Steps', value: metrics.totalSteps, icon: <Layers className="h-5 w-5" />, color: 'text-blue-600' },
      { label: 'Completed', value: metrics.completedSteps, icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-600' },
      { label: 'Running', value: metrics.runningSteps, icon: <Loader2 className="h-5 w-5 animate-spin" />, color: 'text-blue-600' },
      { label: 'Pending', value: metrics.pendingSteps, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600' },
      { label: 'Failed', value: metrics.failedSteps, icon: <XCircle className="h-5 w-5" />, color: 'text-red-600' },
      { label: 'Retrying', value: metrics.retryingSteps, icon: <RotateCcw className="h-5 w-5" />, color: 'text-orange-600' },
      { label: 'Skipped', value: metrics.skippedSteps, icon: <SkipForward className="h-5 w-5" />, color: 'text-gray-500' },
    ];

    const performanceMetrics = [
      { label: 'Success Rate', value: `${metrics.successRate.toFixed(1)}%`, icon: <Target className="h-5 w-5" />, color: 'text-green-600' },
      { label: 'Avg Step Time', value: formatDuration(metrics.averageStepTime), icon: <Timer className="h-5 w-5" />, color: 'text-blue-600' },
      { label: 'Tokens Used', value: metrics.tokensUsed.toLocaleString(), icon: <Zap className="h-5 w-5" />, color: 'text-yellow-600' },
      { label: 'Cost', value: formatCost(metrics.costUsd), icon: <DollarSign className="h-5 w-5" />, color: 'text-green-600' },
      { label: 'API Calls', value: metrics.apiCalls.toLocaleString(), icon: <Wifi className="h-5 w-5" />, color: 'text-purple-600' },
      { label: 'Active Agents', value: `${metrics.activeAgents}/${metrics.totalAgents}`, icon: <Users className="h-5 w-5" />, color: 'text-teal-600' },
    ];

    return (
      <div className="space-y-6">
        {/* Step Metrics Grid */}
        <Card>
          <CardHeader icon={<Activity className="h-4 w-4" />}>Step Progress</CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              {stepMetrics.map(metric => (
                <div key={metric.label} className="text-center p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-xl">
                  <div className={`flex justify-center mb-2 ${metric.color}`}>{metric.icon}</div>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">{metric.value}</p>
                  <p className="text-xs text-secondary-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardBody>
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden flex">
              {metrics.completedSteps > 0 && (
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(metrics.completedSteps / metrics.totalSteps) * 100}%` }}
                />
              )}
              {metrics.runningSteps > 0 && (
                <div
                  className="h-full bg-blue-500 animate-pulse"
                  style={{ width: `${(metrics.runningSteps / metrics.totalSteps) * 100}%` }}
                />
              )}
              {metrics.retryingSteps > 0 && (
                <div
                  className="h-full bg-orange-500"
                  style={{ width: `${(metrics.retryingSteps / metrics.totalSteps) * 100}%` }}
                />
              )}
              {metrics.failedSteps > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(metrics.failedSteps / metrics.totalSteps) * 100}%` }}
                />
              )}
              {metrics.skippedSteps > 0 && (
                <div
                  className="h-full bg-yellow-500"
                  style={{ width: `${(metrics.skippedSteps / metrics.totalSteps) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-secondary-500">
              <span>0%</span>
              <span>{((metrics.completedSteps / Math.max(1, metrics.totalSteps)) * 100).toFixed(0)}% Complete</span>
              <span>100%</span>
            </div>
          </CardBody>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {performanceMetrics.map(metric => (
            <div key={metric.label} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
              <div className={`flex justify-center mb-2 ${metric.color}`}>{metric.icon}</div>
              <p className="text-lg font-bold text-secondary-900 dark:text-white">{metric.value}</p>
              <p className="text-xs text-secondary-500">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Warnings & Bottlenecks */}
        {(showWarnings && metrics.warnings?.length > 0) || (showBottlenecks && metrics.bottlenecks?.length > 0) && (
          <div className="space-y-3">
            {showWarnings && metrics.warnings?.map((warning, idx) => (
              <div key={`warn-${idx}`} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">{warning}</p>
              </div>
            ))}
            {showBottlenecks && metrics.bottlenecks?.map((bottleneck, idx) => (
              <div key={`bn-${idx}`} className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg flex items-start gap-2">
                <Flag className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-700 dark:text-purple-300">{bottleneck}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Agents Tab
  // ============================================

  const renderAgents = () => (
    <div className="space-y-4">
      {agents.map(agent => {
        const config = AGENT_CONFIG[agent.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
        const isExpanded = expandedAgent === agent.agentType;

        return (
          <Card
            key={agent.agentType}
            variant="bordered"
            className={`cursor-pointer transition-all hover:shadow-md ${
              isExpanded ? 'ring-2 ring-primary-500' : ''
            }`}
            onClick={() => setExpandedAgent(isExpanded ? null : agent.agentType)}
          >
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-md ${
                    agent.status === 'running' ? 'animate-pulse' : ''
                  }`}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-secondary-900 dark:text-white">{config.name}</h3>
                      <StepStatusBadge
                        status={agent.status === 'idle' ? 'pending' : agent.status === 'completed' ? 'completed' : agent.status === 'failed' ? 'failed' : 'running'}
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-secondary-500">
                      {agent.stepsCompleted}/{agent.stepsAssigned} steps • 
                      {agent.tokensUsed > 0 && ` ${agent.tokensUsed.toLocaleString()} tokens`} • 
                      {agent.costUsd > 0 && ` ${formatCost(agent.costUsd)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Progress Circle */}
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle
                        cx="20" cy="20" r="16"
                        fill="none"
                        stroke={config.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(agent.progress / 100) * 100.53} 100.53`}
                        transform="rotate(-90 20 20)"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold">{Math.round(agent.progress)}%</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-secondary-500">Current Step</p>
                      <p className="text-sm font-medium">{agent.currentStep || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary-500">Avg Response Time</p>
                      <p className="text-sm font-medium">{formatDuration(agent.averageResponseTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary-500">Tokens Used</p>
                      <p className="text-sm font-medium">{agent.tokensUsed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary-500">Cost</p>
                      <p className="text-sm font-medium">{formatCost(agent.costUsd)}</p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <StatusProgressBar
                      status={agent.status === 'running' ? 'running' : agent.status === 'completed' ? 'completed' : 'pending'}
                      progress={agent.progress}
                      size="sm"
                      showLabel={false}
                      showPercentage={true}
                    />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
      {agents.length === 0 && (
        <div className="text-center py-8 text-secondary-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No agent progress data yet</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // Render: Resources Tab
  // ============================================

  const renderResources = () => (
    <div className="space-y-4">
      {resources.map(resource => {
        const config = RESOURCE_CONFIG[resource.type];
        const isSelected = selectedMetric === resource.type;

        return (
          <Card
            key={resource.type}
            variant="bordered"
            className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
            onClick={() => setSelectedMetric(isSelected ? null : resource.type)}
          >
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.color}20` }}>
                    <div style={{ color: config.color }}>{config.icon}</div>
                  </div>
                  <div>
                    <h4 className="font-medium text-secondary-900 dark:text-white">{config.label}</h4>
                    <p className="text-xs text-secondary-500">
                      {resource.used.toLocaleString()} {resource.unit} / {resource.limit === Infinity ? '∞' : `${resource.limit.toLocaleString()} ${resource.unit}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${resource.percentage >= config.criticalThreshold ? 'text-red-600' : resource.percentage >= config.warningThreshold ? 'text-yellow-600' : 'text-green-600'}`}>
                    {resource.percentage.toFixed(1)}%
                  </span>
                  {resource.trend === 'increasing' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {resource.trend === 'decreasing' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {resource.trend === 'stable' && <ArrowRight className="h-4 w-4 text-secondary-400" />}
                </div>
              </div>
              <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    resource.percentage >= config.criticalThreshold ? 'bg-red-500' :
                    resource.percentage >= config.warningThreshold ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, resource.percentage)}%` }}
                />
              </div>
            </CardBody>
          </Card>
        );
      })}
      {resources.length === 0 && (
        <div className="text-center py-8 text-secondary-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No resource usage data yet</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // Render: Timeline Tab
  // ============================================

  const renderTimeline = () => (
    <Card>
      <CardHeader icon={<Clock className="h-4 w-4" />}>Phase Timeline</CardHeader>
      <CardBody>
        <StatusTimeline
          steps={history.map(h => ({
            status: h.phase === 'complete' ? 'completed' : h.phase === 'failed' ? 'failed' : 'completed',
            label: PHASE_CONFIG[h.phase]?.label || h.phase,
            timestamp: h.timestamp,
            description: `Duration: ${formatDuration(h.duration)}`,
          }))}
        />
        {history.length === 0 && (
          <div className="text-center py-8 text-secondary-500">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No phase history yet</p>
          </div>
        )}
      </CardBody>
    </Card>
  );

  // ============================================
  // Render: Analytics Tab
  // ============================================

  const renderAnalytics = () => {
    if (!metrics) return (
      <div className="text-center py-8 text-secondary-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No analytics data available</p>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Success/Failure Distribution */}
        <Card>
          <CardHeader icon={<BarChart3 className="h-4 w-4" />}>Step Distribution</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {[
                { label: 'Completed', value: metrics.completedSteps, color: 'bg-green-500' },
                { label: 'Running', value: metrics.runningSteps, color: 'bg-blue-500' },
                { label: 'Pending', value: metrics.pendingSteps, color: 'bg-yellow-500' },
                { label: 'Failed', value: metrics.failedSteps, color: 'bg-red-500' },
                { label: 'Retrying', value: metrics.retryingSteps, color: 'bg-orange-500' },
                { label: 'Skipped', value: metrics.skippedSteps, color: 'bg-gray-500' },
              ].map(item => {
                const percentage = metrics.totalSteps > 0 ? (item.value / metrics.totalSteps) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-600 dark:text-secondary-400">{item.label}</span>
                      <span className="font-medium">{item.value} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <p className="text-xs text-secondary-500">Success Rate</p>
            <p className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <p className="text-xs text-secondary-500">Avg Step Time</p>
            <p className="text-2xl font-bold text-blue-600">{formatDuration(metrics.averageStepTime)}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <p className="text-xs text-secondary-500">Tokens Efficiency</p>
            <p className="text-2xl font-bold text-yellow-600">
              {(metrics.tokensUsed / Math.max(1, metrics.completedSteps)).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <p className="text-xs text-secondary-500">Cost per Step</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCost(metrics.costUsd / Math.max(1, metrics.completedSteps))}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isExecutionLoading && !metrics) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={2} />
        <LoadingSkeleton type="list" count={4} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (executionError && !metrics) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Progress</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{executionError}</p>
        <Button variant="primary" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div className={`space-y-6 ${className} ${isFullscreen ? 'fixed inset-4 z-50 bg-white dark:bg-secondary-900 p-6 rounded-xl overflow-auto' : ''}`}>
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Gauge className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Execution Progress</h2>
              <p className="text-sm text-secondary-500">
                Real-time monitoring and analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Navigation */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              {[
                { id: 'overview', label: 'Overview', icon: <Activity className="h-3.5 w-3.5" /> },
                { id: 'agents', label: 'Agents', icon: <Users className="h-3.5 w-3.5" /> },
                { id: 'resources', label: 'Resources', icon: <BarChart3 className="h-3.5 w-3.5" /> },
                { id: 'timeline', label: 'Timeline', icon: <Clock className="h-3.5 w-3.5" /> },
                { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="h-3.5 w-3.5" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    activeTab === tab.id ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600' : 'text-secondary-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            {phase !== 'complete' && phase !== 'failed' && phase !== 'cancelled' && (
              <>
                {onPause && (
                  <Button variant="outline" size="sm" onClick={onPause}>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                {onCancel && (
                  <Button variant="danger" size="sm" onClick={onCancel}>
                    <Square className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </>
            )}
            {(phase === 'failed' || phase === 'cancelled') && onRetry && (
              <Button variant="primary" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleToggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Phase Header */}
        {renderPhaseHeader()}

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'agents' && renderAgents()}
          {activeTab === 'resources' && renderResources()}
          {activeTab === 'timeline' && renderTimeline()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-secondary-400 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          <span>Execution ID: {executionId?.substring(0, 12) || 'N/A'}...</span>
          <div className="flex items-center gap-4">
            <span>Status Legend:</span>
            <StatusLegend size="xs" variant="dot" />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default ExecutionProgress;
