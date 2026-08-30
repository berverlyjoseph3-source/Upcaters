// ============================================
// apps/frontend/src/hooks/landing/useParallaxScroll.ts
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================
// 1. TYPES
// ============================================

type ParallaxDirection = 'up' | 'down' | 'left' | 'right';
type ParallaxEasing = 'linear' | 'ease-out' | 'ease-in-out' | 'spring';

interface UseParallaxScrollOptions {
  /** Speed multiplier (-1 to 1, negative = opposite direction) */
  speed?: number;
  /** Direction of the parallax effect */
  direction?: ParallaxDirection;
  /** Whether the effect is active */
  enabled?: boolean;
  /** CSS property to animate (default: translateY) */
  property?: 'translateY' | 'translateX' | 'translate3d' | 'rotate' | 'scale' | 'opacity';
  /** Minimum offset value */
  minOffset?: number;
  /** Maximum offset value */
  maxOffset?: number;
  /** Easing function for smooth transitions */
  easing?: ParallaxEasing;
  /** Use RAF for smooth animation */
  smooth?: boolean;
  /** Smooth factor (0-1, higher = more smoothing) */
  smoothFactor?: number;
  /** Start offset (initial position before scroll) */
  startOffset?: number;
  /** End offset (final position after full scroll) */
  endOffset?: number;
  /** Element selector to calculate scroll relative to (default: window) */
  relativeTo?: string | null;
  /** Offset from the top of the relative element */
  offsetTop?: number;
}

interface UseParallaxScrollReturn {
  /** Current computed offset value */
  offset: number;
  /** CSS transform string for direct use */
  transform: string;
  /** CSS style object for element */
  style: React.CSSProperties;
  /** Scroll progress (0-1) */
  progress: number;
  /** Raw scroll position */
  scrollY: number;
  /** Whether the element is currently in view */
  isInView: boolean;
  /** Ref to attach to the target element */
  ref: React.RefObject<HTMLElement | null>;
  /** Force recalculation */
  recalculate: () => void;
}

