// ============================================
// apps/frontend/src/components/landing/cards/AgentCapabilityCard.tsx
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
  Shield,
  Star,
  Award,
  Crown,
  Target,
  Flag,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Lock,
  Unlock,
  Plus,
  Minus,
  Settings,
  Wrench,
  Code2,
  Database,
  Cloud,
  Bot,
  MessageSquare,
  FileText,
  Image,
  Video,
  Music,
  Search,
  BookOpen,
  Lightbulb,
  GitBranch,
  Layers,
  Workflow,
  Puzzle,
  Eye,
  EyeOff,
  Info,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Heart,
  ThumbsUp,
  Users,
  BarChart3,
  Gauge,
  Timer,
  Infinity,
  Dot,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type AgentType =
  | 'email'
  | 'drive'
  | 'content'
  | 'social'
  | 'calendar'
  | 'web'
  | 'task'
  | 'orchestrator'
  | 'custom';

type AgentStatus =
  | 'active'
  | 'idle'
  | 'running'
  | 'error'
  | 'maintenance'
  | 'coming_soon'
  | 'premium';

type CapabilityCategory =
  | 'core'
  | 'ai'
  | 'automation'
  | 'integration'
  | 'collaboration'
  | 'security'
  | 'analytics'
  | 'premium';

type CardVariant =
  | 'default'
  | 'featured'
  | 'compact'
  | 'expanded'
  | 'minimal'
  | 'grid';

type CardSize = 'sm' | 'md' | 'lg';

type AnimationStyle =
  | 'none'
  | 'pulse'
  | 'glow'
  | 'float'
  | 'shimmer';

interface AgentCapability {
  /** Capability name */
  name: string;
  /** Short description */
  description?: string;
  /** Whether this is a premium feature */
  premium?: boolean;
  /** Whether this is coming soon */
  comingSoon?: boolean;
  /** Icon for this capability */
  icon?: ReactNode;
  /** Category */
  category?: CapabilityCategory;
  /** Whether this capability is currently active */
  active?: boolean;
  /** Performance metric */
  metric?: {
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'stable';
  };
  /** Tooltip text */
  tooltip?: string;
  /** Whether this is a highlight feature */
  highlight?: boolean;
}

interface AgentData {
  /** Unique agent ID */
  id: string;
  /** Agent name */
  name: string;
  /** Agent description */
  description?: string;
  /** Agent type */
  type: AgentType;
  /** Agent status */
  status?: AgentStatus;
  /** Agent icon override */
  icon?: ReactNode;
  /** CSS gradient for the agent */
  gradient?: string;
  /** Agent color */
  color?: string;
  /** List of capabilities */
  capabilities: AgentCapability[];
  /** Whether this agent is highlighted */
  highlight?: boolean;
  /** Custom badge text */
  badge?: string;
  /** Whether agent requires setup */
  requiresSetup?: boolean;
  /** Whether agent is connected */
  isConnected?: boolean;
  /** URL for "Learn more" */
  learnMoreUrl?: string;
  /** Metrics summary */
  metrics?: {
    executions?: number;
    successRate?: number;
    avgResponseTime?: number;
    uptime?: number;
  };
  /** Which plan is required */
  requiredPlan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  /** Whether agent is available on current plan */
  available?: boolean;
  /** Tags for filtering */
  tags?: string[];
  /** Custom CSS class */
  className?: string;
}

