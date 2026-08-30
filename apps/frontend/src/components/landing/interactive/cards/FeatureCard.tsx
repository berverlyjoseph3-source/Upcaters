// ============================================
// apps/frontend/src/components/landing/cards/FeatureCard.tsx
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
  Mail,
  HardDrive,
  Share2,
  Calendar,
  Globe,
  CheckSquare,
  Cpu,
  Brain,
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
  Package,
  Truck,
  CreditCard,
  Palette,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Tablet,
  Watch,
  Camera,
  Mic,
  PenTool,
  Droplets,
  Scissors,
  Ruler,
  Compass,
  Anchor,
  Rocket,
  Flame,
  Snowflake,
  Umbrella,
  Key,
  Bell,
  BellOff,
  MapPin,
  Navigation,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type FeatureCategory =
  | 'ai'
  | 'automation'
  | 'integration'
  | 'collaboration'
  | 'security'
  | 'analytics'
  | 'development'
  | 'design'
  | 'infrastructure'
  | 'communication'
  | 'productivity'
  | 'custom';

type FeatureVariant =
  | 'default'
  | 'highlighted'
  | 'minimal'
  | 'detailed'
  | 'icon-only'
  | 'horizontal';

type FeatureSize = 'sm' | 'md' | 'lg' | 'xl';

type GlowColor = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'none';

type IconPosition = 'top' | 'left' | 'right' | 'background';

interface FeatureData {
  /** Unique feature ID */
  id: string;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Feature icon (Lucide component name or custom ReactNode) */
  icon?: ReactNode;
  /** Icon name for dynamic lookup */
  iconName?: string;
  /** Feature category */
  category?: FeatureCategory;
  /** Whether this feature is premium */
  premium?: boolean;
  /** Whether this feature is new */
  isNew?: boolean;
  /** Whether this feature is coming soon */
  comingSoon?: boolean;
  /** Badge text */
  badge?: string;
  /** Badge color */
  badgeColor?: string;
  /** CSS gradient for the icon background */
  gradient?: string;
  /** Custom color */
  color?: string;
  /** Glow effect color */
  glowColor?: GlowColor;
  /** Whether this feature is highlighted */
  highlight?: boolean;
  /** List of sub-features */
  subFeatures?: string[];
  /** Metrics to display */
  metrics?: {
    label: string;
    value: string;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
  }[];
  /** URL for "Learn more" */
  learnMoreUrl?: string;
  /** Custom CTA text */
  ctaText?: string;
  /** Whether this feature is available */
  available?: boolean;
  /** Tags */
  tags?: string[];
  /** Tooltip text */
  tooltip?: string;
}