interface UseStaggerScrollOptions {
  /** Number of items to stagger */
  itemCount: number;
  /** Base delay between items in seconds */
  baseDelay?: number;
  /** Initial delay before first item in seconds */
  initialDelay?: number;
  /** Whether the stagger is active */
  enabled?: boolean;
  /** Element selector for the container */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Threshold for triggering (0-1) */
  threshold?: number;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

interface UseStaggerScrollReturn {
  /** Array of visibility states for each item */
  visibleItems: boolean[];
  /** Whether the container is in view */
  isContainerInView: boolean;
  /** Refs array for each item */
  itemRefs: React.RefObject<(HTMLElement | null)[]>;
  /** Reset all animations */
  reset: () => void;
}

interface UseScrollProgressOptions {
  /** Target element ref */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Offset from top of viewport */
  offset?: number;
  /** Whether tracking is enabled */
  enabled?: boolean;
  /** Throttle interval in ms */
  throttleInterval?: number;
}

interface UseScrollProgressReturn {
  /** Scroll progress (0-1) through the target element */
  progress: number;
  /** Whether the target is in view */
  isInView: boolean;
  /** How much of the element has scrolled past (0-1) */
  scrolledPast: number;
  /** Element top relative to viewport top */
  elementTop: number;
  /** Element bottom relative to viewport top */
  elementBottom: number;
  /** Total scrollable distance of the element */
  scrollableDistance: number;
  /** Current scroll position */
  scrollY: number;
}

interface UseSmoothScrollOptions {
  /** Whether smooth scrolling is active */
  enabled?: boolean;
  /** Duration of smooth scroll in ms */
  duration?: number;
  /** Easing function */
  easing?: ParallaxEasing;
  /** Scroller element ref (default: window) */
  scrollerRef?: React.RefObject<HTMLElement | null>;
}

interface UseSmoothScrollReturn {
  /** Scroll to a specific position smoothly */
  scrollTo: (target: number | string | HTMLElement) => void;
  /** Whether currently scrolling */
  isScrolling: boolean;
  /** Current scroll position */
  scrollY: number;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_PARALLAX_SPEED = 0.5;
const DEFAULT_MIN_OFFSET = -100;
const DEFAULT_MAX_OFFSET = 100;
const DEFAULT_SMOOTH_FACTOR = 0.1;
const DEFAULT_STAGGER_DELAY = 0.1;
const DEFAULT_STAGGER_THRESHOLD = 0.2;
const DEFAULT_STAGGER_ROOT_MARGIN = '0px 0px -50px 0px';
const DEFAULT_SCROLL_OFFSET = 0;
const DEFAULT_THROTTLE_INTERVAL = 16;
const DEFAULT_SMOOTH_SCROLL_DURATION = 800;

// ============================================
// 3. UTILITY FUNCTIONS
// ============================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
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

function getEasingFunction(easing: ParallaxEasing): (t: number) => number {
  switch (easing) {
    case 'linear':
      return (t) => t;
    case 'ease-out':
      return easeOutCubic;
    case 'ease-in-out':
      return easeInOutCubic;
    case 'spring':
      return easeOutSpring;
    default:
      return (t) => t;
  }
}

// ============================================
// 4. MAIN HOOK: useParallaxScroll
// ============================================

export function useParallaxScroll(
  options: UseParallaxScrollOptions = {}
): UseParallaxScrollReturn {
  const {
    speed = DEFAULT_PARALLAX_SPEED,
    direction = 'up',
    enabled = true,
    property = 'translateY',
    minOffset = DEFAULT_MIN_OFFSET,
    maxOffset = DEFAULT_MAX_OFFSET,
    easing = 'linear',
    smooth = false,
    smoothFactor = DEFAULT_SMOOTH_FACTOR,
    startOffset = 0,
    endOffset = 0,
    relativeTo = null,
    offsetTop = 0,
  } = options;

  const ref = useRef<HTMLElement | null>(null);
  const [rawOffset, setRawOffset] = useState(startOffset);
  const [smoothedOffset, setSmoothedOffset] = useState(startOffset);
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const targetOffsetRef = useRef(startOffset);
  const currentOffsetRef = useRef(startOffset);

  const calculateOffset = useCallback(() => {
    const element = ref.current;
    if (!element && !relativeTo) {
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const rawProgress = documentHeight > 0 ? currentScrollY / documentHeight : 0;
      const easedProgress = getEasingFunction(easing)(clamp(rawProgress, 0, 1));

      let directionalOffset: number;
      switch (direction) {
        case 'up':
          directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : -maxOffset);
          break;
        case 'down':
          directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : maxOffset);
          break;
        case 'left':
          directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : -maxOffset);
          break;
        case 'right':
          directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : maxOffset);
          break;
        default:
          directionalOffset = 0;
      }

      const finalOffset = directionalOffset * speed;
      const clampedOffset = clamp(finalOffset, minOffset, maxOffset);

      setRawOffset(clampedOffset);
      setProgress(easedProgress);
      setScrollY(currentScrollY);
      targetOffsetRef.current = clampedOffset;

      return;
    }

    const targetElement = relativeTo ? document.querySelector(relativeTo) : element;
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const elementTop = rect.top - offsetTop;
    const elementHeight = rect.height;
    const scrollableDistance = elementHeight + windowHeight;
    const scrolledPast = -elementTop;
    const rawProgress = scrollableDistance > 0 ? clamp(scrolledPast / scrollableDistance, 0, 1) : 0;
    const easedProgress = getEasingFunction(easing)(rawProgress);
    const inView = rect.bottom > 0 && rect.top < windowHeight;

