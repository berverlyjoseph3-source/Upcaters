// ============================================
// apps/frontend/src/hooks/landing/useCounterAnimation.ts
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================
// 1. TYPES
// ============================================

type CounterEasing = 'linear' | 'ease-out' | 'ease-in-out' | 'spring' | 'bounce';
type CounterFormat = 'number' | 'currency' | 'percentage' | 'decimal' | 'compact' | 'custom';
type CounterStatus = 'idle' | 'animating' | 'completed' | 'paused' | 'reset';

interface UseCounterAnimationOptions {
  /** Target value to animate to */
  targetValue: number;
  /** Starting value (default: 0) */
  startValue?: number;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Delay before animation starts in milliseconds */
  delay?: number;
  /** Easing function for the animation curve */
  easing?: CounterEasing;
  /** Number of decimal places to display */
  decimals?: number;
  /** Format type for the display value */
  format?: CounterFormat;
  /** Custom format function (receives current number, returns string) */
  customFormat?: (value: number) => string;
  /** Locale for number formatting (default: 'en-US') */
  locale?: string;
  /** Currency code when format is 'currency' (default: 'USD') */
  currency?: string;
  /** Prefix string before the number */
  prefix?: string;
  /** Suffix string after the number */
  suffix?: string;
  /** Separator for thousands */
  separator?: string;
  /** Whether the counter should only animate once when it enters view */
  animateOnce?: boolean;
  /** Whether the counter is enabled */
  enabled?: boolean;
  /** Whether to use IntersectionObserver to trigger animation */
  observeInView?: boolean;
  /** Threshold for IntersectionObserver (0-1) */
  threshold?: number;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
  /** Element ref to observe (defaults to a new ref) */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Called when animation starts */
  onStart?: () => void;
  /** Called on each animation frame with the current value */
  onUpdate?: (value: number) => void;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Called if animation is interrupted */
  onInterrupt?: () => void;
}

interface UseCounterAnimationReturn {
  /** Current display value (formatted string) */
  displayValue: string;
  /** Current numeric value */
  currentValue: number;
  /** Current progress of the animation (0-1) */
  progress: number;
  /** Current animation status */
  status: CounterStatus;
  /** Whether the counter is currently animating */
  isAnimating: boolean;
  /** Whether the animation has completed */
  isCompleted: boolean;
  /** Ref to attach to the target element for IntersectionObserver */
  ref: React.RefObject<HTMLElement | null>;
  /** Start the animation manually */
  start: () => void;
  /** Pause the animation */
  pause: () => void;
  /** Resume the animation */
  resume: () => void;
  /** Reset the counter to startValue */
  reset: () => void;
  /** Jump to the target value immediately */
  complete: () => void;
}

interface UseCountUpOptions {
  /** Target value */
  end: number;
  /** Start value (default: 0) */
  start?: number;
  /** Duration in ms (default: 2000) */
  duration?: number;
  /** Delay in ms (default: 0) */
  delay?: number;
  /** Decimals to show */
  decimals?: number;
  /** Format type */
  format?: CounterFormat;
  /** Prefix */
  prefix?: string;
  /** Suffix */
  suffix?: string;
  /** Enable/disable */
  enabled?: boolean;
  /** Observe element entering viewport */
  observeInView?: boolean;
  /** Called when complete */
  onComplete?: () => void;
}

interface UseCountUpReturn {
  /** Formatted display value */
  value: string;
  /** Whether counting is in progress */
  isCounting: boolean;
  /** Ref for IntersectionObserver */
  ref: React.RefObject<HTMLElement | null>;
  /** Reset counter */
  reset: () => void;
}

interface UseAnimatedNumberOptions {
  /** Value to display */
  value: number;
  /** Duration of transition in ms */
  duration?: number;
  /** Easing function */
  easing?: CounterEasing;
  /** Number of decimal places */
  decimals?: number;
  /** Format type */
  format?: CounterFormat;
  /** Prefix */
  prefix?: string;
  /** Suffix */
  suffix?: string;
  /** Enable animation */
  enabled?: boolean;
  /** Locale */
  locale?: string;
}

