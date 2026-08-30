// ============================================
// apps/frontend/src/components/landing/interactive/CounterUp.tsx
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
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Target,
  Zap,
  Users,
  DollarSign,
  Clock,
  Star,
  Shield,
  Award,
  Globe,
  Heart,
  BarChart3,
  Activity,
  CheckCircle,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type CounterVariant =
  | 'default'
  | 'gradient'
  | 'outline'
  | 'glass'
  | 'minimal'
  | 'spotlight';

type CounterSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'display';

type CounterAlignment = 'left' | 'center' | 'right';

type CounterTrend = 'up' | 'down' | 'stable';

type CounterAnimation =
  | 'count-up'
  | 'fade-in'
  | 'slide-up'
  | 'bounce'
  | 'none';

type CounterEasing =
  | 'linear'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce-out';

type NumberFormat =
  | 'number'
  | 'currency'
  | 'percentage'
  | 'compact'
  | 'duration'
  | 'custom';

interface CounterUpProps {
  /** Target numeric value */
  end: number;
  /** Starting numeric value */
  start?: number;
  /** Duration of the counting animation in ms */
  duration?: number;
  /** Delay before counting starts in ms */
  delay?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Decimal separator */
  decimalSeparator?: string;
  /** Thousands separator */
  thousandSeparator?: string;
  /** Prefix before the number */
  prefix?: string;
  /** Suffix after the number */
  suffix?: string;
  /** Number format */
  format?: NumberFormat;
  /** Custom format function */
  formatFn?: (value: number) => string;
  /** Visual variant */
  variant?: CounterVariant;
  /** Size preset */
  size?: CounterSize;
  /** Text alignment */
  align?: CounterAlignment;
  /** Animation style */
  animation?: CounterAnimation;
  /** Easing function for counting */
  easing?: CounterEasing;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Trend direction */
  trend?: CounterTrend;
  /** Previous value for comparison */
  previousValue?: number;
  /** Show percentage change */
  showPercentage?: boolean;
  /** Custom trend icon */
  trendIcon?: ReactNode;
  /** Custom trend label */
  trendLabel?: string;
  /** Icon displayed above/beside the counter */
  icon?: ReactNode;
  /** Position of the icon */
  iconPosition?: 'top' | 'left' | 'right';
  /** Label displayed below the number */
  label?: string;
  /** Sub-label / description */
  description?: string;
  /** Whether to show a progress bar */
  showProgress?: boolean;
  /** Progress bar value (0-100) */
  progress?: number;
  /** Progress bar max value */
  progressMax?: number;
  /** Whether to show a sparkline */
  showSparkline?: boolean;
  /** Sparkline data points */
  sparklineData?: number[];
  /** Sparkline color */
  sparklineColor?: string;
  /** Whether to enable gradient text */
  gradientText?: boolean;
  /** Gradient text colors */
  gradientColors?: string[];
  /** Whether to show a decorative background */
  decorative?: boolean;
  /** Whether to use monospace font */
  monospace?: boolean;
  /** Whether the counter is interactive */
  interactive?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Whether to animate only when in viewport */
  animateOnView?: boolean;
  /** Root margin for intersection observer */
  viewMargin?: string;
  /** Whether to reset and re-animate on re-entry */
  resetOnReentry?: boolean;
  /** Callback when counting completes */
  onComplete?: () => void;
  /** Callback when counting starts */
  onStart?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
  /** Enable reduced motion support */
  respectReducedMotion?: boolean;
}

interface TrendIndicatorProps {
  trend: CounterTrend;
  percentage?: number;
  icon?: ReactNode;
  label?: string;
  size: CounterSize;
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  variant: CounterVariant;
  isActive: boolean;
}

interface ProgressRingProps {
  progress: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  isAnimating: boolean;
}

// ============================================
// 2. CONSTANTS
// ============================================

const SIZE_MAP: Record<
  CounterSize,
  {
    number: string;
    label: string;
    description: string;
    icon: string;
    padding: string;
    gap: string;
    trend: string;
    prefixSuffix: string;
  }
