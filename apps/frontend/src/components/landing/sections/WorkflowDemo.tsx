// ============================================
// apps/frontend/src/components/landing/sections/WorkflowDemo.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  CSSProperties,
  ReactNode,
} from 'react';

// ============================================
// 1. TYPES
// ============================================

type WorkflowVariant = 'default' | 'card' | 'minimal' | 'glass' | 'dark';

type WorkflowSize = 'sm' | 'md' | 'lg';

type WorkflowLayout = 'horizontal' | 'vertical' | 'flowchart';

type WorkflowAnimation = 'slide' | 'fade' | 'draw' | 'none';

type NodeShape = 'rounded' | 'circle' | 'hexagon' | 'pill' | 'diamond';

type NodeStatus = 'idle' | 'running' | 'completed' | 'error' | 'disabled';

type NodeSize = 'sm' | 'md' | 'lg';

type ConnectionStyle = 'solid' | 'dashed' | 'dotted' | 'animated';

type ConnectionType = 'straight' | 'curved' | 'step' | 'bezier';

interface WorkflowNode {
  /** Unique node ID */
  id: string;
  /** Node label */
  label: string;
  /** Node description */
  description?: string;
  /** Node icon */
  icon?: ReactNode;
  /** Node icon name (for dynamic lookup) */
  iconName?: string;
  /** Node shape */
  shape?: NodeShape;
  /** Node size */
  size?: NodeSize;
  /** Node color */
  color?: string;
  /** Node gradient */
  gradient?: string;
  /** Node status */
  status?: NodeStatus;
  /** Whether this is the starting node */
  isStart?: boolean;
  /** Whether this is the ending node */
  isEnd?: boolean;
  /** Whether this node is highlighted */
  highlight?: boolean;
  /** Whether this node is interactive */
  interactive?: boolean;
  /** Custom badge */
  badge?: string;
  /** Node position (for flowchart) */
  position?: { x: number; y: number };
  /** Animation delay in ms */
  animationDelay?: number;
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
  /** Connection type */
  type?: ConnectionType;
  /** Connection color */
  color?: string;
  /** Whether to show arrow */
  showArrow?: boolean;
  /** Whether connection is active */
  active?: boolean;
  /** Whether to animate */
  animated?: boolean;
  /** Whether this is a fallback path */
  isFallback?: boolean;
}

interface WorkflowStep {
  /** Step number */
  step: number;
  /** Step title */
  title: string;
  /** Step description */
  description?: string;
  /** Step icon */
  icon?: ReactNode;
  /** Step status */
  status?: NodeStatus;
  /** Step duration */
  duration?: string;
}

interface WorkflowDemoProps {
  /** Array of workflow nodes */
  nodes?: WorkflowNode[];
  /** Array of connections between nodes */
  connections?: WorkflowConnection[];
  /** Simplified step-by-step workflow */
  steps?: WorkflowStep[];
  /** Visual variant */
  variant?: WorkflowVariant;
  /** Size preset */
  size?: WorkflowSize;
  /** Layout direction */
  layout?: WorkflowLayout;
  /** Entrance animation */
  animation?: WorkflowAnimation;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether to animate on scroll */
  animateOnView?: boolean;
  /** Whether to stagger node animations */
  stagger?: boolean;
  /** Stagger delay in ms */
  staggerDelay?: number;
  /** Whether to show connection lines */
  showConnections?: boolean;
  /** Whether to show arrows on connections */
  showArrows?: boolean;
  /** Whether to show node status indicators */
  showStatus?: boolean;
  /** Whether to show step numbers */
  showStepNumbers?: boolean;
  /** Whether to show step descriptions */
  showDescriptions?: boolean;
  /** Whether to auto-play the workflow animation */
  autoPlay?: boolean;
  /** Auto-play interval in ms */
  autoPlayInterval?: number;
  /** Current active step (controlled) */
  activeStep?: number;
  /** Callback when node is clicked */
  onNodeClick?: (node: WorkflowNode) => void;
  /** Callback when step changes */
  onStepChange?: (step: number) => void;
  /** Whether to show section header */
  showHeader?: boolean;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Section badge */
  badge?: string;
  /** Whether to show code preview */
  showCodePreview?: boolean;
  /** Code to display */
  code?: string;
  /** Code language */
  codeLanguage?: string;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
}

