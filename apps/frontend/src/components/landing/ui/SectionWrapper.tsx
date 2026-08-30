// ============================================
// apps/frontend/src/components/landing/ui/SectionWrapper.tsx
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
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useInView } from '../../../hooks/useInView';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

// ============================================
// 1. TYPES
// ============================================

type SectionWidth = 'full' | 'wide' | 'standard' | 'narrow' | 'contained';

type SectionPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';

type SectionAlignment = 'left' | 'center' | 'right';

type SectionBackground = 'none' | 'default' | 'surface' | 'elevated' | 'gradient' | 'glass' | 'image' | 'video';

type SectionBorder = 'none' | 'top' | 'bottom' | 'both' | 'left' | 'right';

type SectionAnimation =
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale-in'
  | 'blur-in'
  | 'reveal';

type SectionDivider = 'none' | 'line' | 'gradient' | 'dots' | 'zigzag' | 'wave';

type SectionID =
  | 'hero'
  | 'features'
  | 'workflow'
  | 'integrations'
  | 'pricing'
  | 'testimonials'
  | 'stats'
  | 'cta'
  | 'faq'
  | 'footer'
  | 'custom';

interface SectionWrapperProps {
  /** Section content */
  children: ReactNode;
  /** Section ID for navigation */
  sectionId?: SectionID | string;
  /** Max width of content */
  maxWidth?: SectionWidth;
  /** Vertical padding preset */
  padding?: SectionPadding;
  /** Custom padding values (overrides preset) */
  customPadding?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** Content alignment */
  align?: SectionAlignment;
  /** Background style */
  background?: SectionBackground;
  /** Background color override */
  backgroundColor?: string;
  /** Background gradient (when background is 'gradient') */
  backgroundGradient?: {
    from: string;
    to: string;
    via?: string;
    direction?: 'to-r' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';
  };
  /** Background image URL */
  backgroundImage?: string;
  /** Background image overlay opacity */
  backgroundOverlay?: number;
  /** Background video URL */
  backgroundVideo?: string;
  /** Border position */
  border?: SectionBorder;
  /** Border color override */
  borderColor?: string;
  /** Divider style at bottom */
  divider?: SectionDivider;
  /** Divider color */
  dividerColor?: string;
  /** Entrance animation */
  animation?: SectionAnimation;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Animation threshold for intersection observer */
  animationThreshold?: number;
  /** Whether animation plays only once */
  animationOnce?: boolean;
  /** Whether to animate children with stagger */
  staggerChildren?: boolean;
  /** Stagger delay between children in ms */
  staggerDelay?: number;
  /** HTML section ID attribute */
  htmlId?: string;
  /** Whether to add scroll-margin-top for fixed nav */
  scrollMargin?: boolean;
  /** Scroll margin top in pixels */
  scrollMarginTop?: number;
  /** Whether section is full viewport height */
  fullHeight?: boolean;
  /** Minimum height override */
  minHeight?: number | string;
  /** Whether to add overflow hidden */
  overflowHidden?: boolean;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Whether section is interactive */
  interactive?: boolean;
  /** Click handler for entire section */
  onClick?: (event: React.MouseEvent) => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Label for section (shown in dev mode) */
  label?: string;
  /** Whether to show label in production */
  showLabel?: boolean;
  /** Render as different HTML element */
  as?: keyof JSX.IntrinsicElements;
}

export interface SectionWrapperHandle {
  /** Scroll section into view */
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
  /** Get section DOM element */
  getElement: () => HTMLElement | null;
  /** Get section visibility state */
  isVisible: () => boolean;
}

// ============================================
// 2. SIZE/SPACING PRESETS
// ============================================

const MAX_WIDTH_PRESETS: Record<SectionWidth, string> = {
  full: 'w-full',
  wide: 'max-w-[1400px]',
  standard: 'max-w-[1280px]',
  narrow: 'max-w-[960px]',
  contained: 'max-w-[720px]',
};

const PADDING_PRESETS: Record<SectionPadding, { top: number; bottom: number }> = {
  none: { top: 0, bottom: 0 },
  sm: { top: 32, bottom: 32 },
  md: { top: 64, bottom: 64 },
  lg: { top: 96, bottom: 96 },
  xl: { top: 128, bottom: 128 },
  '2xl': { top: 192, bottom: 192 },
  custom: { top: 0, bottom: 0 },
};

