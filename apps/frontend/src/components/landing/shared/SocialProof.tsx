// ============================================
// apps/frontend/src/components/landing/shared/SocialProof.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Star, Award, TrendingUp, Shield, Users, Zap, CheckCircle } from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type SocialProofVariant =
  | 'logo-strip'
  | 'stats-bar'
  | 'testimonial-avatars'
  | 'rating-badge'
  | 'full-banner'
  | 'compact'
  | 'enterprise';

type SocialProofSize = 'sm' | 'md' | 'lg';

type AnimationStyle = 'none' | 'fade' | 'marquee' | 'count-up';

interface LogoItem {
  /** Company logo URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Company name (displayed as title on hover) */
  name: string;
  /** Logo width in pixels */
  width?: number;
  /** Logo height in pixels */
  height?: number;
  /** URL to company website (optional) */
  href?: string;
  /** Whether this is a featured/highlighted logo */
  featured?: boolean;
  /** Dark mode variant of the logo */
  darkSrc?: string;
}

interface StatItem {
  /** Unique identifier */
  id: string;
  /** Display value (e.g., "10,000+") */
  value: string;
  /** Numeric value for counting animation */
  numericValue?: number;
  /** Label below the value */
  label: string;
  /** Optional icon component name */
  icon?: React.ReactNode;
  /** Optional prefix before the value */
  prefix?: string;
  /** Optional suffix after the value */
  suffix?: string;
  /** Color accent for this stat */
  accent?: 'primary' | 'secondary' | 'success' | 'warning';
  /** Tooltip description */
  tooltip?: string;
  /** Source/attribution for the stat */
  source?: string;
}

interface RatingItem {
  /** Platform name */
  platform: string;
  /** Rating value (e.g., 4.9) */
  rating: number;
  /** Maximum possible rating */
  maxRating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Platform logo */
  logo?: string;
  /** Review page URL */
  href?: string;
  /** Star color */
  starColor?: string;
}

interface TestimonialAvatar {
  /** Avatar image URL */
  src: string;
  /** Person's name */
  name: string;
  /** Person's role/company */
  role?: string;
  /** Whether this person is verified */
  verified?: boolean;
  /** Tooltip text */
  tooltip?: string;
}

interface EnterpriseBadge {
  /** Badge label */
  label: string;
  /** Badge icon */
  icon?: React.ReactNode;
  /** Badge description */
  description?: string;
  /** URL for verification */
  verificationUrl?: string;
}

interface SocialProofProps {
  /** Visual variant */
  variant?: SocialProofVariant;
  /** Component size */
  size?: SocialProofSize;
  /** Animation style */
  animation?: AnimationStyle;
  /** Whether to animate on scroll into view */
  animateOnScroll?: boolean;
  /** Company logos (for logo-strip variant) */
  logos?: LogoItem[];
  /** Statistics (for stats-bar variant) */
  stats?: StatItem[];
  /** Ratings (for rating-badge variant) */
  ratings?: RatingItem[];
  /** Testimonial avatars (for testimonial-avatars variant) */
  avatars?: TestimonialAvatar[];
  /** Enterprise badges */
  badges?: EnterpriseBadge[];
  /** Heading text (for full-banner variant) */
  heading?: string;
  /** Subheading text */
  subheading?: string;
  /** Number of logos to show before "+ more" */
  maxVisibleLogos?: number;
  /** Number of avatars to show before "+ more" */
  maxVisibleAvatars?: number;
  /** Whether to show the "Trusted by X+ teams" text */
  showTrustedBy?: boolean;
  /** Custom trusted by text */
  trustedByText?: string;
  /** Whether logos should be grayscale */
  grayscale?: boolean;
  /** Whether to show logo names on hover */
  showNamesOnHover?: boolean;
  /** Marquee speed in seconds (for marquee animation) */
  marqueeSpeed?: number;
  /** Whether to pause marquee on hover */
  pauseOnHover?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
}

