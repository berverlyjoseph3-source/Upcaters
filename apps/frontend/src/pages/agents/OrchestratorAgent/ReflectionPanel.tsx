// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/ReflectionPanel.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Brain,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Award,
  Target,
  ArrowRight,
  Filter,
  Download,
  Share2,
  MoreVertical,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Sparkles,
  Bookmark,
  Flag,
  GitBranch,
  Layers,
  Minus,
  Plus,
  Cpu,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';

// ============================================
// Types
// ============================================

export interface AgentPerformance {
  success: boolean;
  efficiency: number;
  reliability: number;
  averageResponseTimeMs: number;
  recommendations: string[];
}

export interface ExecutionReflection {
  summary: string;
  insights: string[];
  improvements: string[];
  agentPerformance: Record<string, AgentPerformance>;
  recommendedNextSteps: string[];
  overallScore: number;
  successRate: number;
  timestamp: Date;
  generationTimeMs: number;
  model?: string;
  insightsStored: boolean;
}

export interface ReflectionHistoryEntry {
  id: string;
  executionId: string;
  reflection: ExecutionReflection;
  userFeedback?: {
    rating: 'positive' | 'negative' | 'neutral';
    comment?: string;
    helpfulInsights?: string[];
  };
  createdAt: Date;
}

interface ReflectionPanelProps {
  executionId?: string;
  executionResults?: any;
  onApplyImprovement?: (improvement: string) => void;
  onExecuteNextStep?: (nextStep: string) => void;
  onExportReflection?: (reflection: ExecutionReflection) => void;
  className?: string;
}

// ============================================
// Agent Color & Icon Configuration
// ============================================

const AGENT_CONFIG: Record<string, { label: string; color: string; bgColor: string; gradient: string; icon: React.ReactNode }> = {
  email: {
    label: 'Email Agent',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    gradient: 'from-blue-500 to-blue-600',
    icon: <Activity className="h-4 w-4" />,
  },
  drive: {
    label: 'Drive Agent',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    gradient: 'from-green-500 to-green-600',
    icon: <Activity className="h-4 w-4" />,
  },
  content: {
    label: 'Content Agent',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    gradient: 'from-purple-500 to-purple-600',
    icon: <Sparkles className="h-4 w-4" />,
  },
  social: {
    label: 'Social Agent',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    gradient: 'from-pink-500 to-pink-600',
    icon: <Activity className="h-4 w-4" />,
  },
  calendar: {
    label: 'Calendar Agent',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    gradient: 'from-orange-500 to-orange-600',
    icon: <Activity className="h-4 w-4" />,
  },
  web: {
    label: 'Web Agent',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    gradient: 'from-teal-500 to-teal-600',
    icon: <Activity className="h-4 w-4" />,
  },
  task: {
    label: 'Task Agent',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    gradient: 'from-indigo-500 to-indigo-600',
    icon: <Activity className="h-4 w-4" />,
  },
  orchestrator: {
    label: 'Orchestrator',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    gradient: 'from-gray-500 to-gray-600',
    icon: <Cpu className="h-4 w-4" />,
  },
};

// ============================================
// Component
// ============================================

