// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/StepStatusBadge.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  Flag,
  GitBranch,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Square,
  Star,
  Target,
  ThumbsDown,
  ThumbsUp,
  Timer,
  X,
  XCircle,
  Zap,
  ArrowRight,
  ArrowDown,
  Activity,
  BarChart3,
  Brain,
  Calendar,
  Copy,
  Cpu,
  DollarSign,
  Download,
  ExternalLink,
  Filter,
  Globe,
  HardDrive,
  Layers,
  Lightbulb,
  Link,
  Lock,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoreVertical,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Unlock,
  Users,
  Wifi,
  Database,
  Cloud,
  Code,
  FileText,
  Image,
  Video,
  Music,
} from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { cn } from '../../../utils/cn';

// ============================================
// Types
// ============================================

export type StepStatus = 
  | 'idle'
  | 'pending'
  | 'queued'
  | 'preparing'
  | 'running'
  | 'executing'
  | 'processing'
  | 'completed'
  | 'success'
  | 'failed'
  | 'error'
  | 'skipped'
  | 'cancelled'
  | 'aborted'
  | 'retrying'
  | 'timeout'
  | 'fallback'
  | 'degraded'
  | 'warning'
  | 'waiting'
  | 'blocked'
  | 'on_hold'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'unknown';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type BadgeVariant = 'filled' | 'outlined' | 'subtle' | 'dot' | 'icon-only' | 'text-only';
export type BadgeAnimation = 'none' | 'pulse' | 'spin' | 'bounce' | 'shimmer';

export interface StatusDetail {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  dotColor: string;
  progressColor: string;
  defaultAnimation: BadgeAnimation;
}

interface StepStatusBadgeProps {
  status: StepStatus;
  size?: BadgeSize;
  variant?: BadgeVariant;
  animation?: BadgeAnimation;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  progress?: number;
  retryCount?: number;
  maxRetries?: number;
  isFallback?: boolean;
  fallbackFrom?: string;
  className?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  showProgress?: boolean;
  showTooltip?: boolean;
  onClick?: () => void;
  onRetry?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  onViewDetails?: () => void;
  isClickable?: boolean;
  isDisabled?: boolean;
  customColor?: string;
  customLabel?: string;
}

// ============================================
// Status Configuration
// ============================================

