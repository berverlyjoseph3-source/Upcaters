// ============================================
// apps/frontend/src/components/landing/sections/PricingComparison.tsx
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

type PricingVariant = 'default' | 'card' | 'minimal' | 'enterprise' | 'glass';

type PricingSize = 'sm' | 'md' | 'lg';

type PricingLayout = 'grid' | 'horizontal' | 'featured';

type BillingInterval = 'monthly' | 'yearly' | 'quarterly';

type FeatureStatus = 'included' | 'excluded' | 'partial' | 'coming-soon' | 'addon' | 'unlimited';

type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

type PlanHighlight = 'none' | 'popular' | 'best-value' | 'recommended';

interface PricingFeature {
  /** Feature name */
  name: string;
  /** Feature description tooltip */
  description?: string;
  /** Feature availability status */
  status: FeatureStatus;
  /** Custom value override (e.g., "5 seats") */
  value?: string | number;
  /** Whether this is a highlighted feature */
  highlight?: boolean;
  /** Whether this is a new feature */
  isNew?: boolean;
  /** Feature category for grouping */
  category?: string;
  /** Custom icon */
  icon?: ReactNode;
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
  /** Quarterly price in cents (optional) */
  priceQuarterly?: number;
  /** Currency code */
  currency?: string;
  /** Whether this is a custom/enterprise plan */
  isCustom?: boolean;
  /** Custom plan CTA label */
  customLabel?: string;
  /** Plan highlight */
  highlight?: PlanHighlight;
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
  /** Plan color accent */
  color?: string;
  /** Plan gradient */
  gradient?: string;
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
  /** Whether plan includes free trial */
  freeTrial?: boolean;
  /** Free trial days */
  trialDays?: number;
  /** Whether plan has money-back guarantee */
  moneyBack?: boolean;
  /** Guarantee days */
  guaranteeDays?: number;
  /** Savings percentage vs monthly */
  yearlySavingsPercent?: number;
  /** Whether plan is available */
  available?: boolean;
  /** Whether plan is new */
  isNew?: boolean;
  /** Priority for sorting */
  sortOrder?: number;
  /** Whether this plan requires contacting sales */
  contactSales?: boolean;
}

interface PricingComparisonProps {
  /** Array of plans */
  plans: PlanData[];
  /** Visual variant */
  variant?: PricingVariant;
  /** Size preset */
  size?: PricingSize;
  /** Layout style */
  layout?: PricingLayout;
  /** Default billing interval */
  defaultInterval?: BillingInterval;
  /** Whether to show billing toggle */
  showBillingToggle?: boolean;
  /** Whether to show feature descriptions */
  showFeatureDescriptions?: boolean;
  /** Whether to show feature tooltips */
  showFeatureTooltips?: boolean;
  /** Whether to show feature icons */
  showFeatureIcons?: boolean;
  /** Whether to show feature categories */
  showFeatureCategories?: boolean;
  /** Whether to show plan limits */
  showLimits?: boolean;
  /** Whether to show trial info */
  showTrialInfo?: boolean;
  /** Whether to show money-back guarantee */
  showGuarantee?: boolean;
  /** Whether to show yearly savings */
  showSavings?: boolean;
  /** Maximum features to show initially */
  maxVisibleFeatures?: number;
  /** Whether to show feature comparison table */
  showComparisonTable?: boolean;
  /** Callback when CTA is clicked */
  onCtaClick?: (plan: PlanData, interval: BillingInterval) => void;
  /** Callback when feature is clicked */
  onFeatureClick?: (feature: PricingFeature, plan: PlanData) => void;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Section badge */
  badge?: string;
  /** Whether to show enterprise contact section */
  showEnterpriseContact?: boolean;
  /** Enterprise contact CTA */
  enterpriseCTA?: { label: string; href?: string; onClick?: () => void };
}

// ============================================
// 2. SIZE & VARIANT PRESETS
// ============================================

const SIZE_CONFIG: Record<
  PricingSize,
  {
    name: string;
    price: string;
    interval: string;
    description: string;
    feature: string;
    cta: string;
    padding: string;
    gap: string;
    icon: string;
    badge: string;
    limit: string;
  }
> = {
  sm: {
    name: 'text-lg',
    price: 'text-2xl',
    interval: 'text-xs',
    description: 'text-xs',
    feature: 'text-xs',
    cta: 'text-sm py-2',
    padding: 'p-4',
    gap: 'gap-3',
    icon: 'w-8 h-8',
    badge: 'text-[10px]',
    limit: 'text-xs',
  },
  md: {
    name: 'text-xl',
    price: 'text-3xl',
    interval: 'text-sm',
    description: 'text-sm',
    feature: 'text-sm',
    cta: 'text-sm py-2.5',
    padding: 'p-5',
    gap: 'gap-4',
    icon: 'w-10 h-10',
    badge: 'text-xs',
    limit: 'text-sm',
  },
  lg: {
    name: 'text-2xl',
    price: 'text-4xl',
    interval: 'text-sm',
    description: 'text-sm',
    feature: 'text-sm',
    cta: 'text-base py-3',
    padding: 'p-6',
    gap: 'gap-5',
    icon: 'w-12 h-12',
    badge: 'text-xs',
    limit: 'text-sm',
  },
};

