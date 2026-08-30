// ============================================
// apps/frontend/src/components/landing/cards/PricingCard.tsx
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
  MinusCircle,
  HelpCircle,
  Sparkles,
  Zap,
  Star,
  Crown,
  Shield,
  Award,
  ArrowRight,
  Clock,
  Users,
  HardDrive,
  Activity,
  Globe,
  Mail,
  Calendar,
  FileText,
  Share2,
  CheckSquare,
  Cpu,
  Infinity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Timer,
  Gift,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Heart,
  ThumbsUp,
  MessageSquare,
  Phone,
  Headphones,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Upload,
  Wifi,
  Database,
  Cloud,
  Server,
  Code2,
  Palette,
  Eye,
  EyeOff,
  Plus,
  Minus,
  X,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

type BillingInterval = 'monthly' | 'yearly' | 'quarterly' | 'one_time';

type PricingVariant = 'default' | 'compact' | 'expanded' | 'compare' | 'highlighted';

type PricingSize = 'sm' | 'md' | 'lg' | 'xl';

type FeatureStatus = 'included' | 'excluded' | 'partial' | 'coming_soon' | 'addon';

type PricingTheme = 'light' | 'dark' | 'gradient' | 'premium';

interface PricingFeature {
  /** Feature name */
  name: string;
  /** Feature description */
  description?: string;
  /** Whether this feature is included */
  status: FeatureStatus;
  /** Tooltip text */
  tooltip?: string;
  /** Whether this is a highlighted feature */
  highlight?: boolean;
  /** Whether this is a new feature */
  isNew?: boolean;
  /** Category for grouping */
  category?: string;
  /** Custom icon for this feature */
  icon?: ReactNode;
  /** Value override (e.g., "5 seats") */
  value?: string;
}

interface PlanData {
  /** Unique plan ID */
  id: string;
  /** Plan name */
  name: string;
  /** Plan tier */
  tier?: PlanTier;
  /** Plan description */
  description?: string;
  /** Monthly price in cents */
  priceMonthly: number;
  /** Yearly price in cents */
  priceYearly: number;
  /** Currency code */
  currency?: string;
  /** Whether this is a custom/enterprise plan */
  isCustom?: boolean;
  /** Custom plan label */
  customLabel?: string;
  /** Whether this plan is highlighted */
  popular?: boolean;
  /** Custom badge text */
  badge?: string;
  /** Plan features */
  features: PricingFeature[];
  /** Feature categories for grouping */
  featureCategories?: string[];
  /** CTA button text */
  cta: string;
  /** CTA button URL */
  ctaHref?: string;
  /** CSS gradient for plan accent */
  gradient?: string;
  /** Plan color */
  color?: string;
  /** Plan icon */
  icon?: ReactNode;
  /** Plan limits summary */
  limits?: {
    aiActions: number | 'unlimited';
    apiCalls: number | 'unlimited';
    teamMembers: number | 'unlimited';
    storageGB: number | 'unlimited';
    agents: number | 'unlimited';
    workspaces: number | 'unlimited';
  };
  /** Whether plan includes a free trial */
  freeTrial?: boolean;
  /** Free trial duration in days */
  trialDays?: number;
  /** Whether plan has a money-back guarantee */
  moneyBack?: boolean;
  /** Guarantee duration in days */
  guaranteeDays?: number;
  /** Priority level for sorting */
  sortOrder?: number;
  /** Whether plan is available */
  available?: boolean;
  /** Whether plan is new */
  isNew?: boolean;
  /** Savings percentage vs monthly */
  yearlySavingsPercent?: number;
}

