// ============================================
// apps/frontend/src/components/landing/sections/IntegrationsMarquee.tsx
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

type MarqueeDirection = 'left' | 'right' | 'up' | 'down';

type MarqueeVariant = 'default' | 'card' | 'minimal' | 'bordered' | 'glass';

type MarqueeSize = 'sm' | 'md' | 'lg';

type MarqueeSpeed = 'slow' | 'normal' | 'fast' | 'custom';

type MarqueePause = 'none' | 'hover' | 'hover-row' | 'always';

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
  | 'automation'
  | 'ai'
  | 'security'
  | 'other';

interface IntegrationItem {
  /** Unique integration ID */
  id: string;
  /** Integration name */
  name: string;
  /** Integration logo URL */
  logo: string;
  /** Logo for dark mode */
  logoDark?: string;
  /** Integration description (for tooltip/card view) */
  description?: string;
  /** Category for filtering */
  category?: IntegrationCategory;
  /** Integration website URL */
  url?: string;
  /** Whether integration is featured */
  featured?: boolean;
  /** Whether integration is new */
  isNew?: boolean;
  /** Whether integration is coming soon */
  comingSoon?: boolean;
  /** Custom color accent */
  color?: string;
  /** Whether to show name label */
  showName?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface IntegrationRow {
  /** Row ID */
  id: string;
  /** Integrations in this row */
  items: IntegrationItem[];
  /** Row direction */
  direction?: MarqueeDirection;
  /** Row speed override */
  speed?: MarqueeSpeed;
  /** Custom speed in seconds */
  customSpeed?: number;
}

interface IntegrationsMarqueeProps {
  /** Array of integration rows */
  rows?: IntegrationRow[];
  /** Flat array of integrations (auto-arranged into rows) */
  integrations?: IntegrationItem[];
  /** Number of rows to auto-generate */
  rowsCount?: number;
  /** Visual variant */
  variant?: MarqueeVariant;
  /** Size preset */
  size?: MarqueeSize;
  /** Default scroll direction */
  direction?: MarqueeDirection;
  /** Default scroll speed */
  speed?: MarqueeSpeed;
  /** Custom speed in seconds */
  customSpeed?: number;
  /** Pause behavior */
  pauseOn?: MarqueePause;
  /** Whether to show gradient fade edges */
  showFadeEdges?: boolean;
  /** Fade edge width */
  fadeWidth?: number;
  /** Whether to duplicate items for seamless loop */
  duplicate?: boolean;
  /** Whether to show integration names */
  showNames?: boolean;
  /** Whether to show integration descriptions on hover */
  showDescriptions?: boolean;
  /** Whether to show featured badge */
  showFeatured?: boolean;
  /** Whether to show new badge */
  showNew?: boolean;
  /** Whether to show category filter */
  showFilter?: boolean;
  /** Category filter callback */
  onFilterChange?: (category: IntegrationCategory | 'all') => void;
  /** Callback when integration is clicked */
  onIntegrationClick?: (integration: IntegrationItem) => void;
  /** Whether to show section header */
  showHeader?: boolean;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Section badge */
  badge?: string;
  /** Whether to add grid background */
  showGridBackground?: boolean;
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
  MarqueeSize,
  {
    logo: string;
    name: string;
    padding: string;
    gap: string;
    badge: string;
    rowGap: string;
  }
> = {
  sm: {
    logo: 'h-6 md:h-8',
    name: 'text-xs',
    padding: 'px-4 py-2',
    gap: 'gap-6 md:gap-8',
    badge: 'text-[8px]',
    rowGap: 'gap-4',
  },
  md: {
    logo: 'h-8 md:h-10',
    name: 'text-sm',
    padding: 'px-6 py-3',
    gap: 'gap-8 md:gap-12',
    badge: 'text-[10px]',
    rowGap: 'gap-6',
  },
  lg: {
    logo: 'h-10 md:h-12',
    name: 'text-base',
    padding: 'px-8 py-4',
    gap: 'gap-10 md:gap-16',
    badge: 'text-xs',
    rowGap: 'gap-8',
  },
};

const VARIANT_CONFIG: Record<
  MarqueeVariant,
  {
    item: string;
    itemHover: string;
    logoOpacity: string;
    logoHover: string;
    nameColor: string;
    border: string;
  }
> = {
  default: {
    item: '',
    itemHover: '',
    logoOpacity: 'opacity-60 grayscale',
    logoHover: 'hover:opacity-100 hover:grayscale-0',
    nameColor: 'text-text-muted',
    border: '',
  },
  card: {
    item: 'bg-white dark:bg-brand-surface rounded-xl border border-brand-border shadow-sm',
    itemHover: 'hover:shadow-md hover:border-brand-primary/20 hover:-translate-y-0.5',
    logoOpacity: 'opacity-80',
    logoHover: 'hover:opacity-100',
    nameColor: 'text-text-secondary',
    border: 'border-brand-border',
  },
  minimal: {
    item: '',
    itemHover: '',
    logoOpacity: 'opacity-40',
    logoHover: 'hover:opacity-80',
    nameColor: 'text-text-muted',
    border: '',
  },
  bordered: {
    item: 'border border-brand-border/30 rounded-xl',
    itemHover: 'hover:border-brand-primary/30 hover:bg-brand-primary/[0.02]',
    logoOpacity: 'opacity-60',
    logoHover: 'hover:opacity-100',
    nameColor: 'text-text-muted',
    border: 'border-brand-border/30',
  },
  glass: {
    item: 'bg-white/5 backdrop-blur-sm rounded-xl border border-white/10',
    itemHover: 'hover:bg-white/10 hover:border-white/20',
    logoOpacity: 'opacity-70',
    logoHover: 'hover:opacity-100',
    nameColor: 'text-white/60',
    border: 'border-white/10',
  },
};

const SPEED_CONFIG: Record<MarqueeSpeed, number> = {
  slow: 40,
  normal: 25,
  fast: 12,
  custom: 25,
};

const CATEGORY_CONFIG: Record<IntegrationCategory | 'all', { label: string; color: string }> = {
  all: { label: 'All', color: '#6B7280' },
  communication: { label: 'Communication', color: '#3B82F6' },
  calendar: { label: 'Calendar', color: '#8B5CF6' },
  storage: { label: 'Storage', color: '#10B981' },
  social: { label: 'Social Media', color: '#EC4899' },
  tasks: { label: 'Tasks', color: '#F59E0B' },
  payments: { label: 'Payments', color: '#06B6D4' },
  analytics: { label: 'Analytics', color: '#6366F1' },
  development: { label: 'Development', color: '#14B8A6' },
  design: { label: 'Design', color: '#F97316' },
  ecommerce: { label: 'E-Commerce', color: '#EF4444' },
  crm: { label: 'CRM', color: '#3B82F6' },
  automation: { label: 'Automation', color: '#F59E0B' },
  ai: { label: 'AI & ML', color: '#7C3AED' },
  security: { label: 'Security', color: '#22C55E' },
  other: { label: 'Other', color: '#6B7280' },
};

// ============================================
// 3. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes marquee-scroll-left {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  @keyframes marquee-scroll-right {
    0% {
      transform: translateX(-50%);
    }
    100% {
      transform: translateX(0);
    }
  }