    let directionalOffset: number;
    switch (direction) {
      case 'up':
        directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : -maxOffset);
        break;
      case 'down':
        directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : maxOffset);
        break;
      case 'left':
        directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : -maxOffset);
        break;
      case 'right':
        directionalOffset = mapRange(easedProgress, 0, 1, startOffset, endOffset !== 0 ? endOffset : maxOffset);
        break;
      default:
        directionalOffset = 0;
    }

    const finalOffset = directionalOffset * speed;
    const clampedOffset = clamp(finalOffset, minOffset, maxOffset);

    setRawOffset(clampedOffset);
    setProgress(rawProgress);
    setScrollY(window.scrollY);
    setIsInView(inView);
    targetOffsetRef.current = clampedOffset;
  }, [speed, direction, minOffset, maxOffset, easing, startOffset, endOffset, relativeTo, offsetTop]);

  const animateSmooth = useCallback(() => {
    const target = targetOffsetRef.current;
    const current = currentOffsetRef.current;
    const newOffset = lerp(current, target, smoothFactor);
    currentOffsetRef.current = newOffset;
    setSmoothedOffset(newOffset);
    animationFrameRef.current = requestAnimationFrame(animateSmooth);
  }, [smoothFactor]);

  useEffect(() => {
    if (!enabled) {
      setRawOffset(startOffset);
      setSmoothedOffset(startOffset);
      setProgress(0);
      setIsInView(false);
      return;
    }

    const handleScroll = () => {
      calculateOffset();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, calculateOffset, startOffset]);

  useEffect(() => {
    if (smooth && enabled) {
      animationFrameRef.current = requestAnimationFrame(animateSmooth);
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [smooth, enabled, animateSmooth]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const recalculate = useCallback(() => {
    calculateOffset();
  }, [calculateOffset]);

  const displayOffset = smooth ? smoothedOffset : rawOffset;

  const transform = useMemo(() => {
    switch (property) {
      case 'translateY':
        return `translateY(${displayOffset.toFixed(2)}px)`;
      case 'translateX':
        return `translateX(${displayOffset.toFixed(2)}px)`;
      case 'translate3d':
        if (direction === 'up' || direction === 'down') {
          return `translate3d(0px, ${displayOffset.toFixed(2)}px, 0px)`;
        }
        return `translate3d(${displayOffset.toFixed(2)}px, 0px, 0px)`;
      case 'rotate':
        return `rotate(${displayOffset.toFixed(2)}deg)`;
      case 'scale':
        const scaleValue = 1 + displayOffset / 100;
        return `scale(${clamp(scaleValue, 0.5, 2).toFixed(3)})`;
      case 'opacity':
        return '';
      default:
        return `translateY(${displayOffset.toFixed(2)}px)`;
    }
  }, [displayOffset, property, direction]);

  const style = useMemo((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      willChange: 'transform',
    };

    if (property === 'opacity') {
      const opacityValue = clamp(1 - Math.abs(displayOffset) / 100, 0, 1);
      styles.opacity = opacityValue;
    } else {
      styles.transform = transform;
    }

    return styles;
  }, [displayOffset, property, transform]);

  return {
    offset: displayOffset,
    transform,
    style,
    progress,
    scrollY,
    isInView,
    ref: ref as React.RefObject<HTMLElement | null>,
    recalculate,
  };
}

// ============================================
// 5. DERIVED HOOK: useStaggerScroll
// ============================================

export function useStaggerScroll(
  options: UseStaggerScrollOptions
): UseStaggerScrollReturn {
  const {
    itemCount,
    baseDelay = DEFAULT_STAGGER_DELAY,
    initialDelay = 0,
    enabled = true,
    containerRef,
    threshold = DEFAULT_STAGGER_THRESHOLD,
    rootMargin = DEFAULT_STAGGER_ROOT_MARGIN,
  } = options;

  const [isContainerInView, setIsContainerInView] = useState(false);
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(itemCount).fill(false)
  );
  const itemRefs = useRef<(HTMLElement | null)[]>(new Array(itemCount).fill(null));
  const triggeredRef = useRef(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    itemRefs.current = new Array(itemCount).fill(null);
    setVisibleItems(new Array(itemCount).fill(false));
    triggeredRef.current = false;
  }, [itemCount]);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    const element = containerRef?.current || itemRefs.current[0]?.parentElement;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggeredRef.current) {
            triggeredRef.current = true;
            setIsContainerInView(true);

            timersRef.current.forEach((timer) => clearTimeout(timer));
            timersRef.current = [];

            for (let i = 0; i < itemCount; i++) {
              const delay = initialDelay + i * baseDelay;
              const timer = setTimeout(() => {
                setVisibleItems((prev) => {
                  const next = [...prev];
                  next[i] = true;
                  return next;
                });
              }, delay * 1000);
              timersRef.current.push(timer);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, [enabled, itemCount, baseDelay, initialDelay, containerRef, threshold, rootMargin]);

  const reset = useCallback(() => {
    triggeredRef.current = false;
    setIsContainerInView(false);
    setVisibleItems(new Array(itemCount).fill(false));
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, [itemCount]);

  return {
    visibleItems,
    isContainerInView,
    itemRefs: itemRefs as React.RefObject<(HTMLElement | null)[]>,
    reset,
  };
}

// ============================================
// 6. DERIVED HOOK: useScrollProgress
// ============================================

export function useScrollProgress(
  options: UseScrollProgressOptions = {}
): UseScrollProgressReturn {
  const {
    targetRef,
    offset = DEFAULT_SCROLL_OFFSET,
    enabled = true,
    throttleInterval = DEFAULT_THROTTLE_INTERVAL,
  } = options;

  const [progress, setProgress] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [scrolledPast, setScrolledPast] = useState(0);
  const [elementTop, setElementTop] = useState(0);
  const [elementBottom, setElementBottom] = useState(0);
  const [scrollableDistance, setScrollableDistance] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const throttleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      setIsInView(false);
      return;
    }

    const calculateProgress = () => {
      const element = targetRef?.current;
      const currentScrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      if (element) {
        const rect = element.getBoundingClientRect();
        const elTop = rect.top + currentScrollY - offset;
        const elHeight = rect.height;
        const elBottom = elTop + elHeight;
        const distance = elHeight + windowHeight;
        const scrolled = currentScrollY + windowHeight - elTop;
        const prog = distance > 0 ? clamp(scrolled / distance, 0, 1) : 0;
        const past = elTop < currentScrollY ? clamp((currentScrollY - elTop) / elHeight, 0, 1) : 0;
        const inView = rect.bottom > 0 && rect.top < windowHeight;

        setProgress(prog);
        setIsInView(inView);
        setScrolledPast(past);
        setElementTop(elTop);
        setElementBottom(elBottom);
        setScrollableDistance(distance);
      } else {
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const prog = documentHeight > 0 ? currentScrollY / documentHeight : 0;

        setProgress(clamp(prog, 0, 1));
        setIsInView(true);
        setScrolledPast(prog);
        setScrollableDistance(documentHeight);
      }

      setScrollY(currentScrollY);
    };

    const handleScroll = () => {
      if (throttleTimerRef.current !== null) return;
      calculateProgress();
      throttleTimerRef.current = window.setTimeout(() => {
        throttleTimerRef.current = null;
      }, throttleInterval);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    calculateProgress();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, [enabled, targetRef, offset, throttleInterval]);

  return {
    progress,
    isInView,
    scrolledPast,
    elementTop,
    elementBottom,
    scrollableDistance,
    scrollY,
  };
}

