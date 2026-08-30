// ============================================
// apps/frontend/src/components/landing/ui/RevealAnimation.tsx
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
  Children,
  isValidElement,
  cloneElement,
} from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type RevealDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'none';

type RevealEasing =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier'
  | 'spring'
  | 'bounce';

type RevealPreset =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'blur-in'
  | 'rotate-in'
  | 'flip-in'
  | 'custom';

type RevealTrigger =
  | 'scroll'
  | 'mount'
  | 'hover'
  | 'click'
  | 'manual';

type RevealState =
  | 'hidden'
  | 'revealing'
  | 'revealed'
  | 'exiting';

interface RevealAnimationProps {
  /** Children to animate */
  children: ReactNode;
  /** Animation preset */
  preset?: RevealPreset;
  /** Reveal direction */
  direction?: RevealDirection;
  /** Animation duration in ms */
  duration?: number;
  /** Delay before animation starts in ms */
  delay?: number;
  /** Easing function */
  easing?: RevealEasing;
  /** Custom cubic-bezier values */
  cubicBezier?: [number, number, number, number];
  /** Trigger type */
  trigger?: RevealTrigger;
  /** Whether to animate only once */
  once?: boolean;
  /** Whether to reset animation when element leaves viewport */
  resetOnExit?: boolean;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer (0–1) */
  threshold?: number;
  /** Stagger delay between children in ms */
  staggerDelay?: number;
  /** Stagger direction */
  staggerDirection?: 'forward' | 'reverse';
  /** Whether to apply stagger to direct children */
  staggerChildren?: boolean;
  /** Whether to animate in sequence */
  sequence?: boolean;
  /** Initial opacity */
  initialOpacity?: number;
  /** Initial scale */
  initialScale?: number;
  /** Initial blur amount */
  initialBlur?: number;
  /** Initial rotation (degrees) */
  initialRotation?: number;
  /** Initial translation distance in px */
  initialDistance?: number;
  /** Whether to clip overflow during animation */
  clipOverflow?: boolean;
  /** Whether to respect reduced motion preferences */
  respectReducedMotion?: boolean;
  /** Whether the element is currently revealed (controlled mode) */
  revealed?: boolean;
  /** Callback when animation starts */
  onRevealStart?: () => void;
  /** Callback when animation completes */
  onRevealComplete?: () => void;
  /** Callback when element exits (if resetOnExit) */
  onExit?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
  /** HTML element tag to render */
  as?: keyof JSX.IntrinsicElements;
}

// ============================================
// 2. CONSTANTS
// ============================================

const PRESET_CONFIG: Record<
  RevealPreset,
  {
    initial: Record<string, string | number>;
    animate: Record<string, string | number>;
    exit?: Record<string, string | number>;
    defaultDuration: number;
    defaultEasing: RevealEasing;
  }
> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    defaultDuration: 600,
    defaultEasing: 'ease-out',
  },
  'slide-up': {
    initial: { opacity: 0, transform: 'translateY(40px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
    exit: { opacity: 0, transform: 'translateY(-40px)' },
    defaultDuration: 700,
    defaultEasing: 'ease-out',
  },
  'slide-down': {
    initial: { opacity: 0, transform: 'translateY(-40px)' },
    animate: { opacity: 1, transform: 'translateY(0)' },
    exit: { opacity: 0, transform: 'translateY(40px)' },
    defaultDuration: 700,
    defaultEasing: 'ease-out',
  },
  'slide-left': {
    initial: { opacity: 0, transform: 'translateX(40px)' },
    animate: { opacity: 1, transform: 'translateX(0)' },
    exit: { opacity: 0, transform: 'translateX(-40px)' },
    defaultDuration: 700,
    defaultEasing: 'ease-out',
  },
  'slide-right': {
    initial: { opacity: 0, transform: 'translateX(-40px)' },
    animate: { opacity: 1, transform: 'translateX(0)' },
    exit: { opacity: 0, transform: 'translateX(40px)' },
    defaultDuration: 700,
    defaultEasing: 'ease-out',
  },
  scale: {
    initial: { opacity: 0, transform: 'scale(0.8)' },
    animate: { opacity: 1, transform: 'scale(1)' },
    defaultDuration: 600,
    defaultEasing: 'ease-out',
  },
  'blur-in': {
    initial: { opacity: 0, filter: 'blur(10px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    defaultDuration: 800,
    defaultEasing: 'ease-out',
  },
  'rotate-in': {
    initial: { opacity: 0, transform: 'rotate(-8deg) scale(0.95)' },
    animate: { opacity: 1, transform: 'rotate(0deg) scale(1)' },
    defaultDuration: 800,
    defaultEasing: 'ease-out',
  },
  'flip-in': {
    initial: { opacity: 0, transform: 'perspective(600px) rotateX(-20deg)' },
    animate: { opacity: 1, transform: 'perspective(600px) rotateX(0deg)' },
    defaultDuration: 900,
    defaultEasing: 'ease-out',
  },
  custom: {
    initial: {},
    animate: {},
    defaultDuration: 600,
    defaultEasing: 'ease-out',
  },
};

const EASING_MAP: Record<RevealEasing, string> = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  'cubic-bezier': 'cubic-bezier(0.25, 0.1, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

const DIRECTION_OFFSETS: Record<RevealDirection, { x: number; y: number }> = {
  up: { x: 0, y: 40 },
  down: { x: 0, y: -40 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
  none: { x: 0, y: 0 },
};

// ============================================
// 3. HELPER: Get Easing Value
// ============================================

const getEasingValue = (
  easing: RevealEasing,
  cubicBezier?: [number, number, number, number]
): string => {
  if (easing === 'cubic-bezier' && cubicBezier) {
    return `cubic-bezier(${cubicBezier.join(', ')})`;
  }
  return EASING_MAP[easing] || 'ease-out';
};

// ============================================
// 4. SUB-COMPONENT: Reveal Item (for stagger)
// ============================================

interface RevealItemProps {
  children: ReactNode;
  style: React.CSSProperties;
  className?: string;
}

const RevealItem: React.FC<RevealItemProps> = ({
  children,
  style,
  className = '',
}) => {
  return (
    <div
      className={`reveal-item ${className}`}
      style={{
        ...style,
        willChange: 'transform, opacity, filter',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {children}
    </div>
  );
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

export const RevealAnimation: React.FC<RevealAnimationProps> = ({
  children,
  preset = 'slide-up',
  direction = 'up',
  duration,
  delay = 0,
  easing,
  cubicBezier,
  trigger = 'scroll',
  once = true,
  resetOnExit = false,
  rootMargin = '0px 0px -50px 0px',
  threshold = 0.1,
  staggerDelay = 100,
  staggerDirection = 'forward',
  staggerChildren = false,
  sequence = false,
  initialOpacity = 0,
  initialScale = 1,
  initialBlur = 0,
  initialRotation = 0,
  initialDistance = 40,
  clipOverflow = false,
  respectReducedMotion = true,
  revealed: controlledRevealed,
  onRevealStart,
  onRevealComplete,
  onExit,
  className = '',
  style,
  id,
  as: Component = 'div',
}) => {
  // ============================================
  // State
  // ============================================

  const [revealState, setRevealState] = useState<RevealState>('hidden');
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRevealedRef = useRef(false);

  // ============================================
  // Derived Values
  // ============================================

  const presetConfig = PRESET_CONFIG[preset];

  const effectiveDuration = duration || presetConfig.defaultDuration;
  const effectiveEasing = easing || presetConfig.defaultEasing;
  const easingValue = getEasingValue(effectiveEasing, cubicBezier);

  const isControlled = controlledRevealed !== undefined;
  const isRevealed = isControlled ? controlledRevealed : revealState === 'revealed';

  const directionOffset = DIRECTION_OFFSETS[direction];

  // Build transform from individual properties
  const buildTransform = (
    opacity: number,
    scale: number,
    blur: number,
    rotation: number,
    offsetX: number,
    offsetY: number
  ): Record<string, string | number> => {
    const transforms: string[] = [];

    if (scale !== 1) transforms.push(`scale(${scale})`);
    if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
    if (offsetX !== 0 || offsetY !== 0) transforms.push(`translate(${offsetX}px, ${offsetY}px)`);

    const result: Record<string, string | number> = {
      opacity,
    };

    if (transforms.length > 0) {
      result.transform = transforms.join(' ');
    }

    if (blur > 0) {
      result.filter = `blur(${blur}px)`;
    }

    return result;
  };

  // Calculate animation styles based on preset or custom properties
  const animationStyles = useMemo(() => {
    // Use preset
    if (preset !== 'custom') {
      return {
        hidden: presetConfig.initial,
        visible: presetConfig.animate,
        exit: presetConfig.exit || presetConfig.initial,
      };
    }

    // Custom animation from individual properties
    const offsetX = directionOffset.x * (initialDistance / 40);
    const offsetY = directionOffset.y * (initialDistance / 40);

    return {
      hidden: buildTransform(
        initialOpacity,
        initialScale,
        initialBlur,
        initialRotation,
        offsetX,
        offsetY
      ),
      visible: buildTransform(1, 1, 0, 0, 0, 0),
      exit: buildTransform(
        initialOpacity,
        initialScale,
        initialBlur,
        -initialRotation,
        -offsetX,
        -offsetY
      ),
    };
  }, [preset, presetConfig, directionOffset, initialOpacity, initialScale, initialBlur, initialRotation, initialDistance]);

  // ============================================
  // Effects: Reduced Motion Detection
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
  // Effects: Intersection Observer (scroll trigger)
  // ============================================

  useEffect(() => {
    if (trigger !== 'scroll' || !containerRef.current || isControlled) return;
    if (shouldReduceMotion) {
      setRevealState('revealed');
      return;
    }

    const element = containerRef.current;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (!hasRevealedRef.current || !once) {
            handleReveal();
          }
        } else if (resetOnExit && hasRevealedRef.current) {
          setIsInView(false);
          handleExit();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [trigger, threshold, rootMargin, once, resetOnExit, isControlled, shouldReduceMotion]);

  // ============================================
  // Effects: Mount trigger
  // ============================================

  useEffect(() => {
    if (trigger === 'mount' && !isControlled && !shouldReduceMotion) {
      const timer = setTimeout(handleReveal, delay);
      return () => clearTimeout(timer);
    }
    if ((trigger === 'mount' && shouldReduceMotion) || (trigger === 'mount' && isControlled && controlledRevealed)) {
      setRevealState('revealed');
    }
  }, [trigger, isControlled, shouldReduceMotion, controlledRevealed]);

  // ============================================
  // Effects: Controlled mode
  // ============================================

  useEffect(() => {
    if (!isControlled) return;

    if (controlledRevealed && revealState === 'hidden') {
      handleReveal();
    } else if (!controlledRevealed && revealState === 'revealed') {
      handleExit();
    }
  }, [controlledRevealed, isControlled]);

  // ============================================
  // Handlers
  // ============================================

  const handleReveal = useCallback(() => {
    if (shouldReduceMotion) {
      setRevealState('revealed');
      return;
    }

    setRevealState('revealing');
    onRevealStart?.();

    hasRevealedRef.current = true;

    // Clear any pending timeouts
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      setRevealState('revealed');
      onRevealComplete?.();
    }, effectiveDuration + delay);
  }, [shouldReduceMotion, effectiveDuration, delay, onRevealStart, onRevealComplete]);

  const handleExit = useCallback(() => {
    setRevealState('exiting');
    onExit?.();

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = setTimeout(() => {
      setRevealState('hidden');
      hasRevealedRef.current = false;
    }, effectiveDuration);
  }, [effectiveDuration, onExit]);

  const handleHover = useCallback(() => {
    if (trigger === 'hover' && !isControlled && !shouldReduceMotion) {
      handleReveal();
    }
  }, [trigger, isControlled, shouldReduceMotion, handleReveal]);

  const handleClick = useCallback(() => {
    if (trigger === 'click' && !isControlled && !shouldReduceMotion) {
      if (revealState === 'revealed' && resetOnExit) {
        handleExit();
      } else {
        handleReveal();
      }
    }
  }, [trigger, isControlled, shouldReduceMotion, revealState, resetOnExit, handleReveal, handleExit]);

  // ============================================
  // Derived: Current Style
  // ============================================

  const getCurrentStyle = useCallback((): React.CSSProperties => {
    const isAnimating = revealState === 'revealing';
    const isExiting = revealState === 'exiting';
    const isVisible = revealState === 'revealed';

    const baseStyle: React.CSSProperties = {
      transition: isAnimating
        ? `all ${effectiveDuration}ms ${easingValue} ${delay}ms`
        : isExiting
          ? `all ${effectiveDuration}ms ${easingValue}`
          : 'none',
      willChange: isAnimating || isExiting ? 'transform, opacity, filter' : 'auto',
    };

    if (isVisible && !isExiting) {
      return { ...baseStyle, ...animationStyles.visible };
    }

    if (isExiting) {
      return { ...baseStyle, ...animationStyles.exit };
    }

    return { ...baseStyle, ...animationStyles.hidden };
  }, [revealState, animationStyles, effectiveDuration, easingValue, delay]);

  const containerStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      ...getCurrentStyle(),
      ...style,
    };

    if (clipOverflow && revealState === 'hidden') {
      base.overflow = 'hidden';
    }

    return base;
  }, [getCurrentStyle, style, clipOverflow, revealState]);

  // ============================================
  // Render: Staggered Children
  // ============================================

  const renderStaggeredChildren = (): ReactNode => {
    if (!staggerChildren) return children;

    const childArray = Children.toArray(children);
    const orderedChildren =
      staggerDirection === 'reverse' ? [...childArray].reverse() : childArray;

    return orderedChildren.map((child, index) => {
      const staggerIndex = staggerDirection === 'reverse'
        ? childArray.length - 1 - index
        : index;

      const itemDelay = sequence
        ? staggerIndex * staggerDelay
        : staggerIndex * staggerDelay;

      const itemStyle: React.CSSProperties = {
        transition: `all ${effectiveDuration}ms ${easingValue} ${itemDelay + delay}ms`,
        ...(revealState === 'revealed' || revealState === 'revealing'
          ? animationStyles.visible
          : revealState === 'exiting'
            ? animationStyles.exit
            : animationStyles.hidden),
      };

      return (
        <RevealItem key={index} style={itemStyle}>
          {child}
        </RevealItem>
      );
    });
  };

  // ============================================
  // 6. MAIN RENDER
  // ============================================

  return (
    <Component
      ref={containerRef}
      id={id}
      className={`
        ${clipOverflow && revealState === 'hidden' ? 'overflow-hidden' : ''}
        ${className}
      `}
      style={containerStyle}
      onMouseEnter={handleHover}
      onClick={handleClick}
      role={trigger === 'click' ? 'button' : undefined}
      tabIndex={trigger === 'click' ? 0 : undefined}
      aria-label={trigger === 'click' ? 'Reveal animation' : undefined}
    >
      {staggerChildren ? renderStaggeredChildren() : children}
    </Component>
  );
};

// ============================================
// 7. REVEAL GROUP COMPONENT (Stagger Container)
// ============================================

interface RevealGroupProps {
  children: ReactNode;
  preset?: RevealPreset;
  direction?: RevealDirection;
  duration?: number;
  staggerDelay?: number;
  staggerDirection?: 'forward' | 'reverse';
  sequence?: boolean;
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const RevealGroup: React.FC<RevealGroupProps> = ({
  children,
  preset = 'slide-up',
  direction = 'up',
  duration = 600,
  staggerDelay = 100,
  staggerDirection = 'forward',
  sequence = false,
  once = true,
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  className = '',
  style,
}) => {
  return (
    <div className={className} style={style}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        const delay = sequence
          ? index * staggerDelay
          : staggerDirection === 'forward'
            ? index * staggerDelay
            : (Children.count(children) - 1 - index) * staggerDelay;

        return (
          <RevealAnimation
            preset={preset}
            direction={direction}
            duration={duration}
            delay={delay}
            trigger="scroll"
            once={once}
            threshold={threshold}
            rootMargin={rootMargin}
          >
            {child}
          </RevealAnimation>
        );
      })}
    </div>
  );
};

