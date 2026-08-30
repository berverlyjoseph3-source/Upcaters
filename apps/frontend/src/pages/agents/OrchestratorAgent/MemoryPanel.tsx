// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/MemoryPanel.tsx
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
  DollarSign,
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
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { formatDistanceToNow, format } from 'date-fns';

// ============================================
// Types
// ============================================

export type MemoryType = 'short_term' | 'long_term' | 'episodic' | 'semantic' | 'procedural' | 'working';

export interface MemoryEntry {
  id: string;
  content: string;
  type: MemoryType;
  importance: number;
  timestamp: Date;
  accessCount: number;
  lastAccessedAt?: Date;
  ttlHours?: number;
  expiresAt?: Date;
  source?: 'user_input' | 'agent_output' | 'reflection' | 'system' | 'external';
  sessionId?: string;
  agentType?: string;
  tags?: string[];
  similarity?: number;
  metadata?: Record<string, any>;
}

export interface MemoryStats {
  totalMemories: number;
  shortTermCount: number;
  longTermCount: number;
  episodicCount: number;
  semanticCount: number;
  workingCount: number;
  proceduralCount: number;
  averageImportance: number;
  totalEmbeddingTokens: number;
  totalEmbeddingCostUsd: number;
  retrievalStats: {
    totalRetrievals: number;
    averageRetrievalTimeMs: number;
    cacheHitRate: number;
  };
  byAgentType: Record<string, number>;
  bySession: Record<string, number>;
  bySource: Record<string, number>;
}