// ============================================
// 2. DEFAULT DATA
// ============================================

const DEFAULT_LOGOS: LogoItem[] = [
  {
    src: '/logos/acme.svg',
    darkSrc: '/logos/acme-dark.svg',
    alt: 'Acme Corp',
    name: 'Acme Corp',
    featured: true,
  },
  {
    src: '/logos/techflow.svg',
    darkSrc: '/logos/techflow-dark.svg',
    alt: 'TechFlow',
    name: 'TechFlow',
  },
  {
    src: '/logos/growthpulse.svg',
    darkSrc: '/logos/growthpulse-dark.svg',
    alt: 'GrowthPulse',
    name: 'GrowthPulse',
  },
  {
    src: '/logos/atlas.svg',
    darkSrc: '/logos/atlas-dark.svg',
    alt: 'Atlas Logistics',
    name: 'Atlas Logistics',
    featured: true,
  },
  {
    src: '/logos/novatech.svg',
    darkSrc: '/logos/novatech-dark.svg',
    alt: 'NovaTech',
    name: 'NovaTech',
  },
  {
    src: '/logos/finbridge.svg',
    darkSrc: '/logos/finbridge-dark.svg',
    alt: 'FinBridge',
    name: 'FinBridge',
    featured: true,
  },
  {
    src: '/logos/medcore.svg',
    darkSrc: '/logos/medcore-dark.svg',
    alt: 'MedCore Health',
    name: 'MedCore Health',
  },
  {
    src: '/logos/cloudpeak.svg',
    darkSrc: '/logos/cloudpeak-dark.svg',
    alt: 'CloudPeak',
    name: 'CloudPeak',
  },
  {
    src: '/logos/datawise.svg',
    darkSrc: '/logos/datawise-dark.svg',
    alt: 'DataWise',
    name: 'DataWise',
  },
  {
    src: '/logos/shipfast.svg',
    darkSrc: '/logos/shipfast-dark.svg',
    alt: 'ShipFast',
    name: 'ShipFast',
  },
  {
    src: '/logos/buildlab.svg',
    darkSrc: '/logos/buildlab-dark.svg',
    alt: 'BuildLab',
    name: 'BuildLab',
  },
  {
    src: '/logos/scaleup.svg',
    darkSrc: '/logos/scaleup-dark.svg',
    alt: 'ScaleUp',
    name: 'ScaleUp',
  },
];

const DEFAULT_STATS: StatItem[] = [
  {
    id: 'teams',
    value: '10,000+',
    numericValue: 10000,
    label: 'Active Teams',
    icon: <Users className="h-5 w-5" />,
    accent: 'primary',
  },
  {
    id: 'uptime',
    value: '99.99%',
    numericValue: 99.99,
    label: 'Platform Uptime',
    icon: <Shield className="h-5 w-5" />,
    accent: 'success',
  },
  {
    id: 'executions',
    value: '2.5M+',
    numericValue: 2500000,
    label: 'AI Actions Executed',
    icon: <Zap className="h-5 w-5" />,
    accent: 'secondary',
  },
  {
    id: 'satisfaction',
    value: '4.9/5',
    numericValue: 4.9,
    label: 'Customer Rating',
    icon: <Star className="h-5 w-5" />,
    accent: 'warning',
  },
];

const DEFAULT_RATINGS: RatingItem[] = [
  {
    platform: 'G2',
    rating: 4.8,
    maxRating: 5,
    reviewCount: 342,
    logo: '/logos/g2.svg',
    href: 'https://www.g2.com/products/upcaters',
  },
  {
    platform: 'Product Hunt',
    rating: 4.9,
    maxRating: 5,
    reviewCount: 189,
    logo: '/logos/producthunt.svg',
    href: 'https://www.producthunt.com/products/upcaters',
  },
  {
    platform: 'Capterra',
    rating: 4.7,
    maxRating: 5,
    reviewCount: 256,
    logo: '/logos/capterra.svg',
    href: 'https://www.capterra.com/p/upcaters',
  },
];

