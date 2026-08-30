// ============================================
// apps/frontend/src/components/landing/cards/IntegrationCard.tsx
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
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  Settings,
  RefreshCw,
  Shield,
  Zap,
  Star,
  Download,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  BarChart3,
  Users,
  Globe,
  Cloud,
  Database,
  Mail,
  Calendar,
  FileText,
  CreditCard,
  MessageSquare,
  Bot,
  Code2,
  Palette,
  Search,
  Video,
  Music,
  ShoppingCart,
  Truck,
  Heart,
  Bookmark,
  Share2,
  Info,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Plus,
  Minus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type IntegrationCategory =
  | 'communication'
  | 'calendar'
  | 'storage'
  | 'social'
  | 'tasks'
  | 'payments'
  | 'analytics'
  | 'development'
  | 'design'
  | 'ecommerce'
  | 'crm'
  | 'hr'
  | 'security'
  | 'automation'
  | 'other';

type IntegrationStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'requires_setup'
  | 'coming_soon'
  | 'maintenance'
  | 'premium';

type IntegrationVariant =
  | 'default'
  | 'compact'
  | 'expanded'
  | 'minimal'
  | 'featured';

type IntegrationSize = 'sm' | 'md' | 'lg';

type CardClickAction =
  | 'connect'
  | 'disconnect'
  | 'configure'
  | 'view_details'
  | 'none';

interface IntegrationData {
  /** Unique integration ID */
  id: string;
  /** Integration name */
  name: string;
  /** Integration description */
  description?: string;
  /** Integration logo URL */
  logo: string;
  /** Logo for dark mode */
  logoDark?: string;
  /** Integration category */
  category?: IntegrationCategory;
  /** Current connection status */
  status?: IntegrationStatus;
  /** Whether this integration requires setup steps */
  requiresSetup?: boolean;
  /** Setup documentation URL */
  setupUrl?: string;
  /** Whether this is a premium integration */
  premium?: boolean;
  /** Version information */
  version?: string;
  /** Last sync timestamp */
  lastSynced?: Date;
  /** Metrics / usage stats */
  metrics?: {
    requests?: number;
    uptime?: number;
    latency?: number;
    successRate?: number;
  };
  /** Available actions */
  capabilities?: string[];
  /** Tags for filtering */
  tags?: string[];
  /** Whether this integration is featured */
  featured?: boolean;
  /** Color theme for the integration */
  color?: string;
  /** Custom badge */
  badge?: string;
  /** Whether integration is enabled */
  enabled?: boolean;
  /** Provider name */
  provider?: string;
  /** Provider website */
  providerUrl?: string;
}