interface MemoryPanelProps {
  sessionId?: string;
  onMemorySelect?: (memory: MemoryEntry) => void;
  onMemoryDelete?: (memoryId: string) => void;
  onMemoryCreate?: (content: string, type: MemoryType, importance: number) => void;
  onMemoryExport?: (memories: MemoryEntry[]) => void;
  className?: string;
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
  defaultTTL: number;
}> = {
  short_term: {
    label: 'Short Term',
    description: 'Temporary working memory, expires quickly',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    gradient: 'from-yellow-500 to-yellow-600',
    defaultTTL: 1, // hours
  },
  long_term: {
    label: 'Long Term',
    description: 'Persistent memory stored indefinitely',
    icon: <Database className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    gradient: 'from-blue-500 to-blue-600',
    defaultTTL: 720, // hours (30 days)
  },
  episodic: {
    label: 'Episodic',
    description: 'Event-based memories tied to specific experiences',
    icon: <Calendar className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    gradient: 'from-purple-500 to-purple-600',
    defaultTTL: 168, // hours (7 days)
  },
  semantic: {
    label: 'Semantic',
    description: 'Factual knowledge and concepts',
    icon: <Lightbulb className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    gradient: 'from-green-500 to-green-600',
    defaultTTL: 2160, // hours (90 days)
  },
  procedural: {
    label: 'Procedural',
    description: 'How-to knowledge and learned procedures',
    icon: <Settings className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    gradient: 'from-orange-500 to-orange-600',
    defaultTTL: 4320, // hours (180 days)
  },
  working: {
    label: 'Working',
    description: 'Active task-specific memory',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    gradient: 'from-teal-500 to-teal-600',
    defaultTTL: 0.5, // hours (30 minutes)
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

export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  sessionId,
  onMemorySelect,
  onMemoryDelete,
  onMemoryCreate,
  onMemoryExport,
  className = '',
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
    clearMemories,
    getMemoryStats,
    consolidateMemories,
  } = useOrchestratorStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'importance' | 'recency' | 'accessCount' | 'similarity'>('recency');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>('short_term');
  const [newMemoryImportance, setNewMemoryImportance] = useState(0.5);
  const [newMemoryTags, setNewMemoryTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'stats'>('cards');
  const [showStats, setShowStats] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch memories on mount and filter change
  useEffect(() => {
    fetchMemories({
      type: typeFilter !== 'all' ? typeFilter : undefined,
      source: sourceFilter !== 'all' ? sourceFilter : undefined,
      sessionId,
    });
  }, [fetchMemories, typeFilter, sourceFilter, sessionId]);

  // Fetch stats
  useEffect(() => {
    getMemoryStats();
  }, [getMemoryStats]);

  // Search
  useEffect(() => {
    if (debouncedSearch) {
      searchMemories(debouncedSearch, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        limit: 20,
      });
    } else {
      fetchMemories({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        sessionId,
      });
    }
  }, [debouncedSearch, searchMemories, typeFilter, sourceFilter, sessionId, fetchMemories]);

  // ============================================
  // Filtered & Sorted Memories
  // ============================================

  const filteredMemories = useMemo(() => {
    let filtered = [...memories];

    // Importance filter
    if (importanceFilter !== 'all') {
      const threshold = IMPORTANCE_CONFIG[importanceFilter]?.threshold || 0;
      filtered = filtered.filter(m => m.importance >= threshold);
    }

    // Sort
    filtered.sort((a, b) => {
      let compare = 0;
      switch (sortBy) {
        case 'importance':
          compare = b.importance - a.importance;
          break;
        case 'recency':
          compare = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          break;
        case 'accessCount':
          compare = b.accessCount - a.accessCount;
          break;
        case 'similarity':
          compare = (b.similarity || 0) - (a.similarity || 0);
          break;
      }
      return sortDirection === 'asc' ? -compare : compare;
    });

    return filtered;
  }, [memories, importanceFilter, sortBy, sortDirection]);

  // ============================================
  // Handlers
  // ============================================

  const handleCreateMemory = async () => {
    if (!newMemoryContent.trim()) return;
    
    await storeMemory(newMemoryContent, newMemoryType, newMemoryImportance, {
      tags: newMemoryTags,
      source: 'user_input',
      sessionId,
    });

    setNewMemoryContent('');
    setNewMemoryTags([]);
    setShowCreateForm(false);
    onMemoryCreate?.(newMemoryContent, newMemoryType, newMemoryImportance);
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !newMemoryTags.includes(newTagInput.trim())) {
      setNewMemoryTags([...newMemoryTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewMemoryTags(newMemoryTags.filter(t => t !== tag));
  };

  const handleDeleteMemory = async (memoryId: string) => {
    await deleteMemory(memoryId);
    onMemoryDelete?.(memoryId);
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedMemories) {
      await deleteMemory(id);
    }
    setSelectedMemories(new Set());
  };

  const handleSelectAll = () => {
    if (selectedMemories.size === filteredMemories.length) {
      setSelectedMemories(new Set());
    } else {
      setSelectedMemories(new Set(filteredMemories.map(m => m.id)));
    }
  };

  const handleToggleMemory = (memoryId: string) => {
    const newSet = new Set(selectedMemories);
    if (newSet.has(memoryId)) {
      newSet.delete(memoryId);
    } else {
      newSet.add(memoryId);
    }
    setSelectedMemories(newSet);
  };

  const handleConsolidate = async () => {
    setIsConsolidating(true);
    await consolidateMemories();
    setIsConsolidating(false);
    await fetchMemories();
    await getMemoryStats();
  };

  const handleExport = () => {
    onMemoryExport?.(filteredMemories);
  };

  const getImportanceLevel = (importance: number): string => {
    if (importance >= 0.9) return 'critical';
    if (importance >= 0.7) return 'high';
    if (importance >= 0.4) return 'medium';
    return 'low';
  };

  const getImportanceColor = (importance: number): string => {
    if (importance >= 0.9) return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    if (importance >= 0.7) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    if (importance >= 0.4) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // ============================================
  // Render: Memory Card
  // ============================================

  const renderMemoryCard = (memory: MemoryEntry) => {
    const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.short_term;
    const isExpanded = expandedMemory === memory.id;
    const isSelected = selectedMemories.has(memory.id);
    const importanceLevel = getImportanceLevel(memory.importance);
    const importanceConfig = IMPORTANCE_CONFIG[importanceLevel];

    return (
      <div
        key={memory.id}
        className={`
          bg-white dark:bg-secondary-800 rounded-xl border-2 transition-all duration-200
          ${isSelected
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
            : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 hover:shadow-md'
          }
          ${memory.expiresAt && new Date(memory.expiresAt) < new Date() ? 'opacity-50' : ''}
        `}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggleMemory(memory.id)}
                className="w-4 h-4 rounded border-secondary-300 text-primary-600 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <div className={`p-1.5 rounded-lg ${typeConfig.bgColor}`}>
                <div className={typeConfig.color}>{typeConfig.icon}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-secondary-500">{typeConfig.label}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs ${getImportanceColor(memory.importance)}`}>
                    {importanceConfig?.icon}
                    {importanceLevel}
                  </span>
                </div>
                <p className="text-xs text-secondary-400 mt-0.5">
                  {formatDistanceToNow(new Date(memory.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Content Preview */}
          <p className="text-sm text-secondary-700 dark:text-secondary-300 mb-3 line-clamp-3">
            {memory.content}
          </p>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
            {memory.source && (
              <span className={`flex items-center gap-1 ${SOURCE_CONFIG[memory.source]?.color}`}>
                {SOURCE_CONFIG[memory.source]?.icon}
                {SOURCE_CONFIG[memory.source]?.label}
              </span>
            )}
            {memory.agentType && (
              <span className="text-secondary-400">
                via {memory.agentType}
              </span>
            )}
            {memory.accessCount > 0 && (
              <span className="flex items-center gap-1 text-secondary-400">
                <Eye className="h-3 w-3" />
                {memory.accessCount}
              </span>
            )}
            {memory.similarity !== undefined && (
              <span className="flex items-center gap-1 text-blue-500">
                <Target className="h-3 w-3" />
                {(memory.similarity * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {memory.tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
              {memory.tags.length > 5 && (
                <span className="text-xs text-secondary-400">+{memory.tags.length - 5}</span>
              )}
            </div>
          )}

          {/* TTL Indicator */}
          {memory.ttlHours && memory.expiresAt && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-secondary-500 mb-1">
                <span>TTL</span>
                <span>{format(new Date(memory.expiresAt), 'MMM d, HH:mm')}</span>
              </div>
              <div className="h-1 bg-secondary-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((new Date(memory.expiresAt).getTime() - Date.now()) / (memory.ttlHours * 3600000)) * 100))}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpandedMemory(isExpanded ? null : memory.id)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => onMemorySelect?.(memory)}
                className="p-1 rounded-md hover:bg-secondary-100 text-secondary-400 hover:text-primary-600"
                title="View"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDeleteMemory(memory.id)}
                className="p-1 rounded-md hover:bg-red-100 text-secondary-400 hover:text-red-500"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
              {/* Full Content */}
              <div className="mb-3">
                <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Content</h5>
                <p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
                  {memory.content}
                </p>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-500">ID</span>
                  <span className="font-mono text-xs">{memory.id.substring(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Type</span>
                  <span className="text-secondary-700">{typeConfig.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Importance</span>
                  <span className="text-secondary-700">{(memory.importance * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Accesses</span>
                  <span className="text-secondary-700">{memory.accessCount}</span>
                </div>
                {memory.lastAccessedAt && (
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Last Accessed</span>
                    <span className="text-secondary-700">
                      {format(new Date(memory.lastAccessedAt), 'MMM d, HH:mm')}
                    </span>
                  </div>
                )}
                {memory.sessionId && (
                  <div className="flex justify-between">
                    <span className="text-secondary-500">Session</span>
                    <span className="font-mono text-xs">{memory.sessionId.substring(0, 8)}...</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-1">Metadata</h5>
                  <pre className="text-xs bg-secondary-50 dark:bg-secondary-900 p-2 rounded-lg overflow-x-auto">
                    {JSON.stringify(memory.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Memory Row (List View)
  // ============================================

  const renderMemoryRow = (memory: MemoryEntry) => {
    const typeConfig = MEMORY_TYPE_CONFIG[memory.type] || MEMORY_TYPE_CONFIG.short_term;
    const isSelected = selectedMemories.has(memory.id);
    const importanceLevel = getImportanceLevel(memory.importance);

    return (
      <tr
        key={memory.id}
        className={`
          hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer
          ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
        `}
        onClick={() => onMemorySelect?.(memory)}
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleMemory(memory.id)}
            className="w-4 h-4 rounded border-secondary-300"
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${typeConfig.bgColor}`}>
              <div className={typeConfig.color}>{typeConfig.icon}</div>
            </div>
            <span className="text-xs font-medium">{typeConfig.label}</span>
          </div>
        </td>
        <td className="px-3 py-3">
          <p className="text-sm text-secondary-700 dark:text-secondary-300 line-clamp-1 max-w-xs">
            {memory.content}
          </p>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getImportanceColor(memory.importance)}`}>
            {IMPORTANCE_CONFIG[importanceLevel]?.icon}
            {(memory.importance * 100).toFixed(0)}%
          </span>
        </td>
        <td className="px-3 py-3 text-xs text-secondary-500">
          {formatDistanceToNow(new Date(memory.timestamp), { addSuffix: true })}
        </td>
        <td className="px-3 py-3 text-xs text-secondary-500">
          {memory.source && SOURCE_CONFIG[memory.source]?.label || 'Unknown'}
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onMemorySelect?.(memory); }}
              className="p-1 rounded hover:bg-secondary-100"
              title="View"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteMemory(memory.id); }}
              className="p-1 rounded hover:bg-red-100 text-red-500"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ============================================
  // Render: Stats View
  // ============================================

  const renderStats = () => {
    if (!memoryStats) return null;

    const distributionData = [
      { name: 'Short Term', value: memoryStats.shortTermCount, color: MEMORY_TYPE_CONFIG.short_term.color.replace('text-', 'bg-') },
      { name: 'Long Term', value: memoryStats.longTermCount, color: MEMORY_TYPE_CONFIG.long_term.color.replace('text-', 'bg-') },
      { name: 'Episodic', value: memoryStats.episodicCount, color: MEMORY_TYPE_CONFIG.episodic.color.replace('text-', 'bg-') },
      { name: 'Semantic', value: memoryStats.semanticCount, color: MEMORY_TYPE_CONFIG.semantic.color.replace('text-', 'bg-') },
      { name: 'Working', value: memoryStats.workingCount, color: MEMORY_TYPE_CONFIG.working.color.replace('text-', 'bg-') },
      { name: 'Procedural', value: memoryStats.proceduralCount, color: MEMORY_TYPE_CONFIG.procedural.color.replace('text-', 'bg-') },
    ];

    const maxDistribution = Math.max(...distributionData.map(d => d.value), 1);

    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Brain className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{memoryStats.totalMemories}</p>
            <p className="text-xs text-secondary-500">Total Memories</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{memoryStats.shortTermCount}</p>
            <p className="text-xs text-secondary-500">Short Term</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Database className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{memoryStats.longTermCount}</p>
            <p className="text-xs text-secondary-500">Long Term</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">
              {(memoryStats.averageImportance * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-secondary-500">Avg Importance</p>
          </div>
        </div>

        {/* Distribution Chart */}
        <Card>
          <CardHeader icon={<PieChart className="h-4 w-4" />}>Memory Distribution</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {distributionData.map(item => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-700 dark:text-secondary-300">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-3 bg-secondary-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${maxDistribution > 0 ? (item.value / maxDistribution) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Retrieval Stats */}
        <Card>
          <CardHeader icon={<Activity className="h-4 w-4" />}>Retrieval Performance</CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{memoryStats.retrievalStats.totalRetrievals.toLocaleString()}</p>
                <p className="text-xs text-secondary-500">Total Retrievals</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{memoryStats.retrievalStats.averageRetrievalTimeMs.toFixed(0)}ms</p>
                <p className="text-xs text-secondary-500">Avg Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{(memoryStats.retrievalStats.cacheHitRate * 100).toFixed(0)}%</p>
                <p className="text-xs text-secondary-500">Cache Hit Rate</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Cost Stats */}
        <Card>
          <CardHeader icon={<DollarSign className="h-4 w-4" />}>Embedding Costs</CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {memoryStats.totalEmbeddingTokens.toLocaleString()}
                </p>
                <p className="text-xs text-secondary-500">Tokens Used</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                  ${memoryStats.totalEmbeddingCostUsd.toFixed(4)}
                </p>
                <p className="text-xs text-secondary-500">Total Cost</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

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
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
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
          <Button variant="primary" onClick={handleCreateMemory} disabled={!newMemoryContent.trim()}>
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

  if (isMemoryLoading && memories.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={4} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (memoryError && memories.length === 0) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Memories</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{memoryError}</p>
        <Button variant="primary" onClick={() => fetchMemories()}>
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
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Memory Management</h2>
              <p className="text-sm text-secondary-500">
                {filteredMemories.length} memories • 
                {memoryStats && ` Avg importance: ${(memoryStats.averageImportance * 100).toFixed(0)}%`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Button */}
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Memory
            </Button>

            {/* Consolidate Button */}
            <Button variant="outline" onClick={handleConsolidate} disabled={isConsolidating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isConsolidating ? 'animate-spin' : ''}`} />
              Consolidate
            </Button>

            {/* Export Button */}
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Toggle */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <BarChart3 className="h-4 w-4" />
          {showStats ? 'Hide Statistics' : 'Show Statistics'}
          {showStats ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Stats Panel */}
        {showStats && renderStats()}

        {/* Filters Bar */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as MemoryType | 'all')}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="all">All Types</option>
              {Object.entries(MEMORY_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="all">All Sources</option>
              {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Importance Filter */}
            <select
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="all">All Importance</option>
              {Object.entries(IMPORTANCE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              >
                <option value="recency">Recency</option>
                <option value="importance">Importance</option>
                <option value="accessCount">Access Count</option>
                <option value="similarity">Similarity</option>
              </select>
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg border border-secondary-300 dark:border-secondary-600"
              >
                {sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
                title="Card View"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
                title="List View"
              >
                <GitBranch className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMemories.size > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
              <span className="text-sm text-secondary-600">
                {selectedMemories.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedMemories.size === filteredMemories.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && renderCreateForm()}

        {/* Memories Display */}
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12 text-secondary-500">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No memories found</p>
            <p className="text-sm">Create a new memory or adjust your filters</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemories.map(renderMemoryCard)}
          </div>
        ) : (
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                  <tr>
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedMemories.size === filteredMemories.length && filteredMemories.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-secondary-300"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Content</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Importance</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Created</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Source</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                  {filteredMemories.map(renderMemoryRow)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-secondary-400">
          Short-term memories auto-expire • Long-term memories persist • 
          Importance affects retention and retrieval priority
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Need to import DollarSign for cost stats
import { DollarSign } from 'lucide-react';


export default MemoryPanel;
