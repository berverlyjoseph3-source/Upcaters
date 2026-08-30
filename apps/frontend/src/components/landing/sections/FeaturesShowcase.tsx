// ============================================
// apps/frontend/src/components/landing/sections/FeaturesShowcase.tsx
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

type FeatureVariant = 'default' | 'card' | 'minimal' | 'bordered' | 'gradient' | 'glass';

type FeatureSize = 'sm' | 'md' | 'lg';

type FeatureLayout = 'grid' | 'tabs' | 'list' | 'spotlight' | 'alternating';

type FeatureAnimation = 'fade' | 'slide' | 'scale' | 'none';

type FeatureCategory =
  | 'ai'
  | 'automation'
  | 'integration'
  | 'collaboration'
  | 'security'
  | 'analytics'
  | 'development'
  | 'communication'
  | 'productivity'
  | 'custom';

type FeatureIconPosition = 'top' | 'left' | 'background';

interface FeatureItem {
  /** Unique feature ID */
  id: string;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Feature icon */
  icon?: ReactNode;
  /** Feature icon name for dynamic lookup */
  iconName?: string;
  /** Feature category */
  category?: FeatureCategory;
  /** Whether this is a premium feature */
  premium?: boolean;
  /** Whether this is a new feature */
  isNew?: boolean;
  /** Whether this is coming soon */
  comingSoon?: boolean;
  /** Custom badge text */
  badge?: string;
  /** Feature color accent */
  color?: string;
  /** Feature gradient */
  gradient?: string;
  /** Whether to highlight this feature */
  highlight?: boolean;
  /** List of sub-features */
  subFeatures?: string[];
  /** Feature metrics */
  metrics?: {
    label: string;
    value: string;
    change?: number;
    trend?: 'up' | 'down';
  }[];
  /** Call-to-action link */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Tooltip text */
  tooltip?: string;
  /** Tags for filtering */
  tags?: string[];
  /** Whether feature is available */
  available?: boolean;
  /** Screenshot/image URL */
  image?: string;
  /** Video demo URL */
  videoUrl?: string;
  /** Custom CSS class */
  className?: string;
}

