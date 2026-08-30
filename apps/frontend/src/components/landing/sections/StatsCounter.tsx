// ============================================
// apps/frontend/src/components/landing/sections/StatsCounter.tsx
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

type StatVariant = 'default' | 'card' | 'minimal' | 'bordered' | 'gradient' | 'glass';

type StatSize = 'sm' | 'md' | 'lg' | 'xl';

type StatLayout = 'grid' | 'row' | 'masonry';

type CounterAnimation = 'count-up' | 'spring' | 'typewriter' | 'none';

type CounterEasing = 'linear' | 'ease-out' | 'ease-in-out' | 'bounce-out';

type NumberFormat = 'number' | 'currency' | 'percentage' | 'compact' | 'duration' | 'custom';

type StatAlignment = 'left' | 'center' | 'right';

type StatTrend = 'up' | 'down' | 'stable' | 'none';

interface StatItem {
  /** Unique stat ID */
  id: string;
  /** Stat label */
  label: string;
  /** Target numeric value */
  value: number;
  /** Starting value (for animation) */
  startValue?: number;
  /** Prefix before the number */
  prefix?: string;
  /** Suffix after the number */
  suffix?: string;
  /** Number format */
  format?: NumberFormat;
  /** Custom format function */
  formatFn?: (value: number) => string;
  /** Description / sub-label */
  description?: string;
  /** Icon component */
  icon?: ReactNode;
  /** Trend indicator */
  trend?: StatTrend;
  /** Percentage change */
  changePercent?: number;
  /** Change label */
  changeLabel?: string;
  /** Whether this stat is highlighted */
  highlight?: boolean;
  /** Custom color for accent */
  color?: string;
  /** Custom gradient for background */
  gradient?: string;
  /** Whether to show a progress bar */
  showProgress?: boolean;
  /** Progress bar max value */
  progressMax?: number;
  /** Whether to show a sparkline chart */
  showSparkline?: boolean;
  /** Sparkline data points */
  sparklineData?: number[];
  /** Sparkline color */
  sparklineColor?: string;
  /** Tooltip text on hover */
  tooltip?: string;
  /** Whether this stat is new */
  isNew?: boolean;
  /** Badge text */
  badge?: string;
}

interface StatsCounterProps {
  /** Array of stat items */
  stats: StatItem[];
  /** Visual variant */
  variant?: StatVariant;
  /** Size preset */
  size?: StatSize;
  /** Layout style */
  layout?: StatLayout;
  /** Number of columns (for grid layout) */
  columns?: 2 | 3 | 4 | 5 | 6;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Text alignment */
  align?: StatAlignment;
  /** Counter animation style */
  animation?: CounterAnimation;
  /** Animation duration in ms */
  duration?: number;
  /** Animation delay in ms */
  delay?: number;
  /** Easing function */
  easing?: CounterEasing;
  /** Whether to animate only when in viewport */
  animateOnView?: boolean;
  /** Intersection observer threshold */
  threshold?: number;
  /** Whether animation plays only once */
  once?: boolean;
  /** Whether to stagger animation between items */
  stagger?: boolean;
  /** Stagger delay between items in ms */
  staggerDelay?: number;
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
  /** Callback when all counters complete */
  onComplete?: () => void;
  /** HTML section ID */
  sectionId?: string;
}

// ============================================
// 2. SIZE & VARIANT PRESETS
// ============================================

const SIZE_CONFIG: Record<
  StatSize,
  {
    value: string;
    label: string;
    description: string;
    icon: string;
    iconBg: string;
    padding: string;
    gap: string;
    badge: string;
    sparkline: { width: number; height: number };
  }
