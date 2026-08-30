// ============================================
// apps/frontend/src/components/landing/ui/GradientText.tsx
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

type GradientType = 'linear' | 'radial' | 'conic' | 'repeating-linear' | 'repeating-radial';

type GradientDirection =
  | 'to-r'
  | 'to-l'
  | 'to-t'
  | 'to-b'
  | 'to-tr'
  | 'to-tl'
  | 'to-br'
  | 'to-bl';

type GradientAnimation =
  | 'none'
  | 'flow'
  | 'pulse'
  | 'shimmer'
  | 'kaleidoscope'
  | 'wave'
  | 'breath'
  | 'typewriter';

type TextAlignment = 'left' | 'center' | 'right';

type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | 'display';

type GradientPreset =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'sunset'
  | 'ocean'
  | 'aurora'
  | 'fire'
  | 'neon'
  | 'midnight'
  | 'rainbow'
  | 'gold'
  | 'platinum';

interface GradientStop {
  color: string;
  position: string;
}

interface GradientConfig {
  type?: GradientType;
  direction?: GradientDirection;
  angle?: number;
  colors: string[];
  stops?: GradientStop[];
  position?: { x: string; y: string };
}

interface TextShadow {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

interface GradientTextProps {
  /** Text content */
  children: ReactNode;
  /** Preset gradient style */
  preset?: GradientPreset;
  /** Full gradient configuration */
  gradient?: GradientConfig;
  /** Animation style */
  animation?: GradientAnimation;
  /** Animation duration in seconds */
  duration?: number;
  /** Animation delay in seconds */
  delay?: number;
  /** Text size preset */
  size?: TextSize;
  /** Custom font size */
  fontSize?: string | number;
  /** Font weight */
  weight?: TextWeight;
  /** Text alignment */
  align?: TextAlignment;
  /** Text transform */
  transform?: TextTransform;
  /** Line height */
  lineHeight?: string | number;
  /** Letter spacing */
  letterSpacing?: string | number;
  /** Whether to show text shadow */
  shadow?: boolean | TextShadow;
  /** Whether to show glow effect */
  glow?: boolean;
  /** Glow color */
  glowColor?: string;
  /** Glow intensity (0-1) */
  glowIntensity?: number;
  /** Whether to add underline decoration */
  underline?: boolean;
  /** Underline gradient */
  underlineGradient?: boolean;
  /** Underline thickness */
  underlineThickness?: number;
  /** Whether text is selectable */
  selectable?: boolean;
  /** Whether to wrap text */
  noWrap?: boolean;
  /** Maximum width */
  maxWidth?: string | number;
  /** HTML tag to render */
  as?: keyof JSX.IntrinsicElements;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Whether to show on hover only */
  showOnHover?: boolean;
  /** Whether to animate on scroll into view */
  animateOnView?: boolean;
  /** Whether to stagger children characters */
  staggerCharacters?: boolean;
  /** Stagger delay per character in ms */
  staggerDelay?: number;
  /** Custom gradient for dark mode */
  darkGradient?: GradientConfig;
  /** Whether to use background-clip method (true) or SVG method (false) */
  useBackgroundClip?: boolean;
  /** Title attribute for accessibility */
  title?: string;
}

// ============================================
// 2. PRESET GRADIENTS
// ============================================

const PRESET_GRADIENTS: Record<GradientPreset, GradientConfig> = {
  primary: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#3B82F6', '#2563EB', '#1D4ED8'],
  },
  secondary: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#7C3AED', '#6D28D9', '#5B21B6'],
  },
  accent: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#EC4899', '#DB2777', '#BE185D'],
  },
  success: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#22C55E', '#16A34A', '#15803D'],
  },
  warning: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#F59E0B', '#F97316', '#EA580C'],
  },
  danger: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#EF4444', '#DC2626', '#B91C1C'],
  },
  sunset: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#FF6B6B', '#FFA07A', '#FFD700', '#FF8C42'],
  },
  ocean: {
    type: 'linear',
    direction: 'to-br',
    colors: ['#0077B6', '#00B4D8', '#90E0EF', '#48CAE4'],
  },
  aurora: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#f43f5e'],
  },
  fire: {
    type: 'linear',
    direction: 'to-t',
    colors: ['#FF0000', '#FF6600', '#FFCC00', '#FFFFFF'],
  },
  neon: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#00FF87', '#60EFFF', '#0061FF', '#60EFFF'],
  },
  midnight: {
    type: 'linear',
    direction: 'to-br',
    colors: ['#1E3A8A', '#3B82F6', '#8B5CF6', '#1E1B4B'],
  },
  rainbow: {
    type: 'linear',
    direction: 'to-r',
    colors: ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8B00FF'],
  },
  gold: {
    type: 'linear',
    direction: 'to-br',
    colors: ['#BF953F', '#FCF6B5', '#B38728', '#FBF5B7', '#AA771C'],
  },
  platinum: {
    type: 'linear',
    direction: 'to-br',
    colors: ['#E5E7EB', '#9CA3AF', '#6B7280', '#D1D5DB', '#9CA3AF'],
  },
};

