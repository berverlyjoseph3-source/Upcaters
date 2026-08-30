// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/OrchestratorAgent/PlanVisualizer.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  GitBranch,
  Layers,
  ArrowRight,
  ArrowDown,
  Play,
  Pause,
  Square,
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Target,
  Filter,
  Search,
  Download,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Minus,
  GripVertical,
  MoreVertical,
  Edit,
  Trash2,
  Save,
  X,
  Info,
  Settings,
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
  Shield,
  Star,
  Flag,
  Award,
  GitMerge,
  GitPullRequest,
  Link,
  Unlink,
  Move,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { TaskPlan, TaskPlanStep, ExecutionMode } from '../../../types/orchestrator.types';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

export type PlanStatus = 'draft' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled' | 'optimized';

export interface VisualPlanStep {
  id: string;
  agentType: string;
  action: string;
  description?: string;
  input?: any;
  dependsOn: string[];
  parallelGroup?: string;
  fallback?: VisualPlanStep;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  estimatedCostUsd?: number;
  estimatedTokens?: number;
  status?: PlanStatus;
  position?: { x: number; y: number };
  level?: number;
}

export interface VisualPlan {
  id: string;
  steps: VisualPlanStep[];
  mode: ExecutionMode;
  estimatedTokens?: number;
  estimatedCostUsd?: number;
  createdAt: Date;
  status?: PlanStatus;
  optimization?: {
    originalSteps: number;
    optimizedSteps: number;
    savingsPercentage: number;
    changes: string[];
  };
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  suggestions?: string[];
}