// ============================================
// 7. DERIVED HOOK: useSmoothScroll
// ============================================

export function useSmoothScroll(
  options: UseSmoothScrollOptions = {}
): UseSmoothScrollReturn {
  const {
    enabled = true,
    duration = DEFAULT_SMOOTH_SCROLL_DURATION,
    easing = 'ease-out',
    scrollerRef,
  } = options;

  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const animationRef = useRef<number | null>(null);

  const scrollTo = useCallback(
    (target: number | string | HTMLElement) => {
      if (!enabled) return;

      let targetPosition: number;

      if (typeof target === 'number') {
        targetPosition = target;
      } else if (typeof target === 'string') {
        const element = document.querySelector(target);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        targetPosition = rect.top + window.scrollY;
      } else {
        const rect = target.getBoundingClientRect();
        targetPosition = rect.top + window.scrollY;
      }

      const startPosition = window.scrollY;
      const distance = targetPosition - startPosition;
      const startTime = performance.now();
      const easeFn = getEasingFunction(easing);

      setIsScrolling(true);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const rawProgress = clamp(elapsed / duration, 0, 1);
        const easedProgress = easeFn(rawProgress);

        const currentPosition = startPosition + distance * easedProgress;
        window.scrollTo(0, currentPosition);
        setScrollY(currentPosition);

        if (rawProgress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsScrolling(false);
        }
      };

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    },
    [enabled, duration, easing]
  );

  useEffect(() => {
    const handleScroll = () => {
      if (!isScrolling) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isScrolling]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    scrollTo,
    isScrolling,
    scrollY,
  };
}

// ============================================
// 8. NAMED EXPORTS
// ============================================

export type {
  ParallaxDirection,
  ParallaxEasing,
  UseParallaxScrollOptions,
  UseParallaxScrollReturn,
  UseStaggerScrollOptions,
  UseStaggerScrollReturn,
  UseScrollProgressOptions,
  UseScrollProgressReturn,
  UseSmoothScrollOptions,
  UseSmoothScrollReturn,
};

export default useParallaxScroll;