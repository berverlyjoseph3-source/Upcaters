// ============================================
// apps/frontend/src/components/landing/sections/CTABanner.tsx
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

type CTABackground =
  | 'gradient'
  | 'image'
  | 'video'
  | 'dark'
  | 'glass'
  | 'minimal'
  | 'glow'
  | 'mesh';

type CTASize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

type CTAAnimation =
  | 'none'
  | 'fade-up'
  | 'slide-in'
  | 'scale-in'
  | 'glow-pulse'
  | 'particles';

type CTALayout = 'centered' | 'split' | 'card' | 'floating';

type CTAButtonStyle = 'primary' | 'secondary' | 'outline' | 'glass' | 'premium';

interface CTAButton {
  /** Button text */
  label: string;
  /** Button href */
  href?: string;
  /** Button click handler */
  onClick?: (event: React.MouseEvent) => void;
  /** Button style variant */
  variant?: CTAButtonStyle;
  /** Button icon */
  icon?: ReactNode;
  /** Whether button is external link */
  external?: boolean;
  /** Whether to show arrow on hover */
  showArrow?: boolean;
  /** Whether to show glow effect */
  glow?: boolean;
  /** Custom CSS class */
  className?: string;
}

interface CTABadge {
  /** Badge text */
  text: string;
  /** Badge icon */
  icon?: ReactNode;
  /** Badge variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

interface SocialProof {
  /** Number of users/customers */
  count?: number;
  /** Rating out of 5 */
  rating?: number;
  /** Avatar URLs for social proof */
  avatars?: string[];
  /** Testimonial text */
  testimonial?: string;
  /** Testimonial author */
  testimonialAuthor?: string;
  /** Testimonial author role */
  testimonialRole?: string;
  /** Logos of companies */
  companyLogos?: string[];
  /** Trust badges */
  trustBadges?: Array<{ icon: ReactNode; label: string }>;
}

interface CountdownTimer {
  /** End date */
  endDate: Date;
  /** Label */
  label?: string;
  /** Expired message */
  expiredMessage?: string;
  /** Whether to show days */
  showDays?: boolean;
  /** Whether to show hours */
  showHours?: boolean;
  /** Whether to show minutes */
  showMinutes?: boolean;
  /** Whether to show seconds */
  showSeconds?: boolean;
}

interface NewsletterForm {
  /** Placeholder text */
  placeholder?: string;
  /** Submit button text */
  buttonText?: string;
  /** Callback on submit */
  onSubmit: (email: string) => void;
  /** Success message */
  successMessage?: string;
  /** Error message */
  errorMessage?: string;
  /** Whether to show privacy note */
  showPrivacyNote?: boolean;
  /** Privacy note text */
  privacyNote?: string;
}

interface CTABannerProps {
  /** Main heading */
  title: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Badge above title */
  badge?: CTABadge;
  /** Primary CTA button */
  primaryCTA?: CTAButton;
  /** Secondary CTA button */
  secondaryCTA?: CTAButton;
  /** Additional action buttons */
  additionalCTAs?: CTAButton[];
  /** Background style */
  background?: CTABackground;
  /** Background image URL */
  backgroundImage?: string;
  /** Background video URL */
  backgroundVideo?: string;
  /** Background gradient config */
  backgroundGradient?: {
    from: string;
    to: string;
    via?: string;
    direction?: string;
  };
  /** Background overlay opacity (0-1) */
  backgroundOverlay?: number;
  /** Size preset */
  size?: CTASize;
  /** Layout style */
  layout?: CTALayout;
  /** Entrance animation */
  animation?: CTAAnimation;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Social proof configuration */
  socialProof?: SocialProof;
  /** Countdown timer configuration */
  countdown?: CountdownTimer;
  /** Newsletter form configuration */
  newsletter?: NewsletterForm;
  /** Custom icon/graphic */
  graphic?: ReactNode;
  /** Graphic position */
  graphicPosition?: 'left' | 'right' | 'top' | 'bottom' | 'background';
  /** Whether to show decorative elements */
  decorative?: boolean;
  /** Whether to show floating orbs */
  floatingOrbs?: boolean;
  /** Whether to show grid pattern */
  gridPattern?: boolean;
  /** Whether to add noise texture */
  noiseTexture?: boolean;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** HTML section ID */
  sectionId?: string;
  /** Whether to show on mobile (stacks vertically) */
  mobileFriendly?: boolean;
  /** Content max width */
  maxWidth?: string;
}

