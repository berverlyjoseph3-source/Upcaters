// ============================================
// apps/frontend/src/components/landing/interactive/WorkflowGraph.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Move,
  Sparkles,
  Zap,
  Brain,
  Mail,
  HardDrive,
  Share2,
  Calendar,
  Globe,
  CheckSquare,
  Cpu,
  GitBranch,
  Layers,
  ArrowRight,
  ArrowDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  Target,
  Shield,
  Star,
  Flag,
  GripVertical,
  Eye,
  EyeOff,
  Filter,
  Download,
  Share,
  Info,
  X,
  Plus,
  Minus,
  Settings,
  Link,
  Unlink,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type NodeRole = 'input' | 'processor' | 'output' | 'trigger' | 'condition' | 'orchestrator' | 'agent';

type NodeStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'warning';

type ConnectionStyle = 'solid' | 'dashed' | 'dotted' | 'animated';

type LayoutDirection = 'horizontal' | 'vertical';

type GraphTheme = 'dark' | 'darker' | 'midnight' | 'light';

type GraphVariant = 'default' | 'compact' | 'expanded' | 'minimal';

interface WorkflowNode {
  /** Unique node ID */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Node icon (Lucide component name or custom) */
  icon?: string;
  /** Custom icon component */
  iconComponent?: ReactNode;
  /** Node role in the workflow */
  role?: NodeRole;
  /** Current node status */
  status?: NodeStatus;
  /** CSS gradient for node background */
  gradient?: string;
  /** Node color */
  color?: string;
  /** Whether this node is highlighted */
  highlight?: boolean;
  /** Custom badge text */
  badge?: string;
  /** Badge color */
  badgeColor?: string;
  /** Whether this node is clickable */
  clickable?: boolean;
  /** Node metadata */
  metadata?: Record<string, any>;
  /** Child nodes (for nested workflows) */
  children?: WorkflowNode[];
  /** Execution duration in ms */
  duration?: number;
  /** Progress percentage (for running nodes) */
  progress?: number;
  /** Error message (for failed nodes) */
  error?: string;
  /** Custom CSS class */
  className?: string;
  /** Position override */
  position?: { x: number; y: number };
  /** Node size */
  size?: 'sm' | 'md' | 'lg';
}

interface WorkflowConnection {
  /** Unique connection ID */
  id?: string;
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Connection label */
  label?: string;
  /** Connection style */
  style?: ConnectionStyle;
  /** Connection color */
  color?: string;
  /** Whether the connection is active */
  active?: boolean;
  /** Arrow head at the end */
  showArrow?: boolean;
  /** Whether to animate data flow */
  animated?: boolean;
  /** Animation speed multiplier */
  animationSpeed?: number;
  /** Whether to show data flowing as dots */
  showDataFlow?: boolean;
  /** Flow particle color */
  flowColor?: string;
  /** Whether this is a fallback path */
  isFallback?: boolean;
  /** Conditional expression */
  condition?: string;
  /** Custom CSS class */
  className?: string;
}

interface WorkflowGraphProps {
  /** Workflow nodes */
  nodes: WorkflowNode[];
  /** Connections between nodes */
  connections: WorkflowConnection[];
  /** Graph layout direction */
  direction?: LayoutDirection;
  /** Graph visual theme */
  theme?: GraphTheme;
  /** Graph variant */
  variant?: GraphVariant;
  /** Whether to show the minimap */
  showMinimap?: boolean;
  /** Whether to show controls toolbar */
  showControls?: boolean;
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Whether to show grid background */
  showGrid?: boolean;
  /** Whether to show node status badges */
  showStatus?: boolean;
  /** Whether to show execution duration */
  showDuration?: boolean;
  /** Whether nodes are draggable */
  draggable?: boolean;
  /** Whether to enable zoom and pan */
  zoomable?: boolean;
  /** Initial zoom level */
  initialZoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Width of the graph canvas */
  width?: number | string;
  /** Height of the graph canvas */
  height?: number | string;
  /** Whether to auto-play the flow animation */
  autoPlay?: boolean;
  /** Auto-play interval in ms */
  autoPlayInterval?: number;
  /** Callback when a node is clicked */
  onNodeClick?: (node: WorkflowNode) => void;
  /** Callback when a connection is clicked */
  onConnectionClick?: (connection: WorkflowConnection) => void;
  /** Callback when auto-play completes a full cycle */
  onCycleComplete?: () => void;
  /** Callback when a node status changes */
  onNodeStatusChange?: (nodeId: string, status: NodeStatus) => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
}