interface PricingCardProps {
  /** Plan data */
  plan: PlanData;
  /** Selected billing interval */
  billingInterval?: BillingInterval;
  /** Card variant */
  variant?: PricingVariant;
  /** Card size */
  size?: PricingSize;
  /** Theme */
  theme?: PricingTheme;
  /** Whether to show the billing toggle */
  showBillingToggle?: boolean;
  /** Whether to show feature descriptions */
  showFeatureDescriptions?: boolean;
  /** Whether to show feature tooltips */
  showFeatureTooltips?: boolean;
  /** Whether to show feature icons */
  showFeatureIcons?: boolean;
  /** Whether to show the feature categories */
  showFeatureCategories?: boolean;
  /** Whether to show the plan limits */
  showLimits?: boolean;
  /** Whether to show the free trial info */
  showTrialInfo?: boolean;
  /** Whether to show the money-back guarantee */
  showGuarantee?: boolean;
  /** Whether to show yearly savings */
  showSavings?: boolean;
  /** Maximum features to show (rest will be collapsed) */
  maxVisibleFeatures?: number;
  /** Whether this is the current user's plan */
  isCurrentPlan?: boolean;
  /** Whether the plan is disabled */
  disabled?: boolean;
  /** Callback when CTA is clicked */
  onCtaClick?: (plan: PlanData, interval: BillingInterval) => void;
  /** Callback when a feature is clicked */
  onFeatureClick?: (feature: PricingFeature) => void;
  /** Callback when "View all features" is clicked */
  onViewAllFeatures?: (plan: PlanData) => void;
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

const FEATURE_STATUS_CONFIG: Record<FeatureStatus, { icon: ReactNode; color: string; label: string }> = {
  included: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-500',
    label: 'Included',
  },
  excluded: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-gray-400 dark:text-gray-600',
    label: 'Not included',
  },
  partial: {
    icon: <MinusCircle className="h-4 w-4" />,
    color: 'text-yellow-500',
    label: 'Partial',
  },
  coming_soon: {
    icon: <Clock className="h-4 w-4" />,
    color: 'text-blue-500',
    label: 'Coming soon',
  },
  addon: {
    icon: <Plus className="h-4 w-4" />,
    color: 'text-purple-500',
    label: 'Add-on',
  },
};

const PLAN_TIER_CONFIG: Record<PlanTier, { icon: ReactNode; gradient: string; color: string; label: string }> = {
  free: {
    icon: <Heart className="h-5 w-5" />,
    gradient: 'from-gray-400 to-gray-500',
    color: '#94a3b8',
    label: 'Free',
  },
  starter: {
    icon: <Zap className="h-5 w-5" />,
    gradient: 'from-blue-500 to-blue-600',
    color: '#3b82f6',
    label: 'Starter',
  },
  professional: {
    icon: <Award className="h-5 w-5" />,
    gradient: 'from-purple-500 to-purple-600',
    color: '#8b5cf6',
    label: 'Professional',
  },
  enterprise: {
    icon: <Crown className="h-5 w-5" />,
    gradient: 'from-amber-500 to-amber-600',
    color: '#f59e0b',
    label: 'Enterprise',
  },
  custom: {
    icon: <Settings className="h-5 w-5" />,
    gradient: 'from-slate-500 to-slate-600',
    color: '#64748b',
    label: 'Custom',
  },
};

const SIZE_MAP: Record<
  PricingSize,
  {
    padding: string;
    name: string;
    price: string;
    interval: string;
    description: string;
    feature: string;
    cta: string;
    icon: string;
    gap: string;
  }
> = {
  sm: {
    padding: 'p-4',
    name: 'text-lg',
    price: 'text-2xl',
    interval: 'text-xs',
    description: 'text-xs',
    feature: 'text-xs',
    cta: 'text-sm py-2',
    icon: 'w-8 h-8',
    gap: 'gap-3',
  },
  md: {
    padding: 'p-6',
    name: 'text-xl',
    price: 'text-3xl',
    interval: 'text-sm',
    description: 'text-sm',
    feature: 'text-sm',
    cta: 'text-sm py-2.5',
    icon: 'w-10 h-10',
    gap: 'gap-4',
  },
  lg: {
    padding: 'p-8',
    name: 'text-2xl',
    price: 'text-4xl',
    interval: 'text-sm',
    description: 'text-sm',
    feature: 'text-sm',
    cta: 'text-base py-3',
    icon: 'w-12 h-12',
    gap: 'gap-5',
  },
  xl: {
    padding: 'p-10',
    name: 'text-3xl',
    price: 'text-5xl',
    interval: 'text-base',
    description: 'text-base',
    feature: 'text-base',
    cta: 'text-lg py-3.5',
    icon: 'w-14 h-14',
    gap: 'gap-6',
  },
};