interface AgentCapabilityCardProps {
  /** Agent data */
  agent: AgentData;
  /** Card variant */
  variant?: CardVariant;
  /** Card size */
  size?: CardSize;
  /** Whether to show the status badge */
  showStatus?: boolean;
  /** Whether to show capabilities */
  showCapabilities?: boolean;
  /** Whether to show premium capabilities */
  showPremiumCapabilities?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show the plan requirement */
  showRequiredPlan?: boolean;
  /** Whether to show the "Learn more" link */
  showLearnMore?: boolean;
  /** Whether to show the connection status */
  showConnectionStatus?: boolean;
  /** Whether to show capability categories */
  showCategories?: boolean;
  /** Maximum capabilities to show */
  maxCapabilities?: number;
  /** Animation style */
  animation?: AnimationStyle;
  /** Whether the card is interactive */
  interactive?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Callback when card is clicked */
  onClick?: (agent: AgentData) => void;
  /** Callback when a capability is clicked */
  onCapabilityClick?: (capability: AgentCapability) => void;
  /** Callback when "Learn more" is clicked */
  onLearnMore?: (agent: AgentData) => void;
  /** Callback when connect is clicked */
  onConnect?: (agent: AgentData) => void;
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

const AGENT_TYPE_CONFIG: Record<
  AgentType,
  {
    label: string;
    icon: ReactNode;
    gradient: string;
    color: string;
    description: string;
  }
> = {
  email: {
    label: 'Email Agent',
    icon: <Mail className="h-5 w-5" />,
    gradient: 'from-blue-500 to-blue-600',
    color: '#3b82f6',
    description: 'Smart email management with AI-powered replies',
  },
  drive: {
    label: 'Drive Agent',
    icon: <HardDrive className="h-5 w-5" />,
    gradient: 'from-green-500 to-green-600',
    color: '#10b981',
    description: 'File management, search, and organization',
  },
  content: {
    label: 'Content Agent',
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-purple-500 to-purple-600',
    color: '#8b5cf6',
    description: 'AI-powered text, image, and video generation',
  },
  social: {
    label: 'Social Agent',
    icon: <Share2 className="h-5 w-5" />,
    gradient: 'from-pink-500 to-pink-600',
    color: '#ec4899',
    description: 'Multi-platform social media management',
  },
  calendar: {
    label: 'Calendar Agent',
    icon: <Calendar className="h-5 w-5" />,
    gradient: 'from-orange-500 to-orange-600',
    color: '#f97316',
    description: 'Smart scheduling and meeting management',
  },
  web: {
    label: 'Web Agent',
    icon: <Globe className="h-5 w-5" />,
    gradient: 'from-teal-500 to-teal-600',
    color: '#14b8a6',
    description: 'Web search, research, and data extraction',
  },
  task: {
    label: 'Task Agent',
    icon: <CheckSquare className="h-5 w-5" />,
    gradient: 'from-indigo-500 to-indigo-600',
    color: '#6366f1',
    description: 'Task management across multiple platforms',
  },
  orchestrator: {
    label: 'Orchestrator',
    icon: <Brain className="h-5 w-5" />,
    gradient: 'from-slate-500 to-slate-600',
    color: '#64748b',
    description: 'Central AI that coordinates all agents',
  },
  custom: {
    label: 'Custom Agent',
    icon: <Bot className="h-5 w-5" />,
    gradient: 'from-cyan-500 to-cyan-600',
    color: '#06b6d4',
    description: 'Custom-built AI agent for your needs',
  },
};

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; icon: ReactNode; color: string; bg: string; dot: string }
> = {
  active: {
    label: 'Active',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    dot: 'bg-green-500',
  },
  idle: {
    label: 'Idle',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    dot: 'bg-gray-400',
  },
  running: {
    label: 'Running',
    icon: <Activity className="h-3.5 w-3.5 animate-pulse" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-500 animate-pulse',
  },
  error: {
    label: 'Error',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    dot: 'bg-red-500',
  },
  maintenance: {
    label: 'Maintenance',
    icon: <Settings className="h-3.5 w-3.5" />,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    dot: 'bg-yellow-500',
  },
  coming_soon: {
    label: 'Coming Soon',
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    dot: 'bg-purple-500',
  },
  premium: {
    label: 'Premium',
    icon: <Crown className="h-3.5 w-3.5" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-500',
  },
};

const SIZE_MAP: Record<
  CardSize,
  {
    padding: string;
    icon: string;
    name: string;
    description: string;
    capability: string;
    gap: string;
    badge: string;
  }
> = {
  sm: {
    padding: 'p-4',
    icon: 'w-8 h-8',
    name: 'text-sm',
    description: 'text-xs',
    capability: 'text-xs',
    gap: 'gap-2',
    badge: 'text-[10px]',
  },
  md: {
    padding: 'p-5',
    icon: 'w-10 h-10',
    name: 'text-base',
    description: 'text-sm',
    capability: 'text-sm',
    gap: 'gap-3',
    badge: 'text-xs',
  },
  lg: {
    padding: 'p-6',
    icon: 'w-12 h-12',
    name: 'text-lg',
    description: 'text-sm',
    capability: 'text-sm',
    gap: 'gap-4',
    badge: 'text-xs',
  },
};