  @keyframes marquee-scroll-up {
    0% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(-50%);
    }
  }

  @keyframes marquee-scroll-down {
    0% {
      transform: translateY(-50%);
    }
    100% {
      transform: translateY(0);
    }
  }

  @keyframes marquee-fade-in {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes marquee-pulse-new {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes marquee-glow-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
    }
    50% {
      box-shadow: 0 0 40px rgba(59, 130, 246, 0.2);
    }
  }
`;

// ============================================
// 4. SUB-COMPONENT: Category Filter
// ============================================

interface CategoryFilterProps {
  categories: (IntegrationCategory | 'all')[];
  activeCategory: IntegrationCategory | 'all';
  onSelect: (category: IntegrationCategory | 'all') => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onSelect,
}) => (
  <div className="flex justify-center mb-8">
    <div className="inline-flex flex-wrap gap-2 p-1.5 bg-brand-border/10 rounded-xl">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200
              whitespace-nowrap
              flex items-center gap-1.5
              ${
                isActive
                  ? 'bg-white dark:bg-brand-surface text-brand-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
              }
            `}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================
// 5. SUB-COMPONENT: Single Integration Item
// ============================================

interface IntegrationItemComponentProps {
  integration: IntegrationItem;
  variant: MarqueeVariant;
  size: MarqueeSize;
  showNames: boolean;
  showDescriptions: boolean;
  showFeatured: boolean;
  showNew: boolean;
  onClick?: (integration: IntegrationItem) => void;
  isPaused?: boolean;
}