> = {
  sm: {
    number: 'text-2xl',
    label: 'text-xs',
    description: 'text-xs',
    icon: 'w-6 h-6',
    padding: 'p-4',
    gap: 'gap-2',
    trend: 'text-xs',
    prefixSuffix: 'text-sm',
  },
  md: {
    number: 'text-3xl',
    label: 'text-sm',
    description: 'text-xs',
    icon: 'w-8 h-8',
    padding: 'p-5',
    gap: 'gap-3',
    trend: 'text-sm',
    prefixSuffix: 'text-base',
  },
  lg: {
    number: 'text-4xl',
    label: 'text-base',
    description: 'text-sm',
    icon: 'w-10 h-10',
    padding: 'p-6',
    gap: 'gap-4',
    trend: 'text-base',
    prefixSuffix: 'text-lg',
  },
  xl: {
    number: 'text-5xl',
    label: 'text-lg',
    description: 'text-sm',
    icon: 'w-12 h-12',
    padding: 'p-8',
    gap: 'gap-5',
    trend: 'text-lg',
    prefixSuffix: 'text-xl',
  },
  '2xl': {
    number: 'text-6xl',
    label: 'text-xl',
    description: 'text-base',
    icon: 'w-14 h-14',
    padding: 'p-10',
    gap: 'gap-6',
    trend: 'text-xl',
    prefixSuffix: 'text-2xl',
  },
  display: {
    number: 'text-7xl md:text-8xl',
    label: 'text-xl',
    description: 'text-base',
    icon: 'w-16 h-16',
    padding: 'p-12',
    gap: 'gap-6',
    trend: 'text-xl',
    prefixSuffix: 'text-3xl',
  },
};

const VARIANT_MAP: Record<
  CounterVariant,
  {
    background: string;
    border: string;
    shadow: string;
    numberColor: string;
    labelColor: string;
    descriptionColor: string;
    hover: string;
  }
> = {
  default: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    numberColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    hover: 'hover:shadow-md',
  },
  gradient: {
    background: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    border: 'border border-brand-border/50',
    shadow: 'shadow-lg',
    numberColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    hover: 'hover:shadow-xl hover:border-brand-primary/30',
  },
  outline: {
    background: 'bg-transparent',
    border: 'border-2 border-brand-border',
    shadow: 'shadow-none',
    numberColor: 'text-text-primary',
    labelColor: 'text-text-muted',
    descriptionColor: 'text-text-muted/70',
    hover: 'hover:border-brand-primary/50 hover:shadow-md',
  },
  glass: {
    background: 'bg-white/5 backdrop-blur-xl',
    border: 'border border-white/10',
    shadow: 'shadow-lg',
    numberColor: 'text-white',
    labelColor: 'text-white/70',
    descriptionColor: 'text-white/50',
    hover: 'hover:bg-white/10 hover:shadow-xl',
  },
  minimal: {
    background: 'bg-transparent',
    border: 'border-0',
    shadow: 'shadow-none',
    numberColor: 'text-text-primary',
    labelColor: 'text-text-muted',
    descriptionColor: 'text-text-muted/60',
    hover: '',
  },
  spotlight: {
    background: 'bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    numberColor: 'text-text-primary',
    labelColor: 'text-text-secondary',
    descriptionColor: 'text-text-muted',
    hover: 'hover:shadow-xl hover:border-brand-primary/30',
  },
};

const TREND_CONFIG: Record<
  CounterTrend,
  {
    icon: ReactNode;
    color: string;
    bg: string;
    label: string;
  }
> = {
  up: {
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'increase',
  },
  down: {
    icon: <TrendingDown className="h-4 w-4" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'decrease',
  },
  stable: {
    icon: <Minus className="h-4 w-4" />,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    label: 'no change',
  },
};