interface UseAnimatedNumberReturn {
  /** Animated display value */
  displayValue: string;
  /** Current numeric value during animation */
  currentValue: number;
  /** Whether currently animating */
  isAnimating: boolean;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_DURATION = 2000;
const DEFAULT_DELAY = 0;
const DEFAULT_DECIMALS = 0;
const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_ROOT_MARGIN = '0px 0px -30px 0px';

// ============================================
// 3. UTILITY FUNCTIONS
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutSpring(t: number): number {
  return 1 - Math.exp(-6 * t) * Math.cos(10 * t * Math.PI);
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  else return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function getEasingFunction(easing: CounterEasing): (t: number) => number {
  switch (easing) {
    case 'linear':
      return (t) => t;
    case 'ease-out':
      return easeOutCubic;
    case 'ease-in-out':
      return easeInOutCubic;
    case 'spring':
      return easeOutSpring;
    case 'bounce':
      return easeOutBounce;
    default:
      return easeOutExpo;
  }
}

function formatNumber(
  value: number,
  format: CounterFormat,
  options: {
    decimals?: number;
    locale?: string;
    currency?: string;
    prefix?: string;
    suffix?: string;
    separator?: string;
  } = {}
): string {
  const {
    decimals = DEFAULT_DECIMALS,
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    prefix = '',
    suffix = '',
  } = options;

  const roundedValue = Number(value.toFixed(decimals));

  let formatted: string;

  switch (format) {
    case 'currency':
      formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(roundedValue);
      break;

    case 'percentage':
      formatted = `${roundedValue.toFixed(decimals)}%`;
      break;

    case 'decimal':
      formatted = roundedValue.toFixed(decimals);
      break;

    case 'compact':
      formatted = new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(roundedValue);
      break;

    case 'number':
    default:
      formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(roundedValue);
      break;
  }

  return `${prefix}${formatted}${suffix}`;
}

// ============================================
// 4. MAIN HOOK: useCounterAnimation
// ============================================

export function useCounterAnimation(
  options: UseCounterAnimationOptions
): UseCounterAnimationReturn {
  const {
    targetValue,
    startValue = 0,
    duration = DEFAULT_DURATION,
    delay = DEFAULT_DELAY,
    easing = 'ease-out',
    decimals = DEFAULT_DECIMALS,
    format = 'number',
    customFormat,
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    prefix = '',
    suffix = '',
    separator,
    animateOnce = true,
    enabled = true,
    observeInView = true,
    threshold = DEFAULT_THRESHOLD,
    rootMargin = DEFAULT_ROOT_MARGIN,
    targetRef: externalRef,
    onStart,
    onUpdate,
    onComplete,
    onInterrupt,
  } = options;

  const internalRef = useRef<HTMLElement | null>(null);
  const ref = externalRef || internalRef;
  const [currentValue, setCurrentValue] = useState(startValue);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<CounterStatus>('idle');
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnimatedRef = useRef(false);
  const isPausedRef = useRef(false);
  const pausedValueRef = useRef(startValue);
  const pausedTimeRef = useRef(0);

  const getFormattedValue = useCallback(
    (value: number): string => {
      if (customFormat) return customFormat(value);
      return formatNumber(value, format, { decimals, locale, currency, prefix, suffix, separator });
    },
    [customFormat, format, decimals, locale, currency, prefix, suffix, separator]
  );

  const displayValue = useMemo(
    () => getFormattedValue(currentValue),
    [currentValue, getFormattedValue]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;

      if (isPausedRef.current) {
        pausedTimeRef.current = elapsed;
        return;
      }

      const effectiveElapsed = isPausedRef.current ? pausedTimeRef.current : elapsed;
      const rawProgress = clamp(effectiveElapsed / duration, 0, 1);
      const easedProgress = getEasingFunction(easing)(rawProgress);
      const value = startValue + (targetValue - startValue) * easedProgress;
      const roundedValue = Number(value.toFixed(decimals));

      setCurrentValue(roundedValue);
      setProgress(rawProgress);
      onUpdate?.(roundedValue);

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
        setProgress(1);
        setStatus('completed');
        onUpdate?.(targetValue);
        onComplete?.();
      }
    },
    [targetValue, startValue, duration, easing, decimals, onUpdate, onComplete]
  );

  const start = useCallback(() => {
    if (!enabled) return;

    if (animateOnce && hasAnimatedRef.current) {
      setCurrentValue(targetValue);
      setProgress(1);
      setStatus('completed');
      return;
    }

    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    startTimeRef.current = null;
    isPausedRef.current = false;
    pausedValueRef.current = startValue;
    pausedTimeRef.current = 0;

    const startAnimation = () => {
      setStatus('animating');
      onStart?.();
      hasAnimatedRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (delay > 0) {
      delayTimerRef.current = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }
  }, [enabled, animateOnce, targetValue, startValue, delay, animate, onStart]);

  const pause = useCallback(() => {
    if (status !== 'animating') return;
    isPausedRef.current = true;
    pausedValueRef.current = currentValue;
    setStatus('paused');
  }, [status, currentValue]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    isPausedRef.current = false;
    setStatus('animating');
    onStart?.();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [status, animate, onStart]);

  const reset = useCallback(() => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    startTimeRef.current = null;
    isPausedRef.current = false;
    pausedValueRef.current = startValue;
    pausedTimeRef.current = 0;
    setCurrentValue(startValue);
    setProgress(0);
    setStatus('reset');
    onInterrupt?.();
  }, [startValue, onInterrupt]);