interface PlanVisualizerProps {
  plan?: VisualPlan;
  planData?: TaskPlan;
  onExecute?: (plan: VisualPlan) => void;
  onOptimize?: (plan: VisualPlan) => void;
  onEditStep?: (stepId: string) => void;
  onDeleteStep?: (stepId: string) => void;
  onAddStep?: () => void;
  onReorderStep?: (stepId: string, direction: 'up' | 'down') => void;
  onValidate?: (plan: VisualPlan) => PlanValidationResult;
  onExport?: (plan: VisualPlan) => void;
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
}> = {
  email: {
    name: 'Email Agent',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    gradient: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  drive: {
    name: 'Drive Agent',
    icon: <HardDrive className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    gradient: 'from-green-500 to-green-600',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  content: {
    name: 'Content Agent',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    gradient: 'from-purple-500 to-purple-600',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  social: {
    name: 'Social Agent',
    icon: <Share2 className="h-5 w-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    gradient: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-300 dark:border-pink-700',
  },
  calendar: {
    name: 'Calendar Agent',
    icon: <Calendar className="h-5 w-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    gradient: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
  web: {
    name: 'Web Agent',
    icon: <Globe className="h-5 w-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    gradient: 'from-teal-500 to-teal-600',
    borderColor: 'border-teal-300 dark:border-teal-700',
  },
  task: {
    name: 'Task Agent',
    icon: <CheckSquare className="h-5 w-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    gradient: 'from-indigo-500 to-indigo-600',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
  },
  orchestrator: {
    name: 'Orchestrator',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    gradient: 'from-gray-500 to-gray-600',
    borderColor: 'border-gray-300 dark:border-gray-700',
  },
};

const MODE_CONFIG: Record<ExecutionMode, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = {
  sequential: {
    label: 'Sequential',
    description: 'Steps execute one after another in order',
    icon: <ArrowDown className="h-4 w-4" />,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  parallel: {
    label: 'Parallel',
    description: 'Independent steps execute simultaneously',
    icon: <Layers className="h-4 w-4" />,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  },
  conditional: {
    label: 'Conditional',
    description: 'Steps execute based on conditions',
    icon: <GitBranch className="h-4 w-4" />,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
  pipeline: {
    label: 'Pipeline',
    description: 'Output of one step feeds into the next',
    icon: <ArrowRight className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  },
  fan_out: {
    label: 'Fan Out',
    description: 'One step triggers multiple parallel steps',
    icon: <GitMerge className="h-4 w-4" />,
    color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
  },
  fan_in: {
    label: 'Fan In',
    description: 'Multiple steps converge into one',
    icon: <GitPullRequest className="h-4 w-4" />,
    color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
  },
  loop: {
    label: 'Loop',
    description: 'Steps repeat until condition is met',
    icon: <RefreshCw className="h-4 w-4" />,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
  },
};

// ============================================
// Component
// ============================================

export const PlanVisualizer: React.FC<PlanVisualizerProps> = ({
  plan: planProp,
  planData,
  onExecute,
  onOptimize,
  onEditStep,
  onDeleteStep,
  onAddStep,
  onReorderStep,
  onValidate,
  onExport,
  className = '',
}) => {
  // Store
  const {
    currentPlan,
    planValidation,
    isPlanLoading,
    planError,
    createPlan,
    optimizePlan,
    validatePlan,
    updatePlanStep,
  } = useOrchestratorStore();

  // Local state
  const [viewMode, setViewMode] = useState<'flowchart' | 'list' | 'details'>('flowchart');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [dragStep, setDragStep] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showFallbacks, setShowFallbacks] = useState(false);
  const [showCostEstimates, setShowCostEstimates] = useState(true);
  const [highlightPath, setHighlightPath] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // Derived Data
  // ============================================

  const plan = useMemo((): VisualPlan | null => {
    if (planProp) return planProp;
    if (planData) {
      return {
        id: planData.id,
        steps: planData.steps.map(step => ({
          id: step.id,
          agentType: step.agentType,
          action: step.action,
          description: step.description,
          input: step.input,
          dependsOn: step.dependsOn || [],
          parallelGroup: step.parallelGroup,
          fallback: step.fallback ? {
            id: step.fallback.id,
            agentType: step.fallback.agentType,
            action: step.fallback.action,
            dependsOn: step.fallback.dependsOn || [],
          } : undefined,
          retryCount: step.retryCount,
          maxRetries: step.maxRetries || 3,
          timeout: step.timeout,
          estimatedCostUsd: step.estimatedCostUsd,
          estimatedTokens: step.estimatedTokens,
        })),
        mode: planData.mode,
        estimatedTokens: planData.estimatedTokens,
        estimatedCostUsd: planData.estimatedCostUsd,
        createdAt: planData.createdAt,
        status: planData.status as PlanStatus,
        optimization: currentPlan?.optimization,
      };
    }
    if (currentPlan) {
      return {
        id: currentPlan.id,
        steps: currentPlan.steps.map(step => ({
          id: step.id,
          agentType: step.agentType,
          action: step.action,
          description: step.description,
          input: step.input,
          dependsOn: step.dependsOn || [],
          parallelGroup: step.parallelGroup,
          fallback: step.fallback ? {
            id: step.fallback.id,
            agentType: step.fallback.agentType,
            action: step.fallback.action,
            dependsOn: step.fallback.dependsOn || [],
          } : undefined,
          retryCount: step.retryCount,
          maxRetries: step.maxRetries || 3,
          timeout: step.timeout,
          estimatedCostUsd: step.estimatedCostUsd,
          estimatedTokens: step.estimatedTokens,
        })),
        mode: currentPlan.mode,
        estimatedTokens: currentPlan.estimatedTokens,
        estimatedCostUsd: currentPlan.estimatedCostUsd,
        createdAt: currentPlan.createdAt,
        status: currentPlan.status as PlanStatus,
        optimization: currentPlan.optimization,
      };
    }
    return null;
  }, [planProp, planData, currentPlan]);

  // Build step graph with levels for hierarchical layout
  const stepGraph = useMemo(() => {
    if (!plan?.steps) return { levels: [], maxLevel: 0, stepMap: new Map() };

    const stepMap = new Map<string, VisualPlanStep>();
    const incomingEdges = new Map<string, string[]>();
    const outgoingEdges = new Map<string, string[]>();

    // Initialize maps
    plan.steps.forEach(step => {
      stepMap.set(step.id, step);
      incomingEdges.set(step.id, []);
      outgoingEdges.set(step.id, []);
    });

    // Build dependency graph
    plan.steps.forEach(step => {
      step.dependsOn.forEach(depId => {
        if (stepMap.has(depId)) {
          incomingEdges.get(step.id)?.push(depId);
          outgoingEdges.get(depId)?.push(step.id);
        }
      });
    });

    // Calculate levels (topological sort)
    const levels: string[][] = [[]];
    const visited = new Set<string>();
    const queue: string[] = [];

    // Find root steps (no dependencies)
    plan.steps.forEach(step => {
      if (step.dependsOn.length === 0) {
        queue.push(step.id);
      }
    });

    if (queue.length === 0 && plan.steps.length > 0) {
      // If all steps have dependencies, start with first
      queue.push(plan.steps[0].id);
    }

    // BFS to calculate levels
    let processedCount = 0;
    const maxIterations = plan.steps.length * 2;
    
    while (queue.length > 0 && processedCount < maxIterations) {
      const levelSteps: string[] = [];
      const nextQueue: string[] = [];
      
      for (const stepId of queue) {
        if (visited.has(stepId)) continue;
        visited.add(stepId);
        levelSteps.push(stepId);
        processedCount++;
        
        const children = outgoingEdges.get(stepId) || [];
        for (const childId of children) {
          if (!visited.has(childId)) {
            const allDepsMet = (incomingEdges.get(childId) || []).every(depId => visited.has(depId));
            if (allDepsMet) {
              nextQueue.push(childId);
            }
          }
        }
      }
      
      if (levelSteps.length > 0) {
        levels.push(levelSteps);
      }
      
      // Add remaining unvisited steps that have all dependencies met
      for (const step of plan.steps) {
        if (!visited.has(step.id)) {
          const allDepsMet = step.dependsOn.every(depId => visited.has(depId) || !stepMap.has(depId));
          if (allDepsMet && !nextQueue.includes(step.id)) {
            nextQueue.push(step.id);
          }
        }
      }
      
      queue.length = 0;
      queue.push(...nextQueue);
    }

    // Add any remaining unvisited steps
    const remainingSteps = plan.steps.filter(s => !visited.has(s.id));
    if (remainingSteps.length > 0) {
      levels.push(remainingSteps.map(s => s.id));
      remainingSteps.forEach(s => visited.add(s.id));
    }

    return { levels, maxLevel: levels.length - 1, stepMap };
  }, [plan]);

  const summary = useMemo(() => {
    if (!plan) return null;
    
    const steps = plan.steps;
    const totalEstimatedCost = steps.reduce((sum, s) => sum + (s.estimatedCostUsd || 0), 0) + (plan.estimatedCostUsd || 0);
    const totalEstimatedTokens = steps.reduce((sum, s) => sum + (s.estimatedTokens || 0), 0) + (plan.estimatedTokens || 0);
    const agentsUsed = new Set(steps.map(s => s.agentType));
    
    return {
      totalSteps: steps.length,
      totalEstimatedCost,
      totalEstimatedTokens,
      agentsUsed: agentsUsed.size,
      agentList: Array.from(agentsUsed),
      mode: plan.mode,
      hasFallbacks: steps.some(s => s.fallback),
      hasParallel: steps.some(s => s.parallelGroup),
      criticalPathLength: stepGraph ? stepGraph.maxLevel : 0,
    };
  }, [plan, stepGraph]);

  // ============================================
  // Handlers
  // ============================================

  const handleStepClick = (stepId: string) => {
    setSelectedStep(selectedStep === stepId ? null : stepId);
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const handleStepDoubleClick = (stepId: string) => {
    onEditStep?.(stepId);
  };

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => setZoomLevel(z => Math.min(3, z + 0.2));
  const handleZoomOut = () => setZoomLevel(z => Math.max(0.3, z - 0.2));
  const handleZoomReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    setDragStep(stepId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stepId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStepId: string) => {
    e.preventDefault();
    if (dragStep && dragStep !== targetStepId) {
      // Reorder logic would go here
    }
    setDragStep(null);
  };

  const handleHighlightPath = (stepId: string) => {
    if (!plan) return;
    
    const visited = new Set<string>();
    const path: string[] = [];
    
    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      path.push(id);
      
      const step = stepGraph.stepMap.get(id);
      if (step?.dependsOn) {
        step.dependsOn.forEach(depId => traverse(depId));
      }
    };
    
    traverse(stepId);
    setHighlightPath(path);
  };

  const handleClearHighlight = () => {
    setHighlightPath([]);
  };

  // ============================================
  // Render: Flowchart View (SVG)
  // ============================================

  const renderFlowchartView = () => {
    if (!plan || !stepGraph.levels || stepGraph.levels.length === 0) {
      return (
        <div className="text-center py-12 text-secondary-500">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No plan steps to visualize</p>
        </div>
      );
    }

    const stepWidth = 200;
    const stepHeight = 80;
    const horizontalGap = 60;
    const verticalGap = 80;
    const nodeSpacing = stepWidth + horizontalGap;
    const levelSpacing = stepHeight + verticalGap;

    const levels = stepGraph.levels.filter(l => l.length > 0);
    const maxStepsInLevel = Math.max(...levels.map(l => l.length), 1);
    
    const canvasWidth = (maxStepsInLevel * nodeSpacing + 200) * zoomLevel;
    const canvasHeight = (levels.length * levelSpacing + 200) * zoomLevel;

    // Calculate positions for each step
    const stepPositions = new Map<string, { x: number; y: number }>();
    
    levels.forEach((levelSteps, levelIndex) => {
      const levelWidth = levelSteps.length * nodeSpacing;
      const startX = (canvasWidth / zoomLevel - levelWidth) / 2 + nodeSpacing / 2;
      
      levelSteps.forEach((stepId, stepIndex) => {
        stepPositions.set(stepId, {
          x: startX + stepIndex * nodeSpacing,
          y: 100 + levelIndex * levelSpacing,
        });
      });
    });

    // Calculate dependency lines
    const dependencyLines: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; fromId: string; toId: string }> = [];
    
    plan.steps.forEach(step => {
      step.dependsOn.forEach(depId => {
        const fromPos = stepPositions.get(depId);
        const toPos = stepPositions.get(step.id);
        if (fromPos && toPos) {
          dependencyLines.push({
            from: { x: fromPos.x, y: fromPos.y + stepHeight / 2 },
            to: { x: toPos.x, y: toPos.y - stepHeight / 2 },
            fromId: depId,
            toId: step.id,
          });
        }
      });
    });

    return (
      <div
        ref={canvasRef}
        className="relative overflow-hidden bg-secondary-50 dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700"
        style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="ghost" size="xs" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="xs" onClick={handleZoomReset}>
            <Target className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend Toggle */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="absolute top-4 left-4 z-10 text-xs text-secondary-500 hover:text-secondary-700"
        >
          {showLegend ? 'Hide Legend' : 'Show Legend'}
        </button>

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${-panOffset.x / zoomLevel} ${-panOffset.y / zoomLevel} ${canvasWidth / zoomLevel} ${canvasHeight / zoomLevel}`}
          className={`transition-transform duration-200 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {/* Definitions */}
          <defs>
            {/* Arrow marker */}
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
            
            {/* Glow filter for highlighted steps */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shadow filter */}
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Background grid */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <rect className="canvas-bg" width={canvasWidth / zoomLevel} height={canvasHeight / zoomLevel} fill="url(#grid)" />

          {/* Dependency Lines */}
          {showDependencies && dependencyLines.map((line, idx) => {
            const isHighlighted = highlightPath.includes(line.fromId) && highlightPath.includes(line.toId);
            
            return (
              <g key={`dep-${idx}`}>
                {/* Line */}
                <line
                  x1={line.from.x}
                  y1={line.from.y}
                  x2={line.to.x}
                  y2={line.to.y}
                  stroke={isHighlighted ? '#3b82f6' : '#94a3b8'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray={isHighlighted ? 'none' : '4 3'}
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Parallel Group Lines */}
          {plan.steps
            .filter(s => s.parallelGroup)
            .map((step, idx) => {
              const pos = stepPositions.get(step.id);
              if (!pos) return null;
              
              return (
                <rect
                  key={`parallel-${idx}`}
                  x={pos.x - stepWidth / 2 - 10}
                  y={pos.y - stepHeight / 2 - 10}
                  width={stepWidth + 20}
                  height={stepHeight + 20}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                  rx="12"
                  opacity="0.5"
                />
              );
            })}

          {/* Step Nodes */}
          {plan.steps.map((step, idx) => {
            const pos = stepPositions.get(step.id);
            if (!pos) return null;
            
            const agentConfig = AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
            const isSelected = selectedStep === step.id;
            const isHovered = hoveredStep === step.id;
            const isHighlighted = highlightPath.includes(step.id);
            const isExpanded = expandedStep === step.id;

            return (
              <g
                key={step.id}
                transform={`translate(${pos.x - stepWidth / 2}, ${pos.y - stepHeight / 2})`}
                className="cursor-pointer"
                onClick={() => handleStepClick(step.id)}
                onDoubleClick={() => handleStepDoubleClick(step.id)}
                onMouseEnter={() => {
                  setHoveredStep(step.id);
                  handleHighlightPath(step.id);
                }}
                onMouseLeave={() => {
                  setHoveredStep(null);
                  handleClearHighlight();
                }}
                draggable
                onDragStart={(e) => handleDragStart(e as any, step.id)}
                filter={isHighlighted ? 'url(#glow)' : 'url(#shadow)'}
              >
                {/* Node Background */}
                <rect
                  width={stepWidth}
                  height={isExpanded ? stepHeight * 2.5 : stepHeight}
                  rx="12"
                  className={`
                    ${agentConfig.bgColor}
                    ${isSelected ? 'ring-2 ring-primary-500' : ''}
                    ${isHighlighted ? 'ring-2 ring-blue-400' : ''}
                    transition-all duration-200
                  `}
                  fill="white"
                  stroke={isHighlighted ? '#3b82f6' : isSelected ? '#6366f1' : '#e2e8f0'}
                  strokeWidth={isSelected || isHighlighted ? 2 : 1}
                />

                {/* Agent Icon */}
                <foreignObject x="12" y="12" width="36" height="36">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agentConfig.gradient} flex items-center justify-center text-white`}>
                    {agentConfig.icon}
                  </div>
                </foreignObject>

                {/* Step Title */}
                <text x="56" y="28" className="text-sm font-semibold fill-secondary-900 dark:fill-white" fontSize="13">
                  {step.action.length > 20 ? step.action.substring(0, 18) + '...' : step.action}
                </text>

                {/* Agent Name */}
                <text x="56" y="44" className="text-xs fill-secondary-500" fontSize="11">
                  {agentConfig.name}
                </text>

                {/* Step Info Row */}
                <g transform="translate(12, 62)">
                  {/* Estimated Time */}
                  {step.timeout && (
                    <g>
                      <rect x="0" y="0" width="50" height="20" rx="6" fill="#f1f5f9" />
                      <text x="25" y="14" textAnchor="middle" className="text-xs fill-secondary-600" fontSize="10">
                        <tspan>{step.timeout / 1000}s</tspan>
                      </text>
                    </g>
                  )}

                  {/* Retry Info */}
                  {step.maxRetries > 0 && (
                    <g transform="translate(54, 0)">
                      <rect x="0" y="0" width="50" height="20" rx="6" fill="#fef3c7" />
                      <text x="25" y="14" textAnchor="middle" className="text-xs fill-yellow-700" fontSize="10">
                        ↻ {step.maxRetries}x
                      </text>
                    </g>
                  )}

                  {/* Cost */}
                  {showCostEstimates && step.estimatedCostUsd && (
                    <g transform="translate(108, 0)">
                      <rect x="0" y="0" width="60" height="20" rx="6" fill="#f0fdf4" />
                      <text x="30" y="14" textAnchor="middle" className="text-xs fill-green-700" fontSize="10">
                        ${step.estimatedCostUsd.toFixed(2)}
                      </text>
                    </g>
                  )}
                </g>

                {/* Expanded Details */}
                {isExpanded && (
                  <g transform="translate(12, 90)">
                    {/* Dependencies */}
                    {step.dependsOn.length > 0 && (
                      <text y="12" className="text-xs fill-secondary-500" fontSize="10">
                        Depends on: {step.dependsOn.map(id => id.substring(0, 6)).join(', ')}
                      </text>
                    )}
                    
                    {/* Tokens */}
                    {step.estimatedTokens && (
                      <text y="28" className="text-xs fill-secondary-500" fontSize="10">
                        Est. Tokens: {step.estimatedTokens.toLocaleString()}
                      </text>
                    )}

                    {/* Parallel Group */}
                    {step.parallelGroup && (
                      <text y="44" className="text-xs fill-green-600" fontSize="10">
                        Parallel Group: {step.parallelGroup}
                      </text>
                    )}

                    {/* Fallback */}
                    {step.fallback && (
                      <text y="60" className="text-xs fill-orange-600" fontSize="10">
                        Has Fallback: {step.fallback.action}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* Mode Indicator */}
          {plan.mode && (
            <g transform={`translate(${canvasWidth / zoomLevel - 220}, 20)`}>
              <rect width="200" height="36" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <text x="100" y="14" textAnchor="middle" className="text-xs font-semibold fill-secondary-700" fontSize="11">
                Mode: {MODE_CONFIG[plan.mode]?.label || plan.mode}
              </text>
              <text x="100" y="28" textAnchor="middle" className="text-xs fill-secondary-400" fontSize="10">
                {MODE_CONFIG[plan.mode]?.description || ''}
              </text>
            </g>
          )}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 p-3 text-xs">
            <h4 className="font-semibold text-secondary-900 dark:text-white mb-2">Legend</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-secondary-400" />
                <span className="text-secondary-600">Dependency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-green-500 border-dashed" />
                <span className="text-secondary-600">Parallel Group</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-secondary-600">Highlighted Path</span>
              </div>
            </div>
          </div>
        )}

        {/* Step Count Badge */}
        <div className="absolute bottom-4 right-4 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 px-3 py-1.5 text-xs font-medium">
                  <span className="text-secondary-600">
            {plan?.steps.length || 0} steps
          </span>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: List View
  // ============================================

  const renderListView = () => {
    if (!plan) return null;

    return (
      <div className="space-y-4">
        {/* Plan Header */}
        <Card variant="bordered">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${MODE_CONFIG[plan.mode]?.color || 'bg-secondary-100'}`}>
                  {MODE_CONFIG[plan.mode]?.icon || <GitBranch className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-900 dark:text-white">
                    {plan.steps.length} Steps • {MODE_CONFIG[plan.mode]?.label || plan.mode} Mode
                  </h3>
                  <p className="text-xs text-secondary-500">
                    Created {formatDistanceToNow(plan.createdAt, { addSuffix: true })}
                    {plan.optimization && (
                      <span className="ml-2 text-green-600">
                        • Optimized: {plan.optimization.savingsPercentage}% savings
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-secondary-500">
                  Est. Cost: <span className="font-medium text-secondary-900 dark:text-white">${(summary?.totalEstimatedCost || 0).toFixed(4)}</span>
                </span>
                <span className="text-secondary-500">
                  Est. Tokens: <span className="font-medium text-secondary-900 dark:text-white">{summary?.totalEstimatedTokens?.toLocaleString() || 0}</span>
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Steps List */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50 dark:bg-secondary-700/50">
                <tr>
                  <th className="w-10 px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Dependencies</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Retries</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Timeout</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Est. Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {plan.steps.map((step, index) => {
                  const agentConfig = AGENT_CONFIG[step.agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
                  const isSelected = selectedStep === step.id;
                  const isExpanded = expandedStep === step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <tr
                        className={`
                          hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors cursor-pointer
                          ${isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : ''}
                        `}
                        onClick={() => handleStepClick(step.id)}
                      >
                        <td className="px-4 py-3 text-xs text-secondary-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-secondary-400 cursor-grab" />
                            <span className="font-medium text-secondary-900 dark:text-white">{step.action}</span>
                            {step.parallelGroup && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Parallel
                              </span>
                            )}
                            {step.fallback && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                                Fallback
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`${agentConfig.color}`}>{agentConfig.icon}</span>
                            <span className="text-xs">{agentConfig.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {step.dependsOn.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {step.dependsOn.map(depId => {
                                const depStep = plan.steps.find(s => s.id === depId);
                                return (
                                  <span key={depId} className="px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-xs">
                                    {depStep?.action.substring(0, 15) || depId.substring(0, 8)}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-secondary-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {step.retryCount || 0}/{step.maxRetries || 3}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {step.timeout ? `${step.timeout / 1000}s` : 'Default'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs">
                          {step.estimatedCostUsd ? `$${step.estimatedCostUsd.toFixed(4)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={(e) => { e.stopPropagation(); onEditStep?.(step.id); }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={(e) => { e.stopPropagation(); onDeleteStep?.(step.id); }}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={(e) => { e.stopPropagation(); handleStepClick(step.id); }}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-secondary-50 dark:bg-secondary-700/30">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-secondary-500">Description</p>
                                <p>{step.description || 'No description'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-secondary-500">Est. Tokens</p>
                                <p className="font-medium">{step.estimatedTokens?.toLocaleString() || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-secondary-500">Timeout</p>
                                <p className="font-medium">{step.timeout ? `${step.timeout / 1000}s` : 'Default (30s)'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-secondary-500">Parallel Group</p>
                                <p className="font-medium">{step.parallelGroup || 'None'}</p>
                              </div>
                            </div>
                            {step.input && (
                              <div className="mt-3">
                                <p className="text-xs text-secondary-500 mb-1">Input</p>
                                <pre className="text-xs bg-secondary-100 dark:bg-secondary-900 p-2 rounded-lg overflow-x-auto max-h-32 font-mono">
                                  {JSON.stringify(step.input, null, 2)}
                                </pre>
                              </div>
                            )}
                            {step.fallback && (
                              <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                                <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                  <Flag className="h-3 w-3 inline mr-1" />
                                  Fallback: {step.fallback.action} (via {step.fallback.agentType})
                                </p>
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
  // Render: Details View
  // ============================================

  const renderDetailsView = () => {
    if (!plan || !summary) return null;

    const validation = onValidate?.(plan);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Summary */}
        <Card className="lg:col-span-2">
          <CardHeader icon={<GitBranch className="h-4 w-4" />}>Plan Details</CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <p className="text-2xl font-bold text-secondary-900 dark:text-white">{summary.totalSteps}</p>
                <p className="text-xs text-secondary-500">Total Steps</p>
              </div>
              <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{summary.agentsUsed}</p>
                <p className="text-xs text-secondary-500">Agents Used</p>
              </div>
              <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <p className="text-2xl font-bold text-green-600">${summary.totalEstimatedCost.toFixed(4)}</p>
                <p className="text-xs text-secondary-500">Est. Cost</p>
              </div>
              <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{summary.totalEstimatedTokens.toLocaleString()}</p>
                <p className="text-xs text-secondary-500">Est. Tokens</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Execution Mode</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${MODE_CONFIG[plan.mode]?.color}`}>
                  {MODE_CONFIG[plan.mode]?.icon}
                  {MODE_CONFIG[plan.mode]?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Has Parallel Steps</span>
                <span className={`text-xs font-medium ${summary.hasParallel ? 'text-green-600' : 'text-secondary-400'}`}>
                  {summary.hasParallel ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Has Fallbacks</span>
                <span className={`text-xs font-medium ${summary.hasFallbacks ? 'text-orange-600' : 'text-secondary-400'}`}>
                  {summary.hasFallbacks ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Critical Path Length</span>
                <span className="text-xs font-medium">{summary.criticalPathLength} levels</span>
              </div>
            </div>

            {/* Agents Used */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Agents Used</h4>
              <div className="flex flex-wrap gap-2">
                {summary.agentList.map(agentType => {
                  const config = AGENT_CONFIG[agentType.toLowerCase()] || AGENT_CONFIG.orchestrator;
                  return (
                    <div
                      key={agentType}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                    >
                      {config.icon}
                      {config.name}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Validation & Optimization */}
        <div className="space-y-6">
          {/* Validation Results */}
          {validation && (
            <Card>
              <CardHeader icon={validation.valid ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}>
                Plan Validation
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {validation.errors.map((error, idx) => (
                    <div key={`err-${idx}`} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700">
                      <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {error}
                    </div>
                  ))}
                  {validation.warnings.map((warning, idx) => (
                    <div key={`warn-${idx}`} className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg text-xs text-yellow-700">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {warning}
                    </div>
                  ))}
                  {validation.info.map((info, idx) => (
                    <div key={`info-${idx}`} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {info}
                    </div>
                  ))}
                </div>
                {validation.suggestions && validation.suggestions.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">Suggestions</h5>
                    <ul className="space-y-1">
                      {validation.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-xs text-secondary-500 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-primary-500" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Optimization Results */}
          {plan.optimization && (
            <Card variant="bordered" className="bg-green-50 dark:bg-green-900/10">
              <CardHeader icon={<Sparkles className="h-4 w-4 text-green-600" />}>
                Optimization Applied
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Original Steps</span>
                    <span className="font-medium">{plan.optimization.originalSteps}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Optimized Steps</span>
                    <span className="font-medium text-green-600">{plan.optimization.optimizedSteps}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary-600">Savings</span>
                    <span className="font-medium text-green-600">{plan.optimization.savingsPercentage}%</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <h5 className="text-xs font-semibold text-secondary-700 mb-1">Changes Made</h5>
                    <ul className="space-y-1">
                      {plan.optimization.changes.map((change, idx) => (
                        <li key={idx} className="text-xs text-secondary-500 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isPlanLoading && !plan) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (planError && !plan) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-700 dark:text-red-300 mb-2">Failed to Load Plan</h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{planError}</p>
        <Button variant="primary" onClick={() => createPlan && createPlan()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Create New Plan
        </Button>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (!plan || plan.steps.length === 0) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-12 text-center ${className}`}>
        <GitBranch className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Plan Created</h3>
        <p className="text-secondary-500 max-w-md mx-auto mb-6">
          Create an execution plan by classifying an intent, then visualize the step-by-step workflow here.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={onAddStep}>
            <Plus className="h-4 w-4 mr-1" />
            Add First Step
          </Button>
          <Button variant="outline" onClick={() => createPlan && createPlan()}>
            <Sparkles className="h-4 w-4 mr-1" />
            Auto-Generate Plan
          </Button>
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
            <GitBranch className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">Plan Visualizer</h2>
              <p className="text-sm text-secondary-500">
                {summary?.totalSteps || 0} steps • {summary?.agentsUsed || 0} agents • {summary?.criticalPathLength || 0} levels deep
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              {[
                { id: 'flowchart', label: 'Flowchart', icon: <GitBranch className="h-3.5 w-3.5" /> },
                { id: 'list', label: 'List', icon: <Layers className="h-3.5 w-3.5" /> },
                { id: 'details', label: 'Details', icon: <Info className="h-3.5 w-3.5" /> },
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

            {/* Toggles */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDependencies(!showDependencies)}
            >
              {showDependencies ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            {/* Action Buttons */}
            {onAddStep && (
              <Button variant="outline" size="sm" onClick={onAddStep}>
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            )}
            {onValidate && (
              <Button variant="outline" size="sm" onClick={() => onValidate(plan)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Validate
              </Button>
            )}
            {onOptimize && (
              <Button variant="outline" size="sm" onClick={() => onOptimize(plan)}>
                <Sparkles className="h-4 w-4 mr-1" />
                Optimize
              </Button>
            )}
            {onExecute && (
              <Button variant="primary" size="sm" onClick={() => onExecute(plan)}>
                <Play className="h-4 w-4 mr-1" />
                Execute Plan
              </Button>
            )}
            {onExport && (
              <Button variant="ghost" size="sm" onClick={() => onExport(plan)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Plan Status Banner */}
        {plan.status && plan.status !== 'ready' && (
          <div className={`
            rounded-xl p-3 flex items-center gap-3 text-sm
            ${plan.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700' :
              plan.status === 'executing' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700' :
              plan.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700' :
              plan.status === 'optimized' ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700' :
              plan.status === 'cancelled' ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600' :
              'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700'}
          `}>
            <Info className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium capitalize">Plan Status: {plan.status}</span>
            {plan.optimization && plan.status === 'optimized' && (
              <span className="text-green-600 font-medium">
                • {plan.optimization.savingsPercentage}% more efficient
              </span>
            )}
          </div>
        )}

        {/* Plan Content */}
        {viewMode === 'flowchart' && renderFlowchartView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'details' && renderDetailsView()}

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-secondary-400 pt-4 border-t border-secondary-200 dark:border-secondary-700">
          <span>Plan ID: {plan.id.substring(0, 12)}...</span>
          <span>
            Created: {format(plan.createdAt, 'MMM d, yyyy HH:mm')} • 
            {plan.estimatedTokens && ` ${plan.estimatedTokens.toLocaleString()} tokens`} • 
            {plan.estimatedCostUsd && ` $${plan.estimatedCostUsd.toFixed(4)}`}
          </span>
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default PlanVisualizer;
