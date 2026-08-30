// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/MemoryList.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Brain,
  Search,
  Filter,
  Plus,
  Trash2,
  Star,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Save,
  Eye,
  EyeOff,
  MoreVertical,
  Edit,
  Copy,
  Share2,
  Bookmark,
  Lightbulb,
  Zap,
  Layers,
  GitBranch,
  ArrowRight,
  Info,
  X,
  Shield,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  FileText,
  MessageSquare,
  Calendar,
  User,
  Settings,
  HelpCircle,
  Minus,
  Sparkles,
  Target,
  Award,
  Flame,
  Snowflake,
  Sun,
  Moon,
  Cloud,
  Database,
  Cpu,
  ExternalLink,
  Maximize2,
  Minimize2,
  List,
  Grid3X3,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  GripVertical,
  Link,
  Unlink,
  Move,
  History,
  RotateCcw,
  Play,
  Pause,
  StopCircle,
  Send,
  Mail,
  HardDrive,
  Globe,
  DollarSign,
  Gauge,
  Timer,
  Users,
  Wifi,
  Code,
  Image,
  Video,
  Music,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { Progress } from '../common/Progress';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { MemoryEntry, MemoryType, MemoryRetrievalOptions, MemoryRetrievalResult } from '../../../types/orchestrator.types';
import { format, formatDistanceToNow, formatDuration } from 'date-fns';

// ============================================
// Types
// ============================================

export type MemoryViewMode = 'grid' | 'list' | 'compact' | 'analytics';

export interface MemoryListItem extends MemoryEntry {
  isExpanded?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
  isNew?: boolean;
  similarity?: number;
}

export interface MemoryFilterOptions {
  types: MemoryType[];
  minImportance: number;
  maxAge: number;
  sources: string[];
  agents: string[];
  tags: string[];
  sessionId?: string;
  searchQuery: string;
}

export interface MemorySortOptions {
  field: 'importance' | 'recency' | 'accessCount' | 'similarity' | 'size';
  direction: 'asc' | 'desc';
}

export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  averageImportance: number;
  totalTokens: number;
  totalCost: number;
  oldestMemory: Date;
  newestMemory: Date;
  byAgent: Record<string, number>;
  bySource: Record<string, number>;
}

interface MemoryListProps {
  memories?: MemoryListItem[];
  stats?: MemoryStats;
  filters?: MemoryFilterOptions;
  sort?: MemorySortOptions;
  isLoading?: boolean;
  error?: string | null;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: Partial<MemoryFilterOptions>) => void;
  onSortChange?: (sort: MemorySortOptions) => void;
  onMemoryClick?: (memory: MemoryListItem) => void;
  onMemorySelect?: (memoryId: string) => void;
  onMemoryDelete?: (memoryId: string) => void;
  onMemoryEdit?: (memoryId: string, content: string) => void;
  onMemoryCreate?: (memory: Partial<MemoryEntry>) => void;
  onMemoryStar?: (memoryId: string) => void;
  onMemoryExport?: (memories: MemoryListItem[]) => void;
  onMemoryImport?: () => void;
  onBulkDelete?: (memoryIds: string[]) => void;
  onRefresh?: () => void;
  onConsolidate?: () => void;
  onClearFilters?: () => void;
  className?: string;
  maxHeight?: string;
  showFilters?: boolean;
  showSearch?: boolean;
  showActions?: boolean;
  showStats?: boolean;
  selectable?: boolean;
  draggable?: boolean;
}

// ============================================
// Memory Type Configuration
// ============================================