interface IntegrationCardProps {
  /** Integration data */
  integration: IntegrationData;
  /** Card variant */
  variant?: IntegrationVariant;
  /** Card size */
  size?: IntegrationSize;
  /** Whether to show the status badge */
  showStatus?: boolean;
  /** Whether to show the category */
  showCategory?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show capabilities */
  showCapabilities?: boolean;
  /** Whether to show the connect/disconnect button */
  showAction?: boolean;
  /** What happens when clicking the card */
  clickAction?: CardClickAction;
  /** Whether the card is selectable */
  selectable?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Whether to show the premium badge */
  showPremiumBadge?: boolean;
  /** Whether to show the featured badge */
  showFeaturedBadge?: boolean;
  /** Callback when the card is clicked */
  onClick?: (integration: IntegrationData) => void;
  /** Callback when connect is clicked */
  onConnect?: (integration: IntegrationData) => void;
  /** Callback when disconnect is clicked */
  onDisconnect?: (integration: IntegrationData) => void;
  /** Callback when configure is clicked */
  onConfigure?: (integration: IntegrationData) => void;
  /** Callback when view details is clicked */
  onViewDetails?: (integration: IntegrationData) => void;
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

const CATEGORY_CONFIG: Record<IntegrationCategory, { label: string; icon: ReactNode; color: string }> = {
  communication: { label: 'Communication', icon: <Mail className="h-3.5 w-3.5" />, color: '#3B82F6' },
  calendar: { label: 'Calendar', icon: <Calendar className="h-3.5 w-3.5" />, color: '#8B5CF6' },
  storage: { label: 'Storage', icon: <Database className="h-3.5 w-3.5" />, color: '#10B981' },
  social: { label: 'Social Media', icon: <Share2 className="h-3.5 w-3.5" />, color: '#EC4899' },
  tasks: { label: 'Tasks & Projects', icon: <CheckCircle className="h-3.5 w-3.5" />, color: '#F59E0B' },
  payments: { label: 'Payments', icon: <CreditCard className="h-3.5 w-3.5" />, color: '#06B6D4' },
  analytics: { label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" />, color: '#6366F1' },
  development: { label: 'Development', icon: <Code2 className="h-3.5 w-3.5" />, color: '#14B8A6' },
  design: { label: 'Design', icon: <Palette className="h-3.5 w-3.5" />, color: '#F97316' },
  ecommerce: { label: 'E-Commerce', icon: <ShoppingCart className="h-3.5 w-3.5" />, color: '#EF4444' },
  crm: { label: 'CRM', icon: <Users className="h-3.5 w-3.5" />, color: '#3B82F6' },
  hr: { label: 'HR & People', icon: <Users className="h-3.5 w-3.5" />, color: '#8B5CF6' },
  security: { label: 'Security', icon: <Shield className="h-3.5 w-3.5" />, color: '#10B981' },
  automation: { label: 'Automation', icon: <Zap className="h-3.5 w-3.5" />, color: '#F59E0B' },
  other: { label: 'Other', icon: <MoreHorizontal className="h-3.5 w-3.5" />, color: '#6B7280' },
};

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; icon: ReactNode; color: string; bg: string; dot: string }> = {
  connected: {
    label: 'Connected',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    dot: 'bg-green-500',
  },
  disconnected: {
    label: 'Disconnected',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    dot: 'bg-gray-400',
  },
  connecting: {
    label: 'Connecting...',
    icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-500',
  },
  error: {
    label: 'Error',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    dot: 'bg-red-500',
  },
  requires_setup: {
    label: 'Setup Required',
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
  maintenance: {
    label: 'Maintenance',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    dot: 'bg-orange-500',
  },
  premium: {
    label: 'Premium',
    icon: <Star className="h-3.5 w-3.5" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-500',
  },
};

const SIZE_MAP: Record<IntegrationSize, { padding: string; logo: string; name: string; desc: string; gap: string; metrics: string }> = {
  sm: {
    padding: 'p-3',
    logo: 'w-8 h-8',
    name: 'text-sm',
    desc: 'text-xs',
    gap: 'gap-2',
    metrics: 'text-xs',
  },
  md: {
    padding: 'p-4',
    logo: 'w-10 h-10',
    name: 'text-base',
    desc: 'text-sm',
    gap: 'gap-3',
    metrics: 'text-sm',
  },
  lg: {
    padding: 'p-5',
    logo: 'w-12 h-12',
    name: 'text-lg',
    desc: 'text-sm',
    gap: 'gap-4',
    metrics: 'text-sm',
  },
};

const VARIANT_MAP: Record<
  IntegrationVariant,
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
    selected: 'border-brand-primary shadow-md ring-1 ring-brand-primary/30',
  },
  compact: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-none',
    hover: 'hover:border-brand-primary/30 hover:shadow-sm',
    selected: 'border-brand-primary ring-1 ring-brand-primary/30',
  },
  expanded: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    hover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    selected: 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20',
  },
  minimal: {
    background: 'bg-transparent',
    border: 'border-0',
    shadow: 'shadow-none',
    hover: 'hover:bg-white/5 dark:hover:bg-white/5',
    selected: 'bg-brand-primary/5',
  },
  featured: {
    background: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    border: 'border border-brand-border',
    shadow: 'shadow-lg',
    hover: 'hover:shadow-xl hover:border-brand-primary/50 hover:-translate-y-1',
    selected: 'border-brand-primary shadow-xl ring-2 ring-brand-primary/20',
  },
};