const ALIGNMENT_CLASSES: Record<SectionAlignment, string> = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
};

// ============================================
// 3. BACKGROUND CONFIGURATIONS
// ============================================

const BACKGROUND_CONFIG: Record<
  SectionBackground,
  { bg: string; text: string; border: string }
> = {
  none: {
    bg: '',
    text: '',
    border: '',
  },
  default: {
    bg: 'bg-[#0B0F1A]',
    text: 'text-white',
    border: 'border-[#1F2937]',
  },
  surface: {
    bg: 'bg-[#111827]',
    text: 'text-white',
    border: 'border-[#1F2937]',
  },
  elevated: {
    bg: 'bg-[#1F2937]',
    text: 'text-white',
    border: 'border-[#374151]',
  },
  gradient: {
    bg: 'bg-gradient-to-b from-[#0B0F1A] via-[#111827] to-[#0B0F1A]',
    text: 'text-white',
    border: 'border-[#1F2937]',
  },
  glass: {
    bg: 'bg-white/5 backdrop-blur-xl',
    text: 'text-white',
    border: 'border-white/10',
  },
  image: {
    bg: 'bg-cover bg-center bg-no-repeat',
    text: 'text-white',
    border: 'border-white/10',
  },
  video: {
    bg: '',
    text: 'text-white',
    border: 'border-white/10',
  },
};

// ============================================
// 4. SECTION DIVIDER SVG COMPONENTS
// ============================================

const LineDivider: React.FC<{ color?: string }> = ({ color = '#1F2937' }) => (
  <div
    className="w-full h-px"
    style={{ backgroundColor: color }}
    aria-hidden="true"
  />
);

const GradientDivider: React.FC<{ color?: string }> = ({ color = '#3B82F6' }) => (
  <div
    className="w-full h-px"
    style={{
      background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
    }}
    aria-hidden="true"
  />
);

const DotsDivider: React.FC<{ color?: string }> = ({ color = '#1F2937' }) => (
  <div className="flex justify-center gap-2 py-4" aria-hidden="true">
    {Array.from({ length: 40 }, (_, i) => (
      <div
        key={i}
        className="w-1 h-1 rounded-full"
        style={{ backgroundColor: color, opacity: 0.3 + Math.random() * 0.4 }}
      />
    ))}
  </div>
);

const ZigzagDivider: React.FC<{ color?: string }> = ({ color = '#1F2937' }) => (
  <svg
    className="w-full h-8"
    viewBox="0 0 1200 32"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <polyline
      points="0,32 50,0 100,32 150,0 200,32 250,0 300,32 350,0 400,32 450,0 500,32 550,0 600,32 650,0 700,32 750,0 800,32 850,0 900,32 950,0 1000,32 1050,0 1100,32 1150,0 1200,32"
      fill="none"
      stroke={color}
      strokeWidth="1"
      opacity="0.3"
    />
  </svg>
);

const WaveDivider: React.FC<{ color?: string }> = ({ color = '#1F2937' }) => (
  <svg
    className="w-full h-12"
    viewBox="0 0 1200 48"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      d="M0,24 C150,0 300,48 450,24 C600,0 750,48 900,24 C1050,0 1200,48 1200,48 L1200,48 L0,48 Z"
      fill={color}
      opacity="0.1"
    />
    <path
      d="M0,36 C150,12 300,48 450,36 C600,24 750,48 900,36 C1050,24 1200,48 1200,48 L1200,48 L0,48 Z"
      fill={color}
      opacity="0.05"
    />
  </svg>
);

const DIVIDER_COMPONENTS: Record<SectionDivider, React.FC<{ color?: string }>> = {
  none: () => null,
  line: LineDivider,
  gradient: GradientDivider,
  dots: DotsDivider,
  zigzag: ZigzagDivider,
  wave: WaveDivider,
};

// ============================================
// 5. CUSTOM HOOKS
// ============================================

