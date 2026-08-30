// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/MultiAgentOutput.tsx
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
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreVertical,
  Play,
  Square,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowDown,
  GitBranch,
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
  TrendingDown,
  Shield,
  Award,
  Info,
  X,
  Plus,
  Minus,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Search,
  Settings,
  HelpCircle,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Lightbulb,
  Flame,
  Snowflake,
  Database,
  Cloud,
  Wifi,
  Lock,
  Unlock,
  Users,
  DollarSign,
  Gauge,
  Timer,
  Code,
  FileText,
  Image,
  Video,
  Music,
  Send,
  Share,
  History,
  RotateCcw as RotateIcon,
  Loader2,
  Grid3X3,
  List,
  LayoutGrid,
  Sliders,
  Link,
  Unlink,
  Move,
  GripVertical,
  PanelLeft,
  PanelRight,
  StopCircle,
  Pause,
  FastForward,
  Rewind,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { Progress } from '../common/Progress';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { AgentType, AgentResponse } from '../../../types/agent.types';
import { format, formatDistanceToNow, formatDuration } from 'date-fns';

// ============================================
// Types
// ============================================

export type AgentOutputStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'waiting';

export type OutputViewMode = 'grid' | 'list' | 'timeline' | 'detailed';

export type OutputSortField = 'name' | 'status' | 'duration' | 'tokens' | 'cost' | 'startTime';

export interface AgentOutputItem {
  id: string;
  agentType: string;
  agentName: string;
  task: string;
  input?: any;
  output?: any;
  status: AgentOutputStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  tokensUsed: number;
  costUsd: number;
  error?: string;
  errorStack?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  isFallback?: boolean;
  fallbackFor?: string;
  parentExecutionId?: string;
  childExecutions?: string[];
  model?: string;
  provider?: string;
  confidence?: number;
  dependsOn?: string[];
  parallelGroup?: string;
  order?: number;
  notes?: string;
  starred?: boolean;
}

export interface MultiAgentSummary {
  totalAgents: number;
  completedAgents: number;
  failedAgents: number;
  executingAgents: number;
  pendingAgents: number;
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
  averageResponseTime: number;
  fastestAgent?: { name: string; duration: number };
  slowestAgent?: { name: string; duration: number };
  mostExpensiveAgent?: { name: string; cost: number };
  byAgentType: Record<string, { count: number; successCount: number; failCount: number; totalCost: number }>;
  byStatus: Record<AgentOutputStatus, number>;
}

export interface MultiAgentTimelineEvent {
  id: string;
  agentId: string;
  agentName: string;
  agentType: string;
  event: 'started' | 'completed' | 'failed' | 'retried' | 'cancelled';
  timestamp: Date;
  details?: string;
}