const DEFAULT_AVATARS: TestimonialAvatar[] = [
  {
    src: '/avatars/sarah.jpg',
    name: 'Sarah Johnson',
    role: 'CTO at TechFlow',
    verified: true,
    tooltip: 'Sarah Johnson — CTO at TechFlow',
  },
  {
    src: '/avatars/marcus.jpg',
    name: 'Marcus Chen',
    role: 'VP Marketing at GrowthPulse',
    verified: true,
    tooltip: 'Marcus Chen — VP Marketing at GrowthPulse',
  },
  {
    src: '/avatars/elena.jpg',
    name: 'Elena Rodriguez',
    role: 'Ops Director at Atlas',
    verified: true,
    tooltip: 'Elena Rodriguez — Ops Director at Atlas',
  },
  {
    src: '/avatars/david.jpg',
    name: 'David Kim',
    role: 'Founder at NovaTech',
    verified: true,
    tooltip: 'David Kim — Founder at NovaTech',
  },
  {
    src: '/avatars/amara.jpg',
    name: 'Amara Okafor',
    role: 'Head of Product at FinBridge',
    verified: true,
    tooltip: 'Amara Okafor — Head of Product at FinBridge',
  },
];

const DEFAULT_BADGES: EnterpriseBadge[] = [
  {
    label: 'SOC 2 Type II',
    icon: <Shield className="h-4 w-4" />,
    description: 'Independently audited for security',
  },
  {
    label: 'GDPR Compliant',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'European data protection standards',
  },
  {
    label: '99.99% Uptime SLA',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Enterprise-grade reliability guarantee',
  },
  {
    label: 'ISO 27001',
    icon: <Award className="h-4 w-4" />,
    description: 'Information security management',
  },
];

// ============================================
// 3. CONSTANTS
// ============================================

const STAR_COLORS = {
  filled: '#F59E0B',
  empty: '#374151',
};

const ACCENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  primary: {
    bg: 'bg-brand-primary/10',
    text: 'text-brand-primary',
    border: 'border-brand-primary/20',
  },
  secondary: {
    bg: 'bg-brand-secondary/10',
    text: 'text-brand-secondary',
    border: 'border-brand-secondary/20',
  },
  success: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    border: 'border-green-500/20',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    border: 'border-yellow-500/20',
  },
};

// ============================================
// 4. HELPER COMPONENTS
// ============================================

/**
 * Star Rating Component
 * Renders a row of filled/partial/empty stars with a numeric rating
 */