const VARIANT_CONFIG: Record<
  PricingVariant,
  {
    container: string;
    item: string;
    itemHighlighted: string;
    itemHover: string;
    nameColor: string;
    priceColor: string;
    descriptionColor: string;
    featureColor: string;
    featureIncluded: string;
    featureExcluded: string;
    border: string;
    shadow: string;
    ctaPrimary: string;
    ctaSecondary: string;
  }
> = {
  default: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border',
    itemHighlighted: 'ring-2 ring-brand-primary/30 border-brand-primary/30 shadow-xl scale-[1.02]',
    itemHover: 'hover:shadow-lg hover:border-brand-primary/20',
    nameColor: 'text-text-primary',
    priceColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    featureColor: 'text-text-secondary',
    featureIncluded: 'text-green-500',
    featureExcluded: 'text-text-muted/40',
    border: 'border-brand-border',
    shadow: 'shadow-sm',
    ctaPrimary: 'bg-gradient-to-r from-brand-primary to-brand-primary/90 text-white hover:shadow-lg hover:shadow-brand-primary/25',
    ctaSecondary: 'bg-brand-border/10 text-text-primary hover:bg-brand-border/20',
  },
  card: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border shadow-md',
    itemHighlighted: 'ring-2 ring-brand-primary/30 border-brand-primary/30 shadow-2xl scale-[1.03]',
    itemHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    nameColor: 'text-text-primary',
    priceColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    featureColor: 'text-text-secondary',
    featureIncluded: 'text-green-500',
    featureExcluded: 'text-text-muted/40',
    border: 'border-brand-border',
    shadow: 'shadow-md',
    ctaPrimary: 'bg-gradient-to-r from-brand-primary to-brand-primary/90 text-white hover:shadow-xl hover:shadow-brand-primary/25',
    ctaSecondary: 'bg-brand-border/10 text-text-primary hover:bg-brand-border/20',
  },
  minimal: {
    container: '',
    item: 'bg-transparent border-0',
    itemHighlighted: 'bg-brand-primary/[0.02]',
    itemHover: 'hover:bg-brand-primary/[0.03]',
    nameColor: 'text-text-primary',
    priceColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    featureColor: 'text-text-secondary',
    featureIncluded: 'text-green-500',
    featureExcluded: 'text-text-muted/30',
    border: 'border-transparent',
    shadow: 'shadow-none',
    ctaPrimary: 'bg-brand-primary text-white hover:bg-brand-primary/90',
    ctaSecondary: 'text-brand-primary hover:text-brand-primary/80',
  },
  enterprise: {
    container: '',
    item: 'bg-gradient-to-br from-brand-surface to-brand-dark rounded-2xl border border-brand-border shadow-lg',
    itemHighlighted: 'border-brand-primary/30 shadow-2xl shadow-brand-primary/5 scale-[1.02]',
    itemHover: 'hover:shadow-2xl hover:border-brand-primary/30 hover:-translate-y-1',
    nameColor: 'text-text-primary',
    priceColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    featureColor: 'text-text-secondary',
    featureIncluded: 'text-green-400',
    featureExcluded: 'text-text-muted/30',
    border: 'border-brand-border',
    shadow: 'shadow-lg',
    ctaPrimary: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:shadow-xl hover:shadow-brand-primary/30',
    ctaSecondary: 'bg-white/5 text-white hover:bg-white/10',
  },
  glass: {
    container: '',
    item: 'bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10',
    itemHighlighted: 'bg-white/10 border-white/20 scale-[1.02]',
    itemHover: 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg',
    nameColor: 'text-white',
    priceColor: 'text-white',
    descriptionColor: 'text-white/60',
    featureColor: 'text-white/80',
    featureIncluded: 'text-green-400',
    featureExcluded: 'text-white/20',
    border: 'border-white/10',
    shadow: 'shadow-lg',
    ctaPrimary: 'bg-white text-brand-dark hover:shadow-xl hover:shadow-white/20',
    ctaSecondary: 'bg-white/10 text-white hover:bg-white/20',
  },
};

const FEATURE_STATUS_CONFIG: Record<
  FeatureStatus,
  { icon: ReactNode; color: string; label: string }
