// ============================================
// apps/frontend/src/components/landing/ui/SmoothScroll.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

'use client';

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

// ============================================
// 1. TYPES
// ============================================

type SmoothScrollDirection = 'vertical' | 'horizontal' | 'both';

type SmoothScrollEasing = (t: number) => number;

interface SmoothScrollOptions {
  /** Lerp factor: 0.1 = smooth, 1 = instant */
  lerp?: number;
  /** Scroll direction */
  direction?: SmoothScrollDirection;
  /** Custom easing function */
  easing?: SmoothScrollEasing;
  /** Whether to enable smooth wheel scrolling */
  smoothWheel?: boolean;
  /** Whether to enable smooth touch scrolling */
  smoothTouch?: boolean;
  /** Wheel multiplier (higher = faster scroll) */
  wheelMultiplier?: number;
  /** Touch multiplier */
  touchMultiplier?: number;
  /** Whether to enable infinite scroll (optional) */
  infinite?: boolean;
  /** Whether to normalize wheel speed across browsers */
  normalizeWheel?: boolean;
  /** Whether to respect prefers-reduced-motion */
  respectReducedMotion?: boolean;
  /** Callback on scroll progress change */
  onProgress?: (progress: { x: number; y: number }) => void;
  /** Callback on scroll start */
  onScrollStart?: () => void;
  /** Callback on scroll end */
  onScrollEnd?: () => void;
}

interface SmoothScrollProps {
  children: React.ReactNode;
  options?: SmoothScrollOptions;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Whether to disable on mobile */
  mobileDisable?: boolean;
  /** Breakpoint for mobile disable (px) */
  mobileBreakpoint?: number;
}

export interface SmoothScrollHandle {
  scrollTo: (target: number | HTMLElement | string, options?: { offset?: number; duration?: number }) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getProgress: () => { x: number; y: number };
  getScrollPosition: () => { x: number; y: number };
  update: () => void;
  destroy: () => void;
}

// ============================================
// 2. EASING FUNCTIONS
// ============================================

const EASING: Record<string, SmoothScrollEasing> = {
  // Default eased-out lerp
  easeOutExpo: (t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },

  // Smooth linear interpolation
  easeInOutQuad: (t: number): number => {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  // Bouncy easing
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  // Spring-like easing
  easeOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return (
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
    );
  },
};

// ============================================
// 3. MAIN COMPONENT
// ============================================