// ============================================
// 2. CONSTANTS
// ============================================

const NODE_SIZE_MAP: Record<string, { width: number; height: number; fontSize: string; iconSize: string }> = {
  sm: { width: 140, height: 56, fontSize: '12px', iconSize: '18px' },
  md: { width: 180, height: 72, fontSize: '14px', iconSize: '24px' },
  lg: { width: 220, height: 88, fontSize: '16px', iconSize: '28px' },
};

const NODE_PADDING = { horizontal: 120, vertical: 100 };

const STATUS_CONFIG: Record<NodeStatus, { icon: ReactNode; color: string; bg: string; label: string }> = {
  idle: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: '#94a3b8',
    bg: 'bg-slate-500/20',
    label: 'Idle',
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: '#f59e0b',
    bg: 'bg-yellow-500/20',
    label: 'Pending',
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    color: '#3b82f6',
    bg: 'bg-blue-500/20',
    label: 'Running',
  },
  completed: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: '#10b981',
    bg: 'bg-green-500/20',
    label: 'Completed',
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: '#ef4444',
    bg: 'bg-red-500/20',
    label: 'Failed',
  },
  skipped: {
    icon: <ChevronRight className="h-3.5 w-3.5" />,
    color: '#6b7280',
    bg: 'bg-gray-500/20',
    label: 'Skipped',
  },
  warning: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: '#f97316',
    bg: 'bg-orange-500/20',
    label: 'Warning',
  },
};

const ROLE_CONFIG: Record<NodeRole, { icon: ReactNode; gradient: string; description: string }> = {
  input: {
    icon: <ArrowRight className="h-5 w-5" />,
    gradient: 'from-blue-500 to-blue-600',
    description: 'Entry point',
  },
  processor: {
    icon: <Cpu className="h-5 w-5" />,
    gradient: 'from-purple-500 to-purple-600',
    description: 'Data processing',
  },
  output: {
    icon: <CheckCircle className="h-5 w-5" />,
    gradient: 'from-green-500 to-green-600',
    description: 'Final output',
  },
  trigger: {
    icon: <Zap className="h-5 w-5" />,
    gradient: 'from-yellow-500 to-yellow-600',
    description: 'Trigger event',
  },
  condition: {
    icon: <GitBranch className="h-5 w-5" />,
    gradient: 'from-orange-500 to-orange-600',
    description: 'Condition check',
  },
  orchestrator: {
    icon: <Brain className="h-5 w-5" />,
    gradient: 'from-slate-500 to-slate-600',
    description: 'Central control',
  },
  agent: {
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-cyan-500 to-cyan-600',
    description: 'AI agent',
  },
};

const ICON_MAP: Record<string, ReactNode> = {
  mail: <Mail className="h-5 w-5" />,
  'hard-drive': <HardDrive className="h-5 w-5" />,
  share: <Share2 className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
  globe: <Globe className="h-5 w-5" />,
  'check-square': <CheckSquare className="h-5 w-5" />,
  cpu: <Cpu className="h-5 w-5" />,
  brain: <Brain className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  'git-branch': <GitBranch className="h-5 w-5" />,
  layers: <Layers className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
};

const THEME_CONFIG: Record<GraphTheme, { bg: string; surface: string; border: string; text: string; muted: string; grid: string }> = {
  dark: {
    bg: '#0d1117',
    surface: '#161b22',
    border: '#30363d',
    text: '#c9d1d9',
    muted: '#8b949e',
    grid: 'rgba(48, 54, 61, 0.4)',
  },
  darker: {
    bg: '#0a0a0a',
    surface: '#111111',
    border: '#222222',
    text: '#e0e0e0',
    muted: '#666666',
    grid: 'rgba(34, 34, 34, 0.5)',
  },
  midnight: {
    bg: '#0b0f1a',
    surface: '#111827',
    border: '#1f2937',
    text: '#e5e7eb',
    muted: '#6b7280',
    grid: 'rgba(31, 41, 55, 0.5)',
  },
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    muted: '#64748b',
    grid: 'rgba(226, 232, 240, 0.6)',
  },
};

// ============================================
// 3. HELPER: Calculate Node Positions
// ============================================