const VARIANT_MAP: Record<
  PricingVariant,
  {
    background: string;
    border: string;
    shadow: string;
    hover: string;
    accent: string;
  }
> = {
  default: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-lg hover:-translate-y-1',
    accent: '',
  },
  compact: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-none',
    hover: 'hover:shadow-sm',
    accent: '',
  },
  expanded: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    hover: 'hover:shadow-xl hover:-translate-y-1',
    accent: '',
  },
  compare: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md',
    accent: '',
  },
  highlighted: {
    background: 'bg-gradient-to-b from-brand-primary/5 to-brand-secondary/5 dark:from-brand-primary/10 dark:to-brand-secondary/10',
    border: 'border-2 border-brand-primary/30',
    shadow: 'shadow-xl',
    hover: 'hover:shadow-2xl hover:-translate-y-2',
    accent: '',
  },
};

const THEME_MAP: Record<
  PricingTheme,
  {
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    featureBorder: string;
    divider: string;
    ctaPrimary: string;
    ctaSecondary: string;
  }
> = {
  light: {
    cardBg: 'bg-white',
    cardBorder: 'border-gray-200',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400',
    featureBorder: 'border-gray-100',
    divider: 'border-gray-100',
    ctaPrimary: 'bg-gray-900 text-white hover:bg-gray-800',
    ctaSecondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  dark: {
    cardBg: 'bg-brand-surface',
    cardBorder: 'border-brand-border',
    textPrimary: 'text-text-primary',
    textSecondary: 'text-text-secondary',
    textMuted: 'text-text-muted',
    featureBorder: 'border-brand-border/30',
    divider: 'border-brand-border/30',
    ctaPrimary: 'bg-white text-brand-dark hover:bg-gray-100',
    ctaSecondary: 'bg-brand-border/20 text-text-primary hover:bg-brand-border/30',
  },
  gradient: {
    cardBg: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    cardBorder: 'border-brand-border',
    textPrimary: 'text-text-primary',
    textSecondary: 'text-text-secondary',
    textMuted: 'text-text-muted',
    featureBorder: 'border-brand-border/30',
    divider: 'border-brand-border/30',
    ctaPrimary: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white',
    ctaSecondary: 'bg-brand-border/20 text-text-primary',
  },
  premium: {
    cardBg: 'bg-[#0a0a14]',
    cardBorder: 'border-purple-500/20',
    textPrimary: 'text-white',
    textSecondary: 'text-purple-200',
    textMuted: 'text-purple-300/50',
    featureBorder: 'border-purple-500/10',
    divider: 'border-purple-500/10',
    ctaPrimary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    ctaSecondary: 'bg-purple-500/10 text-purple-300',
  },
};

// ============================================
// 3. HELPER: Format Price
// ============================================

const formatPrice = (cents: number, currency: string = 'USD'): string => {
  if (cents === 0) return 'Free';

  const amount = cents / 100;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: amount < 1 ? 2 : 0,
  }).format(amount);
};