// ============================================
// 2. SIZE & VARIANT PRESETS
// ============================================

const SIZE_CONFIG: Record<
  WorkflowSize,
  {
    node: string;
    nodePadding: string;
    nodeGap: string;
    icon: string;
    label: string;
    description: string;
    stepNumber: string;
    connectionWidth: number;
  }
> = {
  sm: {
    node: 'min-w-[120px]',
    nodePadding: 'px-3 py-2',
    nodeGap: 'gap-6',
    icon: 'w-6 h-6',
    label: 'text-xs',
    description: 'text-[10px]',
    stepNumber: 'w-6 h-6 text-xs',
    connectionWidth: 1.5,
  },
  md: {
    node: 'min-w-[160px]',
    nodePadding: 'px-4 py-3',
    nodeGap: 'gap-8',
    icon: 'w-8 h-8',
    label: 'text-sm',
    description: 'text-xs',
    stepNumber: 'w-8 h-8 text-sm',
    connectionWidth: 2,
  },
  lg: {
    node: 'min-w-[200px]',
    nodePadding: 'px-6 py-4',
    nodeGap: 'gap-12',
    icon: 'w-10 h-10',
    label: 'text-base',
    description: 'text-sm',
    stepNumber: 'w-10 h-10 text-base',
    connectionWidth: 2.5,
  },
};

const VARIANT_CONFIG: Record<
  WorkflowVariant,
  {
    node: string;
    nodeActive: string;
    nodeCompleted: string;
    nodeError: string;
    nodeHover: string;
    labelColor: string;
    descriptionColor: string;
    connectionColor: string;
    connectionActive: string;
    bg: string;
  }
> = {
  default: {
    node: 'bg-white dark:bg-brand-surface border border-brand-border shadow-sm',
    nodeActive: 'border-brand-primary bg-brand-primary/[0.03] ring-1 ring-brand-primary/30',
    nodeCompleted: 'border-green-500/30 bg-green-500/[0.03]',
    nodeError: 'border-red-500/30 bg-red-500/[0.03]',
    nodeHover: 'hover:shadow-md hover:border-brand-primary/20 hover:-translate-y-0.5',
    labelColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    connectionColor: '#1F2937',
    connectionActive: '#3B82F6',
    bg: '',
  },
  card: {
    node: 'bg-white dark:bg-brand-surface border border-brand-border shadow-md rounded-2xl',
    nodeActive: 'border-brand-primary bg-brand-primary/[0.03] ring-2 ring-brand-primary/20 shadow-lg',
    nodeCompleted: 'border-green-500/30 bg-green-500/[0.03] shadow-md',
    nodeError: 'border-red-500/30 bg-red-500/[0.03] shadow-md',
    nodeHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    labelColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    connectionColor: '#1F2937',
    connectionActive: '#3B82F6',
    bg: '',
  },
  minimal: {
    node: 'bg-transparent border-0',
    nodeActive: 'bg-brand-primary/[0.05]',
    nodeCompleted: 'bg-green-500/[0.05]',
    nodeError: 'bg-red-500/[0.05]',
    nodeHover: 'hover:bg-brand-primary/[0.03]',
    labelColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    connectionColor: '#1F2937',
    connectionActive: '#3B82F6',
    bg: '',
  },
  glass: {
    node: 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl',
    nodeActive: 'border-brand-primary/40 bg-brand-primary/10',
    nodeCompleted: 'border-green-500/30 bg-green-500/10',
    nodeError: 'border-red-500/30 bg-red-500/10',
    nodeHover: 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg',
    labelColor: 'text-white',
    descriptionColor: 'text-white/60',
    connectionColor: 'rgba(255,255,255,0.1)',
    connectionActive: '#3B82F6',
    bg: '',
  },
  dark: {
    node: 'bg-brand-surface border border-brand-border shadow-lg',
    nodeActive: 'border-brand-primary bg-brand-primary/[0.05] ring-1 ring-brand-primary/30',
    nodeCompleted: 'border-green-500/30 bg-green-500/[0.05]',
    nodeError: 'border-red-500/30 bg-red-500/[0.05]',
    nodeHover: 'hover:shadow-xl hover:border-brand-primary/30',
    labelColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    connectionColor: '#1F2937',
    connectionActive: '#3B82F6',
    bg: 'bg-brand-surface',
  },
};