const STATUS_DETAILS: Record<StepStatus, StatusDetail> = {
  idle: {
    label: 'Idle',
    description: 'Ready to start',
    icon: <Square className="h-4 w-4" />,
    color: '#94a3b8',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    textColor: 'text-slate-700 dark:text-slate-300',
    dotColor: 'bg-slate-400',
    progressColor: 'bg-slate-400',
    defaultAnimation: 'none',
  },
  pending: {
    label: 'Pending',
    description: 'Waiting to start',
    icon: <Clock className="h-4 w-4" />,
    color: '#f59e0b',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
    progressColor: 'bg-amber-400',
    defaultAnimation: 'pulse',
  },
  queued: {
    label: 'Queued',
    description: 'In queue for processing',
    icon: <Layers className="h-4 w-4" />,
    color: '#8b5cf6',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-300 dark:border-violet-700',
    textColor: 'text-violet-700 dark:text-violet-300',
    dotColor: 'bg-violet-500',
    progressColor: 'bg-violet-400',
    defaultAnimation: 'pulse',
  },
  preparing: {
    label: 'Preparing',
    description: 'Setting up execution environment',
    icon: <Settings className="h-4 w-4" />,
    color: '#6366f1',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    dotColor: 'bg-indigo-500',
    progressColor: 'bg-indigo-400',
    defaultAnimation: 'spin',
  },
  running: {
    label: 'Running',
    description: 'Currently executing',
    icon: <Play className="h-4 w-4" />,
    color: '#3b82f6',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500',
    progressColor: 'bg-blue-500',
    defaultAnimation: 'bounce',
  },
  executing: {
    label: 'Executing',
    description: 'Processing the task',
    icon: <Activity className="h-4 w-4" />,
    color: '#2563eb',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-600',
    progressColor: 'bg-blue-500',
    defaultAnimation: 'bounce',
  },
  processing: {
    label: 'Processing',
    description: 'Working on the request',
    icon: <Loader2 className="h-4 w-4" />,
    color: '#0284c7',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    borderColor: 'border-sky-300 dark:border-sky-700',
    textColor: 'text-sky-700 dark:text-sky-300',
    dotColor: 'bg-sky-600',
    progressColor: 'bg-sky-500',
    defaultAnimation: 'spin',
  },
  completed: {
    label: 'Completed',
    description: 'Successfully finished',
    icon: <CheckCircle className="h-4 w-4" />,
    color: '#10b981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    progressColor: 'bg-emerald-500',
    defaultAnimation: 'none',
  },
  success: {
    label: 'Success',
    description: 'Operation successful',
    icon: <CheckCircle className="h-4 w-4" />,
    color: '#059669',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-300 dark:border-green-700',
    textColor: 'text-green-700 dark:text-green-300',
    dotColor: 'bg-green-500',
    progressColor: 'bg-green-500',
    defaultAnimation: 'none',
  },
  failed: {
    label: 'Failed',
    description: 'Execution failed',
    icon: <XCircle className="h-4 w-4" />,
    color: '#ef4444',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-500',
    progressColor: 'bg-red-500',
    defaultAnimation: 'none',
  },
  error: {
    label: 'Error',
    description: 'An error occurred',
    icon: <AlertCircle className="h-4 w-4" />,
    color: '#dc2626',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-600',
    progressColor: 'bg-red-500',
    defaultAnimation: 'none',
  },
  skipped: {
    label: 'Skipped',
    description: 'Step was skipped',
    icon: <SkipForward className="h-4 w-4" />,
    color: '#f59e0b',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
    progressColor: 'bg-amber-400',
    defaultAnimation: 'none',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Execution cancelled',
    icon: <Square className="h-4 w-4" />,
    color: '#6b7280',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-600',
    textColor: 'text-gray-600 dark:text-gray-400',
    dotColor: 'bg-gray-500',
    progressColor: 'bg-gray-400',
    defaultAnimation: 'none',
  },
  aborted: {
    label: 'Aborted',
    description: 'Execution aborted',
    icon: <Square className="h-4 w-4" />,
    color: '#78716c',
    bgColor: 'bg-stone-100 dark:bg-stone-800',
    borderColor: 'border-stone-300 dark:border-stone-600',
    textColor: 'text-stone-700 dark:text-stone-300',
    dotColor: 'bg-stone-500',
    progressColor: 'bg-stone-400',
    defaultAnimation: 'none',
  },
  retrying: {
    label: 'Retrying',
    description: 'Attempting retry',
    icon: <RotateCcw className="h-4 w-4" />,
    color: '#f97316',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-300 dark:border-orange-700',
    textColor: 'text-orange-700 dark:text-orange-300',
    dotColor: 'bg-orange-500',
    progressColor: 'bg-orange-500',
    defaultAnimation: 'spin',
  },
  timeout: {
    label: 'Timeout',
    description: 'Execution timed out',
    icon: <Timer className="h-4 w-4" />,
    color: '#dc2626',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-600',
    progressColor: 'bg-red-500',
    defaultAnimation: 'none',
  },
  fallback: {
    label: 'Fallback',
    description: 'Using fallback agent',
    icon: <GitBranch className="h-4 w-4" />,
    color: '#d97706',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-600',
    progressColor: 'bg-amber-500',
    defaultAnimation: 'pulse',
  },
  degraded: {
    label: 'Degraded',
    description: 'Running with reduced performance',
    icon: <TrendingDown className="h-4 w-4" />,
    color: '#eab308',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    dotColor: 'bg-yellow-500',
    progressColor: 'bg-yellow-500',
    defaultAnimation: 'pulse',
  },
  warning: {
    label: 'Warning',
    description: 'Issues detected',
    icon: <AlertCircle className="h-4 w-4" />,
    color: '#eab308',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    dotColor: 'bg-yellow-500',
    progressColor: 'bg-yellow-400',
    defaultAnimation: 'none',
  },
  waiting: {
    label: 'Waiting',
    description: 'Waiting for dependencies',
    icon: <Clock className="h-4 w-4" />,
    color: '#a855f7',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    dotColor: 'bg-purple-500',
    progressColor: 'bg-purple-400',
    defaultAnimation: 'pulse',
  },
  blocked: {
    label: 'Blocked',
    description: 'Cannot proceed',
    icon: <Lock className="h-4 w-4" />,
    color: '#ef4444',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-500',
    progressColor: 'bg-red-400',
    defaultAnimation: 'none',
  },
  on_hold: {
    label: 'On Hold',
    description: 'Temporarily paused',
    icon: <Pause className="h-4 w-4" />,
    color: '#f59e0b',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
    progressColor: 'bg-amber-400',
    defaultAnimation: 'none',
  },
  review: {
    label: 'In Review',
    description: 'Under review',
    icon: <Eye className="h-4 w-4" />,
    color: '#6366f1',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    dotColor: 'bg-indigo-500',
    progressColor: 'bg-indigo-400',
    defaultAnimation: 'none',
  },
  approved: {
    label: 'Approved',
    description: 'Approved for execution',
    icon: <CheckCircle className="h-4 w-4" />,
    color: '#10b981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    progressColor: 'bg-emerald-500',
    defaultAnimation: 'none',
  },
  rejected: {
    label: 'Rejected',
    description: 'Rejected for execution',
    icon: <XCircle className="h-4 w-4" />,
    color: '#ef4444',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    textColor: 'text-red-700 dark:text-red-300',
    dotColor: 'bg-red-500',
    progressColor: 'bg-red-400',
    defaultAnimation: 'none',
  },
  unknown: {
    label: 'Unknown',
    description: 'Status unknown',
    icon: <Info className="h-4 w-4" />,
    color: '#94a3b8',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    textColor: 'text-slate-700 dark:text-slate-300',
    dotColor: 'bg-slate-400',
    progressColor: 'bg-slate-400',
    defaultAnimation: 'none',
  },
};

