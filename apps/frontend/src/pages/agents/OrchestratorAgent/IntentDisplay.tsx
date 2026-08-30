// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/IntentDisplay.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Brain,
  Lightbulb,
  Target,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  MoreVertical,
  Edit,
  Copy,
  Share2,
  Bookmark,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Info,
  X,
  ArrowRight,
  ArrowDown,
  GitBranch,
  Layers,
  Cpu,
  Mail,
  HardDrive,
  Sparkles,
  Share2 as Share2Icon,
  Calendar,
  Globe,
  CheckSquare,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Shield,
  Flag,
  Award,
  History,
  RotateCcw,
  Play,
  Pause,
  Square,
  GripVertical,
  Settings,
  HelpCircle,
  ExternalLink,
  Link,
  Unlink,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { IntentResult, ClassificationOptions } from '../../../types/orchestrator.types';
import { AgentType } from '../../../types/agent.types';
import { format, formatDistanceToNow, formatDuration } from 'date-fns';

// ============================================
// Types
// ============================================

export type IntentStatus = 'pending' | 'classifying' | 'classified' | 'confirmed' | 'rejected' | 'ambiguous' | 'error';

export interface Entity {
  key: string;
  value: any;
  type: 'email' | 'date' | 'url' | 'phone' | 'number' | 'string' | 'boolean' | 'array' | 'object';
  confidence: number;
  source: 'extracted' | 'inferred' | 'user_provided';
  normalized?: any;
}

export interface AlternativeIntent {
  intent: string;
  confidence: number;
  description?: string;
  suggestedAgent?: AgentType;
}

export interface IntentHistoryEntry {
  id: string;
  input: string;
  intent: IntentResult;
  wasCorrect?: boolean;
  correctedIntent?: string;
  timestamp: Date;
  processingTimeMs: number;
  model?: string;
  classificationMethod?: 'keyword' | 'ai' | 'hybrid' | 'rule_based' | 'fallback';
}

export interface IntentConfidence {
  overall: number;
  breakdown: Record<string, number>;
  threshold: number;
  isAboveThreshold: boolean;
  isHighConfidence: boolean;
}

interface IntentDisplayProps {
  intent?: IntentResult;
  input?: string;
  onClassify?: (input: string, options?: ClassificationOptions) => Promise<void>;
  onConfirm?: (intent: IntentResult) => void;
  onReject?: (intent: IntentResult) => void;
  onCreatePlan?: (intent: IntentResult) => void;
  onExecute?: (intent: IntentResult) => void;
  onHistorySelect?: (entry: IntentHistoryEntry) => void;
  onExport?: (intent: IntentResult) => void;
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
  borderColor: string;
  description: string;
  capabilities: string[];
}> = {
  EMAIL: {
    name: 'Email Agent',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300 dark:border-blue-700',
    description: 'Handles email-related tasks: send, read, reply, organize',
    capabilities: ['Send emails', 'Read inbox', 'Reply to emails', 'Organize with labels', 'Draft emails'],
  },
  DRIVE: {
    name: 'Drive Agent',
    icon: <HardDrive className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    gradient: 'from-green-500 to-green-600',
    borderColor: 'border-green-300 dark:border-green-700',
    description: 'Handles file management: upload, download, search, share',
    capabilities: ['Upload files', 'Download files', 'Search files', 'Share files', 'Create folders'],
  },
  CONTENT: {
    name: 'Content Agent',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    gradient: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300 dark:border-purple-700',
    description: 'Generates content: text, images, videos using AI',
    capabilities: ['Generate text', 'Create images', 'Generate videos', 'Edit content', 'Translate text'],
  },
  SOCIAL: {
    name: 'Social Agent',
    icon: <Share2Icon className="h-5 w-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    gradient: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300 dark:border-pink-700',
    description: 'Posts to social media: LinkedIn, Instagram, Facebook, X',
    capabilities: ['Post to LinkedIn', 'Post to Instagram', 'Post to Facebook', 'Post to X', 'Schedule posts'],
  },
  CALENDAR: {
    name: 'Calendar Agent',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    gradient: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-300 dark:border-orange-700',
    description: 'Manages calendar: events, scheduling, availability',
    capabilities: ['Create events', 'List events', 'Smart scheduling', 'Check availability', 'Manage reminders'],
  },
  WEB: {
    name: 'Web Agent',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    gradient: 'from-teal-500 to-teal-600',
    borderColor: 'border-teal-300 dark:border-teal-700',
    description: 'Web search, research, weather, data extraction',
    capabilities: ['Web search', 'Deep research', 'Get weather', 'Get news', 'Extract data'],
  },
  TASK: {
    name: 'Task Agent',
    icon: <CheckSquare className="h-5 w-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    gradient: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
    description: 'Task management: create, update, complete tasks',
    capabilities: ['Create tasks', 'List tasks', 'Update tasks', 'Complete tasks', 'Batch operations'],
  },
  ORCHESTRATOR: {
    name: 'Orchestrator',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    gradient: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-700',
    description: 'Central coordinator for all agents',
    capabilities: ['Classify intent', 'Create plans', 'Delegate tasks', 'Manage memory', 'Reflect on results'],
  },
};