const EASING_FUNCTIONS: Record<CounterEasing, (t: number) => number> = {
  linear: (t) => t,
  'ease-out': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'bounce-out': (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ============================================
// 3. FORMAT HELPERS
// ============================================

const formatNumber = (
  value: number,
  format: NumberFormat,
  decimals: number,
  decimalSeparator: string,
  thousandSeparator: string,
  formatFn?: (value: number) => string
): string => {
  if (formatFn) return formatFn(value);

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case 'percentage':
      return `${value.toFixed(decimals)}%`;

    case 'compact':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case 'duration': {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = Math.floor(value % 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;
    }

    case 'custom':
      return value.toFixed(decimals);

    case 'number':
    default:
      const [intPart, decPart] = value.toFixed(decimals).split('.');
      const formattedInt = intPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        thousandSeparator
      );
      return decPart !== undefined
        ? `${formattedInt}${decimalSeparator}${decPart}`
        : formattedInt;
  }
};

// ============================================
// 4. SUB-COMPONENT: Trend Indicator
// ============================================

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  percentage,
  icon,
  label,
  size,
}) => {
  const config = TREND_CONFIG[trend];
  const sizeConfig = SIZE_MAP[size];

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1 rounded-full
        ${config.bg}
        ${sizeConfig.trend}
      `}
    >
      {icon || config.icon}
      <span className={`font-medium ${config.color}`}>
        {label ||
          (percentage !== undefined
            ? `${trend === 'up' ? '+' : ''}${percentage.toFixed(1)}%`
            : config.label)}
      </span>
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Sparkline
// ============================================

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 40,
  color = '#3B82F6',
  variant,
  isActive,
}) => {
  if (!data || data.length < 2) return null;

  const padding = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points[0]} L ${points.join(' L ')}`;
  const areaPath = `M ${points[0]} L ${points.join(' L ')} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const isDark = variant === 'glass';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="flex-shrink-0 opacity-80"
      aria-hidden="true"
    >
      {/* Area fill */}
      <defs>
        <linearGradient id={`sparkline-gradient-${data.length}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#sparkline-gradient-${data.length})`}
      />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {isActive && (
        <circle
          cx={points[points.length - 1]?.split(',')[0] || 0}
          cy={points[points.length - 1]?.split(',')[1] || 0}
          r="3"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      )}
    </svg>
  );
};