interface FeatureCardProps {
  /** Feature data */
  feature: FeatureData;
  /** Card variant */
  variant?: FeatureVariant;
  /** Card size */
  size?: FeatureSize;
  /** Icon position */
  iconPosition?: IconPosition;
  /** Whether to show the category badge */
  showCategory?: boolean;
  /** Whether to show sub-features */
  showSubFeatures?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show the premium badge */
  showPremiumBadge?: boolean;
  /** Whether to show the "New" badge */
  showNewBadge?: boolean;
  /** Whether to show the "Learn more" link */
  showLearnMore?: boolean;
  /** Whether to show the glow effect */
  showGlow?: boolean;
  /** Whether the card is interactive */
  interactive?: boolean;
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Callback when card is clicked */
  onClick?: (feature: FeatureData) => void;
  /** Callback when "Learn more" is clicked */
  onLearnMore?: (feature: FeatureData) => void;
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
  shield: <Shield className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  award: <Award className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  flag: <Flag className="h-5 w-5" />,
  'trending-up': <TrendingUp className="h-5 w-5" />,
  'trending-down': <TrendingDown className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  'x-circle': <XCircle className="h-5 w-5" />,
  'alert-circle': <AlertCircle className="h-5 w-5" />,
  'chevron-right': <ChevronRight className="h-5 w-5" />,
  'arrow-right': <ArrowRight className="h-5 w-5" />,
  'external-link': <ExternalLink className="h-5 w-5" />,
  lock: <Lock className="h-5 w-5" />,
  unlock: <Unlock className="h-5 w-5" />,
  plus: <Plus className="h-5 w-5" />,
  minus: <Minus className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  wrench: <Wrench className="h-5 w-5" />,
  code: <Code2 className="h-5 w-5" />,
  database: <Database className="h-5 w-5" />,
  cloud: <Cloud className="h-5 w-5" />,
  bot: <Bot className="h-5 w-5" />,
  'message-square': <MessageSquare className="h-5 w-5" />,
  'file-text': <FileText className="h-5 w-5" />,
  image: <Image className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  music: <Music className="h-5 w-5" />,
  search: <Search className="h-5 w-5" />,
  'book-open': <BookOpen className="h-5 w-5" />,
  lightbulb: <Lightbulb className="h-5 w-5" />,
  'git-branch': <GitBranch className="h-5 w-5" />,
  layers: <Layers className="h-5 w-5" />,
  workflow: <Workflow className="h-5 w-5" />,
  puzzle: <Puzzle className="h-5 w-5" />,
  eye: <Eye className="h-5 w-5" />,
  'eye-off': <EyeOff className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  play: <Play className="h-5 w-5" />,
  pause: <Pause className="h-5 w-5" />,
  'refresh-cw': <RefreshCw className="h-5 w-5" />,
  download: <Download className="h-5 w-5" />,
  upload: <Upload className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  'thumbs-up': <ThumbsUp className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  'bar-chart': <BarChart3 className="h-5 w-5" />,
  gauge: <Gauge className="h-5 w-5" />,
  timer: <Timer className="h-5 w-5" />,
  infinity: <Infinity className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  truck: <Truck className="h-5 w-5" />,
  'credit-card': <CreditCard className="h-5 w-5" />,
  palette: <Palette className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
  moon: <Moon className="h-5 w-5" />,
  volume: <Volume2 className="h-5 w-5" />,
  'volume-x': <VolumeX className="h-5 w-5" />,
  wifi: <Wifi className="h-5 w-5" />,
  'wifi-off': <WifiOff className="h-5 w-5" />,
  smartphone: <Smartphone className="h-5 w-5" />,
  monitor: <Monitor className="h-5 w-5" />,
  tablet: <Tablet className="h-5 w-5" />,
  watch: <Watch className="h-5 w-5" />,
  camera: <Camera className="h-5 w-5" />,
  mic: <Mic className="h-5 w-5" />,
  'pen-tool': <PenTool className="h-5 w-5" />,
  droplets: <Droplets className="h-5 w-5" />,
  scissors: <Scissors className="h-5 w-5" />,
  ruler: <Ruler className="h-5 w-5" />,
  compass: <Compass className="h-5 w-5" />,
  anchor: <Anchor className="h-5 w-5" />,
  rocket: <Rocket className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  snowflake: <Snowflake className="h-5 w-5" />,
  umbrella: <Umbrella className="h-5 w-5" />,
  key: <Key className="h-5 w-5" />,
  bell: <Bell className="h-5 w-5" />,
  'bell-off': <BellOff className="h-5 w-5" />,
  'map-pin': <MapPin className="h-5 w-5" />,
  navigation: <Navigation className="h-5 w-5" />,
};