const MEMORY_TYPE_CONFIG: Record<MemoryType, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  gradient: string;
  borderColor: string;
}> = {
  short_term: {
    label: 'Short Term',
    description: 'Temporary working memory',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    gradient: 'from-yellow-500 to-yellow-600',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
  },
  long_term: {
    label: 'Long Term',
    description: 'Persistent memory storage',
    icon: <Database className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  episodic: {
    label: 'Episodic',
    description: 'Event-based memories',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    gradient: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  semantic: {
    label: 'Semantic',
    description: 'Factual knowledge',
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    gradient: 'from-green-500 to-green-600',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  procedural: {
    label: 'Procedural',
    description: 'How-to knowledge',
    icon: <Settings className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    gradient: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
  working: {
    label: 'Working',
    description: 'Active task memory',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    gradient: 'from-teal-500 to-teal-600',
    borderColor: 'border-teal-300 dark:border-teal-700',
  },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  user_input: { label: 'User Input', icon: <User className="h-3 w-3" />, color: 'text-blue-500' },
  agent_output: { label: 'Agent Output', icon: <Cpu className="h-3 w-3" />, color: 'text-green-500' },
  reflection: { label: 'Reflection', icon: <Brain className="h-3 w-3" />, color: 'text-purple-500' },
  system: { label: 'System', icon: <Settings className="h-3 w-3" />, color: 'text-gray-500' },
  external: { label: 'External', icon: <Cloud className="h-3 w-3" />, color: 'text-orange-500' },
};

const IMPORTANCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; threshold: number }> = {
  critical: { label: 'Critical', icon: <Flame className="h-3 w-3" />, threshold: 0.9 },
  high: { label: 'High', icon: <Star className="h-3 w-3" />, threshold: 0.7 },
  medium: { label: 'Medium', icon: <Target className="h-3 w-3" />, threshold: 0.4 },
  low: { label: 'Low', icon: <Snowflake className="h-3 w-3" />, threshold: 0.0 },
};

// ============================================
// Component
// ============================================

export const MemoryList: React.FC<MemoryListProps> = ({
  memories: externalMemories,
  stats: externalStats,
  filters: externalFilters,
  sort: externalSort,
  isLoading = false,
  error = null,
  onSearch,
  onFilterChange,
  onSortChange,
  onMemoryClick,
  onMemorySelect,
  onMemoryDelete,
  onMemoryEdit,
  onMemoryCreate,
  onMemoryStar,
  onMemoryExport,
  onMemoryImport,
  onBulkDelete,
  onRefresh,
  onConsolidate,
  onClearFilters,
  className = '',
  maxHeight = '600px',
  showFilters = true,
  showSearch = true,
  showActions = true,
  showStats = true,
  selectable = true,
  draggable = false,
}) => {
  // Store
  const {
    memories,
    memoryStats,
    isMemoryLoading,
    memoryError,
    fetchMemories,
    searchMemories,
    storeMemory,
    deleteMemory,
    updateMemory,
    starMemory,
    consolidateMemories,
    clearMemories,
    getMemoryStats,
  } = useOrchestratorStore();

  // Local state
  const [viewMode, setViewMode] = useState<MemoryViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<MemoryType>>(new Set());
  const [minImportance, setMinImportance] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<MemorySortOptions['field']>('recency');
  const [sortDirection, setSortDirection] = useState<MemorySortOptions['direction']>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>('short_term');
  const [newMemoryImportance, setNewMemoryImportance] = useState(0.5);
  const [newMemoryTags, setNewMemoryTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Derived data
  const displayMemories = externalMemories || memories || [];
  const displayStats = externalStats || memoryStats;

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      onSearch?.(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  // ============================================
  // Filtered & Sorted Memories
  // ============================================

  const filteredMemories = useMemo(() => {
    let filtered = [...displayMemories];

    // Type filter
    if (typeFilters.size > 0) {
      filtered = filtered.filter(m => typeFilters.has(m.type));
    }

    // Importance filter
    if (minImportance > 0) {
      filtered = filtered.filter(m => m.importance >= minImportance);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(m => m.source === sourceFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let compare = 0;
      switch (sortField) {
        case 'importance':
          compare = b.importance - a.importance;
          break;
        case 'recency':
          compare = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          break;
        case 'accessCount':
          compare = (b.accessCount || 0) - (a.accessCount || 0);
          break;
        case 'similarity':
          compare = (b.similarity || 0) - (a.similarity || 0);
          break;
        case 'size':
          compare = b.content.length - a.content.length;
          break;
      }
      return sortDirection === 'asc' ? -compare : compare;
    });

    return filtered;
  }, [displayMemories, typeFilters, minImportance, sourceFilter, sortField, sortDirection]);

  // ============================================
  // Handlers
  // ============================================

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredMemories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMemories.map(m => m.id)));
    }
  }, [selectedIds, filteredMemories]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this memory?')) {
      deleteMemory?.(id);
      onMemoryDelete?.(id);
    }
  }, [deleteMemory, onMemoryDelete]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} memories?`)) {
      onBulkDelete?.(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds, onBulkDelete]);

  const handleEdit = useCallback((id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    if (editContent.trim()) {
      onMemoryEdit?.(id, editContent);
      updateMemory?.(id, { content: editContent });
    }
    setEditingId(null);
    setEditContent('');
  }, [editContent, onMemoryEdit, updateMemory]);

  const handleCreate = useCallback(() => {
    if (!newMemoryContent.trim()) return;
    onMemoryCreate?.({
      content: newMemoryContent,
      type: newMemoryType,
      importance: newMemoryImportance,
      tags: newMemoryTags,
      source: 'user_input',
    });
    storeMemory?.(newMemoryContent, newMemoryType, newMemoryImportance, {
      tags: newMemoryTags,
      source: 'user_input',
    });
    setNewMemoryContent('');
    setNewMemoryTags([]);
    setShowCreateForm(false);
  }, [newMemoryContent, newMemoryType, newMemoryImportance, newMemoryTags, onMemoryCreate, storeMemory]);

  const handleAddTag = useCallback(() => {
    if (newTagInput.trim() && !newMemoryTags.includes(newTagInput.trim())) {
      setNewMemoryTags(prev => [...prev, newTagInput.trim()]);
      setNewTagInput('');
    }
  }, [newTagInput, newMemoryTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setNewMemoryTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleToggleTypeFilter = useCallback((type: MemoryType) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((field: MemorySortOptions['field']) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    onSortChange?.({ field, direction: sortDirection });
  }, [sortField, sortDirection, onSortChange]);

  // ============================================
  // Formatting Helpers
  // ============================================

  const formatImportance = (importance: number): { label: string; color: string; icon: React.ReactNode } => {
    if (importance >= 0.9) return { label: 'Critical', color: 'text-red-600', icon: <Flame className="h-3 w-3" /> };
    if (importance >= 0.7) return { label: 'High', color: 'text-orange-600', icon: <Star className="h-3 w-3" /> };
    if (importance >= 0.4) return { label: 'Medium', color: 'text-yellow-600', icon: <Target className="h-3 w-3" /> };
    return { label: 'Low', color: 'text-green-600', icon: <Snowflake className="h-3 w-3" /> };
  };

  const getSortIcon = (field: MemorySortOptions['field']) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // ============================================
  // Render: Memory Card (Grid View)
  // ============================================

  const renderMemoryCard = (memory: MemoryListItem, index: number) => {
    const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.short_term;
    const isSelected = selectedIds.has(memory.id);
    const isExpanded = expandedIds.has(memory.id);
    const isEditing = editingId === memory.id;
    const isHovered = hoveredId === memory.id;
    const importance = formatImportance(memory.importance);
    const sourceConfig = memory.source ? SOURCE_CONFIG[memory.source] : null;

    return (
      <div
        key={memory.id}
        className={`
          relative bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-300 group
          ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg scale-[1.02]' : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md'}
          ${isHovered && !isSelected ? 'shadow-md' : ''}
          ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
        style={{ transitionDelay: `${index * 50}ms` }}
        onMouseEnter={() => setHoveredId(memory.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Selection Checkbox */}
        {selectable && (
          <div className="absolute top-3 left-3 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect(memory.id); }}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400 bg-white dark:bg-secondary-800'
              }`}
            >
              {isSelected && <CheckCircle className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Star Button */}
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onMemoryStar?.(memory.id); starMemory?.(memory.id); }}
            className={`p-1.5 rounded-lg transition-colors ${
              memory.metadata?.starred ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400'
            }`}
          >
            <Star className={`h-4 w-4 ${memory.metadata?.starred ? 'fill-yellow-400' : ''}`} />
          </button>
        </div>

        <div className="p-5" onClick={() => onMemoryClick?.(memory)}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-3 mt-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
              {typeConfig.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${importance.color}`}>
                  {importance.icon}
                  {importance.label}
                </span>
              </div>
              <p className="text-xs text-secondary-400 mt-0.5">
                {formatDistanceToNow(memory.timestamp, { addSuffix: true })}
                {memory.accessCount && memory.accessCount > 0 ? ` • ${memory.accessCount} accesses` : ''}
              </p>
            </div>
          </div>

          {/* Content Preview */}
          <p className="text-sm text-secondary-700 dark:text-secondary-300 mb-3 line-clamp-3 leading-relaxed">
            {memory.content}
          </p>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
            {sourceConfig && (
              <span className={`flex items-center gap-1 ${sourceConfig.color}`}>
                {sourceConfig.icon}
                {sourceConfig.label}
              </span>
            )}
            {memory.agentType && (
              <span className="text-secondary-400 flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                {memory.agentType}
              </span>
            )}
            {memory.similarity !== undefined && (
              <span className="text-blue-500 flex items-center gap-1">
                <Target className="h-3 w-3" />
                {(memory.similarity * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {memory.tags.slice(0, 4).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded-full text-xs">
                  {tag}
                </span>
              ))}
              {memory.tags.length > 4 && (
                <span className="text-xs text-secondary-400">+{memory.tags.length - 4}</span>
              )}
            </div>
          )}

          {/* Importance Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-secondary-500 mb-1">
              <span>Importance</span>
              <span>{(memory.importance * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  memory.importance >= 0.7 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                  memory.importance >= 0.4 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  'bg-gradient-to-r from-green-500 to-blue-500'
                }`}
                style={{ width: `${memory.importance * 100}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-secondary-100 dark:border-secondary-700">
            <button
              onClick={(e) => { e.stopPropagation(); handleExpand(memory.id); }}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(memory.id, memory.content); }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400"
                title="Edit"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(memory.content); }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-400"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700 space-y-3">
              {/* Full Content */}
              <div>
                <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Content</h5>
                <p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap leading-relaxed">
                  {memory.content}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-500">ID</span>
                  <span className="font-mono text-xs">{memory.id.substring(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Type</span>
                  <span className="text-secondary-700 dark:text-secondary-300">{typeConfig.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Importance</span>
                  <span className="text-secondary-700 dark:text-secondary-300">{(memory.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Accesses</span>
                  <span className="text-secondary-700 dark:text-secondary-300">{memory.accessCount || 0}</span>
                </div>
                {memory.lastAccessedAt && (
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Last Accessed</span>
                    <span className="text-secondary-700 dark:text-secondary-300">
                      {format(memory.lastAccessedAt, 'MMM d, HH:mm')}
                    </span>
                  </div>
                )}
                {memory.ttlHours && (
                  <div className="flex justify-between">
                    <span className="text-secondary-500">TTL</span>
                    <span className="text-secondary-700 dark:text-secondary-300">{memory.ttlHours}h</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Metadata</h5>
                  <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-2 rounded-lg overflow-x-auto max-h-32 font-mono">
                    {JSON.stringify(memory.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <div className="absolute inset-0 bg-white dark:bg-secondary-800 rounded-xl z-20 p-5 flex flex-col">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 resize-y min-h-[100px]"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleSaveEdit(memory.id)}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Memory Row (List View)
  // ============================================

  const renderMemoryRow = (memory: MemoryListItem, index: number) => {
    const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.short_term;
    const isSelected = selectedIds.has(memory.id);
    const isExpanded = expandedIds.has(memory.id);
    const importance = formatImportance(memory.importance);

    return (
      <div
        key={memory.id}
        className={`
          flex items-center gap-4 px-4 py-3 border-b border-secondary-100 dark:border-secondary-800 transition-colors cursor-pointer
          ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'}
          ${animateIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
        `}
        style={{ transitionDelay: `${index * 30}ms` }}
        onClick={() => onMemoryClick?.(memory)}
      >
        {/* Checkbox */}
        {selectable && (
          <button
            onClick={(e) => { e.stopPropagation(); handleSelect(memory.id); }}
            className="flex-shrink-0"
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-primary-600" />
            ) : (
              <Square className="h-5 w-5 text-secondary-400" />
            )}
          </button>
        )}

        {/* Type Icon */}
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center text-white flex-shrink-0`}>
          {typeConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${importance.color}`}>
              {importance.icon}
              {(memory.importance * 100).toFixed(0)}%
            </span>
            {memory.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-xs text-secondary-500">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-secondary-700 dark:text-secondary-300 truncate">{memory.content}</p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-secondary-400 flex-shrink-0">
          {memory.source && SOURCE_CONFIG[memory.source] && (
            <span className={`flex items-center gap-1 ${SOURCE_CONFIG[memory.source].color}`}>
              {SOURCE_CONFIG[memory.source].icon}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(memory.timestamp, { addSuffix: true })}
          </span>
          {memory.accessCount && memory.accessCount > 0 && (
            <span>{memory.accessCount} views</span>
          )}
          {memory.similarity !== undefined && (
            <span className="text-blue-500">{(memory.similarity * 100).toFixed(0)}% match</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleExpand(memory.id); }}
            className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Compact View
  // ============================================

  const renderCompactView = () => (
    <div className="space-y-1">
      {filteredMemories.map((memory, index) => {
        const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.short_term;
        const isSelected = selectedIds.has(memory.id);

        return (
          <div
            key={memory.id}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors
              ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'}
            `}
            onClick={() => onMemoryClick?.(memory)}
          >
            <div className={`w-2 h-2 rounded-full ${typeConfig.color.replace('text-', 'bg-')} flex-shrink-0`} />
            <span className="text-secondary-700 dark:text-secondary-300 truncate flex-1 min-w-0">
              {memory.content}
            </span>
            <span className="text-xs text-secondary-400 flex-shrink-0">
              {formatDistanceToNow(memory.timestamp, { addSuffix: true })}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ============================================
  // Render: Analytics View
  // ============================================

  const renderAnalyticsView = () => {
    if (!displayStats && filteredMemories.length === 0) {
      return (
        <div className="text-center py-8 text-secondary-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No analytics data available</p>
        </div>
      );
    }

    const typeDistribution = Object.entries(MEMORY_TYPE_CONFIG)
      .map(([type, config]) => ({
        type: type as MemoryType,
        label: config.label,
        color: config.color.replace('text-', 'bg-'),
        count: filteredMemories.filter(m => m.type === type).length,
        icon: config.icon,
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...typeDistribution.map(d => d.count), 1);
    const avgImportance = filteredMemories.length > 0
      ? filteredMemories.reduce((sum, m) => sum + m.importance, 0) / filteredMemories.length
      : 0;

    const sourceDistribution = Object.entries(SOURCE_CONFIG)
      .map(([source, config]) => ({
        source,
        label: config.label,
        color: config.color,
        icon: config.icon,
        count: filteredMemories.filter(m => m.source === source).length,
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    const importanceDistribution = Object.entries(IMPORTANCE_CONFIG)
      .map(([level, config]) => ({
        level,
        label: config.label,
        icon: config.icon,
        min: config.threshold,
        max: level === 'critical' ? 1 :
             level === 'high' ? IMPORTANCE_CONFIG.critical.threshold :
             level === 'medium' ? IMPORTANCE_CONFIG.high.threshold :
             IMPORTANCE_CONFIG.medium.threshold,
        count: filteredMemories.filter(m =>
          m.importance >= config.threshold &&
          m.importance < (level === 'low' ? 1 :
            Object.values(IMPORTANCE_CONFIG).find(c => c.threshold > config.threshold)?.threshold || 1)
        ).length,
      }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);

    const maxSourceCount = Math.max(...sourceDistribution.map(d => d.count), 1);
    const maxImportanceCount = Math.max(...importanceDistribution.map(d => d.count), 1);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Brain className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{filteredMemories.length}</p>
            <p className="text-xs text-secondary-500">Total Memories</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">
              {filteredMemories.filter(m => m.type === 'short_term').length}
            </p>
            <p className="text-xs text-secondary-500">Short Term</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Database className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">
              {filteredMemories.filter(m => m.type === 'long_term').length}
            </p>
            <p className="text-xs text-secondary-500">Long Term</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">
              {(avgImportance * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-secondary-500">Avg Importance</p>
          </div>
        </div>

        {/* Type Distribution */}
        <Card>
          <CardHeader icon={<PieChart className="h-4 w-4" />}>Memory Type Distribution</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {typeDistribution.map(d => (
                <div key={d.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${d.color}`} />
                      <span className="text-secondary-700 dark:text-secondary-300">{d.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{d.count}</span>
                      <span className="text-xs text-secondary-400">
                        ({filteredMemories.length > 0 ? ((d.count / filteredMemories.length) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${d.color} rounded-full transition-all duration-500`}
                      style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader icon={<Share2 className="h-4 w-4" />}>Source Distribution</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {sourceDistribution.map(d => (
                <div key={d.source} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={d.color}>{d.icon}</span>
                      <span className="text-secondary-700 dark:text-secondary-300">{d.label}</span>
                    </div>
                    <span className="font-medium">{d.count}</span>
                  </div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${maxSourceCount > 0 ? (d.count / maxSourceCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Importance Distribution */}
        <Card>
          <CardHeader icon={<Star className="h-4 w-4" />}>Importance Distribution</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {importanceDistribution.map(d => (
                <div key={d.level} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {d.icon}
                      <span className="text-secondary-700 dark:text-secondary-300">{d.label}</span>
                      <span className="text-xs text-secondary-400">({(d.min * 100).toFixed(0)}%+)</span>
                    </div>
                    <span className="font-medium">{d.count}</span>
                  </div>
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${maxImportanceCount > 0 ? (d.count / maxImportanceCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

  // ============================================
  // Render: Filters Panel
  // ============================================

  const renderFiltersPanel = () => (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Filters</h3>
        <Button variant="ghost" size="xs" onClick={onClearFilters}>
          Clear All
        </Button>
      </div>

      {/* Type Filter Chips */}
      <div>
        <p className="text-xs text-secondary-500 mb-2">Memory Type</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(MEMORY_TYPE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleToggleTypeFilter(type as MemoryType)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilters.has(type as MemoryType)
                  ? `${config.color} ${config.bgColor} ring-1 ring-offset-1 ${config.color.replace('text-', 'ring-')}`
                  : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {config.icon}
              {config.label}
              {typeFilters.has(type as MemoryType) && <X className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Importance Filter */}
      <div>
        <div className="flex justify-between text-xs text-secondary-500 mb-1">
          <span>Minimum Importance</span>
          <span>{(minImportance * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={minImportance * 100}
          onChange={(e) => setMinImportance(parseInt(e.target.value) / 100)}
          className="w-full"
        />
      </div>

      {/* Source Filter */}
      <div>
        <p className="text-xs text-secondary-500 mb-2">Source</p>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="all">All Sources</option>
          {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // ============================================
  // Render: Create Memory Form
  // ============================================

  const renderCreateForm = () => (
    <Card variant="bordered" className="bg-secondary-50 dark:bg-secondary-800/50">
      <CardHeader icon={<Plus className="h-4 w-4" />}>
        Create New Memory
        <button onClick={() => setShowCreateForm(false)} className="ml-auto">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Content
            </label>
            <textarea
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              rows={4}
              placeholder="Enter memory content..."
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm resize-y"
            />
          </div>

          {/* Type & Importance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Memory Type
              </label>
              <select
                value={newMemoryType}
                onChange={(e) => setNewMemoryType(e.target.value as MemoryType)}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
              >
                {Object.entries(MEMORY_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Importance ({newMemoryImportance.toFixed(0)}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={newMemoryImportance * 100}
                onChange={(e) => setNewMemoryImportance(parseInt(e.target.value) / 100)}
                className="w-full"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {newMemoryTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newMemoryTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded-full text-xs"
                  >
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!newMemoryContent.trim()}>
            <Save className="h-4 w-4 mr-1" />
            Save Memory
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  // ============================================
  // Loading State
  // ============================================

  if (isMemoryLoading && displayMemories.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={6} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (memoryError && displayMemories.length === 0) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Memories</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{memoryError}</p>
        <Button variant="primary" onClick={() => fetchMemories?.()}>
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
            <Brain className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Memory</h2>
              <p className="text-sm text-secondary-500">
                {filteredMemories.length} memories • 
                {displayStats ? ` ${displayStats.totalMemories} total` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Button */}
            {showActions && (
              <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Memory
              </Button>
            )}

            {/* Consolidate Button */}
            {showActions && onConsolidate && (
              <Button variant="outline" size="sm" onClick={onConsolidate}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Consolidate
              </Button>
            )}

            {/* View Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              {[
                { id: 'grid', icon: <Grid3X3 className="h-4 w-4" />, label: 'Grid' },
                { id: 'list', icon: <List className="h-4 w-4" />, label: 'List' },
                { id: 'compact', icon: <Layers className="h-4 w-4" />, label: 'Compact' },
                { id: 'analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id as MemoryViewMode)}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === v.id ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
                  title={v.label}
                >
                  {v.icon}
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Export */}
            {showActions && onMemoryExport && (
              <Button variant="ghost" size="sm" onClick={() => onMemoryExport?.(filteredMemories)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        {(showSearch || showFilters) && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              {showSearch && (
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {/* Filter Toggle */}
              {showFilters && (
                <Button
                  variant={showFiltersPanel ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                  {typeFilters.size > 0 || minImportance > 0 || sourceFilter !== 'all' ? (
                    <span className="ml-1 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200 text-xs px-1.5 py-0.5 rounded-full">
                      {typeFilters.size + (minImportance > 0 ? 1 : 0) + (sourceFilter !== 'all' ? 1 : 0)}
                    </span>
                  ) : null}
                </Button>
              )}

              {/* Sort Controls */}
              <div className="flex items-center gap-2 text-xs ml-auto">
                <span className="text-secondary-500">Sort:</span>
                <button
                  onClick={() => handleSort('recency')}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${sortField === 'recency' ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}`}
                >
                  Recency {getSortIcon('recency')}
                </button>
                <button
                  onClick={() => handleSort('importance')}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${sortField === 'importance' ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}`}
                >
                  Importance {getSortIcon('importance')}
                </button>
                <button
                  onClick={() => handleSort('accessCount')}
                  className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${sortField === 'accessCount' ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}`}
                >
                  Access {getSortIcon('accessCount')}
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                <span className="text-sm text-secondary-600">
                  {selectedIds.size} selected
                </span>
                <Button variant="ghost" size="xs" onClick={handleSelectAll}>
                  {selectedIds.size === filteredMemories.length ? 'Deselect All' : 'Select All'}
                </Button>
                {onBulkDelete && (
                  <Button variant="danger" size="xs" onClick={handleBulkDelete}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Selected
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters Panel */}
        {showFiltersPanel && (
          <div className="animate-slide-in-bottom">
            {renderFiltersPanel()}
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="animate-slide-in-bottom">
            {renderCreateForm()}
          </div>
        )}

        {/* Stats Overview */}
        {showStats && displayStats && viewMode !== 'analytics' && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-xs text-secondary-500">Total</p>
              <p className="text-lg font-bold text-secondary-900 dark:text-white">{displayStats.totalMemories}</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-xs text-secondary-500">Avg Importance</p>
              <p className="text-lg font-bold text-yellow-600">{(displayStats.averageImportance * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-xs text-secondary-500">Tokens</p>
              <p className="text-lg font-bold text-blue-600">{displayStats.totalTokens.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-xs text-secondary-500">Cost</p>
              <p className="text-lg font-bold text-green-600">${displayStats.totalCost.toFixed(4)}</p>
            </div>
          </div>
        )}

        {/* Memories Display */}
        {filteredMemories.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-secondary-500">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No memories found</p>
            <p className="text-sm">Create a new memory or adjust your filters</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ maxHeight, overflowY: 'auto' }}
            className="rounded-xl"
          >
            {isLoading && displayMemories.length === 0 ? (
              <LoadingSkeleton type="card" count={6} />
            ) : (
              <>
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMemories.map((memory, index) => renderMemoryCard(memory, index))}
                  </div>
                )}
                {viewMode === 'list' && (
                  <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
                    {filteredMemories.map((memory, index) => renderMemoryRow(memory, index))}
                  </div>
                )}
                {viewMode === 'compact' && renderCompactView()}
                {viewMode === 'analytics' && renderAnalyticsView()}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-secondary-400 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          Short-term memories auto-expire • Long-term memories persist • 
          Importance affects retention and retrieval priority
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default MemoryList;
