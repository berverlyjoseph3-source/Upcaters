// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/PlanStepCard.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Target,
  Star,
  Flag,
  Edit,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Play,
  Square,
  RefreshCw,
  RotateCcw,
  SkipForward,
  GripVertical,
  Layers,
  Cpu,
  Mail,
  HardDrive,
  Sparkles,
  Share2,
  Calendar,
  Globe,
  CheckSquare,
  Activity,
  BarChart3,
  TrendingUp,
  Info,
  X,
  Plus,
  Save,
  Timer,
  DollarSign,
  GitBranch,
  Shield,
  MessageSquare,
  Bookmark,
  Flame,
  Snowflake,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ExternalLink,
  Settings,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Database,
  Cloud,
  Users,
  Code,
  FileText,
  Image,
  Video,
  Music,
  Wifi,
  Lock,
  Unlock,
  Award,
  Link,
  Unlink,
  Move,
  History,
  RotateCcw,
  Send,
  Search,
  Filter,
  Download,
  Upload,
  Heart,
  Share,
  Bell,
  CalendarCheck,
  ClipboardList,
  FolderOpen,
  LayoutGrid,
  List,
  PieChart,
  Sliders,
  Wrench,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { Progress } from '../common/Progress';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { TaskPlanStep, ExecutionMode } from '../../../types/orchestrator.types';
import { format, formatDistanceToNow, formatDuration } from 'date-fns';

// ============================================
// Types
// ============================================

export type PlanStepStatus =
  | 'pending'
  | 'ready'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'retrying'
  | 'timeout'
  | 'optimized';

export interface PlanStepCardData {
  id: string;
  agentType: string;
  action: string;
  description?: string;
  input?: any;
  output?: any;
  dependsOn: string[];
  parallelGroup?: string;
  fallback?: {
    id: string;
    agentType: string;
    action: string;
    dependsOn: string[];
    description?: string;
  };
  status: PlanStepStatus;
  progress: number;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  estimatedCostUsd?: number;
  estimatedTokens?: number;
  actualCostUsd?: number;
  actualTokens?: number;
  executionTimeMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  isOptional?: boolean;
  isFallbackStep?: boolean;
  isPartOfLoop?: boolean;
  loopIteration?: number;
  loopCondition?: string;
  validationRules?: string[];
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanStepDependency {
  stepId: string;
  stepName: string;
  status: PlanStepStatus;
  isSatisfied: boolean;
  isOptional: boolean;
}

interface PlanStepCardProps {
  step: PlanStepCardData;
  dependencies?: PlanStepDependency[];
  onEdit?: (stepId: string) => void;
  onDelete?: (stepId: string) => void;
  onRetry?: (stepId: string) => void;
  onSkip?: (stepId: string) => void;
  onCancel?: (stepId: string) => void;
  onDuplicate?: (stepId: string) => void;
  onMoveUp?: (stepId: string) => void;
  onMoveDown?: (stepId: string) => void;
  onToggleOptional?: (stepId: string) => void;
  onAddDependency?: (stepId: string, dependencyId: string) => void;
  onRemoveDependency?: (stepId: string, dependencyId: string) => void;
  onSelect?: (stepId: string) => void;
  isSelected?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isDraggable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (stepId: string) => void;
  showActions?: boolean;
  showDependencies?: boolean;
  showInputOutput?: boolean;
  showMetrics?: boolean;
  showFallback?: boolean;
  showProgress?: boolean;
  index?: number;
  totalSteps?: number;
  className?: string;
}

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<
  string,
  {
    name: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    gradient: string;
    borderColor: string;
    capabilities: string[];
  }
> = {
  email: {
    name: 'Email Agent',
    icon: <Mail className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300 dark:border-blue-700',
    capabilities: ['Send/Receive emails', 'AI-powered replies', 'Email classification'],
  },
  drive: {
    name: 'Drive Agent',
    icon: <HardDrive className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    gradient: 'from-green-500 to-green-600',
    borderColor: 'border-green-300 dark:border-green-700',
    capabilities: ['File upload/download', 'Folder management', 'File sharing'],
  },
  content: {
    name: 'Content Agent',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    gradient: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300 dark:border-purple-700',
    capabilities: ['Text generation', 'Image generation', 'Content editing'],
  },
  social: {
    name: 'Social Agent',
    icon: <Share2 className="h-4 w-4" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    gradient: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300 dark:border-pink-700',
    capabilities: ['Multi-platform posting', 'Post scheduling', 'Analytics tracking'],
  },
  calendar: {
    name: 'Calendar Agent',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    gradient: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-300 dark:border-orange-700',
    capabilities: ['Event creation', 'Smart scheduling', 'Availability checking'],
  },
  web: {
    name: 'Web Agent',
    icon: <Globe className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    gradient: 'from-teal-500 to-teal-600',
    borderColor: 'border-teal-300 dark:border-teal-700',
    capabilities: ['Web search', 'Deep research', 'Weather info'],
  },
  task: {
    name: 'Task Agent',
    icon: <CheckSquare className="h-4 w-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    gradient: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    capabilities: ['Task creation', 'Task management', 'Project organization'],
  },
  orchestrator: {
    name: 'Orchestrator',
    icon: <Cpu className="h-4 w-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    gradient: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-700',
    capabilities: ['Intent classification', 'Task planning', 'Agent delegation'],
  },
};

const STATUS_CONFIG: Record<
  PlanStepStatus,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    animation?: string;
    description: string;
  }
> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-secondary-500',
    bgColor: 'bg-secondary-100 dark:bg-secondary-800',
    description: 'Waiting to execute',
  },
  ready: {
    label: 'Ready',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Ready to execute',
  },
  executing: {
    label: 'Executing',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animation: 'animate-pulse',
    description: 'Currently executing',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Successfully completed',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Execution failed',
  },
  skipped: {
    label: 'Skipped',
    icon: <SkipForward className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Step was skipped',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'Execution cancelled',
  },
  retrying: {
    label: 'Retrying',
    icon: <RotateCcw className="h-4 w-4 animate-spin" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    animation: 'animate-pulse',
    description: 'Retrying after failure',
  },
  timeout: {
    label: 'Timeout',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Exceeded time limit',
  },
  optimized: {
    label: 'Optimized',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Step has been optimized',
  },
};

const PRIORITY_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  low: {
    label: 'Low',
    icon: <Snowflake className="h-3 w-3" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  normal: {
    label: 'Normal',
    icon: <Target className="h-3 w-3" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  high: {
    label: 'High',
    icon: <Flame className="h-3 w-3" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  critical: {
    label: 'Critical',
    icon: <AlertCircle className="h-3 w-3" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

// ============================================
// Component
// ============================================

export const PlanStepCard: React.FC<PlanStepCardProps> = ({
  step,
  dependencies = [],
  onEdit,
  onDelete,
  onRetry,
  onSkip,
  onCancel,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleOptional,
  onAddDependency,
  onRemoveDependency,
  onSelect,
  isSelected = false,
  isFirst = false,
  isLast = false,
  isDraggable = true,
  isExpanded = false,
  onToggleExpand,
  showActions = true,
  showDependencies = true,
  showInputOutput = true,
  showMetrics = true,
  showFallback = true,
  showProgress = true,
  index = 0,
  totalSteps = 0,
  className = '',
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInputPreview, setShowInputPreview] = useState(false);
  const [showOutputPreview, setShowOutputPreview] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(step.notes || '');
  const [showFullError, setShowFullError] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (step.status === 'executing' || step.status === 'retrying') {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [step.status]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // Derived Data
  // ============================================

  const agentConfig = AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
  const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
  const priorityConfig = step.priority ? PRIORITY_CONFIG[step.priority] : PRIORITY_CONFIG.normal;

  const satisfiedDependencies = dependencies.filter((d) => d.isSatisfied);
  const unsatisfiedDependencies = dependencies.filter((d) => !d.isSatisfied);
  const allDependenciesSatisfied = dependencies.length === 0 || unsatisfiedDependencies.length === 0;

  const progressPercentage = step.progress || (
    step.status === 'completed' ? 100 :
    step.status === 'failed' ? 100 :
    step.status === 'skipped' ? 0 :
    0
  );

  const canExecute = allDependenciesSatisfied &&
    (step.status === 'pending' || step.status === 'ready' || step.status === 'failed' || step.status === 'retrying');

  const isTerminal = step.status === 'completed' || step.status === 'skipped' || step.status === 'cancelled';

  // ============================================
  // Handlers
  // ============================================

  const handleClick = useCallback(() => {
    onSelect?.(step.id);
  }, [step.id, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onEdit?.(step.id);
  }, [step.id, onEdit]);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand?.(step.id);
    },
    [step.id, onToggleExpand],
  );

  const handleSaveNotes = useCallback(() => {
    setEditingNotes(false);
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!isDraggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', step.id);
      cardRef.current?.classList.add('opacity-50');
    },
    [isDraggable, step.id],
  );

  const handleDragEnd = useCallback(() => {
    cardRef.current?.classList.remove('opacity-50');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cardRef.current?.classList.add('border-primary-400');
  }, []);

  const handleDragLeave = useCallback(() => {
    cardRef.current?.classList.remove('border-primary-400');
  }, []);

  // ============================================
  // Formatting Helpers
  // ============================================

  const formatDuration = (ms?: number): string => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatCost = (usd?: number): string => {
    if (usd === undefined) return '—';
    if (usd < 0.001) return `${(usd * 1000000).toFixed(0)}μ¢`;
    if (usd < 0.01) return `${(usd * 1000).toFixed(1)}m¢`;
    return `$${usd.toFixed(4)}`;
  };

  const formatTokens = (tokens?: number): string => {
    if (!tokens) return '—';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  // ============================================
  // Render: Status Badge
  // ============================================

  const renderStatusBadge = () => (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
        ${statusConfig.bgColor} ${statusConfig.color}
        ${statusConfig.animation || ''}
      `}
    >
      {statusConfig.icon}
      {statusConfig.label}
    </span>
  );

  // ============================================
  // Render: Step Header
  // ============================================

  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0
            ${isSelected
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400'
            }
          `}
        >
          {index + 1}
        </div>

        <div
          className={`
            w-9 h-9 rounded-lg bg-gradient-to-br ${agentConfig.gradient}
            flex items-center justify-center text-white shadow-sm flex-shrink-0
            ${isAnimating ? 'animate-pulse' : ''}
          `}
        >
          {agentConfig.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-secondary-900 dark:text-white truncate">{step.action}</h4>
            {renderStatusBadge()}
            {step.priority && (
              <span
                className={`
                  inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
                  ${priorityConfig.bgColor} ${priorityConfig.color}
                `}
              >
                {priorityConfig.icon}
                {priorityConfig.label}
              </span>
            )}
            {step.isOptional && (
              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 text-xs rounded-full">
                Optional
              </span>
            )}
            {step.isPartOfLoop && (
              <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-xs rounded-full flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Loop {step.loopIteration && `#${step.loopIteration}`}
              </span>
            )}
            {step.parallelGroup && (
              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 text-xs rounded-full flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Parallel
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary-500">
            <span className="text-secondary-400">{agentConfig.name}</span>
            {step.executionTimeMs && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {formatDuration(step.executionTimeMs)}
              </span>
            )}
            {step.estimatedCostUsd !== undefined && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCost(step.estimatedCostUsd)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isDraggable && (
          <div className="cursor-grab hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded p-1">
            <GripVertical className="h-4 w-4 text-secondary-400" />
          </div>
        )}

        {showActions && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-secondary-500" />
            </button>

            {showMenu && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-30 overflow-hidden animate-slide-in-bottom"
              >
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
                    >
                      <Edit className="h-4 w-4" /> Edit Step
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
                    >
                      <Copy className="h-4 w-4" /> Duplicate
                    </button>
                  )}
                  {onToggleOptional && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleOptional(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
                    >
                      {step.isOptional ? (
                        <>
                          <Flag className="h-4 w-4" /> Make Required
                        </>
                      ) : (
                        <>
                          <Flag className="h-4 w-4" /> Make Optional
                        </>
                      )}
                    </button>
                  )}
                  {onMoveUp && !isFirst && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 rotate-[-90deg]" /> Move Up
                    </button>
                  )}
                  {onMoveDown && !isLast && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-2 transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 rotate-90" /> Move Down
                    </button>
                  )}
                  <div className="border-t border-secondary-200 dark:border-secondary-700 my-1" />
                  {(step.status === 'failed' || step.status === 'timeout') && onRetry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetry(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-700 flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" /> Retry
                    </button>
                  )}
                  {step.status === 'executing' && onCancel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Cancel
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(step.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleToggleExpand}
          className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-secondary-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-secondary-500" />
          )}
        </button>
      </div>
    </div>
  );

  // ============================================
  // Render: Progress Bar
  // ============================================

  const renderProgressBar = () => {
    if (!showProgress) return null;

    const getProgressColor = () => {
      switch (step.status) {
        case 'completed':
          return 'bg-green-500';
        case 'executing':
          return 'bg-blue-500';
        case 'retrying':
          return 'bg-orange-500';
        case 'failed':
          return 'bg-red-500';
        case 'timeout':
          return 'bg-red-500';
        default:
          return 'bg-secondary-300 dark:bg-secondary-600';
      }
    };

    return (
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-secondary-500">Progress</span>
          <span className="font-medium">{progressPercentage}%</span>
        </div>
        <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Dependencies Section
  // ============================================

  const renderDependencies = () => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-semibold text-secondary-500 uppercase flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          Dependencies ({dependencies.length})
        </h5>
        {onAddDependency && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onAddDependency(step.id, '');
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {dependencies.length === 0 ? (
        <p className="text-xs text-secondary-400 italic">No dependencies — this step can run independently</p>
      ) : (
        <div className="space-y-1.5">
          {dependencies.map((dep) => {
            const depStatusConfig = STATUS_CONFIG[dep.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={dep.stepId}
                className="flex items-center justify-between p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {dep.isSatisfied ? (
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-secondary-400 flex-shrink-0" />
                  )}
                  <span className="truncate">{dep.stepName}</span>
                  {dep.isOptional && (
                    <span className="text-secondary-400 flex-shrink-0">(optional)</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={depStatusConfig.color}>{depStatusConfig.icon}</span>
                  {onRemoveDependency && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDependency(step.id, dep.stepId);
                      }}
                      className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================
  // Render: Input/Output Section
  // ============================================

  const renderInputOutput = () => {
    if (!showInputOutput) return null;

    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Input */}
        {step.input && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h5 className="text-xs font-semibold text-secondary-500 uppercase">Input</h5>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInputPreview(!showInputPreview);
                }}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {showInputPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showInputPreview ? (
              <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-2 rounded-lg overflow-x-auto max-h-40 font-mono border border-secondary-200 dark:border-secondary-700">
                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            ) : (
              <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-xs text-secondary-400 italic">
                Click to preview input
              </div>
            )}
          </div>
        )}

        {/* Output */}
        {step.output && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h5 className="text-xs font-semibold text-secondary-500 uppercase">Output</h5>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOutputPreview(!showOutputPreview);
                }}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                {showOutputPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showOutputPreview ? (
              <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-2 rounded-lg overflow-x-auto max-h-40 font-mono border border-secondary-200 dark:border-secondary-700">
                {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            ) : (
              <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-xs text-secondary-400 italic">
                Click to preview output
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Metrics Section
  // ============================================

  const renderMetrics = () => {
    if (!showMetrics) return null;

    const hasMetrics =
      step.executionTimeMs !== undefined ||
      step.estimatedCostUsd !== undefined ||
      step.actualCostUsd !== undefined ||
      step.estimatedTokens !== undefined ||
      step.actualTokens !== undefined;

    if (!hasMetrics) return null;

    return (
      <div className="mt-3">
        <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-2 flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          Metrics
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {/* Execution Time */}
          {step.executionTimeMs !== undefined && (
            <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
              <p className="text-xs text-secondary-500">Duration</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white">
                {formatDuration(step.executionTimeMs)}
              </p>
            </div>
          )}

          {/* Retries */}
          <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
            <p className="text-xs text-secondary-500">Retries</p>
            <p
              className={`text-sm font-bold ${
                step.retryCount > 0 ? 'text-orange-600' : 'text-secondary-900 dark:text-white'
              }`}
            >
              {step.retryCount}/{step.maxRetries}
            </p>
          </div>

          {/* Estimated Cost */}
          {step.estimatedCostUsd !== undefined && (
            <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
              <p className="text-xs text-secondary-500">Est. Cost</p>
              <p className="text-sm font-bold text-purple-600">{formatCost(step.estimatedCostUsd)}</p>
            </div>
          )}

          {/* Actual Cost */}
          {step.actualCostUsd !== undefined && (
            <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
              <p className="text-xs text-secondary-500">Actual Cost</p>
              <p
                className={`text-sm font-bold ${
                  step.actualCostUsd > (step.estimatedCostUsd || 0) ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCost(step.actualCostUsd)}
              </p>
            </div>
          )}

          {/* Estimated Tokens */}
          {step.estimatedTokens !== undefined && (
            <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
              <p className="text-xs text-secondary-500">Est. Tokens</p>
              <p className="text-sm font-bold text-blue-600">{formatTokens(step.estimatedTokens)}</p>
            </div>
          )}

          {/* Actual Tokens */}
          {step.actualTokens !== undefined && (
            <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
              <p className="text-xs text-secondary-500">Actual Tokens</p>
              <p className="text-sm font-bold text-blue-600">{formatTokens(step.actualTokens)}</p>
            </div>
          )}

          {/* Timeout */}
          <div className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg text-center">
            <p className="text-xs text-secondary-500">Timeout</p>
            <p className="text-sm font-bold text-secondary-900 dark:text-white">
              {formatDuration(step.timeout)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Fallback Section
  // ============================================

  const renderFallback = () => {
    if (!showFallback || !step.fallback) return null;

    const fallbackConfig =
      AGENT_CONFIG[step.fallback.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;

    return (
      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-orange-600" />
          <h5 className="text-xs font-semibold text-orange-700 dark:text-orange-300">Fallback Plan</h5>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${fallbackConfig.gradient} flex items-center justify-center text-white flex-shrink-0`}
          >
            {fallbackConfig.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {step.fallback.action}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Via {fallbackConfig.name}
            </p>
          </div>
        </div>
        {step.fallback.description && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            {step.fallback.description}
          </p>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Error Section
  // ============================================

  const renderError = () => {
    if (!step.error) return null;

    return (
      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h5 className="text-xs font-semibold text-red-700 dark:text-red-300">Error</h5>
              {step.errorStack && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullError(!showFullError);
                  }}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  {showFullError ? (
                    <>
                      <ChevronUp className="h-3 w-3" /> Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" /> More
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 break-words">
              {showFullError ? step.error : step.error.substring(0, 200)}
              {!showFullError && step.error.length > 200 && '...'}
            </p>
            {showFullError && step.errorStack && (
              <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-x-auto max-h-40 font-mono">
                {step.errorStack}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Notes Section
  // ============================================

  const renderNotes = () => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <h5 className="text-xs font-semibold text-secondary-500 uppercase flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Notes
        </h5>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingNotes(!editingNotes);
          }}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          {editingNotes ? 'Cancel' : step.notes ? 'Edit' : 'Add Note'}
        </button>
      </div>
      {editingNotes ? (
        <div className="space-y-2">
          <textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 resize-y"
            placeholder="Add notes about this step..."
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditingNotes(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveNotes();
              }}
            >
              <Save className="h-3 w-3 mr-1" />
              Save Note
            </Button>
          </div>
        </div>
      ) : step.notes ? (
        <p className="text-sm text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-700/50 p-2 rounded-lg">
          {step.notes}
        </p>
      ) : (
        <p className="text-xs text-secondary-400 italic">No notes added</p>
      )}
    </div>
  );

  // ============================================
  // Render: Tags Section
  // ============================================

  const renderTags = () => {
    if (!step.tags || step.tags.length === 0) return null;

    return (
      <div className="mt-3">
        <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Tags</h5>
        <div className="flex flex-wrap gap-1.5">
          {step.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Validation Rules
  // ============================================

  const renderValidationRules = () => {
    if (!step.validationRules || step.validationRules.length === 0) return null;

    return (
      <div className="mt-3">
        <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Validation Rules
        </h5>
        <div className="space-y-1">
          {step.validationRules.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs p-1.5 bg-secondary-50 dark:bg-secondary-700/50 rounded"
            >
              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-secondary-600 dark:text-secondary-400">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Metadata Section
  // ============================================

  const renderMetadata = () => {
    if (!step.metadata || Object.keys(step.metadata).length === 0) return null;

    return (
      <div className="mt-3">
        <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Metadata</h5>
        <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-2 rounded-lg overflow-x-auto max-h-32 font-mono">
          {JSON.stringify(step.metadata, null, 2)}
        </pre>
      </div>
    );
  };

  // ============================================
  // Render: Conditional Check
  // ============================================

  const renderCondition = () => {
    if (!step.loopCondition) return null;

    return (
      <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs">
        <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 mb-1">
          <RefreshCw className="h-3 w-3" />
          <span className="font-medium">Loop Condition</span>
        </div>
        <code className="text-indigo-600 dark:text-indigo-400">{step.loopCondition}</code>
      </div>
    );
  };

  // ============================================
  // Render: Action Buttons (Bottom)
  // ============================================

  const renderActionButtons = () => {
    if (!showActions) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
        {canExecute && (
          <Button
            variant="primary"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.(step.id);
            }}
          >
            <Play className="h-3 w-3 mr-1" />
            Execute
          </Button>
        )}

        {(step.status === 'failed' || step.status === 'timeout') && onRetry && (
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(step.id);
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}

        {step.isOptional && step.status !== 'completed' && onSkip && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onSkip(step.id);
            }}
          >
            <SkipForward className="h-3 w-3 mr-1" />
            Skip
          </Button>
        )}

        {step.status === 'executing' && onCancel && (
          <Button
            variant="danger"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(step.id);
            }}
          >
            <Square className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        )}

        {onDuplicate && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(step.id);
            }}
          >
            <Copy className="h-3 w-3 mr-1" />
            Duplicate
          </Button>
        )}

        {onEdit && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(step.id);
            }}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}

        <div className="flex-1" />

        {totalSteps > 0 && (
          <span className="text-xs text-secondary-400 self-center">
            {index + 1} of {totalSteps}
          </span>
        )}
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div
        ref={cardRef}
        draggable={isDraggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`
          relative bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-300
          ${
            isSelected
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-xl scale-[1.01]'
              : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-lg'
          }
          ${isHovered && !isSelected ? 'shadow-md' : ''}
          ${isAnimating ? 'border-blue-400 dark:border-blue-600' : ''}
          ${statusConfig.animation ? statusConfig.animation : ''}
          ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          ${className}
        `}
        style={{ transitionDelay: `${index * 50}ms` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-4">
          {/* Header */}
          {renderHeader()}

          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Description */}
          {step.description && (
            <p className="mt-3 text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">
              {step.description}
            </p>
          )}

          {/* Conditional Check */}
          {renderCondition()}

          {/* Tags */}
          {renderTags()}

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700 space-y-3">
              {showDependencies && renderDependencies()}
              {renderInputOutput()}
              {renderMetrics()}
              {renderFallback()}
              {renderError()}
              {renderValidationRules()}
              {renderNotes()}
              {renderMetadata()}
            </div>
          )}

          {/* Action Buttons */}
          {renderActionButtons()}
        </div>

        {/* Connection Lines for Flow Visualization */}
        {!isFirst && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-secondary-300 dark:bg-secondary-600" />
        )}
        {!isLast && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-secondary-300 dark:bg-secondary-600" />
        )}

        {/* Parallel Group Indicator */}
        {step.parallelGroup && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-r-lg" />
        )}
      </div>
    </ErrorBoundary>
  );
};


export default PlanStepCard;