// ============================================
// 3. SIZE CONFIGURATION
// ============================================

const SIZE_CONFIG: Record<TextSize, { fontSize: string; lineHeight: string; letterSpacing: string }> = {
  xs: { fontSize: '0.75rem', lineHeight: '1rem', letterSpacing: '0.01em' },
  sm: { fontSize: '0.875rem', lineHeight: '1.25rem', letterSpacing: '0.01em' },
  base: { fontSize: '1rem', lineHeight: '1.5rem', letterSpacing: '0' },
  lg: { fontSize: '1.125rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' },
  xl: { fontSize: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.01em' },
  '2xl': { fontSize: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.02em' },
  '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.02em' },
  '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.03em' },
  '5xl': { fontSize: '3rem', lineHeight: '1', letterSpacing: '-0.03em' },
  '6xl': { fontSize: '3.75rem', lineHeight: '1', letterSpacing: '-0.04em' },
  '7xl': { fontSize: '4.5rem', lineHeight: '1', letterSpacing: '-0.04em' },
  '8xl': { fontSize: '6rem', lineHeight: '1', letterSpacing: '-0.05em' },
  display: { fontSize: '8rem', lineHeight: '1', letterSpacing: '-0.06em' },
};

const WEIGHT_CONFIG: Record<TextWeight, string> = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

// ============================================
// 4. CSS ANIMATION KEYFRAMES
// ============================================