// ============================================
// Size Configuration
// ============================================

const SIZE_CONFIG: Record<BadgeSize, {
  container: string;
  icon: string;
  text: string;
  dot: string;
  progress: string;
  padding: string;
  gap: string;
}> = {
  xs: {
    container: 'h-4 text-[10px]',
    icon: 'h-2.5 w-2.5',
    text: 'text-[10px]',
    dot: 'w-1.5 h-1.5',
    progress: 'h-0.5',
    padding: 'px-1',
    gap: 'gap-0.5',
  },
  sm: {
    container: 'h-5 text-xs',
    icon: 'h-3 w-3',
    text: 'text-xs',
    dot: 'w-2 h-2',
    progress: 'h-1',
    padding: 'px-1.5',
    gap: 'gap-1',
  },
  md: {
    container: 'h-6 text-sm',
    icon: 'h-3.5 w-3.5',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5',
    progress: 'h-1.5',
    padding: 'px-2',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'h-8 text-base',
    icon: 'h-4 w-4',
    text: 'text-base',
    dot: 'w-3 h-3',
    progress: 'h-2',
    padding: 'px-3',
    gap: 'gap-2',
  },
  xl: {
    container: 'h-10 text-lg',
    icon: 'h-5 w-5',
    text: 'text-lg',
    dot: 'w-3.5 h-3.5',
    progress: 'h-2.5',
    padding: 'px-4',
    gap: 'gap-2.5',
  },
};

// ============================================
// Animation Classes
// ============================================

const ANIMATION_CLASSES: Record<BadgeAnimation, string> = {
  none: '',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  shimmer: 'animate-shimmer',
};

// ============================================
// Component
// ============================================

