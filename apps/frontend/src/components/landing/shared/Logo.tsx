// ============================================
// apps/frontend/src/components/landing/shared/Logo.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, { useMemo, forwardRef, useEffect, useState, useCallback } from 'react';

// ============================================
// 1. TYPES
// ============================================

type LogoVariant = 'full' | 'icon' | 'wordmark' | 'symbol';
type LogoTheme = 'light' | 'dark' | 'auto';
type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
type LogoFormat = 'svg' | 'png';
type AnimationStyle = 'none' | 'fade' | 'slide' | 'draw' | 'pulse' | 'glow';

interface LogoDimensions {
  width: number;
  height: number;
}

interface LogoProps {
  /** Visual variant of the logo */
  variant?: LogoVariant;
  /** Color theme */
  theme?: LogoTheme;
  /** Predefined size */
  size?: LogoSize;
  /** Custom dimensions (overrides size) */
  dimensions?: LogoDimensions;
  /** Animation style */
  animation?: AnimationStyle;
  /** Image format to use */
  format?: LogoFormat;
  /** Whether the logo links to the homepage */
  linkToHome?: boolean;
  /** Custom href if linkToHome is true */
  href?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Additional CSS classes */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
  /** Whether the logo is clickable */
  clickable?: boolean;
  /** Click handler (when used as a button) */
  onClick?: (event: React.MouseEvent) => void;
  /** Whether to show a loading skeleton */
  isLoading?: boolean;
  /** Called when the logo image successfully loads */
  onLoad?: () => void;
  /** Called when the logo image fails to load */
  onError?: () => void;
  /** Whether to use the inline SVG (for animation support) */
  useInlineSvg?: boolean;
}

// ============================================
// 2. SIZE PRESETS (Design Token Compliant)
// ============================================

const SIZE_PRESETS: Record<LogoSize, LogoDimensions> = {
  xs:   { width: 24,  height: 24  },
  sm:   { width: 32,  height: 32  },
  md:   { width: 40,  height: 40  },
  lg:   { width: 48,  height: 48  },
  xl:   { width: 64,  height: 64  },
  '2xl': { width: 96,  height: 96 },
  custom: { width: 40, height: 40 }, // Override with `dimensions` prop
};

// Variant aspect ratios (width / height)
const VARIANT_RATIOS: Record<LogoVariant, number> = {
  full:     4.0,  // Wide horizontal logo with text
  icon:     1.0,  // Square icon only
  wordmark: 5.5,  // Text only, wide
  symbol:   1.0,  // Symbol/graphic only
};

// ============================================
// 3. INLINE SVG LOGO (for animations)
// ============================================

/**
 * Inline SVG Logo Component
 * This allows CSS animations on individual SVG elements,
 * which is not possible with <img> tags.
 */
