// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/ExecutionTimeline.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Square,
  RefreshCw,
  SkipForward,
  RotateCcw,
  Eye,
  EyeOff,
  Filter,
  Search,
  Download,
  Maximize2,
  Minimize2,
  Zap,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  GitBranch,
  Layers,
  Target,
  Shield,
  Cpu,
  Mail,
  HardDrive,
  Sparkles,
  Share2,
  Calendar,
  Globe,
  CheckSquare,
  Info,
  X,
  MoreVertical,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Star,
  Flag,
  Award,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bookmark,
  Share,
  Minus,
  Plus,
  Link,
  Unlink,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { StepExecutionResult, ChainExecutionResult, ExecutionMode } from '../../../types/orchestrator.types';
import { format, formatDistanceToNow, formatDuration, differenceInMilliseconds } from 'date-fns';

// ============================================
// Types
// ============================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'retrying' | 'timeout';

export interface TimelineStep {
  id: string;
  name: string;
  agentType: string;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  progress: number;
  output?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  dependsOn: string[];
  parallelGroup?: string;
  isFallback?: boolean;
  fallbackFor?: string;
  tokensUsed: number;
  costUsd: number;
  metadata?: Record<string, any>;
}

export interface TimelineExecution {
  executionId: string;
  planId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  mode: ExecutionMode;
  steps: TimelineStep[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

interface ExecutionTimelineProps {
  execution?: TimelineExecution;
  executionResults?: ChainExecutionResult;
  onRetryStep?: (stepId: string) => void;
  onSkipStep?: (stepId: string) => void;
  onCancelExecution?: () => void;
  onRetryExecution?: () => void;
  onStepClick?: (step: TimelineStep) => void;
  className?: string;
}

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  gradient: string;
}> = {
  email: {
    name: 'Email',
    icon: <Mail className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    gradient: 'from-blue-500 to-blue-600',
  },
  drive: {
    name: 'Drive',
    icon: <HardDrive className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    gradient: 'from-green-500 to-green-600',
  },
  content: {
    name: 'Content',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    gradient: 'from-purple-500 to-purple-600',
  },
  social: {
    name: 'Social',
    icon: <Share2 className="h-4 w-4" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    gradient: 'from-pink-500 to-pink-600',
  },
  calendar: {
    name: 'Calendar',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    gradient: 'from-orange-500 to-orange-600',
  },
  web: {
    name: 'Web',
    icon: <Globe className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    gradient: 'from-teal-500 to-teal-600',
  },
  task: {
    name: 'Task',
    icon: <CheckSquare className="h-4 w-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  orchestrator: {
    name: 'Orchestrator',
    icon: <Cpu className="h-4 w-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    gradient: 'from-gray-500 to-gray-600',
  },
};

const STATUS_CONFIG: Record<ExecutionStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  animation?: string;
}> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-secondary-500',
    bgColor: 'bg-secondary-100 dark:bg-secondary-800',
  },
  running: {
    label: 'Running',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animation: 'animate-pulse',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  skipped: {
    label: 'Skipped',
    icon: <SkipForward className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  retrying: {
    label: 'Retrying',
    icon: <RotateCcw className="h-4 w-4 animate-spin" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    animation: 'animate-pulse',
  },
  timeout: {
    label: 'Timeout',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

// ============================================
// Component
// ============================================

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  execution,
  executionResults,
  onRetryStep,
  onSkipStep,
  onCancelExecution,
  onRetryExecution,
  onStepClick,
  className = '',
}) => {
  // Store
  const {
    executionProgress,
    isExecutionLoading,
    executionError,
    getExecutionProgress,
  } = useOrchestratorStore();

  // Local state
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'gantt' | 'list'>('timeline');
  const [showDetails, setShowDetails] = useState(true);
  const [filterStatus, setFilterStatus] = useState<ExecutionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Poll execution progress if running
  useEffect(() => {
    if (execution?.status === 'running' && execution.executionId) {
      const interval = setInterval(() => {
        getExecutionProgress(execution.executionId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [execution?.status, execution?.executionId, getExecutionProgress]);

  // ============================================
  // Derived Data
  // ============================================

  const steps = useMemo((): TimelineStep[] => {
    if (execution?.steps) return execution.steps;
    if (executionResults?.steps) {
      return executionResults.steps.map(step => ({
        id: step.stepId,
        name: step.stepId,
        agentType: step.agentType,
        status: step.success ? 'completed' as ExecutionStatus : 'failed' as ExecutionStatus,
        startTime: step.startedAt,
        endTime: step.completedAt,
        duration: step.executionTimeMs,
        progress: step.success ? 100 : 0,
        output: step.output,
        error: step.error,
        retryCount: step.retryCount,
        maxRetries: 3,
        dependsOn: [],
        tokensUsed: step.tokensUsed,
        costUsd: step.costUsd,
      }));
    }
    return [];
  }, [execution, executionResults]);

  const filteredSteps = useMemo(() => {
    let filtered = [...steps];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.agentType.toLowerCase().includes(query) ||
        s.error?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [steps, filterStatus, searchQuery]);

  const executionSummary = useMemo(() => {
    const completed = steps.filter(s => s.status === 'completed').length;
    const failed = steps.filter(s => s.status === 'failed').length;
    const running = steps.filter(s => s.status === 'running').length;
    const pending = steps.filter(s => s.status === 'pending').length;
    
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    const totalTokens = steps.reduce((sum, s) => sum + s.tokensUsed, 0);
    const totalCost = steps.reduce((sum, s) => sum + s.costUsd, 0);
    const successRate = steps.length > 0 ? (completed / steps.length) * 100 : 0;
    
    return {
      total: steps.length,
      completed,
      failed,
      running,
      pending,
      totalDuration,
      totalTokens,
      totalCost,
      successRate,
    };
  }, [steps]);

  // ============================================
  // Handlers
  // ============================================

  const handleStepClick = (step: TimelineStep) => {
    setExpandedStep(expandedStep === step.id ? null : step.id);
    onStepClick?.(step);
  };

  const handleSelectStep = (stepId: string) => {
    const newSet = new Set(selectedSteps);
    if (newSet.has(stepId)) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
    }
    setSelectedSteps(newSet);
  };

  const handleSelectAll = () => {
    if (selectedSteps.size === filteredSteps.length) {
      setSelectedSteps(new Set());
    } else {
      setSelectedSteps(new Set(filteredSteps.map(s => s.id)));
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const formatCost = (usd: number): string => {
    if (usd < 0.001) return `${(usd * 1000000).toFixed(0)}μ¢`;
    if (usd < 0.01) return `${(usd * 1000).toFixed(1)}m¢`;
    return `$${usd.toFixed(4)}`;
  };

  // ============================================
  // Render: Status Badge
  // ============================================

  const renderStatusBadge = (status: ExecutionStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${config.animation || ''}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // ============================================
  // Render: Agent Badge
  // ============================================

  const renderAgentBadge = (agentType: string) => {
    const config = AGENT_CONFIG[agentType.toLowerCase()] || {
      name: agentType,
      icon: <Cpu className="h-4 w-4" />,
      color: 'text-gray-600',
      gradient: 'from-gray-500 to-gray-600',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        {config.icon}
        {config.name}
      </span>
    );
  };

  // ============================================
  // Render: Progress Bar
  // ============================================

  const renderProgressBar = (progress: number, status: ExecutionStatus) => {
    const getColor = () => {
      switch (status) {
        case 'completed': return 'bg-green-500';
        case 'failed': return 'bg-red-500';
        case 'running': return 'bg-blue-500';
        case 'retrying': return 'bg-orange-500';
        default: return 'bg-secondary-300';
      }
    };
    return (
      <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    );
  };

  // ============================================
  // Render: Timeline View
  // ============================================

  const renderTimelineView = () => (
    <div className="relative" ref={timelineRef}>
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-secondary-200 dark:bg-secondary-700" />

      <div className="space-y-0">
        {filteredSteps.map((step, index) => {
          const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
          const agentConfig = AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
          const isExpanded = expandedStep === step.id;
          const isHovered = hoveredStep === step.id;
          const isSelected = selectedSteps.has(step.id);

          return (
            <div
              key={step.id}
              className={`
                relative pl-16 pr-4 py-4 transition-all duration-300
                ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10 rounded-lg' : ''}
              `}
              style={{ transitionDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredStep(step.id)}
              onMouseLeave={() => setHoveredStep(null)}
            >
              {/* Timeline Node */}
              <div
                className={`
                  absolute left-6 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white dark:border-secondary-900
                  ${statusConfig.bgColor} ${statusConfig.color}
                  flex items-center justify-center cursor-pointer
                  transition-all duration-200 hover:scale-125
                  ${step.status === 'running' ? 'animate-pulse' : ''}
                `}
                onClick={() => handleStepClick(step)}
              >
                {statusConfig.icon}
              </div>

              {/* Step Card */}
              <div
                className={`
                  bg-white dark:bg-secondary-800 rounded-xl border transition-all duration-200
                  ${isExpanded ? 'border-primary-300 dark:border-primary-700 shadow-md' : 'border-secondary-200 dark:border-secondary-700'}
                  ${isHovered ? 'shadow-md' : ''}
                  cursor-pointer
                `}
                onClick={() => handleStepClick(step)}
              >
                <div className="p-4">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); handleSelectStep(step.id); }}
                        className="w-4 h-4 rounded border-secondary-300 text-primary-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {renderAgentBadge(step.agentType)}
                      {renderStatusBadge(step.status)}
                      {step.isFallback && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <Flag className="h-3 w-3" />
                          Fallback
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-secondary-500">
                      {/* Retry Info */}
                      {step.retryCount > 0 && (
                        <span className="flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {step.retryCount}/{step.maxRetries}
                        </span>
                      )}
                      {/* Duration */}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(step.duration)}
                      </span>
                      {/* Cost */}
                      {step.costUsd > 0 && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {formatCost(step.costUsd)}
                        </span>
                      )}
                      {/* Dependencies */}
                      {step.dependsOn.length > 0 && (
                        <span className="flex items-center gap-1" title={`Depends on: ${step.dependsOn.join(', ')}`}>
                          <GitBranch className="h-3 w-3" />
                          {step.dependsOn.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step Name & Progress */}
                  <div className="mb-3">
                    <h4 className="font-medium text-secondary-900 dark:text-white mb-1">
                      {step.name}
                    </h4>
                    {renderProgressBar(
                      step.status === 'completed' ? 100 : step.status === 'running' ? step.progress : 0,
                      step.status
                    )}
                  </div>

                  {/* Error Display */}
                  {step.error && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{step.error}</span>
                    </div>
                  )}

                  {/* Action Buttons (on hover) */}
                  {isHovered && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                      {step.status === 'failed' && (
                        <>
                          <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); onRetryStep?.(step.id); }}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                          <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onSkipStep?.(step.id); }}>
                            <SkipForward className="h-3 w-3 mr-1" />
                            Skip
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onStepClick?.(step); }}>
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-secondary-200 dark:border-secondary-700">
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-secondary-500">Status</p>
                        {renderStatusBadge(step.status)}
                      </div>
                      <div>
                        <p className="text-xs text-secondary-500">Duration</p>
                        <p className="text-sm font-medium">{formatDuration(step.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary-500">Tokens Used</p>
                        <p className="text-sm font-medium">{step.tokensUsed.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary-500">Cost</p>
                        <p className="text-sm font-medium">{formatCost(step.costUsd)}</p>
                      </div>
                      {step.startTime && (
                        <div>
                          <p className="text-xs text-secondary-500">Start Time</p>
                          <p className="text-sm font-medium">{format(step.startTime, 'HH:mm:ss.SSS')}</p>
                        </div>
                      )}
                      {step.endTime && (
                        <div>
                          <p className="text-xs text-secondary-500">End Time</p>
                          <p className="text-sm font-medium">{format(step.endTime, 'HH:mm:ss.SSS')}</p>
                        </div>
                      )}
                      {step.parallelGroup && (
                        <div>
                          <p className="text-xs text-secondary-500">Parallel Group</p>
                          <p className="text-sm font-medium">{step.parallelGroup}</p>
                        </div>
                      )}
                      {step.dependsOn.length > 0 && (
                        <div>
                          <p className="text-xs text-secondary-500">Dependencies</p>
                          <p className="text-sm font-medium">{step.dependsOn.join(', ')}</p>
                        </div>
                      )}
                    </div>

                    {/* Output Preview */}
                    {step.output && (
                      <div className="mt-3">
                        <p className="text-xs text-secondary-500 mb-1">Output</p>
                        <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-3 rounded-lg max-h-40 overflow-y-auto font-mono">
                          {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Full Error */}
                    {step.error && (
                      <div className="mt-3">
                        <p className="text-xs text-secondary-500 mb-1">Full Error</p>
                        <pre className="text-xs bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3 rounded-lg max-h-40 overflow-y-auto text-red-700 dark:text-red-300">
                          {step.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ============================================
  // Render: Gantt Chart View
  // ============================================

  const renderGanttView = () => {
    if (steps.length === 0) return null;

    const maxDuration = Math.max(...steps.map(s => s.duration), 1);
    const chartWidth = 800 * zoomLevel;
    const rowHeight = 48;
    const chartHeight = steps.length * rowHeight + 60;
    const padding = { left: 200, right: 40, top: 30, bottom: 40 };

    return (
      <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        <svg viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${chartHeight}`} className="w-full" style={{ minWidth: '600px' }}>
          {/* Time scale */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <g key={pct}>
              <line
                x1={padding.left + pct * chartWidth}
                x2={padding.left + pct * chartWidth}
                y1={padding.top}
                y2={chartHeight - padding.bottom}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left + pct * chartWidth}
                y={padding.top - 8}
                textAnchor="middle"
                className="text-xs fill-secondary-400"
              >
                {formatDuration(maxDuration * pct)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {steps.map((step, index) => {
            const y = padding.top + index * rowHeight + 12;
            const barWidth = Math.max(10, (step.duration / maxDuration) * chartWidth);
            const agentConfig = AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
            const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;

            return (
              <g key={step.id}>
                {/* Agent Label */}
                <text
                  x={padding.left - 8}
                  y={y + 12}
                  textAnchor="end"
                  className="text-sm fill-secondary-700 dark:fill-secondary-300"
                >
                  {agentConfig.name}
                </text>

                {/* Bar */}
                <rect
                  x={padding.left}
                  y={y}
                  width={barWidth}
                  height={24}
                  rx={6}
                  className={`
                    ${step.status === 'completed' ? 'fill-green-500' :
                      step.status === 'failed' ? 'fill-red-500' :
                      step.status === 'running' ? 'fill-blue-500' :
                      step.status === 'retrying' ? 'fill-orange-500' :
                      'fill-secondary-300'}
                    transition-all duration-500 cursor-pointer hover:opacity-80
                  `}
                  onClick={() => handleStepClick(step)}
                />

                {/* Bar Label */}
                {barWidth > 60 && (
                  <text
                    x={padding.left + barWidth / 2}
                    y={y + 16}
                    textAnchor="middle"
                    className="text-xs fill-white font-medium"
                  >
                    {formatDuration(step.duration)}
                  </text>
                )}

                {/* Progress indicator for running steps */}
                {step.progress > 0 && step.progress < 100 && (
                  <rect
                    x={padding.left}
                    y={y + 24}
                    width={barWidth}
                    height={4}
                    rx={2}
                    className="fill-secondary-200"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // ============================================
  // Render: List View
  // ============================================

  const renderListView = () => (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={selectedSteps.size === filteredSteps.length && filteredSteps.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-secondary-300"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Step</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Agent</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Duration</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Tokens</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Cost</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Retries</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {filteredSteps.map(step => {
              const agentConfig = AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
              const isSelected = selectedSteps.has(step.id);
              const isExpanded = expandedStep === step.id;

              return (
                <React.Fragment key={step.id}>
                  <tr
                    className={`
                      hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer
                      ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
                    `}
                    onClick={() => handleStepClick(step)}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); handleSelectStep(step.id); }}
                        className="w-4 h-4 rounded border-secondary-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-secondary-900 dark:text-white">
                      {step.name}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={agentConfig.color}>{agentConfig.icon}</span>
                        <span className="text-xs">{agentConfig.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {renderStatusBadge(step.status)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      {formatDuration(step.duration)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      {step.tokensUsed.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      {formatCost(step.costUsd)}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">
                      {step.retryCount > 0 ? `${step.retryCount}/${step.maxRetries}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {step.status === 'failed' && (
                          <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); onRetryStep?.(step.id); }}>
                            Retry
                          </Button>
                        )}
                        <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); handleStepClick(step); }}>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-secondary-500">Start Time</p>
                            <p className="text-sm">{step.startTime ? format(step.startTime, 'HH:mm:ss') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">End Time</p>
                            <p className="text-sm">{step.endTime ? format(step.endTime, 'HH:mm:ss') : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Progress</p>
                            <p className="text-sm">{step.progress}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Dependencies</p>
                            <p className="text-sm">{step.dependsOn.length > 0 ? step.dependsOn.join(', ') : 'None'}</p>
                          </div>
                        </div>
                        {step.error && (
                          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs text-red-700">
                            {step.error}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // Loading State
  // ============================================

  if (isExecutionLoading && steps.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="list" count={5} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (executionError && steps.length === 0) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Timeline</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{executionError}</p>
        <Button variant="primary" onClick={() => getExecutionProgress(execution?.executionId || '')}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (steps.length === 0) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center ${className}`}>
        <Activity className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Execution Data</h3>
        <p className="text-secondary-500 max-w-md mx-auto">
          Execute a plan to see the step-by-step execution timeline with performance metrics.
        </p>
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
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary-600" />
              Execution Timeline
            </h2>
            <p className="text-sm text-secondary-500">
              {steps.length} steps • {executionSummary.completed} completed • {executionSummary.failed} failed
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress Summary */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg text-sm">
              <span className="text-green-600">{executionSummary.completed} ✓</span>
              <span className="text-red-600">{executionSummary.failed} ✗</span>
              <span className="text-blue-600">{executionSummary.running} ⟳</span>
              <span className="text-secondary-500">{executionSummary.pending} ○</span>
            </div>

            {/* View Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              {[
                { id: 'timeline', label: 'Timeline', icon: <Clock className="h-3.5 w-3.5" /> },
                { id: 'gantt', label: 'Gantt', icon: <BarChart3 className="h-3.5 w-3.5" /> },
                { id: 'list', label: 'List', icon: <Layers className="h-3.5 w-3.5" /> },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id as any)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    viewMode === v.id ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600' : 'text-secondary-600'
                  }`}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
            </div>

            {/* Zoom Controls (Gantt) */}
            {viewMode === 'gantt' && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="xs" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="ghost" size="xs" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Fullscreen */}
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Total Duration</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatDuration(executionSummary.totalDuration)}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Total Tokens</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{executionSummary.totalTokens.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Total Cost</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatCost(executionSummary.totalCost)}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Success Rate</p>
            <p className={`text-lg font-bold ${executionSummary.successRate >= 90 ? 'text-green-600' : executionSummary.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {executionSummary.successRate.toFixed(0)}%
            </p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Completed</p>
            <p className="text-lg font-bold text-green-600">{executionSummary.completed}/{executionSummary.total}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Avg Time/Step</p>
            <p className="text-lg font-bold text-blue-600">
              {executionSummary.total > 0 ? formatDuration(executionSummary.totalDuration / executionSummary.total) : '—'}
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search steps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ExecutionStatus | 'all')}
            className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
              className="w-4 h-4 rounded border-secondary-300"
            />
            Show Details
          </label>
        </div>

        {/* Timeline Content */}
        {viewMode === 'timeline' && renderTimelineView()}
        {viewMode === 'gantt' && renderGanttView()}
        {viewMode === 'list' && renderListView()}

        {/* Execution Actions */}
        {execution && execution.status === 'running' && (
          <div className="flex justify-center gap-3">
            <Button variant="danger" onClick={onCancelExecution}>
              <Square className="h-4 w-4 mr-1" />
              Cancel Execution
            </Button>
          </div>
        )}

        {execution && execution.status === 'failed' && onRetryExecution && (
          <div className="flex justify-center">
            <Button variant="primary" onClick={onRetryExecution}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry Execution
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-secondary-400">
          Execution ID: {execution?.executionId || 'N/A'} • 
          Started: {execution?.startedAt ? format(execution.startedAt, 'MMM d, HH:mm:ss') : 'N/A'} • 
          {execution?.completedAt ? ` Completed: ${format(execution.completedAt, 'MMM d, HH:mm:ss')}` : ' In Progress'}
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Need to import Minus and Plus for zoom controls
import { Minus, Plus } from 'lucide-react';


export default ExecutionTimeline;