const IntegrationItemComponent: React.FC<IntegrationItemComponentProps> = ({
  integration,
  variant,
  size,
  showNames,
  showFeatured,
  showNew,
  onClick,
}) => {
  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const [isHovered, setIsHovered] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleClick = useCallback(() => {
    if (integration.url) {
      window.open(integration.url, '_blank', 'noopener,noreferrer');
    }
    onClick?.(integration);
  }, [integration, onClick]);

  return (
    <div
      className={`
        integration-item
        flex-shrink-0
        flex items-center justify-center
        ${sizeConfig.padding}
        ${variantConfig.item}
        ${variantConfig.itemHover}
        ${sizeConfig.gap}
        transition-all duration-300
        cursor-pointer
        relative
        select-none
        group
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={integration.description || integration.name}
      role="button"
      tabIndex={0}
      aria-label={`${integration.name} integration`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Logo */}
      <div className="flex-shrink-0 flex items-center justify-center">
        {logoError || !integration.logo ? (
          <div
            className={`
              ${sizeConfig.logo}
              aspect-square
              rounded-xl
              bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20
              flex items-center justify-center
              text-white font-bold
              ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}
            `}
          >
            {integration.name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <img
            src={integration.logo}
            alt={integration.name}
            className={`
              ${sizeConfig.logo}
              w-auto
              object-contain
              ${variantConfig.logoOpacity}
              ${variantConfig.logoHover}
              transition-all duration-300
            `}
            onError={() => setLogoError(true)}
            loading="lazy"
            draggable={false}
          />
        )}
      </div>

      {/* Name Label */}
      {showNames && (
        <span className={`${sizeConfig.name} ${variantConfig.nameColor} font-medium whitespace-nowrap`}>
          {integration.name}
        </span>
      )}

      {/* Featured Badge */}
      {showFeatured && integration.featured && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-brand-primary text-white rounded-full text-[8px] font-semibold shadow-md">
          ★
        </span>
      )}

      {/* New Badge */}
      {showNew && integration.isNew && (
        <span className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-green-500 text-white rounded-full text-[8px] font-semibold shadow-md animate-pulse">
          NEW
        </span>
      )}

      {/* Coming Soon Overlay */}
      {integration.comingSoon && (
        <div className="absolute inset-0 bg-brand-surface/80 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
          <span className="px-2 py-1 bg-brand-border/50 text-text-muted rounded-full text-[10px] font-medium">
            Coming Soon
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================
// 6. SUB-COMPONENT: Marquee Row
// ============================================

interface MarqueeRowProps {
  row: IntegrationRow;
  variant: MarqueeVariant;
  size: MarqueeSize;
  defaultSpeed: number;
  showNames: boolean;
  showDescriptions: boolean;
  showFeatured: boolean;
  showNew: boolean;
  duplicate: boolean;
  pauseOn: MarqueePause;
  onIntegrationClick?: (integration: IntegrationItem) => void;
}

const MarqueeRow: React.FC<MarqueeRowProps> = ({
  row,
  variant,
  size,
  defaultSpeed,
  showNames,
  showFeatured,
  showNew,
  duplicate,
  pauseOn,
  onIntegrationClick,
}) => {
  const [isPaused, setIsPaused] = useState(pauseOn === 'always');
  const speed = row.customSpeed || SPEED_CONFIG[row.speed || 'normal'] || defaultSpeed;
  const direction = row.direction || 'left';
  const items = duplicate ? [...row.items, ...row.items] : row.items;

  const animationName = useMemo(() => {
    switch (direction) {
      case 'left': return 'marquee-scroll-left';
      case 'right': return 'marquee-scroll-right';
      case 'up': return 'marquee-scroll-up';
      case 'down': return 'marquee-scroll-down';
      default: return 'marquee-scroll-left';
    }
  }, [direction]);

  const isHorizontal = direction === 'left' || direction === 'right';

  return (
    <div
      className={`
        marquee-row
        relative
        overflow-hidden
        ${isHorizontal ? 'w-full' : 'h-full'}
      `}
      onMouseEnter={() => {
        if (pauseOn === 'hover' || pauseOn === 'hover-row') {
          setIsPaused(true);
        }
      }}
      onMouseLeave={() => {
        if (pauseOn !== 'always') {
          setIsPaused(false);
        }
      }}
    >
      <div
        className={`
          flex
          ${isHorizontal ? 'flex-row' : 'flex-col'}
          ${isPaused ? '' : 'animate-marquee'}
        `}
        style={{
          animation: isPaused
            ? 'none'
            : `${animationName} ${speed}s linear infinite`,
          width: isHorizontal ? 'max-content' : '100%',
          height: isHorizontal ? '100%' : 'max-content',
        }}
      >
        {items.map((integration, index) => (
          <IntegrationItemComponent
            key={`${integration.id}-${index}`}
            integration={integration}
            variant={variant}
            size={size}
            showNames={showNames}
            showDescriptions={false}
            showFeatured={showFeatured}
            showNew={showNew}
            onClick={onIntegrationClick}
            isPaused={isPaused}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const IntegrationsMarquee: React.FC<IntegrationsMarqueeProps> = ({
  rows: customRows,
  integrations,
  rowsCount = 3,
  variant = 'default',
  size = 'md',
  direction = 'left',
  speed = 'normal',
  customSpeed,
  pauseOn = 'hover',
  showFadeEdges = true,
  fadeWidth = 100,
  duplicate = true,
  showNames = false,
  showDescriptions = false,
  showFeatured = false,
  showNew = false,
  showFilter = false,
  onFilterChange,
  onIntegrationClick,
  showHeader = true,
  title,
  subtitle,
  badge,
  showGridBackground = false,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'integrations-marquee',
}) => {
  // ============================================
  // State
  // ============================================

  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'all'>('all');
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);

  // Refs
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const effectiveSpeed = customSpeed || SPEED_CONFIG[speed];

  // Auto-generate rows from flat integrations array
  const rows = useMemo(() => {
    if (customRows && customRows.length > 0) {
      return activeCategory === 'all'
        ? customRows
        : customRows.map((row) => ({
            ...row,
            items: row.items.filter((item) => !item.category || item.category === activeCategory),
          }));
    }

    if (!integrations || integrations.length === 0) return [];

    const filteredIntegrations =
      activeCategory === 'all'
        ? integrations
        : integrations.filter((item) => !item.category || item.category === activeCategory);

    // Shuffle and distribute into rows
    const shuffled = [...filteredIntegrations].sort(() => Math.random() - 0.5);
    const itemsPerRow = Math.ceil(shuffled.length / rowsCount);
    const generatedRows: IntegrationRow[] = [];

    for (let i = 0; i < rowsCount; i++) {
      const start = i * itemsPerRow;
      const end = start + itemsPerRow;
      const rowItems = shuffled.slice(start, end);

      if (rowItems.length > 0) {
        generatedRows.push({
          id: `row-${i}`,
          items: rowItems,
          direction: i % 2 === 0 ? direction : (direction === 'left' ? 'right' : 'left'),
          speed: i % 2 === 0 ? speed : (speed === 'slow' ? 'normal' : speed === 'normal' ? 'slow' : 'normal'),
        });
      }
    }

    return generatedRows;
  }, [customRows, integrations, rowsCount, direction, speed, activeCategory]);

  // Categories
  const categories = useMemo(() => {
    if (!showFilter || !integrations) return [];

    const cats = new Set<IntegrationCategory>();
    integrations.forEach((item) => {
      if (item.category) cats.add(item.category);
    });

    return ['all', ...Array.from(cats)] as (IntegrationCategory | 'all')[];
  }, [integrations, showFilter]);

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

    const styleId = 'integrations-marquee-animations';
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
  // Handlers
  // ============================================

  const handleCategorySelect = useCallback(
    (category: IntegrationCategory | 'all') => {
      setActiveCategory(category);
      onFilterChange?.(category);
    },
    [onFilterChange]
  );

  // ============================================
  // 8. RENDER
  // ============================================

  if (shouldReduceMotion) {
    // Static grid fallback for reduced motion
    return (
      <div
        id={id}
        className={`integrations-marquee ${className}`}
        style={style}
      >
        {showHeader && (title || subtitle || badge) && (
          <div className="text-center mb-8">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-4">
                {badge}
              </span>
            )}
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">{title}</h2>
            )}
            {subtitle && (
              <p className="text-lg text-text-muted max-w-2xl mx-auto">{subtitle}</p>
            )}
          </div>
        )}

        <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 ${sizeConfig.rowGap}`}>
          {integrations?.map((integration) => (
            <IntegrationItemComponent
              key={integration.id}
              integration={integration}
              variant={variant}
              size={size}
              showNames={showNames}
              showDescriptions={showDescriptions}
              showFeatured={showFeatured}
              showNew={showNew}
              onClick={onIntegrationClick}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`integrations-marquee ${className}`}
      style={style}
    >
      {/* Section Header */}
      {showHeader && (title || subtitle || badge) && (
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

      {/* Category Filter */}
      {showFilter && categories.length > 1 && (
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Marquee Rows */}
      <div
        className={`
          relative
          ${showGridBackground ? 'bg-grid-pattern' : ''}
        `}
      >
        <div className={`flex flex-col ${sizeConfig.rowGap}`}>
          {rows.map((row) => (
            <MarqueeRow
              key={row.id}
              row={row}
              variant={variant}
              size={size}
              defaultSpeed={effectiveSpeed}
              showNames={showNames}
              showDescriptions={showDescriptions}
              showFeatured={showFeatured}
              showNew={showNew}
              duplicate={duplicate}
              pauseOn={pauseOn}
              onIntegrationClick={onIntegrationClick}
            />
          ))}
        </div>

        {/* Fade Edges */}
        {showFadeEdges && (
          <>
            {/* Left fade */}
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none z-10"
              style={{
                width: `${fadeWidth}px`,
                background: 'linear-gradient(to right, var(--tw-bg-opacity, 1) rgb(11, 15, 26), transparent)',
              }}
              aria-hidden="true"
            />
            {/* Right fade */}
            <div
              className="absolute right-0 top-0 bottom-0 pointer-events-none z-10"
              style={{
                width: `${fadeWidth}px`,
                background: 'linear-gradient(to left, var(--tw-bg-opacity, 1) rgb(11, 15, 26), transparent)',
              }}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* Bottom info */}
      <div className="text-center mt-8">
        <p className="text-sm text-text-muted">
          {integrations?.length || 0}+ integrations available
          <span className="mx-2">•</span>
          <a href="/integrations" className="text-brand-primary hover:text-brand-primary/80 transition-colors font-medium">
            View all integrations
            <svg className="w-3 h-3 inline ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </p>
      </div>
    </div>
  );
};

// ============================================
// 9. INTEGRATIONS SECTION WRAPPER
// ============================================

interface IntegrationsSectionProps extends IntegrationsMarqueeProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({
  sectionId = 'integrations',
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
      className={`py-16 md:py-24 ${bgConfig[background]} overflow-hidden`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <IntegrationsMarquee {...props} />
      </div>
    </section>
  );
};

// ============================================
// 10. LOGO CLOUD COMPONENT (Static variant)
// ============================================

interface LogoCloudProps {
  logos: IntegrationItem[];
  variant?: MarqueeVariant;
  size?: MarqueeSize;
  columns?: 4 | 5 | 6 | 8;
  className?: string;
}

export const LogoCloud: React.FC<LogoCloudProps> = ({
  logos,
  variant = 'default',
  size = 'md',
  columns = 6,
  className = '',
}) => {
  const gridCols: Record<number, string> = {
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
    8: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
  };

  const sizeConfig = SIZE_CONFIG[size];
  const variantConfig = VARIANT_CONFIG[variant];

  return (
    <div className={`grid ${gridCols[columns]} ${sizeConfig.rowGap} ${className}`}>
      {logos.map((logo) => (
        <IntegrationItemComponent
          key={logo.id}
          integration={logo}
          variant={variant}
          size={size}
          showNames
          showDescriptions={false}
          showFeatured={false}
          showNew={false}
        />
      ))}
    </div>
  );
};

// ============================================
// 11. DISPLAY NAMES
// ============================================

IntegrationsMarquee.displayName = 'IntegrationsMarquee';
IntegrationsSection.displayName = 'IntegrationsSection';
LogoCloud.displayName = 'LogoCloud';
IntegrationItemComponent.displayName = 'IntegrationItem';
MarqueeRow.displayName = 'MarqueeRow';
CategoryFilter.displayName = 'CategoryFilter';

// ============================================
// 12. NAMED EXPORTS
// ============================================

export {
  IntegrationItemComponent,
  MarqueeRow,
  CategoryFilter,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  SPEED_CONFIG,
  CATEGORY_CONFIG,
  ANIMATION_STYLES,
};

// ============================================
// 13. TYPE EXPORTS
// ============================================

export type {
  MarqueeDirection,
  MarqueeVariant,
  MarqueeSize,
  MarqueeSpeed,
  MarqueePause,
  IntegrationCategory,
  IntegrationItem,
  IntegrationRow,
  IntegrationsMarqueeProps,
  IntegrationsSectionProps,
  LogoCloudProps,
  CategoryFilterProps,
  IntegrationItemComponentProps,
  MarqueeRowProps,
};

// ============================================
// 14. DEFAULT EXPORT
// ============================================

export default IntegrationsMarquee;