  const complete = useCallback(() => {
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    startTimeRef.current = null;
    isPausedRef.current = false;
    setCurrentValue(targetValue);
    setProgress(1);
    setStatus('completed');
    onUpdate?.(targetValue);
    onComplete?.();
  }, [targetValue, onUpdate, onComplete]);

  // IntersectionObserver to trigger animation when element enters view
  useEffect(() => {
    if (!enabled || !observeInView) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            start();
            if (animateOnce) {
              observer.unobserve(element);
            }
          } else if (!animateOnce) {
            reset();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, observeInView, animateOnce, ref, threshold, rootMargin, start, reset]);

  // Start immediately if not observing and enabled
  useEffect(() => {
    if (enabled && !observeInView) {
      start();
    }
  }, [enabled, observeInView, start]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return {
    displayValue,
    currentValue,
    progress,
    status,
    isAnimating: status === 'animating',
    isCompleted: status === 'completed',
    ref: ref as React.RefObject<HTMLElement | null>,
    start,
    pause,
    resume,
    reset,
    complete,
  };
}

// ============================================
// 5. DERIVED HOOK: useCountUp
// ============================================

export function useCountUp(options: UseCountUpOptions): UseCountUpReturn {
  const {
    end,
    start = 0,
    duration = DEFAULT_DURATION,
    delay = DEFAULT_DELAY,
    decimals = DEFAULT_DECIMALS,
    format = 'number',
    prefix = '',
    suffix = '',
    enabled = true,
    observeInView = true,
    onComplete,
  } = options;

  const {
    displayValue,
    isAnimating,
    ref,
    reset,
  } = useCounterAnimation({
    targetValue: end,
    startValue: start,
    duration,
    delay,
    decimals,
    format,
    prefix,
    suffix,
    enabled,
    observeInView,
    animateOnce: true,
    onComplete,
  });

  return {
    value: displayValue,
    isCounting: isAnimating,
    ref,
    reset,
  };
}

// ============================================
// 6. DERIVED HOOK: useAnimatedNumber
// ============================================

export function useAnimatedNumber(
  options: UseAnimatedNumberOptions
): UseAnimatedNumberReturn {
  const {
    value,
    duration = 600,
    easing = 'ease-out',
    decimals = DEFAULT_DECIMALS,
    format = 'number',
    prefix = '',
    suffix = '',
    enabled = true,
    locale = DEFAULT_LOCALE,
  } = options;

  const [currentValue, setCurrentValue] = useState(value);
  const [displayValue, setDisplayValue] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCurrentValue(value);
      setDisplayValue(
        formatNumber(value, format, { decimals, locale, prefix, suffix })
      );
      return;
    }

    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (previousValue === value) {
      setCurrentValue(value);
      setDisplayValue(
        formatNumber(value, format, { decimals, locale, prefix, suffix })
      );
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setIsAnimating(true);
    const startTime = performance.now();
    const startValue = previousValue;
    const diff = value - startValue;
    const easeFn = getEasingFunction(easing);

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const rawProgress = clamp(elapsed / duration, 0, 1);
      const easedProgress = easeFn(rawProgress);
      const newValue = startValue + diff * easedProgress;
      const roundedValue = Number(newValue.toFixed(decimals));

      setCurrentValue(roundedValue);
      setDisplayValue(
        formatNumber(roundedValue, format, { decimals, locale, prefix, suffix })
      );

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(value);
        setDisplayValue(
          formatNumber(value, format, { decimals, locale, prefix, suffix })
        );
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration, easing, decimals, format, prefix, suffix, enabled, locale]);

  return {
    displayValue,
    currentValue,
    isAnimating,
  };
}

// ============================================
// 7. NAMED EXPORTS
// ============================================

export type {
  CounterEasing,
  CounterFormat,
  CounterStatus,
  UseCounterAnimationOptions,
  UseCounterAnimationReturn,
  UseCountUpOptions,
  UseCountUpReturn,
  UseAnimatedNumberOptions,
  UseAnimatedNumberReturn,
};

export default useCounterAnimation;