const CLASSIFICATION_METHOD_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  keyword: {
    label: 'Keyword',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    icon: <Target className="h-3 w-3" />,
    description: 'Matched using keyword patterns',
  },
  ai: {
    label: 'AI',
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    icon: <Brain className="h-3 w-3" />,
    description: 'Classified by AI model',
  },
  hybrid: {
    label: 'Hybrid',
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    icon: <GitBranch className="h-3 w-3" />,
    description: 'Keywords + AI combined',
  },
  rule_based: {
    label: 'Rule-Based',
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    icon: <Shield className="h-3 w-3" />,
    description: 'Matched by predefined rules',
  },
  fallback: {
    label: 'Fallback',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    icon: <AlertCircle className="h-3 w-3" />,
    description: 'Default fallback classification',
  },
};

// ============================================
// Component
// ============================================

export const IntentDisplay: React.FC<IntentDisplayProps> = ({
  intent: intentProp,
  input: inputProp,
  onClassify,
  onConfirm,
  onReject,
  onCreatePlan,
  onExecute,
  onHistorySelect,
  onExport,
  className = '',
}) => {
  // Store
  const {
    currentIntent,
    intentHistory,
    isIntentLoading,
    intentError,
    classifyIntent,
    getIntentHistory,
  } = useOrchestratorStore();

  // Local state
  const [input, setInput] = useState(inputProp || '');
  const [activeView, setActiveView] = useState<'overview' | 'entities' | 'alternatives' | 'history'>('overview');
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [expandedAlternative, setExpandedAlternative] = useState<number | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [classificationMethod, setClassificationMethod] = useState<string>('hybrid');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.6);
  const [isClassifying, setIsClassifying] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{
    rating: 'correct' | 'incorrect' | 'partial';
    correctedIntent?: string;
    notes?: string;
  } | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch history on mount
  useEffect(() => {
    getIntentHistory?.();
  }, [getIntentHistory]);

  // ============================================
  // Derived Data
  // ============================================

  const intent = intentProp || currentIntent;

  // Parse entities from intent
  const entities = useMemo((): Entity[] => {
    if (!intent?.entities) return [];
    return Object.entries(intent.entities).map(([key, value]) => {
      let type: Entity['type'] = 'string';
      if (Array.isArray(value)) type = 'array';
      else if (typeof value === 'object' && value !== null) type = 'object';
      else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(value))) type = 'email';
      else if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) type = 'date';
      else if (/^https?:\/\//.test(String(value))) type = 'url';
      else if (/^[\d\s\-\+\(\)]+$/.test(String(value))) type = 'phone';
      else if (/^\d+$/.test(String(value))) type = 'number';
      else if (value === true || value === false) type = 'boolean';

      return {
        key,
        value,
        type,
        confidence: 0.85,
        source: 'extracted',
      };
    });
  }, [intent]);

  // Confidence breakdown
  const confidence = useMemo((): IntentConfidence | null => {
    if (!intent) return null;
    return {
      overall: intent.confidence,
      breakdown: {
        'Primary Intent': intent.confidence,
        ...(Object.fromEntries(
          (intent.alternativeIntents || []).map((a, i) => [`Alternative ${i + 1}`, a.confidence])
        )),
      },
      threshold: confidenceThreshold,
      isAboveThreshold: intent.confidence >= confidenceThreshold,
      isHighConfidence: intent.confidence >= 0.8,
    };
  }, [intent, confidenceThreshold]);

  // Classification method config
  const methodConfig = CLASSIFICATION_METHOD_CONFIG[intent?.classificationMethod || 'fallback'] || CLASSIFICATION_METHOD_CONFIG.fallback;

  // Agent suggestion config
  const suggestedAgentConfig = AGENT_CONFIG[intent?.suggestedAgent || 'ORCHESTRATOR'] || AGENT_CONFIG.ORCHESTRATOR;

  // ============================================
  // Handlers
  // ============================================

  const handleClassify = async () => {
    if (!input.trim()) return;
    setIsClassifying(true);
    try {
      await classifyIntent?.(input, {
        confidenceThreshold,
        preferredMethod: classificationMethod as ClassificationOptions['preferredMethod'],
      });
    } catch (error) {
      console.error('Classification failed:', error);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleClassify();
    }
  };

  const handleCopyIntent = () => {
    if (intent) {
      navigator.clipboard.writeText(JSON.stringify(intent, null, 2));
    }
  };

  const handleToggleEntity = (key: string) => {
    setExpandedEntity(expandedEntity === key ? null : key);
  };

  const handleToggleAlternative = (index: number) => {
    setExpandedAlternative(expandedAlternative === index ? null : index);
  };

  const handleFeedbackSubmit = () => {
    // Store feedback
    setShowFeedbackForm(false);
  };

  const getConfidenceColor = (value: number): string => {
    if (value >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (value >= 0.6) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    if (value >= 0.4) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const getConfidenceLevel = (value: number): { label: string; color: string } => {
    if (value >= 0.8) return { label: 'High', color: 'text-green-600' };
    if (value >= 0.6) return { label: 'Medium', color: 'text-blue-600' };
    if (value >= 0.4) return { label: 'Low', color: 'text-yellow-600' };
    return { label: 'Very Low', color: 'text-red-600' };
  };

  const formatEntityValue = (value: any): string => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value, null, 2);
    return String(value);
  };

  // ============================================
  // Render: Input Section
  // ============================================

  const renderInputSection = () => (
    <Card variant="bordered">
      <CardBody>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary-600" />
              User Input
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={classificationMethod}
                onChange={(e) => setClassificationMethod(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              >
                <option value="hybrid">Hybrid</option>
                <option value="ai">AI Only</option>
                <option value="keyword">Keyword Only</option>
              </select>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-secondary-500">Threshold:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-16"
                />
                <span className="text-secondary-500 w-6">{confidenceThreshold.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter user input to classify intent... (Ctrl+Enter to classify)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
              disabled={isClassifying}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-xs text-secondary-400">
                {input.length} characters
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleClassify}
                disabled={isClassifying || !input.trim()}
              >
                {isClassifying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <Brain className="h-3 w-3 mr-1" />
                    Classify Intent
                  </>
                )}
              </Button>
            </div>
          </div>

          {input && (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="xs" onClick={() => setInput('')}>
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button variant="ghost" size="xs" onClick={() => navigator.clipboard.writeText(input)}>
                <Copy className="h-3 w-3 mr-1" />
                Copy Input
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );

  // ============================================
  // Render: Overview View
  // ============================================

  const renderOverview = () => {
    if (!intent) return null;
    const confidenceLevel = getConfidenceLevel(intent.confidence);

    return (
      <div className="space-y-6">
        {/* Primary Intent Card */}
        <Card
          variant="bordered"
          className={`transition-all duration-500 ${
            animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Intent Summary */}
              <div className="lg:col-span-2">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${suggestedAgentConfig.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                    {suggestedAgentConfig.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold text-secondary-900 dark:text-white capitalize">
                        {intent.primaryIntent.replace(/_/g, ' ')}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getConfidenceColor(intent.confidence)}`}>
                        <Target className="h-3 w-3" />
                        {confidenceLevel.label} Confidence
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${methodConfig.color}`}>
                        {methodConfig.icon}
                        {methodConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-500 mt-1">
                      Suggested by: {suggestedAgentConfig.name} • 
                      Processing time: {intent.processingTimeMs || 'N/A'}ms
                    </p>
                    {intent.isAmbiguous && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        This intent is ambiguous. Consider reviewing alternatives.
                      </div>
                    )}
                  </div>
                </div>

                {/* Clarification Questions */}
                {intent.clarificationQuestions && intent.clarificationQuestions.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      Clarification Questions
                    </h4>
                    <ul className="space-y-1">
                      {intent.clarificationQuestions.map((question, idx) => (
                        <li key={idx} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                          <span className="text-blue-400">{idx + 1}.</span>
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confidence Gauge */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    {/* Progress arc */}
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={
                        intent.confidence >= 0.8 ? '#10b981' :
                        intent.confidence >= 0.6 ? '#3b82f6' :
                        intent.confidence >= 0.4 ? '#f59e0b' : '#ef4444'
                      }
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(intent.confidence * 314.159).toFixed(0)} 314.159`}
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
                    />
                    {/* Center text */}
                    <text
                      x="60"
                      y="55"
                      textAnchor="middle"
                      className="text-2xl font-bold"
                      fill="currentColor"
                    >
                      {(intent.confidence * 100).toFixed(0)}%
                    </text>
                    <text
                      x="60"
                      y="75"
                      textAnchor="middle"
                      className="text-xs fill-secondary-500"
                    >
                      Confidence
                    </text>
                  </svg>
                </div>
                <p className="text-xs text-secondary-500 mt-2">
                  Threshold: {(confidenceThreshold * 100).toFixed(0)}%
                </p>
                {confidence && (
                  <div className={`text-xs mt-1 ${confidence.isAboveThreshold ? 'text-green-600' : 'text-red-600'}`}>
                    {confidence.isAboveThreshold ? '✓ Above threshold' : '✗ Below threshold'}
                  </div>
                )}
              </div>
            </div>

            {/* Multi-Agent Indicator */}
            {intent.requiresMultipleAgents && intent.agentChain && intent.agentChain.length > 0 && (
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Multi-Agent Chain Required
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  {intent.agentChain.map((agentType, idx) => {
                    const config = AGENT_CONFIG[agentType] || AGENT_CONFIG.ORCHESTRATOR;
                    return (
                      <React.Fragment key={agentType}>
                        {idx > 0 && <ArrowRight className="h-4 w-4 text-purple-400" />}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                          {config.icon}
                          {config.name}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              {onConfirm && (
                <Button variant="primary" size="sm" onClick={() => onConfirm(intent)}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirm Intent
                </Button>
              )}
              {onReject && (
                <Button variant="outline" size="sm" onClick={() => onReject(intent)}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              )}
              {onCreatePlan && (
                <Button variant="primary" size="sm" onClick={() => onCreatePlan(intent)}>
                  <GitBranch className="h-4 w-4 mr-1" />
                  Create Plan
                </Button>
              )}
              {onExecute && intent.confidence >= confidenceThreshold && (
                <Button variant="primary" size="sm" onClick={() => onExecute(intent)}>
                  <Play className="h-4 w-4 mr-1" />
                  Execute
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleCopyIntent}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowFeedbackForm(!showFeedbackForm)}>
                <ThumbsUp className="h-4 w-4 mr-1" />
                Feedback
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <Card variant="bordered" className="bg-secondary-50 dark:bg-secondary-800/50 animate-slide-in-bottom">
            <CardHeader icon={<MessageSquare className="h-4 w-4" />}>
              Provide Feedback
              <button onClick={() => setShowFeedbackForm(false)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[
                    { value: 'correct', label: 'Correct', icon: <ThumbsUp className="h-4 w-4" /> },
                    { value: 'incorrect', label: 'Incorrect', icon: <ThumbsDown className="h-4 w-4" /> },
                    { value: 'partial', label: 'Partially Correct', icon: <AlertCircle className="h-4 w-4" /> },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setUserFeedback(prev => ({
                        ...prev,
                        rating: option.value as any,
                      }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        userFeedback?.rating === option.value
                          ? option.value === 'correct'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : option.value === 'incorrect'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          : 'bg-white border border-secondary-300 hover:bg-secondary-50'
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  ))}
                </div>

                {userFeedback?.rating === 'incorrect' && (
                  <div>
                    <label className="block text-xs font-medium text-secondary-700 mb-1">
                      What should the intent have been?
                    </label>
                    <input
                      type="text"
                      value={userFeedback.correctedIntent || ''}
                      onChange={(e) => setUserFeedback(prev => ({ ...prev!, correctedIntent: e.target.value }))}
                      placeholder="e.g., email_send, calendar_create"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-secondary-700 mb-1">
                    Additional notes (optional)
                  </label>
                  <textarea
                    value={userFeedback?.notes || ''}
                    onChange={(e) => setUserFeedback(prev => ({ ...prev!, notes: e.target.value }))}
                    rows={2}
                    placeholder="Any additional feedback..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 resize-y"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowFeedbackForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleFeedbackSubmit}>
                    Submit Feedback
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Complexity & Cost Estimates */}
        {intent.complexity && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-xs text-secondary-500">Complexity</p>
              <p className="text-lg font-bold capitalize">{intent.complexity.replace('_', ' ')}</p>
            </div>
            {intent.estimatedExecutionTimeMs && (
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
                <p className="text-xs text-secondary-500">Est. Execution Time</p>
                <p className="text-lg font-bold">{formatDuration({ seconds: intent.estimatedExecutionTimeMs / 1000 })}</p>
              </div>
            )}
            {intent.estimatedCostUsd !== undefined && (
              <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
                <p className="text-xs text-secondary-500">Est. Cost</p>
                <p className="text-lg font-bold">${intent.estimatedCostUsd.toFixed(4)}</p>
              </div>
            )}
            <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
              <p className="text-xs text-secondary-500">Classification Method</p>
              <p className="text-lg font-bold text-secondary-900 dark:text-white">{methodConfig.label}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Entities View
  // ============================================

  const renderEntities = () => {
    if (!intent || entities.length === 0) {
      return (
        <div className="text-center py-8 text-secondary-500">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No entities extracted</p>
          <p className="text-sm">Entities are key-value pairs extracted from the input</p>
        </div>
      );
    }

    const typeColors: Record<Entity['type'], string> = {
      email: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      date: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      url: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      phone: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      number: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      string: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      boolean: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      array: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      object: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Total Entities</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white">{entities.length}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Extracted</p>
            <p className="text-xl font-bold text-blue-600">{entities.filter(e => e.source === 'extracted').length}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Avg Confidence</p>
            <p className="text-xl font-bold text-green-600">
              {(entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Unique Types</p>
            <p className="text-xl font-bold text-purple-600">{new Set(entities.map(e => e.type)).size}</p>
          </div>
        </div>

        <div className="space-y-2">
          {entities.map((entity, idx) => {
            const isExpanded = expandedEntity === entity.key;
            return (
              <div
                key={entity.key}
                className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden transition-all hover:shadow-md"
              >
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() => handleToggleEntity(entity.key)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[entity.type]}`}>
                      {entity.type.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-secondary-900 dark:text-white">{entity.key}</p>
                      <p className="text-sm text-secondary-500 truncate">
                        {formatEntityValue(entity.value)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${entity.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{Math.round(entity.confidence * 100)}%</span>
                      </div>
                      <span className="text-xs text-secondary-400 capitalize">{entity.source}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-secondary-400" /> : <ChevronDown className="h-4 w-4 text-secondary-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-secondary-200 dark:border-secondary-700">
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-secondary-500">Full Value</p>
                        <pre className="text-sm bg-secondary-50 dark:bg-secondary-900 p-3 rounded-lg overflow-x-auto max-h-40 font-mono">
                          {formatEntityValue(entity.value)}
                        </pre>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-secondary-500">Confidence</p>
                          <p className="font-medium">{Math.round(entity.confidence * 100)}%</p>
                        </div>
                        <div>
                          <p className="text-secondary-500">Source</p>
                          <p className="font-medium capitalize">{entity.source}</p>
                        </div>
                        <div>
                          <p className="text-secondary-500">Type</p>
                          <p className="font-medium uppercase">{entity.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="xs" onClick={() => navigator.clipboard.writeText(formatEntityValue(entity.value))}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Alternatives View
  // ============================================

  const renderAlternatives = () => {
    if (!intent || !intent.alternativeIntents || intent.alternativeIntents.length === 0) {
      return (
        <div className="text-center py-8 text-secondary-500">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No alternative intents</p>
          <p className="text-sm">Alternative intents appear when multiple interpretations are possible</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-secondary-900 dark:text-white">
                {intent.alternativeIntents.length} Alternative Interpretations Found
              </p>
              <p className="text-xs text-secondary-500">
                The system identified multiple possible intents from the input
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {intent.alternativeIntents.map((alternative, idx) => {
            const isExpanded = expandedAlternative === idx;
            const confidenceLevel = getConfidenceLevel(alternative.confidence);
            const altAgentConfig = AGENT_CONFIG[alternative.suggestedAgent || 'ORCHESTRATOR'] || AGENT_CONFIG.ORCHESTRATOR;
            const isHighest = idx === 0;

            return (
              <div
                key={idx}
                className={`bg-white dark:bg-secondary-800 rounded-xl border transition-all hover:shadow-md ${
                  isHighest ? 'border-blue-300 dark:border-blue-700' : 'border-secondary-200 dark:border-secondary-700'
                }`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => handleToggleAlternative(idx)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${altAgentConfig.gradient} flex items-center justify-center text-white`}>
                        {altAgentConfig.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-secondary-900 dark:text-white capitalize">
                            {alternative.intent.replace(/_/g, ' ')}
                          </h4>
                          {isHighest && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Best Match
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(alternative.confidence)}`}>
                            {confidenceLevel.label}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-0.5">
                          Suggested by: {altAgentConfig.name}
                          {alternative.description && ` • ${alternative.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold">{Math.round(alternative.confidence * 100)}%</p>
                        <p className="text-xs text-secondary-400">confidence</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-secondary-400" /> : <ChevronDown className="h-4 w-4 text-secondary-400" />}
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          alternative.confidence >= 0.8 ? 'bg-green-500' :
                          alternative.confidence >= 0.6 ? 'bg-blue-500' :
                          alternative.confidence >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${alternative.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Comparison to Primary */}
                  <div className="mt-2 text-xs">
                    <span className="text-secondary-500">
                      vs Primary: {Math.round((intent.confidence - alternative.confidence) * 100)}% difference
                    </span>
                    <span className={`ml-2 ${alternative.confidence > intent.confidence ? 'text-red-600' : 'text-green-600'}`}>
                      {alternative.confidence > intent.confidence ? '↑ Higher' : '↓ Lower'} than selected
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-secondary-200 dark:border-secondary-700">
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-secondary-500">Agent</p>
                          <p className="font-medium">{altAgentConfig.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-secondary-500">Confidence</p>
                          <p className="font-medium">{(alternative.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-secondary-500 mb-1">Agent Capabilities</p>
                        <div className="flex flex-wrap gap-1">
                          {altAgentConfig.capabilities.map((cap, i) => (
                            <span key={i} className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded-full text-xs text-secondary-600 dark:text-secondary-400">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Use This Intent
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Comparison Chart */}
        <Card>
          <CardHeader icon={<BarChart3 className="h-4 w-4" />}>Confidence Comparison</CardHeader>
          <CardBody>
            <div className="space-y-3">
              {/* Primary Intent Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary-500" />
                    <span className="font-medium">Primary: {intent.primaryIntent.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="font-bold">{(intent.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-secondary-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                    style={{ width: `${intent.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Alternative Bars */}
              {intent.alternativeIntents.map((alt, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : 'bg-gray-500'}`} />
                      <span className="font-medium">Alt {idx + 1}: {alt.intent.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-bold">{(alt.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-secondary-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${alt.confidence * 100}%` }}
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
  // Render: History View
  // ============================================

  const renderHistory = () => {
    if (!intentHistory || intentHistory.length === 0) {
      return (
        <div className="text-center py-8 text-secondary-500">
          <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No classification history</p>
          <p className="text-sm">Previously classified intents will appear here</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* History Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Total</p>
            <p className="text-xl font-bold text-secondary-900 dark:text-white">{intentHistory.length}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Correct</p>
            <p className="text-xl font-bold text-green-600">
              {intentHistory.filter(e => e.wasCorrect === true).length}
            </p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-xs text-secondary-500">Incorrect</p>
            <p className="text-xl font-bold text-red-600">
              {intentHistory.filter(e => e.wasCorrect === false).length}
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-2">
          {intentHistory.map((entry) => {
            const isSelected = selectedHistoryEntry === entry.id;
            const methodConfig = CLASSIFICATION_METHOD_CONFIG[entry.classificationMethod || 'fallback'] || CLASSIFICATION_METHOD_CONFIG.fallback;
            const confidenceLevel = getConfidenceLevel(entry.intent.confidence);

            return (
              <div
                key={entry.id}
                className={`bg-white dark:bg-secondary-800 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                  isSelected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-secondary-200 dark:border-secondary-700'
                }`}
                onClick={() => {
                  setSelectedHistoryEntry(isSelected ? null : entry.id);
                  onHistorySelect?.(entry);
                }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-secondary-900 dark:text-white capitalize">
                          {entry.intent.primaryIntent.replace(/_/g, ' ')}
                        </h4>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(entry.intent.confidence)}`}>
                          {Math.round(entry.intent.confidence * 100)}%
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${methodConfig.color}`}>
                          {methodConfig.icon}
                          {methodConfig.label}
                        </span>
                        {entry.wasCorrect !== undefined && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.wasCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {entry.wasCorrect ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {entry.wasCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-secondary-500 truncate">{entry.input}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-secondary-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                        </span>
                        <span>{entry.processingTimeMs}ms</span>
                        {entry.model && <span>Model: {entry.model}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Corrected Intent (if applicable) */}
                  {entry.correctedIntent && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg text-xs">
                      <span className="font-medium text-yellow-700">Corrected:</span>{' '}
                      <span className="text-yellow-600 capitalize">{entry.correctedIntent.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isIntentLoading && !intent) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (intentError && !intent) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Classification Failed</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{intentError}</p>
        <Button variant="primary" onClick={handleClassify}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry Classification
        </Button>
      </div>
    );
  }

  // ============================================
  // Empty State (No intent, no input)
  // ============================================

  if (!intent && !input) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center ${className}`}>
        <Brain className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">Intent Classification</h3>
        <p className="text-secondary-500 max-w-md mx-auto mb-6">
          Enter a user query above to classify the intent and see which AI agent should handle it.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          {Object.entries(AGENT_CONFIG).slice(0, 6).map(([type, config]) => (
            <div key={type} className={`p-2 rounded-lg ${config.bgColor} ${config.color} text-xs text-center`}>
              <div className="flex justify-center mb-1">{config.icon}</div>
              <span className="font-medium">{config.name}</span>
            </div>
          ))}
        </div>
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
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Intent Classification</h2>
              <p className="text-sm text-secondary-500">
                Analyze user input and determine the best agent to handle the request
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            {intent && (
              <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                {[
                  { id: 'overview', label: 'Overview', icon: <Activity className="h-3.5 w-3.5" /> },
                  { id: 'entities', label: 'Entities', icon: <Target className="h-3.5 w-3.5" /> },
                  { id: 'alternatives', label: 'Alternatives', icon: <GitBranch className="h-3.5 w-3.5" /> },
                  { id: 'history', label: 'History', icon: <History className="h-3.5 w-3.5" /> },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveView(v.id as any)}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                      activeView === v.id ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600' : 'text-secondary-600'
                    }`}
                  >
                    {v.icon}
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            {intent && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopyIntent}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowRawResponse(!showRawResponse)}>
                  {showRawResponse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                {onExport && (
                  <Button variant="ghost" size="sm" onClick={() => onExport(intent)}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Input Section (always visible) */}
        {renderInputSection()}

        {/* Loading during classification */}
        {isClassifying && (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
              <p className="text-secondary-500">Classifying intent...</p>
              <p className="text-xs text-secondary-400 mt-1">Analyzing input and matching to best agent</p>
            </div>
          </div>
        )}

        {/* Raw Response (debug) */}
        {showRawResponse && intent && (
          <Card variant="bordered" className="bg-secondary-50 dark:bg-secondary-800/50">
            <CardHeader icon={<Code className="h-4 w-4" />}>
              Raw Classification Response
              <button onClick={() => setShowRawResponse(false)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardBody>
              <pre className="text-xs bg-secondary-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 font-mono">
                {JSON.stringify(intent, null, 2)}
              </pre>
            </CardBody>
          </Card>
        )}

        {/* Intent Content */}
        {intent && !isClassifying && (
          <>
            {activeView === 'overview' && renderOverview()}
            {activeView === 'entities' && renderEntities()}
            {activeView === 'alternatives' && renderAlternatives()}
            {activeView === 'history' && renderHistory()}
          </>
        )}

        {/* Footer */}
        {intent && (
          <div className="text-center text-xs text-secondary-400 pt-4 border-t border-secondary-200 dark:border-secondary-700">
            Classification method: {methodConfig.label} • 
            Processing time: {intent.processingTimeMs || 'N/A'}ms • 
            Confidence threshold: {(confidenceThreshold * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Need to import Code icon
import { Code } from 'lucide-react';


export default IntentDisplay;
