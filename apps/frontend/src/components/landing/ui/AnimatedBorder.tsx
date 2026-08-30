// ============================================
// apps/frontend/src/components/landing/ui/AnimatedBorder.tsx
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

type BorderAnimationType =
  | 'rotate'
  | 'dash'
  | 'pulse'
  | 'gradient-flow'
  | 'marching-ants'
  | 'sparkle'
  | 'rainbow'
  | 'double-pulse'
  | 'breath'
  | 'wave';

type BorderPosition = 'all' | 'top' | 'bottom' | 'left' | 'right' | 'top-bottom' | 'left-right';

type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove';

type GradientDirection =
  | 'to-right'
  | 'to-bottom'
  | 'to-left'
  | 'to-top'
  | 'to-top-right'
  | 'to-bottom-right'
  | 'to-bottom-left'
  | 'to-top-left';

interface GradientStop {
  offset: number; // 0-100
  color: string;
}

interface BorderColors {
  colors: string[];
  stops?: GradientStop[];
  direction?: GradientDirection;
}

interface AnimatedBorderProps {
  /** Card content */
  children: ReactNode;
  /** Animation style */
  animation?: BorderAnimationType;
  /** Border width in pixels */
  borderWidth?: number;
  /** Border position */
  position?: BorderPosition;
  /** Border style (for dash animation) */
  borderStyle?: BorderStyle;
  /** Gradient colors for the border */
  gradientColors?: string[];
  /** Full gradient configuration */
  gradient?: BorderColors;
  /** Animation duration in seconds */
  duration?: number;
  /** Animation delay in seconds */
  delay?: number;
  /** Whether to reverse animation direction */
  reverse?: boolean;
  /** Whether the animation should pause */
  paused?: boolean;
  /** Border radius override */
  borderRadius?: number | string;
  /** Whether to show border only on hover */
  showOnHover?: boolean;
  /** Whether to show glow effect */
  glow?: boolean;
  /** Glow color */
  glowColor?: string;
  /** Glow intensity (0-1) */
  glowIntensity?: number;
  /** Whether to add inner shadow */
  innerShadow?: boolean;
  /** Whether card is interactive */
  interactive?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** HTML element tag to render */
  as?: keyof JSX.IntrinsicElements;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Whether border is currently active */
  active?: boolean;
}

// ============================================
// 2. ANIMATION CONFIGURATIONS
// ============================================

const ANIMATION_CONFIG: Record<
  BorderAnimationType,
  {
    keyframes: string;
    defaultDuration: number;
    description: string;
  }
> = {
  rotate: {
    keyframes: 'animated-border-rotate',
    defaultDuration: 3,
    description: 'Rotating gradient border',
  },
  dash: {
    keyframes: 'animated-border-dash',
    defaultDuration: 1.5,
    description: 'Dashed border animation',
  },
  pulse: {
    keyframes: 'animated-border-pulse',
    defaultDuration: 2,
    description: 'Pulsing border glow',
  },
  'gradient-flow': {
    keyframes: 'animated-border-gradient-flow',
    defaultDuration: 4,
    description: 'Flowing gradient along border',
  },
  'marching-ants': {
    keyframes: 'animated-border-marching',
    defaultDuration: 1,
    description: 'Marching ants selection border',
  },
  sparkle: {
    keyframes: 'animated-border-sparkle',
    defaultDuration: 2.5,
    description: 'Sparkling particles on border',
  },
  rainbow: {
    keyframes: 'animated-border-rainbow',
    defaultDuration: 3,
    description: 'Rainbow color shifting border',
  },
  'double-pulse': {
    keyframes: 'animated-border-double-pulse',
    defaultDuration: 3,
    description: 'In-out pulsing border',
  },
  breath: {
    keyframes: 'animated-border-breath',
    defaultDuration: 4,
    description: 'Breathing opacity border',
  },
  wave: {
    keyframes: 'animated-border-wave',
    defaultDuration: 2,
    description: 'Wave ripple border effect',
  },
};

// ============================================
// 3. CSS ANIMATION KEYFRAMES (Generated)
// ============================================