const VARIANT_MAP: Record<
  CardVariant,
  {
    background: string;
    border: string;
    shadow: string;
    hover: string;
    selected: string;
  }
> = {
  default: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-lg hover:border-brand-primary/30 hover:-translate-y-0.5',
    selected: 'border-brand-primary ring-1 ring-brand-primary/30',
  },
  featured: {
    background: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    border: 'border border-brand-border',
    shadow: 'shadow-lg',
    hover: 'hover:shadow-xl hover:border-brand-primary/50 hover:-translate-y-1',
    selected: 'border-brand-primary ring-2 ring-brand-primary/20',
  },
  compact: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-none',
    hover: 'hover:border-brand-primary/30 hover:shadow-sm',
    selected: 'border-brand-primary',
  },
  expanded: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    hover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    selected: 'border-brand-primary ring-2 ring-brand-primary/20',
  },
  minimal: {
    background: 'bg-transparent',
    border: 'border-0',
    shadow: 'shadow-none',
    hover: 'hover:bg-white/5 dark:hover:bg-white/5',
    selected: 'bg-brand-primary/5',
  },
  grid: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-brand-primary/30',
    selected: 'border-brand-primary ring-1 ring-brand-primary/30',
  },
};

const ANIMATION_MAP: Record<AnimationStyle, string> = {
  none: '',
  pulse: 'animate-pulse',
  glow: 'shadow-glow-secondary',
  float: 'animate-float',
  shimmer: 'animate-shimmer',
};

// ============================================
// 3. MAIN COMPONENT
// ============================================