// ============================================
// 2. SIZE PRESETS
// ============================================

const SIZE_CONFIG: Record<
  CTASize,
  {
    padding: string;
    title: string;
    subtitle: string;
    button: string;
    gap: string;
    maxWidth: string;
  }
> = {
  sm: {
    padding: 'py-12 md:py-16',
    title: 'text-2xl md:text-3xl',
    subtitle: 'text-base md:text-lg',
    button: 'text-sm',
    gap: 'gap-6',
    maxWidth: 'max-w-2xl',
  },
  md: {
    padding: 'py-16 md:py-24',
    title: 'text-3xl md:text-4xl lg:text-5xl',
    subtitle: 'text-lg md:text-xl',
    button: 'text-base',
    gap: 'gap-8',
    maxWidth: 'max-w-3xl',
  },
  lg: {
    padding: 'py-24 md:py-32',
    title: 'text-4xl md:text-5xl lg:text-6xl',
    subtitle: 'text-xl md:text-2xl',
    button: 'text-lg',
    gap: 'gap-10',
    maxWidth: 'max-w-4xl',
  },
  xl: {
    padding: 'py-32 md:py-40',
    title: 'text-5xl md:text-6xl lg:text-7xl',
    subtitle: 'text-2xl md:text-3xl',
    button: 'text-xl',
    gap: 'gap-12',
    maxWidth: 'max-w-5xl',
  },
  fullscreen: {
    padding: 'min-h-screen flex items-center py-20',
    title: 'text-5xl md:text-6xl lg:text-7xl',
    subtitle: 'text-2xl md:text-3xl',
    button: 'text-xl',
    gap: 'gap-12',
    maxWidth: 'max-w-5xl',
  },
};

// ============================================
// 3. BACKGROUND CONFIGURATIONS
// ============================================

const BACKGROUND_CONFIG: Record<
  CTABackground,
  {
    bg: string;
    text: string;
    muted: string;
    overlay: string;
    border: string;
  }
> = {
  gradient: {
    bg: 'bg-gradient-to-br from-brand-primary/20 via-brand-surface to-brand-secondary/10',
    text: 'text-white',
    muted: 'text-gray-300',
    overlay: 'bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5',
    border: 'border-brand-primary/20',
  },
  image: {
    bg: 'bg-cover bg-center bg-no-repeat bg-fixed',
    text: 'text-white',
    muted: 'text-gray-300',
    overlay: 'bg-black/60 backdrop-blur-[2px]',
    border: 'border-white/10',
  },
  video: {
    bg: '',
    text: 'text-white',
    muted: 'text-gray-300',
    overlay: 'bg-black/50',
    border: 'border-white/10',
  },
  dark: {
    bg: 'bg-[#0B0F1A]',
    text: 'text-white',
    muted: 'text-gray-400',
    overlay: '',
    border: 'border-[#1F2937]',
  },
  glass: {
    bg: 'bg-white/5 backdrop-blur-xl',
    text: 'text-white',
    muted: 'text-gray-300',
    overlay: '',
    border: 'border-white/10',
  },
  minimal: {
    bg: 'bg-transparent',
    text: 'text-white',
    muted: 'text-gray-400',
    overlay: '',
    border: 'border-transparent',
  },
  glow: {
    bg: 'bg-[#0B0F1A]',
    text: 'text-white',
    muted: 'text-gray-300',
    overlay: 'bg-gradient-radial from-brand-primary/10 via-transparent to-transparent',
    border: 'border-brand-primary/10',
  },
  mesh: {
    bg: 'bg-[#0B0F1A]',
    text: 'text-white',
    muted: 'text-gray-300',
    overlay: 'bg-[url("/mesh-gradient.png")] bg-cover bg-center opacity-30',
    border: 'border-brand-primary/10',
  },
};

// ============================================
// 4. BUTTON STYLE CONFIGURATIONS
// ============================================