const generateKeyframeStyles = (): string => {
  return `
    /* Rotate Animation */
    @keyframes animated-border-rotate {
      0% {
        --border-angle: 0deg;
      }
      100% {
        --border-angle: 360deg;
      }
    }

    /* Dash Animation */
    @keyframes animated-border-dash {
      0% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: -100;
      }
    }

    /* Pulse Animation */
    @keyframes animated-border-pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.5;
        transform: scale(1.005);
      }
    }

    /* Gradient Flow */
    @keyframes animated-border-gradient-flow {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }

    /* Marching Ants */
    @keyframes animated-border-marching {
      0% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: 24;
      }
    }

    /* Sparkle */
    @keyframes animated-border-sparkle {
      0%, 100% {
        opacity: 0.3;
      }
      25% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
      75% {
        opacity: 0.9;
      }
    }

    /* Rainbow */
    @keyframes animated-border-rainbow {
      0% {
        filter: hue-rotate(0deg);
      }
      100% {
        filter: hue-rotate(360deg);
      }
    }

    /* Double Pulse */
    @keyframes animated-border-double-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.8;
      }
      30% {
        transform: scale(1.008);
        opacity: 1;
      }
      60% {
        transform: scale(1);
        opacity: 0.5;
      }
      80% {
        transform: scale(1.006);
        opacity: 0.9;
      }
    }

    /* Breath */
    @keyframes animated-border-breath {
      0%, 100% {
        opacity: 0.3;
      }
      25% {
        opacity: 0.8;
      }
      50% {
        opacity: 0.4;
      }
      75% {
        opacity: 0.9;
      }
    }

    /* Wave */
    @keyframes animated-border-wave {
      0% {
        border-image-slice: 1;
        border-image-source: linear-gradient(90deg, transparent, currentColor, transparent);
      }
      50% {
        border-image-source: linear-gradient(270deg, currentColor, transparent, currentColor);
      }
      100% {
        border-image-source: linear-gradient(90deg, transparent, currentColor, transparent);
      }
    }

    /* Glow Pulse */
    @keyframes animated-border-glow-pulse {
      0%, 100% {
        box-shadow: 0 0 10px var(--glow-color, rgba(59, 130, 246, 0.3));
      }
      50% {
        box-shadow: 0 0 25px var(--glow-color, rgba(59, 130, 246, 0.6)),
                    0 0 50px var(--glow-color, rgba(59, 130, 246, 0.2));
      }
    }

    /* Corner Sparkle */
    @keyframes animated-border-corner-sparkle {
      0%, 100% {
        opacity: 0;
        transform: scale(0);
      }
      50% {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Shimmer */
    @keyframes animated-border-shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `;
};

// ============================================
// 4. MAIN COMPONENT
// ============================================