const formatPriceAbbreviated = (cents: number): string => {
  if (cents === 0) return 'Free';
  if (cents >= 100000) return `$${(cents / 100000).toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
};

// ============================================
// 4. MAIN COMPONENT
// ============================================

export const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  billingInterval = 'monthly',
  variant = 'default',
  size = 'md',
  theme = 'dark',
  showBillingToggle = false,
  showFeatureDescriptions = false,
  showFeatureTooltips = true,
  showFeatureIcons = true,
  showFeatureCategories = true,
  showLimits = true,
  showTrialInfo = true,
  showGuarantee = true,
  showSavings = true,
  maxVisibleFeatures = 10,
  isCurrentPlan = false,
  disabled = false,
  onCtaClick,
  onFeatureClick,
  onViewAllFeatures,
  className = '',
  style,
  id,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
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
  const themeConfig = THEME_MAP[theme];
  const tierConfig = plan.tier ? PLAN_TIER_CONFIG[plan.tier] : null;

  const currentPrice =
    billingInterval === 'yearly' ? plan.priceYearly : plan.priceMonthly;

  const monthlyEquivalent =
    billingInterval === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly;

  const savingsAmount = plan.priceMonthly * 12 - plan.priceYearly;
  const savingsPercent = plan.yearlySavingsPercent || Math.round((savingsAmount / (plan.priceMonthly * 12)) * 100);

  const isFree = currentPrice === 0;
  const isCustom = plan.isCustom || plan.tier === 'custom';

  const visibleFeatures = showAllFeatures
    ? plan.features
    : plan.features.slice(0, maxVisibleFeatures);

  const remainingFeatureCount = plan.features.length - maxVisibleFeatures;

  // Group features by category
  const groupedFeatures = useMemo(() => {
    if (!showFeatureCategories) return null;

    const groups: Record<string, PricingFeature[]> = {};
    const uncategorized: PricingFeature[] = [];

    plan.features.forEach((feature) => {
      if (feature.category) {
        if (!groups[feature.category]) groups[feature.category] = [];
        groups[feature.category].push(feature);
      } else {
        uncategorized.push(feature);
      }
    });

    return { groups, uncategorized };
  }, [plan.features, showFeatureCategories]);

  // ============================================
  // Handlers
  // ============================================

  const handleCtaClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled || isCurrentPlan) return;
      onCtaClick?.(plan, billingInterval);
    },
    [disabled, isCurrentPlan, onCtaClick, plan, billingInterval]
  );

  const handleToggleFeatures = useCallback(() => {
    setShowAllFeatures((prev) => !prev);
    if (!showAllFeatures) {
      onViewAllFeatures?.(plan);
    }
  }, [showAllFeatures, onViewAllFeatures, plan]);

  // ============================================
  // Render: Plan Badge
  // ============================================

  const renderBadge = () => {
    const badges: ReactNode[] = [];

    if (plan.popular || variant === 'highlighted') {
      badges.push(
        <span
          key="popular"
          className="
            inline-flex items-center gap-1.5
            px-3 py-1 rounded-full
            text-xs font-semibold
            bg-gradient-to-r from-brand-primary to-brand-secondary
            text-white
            shadow-lg
          "
        >
          <Star className="h-3 w-3" />
          {plan.badge || 'Most Popular'}
        </span>
      );
    }

    if (plan.isNew && !plan.popular) {
      badges.push(
        <span
          key="new"
          className="
            inline-flex items-center gap-1.5
            px-3 py-1 rounded-full
            text-xs font-semibold
            bg-green-500/20 text-green-500
            border border-green-500/30
          "
        >
          <Sparkles className="h-3 w-3" />
          New
        </span>
      );
    }

    if (isCurrentPlan) {
      badges.push(
        <span
          key="current"
          className="
            inline-flex items-center gap-1.5
            px-3 py-1 rounded-full
            text-xs font-semibold
            bg-green-500/10 text-green-500
            border border-green-500/30
          "
        >
          <BadgeCheck className="h-3 w-3" />
          Current Plan
        </span>
      );
    }

    if (badges.length === 0) return null;

    return <div className="flex flex-wrap items-center gap-2">{badges}</div>;
  };

  // ============================================
  // Render: Plan Header
  // ============================================

  const renderPlanHeader = () => {
    const gradient = plan.gradient || tierConfig?.gradient || 'from-brand-primary to-brand-secondary';
    const color = plan.color || tierConfig?.color || '#3B82F6';
    const icon = plan.icon || tierConfig?.icon || <Zap className="h-5 w-5" />;

    return (
      <div className="text-center">
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div
            className={`
              ${sizeConfig.icon}
              rounded-2xl
              bg-gradient-to-br ${gradient}
              flex items-center justify-center
              text-white
              shadow-lg
              transition-transform duration-300
              ${isHovered ? 'scale-110' : 'scale-100'}
            `}
          >
            {icon}
          </div>
        </div>

        {/* Name */}
        <h3 className={`font-bold ${themeConfig.textPrimary} ${sizeConfig.name}`}>
          {plan.name}
        </h3>

        {/* Description */}
        {plan.description && (
          <p className={`mt-1 ${themeConfig.textMuted} ${sizeConfig.description}`}>
            {plan.description}
          </p>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Price
  // ============================================

  const renderPrice = () => {
    if (isCustom) {
      return (
        <div className="text-center">
          <span className={`font-bold ${themeConfig.textPrimary} ${sizeConfig.price}`}>
            {plan.customLabel || 'Custom'}
          </span>
          <p className={`${themeConfig.textMuted} ${sizeConfig.interval} mt-1`}>
            Tailored to your needs
          </p>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className={`font-bold ${themeConfig.textPrimary} ${sizeConfig.price}`}>
            {isFree ? 'Free' : formatPrice(currentPrice, plan.currency)}
          </span>
          {!isFree && (
            <span className={`${themeConfig.textMuted} ${sizeConfig.interval}`}>
              /{billingInterval === 'yearly' ? 'year' : 'mo'}
            </span>
          )}
        </div>

        {/* Monthly Equivalent (yearly billing) */}
        {billingInterval === 'yearly' && !isFree && !isCustom && (
          <p className={`${themeConfig.textMuted} text-xs mt-1`}>
            {formatPrice(monthlyEquivalent, plan.currency)}/mo equivalent
          </p>
        )}

        {/* Savings Badge */}
        {billingInterval === 'yearly' && !isFree && !isCustom && showSavings && savingsAmount > 0 && (
          <p className="mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
              <TrendingDown className="h-3 w-3" />
              Save {formatPrice(savingsAmount)} ({savingsPercent}%)
            </span>
          </p>
        )}

        {/* Free Trial */}
        {showTrialInfo && plan.freeTrial && plan.trialDays && plan.trialDays > 0 && (
          <p className={`mt-2 text-xs ${themeConfig.textMuted} flex items-center justify-center gap-1`}>
            <Timer className="h-3 w-3" />
            {plan.trialDays}-day free trial
          </p>
        )}

        {/* Money-back Guarantee */}
        {showGuarantee && plan.moneyBack && plan.guaranteeDays && plan.guaranteeDays > 0 && (
          <p className={`mt-1 text-xs ${themeConfig.textMuted} flex items-center justify-center gap-1`}>
            <Shield className="h-3 w-3" />
            {plan.guaranteeDays}-day money-back guarantee
          </p>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Limits Summary
  // ============================================

  const renderLimits = () => {
    if (!showLimits || !plan.limits) return null;

    const limits = plan.limits;
    const limitItems = [
      { label: 'AI Actions', value: limits.aiActions, icon: <Zap className="h-3.5 w-3.5" /> },
      { label: 'API Calls', value: limits.apiCalls, icon: <Activity className="h-3.5 w-3.5" /> },
      { label: 'Team Members', value: limits.teamMembers, icon: <Users className="h-3.5 w-3.5" /> },
      { label: 'Storage', value: limits.storageGB, icon: <HardDrive className="h-3.5 w-3.5" />, suffix: 'GB' },
      { label: 'Agents', value: limits.agents, icon: <Cpu className="h-3.5 w-3.5" /> },
    ].filter((item) => item.value !== undefined);

    if (limitItems.length === 0) return null;

    return (
      <div className={`grid grid-cols-2 gap-2 py-3 border-y ${themeConfig.divider}`}>
        {limitItems.map((item, index) => {
          const isUnlimited = item.value === 'unlimited';
          return (
            <div key={index} className="flex items-center gap-1.5 text-xs">
              <span className={themeConfig.textMuted}>{item.icon}</span>
              <span className={themeConfig.textMuted}>{item.label}:</span>
              <span className={`font-semibold ${themeConfig.textPrimary}`}>
                {isUnlimited ? (
                  <span className="inline-flex items-center gap-0.5 text-brand-primary">
                    <Infinity className="h-3 w-3" />
                    Unlimited
                  </span>
                ) : (
                  <>
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    {item.suffix || ''}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // Render: Features List
  // ============================================

  const renderFeatureItem = (feature: PricingFeature, index: number) => {
    const statusConfig = FEATURE_STATUS_CONFIG[feature.status];
    const isIncluded = feature.status === 'included';
    const isExcluded = feature.status === 'excluded';

    return (
      <li
        key={index}
        className={`
          flex items-start gap-2.5
          ${sizeConfig.feature}
          ${isExcluded ? 'opacity-40' : ''}
          ${isIncluded ? '' : ''}
          transition-opacity duration-200
        `}
        onClick={() => onFeatureClick?.(feature)}
        role={onFeatureClick ? 'button' : undefined}
      >
        {/* Status Icon */}
        {showFeatureIcons && (
          <span
            className={`
              flex-shrink-0 mt-0.5
              ${statusConfig.color}
              transition-transform duration-200
              ${isHovered && isIncluded ? 'scale-110' : ''}
            `}
          >
            {statusConfig.icon}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Feature Name */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`
                ${isIncluded ? themeConfig.textSecondary : themeConfig.textMuted}
                ${feature.highlight ? 'font-semibold' : ''}
              `}
            >
              {feature.name}
            </span>

            {/* Feature Value */}
            {feature.value && (
              <span className={`font-semibold ${themeConfig.textPrimary} text-xs px-1.5 py-0.5 rounded bg-brand-primary/5`}>
                {feature.value}
              </span>
            )}

            {/* New Badge */}
            {feature.isNew && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-500">
                NEW
              </span>
            )}

            {/* Highlight Badge */}
            {feature.highlight && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/10 text-brand-primary">
                <Sparkles className="h-3 w-3 mr-0.5" />
                KEY
              </span>
            )}

            {/* Tooltip */}
            {showFeatureTooltips && feature.tooltip && (
              <span
                className="inline-flex items-center cursor-help"
                title={feature.tooltip}
              >
                <Info className="h-3 w-3 text-text-muted/50" />
              </span>
            )}
          </div>

          {/* Feature Description */}
          {showFeatureDescriptions && feature.description && (
            <p className={`mt-0.5 ${themeConfig.textMuted} text-xs`}>
              {feature.description}
            </p>
          )}
        </div>
      </li>
    );
  };

  const renderFeatures = () => {
    if (plan.features.length === 0) {
      return (
        <div className={`text-center py-4 ${themeConfig.textMuted} text-sm`}>
          No features listed
        </div>
      );
    }

    // If grouped, render by category
    if (groupedFeatures && Object.keys(groupedFeatures.groups).length > 0) {
      const allCategories = plan.featureCategories || Object.keys(groupedFeatures.groups);

      return (
        <ul className="space-y-3">
          {allCategories.map((category) => {
            const features = groupedFeatures.groups[category];
            if (!features || features.length === 0) return null;

            return (
              <li key={category}>
                <h5 className={`text-xs font-semibold uppercase tracking-wider ${themeConfig.textMuted} mb-2 px-1`}>
                  {category}
                </h5>
                <ul className="space-y-2">
                  {features.map((feature, idx) => renderFeatureItem(feature, idx))}
                </ul>
              </li>
            );
          })}

          {/* Uncategorized features */}
          {groupedFeatures.uncategorized.length > 0 && (
            <li>
              <ul className="space-y-2">
                {groupedFeatures.uncategorized.map((feature, idx) =>
                  renderFeatureItem(feature, idx)
                )}
              </ul>
            </li>
          )}
        </ul>
      );
    }

    // Flat list
    return (
      <ul className="space-y-2">
        {visibleFeatures.map((feature, index) => renderFeatureItem(feature, index))}

        {/* Show More / Show Less */}
        {remainingFeatureCount > 0 && (
          <li>
            <button
              onClick={handleToggleFeatures}
              className={`
                w-full flex items-center justify-center gap-1.5
                py-2 text-xs font-medium
                ${themeConfig.textMuted}
                hover:${themeConfig.textSecondary}
                transition-colors
              `}
            >
              {showAllFeatures ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show less features
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all {plan.features.length} features
                </>
              )}
            </button>
          </li>
        )}
      </ul>
    );
  };

  // ============================================
  // Render: CTA Button
  // ============================================

  const renderCta = () => {
    const isDisabled = disabled || isCurrentPlan;

    if (isCurrentPlan) {
      return (
        <button
          disabled
          className={`
            w-full
            inline-flex items-center justify-center gap-2
            rounded-xl font-semibold
            ${sizeConfig.cta}
            bg-green-500/10 text-green-500
            border border-green-500/30
            cursor-not-allowed
          `}
        >
          <BadgeCheck className="h-4 w-4" />
          Current Plan
        </button>
      );
    }

    if (disabled) {
      return (
        <button
          disabled
          className={`
            w-full
            inline-flex items-center justify-center gap-2
            rounded-xl font-semibold
            ${sizeConfig.cta}
            bg-gray-500/10 text-gray-500
            cursor-not-allowed
          `}
        >
          Unavailable
        </button>
      );
    }

    const ctaBaseClass = `
      w-full
      inline-flex items-center justify-center gap-2
      rounded-xl font-semibold
      ${sizeConfig.cta}
      transition-all duration-300
      active:scale-[0.97]
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    if (plan.tier === 'free' || isFree) {
      return (
        <a
          href={plan.ctaHref || '#'}
          onClick={handleCtaClick}
          className={`
            ${ctaBaseClass}
            ${themeConfig.ctaSecondary}
          `}
        >
          {plan.cta || 'Get Started'}
          <ArrowRight className="h-4 w-4" />
        </a>
      );
    }

    if (plan.tier === 'enterprise' || isCustom) {
      return (
        <a
          href={plan.ctaHref || '#'}
          onClick={handleCtaClick}
          className={`
            ${ctaBaseClass}
            ${theme === 'premium'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              : themeConfig.ctaPrimary}
            hover:shadow-xl hover:shadow-brand-primary/20
          `}
        >
          {plan.cta || 'Contact Sales'}
          <ArrowRight className="h-4 w-4" />
        </a>
      );
    }

    // Default CTA for paid plans
    return (
      <a
        href={plan.ctaHref || '#'}
        onClick={handleCtaClick}
        className={`
          ${ctaBaseClass}
          ${themeConfig.ctaPrimary}
          hover:shadow-xl hover:shadow-brand-primary/20
        `}
      >
        {plan.cta || 'Start Free Trial'}
        <ArrowRight className="h-4 w-4" />
      </a>
    );
  };

  // ============================================
  // 5. MAIN RENDER
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
        ${!disabled ? variantConfig.hover : ''}
        ${sizeConfig.padding}
        ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
      style={{
        ...style,
        ...(plan.tier === 'enterprise' || isCustom
          ? { borderColor: tierConfig?.color || '#f59e0b', borderWidth: '2px' }
          : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Highlighted Glow Effect */}
      {variant === 'highlighted' && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-b from-brand-primary/5 to-brand-secondary/5" />
      )}

      {/* Popular Banner */}
      {plan.popular && variant !== 'compact' && (
        <div className="absolute top-0 left-0 right-0">
          <div className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-center py-1.5 text-xs font-semibold">
            {plan.badge || 'Most Popular'}
          </div>
        </div>
      )}

      <div
        className={`flex flex-col ${sizeConfig.gap} ${
          plan.popular && variant !== 'compact' ? 'pt-6' : ''
        }`}
      >
        {/* Badge Row */}
        {renderBadge()}

        {/* Plan Header */}
        {renderPlanHeader()}

        {/* Price Section */}
        {renderPrice()}

        {/* Limits Summary */}
        {renderLimits()}

        {/* Features List */}
        <div className="flex-1">{renderFeatures()}</div>

        {/* CTA Button */}
        <div className="pt-2">{renderCta()}</div>

        {/* Additional Info */}
        {!isFree && !isCustom && (
          <p className={`text-center text-xs ${themeConfig.textMuted} pt-1`}>
            No credit card required
            {plan.freeTrial && plan.trialDays && ` • ${plan.trialDays}-day free trial`}
          </p>
        )}
      </div>

      {/* Corner Glow for premium theme */}
      {theme === 'premium' && (
        <>
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
        </>
      )}
    </div>
  );
};