> = {
  sm: {
    value: 'text-2xl md:text-3xl',
    label: 'text-xs',
    description: 'text-xs',
    icon: 'w-5 h-5',
    iconBg: 'w-8 h-8',
    padding: 'p-4',
    gap: 'gap-3',
    badge: 'text-[10px]',
    sparkline: { width: 80, height: 24 },
  },
  md: {
    value: 'text-3xl md:text-4xl',
    label: 'text-sm',
    description: 'text-xs',
    icon: 'w-6 h-6',
    iconBg: 'w-10 h-10',
    padding: 'p-5',
    gap: 'gap-4',
    badge: 'text-xs',
    sparkline: { width: 100, height: 32 },
  },
  lg: {
    value: 'text-4xl md:text-5xl',
    label: 'text-base',
    description: 'text-sm',
    icon: 'w-7 h-7',
    iconBg: 'w-12 h-12',
    padding: 'p-6',
    gap: 'gap-5',
    badge: 'text-xs',
    sparkline: { width: 120, height: 40 },
  },
  xl: {
    value: 'text-5xl md:text-6xl',
    label: 'text-lg',
    description: 'text-sm',
    icon: 'w-8 h-8',
    iconBg: 'w-14 h-14',
    padding: 'p-8',
    gap: 'gap-6',
    badge: 'text-sm',
    sparkline: { width: 140, height: 48 },
  },
};

const VARIANT_CONFIG: Record<
  StatVariant,
  {
    container: string;
    item: string;
    itemHighlighted: string;
    itemHover: string;
    valueColor: string;
    labelColor: string;
    descriptionColor: string;
    border: string;
    shadow: string;
  }
> = {
  default: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border',
    itemHighlighted: 'ring-2 ring-brand-primary/30 border-brand-primary/30',
    itemHover: 'hover:shadow-lg hover:border-brand-primary/20 hover:-translate-y-0.5',
    valueColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-sm',
  },
  card: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border shadow-md',
    itemHighlighted: 'ring-2 ring-brand-primary/30 border-brand-primary/30 shadow-xl',
    itemHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    valueColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-md',
  },
  minimal: {
    container: '',
    item: 'bg-transparent border-0',
    itemHighlighted: 'bg-brand-primary/[0.02]',
    itemHover: 'hover:bg-brand-primary/[0.03]',
    valueColor: 'text-text-primary',
    labelColor: 'text-text-muted',
    descriptionColor: 'text-text-muted/70',
    border: 'border-transparent',
    shadow: 'shadow-none',
  },
  bordered: {
    container: '',
    item: 'bg-transparent border-2 border-brand-border rounded-2xl',
    itemHighlighted: 'border-brand-primary/50 bg-brand-primary/[0.02]',
    itemHover: 'hover:border-brand-primary/30 hover:bg-brand-primary/[0.01]',
    valueColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-none',
  },
  gradient: {
    container: '',
    item: 'bg-gradient-to-br from-brand-surface to-brand-dark rounded-2xl border border-brand-border',
    itemHighlighted: 'from-brand-primary/[0.05] to-brand-secondary/[0.05] border-brand-primary/30',
    itemHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    valueColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-lg',
  },
  glass: {
    container: '',
    item: 'bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10',
    itemHighlighted: 'bg-white/10 border-white/20',
    itemHover: 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg',
    valueColor: 'text-white',
    labelColor: 'text-white/70',
    descriptionColor: 'text-white/50',
    border: 'border-white/10',
    shadow: 'shadow-lg',
  },
};

const LAYOUT_GRID: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

const GAP_CONFIG: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const TREND_CONFIG: Record<
  StatTrend,
  { icon: ReactNode; color: string; bg: string; label: string }
> = {
  up: {
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Increase',
  },
  down: {
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
        <polyline points="17 18 23 18 23 12" />
      </svg>
    ),
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Decrease',
  },
  stable: {
    icon: (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    label: 'Stable',
  },
  none: {
    icon: null,
    color: '',
    bg: '',
    label: '',
  },
};

// ============================================
// 3. EASING FUNCTIONS
// ============================================

const EASING_FUNCTIONS: Record<CounterEasing, (t: number) => number> = {
  linear: (t: number) => t,
  'ease-out': (t: number) => 1 - Math.pow(1 - t, 3),
  'ease-in-out': (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'bounce-out': (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ============================================
// 4. FORMAT HELPERS
// ============================================

function formatNumber(
  value: number,
  format: NumberFormat = 'number',
  decimals: number = 0,
  decimalSeparator: string = '.',
  thousandSeparator: string = ',',
  formatFn?: (value: number) => string
): string {
  if (formatFn) return formatFn(value);

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 0,
      }).format(value);

    case 'percentage':
      return `${value.toFixed(decimals || 1)}%`;

    case 'compact':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: decimals || 0,
        maximumFractionDigits: decimals || 2,
      }).format(value);

    case 'duration': {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = Math.floor(value % 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    }

    case 'number':
    default:
      const [intPart, decPart] = value.toFixed(decimals || 0).split('.');
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
      return decPart ? `${formattedInt}${decimalSeparator}${decPart}` : formattedInt;
  }
}