const StarRating: React.FC<{
  rating: number;
  maxRating: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showNumeric?: boolean;
  className?: string;
}> = ({
  rating,
  maxRating,
  size = 'sm',
  color = STAR_COLORS.filled,
  showNumeric = true,
  className = '',
}) => {
  const starSizes = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
  const starSize = starSizes[size];

  const stars = useMemo(() => {
    const result: Array<{ type: 'filled' | 'half' | 'empty'; key: string }> = [];
    for (let i = 1; i <= maxRating; i++) {
      if (rating >= i) {
        result.push({ type: 'filled', key: `star-${i}` });
      } else if (rating >= i - 0.5) {
        result.push({ type: 'half', key: `star-${i}` });
      } else {
        result.push({ type: 'empty', key: `star-${i}` });
      }
    }
    return result;
  }, [rating, maxRating]);

  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of ${maxRating} stars`}>
      <div className="flex items-center">
        {stars.map((star) => {
          if (star.type === 'filled') {
            return (
              <Star
                key={star.key}
                className={`${starSize} flex-shrink-0`}
                fill={color}
                stroke={color}
                strokeWidth={1}
              />
            );
          }
          if (star.type === 'half') {
            return (
              <span key={star.key} className={`${starSize} relative flex-shrink-0`}>
                <Star
                  className={`${starSize} absolute inset-0`}
                  fill={STAR_COLORS.empty}
                  stroke={STAR_COLORS.empty}
                  strokeWidth={1}
                />
                <svg
                  className={`${starSize} absolute inset-0`}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <clipPath id={`half-star-clip-${star.key}`}>
                      <rect x="0" y="0" width="12" height="24" />
                    </clipPath>
                  </defs>
                  <Star
                    className={starSize}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                    clipPath={`url(#half-star-clip-${star.key})`}
                  />
                </svg>
              </span>
            );
          }
          return (
            <Star
              key={star.key}
              className={`${starSize} flex-shrink-0`}
              fill={STAR_COLORS.empty}
              stroke={STAR_COLORS.empty}
              strokeWidth={1}
            />
          );
        })}
      </div>
      {showNumeric && (
        <span className="text-xs font-semibold text-text-primary ml-1.5">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

/**
 * Animated Counter Component
 * Animates from 0 to the target numeric value on scroll
 */
const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatValue?: string;
  className?: string;
}> = ({
  value,
  duration = 2000,
  prefix = '',
  suffix = '',
  formatValue,
  className = '',
}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(value * eased);
            setCurrentValue(current);

            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animate);
            }
          };

          animationRef.current = requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, hasAnimated]);

  const displayValue = formatValue || currentValue.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

