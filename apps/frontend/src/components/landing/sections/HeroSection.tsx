// ============================================
// apps/frontend/src/components/landing/sections/HeroSection.tsx
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
import { OrbEffect } from '../ui/OrbEffect';
import { GradientText } from '../ui/GradientText';
import { GlowingButton } from '../ui/GlowingButton';
import { ParticleBackground } from '../ui/ParticleBackground';
import { GridPattern } from '../ui/GridPattern';

// ============================================
// 1. TYPES
// ============================================

type HeroVariant = 'default' | 'centered' | 'split' | 'minimal' | 'fullscreen' | 'gradient' | 'particles';

type HeroSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

type HeroAnimation = 'fade-up' | 'slide-in' | 'scale-in' | 'typewriter' | 'none';

type HeroBackground = 'none' | 'gradient' | 'orbs' | 'particles' | 'grid' | 'image' | 'video' | 'mesh';

type HeroBadgeVariant = 'primary' | 'secondary' | 'success' | 'warning';

interface HeroBadge {
  /** Badge text */
  text: string;
  /** Badge icon */
  icon?: ReactNode;
  /** Badge variant */
  variant?: HeroBadgeVariant;
  /** Click handler */
  onClick?: () => void;
}

interface HeroCTA {
  /** Button label */
  label: string;
  /** Button href */
  href?: string;
  /** Button click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'glass' | 'premium';
  /** Button icon */
  icon?: ReactNode;
  /** Whether to show arrow */
  showArrow?: boolean;
  /** Whether to show glow */
  glow?: boolean;
  /** Whether this is the primary CTA */
  primary?: boolean;
}

interface HeroStat {
  /** Stat value */
  value: string;
  /** Stat label */
  label: string;
  /** Stat icon */
  icon?: ReactNode;
}

interface HeroTrust {
  /** Trust text */
  text?: string;
  /** Avatar URLs */
  avatars?: string[];
  /** Rating */
  rating?: number;
  /** Rating text */
  ratingText?: string;
  /** Company logos */
  logos?: string[];
}

interface HeroSectionProps {
  /** Main heading */
  title: string;
  /** Highlighted portion of title (gradient) */
  highlightedTitle?: string;
  /** Subtitle / description */
  subtitle?: string;
  /** Badge above title */
  badge?: HeroBadge;
  /** Primary CTA button */
  primaryCTA?: HeroCTA;
  /** Secondary CTA button */
  secondaryCTA?: HeroCTA;
  /** Additional CTA buttons */
  additionalCTAs?: HeroCTA[];
  /** Stats row */
  stats?: HeroStat[];
  /** Trust indicators */
  trust?: HeroTrust;
  /** Visual variant */
  variant?: HeroVariant;
  /** Size preset */
  size?: HeroSize;
  /** Background style */
  background?: HeroBackground;
  /** Background image URL */
  backgroundImage?: string;
  /** Background video URL */
  backgroundVideo?: string;
  /** Background overlay opacity */
  backgroundOverlay?: number;
  /** Entrance animation */
  animation?: HeroAnimation;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Custom graphic/illustration */
  graphic?: ReactNode;
  /** Graphic position */
  graphicPosition?: 'right' | 'left' | 'bottom' | 'background';
  /** Whether to show floating orbs */
  showOrbs?: boolean;
  /** Whether to show particles */
  showParticles?: boolean;
  /** Whether to show grid pattern */
  showGrid?: boolean;
  /** Whether to show scroll indicator */
  showScrollIndicator?: boolean;
  /** Whether to show keyboard shortcut hint */
  showShortcut?: boolean;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Section ID for navigation */
  sectionId?: string;
}

// ============================================
// 2. SIZE PRESETS
// ============================================

const SIZE_CONFIG: Record<
  HeroSize,
  {
    padding: string;
    title: string;
    subtitle: string;
    cta: string;
    gap: string;
    maxWidth: string;
    badge: string;
  }