const NODE_SHAPE_CONFIG: Record<NodeShape, string> = {
  rounded: 'rounded-xl',
  circle: 'rounded-full',
  hexagon: 'rounded-xl',
  pill: 'rounded-full',
  diamond: 'rounded-xl',
};

const NODE_SIZE_CONFIG: Record<NodeSize, { padding: string; icon: string; label: string }> = {
  sm: { padding: 'px-3 py-2', icon: 'w-5 h-5', label: 'text-xs' },
  md: { padding: 'px-4 py-3', icon: 'w-6 h-6', label: 'text-sm' },
  lg: { padding: 'px-6 py-4', icon: 'w-8 h-8', label: 'text-base' },
};

const STATUS_CONFIG: Record<
  NodeStatus,
  { color: string; bg: string; icon: ReactNode; pulse: boolean }
> = {
  idle: {
    color: '#6B7280',
    bg: 'bg-gray-500/20',
    icon: null,
    pulse: false,
  },
  running: {
    color: '#3B82F6',
    bg: 'bg-blue-500/20',
    icon: (
      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    pulse: true,
  },
  completed: {
    color: '#22C55E',
    bg: 'bg-green-500/20',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    pulse: false,
  },
  error: {
    color: '#EF4444',
    bg: 'bg-red-500/20',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    pulse: false,
  },
  disabled: {
    color: '#374151',
    bg: 'bg-gray-700/20',
    icon: null,
    pulse: false,
  },
};

// ============================================
// 3. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes workflow-slide-in {
    0% {
      opacity: 0;
      transform: translateX(-30px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes workflow-fade-in {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes workflow-draw-line {
    0% {
      stroke-dashoffset: 1000;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }

  @keyframes workflow-pulse-active {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
    }
  }

  @keyframes workflow-flow-dash {
    0% {
      stroke-dashoffset: 24;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }

  @keyframes workflow-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @keyframes workflow-glow {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.2);
    }
  }
`;

// ============================================
// 4. SUB-COMPONENT: Workflow Node
// ============================================

interface WorkflowNodeComponentProps {
  node: WorkflowNode;
  isActive: boolean;
  showStatus: boolean;
  animation: WorkflowAnimation;
  animationDuration: number;
  animationDelay: number;
  isInView: boolean;
  variant: WorkflowVariant;
  size: WorkflowSize;
  onClick?: (node: WorkflowNode) => void;
}

const WorkflowNodeComponent: React.FC<WorkflowNodeComponentProps> = ({
  node,
  isActive,
  showStatus,
  animation,
  animationDuration,
  animationDelay,
  isInView,
  variant,
  size,
  onClick,
}) => {
  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const nodeSizeConfig = NODE_SIZE_CONFIG[node.size || 'md'];
  const shapeClass = NODE_SHAPE_CONFIG[node.shape || 'rounded'];
  const statusConfig = node.status ? STATUS_CONFIG[node.status] : null;

  const getNodeClasses = () => {
    const base = `${variantConfig.node} ${shapeClass} ${nodeSizeConfig.padding} ${variantConfig.nodeHover}`;
    switch (node.status) {
      case 'running':
        return `${base} ${variantConfig.nodeActive}`;
      case 'completed':
        return `${base} ${variantConfig.nodeCompleted}`;
      case 'error':
        return `${base} ${variantConfig.nodeError}`;
      default:
        return isActive ? `${base} ${variantConfig.nodeActive}` : base;
    }
  };

  return (
    <div
      className={`
        workflow-node
        ${getNodeClasses()}
        ${sizeConfig.node}
        flex flex-col items-center text-center
        ${sizeConfig.nodeGap}
        transition-all duration-500
        cursor-pointer
        relative
        ${isInView ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        animation: isInView
          ? `workflow-${animation}-in ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) ${animationDelay}ms both`
          : 'none',
        background: node.gradient
          ? `linear-gradient(135deg, ${node.gradient})`
          : undefined,
        borderColor: node.color || undefined,
      }}
      onClick={() => onClick?.(node)}
      role="button"
      tabIndex={0}
      aria-label={`${node.label} - ${node.status || 'idle'}`}
    >
      {/* Status Indicator */}
      {showStatus && statusConfig && (
        <div className="absolute -top-2 -right-2">
          <span
            className={`
              inline-flex items-center justify-center
              w-5 h-5 rounded-full
              ${statusConfig.bg}
              ${statusConfig.pulse ? 'animate-workflow-pulse-active' : ''}
            `}
            style={{ color: statusConfig.color }}
          >
            {statusConfig.icon || (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.color }} />
            )}
          </span>
        </div>
      )}

      {/* Start/End Labels */}
      {node.isStart && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-brand-primary uppercase tracking-wider">
          Start
        </span>
      )}
      {node.isEnd && (
        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-green-500 uppercase tracking-wider">
          End
        </span>
      )}

      {/* Icon */}
      {node.icon && (
        <div
          className={`
            ${nodeSizeConfig.icon}
            rounded-xl
            flex items-center justify-center
            text-white
            shadow-md
            transition-transform duration-300
            group-hover:scale-110
          `}
          style={{
            background: node.gradient
              ? `linear-gradient(135deg, ${node.gradient})`
              : node.color
                ? `linear-gradient(135deg, ${node.color}, ${node.color}dd)`
                : 'linear-gradient(135deg, #3B82F6, #7C3AED)',
          }}
        >
          {node.icon}
        </div>
      )}

      {/* Label */}
      <span className={`font-semibold ${variantConfig.labelColor} ${nodeSizeConfig.label}`}>
        {node.label}
      </span>

      {/* Description */}
      {node.description && (
        <p className={`${variantConfig.descriptionColor} ${sizeConfig.description} max-w-[180px]`}>
          {node.description}
        </p>
      )}

      {/* Badge */}
      {node.badge && (
        <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-medium">
          {node.badge}
        </span>
      )}

      {/* Highlight Glow */}
      {node.highlight && (
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${node.color || '#3B82F6'}10, transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Connection Line
// ============================================

interface ConnectionLineProps {
  connection: WorkflowConnection;
  isActive: boolean;
  isInView: boolean;
  animation: WorkflowAnimation;
  animationDuration: number;
  variant: WorkflowVariant;
  size: WorkflowSize;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  isActive,
  isInView,
  animation,
  animationDuration,
  variant,
  size,
}) => {
  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const color = connection.color || (isActive ? variantConfig.connectionActive : variantConfig.connectionColor);
  const dashArray =
    connection.style === 'dashed' ? '8 4' : connection.style === 'dotted' ? '3 3' : 'none';

  return (
    <div className="flex items-center px-2 flex-shrink-0">
      {/* Connection Line */}
      <div className="relative flex items-center" style={{ width: `${sizeConfig.nodeGap === 'gap-6' ? 24 : sizeConfig.nodeGap === 'gap-8' ? 32 : 48}px` }}>
        <svg
          width="100%"
          height="24"
          viewBox="0 0 48 24"
          className="overflow-visible"
          aria-hidden="true"
        >
          <line
            x1="0"
            y1="12"
            x2="48"
            y2="12"
            stroke={color}
            strokeWidth={sizeConfig.connectionWidth}
            strokeDasharray={
              connection.animated && isActive ? '8 4' : dashArray
            }
            strokeLinecap="round"
            style={{
              animation:
                connection.animated && isActive && isInView
                  ? 'workflow-flow-dash 1s linear infinite'
                  : isInView && animation === 'draw'
                    ? `workflow-draw-line ${animationDuration}ms ease-out forwards`
                    : 'none',
              transition: 'stroke 0.5s ease',
            }}
          />
          {/* Arrow */}
          {connection.showArrow !== false && (
            <polygon
              points="48,12 40,7 40,17"
              fill={color}
              style={{ transition: 'fill 0.5s ease' }}
            />
          )}
        </svg>

        {/* Connection Label */}
        {connection.label && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap">
            {connection.label}
          </span>
        )}

        {/* Fallback Indicator */}
        {connection.isFallback && (
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-yellow-500 whitespace-nowrap">
            fallback
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const WorkflowDemo: React.FC<WorkflowDemoProps> = ({
  nodes,
  connections,
  steps,
  variant = 'default',
  size = 'md',
  layout = 'horizontal',
  animation = 'slide',
  animationDuration = 600,
  animateOnView = true,
  stagger = true,
  staggerDelay = 150,
  showConnections = true,
  showArrows = true,
  showStatus = true,
  showStepNumbers = true,
  showDescriptions = true,
  autoPlay = false,
  autoPlayInterval = 2000,
  activeStep: controlledActiveStep,
  onNodeClick,
  onStepChange,
  showHeader = true,
  title,
  subtitle,
  badge,
  showCodePreview = false,
  code,
  codeLanguage = 'typescript',
  respectReducedMotion = true,
  className = '',
  style,
  id = 'workflow-demo',
}) => {
  // ============================================
  // State
  // ============================================

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isInView, setIsInView] = useState(!animateOnView);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const isControlled = controlledActiveStep !== undefined;
  const currentStep = isControlled ? controlledActiveStep : activeStepIndex;

  // Convert steps to nodes/connections if provided
  const effectiveNodes = useMemo(() => {
    if (nodes) return nodes;
    if (!steps) return [];

    return steps.map((step, index) => ({
      id: `step-${index}`,
      label: step.title,
      description: showDescriptions ? step.description : undefined,
      icon: step.icon,
      status: index < currentStep
        ? 'completed' as NodeStatus
        : index === currentStep
          ? 'running' as NodeStatus
          : 'idle' as NodeStatus,
      isStart: index === 0,
      isEnd: index === steps.length - 1,
      shape: 'rounded' as NodeShape,
      size: 'md' as NodeSize,
      animationDelay: index * staggerDelay,
    }));
  }, [nodes, steps, currentStep, showDescriptions, staggerDelay]);

  const effectiveConnections = useMemo(() => {
    if (connections) return connections;
    if (!effectiveNodes || effectiveNodes.length < 2) return [];

    return effectiveNodes.slice(0, -1).map((node, index) => ({
      id: `conn-${index}`,
      from: node.id,
      to: effectiveNodes[index + 1].id,
      style: 'solid' as ConnectionStyle,
      showArrow: showArrows,
      active: index < currentStep,
      animated: index === currentStep - 1,
    }));
  }, [connections, effectiveNodes, currentStep, showArrows]);

  // ============================================
  // Effects: Reduced Motion
  // ============================================

  useEffect(() => {
    if (!respectReducedMotion) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [respectReducedMotion]);

  // ============================================
  // Effects: Inject Styles
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    const styleId = 'workflow-demo-animations';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      setIsStyleInjected(true);
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = ANIMATION_STYLES;
    document.head.appendChild(styleElement);

    styleRef.current = styleElement;
    setIsStyleInjected(true);

    return () => {
      if (styleRef.current && document.head.contains(styleRef.current)) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, [isStyleInjected]);

  // ============================================
  // Effects: Intersection Observer
  // ============================================

  useEffect(() => {
    if (!animateOnView || !containerRef.current) return;

    const element = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateOnView]);

  // ============================================
  // Effects: Auto-play
  // ============================================

  useEffect(() => {
    if (!autoPlay || isControlled || !effectiveNodes) return;

    autoPlayRef.current = setInterval(() => {
      setActiveStepIndex((prev) => {
        const next = prev + 1;
        if (next >= effectiveNodes.length) {
          return 0; // Loop back to start
        }
        return next;
      });
    }, autoPlayInterval);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, isControlled, effectiveNodes]);

  // ============================================
  // Handlers
  // ============================================

  const handleNodeClick = useCallback(
    (node: WorkflowNode) => {
      onNodeClick?.(node);

      // Find step index
      if (steps) {
        const index = steps.findIndex((s) => s.title === node.label);
        if (index >= 0) {
          if (!isControlled) {
            setActiveStepIndex(index);
          }
          onStepChange?.(index);
        }
      }
    },
    [steps, isControlled, onNodeClick, onStepChange]
  );

  const handleStepClick = useCallback(
    (index: number) => {
      if (!isControlled) {
        setActiveStepIndex(index);
      }
      onStepChange?.(index);
    },
    [isControlled, onStepChange]
  );

  // ============================================
  // 7. RENDER: Code Preview
  // ============================================

  const renderCodePreview = () => {
    if (!showCodePreview || !code) return null;

    return (
      <div className="mt-8 max-w-2xl mx-auto">
        <button
          onClick={() => setExpandedCode(!expandedCode)}
          className="w-full flex items-center justify-between px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            View code example
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${expandedCode ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {expandedCode && (
          <div className="mt-3 bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
              <span className="text-xs text-[#8b949e]">{codeLanguage}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-xs text-[#8b949e] hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-[#c9d1d9]">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // 8. RENDER: Horizontal Layout
  // ============================================

  const renderHorizontalLayout = () => (
    <div className="flex flex-col items-center">
      <div className={`flex items-start justify-center flex-wrap ${sizeConfig.nodeGap}`}>
        {effectiveNodes.map((node, index) => (
          <React.Fragment key={node.id}>
            {/* Node */}
            <WorkflowNodeComponent
              node={node}
              isActive={index === currentStep}
              showStatus={showStatus}
              animation={shouldReduceMotion ? 'none' : animation}
              animationDuration={animationDuration}
              animationDelay={stagger ? index * staggerDelay : 0}
              isInView={isInView}
              variant={variant}
              size={size}
              onClick={handleNodeClick}
            />

            {/* Connection */}
            {showConnections && index < effectiveNodes.length - 1 && (
              <ConnectionLine
                connection={
                  effectiveConnections?.find((c) => c.from === node.id) || {
                    from: node.id,
                    to: effectiveNodes[index + 1].id,
                    style: 'solid',
                    showArrow: showArrows,
                    active: index < currentStep,
                  }
                }
                isActive={index < currentStep}
                isInView={isInView}
                animation={shouldReduceMotion ? 'none' : animation}
                animationDuration={animationDuration}
                variant={variant}
                size={size}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Descriptions (optional, shown below) */}
      {steps && showDescriptions && (
        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(steps.length, 5)} gap-4 mt-8 w-full`}>
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={index}
                className={`
                  p-4 rounded-xl border transition-all duration-300 cursor-pointer
                  ${isActive ? 'border-brand-primary bg-brand-primary/[0.03] ring-1 ring-brand-primary/20' : ''}
                  ${isCompleted ? 'border-green-500/20 bg-green-500/[0.02]' : 'border-brand-border bg-transparent'}
                  hover:border-brand-primary/30
                `}
                onClick={() => handleStepClick(index)}
              >
                <div className="flex items-center gap-3 mb-2">
                  {showStepNumbers && (
                    <span
                      className={`
                        flex-shrink-0 ${sizeConfig.stepNumber} rounded-full flex items-center justify-center font-bold
                        ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-brand-primary text-white' : 'bg-brand-border/30 text-text-muted'}
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        step.step
                      )}
                    </span>
                  )}
                  <h4 className={`font-semibold ${isActive ? 'text-brand-primary' : 'text-text-primary'} text-sm`}>
                    {step.title}
                  </h4>
                </div>
                {step.description && (
                  <p className="text-xs text-text-muted ml-11">{step.description}</p>
                )}
                {step.duration && (
                  <p className="text-xs text-text-muted mt-1 ml-11">{step.duration}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================
  // 9. RENDER: Vertical Layout
  // ============================================

  const renderVerticalLayout = () => (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-brand-border/50 -translate-x-1/2" aria-hidden="true" />

        <div className="space-y-8">
          {effectiveNodes.map((node, index) => (
            <div
              key={node.id}
              className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
            >
              {/* Node */}
              <div className="flex-1 flex justify-end">
                <WorkflowNodeComponent
                  node={node}
                  isActive={index === currentStep}
                  showStatus={showStatus}
                  animation={shouldReduceMotion ? 'none' : animation}
                  animationDuration={animationDuration}
                  animationDelay={stagger ? index * staggerDelay : 0}
                  isInView={isInView}
                  variant={variant}
                  size={size}
                  onClick={handleNodeClick}
                />
              </div>

              {/* Timeline Dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`
                    w-4 h-4 rounded-full border-2
                    ${index < currentStep
                      ? 'bg-green-500 border-green-500'
                      : index === currentStep
                        ? 'bg-brand-primary border-brand-primary animate-workflow-pulse-active'
                        : 'bg-brand-surface border-brand-border'
                    }
                  `}
                />
              </div>

              {/* Empty space for alternating layout */}
              <div className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // 10. RENDER: Flowchart Layout
  // ============================================

  const renderFlowchartLayout = () => (
    <div className="relative" style={{ minHeight: '400px' }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        {effectiveConnections?.map((conn) => {
          const fromNode = effectiveNodes.find((n) => n.id === conn.from);
          const toNode = effectiveNodes.find((n) => n.id === conn.to);
          if (!fromNode?.position || !toNode?.position) return null;

          const isActive = conn.active || false;

          return (
            <line
              key={conn.id || `${conn.from}-${conn.to}`}
              x1={fromNode.position.x}
              y1={fromNode.position.y}
              x2={toNode.position.x}
              y2={toNode.position.y}
              stroke={isActive ? variantConfig.connectionActive : variantConfig.connectionColor}
              strokeWidth={sizeConfig.connectionWidth}
              strokeDasharray={conn.style === 'dashed' ? '8 4' : conn.style === 'dotted' ? '3 3' : 'none'}
              strokeLinecap="round"
              style={{
                transition: 'stroke 0.5s ease',
                animation: isInView && animation === 'draw'
                  ? `workflow-draw-line ${animationDuration}ms ease-out forwards`
                  : 'none',
              }}
            />
          );
        })}
      </svg>

      {effectiveNodes.map((node, index) => (
        <div
          key={node.id}
          className="absolute"
          style={{
            left: node.position?.x ? `${node.position.x}px` : `${(index % 3) * 300 + 100}px`,
            top: node.position?.y ? `${node.position.y}px` : `${Math.floor(index / 3) * 200 + 50}px`,
          }}
        >
          <WorkflowNodeComponent
            node={node}
            isActive={index === currentStep}
            showStatus={showStatus}
            animation={shouldReduceMotion ? 'none' : animation}
            animationDuration={animationDuration}
            animationDelay={stagger ? index * staggerDelay : 0}
            isInView={isInView}
            variant={variant}
            size={size}
            onClick={handleNodeClick}
          />
        </div>
      ))}
    </div>
  );

  // ============================================
  // 11. RENDER: Progress Bar
  // ============================================

  const renderProgressBar = () => {
    if (!effectiveNodes || effectiveNodes.length === 0) return null;

    const progress = ((currentStep + 1) / effectiveNodes.length) * 100;

    return (
      <div className="w-full max-w-md mx-auto mb-8">
        <div className="flex justify-between text-xs text-text-muted mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-brand-border/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  // ============================================
  // 12. MAIN RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`workflow-demo ${className}`}
      style={style}
    >
      {/* Section Header */}
      {showHeader && (title || subtitle || badge) && (
        <div className="text-center mb-12 md:mb-16">
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-4">
              {badge}
            </span>
          )}
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {autoPlay && renderProgressBar()}

      {/* Layout Variations */}
      {layout === 'horizontal' && renderHorizontalLayout()}
      {layout === 'vertical' && renderVerticalLayout()}
      {layout === 'flowchart' && renderFlowchartLayout()}

      {/* Auto-play Controls */}
      {autoPlay && !isControlled && (
        <div className="flex justify-center gap-3 mt-8">
          <button
            onClick={() => {
              if (autoPlayRef.current) clearInterval(autoPlayRef.current);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-brand-border/20 text-text-muted hover:bg-brand-border/30 transition-colors"
          >
            Pause
          </button>
          <button
            onClick={() => setActiveStepIndex(0)}
            className="px-3 py-1.5 text-xs rounded-lg bg-brand-border/20 text-text-muted hover:bg-brand-border/30 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => {
              const prev = Math.max(0, currentStep - 1);
              if (!isControlled) setActiveStepIndex(prev);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-brand-border/20 text-text-muted hover:bg-brand-border/30 transition-colors"
            disabled={currentStep === 0}
          >
            Previous
          </button>
          <button
            onClick={() => {
              const next = Math.min((effectiveNodes?.length || 1) - 1, currentStep + 1);
              if (!isControlled) setActiveStepIndex(next);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-brand-border/20 text-text-muted hover:bg-brand-border/30 transition-colors"
            disabled={currentStep === (effectiveNodes?.length || 1) - 1}
          >
            Next
          </button>
        </div>
      )}

      {/* Code Preview */}
      {renderCodePreview()}
    </div>
  );
};

// ============================================
// 13. WORKFLOW SECTION WRAPPER
// ============================================

interface WorkflowSectionProps extends WorkflowDemoProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({
  sectionId = 'workflow',
  background = 'default',
  ...props
}) => {
  const bgConfig: Record<string, string> = {
    default: 'bg-[#0B0F1A]',
    surface: 'bg-[#111827]',
    elevated: 'bg-[#1F2937]',
  };

  return (
    <section
      id={sectionId}
      className={`py-16 md:py-24 ${bgConfig[background]}`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <WorkflowDemo {...props} />
      </div>
    </section>
  );
};

// ============================================
// 14. PRESET WORKFLOW DEMOS
// ============================================

interface PresetWorkflowProps {
  className?: string;
  variant?: WorkflowVariant;
  size?: WorkflowSize;
}

export const EmailWorkflow: React.FC<PresetWorkflowProps> = (props) => {
  const steps: WorkflowStep[] = [
    {
      step: 1,
      title: 'User Request',
      description: 'User asks AI to send an email',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      status: 'completed',
    },
    {
      step: 2,
      title: 'Intent Classification',
      description: 'AI classifies intent as email_send',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      status: 'completed',
    },
    {
      step: 3,
      title: 'Agent Execution',
      description: 'Email Agent composes and sends',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      status: 'running',
    },
    {
      step: 4,
      title: 'Confirmation',
      description: 'User receives confirmation',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      status: 'idle',
    },
  ];

  return <WorkflowDemo steps={steps} layout="horizontal" showStepNumbers showDescriptions {...props} />;
};

export const OrchestratorWorkflow: React.FC<PresetWorkflowProps> = (props) => {
  const steps: WorkflowStep[] = [
    { step: 1, title: 'Input', description: 'Natural language request', status: 'completed' },
    { step: 2, title: 'Orchestrator', description: 'Intent + Plan creation', status: 'completed' },
    { step: 3, title: 'Agents', description: 'Multi-agent execution', status: 'running' },
    { step: 4, title: 'Reflection', description: 'Quality analysis', status: 'idle' },
    { step: 5, title: 'Output', description: 'Formatted response', status: 'idle' },
  ];

  return <WorkflowDemo steps={steps} layout="horizontal" showStepNumbers showDescriptions autoPlay autoPlayInterval={2500} {...props} />;
};

// ============================================
// 15. DISPLAY NAMES
// ============================================

WorkflowDemo.displayName = 'WorkflowDemo';
WorkflowSection.displayName = 'WorkflowSection';
EmailWorkflow.displayName = 'EmailWorkflow';
OrchestratorWorkflow.displayName = 'OrchestratorWorkflow';
WorkflowNodeComponent.displayName = 'WorkflowNode';
ConnectionLine.displayName = 'ConnectionLine';

// ============================================
// 16. NAMED EXPORTS
// ============================================

export {
  WorkflowNodeComponent,
  ConnectionLine,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  NODE_SHAPE_CONFIG,
  NODE_SIZE_CONFIG,
  STATUS_CONFIG,
  ANIMATION_STYLES,
};

// ============================================
// 17. TYPE EXPORTS
// ============================================

export type {
  WorkflowVariant,
  WorkflowSize,
  WorkflowLayout,
  WorkflowAnimation,
  NodeShape,
  NodeStatus,
  NodeSize,
  ConnectionStyle,
  ConnectionType,
  WorkflowNode,
  WorkflowConnection,
  WorkflowStep,
  WorkflowDemoProps,
  WorkflowSectionProps,
  PresetWorkflowProps,
  WorkflowNodeComponentProps,
  ConnectionLineProps,
};

// ============================================
// 18. DEFAULT EXPORT
// ============================================

export default WorkflowDemo;