// Intersection Observer hook for animation triggers
function useInView(
  ref: React.RefObject<HTMLElement>,
  options: { threshold?: number; rootMargin?: string; once?: boolean } = {}
): boolean {
  const [isInView, setIsInView] = useState(false);
  const hasBeenInView = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;

        if (options.once) {
          if (inView && !hasBeenInView.current) {
            hasBeenInView.current = true;
            setIsInView(true);
            observer.disconnect();
          }
        } else {
          setIsInView(inView);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px 0px -50px 0px',
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options.threshold, options.rootMargin, options.once]);

  return isInView;
}

// Reduced motion detection hook
function useReducedMotion(): boolean {
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
// 6. ANIMATION CLASSES
// ============================================

const ANIMATION_CLASSES: Record<SectionAnimation, { hidden: string; visible: string }> = {
  none: { hidden: '', visible: '' },
  'fade-in': {
    hidden: 'opacity-0',
    visible: 'opacity-100',
  },
  'slide-up': {
    hidden: 'opacity-0 translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'slide-down': {
    hidden: 'opacity-0 -translate-y-8',
    visible: 'opacity-100 translate-y-0',
  },
  'slide-left': {
    hidden: 'opacity-0 translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  'slide-right': {
    hidden: 'opacity-0 -translate-x-8',
    visible: 'opacity-100 translate-x-0',
  },
  'scale-in': {
    hidden: 'opacity-0 scale-95',
    visible: 'opacity-100 scale-100',
  },
  'blur-in': {
    hidden: 'opacity-0 blur-sm',
    visible: 'opacity-100 blur-0',
  },
  reveal: {
    hidden: 'opacity-0 translate-y-4 scale-[0.98]',
    visible: 'opacity-100 translate-y-0 scale-100',
  },
};

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const SectionWrapper = forwardRef<SectionWrapperHandle, SectionWrapperProps>(
  (
    {
      children,
      sectionId = 'custom',
      maxWidth = 'standard',
      padding = 'lg',
      customPadding,
      align = 'center',
      background = 'default',
      backgroundColor,
      backgroundGradient,
      backgroundImage,
      backgroundOverlay = 0.5,
      backgroundVideo,
      border = 'none',
      borderColor,
      divider = 'none',
      dividerColor,
      animation = 'none',
      animationDuration = 700,
      animationDelay = 0,
      animationThreshold = 0.15,
      animationOnce = true,
      staggerChildren = false,
      staggerDelay = 100,
      htmlId,
      scrollMargin = true,
      scrollMarginTop = 80,
      fullHeight = false,
      minHeight,
      overflowHidden = true,
      respectReducedMotion = true,
      interactive = false,
      onClick,
      className = '',
      style,
      label,
      showLabel = false,
      as: Component = 'section',
    },
    ref
  ) => {
    // ============================================
    // State
    // ============================================

    const [isVisible, setIsVisible] = useState(false);
    const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
    const [isDev] = useState(() => {
      if (typeof window !== 'undefined') {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      }
      return false;
    });

    // Refs
    const sectionRef = useRef<HTMLElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasEnteredRef = useRef(false);

    // ============================================
    // Derived Values
    // ============================================

    const paddingConfig = PADDING_PRESETS[padding];
    const bgConfig = BACKGROUND_CONFIG[background];
    const widthClass = MAX_WIDTH_PRESETS[maxWidth];
    const alignClass = ALIGNMENT_CLASSES[align];
    const animConfig = ANIMATION_CLASSES[animation];

    // Effective padding
    const effectivePaddingTop = customPadding?.top ?? paddingConfig.top;
    const effectivePaddingBottom = customPadding?.bottom ?? paddingConfig.bottom;
    const effectivePaddingLeft = customPadding?.left ?? 0;
    const effectivePaddingRight = customPadding?.right ?? 0;

    // Border classes
    const borderClasses = useMemo(() => {
      switch (border) {
        case 'top':
          return 'border-t';
        case 'bottom':
          return 'border-b';
        case 'both':
          return 'border-t border-b';
        case 'left':
          return 'border-l';
        case 'right':
          return 'border-r';
        default:
          return '';
      }
    }, [border]);

    // ============================================
    // Effects: Reduced Motion
    // ============================================

    useEffect(() => {
      if (!respectReducedMotion) return;

      const checkMotion = () => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setShouldReduceMotion(mediaQuery.matches);
      };

      checkMotion();

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
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
      const element = sectionRef.current;
      if (!element || animation === 'none' || shouldReduceMotion) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (animationOnce && hasEnteredRef.current) return;
            hasEnteredRef.current = true;

            // Add delay if specified
            if (animationDelay > 0) {
              setTimeout(() => {
                setIsVisible(true);
              }, animationDelay);
            } else {
              setIsVisible(true);
            }

            if (animationOnce) {
              observer.disconnect();
            }
          } else if (!animationOnce) {
            setIsVisible(false);
          }
        },
        {
          threshold: animationThreshold,
          rootMargin: '0px 0px -50px 0px',
        }
      );

      observer.observe(element);
      return () => observer.disconnect();
    }, [animation, animationOnce, animationDelay, animationThreshold, shouldReduceMotion]);

    // ============================================
    // Effects: Background Video
    // ============================================

    useEffect(() => {
      if (!backgroundVideo || !videoRef.current) return;

      const video = videoRef.current;
      video.play().catch(() => {
        // Autoplay might be blocked
        video.muted = true;
        video.play();
      });
    }, [backgroundVideo]);

    // ============================================
    // Handlers
    // ============================================

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (interactive && onClick) {
          onClick(event);
        }
      },
      [interactive, onClick]
    );

    // ============================================
    // Public API
    // ============================================

    useImperativeHandle(
      ref,
      () => ({
        scrollIntoView: (options?: ScrollIntoViewOptions) => {
          sectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            ...options,
          });
        },
        getElement: () => sectionRef.current,
        isVisible: () => isVisible,
      }),
      [isVisible]
    );

    // ============================================
    // Container Styles
    // ============================================

    const sectionStyle = useMemo((): CSSProperties => {
      const base: CSSProperties = {
        ...style,
        paddingTop: `${effectivePaddingTop}px`,
        paddingBottom: `${effectivePaddingBottom}px`,
        paddingLeft: effectivePaddingLeft > 0 ? `${effectivePaddingLeft}px` : undefined,
        paddingRight: effectivePaddingRight > 0 ? `${effectivePaddingRight}px` : undefined,
      };

      // Custom background color
      if (backgroundColor) {
        base.backgroundColor = backgroundColor;
      }

      // Background image
      if (backgroundImage) {
        base.backgroundImage = `url(${backgroundImage})`;
        base.backgroundSize = 'cover';
        base.backgroundPosition = 'center';
        base.backgroundRepeat = 'no-repeat';
      }

      // Scroll margin for fixed nav
      if (scrollMargin) {
        base.scrollMarginTop = `${scrollMarginTop}px`;
      }

      // Min height
      if (fullHeight) {
        base.minHeight = '100vh';
      } else if (minHeight) {
        base.minHeight = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;
      }

      return base;
    }, [
      style,
      effectivePaddingTop,
      effectivePaddingBottom,
      effectivePaddingLeft,
      effectivePaddingRight,
      backgroundColor,
      backgroundImage,
      scrollMargin,
      scrollMarginTop,
      fullHeight,
      minHeight,
    ]);

    // Content wrapper style
    const contentWrapperStyle = useMemo((): CSSProperties => {
      const base: CSSProperties = {};

      if (animation !== 'none' && !shouldReduceMotion) {
        base.transition = `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        base.transitionDelay = '0ms';
      }

      return base;
    }, [animation, animationDuration, shouldReduceMotion]);

    // ============================================
    // Render: Background Gradient Overlay
    // ============================================

    const renderBackgroundGradient = () => {
      if (!backgroundGradient) return null;

      const { from, to, via, direction = 'to-b' } = backgroundGradient;
      const gradientStops = via
        ? `${from}, ${via}, ${to}`
        : `${from}, ${to}`;

      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${direction.replace('to-', 'to ')} , ${gradientStops})`,
          }}
          aria-hidden="true"
        />
      );
    };

    // ============================================
    // Render: Background Image Overlay
    // ============================================

    const renderImageOverlay = () => {
      if (!backgroundImage) return null;

      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: `rgba(11, 15, 26, ${backgroundOverlay})`,
          }}
          aria-hidden="true"
        />
      );
    };

    // ============================================
    // Render: Background Video
    // ============================================

    const renderBackgroundVideo = () => {
      if (!backgroundVideo) return null;

      return (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            src={backgroundVideo}
            loop
            muted
            playsInline
            autoPlay
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: `rgba(11, 15, 26, ${backgroundOverlay})`,
            }}
            aria-hidden="true"
          />
        </>
      );
    };

    // ============================================
    // Render: Stagger Children
    // ============================================

    const renderStaggerChildren = () => {
      if (!staggerChildren) return children;

      return React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const childStyle: CSSProperties = {
          ...(child.props?.style || {}),
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) ${index * staggerDelay}ms`,
        };

        return React.cloneElement(child as React.ReactElement<any>, {
          style: childStyle,
        });
      });
    };

    // ============================================
    // Animation Classes
    // ============================================

    const animationClasses = useMemo(() => {
      if (animation === 'none' || shouldReduceMotion) return '';

      if (isVisible) {
        return animConfig.visible;
      }

      return animConfig.hidden;
    }, [animation, shouldReduceMotion, isVisible, animConfig]);

    // ============================================
    // 8. RENDER
    // ============================================

    return (
      <Component
        ref={sectionRef as any}
        id={htmlId || sectionId}
        data-section={sectionId}
        className={`
          relative
          ${bgConfig.bg}
          ${bgConfig.text}
          ${bgConfig.border}
          ${borderClasses}
          ${overflowHidden ? 'overflow-hidden' : ''}
          ${interactive ? 'cursor-pointer' : ''}
          ${className}
        `}
        style={{
          ...sectionStyle,
          borderColor: borderColor || undefined,
        }}
        onClick={handleClick}
      >
        {/* Background Layers */}
        {renderBackgroundGradient()}
        {renderBackgroundVideo()}
        {renderImageOverlay()}

        {/* Content Container */}
        <div
          className={`
            relative
            mx-auto
            px-6 lg:px-12
            ${widthClass}
            ${alignClass}
            ${animationClasses}
          `}
          style={contentWrapperStyle}
        >
          {/* Stagger Children or Direct Children */}
          {staggerChildren ? renderStaggerChildren() : children}
        </div>

        {/* Bottom Divider */}
        {divider !== 'none' && (
          <div className="relative z-10">
            {React.createElement(DIVIDER_COMPONENTS[divider], {
              color: dividerColor,
            })}
          </div>
        )}

        {/* Dev Label */}
        {(isDev || showLabel) && label && (
          <div
            className="absolute top-2 left-2 z-50 px-2 py-1 bg-primary/80 text-white text-xs rounded-md pointer-events-none opacity-70"
            aria-hidden="true"
          >
            {label}
          </div>
        )}
      </Component>
    );
  }
);

// ============================================
// 9. SECTION HEADER SUB-COMPONENT
// ============================================

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Section subtitle/description */
  subtitle?: string;
  /** Section badge/tag text */
  badge?: string;
  /** Badge icon */
  badgeIcon?: ReactNode;
  /** Badge color variant */
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'warning';
  /** Title HTML tag */
  titleTag?: 'h1' | 'h2' | 'h3' | 'h4';
  /** Whether to show decorative line */
  showLine?: boolean;
  /** Whether to show decorative dots */
  showDots?: boolean;
  /** Alignment override */
  align?: SectionAlignment;
  /** Max width of header text */
  maxWidth?: string;
  /** Custom CSS class */
  className?: string;
  /** Children (additional content below header) */
  children?: ReactNode;
}

const BADGE_VARIANTS: Record<string, string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-secondary/10 text-secondary border-secondary/20',
  success: 'bg-green-500/10 text-green-500 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  badgeIcon,
  badgeVariant = 'primary',
  titleTag: TitleTag = 'h2',
  showLine = false,
  showDots = false,
  align = 'center',
  maxWidth = 'max-w-2xl',
  className = '',
  children,
}) => {
  const alignClass = ALIGNMENT_CLASSES[align];

  return (
    <div className={`mb-12 md:mb-16 lg:mb-20 ${alignClass} ${className}`}>
      {/* Badge */}
      {badge && (
        <div className="mb-4">
          <span
            className={`
              inline-flex items-center gap-2
              px-3 py-1.5 rounded-full
              text-sm font-medium
              border
              ${BADGE_VARIANTS[badgeVariant]}
            `}
          >
            {badgeIcon}
            {badge}
          </span>
        </div>
      )}

      {/* Decorative Dots */}
      {showDots && (
        <div className="flex justify-center gap-1.5 mb-4" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary opacity-40"
              style={{ opacity: 0.2 + i * 0.15 }}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <TitleTag
        className={`
          font-bold tracking-tight
          ${TitleTag === 'h1' ? 'text-4xl md:text-5xl lg:text-6xl' : ''}
          ${TitleTag === 'h2' ? 'text-3xl md:text-4xl lg:text-5xl' : ''}
          ${TitleTag === 'h3' ? 'text-2xl md:text-3xl lg:text-4xl' : ''}
          ${TitleTag === 'h4' ? 'text-xl md:text-2xl lg:text-3xl' : ''}
          text-white
          ${maxWidth}
          ${align === 'center' ? 'mx-auto' : ''}
        `}
      >
        {title}
      </TitleTag>

      {/* Decorative Line */}
      {showLine && (
        <div
          className={`
            mt-4 mb-4
            h-1 w-16
            bg-gradient-to-r from-primary to-secondary
            rounded-full
            ${align === 'center' ? 'mx-auto' : ''}
          `}
          aria-hidden="true"
        />
      )}

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`
            mt-4
            text-lg md:text-xl
            text-gray-400
            leading-relaxed
            ${maxWidth}
            ${align === 'center' ? 'mx-auto' : ''}
          `}
        >
          {subtitle}
        </p>
      )}

      {/* Additional Content */}
      {children}
    </div>
  );
};

// ============================================
// 10. SECTION FOOTER SUB-COMPONENT
// ============================================

interface SectionFooterProps {
  children: ReactNode;
  className?: string;
  showDivider?: boolean;
}

export const SectionFooter: React.FC<SectionFooterProps> = ({
  children,
  className = '',
  showDivider = true,
}) => {
  return (
    <div
      className={`
        mt-12 md:mt-16 lg:mt-20
        pt-8
        ${showDivider ? 'border-t border-[#1F2937]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// ============================================
// 11. SECTION GRID SUB-COMPONENT
// ============================================

interface SectionGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: CSSProperties;
}

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

const GRID_GAPS: Record<string, string> = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12',
};

