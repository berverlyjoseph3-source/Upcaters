// ============================================
// apps/frontend/src/components/landing/interactive/TiltCard.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  CSSProperties,
  ReactNode,
  Children,
  cloneElement,
  isValidElement,
} from 'react';
import {
  Sparkles,
  ExternalLink,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Eye,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type TiltAxis = 'x' | 'y' | 'both' | 'none';

type GlarePosition = 'top' | 'bottom' | 'left' | 'right' | 'all';

type TiltScale = number;

type TiltEasing =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';

type PerspectiveOrigin =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

type CardVariant =
  | 'default'
  | 'gradient'
  | 'glass'
  | 'glow'
  | 'neon'
  | 'minimal'
  | 'premium';

type CardSize = 'sm' | 'md' | 'lg' | 'xl' | 'custom';

type TiltState = 'idle' | 'hover' | 'interacting' | 'exit';

interface TiltCardProps {
  /** Card content */
  children: ReactNode;
  /** Card variant */
  variant?: CardVariant;
  /** Card size preset */
  size?: CardSize;
  /** Custom width */
  width?: number | string;
  /** Custom height */
  height?: number | string;
  /** Maximum tilt angle in degrees */
  maxTilt?: number;
  /** Tilt axis restriction */
  axis?: TiltAxis;
  /** Perspective value (lower = more dramatic) */
  perspective?: number;
  /** Scale factor on hover (1 = no scale, 1.05 = 5% larger) */
  scale?: TiltScale;
  /** Speed of the tilt transition in ms */
  speed?: number;
  /** Easing function for tilt transition */
  easing?: TiltEasing;
  /** Custom cubic-bezier values (when easing is cubic-bezier) */
  cubicBezier?: [number, number, number, number];
  /** Whether to reset the card on exit */
  resetOnExit?: boolean;
  /** Whether to enable glare effect */
  glareEnable?: boolean;
  /** Glare maximum opacity */
  glareMaxOpacity?: number;
  /** Glare color */
  glareColor?: string;
  /** Glare position */
  glarePosition?: GlarePosition;
  /** Glare border radius */
  glareBorderRadius?: string;
  /** Whether to show a gradient border */
  gradientBorder?: boolean;
  /** Gradient border colors */
  gradientBorderColors?: string[];
  /** Gradient border width */
  gradientBorderWidth?: number;
  /** Whether to show a glow effect */
  glowOnHover?: boolean;
  /** Glow color */
  glowColor?: string;
  /** Glow intensity */
  glowIntensity?: number;
  /** Whether to enable 3D transform on children */
  enable3D?: boolean;
  /** Perspective origin */
  perspectiveOrigin?: PerspectiveOrigin;
  /** Whether to enable parallax effect on children */
  parallaxEnable?: boolean;
  /** Parallax intensity for children */
  parallaxIntensity?: number;
  /** Whether to add a spotlight effect */
  spotlightEnable?: boolean;
  /** Spotlight color */
  spotlightColor?: string;
  /** Spotlight intensity */
  spotlightIntensity?: number;
  /** Whether to show decorative elements */
  decorative?: boolean;
  /** Whether the card is interactive / clickable */
  clickable?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Callback on tilt start */
  onTiltStart?: () => void;
  /** Callback on tilt end */
  onTiltEnd?: () => void;
  /** Callback with tilt values */
  onTiltChange?: (tiltX: number, tiltY: number, angle: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Whether to show a badge */
  badge?: string;
  /** Badge icon */
  badgeIcon?: ReactNode;
  /** Badge position */
  badgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Custom overlay on hover */
  hoverOverlay?: ReactNode;
  /** Custom icon displayed in corner */
  cornerIcon?: ReactNode;
  /** Corner icon position */
  cornerIconPosition?: 'top-right' | 'bottom-right';
  /** href for link behavior */
  href?: string;
  /** Whether to open link in new tab */
  external?: boolean;
  /** aria-label for accessibility */
  ariaLabel?: string;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_MAX_TILT = 15;
const DEFAULT_PERSPECTIVE = 800;
const DEFAULT_SCALE = 1.02;
const DEFAULT_SPEED = 400;
const DEFAULT_GLARE_MAX_OPACITY = 0.15;
const DEFAULT_GLARE_COLOR = 'rgba(255, 255, 255, 0.35)';
const DEFAULT_GLOW_COLOR = 'rgba(124, 58, 237, 0.3)';
const DEFAULT_GLOW_INTENSITY = 1;
const DEFAULT_PARALLAX_INTENSITY = 0.02;
const DEFAULT_SPOTLIGHT_COLOR = 'rgba(255, 255, 255, 0.07)';
const DEFAULT_SPOTLIGHT_INTENSITY = 1;
const DEFAULT_GRADIENT_BORDER_WIDTH = 2;

const SIZE_MAP: Record<CardSize, { width: string | number; padding: string }> = {
  sm: { width: 280, padding: 'p-5' },
  md: { width: 360, padding: 'p-6' },
  lg: { width: 480, padding: 'p-8' },
  xl: { width: 600, padding: 'p-10' },
  custom: { width: 'auto', padding: 'p-6' },
};

const VARIANT_MAP: Record<
  CardVariant,
  { background: string; border: string; shadow: string; accent: string }
> = {
  default: {
    background: 'bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-lg',
    accent: '',
  },
  gradient: {
    background: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    border: 'border border-brand-border',
    shadow: 'shadow-xl',
    accent: '',
  },
  glass: {
    background: 'bg-white/5 backdrop-blur-xl',
    border: 'border border-white/10',
    shadow: 'shadow-lg',
    accent: '',
  },
  glow: {
    background: 'bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-lg',
    accent: '',
  },
  neon: {
    background: 'bg-brand-dark',
    border: 'border border-brand-primary/30',
    shadow: 'shadow-lg',
    accent: '',
  },
  minimal: {
    background: 'bg-transparent',
    border: 'border-0',
    shadow: 'shadow-none',
    accent: '',
  },
  premium: {
    background: 'bg-gradient-to-br from-[#0f0f23] via-[#1a1030] to-[#0f0f23]',
    border: 'border border-brand-secondary/20',
    shadow: 'shadow-2xl',
    accent: '',
  },
};

const BADGE_POSITION_MAP: Record<string, string> = {
  'top-left': 'top-3 left-3',
  'top-right': 'top-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-right': 'bottom-3 right-3',
};

const CORNER_ICON_POSITION_MAP: Record<string, string> = {
  'top-right': 'top-3 right-3',
  'bottom-right': 'bottom-3 right-3',
};

// ============================================
// 3. HELPER: Get Easing CSS Value
// ============================================

const getEasingValue = (
  easing: TiltEasing,
  cubicBezier?: [number, number, number, number]
): string => {
  switch (easing) {
    case 'linear':
      return 'linear';
    case 'ease':
      return 'ease';
    case 'ease-in':
      return 'ease-in';
    case 'ease-out':
      return 'ease-out';
    case 'ease-in-out':
      return 'ease-in-out';
    case 'cubic-bezier':
      return cubicBezier
        ? `cubic-bezier(${cubicBezier.join(', ')})`
        : 'cubic-bezier(0.25, 0.1, 0, 1)';
    default:
      return 'ease-out';
  }
};

// ============================================
// 4. HELPER: Get Point Relative to Element
// ============================================

const getRelativePosition = (
  event: React.MouseEvent,
  element: HTMLElement
): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  return { x, y };
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  width,
  height,
  maxTilt = DEFAULT_MAX_TILT,
  axis = 'both',
  perspective = DEFAULT_PERSPECTIVE,
  scale = DEFAULT_SCALE,
  speed = DEFAULT_SPEED,
  easing = 'ease-out',
  cubicBezier,
  resetOnExit = true,
  glareEnable = true,
  glareMaxOpacity = DEFAULT_GLARE_MAX_OPACITY,
  glareColor = DEFAULT_GLARE_COLOR,
  glarePosition = 'all',
  glareBorderRadius = 'inherit',
  gradientBorder = false,
  gradientBorderColors = ['#3B82F6', '#7C3AED', '#EC4899'],
  gradientBorderWidth = DEFAULT_GRADIENT_BORDER_WIDTH,
  glowOnHover = true,
  glowColor = DEFAULT_GLOW_COLOR,
  glowIntensity = DEFAULT_GLOW_INTENSITY,
  enable3D = true,
  perspectiveOrigin = 'center',
  parallaxEnable = false,
  parallaxIntensity = DEFAULT_PARALLAX_INTENSITY,
  spotlightEnable = false,
  spotlightColor = DEFAULT_SPOTLIGHT_COLOR,
  spotlightIntensity = DEFAULT_SPOTLIGHT_INTENSITY,
  decorative = false,
  clickable = false,
  onClick,
  onTiltStart,
  onTiltEnd,
  onTiltChange,
  className = '',
  style,
  id,
  disabled = false,
  badge,
  badgeIcon,
  badgePosition = 'top-left',
  hoverOverlay,
  cornerIcon,
  cornerIconPosition = 'top-right',
  href,
  external = false,
  ariaLabel,
}) => {
  // ============================================
  // State
  // ============================================

  const [tiltState, setTiltState] = useState<TiltState>('idle');
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [glareX, setGlareX] = useState(50);
  const [glareY, setGlareY] = useState(50);
  const [mouseX, setMouseX] = useState(0.5);
  const [mouseY, setMouseY] = useState(0.5);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const sizeConfig = useMemo(() => SIZE_MAP[size], [size]);
  const variantConfig = useMemo(() => VARIANT_MAP[variant], [variant]);
  const easingValue = useMemo(
    () => getEasingValue(easing, cubicBezier),
    [easing, cubicBezier]
  );

  const resolvedWidth = width || sizeConfig.width;
  const resolvedHeight = height || 'auto';

  const tiltAngle = useMemo(() => {
    return Math.sqrt(tiltX * tiltX + tiltY * tiltY) * maxTilt;
  }, [tiltX, tiltY, maxTilt]);

  // ============================================
  // Handlers
  // ============================================

  const updateTilt = useCallback(
    (event: React.MouseEvent) => {
      if (!cardRef.current || disabled) return;

      const element = cardRef.current;
      const { x, y } = getRelativePosition(event, element);

      setMouseX((x + 1) / 2);
      setMouseY((y + 1) / 2);

      const newTiltX = axis === 'y' ? 0 : x * maxTilt;
      const newTiltY = axis === 'x' ? 0 : y * maxTilt;

      setTiltX(newTiltX);
      setTiltY(newTiltY);

      if (glareEnable) {
        const rect = element.getBoundingClientRect();
        setGlareX(((event.clientX - rect.left) / rect.width) * 100);
        setGlareY(((event.clientY - rect.top) / rect.height) * 100);
      }

      onTiltChange?.(newTiltX, newTiltY, tiltAngle);
    },
    [disabled, axis, maxTilt, glareEnable, tiltAngle, onTiltChange]
  );

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      setIsHovered(true);
      setTiltState('hover');
      onTiltStart?.();

      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }

      updateTilt(event);
    },
    [disabled, updateTilt, onTiltStart]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (disabled || tiltState === 'exit') return;

      setTiltState('interacting');
      updateTilt(event);
    },
    [disabled, tiltState, updateTilt]
  );

  const handleMouseLeave = useCallback(() => {
    if (disabled) return;

    setIsHovered(false);

    if (resetOnExit) {
      setTiltState('exit');
      setTiltX(0);
      setTiltY(0);
      setGlareX(50);
      setGlareY(50);
      setMouseX(0.5);
      setMouseY(0.5);

      exitTimerRef.current = setTimeout(() => {
        setTiltState('idle');
        onTiltEnd?.();
      }, speed);
    } else {
      setTiltState('idle');
      onTiltEnd?.();
    }
  }, [disabled, resetOnExit, speed, onTiltEnd]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;

      onClick?.(event);

      if (href) {
        if (external) {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = href;
        }
      }
    },
    [disabled, onClick, href, external]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick(event as any);
      }
    },
    [disabled, handleClick]
  );

  // ============================================
  // Derived Styles
  // ============================================

  const cardStyles = useMemo((): CSSProperties => {
    const isInteracting = tiltState === 'interacting' || tiltState === 'hover';
    const transitionSpeed = resetOnExit && tiltState === 'exit' ? speed : 0;

    const base: CSSProperties = {
      transformStyle: enable3D ? 'preserve-3d' : 'flat',
      transform: isInteracting
        ? `perspective(${perspective}px) rotateX(${-tiltY}deg) rotateY(${tiltX}deg) scale3d(${scale}, ${scale}, ${scale})`
        : `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transition: transitionSpeed
        ? `transform ${transitionSpeed}ms ${easingValue}, box-shadow ${transitionSpeed}ms ${easingValue}`
        : `box-shadow 200ms ${easingValue}`,
      perspectiveOrigin: perspectiveOrigin
        .split('-')
        .map((w) => (w === 'left' || w === 'right' ? `${w === 'left' ? '0' : '100'}%` : w))
        .join(' '),
      ...style,
    };

    // Glow effect
    if (glowOnHover && isInteracting) {
      const intensity = glowIntensity * (Math.abs(tiltX) + Math.abs(tiltY)) / (maxTilt * 2);
      base.boxShadow = `
        0 0 ${20 * intensity}px ${glowColor},
        0 0 ${40 * intensity}px ${glowColor},
        0 ${10 * intensity}px ${30 * intensity}px rgba(0, 0, 0, 0.3)
      `;
    } else if (glowOnHover && !isInteracting && variant !== 'minimal') {
      base.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    }

    return base;
  }, [
    tiltState,
    resetOnExit,
    speed,
    enable3D,
    perspective,
    tiltX,
    tiltY,
    scale,
    maxTilt,
    easingValue,
    perspectiveOrigin,
    style,
    glowOnHover,
    glowColor,
    glowIntensity,
    variant,
  ]);

  const glareStyles = useMemo((): CSSProperties => {
    if (!glareEnable) return {};

    const isInteracting = tiltState === 'interacting' || tiltState === 'hover';
    const transitionSpeed = resetOnExit && tiltState === 'exit' ? speed : 0;

    return {
      position: 'absolute',
      inset: 0,
      borderRadius: glareBorderRadius,
      pointerEvents: 'none',
      background: `radial-gradient(
        circle at ${glareX}% ${glareY}%,
        ${glareColor} 0%,
        transparent 70%
      )`,
      opacity: isInteracting ? glareMaxOpacity : 0,
      transition: `opacity ${transitionSpeed}ms ${easingValue}`,
      zIndex: 1,
    };
  }, [
    glareEnable,
    glareColor,
    glareMaxOpacity,
    glareX,
    glareY,
    glareBorderRadius,
    tiltState,
    resetOnExit,
    speed,
    easingValue,
  ]);

  const spotlightStyles = useMemo((): CSSProperties => {
    if (!spotlightEnable || !isHovered) return {};

    return {
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      pointerEvents: 'none',
      background: `radial-gradient(
        circle at ${mouseX * 100}% ${mouseY * 100}%,
        ${spotlightColor} 0%,
        transparent ${60 * spotlightIntensity}%
      )`,
      zIndex: 0,
      opacity: 1,
      transition: 'opacity 200ms ease-out',
    };
  }, [spotlightEnable, isHovered, mouseX, mouseY, spotlightColor, spotlightIntensity]);

  const gradientBorderStyles = useMemo((): CSSProperties => {
    if (!gradientBorder) return {};

    const colors = gradientBorderColors.join(', ');
    return {
      position: 'absolute',
      inset: `-${gradientBorderWidth}px`,
      borderRadius: `calc(inherit + ${gradientBorderWidth}px)`,
      background: `linear-gradient(135deg, ${colors})`,
      zIndex: -1,
      opacity: isHovered ? 1 : 0.4,
      transition: `opacity ${speed}ms ${easingValue}`,
      filter: `blur(${gradientBorderWidth * 2}px)`,
      pointerEvents: 'none',
    };
  }, [gradientBorder, gradientBorderColors, gradientBorderWidth, isHovered, speed, easingValue]);

  const containerStyles = useMemo((): CSSProperties => {
    return {
      width: resolvedWidth,
      height: resolvedHeight,
      ...(clickable || onClick || href ? { cursor: 'pointer' } : {}),
    };
  }, [resolvedWidth, resolvedHeight, clickable, onClick, href]);

  // ============================================
  // Effects: Cleanup
  // ============================================

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  // ============================================
  // 6. RENDER: Decorative Elements
  // ============================================

  const renderDecorativeElements = () => {
    if (!decorative && !cornerIcon) return null;

    return (
      <>
        {/* Corner Icon */}
        {cornerIcon && (
          <div
            className={`
              absolute z-10
              p-2 rounded-lg
              bg-brand-surface/80 backdrop-blur-sm
              border border-brand-border/50
              shadow-sm
              transition-all duration-300
              ${isHovered ? 'opacity-100 scale-100' : 'opacity-60 scale-90'}
              ${CORNER_ICON_POSITION_MAP[cornerIconPosition]}
            `}
          >
            {cornerIcon}
          </div>
        )}

        {/* Decorative Gradient Shapes */}
        {decorative && (
          <>
            <div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary/20 to-transparent blur-2xl pointer-events-none transition-opacity duration-500"
              style={{ opacity: isHovered ? 0.8 : 0.3 }}
            />
            <div
              className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-gradient-to-tr from-brand-secondary/20 to-transparent blur-2xl pointer-events-none transition-opacity duration-500"
              style={{ opacity: isHovered ? 0.8 : 0.3 }}
            />
            <div
              className="absolute top-1/2 right-0 w-16 h-16 rounded-full bg-gradient-to-l from-brand-accent/10 to-transparent blur-xl pointer-events-none transition-opacity duration-500"
              style={{ opacity: isHovered ? 0.6 : 0.2 }}
            />
          </>
        )}
      </>
    );
  };

  // ============================================
  // 7. RENDER: Parallax Children Wrapper
  // ============================================

  const renderChildren = () => {
    if (!parallaxEnable) return children;

    // Apply parallax transform to direct children
    // This is a simplified version — full implementation would recursively traverse
    const parallaxStyle: CSSProperties = {
      transform: `translateX(${tiltX * parallaxIntensity * 10}px) translateY(${-tiltY * parallaxIntensity * 10}px)`,
      transformStyle: 'preserve-3d',
      transition: tiltState === 'exit' ? `transform ${speed}ms ${easingValue}` : undefined,
    };

    if (isValidElement(children)) {
      return cloneElement(children as React.ReactElement<any>, {
        style: {
          ...((children as React.ReactElement<any>).props?.style || {}),
          ...parallaxStyle,
        },
      });
    }

    return <div style={parallaxStyle}>{children}</div>;
  };

  // ============================================
  // 8. MAIN RENDER
  // ============================================

  const WrapperComponent = href ? 'a' : 'div';
  const wrapperProps = href
    ? {
        href,
        target: external ? '_blank' : undefined,
        rel: external ? 'noopener noreferrer' : undefined,
      }
    : {};

  return (
    <div
      className={`
        relative inline-block
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      style={containerStyles}
    >
      {/* Gradient Border Layer */}
      {gradientBorder && <div style={gradientBorderStyles} aria-hidden="true" />}

      <WrapperComponent
        ref={cardRef}
        id={id}
        className={`
          relative overflow-hidden
          rounded-2xl
          ${variantConfig.background}
          ${variantConfig.border}
          ${variantConfig.shadow}
          ${sizeConfig.padding}
          ${clickable || onClick || href ? 'cursor-pointer' : ''}
          transition-shadow duration-300
          group/card
        `}
        style={cardStyles}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={clickable || onClick || href ? 'button' : undefined}
        tabIndex={clickable || onClick || href ? 0 : undefined}
        aria-label={ariaLabel}
        {...wrapperProps}
      >
        {/* Spotlight Layer */}
        {spotlightEnable && <div style={spotlightStyles} aria-hidden="true" />}

        {/* Glare Layer */}
        <div style={glareStyles} aria-hidden="true" />

        {/* Badge */}
        {badge && (
          <div
            className={`
              absolute z-20
              ${BADGE_POSITION_MAP[badgePosition]}
            `}
          >
            <span
              className={`
                inline-flex items-center gap-1.5
                px-2.5 py-1
                rounded-full
                text-xs font-medium
                bg-gradient-to-r from-brand-primary to-brand-secondary
                text-white
                shadow-lg
                transition-all duration-300
                ${isHovered ? 'scale-105 shadow-xl' : 'scale-100'}
              `}
            >
              {badgeIcon && <span className="flex-shrink-0">{badgeIcon}</span>}
              {badge}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        {hoverOverlay && (
          <div
            className={`
              absolute inset-0 z-10
              flex items-center justify-center
              bg-black/50 backdrop-blur-sm
              transition-opacity duration-300
              ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
          >
            {hoverOverlay}
          </div>
        )}

        {/* Decorative Elements */}
        {renderDecorativeElements()}

        {/* Main Content (with optional parallax) */}
        <div className="relative z-[2]">
          {renderChildren()}
        </div>

        {/* Subtle shine overlay on hover */}
        {isHovered && variant !== 'minimal' && (
          <div
            className="absolute inset-0 pointer-events-none z-[3]"
            style={{
              background: `linear-gradient(
                ${tiltX * 45 + 135}deg,
                rgba(255, 255, 255, 0.03) 0%,
                transparent 50%,
                rgba(255, 255, 255, 0.01) 100%
              )`,
              borderRadius: 'inherit',
            }}
            aria-hidden="true"
          />
        )}
      </WrapperComponent>
    </div>
  );
};

// ============================================
// 9. TILT CARD CONTENT HELPER COMPONENTS
// ============================================

interface TiltCardHeaderProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const TiltCardHeader: React.FC<TiltCardHeaderProps> = ({
  children,
  className = '',
  icon,
  action,
}) => (
  <div className={`flex items-start justify-between gap-3 mb-4 ${className}`}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
          <div className="text-brand-primary">{icon}</div>
        </div>
      )}
      <div className="min-w-0">{children}</div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

interface TiltCardBodyProps {
  children: ReactNode;
  className?: string;
}

export const TiltCardBody: React.FC<TiltCardBodyProps> = ({
  children,
  className = '',
}) => <div className={`space-y-3 ${className}`}>{children}</div>;

interface TiltCardFooterProps {
  children: ReactNode;
  className?: string;
}

export const TiltCardFooter: React.FC<TiltCardFooterProps> = ({
  children,
  className = '',
}) => (
  <div
    className={`mt-4 pt-4 border-t border-brand-border/50 flex items-center justify-between gap-3 ${className}`}
  >
    {children}
  </div>
);

interface TiltCardBadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

export const TiltCardBadge: React.FC<TiltCardBadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  const variantStyles: Record<string, string> = {
    primary: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
    secondary: 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2 py-0.5 rounded-full
        text-xs font-medium
        border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

// ============================================
// 10. DISPLAY NAME
// ============================================

TiltCard.displayName = 'TiltCard';
TiltCardHeader.displayName = 'TiltCardHeader';
TiltCardBody.displayName = 'TiltCardBody';
TiltCardFooter.displayName = 'TiltCardFooter';
TiltCardBadge.displayName = 'TiltCardBadge';

// ============================================
// 11. NAMED EXPORTS
// ============================================

export {
  TiltCardHeader,
  TiltCardBody,
  TiltCardFooter,
  TiltCardBadge,
  VARIANT_MAP,
  SIZE_MAP,
  DEFAULT_MAX_TILT,
  DEFAULT_PERSPECTIVE,
  DEFAULT_SCALE,
  DEFAULT_SPEED,
};

// ============================================
// 12. TYPE EXPORTS
// ============================================

export type {
  TiltAxis,
  GlarePosition,
  TiltScale,
  TiltEasing,
  PerspectiveOrigin,
  CardVariant,
  CardSize,
  TiltState,
  TiltCardProps,
  TiltCardHeaderProps,
  TiltCardBodyProps,
  TiltCardFooterProps,
  TiltCardBadgeProps,
};

// ============================================
// 13. DEFAULT EXPORT
// ============================================

export default TiltCard;