const calculateNodePositions = (
  nodes: WorkflowNode[],
  connections: WorkflowConnection[],
  direction: LayoutDirection,
  variant: GraphVariant
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeSize = NODE_SIZE_MAP[variant === 'compact' ? 'sm' : variant === 'expanded' ? 'lg' : 'md'];

  // Build adjacency
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((n) => {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  });
  connections.forEach((c) => {
    const inc = incoming.get(c.to) || [];
    inc.push(c.from);
    incoming.set(c.to, inc);
    const out = outgoing.get(c.from) || [];
    out.push(c.to);
    outgoing.set(c.from, out);
  });

  // Topological sort
  const levels: string[][] = [[]];
  const visited = new Set<string>();
  const roots = nodes.filter((n) => (incoming.get(n.id) || []).length === 0);

  let queue = roots.map((n) => n.id);

  while (queue.length > 0) {
    const levelNodes: string[] = [];
    const nextQueue: string[] = [];

    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      levelNodes.push(id);

      const children = outgoing.get(id) || [];
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          const allDepsMet = (incoming.get(childId) || []).every((dep) => visited.has(dep));
          if (allDepsMet && !nextQueue.includes(childId)) {
            nextQueue.push(childId);
          }
        }
      });
    }

    if (levelNodes.length > 0) {
      levels.push(levelNodes);
    }
    queue = nextQueue;
  }

  // Handle remaining
  const remaining = nodes.filter((n) => !visited.has(n.id));
  if (remaining.length > 0) {
    levels.push(remaining.map((n) => n.id));
  }

  const isHorizontal = direction === 'horizontal';
  const spacing = isHorizontal
    ? { x: nodeSize.width + NODE_PADDING.horizontal, y: nodeSize.height + NODE_PADDING.vertical }
    : { x: nodeSize.width + NODE_PADDING.vertical, y: nodeSize.height + NODE_PADDING.horizontal };

  levels.forEach((levelNodeIds, levelIndex) => {
    const size = isHorizontal ? spacing.y : spacing.x;
    const totalHeight = levelNodeIds.length * size;
    const startOffset = -totalHeight / 2 + size / 2;

    levelNodeIds.forEach((nodeId, nodeIndex) => {
      if (isHorizontal) {
        positions.set(nodeId, {
          x: levelIndex * spacing.x + 100,
          y: startOffset + nodeIndex * size + 200,
        });
      } else {
        positions.set(nodeId, {
          x: startOffset + nodeIndex * size + 400,
          y: levelIndex * spacing.y + 100,
        });
      }
    });
  });

  return positions;
};