> = {
  included: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    color: 'text-green-500',
    label: 'Included',
  },
  excluded: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    color: 'text-text-muted/30',
    label: 'Not included',
  },
  partial: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    color: 'text-yellow-500',
    label: 'Partial',
  },
  'coming-soon': {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    color: 'text-blue-500',
    label: 'Coming soon',
  },
  addon: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    color: 'text-purple-500',
    label: 'Add-on',
  },
  unlimited: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M13.833 8.875S15.085 7 18.043 7C21 7 23 9.5 23 12s-1.784 5-4.864 5c-3.077 0-4.303-2.125-4.303-2.125" />
        <path d="M10.167 15.125S8.915 17 5.957 17C3 17 1 14.5 1 12s1.784-5 4.864-5c3.077 0 4.303 2.125 4.303 2.125" />
      </svg>
    ),
    color: 'text-green-500',
    label: 'Unlimited',
  },
};

const PLAN_HIGHLIGHT_CONFIG: Record<
  PlanHighlight,
  { label: string; bg: string; text: string; border: string }
> = {
  none: { label: '', bg: '', text: '', border: '' },
  popular: {
    label: 'Most Popular',
    bg: 'bg-brand-primary',
    text: 'text-white',
    border: 'border-brand-primary',
  },
  'best-value': {
    label: 'Best Value',
    bg: 'bg-green-500',
    text: 'text-white',
    border: 'border-green-500',
  },
  recommended: {
    label: 'Recommended',
    bg: 'bg-brand-secondary',
    text: 'text-white',
    border: 'border-brand-secondary',
  },
};

// ============================================
// 3. SUB-COMPONENT: Billing Toggle
// ============================================

interface BillingToggleProps {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  savingsText?: string;
}