interface FeaturesShowcaseProps {
  /** Array of features */
  features: FeatureItem[];
  /** Visual variant */
  variant?: FeatureVariant;
  /** Size preset */
  size?: FeatureSize;
  /** Layout style */
  layout?: FeatureLayout;
  /** Number of columns (for grid layout) */
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Icon position */
  iconPosition?: FeatureIconPosition;
  /** Entrance animation */
  animation?: FeatureAnimation;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether to animate on scroll */
  animateOnView?: boolean;
  /** Whether to stagger animations */
  stagger?: boolean;
  /** Stagger delay in ms */
  staggerDelay?: number;
  /** Whether to show premium badges */
  showPremiumBadge?: boolean;
  /** Whether to show new badges */
  showNewBadge?: boolean;
  /** Whether to show coming soon overlay */
  showComingSoon?: boolean;
  /** Whether to show sub-features */
  showSubFeatures?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show CTA links */
  showCTA?: boolean;
  /** Whether to show category filter tabs */
  showFilter?: boolean;
  /** Whether to show feature categories */
  showCategories?: boolean;
  /** Maximum features to show initially */
  maxVisibleFeatures?: number;
  /** Category filter callback */
  onFilterChange?: (category: FeatureCategory | 'all') => void;
  /** Callback when feature is clicked */
  onFeatureClick?: (feature: FeatureItem) => void;
  /** Callback when CTA is clicked */
  onCTAClick?: (feature: FeatureItem) => void;
  /** Whether to show section header */
  showHeader?: boolean;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Section badge */
  badge?: string;
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
  FeatureSize,
  {
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    padding: string;
    gap: string;
    badge: string;
    subFeature: string;
    metric: string;
  }
> = {
  sm: {
    icon: 'w-5 h-5',
    iconBg: 'w-9 h-9',
    title: 'text-sm',
    description: 'text-xs',
    padding: 'p-4',
    gap: 'gap-3',
    badge: 'text-[10px]',
    subFeature: 'text-xs',
    metric: 'text-xs',
  },
  md: {
    icon: 'w-6 h-6',
    iconBg: 'w-11 h-11',
    title: 'text-base',
    description: 'text-sm',
    padding: 'p-5',
    gap: 'gap-4',
    badge: 'text-xs',
    subFeature: 'text-sm',
    metric: 'text-sm',
  },
  lg: {
    icon: 'w-7 h-7',
    iconBg: 'w-13 h-13',
    title: 'text-lg',
    description: 'text-sm',
    padding: 'p-6',
    gap: 'gap-5',
    badge: 'text-xs',
    subFeature: 'text-sm',
    metric: 'text-base',
  },
};

const VARIANT_CONFIG: Record<
  FeatureVariant,
  {
    container: string;
    item: string;
    itemHighlighted: string;
    itemHover: string;
    titleColor: string;
    descriptionColor: string;
    border: string;
    shadow: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  default: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border',
    itemHighlighted: 'ring-2 ring-brand-primary/30 border-brand-primary/30',
    itemHover: 'hover:shadow-lg hover:border-brand-primary/20 hover:-translate-y-0.5',
    titleColor: 'text-text-primary',
    descriptionColor: 'text-text-secondary',
    border: 'border-brand-border',
    shadow: 'shadow-sm',
    iconBg: 'bg-brand-primary/10',
    iconColor: 'text-brand-primary',
  },
  card: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border shadow-md',
    itemHighlighted: 'ring-2 ring-brand-primary/30 border-brand-primary/30 shadow-xl',
    itemHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    titleColor: 'text-text-primary',
    descriptionColor: 'text-text-secondary',
    border: 'border-brand-border',
    shadow: 'shadow-md',
    iconBg: 'bg-brand-primary/10',
    iconColor: 'text-brand-primary',
  },
  minimal: {
    container: '',
    item: 'bg-transparent border-0 rounded-xl',
    itemHighlighted: 'bg-brand-primary/[0.03]',
    itemHover: 'hover:bg-brand-primary/[0.04]',
    titleColor: 'text-text-primary',
    descriptionColor: 'text-text-muted',
    border: 'border-transparent',
    shadow: 'shadow-none',
    iconBg: 'bg-transparent',
    iconColor: 'text-brand-primary',
  },
  bordered: {
    container: '',
    item: 'bg-transparent border-2 border-brand-border rounded-2xl',
    itemHighlighted: 'border-brand-primary/50 bg-brand-primary/[0.02]',
    itemHover: 'hover:border-brand-primary/30 hover:bg-brand-primary/[0.01]',
    titleColor: 'text-text-primary',
    descriptionColor: 'text-text-secondary',
    border: 'border-brand-border',
    shadow: 'shadow-none',
    iconBg: 'bg-brand-primary/10',
    iconColor: 'text-brand-primary',
  },
  gradient: {
    container: '',
    item: 'bg-gradient-to-br from-brand-surface to-brand-dark rounded-2xl border border-brand-border',
    itemHighlighted: 'from-brand-primary/[0.05] to-brand-secondary/[0.05] border-brand-primary/30',
    itemHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    titleColor: 'text-text-primary',
    descriptionColor: 'text-text-secondary',
    border: 'border-brand-border',
    shadow: 'shadow-lg',
    iconBg: 'bg-brand-primary/10',
    iconColor: 'text-brand-primary',
  },
  glass: {
    container: '',
    item: 'bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10',
    itemHighlighted: 'bg-white/10 border-white/20',
    itemHover: 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg',
    titleColor: 'text-white',
    descriptionColor: 'text-white/70',
    border: 'border-white/10',
    shadow: 'shadow-lg',
    iconBg: 'bg-white/10',
    iconColor: 'text-white',
  },
};

const LAYOUT_GRID: Record<number, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

const GAP_CONFIG: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const CATEGORY_CONFIG: Record<FeatureCategory, { label: string; color: string; icon: ReactNode }> = {
  ai: {
    label: 'AI & ML',
    color: '#7C3AED',
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z" />
        <path d="M8 14h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  automation: { label: 'Automation', color: '#F59E0B', icon: null },
  integration: { label: 'Integrations', color: '#3B82F6', icon: null },
  collaboration: { label: 'Collaboration', color: '#10B981', icon: null },
  security: { label: 'Security', color: '#EF4444', icon: null },
  analytics: { label: 'Analytics', color: '#06B6D4', icon: null },
  development: { label: 'Development', color: '#6366F1', icon: null },
  communication: { label: 'Communication', color: '#EC4899', icon: null },
  productivity: { label: 'Productivity', color: '#F97316', icon: null },
  custom: { label: 'Other', color: '#6B7280', icon: null },
};

// ============================================
// 3. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes features-fade-in {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes features-slide-in {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  @keyframes features-scale-in {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes features-icon-pop {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  @keyframes features-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes features-glow-pulse {
    0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
  }

  @keyframes features-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