> = {
  sm: {
    padding: 'py-16 md:py-24',
    title: 'text-3xl md:text-4xl lg:text-5xl',
    subtitle: 'text-base md:text-lg',
    cta: 'text-sm',
    gap: 'gap-6',
    maxWidth: 'max-w-3xl',
    badge: 'text-xs',
  },
  md: {
    padding: 'py-20 md:py-28',
    title: 'text-4xl md:text-5xl lg:text-6xl',
    subtitle: 'text-lg md:text-xl',
    cta: 'text-base',
    gap: 'gap-8',
    maxWidth: 'max-w-4xl',
    badge: 'text-sm',
  },
  lg: {
    padding: 'py-24 md:py-32',
    title: 'text-5xl md:text-6xl lg:text-7xl',
    subtitle: 'text-xl md:text-2xl',
    cta: 'text-lg',
    gap: 'gap-10',
    maxWidth: 'max-w-5xl',
    badge: 'text-sm',
  },
  xl: {
    padding: 'py-32 md:py-40',
    title: 'text-6xl md:text-7xl lg:text-8xl',
    subtitle: 'text-2xl md:text-3xl',
    cta: 'text-xl',
    gap: 'gap-12',
    maxWidth: 'max-w-6xl',
    badge: 'text-base',
  },
  fullscreen: {
    padding: 'min-h-screen flex items-center py-20',
    title: 'text-5xl md:text-6xl lg:text-7xl',
    subtitle: 'text-xl md:text-2xl',
    cta: 'text-lg',
    gap: 'gap-10',
    maxWidth: 'max-w-5xl',
    badge: 'text-sm',
  },
};