const ANIMATION_STYLES = `
  @keyframes gradient-text-flow {
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

  @keyframes gradient-text-pulse {
    0%, 100% {
      opacity: 0.7;
      filter: brightness(1) blur(0px);
    }
    50% {
      opacity: 1;
      filter: brightness(1.2) blur(0.5px);
    }
  }

  @keyframes gradient-text-shimmer {
    0% {
      background-position: -200% 50%;
    }
    100% {
      background-position: 200% 50%;
    }
  }

  @keyframes gradient-text-kaleidoscope {
    0% {
      filter: hue-rotate(0deg) brightness(1);
    }
    25% {
      filter: hue-rotate(90deg) brightness(1.1);
    }
    50% {
      filter: hue-rotate(180deg) brightness(0.9);
    }
    75% {
      filter: hue-rotate(270deg) brightness(1.1);
    }
    100% {
      filter: hue-rotate(360deg) brightness(1);
    }
  }

  @keyframes gradient-text-wave {
    0%, 100% {
      background-position: 0% 50%;
      background-size: 200% 200%;
    }
    25% {
      background-position: 50% 0%;
      background-size: 300% 300%;
    }
    50% {
      background-position: 100% 50%;
      background-size: 200% 200%;
    }
    75% {
      background-position: 50% 100%;
      background-size: 300% 300%;
    }
  }

  @keyframes gradient-text-breath {
    0%, 100% {
      transform: scale(1);
      filter: brightness(1);
    }
    50% {
      transform: scale(1.02);
      filter: brightness(1.15);
    }
  }

  @keyframes gradient-text-typewriter {
    0% {
      width: 0;
    }
    100% {
      width: 100%;
    }
  }

  @keyframes gradient-text-character-fade {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes gradient-text-glow-pulse {
    0%, 100% {
      text-shadow: 0 0 10px var(--glow-color, rgba(59, 130, 246, 0.5)),
                   0 0 20px var(--glow-color, rgba(59, 130, 246, 0.3));
    }
    50% {
      text-shadow: 0 0 20px var(--glow-color, rgba(59, 130, 246, 0.8)),
                   0 0 40px var(--glow-color, rgba(59, 130, 246, 0.5)),
                   0 0 60px var(--glow-color, rgba(59, 130, 246, 0.3));
    }
  }

  @keyframes gradient-text-underline {
    0% {
      transform: scaleX(0);
    }
    100% {
      transform: scaleX(1);
    }
  }

  @keyframes gradient-text-gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// ============================================
// 5. HELPER: Build Gradient String
// ============================================

function buildGradientString(config: GradientConfig): string {
  const { type = 'linear', direction = 'to-r', angle, colors, stops, position } = config;

  // Build color stops
  let colorStops: string;
  if (stops && stops.length > 0) {
    colorStops = stops.map((stop) => `${stop.color} ${stop.position}`).join(', ');
  } else {
    colorStops = colors
      .map((color, index) => `${color} ${(index / (colors.length - 1)) * 100}%`)
      .join(', ');
  }

  switch (type) {
    case 'linear': {
      if (angle !== undefined) return `linear-gradient(${angle}deg, ${colorStops})`;
      const dir = direction.replace('to-', 'to ');
      return `linear-gradient(${dir}, ${colorStops})`;
    }

    case 'radial': {
      const pos = position ? `at ${position.x} ${position.y}` : 'at center';
      return `radial-gradient(circle ${pos}, ${colorStops})`;
    }

    case 'conic': {
      const pos = position ? `at ${position.x} ${position.y}` : 'at center';
      return `conic-gradient(from ${angle || 0}deg ${pos}, ${colorStops})`;
    }

    case 'repeating-linear': {
      if (angle !== undefined) return `repeating-linear-gradient(${angle}deg, ${colorStops})`;
      const dir = direction.replace('to-', 'to ');
      return `repeating-linear-gradient(${dir}, ${colorStops})`;
    }

    case 'repeating-radial': {
      const pos = position ? `at ${position.x} ${position.y}` : 'at center';
      return `repeating-radial-gradient(circle ${pos}, ${colorStops})`;
    }

    default:
      return `linear-gradient(${direction.replace('to-', 'to ')}, ${colorStops})`;
  }
}

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  preset = 'primary',
  gradient: customGradient,
  animation = 'none',
  duration = 4,
  delay = 0,
  size = '5xl',
  fontSize,
  weight = 'bold',
  align = 'center',
  transform = 'none',
  lineHeight,
  letterSpacing,
  shadow = false,
  glow = false,
  glowColor,
  glowIntensity = 0.5,
  underline = false,
  underlineGradient = false,
  underlineThickness = 3,
  selectable = true,
  noWrap = false,
  maxWidth,
  as: Component = 'span',
  className = '',
  style,
  id,
  respectReducedMotion = true,
  showOnHover = false,
  animateOnView = false,
  staggerCharacters = false,
  staggerDelay = 50,
  darkGradient,
  useBackgroundClip = true,
  title,
}) => {
  // ============================================
  // State
  // ============================================

  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isInView, setIsInView] = useState(!animateOnView);
  const [isHovered, setIsHovered] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);
  const [uniqueId] = useState(`gradient-text-${Math.random().toString(36).substr(2, 9)}`);

  // Refs
  const elementRef = useRef<HTMLElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const effectiveGradient = customGradient || PRESET_GRADIENTS[preset];
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG['5xl'];
  const effectiveFontSize = fontSize || sizeConfig.fontSize;
  const effectiveLineHeight = lineHeight || sizeConfig.lineHeight;
  const effectiveLetterSpacing = letterSpacing || sizeConfig.letterSpacing;
  const effectiveFontWeight = WEIGHT_CONFIG[weight] || WEIGHT_CONFIG.bold;

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
  // Effects: Inject Animation Styles
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    const styleId = 'gradient-text-animations';
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
    if (!animateOnView) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateOnView]);

  // ============================================
  // Handlers
  // ============================================

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  // ============================================
  // Render: Stagger Characters
  // ============================================

  const renderStaggeredText = useCallback(
    (text: string): ReactNode => {
      if (!staggerCharacters || shouldReduceMotion) return text;

      return text.split('').map((char, index) => (
        <span
          key={`${uniqueId}-char-${index}`}
          className="inline-block"
          style={{
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateY(0)' : 'translateY(16px)',
            animation:
              isInView && !shouldReduceMotion
                ? `gradient-text-character-fade 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * staggerDelay}ms both`
                : 'none',
            transition: `all 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${index * staggerDelay}ms`,
          }}
          aria-hidden="true"
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    },
    [staggerCharacters, shouldReduceMotion, isInView, staggerDelay, uniqueId]
  );

  // ============================================
  // 7. STYLES
  // ============================================

  const textStyles = useMemo((): CSSProperties => {
    const gradientString = buildGradientString(effectiveGradient);

    const base: CSSProperties = {
      fontSize: effectiveFontSize,
      fontWeight: effectiveFontWeight,
      lineHeight: effectiveLineHeight,
      letterSpacing: effectiveLetterSpacing,
      textAlign: align,
      textTransform: transform,
      whiteSpace: noWrap ? 'nowrap' : 'normal',
      maxWidth: maxWidth || undefined,
      userSelect: selectable ? 'text' : 'none',
      WebkitUserSelect: selectable ? 'text' : 'none',
      display: 'inline-block',
      position: 'relative',
      transition: shouldReduceMotion ? 'none' : 'all 0.3s ease',
      ...style,
    };

    // Background clip method (most compatible)
    if (useBackgroundClip) {
      base.background = gradientString;
      base.backgroundSize = animation === 'shimmer' ? '300% 300%' : animation === 'wave' ? '200% 200%' : '100% 100%';
      base.backgroundClip = 'text';
      base.WebkitBackgroundClip = 'text';
      base.WebkitTextFillColor = 'transparent';
      base.color = 'transparent';
    } else {
      // Fallback: Use color directly with animation
      base.color = effectiveGradient.colors[0];
    }

    // Animation
    if (animation !== 'none' && !shouldReduceMotion && (isInView || !animateOnView)) {
      const animDuration = `${duration}s`;

      switch (animation) {
        case 'flow':
          base.backgroundSize = '200% 200%';
          base.animation = `gradient-text-flow ${animDuration} ease infinite`;
          break;
        case 'pulse':
          base.animation = `gradient-text-pulse ${animDuration} ease-in-out infinite`;
          break;
        case 'shimmer':
          base.backgroundSize = '300% 300%';
          base.animation = `gradient-text-shimmer ${animDuration} linear infinite`;
          break;
        case 'kaleidoscope':
          base.animation = `gradient-text-kaleidoscope ${animDuration} linear infinite`;
          break;
        case 'wave':
          base.backgroundSize = '200% 200%';
          base.animation = `gradient-text-wave ${animDuration} ease-in-out infinite`;
          break;
        case 'breath':
          base.animation = `gradient-text-breath ${animDuration} ease-in-out infinite`;
          break;
        case 'typewriter':
          base.overflow = 'hidden';
          base.whiteSpace = 'nowrap';
          base.animation = `gradient-text-typewriter ${animDuration} steps(40, end)`;
          break;
      }

      if (delay > 0) {
        base.animationDelay = `${delay}s`;
      }
    }

    // Show on hover only
    if (showOnHover && !isHovered) {
      base.background = 'none';
      base.backgroundClip = 'unset';
      base.WebkitBackgroundClip = 'unset';
      base.WebkitTextFillColor = 'currentColor';
      base.color = 'inherit';
      base.animation = 'none';
    }

    // Glow effect
    if (glow && !shouldReduceMotion) {
      const glowSpread = 10 * glowIntensity;
      const glowSpreadFar = 20 * glowIntensity;
      const glowColorValue = glowColor || effectiveGradient.colors[0];

      base.setProperty?.('--glow-color', glowColorValue);

      if (animation === 'none') {
        base.textShadow = `0 0 ${glowSpread}px ${glowColorValue}, 0 0 ${glowSpreadFar}px ${glowColorValue}`;
      } else {
        base.animation = `${base.animation ? base.animation + ', ' : ''}gradient-text-glow-pulse ${duration}s ease-in-out infinite`;
      }
    }

    // Shadow
    if (shadow) {
      const shadowConfig: TextShadow =
        typeof shadow === 'object'
          ? shadow
          : { color: 'rgba(0, 0, 0, 0.3)', offsetX: 2, offsetY: 4, blur: 8 };

      base.textShadow = `${shadowConfig.offsetX}px ${shadowConfig.offsetY}px ${shadowConfig.blur}px ${shadowConfig.color}`;
    }

    return base;
  }, [
    effectiveGradient,
    effectiveFontSize,
    effectiveFontWeight,
    effectiveLineHeight,
    effectiveLetterSpacing,
    align,
    transform,
    noWrap,
    maxWidth,
    selectable,
    style,
    useBackgroundClip,
    animation,
    duration,
    delay,
    shouldReduceMotion,
    isInView,
    animateOnView,
    showOnHover,
    isHovered,
    glow,
    glowIntensity,
    glowColor,
    shadow,
  ]);

  // ============================================
  // Underline Style
  // ============================================

  const underlineStyle = useMemo((): CSSProperties | undefined => {
    if (!underline) return undefined;

    const gradientString = underlineGradient
      ? buildGradientString(effectiveGradient)
      : (effectiveGradient.colors[0] || '#3B82F6');

    return {
      position: 'absolute',
      bottom: `-${underlineThickness + 4}px`,
      left: 0,
      right: 0,
      height: `${underlineThickness}px`,
      borderRadius: `${underlineThickness / 2}px`,
      background: underlineGradient ? gradientString : effectiveGradient.colors[0],
      transformOrigin: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
      transform: isInView ? 'scaleX(1)' : 'scaleX(0)',
      transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
    };
  }, [underline, underlineGradient, underlineThickness, effectiveGradient, align, isInView]);

  // ============================================
  // Render: SVG Gradient Definition
  // ============================================

  const renderSVGGradient = useCallback((): ReactNode => {
    if (useBackgroundClip) return null;

    const svgId = `${uniqueId}-svg-gradient`;

    return (
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient
            id={svgId}
            gradientTransform={`rotate(${effectiveGradient.angle || 0})`}
          >
            {(effectiveGradient.stops || []).length > 0
              ? effectiveGradient.stops!.map((stop, i) => (
                  <stop key={i} offset={stop.position} stopColor={stop.color} />
                ))
              : effectiveGradient.colors.map((color, i) => (
                  <stop
                    key={i}
                    offset={`${(i / (effectiveGradient.colors.length - 1)) * 100}%`}
                    stopColor={color}
                  />
                ))}
            {animation !== 'none' && !shouldReduceMotion && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from={`${effectiveGradient.angle || 0}`}
                to={`${(effectiveGradient.angle || 0) + 360}`}
                dur={`${duration}s`}
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
        </defs>
      </svg>
    );
  }, [useBackgroundClip, uniqueId, effectiveGradient, animation, duration, shouldReduceMotion]);

  // ============================================
  // 8. RENDER
  // ============================================

  const renderContent = () => {
    // Stagger character animation
    if (staggerCharacters && typeof children === 'string') {
      return renderStaggeredText(children);
    }

    return children;
  };

  return (
    <Component
      ref={elementRef as any}
      id={id}
      className={`
        gradient-text
        ${!selectable ? 'select-none' : ''}
        ${className}
      `.trim()}
      style={textStyles}
      onMouseEnter={showOnHover ? handleMouseEnter : undefined}
      onMouseLeave={showOnHover ? handleMouseLeave : undefined}
      title={title}
    >
      {/* SVG Gradient Definition */}
      {renderSVGGradient()}

      {/* Text Content */}
      {renderContent()}

      {/* Animated Underline */}
      {underline && <span style={underlineStyle} aria-hidden="true" />}
    </Component>
  );
};

// ============================================
// 9. GRADIENT HEADING COMPONENTS
// ============================================

interface GradientHeadingProps {
  children: ReactNode;
  preset?: GradientPreset;
  animation?: GradientAnimation;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  align?: TextAlignment;
  glow?: boolean;
  underline?: boolean;
}

export const GradientH1: React.FC<GradientHeadingProps> = ({
  children,
  preset = 'primary',
  animation = 'none',
  className = '',
  as = 'h1',
  align = 'center',
  glow = true,
  underline = false,
}) => (
  <GradientText
    as={as}
    preset={preset}
    size="5xl"
    weight="extrabold"
    align={align}
    animation={animation}
    glow={glow}
    underline={underline}
    className={className}
  >
    {children}
  </GradientText>
);

export const GradientH2: React.FC<GradientHeadingProps> = ({
  children,
  preset = 'primary',
  animation = 'none',
  className = '',
  as = 'h2',
  align = 'center',
  glow = false,
  underline = false,
}) => (
  <GradientText
    as={as}
    preset={preset}
    size="4xl"
    weight="bold"
    align={align}
    animation={animation}
    glow={glow}
    underline={underline}
    className={className}
  >
    {children}
  </GradientText>
);

export const GradientH3: React.FC<GradientHeadingProps> = ({
  children,
  preset = 'primary',
  animation = 'none',
  className = '',
  as = 'h3',
  align = 'center',
  glow = false,
  underline = false,
}) => (
  <GradientText
    as={as}
    preset={preset}
    size="3xl"
    weight="semibold"
    align={align}
    animation={animation}
    glow={glow}
    underline={underline}
    className={className}
  >
    {children}
  </GradientText>
);

// ============================================
// 10. GRADIENT SPAN (Inline)
// ============================================

interface GradientSpanProps {
  children: ReactNode;
  preset?: GradientPreset;
  gradient?: GradientConfig;
  weight?: TextWeight;
  className?: string;
}

export const GradientSpan: React.FC<GradientSpanProps> = ({
  children,
  preset = 'primary',
  gradient,
  weight = 'semibold',
  className = '',
}) => (
  <GradientText
    as="span"
    preset={preset}
    gradient={gradient}
    size="base"
    weight={weight}
    align="left"
    className={className}
  >
    {children}
  </GradientText>
);

// ============================================
// 11. ANIMATED GRADIENT TEXT
// ============================================

interface AnimatedGradientTextProps {
  children: ReactNode;
  preset?: GradientPreset;
  animation?: GradientAnimation;
  size?: TextSize;
  className?: string;
}

export const AnimatedGradientText: React.FC<AnimatedGradientTextProps> = ({
  children,
  preset = 'aurora',
  animation = 'flow',
  size = '3xl',
  className = '',
}) => (
  <GradientText
    preset={preset}
    size={size}
    weight="bold"
    animation={animation}
    duration={4}
    glow
    className={className}
  >
    {children}
  </GradientText>
);

// ============================================
// 12. TYPEWRITER GRADIENT TEXT
// ============================================

interface TypewriterGradientTextProps {
  children: ReactNode;
  preset?: GradientPreset;
  size?: TextSize;
  duration?: number;
  className?: string;
}

export const TypewriterGradientText: React.FC<TypewriterGradientTextProps> = ({
  children,
  preset = 'neon',
  size = '4xl',
  duration = 3,
  className = '',
}) => (
  <GradientText
    preset={preset}
    size={size}
    weight="bold"
    animation="typewriter"
    duration={duration}
    noWrap
    className={className}
  >
    {children}
  </GradientText>
);

// ============================================
// 13. DISPLAY NAMES
// ============================================

GradientText.displayName = 'GradientText';
GradientH1.displayName = 'GradientH1';
GradientH2.displayName = 'GradientH2';
GradientH3.displayName = 'GradientH3';
GradientSpan.displayName = 'GradientSpan';
AnimatedGradientText.displayName = 'AnimatedGradientText';
TypewriterGradientText.displayName = 'TypewriterGradientText';

// ============================================
// 14. NAMED EXPORTS
// ============================================

export {
  PRESET_GRADIENTS,
  SIZE_CONFIG,
  WEIGHT_CONFIG,
  ANIMATION_STYLES,
  buildGradientString,
};

// ============================================
// 15. TYPE EXPORTS
// ============================================

export type {
  GradientType,
  GradientDirection,
  GradientAnimation,
  TextAlignment,
  TextTransform,
  TextWeight,
  TextSize,
  GradientPreset,
  GradientStop,
  GradientConfig,
  TextShadow,
  GradientTextProps,
  GradientHeadingProps,
  GradientSpanProps,
  AnimatedGradientTextProps,
  TypewriterGradientTextProps,
};

// ============================================
// 16. DEFAULT EXPORT
// ============================================

export default GradientText;