// ============================================
// 3. MAIN COMPONENT
// ============================================

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  variant = 'default',
  size = 'md',
  showStatus = true,
  showCategory = true,
  showMetrics = false,
  showCapabilities = false,
  showAction = true,
  clickAction = 'connect',
  selectable = false,
  selected = false,
  disabled = false,
  showPremiumBadge = true,
  showFeaturedBadge = true,
  onClick,
  onConnect,
  onDisconnect,
  onConfigure,
  onViewDetails,
  className = '',
  style,
  id,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Derived Values
  // ============================================

  const statusConfig = integration.status
    ? STATUS_CONFIG[integration.status]
    : STATUS_CONFIG.disconnected;

  const categoryConfig = integration.category
    ? CATEGORY_CONFIG[integration.category]
    : CATEGORY_CONFIG.other;

  const variantConfig = VARIANT_MAP[variant];
  const sizeConfig = SIZE_MAP[size];

  const isConnected = integration.status === 'connected';
  const isPremium = integration.premium || integration.status === 'premium';
  const isComingSoon = integration.status === 'coming_soon';
  const isDisabled = disabled || isComingSoon;

  // ============================================
  // Effects: Animate on mount
  // ============================================

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const handleCardClick = useCallback(() => {
    if (isDisabled) return;

    onClick?.(integration);

    switch (clickAction) {
      case 'connect':
        if (!isConnected && !isConnecting) {
          handleConnect();
        } else if (isConnected) {
          handleDisconnect();
        }
        break;
      case 'disconnect':
        handleDisconnect();
        break;
      case 'configure':
        handleConfigure();
        break;
      case 'view_details':
        handleViewDetails();
        break;
    }
  }, [isDisabled, isConnected, isConnecting, clickAction, integration]);

  const handleConnect = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isConnected || isConnecting || isComingSoon) return;

      setIsConnecting(true);
      onConnect?.(integration);

      // Simulate connection delay
      setTimeout(() => {
        setIsConnecting(false);
      }, 2000);
    },
    [isConnected, isConnecting, isComingSoon, integration, onConnect]
  );

  const handleDisconnect = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!isConnected) return;

      onDisconnect?.(integration);
    },
    [isConnected, integration, onDisconnect]
  );

  const handleConfigure = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onConfigure?.(integration);
    },
    [integration, onConfigure]
  );

  const handleViewDetails = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onViewDetails?.(integration);
    },
    [integration, onViewDetails]
  );

  const handleLogoError = useCallback(() => {
    setLogoError(true);
  }, []);

  // ============================================
  // Render: Logo
  // ============================================

  const renderLogo = () => {
    if (logoError || !integration.logo) {
      // Fallback: first letter of name
      return (
        <div
          className={`
            ${sizeConfig.logo}
            rounded-xl
            bg-gradient-to-br from-brand-primary to-brand-secondary
            flex items-center justify-center
            text-white font-bold
            shadow-sm
            ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}
          `}
        >
          {integration.name.charAt(0).toUpperCase()}
        </div>
      );
    }

    return (
      <div className={`${sizeConfig.logo} rounded-xl overflow-hidden bg-white dark:bg-brand-dark flex items-center justify-center p-1.5 shadow-sm`}>
        <img
          src={integration.logo}
          alt={integration.name}
          className="w-full h-full object-contain"
          onError={handleLogoError}
          loading="lazy"
        />
      </div>
    );
  };

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
          text-xs font-medium
          ${statusConfig.bg}
          ${statusConfig.color}
          transition-all duration-200
          ${isHovered ? 'scale-105' : 'scale-100'}
        `}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
        {statusConfig.label}
      </span>
    );
  };

  // ============================================
  // Render: Category Badge
  // ============================================

  const renderCategory = () => {
    if (!showCategory || !integration.category) return null;

    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        {categoryConfig.icon}
        <span>{categoryConfig.label}</span>
      </span>
    );
  };

  // ============================================
  // Render: Premium Badge
  // ============================================

  const renderPremiumBadge = () => {
    if (!showPremiumBadge || !isPremium) return null;

    return (
      <span
        className="
          inline-flex items-center gap-1
          px-1.5 py-0.5 rounded-full
          text-[10px] font-semibold
          bg-gradient-to-r from-amber-500/20 to-yellow-500/20
          text-amber-500
          border border-amber-500/20
        "
      >
        <Star className="h-3 w-3" />
        PREMIUM
      </span>
    );
  };

  // ============================================
  // Render: Featured Badge
  // ============================================

  const renderFeaturedBadge = () => {
    if (!showFeaturedBadge || !integration.featured) return null;

    return (
      <span
        className="
          inline-flex items-center gap-1
          px-1.5 py-0.5 rounded-full
          text-[10px] font-semibold
          bg-brand-primary/10
          text-brand-primary
          border border-brand-primary/20
        "
      >
        <Sparkles className="h-3 w-3" />
        FEATURED
      </span>
    );
  };

  // ============================================
  // Render: Metrics
  // ============================================

  const renderMetrics = () => {
    if (!showMetrics || !integration.metrics) return null;

    const metrics = integration.metrics;

    return (
      <div className={`grid grid-cols-2 gap-2 pt-3 border-t border-brand-border/30 ${sizeConfig.metrics}`}>
        {metrics.requests !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Requests</p>
            <p className="font-semibold text-text-primary">
              {metrics.requests >= 1000
                ? `${(metrics.requests / 1000).toFixed(1)}K`
                : metrics.requests}
            </p>
          </div>
        )}
        {metrics.uptime !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Uptime</p>
            <p className="font-semibold text-green-500">{metrics.uptime}%</p>
          </div>
        )}
        {metrics.latency !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Latency</p>
            <p className="font-semibold text-text-primary">{metrics.latency}ms</p>
          </div>
        )}
        {metrics.successRate !== undefined && (
          <div className="text-center">
            <p className="text-text-muted text-xs">Success</p>
            <p className="font-semibold text-green-500">{metrics.successRate}%</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Capabilities
  // ============================================

  const renderCapabilities = () => {
    if (!showCapabilities || !integration.capabilities || integration.capabilities.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 pt-2">
        {integration.capabilities.slice(0, 4).map((cap, index) => (
          <span
            key={index}
            className="
              inline-flex items-center
              px-1.5 py-0.5
              rounded-md
              text-[10px] font-medium
              bg-brand-border/20
              text-text-muted
            "
          >
            {cap}
          </span>
        ))}
        {integration.capabilities.length > 4 && (
          <span className="text-[10px] text-text-muted">
            +{integration.capabilities.length - 4}
          </span>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Custom Badge
  // ============================================

  const renderCustomBadge = () => {
    if (!integration.badge) return null;

    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/10 text-brand-primary">
        {integration.badge}
      </span>
    );
  };

  // ============================================
  // Render: Action Button
  // ============================================

  const renderActionButton = () => {
    if (!showAction || isComingSoon) return null;

    if (isConnecting) {
      return (
        <span
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            text-xs font-medium
            bg-blue-500/10 text-blue-500
            cursor-wait
          "
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Connecting...
        </span>
      );
    }

    if (isConnected) {
      return (
        <span
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            text-xs font-medium
            bg-green-500/10 text-green-500
            cursor-pointer hover:bg-red-500/10 hover:text-red-500
            transition-colors duration-200
            group/action
          "
          onClick={handleDisconnect}
          title="Click to disconnect"
        >
          <CheckCircle className="h-3.5 w-3.5 group-hover/action:hidden" />
          <XCircle className="h-3.5 w-3.5 hidden group-hover/action:block" />
          <span className="group-hover/action:hidden">Connected</span>
          <span className="hidden group-hover/action:inline">Disconnect</span>
        </span>
      );
    }

    if (integration.status === 'requires_setup') {
      return (
        <button
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            text-xs font-medium
            bg-yellow-500/10 text-yellow-500
            hover:bg-yellow-500/20
            transition-colors duration-200
          "
          onClick={handleConfigure}
        >
          <Settings className="h-3.5 w-3.5" />
          Setup
        </button>
      );
    }

    if (integration.status === 'error') {
      return (
        <button
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5 rounded-lg
            text-xs font-medium
            bg-red-500/10 text-red-500
            hover:bg-red-500/20
            transition-colors duration-200
          "
          onClick={handleConnect}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      );
    }

    // Default: Connect button
    return (
      <button
        className="
          inline-flex items-center gap-1.5
          px-3 py-1.5 rounded-lg
          text-xs font-medium
          bg-gradient-to-r from-brand-primary to-brand-secondary
          text-white
          hover:shadow-glow-secondary
          active:scale-[0.97]
          transition-all duration-200
        "
        onClick={handleConnect}
      >
        <Plus className="h-3.5 w-3.5" />
        Connect
      </button>
    );
  };

  // ============================================
  // Render: Connection Indicator
  // ============================================

  const renderConnectionDot = () => {
    if (!showStatus || variant === 'minimal') return null;

    return (
      <div
        className={`
          absolute top-3 right-3
          w-2.5 h-2.5 rounded-full
          ${statusConfig.dot}
          transition-all duration-300
          ${isHovered ? 'scale-125' : 'scale-100'}
        `}
        title={statusConfig.label}
      />
    );
  };

  // ============================================
  // 4. MAIN RENDER
  // ============================================

  return (
    <div
      ref={cardRef}
      id={id}
      className={`
        relative
        rounded-2xl
        transition-all duration-300
        ${variantConfig.background}
        ${variantConfig.border}
        ${variantConfig.shadow}
        ${!isDisabled ? variantConfig.hover : ''}
        ${selected ? variantConfig.selected : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${sizeConfig.padding}
        ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
      style={style}
      onClick={handleCardClick}
      onMouseEnter={() => !isDisabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={!isDisabled ? 'button' : undefined}
      tabIndex={!isDisabled ? 0 : undefined}
      aria-label={`${integration.name} integration — ${statusConfig.label}`}
    >
      {/* Connection Indicator Dot */}
      {renderConnectionDot()}

      {/* Selection Checkbox */}
      {selectable && (
        <div className={`absolute top-3 left-3 z-10 transition-opacity duration-200 ${selected || isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className={`
              w-5 h-5 rounded-md border-2 flex items-center justify-center
              transition-all duration-200
              ${selected
                ? 'bg-brand-primary border-brand-primary'
                : 'border-brand-border bg-white dark:bg-brand-surface'}
            `}
          >
            {selected && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>
      )}

      <div className={`flex flex-col ${sizeConfig.gap}`}>
        {/* Header: Logo + Name + Badges */}
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="flex-shrink-0">{renderLogo()}</div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`
                  font-semibold text-text-primary
                  ${sizeConfig.name}
                  truncate
                `}
              >
                {integration.name}
              </h3>
              {renderPremiumBadge()}
              {renderFeaturedBadge()}
              {renderCustomBadge()}
            </div>

            {/* Category + Status Row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {renderCategory()}
              {showStatus && variant !== 'minimal' && (
                <>
                  <span className="text-text-muted/30">•</span>
                  {renderStatus()}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {integration.description && variant !== 'compact' && (
          <p className={`text-text-muted line-clamp-2 ${sizeConfig.desc}`}>
            {integration.description}
          </p>
        )}

        {/* Capabilities */}
        {renderCapabilities()}

        {/* Metrics */}
        {renderMetrics()}

        {/* Version / Last Synced */}
        {(integration.version || integration.lastSynced) && (
          <div className="flex items-center gap-3 text-[10px] text-text-muted/60">
            {integration.version && <span>v{integration.version}</span>}
            {integration.version && integration.lastSynced && <span>•</span>}
            {integration.lastSynced && (
              <span>
                Synced {new Date(integration.lastSynced).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Action Button + View Details */}
        <div className="flex items-center justify-between pt-1">
          {renderActionButton()}

          {/* Coming Soon Label */}
          {isComingSoon && (
            <span
              className="
                inline-flex items-center gap-1.5
                px-3 py-1.5 rounded-lg
                text-xs font-medium
                bg-purple-500/10 text-purple-500
              "
            >
              <Clock className="h-3.5 w-3.5" />
              Coming Soon
            </span>
          )}

          {/* View Details Link */}
          {variant === 'expanded' && !isComingSoon && (
            <button
              className="
                inline-flex items-center gap-1
                text-xs text-brand-primary
                hover:text-brand-primary/80
                transition-colors
              "
              onClick={handleViewDetails}
            >
              View Details
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Provider Info */}
        {integration.provider && variant === 'expanded' && (
          <div className="pt-2 border-t border-brand-border/30">
            <a
              href={integration.providerUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-1
                text-xs text-text-muted
                hover:text-brand-primary
                transition-colors
              "
              onClick={(e) => e.stopPropagation()}
            >
              by {integration.provider}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// 5. INTEGRATION GRID HELPER
// ============================================

interface IntegrationGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IntegrationGrid: React.FC<IntegrationGridProps> = ({
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
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
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

IntegrationCard.displayName = 'IntegrationCard';
IntegrationGrid.displayName = 'IntegrationGrid';

// ============================================
// 7. NAMED EXPORTS
// ============================================

export {
  IntegrationGrid,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
  SIZE_MAP,
  VARIANT_MAP,
};

// ============================================
// 8. TYPE EXPORTS
// ============================================

export type {
  IntegrationCategory,
  IntegrationStatus,
  IntegrationVariant,
  IntegrationSize,
  CardClickAction,
  IntegrationData,
  IntegrationCardProps,
  IntegrationGridProps,
};

// ============================================
// 9. DEFAULT EXPORT
// ============================================

export default IntegrationCard;