const BUTTON_STYLES: Record<
  CTAButtonStyle,
  {
    bg: string;
    hover: string;
    text: string;
    border: string;
    shadow: string;
    glow: string;
  }
> = {
  primary: {
    bg: 'bg-gradient-to-r from-brand-primary to-brand-primary/90',
    hover: 'hover:from-brand-primary/90 hover:to-brand-primary/80',
    text: 'text-white',
    border: 'border-brand-primary/30',
    shadow: 'shadow-lg shadow-brand-primary/25',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  secondary: {
    bg: 'bg-gradient-to-r from-brand-secondary to-brand-secondary/90',
    hover: 'hover:from-brand-secondary/90 hover:to-brand-secondary/80',
    text: 'text-white',
    border: 'border-brand-secondary/30',
    shadow: 'shadow-lg shadow-brand-secondary/25',
    glow: 'rgba(124, 58, 237, 0.4)',
  },
  outline: {
    bg: 'bg-transparent',
    hover: 'hover:bg-white/5',
    text: 'text-white',
    border: 'border-white/20',
    shadow: 'shadow-none',
    glow: 'rgba(255, 255, 255, 0.2)',
  },
  glass: {
    bg: 'bg-white/10 backdrop-blur-xl',
    hover: 'hover:bg-white/20',
    text: 'text-white',
    border: 'border-white/10',
    shadow: 'shadow-lg shadow-black/10',
    glow: 'rgba(255, 255, 255, 0.3)',
  },
  premium: {
    bg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500',
    hover: 'hover:from-amber-600 via-orange-600 to-pink-600',
    text: 'text-white',
    border: 'border-amber-300/30',
    shadow: 'shadow-xl shadow-amber-500/30',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
};

// ============================================
// 5. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes cta-fade-up {
    0% {
      opacity: 0;
      transform: translateY(40px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes cta-slide-in {
    0% {
      opacity: 0;
      transform: translateX(-40px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes cta-scale-in {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes cta-glow-pulse {
    0%, 100% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.15);
    }
    50% {
      box-shadow: 0 0 60px rgba(59, 130, 246, 0.3), 0 0 100px rgba(124, 58, 237, 0.15);
    }
  }

  @keyframes cta-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes cta-orb-1 {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -40px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }

  @keyframes cta-orb-2 {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(-40px, -20px) scale(1.15);
    }
  }

  @keyframes cta-shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes cta-countdown-pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
  }

  @keyframes cta-border-glow {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes cta-text-reveal {
    0% {
      clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
    }
    100% {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
  }
`;

// ============================================
// 6. SUB-COMPONENT: Countdown Timer
// ============================================

interface CountdownTimerComponentProps {
  endDate: Date;
  label?: string;
  expiredMessage?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
}

const CountdownTimerComponent: React.FC<CountdownTimerComponentProps> = ({
  endDate,
  label,
  expiredMessage = 'Offer expired',
  showDays = true,
  showHours = true,
  showMinutes = true,
  showSeconds = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (timeLeft.expired) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-yellow-400">{expiredMessage}</p>
      </div>
    );
  }

  const pad = (num: number): string => String(num).padStart(2, '0');

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-semibold text-text-muted uppercase tracking-wider text-center">
          {label}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 md:gap-4">
        {showDays && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
                {pad(timeLeft.days)}
              </span>
            </div>
            <span className="text-xs text-text-muted mt-1 block">Days</span>
          </div>
        )}
        {showHours && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
                {pad(timeLeft.hours)}
              </span>
            </div>
            <span className="text-xs text-text-muted mt-1 block">Hours</span>
          </div>
        )}
        {showMinutes && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
                {pad(timeLeft.minutes)}
              </span>
            </div>
            <span className="text-xs text-text-muted mt-1 block">Minutes</span>
          </div>
        )}
        {showSeconds && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
                {pad(timeLeft.seconds)}
              </span>
            </div>
            <span className="text-xs text-text-muted mt-1 block">Seconds</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// 7. SUB-COMPONENT: Social Proof
// ============================================

interface SocialProofComponentProps {
  socialProof: SocialProof;
}

const SocialProofComponent: React.FC<SocialProofComponentProps> = ({ socialProof }) => {
  const {
    count,
    rating,
    avatars,
    testimonial,
    testimonialAuthor,
    testimonialRole,
    companyLogos,
    trustBadges,
  } = socialProof;

  return (
    <div className="space-y-4">
      {/* User count + rating */}
      {(count || rating) && (
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Avatars */}
          {avatars && avatars.length > 0 && (
            <div className="flex items-center -space-x-2">
              {avatars.slice(0, 4).map((avatar, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white bg-brand-border overflow-hidden"
                >
                  <img
                    src={avatar}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
              {avatars.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-brand-primary flex items-center justify-center text-white text-xs font-bold">
                  +{avatars.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-500' : 'text-gray-500'}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              <span className="text-sm font-semibold text-white ml-1">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Count */}
          {count && (
            <span className="text-sm text-text-muted">
              Joined by <span className="text-white font-semibold">{count.toLocaleString()}+</span> users
            </span>
          )}
        </div>
      )}

      {/* Testimonial */}
      {testimonial && (
        <div className="text-center max-w-lg mx-auto">
          <blockquote className="text-sm text-text-muted italic">
            "{testimonial}"
          </blockquote>
          {testimonialAuthor && (
            <p className="text-xs text-text-muted mt-1">
              — {testimonialAuthor}
              {testimonialRole && <span>, {testimonialRole}</span>}
            </p>
          )}
        </div>
      )}

      {/* Company logos */}
      {companyLogos && companyLogos.length > 0 && (
        <div className="flex items-center justify-center gap-6 flex-wrap opacity-60">
          <span className="text-xs text-text-muted">Trusted by</span>
          {companyLogos.map((logo, i) => (
            <img
              key={i}
              src={logo}
              alt="Company logo"
              className="h-5 md:h-6 w-auto object-contain brightness-0 invert"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Trust badges */}
      {trustBadges && trustBadges.length > 0 && (
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {trustBadges.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-xs text-text-muted"
            >
              {badge.icon}
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// 8. SUB-COMPONENT: Newsletter Form
// ============================================

interface NewsletterFormComponentProps {
  config: NewsletterForm;
}

const NewsletterFormComponent: React.FC<NewsletterFormComponentProps> = ({ config }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim() || status === 'loading') return;

      setStatus('loading');
      try {
        config.onSubmit(email);
        setStatus('success');
        setEmail('');
        setTimeout(() => setStatus('idle'), 3000);
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    },
    [email, status, config]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={config.placeholder || 'Enter your email'}
          className={`
            flex-1 px-4 py-3 rounded-xl
            bg-white/10 border border-white/10
            text-white placeholder-text-muted
            focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/30
            transition-all duration-200
            text-sm
          `}
          disabled={status === 'loading' || status === 'success'}
          required
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`
            px-6 py-3 rounded-xl
            bg-gradient-to-r from-brand-primary to-brand-secondary
            text-white font-semibold text-sm
            hover:shadow-lg hover:shadow-brand-primary/25
            active:scale-[0.97]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            whitespace-nowrap
          `}
        >
          {status === 'loading' ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : status === 'success' ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            config.buttonText || 'Subscribe'
          )}
        </button>
      </div>

      {/* Status messages */}
      {status === 'success' && config.successMessage && (
        <p className="text-sm text-green-400 mt-2 text-center">{config.successMessage}</p>
      )}
      {status === 'error' && config.errorMessage && (
        <p className="text-sm text-red-400 mt-2 text-center">{config.errorMessage}</p>
      )}

      {/* Privacy note */}
      {config.showPrivacyNote && (
        <p className="text-xs text-text-muted mt-2 text-center">
          {config.privacyNote || 'No spam. Unsubscribe anytime.'}
        </p>
      )}
    </form>
  );
};

// ============================================
// 9. MAIN COMPONENT
// ============================================

export const CTABanner: React.FC<CTABannerProps> = ({
  title,
  subtitle,
  badge,
  primaryCTA,
  secondaryCTA,
  additionalCTAs,
  background = 'gradient',
  backgroundImage,
  backgroundVideo,
  backgroundGradient,
  backgroundOverlay = 0.6,
  size = 'lg',
  layout = 'centered',
  animation = 'fade-up',
  animationDelay = 0,
  animationDuration = 700,
  socialProof,
  countdown,
  newsletter,
  graphic,
  graphicPosition = 'right',
  decorative = true,
  floatingOrbs = false,
  gridPattern = false,
  noiseTexture = false,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'cta-banner',
  sectionId,
  mobileFriendly = true,
  maxWidth,
}) => {
  // ============================================
  // State
  // ============================================

  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  // Refs
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const sizeConfig = SIZE_CONFIG[size];
  const bgConfig = BACKGROUND_CONFIG[background];

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

    const styleId = 'cta-banner-animations';
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
    if (animation === 'none' || shouldReduceMotion) return;

    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsInView(true), animationDelay);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animation, animationDelay, shouldReduceMotion]);

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
    if (!floatingOrbs || shouldReduceMotion) return;

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
  }, [floatingOrbs, shouldReduceMotion]);

  // ============================================
  // Animation Classes
  // ============================================

  const animationClasses = useMemo(() => {
    if (shouldReduceMotion || animation === 'none') return '';

    if (!isInView) {
      switch (animation) {
        case 'fade-up':
          return 'opacity-0 translate-y-10';
        case 'slide-in':
          return 'opacity-0 -translate-x-10';
        case 'scale-in':
          return 'opacity-0 scale-95';
        default:
          return 'opacity-0';
      }
    }

    return 'opacity-100 translate-y-0 translate-x-0 scale-100';
  }, [isInView, animation, shouldReduceMotion]);

  // ============================================
  // Render: CTA Button
  // ============================================

  const renderButton = useCallback(
    (button: CTAButton, index: number) => {
      const styles = BUTTON_STYLES[button.variant || 'primary'];
      const isLink = !!button.href;

      const buttonContent = (
        <>
          {button.icon && <span className="flex-shrink-0">{button.icon}</span>}
          <span>{button.label}</span>
          {button.showArrow && (
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover/cta:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </>
      );

      const buttonClasses = `
        group/cta
        inline-flex items-center justify-center gap-2
        px-6 py-3 md:px-8 md:py-4
        ${sizeConfig.button}
        font-semibold
        rounded-xl
        ${styles.bg}
        ${styles.hover}
        ${styles.text}
        border ${styles.border}
        ${styles.shadow}
        transition-all duration-300
        hover:scale-105 active:scale-[0.97]
        whitespace-nowrap
        ${button.className || ''}
        ${button.glow ? 'hover:shadow-2xl' : ''}
      `.trim();

      if (isLink) {
        return (
          <a
            key={index}
            href={button.href}
            target={button.external ? '_blank' : undefined}
            rel={button.external ? 'noopener noreferrer' : undefined}
            className={buttonClasses}
            onClick={button.onClick}
          >
            {buttonContent}
          </a>
        );
      }

      return (
        <button
          key={index}
          className={buttonClasses}
          onClick={button.onClick}
        >
          {buttonContent}
        </button>
      );
    },
    [sizeConfig]
  );

  // ============================================
  // Render: Floating Orbs
  // ============================================

  const renderFloatingOrbs = () => {
    if (!floatingOrbs || shouldReduceMotion) return null;

    const orbs = [
      { size: 300, color: 'rgba(59, 130, 246, 0.15)', anim: 'cta-orb-1', left: '10%', top: '20%' },
      { size: 200, color: 'rgba(124, 58, 237, 0.1)', anim: 'cta-orb-2', left: '80%', top: '60%' },
      { size: 150, color: 'rgba(236, 72, 153, 0.08)', anim: 'cta-orb-1', left: '50%', top: '30%' },
    ];

    return (
      <>
        {orbs.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none blur-3xl"
            style={{
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              background: `radial-gradient(circle, ${orb.color}, transparent)`,
              left: orb.left,
              top: orb.top,
              transform: `translate(-50%, -50%)`,
              animation: isInView ? `${orb.anim} ${8 + i * 2}s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.5}s`,
            }}
            aria-hidden="true"
          />
        ))}
      </>
    );
  };

  // ============================================
  // Render: Grid Pattern Background
  // ============================================

  const renderGridPattern = () => {
    if (!gridPattern) return null;

    return (
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" aria-hidden="true">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>
    );
  };

  // ============================================
  // Render: Noise Texture Overlay
  // ============================================

  const renderNoiseTexture = () => {
    if (!noiseTexture) return null;

    return (
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />
    );
  };

  // ============================================
  // 10. RENDER
  // ============================================

  return (
    <section
      ref={sectionRef}
      id={sectionId || id}
      className={`
        relative
        ${bgConfig.bg}
        ${sizeConfig.padding}
        overflow-hidden
        ${className}
      `.trim()}
      style={{
        ...style,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: backgroundImage ? 'cover' : undefined,
        backgroundPosition: backgroundImage ? 'center' : undefined,
        backgroundRepeat: backgroundImage ? 'no-repeat' : undefined,
      }}
    >
      {/* Background Video */}
      {backgroundVideo && (
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
            style={{ backgroundColor: `rgba(0, 0, 0, ${backgroundOverlay})` }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Background Overlay */}
      {!backgroundVideo && background !== 'minimal' && (
        <div
          className={`absolute inset-0 ${bgConfig.overlay}`}
          style={
            backgroundImage && !backgroundVideo
              ? { backgroundColor: `rgba(0, 0, 0, ${backgroundOverlay})` }
              : undefined
          }
          aria-hidden="true"
        />
      )}

      {/* Background Gradient Override */}
      {backgroundGradient && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${backgroundGradient.direction || 'to-br'}, ${backgroundGradient.from}, ${backgroundGradient.via ? backgroundGradient.via + ',' : ''} ${backgroundGradient.to})`,
            opacity: 0.5,
          }}
          aria-hidden="true"
        />
      )}

      {/* Decorative Elements */}
      {renderFloatingOrbs()}
      {renderGridPattern()}
      {renderNoiseTexture()}

      {/* Glow Pulse Border */}
      {background === 'glow' && isInView && !shouldReduceMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            animation: 'cta-glow-pulse 3s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
      )}

      {/* Content Container */}
      <div
        className={`
          relative z-10
          mx-auto
          px-6 lg:px-12
          ${maxWidth || sizeConfig.maxWidth}
        `}
      >
        {/* Layout: Centered */}
        {layout === 'centered' && (
          <div className={`flex flex-col items-center text-center ${sizeConfig.gap}`}>
            {renderCTAContent()}
          </div>
        )}

        {/* Layout: Split */}
        {layout === 'split' && (
          <div
            className={`
              flex items-center ${sizeConfig.gap}
              ${mobileFriendly ? 'flex-col lg:flex-row' : 'flex-row'}
              ${graphicPosition === 'left' ? 'lg:flex-row-reverse' : ''}
            `}
          >
            {/* Content */}
            <div className={`flex-1 flex flex-col ${sizeConfig.gap} ${mobileFriendly ? 'text-center lg:text-left items-center lg:items-start' : ''}`}>
              {renderCTAContent(false)}
            </div>

            {/* Graphic */}
            {graphic && (
              <div
                className={`
                  flex-1 flex items-center justify-center
                  ${mobileFriendly ? 'mt-8 lg:mt-0' : ''}
                `}
              >
                <div
                  className={`
                    ${isInView && !shouldReduceMotion ? 'animate-cta-float' : ''}
                  `}
                  style={{
                    animation: isInView && !shouldReduceMotion ? 'cta-float 6s ease-in-out infinite' : 'none',
                  }}
                >
                  {graphic}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layout: Card */}
        {layout === 'card' && (
          <div
            className={`
              bg-white/5 backdrop-blur-xl
              border border-white/10
              rounded-3xl
              p-8 md:p-12 lg:p-16
              shadow-2xl
              flex flex-col items-center text-center ${sizeConfig.gap}
            `}
          >
            {renderCTAContent()}
          </div>
        )}

        {/* Layout: Floating */}
        {layout === 'floating' && (
          <div
            className={`
              relative
              bg-gradient-to-br from-brand-surface to-brand-dark
              border border-brand-border/50
              rounded-3xl
              p-8 md:p-12 lg:p-16
              shadow-2xl
              flex flex-col items-center text-center ${sizeConfig.gap}
              ${isInView && !shouldReduceMotion ? 'animate-cta-float' : ''}
            `}
            style={{
              animation: isInView && !shouldReduceMotion ? 'cta-float 6s ease-in-out infinite' : 'none',
            }}
          >
            {renderCTAContent()}
          </div>
        )}
      </div>

      {/* Bottom Gradient Fade */}
      {decorative && background === 'gradient' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-surface/50 to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
    </section>
  );

  // ============================================
  // Render: CTA Content (extracted for reuse)
  // ============================================

  function renderCTAContent(centerButtons: boolean = true) {
    return (
      <>
        {/* Badge */}
        {badge && (
          <div className={`transition-all duration-700 ${animationClasses}`}>
            <span
              className={`
                inline-flex items-center gap-2
                px-4 py-1.5 rounded-full
                text-sm font-medium
                ${
                  badge.variant === 'secondary'
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
            </span>
          </div>
        )}

        {/* Title */}
        <h2
          className={`
            ${sizeConfig.title}
            font-extrabold
            ${bgConfig.text}
            leading-tight
            tracking-tight
            transition-all duration-700 delay-100
            ${animationClasses}
          `}
        >
          {title}
        </h2>

        {/* Subtitle */}
        {subtitle && (
          <p
            className={`
              ${sizeConfig.subtitle}
              ${bgConfig.muted}
              leading-relaxed
              max-w-2xl
              transition-all duration-700 delay-200
              ${animationClasses}
            `}
          >
            {subtitle}
          </p>
        )}

        {/* Countdown Timer */}
        {countdown && (
          <div
            className={`transition-all duration-700 delay-300 ${animationClasses}`}
          >
            <CountdownTimerComponent {...countdown} />
          </div>
        )}

        {/* Newsletter Form */}
        {newsletter && (
          <div
            className={`w-full transition-all duration-700 delay-300 ${animationClasses}`}
          >
            <NewsletterFormComponent config={newsletter} />
          </div>
        )}

        {/* Buttons */}
        {(primaryCTA || secondaryCTA || additionalCTAs) && (
          <div
            className={`
              flex flex-wrap gap-3 md:gap-4
              ${centerButtons ? 'justify-center' : ''}
              transition-all duration-700 delay-300
              ${animationClasses}
            `}
          >
            {primaryCTA && renderButton(primaryCTA, 0)}
            {secondaryCTA && renderButton(secondaryCTA, 1)}
            {additionalCTAs?.map((cta, i) => renderButton(cta, i + 2))}
          </div>
        )}

        {/* Social Proof */}
        {socialProof && (
          <div
            className={`transition-all duration-700 delay-400 ${animationClasses}`}
          >
            <SocialProofComponent socialProof={socialProof} />
          </div>
        )}
      </>
    );
  }
};

// ============================================
// 11. PRESET CTA COMPONENTS
// ============================================

interface PresetCTAProps {
  title: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export const SimpleCTA: React.FC<PresetCTAProps> = ({
  title,
  subtitle,
  primaryLabel = 'Get Started',
  primaryHref = '#',
  secondaryLabel,
  secondaryHref,
  className = '',
}) => (
  <CTABanner
    title={title}
    subtitle={subtitle}
    size="md"
    background="gradient"
    layout="centered"
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true }}
    secondaryCTA={secondaryLabel ? { label: secondaryLabel, href: secondaryHref, variant: 'outline' } : undefined}
    className={className}
  />
);

export const PremiumCTA: React.FC<PresetCTAProps> = ({
  title,
  subtitle,
  primaryLabel = 'Start Free Trial',
  primaryHref = '#',
  secondaryLabel,
  secondaryHref,
  className = '',
}) => (
  <CTABanner
    title={title}
    subtitle={subtitle}
    size="lg"
    background="glow"
    layout="card"
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'premium', showArrow: true, glow: true }}
    secondaryCTA={secondaryLabel ? { label: secondaryLabel, href: secondaryHref, variant: 'glass' } : undefined}
    decorative
    floatingOrbs
    className={className}
  />
);

export const MinimalCTA: React.FC<PresetCTAProps> = ({
  title,
  subtitle,
  primaryLabel = 'Learn More',
  primaryHref = '#',
  secondaryLabel,
  secondaryHref,
  className = '',
}) => (
  <CTABanner
    title={title}
    subtitle={subtitle}
    size="md"
    background="minimal"
    layout="centered"
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true }}
    secondaryCTA={secondaryLabel ? { label: secondaryLabel, href: secondaryHref, variant: 'outline' } : undefined}
    decorative={false}
    className={className}
  />
);

export const SplitCTA: React.FC<PresetCTAProps & { graphic?: ReactNode }> = ({
  title,
  subtitle,
  primaryLabel = 'Get Started',
  primaryHref = '#',
  secondaryLabel,
  secondaryHref,
  graphic,
  className = '',
}) => (
  <CTABanner
    title={title}
    subtitle={subtitle}
    size="lg"
    background="dark"
    layout="split"
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'primary', showArrow: true }}
    secondaryCTA={secondaryLabel ? { label: secondaryLabel, href: secondaryHref, variant: 'glass' } : undefined}
    graphic={graphic}
    graphicPosition="right"
    className={className}
  />
);

export const NewsletterCTA: React.FC<
  PresetCTAProps & {
    newsletterPlaceholder?: string;
    newsletterButtonText?: string;
    onNewsletterSubmit: (email: string) => void;
  }
> = ({
  title,
  subtitle,
  newsletterPlaceholder = 'Enter your email',
  newsletterButtonText = 'Subscribe',
  onNewsletterSubmit,
  className = '',
}) => (
  <CTABanner
    title={title}
    subtitle={subtitle}
    size="md"
    background="gradient"
    layout="centered"
    newsletter={{
      placeholder: newsletterPlaceholder,
      buttonText: newsletterButtonText,
      onSubmit: onNewsletterSubmit,
      showPrivacyNote: true,
    }}
    className={className}
  />
);

export const CountdownCTA: React.FC<
  PresetCTAProps & {
    endDate: Date;
    countdownLabel?: string;
  }
> = ({
  title,
  subtitle,
  primaryLabel = 'Claim Offer',
  primaryHref = '#',
  endDate,
  countdownLabel = 'Offer ends in:',
  className = '',
}) => (
  <CTABanner
    title={title}
    subtitle={subtitle}
    size="lg"
    background="glow"
    layout="centered"
    primaryCTA={{ label: primaryLabel, href: primaryHref, variant: 'premium', showArrow: true, glow: true }}
    countdown={{
      endDate,
      label: countdownLabel,
      showDays: true,
      showHours: true,
      showMinutes: true,
      showSeconds: true,
    }}
    decorative
    className={className}
  />
);

// ============================================
// 12. DISPLAY NAMES
// ============================================

CTABanner.displayName = 'CTABanner';
SimpleCTA.displayName = 'SimpleCTA';
PremiumCTA.displayName = 'PremiumCTA';
MinimalCTA.displayName = 'MinimalCTA';
SplitCTA.displayName = 'SplitCTA';
NewsletterCTA.displayName = 'NewsletterCTA';
CountdownCTA.displayName = 'CountdownCTA';
CountdownTimerComponent.displayName = 'CountdownTimer';
SocialProofComponent.displayName = 'SocialProof';
NewsletterFormComponent.displayName = 'NewsletterForm';

// ============================================
// 13. NAMED EXPORTS
// ============================================

export {
  CountdownTimerComponent,
  SocialProofComponent,
  NewsletterFormComponent,
  SIZE_CONFIG,
  BACKGROUND_CONFIG,
  BUTTON_STYLES,
  ANIMATION_STYLES,
};

// ============================================
// 14. TYPE EXPORTS
// ============================================

export type {
  CTABackground,
  CTASize,
  CTAAnimation,
  CTALayout,
  CTAButtonStyle,
  CTAButton,
  CTABadge,
  SocialProof,
  CountdownTimer,
  NewsletterForm,
  CTABannerProps,
  PresetCTAProps,
  CountdownTimerComponentProps,
  SocialProofComponentProps,
  NewsletterFormComponentProps,
};

// ============================================
// 15. DEFAULT EXPORT
// ============================================

export default CTABanner;