`;

// ============================================
// 4. SUB-COMPONENT: Category Filter Tabs
// ============================================

interface CategoryFilterProps {
  categories: (FeatureCategory | 'all')[];
  activeCategory: FeatureCategory | 'all';
  onSelect: (category: FeatureCategory | 'all') => void;
  counts: Record<string, number>;
}

const CategoryFilterTabs: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onSelect,
  counts,
}) => (
  <div className="flex justify-center mb-8 md:mb-12">
    <div className="inline-flex flex-wrap gap-2 p-1.5 bg-brand-border/10 rounded-xl">
      <button
        onClick={() => onSelect('all')}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
          flex items-center gap-2
          ${activeCategory === 'all'
            ? 'bg-white dark:bg-brand-surface text-brand-primary shadow-sm'
            : 'text-text-muted hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
          }
        `}
      >
        All
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeCategory === 'all' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-border/20 text-text-muted'}`}>
          {counts.all || 0}
        </span>
      </button>
      {categories.filter(c => c !== 'all').map((category) => {
        const isActive = activeCategory === category;
        const config = CATEGORY_CONFIG[category as FeatureCategory] || CATEGORY_CONFIG.custom;

        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              flex items-center gap-2
              ${isActive
                ? 'bg-white dark:bg-brand-surface text-brand-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
              }
            `}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
            {config.label}
            {counts[category] !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-border/20 text-text-muted'}`}>
                {counts[category]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================
// 5. SUB-COMPONENT: Feature Card
// ============================================

interface FeatureCardProps {
  feature: FeatureItem;
  variant: FeatureVariant;
  size: FeatureSize;
  iconPosition: FeatureIconPosition;
  animation: FeatureAnimation;
  animationDuration: number;
  animationDelay: number;
  isInView: boolean;
  showPremiumBadge: boolean;
  showNewBadge: boolean;
  showSubFeatures: boolean;
  showMetrics: boolean;
  showCTA: boolean;
  onClick?: (feature: FeatureItem) => void;
  onCTAClick?: (feature: FeatureItem) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  variant,
  size,
  iconPosition,
  animation,
  animationDuration,
  animationDelay,
  isInView,
  showPremiumBadge,
  showNewBadge,
  showSubFeatures,
  showMetrics,
  showCTA,
  onClick,
  onCTAClick,
}) => {
  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const [isHovered, setIsHovered] = useState(false);

  const isHidden = feature.comingSoon && !feature.available;

  const handleClick = useCallback(() => {
    if (!isHidden) onClick?.(feature);
  }, [feature, isHidden, onClick]);

  return (
    <div
      className={`
        feature-card
        ${variantConfig.item}
        ${variantConfig.itemHover}
        ${feature.highlight ? variantConfig.itemHighlighted : ''}
        ${sizeConfig.padding}
        transition-all duration-300
        flex flex-col
        ${sizeConfig.gap}
        relative
        overflow-hidden
        cursor-pointer
        ${isHidden ? 'opacity-60' : ''}
        ${isInView ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        animation: isInView
          ? `features-${animation}-in ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) ${animationDelay}ms both`
          : 'none',
        borderColor: feature.highlight ? feature.color || undefined : undefined,
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${feature.title} feature`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      title={feature.tooltip}
    >
      {/* Icon */}
      {feature.icon && iconPosition === 'top' && (
        <div
          className={`
            ${sizeConfig.iconBg}
            rounded-2xl
            flex items-center justify-center
            transition-all duration-300
            ${isHovered ? 'scale-110 shadow-lg' : 'scale-100'}
          `}
          style={{
            background: feature.gradient
              ? `linear-gradient(135deg, ${feature.gradient})`
              : feature.color
                ? `${feature.color}20`
                : undefined,
            color: feature.color || undefined,
          }}
        >
          <div className={`${sizeConfig.icon} ${variantConfig.iconColor}`}>
            {feature.icon}
          </div>
        </div>
      )}

      {/* Content with icon on left */}
      <div className={`flex ${iconPosition === 'left' ? 'flex-row items-start' : 'flex-col'} ${sizeConfig.gap} flex-1`}>
        {/* Icon on left */}
        {feature.icon && iconPosition === 'left' && (
          <div
            className={`
              ${sizeConfig.iconBg}
              rounded-2xl
              flex items-center justify-center
              flex-shrink-0
              transition-all duration-300
              ${isHovered ? 'scale-110 shadow-lg' : 'scale-100'}
            `}
            style={{
              background: feature.gradient
                ? `linear-gradient(135deg, ${feature.gradient})`
                : feature.color
                  ? `${feature.color}20`
                  : undefined,
              color: feature.color || undefined,
            }}
          >
            <div className={`${sizeConfig.icon} ${variantConfig.iconColor}`}>
              {feature.icon}
            </div>
          </div>
        )}

        <div className={`flex flex-col ${sizeConfig.gap} flex-1`}>
          {/* Title + Badges */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`font-bold ${variantConfig.titleColor} ${sizeConfig.title}`}>
                {feature.title}
              </h3>

              {/* Premium Badge */}
              {showPremiumBadge && feature.premium && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${sizeConfig.badge} font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20`}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Premium
                </span>
              )}

              {/* New Badge */}
              {showNewBadge && feature.isNew && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${sizeConfig.badge} font-semibold bg-green-500/10 text-green-500 animate-pulse`}>
                  NEW
                </span>
              )}

              {/* Custom Badge */}
              {feature.badge && !feature.premium && !feature.isNew && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full ${sizeConfig.badge} font-medium bg-brand-primary/10 text-brand-primary`}>
                  {feature.badge}
                </span>
              )}
            </div>

            {/* Description */}
            <p className={`${variantConfig.descriptionColor} ${sizeConfig.description} leading-relaxed`}>
              {feature.description}
            </p>
          </div>

          {/* Sub-features */}
          {showSubFeatures && feature.subFeatures && feature.subFeatures.length > 0 && (
            <ul className={`space-y-1 ${sizeConfig.subFeature}`}>
              {feature.subFeatures.slice(0, 4).map((sub, idx) => (
                <li key={idx} className="flex items-start gap-2 text-text-muted">
                  <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{sub}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Metrics */}
          {showMetrics && feature.metrics && feature.metrics.length > 0 && (
            <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${variantConfig.border}`}>
              {feature.metrics.map((metric, idx) => (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`font-bold text-text-primary ${sizeConfig.metric}`}>
                      {metric.value}
                    </span>
                    {metric.trend === 'up' && (
                      <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{metric.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          {showCTA && feature.cta && (
            <div className="mt-auto pt-2">
              {feature.cta.href ? (
                <a
                  href={feature.cta.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCTAClick?.(feature);
                  }}
                >
                  {feature.cta.label}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              ) : (
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    feature.cta?.onClick?.();
                    onCTAClick?.(feature);
                  }}
                >
                  {feature.cta.label}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Coming Soon Overlay */}
      {isHidden && (
        <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
          <span className="px-3 py-1.5 bg-brand-border/50 text-text-muted rounded-full text-xs font-medium">
            Coming Soon
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const FeaturesShowcase: React.FC<FeaturesShowcaseProps> = ({
  features,
  variant = 'default',
  size = 'md',
  layout = 'grid',
  columns = 3,
  gap = 'md',
  iconPosition = 'top',
  animation = 'fade',
  animationDuration = 600,
  animateOnView = true,
  stagger = true,
  staggerDelay = 100,
  showPremiumBadge = true,
  showNewBadge = true,
  showComingSoon = true,
  showSubFeatures = true,
  showMetrics = false,
  showCTA = false,
  showFilter = true,
  showCategories = true,
  maxVisibleFeatures,
  onFilterChange,
  onFeatureClick,
  onCTAClick,
  showHeader = true,
  title,
  subtitle,
  badge,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'features-showcase',
}) => {
  // ============================================
  // State
  // ============================================

  const [activeCategory, setActiveCategory] = useState<FeatureCategory | 'all'>('all');
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [isInView, setIsInView] = useState(!animateOnView);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];

  // Extract categories
  const categories = useMemo(() => {
    if (!showFilter) return [];
    const cats = new Set<FeatureCategory>();
    features.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return ['all', ...Array.from(cats)] as (FeatureCategory | 'all')[];
  }, [features, showFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: features.length };
    features.forEach((f) => {
      const cat = f.category || 'custom';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [features]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    let filtered = activeCategory === 'all'
      ? features
      : features.filter((f) => f.category === activeCategory);

    if (!showComingSoon) {
      filtered = filtered.filter((f) => !f.comingSoon || f.available);
    }

    return filtered;
  }, [features, activeCategory, showComingSoon]);

  // Apply max visible limit
  const visibleFeatures = useMemo(() => {
    if (!maxVisibleFeatures || showAllFeatures) return filteredFeatures;
    return filteredFeatures.slice(0, maxVisibleFeatures);
  }, [filteredFeatures, maxVisibleFeatures, showAllFeatures]);

  const remainingCount = maxVisibleFeatures ? filteredFeatures.length - maxVisibleFeatures : 0;

  // Group features by category
  const groupedFeatures = useMemo(() => {
    if (!showCategories || activeCategory !== 'all' || layout !== 'grid') return null;

    const groups: Record<string, FeatureItem[]> = {};
    const uncategorized: FeatureItem[] = [];

    visibleFeatures.forEach((feature) => {
      const cat = feature.category || 'custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(feature);
    });

    return { groups, uncategorized };
  }, [visibleFeatures, showCategories, activeCategory, layout]);

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

    const styleId = 'features-showcase-animations';
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
      { threshold: 0.05 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateOnView]);

  // ============================================
  // Handlers
  // ============================================

  const handleCategorySelect = useCallback(
    (category: FeatureCategory | 'all') => {
      setActiveCategory(category);
      setShowAllFeatures(false);
      onFilterChange?.(category);
    },
    [onFilterChange]
  );

  const handleFeatureClick = useCallback(
    (feature: FeatureItem) => {
      onFeatureClick?.(feature);
    },
    [onFeatureClick]
  );

  const handleCTAClick = useCallback(
    (feature: FeatureItem) => {
      onCTAClick?.(feature);
    },
    [onCTAClick]
  );

  // ============================================
  // 7. RENDER: Grid Layout
  // ============================================

  const renderGridLayout = () => (
    <div className={`grid ${LAYOUT_GRID[columns]} ${GAP_CONFIG[gap]}`}>
      {visibleFeatures.map((feature, index) => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          variant={variant}
          size={size}
          iconPosition={iconPosition}
          animation={shouldReduceMotion ? 'none' : animation}
          animationDuration={animationDuration}
          animationDelay={stagger ? index * staggerDelay : 0}
          isInView={isInView}
          showPremiumBadge={showPremiumBadge}
          showNewBadge={showNewBadge}
          showSubFeatures={showSubFeatures}
          showMetrics={showMetrics}
          showCTA={showCTA}
          onClick={handleFeatureClick}
          onCTAClick={handleCTAClick}
        />
      ))}
    </div>
  );

  // ============================================
  // 8. RENDER: Tabs Layout
  // ============================================

  const renderTabsLayout = () => {
    const tabCategories = categories.filter((c) => c !== 'all') as FeatureCategory[];

    return (
      <div>
        {/* Vertical Tabs */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tab Buttons */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="space-y-1">
              {tabCategories.map((category) => {
                const isActive = activeCategory === category;
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.custom;

                return (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={`
                      w-full text-left px-4 py-3 rounded-xl text-sm font-medium
                      transition-all duration-200
                      flex items-center gap-3
                      ${isActive
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                        : 'text-text-muted hover:bg-brand-border/10 hover:text-text-primary'
                      }
                    `}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                    <span>{config.label}</span>
                    <span className="ml-auto text-xs text-text-muted">{categoryCounts[category] || 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            <div className={`grid grid-cols-1 md:grid-cols-2 ${GAP_CONFIG[gap]}`}>
              {visibleFeatures.map((feature, index) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  variant={variant}
                  size={size}
                  iconPosition={iconPosition}
                  animation={shouldReduceMotion ? 'none' : animation}
                  animationDuration={animationDuration}
                  animationDelay={stagger ? index * staggerDelay : 0}
                  isInView={isInView}
                  showPremiumBadge={showPremiumBadge}
                  showNewBadge={showNewBadge}
                  showSubFeatures={showSubFeatures}
                  showMetrics={showMetrics}
                  showCTA={showCTA}
                  onClick={handleFeatureClick}
                  onCTAClick={handleCTAClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 9. RENDER: Spotlight Layout
  // ============================================

  const renderSpotlightLayout = () => {
    const highlightedFeature = features.find((f) => f.highlight) || features[0];
    const otherFeatures = features.filter((f) => f.id !== highlightedFeature?.id);

    return (
      <div className="space-y-12">
        {/* Highlighted Feature */}
        {highlightedFeature && (
          <div className="max-w-4xl mx-auto">
            <FeatureCard
              feature={highlightedFeature}
              variant={variant}
              size="lg"
              iconPosition={iconPosition}
              animation={shouldReduceMotion ? 'none' : animation}
              animationDuration={animationDuration}
              animationDelay={0}
              isInView={isInView}
              showPremiumBadge={showPremiumBadge}
              showNewBadge={showNewBadge}
              showSubFeatures
              showMetrics={showMetrics}
              showCTA={showCTA}
              onClick={handleFeatureClick}
              onCTAClick={handleCTAClick}
            />
          </div>
        )}

        {/* Other Features Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${GAP_CONFIG[gap]}`}>
          {otherFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              variant={variant}
              size={size}
              iconPosition={iconPosition}
              animation={shouldReduceMotion ? 'none' : animation}
              animationDuration={animationDuration}
              animationDelay={stagger ? index * staggerDelay : 0}
              isInView={isInView}
              showPremiumBadge={showPremiumBadge}
              showNewBadge={showNewBadge}
              showSubFeatures={showSubFeatures}
              showMetrics={showMetrics}
              showCTA={showCTA}
              onClick={handleFeatureClick}
              onCTAClick={handleCTAClick}
            />
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // 10. RENDER: Alternating Layout
  // ============================================

  const renderAlternatingLayout = () => (
    <div className="space-y-12 md:space-y-20">
      {visibleFeatures.map((feature, index) => {
        const isEven = index % 2 === 0;

        return (
          <div
            key={feature.id}
            className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-8 lg:gap-16`}
          >
            {/* Content Side */}
            <div className="flex-1 space-y-4">
              <div className={`${sizeConfig.iconBg} rounded-2xl inline-flex items-center justify-center mb-2`}
                style={{
                  background: feature.gradient
                    ? `linear-gradient(135deg, ${feature.gradient})`
                    : feature.color ? `${feature.color}20` : undefined,
                  color: feature.color || undefined,
                }}
              >
                <div className={`${sizeConfig.icon} ${variantConfig.iconColor} m-3`}>
                  {feature.icon}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-bold ${variantConfig.titleColor} text-xl md:text-2xl`}>
                  {feature.title}
                </h3>
                {showPremiumBadge && feature.premium && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Premium
                  </span>
                )}
                {showNewBadge && feature.isNew && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
                    NEW
                  </span>
                )}
              </div>

              <p className={`${variantConfig.descriptionColor} text-base leading-relaxed`}>
                {feature.description}
              </p>

              {showSubFeatures && feature.subFeatures && feature.subFeatures.length > 0 && (
                <ul className="space-y-2">
                  {feature.subFeatures.map((sub, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-text-muted text-sm">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {sub}
                    </li>
                  ))}
                </ul>
              )}

              {showCTA && feature.cta && (
                <div className="pt-2">
                  {feature.cta.href ? (
                    <a
                      href={feature.cta.href}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
                    >
                      {feature.cta.label}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        feature.cta?.onClick?.();
                        handleCTAClick(feature);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-primary/90 transition-colors"
                    >
                      {feature.cta.label}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Image/Visual Side */}
            <div className="flex-1 flex items-center justify-center">
              {feature.image ? (
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full max-w-md rounded-2xl shadow-2xl border border-brand-border/30"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full max-w-md aspect-video rounded-2xl flex items-center justify-center"
                  style={{
                    background: feature.gradient
                      ? `linear-gradient(135deg, ${feature.gradient})`
                      : 'linear-gradient(135deg, #1F2937, #111827)',
                  }}
                >
                  {feature.icon && (
                    <div className="text-white/20 scale-[3]">
                      {feature.icon}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ============================================
  // 11. RENDER: List Layout
  // ============================================

  const renderListLayout = () => (
    <div className={`divide-y ${variantConfig.border}`}>
      {visibleFeatures.map((feature, index) => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          variant={variant}
          size={size}
          iconPosition="left"
          animation={shouldReduceMotion ? 'none' : animation}
          animationDuration={animationDuration}
          animationDelay={stagger ? index * staggerDelay : 0}
          isInView={isInView}
          showPremiumBadge={showPremiumBadge}
          showNewBadge={showNewBadge}
          showSubFeatures={showSubFeatures}
          showMetrics={showMetrics}
          showCTA={showCTA}
          onClick={handleFeatureClick}
          onCTAClick={handleCTAClick}
        />
      ))}
    </div>
  );

  // ============================================
  // 12. MAIN RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`features-showcase ${className}`}
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
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg md:text-xl text-text-muted max-w-3xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Category Filter */}
      {showFilter && layout !== 'tabs' && categories.length > 1 && (
        <CategoryFilterTabs
          categories={categories}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
          counts={categoryCounts}
        />
      )}

      {/* Layout Variations */}
      {layout === 'grid' && !groupedFeatures && renderGridLayout()}
      {layout === 'grid' && groupedFeatures && (
        <div className="space-y-12">
          {Object.entries(groupedFeatures.groups).map(([category, catFeatures]) => {
            const config = CATEGORY_CONFIG[category as FeatureCategory] || CATEGORY_CONFIG.custom;
            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                  <h3 className="text-lg font-semibold text-text-primary">{config.label}</h3>
                  <span className="text-sm text-text-muted">({catFeatures.length})</span>
                </div>
                <div className={`grid ${LAYOUT_GRID[columns]} ${GAP_CONFIG[gap]}`}>
                  {catFeatures.map((feature, index) => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      variant={variant}
                      size={size}
                      iconPosition={iconPosition}
                      animation={shouldReduceMotion ? 'none' : animation}
                      animationDuration={animationDuration}
                      animationDelay={stagger ? index * staggerDelay : 0}
                      isInView={isInView}
                      showPremiumBadge={showPremiumBadge}
                      showNewBadge={showNewBadge}
                      showSubFeatures={showSubFeatures}
                      showMetrics={showMetrics}
                      showCTA={showCTA}
                      onClick={handleFeatureClick}
                      onCTAClick={handleCTAClick}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {groupedFeatures.uncategorized.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-6">More Features</h3>
              <div className={`grid ${LAYOUT_GRID[columns]} ${GAP_CONFIG[gap]}`}>
                {groupedFeatures.uncategorized.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    variant={variant}
                    size={size}
                    iconPosition={iconPosition}
                    animation={shouldReduceMotion ? 'none' : animation}
                    animationDuration={animationDuration}
                    animationDelay={stagger ? index * staggerDelay : 0}
                    isInView={isInView}
                    showPremiumBadge={showPremiumBadge}
                    showNewBadge={showNewBadge}
                    showSubFeatures={showSubFeatures}
                    showMetrics={showMetrics}
                    showCTA={showCTA}
                    onClick={handleFeatureClick}
                    onCTAClick={handleCTAClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {layout === 'tabs' && renderTabsLayout()}
      {layout === 'spotlight' && renderSpotlightLayout()}
      {layout === 'alternating' && renderAlternatingLayout()}
      {layout === 'list' && renderListLayout()}

      {/* Show All / Show Less */}
      {remainingCount > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAllFeatures(!showAllFeatures)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-border/20 text-text-muted hover:bg-brand-border/30 rounded-xl text-sm font-medium transition-colors"
          >
            {showAllFeatures ? (
              <>Show Less Features</>
            ) : (
              <>Show All {filteredFeatures.length} Features</>
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

      {/* Empty State */}
      {visibleFeatures.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-lg">No features found</p>
          <button
            onClick={() => handleCategorySelect('all')}
            className="mt-2 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            View all features
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// 13. FEATURES SECTION WRAPPER
// ============================================

interface FeaturesSectionProps extends FeaturesShowcaseProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({
  sectionId = 'features',
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
        <FeaturesShowcase {...props} />
      </div>
    </section>
  );
};

// ============================================
// 14. AGENT FEATURES PRESET
// ============================================

interface AgentFeaturesProps {
  className?: string;
  variant?: FeatureVariant;
  size?: FeatureSize;
  layout?: FeatureLayout;
}

export const AgentFeatures: React.FC<AgentFeaturesProps> = (props) => {
  const features: FeatureItem[] = [
    {
      id: 'email-agent',
      title: 'Email Agent',
      description: 'Smart email management with AI-powered replies, labeling, and prioritization.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      category: 'communication',
      color: '#3B82F6',
      subFeatures: ['Send & receive emails', 'AI-powered replies', 'Smart labeling', 'Priority inbox'],
    },
    {
      id: 'calendar-agent',
      title: 'Calendar Agent',
      description: 'Intelligent scheduling with meeting coordination and availability management.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      category: 'productivity',
      color: '#F97316',
      subFeatures: ['Smart scheduling', 'Meeting coordination', 'Availability check', 'Reminders'],
    },
    {
      id: 'content-agent',
      title: 'Content Agent',
      description: 'Generate text, images, and videos using state-of-the-art AI models.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="15.5" />
          <polyline points="22 8.5 12 15.5 2 8.5" />
        </svg>
      ),
      category: 'ai',
      color: '#7C3AED',
      premium: true,
      subFeatures: ['Text generation', 'Image creation', 'Video generation', 'Content editing'],
    },
    {
      id: 'web-agent',
      title: 'Web Agent',
      description: 'Web search, research, and data extraction with AI-powered analysis.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      category: 'ai',
      color: '#06B6D4',
      subFeatures: ['Web search', 'Deep research', 'Weather info', 'Data extraction'],
    },
    {
      id: 'social-agent',
      title: 'Social Agent',
      description: 'Schedule and post to LinkedIn, Instagram, Facebook, and X (Twitter).',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      category: 'communication',
      color: '#EC4899',
      subFeatures: ['Multi-platform posting', 'Post scheduling', 'Analytics tracking', 'Content optimization'],
    },
    {
      id: 'task-agent',
      title: 'Task Agent',
      description: 'Manage tasks across Google Tasks, Asana, Monday.com, and more.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      category: 'productivity',
      color: '#6366F1',
      subFeatures: ['Task creation', 'Project organization', 'Batch operations', 'Due date tracking'],
    },
    {
      id: 'drive-agent',
      title: 'Drive Agent',
      description: 'File management, search, sharing, and organization across cloud storage.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
      category: 'integration',
      color: '#10B981',
      subFeatures: ['File upload/download', 'Folder management', 'File sharing', 'Search files'],
    },
    {
      id: 'orchestrator',
      title: 'Orchestrator Agent',
      description: 'Central AI coordinator that manages all specialized agents for complex workflows.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
      category: 'ai',
      color: '#6B7280',
      highlight: true,
      subFeatures: ['Intent classification', 'Task planning', 'Agent delegation', 'Memory management', 'Execution reflection'],
    },
  ];

  return <FeaturesShowcase features={features} showFilter showCategories {...props} />;
};

// ============================================
// 15. DISPLAY NAMES
// ============================================

FeaturesShowcase.displayName = 'FeaturesShowcase';
FeaturesSection.displayName = 'FeaturesSection';
AgentFeatures.displayName = 'AgentFeatures';
FeatureCard.displayName = 'FeatureCard';
CategoryFilterTabs.displayName = 'CategoryFilterTabs';

// ============================================
// 16. NAMED EXPORTS
// ============================================

export {
  FeatureCard,
  CategoryFilterTabs,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  LAYOUT_GRID,
  GAP_CONFIG,
  CATEGORY_CONFIG,
  ANIMATION_STYLES,
};

// ============================================
// 17. TYPE EXPORTS
// ============================================

export type {
  FeatureVariant,
  FeatureSize,
  FeatureLayout,
  FeatureAnimation,
  FeatureCategory,
  FeatureIconPosition,
  FeatureItem,
  FeaturesShowcaseProps,
  FeaturesSectionProps,
  AgentFeaturesProps,
  FeatureCardProps,
  CategoryFilterProps,
};

// ============================================
// 18. DEFAULT EXPORT
// ============================================

export default FeaturesShowcase;