export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({
  children,
  animation = 'rotate',
  borderWidth = 2,
  position = 'all',
  borderStyle = 'solid',
  gradientColors = ['#3B82F6', '#7C3AED', '#EC4899'],
  gradient,
  duration,
  delay = 0,
  reverse = false,
  paused = false,
  borderRadius = 16,
  showOnHover = false,
  glow = false,
  glowColor = 'rgba(59, 130, 246, 0.4)',
  glowIntensity = 0.5,
  innerShadow = false,
  interactive = false,
  onClick,
  className = '',
  style,
  id,
  as: Component = 'div',
  respectReducedMotion = true,
  active = true,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [styleElementId] = useState(
    `animated-border-styles-${Math.random().toString(36).substr(2, 9)}`
  );
  const [isStyleInjected, setIsStyleInjected] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const animConfig = ANIMATION_CONFIG[animation];
  const effectiveDuration = duration || animConfig.defaultDuration;
  const isActive = active && (!showOnHover || isHovered);

  // Build gradient string
  const gradientString = useMemo(() => {
    if (gradient) {
      const colors = gradient.stops
        ? gradient.stops.map((stop) => `${stop.color} ${stop.offset}%`).join(', ')
        : gradient.colors.join(', ');
      const dir = gradient.direction || 'to-right';
      return `linear-gradient(${dir}, ${colors})`;
    }
    return `linear-gradient(to-right, ${gradientColors.join(', ')})`;
  }, [gradient, gradientColors]);

  // Border position classes
  const positionClasses = useMemo(() => {
    switch (position) {
      case 'top':
        return {
          borderTop: true,
          borderBottom: false,
          borderLeft: false,
          borderRight: false,
        };
      case 'bottom':
        return {
          borderTop: false,
          borderBottom: true,
          borderLeft: false,
          borderRight: false,
        };
      case 'left':
        return {
          borderTop: false,
          borderBottom: false,
          borderLeft: true,
          borderRight: false,
        };
      case 'right':
        return {
          borderTop: false,
          borderBottom: false,
          borderLeft: false,
          borderRight: true,
        };
      case 'top-bottom':
        return {
          borderTop: true,
          borderBottom: true,
          borderLeft: false,
          borderRight: false,
        };
      case 'left-right':
        return {
          borderTop: false,
          borderBottom: false,
          borderLeft: true,
          borderRight: true,
        };
      default:
        return {
          borderTop: true,
          borderBottom: true,
          borderLeft: true,
          borderRight: true,
        };
    }
  }, [position]);

  // ============================================
  // Effects: Reduced Motion Detection
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
  // Effects: Inject Keyframe Styles
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    // Check if styles already exist
    const existingStyle = document.getElementById(styleElementId);
    if (existingStyle) {
      setIsStyleInjected(true);
      return;
    }

    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = styleElementId;
    styleElement.textContent = generateKeyframeStyles();
    document.head.appendChild(styleElement);

    styleRef.current = styleElement;
    setIsStyleInjected(true);

    return () => {
      if (styleRef.current && document.head.contains(styleRef.current)) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, [styleElementId, isStyleInjected]);

  // ============================================
  // Handlers
  // ============================================

  const handleMouseEnter = useCallback(() => {
    if (showOnHover || interactive) {
      setIsHovered(true);
    }
  }, [showOnHover, interactive]);

  const handleMouseLeave = useCallback(() => {
    if (showOnHover || interactive) {
      setIsHovered(false);
    }
  }, [showOnHover, interactive]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (interactive && onClick) {
        onClick(event);
      }
    },
    [interactive, onClick]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (interactive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.(event as unknown as React.MouseEvent);
      }
    },
    [interactive, onClick]
  );

  // ============================================
  // 5. RENDER: Different Animation Styles
  // ============================================

  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: 'relative',
      borderRadius:
        typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      ...style,
    };

    if (interactive) {
      base.cursor = 'pointer';
    }

    return base;
  }, [borderRadius, style, interactive]);

  // Border wrapper style (the animated layer)
  const borderWrapperStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: 'absolute',
      inset: `-${borderWidth}px`,
      borderRadius: `calc(${
        typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
      } + ${borderWidth}px)`,
      pointerEvents: 'none',
      zIndex: 0,
      opacity: isActive ? 1 : 0,
      transition: `opacity ${effectiveDuration * 0.3}s ease-in-out`,
    };

    return base;
  }, [borderWidth, borderRadius, isActive, effectiveDuration]);

  // Inner content wrapper style
  const innerWrapperStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: 'relative',
      zIndex: 1,
      borderRadius:
        typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      background: 'inherit',
      width: '100%',
      height: '100%',
    };

    if (innerShadow) {
      base.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';
    }

    return base;
  }, [borderRadius, innerShadow]);

  // Glow effect style
  const glowStyle = useMemo((): CSSProperties | undefined => {
    if (!glow || !isActive) return undefined;

    return {
      position: 'absolute',
      inset: `-${borderWidth * 2}px`,
      borderRadius: `calc(${
        typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
      } + ${borderWidth * 2}px)`,
      background: glowColor,
      filter: `blur(${12 * glowIntensity}px)`,
      opacity: glowIntensity * 0.6,
      zIndex: -1,
      pointerEvents: 'none',
      animation:
        !shouldReduceMotion && glow
          ? `animated-border-glow-pulse ${effectiveDuration * 1.5}s ease-in-out infinite`
          : 'none',
      animationDelay: `${delay}s`,
    };
  }, [glow, glowColor, glowIntensity, borderWidth, borderRadius, isActive, shouldReduceMotion, effectiveDuration, delay]);

  // ============================================
  // 6. RENDER: SVG Border (for dash/marching-ants)
  // ============================================

  const renderSVGBorder = () => {
    if (animation !== 'dash' && animation !== 'marching-ants') return null;

    const svgWidth = '100%';
    const svgHeight = '100%';
    const rectRadius = typeof borderRadius === 'number' ? borderRadius : parseInt(borderRadius as string) || 16;
    const strokeColor = gradientColors[0] || '#3B82F6';
    const dashArray =
      animation === 'marching-ants' ? '8 4' : borderStyle === 'dashed' ? '10 6' : '20 10';
    const dashOffsetAnimation =
      animation === 'dash'
        ? `animated-border-dash ${effectiveDuration}s linear infinite`
        : `animated-border-marching ${effectiveDuration}s linear infinite`;

    return (
      <svg
        className="absolute inset-0 pointer-events-none z-0"
        width={svgWidth}
        height={svgHeight}
        style={{
          overflow: 'visible',
        }}
      >
        <rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={rectRadius}
          ry={rectRadius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={borderWidth}
          strokeDasharray={dashArray}
          opacity={isActive ? 1 : 0}
          style={{
            animation:
              !shouldReduceMotion && isActive
                ? `${dashOffsetAnimation}${
                    reverse ? ' reverse' : ''
                  }${paused ? ' paused' : ''}`
                : 'none',
            animationDelay: `${delay}s`,
            transition: `opacity ${effectiveDuration * 0.3}s ease-in-out`,
          }}
        />
      </svg>
    );
  };

  // ============================================
  // 7. RENDER: CSS Border (for rotate/gradient-flow/rainbow)
  // ============================================

  const renderCSSBorder = () => {
    if (
      animation === 'dash' ||
      animation === 'marching-ants' ||
      animation === 'wave' ||
      animation === 'sparkle'
    )
      return null;

    const animationName = animConfig.keyframes;
    const animationString =
      !shouldReduceMotion && isActive
        ? `${animationName} ${effectiveDuration}s linear infinite${
            reverse ? ' reverse' : ''
          }${paused ? ' paused' : ''}`
        : 'none';

    // For rotate animation, use conic-gradient
    if (animation === 'rotate') {
      return (
        <div
          className="absolute inset-0 z-0"
          style={{
            ...borderWrapperStyle,
            background: `conic-gradient(from var(--border-angle, 0deg), ${gradientColors.join(', ')}, ${gradientColors[0]})`,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: `${borderWidth}px`,
            animation: animationString,
            animationDelay: `${delay}s`,
            transition: borderWrapperStyle.transition,
          }}
        />
      );
    }

    // For gradient-flow and rainbow
    if (animation === 'gradient-flow' || animation === 'rainbow') {
      const bgSize =
        animation === 'gradient-flow' ? '200% 200%' : '400% 400%';

      return (
        <div
          className="absolute inset-0 z-0"
          style={{
            ...borderWrapperStyle,
            background: `linear-gradient(${
              animation === 'gradient-flow' ? '90deg' : 'var(--rainbow-angle, 0deg)'
            }, ${gradientColors.join(', ')})`,
            backgroundSize: bgSize,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: `${borderWidth}px`,
            animation: animationString,
            animationDelay: `${delay}s`,
            transition: borderWrapperStyle.transition,
          }}
        />
      );
    }

    // For pulse, double-pulse, breath
    if (
      animation === 'pulse' ||
      animation === 'double-pulse' ||
      animation === 'breath'
    ) {
      return (
        <div
          className="absolute inset-0 z-0"
          style={{
            ...borderWrapperStyle,
            background: gradientString,
            mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: `${borderWidth}px`,
            animation: animationString,
            animationDelay: `${delay}s`,
            transition: borderWrapperStyle.transition,
          }}
        />
      );
    }

    // Default gradient border
    return (
      <div
        className="absolute inset-0 z-0"
        style={{
          ...borderWrapperStyle,
          background: gradientString,
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: `${borderWidth}px`,
          animation: animationString,
          animationDelay: `${delay}s`,
          transition: borderWrapperStyle.transition,
        }}
      />
    );
  };

  // ============================================
  // 8. RENDER: Sparkle Effect (Corner Dots)
  // ============================================

  const renderSparkles = () => {
    if (animation !== 'sparkle') return null;

    const sparklePositions = [
      { top: -3, left: -3 },
      { top: -3, right: -3 },
      { bottom: -3, left: -3 },
      { bottom: -3, right: -3 },
    ];

    return (
      <>
        {sparklePositions.map((pos, index) => (
          <div
            key={`sparkle-${index}`}
            className="absolute z-10"
            style={{
              ...pos,
              width: `${borderWidth * 3}px`,
              height: `${borderWidth * 3}px`,
              borderRadius: '50%',
              background: gradientColors[index % gradientColors.length],
              opacity: isActive ? 1 : 0,
              animation:
                !shouldReduceMotion && isActive
                  ? `animated-border-sparkle ${effectiveDuration}s ease-in-out infinite${
                      index % 2 === 0 ? '' : ` ${effectiveDuration / 2}s`
                    }${paused ? ' paused' : ''}`
                  : 'none',
              animationDelay: `${delay + index * 0.15}s`,
              transition: `opacity ${effectiveDuration * 0.3}s ease-in-out`,
              boxShadow: `0 0 ${borderWidth * 2}px ${gradientColors[index % gradientColors.length]}`,
            }}
          />
        ))}

        {/* Middle sparkles */}
        {[
          { top: '50%', left: -2, transform: 'translateY(-50%)' },
          { top: '50%', right: -2, transform: 'translateY(-50%)' },
          { top: -2, left: '50%', transform: 'translateX(-50%)' },
          { bottom: -2, left: '50%', transform: 'translateX(-50%)' },
        ].map((pos, index) => (
          <div
            key={`sparkle-mid-${index}`}
            className="absolute z-10"
            style={{
              ...pos,
              width: `${borderWidth * 1.5}px`,
              height: `${borderWidth * 1.5}px`,
              borderRadius: '50%',
              background: gradientColors[(index + 2) % gradientColors.length],
              opacity: isActive ? 0.7 : 0,
              animation:
                !shouldReduceMotion && isActive
                  ? `animated-border-sparkle ${effectiveDuration * 0.8}s ease-in-out infinite${
                      index % 2 === 0 ? ` ${effectiveDuration / 3}s` : ''
                    }${paused ? ' paused' : ''}`
                  : 'none',
              animationDelay: `${delay + index * 0.2}s`,
              transition: `opacity ${effectiveDuration * 0.3}s ease-in-out`,
            }}
          />
        ))}
      </>
    );
  };

  // ============================================
  // 9. RENDER: Wave Effect
  // ============================================

  const renderWaveBorder = () => {
    if (animation !== 'wave') return null;

    return (
      <>
        {['top', 'bottom', 'left', 'right'].map((side) => {
          if (
            (side === 'top' && !positionClasses.borderTop) ||
            (side === 'bottom' && !positionClasses.borderBottom) ||
            (side === 'left' && !positionClasses.borderLeft) ||
            (side === 'right' && !positionClasses.borderRight)
          )
            return null;

          const isHorizontal = side === 'top' || side === 'bottom';
          const gradientDir = isHorizontal ? '90deg' : '180deg';

          return (
            <div
              key={`wave-${side}`}
              className="absolute z-0"
              style={{
                [side]: `-${borderWidth}px`,
                left: side === 'left' || side === 'right' ? `-${borderWidth}px` : 0,
                right: side === 'left' || side === 'right' ? `-${borderWidth}px` : 0,
                width: isHorizontal ? '100%' : `${borderWidth}px`,
                height: isHorizontal ? `${borderWidth}px` : '100%',
                background: `linear-gradient(${gradientDir}, transparent, ${gradientColors[0]}, ${gradientColors[1] || gradientColors[0]}, transparent)`,
                backgroundSize: '200% 100%',
                opacity: isActive ? 1 : 0,
                animation:
                  !shouldReduceMotion && isActive
                    ? `animated-border-gradient-flow ${effectiveDuration}s linear infinite${
                        reverse ? ' reverse' : ''
                      }${paused ? ' paused' : ''}`
                    : 'none',
                animationDelay: `${delay}s`,
                transition: `opacity ${effectiveDuration * 0.3}s ease-in-out`,
              }}
            />
          );
        })}
      </>
    );
  };

  // ============================================
  // 10. RENDER: Shimmer Line Effect
  // ============================================

  const renderShimmer = () => {
    if (animation !== 'gradient-flow') return null;

    return (
      <div
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        style={{
          borderRadius: borderWrapperStyle.borderRadius,
          opacity: isActive ? 1 : 0,
          transition: `opacity ${effectiveDuration * 0.3}s ease-in-out`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.15) 45%, rgba(255, 255, 255, 0.25) 50%, rgba(255, 255, 255, 0.15) 55%, transparent 60%)`,
            animation:
              !shouldReduceMotion && isActive
                ? `animated-border-shimmer ${effectiveDuration * 2}s ease-in-out infinite${paused ? ' paused' : ''}`
                : 'none',
            animationDelay: `${delay}s`,
          }}
        />
      </div>
    );
  };

  // ============================================
  // 11. MAIN RENDER
  // ============================================

  return (
    <Component
      ref={containerRef}
      id={id}
      className={`
        animated-border-container
        ${interactive ? 'animated-border-interactive' : ''}
        ${className}
      `}
      style={{
        ...containerStyle,
        '--border-angle': '0deg',
        '--glow-color': glowColor,
      } as CSSProperties}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {/* Glow Effect */}
      {glow && <div style={glowStyle} aria-hidden="true" />}

      {/* Animated Border Layer */}
      {renderCSSBorder()}
      {renderSVGBorder()}
      {renderWaveBorder()}
      {renderSparkles()}
      {renderShimmer()}

      {/* Inner Content Wrapper */}
      <div style={innerWrapperStyle}>{children}</div>
    </Component>
  );
};

// ============================================
// 12. HOVER BORDER COMPONENT (Simplified Variant)
// ============================================

interface HoverBorderProps {
  children: ReactNode;
  gradientColors?: string[];
  borderWidth?: number;
  borderRadius?: number;
  duration?: number;
  className?: string;
}

export const HoverBorder: React.FC<HoverBorderProps> = ({
  children,
  gradientColors = ['#3B82F6', '#7C3AED'],
  borderWidth = 2,
  borderRadius = 16,
  duration = 3,
  className = '',
}) => {
  return (
    <AnimatedBorder
      animation="rotate"
      gradientColors={gradientColors}
      borderWidth={borderWidth}
      borderRadius={borderRadius}
      duration={duration}
      showOnHover
      className={className}
    >
      {children}
    </AnimatedBorder>
  );
};

// ============================================
// 13. GLOW CARD COMPONENT (Simplified Variant)
// ============================================

interface GlowCardProps {
  children: ReactNode;
  glowColor?: string;
  glowIntensity?: number;
  borderWidth?: number;
  borderRadius?: number;
  className?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  glowColor = 'rgba(124, 58, 237, 0.4)',
  glowIntensity = 0.6,
  borderWidth = 1,
  borderRadius = 16,
  className = '',
}) => {
  return (
    <AnimatedBorder
      animation="pulse"
      gradientColors={['rgba(124, 58, 237, 0.3)', 'rgba(59, 130, 246, 0.3)']}
      borderWidth={borderWidth}
      borderRadius={borderRadius}
      duration={3}
      glow
      glowColor={glowColor}
      glowIntensity={glowIntensity}
      className={className}
    >
      {children}
    </AnimatedBorder>
  );
};

// ============================================
// 14. SPARKLE CARD COMPONENT (Simplified Variant)
// ============================================

interface SparkleCardProps {
  children: ReactNode;
  colors?: string[];
  borderWidth?: number;
  borderRadius?: number;
  duration?: number;
  className?: string;
}

export const SparkleCard: React.FC<SparkleCardProps> = ({
  children,
  colors = ['#3B82F6', '#7C3AED', '#EC4899', '#10B981'],
  borderWidth = 2,
  borderRadius = 16,
  duration = 2.5,
  className = '',
}) => {
  return (
    <AnimatedBorder
      animation="sparkle"
      gradientColors={colors}
      borderWidth={borderWidth}
      borderRadius={borderRadius}
      duration={duration}
      className={className}
    >
      {children}
    </AnimatedBorder>
  );
};

// ============================================
// 15. DISPLAY NAMES
// ============================================

AnimatedBorder.displayName = 'AnimatedBorder';
HoverBorder.displayName = 'HoverBorder';
GlowCard.displayName = 'GlowCard';
SparkleCard.displayName = 'SparkleCard';

// ============================================
// 16. NAMED EXPORTS
// ============================================

export {
  HoverBorder,
  GlowCard,
  SparkleCard,
  ANIMATION_CONFIG,
  generateKeyframeStyles,
};

// ============================================
// 17. TYPE EXPORTS
// ============================================

export type {
  BorderAnimationType,
  BorderPosition,
  BorderStyle,
  GradientDirection,
  GradientStop,
  BorderColors,
  AnimatedBorderProps,
  HoverBorderProps,
  GlowCardProps,
  SparkleCardProps,
};

// ============================================
// 18. DEFAULT EXPORT
// ============================================

export default AnimatedBorder;