// ============================================
// 8. REVEAL TEXT COMPONENT (Character/Word Stagger)
// ============================================

interface RevealTextProps {
  children: string;
  preset?: RevealPreset;
  duration?: number;
  staggerDelay?: number;
  staggerBy?: 'word' | 'character';
  once?: boolean;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

export const RevealText: React.FC<RevealTextProps> = ({
  children,
  preset = 'slide-up',
  duration = 500,
  staggerDelay = 30,
  staggerBy = 'word',
  once = true,
  className = '',
  style,
  as: Component = 'span',
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsRevealed(false);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [once]);

  const presetConfig = PRESET_CONFIG[preset];
  const easingValue = EASING_MAP[presetConfig.defaultEasing];
  const effectiveDuration = duration || presetConfig.defaultDuration;

  const items =
    staggerBy === 'word'
      ? children.split(' ')
      : children.split('');

  const displayItems =
    staggerBy === 'word'
      ? items.map((word, i) => (
          <span key={i} className="inline-block">
            {word}
            {i < items.length - 1 ? '\u00A0' : ''}
          </span>
        ))
      : items.map((char, i) => (
          <span key={i} className="inline-block">
            {char === ' ' ? '\u00A0' : char}
          </span>
        ));

  return (
    <Component
      ref={containerRef}
      className={`inline-flex flex-wrap ${className}`}
      style={{
        ...style,
        overflow: 'hidden',
        verticalAlign: 'bottom',
      }}
    >
      {displayItems.map((item, index) => (
        <span
          key={index}
          className="inline-block"
          style={{
            transition: `all ${effectiveDuration}ms ${easingValue} ${index * staggerDelay}ms`,
            ...(isRevealed ? presetConfig.animate : presetConfig.initial),
            willChange: 'transform, opacity',
          }}
        >
          {item}
        </span>
      ))}
    </Component>
  );
};

// ============================================
// 9. REVEAL IMAGE COMPONENT
// ============================================

interface RevealImageProps {
  src: string;
  alt: string;
  preset?: RevealPreset;
  duration?: number;
  delay?: number;
  once?: boolean;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const RevealImage: React.FC<RevealImageProps> = ({
  src,
  alt,
  preset = 'scale',
  duration = 800,
  delay = 0,
  once = true,
  width,
  height,
  className = '',
  style,
}) => {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ width, height, ...style }}
    >
      <RevealAnimation
        preset={preset}
        duration={duration}
        delay={delay}
        once={once}
        clipOverflow
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </RevealAnimation>
    </div>
  );
};

// ============================================
// 10. DISPLAY NAME
// ============================================

RevealAnimation.displayName = 'RevealAnimation';
RevealItem.displayName = 'RevealItem';
RevealGroup.displayName = 'RevealGroup';
RevealText.displayName = 'RevealText';
RevealImage.displayName = 'RevealImage';

// ============================================
// 11. NAMED EXPORTS
// ============================================

export {
  RevealItem,
  RevealGroup,
  RevealText,
  RevealImage,
  PRESET_CONFIG,
  EASING_MAP,
  DIRECTION_OFFSETS,
};

// ============================================
// 12. TYPE EXPORTS
// ============================================

export type {
  RevealDirection,
  RevealEasing,
  RevealPreset,
  RevealTrigger,
  RevealState,
  RevealAnimationProps,
  RevealItemProps,
  RevealGroupProps,
  RevealTextProps,
  RevealImageProps,
};

// ============================================
// 13. DEFAULT EXPORT
// ============================================

export default RevealAnimation;