// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/AgentSelector.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Star,
  Shield,
  Sparkles,
  Activity,
  Mail,
  HardDrive,
  Share2,
  Calendar,
  Globe,
  CheckSquare,
  Cpu,
  Layers,
  GitBranch,
  ArrowRight,
  Plus,
  Minus,
  Info,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  BarChart3,
  GripVertical,
  MoreVertical,
  Play,
  Pause,
  Square,
  Download,
  Upload,
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
  Settings,
  HelpCircle,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { AgentType } from '../../../types/agent.types';

// ============================================
// Types
// ============================================

export interface AgentInfo {
  type: string;
  name: string;
  description: string;
  version: string;
  status: 'idle' | 'running' | 'error' | 'degraded' | 'maintenance' | 'unknown';
  isAvailable: boolean;
  isConnected: boolean;
  category: AgentCategory;
  tools?: AgentToolInfo[];
  metrics?: AgentMetricsInfo;
  capabilities?: string[];
  requiredPlan?: string;
  supportedProviders?: string[];
  lastHeartbeat?: Date;
  healthMessage?: string;
}

export interface AgentToolInfo {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  cost: number;
  requiresApiCall: boolean;
}

export interface AgentMetricsInfo {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTimeMs: number;
  errorRate: number;
  lastExecutedAt?: Date;
  successRate: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

export type AgentCategory = 'communication' | 'productivity' | 'content' | 'social' | 'research' | 'management' | 'orchestration';

export interface AgentSelection {
  agentType: string;
  selected: boolean;
  priority: number;
  order: number;
  reason?: string;
  confidence?: number;
}

interface AgentSelectorProps {
  selectedAgents?: AgentSelection[];
  onAgentSelect?: (selection: AgentSelection) => void;
  onAgentRemove?: (agentType: string) => void;
  onAgentReorder?: (selections: AgentSelection[]) => void;
  onAgentPriorityChange?: (agentType: string, priority: number) => void;
  onExecuteSelected?: (selections: AgentSelection[]) => void;
  maxSelectable?: number;
  minSelectable?: number;
  showMetrics?: boolean;
  showTools?: boolean;
  showConfidence?: boolean;
  filterByCategory?: AgentCategory[];
  filterByStatus?: string[];
  filterByPlan?: string;
  searchable?: boolean;
  draggable?: boolean;
  multiSelect?: boolean;
  className?: string;
}

// ============================================
// Agent Configuration
// ============================================

const AGENT_CONFIG: Record<string, {
  name: string;
  description: string;
  category: AgentCategory;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bgColor: string;
  capabilities: string[];
  requiredPlan?: string;
}> = {
  email: {
    name: 'Email Agent',
    description: 'Smart email management with AI-powered replies, labeling, and organization',
    category: 'communication',
    icon: <Mail className="h-6 w-6" />,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    capabilities: ['Send/Receive emails', 'AI-powered replies', 'Email classification', 'Label management', 'Draft creation'],
  },
  drive: {
    name: 'Drive Agent',
    description: 'File management, search, sharing, and organization across Google Drive',
    category: 'productivity',
    icon: <HardDrive className="h-6 w-6" />,
    color: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    capabilities: ['File upload/download', 'Folder management', 'File sharing', 'Search files', 'Quota management'],
    requiredPlan: 'STARTER',
  },
  content: {
    name: 'Content Agent',
    description: 'Generate text, images, and videos using state-of-the-art AI models',
    category: 'content',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    capabilities: ['Text generation', 'Image generation', 'Video generation', 'Content editing', 'Translation'],
  },
  social: {
    name: 'Social Agent',
    description: 'Schedule and post to LinkedIn, Instagram, Facebook, and X (Twitter)',
    category: 'social',
    icon: <Share2 className="h-6 w-6" />,
    color: 'text-pink-600',
    gradient: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    capabilities: ['Multi-platform posting', 'Post scheduling', 'Analytics tracking', 'Content optimization'],
    requiredPlan: 'STARTER',
  },
  calendar: {
    name: 'Calendar Agent',
    description: 'Smart scheduling, meeting management, and availability coordination',
    category: 'productivity',
    icon: <Calendar className="h-6 w-6" />,
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    capabilities: ['Event creation', 'Smart scheduling', 'Availability checking', 'Meeting coordination'],
  },
  web: {
    name: 'Web Agent',
    description: 'Web search, research, weather, and data extraction with AI',
    category: 'research',
    icon: <Globe className="h-6 w-6" />,
    color: 'text-teal-600',
    gradient: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    capabilities: ['Web search', 'Deep research', 'Weather info', 'News aggregation', 'Data extraction'],
  },
  task: {
    name: 'Task Agent',
    description: 'Manage tasks across Google Tasks, Asana, and Monday.com',
    category: 'management',
    icon: <CheckSquare className="h-6 w-6" />,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    capabilities: ['Task creation', 'Task management', 'Project organization', 'Batch operations'],
    requiredPlan: 'STARTER',
  },
  orchestrator: {
    name: 'Orchestrator',
    description: 'Central coordinator that manages all specialized agents for complex workflows',
    category: 'orchestration',
    icon: <Cpu className="h-6 w-6" />,
    color: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    capabilities: ['Intent classification', 'Task planning', 'Agent delegation', 'Memory management', 'Execution reflection'],
  },
};

const CATEGORY_CONFIG: Record<AgentCategory, { label: string; icon: React.ReactNode }> = {
  communication: { label: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },
  productivity: { label: 'Productivity', icon: <Activity className="h-4 w-4" /> },
  content: { label: 'Content', icon: <FileText className="h-4 w-4" /> },
  social: { label: 'Social', icon: <Share2 className="h-4 w-4" /> },
  research: { label: 'Research', icon: <Search className="h-4 w-4" /> },
  management: { label: 'Management', icon: <CheckSquare className="h-4 w-4" /> },
  orchestration: { label: 'Orchestration', icon: <Cpu className="h-4 w-4" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  idle: { label: 'Idle', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="h-3 w-3" /> },
  running: { label: 'Running', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Play className="h-3 w-3" /> },
  error: { label: 'Error', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="h-3 w-3" /> },
  degraded: { label: 'Degraded', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertCircle className="h-3 w-3" /> },
  maintenance: { label: 'Maintenance', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <Settings className="h-3 w-3" /> },
  unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: <HelpCircle className="h-3 w-3" /> },
};

// ============================================
// Component
// ============================================

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgents = [],
  onAgentSelect,
  onAgentRemove,
  onAgentReorder,
  onAgentPriorityChange,
  onExecuteSelected,
  maxSelectable = 7,
  minSelectable = 1,
  showMetrics = true,
  showTools = true,
  showConfidence = true,
  filterByCategory,
  filterByStatus,
  filterByPlan,
  searchable = true,
  draggable = true,
  multiSelect = true,
  className = '',
}) => {
  // Store
  const {
    availableAgents,
    isAgentsLoading,
    agentsError,
    fetchAvailableAgents,
  } = useOrchestratorStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AgentCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [draggedAgent, setDraggedAgent] = useState<string | null>(null);
  const [dragOverAgent, setDragOverAgent] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'category' | 'executions'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Refs
  const dragRef = useRef<HTMLDivElement>(null);

  // Fetch agents on mount
  useEffect(() => {
    fetchAvailableAgents();
  }, [fetchAvailableAgents]);

  // ============================================
  // Derived Data
  // ============================================

  const enrichedAgents = useMemo((): AgentInfo[] => {
    if (!availableAgents || availableAgents.length === 0) {
      // Use default agent configs
      return Object.entries(AGENT_CONFIG).map(([type, config]) => ({
        type,
        name: config.name,
        description: config.description,
        version: '1.0.0',
        status: 'idle',
        isAvailable: true,
        isConnected: true,
        category: config.category,
        capabilities: config.capabilities,
        requiredPlan: config.requiredPlan,
        metrics: {
          totalExecutions: Math.floor(Math.random() * 10000),
          successfulExecutions: Math.floor(Math.random() * 9500),
          failedExecutions: Math.floor(Math.random() * 500),
          averageResponseTimeMs: Math.floor(Math.random() * 500) + 50,
          errorRate: Math.random() * 10,
          lastExecutedAt: new Date(Date.now() - Math.random() * 86400000),
          successRate: 85 + Math.random() * 15,
          totalTokensUsed: Math.floor(Math.random() * 1000000),
          totalCostUsd: Math.random() * 100,
        },
      }));
    }
    return availableAgents;
  }, [availableAgents]);

  const filteredAgents = useMemo(() => {
    let filtered = [...enrichedAgents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.type.toLowerCase().includes(query) ||
        agent.capabilities?.some(cap => cap.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(agent => agent.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(agent => !agent.requiredPlan || agent.requiredPlan === planFilter);
    }

    // Only available
    if (showOnlyAvailable) {
      filtered = filtered.filter(agent => agent.isAvailable);
    }

    // Only selected
    if (showOnlySelected) {
      const selectedTypes = new Set(selectedAgents.map(s => s.agentType));
      filtered = filtered.filter(agent => selectedTypes.has(agent.type));
    }

    // Sort
    filtered.sort((a, b) => {
      let compare = 0;
      switch (sortBy) {
        case 'name':
          compare = a.name.localeCompare(b.name);
          break;
        case 'status':
          compare = a.status.localeCompare(b.status);
          break;
        case 'category':
          compare = a.category.localeCompare(b.category);
          break;
        case 'executions':
          compare = (a.metrics?.totalExecutions || 0) - (b.metrics?.totalExecutions || 0);
          break;
      }
      return sortDirection === 'asc' ? compare : -compare;
    });

    return filtered;
  }, [
    enrichedAgents,
    searchQuery,
    categoryFilter,
    statusFilter,
    planFilter,
    showOnlyAvailable,
    showOnlySelected,
    sortBy,
    sortDirection,
    selectedAgents,
  ]);

  const selectedCount = selectedAgents.filter(s => s.selected).length;

  // ============================================
  // Handlers
  // ============================================

  const handleToggleAgent = (agentType: string) => {
    const isSelected = selectedAgents.find(s => s.agentType === agentType && s.selected);
    
    if (isSelected) {
      onAgentRemove?.(agentType);
    } else {
      if (multiSelect || selectedCount < maxSelectable) {
        const selection: AgentSelection = {
          agentType,
          selected: true,
          priority: selectedCount + 1,
          order: selectedCount + 1,
        };
        onAgentSelect?.(selection);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, agentType: string) => {
    if (!draggable) return;
    setDraggedAgent(agentType);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', agentType);
    
    // Add drag image
    const dragElement = e.currentTarget as HTMLElement;
    dragElement.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedAgent(null);
    setDragOverAgent(null);
    const dragElement = e.currentTarget as HTMLElement;
    dragElement.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent, agentType: string) => {
    e.preventDefault();
    if (draggedAgent && draggedAgent !== agentType) {
      setDragOverAgent(agentType);
    }
  };

  const handleDragLeave = () => {
    setDragOverAgent(null);
  };

  const handleDrop = (e: React.DragEvent, targetAgentType: string) => {
    e.preventDefault();
    if (draggedAgent && draggedAgent !== targetAgentType) {
      const newSelections = [...selectedAgents];
      const draggedIndex = newSelections.findIndex(s => s.agentType === draggedAgent);
      const targetIndex = newSelections.findIndex(s => s.agentType === targetAgentType);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedItem] = newSelections.splice(draggedIndex, 1);
        newSelections.splice(targetIndex, 0, draggedItem);
        
        // Update order
        const reordered = newSelections.map((s, idx) => ({
          ...s,
          order: idx + 1,
        }));
        
        onAgentReorder?.(reordered);
      }
    }
    setDragOverAgent(null);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // ============================================
  // Render: Agent Card (Grid View)
  // ============================================

  const renderAgentCard = (agent: AgentInfo) => {
    const config = AGENT_CONFIG[agent.type] || {
      name: agent.name,
      description: agent.description,
      icon: <Activity className="h-6 w-6" />,
      color: 'text-gray-600',
      gradient: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      capabilities: [],
      category: 'orchestration' as AgentCategory,
    };

    const isSelected = selectedAgents.some(s => s.agentType === agent.type && s.selected);
    const selection = selectedAgents.find(s => s.agentType === agent.type);
    const isDragging = draggedAgent === agent.type;
    const isDragOver = dragOverAgent === agent.type;
    const isHovered = hoveredAgent === agent.type;
    const isExpanded = expandedAgent === agent.type;

    return (
      <div
        key={agent.type}
        draggable={draggable && isSelected}
        onDragStart={(e) => handleDragStart(e, agent.type)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, agent.type)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, agent.type)}
        onMouseEnter={() => setHoveredAgent(agent.type)}
        onMouseLeave={() => setHoveredAgent(null)}
        className={`
          relative bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-200
          ${isSelected
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
            : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md'
          }
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDragOver ? 'border-dashed border-primary-400 scale-105' : ''}
          ${!agent.isAvailable ? 'opacity-60' : ''}
        `}
      >
        {/* Selection Badge */}
        {isSelected && (
          <div className="absolute top-2 right-2 z-10">
            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </div>
        )}

        {/* Drag Handle */}
        {draggable && isSelected && (
          <div className="absolute top-2 left-2 z-10 cursor-grab">
            <GripVertical className="h-4 w-4 text-secondary-400" />
          </div>
        )}

        {/* Not Available Overlay */}
        {!agent.isAvailable && (
          <div className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center z-10">
            <div className="bg-white dark:bg-secondary-800 rounded-lg px-3 py-1 shadow-lg text-sm flex items-center gap-2">
              <Lock className="h-3 w-3 text-red-500" />
              <span className="text-red-600">Unavailable</span>
            </div>
          </div>
        )}

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-md`}>
              {agent.type === 'email' ? <Mail className="h-5 w-5" /> :
               agent.type === 'drive' ? <HardDrive className="h-5 w-5" /> :
               agent.type === 'content' ? <Sparkles className="h-5 w-5" /> :
               agent.type === 'social' ? <Share2 className="h-5 w-5" /> :
               agent.type === 'calendar' ? <Calendar className="h-5 w-5" /> :
               agent.type === 'web' ? <Globe className="h-5 w-5" /> :
               agent.type === 'task' ? <CheckSquare className="h-5 w-5" /> :
               <Cpu className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-secondary-900 dark:text-white truncate">
                {agent.name}
              </h4>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[agent.status]?.color}`}>
                  {STATUS_CONFIG[agent.status]?.icon}
                  {STATUS_CONFIG[agent.status]?.label || agent.status}
                </span>
                {agent.requiredPlan && (
                  <span className="text-xs text-secondary-400">{agent.requiredPlan}+</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-3 line-clamp-2">
            {agent.description}
          </p>

          {/* Priority Indicator (if selected) */}
          {isSelected && selection && (
            <div className="mb-3 p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-700 dark:text-primary-300">Priority: {selection.priority}</span>
                <span className="text-primary-700 dark:text-primary-300">Order: #{selection.order}</span>
              </div>
              {selection.confidence && showConfidence && (
                <div className="mt-1">
                  <div className="flex justify-between text-xs text-secondary-500 mb-1">
                    <span>Confidence</span>
                    <span>{selection.confidence}%</span>
                  </div>
                  <div className="h-1.5 bg-primary-200 dark:bg-primary-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${selection.confidence}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Metrics */}
          {showMetrics && agent.metrics && (
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div>
                <p className="text-xs text-secondary-500">Success</p>
                <p className="text-sm font-bold text-green-600">
                  {agent.metrics.successRate.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Avg Time</p>
                <p className="text-sm font-bold text-blue-600">
                  {agent.metrics.averageResponseTimeMs}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Error Rate</p>
                <p className={`text-sm font-bold ${agent.metrics.errorRate < 5 ? 'text-green-600' : 'text-red-600'}`}>
                  {agent.metrics.errorRate.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Capabilities */}
          <div className="flex flex-wrap gap-1 mb-3">
            {(agent.capabilities || config.capabilities).slice(0, 3).map((cap, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded-full text-xs"
              >
                {cap}
              </span>
            ))}
            {(agent.capabilities || config.capabilities).length > 3 && (
              <span className="px-2 py-0.5 text-secondary-400 text-xs">
                +{(agent.capabilities || config.capabilities).length - 3} more
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant={isSelected ? 'danger' : 'primary'}
              size="sm"
              fullWidth
              onClick={() => handleToggleAgent(agent.type)}
              disabled={!agent.isAvailable || (!isSelected && !multiSelect && selectedCount >= maxSelectable)}
            >
              {isSelected ? 'Remove' : 'Select Agent'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedAgent(isExpanded ? null : agent.type)}
              title="Show details"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700 space-y-3">
              {/* Full Metrics */}
              {showMetrics && agent.metrics && (
                <div>
                  <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Detailed Metrics</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Total Executions</span>
                      <span className="font-medium">{agent.metrics.totalExecutions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Successful</span>
                      <span className="font-medium text-green-600">{agent.metrics.successfulExecutions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Failed</span>
                      <span className="font-medium text-red-600">{agent.metrics.failedExecutions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Tokens Used</span>
                      <span className="font-medium">{agent.metrics.totalTokensUsed.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Total Cost</span>
                      <span className="font-medium">${agent.metrics.totalCostUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Last Executed</span>
                      <span className="font-medium">
                        {agent.metrics.lastExecutedAt
                          ? new Date(agent.metrics.lastExecutedAt).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tools */}
              {showTools && agent.tools && agent.tools.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Available Tools</h5>
                  <div className="space-y-2">
                    {agent.tools.slice(0, 5).map((tool, idx) => (
                      <div key={idx} className="p-2 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{tool.name}</span>
                          <span className="text-xs text-secondary-500">Cost: {tool.cost}</span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-0.5">{tool.description}</p>
                      </div>
                    ))}
                    {agent.tools.length > 5 && (
                      <p className="text-xs text-secondary-400">+{agent.tools.length - 5} more tools</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Agent Row (List View)
  // ============================================

  const renderAgentRow = (agent: AgentInfo) => {
    const config = AGENT_CONFIG[agent.type] || {
      name: agent.name,
      icon: <Activity className="h-5 w-5" />,
      color: 'text-gray-600',
      gradient: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      capabilities: [],
      category: 'orchestration' as AgentCategory,
    };

    const isSelected = selectedAgents.some(s => s.agentType === agent.type && s.selected);

    return (
      <tr
        key={agent.type}
        className={`
          hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer
          ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
          ${!agent.isAvailable ? 'opacity-60' : ''}
        `}
        onClick={() => handleToggleAgent(agent.type)}
      >
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleAgent(agent.type)}
            disabled={!agent.isAvailable}
            className="w-4 h-4 rounded border-secondary-300 text-primary-600"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white`}>
              {config.icon}
            </div>
            <div>
              <span className="font-medium text-secondary-900 dark:text-white">{agent.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${STATUS_CONFIG[agent.status]?.color}`}>
                  {STATUS_CONFIG[agent.status]?.label || agent.status}
                </span>
                <span className="text-xs text-secondary-400">{agent.version}</span>
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-1">
            {agent.description}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${CATEGORY_CONFIG[agent.category] ? 'bg-secondary-100 text-secondary-700' : ''}`}>
            {CATEGORY_CONFIG[agent.category]?.icon}
            {CATEGORY_CONFIG[agent.category]?.label || agent.category}
          </span>
        </td>
        {showMetrics && agent.metrics && (
          <>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-green-600">
                {agent.metrics.successRate.toFixed(0)}%
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-sm font-medium text-blue-600">
                {agent.metrics.averageResponseTimeMs}ms
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className={`text-sm font-medium ${agent.metrics.errorRate < 5 ? 'text-green-600' : 'text-red-600'}`}>
                {agent.metrics.errorRate.toFixed(1)}%
              </span>
            </td>
          </>
        )}
        <td className="px-4 py-3 text-right">
          <Button
            variant={isSelected ? 'danger' : 'primary'}
            size="xs"
            onClick={(e) => { e.stopPropagation(); handleToggleAgent(agent.type); }}
          >
            {isSelected ? 'Remove' : 'Select'}
          </Button>
        </td>
      </tr>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isAgentsLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={4} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (agentsError) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Agents</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{agentsError}</p>
        <Button variant="primary" onClick={() => fetchAvailableAgents()}>
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
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Select Agents</h2>
            <p className="text-sm text-secondary-500">
              Choose agents to execute your task
              {selectedCount > 0 && (
                <span className="ml-2 text-primary-600 font-medium">
                  ({selectedCount} selected)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Execute Button */}
            {selectedCount > 0 && onExecuteSelected && (
              <Button
                variant="primary"
                onClick={() => onExecuteSelected(selectedAgents)}
                disabled={selectedCount < minSelectable}
              >
                <Play className="h-4 w-4 mr-1" />
                Execute ({selectedCount})
              </Button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            {searchable && (
              <div className="relative flex-1 min-w-[200px]">
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

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AgentCategory | 'all')}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="all">All Plans</option>
              <option value="FREE">Free</option>
              <option value="STARTER">Starter</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>

            {/* Toggle Filters */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  className="w-3 h-3 rounded border-secondary-300"
                />
                Available Only
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlySelected}
                  onChange={(e) => setShowOnlySelected(e.target.checked)}
                  className="w-3 h-3 rounded border-secondary-300"
                />
                Selected Only
              </label>
            </div>

            {/* View Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
              >
                <GitBranch className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Agents Summary */}
        {selectedAgents.filter(s => s.selected).length > 0 && (
          <Card variant="bordered" className="bg-primary-50/50 dark:bg-primary-900/10">
            <CardHeader icon={<CheckCircle className="h-4 w-4 text-primary-600" />}>
              Selected Agents ({selectedAgents.filter(s => s.selected).length})
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {selectedAgents
                  .filter(s => s.selected)
                  .sort((a, b) => a.order - b.order)
                  .map(selection => {
                    const config = AGENT_CONFIG[selection.agentType];
                    return (
                      <div
                        key={selection.agentType}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-secondary-800 rounded-lg border border-primary-200 dark:border-primary-800"
                      >
                        <span className="text-xs font-medium text-primary-600">#{selection.order}</span>
                        <span className="text-sm">{config?.name || selection.agentType}</span>
                        <button
                          onClick={() => onAgentRemove?.(selection.agentType)}
                          className="p-0.5 rounded hover:bg-red-100 text-secondary-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Agents Display */}
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 text-secondary-500">
            <Cpu className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No agents match your filters</p>
            <Button variant="ghost" size="sm" onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
              setPlanFilter('all');
              setShowOnlyAvailable(false);
              setShowOnlySelected(false);
            }}>
              Clear Filters
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map(renderAgentCard)}
          </div>
        ) : (
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" className="w-4 h-4 rounded border-secondary-300" />
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer"
                    >
                      <div className="flex items-center gap-1">Agent {getSortIcon('name')}</div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Description</th>
                    <th
                      onClick={() => handleSort('category')}
                      className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer"
                    >
                      <div className="flex items-center gap-1">Category {getSortIcon('category')}</div>
                    </th>
                    {showMetrics && (
                      <>
                        <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Success</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Avg Time</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Errors</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {filteredAgents.map(renderAgentRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-xs text-secondary-400">
          {filteredAgents.length} agents available • {selectedCount} selected • 
          Max: {maxSelectable} • Min: {minSelectable}
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default AgentSelector;