// ============================================
// 3. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes hero-fade-up {
    0% {
      opacity: 0;
      transform: translateY(30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes hero-slide-in {
    0% {
      opacity: 0;
      transform: translateX(-30px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes hero-scale-in {
    0% {
      opacity: 0;
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes hero-typewriter-cursor {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }

  @keyframes hero-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes hero-scroll-indicator {
    0%, 100% {
      transform: translateY(0);
      opacity: 1;
    }
    50% {
      transform: translateY(8px);
      opacity: 0.5;
    }
  }

  @keyframes hero-border-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
    }
    50% {
      box-shadow: 0 0 40px rgba(59, 130, 246, 0.25), 0 0 80px rgba(124, 58, 237, 0.1);
    }
  }

  @keyframes hero-stat-pop {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes hero-orb-1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -40px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }

  @keyframes hero-orb-2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-40px, -20px) scale(1.15); }
  }
`;

// ============================================
// 4. SUB-COMPONENT: Scroll Indicator
// ============================================

const ScrollIndicator: React.FC = () => (
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
    <span className="text-xs text-text-muted/50 uppercase tracking-widest">Scroll</span>
    <div className="w-5 h-8 border-2 border-text-muted/30 rounded-full flex items-start justify-center p-1">
      <div className="w-1.5 h-2 bg-text-muted/50 rounded-full animate-hero-scroll-indicator" />
    </div>
  </div>
);

// ============================================
// 5. SUB-COMPONENT: Stats Row
// ============================================

interface StatsRowProps {
  stats: HeroStat[];
  isInView: boolean;
}

const StatsRow: React.FC<StatsRowProps> = ({ stats, isInView }) => (
  <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
    {stats.map((stat, index) => (
      <div
        key={index}
        className="flex items-center gap-3"
        style={{
          animation: isInView
            ? `hero-stat-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.15 + 0.5}s both`
            : 'none',
        }}
      >
        {stat.icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            {stat.icon}
          </div>
        )}
        <div>
          <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-text-muted">{stat.label}</p>
        </div>
        {index < stats.length - 1 && (
          <div className="hidden md:block w-px h-12 bg-brand-border/50 mx-4" aria-hidden="true" />
        )}
      </div>
    ))}
  </div>
);

// ============================================
// 6. SUB-COMPONENT: Trust Indicators
// ============================================

interface TrustIndicatorsProps {
  trust: HeroTrust;
  isInView: boolean;
}

const TrustIndicators: React.FC<TrustIndicatorsProps> = ({ trust, isInView }) => (
  <div className="flex flex-col items-center gap-3">
    {/* Avatars + Text */}
    {trust.avatars && trust.avatars.length > 0 && (
      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          {trust.avatars.slice(0, 4).map((avatar, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-[#0B0F1A] bg-brand-border overflow-hidden"
            >
              <img src={avatar} alt="User avatar" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
          {trust.avatars.length > 4 && (
            <div className="w-8 h-8 rounded-full border-2 border-[#0B0F1A] bg-brand-primary flex items-center justify-center text-white text-xs font-bold">
              +{trust.avatars.length - 4}
            </div>
          )}
        </div>
        {trust.text && (
          <span className="text-sm text-text-muted">{trust.text}</span>
        )}
      </div>
    )}

    {/* Rating */}
    {trust.rating && (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <svg
              key={i}
              className={`w-4 h-4 ${i < Math.floor(trust.rating!) ? 'text-yellow-500' : 'text-gray-600'}`}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>
        {trust.ratingText && (
          <span className="text-sm text-text-muted">{trust.ratingText}</span>
        )}
      </div>
    )}

    {/* Company Logos */}
    {trust.logos && trust.logos.length > 0 && (
      <div className="flex items-center gap-6 opacity-50">
        <span className="text-xs text-text-muted">Trusted by</span>
        {trust.logos.map((logo, i) => (
          <img
            key={i}
            src={logo}
            alt="Company logo"
            className="h-5 w-auto object-contain brightness-0 invert"
            loading="lazy"
          />
        ))}
      </div>
    )}
  </div>
);

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  highlightedTitle,
  subtitle,
  badge,
  primaryCTA,
  secondaryCTA,
  additionalCTAs,
  stats,
  trust,
  variant = 'default',
  size = 'lg',
  background = 'gradient',
  backgroundImage,
  backgroundVideo,
  backgroundOverlay = 0.6,
  animation = 'fade-up',
  animationDuration = 700,
  animationDelay = 0,
  graphic,
  graphicPosition = 'right',
  showOrbs = true,
  showParticles = false,
  showGrid = false,
  showScrollIndicator = false,
  showShortcut = false,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'hero-section',
  sectionId,
}) => {
  // ============================================
  // State
  // ============================================

  const [isInView, setIsInView] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [typedText, setTypedText] = useState('');
  const [typedIndex, setTypedIndex] = useState(0);

  // Refs
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const sizeConfig = SIZE_CONFIG[size];

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
  // Effects: Inject Styles
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    const styleId = 'hero-section-animations';
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
  // Effects: Set in-view immediately or after delay
  // ============================================

  useEffect(() => {
    const timer = setTimeout(() => setIsInView(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // ============================================
  // Effects: Typewriter Animation
  // ============================================

  useEffect(() => {
    if (animation !== 'typewriter' || !highlightedTitle || shouldReduceMotion) {
      setTypedText(highlightedTitle || '');
      return;
    }

    typewriterRef.current = setInterval(() => {
      setTypedIndex((prev) => {
        const next = prev + 1;
        if (next > (highlightedTitle?.length || 0)) {
          if (typewriterRef.current) clearInterval(typewriterRef.current);
          return prev;
        }
        setTypedText(highlightedTitle!.substring(0, next));
        return next;
      });
    }, 80);

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [animation, highlightedTitle, shouldReduceMotion]);

  // ============================================
  // Effects: Background Video
  // ============================================

  useEffect(() => {
    if (!backgroundVideo || !videoRef.current) return;

    const video = videoRef.current;
    video.play().catch(() => {
      video.muted = true;
      video.play();
    });
  }, [backgroundVideo]);

  // ============================================
  // Effects: Mouse Parallax
  // ============================================

  useEffect(() => {
    if (!showOrbs || shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const element = sectionRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [showOrbs, shouldReduceMotion]);

  // ============================================
  // Handlers
  // ============================================

  const handleCTAClick = useCallback(
    (cta: HeroCTA) =>
      (event: React.MouseEvent) => {
        cta.onClick?.(event);
      },
    []
  );

  // ============================================
  // Render: Title with optional highlight
  // ============================================

  const renderTitle = () => {
    if (highlightedTitle && animation === 'typewriter') {
      const mainTitle = title.replace(highlightedTitle, '');
      return (
        <h1 className={`font-extrabold text-white leading-[1.05] tracking-tight ${sizeConfig.title}`}>
          {mainTitle}
          <GradientText
            preset="primary"
            size={size === 'xl' || size === 'fullscreen' ? '7xl' : '5xl'}
            weight="extrabold"
            as="span"
          >
            {typedText}
          </GradientText>
          {animation === 'typewriter' && (
            <span className="inline-block w-1 h-[0.8em] bg-brand-primary ml-1 animate-hero-typewriter-cursor" />
          )}
        </h1>
      );
    }

    if (highlightedTitle) {
      const parts = title.split(highlightedTitle);
      return (
        <h1 className={`font-extrabold text-white leading-[1.05] tracking-tight ${sizeConfig.title}`}>
          {parts[0]}
          <GradientText
            preset="primary"
            size={sizeConfig.title}
            weight="extrabold"
            as="span"
          >
            {highlightedTitle}
          </GradientText>
          {parts[1]}
        </h1>
      );
    }

    return (
      <h1 className={`font-extrabold text-white leading-[1.05] tracking-tight ${sizeConfig.title}`}>
        {title}
      </h1>
    );
  };

  // ============================================
  // 8. RENDER
  // ============================================

  const renderContent = () => (
    <>
      {/* Badge */}
      {badge && (
        <div
          className={`opacity-0 ${isInView ? 'opacity-100' : ''}`}
          style={{
            transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) 0ms`,
            transform: isInView ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <button
            onClick={badge.onClick}
            className={`
              inline-flex items-center gap-2
              px-4 py-1.5 rounded-full
              ${sizeConfig.badge}
              font-medium
              transition-all duration-200
              hover:scale-105
              ${badge.variant === 'secondary'
                ? 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                : badge.variant === 'success'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : badge.variant === 'warning'
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    : 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
              }
            `}
          >
            {badge.icon}
            {badge.text}
          </button>
        </div>
      )}

      {/* Title */}
      <div
        className={`opacity-0 ${isInView ? 'opacity-100' : ''}`}
        style={{
          transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) 100ms`,
          transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        }}
      >
        {renderTitle()}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`
            text-text-muted leading-relaxed
            ${sizeConfig.subtitle}
            ${variant === 'centered' || variant === 'minimal' ? 'mx-auto text-center' : ''}
            max-w-2xl
            opacity-0
            ${isInView ? 'opacity-100' : ''}
          `}
          style={{
            transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) 200ms`,
            transform: isInView ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          {subtitle}
        </p>
      )}

      {/* CTAs */}
      {(primaryCTA || secondaryCTA || additionalCTAs) && (
        <div
          className={`
            flex flex-wrap gap-3 md:gap-4
            ${variant === 'centered' || variant === 'minimal' ? 'justify-center' : ''}
            opacity-0
            ${isInView ? 'opacity-100' : ''}
          `}
          style={{
            transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) 300ms`,
            transform: isInView ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          {primaryCTA && (
            <GlowingButton
              variant={primaryCTA.variant || 'primary'}
              size="lg"
              onClick={handleCTAClick(primaryCTA)}
              href={primaryCTA.href}
              glow={primaryCTA.glow}
              showArrow={primaryCTA.showArrow}
            >
              {primaryCTA.icon}
              {primaryCTA.label}
            </GlowingButton>
          )}
          {secondaryCTA && (
            <GlowingButton
              variant={secondaryCTA.variant || 'outline'}
              size="lg"
              onClick={handleCTAClick(secondaryCTA)}
              href={secondaryCTA.href}
              showArrow={secondaryCTA.showArrow}
            >
              {secondaryCTA.icon}
              {secondaryCTA.label}
            </GlowingButton>
          )}
          {additionalCTAs?.map((cta, index) => (
            <GlowingButton
              key={index}
              variant={cta.variant || 'ghost'}
              size="lg"
              onClick={handleCTAClick(cta)}
              href={cta.href}
            >
              {cta.icon}
              {cta.label}
            </GlowingButton>
          ))}
        </div>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <div
          className={`
            pt-6 mt-2
            opacity-0
            ${isInView ? 'opacity-100' : ''}
          `}
          style={{
            transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) 500ms`,
          }}
        >
          <StatsRow stats={stats} isInView={isInView} />
        </div>
      )}

      {/* Trust Indicators */}
      {trust && (
        <div
          className={`
            pt-4
            opacity-0
            ${isInView ? 'opacity-100' : ''}
          `}
          style={{
            transition: `all ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) 600ms`,
          }}
        >
          <TrustIndicators trust={trust} isInView={isInView} />
        </div>
      )}
    </>
  );

  // ============================================
  // 9. VARIANT RENDERERS
  // ============================================

  const renderDefaultVariant = () => (
    <section
      ref={sectionRef}
      id={sectionId || id}
      className={`
        relative
        ${sizeConfig.padding}
        overflow-hidden
        ${className}
      `.trim()}
      style={style}
    >
      {/* Background Layers */}
      {renderBackgroundLayers()}

      <div className={`relative z-10 mx-auto px-6 lg:px-12 ${sizeConfig.maxWidth}`}>
        <div className={`flex flex-col ${sizeConfig.gap} ${variant === 'centered' ? 'items-center text-center' : ''}`}>
          {graphic && graphicPosition === 'top' && (
            <div className="flex justify-center mb-4">{graphic}</div>
          )}
          {renderContent()}
          {graphic && graphicPosition === 'bottom' && (
            <div className="flex justify-center mt-8">{graphic}</div>
          )}
        </div>
      </div>

      {showScrollIndicator && <ScrollIndicator />}
    </section>
  );

  const renderSplitVariant = () => (
    <section
      ref={sectionRef}
      id={sectionId || id}
      className={`
        relative
        ${sizeConfig.padding}
        overflow-hidden
        ${className}
      `.trim()}
      style={style}
    >
      {renderBackgroundLayers()}

      <div className={`relative z-10 mx-auto px-6 lg:px-12 ${sizeConfig.maxWidth}`}>
        <div className={`flex flex-col lg:flex-row items-center ${sizeConfig.gap} ${graphicPosition === 'left' ? 'lg:flex-row-reverse' : ''}`}>
          {/* Content Side */}
          <div className={`flex-1 flex flex-col ${sizeConfig.gap}`}>
            {renderContent()}
          </div>

          {/* Graphic Side */}
          {graphic && (
            <div
              className={`
                flex-1 flex items-center justify-center
                ${isInView && !shouldReduceMotion ? 'animate-hero-float' : ''}
              `}
              style={{
                animation: isInView && !shouldReduceMotion
                  ? 'hero-float 6s ease-in-out infinite'
                  : 'none',
              }}
            >
              {graphic}
            </div>
          )}
        </div>
      </div>

      {showScrollIndicator && <ScrollIndicator />}
    </section>
  );

  const renderMinimalVariant = () => (
    <section
      ref={sectionRef}
      id={sectionId || id}
      className={`
        relative
        ${sizeConfig.padding}
        ${className}
      `.trim()}
      style={style}
    >
      <div className={`relative z-10 mx-auto px-6 lg:px-12 ${sizeConfig.maxWidth} text-center`}>
        <div className={`flex flex-col items-center ${sizeConfig.gap}`}>
          {renderContent()}
        </div>
      </div>
    </section>
  );

  // ============================================
  // 10. BACKGROUND LAYERS
  // ============================================

  const renderBackgroundLayers = () => (
    <>
      {/* Gradient Background */}
      {(background === 'gradient' || background === 'orbs') && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #0B0F1A 0%, #111827 50%, #0B0F1A 100%)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Background Image */}
      {background === 'image' && backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backgroundImage})` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(11, 15, 26, ${backgroundOverlay})` }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Background Video */}
      {background === 'video' && backgroundVideo && (
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
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(11, 15, 26, ${backgroundOverlay})` }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Grid Pattern */}
      {showGrid && (
        <GridPattern
          type="dots"
          opacity="subtle"
          className="absolute inset-0 z-0"
        />
      )}

      {/* Particles */}
      {showParticles && (
        <ParticleBackground
          theme="default"
          config={{ count: 60, interaction: 'repel' }}
          className="absolute inset-0 z-0"
        />
      )}

      {/* Floating Orbs */}
      {showOrbs && (
        <OrbEffect
          orbCount={3}
          colorPalette={['#3B82F6', '#7C3AED', '#EC4899']}
          fillContainer
          className="absolute inset-0 z-0"
        />
      )}
    </>
  );

  // ============================================
  // 11. MAIN RENDER
  // ============================================

  switch (variant) {
    case 'split':
      return renderSplitVariant();
    case 'minimal':
      return renderMinimalVariant();
    case 'centered':
    case 'fullscreen':
    case 'gradient':
    case 'particles':
    case 'default':
    default:
      return renderDefaultVariant();
  }
};

// ============================================
// 12. HERO SECTION WRAPPER
// ============================================

export const HeroSectionWrapper: React.FC<HeroSectionProps> = (props) => {
  return <HeroSection {...props} />;
};

// ============================================
// 13. PRESET HERO COMPONENTS
// ============================================

interface PresetHeroProps {
  title: string;
  highlightedTitle?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export const DefaultHero: React.FC<PresetHeroProps> = ({
  title,
  highlightedTitle,
  subtitle,
  primaryLabel = 'Get Started Free',
  primaryHref = '#',
  secondaryLabel = 'Schedule Demo',
  secondaryHref = '#',
  className = '',
}) => (
  <HeroSection
    title={title}
    highlightedTitle={highlightedTitle}
    subtitle={subtitle}
    variant="default"
    size="lg"
    background="gradient"
    showOrbs
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true, glow: true }}
    secondaryCTA={{ label: secondaryLabel, href: secondaryHref, variant: 'outline' }}
    badge={{ text: 'New: AI Orchestrator v2.0', variant: 'primary' }}
    trust={{
      avatars: ['/avatars/1.jpg', '/avatars/2.jpg', '/avatars/3.jpg'],
      text: 'Join 10,000+ users',
      rating: 4.8,
      ratingText: 'from 500+ reviews',
    }}
    className={className}
  />
);

export const SplitHero: React.FC<PresetHeroProps & { graphic?: ReactNode }> = ({
  title,
  highlightedTitle,
  subtitle,
  primaryLabel = 'Get Started',
  primaryHref = '#',
  secondaryLabel = 'Learn More',
  secondaryHref = '#',
  graphic,
  className = '',
}) => (
  <HeroSection
    title={title}
    highlightedTitle={highlightedTitle}
    subtitle={subtitle}
    variant="split"
    size="lg"
    background="gradient"
    showOrbs
    graphic={graphic}
    graphicPosition="right"
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true, glow: true }}
    secondaryCTA={{ label: secondaryLabel, href: secondaryHref, variant: 'glass' }}
    className={className}
  />
);

export const MinimalHero: React.FC<PresetHeroProps> = ({
  title,
  highlightedTitle,
  subtitle,
  primaryLabel = 'Get Started',
  primaryHref = '#',
  secondaryLabel = 'Learn More',
  secondaryHref = '#',
  className = '',
}) => (
  <HeroSection
    title={title}
    highlightedTitle={highlightedTitle}
    subtitle={subtitle}
    variant="minimal"
    size="md"
    background="none"
    showOrbs={false}
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true }}
    secondaryCTA={{ label: secondaryLabel, href: secondaryHref, variant: 'ghost' }}
    className={className}
  />
);

export const FullscreenHero: React.FC<PresetHeroProps> = ({
  title,
  highlightedTitle,
  subtitle,
  primaryLabel = 'Get Started Free',
  primaryHref = '#',
  secondaryLabel = 'Watch Demo',
  secondaryHref = '#',
  className = '',
}) => (
  <HeroSection
    title={title}
    highlightedTitle={highlightedTitle}
    subtitle={subtitle}
    variant="fullscreen"
    size="fullscreen"
    background="particles"
    showOrbs
    showParticles
    showScrollIndicator
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true, glow: true }}
    secondaryCTA={{ label: secondaryLabel, href: secondaryHref, variant: 'glass' }}
    badge={{ text: 'Limited Time Offer', variant: 'warning' }}
    className={className}
  />
);

// ============================================
// 14. DISPLAY NAMES
// ============================================

HeroSection.displayName = 'HeroSection';
HeroSectionWrapper.displayName = 'HeroSectionWrapper';
DefaultHero.displayName = 'DefaultHero';
SplitHero.displayName = 'SplitHero';
MinimalHero.displayName = 'MinimalHero';
FullscreenHero.displayName = 'FullscreenHero';
ScrollIndicator.displayName = 'ScrollIndicator';
StatsRow.displayName = 'StatsRow';
TrustIndicators.displayName = 'TrustIndicators';

// ============================================
// 15. NAMED EXPORTS
// ============================================

export {
  ScrollIndicator,
  StatsRow,
  TrustIndicators,
  SIZE_CONFIG,
  ANIMATION_STYLES,
};

// ============================================
// 16. TYPE EXPORTS
// ============================================

export type {
  HeroVariant,
  HeroSize,
  HeroAnimation,
  HeroBackground,
  HeroBadgeVariant,
  HeroBadge,
  HeroCTA,
  HeroStat,
  HeroTrust,
  HeroSectionProps,
  PresetHeroProps,
  StatsRowProps,
  TrustIndicatorsProps,
};

// ============================================
// 17. DEFAULT EXPORT
// ============================================

export default HeroSection;