export const SocialProof: React.FC<SocialProofProps> = ({
  variant = 'logo-strip',
  size = 'md',
  animation = 'fade',
  animateOnScroll = true,
  logos = DEFAULT_LOGOS,
  stats = DEFAULT_STATS,
  ratings = DEFAULT_RATINGS,
  avatars = DEFAULT_AVATARS,
  badges = DEFAULT_BADGES,
  heading,
  subheading,
  maxVisibleLogos = 8,
  maxVisibleAvatars = 5,
  showTrustedBy = true,
  trustedByText,
  grayscale = true,
  showNamesOnHover = true,
  marqueeSpeed = 30,
  pauseOnHover = true,
  className = '',
  style,
  id,
}) => {
  // ============================================
  // Derived State
  // ============================================

  const visibleLogos = useMemo(
    () => logos.slice(0, maxVisibleLogos),
    [logos, maxVisibleLogos]
  );

  const remainingLogoCount = useMemo(
    () => Math.max(0, logos.length - maxVisibleLogos),
    [logos, maxVisibleLogos]
  );

  const visibleAvatars = useMemo(
    () => avatars.slice(0, maxVisibleAvatars),
    [avatars, maxVisibleAvatars]
  );

  const remainingAvatarCount = useMemo(
    () => Math.max(0, avatars.length - maxVisibleAvatars),
    [avatars, maxVisibleAvatars]
  );

  const defaultTrustedByText = useMemo(() => {
    if (trustedByText) return trustedByText;
    const total = logos.length + 2; // Approximate
    return `Trusted by ${total}+ companies worldwide`;
  }, [trustedByText, logos.length]);

  // ============================================
  // Size-dependent styles
  // ============================================

  const sizeStyles = {
    sm: {
      logoHeight: 'h-6',
      avatarSize: 'w-7 h-7',
      statValue: 'text-xl',
      statLabel: 'text-xs',
      gap: 'gap-3',
      padding: 'px-3 py-2',
    },
    md: {
      logoHeight: 'h-8',
      avatarSize: 'w-9 h-9',
      statValue: 'text-2xl',
      statLabel: 'text-sm',
      gap: 'gap-4',
      padding: 'px-4 py-3',
    },
    lg: {
      logoHeight: 'h-10',
      avatarSize: 'w-11 h-11',
      statValue: 'text-3xl',
      statLabel: 'text-base',
      gap: 'gap-6',
      padding: 'px-6 py-4',
    },
  };

  const currentSize = sizeStyles[size];

  // ============================================
  // Animation wrapper
  // ============================================

  const animationClass = useMemo(() => {
    if (animation === 'none') return '';
    return animateOnScroll ? 'landing-animate-fade-up' : '';
  }, [animation, animateOnScroll]);

  // ============================================
  // Render: Logo Strip
  // ============================================

  const renderLogoStrip = () => (
    <div
      id={id}
      className={`flex flex-col items-center ${currentSize.gap} ${animationClass} ${className}`}
      style={style}
    >
      {showTrustedBy && (
        <p className="text-sm text-text-muted font-medium text-center">
          {defaultTrustedByText}
        </p>
      )}

      <div className={`flex flex-wrap items-center justify-center ${currentSize.gap}`}>
        {visibleLogos.map((logo, index) => (
          <div
            key={`logo-${index}`}
            className={`
              flex items-center justify-center
              ${currentSize.padding}
              ${grayscale ? 'opacity-50 hover:opacity-100' : 'opacity-70 hover:opacity-100'}
              transition-all duration-200
              ${showNamesOnHover ? 'group relative' : ''}
            `}
            title={logo.name}
          >
            {logo.href ? (
              <a
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                aria-label={`${logo.name} website`}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  width={logo.width}
                  height={logo.height}
                  className={`
                    ${currentSize.logoHeight} w-auto object-contain
                    ${grayscale ? 'grayscale hover:grayscale-0' : ''}
                    transition-all duration-300
                  `}
                  loading="lazy"
                />
              </a>
            ) : (
              <img
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className={`
                  ${currentSize.logoHeight} w-auto object-contain
                  ${grayscale ? 'grayscale hover:grayscale-0' : ''}
                  transition-all duration-300
                `}
                loading="lazy"
              />
            )}

            {showNamesOnHover && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-brand-dark border border-brand-border rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                {logo.name}
                {logo.featured && (
                  <span className="ml-1 text-brand-primary">★</span>
                )}
              </div>
            )}
          </div>
        ))}

        {remainingLogoCount > 0 && (
          <div
            className={`
              flex items-center justify-center
              ${currentSize.padding}
              group relative
            `}
          >
            <span className="text-sm font-medium text-text-muted">
              +{remainingLogoCount} more
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // Render: Stats Bar
  // ============================================

  const renderStatsBar = () => (
    <div
      id={id}
      className={`grid grid-cols-2 md:grid-cols-4 ${currentSize.gap} ${animationClass} ${className}`}
      style={style}
    >
      {stats.map((stat) => {
        const accentStyles = stat.accent
          ? ACCENT_COLORS[stat.accent]
          : ACCENT_COLORS.primary;

        return (
          <div
            key={stat.id}
            className="flex flex-col items-center text-center p-4 rounded-xl bg-brand-surface/50 border border-brand-border/50 hover:border-brand-border transition-colors duration-200"
            title={stat.tooltip}
          >
            {stat.icon && (
              <div
                className={`p-2 rounded-lg ${accentStyles.bg} ${accentStyles.text} mb-3`}
              >
                {stat.icon}
              </div>
            )}
            <span className={`${currentSize.statValue} font-bold text-text-primary`}>
              {stat.prefix}
              {stat.value}
              {stat.suffix}
            </span>
            <span className={`${currentSize.statLabel} text-text-muted mt-1`}>
              {stat.label}
            </span>
            {stat.source && (
              <span className="text-xs text-text-muted mt-1 opacity-60">
                {stat.source}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  // ============================================
  // Render: Rating Badges
  // ============================================

  const renderRatingBadges = () => (
    <div
      id={id}
      className={`flex flex-wrap items-center justify-center ${currentSize.gap} ${animationClass} ${className}`}
      style={style}
    >
      {ratings.map((ratingItem, index) => (
        <a
          key={`rating-${index}`}
          href={ratingItem.href || '#'}
          target={ratingItem.href ? '_blank' : undefined}
          rel={ratingItem.href ? 'noopener noreferrer' : undefined}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl
            bg-brand-surface border border-brand-border
            hover:border-brand-primary/50 hover:shadow-sm
            transition-all duration-200
            ${ratingItem.href ? 'cursor-pointer' : 'cursor-default'}
          `}
          onClick={(e) => {
            if (!ratingItem.href) e.preventDefault();
          }}
        >
          {ratingItem.logo && (
            <img
              src={ratingItem.logo}
              alt={ratingItem.platform}
              className="h-5 w-auto flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="flex flex-col">
            <StarRating
              rating={ratingItem.rating}
              maxRating={ratingItem.maxRating}
              size="sm"
              color={ratingItem.starColor || STAR_COLORS.filled}
              showNumeric
            />
            <span className="text-xs text-text-muted mt-0.5">
              {ratingItem.reviewCount.toLocaleString()}+ reviews
            </span>
          </div>
        </a>
      ))}
    </div>
  );

  // ============================================
  // Render: Testimonial Avatars
  // ============================================

  const renderTestimonialAvatars = () => (
    <div
      id={id}
      className={`flex flex-col items-center ${currentSize.gap} ${animationClass} ${className}`}
      style={style}
    >
      <div className="flex items-center">
        {/* Avatar stack */}
        <div className="flex items-center -space-x-2">
          {visibleAvatars.map((avatar, index) => (
            <div
              key={`avatar-${index}`}
              className="group relative"
              title={avatar.tooltip || avatar.name}
            >
              <img
                src={avatar.src}
                alt={avatar.name}
                className={`
                  ${currentSize.avatarSize} rounded-full object-cover
                  border-2 border-brand-dark
                  ring-2 ring-brand-border/30
                  hover:ring-brand-primary/50 hover:scale-110 hover:z-10
                  transition-all duration-200
                `}
                loading="lazy"
              />
              {avatar.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-brand-primary rounded-full flex items-center justify-center border-2 border-brand-dark">
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                </div>
              )}

              {/* Tooltip on hover */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-brand-dark border border-brand-border rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                <p className="font-medium">{avatar.name}</p>
                {avatar.role && (
                  <p className="text-text-muted text-[10px]">{avatar.role}</p>
                )}
              </div>
            </div>
          ))}

          {remainingAvatarCount > 0 && (
            <div
              className={`
                ${currentSize.avatarSize} rounded-full
                bg-brand-elevated border-2 border-brand-dark
                flex items-center justify-center
                ring-2 ring-brand-border/30
              `}
            >
              <span className="text-xs font-medium text-text-muted">
                +{remainingAvatarCount}
              </span>
            </div>
          )}
        </div>

        {/* Rating summary */}
        <div className="ml-4 flex flex-col">
          <StarRating
            rating={4.9}
            maxRating={5}
            size="sm"
            showNumeric
          />
          <span className="text-xs text-text-muted mt-0.5">
            from 500+ reviews
          </span>
        </div>
      </div>
    </div>
  );

  // ============================================
  // Render: Full Banner
  // ============================================

  const renderFullBanner = () => (
    <div
      id={id}
      className={`
        w-full bg-gradient-to-r from-brand-primary/5 via-brand-secondary/5 to-brand-primary/5
        border border-brand-border rounded-2xl p-6 md:p-8
        ${animationClass} ${className}
      `}
      style={style}
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Heading */}
        <div className="flex-1 text-center lg:text-left">
          {heading && (
            <h3 className="text-xl md:text-2xl font-bold text-text-primary mb-2">
              {heading}
            </h3>
          )}
          {subheading && (
            <p className="text-sm text-text-muted">{subheading}</p>
          )}
        </div>

        {/* Center: Logos */}
        <div className="flex flex-wrap items-center justify-center gap-4 flex-shrink-0">
          {visibleLogos.slice(0, 6).map((logo, index) => (
            <img
              key={`banner-logo-${index}`}
              src={logo.src}
              alt={logo.alt}
              className={`h-7 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity duration-200 ${grayscale ? 'grayscale hover:grayscale-0' : ''}`}
              loading="lazy"
              title={logo.name}
            />
          ))}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-6 flex-shrink-0">
          {stats.slice(0, 3).map((stat) => (
            <div key={stat.id} className="text-center">
              <p className="text-lg font-bold text-text-primary">
                {stat.value}
              </p>
              <p className="text-xs text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // Render: Compact
  // ============================================

  const renderCompact = () => (
    <div
      id={id}
      className={`flex items-center gap-3 ${animationClass} ${className}`}
      style={style}
    >
      {/* Avatar mini-stack */}
      <div className="flex items-center -space-x-1.5">
        {visibleAvatars.slice(0, 3).map((avatar, index) => (
          <img
            key={`compact-avatar-${index}`}
            src={avatar.src}
            alt={avatar.name}
            className="w-6 h-6 rounded-full object-cover border border-brand-dark"
            loading="lazy"
            title={avatar.name}
          />
        ))}
      </div>

      {/* Rating */}
      <StarRating rating={4.9} maxRating={5} size="sm" showNumeric={false} />

      {/* Text */}
      <span className="text-xs text-text-muted">
        {defaultTrustedByText}
      </span>
    </div>
  );

  // ============================================
  // Render: Enterprise Badges
  // ============================================

  const renderEnterprise = () => (
    <div
      id={id}
      className={`flex flex-wrap items-center justify-center ${currentSize.gap} ${animationClass} ${className}`}
      style={style}
    >
      {badges.map((badge, index) => (
        <div
          key={`badge-${index}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border hover:border-brand-primary/30 transition-colors duration-200 group relative"
          title={badge.description}
        >
          <span className="text-brand-primary">{badge.icon}</span>
          <span className="text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
            {badge.label}
          </span>

          {/* Tooltip */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-brand-dark border border-brand-border rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
            {badge.description}
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================
  // Render: Marquee Logo Strip
  // ============================================

  const renderMarquee = () => (
    <div
      id={id}
      className={`landing-marquee ${className}`}
      style={{
        ...style,
        ['--marquee-speed' as string]: `${marqueeSpeed}s`,
      }}
    >
      <div
        className={`landing-marquee__track ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
        style={{
          animationDuration: `${marqueeSpeed}s`,
        }}
      >
        {/* Duplicate logos for seamless loop */}
        {[...logos, ...logos].map((logo, index) => (
          <div
            key={`marquee-logo-${index}`}
            className="landing-marquee__item"
            title={logo.name}
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className={`${currentSize.logoHeight} w-auto object-contain ${grayscale ? 'grayscale' : ''}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // 6. VARIANT ROUTER
  // ============================================

  switch (variant) {
    case 'stats-bar':
      return renderStatsBar();

    case 'rating-badge':
      return renderRatingBadges();

    case 'testimonial-avatars':
      return renderTestimonialAvatars();

    case 'full-banner':
      return renderFullBanner();

    case 'compact':
      return renderCompact();

    case 'enterprise':
      return renderEnterprise();

    case 'logo-strip':
    default:
      // Use marquee if animation is set to marquee
      if (animation === 'marquee') {
        return renderMarquee();
      }
      return renderLogoStrip();
  }
};

// ============================================
// 7. DISPLAY NAME
// ============================================

SocialProof.displayName = 'SocialProof';

// ============================================
// 8. NAMED EXPORTS
// ============================================

export {
  StarRating,
  AnimatedCounter,
  DEFAULT_LOGOS,
  DEFAULT_STATS,
  DEFAULT_RATINGS,
  DEFAULT_AVATARS,
  DEFAULT_BADGES,
};

// ============================================
// 9. DEFAULT EXPORT
// ============================================


export default SocialProof;
