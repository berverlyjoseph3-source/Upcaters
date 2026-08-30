// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/ChainExecutionView.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Award,
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
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Flag,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Globe,
  HardDrive,
  Info,
  Layers,
  Lightbulb,
  Link,
  Loader2,
  Mail,
  Maximize2,
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
  DollarSign,
  Gauge,
  GripVertical,
  History,
  Move,
  Plus,
  Minus,
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
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { 
  ChainExecutionResult, 
  StepExecutionResult, 
  ExecutionMode,
  TaskPlan,
  TaskPlanStep,
} from '../../../types/orchestrator.types';
import { AgentDelegationCard } from './AgentDelegationCard';
import { format, formatDistanceToNow, formatDuration } from 'date-fns';

// ============================================
// Types
// ============================================

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'retrying' | 'timeout' | 'fallback';

export interface ChainStep {
  id: string;
  name: string;
  agentType: string;
  status: ExecutionStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  output?: any;
  error?: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  dependsOn: string[];
  parallelGroup?: string;
  isFallback: boolean;
  fallbackFor?: string;
  fallbackAgent?: string;
  tokensUsed: number;
  costUsd: number;
  metadata?: Record<string, any>;
  agentConfig?: {
    name: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
    bgColor: string;
  };
}

export interface ChainExecutionData {
  executionId: string;
  planId: string;
  planName?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
  mode: ExecutionMode;
  steps: ChainStep[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalDuration: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  summary?: string;
  insights?: string[];
  bottleneckSteps?: string[];
  criticalPath?: string[];
  optimizedPath?: string[];
}

interface ChainExecutionViewProps {
  execution?: ChainExecutionData;
  executionResult?: ChainExecutionResult;
  plan?: TaskPlan;
  onRetryStep?: (stepId: string) => void;
  onSkipStep?: (stepId: string) => void;
  onCancelExecution?: () => void;
  onRetryExecution?: () => void;
  onStepClick?: (step: ChainStep) => void;
  onViewOutput?: (stepId: string) => void;
  onExport?: (execution: ChainExecutionData) => void;
  onOptimize?: () => void;
  className?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bgColor: string;
}> = {
  email: {
    name: 'Email Agent',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  drive: {
    name: 'Drive Agent',
    icon: <HardDrive className="h-5 w-5" />,
    color: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  content: {
    name: 'Content Agent',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  social: {
    name: 'Social Agent',
    icon: <Share2 className="h-5 w-5" />,
    color: 'text-pink-600',
    gradient: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
  },
  calendar: {
    name: 'Calendar Agent',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  web: {
    name: 'Web Agent',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-teal-600',
    gradient: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
  },
  task: {
    name: 'Task Agent',
    icon: <CheckSquare className="h-5 w-5" />,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  orchestrator: {
    name: 'Orchestrator',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
  },
};

const STATUS_CONFIG: Record<ExecutionStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  nodeColor: string;
}> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-secondary-500',
    bgColor: 'bg-secondary-100 dark:bg-secondary-800',
    nodeColor: '#94a3b8',
  },
  running: {
    label: 'Running',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    nodeColor: '#3b82f6',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    nodeColor: '#10b981',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    nodeColor: '#ef4444',
  },
  skipped: {
    label: 'Skipped',
    icon: <SkipForward className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    nodeColor: '#f59e0b',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    nodeColor: '#6b7280',
  },
  retrying: {
    label: 'Retrying',
    icon: <RotateCcw className="h-4 w-4 animate-spin" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    nodeColor: '#f97316',
  },
  timeout: {
    label: 'Timeout',
    icon: <Timer className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    nodeColor: '#dc2626',
  },
  fallback: {
    label: 'Fallback',
    icon: <GitBranch className="h-4 w-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    nodeColor: '#d97706',
  },
};

const MODE_CONFIG: Record<ExecutionMode, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  sequential: { label: 'Sequential', icon: <ArrowDown className="h-4 w-4" />, color: 'text-blue-600' },
  parallel: { label: 'Parallel', icon: <Layers className="h-4 w-4" />, color: 'text-green-600' },
  conditional: { label: 'Conditional', icon: <GitBranch className="h-4 w-4" />, color: 'text-purple-600' },
  pipeline: { label: 'Pipeline', icon: <ArrowRight className="h-4 w-4" />, color: 'text-orange-600' },
  fan_out: { label: 'Fan Out', icon: <GitMerge className="h-4 w-4" />, color: 'text-teal-600' },
  fan_in: { label: 'Fan In', icon: <GitPullRequest className="h-4 w-4" />, color: 'text-pink-600' },
  loop: { label: 'Loop', icon: <RefreshCw className="h-4 w-4" />, color: 'text-indigo-600' },
};

// ============================================
// Component
// ============================================

export const ChainExecutionView: React.FC<ChainExecutionViewProps> = ({
  execution: executionProp,
  executionResult,
  plan,
  onRetryStep,
  onSkipStep,
  onCancelExecution,
  onRetryExecution,
  onStepClick,
  onViewOutput,
  onExport,
  onOptimize,
  className = '',
  isFullscreen: externalFullscreen,
  onToggleFullscreen,
}) => {
  // Store
  const {
    currentExecution,
    executionProgress,
    isExecutionLoading,
    executionError,
    getExecutionStatus,
    cancelExecution,
    retryExecution,
  } = useOrchestratorStore();

  // Local state
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'flow' | 'gantt' | 'list' | 'matrix'>('flow');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [showOnlyFailed, setShowOnlyFailed] = useState(false);
  const [sortBy, setSortBy] = useState<'order' | 'duration' | 'cost' | 'tokens'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [animateIn, setAnimateIn] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [detailsTab, setDetailsTab] = useState<'overview' | 'bottlenecks' | 'insights' | 'metrics'>('overview');
  const [showLegend, setShowLegend] = useState(true);
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Derived state
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Poll execution status
  useEffect(() => {
    if (execution?.status === 'running' && execution.executionId) {
      const interval = setInterval(() => {
        getExecutionStatus?.(execution.executionId);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [execution?.status, execution?.executionId, getExecutionStatus]);

  // ============================================
  // Derived Data
  // ============================================

  const execution = useMemo((): ChainExecutionData | null => {
    if (executionProp) return executionProp;
    if (executionResult) {
      return {
        executionId: executionResult.planId,
        planId: executionResult.planId,
        status: executionResult.success ? 'completed' : (executionResult.error ? 'failed' : 'partial'),
        mode: executionResult.executionMode || ExecutionMode.SEQUENTIAL,
        steps: executionResult.steps.map(step => ({
          id: step.stepId,
          name: step.stepId,
          agentType: step.agentType,
          status: step.success ? 'completed' : 'failed',
          progress: step.success ? 100 : 0,
          startTime: step.startedAt,
          endTime: step.completedAt,
          duration: step.executionTimeMs,
          output: step.output,
          error: step.error,
          errorStack: step.errorStack,
          retryCount: step.retryCount,
          maxRetries: 3,
          dependsOn: step.dependenciesMet || [],
          isFallback: step.fallbackUsed || false,
          tokensUsed: step.tokensUsed,
          costUsd: step.costUsd,
          metadata: step.agentMetadata,
          agentConfig: AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator,
        })),
        totalSteps: executionResult.steps.length,
        completedSteps: executionResult.successfulSteps,
        failedSteps: executionResult.failedSteps,
        skippedSteps: executionResult.skippedSteps,
        totalDuration: executionResult.totalTimeMs,
        totalTokensUsed: executionResult.totalTokensUsed,
        totalCostUsd: executionResult.totalCostUsd,
        startedAt: executionResult.startedAt,
        completedAt: executionResult.completedAt,
        error: executionResult.error,
      };
    }
    if (currentExecution) {
      return {
        executionId: currentExecution.planId,
        planId: currentExecution.planId,
        status: currentExecution.success ? 'completed' : 'failed',
        mode: currentExecution.executionMode || ExecutionMode.SEQUENTIAL,
        steps: currentExecution.steps.map(step => ({
          id: step.stepId,
          name: step.stepId,
          agentType: step.agentType,
          status: step.success ? 'completed' : 'failed',
          progress: step.success ? 100 : 0,
          duration: step.executionTimeMs,
          output: step.output,
          error: step.error,
          retryCount: step.retryCount,
          maxRetries: 3,
          dependsOn: [],
          isFallback: false,
          tokensUsed: step.tokensUsed,
          costUsd: step.costUsd,
          agentConfig: AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator,
        })),
        totalSteps: currentExecution.steps.length,
        completedSteps: currentExecution.successfulSteps,
        failedSteps: currentExecution.failedSteps,
        skippedSteps: currentExecution.skippedSteps,
        totalDuration: currentExecution.totalTimeMs,
        totalTokensUsed: currentExecution.totalTokensUsed,
        totalCostUsd: currentExecution.totalCostUsd,
        startedAt: currentExecution.startedAt,
        completedAt: currentExecution.completedAt,
        error: currentExecution.error,
      };
    }
    return null;
  }, [executionProp, executionResult, currentExecution]);

  // Filter and sort steps
  const filteredSteps = useMemo(() => {
    if (!execution) return [];
    let steps = [...execution.steps];

    if (showOnlyActive) {
      steps = steps.filter(s => s.status === 'running' || s.status === 'retrying');
    }
    if (showOnlyFailed) {
      steps = steps.filter(s => s.status === 'failed' || s.status === 'timeout');
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      steps = steps.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.agentType.toLowerCase().includes(query) ||
        s.error?.toLowerCase().includes(query)
      );
    }

    // Sort
    steps.sort((a, b) => {
      let compare = 0;
      switch (sortBy) {
        case 'duration':
          compare = b.duration - a.duration;
          break;
        case 'cost':
          compare = b.costUsd - a.costUsd;
          break;
        case 'tokens':
          compare = b.tokensUsed - a.tokensUsed;
          break;
        case 'order':
        default:
          const aIdx = execution.steps.indexOf(a);
          const bIdx = execution.steps.indexOf(b);
          compare = aIdx - bIdx;
      }
      return sortDirection === 'asc' ? -compare : compare;
    });

    return steps;
  }, [execution, showOnlyActive, showOnlyFailed, searchQuery, sortBy, sortDirection]);

  // Build dependency graph
  const dependencyGraph = useMemo(() => {
    if (!execution) return { levels: [], edges: [], stepMap: new Map() };
    
    const stepMap = new Map<string, ChainStep>();
    const incomingEdges = new Map<string, string[]>();
    const outgoingEdges = new Map<string, string[]>();

    execution.steps.forEach(step => {
      stepMap.set(step.id, step);
      incomingEdges.set(step.id, []);
      outgoingEdges.set(step.id, []);
    });

    execution.steps.forEach(step => {
      step.dependsOn.forEach(depId => {
        incomingEdges.get(step.id)?.push(depId);
        outgoingEdges.get(depId)?.push(step.id);
      });
    });

    // Topological sort for levels
    const levels: string[][] = [[]];
    const visited = new Set<string>();
    const queue = execution.steps.filter(s => s.dependsOn.length === 0).map(s => s.id);

    while (queue.length > 0) {
      const levelSteps: string[] = [];
      const nextQueue: string[] = [];
      
      for (const stepId of queue) {
        if (visited.has(stepId)) continue;
        visited.add(stepId);
        levelSteps.push(stepId);
        
        (outgoingEdges.get(stepId) || []).forEach(childId => {
          if (!visited.has(childId)) {
            const allDepsMet = (incomingEdges.get(childId) || []).every(d => visited.has(d));
            if (allDepsMet && !nextQueue.includes(childId)) {
              nextQueue.push(childId);
            }
          }
        });
      }
      
      if (levelSteps.length > 0) levels.push(levelSteps);
      queue.length = 0;
      queue.push(...nextQueue);
    }

    // Calculate edges
    const edges: Array<{ from: string; to: string }> = [];
    execution.steps.forEach(step => {
      step.dependsOn.forEach(depId => {
        edges.push({ from: depId, to: step.id });
      });
    });

    return { levels: levels.filter(l => l.length > 0), edges, stepMap };
  }, [execution]);

  // Critical path calculation
  const criticalPath = useMemo(() => {
    if (!execution || execution.steps.length === 0) return [];
    
    // Simple critical path: longest chain of dependencies
    const path: string[] = [];
    const visited = new Set<string>();
    
    const findLongestPath = (stepId: string, currentPath: string[]): string[] => {
      if (visited.has(stepId)) return currentPath;
      visited.add(stepId);
      
      const step = dependencyGraph.stepMap.get(stepId);
      if (!step) return currentPath;
      
      const newPath = [...currentPath, stepId];
      let longestPath = newPath;
      
      dependencyGraph.edges
        .filter(e => e.from === stepId)
        .forEach(edge => {
          const childPath = findLongestPath(edge.to, newPath);
          if (childPath.length > longestPath.length) {
            longestPath = childPath;
          }
        });
      
      return longestPath;
    };

    // Start from root steps
    const rootSteps = execution.steps.filter(s => s.dependsOn.length === 0);
    let longestPath: string[] = [];
    
    rootSteps.forEach(step => {
      const path = findLongestPath(step.id, []);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    });

    return longestPath;
  }, [execution, dependencyGraph]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!execution) return null;
    
    const successRate = execution.totalSteps > 0 
      ? (execution.completedSteps / execution.totalSteps) * 100 
      : 0;
    
    const avgDuration = execution.steps.length > 0
      ? execution.totalDuration / execution.steps.length
      : 0;
    
    const bottlenecks = execution.steps
      .filter(s => s.duration > avgDuration * 2 && s.status === 'completed')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 3);

    return {
      successRate,
      avgDuration,
      bottlenecks: bottlenecks.map(b => b.id),
      totalDuration: execution.totalDuration,
      totalCost: execution.totalCostUsd,
      totalTokens: execution.totalTokensUsed,
      efficiency: execution.totalSteps > 0 
        ? (execution.completedSteps / (execution.totalDuration / 1000)) * 1000 
        : 0,
    };
  }, [execution]);

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
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const formatCost = (usd: number): string => {
    if (usd < 0.001) return `${(usd * 1000000).toFixed(0)}μ¢`;
    return `$${usd.toFixed(4)}`;
  };

  // ============================================
  // Render: Flow View (SVG)
  // ============================================

  const renderFlowView = () => {
    if (!execution) return null;
    const { levels, edges, stepMap } = dependencyGraph;
    
    const nodeWidth = 180;
    const nodeHeight = 90;
    const horizontalGap = 40;
    const verticalGap = 40;
    const padding = 60;

    const canvasWidth = Math.max(800, Math.max(...levels.map(l => l.length), 1) * (nodeWidth + horizontalGap) + padding * 2);
    const canvasHeight = Math.max(400, levels.length * (nodeHeight + verticalGap) + padding * 2);

    // Calculate node positions
    const positions = new Map<string, { x: number; y: number }>();
    levels.forEach((levelSteps, levelIndex) => {
      const totalWidth = levelSteps.length * (nodeWidth + horizontalGap) - horizontalGap;
      const startX = (canvasWidth - totalWidth) / 2;
      
      levelSteps.forEach((stepId, stepIndex) => {
        positions.set(stepId, {
          x: startX + stepIndex * (nodeWidth + horizontalGap),
          y: padding + levelIndex * (nodeHeight + verticalGap),
        });
      });
    });

    // Calculate edge paths
    const edgePaths: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      fromStatus: ExecutionStatus;
      toStatus: ExecutionStatus;
      isCritical: boolean;
    }> = [];

    edges.forEach(edge => {
      const fromPos = positions.get(edge.from);
      const toPos = positions.get(edge.to);
      if (fromPos && toPos) {
        edgePaths.push({
          from: { x: fromPos.x + nodeWidth / 2, y: fromPos.y + nodeHeight },
          to: { x: toPos.x + nodeWidth / 2, y: toPos.y },
          fromStatus: stepMap.get(edge.from)?.status || 'pending',
          toStatus: stepMap.get(edge.to)?.status || 'pending',
          isCritical: highlightCriticalPath && criticalPath.includes(edge.from) && criticalPath.includes(edge.to),
        });
      }
    });

    return (
      <div className="relative overflow-auto" style={{ height: isFullscreen ? 'calc(100vh - 300px)' : '500px' }}>
        <svg width={canvasWidth} height={canvasHeight} ref={svgRef}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
            <marker id="arrow-critical" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
            <filter id="shadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.3" />
          </pattern>
          <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

          {/* Edges */}
          {edgePaths.map((edge, idx) => (
            <g key={`edge-${idx}`}>
              <path
                d={`M ${edge.from.x} ${edge.from.y} C ${edge.from.x} ${edge.from.y + (edge.to.y - edge.from.y) / 2}, ${edge.to.x} ${edge.to.y - (edge.to.y - edge.from.y) / 2}, ${edge.to.x} ${edge.to.y}`}
                fill="none"
                stroke={edge.isCritical ? '#ef4444' : '#94a3b8'}
                strokeWidth={edge.isCritical ? 2.5 : 1.5}
                strokeDasharray={edge.isCritical ? 'none' : '6 3'}
                markerEnd={edge.isCritical ? 'url(#arrow-critical)' : 'url(#arrow)'}
              />
            </g>
          ))}

          {/* Nodes */}
          {execution.steps.map(step => {
            const pos = positions.get(step.id);
            if (!pos) return null;
            
            const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
            const agentConfig = step.agentConfig || AGENT_CONFIG.orchestrator;
            const isSelected = selectedStep === step.id;
            const isHovered = hoveredStep === step.id;
            const isCritical = highlightCriticalPath && criticalPath.includes(step.id);

            return (
              <g
                key={step.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedStep(isSelected ? null : step.id);
                  onStepClick?.(step);
                }}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                filter={isSelected ? 'url(#shadow)' : undefined}
              >
                {/* Node Background */}
                <rect
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="12"
                  fill="white"
                  stroke={isCritical ? '#ef4444' : isSelected ? '#3b82f6' : statusConfig.nodeColor}
                  strokeWidth={isSelected || isCritical ? 2.5 : 1.5}
                  className="transition-all duration-200"
                />

                {/* Status Indicator Bar */}
                <rect
                  width={nodeWidth}
                  height="4"
                  rx="2"
                  fill={statusConfig.nodeColor}
                />

                {/* Agent Icon */}
                <foreignObject x="10" y="12" width="28" height="28">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agentConfig.gradient} flex items-center justify-center text-white`}>
                    {agentConfig.icon}
                  </div>
                </foreignObject>

                {/* Step Name */}
                <text x="44" y="22" className="text-sm font-semibold fill-secondary-900" fontSize="12">
                  {step.name.length > 18 ? step.name.substring(0, 16) + '...' : step.name}
                </text>

                {/* Agent Name */}
                <text x="44" y="36" className="text-xs fill-secondary-500" fontSize="10">
                  {agentConfig.name}
                </text>

                {/* Status Badge */}
                <g transform={`translate(${nodeWidth - 80}, 10)`}>
                  <rect
                    width="70"
                    height="20"
                    rx="6"
                    className={statusConfig.bgColor}
                  />
                  <text x="35" y="14" textAnchor="middle" className={`text-xs font-medium ${statusConfig.color}`} fontSize="10">
                    {statusConfig.label}
                  </text>
                </g>

                {/* Metrics Row */}
                <g transform="translate(10, 50)">
                  {/* Duration */}
                  <rect x="0" y="0" width="50" height="18" rx="5" fill="#f1f5f9" />
                  <text x="25" y="12" textAnchor="middle" className="text-xs fill-secondary-600" fontSize="9">
                    <tspan>{formatDuration(step.duration)}</tspan>
                  </text>

                  {/* Tokens */}
                  {step.tokensUsed > 0 && (
                    <>
                      <rect x="54" y="0" width="50" height="18" rx="5" fill="#fef3c7" />
                      <text x="79" y="12" textAnchor="middle" className="text-xs fill-yellow-700" fontSize="9">
                        {step.tokensUsed >= 1000 ? `${(step.tokensUsed / 1000).toFixed(0)}K` : step.tokensUsed}
                      </text>
                    </>
                  )}

                  {/* Cost */}
                  {step.costUsd > 0 && (
                    <>
                      <rect x="108" y="0" width="55" height="18" rx="5" fill="#f0fdf4" />
                      <text x="135" y="12" textAnchor="middle" className="text-xs fill-green-700" fontSize="9">
                        {formatCost(step.costUsd)}
                      </text>
                    </>
                  )}
                </g>

                {/* Retry Info */}
                {step.retryCount > 0 && (
                  <g transform={`translate(${nodeWidth - 30}, 56)`}>
                    <text className="text-xs fill-orange-600" fontSize="9">
                      ↻{step.retryCount}x
                    </text>
                  </g>
                )}

                {/* Fallback Badge */}
                {step.isFallback && (
                  <g transform={`translate(10, ${nodeHeight - 12})`}>
                    <rect width="50" height="16" rx="4" fill="#fef3c7" />
                    <text x="25" y="11" textAnchor="middle" className="text-xs fill-amber-700" fontSize="9">
                      Fallback
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Mode Indicator */}
          {execution.mode && (
            <g transform={`translate(${canvasWidth - 200}, 10)`}>
              <rect width="190" height="30" rx="8" fill="white" stroke="#e2e8f0" />
              <text x="95" y="20" textAnchor="middle" className="text-xs font-medium fill-secondary-700" fontSize="11">
                Mode: {MODE_CONFIG[execution.mode]?.label || execution.mode}
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
            {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.nodeColor }} />
                <span className="text-secondary-600 dark:text-secondary-400">{config.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs">
              <div className="w-6 h-0.5 bg-red-500" />
              <span className="text-secondary-600 dark:text-secondary-400">Critical Path</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Gantt View
  // ============================================

  const renderGanttView = () => {
    if (!execution) return null;
    const maxDuration = Math.max(...execution.steps.map(s => s.duration), 1);
    const rowHeight = 40;
    const labelWidth = 180;
    const padding = 20;

    return (
      <div className="overflow-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 300px)' : '500px' }}>
        <div style={{ minWidth: 800 }}>
          {/* Header */}
          <div className="flex items-center h-10 bg-secondary-50 dark:bg-secondary-700/50 rounded-t-lg border-b border-secondary-200 dark:border-secondary-700">
            <div style={{ width: labelWidth }} className="px-3 text-xs font-medium text-secondary-500 uppercase">
              Step
            </div>
            <div className="flex-1 relative">
              {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                <div
                  key={pct}
                  className="absolute top-0 bottom-0 flex items-center text-xs text-secondary-400"
                  style={{ left: `${pct * 100}%` }}
                >
                  <span>{formatDuration(maxDuration * pct)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {execution.steps.map((step, index) => {
            const barWidth = (step.duration / maxDuration) * 100;
            const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
            const agentConfig = step.agentConfig || AGENT_CONFIG.orchestrator;
            const isSelected = selectedStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center border-b border-secondary-100 dark:border-secondary-800 transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'
                }`}
                style={{ height: rowHeight }}
                onClick={() => {
                  setSelectedStep(isSelected ? null : step.id);
                  onStepClick?.(step);
                }}
              >
                {/* Label */}
                <div style={{ width: labelWidth }} className="px-3 flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: statusConfig.nodeColor }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{step.name}</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs ${agentConfig.color}`}>{agentConfig.icon}</span>
                      <span className="text-xs text-secondary-400">{agentConfig.name}</span>
                    </div>
                  </div>
                </div>

                {/* Bar */}
                <div className="flex-1 py-2">
                  <div
                    className="h-6 rounded-md flex items-center justify-end px-2 transition-all duration-300"
                    style={{ 
                      width: `${barWidth}%`,
                      backgroundColor: statusConfig.nodeColor,
                      minWidth: step.duration > 0 ? '4px' : '0'
                    }}
                  >
                    {barWidth > 15 && (
                      <span className="text-xs text-white font-medium">
                        {formatDuration(step.duration)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: List View
  // ============================================

  const renderListView = () => {
    if (!execution) return null;

    return (
      <div className="overflow-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 300px)' : '500px' }}>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                <tr>
                  <th className="w-10 px-3 py-3 text-left text-xs font-medium text-secondary-500">#</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500">Step</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500">Agent</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500">Status</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500">Duration</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500">Tokens</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500">Cost</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-secondary-500">Retries</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {filteredSteps.map((step, index) => {
                  const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
                  const agentConfig = step.agentConfig || AGENT_CONFIG.orchestrator;
                  const isSelected = selectedStep === step.id;
                  const isExpanded = expandedStep === step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <tr
                        className={`hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                        }`}
                        onClick={() => {
                          setSelectedStep(isSelected ? null : step.id);
                          onStepClick?.(step);
                        }}
                      >
                        <td className="px-3 py-3 text-xs text-secondary-400">{index + 1}</td>
                        <td className="px-3 py-3 font-medium text-secondary-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.nodeColor }} />
                            {step.name}
                            {step.isFallback && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">FB</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={agentConfig.color}>{agentConfig.icon}</span>
                            <span className="text-xs">{agentConfig.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs">{formatDuration(step.duration)}</td>
                        <td className="px-3 py-3 text-right text-xs">{step.tokensUsed.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-xs">{formatCost(step.costUsd)}</td>
                        <td className="px-3 py-3 text-center text-xs">
                          {step.retryCount > 0 ? `${step.retryCount}/${step.maxRetries}` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {step.status === 'failed' && (
                              <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); onRetryStep?.(step.id); }}>
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="xs" onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStep(isExpanded ? null : step.id);
                            }}>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-secondary-500">Input</p>
                                <p className="font-mono text-xs">{JSON.stringify(step.metadata?.input || {})}</p>
                              </div>
                              <div>
                                <p className="text-xs text-secondary-500">Output</p>
                                <pre className="text-xs max-h-24 overflow-y-auto font-mono">
                                  {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs text-secondary-500">Dependencies</p>
                                <p>{step.dependsOn.length > 0 ? step.dependsOn.join(', ') : 'None'}</p>
                              </div>
                            </div>
                            {step.error && (
                              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/10 rounded text-xs text-red-700">
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
      </div>
    );
  };

  // ============================================
  // Render: Matrix View (Dependency Matrix)
  // ============================================

  const renderMatrixView = () => {
    if (!execution || execution.steps.length === 0) return null;
    const steps = execution.steps;
    const size = 24;
    const padding = 120;

    return (
      <div className="overflow-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 300px)' : '500px' }}>
        <svg
          width={padding + steps.length * size + 40}
          height={padding + steps.length * size + 40}
        >
          {/* Column Headers */}
          {steps.map((step, i) => {
            const agentConfig = step.agentConfig || AGENT_CONFIG.orchestrator;
            return (
              <g key={`col-${step.id}`} transform={`translate(${padding + i * size + size / 2}, ${padding - 10})`}>
                <text
                  transform="rotate(-45)"
                  textAnchor="end"
                  className="text-xs fill-secondary-500"
                  fontSize="10"
                >
                  {step.name.substring(0, 12)}
                </text>
                <foreignObject x="-8" y="5" width="16" height="16">
                  <div className={`w-4 h-4 rounded ${agentConfig.color}`}>
                    {agentConfig.icon}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Row Headers */}
          {steps.map((step, i) => {
            const agentConfig = step.agentConfig || AGENT_CONFIG.orchestrator;
            return (
              <g key={`row-${step.id}`} transform={`translate(${padding - 10}, ${padding + i * size + size / 2})`}>
                <text
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-secondary-500"
                  fontSize="10"
                >
                  {step.name.substring(0, 15)}
                </text>
                <foreignObject x="0" y="-8" width="16" height="16">
                  <div className={`w-4 h-4 rounded ${agentConfig.color}`}>
                    {agentConfig.icon}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Matrix Cells */}
          {steps.map((step, rowIdx) => (
            steps.map((depStep, colIdx) => {
              const isDependsOn = step.dependsOn.includes(depStep.id);
              const isSelf = step.id === depStep.id;
              
              return (
                <g key={`${step.id}-${depStep.id}`}>
                  <rect
                    x={padding + colIdx * size}
                    y={padding + rowIdx * size}
                    width={size}
                    height={size}
                    fill={isSelf ? '#e2e8f0' : isDependsOn ? '#3b82f6' : 'transparent'}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    rx="2"
                    className="cursor-pointer hover:opacity-80"
                  />
                </g>
              );
            })
          ))}

          {/* Legend */}
          <g transform={`translate(${padding}, ${padding + steps.length * size + 20})`}>
            <rect x="0" y="0" width="12" height="12" fill="#3b82f6" rx="2" />
            <text x="16" y="10" className="text-xs fill-secondary-500" fontSize="10">Row depends on Column</text>
            <rect x="160" y="0" width="12" height="12" fill="#e2e8f0" rx="2" />
            <text x="176" y="10" className="text-xs fill-secondary-500" fontSize="10">Self-reference</text>
          </g>
        </svg>
      </div>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isExecutionLoading && !execution) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={3} />
        <LoadingSkeleton type="list" count={4} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (executionError && !execution) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Execution</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{executionError}</p>
        <Button variant="primary" onClick={onRetryExecution}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (!execution) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center ${className}`}>
        <Activity className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Execution Data</h3>
        <p className="text-secondary-500 max-w-md mx-auto">
          Execute a plan to see the chain execution visualization with step-by-step progress and performance metrics.
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
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Chain Execution</h2>
              <p className="text-sm text-secondary-500">
                {execution.totalSteps} steps • {execution.completedSteps} completed • {execution.failedSteps} failed
                {execution.mode && ` • ${MODE_CONFIG[execution.mode]?.label || execution.mode}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              {[
                { id: 'flow', icon: <GitBranch className="h-3.5 w-3.5" /> },
                { id: 'gantt', icon: <BarChart3 className="h-3.5 w-3.5" /> },
                { id: 'list', icon: <Layers className="h-3.5 w-3.5" /> },
                { id: 'matrix', icon: <Gauge className="h-3.5 w-3.5" /> },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id as any)}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === v.id ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600' : 'text-secondary-500'
                  }`}
                  title={v.id.charAt(0).toUpperCase() + v.id.slice(1)}
                >
                  {v.icon}
                </button>
              ))}
            </div>

            {/* Filters */}
            <Button variant="ghost" size="sm" onClick={() => setShowOnlyActive(!showOnlyActive)}>
              {showOnlyActive ? 'All Steps' : 'Active Only'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowOnlyFailed(!showOnlyFailed)}>
              {showOnlyFailed ? 'All Steps' : 'Failed Only'}
            </Button>
            
            {/* Legend Toggle */}
            <Button variant="ghost" size="sm" onClick={() => setShowLegend(!showLegend)}>
              {showLegend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            {/* Critical Path Toggle */}
            <Button variant="ghost" size="sm" onClick={() => setHighlightCriticalPath(!highlightCriticalPath)}>
              <Flag className={`h-4 w-4 ${highlightCriticalPath ? 'text-red-500' : ''}`} />
            </Button>

            {/* Fullscreen */}
            <Button variant="ghost" size="sm" onClick={handleToggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Actions */}
            {onExport && (
              <Button variant="outline" size="sm" onClick={() => onExport(execution)}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
            {onOptimize && execution.status !== 'running' && (
              <Button variant="outline" size="sm" onClick={onOptimize}>
                <Sparkles className="h-4 w-4 mr-1" />
                Optimize
              </Button>
            )}
          </div>
        </div>

        {/* Execution Status Banner */}
        {execution.status !== 'completed' && (
          <div className={`rounded-xl p-3 flex items-center gap-3 text-sm ${
            execution.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700' :
            execution.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700' :
            execution.status === 'cancelled' ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600' :
            'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700'
          }`}>
            <Info className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium capitalize">Execution Status: {execution.status}</span>
            {execution.error && <span>• {execution.error}</span>}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatDuration(summary.totalDuration)}</p>
              <p className="text-xs text-secondary-500">Total Time</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">{summary.totalTokens.toLocaleString()}</p>
              <p className="text-xs text-secondary-500">Tokens</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-lg font-bold text-green-600">{formatCost(summary.totalCost)}</p>
              <p className="text-xs text-secondary-500">Cost</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className={`text-lg font-bold ${summary.successRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                {summary.successRate.toFixed(0)}%
              </p>
              <p className="text-xs text-secondary-500">Success Rate</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-lg font-bold text-blue-600">{formatDuration(summary.avgDuration)}</p>
              <p className="text-xs text-secondary-500">Avg Time/Step</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-lg font-bold text-purple-600">{execution.steps.length}</p>
              <p className="text-xs text-secondary-500">Total Steps</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-lg font-bold text-orange-600">{summary.bottlenecks.length}</p>
              <p className="text-xs text-secondary-500">Bottlenecks</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>

        {/* Execution View */}
        <div>
          {viewMode === 'flow' && renderFlowView()}
          {viewMode === 'gantt' && renderGanttView()}
          {viewMode === 'list' && renderListView()}
          {viewMode === 'matrix' && renderMatrixView()}
        </div>

        {/* Execution Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          {execution.status === 'running' && onCancelExecution && (
            <Button variant="danger" onClick={onCancelExecution}>
              <Square className="h-4 w-4 mr-1" />
              Cancel Execution
            </Button>
          )}
          {(execution.status === 'failed' || execution.status === 'cancelled') && onRetryExecution && (
            <Button variant="primary" onClick={onRetryExecution}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry Execution
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-secondary-400 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          Execution ID: {execution.executionId.substring(0, 12)}... • 
          Started: {format(execution.startedAt, 'MMM d, HH:mm:ss')} • 
          {execution.completedAt && ` Completed: ${format(execution.completedAt, 'HH:mm:ss')}`} • 
          Critical Path: {criticalPath.length} steps
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default ChainExecutionView;