// ============================================
// 6. SUB-COMPONENT: Progress Ring
// ============================================

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  max,
  size = 60,
  strokeWidth = 4,
  color = '#3B82F6',
  isAnimating,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / max) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0"
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-brand-border/30"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={isAnimating ? offset : circumference}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: isAnimating
            ? `stroke-dashoffset 1.5s ease-out`
            : 'stroke-dashoffset 0.5s ease-out',
        }}
      />
    </svg>
  );
};

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const CounterUp: React.FC<CounterUpProps> = ({
  end,
  start = 0,
  duration = 2000,
  delay = 0,
  decimals = 0,
  decimalSeparator = '.',
  thousandSeparator = ',',
  prefix = '',
  suffix = '',
  format = 'number',
  formatFn,
  variant = 'default',
  size = 'lg',
  align = 'center',
  animation = 'count-up',
  easing = 'ease-out',
  showTrend = false,
  trend = 'up',
  previousValue,
  showPercentage = false,
  trendIcon,
  trendLabel,
  icon,
  iconPosition = 'top',
  label,
  description,
  showProgress = false,
  progress: progressProp,
  progressMax = 100,
  showSparkline = false,
  sparklineData,
  sparklineColor = '#3B82F6',
  gradientText = false,
  gradientColors = ['#3B82F6', '#7C3AED', '#EC4899'],
  decorative = false,
  monospace = false,
  interactive = false,
  onClick,
  animateOnView = true,
  viewMargin = '0px 0px -50px 0px',
  resetOnReentry = true,
  onComplete,
  onStart,
  className = '',
  style,
  id,
  respectReducedMotion = true,
}) => {
  // ============================================
  // State
  // ============================================

  const [currentValue, setCurrentValue] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isInView, setIsInView] = useState(!animateOnView);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startDelayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const sizeConfig = useMemo(() => SIZE_MAP[size], [size]);
  const variantConfig = useMemo(() => VARIANT_MAP[variant], [variant]);
  const easingFn = useMemo(() => EASING_FUNCTIONS[easing], [easing]);

  const changePercentage = useMemo(() => {
    if (!previousValue || previousValue === 0) return undefined;
    return ((end - previousValue) / Math.abs(previousValue)) * 100;
  }, [end, previousValue]);

  const progressValue = useMemo(() => {
    if (progressProp !== undefined) return progressProp;
    if (showProgress && previousValue !== undefined && previousValue > 0) {
      return Math.min(100, (end / previousValue) * 100);
    }
    return 0;
  }, [showProgress, progressProp, end, previousValue]);

  const formattedValue = useMemo(
    () =>
      formatNumber(
        currentValue,
        format,
        decimals,
        decimalSeparator,
        thousandSeparator,
        formatFn
      ),
    [currentValue, format, decimals, decimalSeparator, thousandSeparator, formatFn]
  );

  // ============================================
  // Effects: Reduced Motion
  // ============================================

  useEffect(() => {
    if (!respectReducedMotion) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [respectReducedMotion]);

  // ============================================
  // Effects: Intersection Observer
  // ============================================

  useEffect(() => {
    if (!animateOnView || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (!resetOnReentry) {
            observer.disconnect();
          }
        } else if (resetOnReentry) {
          setIsInView(false);
          setCurrentValue(start);
          setHasCompleted(false);
        }
      },
      {
        threshold: 0.3,
        rootMargin: viewMargin,
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [animateOnView, resetOnReentry, viewMargin, start]);

  // ============================================
  // Effects: Counting Animation
  // ============================================

  useEffect(() => {
    if (!isInView || hasCompleted || shouldReduceMotion) {
      if (shouldReduceMotion) {
        setCurrentValue(end);
        setHasCompleted(true);
      }
      return;
    }

    // Start delay
    startDelayTimerRef.current = setTimeout(() => {
      setIsAnimating(true);
      onStart?.();
      startTimeRef.current = null;

      const totalChange = end - start;

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easingFn(progress);

        const newValue = start + totalChange * easedProgress;
        setCurrentValue(Math.round(newValue * Math.pow(10, decimals)) / Math.pow(10, decimals));

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentValue(end);
          setIsAnimating(false);
          setHasCompleted(true);
          onComplete?.();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      if (startDelayTimerRef.current) {
        clearTimeout(startDelayTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    isInView,
    hasCompleted,
    shouldReduceMotion,
    start,
    end,
    duration,
    delay,
    decimals,
    easingFn,
    onStart,
    onComplete,
  ]);

  // ============================================
  // Handlers
  // ============================================

  const handleClick = useCallback(() => {
    if (interactive && onClick) {
      onClick();
    }
  }, [interactive, onClick]);

  // ============================================
  // Render: Gradient Text Style
  // ============================================

  const numberStyle = useMemo((): React.CSSProperties => {
    if (gradientText && gradientColors.length >= 2) {
      return {
        background: `linear-gradient(135deg, ${gradientColors.join(', ')})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
      };
    }
    return {};
  }, [gradientText, gradientColors]);

  // ============================================
  // 8. RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        relative overflow-hidden
        rounded-2xl
        transition-all duration-300
        ${variantConfig.background}
        ${variantConfig.border}
        ${variantConfig.shadow}
        ${variantConfig.hover}
        ${sizeConfig.padding}
        ${interactive ? 'cursor-pointer' : ''}
        ${isHovered ? 'scale-[1.02]' : 'scale-100'}
        ${className}
      `}
      style={{
        textAlign: align,
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {/* Decorative Background */}
      {decorative && (
        <>
          <div
            className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-brand-primary/10 blur-xl pointer-events-none transition-opacity duration-500"
            style={{ opacity: isHovered ? 0.8 : 0.3 }}
          />
          <div
            className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-brand-secondary/10 blur-xl pointer-events-none transition-opacity duration-500"
            style={{ opacity: isHovered ? 0.8 : 0.3 }}
          />
        </>
      )}

      <div className={`relative z-[1] flex flex-col ${sizeConfig.gap}`}>
        {/* Icon + Trend Row */}
        {icon && iconPosition === 'top' && (
          <div className={`flex justify-${align === 'center' ? 'center' : align === 'right' ? 'end' : 'start'}`}>
            <div
              className={`
                ${sizeConfig.icon}
                rounded-xl
                bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20
                flex items-center justify-center
                transition-transform duration-300
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
            >
              <div className="text-brand-primary scale-75">{icon}</div>
            </div>
          </div>
        )}

        {/* Main Number Row */}
        <div
          className={`
            flex items-center
            ${sizeConfig.gap}
            ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}
            flex-wrap
          `}
        >
          {/* Left Icon */}
          {icon && iconPosition === 'left' && (
            <div
              className={`
                ${sizeConfig.icon}
                rounded-xl
                bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20
                flex items-center justify-center
                flex-shrink-0
                transition-transform duration-300
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
            >
              <div className="text-brand-primary scale-75">{icon}</div>
            </div>
          )}

          {/* Number */}
          <div className="flex items-baseline gap-1">
            {prefix && (
              <span
                className={`
                  ${sizeConfig.prefixSuffix}
                  ${variantConfig.descriptionColor}
                  font-medium
                `}
              >
                {prefix}
              </span>
            )}
            <span
              className={`
                font-bold tracking-tight
                ${sizeConfig.number}
                ${variantConfig.numberColor}
                ${monospace ? 'font-mono' : ''}
                transition-all duration-300
              `}
              style={numberStyle}
            >
              {formattedValue}
            </span>
            {suffix && (
              <span
                className={`
                  ${sizeConfig.prefixSuffix}
                  ${variantConfig.descriptionColor}
                  font-medium
                `}
              >
                {suffix}
              </span>
            )}
          </div>

          {/* Right Icon */}
          {icon && iconPosition === 'right' && (
            <div
              className={`
                ${sizeConfig.icon}
                rounded-xl
                bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20
                flex items-center justify-center
                flex-shrink-0
                transition-transform duration-300
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
            >
              <div className="text-brand-primary scale-75">{icon}</div>
            </div>
          )}
        </div>

        {/* Trend Indicator */}
        {showTrend && (
          <div
            className={`
              flex items-center gap-2
              ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}
            `}
          >
            <TrendIndicator
              trend={trend}
              percentage={changePercentage}
              icon={trendIcon}
              label={trendLabel}
              size={size}
            />
            {showPercentage && changePercentage !== undefined && (
              <span className={`text-xs ${TREND_CONFIG[trend].color} font-medium`}>
                {trend === 'up' ? '+' : ''}
                {changePercentage.toFixed(1)}%
              </span>
            )}
          </div>
        )}

        {/* Progress Ring / Bar */}
        {showProgress && (
          <div
            className={`
              flex items-center gap-3
              ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}
            `}
          >
            <ProgressRing
              progress={progressValue}
              max={progressMax}
              size={size === 'sm' ? 40 : size === 'md' ? 50 : 60}
              strokeWidth={3}
              color={sparklineColor}
              isAnimating={isAnimating || hasCompleted}
            />
            <div className="flex-1 max-w-[100px]">
              <div className="h-2 bg-brand-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-1000"
                  style={{
                    width: isAnimating || hasCompleted ? `${(progressValue / progressMax) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sparkline */}
        {showSparkline && sparklineData && (
          <div
            className={`
              flex
              ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}
            `}
          >
            <Sparkline
              data={sparklineData}
              color={sparklineColor}
              variant={variant}
              isActive={isAnimating || hasCompleted}
            />
          </div>
        )}

        {/* Label */}
        {label && (
          <p
            className={`
              font-medium
              ${sizeConfig.label}
              ${variantConfig.labelColor}
              transition-colors duration-300
            `}
          >
            {label}
          </p>
        )}

        {/* Description */}
        {description && (
          <p
            className={`
              ${sizeConfig.description}
              ${variantConfig.descriptionColor}
              transition-colors duration-300
            `}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================
// 9. COUNTER GRID HELPER
// ============================================

interface CounterGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CounterGrid: React.FC<CounterGridProps> = ({
  children,
  columns = 4,
  gap = 'md',
  className = '',
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  };

  const gapSize = {
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
// 10. DISPLAY NAME
// ============================================

CounterUp.displayName = 'CounterUp';
TrendIndicator.displayName = 'TrendIndicator';
Sparkline.displayName = 'Sparkline';
ProgressRing.displayName = 'ProgressRing';
CounterGrid.displayName = 'CounterGrid';

// ============================================
// 11. NAMED EXPORTS
// ============================================

export {
  TrendIndicator,
  Sparkline,
  ProgressRing,
  CounterGrid,
  SIZE_MAP,
  VARIANT_MAP,
  TREND_CONFIG,
  EASING_FUNCTIONS,
  formatNumber,
};

// ============================================
// 12. TYPE EXPORTS
// ============================================

export type {
  CounterVariant,
  CounterSize,
  CounterAlignment,
  CounterTrend,
  CounterAnimation,
  CounterEasing,
  NumberFormat,
  CounterUpProps,
  TrendIndicatorProps,
  SparklineProps,
  ProgressRingProps,
  CounterGridProps,
};

// ============================================
// 13. DEFAULT EXPORT
// ============================================

export default CounterUp;