// ============================================
// 4. MAIN COMPONENT
// ============================================

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  nodes,
  connections,
  direction = 'horizontal',
  theme = 'dark',
  variant = 'default',
  showMinimap = true,
  showControls = true,
  showLegend = true,
  showGrid = true,
  showStatus = true,
  showDuration = false,
  draggable = false,
  zoomable = true,
  initialZoom = 1,
  minZoom = 0.3,
  maxZoom = 2.5,
  width = '100%',
  height = 500,
  autoPlay = false,
  autoPlayInterval = 1500,
  onNodeClick,
  onConnectionClick,
  onCycleComplete,
  onNodeStatusChange,
  className = '',
  style,
  id = 'workflow-graph',
}) => {
  // ============================================
  // State
  // ============================================

  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [activeNodeIds, setActiveNodeIds] = useState<Set<string>>(new Set());
  const [activeConnectionIds, setActiveConnectionIds] = useState<Set<string>>(new Set());
  const [animationStep, setAnimationStep] = useState(0);
  const [showMinimapOverlay, setShowMinimapOverlay] = useState(showMinimap);
  const [showLegendOverlay, setShowLegendOverlay] = useState(showLegend);
  const [showControlsOverlay, setShowControlsOverlay] = useState(showControls);
  const [flowParticles, setFlowParticles] = useState<Array<{ connId: string; progress: number }>>([]);

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const themeColors = useMemo(() => THEME_CONFIG[theme], [theme]);

  const nodePositions = useMemo(
    () => calculateNodePositions(nodes, connections, direction, variant),
    [nodes, connections, direction, variant]
  );

  const nodeSize = useMemo(
    () => NODE_SIZE_MAP[variant === 'compact' ? 'sm' : variant === 'expanded' ? 'lg' : 'md'],
    [variant]
  );

  // Calculate canvas bounds
  const canvasBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodePositions.forEach((pos) => {
      minX = Math.min(minX, pos.x - nodeSize.width / 2 - 50);
      minY = Math.min(minY, pos.y - nodeSize.height / 2 - 50);
      maxX = Math.max(maxX, pos.x + nodeSize.width / 2 + 50);
      maxY = Math.max(maxY, pos.y + nodeSize.height / 2 + 50);
    });

    return {
      width: Math.max(800, maxX - minX + 100),
      height: Math.max(400, maxY - minY + 100),
      minX,
      minY,
    };
  }, [nodePositions, nodeSize]);

  // ============================================
  // Effects: Auto-play Animation
  // ============================================

  useEffect(() => {
    if (!autoPlay) return;

    const connectionList = connections.filter((c) => c.animated || c.showDataFlow);
    const nodeList = nodes.filter((n) => n.role);

    autoPlayRef.current = setInterval(() => {
      setAnimationStep((prev) => {
        const next = (prev + 1) % (connectionList.length + nodeList.length + 1);

        // Activate connections in order
        const newActiveConnections = new Set<string>();
        const newActiveNodes = new Set<string>();

        connectionList.slice(0, Math.min(next, connectionList.length)).forEach((c) => {
          newActiveConnections.add(c.id || `${c.from}-${c.to}`);
          newActiveNodes.add(c.from);
          newActiveNodes.add(c.to);
        });

        setActiveConnectionIds(newActiveConnections);
        setActiveNodeIds(newActiveNodes);

        if (next === connectionList.length + nodeList.length) {
          onCycleComplete?.();
        }

        return next;
      });
    }, autoPlayInterval);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, autoPlayInterval, connections, nodes, onCycleComplete]);

  // ============================================
  // Effects: Flow Particles Animation
  // ============================================

  useEffect(() => {
    const animatedConnections = connections.filter((c) => c.showDataFlow || c.animated);
    if (animatedConnections.length === 0) return;

    const animateParticles = () => {
      setFlowParticles((prev) => {
        const updated = [...prev];

        // Update existing particles
        const newParticles = updated
          .map((p) => ({
            ...p,
            progress: p.progress + 0.008 * (connections.find((c) => c.id === p.connId)?.animationSpeed || 1),
          }))
          .filter((p) => p.progress < 1);

        // Add new particles for active connections
        animatedConnections.forEach((c) => {
          const connId = c.id || `${c.from}-${c.to}`;
          if (Math.random() < 0.03) {
            newParticles.push({ connId, progress: 0 });
          }
        });

        return newParticles.slice(-50);
      });

      animationFrameRef.current = requestAnimationFrame(animateParticles);
    };

    animationFrameRef.current = requestAnimationFrame(animateParticles);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [connections]);

  // ============================================
  // Handlers
  // ============================================

  const handleNodeClick = useCallback(
    (node: WorkflowNode) => {
      setSelectedNode(selectedNode === node.id ? null : node.id);
      onNodeClick?.(node);
    },
    [selectedNode, onNodeClick]
  );

  const handleConnectionClick = useCallback(
    (connection: WorkflowConnection) => {
      const connId = connection.id || `${connection.from}-${connection.to}`;
      setHoveredConnection(hoveredConnection === connId ? null : connId);
      onConnectionClick?.(connection);
    },
    [hoveredConnection, onConnectionClick]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(maxZoom, prev + 0.2));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(minZoom, prev - 0.2));
  }, [minZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomable) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [zoomable, pan]
  );

  const handlePanMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    },
    [isPanning, panStart]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!zoomable) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(minZoom, Math.min(maxZoom, prev + delta)));
    },
    [zoomable, minZoom, maxZoom]
  );

  const getNodeIcon = useCallback(
    (node: WorkflowNode): ReactNode => {
      if (node.iconComponent) return node.iconComponent;
      if (node.icon && ICON_MAP[node.icon]) return ICON_MAP[node.icon];
      if (node.role && ROLE_CONFIG[node.role]) return ROLE_CONFIG[node.role].icon;
      return <Cpu className="h-5 w-5" />;
    },
    []
  );

  const getNodeColor = useCallback(
    (node: WorkflowNode): string => {
      if (node.color) return node.color;
      if (node.gradient) return node.gradient;
      if (node.role && ROLE_CONFIG[node.role]) return ROLE_CONFIG[node.role].gradient;
      return 'from-slate-500 to-slate-600';
    },
    []
  );

  // ============================================
  // 5. RENDER: SVG Nodes
  // ============================================

  const renderNodes = () => {
    return nodes.map((node) => {
      const pos = nodePositions.get(node.id) || node.position;
      if (!pos) return null;

      const isSelected = selectedNode === node.id;
      const isHovered = hoveredNode === node.id;
      const isActive = activeNodeIds.has(node.id);
      const statusConfig = node.status ? STATUS_CONFIG[node.status] : null;
      const color = getNodeColor(node);
      const icon = getNodeIcon(node);

      return (
        <g
          key={node.id}
          transform={`translate(${pos.x - nodeSize.width / 2}, ${pos.y - nodeSize.height / 2})`}
          className={`
            cursor-pointer transition-all duration-300
            ${node.clickable !== false ? 'cursor-pointer' : ''}
            ${isHovered ? 'scale-105' : 'scale-100'}
          `}
          onClick={() => handleNodeClick(node)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          {/* Node Background */}
          <rect
            width={nodeSize.width}
            height={nodeSize.height}
            rx="14"
            className={`
              transition-all duration-300
              ${isSelected ? 'stroke-brand-primary stroke-2' : 'stroke-transparent stroke-1'}
              ${isActive ? 'opacity-100' : 'opacity-90'}
            `}
            fill={themeColors.surface}
            stroke={isSelected ? '#3B82F6' : themeColors.border}
            filter={isHovered || isSelected ? 'drop-shadow(0 4px 12px rgba(59,130,246,0.25))' : undefined}
          />

          {/* Gradient Line at Top */}
          <rect
            width={nodeSize.width}
            height="3"
            rx="1.5"
            fill={`url(#gradient-${node.id})`}
          />
          <defs>
            <linearGradient id={`gradient-${node.id}`} x1="0" y1="0" x2="1" y2="0">
              {color.split(' ')[1]?.replace('from-', '') && color.split(' ')[3]?.replace('to-', '') ? (
                <>
                  <stop offset="0%" stopColor={`var(--${color.split(' ')[1].replace('from-', '')})` || '#3B82F6'} />
                  <stop offset="100%" stopColor={`var(--${color.split(' ')[3].replace('to-', '')})` || '#7C3AED'} />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* Icon */}
          <foreignObject x="12" y="16" width="28" height="28">
            <div
              className={`
                w-7 h-7 rounded-lg
                bg-gradient-to-br ${color}
                flex items-center justify-center
                text-white
                transition-all duration-300
                ${isActive ? 'animate-pulse' : ''}
              `}
            >
              {React.cloneElement(icon as React.ReactElement, { className: 'h-4 w-4' })}
            </div>
          </foreignObject>

          {/* Label */}
          <text
            x="48"
            y="28"
            fill={themeColors.text}
            fontSize={nodeSize.fontSize.replace('px', '')}
            fontWeight="600"
            className="select-none"
          >
            {node.label.length > 18 ? `${node.label.substring(0, 16)}...` : node.label}
          </text>

          {/* Description / Duration */}
          {showDuration && node.duration && (
            <text
              x="48"
              y="44"
              fill={themeColors.muted}
              fontSize="11"
              className="select-none"
            >
              <tspan>{node.duration}ms</tspan>
            </text>
          )}

          {/* Status Badge */}
          {showStatus && statusConfig && (
            <g transform={`translate(${nodeSize.width - 80}, 12)`}>
              <rect
                width="68"
                height="22"
                rx="7"
                fill={statusConfig.bg}
                stroke={statusConfig.color}
                strokeWidth="1"
                opacity="0.8"
              />
              <foreignObject x="4" y="3" width="60" height="16">
                <div className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: statusConfig.color }}>
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                </div>
              </foreignObject>
            </g>
          )}

          {/* Badge */}
          {node.badge && (
            <g transform={`translate(${nodeSize.width - 50}, ${nodeSize.height - 22})`}>
              <rect
                width="40"
                height="16"
                rx="5"
                fill={node.badgeColor || '#3B82F6'}
                opacity="0.15"
              />
              <text
                x="20"
                y="12"
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={node.badgeColor || '#3B82F6'}
              >
                {node.badge}
              </text>
            </g>
          )}

          {/* Progress bar for running nodes */}
          {node.status === 'running' && node.progress !== undefined && (
            <g transform={`translate(12, ${nodeSize.height - 8})`}>
              <rect
                width={nodeSize.width - 24}
                height="4"
                rx="2"
                fill={themeColors.border}
              />
              <rect
                width={(nodeSize.width - 24) * (node.progress / 100)}
                height="4"
                rx="2"
                fill="#3B82F6"
                className="transition-all duration-500"
              />
            </g>
          )}

          {/* Error indicator */}
          {node.status === 'failed' && node.error && (
            <g transform={`translate(${nodeSize.width + 6}, ${nodeSize.height / 2 - 8})`}>
              <circle r="6" fill="#ef4444" />
              <text x="0" y="3" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">!</text>
            </g>
          )}

          {/* Highlight ring */}
          {node.highlight && (
            <rect
              width={nodeSize.width + 4}
              height={nodeSize.height + 4}
              x="-2"
              y="-2"
              rx="16"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="6 3"
              opacity="0.6"
            />
          )}
        </g>
      );
    });
  };

  // ============================================
  // 6. RENDER: SVG Connections
  // ============================================

  const renderConnections = () => {
    return connections.map((connection, index) => {
      const fromPos = nodePositions.get(connection.from);
      const toPos = nodePositions.get(connection.to);
      if (!fromPos || !toPos) return null;

      const connId = connection.id || `${connection.from}-${connection.to}`;
      const isActive = activeConnectionIds.has(connId);
      const isHovered = hoveredConnection === connId;
      const isFallback = connection.isFallback;

      // Calculate connection points
      const isHorizontal = direction === 'horizontal';
      let startX: number;
      let startY: number;
      let endX: number;
      let endY: number;

      if (isHorizontal) {
        startX = fromPos.x + nodeSize.width / 2;
        startY = fromPos.y;
        endX = toPos.x - nodeSize.width / 2;
        endY = toPos.y;
      } else {
        startX = fromPos.x;
        startY = fromPos.y + nodeSize.height / 2;
        endX = toPos.x;
        endY = toPos.y - nodeSize.height / 2;
      }

      // Generate path
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const controlPoint = isHorizontal
        ? { x: midX, y: startY }
        : { x: startX, y: midY };

      const path = `
        M ${startX} ${startY}
        C ${controlPoint.x} ${controlPoint.y},
          ${controlPoint.x} ${controlPoint.y},
          ${endX} ${endY}
      `;

      const strokeColor = isFallback
        ? '#f59e0b'
        : connection.color || (isActive ? '#3B82F6' : themeColors.border);

      const dashArray = connection.style === 'dashed' ? '8 4' : connection.style === 'dotted' ? '3 3' : 'none';

      return (
        <g
          key={connId}
          className="cursor-pointer"
          onClick={() => handleConnectionClick(connection)}
          onMouseEnter={() => setHoveredConnection(connId)}
          onMouseLeave={() => setHoveredConnection(null)}
        >
          {/* Invisible wider path for easier click */}
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth="12"
          />

          {/* Visible path */}
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={isHovered ? 2.5 : isActive ? 2 : 1.5}
            strokeDasharray={dashArray}
            strokeLinecap="round"
            className={`
              transition-all duration-300
              ${connection.animated || isActive ? 'animate-dash' : ''}
            `}
            style={{
              opacity: isActive ? 1 : 0.5,
              filter: isActive ? 'drop-shadow(0 0 3px rgba(59,130,246,0.4))' : undefined,
            }}
            markerEnd={connection.showArrow !== false ? `url(#arrow-${connId})` : undefined}
          />

          {/* Arrow Marker */}
          {connection.showArrow !== false && (
            <defs>
              <marker
                id={`arrow-${connId}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={strokeColor} />
              </marker>
            </defs>
          )}

          {/* Flow Particles */}
          {connection.showDataFlow &&
            flowParticles
              .filter((p) => p.connId === connId)
              .map((particle, pIdx) => {
                const t = particle.progress;
                const px = isHorizontal
                  ? startX + (endX - startX) * t
                  : startX + (endX - startX) * t;
                const py = isHorizontal
                  ? startY + (endY - startY) * t
                  : startY + (endY - startY) * t;

                return (
                  <circle
                    key={`particle-${pIdx}`}
                    cx={px}
                    cy={py}
                    r="3"
                    fill={connection.flowColor || '#3B82F6'}
                    opacity={0.8}
                    className="animate-pulse"
                  />
                );
              })}

          {/* Label */}
          {connection.label && (
            <text
              x={isHorizontal ? midX : startX - 20}
              y={isHorizontal ? startY - 12 : midY}
              textAnchor="middle"
              fill={themeColors.muted}
              fontSize="11"
              className="select-none"
            >
              {connection.label}
            </text>
          )}

          {/* Fallback indicator */}
          {isFallback && (
            <text
              x={isHorizontal ? midX : startX - 20}
              y={isHorizontal ? startY + 16 : midY + 16}
              textAnchor="middle"
              fill="#f59e0b"
              fontSize="10"
              className="select-none"
            >
              fallback
            </text>
          )}

          {/* Condition label */}
          {connection.condition && (
            <g transform={`translate(${isHorizontal ? midX : startX - 20}, ${isHorizontal ? startY - 28 : midY - 16})`}>
              <rect
                x="-40"
                y="-10"
                width="80"
                height="20"
                rx="5"
                fill={themeColors.surface}
                stroke={themeColors.border}
                strokeWidth="1"
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill={themeColors.muted}
                fontSize="10"
                className="select-none"
              >
                {connection.condition}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  // ============================================
  // 7. RENDER: Minimap
  // ============================================

  const renderMinimap = () => {
    if (!showMinimapOverlay) return null;

    const minimapWidth = 200;
    const minimapHeight = 120;
    const scale = Math.min(
      minimapWidth / canvasBounds.width,
      minimapHeight / canvasBounds.height
    );

    return (
      <div
        className="absolute bottom-4 right-4 rounded-lg overflow-hidden border shadow-lg z-10"
        style={{
          width: minimapWidth,
          height: minimapHeight,
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <svg width={minimapWidth} height={minimapHeight} viewBox={`0 0 ${minimapWidth} ${minimapHeight}`}>
          {/* Mini nodes */}
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const mx = (pos.x - canvasBounds.minX) * scale;
            const my = (pos.y - canvasBounds.minY) * scale;

            return (
              <rect
                key={node.id}
                x={mx - 3}
                y={my - 2}
                width="6"
                height="4"
                rx="1"
                fill={activeNodeIds.has(node.id) ? '#3B82F6' : themeColors.muted}
              />
            );
          })}

          {/* Mini connections */}
          {connections.map((conn) => {
            const fromPos = nodePositions.get(conn.from);
            const toPos = nodePositions.get(conn.to);
            if (!fromPos || !toPos) return null;

            const x1 = (fromPos.x - canvasBounds.minX) * scale;
            const y1 = (fromPos.y - canvasBounds.minY) * scale;
            const x2 = (toPos.x - canvasBounds.minX) * scale;
            const y2 = (toPos.y - canvasBounds.minY) * scale;
            const connId = conn.id || `${conn.from}-${conn.to}`;

            return (
              <line
                key={connId}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={activeConnectionIds.has(connId) ? '#3B82F6' : themeColors.border}
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  // ============================================
  // 8. RENDER: Legend
  // ============================================

  const renderLegend = () => {
    if (!showLegendOverlay) return null;

    const statuses = Object.entries(STATUS_CONFIG).slice(0, 5);

    return (
      <div
        className="absolute bottom-4 left-4 rounded-xl p-3 border shadow-lg z-10 text-xs"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <h4 className="font-semibold mb-2" style={{ color: themeColors.text }}>
          Legend
        </h4>
        <div className="space-y-1.5">
          {statuses.map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span style={{ color: themeColors.muted }}>{config.label}</span>
            </div>
          ))}
          <div className="border-t my-1" style={{ borderColor: themeColors.border }} />
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#f59e0b' }} />
            <span style={{ color: themeColors.muted }}>Fallback path</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-0.5 rounded"
              style={{
                background: `repeating-linear-gradient(90deg, ${themeColors.border} 0, ${themeColors.border} 4px, transparent 4px, transparent 8px)`,
              }}
            />
            <span style={{ color: themeColors.muted }}>Conditional</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 9. RENDER: Controls Toolbar
  // ============================================

  const renderControls = () => {
    if (!showControlsOverlay) return null;

    return (
      <div
        className="absolute top-4 right-4 flex items-center gap-1 rounded-xl p-1.5 border shadow-lg z-10"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: themeColors.muted }}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: themeColors.muted }}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomReset}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: themeColors.muted }}
          title="Reset view"
        >
          <Target className="h-4 w-4" />
        </button>
        <div className="w-px h-5" style={{ backgroundColor: themeColors.border }} />
        <button
          onClick={() => setShowMinimapOverlay(!showMinimapOverlay)}
          className={`p-1.5 rounded-lg transition-colors ${showMinimapOverlay ? 'bg-white/10' : 'hover:bg-white/5'}`}
          style={{ color: showMinimapOverlay ? '#3B82F6' : themeColors.muted }}
          title="Toggle minimap"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowLegendOverlay(!showLegendOverlay)}
          className={`p-1.5 rounded-lg transition-colors ${showLegendOverlay ? 'bg-white/10' : 'hover:bg-white/5'}`}
          style={{ color: showLegendOverlay ? '#3B82F6' : themeColors.muted }}
          title="Toggle legend"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // ============================================
  // 10. RENDER: Selected Node Detail Panel
  // ============================================

  const renderDetailPanel = () => {
    if (!selectedNode) return null;
    const node = nodes.find((n) => n.id === selectedNode);
    if (!node) return null;

    const statusConfig = node.status ? STATUS_CONFIG[node.status] : null;

    return (
      <div
        className="absolute top-4 left-4 rounded-xl p-4 border shadow-xl z-10 max-w-xs"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getNodeColor(node)} flex items-center justify-center text-white`}>
              {getNodeIcon(node)}
            </div>
            <span className="font-semibold" style={{ color: themeColors.text }}>
              {node.label}
            </span>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="p-1 rounded hover:bg-white/5"
            style={{ color: themeColors.muted }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {node.description && (
          <p className="text-xs mb-2" style={{ color: themeColors.muted }}>
            {node.description}
          </p>
        )}

        <div className="space-y-1.5 text-xs">
          {node.role && (
            <div className="flex justify-between">
              <span style={{ color: themeColors.muted }}>Role</span>
              <span className="capitalize" style={{ color: themeColors.text }}>
                {node.role}
              </span>
            </div>
          )}
          {statusConfig && (
            <div className="flex justify-between items-center">
              <span style={{ color: themeColors.muted }}>Status</span>
              <span className="flex items-center gap-1" style={{ color: statusConfig.color }}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
          )}
          {node.duration && (
            <div className="flex justify-between">
              <span style={{ color: themeColors.muted }}>Duration</span>
              <span style={{ color: themeColors.text }}>{node.duration}ms</span>
            </div>
          )}
          {node.error && (
            <div className="mt-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">
              {node.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // 11. MAIN RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        relative overflow-hidden rounded-xl border
        ${isPanning ? 'cursor-grabbing' : zoomable ? 'cursor-grab' : ''}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: themeColors.bg,
        borderColor: themeColors.border,
        ...style,
      }}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      onMouseLeave={handlePanEnd}
      onWheel={handleWheel}
    >
      {/* Grid Background */}
      {showGrid && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke={themeColors.grid} strokeWidth="0.5" />
            </pattern>
            <pattern id="grid-pattern-large" width="150" height="150" patternUnits="userSpaceOnUse">
              <rect width="150" height="150" fill="url(#grid-pattern)" />
              <path d="M 150 0 L 0 0 0 150" fill="none" stroke={themeColors.grid} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern-large)" />
        </svg>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${canvasBounds.width / zoom} ${canvasBounds.height / zoom}`}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Drop shadow filter */}
        <defs>
          <filter id="node-shadow" x="-10%" y="-10%" width="130%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
          </filter>
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connections */}
        <g className="connections-layer">{renderConnections()}</g>

        {/* Nodes */}
        <g className="nodes-layer" filter="url(#node-shadow)">
          {renderNodes()}
        </g>
      </svg>

      {/* Overlays */}
      {renderControls()}
      {renderMinimap()}
      {renderLegend()}
      {renderDetailPanel()}

      {/* Flow status indicator */}
      {autoPlay && (
        <div
          className="absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 z-10"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            border: '1px solid',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span style={{ color: themeColors.muted }}>
            Auto-play • Step {animationStep + 1}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================
// 12. DISPLAY NAME
// ============================================

WorkflowGraph.displayName = 'WorkflowGraph';

// ============================================
// 13. NAMED EXPORTS
// ============================================

export {
  NODE_SIZE_MAP,
  STATUS_CONFIG,
  ROLE_CONFIG,
  ICON_MAP,
  THEME_CONFIG,
  calculateNodePositions,
};

// ============================================
// 14. TYPE EXPORTS
// ============================================

export type {
  NodeRole,
  NodeStatus,
  ConnectionStyle,
  LayoutDirection,
  GraphTheme,
  GraphVariant,
  WorkflowNode,
  WorkflowConnection,
  WorkflowGraphProps,
};

// ============================================
// 15. DEFAULT EXPORT
// ============================================

export default WorkflowGraph;