export const SmoothScroll = forwardRef<SmoothScrollHandle, SmoothScrollProps>(
  (
    {
      children,
      options = {},
      className = '',
      style,
      id = 'smooth-scroll',
      mobileDisable = false,
      mobileBreakpoint = 1024,
    },
    ref
  ) => {
    // ============================================
    // Component State
    // ============================================

    const [isEnabled, setIsEnabled] = useState(true);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollPositionRef = useRef({ x: 0, y: 0 });
    const targetScrollRef = useRef({ x: 0, y: 0 });
    const velocityRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isWheelScrollingRef = useRef(false);
    const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartRef = useRef({ x: 0, y: 0 });

    // ============================================
    // Options Destructuring with Defaults
    // ============================================

    const {
      lerp = 0.075,
      direction = 'vertical',
      easing = EASING.easeOutExpo,
      smoothWheel = true,
      smoothTouch = true,
      wheelMultiplier = 1,
      touchMultiplier = 1.8,
      infinite = false,
      normalizeWheel = true,
      respectReducedMotion = true,
      onProgress,
      onScrollStart,
      onScrollEnd,
    } = options;

    // ============================================
    // Reduced Motion Check
    // ============================================

    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
      if (respectReducedMotion && prefersReducedMotion) {
        setIsEnabled(false);
      }
    }, [respectReducedMotion, prefersReducedMotion]);

    // ============================================
    // Mobile Detection
    // ============================================

    useEffect(() => {
      if (!mobileDisable) return;

      const checkMobile = () => {
        const isMobile = window.innerWidth < mobileBreakpoint;
        setIsEnabled(!isMobile);
      };

      checkMobile();

      const handleResize = () => {
        checkMobile();
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [mobileDisable, mobileBreakpoint]);

    // ============================================
    // Core Animation Loop
    // ============================================

    const animate = useCallback(() => {
      if (!isEnabled) return;

      const current = scrollPositionRef.current;
      const target = targetScrollRef.current;

      // Apply lerp interpolation with easing
      const easedLerp = easing(lerp);

      const diffX = target.x - current.x;
      const diffY = target.y - current.y;

      if (direction === 'vertical') {
        current.y += diffY * easedLerp;
      } else if (direction === 'horizontal') {
        current.x += diffX * easedLerp;
      } else {
        current.x += diffX * easedLerp;
        current.y += diffY * easedLerp;
      }

      // Apply transform to content
      if (contentRef.current) {
        const transformX = direction === 'horizontal' || direction === 'both' ? -current.x : 0;
        const transformY = direction === 'vertical' || direction === 'both' ? -current.y : 0;

        contentRef.current.style.transform = `translate3d(${transformX}px, ${transformY}px, 0)`;
      }

      // Update container scroll values for native scroll events
      if (containerRef.current) {
        containerRef.current.scrollLeft = current.x;
        containerRef.current.scrollTop = current.y;
      }

      // Call progress callback
      if (onProgress) {
        const maxScroll = getMaxScroll();
        const progress = {
          x: maxScroll.x > 0 ? current.x / maxScroll.x : 0,
          y: maxScroll.y > 0 ? current.y / maxScroll.y : 0,
        };
        onProgress(progress);
      }

      // Check if scrolling should stop
      const isCloseToTarget =
        Math.abs(diffX) < 0.1 && Math.abs(diffY) < 0.1;

      if (isCloseToTarget && isScrollingRef.current) {
        isScrollingRef.current = false;
        onScrollEnd?.();

        // Snap to exact target
        current.x = target.x;
        current.y = target.y;
      }

      rafRef.current = requestAnimationFrame(animate);
    }, [isEnabled, lerp, direction, easing, onProgress, onScrollEnd]);

    // ============================================
    // Start/Stop Animation Loop
    // ============================================

    const startAnimation = useCallback(() => {
      if (!isEnabled || rafRef.current) return;
      rafRef.current = requestAnimationFrame(animate);
    }, [isEnabled, animate]);

    const stopAnimation = useCallback(() => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, []);

    // ============================================
    // Get Maximum Scroll Values
    // ============================================

    const getMaxScroll = useCallback(() => {
      if (!containerRef.current || !contentRef.current) return { x: 0, y: 0 };

      const containerRect = containerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();

      return {
        x: Math.max(0, contentRect.width - containerRect.width),
        y: Math.max(0, contentRect.height - containerRect.height),
      };
    }, []);

    // ============================================
    // Clamp Scroll Position
    // ============================================

    const clampScroll = useCallback(
      (x: number, y: number) => {
        if (infinite) return { x, y };

        const maxScroll = getMaxScroll();

        return {
          x: Math.max(0, Math.min(x, maxScroll.x)),
          y: Math.max(0, Math.min(y, maxScroll.y)),
        };
      },
      [infinite, getMaxScroll]
    );

    // ============================================
    // Set Target Scroll Position
    // ============================================

    const setTargetScroll = useCallback(
      (x: number, y: number) => {
        const clamped = clampScroll(x, y);
        targetScrollRef.current = clamped;

        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          onScrollStart?.();
        }

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
          onScrollEnd?.();
        }, 150);
      },
      [clampScroll, onScrollStart, onScrollEnd]
    );

    // ============================================
    // Event Handlers
    // ============================================

    const handleWheel = useCallback(
      (event: WheelEvent) => {
        if (!isEnabled || !smoothWheel) return;

        event.preventDefault();

        const current = scrollPositionRef.current;
        let deltaX = event.deltaX;
        let deltaY = event.deltaY;

        // Normalize wheel speed
        if (normalizeWheel) {
          const absDeltaX = Math.abs(deltaX);
          const absDeltaY = Math.abs(deltaY);

          if (absDeltaX > absDeltaY) {
            deltaX = Math.sign(deltaX) * Math.min(absDeltaX, 100);
          } else {
            deltaY = Math.sign(deltaY) * Math.min(absDeltaY, 100);
          }
        }

        // Apply multiplier
        deltaX *= wheelMultiplier;
        deltaY *= wheelMultiplier;

        setTargetScroll(current.x + deltaX, current.y + deltaY);

        // Mark as wheel scrolling
        isWheelScrollingRef.current = true;
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current);
        }
        wheelTimeoutRef.current = setTimeout(() => {
          isWheelScrollingRef.current = false;
        }, 200);
      },
      [isEnabled, smoothWheel, wheelMultiplier, normalizeWheel, setTargetScroll]
    );

    const handleTouchStart = useCallback(
      (event: TouchEvent) => {
        if (!isEnabled || !smoothTouch) return;

        // Allow native scrolling for elements with overflow
        const target = event.target as HTMLElement;
        if (target.closest('[data-native-scroll]')) return;

        const touch = event.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };

        // Store current velocity for momentum
        velocityRef.current = { x: 0, y: 0 };
      },
      [isEnabled, smoothTouch]
    );

    const handleTouchMove = useCallback(
      (event: TouchEvent) => {
        if (!isEnabled || !smoothTouch) return;

        const target = event.target as HTMLElement;
        if (target.closest('[data-native-scroll]')) return;

        const touch = event.touches[0];
        const deltaX = (touchStartRef.current.x - touch.clientX) * touchMultiplier;
        const deltaY = (touchStartRef.current.y - touch.clientY) * touchMultiplier;

        const current = scrollPositionRef.current;

        setTargetScroll(current.x + deltaX, current.y + deltaY);

        // Update velocity for momentum
        velocityRef.current = {
          x: deltaX,
          y: deltaY,
        };

        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      },
      [isEnabled, smoothTouch, touchMultiplier, setTargetScroll]
    );

    const handleTouchEnd = useCallback(() => {
      if (!isEnabled || !smoothTouch) return;

      // Apply momentum scrolling
      const momentum = 0.95;
      const maxMomentum = 50;

      const applyMomentum = () => {
        const velocity = velocityRef.current;

        if (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1) return;

        velocity.x = Math.max(-maxMomentum, Math.min(maxMomentum, velocity.x * momentum));
        velocity.y = Math.max(-maxMomentum, Math.min(maxMomentum, velocity.y * momentum));

        const current = scrollPositionRef.current;
        setTargetScroll(current.x + velocity.x, current.y + velocity.y);

        requestAnimationFrame(applyMomentum);
      };

      applyMomentum();
    }, [isEnabled, smoothTouch, setTargetScroll]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (!isEnabled) return;

        const current = scrollPositionRef.current;
        const scrollAmount = 100;

        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            setTargetScroll(current.x, current.y - scrollAmount);
            break;
          case 'ArrowDown':
            event.preventDefault();
            setTargetScroll(current.x, current.y + scrollAmount);
            break;
          case 'ArrowLeft':
            event.preventDefault();
            setTargetScroll(current.x - scrollAmount, current.y);
            break;
          case 'ArrowRight':
            event.preventDefault();
            setTargetScroll(current.x + scrollAmount, current.y);
            break;
          case 'Home':
            event.preventDefault();
            setTargetScroll(0, 0);
            break;
          case 'End':
            event.preventDefault();
            const maxScroll = getMaxScroll();
            setTargetScroll(maxScroll.x, maxScroll.y);
            break;
        }
      },
      [isEnabled, setTargetScroll, getMaxScroll]
    );

    const handleResize = useCallback(() => {
      // Ensure scroll position stays within bounds on resize
      const current = scrollPositionRef.current;
      const clamped = clampScroll(current.x, current.y);
      targetScrollRef.current = clamped;
      scrollPositionRef.current = clamped;
    }, [clampScroll]);

    // ============================================
    // Public Methods (Exposed via Ref)
    // ============================================

    const scrollTo = useCallback(
      (
        target: number | HTMLElement | string,
        scrollOptions: { offset?: number; duration?: number } = {}
      ) => {
        const { offset = 0 } = scrollOptions;

        if (typeof target === 'number') {
          setTargetScroll(
            direction === 'horizontal' || direction === 'both' ? target : 0,
            direction === 'vertical' || direction === 'both' ? target : 0
          );
        } else if (target instanceof HTMLElement) {
          const elementRect = target.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();

          if (containerRect) {
            const scrollX = elementRect.left - containerRect.left + scrollPositionRef.current.x + offset;
            const scrollY = elementRect.top - containerRect.top + scrollPositionRef.current.y + offset;

            setTargetScroll(scrollX, scrollY);
          }
        } else if (typeof target === 'string') {
          const element = document.querySelector(target) as HTMLElement;
          if (element) {
            scrollTo(element, scrollOptions);
          }
        }
      },
      [direction, setTargetScroll]
    );

    const scrollToTop = useCallback(() => {
      setTargetScroll(0, 0);
    }, [setTargetScroll]);

    const scrollToBottom = useCallback(() => {
      const maxScroll = getMaxScroll();
      setTargetScroll(maxScroll.x, maxScroll.y);
    }, [setTargetScroll, getMaxScroll]);

    const getProgress = useCallback(() => {
      const current = scrollPositionRef.current;
      const maxScroll = getMaxScroll();
      return {
        x: maxScroll.x > 0 ? current.x / maxScroll.x : 0,
        y: maxScroll.y > 0 ? current.y / maxScroll.y : 0,
      };
    }, [getMaxScroll]);

    const getScrollPosition = useCallback(() => {
      return { ...scrollPositionRef.current };
    }, []);

    const update = useCallback(() => {
      handleResize();
    }, [handleResize]);

    const destroy = useCallback(() => {
      stopAnimation();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    }, [stopAnimation]);

    // ============================================
    // Expose Public API
    // ============================================

    useImperativeHandle(
      ref,
      () => ({
        scrollTo,
        scrollToTop,
        scrollToBottom,
        getProgress,
        getScrollPosition,
        update,
        destroy,
      }),
      [scrollTo, scrollToTop, scrollToBottom, getProgress, getScrollPosition, update, destroy]
    );

    // ============================================
    // Effects: Event Listeners
    // ============================================

    useEffect(() => {
      startAnimation();

      const container = containerRef.current;
      if (!container) return;

      // Wheel event with passive: false to allow preventDefault
      container.addEventListener('wheel', handleWheel, { passive: false });

      // Touch events
      if (smoothTouch) {
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd);
      }

      // Keyboard events
      window.addEventListener('keydown', handleKeyDown);

      // Resize handler
      window.addEventListener('resize', handleResize);

      return () => {
        stopAnimation();
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      };
    }, [
      startAnimation,
      stopAnimation,
      handleWheel,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleKeyDown,
      handleResize,
      smoothTouch,
    ]);

    // ============================================
    // 4. RENDER
    // ============================================

    return (
      <div
        ref={containerRef}
        id={id}
        className={`
          relative overflow-hidden
          ${isEnabled ? 'fixed inset-0' : ''}
          ${className}
        `}
        style={{
          ...style,
          // Hide native scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Native scrollbar hide for WebKit */}
        <style>{`
          #${id}::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          className={`
            ${isEnabled ? 'will-change-transform' : ''}
          `}
          style={{
            transition: isEnabled ? 'none' : 'none',
          }}
        >
          {children}
        </div>

        {/* Scroll Progress Bar (optional visual indicator) */}
        {isEnabled && onProgress && (
          <ScrollProgressIndicator
            direction={direction}
            onProgress={onProgress}
          />
        )}
      </div>
    );
  }
);

// ============================================
// 5. SCROLL PROGRESS INDICATOR (Sub-component)
// ============================================

interface ScrollProgressIndicatorProps {
  direction: SmoothScrollDirection;
  onProgress: (progress: { x: number; y: number }) => void;
}

const ScrollProgressIndicator: React.FC<ScrollProgressIndicatorProps> = ({
  direction,
}) => {
  const [progress, setProgress] = useState(0);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Listen to custom scroll progress events
  useEffect(() => {
    const handleScrollProgress = (event: CustomEvent) => {
      const { x, y } = event.detail;
      const p = direction === 'horizontal' ? x : y;
      setProgress(p * 100);
    };

    window.addEventListener('smooth-scroll-progress', handleScrollProgress as EventListener);
    return () => {
      window.removeEventListener('smooth-scroll-progress', handleScrollProgress as EventListener);
    };
  }, [direction]);

  if (progress < 1) return null;

  return (
    <div
      ref={indicatorRef}
      className="fixed top-0 left-0 right-0 z-50 h-[2px] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-200"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// ============================================
// 6. CUSTOM HOOK: useReducedMotion
// ============================================

// This should be in hooks/landing/useReducedMotion.ts
// Included here for completeness

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================
// 7. USAGE EXAMPLE (Documentation)
// ============================================

/*
// Example usage in a page:

import { SmoothScroll, SmoothScrollHandle } from '@/components/landing/ui/SmoothScroll';
import { useRef } from 'react';

export default function LandingPage() {
  const smoothScrollRef = useRef<SmoothScrollHandle>(null);

  return (
    <SmoothScroll
      ref={smoothScrollRef}
      options={{
        lerp: 0.08,
        smoothWheel: true,
        smoothTouch: true,
        wheelMultiplier: 1,
        direction: 'vertical',
        easing: SmoothScroll.EASING.easeOutExpo,
      }}
      mobileDisable={false}
    >
      <section className="h-screen bg-dark flex items-center justify-center">
        <h1 className="text-5xl font-bold text-white">Hero Section</h1>
        <button
          onClick={() => smoothScrollRef.current?.scrollToBottom()}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white"
        >
          Scroll to Bottom
        </button>
      </section>

      <section
        id="features"
        className="h-screen bg-[#111827] flex items-center justify-center"
      >
        <h2 className="text-3xl font-semibold text-white">Features</h2>
      </section>

      <section className="h-screen bg-dark flex items-center justify-center">
        <h2 className="text-3xl font-semibold text-white">Pricing</h2>
        <button
          onClick={() => smoothScrollRef.current?.scrollTo('#features', { offset: -50 })}
        >
          Back to Features
        </button>
      </section>
    </SmoothScroll>
  );
}
*/

// ============================================
// 8. DISPLAY NAME
// ============================================

SmoothScroll.displayName = 'SmoothScroll';
ScrollProgressIndicator.displayName = 'ScrollProgressIndicator';

// ============================================
// 9. NAMED EXPORTS
// ============================================

export {
  EASING,
  ScrollProgressIndicator,
  useReducedMotion,
};

// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  SmoothScrollDirection,
  SmoothScrollEasing,
  SmoothScrollOptions,
  SmoothScrollProps,
  SmoothScrollHandle,
};

// ============================================
// 11. DEFAULT EXPORT
// ============================================

export default SmoothScroll;