// ============================================
// 6. PRICING GRID HELPER
// ============================================

interface PricingGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'stretch';
  className?: string;
}

export const PricingGrid: React.FC<PricingGridProps> = ({
  children,
  columns = 4,
  gap = 'md',
  align = 'stretch',
  className = '',
}) => {
  const gridCols: Record<number, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  const gapSize: Record<string, string> = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignClass: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    stretch: 'items-stretch',
  };

  return (
    <div
      className={`grid ${gridCols[columns]} ${gapSize[gap]} ${alignClass[align]} ${className}`}
    >
      {children}
    </div>
  );
};

// ============================================
// 7. PRICING TOGGLE / BILLING SWITCHER
// ============================================

interface BillingToggleProps {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  yearlyLabel?: string;
  monthlyLabel?: string;
  savingsText?: string;
  className?: string;
}

export const BillingToggle: React.FC<BillingToggleProps> = ({
  interval,
  onChange,
  yearlyLabel = 'Yearly',
  monthlyLabel = 'Monthly',
  savingsText = 'Save 20%',
  className = '',
}) => {
  const isYearly = interval === 'yearly';

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <button
        onClick={() => onChange('monthly')}
        className={`
          text-sm font-medium transition-colors duration-200
          ${!isYearly ? 'text-text-primary' : 'text-text-muted'}
        `}
      >
        {monthlyLabel}
      </button>

      <button
        onClick={() => onChange(isYearly ? 'monthly' : 'yearly')}
        className={`
          relative w-12 h-6 rounded-full
          transition-colors duration-200
          ${isYearly ? 'bg-brand-primary' : 'bg-brand-border'}
        `}
        aria-label={`Switch to ${isYearly ? 'monthly' : 'yearly'} billing`}
      >
        <div
          className={`
            absolute top-0.5 left-0.5
            w-5 h-5 rounded-full
            bg-white shadow-md
            transition-transform duration-200
            ${isYearly ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </button>

      <button
        onClick={() => onChange('yearly')}
        className={`
          flex items-center gap-2 text-sm font-medium transition-colors duration-200
          ${isYearly ? 'text-text-primary' : 'text-text-muted'}
        `}
      >
        {yearlyLabel}
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
          {savingsText}
        </span>
      </button>
    </div>
  );
};

// ============================================
// 8. DISPLAY NAME
// ============================================

PricingCard.displayName = 'PricingCard';
PricingGrid.displayName = 'PricingGrid';
BillingToggle.displayName = 'BillingToggle';

// ============================================
// 9. NAMED EXPORTS
// ============================================

export {
  PricingGrid,
  BillingToggle,
  FEATURE_STATUS_CONFIG,
  PLAN_TIER_CONFIG,
  SIZE_MAP,
  VARIANT_MAP,
  THEME_MAP,
  formatPrice,
  formatPriceAbbreviated,
};

// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  PlanTier,
  BillingInterval,
  PricingVariant,
  PricingSize,
  FeatureStatus,
  PricingTheme,
  PricingFeature,
  PlanData,
  PricingCardProps,
  PricingGridProps,
  BillingToggleProps,
};

// ============================================
// 11. DEFAULT EXPORT
// ============================================

export default PricingCard;