const InlineSvgLogo: React.FC<{
  variant: LogoVariant;
  theme: LogoTheme;
  animation: AnimationStyle;
  dimensions: LogoDimensions;
}> = ({ variant, theme, animation, dimensions }) => {
  const themeColors = {
    light: {
      primary: '#3B82F6',
      secondary: '#7C3AED',
      accent: '#EC4899',
      text: '#FFFFFF',
      background: 'transparent',
    },
    dark: {
      primary: '#3B82F6',
      secondary: '#7C3AED',
      accent: '#EC4899',
      text: '#0B0F1A',
      background: 'transparent',
    },
    auto: {
      primary: '#3B82F6',
      secondary: '#7C3AED',
      accent: '#EC4899',
      text: 'currentColor',
      background: 'transparent',
    },
  };

  const colors = themeColors[theme];

  const animationClasses = {
    none: '',
    fade: 'animate-logo-fade-in',
    slide: 'animate-logo-slide-in',
    draw: 'animate-logo-draw',
    pulse: 'animate-logo-pulse',
    glow: 'animate-logo-glow',
  };

  const animClass = animationClasses[animation];

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animClass} transition-all duration-300`}
      aria-hidden="true"
      role="img"
    >
      {/* Defs for gradients and filters */}
      <defs>
        {/* Primary gradient */}
        <linearGradient id="logo-gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.secondary} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>

        {/* Glow filter */}
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Shadow filter */}
        <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* ============================================ */}
      {/* ICON / SYMBOL (left side of full logo)       */}
      {/* ============================================ */}
      {(variant === 'full' || variant === 'icon' || variant === 'symbol') && (
        <g
          className={`logo-icon ${animation === 'glow' ? 'filter-[url(#logo-glow)]' : ''}`}
          transform={variant === 'full' ? 'translate(0, 0)' : 'translate(0, 0)'}
        >
          {/* Background rounded square */}
          <rect
            x="0"
            y="0"
            width="40"
            height="40"
            rx="10"
            fill="url(#logo-gradient-primary)"
            className="transition-all duration-500"
          />

          {/* AI node icon */}
          {/* Central circle */}
          <circle
            cx="20"
            cy="20"
            r="6"
            fill="white"
            className="logo-pulse-circle"
          />

          {/* Orbiting dots */}
          <circle
            cx="20"
            cy="7"
            r="2.5"
            fill="white"
            opacity="0.9"
            className="logo-orbit-1"
          />
          <circle
            cx="30"
            cy="14"
            r="2.5"
            fill="white"
            opacity="0.7"
            className="logo-orbit-2"
          />
          <circle
            cx="33"
            cy="26"
            r="2.5"
            fill="white"
            opacity="0.8"
            className="logo-orbit-3"
          />
          <circle
            cx="20"
            cy="33"
            r="2.5"
            fill="white"
            opacity="0.6"
            className="logo-orbit-4"
          />
          <circle
            cx="7"
            cy="26"
            r="2.5"
            fill="white"
            opacity="0.9"
            className="logo-orbit-5"
          />
          <circle
            cx="10"
            cy="14"
            r="2.5"
            fill="white"
            opacity="0.7"
            className="logo-orbit-6"
          />

          {/* Connecting lines */}
          <line x1="20" y1="7" x2="20" y2="14" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <line x1="27.5" y1="16" x2="30" y2="14" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <line x1="30" y1="24" x2="33" y2="26" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <line x1="20" y1="30" x2="20" y2="33" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <line x1="10" y1="24" x2="7" y2="26" stroke="white" strokeWidth="0.5" opacity="0.3" />
          <line x1="12.5" y1="16" x2="10" y2="14" stroke="white" strokeWidth="0.5" opacity="0.3" />
        </g>
      )}

      {/* ============================================ */}
      {/* WORDMARK / TEXT (right side of full logo)     */}
      {/* ============================================ */}
      {(variant === 'full' || variant === 'wordmark') && (
        <g
          className="logo-text"
          transform={variant === 'full' ? 'translate(50, 8)' : 'translate(8, 8)'}
        >
          {/* Main brand name */}
          <text
            x="0"
            y="14"
            fontFamily="'Inter', system-ui, sans-serif"
            fontSize="16"
            fontWeight="800"
            letterSpacing="-0.02em"
            fill={colors.text}
            className="logo-text-brand"
          >
            UPCATERS
          </text>

          {/* Tagline */}
          {variant === 'full' && (
            <text
              x="0"
              y="26"
              fontFamily="'Inter', system-ui, sans-serif"
              fontSize="7"
              fontWeight="500"
              letterSpacing="0.05em"
              fill={colors.text}
              opacity="0.5"
              className="logo-text-tagline"
            >
              AI AGENT PLATFORM
            </text>
          )}
        </g>
      )}
    </svg>
  );
};

// ============================================
// 4. FALLBACK IMAGE PATHS
// ============================================

/**
 * Generates the appropriate image URL based on variant, theme, and format
 */
const getImageUrl = (
  variant: LogoVariant,
  theme: LogoTheme,
  format: LogoFormat
): string => {
  const themeSuffix = theme === 'dark' ? '-dark' : '';
  const ext = format === 'png' ? 'png' : 'svg';

  switch (variant) {
    case 'full':
      return `/logo-full${themeSuffix}.${ext}`;
    case 'icon':
      return `/logo-icon${themeSuffix}.${ext}`;
    case 'wordmark':
      return `/logo-wordmark${themeSuffix}.${ext}`;
    case 'symbol':
      return `/logo-symbol${themeSuffix}.${ext}`;
    default:
      return `/logo-full${themeSuffix}.${ext}`;
  }
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

export const Logo = forwardRef<HTMLDivElement, LogoProps>(
  (
    {
      variant = 'full',
      theme = 'auto',
      size = 'md',
      dimensions,
      animation = 'none',
      format = 'svg',
      linkToHome = false,
      href = '/',
      alt = 'UPCATERS — AI Agent Platform',
      className = '',
      style,
      id,
      clickable = false,
      onClick,
      isLoading = false,
      onLoad,
      onError,
      useInlineSvg = false,
    },
    ref
  ) => {
    // ============================================
    // State
    // ============================================
    const [hasError, setHasError] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
      if (theme === 'auto') {
        if (typeof window !== 'undefined') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        }
        return 'light';
      }
      return theme;
    });

    // ============================================
    // Effects
    // ============================================

    // Listen for system theme changes when theme is 'auto'
    useEffect(() => {
      if (theme !== 'auto') return;

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // ============================================
    // Derived State
    // ============================================

    const resolvedDimensions = useMemo(() => {
      if (dimensions) return dimensions;

      const base = SIZE_PRESETS[size];
      const ratio = VARIANT_RATIOS[variant];

      return {
        width: Math.round(base.height * ratio),
        height: base.height,
      };
    }, [size, variant, dimensions]);

    // ============================================
    // Event Handlers
    // ============================================

    const handleImageLoad = useCallback(() => {
      setHasLoaded(true);
      onLoad?.();
    }, [onLoad]);

    const handleImageError = useCallback(() => {
      setHasError(true);
      onError?.();
    }, [onError]);

    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        if (onClick) {
          onClick(event);
        }
      },
      [onClick]
    );

    // ============================================
    // Render: Loading Skeleton
    // ============================================

    if (isLoading) {
      return (
        <div
          ref={ref}
          id={id}
          className={`landing-skeleton ${className}`}
          style={{
            width: resolvedDimensions.width,
            height: resolvedDimensions.height,
            borderRadius: 'var(--radius-md)',
            ...style,
          }}
          aria-busy="true"
          aria-label="Loading logo"
        />
      );
    }

    // ============================================
    // Render: Error Fallback
    // ============================================

    if (hasError) {
      return (
        <div
          ref={ref}
          id={id}
          className={`flex items-center justify-center ${className}`}
          style={{
            width: resolvedDimensions.width,
            height: resolvedDimensions.height,
            background: 'linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))',
            borderRadius: 'var(--radius-md)',
            ...style,
          }}
          role="img"
          aria-label={alt}
        >
          <span
            className="text-white font-bold select-none"
            style={{
              fontSize: resolvedDimensions.height * 0.4,
              fontFamily: 'var(--font-sans)',
            }}
          >
            U
          </span>
        </div>
      );
    }

    // ============================================
    // Render: Logo Content
    // ============================================

    const renderLogoContent = () => {
      // Use inline SVG for animations or when requested
      if (useInlineSvg || animation !== 'none') {
        return (
          <InlineSvgLogo
            variant={variant}
            theme={effectiveTheme}
            animation={animation}
            dimensions={resolvedDimensions}
          />
        );
      }

      // Use <img> tag for static logos
      const imageUrl = getImageUrl(variant, effectiveTheme, format);

      return (
        <img
          src={imageUrl}
          alt={alt}
          width={resolvedDimensions.width}
          height={resolvedDimensions.height}
          className={`
            object-contain
            transition-opacity duration-300
            ${hasLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="eager"
          draggable={false}
        />
      );
    };

    // ============================================
    // Render: Wrapper (with optional link)
    // ============================================

    const logoContent = (
      <div
        ref={ref}
        id={id}
        className={`
          inline-flex items-center justify-center
          flex-shrink-0 select-none
          ${clickable || linkToHome ? 'cursor-pointer' : ''}
          ${className}
        `}
        style={{
          width: resolvedDimensions.width,
          height: resolvedDimensions.height,
          ...style,
        }}
        onClick={clickable || linkToHome ? handleClick : undefined}
        role={linkToHome ? undefined : 'img'}
        aria-label={linkToHome ? undefined : alt}
      >
        {renderLogoContent()}
      </div>
    );

    // Wrap in anchor if linkToHome is true
    if (linkToHome) {
      return (
        <a
          href={href}
          className="inline-flex items-center no-underline"
          aria-label={alt}
          onClick={(e) => {
            if (onClick) {
              // If custom onClick is provided, prevent default navigation
              // This allows the Logo to be used as a button with custom logic
            }
          }}
        >
          {logoContent}
        </a>
      );
    }

    return logoContent;
  }
);

// ============================================
// 6. DISPLAY NAME (for React DevTools)
// ============================================

Logo.displayName = 'Logo';

// ============================================
// 7. NAMED EXPORTS
// ============================================

export {
  SIZE_PRESETS,
  VARIANT_RATIOS,
  InlineSvgLogo,
  getImageUrl,
};

// ============================================
// 8. TYPE EXPORTS
// ============================================

export type {
  LogoVariant,
  LogoTheme,
  LogoSize,
  LogoFormat,
  AnimationStyle,
  LogoDimensions,
  LogoProps,
};

// ============================================
// 9. DEFAULT EXPORT
// ============================================


export default Logo;