const CATEGORY_CONFIG: Record<FeatureCategory, { label: string; icon: ReactNode; color: string }> = {
  ai: { label: 'AI & ML', icon: <Brain className="h-3.5 w-3.5" />, color: '#8b5cf6' },
  automation: { label: 'Automation', icon: <Zap className="h-3.5 w-3.5" />, color: '#f59e0b' },
  integration: { label: 'Integration', icon: <Puzzle className="h-3.5 w-3.5" />, color: '#3b82f6' },
  collaboration: { label: 'Collaboration', icon: <Users className="h-3.5 w-3.5" />, color: '#10b981' },
  security: { label: 'Security', icon: <Shield className="h-3.5 w-3.5" />, color: '#ef4444' },
  analytics: { label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" />, color: '#06b6d4' },
  development: { label: 'Development', icon: <Code2 className="h-3.5 w-3.5" />, color: '#6366f1' },
  design: { label: 'Design', icon: <Palette className="h-3.5 w-3.5" />, color: '#ec4899' },
  infrastructure: { label: 'Infrastructure', icon: <Cloud className="h-3.5 w-3.5" />, color: '#14b8a6' },
  communication: { label: 'Communication', icon: <MessageSquare className="h-3.5 w-3.5" />, color: '#3b82f6' },
  productivity: { label: 'Productivity', icon: <CheckCircle className="h-3.5 w-3.5" />, color: '#f97316' },
  custom: { label: 'Custom', icon: <Settings className="h-3.5 w-3.5" />, color: '#64748b' },
};

const GLOW_CONFIG: Record<GlowColor, string> = {
  primary: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  secondary: 'shadow-[0_0_20px_rgba(124,58,237,0.3)]',
  accent: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
  success: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  warning: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  none: '',
};

const SIZE_MAP: Record<
  FeatureSize,
  {
    padding: string;
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    gap: string;
    subFeature: string;
  }
> = {
  sm: {
    padding: 'p-4',
    icon: 'w-8 h-8',
    iconBg: 'w-10 h-10',
    title: 'text-sm',
    description: 'text-xs',
    gap: 'gap-2',
    subFeature: 'text-xs',
  },
  md: {
    padding: 'p-5',
    icon: 'w-10 h-10',
    iconBg: 'w-12 h-12',
    title: 'text-base',
    description: 'text-sm',
    gap: 'gap-3',
    subFeature: 'text-sm',
  },
  lg: {
    padding: 'p-6',
    icon: 'w-12 h-12',
    iconBg: 'w-14 h-14',
    title: 'text-lg',
    description: 'text-sm',
    gap: 'gap-4',
    subFeature: 'text-sm',
  },
  xl: {
    padding: 'p-8',
    icon: 'w-14 h-14',
    iconBg: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base',
    gap: 'gap-5',
    subFeature: 'text-base',
  },
};

const VARIANT_MAP: Record<
  FeatureVariant,
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
  highlighted: {
    background: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    border: 'border border-brand-border',
    shadow: 'shadow-lg',
    hover: 'hover:shadow-xl hover:border-brand-primary/50 hover:-translate-y-1',
    selected: 'border-brand-primary ring-2 ring-brand-primary/20',
  },
  minimal: {
    background: 'bg-transparent',
    border: 'border-0',
    shadow: 'shadow-none',
    hover: 'hover:bg-white/5 dark:hover:bg-white/5',
    selected: 'bg-brand-primary/5',
  },
  detailed: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    hover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    selected: 'border-brand-primary ring-2 ring-brand-primary/20',
  },
  'icon-only': {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-brand-primary/30 hover:scale-105',
    selected: 'border-brand-primary ring-1 ring-brand-primary/30',
  },
  horizontal: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-brand-primary/30',
    selected: 'border-brand-primary',
  },
};

// ============================================
// 3. MAIN COMPONENT
// ============================================