export const SectionGrid: React.FC<SectionGridProps> = ({
  children,
  columns = 3,
  gap = 'md',
  className = '',
  style,
}) => {
  return (
    <div
      className={`grid ${GRID_COLS[columns]} ${GRID_GAPS[gap]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

// ============================================
// 12. SECTION DIVIDER COMPONENT (Standalone)
// ============================================

interface SectionDividerProps {
  type?: SectionDivider;
  color?: string;
  className?: string;
  flip?: boolean;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({
  type = 'gradient',
  color,
  className = '',
  flip = false,
}) => {
  const DividerComponent = DIVIDER_COMPONENTS[type];

  return (
    <div className={`relative ${flip ? 'rotate-180' : ''} ${className}`}>
      <DividerComponent color={color} />
    </div>
  );
};

// ============================================
// 13. DISPLAY NAMES
// ============================================

SectionWrapper.displayName = 'SectionWrapper';
SectionHeader.displayName = 'SectionHeader';
SectionFooter.displayName = 'SectionFooter';
SectionGrid.displayName = 'SectionGrid';
SectionDivider.displayName = 'SectionDivider';

// ============================================
// 14. NAMED EXPORTS
// ============================================

export {
  LineDivider,
  GradientDivider,
  DotsDivider,
  ZigzagDivider,
  WaveDivider,
  DIVIDER_COMPONENTS,
  MAX_WIDTH_PRESETS,
  PADDING_PRESETS,
  ALIGNMENT_CLASSES,
  BACKGROUND_CONFIG,
  ANIMATION_CLASSES,
};

// ============================================
// 15. TYPE EXPORTS
// ============================================

export type {
  SectionWidth,
  SectionPadding,
  SectionAlignment,
  SectionBackground,
  SectionBorder,
  SectionAnimation,
  SectionDivider as SectionDividerType,
  SectionID,
  SectionWrapperProps,
  SectionWrapperHandle,
  SectionHeaderProps,
  SectionFooterProps,
  SectionGridProps,
  SectionDividerProps as SectionDividerComponentProps,
};

// ============================================
// 16. DEFAULT EXPORT
// ============================================

export default SectionWrapper;