interface MultiAgentOutputProps {
  outputs?: AgentOutputItem[];
  summary?: MultiAgentSummary;
  timeline?: MultiAgentTimelineEvent[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: (agentId: string) => void;
  onRetryAll?: () => void;
  onCancel?: (agentId: string) => void;
  onCancelAll?: () => void;
  onSkip?: (agentId: string) => void;
  onAgentClick?: (agentId: string) => void;
  onAgentSelect?: (agentId: string) => void;
  onExport?: (outputs: AgentOutputItem[]) => void;
  onExportCSV?: (outputs: AgentOutputItem[]) => void;
  onSort?: (field: OutputSortField, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: OutputFilters) => void;
  onRefresh?: () => void;
  showHeader?: boolean;
  showSummary?: boolean;
  showActions?: boolean;
  showFilters?: boolean;
  showTimeline?: boolean;
  showDetails?: boolean;
  viewMode?: OutputViewMode;
  selectedAgentId?: string | null;
  maxHeight?: string;
  className?: string;
  executionId?: string;
  planId?: string;
}

export interface OutputFilters {
  search?: string;
  status?: AgentOutputStatus[];
  agentType?: string[];
  minDuration?: number;
  maxDuration?: number;
  minTokens?: number;
  maxTokens?: number;
  minCost?: number;
  maxCost?: number;
  hasError?: boolean;
  isFallback?: boolean;
  priority?: string[];
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
  borderColor: string;
  capabilities: string[];
}> = {
  email: {
    name: 'Email Agent',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300 dark:border-blue-700',
    capabilities: ['Send/Receive emails', 'AI-powered replies', 'Email classification'],
  },
  drive: {
    name: 'Drive Agent',
    icon: <HardDrive className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    gradient: 'from-green-500 to-green-600',
    borderColor: 'border-green-300 dark:border-green-700',
    capabilities: ['File upload/download', 'Folder management', 'File sharing'],
  },
  content: {
    name: 'Content Agent',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    gradient: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300 dark:border-purple-700',
    capabilities: ['Text generation', 'Image generation', 'Content editing'],
  },
  social: {
    name: 'Social Agent',
    icon: <Share2 className="h-5 w-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    gradient: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300 dark:border-pink-700',
    capabilities: ['Multi-platform posting', 'Post scheduling', 'Analytics tracking'],
  },
  calendar: {
    name: 'Calendar Agent',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    gradient: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-300 dark:border-orange-700',
    capabilities: ['Event creation', 'Smart scheduling', 'Availability checking'],
  },
  web: {
    name: 'Web Agent',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    gradient: 'from-teal-500 to-teal-600',
    borderColor: 'border-teal-300 dark:border-teal-700',
    capabilities: ['Web search', 'Deep research', 'Weather info'],
  },
  task: {
    name: 'Task Agent',
    icon: <CheckSquare className="h-5 w-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    gradient: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    capabilities: ['Task creation', 'Task management', 'Project organization'],
  },
  orchestrator: {
    name: 'Orchestrator',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    gradient: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-700',
    capabilities: ['Intent classification', 'Task planning', 'Agent delegation'],
  },
};

const STATUS_CONFIG: Record<AgentOutputStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  animation?: string;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-secondary-500',
    bgColor: 'bg-secondary-100 dark:bg-secondary-800',
    description: 'Waiting to start',
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
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'Execution cancelled',
  },
  timeout: {
    label: 'Timeout',
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Exceeded time limit',
  },
  waiting: {
    label: 'Waiting',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Waiting for dependencies',
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
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

export const MultiAgentOutput: React.FC<MultiAgentOutputProps> = ({
  outputs: externalOutputs,
  summary: externalSummary,
  timeline: externalTimeline,
  isLoading = false,
  error = null,
  onRetry,
  onRetryAll,
  onCancel,
  onCancelAll,
  onSkip,
  onAgentClick,
  onAgentSelect,
  onExport,
  onExportCSV,
  onSort,
  onFilter,
  onRefresh,
  showHeader = true,
  showSummary = true,
  showActions = true,
  showFilters = true,
  showTimeline = true,
  showDetails = true,
  viewMode: initialViewMode = 'grid',
  selectedAgentId = null,
  maxHeight = '600px',
  className = '',
  executionId,
  planId,
}) => {
  // ============================================
  // State
  // ============================================

  const [viewMode, setViewMode] = useState<OutputViewMode>(initialViewMode);
  const [selectedId, setSelectedId] = useState<string | null>(selectedAgentId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showFullOutput, setShowFullOutput] = useState<Set<string>>(new Set());
  const [showFullError, setShowFullError] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<OutputFilters>({});
  const [sortField, setSortField] = useState<OutputSortField>('startTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [animateIn, setAnimateIn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Derived Data
  // ============================================

  const outputs = externalOutputs || [];
  const summary = externalSummary || computeSummary(outputs);
  const timeline = externalTimeline || computeTimeline(outputs);

  // Compute summary from outputs if not provided
  function computeSummary(items: AgentOutputItem[]): MultiAgentSummary {
    const completedAgents = items.filter((i) => i.status === 'completed').length;
    const failedAgents = items.filter((i) => i.status === 'failed' || i.status === 'timeout').length;
    const executingAgents = items.filter((i) => i.status === 'executing').length;
    const pendingAgents = items.filter((i) => i.status === 'pending' || i.status === 'waiting').length;
    const totalDuration = items.reduce((sum, i) => sum + i.duration, 0);
    const totalTokens = items.reduce((sum, i) => sum + i.tokensUsed, 0);
    const totalCost = items.reduce((sum, i) => sum + i.costUsd, 0);
    const successRate = items.length > 0 ? (completedAgents / items.length) * 100 : 0;
    const averageResponseTime = items.length > 0 ? totalDuration / items.length : 0;

    const byAgentType: Record<string, { count: number; successCount: number; failCount: number; totalCost: number }> = {};
    const byStatus: Record<AgentOutputStatus, number> = {
      pending: 0,
      executing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      timeout: 0,
      waiting: 0,
    };

    items.forEach((item) => {
      const type = item.agentType.toLowerCase();
      if (!byAgentType[type]) {
        byAgentType[type] = { count: 0, successCount: 0, failCount: 0, totalCost: 0 };
      }
      byAgentType[type].count++;
      if (item.status === 'completed') byAgentType[type].successCount++;
      if (item.status === 'failed' || item.status === 'timeout') byAgentType[type].failCount++;
      byAgentType[type].totalCost += item.costUsd;
      byStatus[item.status]++;
    });

    const sortedByDuration = [...items].sort((a, b) => a.duration - b.duration).filter((i) => i.status === 'completed');
    const sortedByCost = [...items].sort((a, b) => b.costUsd - a.costUsd).filter((i) => i.status === 'completed');

    return {
      totalAgents: items.length,
      completedAgents,
      failedAgents,
      executingAgents,
      pendingAgents,
      totalDuration,
      totalTokens,
      totalCost,
      successRate,
      averageResponseTime,
      fastestAgent: sortedByDuration.length > 0 ? { name: sortedByDuration[0].agentName, duration: sortedByDuration[0].duration } : undefined,
      slowestAgent: sortedByDuration.length > 0 ? { name: sortedByDuration[sortedByDuration.length - 1].agentName, duration: sortedByDuration[sortedByDuration.length - 1].duration } : undefined,
      mostExpensiveAgent: sortedByCost.length > 0 ? { name: sortedByCost[0].agentName, cost: sortedByCost[0].costUsd } : undefined,
      byAgentType,
      byStatus,
    };
  }

  function computeTimeline(items: AgentOutputItem[]): MultiAgentTimelineEvent[] {
    const events: MultiAgentTimelineEvent[] = [];

    items.forEach((agent) => {
      if (agent.startTime) {
        events.push({
          id: `${agent.id}_started`,
          agentId: agent.id,
          agentName: agent.agentName,
          agentType: agent.agentType,
          event: 'started',
          timestamp: agent.startTime,
        });
      }
      if (agent.endTime && agent.status === 'completed') {
        events.push({
          id: `${agent.id}_completed`,
          agentId: agent.id,
          agentName: agent.agentName,
          agentType: agent.agentType,
          event: 'completed',
          timestamp: agent.endTime,
        });
      }
      if (agent.status === 'failed' || agent.status === 'timeout') {
        events.push({
          id: `${agent.id}_failed`,
          agentId: agent.id,
          agentName: agent.agentName,
          agentType: agent.agentType,
          event: 'failed',
          timestamp: agent.endTime || new Date(),
          details: agent.error,
        });
      }
    });

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Apply filters and sorting
  const filteredOutputs = useMemo(() => {
    let filtered = [...outputs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.agentName.toLowerCase().includes(query) ||
          item.agentType.toLowerCase().includes(query) ||
          item.task.toLowerCase().includes(query) ||
          item.error?.toLowerCase().includes(query),
      );
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((item) => filters.status!.includes(item.status));
    }

    // Agent type filter
    if (filters.agentType && filters.agentType.length > 0) {
      filtered = filtered.filter((item) => filters.agentType!.map((a) => a.toLowerCase()).includes(item.agentType.toLowerCase()));
    }

    // Has error filter
    if (filters.hasError !== undefined) {
      filtered = filtered.filter((item) => !!item.error === filters.hasError);
    }

    // Is fallback filter
    if (filters.isFallback !== undefined) {
      filtered = filtered.filter((item) => !!item.isFallback === filters.isFallback);
    }

    // Duration filter
    if (filters.minDuration !== undefined) {
      filtered = filtered.filter((item) => item.duration >= filters.minDuration!);
    }
    if (filters.maxDuration !== undefined) {
      filtered = filtered.filter((item) => item.duration <= filters.maxDuration!);
    }

    // Cost filter
    if (filters.minCost !== undefined) {
      filtered = filtered.filter((item) => item.costUsd >= filters.minCost!);
    }
    if (filters.maxCost !== undefined) {
      filtered = filtered.filter((item) => item.costUsd <= filters.maxCost!);
    }

    // Sort
    filtered.sort((a, b) => {
      let compare = 0;
      switch (sortField) {
        case 'name':
          compare = a.agentName.localeCompare(b.agentName);
          break;
        case 'status':
          compare = a.status.localeCompare(b.status);
          break;
        case 'duration':
          compare = a.duration - b.duration;
          break;
        case 'tokens':
          compare = a.tokensUsed - b.tokensUsed;
          break;
        case 'cost':
          compare = a.costUsd - b.costUsd;
          break;
        case 'startTime':
          compare = (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0);
          break;
      }
      return sortDirection === 'asc' ? compare : -compare;
    });

    return filtered;
  }, [outputs, searchQuery, filters, sortField, sortDirection]);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const handleSelect = useCallback((id: string) => {
    setSelectedId(selectedId === id ? null : id);
    onAgentSelect?.(id);
  }, [selectedId, onAgentSelect]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleFullOutput = useCallback((id: string) => {
    setShowFullOutput((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleFullError = useCallback((id: string) => {
    setShowFullError((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSort = useCallback((field: OutputSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    onSort?.(field, sortDirection);
  }, [sortField, sortDirection, onSort]);

  const handleCopyOutput = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (onExportCSV) {
      onExportCSV(filteredOutputs);
    } else {
      // Generate CSV
      const headers = ['Agent Name', 'Agent Type', 'Task', 'Status', 'Duration (ms)', 'Tokens', 'Cost (USD)', 'Error', 'Started At'];
      const rows = outputs.map((item) => [
        item.agentName,
        item.agentType,
        item.task.replace(/"/g, '""'),
        item.status,
        item.duration,
        item.tokensUsed,
        item.costUsd.toFixed(6),
        item.error ? item.error.replace(/"/g, '""') : '',
        item.startTime?.toISOString() || '',
      ]);
      const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `multi_agent_output_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [outputs, filteredOutputs, onExportCSV]);

  // ============================================
  // Formatting Helpers
  // ============================================

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatCost = (usd: number): string => {
    if (usd < 0.001) return `${(usd * 1000000).toFixed(0)}μ¢`;
    if (usd < 0.01) return `${(usd * 1000).toFixed(1)}m¢`;
    return `$${usd.toFixed(4)}`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const getSortIcon = (field: OutputSortField) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // ============================================
  // Render: Summary Cards
  // ============================================

  const renderSummary = () => {
    if (!showSummary || !summary) return null;

    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-secondary-500">Total Agents</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white">{summary.totalAgents}</p>
        </Card>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-green-500">Completed</p>
          <p className="text-xl font-bold text-green-600">{summary.completedAgents}</p>
        </Card>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-red-500">Failed</p>
          <p className="text-xl font-bold text-red-600">{summary.failedAgents}</p>
        </Card>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-secondary-500">Total Time</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white">{formatDuration(summary.totalDuration)}</p>
        </Card>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-secondary-500">Total Cost</p>
          <p className="text-xl font-bold text-purple-600">{formatCost(summary.totalCost)}</p>
        </Card>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-secondary-500">Total Tokens</p>
          <p className="text-xl font-bold text-blue-600">{formatTokens(summary.totalTokens)}</p>
        </Card>
        <Card variant="bordered" className="p-3 text-center">
          <p className="text-xs text-secondary-500">Success Rate</p>
          <p className={`text-xl font-bold ${summary.successRate >= 90 ? 'text-green-600' : summary.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
            {summary.successRate.toFixed(0)}%
          </p>
        </Card>
      </div>
    );
  };

  // ============================================
  // Render: Filters Panel
  // ============================================

  const renderFiltersPanel = () => {
    if (!showFiltersPanel) return null;

    return (
      <Card variant="bordered" className="animate-slide-in-bottom">
        <CardHeader icon={<Filter className="h-4 w-4" />}>
          Filters
          <button onClick={() => setShowFiltersPanel(false)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-xs text-secondary-500 mb-1 block">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={() => {
                      const current = filters.status || [];
                      const next = current.includes(status as AgentOutputStatus)
                        ? current.filter((s) => s !== status)
                        : [...current, status as AgentOutputStatus];
                      const newFilters = { ...filters, status: next.length > 0 ? next : undefined };
                      setFilters(newFilters);
                      onFilter?.(newFilters);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      (filters.status || []).includes(status as AgentOutputStatus)
                        ? `${config.bgColor} ${config.color}`
                        : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500'
                    }`}
                  >
                    {config.icon}
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Type Filter */}
            <div>
              <label className="text-xs text-secondary-500 mb-1 block">Agent Type</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(AGENT_CONFIG).slice(0, 7).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => {
                      const current = filters.agentType || [];
                      const next = current.includes(type)
                        ? current.filter((t) => t !== type)
                        : [...current, type];
                      const newFilters = { ...filters, agentType: next.length > 0 ? next : undefined };
                      setFilters(newFilters);
                      onFilter?.(newFilters);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      (filters.agentType || []).includes(type)
                        ? `${config.bgColor} ${config.color}`
                        : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500'
                    }`}
                  >
                    {config.icon}
                    {config.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="space-y-2">
              <label className="text-xs text-secondary-500 block">Other Filters</label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={filters.hasError || false}
                  onChange={(e) => {
                    const newFilters = { ...filters, hasError: e.target.checked || undefined };
                    setFilters(newFilters);
                    onFilter?.(newFilters);
                  }}
                  className="w-3.5 h-3.5 rounded"
                />
                Has Errors Only
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={filters.isFallback || false}
                  onChange={(e) => {
                    const newFilters = { ...filters, isFallback: e.target.checked || undefined };
                    setFilters(newFilters);
                    onFilter?.(newFilters);
                  }}
                  className="w-3.5 h-3.5 rounded"
                />
                Fallback Agents Only
              </label>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setFilters({});
                  onFilter?.({});
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  // ============================================
  // Render: Status Badge
  // ============================================

  const renderStatusBadge = (status: AgentOutputStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${config.animation || ''}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // ============================================
  // Render: Agent Output Card (Grid View)
  // ============================================

  const renderAgentCard = (agent: AgentOutputItem, index: number) => {
    const agentConfig = AGENT_CONFIG[agent.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
    const statusConfig = STATUS_CONFIG[agent.status] || STATUS_CONFIG.pending;
    const isSelected = selectedId === agent.id;
    const isExpanded = expandedIds.has(agent.id);
    const isHovered = hoveredId === agent.id;
    const showFull = showFullOutput.has(agent.id);
    const showError = showFullError.has(agent.id);

    return (
      <div
        key={agent.id}
        className={`
          relative bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-300
          ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg scale-[1.02]' : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md'}
          ${isHovered && !isSelected ? 'shadow-md' : ''}
          ${statusConfig.animation ? statusConfig.animation : ''}
          ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        style={{ transitionDelay: `${index * 50}ms` }}
        onClick={() => handleSelect(agent.id)}
        onMouseEnter={() => setHoveredId(agent.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agentConfig.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0 ${agent.status === 'executing' ? 'animate-pulse' : ''}`}>
              {agentConfig.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-secondary-900 dark:text-white truncate">{agent.agentName}</h4>
                {renderStatusBadge(agent.status)}
                {agent.priority && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${PRIORITY_CONFIG[agent.priority]?.bgColor} ${PRIORITY_CONFIG[agent.priority]?.color}`}>
                    {PRIORITY_CONFIG[agent.priority]?.icon}
                    {agent.priority}
                  </span>
                )}
                {agent.isFallback && (
                  <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Fallback
                  </span>
                )}
              </div>
              <p className="text-sm text-secondary-500 mt-0.5 truncate">{agent.task}</p>
            </div>
          </div>

          {/* Progress Bar (if executing) */}
          {agent.status === 'executing' && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-secondary-500">Progress</span>
                <span className="font-medium">{agent.progress}%</span>
              </div>
              <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${agent.progress}%` }} />
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="p-1.5 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
              <p className="text-xs text-secondary-500">Duration</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white">{formatDuration(agent.duration)}</p>
            </div>
            <div className="p-1.5 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
              <p className="text-xs text-secondary-500">Tokens</p>
              <p className="text-sm font-bold text-blue-600">{formatTokens(agent.tokensUsed)}</p>
            </div>
            <div className="p-1.5 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
              <p className="text-xs text-secondary-500">Cost</p>
              <p className="text-sm font-bold text-purple-600">{formatCost(agent.costUsd)}</p>
            </div>
          </div>

          {/* Error Preview */}
          {agent.error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 mb-3">
              <p className="line-clamp-2">{agent.error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pt-2 border-t border-secondary-100 dark:border-secondary-700">
            {agent.status === 'failed' && onRetry && (
              <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); onRetry(agent.id); }}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            <div className="flex-1" />
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleExpand(agent.id); }}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {isExpanded ? 'Less' : 'More'}
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700 space-y-3">
              {/* Full Output */}
              {agent.output && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-xs font-semibold text-secondary-500 uppercase">Output</h5>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleCopyOutput(typeof agent.output === 'string' ? agent.output : JSON.stringify(agent.output, null, 2)); }} className="text-xs text-primary-600">
                        <Copy className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleToggleFullOutput(agent.id); }} className="text-xs text-primary-600">
                        {showFull ? 'Collapse' : 'Expand'}
                      </button>
                    </div>
                  </div>
                  <pre className={`text-xs bg-secondary-50 dark:bg-secondary-900 p-2 rounded-lg font-mono overflow-x-auto ${showFull ? 'max-h-96' : 'max-h-24'}`}>
                    {typeof agent.output === 'string' ? agent.output : JSON.stringify(agent.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Full Error */}
              {agent.error && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-xs font-semibold text-red-500 uppercase">Error Details</h5>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleFullError(agent.id); }} className="text-xs text-primary-600">
                      {showError ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  <pre className={`text-xs bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-2 rounded-lg font-mono overflow-x-auto text-red-700 dark:text-red-300 ${showError ? 'max-h-96' : 'max-h-16'}`}>
                    {agent.error}
                    {agent.errorStack && '\n\n' + agent.errorStack}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-500">Model</span>
                  <span className="font-medium">{agent.model || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Provider</span>
                  <span className="font-medium">{agent.provider || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Started</span>
                  <span className="font-medium">{agent.startTime ? format(agent.startTime, 'HH:mm:ss') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Duration</span>
                  <span className="font-medium">{formatDuration(agent.duration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Agent Output Row (List View)
  // ============================================

  const renderAgentRow = (agent: AgentOutputItem, index: number) => {
    const agentConfig = AGENT_CONFIG[agent.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
    const isSelected = selectedId === agent.id;
    const isExpanded = expandedIds.has(agent.id);
    const showFull = showFullOutput.has(agent.id);

    return (
      <React.Fragment key={agent.id}>
        <tr
          className={`
            cursor-pointer transition-colors
            ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'}
            ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
          `}
          style={{ transitionDelay: `${index * 30}ms` }}
          onClick={() => handleSelect(agent.id)}
        >
          <td className="px-3 py-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agentConfig.gradient} flex items-center justify-center text-white flex-shrink-0 ${agent.status === 'executing' ? 'animate-pulse' : ''}`}>
                {agentConfig.icon}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-secondary-900 dark:text-white truncate text-sm">{agent.agentName}</p>
                <p className="text-xs text-secondary-500 truncate">{agent.task}</p>
              </div>
            </div>
          </td>
          <td className="px-3 py-3">
            {renderStatusBadge(agent.status)}
          </td>
          <td className="px-3 py-3 text-right text-sm font-medium">
            {formatDuration(agent.duration)}
          </td>
          <td className="px-3 py-3 text-right text-sm">
            {formatTokens(agent.tokensUsed)}
          </td>
          <td className="px-3 py-3 text-right text-sm font-medium text-purple-600">
            {formatCost(agent.costUsd)}
          </td>
          <td className="px-3 py-3 text-right">
            <div className="flex justify-end gap-1">
              {agent.status === 'failed' && onRetry && (
                <Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); onRetry(agent.id); }}>
                  Retry
                </Button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleExpand(agent.id); }}
                className="p-1 rounded hover:bg-secondary-100"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr className="bg-secondary-50 dark:bg-secondary-700/30">
            <td colSpan={6} className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Output</h5>
                  <pre className={`text-xs bg-secondary-100 dark:bg-secondary-900 p-3 rounded-lg font-mono overflow-x-auto ${showFull ? 'max-h-96' : 'max-h-32'}`}>
                    {agent.output ? (typeof agent.output === 'string' ? agent.output : JSON.stringify(agent.output, null, 2)) : 'No output'}
                  </pre>
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Details</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-secondary-500">Model</span><span>{agent.model || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-500">Provider</span><span>{agent.provider || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-500">Started</span><span>{agent.startTime ? format(agent.startTime, 'HH:mm:ss') : 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-500">Retries</span><span>{agent.retryCount}/{agent.maxRetries}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-500">Confidence</span><span>{agent.confidence ? `${(agent.confidence * 100).toFixed(0)}%` : 'N/A'}</span></div>
                  </div>
                </div>
              </div>
              {agent.error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm text-red-700 dark:text-red-300">
                  <strong>Error:</strong> {agent.error}
                </div>
              )}
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div className={`space-y-6 ${className} ${isFullscreen ? 'fixed inset-4 z-50 bg-white dark:bg-secondary-900 p-6 rounded-xl overflow-auto' : ''}`}>
        {/* Header */}
        {showHeader && (
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary-600" />
              <div>
                <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Multi-Agent Output</h2>
                <p className="text-sm text-secondary-500">
                  {outputs.length} agents • {summary?.completedAgents || 0} completed • {summary?.failedAgents || 0} failed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                {[
                  { id: 'grid', icon: <Grid3X3 className="h-4 w-4" />, label: 'Grid' },
                  { id: 'list', icon: <List className="h-4 w-4" />, label: 'List' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setViewMode(v.id as OutputViewMode)}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === v.id ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
                    title={v.label}
                  >
                    {v.icon}
                  </button>
                ))}
              </div>

              {/* Filter Button */}
              {showFilters && (
                <Button
                  variant={showFiltersPanel ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                  {(filters.status || filters.agentType || filters.hasError) && (
                    <span className="ml-1 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200 text-xs px-1.5 py-0.5 rounded-full">!</span>
                  )}
                </Button>
              )}

              {/* Export Button */}
              {showActions && (
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              )}

              {/* Fullscreen */}
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Summary */}
        {renderSummary()}

        {/* Filters Panel */}
        {renderFiltersPanel()}

        {/* Search Bar */}
        {showFilters && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && outputs.length === 0 && (
          <div className="space-y-4">
            <LoadingSkeleton type="card" count={4} />
          </div>
        )}

        {/* Error State */}
        {error && outputs.length === 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Execution Failed</h3>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            {onRetryAll && (
              <Button variant="primary" onClick={onRetryAll}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry All
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && outputs.length === 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-12 text-center">
            <Layers className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Agent Outputs</h3>
            <p className="text-secondary-500 max-w-md mx-auto">
              Execute a plan with multiple agents to see their outputs displayed here with detailed metrics.
            </p>
          </div>
        )}

        {/* Outputs Grid */}
        {outputs.length > 0 && viewMode === 'grid' && (
          <div
            ref={containerRef}
            style={{ maxHeight, overflowY: 'auto' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredOutputs.map((agent, index) => renderAgentCard(agent, index))}
          </div>
        )}

        {/* Outputs List */}
        {outputs.length > 0 && viewMode === 'list' && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                    >
                      <div className="flex items-center gap-1">Agent {getSortIcon('name')}</div>
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                    >
                      <div className="flex items-center gap-1">Status {getSortIcon('status')}</div>
                    </th>
                    <th
                      onClick={() => handleSort('duration')}
                      className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                    >
                      <div className="flex items-center justify-end gap-1">Duration {getSortIcon('duration')}</div>
                    </th>
                    <th
                      onClick={() => handleSort('tokens')}
                      className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                    >
                      <div className="flex items-center justify-end gap-1">Tokens {getSortIcon('tokens')}</div>
                    </th>
                    <th
                      onClick={() => handleSort('cost')}
                      className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                    >
                      <div className="flex items-center justify-end gap-1">Cost {getSortIcon('cost')}</div>
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {filteredOutputs.map((agent, index) => renderAgentRow(agent, index))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        {outputs.length > 0 && (
          <div className="text-center text-xs text-secondary-400 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            {outputs.length} agents • {formatCost(summary?.totalCost || 0)} total cost • {formatTokens(summary?.totalTokens || 0)} total tokens
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};


export default MultiAgentOutput;