export const ReflectionPanel: React.FC<ReflectionPanelProps> = ({
  executionId,
  executionResults,
  onApplyImprovement,
  onExecuteNextStep,
  onExportReflection,
  className = '',
}) => {
  // Store
  const {
    reflection,
    reflectionHistory,
    isReflectionLoading,
    reflectionError,
    generateReflection,
    storeReflectionInsight,
    getReflectionHistory,
    clearReflection,
  } = useOrchestratorStore();

  // Local state
  const [activeView, setActiveView] = useState<'overview' | 'agents' | 'insights' | 'history'>('overview');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [showAllImprovements, setShowAllImprovements] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{
    rating: 'positive' | 'negative' | 'neutral';
    comment: string;
    helpfulInsights: string[];
  }>({ rating: 'neutral', comment: '', helpfulInsights: [] });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);

  // Load reflection data
  useEffect(() => {
    if (executionResults && !reflection) {
      generateReflection(executionResults);
    }
  }, [executionResults, reflection, generateReflection]);

  useEffect(() => {
    getReflectionHistory();
  }, [getReflectionHistory]);

  // Trigger chart animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateCharts(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const handleToggleInsight = (insight: string) => {
    setExpandedInsight(expandedInsight === insight ? null : insight);
  };

  const handleToggleHelpfulInsight = (insight: string) => {
    setUserFeedback(prev => ({
      ...prev,
      helpfulInsights: prev.helpfulInsights.includes(insight)
        ? prev.helpfulInsights.filter(i => i !== insight)
        : [...prev.helpfulInsights, insight],
    }));
  };

  const handleSubmitFeedback = async () => {
    // Store feedback
    await storeReflectionInsight({
      reflectionId: reflection?.summary || '',
      feedback: userFeedback,
    });
    setShowFeedbackForm(false);
    setUserFeedback({ rating: 'neutral', comment: '', helpfulInsights: [] });
  };

  const handleRetryReflection = () => {
    if (executionResults) {
      generateReflection(executionResults);
    }
  };

  // ============================================
  // Derived Data
  // ============================================

  const agentPerformanceEntries = useMemo(() => {
    if (!reflection?.agentPerformance) return [];
    return Object.entries(reflection.agentPerformance)
      .sort((a, b) => b[1].efficiency - a[1].efficiency);
  }, [reflection]);

  const improvementCategories = useMemo(() => {
    if (!reflection?.improvements) return {};
    
    const categories: Record<string, string[]> = {
      'Performance': [],
      'Cost': [],
      'Accuracy': [],
      'Reliability': [],
      'User Experience': [],
      'Other': [],
    };

    reflection.improvements.forEach(improvement => {
      const lower = improvement.toLowerCase();
      if (lower.includes('speed') || lower.includes('performance') || lower.includes('faster')) {
        categories['Performance'].push(improvement);
      } else if (lower.includes('cost') || lower.includes('expensive') || lower.includes('save')) {
        categories['Cost'].push(improvement);
      } else if (lower.includes('accuracy') || lower.includes('correct') || lower.includes('error')) {
        categories['Accuracy'].push(improvement);
      } else if (lower.includes('reliab') || lower.includes('fail') || lower.includes('fallback')) {
        categories['Reliability'].push(improvement);
      } else if (lower.includes('user') || lower.includes('experience') || lower.includes('interface')) {
        categories['User Experience'].push(improvement);
      } else {
        categories['Other'].push(improvement);
      }
    });

    return categories;
  }, [reflection]);

  const topInsights = useMemo(() => {
    if (!reflection?.insights) return [];
    return reflection.insights.slice(0, 5);
  }, [reflection]);

  const scoreColor = useMemo(() => {
    if (!reflection) return 'text-secondary-500';
    const score = reflection.overallScore;
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }, [reflection]);

  // ============================================
  // View: Overview
  // ============================================

  const renderOverview = () => {
    if (!reflection) return null;

    return (
      <div className="space-y-6">
        {/* Score & Summary */}
        <Card variant="bordered" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke={reflection.overallScore >= 80 ? '#10b981' : reflection.overallScore >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(reflection.overallScore / 100) * 339.292} 339.292`}
                    transform="rotate(-90 60 60)"
                    style={{
                      transition: 'stroke-dasharray 1.5s ease-in-out',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${scoreColor}`}>
                    {reflection.overallScore}
                  </span>
                  <span className="text-xs text-secondary-500">Score</span>
                </div>
              </div>
            </div>

            {/* Key Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Success Rate</span>
                <span className={`text-lg font-bold ${reflection.successRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {reflection.successRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-1000"
                  style={{ width: animateCharts ? `${reflection.successRate}%` : '0%' }}
                />
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-secondary-600">Insights Generated</span>
                <span className="text-lg font-bold text-blue-600">
                  {reflection.insights.length}
                </span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-secondary-600">Improvements Suggested</span>
                <span className="text-lg font-bold text-purple-600">
                  {reflection.improvements.length}
                </span>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-secondary-600">Follow-up Actions</span>
                <span className="text-lg font-bold text-orange-600">
                  {reflection.recommendedNextSteps.length}
                </span>
              </div>
            </div>

            {/* Generation Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-secondary-400" />
                <span className="text-sm text-secondary-600">
                  Generated in {reflection.generationTimeMs}ms
                </span>
              </div>
              {reflection.model && (
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-secondary-400" />
                  <span className="text-sm text-secondary-600">
                    Model: {reflection.model}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-secondary-400" />
                <span className="text-sm text-secondary-600">
                  Insights stored: {reflection.insightsStored ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary-400" />
                <span className="text-sm text-secondary-600">
                  Agents analyzed: {Object.keys(reflection.agentPerformance).length}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader icon={<MessageSquare className="h-4 w-4" />}>Execution Summary</CardHeader>
          <CardBody>
            <p className="text-secondary-700 dark:text-secondary-300 leading-relaxed whitespace-pre-wrap">
              {reflection.summary}
            </p>
          </CardBody>
        </Card>

        {/* Key Insights */}
        <Card>
          <CardHeader icon={<Lightbulb className="h-4 w-4 text-yellow-500" />}>
            Key Insights ({reflection.insights.length})
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {topInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-secondary-700 dark:text-secondary-300">
                          {expandedInsight === insight ? insight : `${insight.substring(0, 150)}${insight.length > 150 ? '...' : ''}`}
                        </p>
                        {insight.length > 150 && (
                          <button
                            onClick={() => handleToggleInsight(insight)}
                            className="text-xs text-primary-600 hover:text-primary-700 mt-1"
                          >
                            {expandedInsight === insight ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleHelpfulInsight(insight)}
                      className={`p-1 rounded-md transition-colors ${
                        userFeedback.helpfulInsights.includes(insight)
                          ? 'bg-green-100 text-green-600'
                          : 'text-secondary-400 hover:bg-secondary-100'
                      }`}
                      title="Mark as helpful"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {reflection.insights.length > 5 && (
              <button
                onClick={() => setActiveView('insights')}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View all {reflection.insights.length} insights
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </CardBody>
        </Card>

        {/* Recommended Next Steps */}
        {reflection.recommendedNextSteps.length > 0 && (
          <Card>
            <CardHeader icon={<ArrowRight className="h-4 w-4 text-green-500" />}>
              Recommended Next Steps
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {reflection.recommendedNextSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors cursor-pointer"
                    onClick={() => onExecuteNextStep?.(step)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm text-secondary-700 dark:text-secondary-300">{step}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onExecuteNextStep?.(step); }}
                    >
                      Execute
                    </Button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  // ============================================
  // View: Agent Performance
  // ============================================

  const renderAgentPerformance = () => {
    if (!reflection) return null;

    return (
      <div className="space-y-6">
        {/* Agent Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentPerformanceEntries.map(([agentType, performance]) => {
            const config = AGENT_CONFIG[agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
            
            return (
              <Card
                key={agentType}
                variant="bordered"
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAgent === agentType ? 'ring-2 ring-primary-500' : ''
                }`}
                onClick={() => setSelectedAgent(selectedAgent === agentType ? null : agentType)}
              >
                <CardBody>
                  {/* Agent Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                        {config.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 dark:text-white">{config.label}</h4>
                        <div className="flex items-center gap-1">
                          {performance.success ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-xs text-secondary-500">
                            {performance.success ? 'Successful' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-secondary-900 dark:text-white">
                        {performance.efficiency.toFixed(0)}%
                      </span>
                      <p className="text-xs text-secondary-500">Efficiency</p>
                    </div>
                  </div>

                  {/* Efficiency Bar */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary-500">Efficiency</span>
                      <span>{performance.efficiency.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          performance.efficiency >= 90 ? 'bg-green-500' :
                          performance.efficiency >= 70 ? 'bg-blue-500' :
                          performance.efficiency >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: animateCharts ? `${performance.efficiency}%` : '0%' }}
                      />
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-secondary-500">Reliability</span>
                      <span>{performance.reliability.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          performance.reliability >= 90 ? 'bg-green-500' :
                          performance.reliability >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: animateCharts ? `${performance.reliability}%` : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Response Time */}
                  <div className="flex items-center gap-2 text-sm text-secondary-500 mb-2">
                    <Clock className="h-4 w-4" />
                    <span>Avg Response: {performance.averageResponseTimeMs}ms</span>
                  </div>

                  {/* Expanded Recommendations */}
                  {selectedAgent === agentType && performance.recommendations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                      <h5 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Recommendations</h5>
                      <div className="space-y-1">
                        {performance.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Sparkles className="h-3 w-3 text-primary-500 mt-0.5 flex-shrink-0" />
                            <span className="text-secondary-600 dark:text-secondary-400">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Performance Comparison Chart */}
        {agentPerformanceEntries.length > 0 && (
          <Card>
            <CardHeader icon={<BarChart3 className="h-4 w-4" />}>Performance Comparison</CardHeader>
            <CardBody>
              <div className="space-y-4">
                {agentPerformanceEntries.map(([agent, perf]) => (
                  <div key={agent} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary-700 dark:text-secondary-300">
                        {AGENT_CONFIG[agent.toLowerCase()]?.label || agent}
                      </span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-600">E: {perf.efficiency.toFixed(0)}%</span>
                        <span className="text-blue-600">R: {perf.reliability.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-4 bg-secondary-200 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 transition-all duration-1000"
                        style={{ width: animateCharts ? `${perf.efficiency}%` : '0%' }}
                      />
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: animateCharts ? `${perf.reliability}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  // ============================================
  // View: Insights & Improvements
  // ============================================

  const renderInsightsAndImprovements = () => {
    if (!reflection) return null;

    const displayedCategories = showAllImprovements
      ? Object.entries(improvementCategories)
      : Object.entries(improvementCategories).slice(0, 3);

    return (
      <div className="space-y-6">
        {/* All Insights */}
        <Card>
          <CardHeader icon={<Lightbulb className="h-4 w-4 text-yellow-500" />}>
            All Insights ({reflection.insights.length})
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {reflection.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
                        {insight}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => handleToggleHelpfulInsight(insight)}
                          className={`flex items-center gap-1 text-xs ${
                            userFeedback.helpfulInsights.includes(insight)
                              ? 'text-green-600'
                              : 'text-secondary-400 hover:text-green-600'
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          Helpful
                        </button>
                        <button className="flex items-center gap-1 text-xs text-secondary-400 hover:text-blue-600">
                          <Bookmark className="h-3 w-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Improvements by Category */}
        <Card>
          <CardHeader icon={<TrendingUp className="h-4 w-4 text-green-500" />}>
            Improvements ({reflection.improvements.length})
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {displayedCategories.map(([category, improvements]) => (
                improvements.length > 0 && (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2 flex items-center gap-2">
                      <Flag className="h-3 w-3" />
                      {category} ({improvements.length})
                    </h4>
                    <div className="space-y-2">
                      {improvements.map((improvement, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-secondary-700 dark:text-secondary-300">{improvement}</span>
                          </div>
                          {onApplyImprovement && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onApplyImprovement(improvement)}
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>

            {!showAllImprovements && Object.keys(improvementCategories).length > 3 && (
              <button
                onClick={() => setShowAllImprovements(true)}
                className="mt-4 w-full py-2 text-sm text-primary-600 hover:text-primary-700 border rounded-lg hover:bg-primary-50 transition-colors"
              >
                Show all categories
              </button>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  // ============================================
  // View: History
  // ============================================

  const renderHistory = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader icon={<Clock className="h-4 w-4" />}>
            Reflection History ({reflectionHistory.length})
          </CardHeader>
          <CardBody>
            {reflectionHistory.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No reflection history yet</p>
                <p className="text-sm">Reflections will appear here after executions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reflectionHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-secondary-900 dark:text-white">
                            Execution {entry.executionId.substring(0, 8)}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.reflection.overallScore >= 80
                              ? 'bg-green-100 text-green-700'
                              : entry.reflection.overallScore >= 60
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            Score: {entry.reflection.overallScore}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-500 mt-1">
                          {new Date(entry.createdAt).toLocaleString()} • 
                          {entry.reflection.insights.length} insights • 
                          {entry.reflection.improvements.length} improvements
                        </p>
                      </div>
                      {entry.userFeedback && (
                        <div className="flex items-center gap-1">
                          {entry.userFeedback.rating === 'positive' && (
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                          )}
                          {entry.userFeedback.rating === 'negative' && (
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2">
                      {entry.reflection.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isReflectionLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (reflectionError) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Reflection Failed</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{reflectionError}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={handleRetryReflection}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
          <Button variant="ghost" onClick={clearReflection}>
            Clear
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (!reflection && !isReflectionLoading) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center ${className}`}>
        <Brain className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Reflection Yet</h3>
        <p className="text-secondary-500 max-w-md mx-auto mb-4">
          Execute a plan to generate a reflection with insights, improvements, and performance analysis.
        </p>
        {executionResults && (
          <Button variant="primary" onClick={handleRetryReflection}>
            Generate Reflection
          </Button>
        )}
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
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Execution Reflection</h2>
              <p className="text-sm text-secondary-500">
                AI-powered analysis of execution performance and insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              {[
                { id: 'overview', label: 'Overview', icon: <Activity className="h-3 w-3" /> },
                { id: 'agents', label: 'Agents', icon: <Shield className="h-3 w-3" /> },
                { id: 'insights', label: 'Insights', icon: <Lightbulb className="h-3 w-3" /> },
                { id: 'history', label: 'History', icon: <Clock className="h-3 w-3" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                    activeView === tab.id
                      ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600'
                      : 'text-secondary-600 hover:text-secondary-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            {onExportReflection && (
              <Button variant="outline" size="sm" onClick={() => onExportReflection(reflection!)}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRetryReflection}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Active View Content */}
        {activeView === 'overview' && renderOverview()}
        {activeView === 'agents' && renderAgentPerformance()}
        {activeView === 'insights' && renderInsightsAndImprovements()}
        {activeView === 'history' && renderHistory()}

        {/* Feedback Button */}
        {reflection && !showFeedbackForm && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowFeedbackForm(true)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Was this reflection helpful?
            </Button>
          </div>
        )}

        {/* Feedback Form */}
        {showFeedbackForm && (
          <Card variant="bordered" className="bg-secondary-50 dark:bg-secondary-800/50">
            <CardBody>
              <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">
                Provide Feedback
              </h4>
              <div className="space-y-4">
                {/* Rating */}
                <div className="flex gap-2">
                  {(['positive', 'neutral', 'negative'] as const).map(rating => (
                    <button
                      key={rating}
                      onClick={() => setUserFeedback(prev => ({ ...prev, rating }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        userFeedback.rating === rating
                          ? rating === 'positive'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : rating === 'negative'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          : 'bg-white border border-secondary-300 hover:bg-secondary-50'
                      }`}
                    >
                      {rating === 'positive' && <ThumbsUp className="h-4 w-4" />}
                      {rating === 'negative' && <ThumbsDown className="h-4 w-4" />}
                      {rating === 'neutral' && <Minus className="h-4 w-4" />}
                      {rating.charAt(0).toUpperCase() + rating.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Comment */}
                <textarea
                  value={userFeedback.comment}
                  onChange={(e) => setUserFeedback(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Any additional feedback? (optional)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
                />

                {/* Helpful Insights */}
                {reflection && reflection.insights.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                      Helpful insights (optional)
                    </label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {reflection.insights.map((insight, idx) => (
                        <label key={idx} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userFeedback.helpfulInsights.includes(insight)}
                            onChange={() => handleToggleHelpfulInsight(insight)}
                            className="mt-0.5 w-4 h-4 rounded border-secondary-300 text-primary-600"
                          />
                          <span className="text-sm text-secondary-600 dark:text-secondary-400 line-clamp-2">
                            {insight}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setShowFeedbackForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSubmitFeedback}>
                    Submit Feedback
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Need to import Minus for the neutral feedback button
import { Minus } from 'lucide-react';


export default ReflectionPanel;