const BillingToggleComponent: React.FC<BillingToggleProps> = ({
  interval,
  onChange,
  savingsText = 'Save 20%',
}) => {
  const intervals: BillingInterval[] = ['monthly', 'quarterly', 'yearly'];

  return (
    <div className="flex items-center justify-center gap-3">
      {intervals.map((int) => {
        const isActive = interval === int;
        return (
          <button
            key={int}
            onClick={() => onChange(int)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isActive
                ? 'bg-white dark:bg-brand-surface text-brand-primary shadow-sm ring-1 ring-brand-border'
                : 'text-text-muted hover:text-text-primary'
              }
            `}
          >
            <span className="capitalize">{int}</span>
            {int === 'yearly' && interval !== 'yearly' && (
              <span className="ml-2 px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-xs">
                {savingsText}
              </span>
            )}
          </button>
        );
      })}
      {/* Pill toggle for mobile */}
      <div className="hidden sm:flex items-center gap-2 ml-4">
        <span className={`text-sm ${interval === 'monthly' ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
          Monthly
        </span>
        <button
          onClick={() => onChange(interval === 'monthly' ? 'yearly' : 'monthly')}
          className={`
            relative w-12 h-6 rounded-full transition-colors duration-200
            ${interval === 'yearly' ? 'bg-brand-primary' : 'bg-brand-border'}
          `}
          aria-label={`Switch to ${interval === 'monthly' ? 'yearly' : 'monthly'} billing`}
        >
          <div
            className={`
              absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md
              transition-transform duration-200
              ${interval === 'yearly' ? 'translate-x-6' : 'translate-x-0'}
            `}
          />
        </button>
        <span className={`text-sm flex items-center gap-2 ${interval === 'yearly' ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
          Yearly
          <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-xs">
            {savingsText}
          </span>
        </span>
      </div>
    </div>
  );
};

// ============================================
// 4. SUB-COMPONENT: Feature Row
// ============================================

interface FeatureRowProps {
  feature: PricingFeature;
  plans: PlanData[];
  showIcons: boolean;
  showTooltips: boolean;
  showDescriptions: boolean;
  size: PricingSize;
  variant: PricingVariant;
  onFeatureClick?: (feature: PricingFeature, plan: PlanData) => void;
}

const FeatureRow: React.FC<FeatureRowProps> = ({
  feature,
  plans,
  showIcons,
  showTooltips,
  showDescriptions,
  size,
  variant,
  onFeatureClick,
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const variantConfig = VARIANT_CONFIG[variant];

  return (
    <>
      {/* Feature Name Column */}
      <div className="px-4 py-3 flex items-start gap-2">
        {showIcons && feature.icon && (
          <span className="flex-shrink-0 text-text-muted mt-0.5">{feature.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`${sizeConfig.feature} font-medium ${variantConfig.featureColor}`}>
              {feature.name}
            </span>
            {feature.isNew && (
              <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-semibold">
                NEW
              </span>
            )}
            {feature.highlight && (
              <span className="px-1.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-semibold">
                KEY
              </span>
            )}
            {showTooltips && feature.description && (
              <span className="group/tooltip relative cursor-help" title={feature.description}>
                <svg className="w-3.5 h-3.5 text-text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
            )}
          </div>
          {showDescriptions && feature.description && (
            <p className="text-xs text-text-muted mt-0.5">{feature.description}</p>
          )}
        </div>
      </div>

      {/* Feature Values per Plan */}
      {plans.map((plan) => {
        const planFeature = plan.features.find((f) => f.name === feature.name) || feature;
        const statusConfig = FEATURE_STATUS_CONFIG[planFeature.status] || FEATURE_STATUS_CONFIG.excluded;

        return (
          <div
            key={`${plan.id}-${feature.name}`}
            className={`
              px-4 py-3 text-center flex items-center justify-center
              ${onFeatureClick ? 'cursor-pointer hover:bg-brand-primary/[0.02]' : ''}
              transition-colors duration-150
            `}
            onClick={() => onFeatureClick?.(planFeature, plan)}
            title={statusConfig.label}
          >
            {planFeature.value ? (
              <span className={`${sizeConfig.feature} font-semibold ${variantConfig.featureColor}`}>
                {planFeature.value}
              </span>
            ) : (
              <span className={statusConfig.color}>
                {statusConfig.icon}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

export const PricingComparison: React.FC<PricingComparisonProps> = ({
  plans,
  variant = 'default',
  size = 'md',
  layout = 'grid',
  defaultInterval = 'monthly',
  showBillingToggle = true,
  showFeatureDescriptions = false,
  showFeatureTooltips = true,
  showFeatureIcons = true,
  showFeatureCategories = true,
  showLimits = true,
  showTrialInfo = true,
  showGuarantee = true,
  showSavings = true,
  maxVisibleFeatures = 10,
  showComparisonTable = true,
  onCtaClick,
  onFeatureClick,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'pricing-comparison',
  title,
  subtitle,
  badge,
  showEnterpriseContact = true,
  enterpriseCTA,
}) => {
  // ============================================
  // State
  // ============================================

  const [billingInterval, setBillingInterval] = useState<BillingInterval>(defaultInterval);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];

  // Sort plans
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }, [plans]);

  // Collect all unique features across plans
  const allFeatures = useMemo(() => {
    const featureMap = new Map<string, PricingFeature>();

    sortedPlans.forEach((plan) => {
      plan.features.forEach((feature) => {
        if (!featureMap.has(feature.name)) {
          featureMap.set(feature.name, feature);
        }
      });
    });

    return Array.from(featureMap.values());
  }, [sortedPlans]);

  // Group features by category
  const groupedFeatures = useMemo(() => {
    if (!showFeatureCategories) return null;

    const groups: Record<string, PricingFeature[]> = {};
    const uncategorized: PricingFeature[] = [];

    (showAllFeatures ? allFeatures : allFeatures.slice(0, maxVisibleFeatures)).forEach((feature) => {
      if (feature.category) {
        if (!groups[feature.category]) groups[feature.category] = [];
        groups[feature.category].push(feature);
      } else {
        uncategorized.push(feature);
      }
    });

    return { groups, uncategorized };
  }, [allFeatures, showAllFeatures, maxVisibleFeatures, showFeatureCategories]);

  const remainingCount = allFeatures.length - maxVisibleFeatures;

  // Get current price for a plan
  const getPrice = useCallback(
    (plan: PlanData): number => {
      switch (billingInterval) {
        case 'yearly':
          return plan.priceYearly;
        case 'quarterly':
          return plan.priceQuarterly || plan.priceMonthly * 3;
        default:
          return plan.priceMonthly;
      }
    },
    [billingInterval]
  );

  // Format price
  const formatPrice = useCallback(
    (cents: number, currency: string = 'USD'): string => {
      if (cents === 0) return 'Free';

      const amount = cents / 100;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: amount < 1 ? 2 : 0,
      }).format(amount);
    },
    []
  );

  // ============================================
  // Effects: Intersection Observer
  // ============================================

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
  // Handlers
  // ============================================

  const handleCtaClick = useCallback(
    (plan: PlanData) => {
      onCtaClick?.(plan, billingInterval);
    },
    [onCtaClick, billingInterval]
  );

  const getAnimationDelay = useCallback(
    (index: number): string => {
      return `${index * 100}ms`;
    },
    []
  );

  // ============================================
  // 6. RENDER: Grid Layout
  // ============================================

  const renderGridLayout = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(sortedPlans.length, 4)} gap-4 md:gap-6`}>
      {sortedPlans.map((plan, index) => {
        const price = getPrice(plan);
        const isHighlighted = plan.highlight && plan.highlight !== 'none';
        const highlightConfig = PLAN_HIGHLIGHT_CONFIG[plan.highlight || 'none'];
        const isFree = price === 0;
        const isCustom = plan.isCustom || plan.contactSales;
        const monthlyEquivalent = billingInterval === 'yearly' ? plan.priceYearly / 12 : plan.priceMonthly;
        const savingsAmount = plan.priceMonthly * 12 - plan.priceYearly;

        return (
          <div
            key={plan.id}
            className={`
              pricing-card
              ${variantConfig.item}
              ${variantConfig.itemHover}
              ${isHighlighted ? variantConfig.itemHighlighted : ''}
              ${sizeConfig.padding}
              transition-all duration-500
              flex flex-col
              ${sizeConfig.gap}
              relative
              ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
            style={{
              transitionDelay: getAnimationDelay(index),
              borderColor: isHighlighted ? highlightConfig.border.replace('border-', '') : undefined,
            }}
          >
            {/* Highlight Banner */}
            {isHighlighted && (
              <div
                className={`
                  absolute -top-3 left-1/2 -translate-x-1/2
                  px-4 py-1 rounded-full text-xs font-semibold
                  ${highlightConfig.bg} ${highlightConfig.text}
                  shadow-lg
                  whitespace-nowrap
                  z-10
                `}
              >
                {highlightConfig.label}
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center">
              {/* Icon */}
              {plan.icon && (
                <div className="flex justify-center mb-3">
                  <div
                    className={`
                      ${sizeConfig.icon}
                      rounded-2xl
                      flex items-center justify-center
                      text-white shadow-lg
                    `}
                    style={{
                      background: plan.gradient
                        ? `linear-gradient(135deg, ${plan.gradient})`
                        : `linear-gradient(135deg, ${plan.color || '#3B82F6'}, ${plan.color || '#3B82F6'}dd)`,
                    }}
                  >
                    {plan.icon}
                  </div>
                </div>
              )}

              {/* Name */}
              <h3 className={`font-bold ${variantConfig.nameColor} ${sizeConfig.name}`}>
                {plan.name}
              </h3>

              {/* Description */}
              {plan.description && (
                <p className={`mt-1 ${variantConfig.descriptionColor} ${sizeConfig.description}`}>
                  {plan.description}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="text-center">
              {isCustom ? (
                <div>
                  <span className={`font-bold ${variantConfig.priceColor} ${sizeConfig.price}`}>
                    {plan.customLabel || 'Custom'}
                  </span>
                  <p className={`${variantConfig.descriptionColor} ${sizeConfig.interval} mt-1`}>
                    Tailored to your needs
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`font-bold ${variantConfig.priceColor} ${sizeConfig.price}`}>
                      {isFree ? 'Free' : formatPrice(price, plan.currency)}
                    </span>
                    {!isFree && (
                      <span className={`${variantConfig.descriptionColor} ${sizeConfig.interval}`}>
                        /{billingInterval === 'yearly' ? 'year' : billingInterval === 'quarterly' ? 'quarter' : 'mo'}
                      </span>
                    )}
                  </div>

                  {/* Monthly equivalent for yearly */}
                  {billingInterval === 'yearly' && !isFree && (
                    <p className={`${variantConfig.descriptionColor} text-xs mt-1`}>
                      {formatPrice(monthlyEquivalent, plan.currency)}/mo equivalent
                    </p>
                  )}

                  {/* Savings */}
                  {billingInterval === 'yearly' && !isFree && showSavings && savingsAmount > 0 && (
                    <p className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                        Save {formatPrice(savingsAmount)} ({plan.yearlySavingsPercent || Math.round((savingsAmount / (plan.priceMonthly * 12)) * 100)}%)
                      </span>
                    </p>
                  )}

                  {/* Trial Info */}
                  {showTrialInfo && plan.freeTrial && plan.trialDays && (
                    <p className={`mt-2 text-xs ${variantConfig.descriptionColor}`}>
                      {plan.trialDays}-day free trial
                    </p>
                  )}

                  {/* Money-back Guarantee */}
                  {showGuarantee && plan.moneyBack && plan.guaranteeDays && (
                    <p className={`mt-1 text-xs ${variantConfig.descriptionColor}`}>
                      {plan.guaranteeDays}-day money-back guarantee
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Limits */}
            {showLimits && plan.limits && (
              <div className={`grid grid-cols-2 gap-2 py-3 border-t border-b ${variantConfig.border}`}>
                {plan.limits.aiActions !== undefined && (
                  <div className="text-center">
                    <p className={`${sizeConfig.limit} font-semibold ${variantConfig.featureColor}`}>
                      {plan.limits.aiActions === 'unlimited' ? '∞' : (plan.limits.aiActions as number).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-text-muted">AI Actions</p>
                  </div>
                )}
                {plan.limits.apiCalls !== undefined && (
                  <div className="text-center">
                    <p className={`${sizeConfig.limit} font-semibold ${variantConfig.featureColor}`}>
                      {plan.limits.apiCalls === 'unlimited' ? '∞' : (plan.limits.apiCalls as number).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-text-muted">API Calls</p>
                  </div>
                )}
                {plan.limits.teamMembers !== undefined && (
                  <div className="text-center">
                    <p className={`${sizeConfig.limit} font-semibold ${variantConfig.featureColor}`}>
                      {plan.limits.teamMembers === 'unlimited' ? '∞' : (plan.limits.teamMembers as number).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-text-muted">Team Members</p>
                  </div>
                )}
                {plan.limits.storageGB !== undefined && (
                  <div className="text-center">
                    <p className={`${sizeConfig.limit} font-semibold ${variantConfig.featureColor}`}>
                      {plan.limits.storageGB === 'unlimited' ? '∞' : `${(plan.limits.storageGB as number).toLocaleString()}GB`}
                    </p>
                    <p className="text-[10px] text-text-muted">Storage</p>
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            <div className="flex-1 space-y-2">
              {plan.features.slice(0, maxVisibleFeatures).map((feature, idx) => {
                const statusConfig = FEATURE_STATUS_CONFIG[feature.status] || FEATURE_STATUS_CONFIG.excluded;
                return (
                  <div                    key={idx}
                    className={`
                      flex items-start gap-2
                      ${sizeConfig.feature}
                      ${feature.status === 'excluded' ? 'opacity-40' : ''}
                    `}
                  >
                    <span className={`flex-shrink-0 mt-0.5 ${statusConfig.color}`}>
                      {statusConfig.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={variantConfig.featureColor}>{feature.name}</span>
                        {feature.value && (
                          <span className="font-semibold text-text-primary">{feature.value}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Button */}
            <div className="pt-2 mt-auto">
              {plan.contactSales ? (
                <a
                  href={plan.ctaHref || '#'}
                  className={`
                    w-full inline-flex items-center justify-center gap-2
                    rounded-xl font-semibold
                    ${sizeConfig.cta}
                    transition-all duration-300
                    active:scale-[0.97]
                    ${variantConfig.ctaSecondary}
                  `}
                  onClick={() => handleCtaClick(plan)}
                >
                  {plan.cta || 'Contact Sales'}
                </a>
              ) : (
                <a
                  href={plan.ctaHref || '#'}
                  className={`
                    w-full inline-flex items-center justify-center gap-2
                    rounded-xl font-semibold
                    ${sizeConfig.cta}
                    transition-all duration-300
                    active:scale-[0.97]
                    ${plan.tier === 'free' || isFree ? variantConfig.ctaSecondary : variantConfig.ctaPrimary}
                  `}
                  onClick={() => handleCtaClick(plan)}
                >
                  {plan.cta || 'Get Started'}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              )}
            </div>

            {/* New Badge */}
            {plan.isNew && (
              <div className="absolute top-3 right-3 px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-semibold animate-pulse">
                NEW
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ============================================
  // 7. RENDER: Comparison Table
  // ============================================

  const renderComparisonTable = () => (
    <div
      className={`
        ${variantConfig.item}
        rounded-2xl
        overflow-hidden
        ${variantConfig.shadow}
        ${variantConfig.border}
      `}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* Plan Headers */}
            <tr className={`border-b ${variantConfig.border}`}>
              <th className="px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-[250px] min-w-[200px]">
                Feature
              </th>
              {sortedPlans.map((plan) => {
                const price = getPrice(plan);
                const isHighlighted = plan.highlight && plan.highlight !== 'none';
                const highlightConfig = PLAN_HIGHLIGHT_CONFIG[plan.highlight || 'none'];

                return (
                  <th
                    key={plan.id}
                    className={`
                      px-4 py-4 text-center min-w-[140px]
                      ${isHighlighted ? 'bg-brand-primary/[0.03]' : ''}
                    `}
                  >
                    {/* Highlight Badge */}
                    {isHighlighted && (
                      <span
                        className={`
                          inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2
                          ${highlightConfig.bg} ${highlightConfig.text}
                        `}
                      >
                        {highlightConfig.label}
                      </span>
                    )}
                    <p className={`font-bold ${variantConfig.nameColor} text-sm`}>{plan.name}</p>
                    <p className={`font-bold ${variantConfig.priceColor} text-xl mt-1`}>
                      {plan.isCustom ? 'Custom' : formatPrice(price, plan.currency)}
                    </p>
                    {!plan.isCustom && !plan.contactSales && (
                      <p className={`text-xs ${variantConfig.descriptionColor}`}>
                        /{billingInterval === 'yearly' ? 'year' : 'mo'}
                      </p>
                    )}
                    <a
                      href={plan.ctaHref || '#'}
                      className={`
                        mt-3 inline-flex items-center justify-center gap-1
                        px-4 py-1.5 rounded-lg text-xs font-semibold
                        transition-all duration-200
                        active:scale-[0.97]
                        ${plan.tier === 'free' || plan.contactSales ? variantConfig.ctaSecondary : variantConfig.ctaPrimary}
                      `}
                      onClick={() => handleCtaClick(plan)}
                    >
                      {plan.cta || 'Get Started'}
                    </a>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Grouped Features */}
            {groupedFeatures ? (
              <>
                {Object.entries(groupedFeatures.groups).map(([category, features]) => (
                  <React.Fragment key={category}>
                    <tr className={`border-b ${variantConfig.border} bg-brand-border/5`}>
                      <td
                        colSpan={sortedPlans.length + 1}
                        className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider"
                      >
                        {category}
                      </td>
                    </tr>
                    {features.map((feature) => (
                      <tr key={feature.name} className={`border-b ${variantConfig.border} hover:bg-brand-primary/[0.01] transition-colors`}>
                        <FeatureRow
                          feature={feature}
                          plans={sortedPlans}
                          showIcons={showFeatureIcons}
                          showTooltips={showFeatureTooltips}
                          showDescriptions={showFeatureDescriptions}
                          size={size}
                          variant={variant}
                          onFeatureClick={onFeatureClick}
                        />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {groupedFeatures.uncategorized.length > 0 && (
                  <>
                    <tr className={`border-b ${variantConfig.border} bg-brand-border/5`}>
                      <td
                        colSpan={sortedPlans.length + 1}
                        className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider"
                      >
                        Other Features
                      </td>
                    </tr>
                    {groupedFeatures.uncategorized.map((feature) => (
                      <tr key={feature.name} className={`border-b ${variantConfig.border} hover:bg-brand-primary/[0.01] transition-colors`}>
                        <FeatureRow
                          feature={feature}
                          plans={sortedPlans}
                          showIcons={showFeatureIcons}
                          showTooltips={showFeatureTooltips}
                          showDescriptions={showFeatureDescriptions}
                          size={size}
                          variant={variant}
                          onFeatureClick={onFeatureClick}
                        />
                      </tr>
                    ))}
                  </>
                )}
              </>
            ) : (
              /* Flat Feature List */
              (showAllFeatures ? allFeatures : allFeatures.slice(0, maxVisibleFeatures)).map((feature) => (
                <tr key={feature.name} className={`border-b ${variantConfig.border} hover:bg-brand-primary/[0.01] transition-colors`}>
                  <FeatureRow
                    feature={feature}
                    plans={sortedPlans}
                    showIcons={showFeatureIcons}
                    showTooltips={showFeatureTooltips}
                    showDescriptions={showFeatureDescriptions}
                    size={size}
                    variant={variant}
                    onFeatureClick={onFeatureClick}
                  />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Show All Features Button */}
      {remainingCount > 0 && (
        <div className="px-4 py-3 text-center border-t border-brand-border/30">
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
          >
            {showAllFeatures ? (
              <>Show less features</>
            ) : (
              <>Show all {allFeatures.length} features</>
            )}
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showAllFeatures ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  // ============================================
  // 8. RENDER: Enterprise Contact
  // ============================================

  const renderEnterpriseContact = () => (
    <div className="text-center mt-12 p-6 bg-gradient-to-r from-brand-primary/[0.03] to-brand-secondary/[0.03] rounded-2xl border border-brand-border/30">
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        Need a custom plan?
      </h3>
      <p className="text-text-muted text-sm mb-4 max-w-md mx-auto">
        Contact our sales team for a tailored solution that fits your organization's unique needs.
      </p>
      <a
        href={enterpriseCTA?.href || '/contact'}
        onClick={enterpriseCTA?.onClick}
        className={`
          inline-flex items-center gap-2
          px-6 py-2.5 rounded-xl
          text-sm font-semibold
          transition-all duration-200
          active:scale-[0.97]
          ${variantConfig.ctaPrimary}
        `}
      >
        {enterpriseCTA?.label || 'Contact Sales'}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </a>
    </div>
  );

  // ============================================
  // 9. MAIN RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`pricing-comparison ${className}`}
      style={style}
    >
      {/* Section Header */}
      {(title || subtitle || badge) && (
        <div className="text-center mb-8 md:mb-12">
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

      {/* Billing Toggle */}
      {showBillingToggle && (
        <div className="mb-8 md:mb-12">
          <BillingToggleComponent
            interval={billingInterval}
            onChange={setBillingInterval}
          />
        </div>
      )}

      {/* Grid Layout */}
      {layout === 'grid' && !showComparisonTable && renderGridLayout()}
      {layout === 'grid' && showComparisonTable && (
        <div className="space-y-8">
          {renderGridLayout()}
          <div className="mt-8">
            {renderComparisonTable()}
          </div>
        </div>
      )}

      {/* Comparison Table Only */}
      {layout === 'horizontal' && renderComparisonTable()}

      {/* Featured Layout */}
      {layout === 'featured' && (
        <div className="space-y-8">
          {/* Featured Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {sortedPlans
              .filter((p) => p.highlight && p.highlight !== 'none')
              .map((plan, index) => {
                const price = getPrice(plan);
                const highlightConfig = PLAN_HIGHLIGHT_CONFIG[plan.highlight || 'none'];

                return (
                  <div
                    key={plan.id}
                    className={`
                      ${variantConfig.item}
                      ${variantConfig.itemHighlighted}
                      ${sizeConfig.padding}
                      transition-all duration-500
                      flex flex-col
                      ${sizeConfig.gap}
                      relative
                      ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                    `}
                    style={{
                      transitionDelay: getAnimationDelay(index),
                      borderColor: highlightConfig.border.replace('border-', ''),
                    }}
                  >
                    {/* Highlight Banner */}
                    <div
                      className={`
                        absolute -top-3 left-1/2 -translate-x-1/2
                        px-4 py-1 rounded-full text-xs font-semibold
                        ${highlightConfig.bg} ${highlightConfig.text}
                        shadow-lg whitespace-nowrap z-10
                      `}
                    >
                      {highlightConfig.label}
                    </div>

                    <h3 className={`font-bold ${variantConfig.nameColor} ${sizeConfig.name} text-center`}>
                      {plan.name}
                    </h3>
                    <p className={`text-center ${variantConfig.descriptionColor} ${sizeConfig.description}`}>
                      {plan.description}
                    </p>

                    <div className="text-center">
                      <span className={`font-bold ${variantConfig.priceColor} ${sizeConfig.price}`}>
                        {formatPrice(price, plan.currency)}
                      </span>
                      <span className={`${variantConfig.descriptionColor} ${sizeConfig.interval}`}>
                        /{billingInterval === 'yearly' ? 'year' : 'mo'}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      {plan.features.slice(0, 8).map((feature, idx) => {
                        const statusConfig = FEATURE_STATUS_CONFIG[feature.status] || FEATURE_STATUS_CONFIG.excluded;
                        return (
                          <div key={idx} className={`flex items-start gap-2 ${sizeConfig.feature}`}>
                            <span className={`flex-shrink-0 mt-0.5 ${statusConfig.color}`}>
                              {statusConfig.icon}
                            </span>
                            <span className={variantConfig.featureColor}>{feature.name}</span>
                          </div>
                        );
                      })}
                    </div>

                    <a
                      href={plan.ctaHref || '#'}
                      className={`
                        w-full inline-flex items-center justify-center gap-2
                        rounded-xl font-semibold
                        ${sizeConfig.cta}
                        transition-all duration-300
                        active:scale-[0.97]
                        ${variantConfig.ctaPrimary}
                      `}
                      onClick={() => handleCtaClick(plan)}
                    >
                      {plan.cta || 'Get Started'}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  </div>
                );
              })}
          </div>

          {/* Other Plans */}
          {renderComparisonTable()}
        </div>
      )}

      {/* Enterprise Contact */}
      {showEnterpriseContact && renderEnterpriseContact()}
    </div>
  );
};

// ============================================
// 10. PRICING SECTION WRAPPER
// ============================================

interface PricingSectionProps extends PricingComparisonProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  sectionId = 'pricing',
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
        <PricingComparison {...props} />
      </div>
    </section>
  );
};

// ============================================
// 11. DISPLAY NAMES
// ============================================

PricingComparison.displayName = 'PricingComparison';
PricingSection.displayName = 'PricingSection';
BillingToggleComponent.displayName = 'BillingToggle';
FeatureRow.displayName = 'FeatureRow';

// ============================================
// 12. NAMED EXPORTS
// ============================================

export {
  BillingToggleComponent,
  FeatureRow,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  FEATURE_STATUS_CONFIG,
  PLAN_HIGHLIGHT_CONFIG,
};

// ============================================
// 13. TYPE EXPORTS
// ============================================

export type {
  PricingVariant,
  PricingSize,
  PricingLayout,
  BillingInterval,
  FeatureStatus,
  PlanTier,
  PlanHighlight,
  PricingFeature,
  PlanData,
  PricingComparisonProps,
  PricingSectionProps,
  BillingToggleProps,
  FeatureRowProps,
};

// ============================================
// 14. DEFAULT EXPORT
// ============================================

export default PricingComparison;