// ============================================
// 5. SUB-COMPONENT: Sparkline
// ============================================

interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  color?: string;
  isAnimating: boolean;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width,
  height,
  color = '#3B82F6',
  isAnimating,
}) => {
  if (!data || data.length < 2) return null;

  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sparkline-grad-${data.length}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={`${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
        fill={`url(#sparkline-grad-${data.length})`}
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isAnimating ? 'none' : `${width * 2}`}
        strokeDashoffset={isAnimating ? 0 : width * 2}
        style={{
          transition: 'stroke-dashoffset 1.5s ease-out',
        }}
      />
    </svg>
  );
};

// ============================================
// 6. SUB-COMPONENT: Progress Bar
// ============================================

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  isAnimating: boolean;
  size: StatSize;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color = '#3B82F6',
  isAnimating,
}) => {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>{Math.round(percentage)}%</span>
        <span>{max.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-brand-border/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: isAnimating ? `${percentage}%` : '0%',
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const StatsCounter: React.FC<StatsCounterProps> = ({
  stats,
  variant = 'default',
  size = 'md',
  layout = 'grid',
  columns = 4,
  gap = 'md',
  align = 'center',
  animation = 'count-up',
  duration = 2000,
  delay = 0,
  easing = 'ease-out',
  animateOnView = true,
  threshold = 0.3,
  once = true,
  stagger = true,
  staggerDelay = 150,
  showHeader = true,
  title,
  subtitle,
  badge,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'stats-counter',
  onComplete,
  sectionId,
}) => {
  // ============================================
  // State
  // ============================================

  const [isInView, setIsInView] = useState(!animateOnView);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [animatedValues, setAnimatedValues] = useState<number[]>(
    stats.map((s) => s.startValue ?? 0)
  );
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];
  const easingFn = EASING_FUNCTIONS[easing];
  const alignClass = align === 'center' ? 'text-center items-center' : align === 'right' ? 'text-right items-end' : 'text-left items-start';

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
  // Effects: Intersection Observer
  // ============================================

  useEffect(() => {
    if (!animateOnView || !containerRef.current) return;

    const element = containerRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
          setAnimatedValues(stats.map((s) => s.startValue ?? 0));
          setHasCompleted(false);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateOnView, threshold, once, stats]);

  // ============================================
  // Effects: Count Animation
  // ============================================

  useEffect(() => {
    if (!isInView || hasCompleted || shouldReduceMotion) {
      if (shouldReduceMotion) {
        setAnimatedValues(stats.map((s) => s.value));
        setHasCompleted(true);
        onComplete?.();
      }
      return;
    }

    setIsAnimating(true);
    startTimeRef.current = null;

    const startValues = stats.map((s) => s.startValue ?? 0);
    const endValues = stats.map((s) => s.value);
    const decimals = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;

      // Calculate progress for each stat with stagger
      const newValues = stats.map((_, index) => {
        const itemDelay = stagger ? index * staggerDelay : delay;
        const itemDuration = duration;
        const itemElapsed = Math.max(0, elapsed - itemDelay);
        const progress = Math.min(1, itemElapsed / itemDuration);

        if (progress <= 0) return startValues[index];

        const easedProgress = easingFn(progress);
        const startVal = startValues[index];
        const endVal = endValues[index];

        return Math.round(
          (startVal + (endVal - startVal) * easedProgress) * Math.pow(10, decimals)
        ) / Math.pow(10, decimals);
      });

      setAnimatedValues(newValues);

      // Check if all animations are complete
      const allComplete = stats.every((_, index) => {
        const itemDelay = stagger ? index * staggerDelay : delay;
        return elapsed - itemDelay >= duration;
      });

      if (allComplete) {
        setAnimatedValues(endValues);
        setIsAnimating(false);
        setHasCompleted(true);
        onComplete?.();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Initial delay
    const startDelay = delay;
    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, startDelay);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInView, hasCompleted, shouldReduceMotion, stats, duration, delay, stagger, staggerDelay, easingFn, onComplete]);

  // ============================================
  // Render: Single Stat Item
  // ============================================

  const renderStatItem = useCallback(
    (stat: StatItem, index: number) => {
      const currentValue = animatedValues[index] ?? stat.startValue ?? 0;
      const trendConfig = stat.trend && stat.trend !== 'none' ? TREND_CONFIG[stat.trend] : null;
      const color = stat.color || '#3B82F6';
      const formattedValue = formatNumber(
        currentValue,
        stat.format || 'number',
        0,
        '.',
        ',',
        stat.formatFn
      );

      return (
        <div
          key={stat.id}
          id={`stat-${stat.id}`}
          className={`
            stat-item
            ${variantConfig.item}
            ${variantConfig.itemHover}
            ${stat.highlight ? variantConfig.itemHighlighted : ''}
            ${sizeConfig.padding}
            transition-all duration-300
            flex flex-col
            ${sizeConfig.gap}
            ${alignClass}
            relative
            overflow-hidden
          `}
          title={stat.tooltip}
        >
          {/* Icon */}
          {stat.icon && (
            <div
              className={`
                ${sizeConfig.iconBg}
                rounded-xl
                flex items-center justify-center
                flex-shrink-0
                transition-transform duration-300
                ${align === 'center' ? 'mx-auto' : ''}
              `}
              style={{
                background: stat.gradient
                  ? `linear-gradient(135deg, ${stat.gradient})`
                  : `linear-gradient(135deg, ${color}20, ${color}10)`,
                color: color,
              }}
            >
              <div className={sizeConfig.icon}>{stat.icon}</div>
            </div>
          )}

          {/* Badge */}
          {stat.badge && (
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded-full
                ${sizeConfig.badge}
                font-medium
                bg-brand-primary/10 text-brand-primary
                ${align === 'center' ? 'mx-auto' : ''}
              `}
            >
              {stat.badge}
            </span>
          )}

          {/* Value + Trend */}
          <div className={`flex items-end ${sizeConfig.gap} ${align === 'center' ? 'justify-center' : ''}`}>
            <span
              className={`
                ${sizeConfig.value}
                font-extrabold
                ${variantConfig.valueColor}
                tracking-tight
                tabular-nums
                transition-all duration-300
              `}
              style={{
                background: stat.gradient
                  ? `linear-gradient(135deg, ${stat.gradient})`
                  : undefined,
                WebkitBackgroundClip: stat.gradient ? 'text' : undefined,
                WebkitTextFillColor: stat.gradient ? 'transparent' : undefined,
              }}
            >
              {stat.prefix}
              {formattedValue}
              {stat.suffix}
            </span>

            {/* Trend Indicator */}
            {trendConfig && (
              <span
                className={`
                  inline-flex items-center gap-0.5
                  px-1.5 py-0.5 rounded-full
                  text-xs font-medium
                  ${trendConfig.bg}
                  ${trendConfig.color}
                  mb-1
                `}
              >
                {trendConfig.icon}
                {stat.changePercent !== undefined && (
                  <span>
                    {stat.trend === 'up' ? '+' : ''}
                    {stat.changePercent}%
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Label */}
          <h4
            className={`
              ${sizeConfig.label}
              font-medium
              ${variantConfig.labelColor}
            `}
          >
            {stat.label}
          </h4>

          {/* Description */}
          {stat.description && (
            <p
              className={`
                ${sizeConfig.description}
                ${variantConfig.descriptionColor}
              `}
            >
              {stat.description}
            </p>
          )}

          {/* Progress Bar */}
          {stat.showProgress && stat.progressMax && (
            <ProgressBar
              value={currentValue}
              max={stat.progressMax}
              color={color}
              isAnimating={isAnimating || hasCompleted}
              size={size}
            />
          )}

          {/* Sparkline */}
          {stat.showSparkline && stat.sparklineData && stat.sparklineData.length > 1 && (
            <div className={align === 'center' ? 'mx-auto' : ''}>
              <Sparkline
                data={stat.sparklineData}
                width={sizeConfig.sparkline.width}
                height={sizeConfig.sparkline.height}
                color={stat.sparklineColor || color}
                isAnimating={isAnimating || hasCompleted}
              />
            </div>
          )}

          {/* New Badge */}
          {stat.isNew && (
            <div
              className={`
                absolute top-3 right-3
                px-2 py-0.5 rounded-full
                text-[10px] font-semibold
                bg-green-500 text-white
                animate-pulse
              `}
            >
              NEW
            </div>
          )}

          {/* Highlight Glow */}
          {stat.highlight && variant === 'glass' && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${color}15, transparent 50%)`,
              }}
              aria-hidden="true"
            />
          )}

          {/* Change Label */}
          {stat.changeLabel && (
            <p className="text-xs text-text-muted">{stat.changeLabel}</p>
          )}
        </div>
      );
    },
    [animatedValues, variantConfig, sizeConfig, align, alignClass, isAnimating, hasCompleted, size]
  );

  // ============================================
  // 8. RENDER
  // ============================================

  return (
    <section id={sectionId}>
      <div
        ref={containerRef}
        id={id}
        className={`
          stats-counter
          ${className}
        `.trim()}
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

        {/* Stats Grid */}
        {layout === 'grid' && (
          <div
            className={`
              grid
              ${LAYOUT_GRID[columns]}
              ${GAP_CONFIG[gap]}
            `}
          >
            {stats.map((stat, index) => renderStatItem(stat, index))}
          </div>
        )}

        {/* Stats Row */}
        {layout === 'row' && (
          <div
            className={`
              flex flex-wrap justify-center
              ${GAP_CONFIG[gap]}
            `}
          >
            {stats.map((stat, index) => (
              <div key={stat.id} className="flex-1 min-w-[200px]">
                {renderStatItem(stat, index)}
              </div>
            ))}
          </div>
        )}

        {/* Stats Masonry */}
        {layout === 'masonry' && (
          <div
            className={`
              columns-1 sm:columns-2 lg:columns-${Math.min(columns, 4)}
              ${GAP_CONFIG[gap]}
            `}
          >
            {stats.map((stat, index) => (
              <div key={stat.id} className="break-inside-avoid mb-4">
                {renderStatItem(stat, index)}
              </div>
            ))}
          </div>
        )}

        {/* Live Indicator */}
        {isAnimating && (
          <div className="flex justify-center mt-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
              Live data
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

// ============================================
// 9. STATS SECTION WRAPPER
// ============================================

interface StatsSectionProps extends StatsCounterProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  sectionId = 'stats',
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
        <StatsCounter {...props} />
      </div>
    </section>
  );
};

// ============================================
// 10. INLINE STATS COMPONENT
// ============================================

interface InlineStatsProps {
  stats: Array<{
    value: string;
    label: string;
    icon?: ReactNode;
    color?: string;
  }>;
  className?: string;
  divider?: boolean;
}

export const InlineStats: React.FC<InlineStatsProps> = ({
  stats,
  className = '',
  divider = true,
}) => (
  <div className={`flex flex-wrap items-center justify-center gap-6 md:gap-8 ${className}`}>
    {stats.map((stat, index) => (
      <React.Fragment key={index}>
        <div className="flex items-center gap-3">
          {stat.icon && (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: stat.color ? `${stat.color}20` : undefined, color: stat.color }}
            >
              {stat.icon}
            </div>
          )}
          <div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        </div>
        {divider && index < stats.length - 1 && (
          <div className="hidden md:block w-px h-12 bg-brand-border/50" aria-hidden="true" />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ============================================
// 11. DISPLAY NAMES
// ============================================

StatsCounter.displayName = 'StatsCounter';
StatsSection.displayName = 'StatsSection';
InlineStats.displayName = 'InlineStats';
Sparkline.displayName = 'Sparkline';
ProgressBar.displayName = 'ProgressBar';

// ============================================
// 12. NAMED EXPORTS
// ============================================

export {
  Sparkline,
  ProgressBar,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  LAYOUT_GRID,
  GAP_CONFIG,
  TREND_CONFIG,
  EASING_FUNCTIONS,
  formatNumber,
};

// ============================================
// 13. TYPE EXPORTS
// ============================================

export type {
  StatVariant,
  StatSize,
  StatLayout,
  CounterAnimation,
  CounterEasing,
  NumberFormat,
  StatAlignment,
  StatTrend,
  StatItem,
  StatsCounterProps,
  StatsSectionProps,
  InlineStatsProps,
  SparklineProps,
  ProgressBarProps,
};

// ============================================
// 14. DEFAULT EXPORT
// ============================================

export default StatsCounter;