export const StepStatusBadge: React.FC<StepStatusBadgeProps> = ({
  status,
  size = 'sm',
  variant = 'filled',
  animation: customAnimation,
  label,
  description,
  icon: customIcon,
  progress,
  retryCount,
  maxRetries = 3,
  isFallback = false,
  fallbackFrom,
  className,
  showLabel = true,
  showIcon = true,
  showProgress = false,
  showTooltip = true,
  onClick,
  onRetry,
  onSkip,
  onCancel,
  onViewDetails,
  isClickable = false,
  isDisabled = false,
  customColor,
  customLabel,
}) => {
  const statusDetail = STATUS_DETAILS[status] || STATUS_DETAILS.unknown;
  const sizeConfig = SIZE_CONFIG[size];
  const animation = customAnimation !== undefined ? customAnimation : statusDetail.defaultAnimation;
  
  const displayLabel = customLabel || label || statusDetail.label;
  const displayIcon = customIcon || statusDetail.icon;
  const displayDescription = description || statusDetail.description;
  const displayColor = customColor || statusDetail.color;

  // Progress bar for running states
  const ProgressBar = () => {
    if (!showProgress || (progress === undefined && status !== 'running' && status !== 'executing' && status !== 'processing')) {
      return null;
    }

    const currentProgress = progress !== undefined ? progress : 
      status === 'running' ? 50 :
      status === 'executing' ? 65 :
      status === 'processing' ? 75 : 0;

    return (
      <div className={`absolute bottom-0 left-0 right-0 ${sizeConfig.progress} bg-secondary-200 dark:bg-secondary-700 rounded-b-full overflow-hidden`}>
        <div
          className={`h-full ${statusDetail.progressColor} rounded-b-full transition-all duration-500`}
          style={{ width: `${currentProgress}%` }}
        />
      </div>
    );
  };

  // Retry count badge
  const RetryBadge = () => {
    if (retryCount === undefined || retryCount === 0) return null;
    return (
      <span className={`ml-1 text-[10px] font-medium ${retryCount > maxRetries ? 'text-red-600' : 'text-orange-600'}`}>
        ({retryCount}/{maxRetries})
      </span>
    );
  };

  // Fallback indicator
  const FallbackIndicator = () => {
    if (!isFallback) return null;
    return (
      <span className="ml-1 text-[10px] font-medium text-amber-600">
        <GitBranch className="h-2.5 w-2.5 inline" />
      </span>
    );
  };

  // Main badge content
  const badgeContent = (
    <div
      className={cn(
        'relative inline-flex items-center rounded-full transition-all duration-200',
        sizeConfig.container,
        sizeConfig.padding,
        sizeConfig.gap,
        isClickable && !isDisabled ? 'cursor-pointer hover:shadow-md hover:scale-105 active:scale-95' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        variant === 'filled' && statusDetail.bgColor,
        variant === 'filled' && statusDetail.textColor,
        variant === 'outlined' && 'bg-transparent border-2',
        variant === 'outlined' && statusDetail.borderColor,
        variant === 'outlined' && statusDetail.textColor,
        variant === 'subtle' && 'bg-white/50 dark:bg-secondary-800/50 border',
        variant === 'subtle' && statusDetail.borderColor,
        variant === 'subtle' && statusDetail.textColor,
        className
      )}
      onClick={isClickable && !isDisabled ? onClick : undefined}
      role={isClickable ? 'button' : 'status'}
      tabIndex={isClickable ? 0 : undefined}
      title={!showTooltip ? displayDescription : undefined}
    >
      {/* Dot Indicator (for dot variant) */}
      {variant === 'dot' && (
        <div className={`${sizeConfig.dot} rounded-full ${statusDetail.dotColor} ${ANIMATION_CLASSES[animation]}`} />
      )}

      {/* Icon */}
      {(variant !== 'dot' || showIcon) && variant !== 'text-only' && (
        <span className={`${sizeConfig.icon} ${variant === 'icon-only' ? '' : 'flex-shrink-0'} ${ANIMATION_CLASSES[animation]}`}>
          {displayIcon}
        </span>
      )}

      {/* Label */}
      {(variant !== 'dot' && variant !== 'icon-only' && showLabel) && (
        <span className={cn(sizeConfig.text, 'font-medium whitespace-nowrap')}>
          {displayLabel}
          {isFallback && <FallbackIndicator />}
          <RetryBadge />
        </span>
      )}

      {/* Progress Bar */}
      <ProgressBar />

      {/* Action Buttons (for failed/timeout states) */}
      {(status === 'failed' || status === 'error' || status === 'timeout') && (onRetry || onSkip) && (
        <div className="flex items-center gap-0.5 ml-1 -mr-1">
          {onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              title="Retry"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          )}
          {onSkip && (
            <button
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
              className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              title="Skip"
            >
              <SkipForward className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Cancel button for running states */}
      {(status === 'running' || status === 'executing' || status === 'processing') && onCancel && (
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="ml-1 p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          title="Cancel"
        >
          <Square className="h-2.5 w-2.5" />
        </button>
      )}

      {/* View details button */}
      {onViewDetails && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          className="ml-1 p-0.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
          title="View Details"
        >
          <Eye className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );

  // Wrap with tooltip if enabled
  if (showTooltip) {
    return (
      <Tooltip
        content={
          <div className="space-y-1">
            <p className="font-medium">{displayLabel}</p>
            <p className="text-xs opacity-80">{displayDescription}</p>
            {retryCount !== undefined && retryCount > 0 && (
              <p className="text-xs opacity-80">Retries: {retryCount}/{maxRetries}</p>
            )}
            {isFallback && fallbackFrom && (
              <p className="text-xs opacity-80">Fallback from: {fallbackFrom}</p>
            )}
            {progress !== undefined && (
              <p className="text-xs opacity-80">Progress: {progress}%</p>
            )}
          </div>
        }
        delay={300}
      >
        {badgeContent}
      </Tooltip>
    );
  }

  return badgeContent;
};

// ============================================
// Status Badge Group Component
// ============================================

export interface StatusBadgeGroupProps {
  badges: Array<{
    status: StepStatus;
    label?: string;
    onClick?: () => void;
  }>;
  size?: BadgeSize;
  variant?: BadgeVariant;
  maxVisible?: number;
  className?: string;
}

export const StatusBadgeGroup: React.FC<StatusBadgeGroupProps> = ({
  badges,
  size = 'sm',
  variant = 'filled',
  maxVisible = 3,
  className,
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleBadges = showAll ? badges : badges.slice(0, maxVisible);
  const remainingCount = badges.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visibleBadges.map((badge, index) => (
        <StepStatusBadge
          key={index}
          status={badge.status}
          size={size}
          variant={variant}
          label={badge.label}
          onClick={badge.onClick}
          isClickable={!!badge.onClick}
          showTooltip={true}
        />
      ))}
      {remainingCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-secondary-500 hover:text-secondary-700 underline"
        >
          +{remainingCount} more
        </button>
      )}
      {showAll && badges.length > maxVisible && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-secondary-500 hover:text-secondary-700 underline"
        >
          Show less
        </button>
      )}
    </div>
  );
};