export const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  variant = 'default',
  size = 'md',
  iconPosition = 'top',
  showCategory = true,
  showSubFeatures = true,
  showMetrics = false,
  showPremiumBadge = true,
  showNewBadge = true,
  showLearnMore = true,
  showGlow = false,
  interactive = true,
  selected = false,
  disabled = false,
  onClick,
  onLearnMore,
  className = '',
  style,
  id,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

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

  const variantConfig = VARIANT_MAP[variant];
  const sizeConfig = SIZE_MAP[size];
  const categoryConfig = feature.category
    ? CATEGORY_CONFIG[feature.category]
    : null;
  const glowClass = showGlow && feature.glowColor
    ? GLOW_CONFIG[feature.glowColor]
    : '';

  const resolvedIcon = useMemo(() => {
    if (feature.icon) return feature.icon;
    if (feature.iconName && ICON_MAP[feature.iconName])
      return ICON_MAP[feature.iconName];
    return <Sparkles className="h-5 w-5" />;
  }, [feature.icon, feature.iconName]);

  const gradient = feature.gradient || 'from-brand-primary to-brand-secondary';
  const color = feature.color || '#3B82F6';

  const isHorizontal = variant === 'horizontal';

  // ============================================
  // Handlers
  // ============================================

  const handleCardClick = useCallback(() => {
    if (!interactive || disabled) return;
    onClick?.(feature);
  }, [interactive, disabled, onClick, feature]);

  const handleLearnMore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onLearnMore?.(feature);
    },
    [onLearnMore, feature]
  );

  // ============================================
  // Render: Icon
  // ============================================

  const renderIcon = () => {
    const isBackground = iconPosition === 'background';
    const iconContent = (
      <div
        className={`
          ${sizeConfig.iconBg}
          rounded-2xl
          bg-gradient-to-br ${gradient}
          flex items-center justify-center
          text-white
          shadow-lg
          flex-shrink-0
          transition-all duration-300
          ${isHovered ? 'scale-110 shadow-xl' : 'scale-100'}
          ${glowClass}
        `}
      >
        {React.cloneElement(resolvedIcon as React.ReactElement, {
          className: `${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : size === 'lg' ? 'h-6 w-6' : 'h-7 w-7'}`,
        })}
      </div>
    );

    if (isBackground) {
      return (
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <div className={`${sizeConfig.iconBg} rounded-2xl`}>
            {React.cloneElement(resolvedIcon as React.ReactElement, {
              className: 'h-full w-full',
            })}
          </div>
        </div>
      );
    }

    return iconContent;
  };

  // ============================================
  // Render: Badges
  // ============================================

  const renderBadges = () => {
    const badges: ReactNode[] = [];

    if (showPremiumBadge && feature.premium) {
      badges.push(
        <span
          key="premium"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"
        >
          <Crown className="h-3 w-3" />
          Premium
        </span>
      );
    }

    if (showNewBadge && feature.isNew) {
      badges.push(
        <span
          key="new"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20"
        >
          <Sparkles className="h-3 w-3" />
          New
        </span>
      );
    }

    if (feature.comingSoon) {
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

    if (feature.badge) {
      badges.push(
        <span
          key="badge"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary"
          style={feature.badgeColor ? { color: feature.badgeColor, backgroundColor: `${feature.badgeColor}20` } : {}}
        >
          {feature.badge}
        </span>
      );
    }

    if (showCategory && categoryConfig && !feature.badge) {
      badges.push(
        <span
          key="category"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-text-muted bg-brand-border/20"
        >
          {categoryConfig.icon}
          {categoryConfig.label}
        </span>
      );
    }

    if (badges.length === 0) return null;

    return <div className="flex flex-wrap items-center gap-1.5">{badges}</div>;
  };

  // ============================================
  // Render: Sub Features
  // ============================================

  const renderSubFeatures = () => {
    if (
      !showSubFeatures ||
      !feature.subFeatures ||
      feature.subFeatures.length === 0
    )
      return null;

    return (
      <ul className="space-y-1">
        {feature.subFeatures.map((sub, index) => (
          <li
            key={index}
            className={`flex items-start gap-2 ${sizeConfig.subFeature} text-text-muted`}
          >
            <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>{sub}</span>
          </li>
        ))}
      </ul>
    );
  };

  // ============================================
  // Render: Metrics
  // ============================================

  const renderMetrics = () => {
    if (!showMetrics || !feature.metrics || feature.metrics.length === 0)
      return null;

    return (
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-brand-border/30">
        {feature.metrics.map((metric, index) => {
          const trendIcon =
            metric.trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : metric.trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-red-500" />
            ) : null;

          return (
            <div key={index} className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="font-semibold text-text-primary text-sm">
                  {metric.value}
                </span>
                {trendIcon}
              </div>
              <p className="text-text-muted text-xs">{metric.label}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // Render: Learn More Link
  // ============================================

  const renderLearnMoreLink = () => {
    if (!showLearnMore) return null;

    const hasUrl = !!feature.learnMoreUrl;

    if (hasUrl) {
      return (
        <a
          href={feature.learnMoreUrl}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors group/link"
          onClick={(e) => e.stopPropagation()}
        >
          {feature.ctaText || 'Learn more'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" />
        </a>
      );
    }

    return (
      <button
        onClick={handleLearnMore}
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors group/link"
      >
        {feature.ctaText || 'Learn more'}
        <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" />
      </button>
    );
  };

  // ============================================
  // 4. MAIN RENDER
  // ============================================

  const renderVerticalLayout = () => (
    <>
      {/* Icon (top) */}
      {iconPosition === 'top' && (
        <div className="flex justify-start">{renderIcon()}</div>
      )}

      {/* Content */}
      <div className={`flex-1 flex flex-col ${sizeConfig.gap}`}>
        {/* Icon (left) */}
        {iconPosition === 'left' && renderIcon()}

        {/* Badges */}
        {renderBadges()}

        {/* Title */}
        <h3
          className={`font-bold text-text-primary ${sizeConfig.title}`}
          title={feature.tooltip}
        >
          {feature.title}
        </h3>

        {/* Description */}
        <p className={`text-text-secondary leading-relaxed ${sizeConfig.description}`}>
          {feature.description}
        </p>

        {/* Sub Features */}
        {renderSubFeatures()}

        {/* Metrics */}
        {renderMetrics()}

        {/* Learn More */}
        {renderLearnMoreLink()}
      </div>

      {/* Icon (right) */}
      {iconPosition === 'right' && renderIcon()}
    </>
  );

  const renderHorizontalLayout = () => (
    <div className="flex items-start gap-4">
      {/* Icon */}
      <div className="flex-shrink-0">{renderIcon()}</div>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${sizeConfig.gap}`}>
        {/* Badges */}
        {renderBadges()}

        {/* Title */}
        <h3
          className={`font-bold text-text-primary ${sizeConfig.title}`}
          title={feature.tooltip}
        >
          {feature.title}
        </h3>

        {/* Description */}
        <p className={`text-text-secondary leading-relaxed ${sizeConfig.description}`}>
          {feature.description}
        </p>

        {/* Sub Features */}
        {renderSubFeatures()}

        {/* Metrics */}
        {renderMetrics()}

        {/* Learn More */}
        {renderLearnMoreLink()}
      </div>
    </div>
  );

  const renderIconOnlyLayout = () => (
    <div className="flex flex-col items-center text-center">
      {/* Icon */}
      <div className="mb-3">{renderIcon()}</div>

      {/* Title */}
      <h3
        className={`font-semibold text-text-primary ${sizeConfig.title}`}
        title={feature.tooltip}
      >
        {feature.title}
      </h3>

      {/* Badges */}
      <div className="mt-1 flex justify-center">{renderBadges()}</div>
    </div>
  );

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
        ${!disabled ? variantConfig.hover : ''}
        ${selected ? variantConfig.selected : ''}
        ${interactive && !disabled ? 'cursor-pointer' : ''}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${sizeConfig.padding}
        ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${glowClass}
        ${className}
      `}
      style={style}
      onClick={handleCardClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={interactive && !disabled ? 'button' : 'article'}
      tabIndex={interactive && !disabled ? 0 : undefined}
    >
      {/* Background Icon */}
      {iconPosition === 'background' && renderIcon()}

      {/* Highlighted Accent Border */}
      {feature.highlight && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${color}, transparent)`,
          }}
        />
      )}

      {/* Layout */}
      {variant === 'icon-only'
        ? renderIconOnlyLayout()
        : isHorizontal
          ? renderHorizontalLayout()
          : renderVerticalLayout()}
    </div>
  );
};

// ============================================
// 5. FEATURE GRID HELPER
// ============================================

interface FeatureGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  children,
  columns = 3,
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

FeatureCard.displayName = 'FeatureCard';
FeatureGrid.displayName = 'FeatureGrid';

// ============================================
// 7. NAMED EXPORTS
// ============================================

export {
  FeatureGrid,
  ICON_MAP,
  CATEGORY_CONFIG,
  GLOW_CONFIG,
  SIZE_MAP,
  VARIANT_MAP,
};

// ============================================
// 8. TYPE EXPORTS
// ============================================

export type {
  FeatureCategory,
  FeatureVariant,
  FeatureSize,
  GlowColor,
  IconPosition,
  FeatureData,
  FeatureCardProps,
  FeatureGridProps,
};

// ============================================
// 9. DEFAULT EXPORT
// ============================================

export default FeatureCard;