export const AgentCapabilityCard: React.FC<AgentCapabilityCardProps> = ({
  agent,
  variant = 'default',
  size = 'md',
  showStatus = true,
  showCapabilities = true,
  showPremiumCapabilities = true,
  showMetrics = false,
  showRequiredPlan = true,
  showLearnMore = true,
  showConnectionStatus = true,
  showCategories = false,
  maxCapabilities = 6,
  animation = 'none',
  interactive = true,
  selected = false,
  disabled = false,
  onClick,
  onCapabilityClick,
  onLearnMore,
  onConnect,
  className = '',
  style,
  id,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [showAllCapabilities, setShowAllCapabilities] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // ============================================
  // Effects: Animate on mount
  // ============================================

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // Derived Values
  // ============================================

  const typeConfig = AGENT_TYPE_CONFIG[agent.type] || AGENT_TYPE_CONFIG.custom;
  const statusConfig = agent.status ? STATUS_CONFIG[agent.status] : STATUS_CONFIG.idle;
  const variantConfig = VARIANT_MAP[variant];
  const sizeConfig = SIZE_MAP[size];
  const animationClass = ANIMATION_MAP[animation];

  const gradient = agent.gradient || typeConfig.gradient;
  const color = agent.color || typeConfig.color;
  const icon = agent.icon || typeConfig.icon;

  const isPremium = agent.status === 'premium' || agent.requiredPlan === 'ENTERPRISE';
  const isComingSoon = agent.status === 'coming_soon';

  const visibleCapabilities = showAllCapabilities
    ? agent.capabilities
    : agent.capabilities.slice(0, maxCapabilities);

  const remainingCount = agent.capabilities.length - maxCapabilities;

  // Filter capabilities
  const filteredCapabilities = useMemo(() => {
    return agent.capabilities.filter((cap) => {
      if (cap.premium && !showPremiumCapabilities) return false;
      if (cap.comingSoon && !cap.premium) return true; // Show coming soon
      return true;
    });
  }, [agent.capabilities, showPremiumCapabilities]);

  const visibleFilteredCapabilities = showAllCapabilities
    ? filteredCapabilities
    : filteredCapabilities.slice(0, maxCapabilities);

  const remainingFilteredCount = filteredCapabilities.length - maxCapabilities;

  // Group capabilities by category
  const groupedCapabilities = useMemo(() => {
    if (!showCategories) return null;

    const groups: Record<string, AgentCapability[]> = {};
    const uncategorized: AgentCapability[] = [];

    filteredCapabilities.forEach((cap) => {
      if (cap.category) {
        if (!groups[cap.category]) groups[cap.category] = [];
        groups[cap.category].push(cap);
      } else {
        uncategorized.push(cap);
      }
    });

    return { groups, uncategorized };
  }, [filteredCapabilities, showCategories]);

  // ============================================
  // Handlers
  // ============================================

  const handleCardClick = useCallback(() => {
    if (!interactive || disabled || isComingSoon) return;
    onClick?.(agent);
  }, [interactive, disabled, isComingSoon, onClick, agent]);

  const handleConnect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isConnecting || isComingSoon) return;

      setIsConnecting(true);
      onConnect?.(agent);

      setTimeout(() => setIsConnecting(false), 2000);
    },
    [isConnecting, isComingSoon, onConnect, agent]
  );

  const handleLearnMore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onLearnMore?.(agent);
    },
    [onLearnMore, agent]
  );

  const handleToggleCapabilities = useCallback(() => {
    setShowAllCapabilities((prev) => !prev);
  }, []);

  // ============================================
  // Render: Agent Icon
  // ============================================

  const renderIcon = () => (
    <div
      className={`
        ${sizeConfig.icon}
        rounded-2xl
        bg-gradient-to-br ${gradient}
        flex items-center justify-center
        text-white
        shadow-lg
        transition-all duration-300
        ${animationClass}
        ${isHovered ? 'scale-110 shadow-xl' : 'scale-100'}
        ${agent.status === 'running' ? 'animate-pulse' : ''}
      `}
    >
      {icon}
    </div>
  );

  // ============================================
  // Render: Status Badge
  // ============================================

  const renderStatus = () => {
    if (!showStatus) return null;

    return (
      <span
        className={`
          inline-flex items-center gap-1.5
          px-2 py-0.5 rounded-full
          ${sizeConfig.badge}
          font-medium
          ${statusConfig.bg}
          ${statusConfig.color}
        `}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
        {statusConfig.label}
      </span>
    );
  };

  // ============================================
  // Render: Connection Indicator
  // ============================================

  const renderConnectionDot = () => {
    if (!showConnectionStatus || agent.status === 'coming_soon') return null;

    const isConnected = agent.isConnected || agent.status === 'active' || agent.status === 'running';

    return (
      <div className="absolute top-3 right-3">
        <div
          className={`
            w-2 h-2 rounded-full
            ${isConnected ? 'bg-green-500' : 'bg-gray-400'}
            transition-all duration-300
            ${isHovered ? 'scale-125' : 'scale-100'}
          `}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>
    );
  };

  // ============================================
  // Render: Badges
  // ============================================

  const renderBadges = () => {
    const badges: ReactNode[] = [];

    if (agent.highlight && !agent.badge) {
      badges.push(
        <span
          key="highlight"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary"
        >
          <Star className="h-3 w-3" />
          Featured
        </span>
      );
    }

    if (agent.badge) {
      badges.push(
        <span
          key="badge"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary"
        >
          <Sparkles className="h-3 w-3" />
          {agent.badge}
        </span>
      );
    }

    if (isPremium && showRequiredPlan) {
      badges.push(
        <span
          key="premium"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"
        >
          <Crown className="h-3 w-3" />
          {agent.requiredPlan || 'Enterprise'}
        </span>
      );
    }

    if (isComingSoon) {
      badges.push(
        <span
          key="coming-soon"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500"
        >
          <Clock className="h-3 w-3" />
          Coming Soon
        </span>
      );
    }

    if (badges.length === 0) return null;

    return <div className="flex flex-wrap items-center gap-1.5">{badges}</div>;
  };

  // ============================================
  // Render: Metrics
  // ============================================

  const renderMetrics = () => {
    if (!showMetrics || !agent.metrics) return null;

    const metrics = agent.metrics;

    return (
      <div className="grid grid-cols-2 gap-3 py-3 border-t border-brand-border/30">
        {metrics.executions !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Executions</p>
            <p className="font-semibold text-text-primary text-sm">
              {metrics.executions >= 1000
                ? `${(metrics.executions / 1000).toFixed(1)}K`
                : metrics.executions}
            </p>
          </div>
        )}
        {metrics.successRate !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Success Rate</p>
            <p className="font-semibold text-green-500 text-sm">
              {metrics.successRate.toFixed(1)}%
            </p>
          </div>
        )}
        {metrics.avgResponseTime !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Avg Response</p>
            <p className="font-semibold text-text-primary text-sm">
              {metrics.avgResponseTime}ms
            </p>
          </div>
        )}
        {metrics.uptime !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Uptime</p>
            <p className="font-semibold text-green-500 text-sm">{metrics.uptime}%</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Capabilities List
  // ============================================

  const renderCapabilityItem = (capability: AgentCapability, index: number) => {
    const isPremiumCap = capability.premium;
    const isComing = capability.comingSoon;

    return (
      <li
        key={index}
        className={`
          flex items-start gap-2
          ${sizeConfig.capability}
          ${!isPremiumCap && !isComing ? 'text-text-secondary' : ''}
          ${isComing ? 'opacity-60' : ''}
          cursor-default
        `}
        onClick={() => onCapabilityClick?.(capability)}
        role={onCapabilityClick ? 'button' : undefined}
        title={capability.tooltip}
      >
        {/* Checkmark or premium icon */}
        <span className="flex-shrink-0 mt-0.5">
          {isComing ? (
            <Clock className="h-3.5 w-3.5 text-purple-500" />
          ) : isPremiumCap ? (
            <Crown className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`
                ${capability.highlight ? 'font-semibold text-text-primary' : 'text-text-secondary'}
              `}
            >
              {capability.name}
            </span>
            {isPremiumCap && (
              <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />
            )}
            {capability.metric && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-primary bg-brand-primary/5 px-1.5 py-0.5 rounded">
                {capability.metric.value}
              </span>
            )}
          </div>
          {capability.description && (
            <p className="text-text-muted text-xs mt-0.5 line-clamp-1">
              {capability.description}
            </p>
          )}
        </div>
      </li>
    );
  };

  const renderCapabilities = () => {
    if (!showCapabilities || filteredCapabilities.length === 0) {
      return (
        <div className="text-center py-3 text-text-muted text-sm">
          No capabilities listed
        </div>
      );
    }

    // Grouped by category
    if (groupedCategories && Object.keys(groupedCategories.groups).length > 0) {
      const allCategories = Object.keys(groupedCategories.groups);

      return (
        <ul className="space-y-3">
          {allCategories.map((category) => {
            const capabilities = groupedCategories.groups[category];
            if (!capabilities || capabilities.length === 0) return null;

            return (
              <li key={category}>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1 px-1">
                  {category}
                </h5>
                <ul className="space-y-1.5">
                  {capabilities.map((cap, idx) => renderCapabilityItem(cap, idx))}
                </ul>
              </li>
            );
          })}

          {groupedCategories.uncategorized.length > 0 && (
            <li>
              <ul className="space-y-1.5">
                {groupedCategories.uncategorized.map((cap, idx) =>
                  renderCapabilityItem(cap, idx)
                )}
              </ul>
            </li>
          )}
        </ul>
      );
    }

    // Flat list
    return (
      <ul className="space-y-1.5">
        {visibleFilteredCapabilities.map((cap, index) =>
          renderCapabilityItem(cap, index)
        )}

        {/* Show More / Show Less */}
        {remainingFilteredCount > 0 && (
          <li>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCapabilities();
              }}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
            >
              {showAllCapabilities ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all {filteredCapabilities.length} capabilities
                </>
              )}
            </button>
          </li>
        )}
      </ul>
    );
  };

  // ============================================
  // Render: Action Buttons
  // ============================================

  const renderActions = () => {
    if (isComingSoon) {
      return (
        <button
          disabled
          className="
            w-full inline-flex items-center justify-center gap-2
            px-4 py-2 rounded-xl
            text-sm font-medium
            bg-purple-500/10 text-purple-500
            border border-purple-500/30
            cursor-not-allowed
          "
        >
          <Clock className="h-4 w-4" />
          Coming Soon
        </button>
      );
    }

    if (agent.requiresSetup && !agent.isConnected) {
      return (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="
            w-full inline-flex items-center justify-center gap-2
            px-4 py-2 rounded-xl
            text-sm font-medium text-white
            bg-gradient-to-r from-brand-primary to-brand-secondary
            hover:shadow-glow-secondary
            active:scale-[0.97]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-wait
          "
        >
          {isConnecting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Connect Agent
            </>
          )}
        </button>
      );
    }

    if (showLearnMore && agent.learnMoreUrl) {
      return (
        <a
          href={agent.learnMoreUrl}
          onClick={(e) => e.stopPropagation()}
          className="
            w-full inline-flex items-center justify-center gap-2
            px-4 py-2 rounded-xl
            text-sm font-medium
            text-brand-primary
            hover:bg-brand-primary/5
            border border-brand-primary/20
            transition-all duration-200
          "
        >
          Learn More
          <ChevronRight className="h-4 w-4" />
        </a>
      );
    }

    if (!agent.requiresSetup && agent.isConnected) {
      return (
        <div
          className="
            w-full inline-flex items-center justify-center gap-2
            px-4 py-2 rounded-xl
            text-sm font-medium
            bg-green-500/10 text-green-500
            border border-green-500/30
          "
        >
          <CheckCircle className="h-4 w-4" />
          Connected
        </div>
      );
    }

    return null;
  };

  // ============================================
  // 4. MAIN RENDER
  // ============================================

  return (
    <div
      id={id}
      className={`
        relative
        rounded-2xl
        overflow-hidden
        transition-all duration-300
        ${variantConfig.background}
        ${variantConfig.border}
        ${variantConfig.shadow}
        ${!disabled && !isComingSoon ? variantConfig.hover : ''}
        ${selected ? variantConfig.selected : ''}
        ${disabled || isComingSoon ? 'opacity-70 cursor-not-allowed' : interactive ? 'cursor-pointer' : ''}
        ${sizeConfig.padding}
        ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
      style={style}
      onClick={handleCardClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={interactive && !disabled ? 'button' : 'article'}
      tabIndex={interactive && !disabled ? 0 : undefined}
    >
      {/* Connection Dot */}
      {renderConnectionDot()}

      {/* Accent Gradient Line at Top */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`}
      />

      <div className={`flex flex-col ${sizeConfig.gap}`}>
        {/* Header: Icon + Name + Status */}
        <div className="flex items-start gap-3">
          {renderIcon()}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-bold text-text-primary truncate ${sizeConfig.name}`}
              >
                {agent.name || typeConfig.label}
              </h3>
              {renderStatus()}
            </div>

            {/* Description */}
            {agent.description && (
              <p
                className={`text-text-muted mt-1 line-clamp-2 ${sizeConfig.description}`}
              >
                {agent.description}
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        {renderBadges()}

        {/* Metrics */}
        {renderMetrics()}

        {/* Capabilities */}
        <div className="flex-1">{renderCapabilities()}</div>

        {/* Actions */}
        <div className="pt-1">{renderActions()}</div>
      </div>

      {/* Shimmer Effect Overlay */}
      {animation === 'shimmer' && (
        <div className="absolute inset-0 pointer-events-none animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}
    </div>
  );
};

// ============================================
// 5. AGENT GRID HELPER
// ============================================

interface AgentGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AgentGrid: React.FC<AgentGridProps> = ({
  children,
  columns = 4,
  gap = 'md',
  className = '',
}) => {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  const gapSize: Record<string, string> = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${gridCols[columns]} ${gapSize[gap]} ${className}`}>
      {children}
    </div>
  );
};

// ============================================
// 6. DISPLAY NAME
// ============================================

AgentCapabilityCard.displayName = 'AgentCapabilityCard';
AgentGrid.displayName = 'AgentGrid';

// ============================================
// 7. NAMED EXPORTS
// ============================================

export {
  AgentGrid,
  AGENT_TYPE_CONFIG,
  STATUS_CONFIG,
  SIZE_MAP,
  VARIANT_MAP,
  ANIMATION_MAP,
};

// ============================================
// 8. TYPE EXPORTS
// ============================================

export type {
  AgentType,
  AgentStatus,
  CapabilityCategory,
  CardVariant,
  CardSize,
  AnimationStyle,
  AgentCapability,
  AgentData,
  AgentCapabilityCardProps,
  AgentGridProps,
};

// ============================================
// 9. DEFAULT EXPORT
// ============================================

export default AgentCapabilityCard;