// ============================================
// Status Timeline Component
// ============================================

export interface StatusTimelineStep {
  status: StepStatus;
  label: string;
  timestamp?: Date;
  description?: string;
}

export interface StatusTimelineProps {
  steps: StatusTimelineStep[];
  currentStep?: number;
  className?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  steps,
  currentStep,
  className,
}) => {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const isActive = currentStep !== undefined ? index <= currentStep : true;
        const isCurrent = currentStep === index;
        const isCompleted = currentStep !== undefined ? index < currentStep : false;
        const isPending = currentStep !== undefined ? index > currentStep : false;

        let timelineStatus: StepStatus = step.status;
        if (isCurrent) timelineStatus = 'running';
        if (isCompleted) timelineStatus = 'completed';
        if (isPending) timelineStatus = 'pending';

        return (
          <div key={index} className="flex items-start gap-3">
            {/* Timeline Line and Node */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                isCompleted ? 'bg-green-500' :
                isCurrent ? 'bg-blue-500 animate-pulse' :
                'bg-secondary-300 dark:bg-secondary-600'
              }`} />
              {index < steps.length - 1 && (
                <div className={`w-0.5 h-6 ${
                  isCompleted ? 'bg-green-300' : 'bg-secondary-200 dark:bg-secondary-700'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
              <div className="flex items-center gap-2">
                <StepStatusBadge
                  status={timelineStatus}
                  size="xs"
                  variant="subtle"
                  showTooltip={false}
                />
                <span className={`text-xs font-medium ${
                  isPending ? 'text-secondary-400' : 'text-secondary-700 dark:text-secondary-300'
                }`}>
                  {step.label}
                </span>
              </div>
              {step.timestamp && (
                <p className="text-xs text-secondary-400 mt-0.5">
                  {step.timestamp.toLocaleTimeString()}
                </p>
              )}
              {step.description && (
                <p className="text-xs text-secondary-500 mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// Status Progress Bar Component
// ============================================

export interface StatusProgressBarProps {
  status: StepStatus;
  progress: number;
  size?: BadgeSize;
  showLabel?: boolean;
  showPercentage?: boolean;
  className?: string;
}

export const StatusProgressBar: React.FC<StatusProgressBarProps> = ({
  status,
  progress,
  size = 'sm',
  showLabel = false,
  showPercentage = false,
  className,
}) => {
  const statusDetail = STATUS_DETAILS[status] || STATUS_DETAILS.unknown;
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className={cn('space-y-1', className)}>
      {(showLabel || showPercentage) && (
        <div className="flex items-center justify-between">
          {showLabel && (
            <div className="flex items-center gap-1.5">
              <StepStatusBadge status={status} size="xs" variant="icon-only" showTooltip={false} />
              <span className={`text-xs ${statusDetail.textColor}`}>{statusDetail.label}</span>
            </div>
          )}
          {showPercentage && (
            <span className={`text-xs font-medium ${statusDetail.textColor}`}>{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className={`${sizeConfig.progress} bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${statusDetail.progressColor}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        >
          {progress >= 90 && (
            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Status Count Badge
// ============================================

export interface StatusCountBadgeProps {
  status: StepStatus;
  count: number;
  max?: number;
  size?: BadgeSize;
  className?: string;
  onClick?: () => void;
}

export const StatusCountBadge: React.FC<StatusCountBadgeProps> = ({
  status,
  count,
  max,
  size = 'sm',
  className,
  onClick,
}) => {
  const statusDetail = STATUS_DETAILS[status] || STATUS_DETAILS.unknown;
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 cursor-pointer hover:shadow-sm transition-all',
        statusDetail.bgColor,
        statusDetail.borderColor,
        className
      )}
      onClick={onClick}
    >
      <span className={`${sizeConfig.icon} ${statusDetail.textColor}`}>{statusDetail.icon}</span>
      <span className={`${sizeConfig.text} font-semibold ${statusDetail.textColor}`}>
        {count}
        {max !== undefined && <span className="font-normal opacity-60">/ {max}</span>}
      </span>
    </div>
  );
};

// ============================================
// Status Filter Group Component
// ============================================

export interface StatusFilterGroupProps {
  selected: StepStatus[];
  onToggle: (status: StepStatus) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  statuses?: StepStatus[];
  size?: BadgeSize;
  className?: string;
}

export const StatusFilterGroup: React.FC<StatusFilterGroupProps> = ({
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  statuses = ['completed', 'running', 'pending', 'failed', 'skipped'],
  size = 'sm',
  className,
}) => {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {statuses.map(status => {
        const isSelected = selected.includes(status);
        const statusDetail = STATUS_DETAILS[status] || STATUS_DETAILS.unknown;
        
        return (
          <button
            key={status}
            onClick={() => onToggle(status)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
              isSelected
                ? `${statusDetail.bgColor} ${statusDetail.textColor} ring-2 ring-offset-1 ${statusDetail.borderColor}`
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700'
            )}
          >
            <span className={isSelected ? '' : 'opacity-50'}>{statusDetail.icon}</span>
            {statusDetail.label}
          </button>
        );
      })}
      <button
        onClick={onSelectAll}
        className="text-xs text-primary-600 hover:text-primary-700 underline"
      >
        All
      </button>
      <button
        onClick={onClearAll}
        className="text-xs text-secondary-500 hover:text-secondary-700 underline"
      >
        Clear
      </button>
    </div>
  );
};

// ============================================
// Status Legend Component
// ============================================

export interface StatusLegendProps {
  statuses?: StepStatus[];
  size?: BadgeSize;
  variant?: BadgeVariant;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const StatusLegend: React.FC<StatusLegendProps> = ({
  statuses = ['completed', 'running', 'pending', 'failed', 'skipped', 'retrying'],
  size = 'sm',
  variant = 'filled',
  direction = 'horizontal',
  className,
}) => {
  return (
    <div className={cn(
      'flex gap-3',
      direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      {statuses.map(status => (
        <div key={status} className="flex items-center gap-2">
          <StepStatusBadge
            status={status}
            size={size}
            variant={variant}
            showTooltip={false}
          />
          <span className="text-xs text-secondary-500 hidden sm:inline">
            {STATUS_DETAILS[status]?.description || status}
          </span>
        </div>
      ))}
    </div>
  );
};


export default StepStatusBadge;
