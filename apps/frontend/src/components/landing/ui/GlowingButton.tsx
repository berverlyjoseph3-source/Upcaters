// ============================================
// apps/frontend/src/components/landing/ui/GlowingButton.tsx
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

// ============================================
// 1. TYPES
// ============================================

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'ghost'
  | 'outline'
  | 'glass'
  | 'premium';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type GlowIntensity = 'none' | 'subtle' | 'medium' | 'strong' | 'extreme';

type GlowAnimation =
  | 'none'
  | 'pulse'
  | 'breathe'
  | 'rotate'
  | 'shimmer'
  | 'ripple'
  | 'double-pulse'
  | 'rainbow';

type ButtonShape = 'rounded' | 'pill' | 'square' | 'circle' | 'icon';

type ButtonWidth = 'auto' | 'full' | 'fixed';

type GradientDirection =
  | 'to-r'
  | 'to-l'
  | 'to-t'
  | 'to-b'
  | 'to-tr'
  | 'to-tl'
  | 'to-br'
  | 'to-bl';

type IconPosition = 'left' | 'right' | 'only';

type ButtonState = 'idle' | 'hover' | 'active' | 'loading' | 'disabled' | 'success' | 'error';

interface ButtonGradient {
  from: string;
  to: string;
  via?: string;
  direction?: GradientDirection;
}

interface ButtonGlow {
  color: string;
  intensity: number;
  spread: number;
  animation: GlowAnimation;
  innerGlow?: boolean;
  innerColor?: string;
}

interface ButtonBorder {
  width: number;
  style: 'solid' | 'dashed' | 'gradient' | 'glowing';
  color: string;
  secondaryColor?: string;
  animation?: boolean;
}

interface RippleEffect {
  x: number;
  y: number;
  size: number;
  id: string;
}

interface GlowingButtonProps {
  /** Button content */
  children: ReactNode;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Button shape */
  shape?: ButtonShape;
  /** Fixed width in pixels */
  fixedWidth?: number;
  /** Button width */
  width?: ButtonWidth;
  /** Icon component */
  icon?: ReactNode;
  /** Icon position */
  iconPosition?: IconPosition;
  /** Gradient configuration */
  gradient?: ButtonGradient;
  /** Glow effect configuration */
  glow?: Partial<ButtonGlow>;
  /** Glow intensity preset */
  glowIntensity?: GlowIntensity;
  /** Glow animation */
  glowAnimation?: GlowAnimation;
  /** Border configuration */
  border?: Partial<ButtonBorder>;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Loading text */
  loadingText?: string;
  /** Success state text */
  successText?: string;
  /** Error state text */
  errorText?: string;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Whether to show ripple effect on click */
  ripple?: boolean;
  /** Ripple color */
  rippleColor?: string;
  /** Whether to show sparkle particles */
  sparkle?: boolean;
  /** Whether to show arrow on hover */
  showArrow?: boolean;
  /** Whether to scale on hover */
  hoverScale?: boolean;
  /** Hover scale amount */
  hoverScaleAmount?: number;
  /** Whether to play sound on click */
  sound?: boolean;
  /** Sound URL */
  soundUrl?: string;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** Mouse enter handler */
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Mouse leave handler */
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Focus handler */
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  /** Blur handler */
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** aria-label for accessibility */
  ariaLabel?: string;
  /** aria-describedby */
  ariaDescribedBy?: string;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** href for link behavior */
  href?: string;
  /** Link target */
  target?: string;
  /** Link rel */
  rel?: string;
  /** Whether to open in new tab */
  external?: boolean;
  /** Custom children for different states */
  renderState?: Record<ButtonState, ReactNode>;
}

export interface GlowingButtonHandle {
  /** Focus the button */
  focus: () => void;
  /** Blur the button */
  blur: () => void;
  /** Programmatically click */
  click: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Get button element */
  getElement: () => HTMLButtonElement | null;
}

// ============================================
// 2. SIZE CONFIGURATION
// ============================================

const SIZE_CONFIG: Record<
  ButtonSize,
  {
    paddingX: number;
    paddingY: number;
    fontSize: string;
    lineHeight: string;
    iconSize: string;
    gap: number;
    minWidth: number;
    borderRadius: number;
    letterSpacing: string;
  }
> = {
  xs: {
    paddingX: 12,
    paddingY: 6,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    iconSize: '14px',
    gap: 6,
    minWidth: 60,
    borderRadius: 8,
    letterSpacing: '0.01em',
  },
  sm: {
    paddingX: 16,
    paddingY: 8,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    iconSize: '16px',
    gap: 8,
    minWidth: 80,
    borderRadius: 10,
    letterSpacing: '0.01em',
  },
  md: {
    paddingX: 24,
    paddingY: 12,
    fontSize: '1rem',
    lineHeight: '1.5rem',
    iconSize: '20px',
    gap: 10,
    minWidth: 100,
    borderRadius: 12,
    letterSpacing: '0.02em',
  },
  lg: {
    paddingX: 32,
    paddingY: 16,
    fontSize: '1.125rem',
    lineHeight: '1.75rem',
    iconSize: '24px',
    gap: 12,
    minWidth: 120,
    borderRadius: 14,
    letterSpacing: '0.02em',
  },
  xl: {
    paddingX: 40,
    paddingY: 20,
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    iconSize: '28px',
    gap: 14,
    minWidth: 140,
    borderRadius: 16,
    letterSpacing: '0.03em',
  },
  '2xl': {
    paddingX: 48,
    paddingY: 24,
    fontSize: '1.5rem',
    lineHeight: '2rem',
    iconSize: '32px',
    gap: 16,
    minWidth: 160,
    borderRadius: 20,
    letterSpacing: '0.03em',
  },
};

// ============================================
// 3. VARIANT CONFIGURATION
// ============================================

const VARIANT_CONFIG: Record<
  ButtonVariant,
  {
    bg: string;
    bgHover: string;
    bgActive: string;
    text: string;
    border: string;
    borderHover: string;
    shadow: string;
    gradient: ButtonGradient;
    glow: ButtonGlow;
    disabledBg: string;
    disabledText: string;
  }
> = {
  primary: {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    bgHover: 'from-blue-600 to-blue-700',
    bgActive: 'from-blue-700 to-blue-800',
    text: 'text-white',
    border: 'border-blue-400/30',
    borderHover: 'border-blue-400/50',
    shadow: 'shadow-lg shadow-blue-500/25',
    gradient: { from: '#3B82F6', to: '#2563EB', direction: 'to-r' },
    glow: { color: '#3B82F6', intensity: 0.5, spread: 20, animation: 'pulse' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
  secondary: {
    bg: 'bg-gradient-to-r from-purple-500 to-purple-600',
    bgHover: 'from-purple-600 to-purple-700',
    bgActive: 'from-purple-700 to-purple-800',
    text: 'text-white',
    border: 'border-purple-400/30',
    borderHover: 'border-purple-400/50',
    shadow: 'shadow-lg shadow-purple-500/25',
    gradient: { from: '#7C3AED', to: '#6D28D9', direction: 'to-r' },
    glow: { color: '#7C3AED', intensity: 0.5, spread: 20, animation: 'pulse' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
  accent: {
    bg: 'bg-gradient-to-r from-pink-500 to-pink-600',
    bgHover: 'from-pink-600 to-pink-700',
    bgActive: 'from-pink-700 to-pink-800',
    text: 'text-white',
    border: 'border-pink-400/30',
    borderHover: 'border-pink-400/50',
    shadow: 'shadow-lg shadow-pink-500/25',
    gradient: { from: '#EC4899', to: '#DB2777', direction: 'to-r' },
    glow: { color: '#EC4899', intensity: 0.5, spread: 20, animation: 'pulse' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
  success: {
    bg: 'bg-gradient-to-r from-green-500 to-green-600',
    bgHover: 'from-green-600 to-green-700',
    bgActive: 'from-green-700 to-green-800',
    text: 'text-white',
    border: 'border-green-400/30',
    borderHover: 'border-green-400/50',
    shadow: 'shadow-lg shadow-green-500/25',
    gradient: { from: '#22C55E', to: '#16A34A', direction: 'to-r' },
    glow: { color: '#22C55E', intensity: 0.5, spread: 20, animation: 'pulse' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
  warning: {
    bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    bgHover: 'from-yellow-600 to-orange-600',
    bgActive: 'from-yellow-700 to-orange-700',
    text: 'text-white',
    border: 'border-yellow-400/30',
    borderHover: 'border-yellow-400/50',
    shadow: 'shadow-lg shadow-yellow-500/25',
    gradient: { from: '#F59E0B', to: '#F97316', direction: 'to-r' },
    glow: { color: '#F59E0B', intensity: 0.5, spread: 20, animation: 'pulse' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
  danger: {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    bgHover: 'from-red-600 to-red-700',
    bgActive: 'from-red-700 to-red-800',
    text: 'text-white',
    border: 'border-red-400/30',
    borderHover: 'border-red-400/50',
    shadow: 'shadow-lg shadow-red-500/25',
    gradient: { from: '#EF4444', to: '#DC2626', direction: 'to-r' },
    glow: { color: '#EF4444', intensity: 0.5, spread: 20, animation: 'pulse' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
  ghost: {
    bg: 'bg-transparent',
    bgHover: 'bg-white/5',
    bgActive: 'bg-white/10',
    text: 'text-white',
    border: 'border-transparent',
    borderHover: 'border-white/10',
    shadow: 'shadow-none',
    gradient: { from: 'transparent', to: 'transparent', direction: 'to-r' },
    glow: { color: '#FFFFFF', intensity: 0.1, spread: 5, animation: 'none' },
    disabledBg: 'bg-transparent',
    disabledText: 'text-gray-500',
  },
  outline: {
    bg: 'bg-transparent',
    bgHover: 'bg-white/5',
    bgActive: 'bg-white/10',
    text: 'text-white',
    border: 'border-white/20',
    borderHover: 'border-white/40',
    shadow: 'shadow-none',
    gradient: { from: 'transparent', to: 'transparent', direction: 'to-r' },
    glow: { color: '#FFFFFF', intensity: 0.1, spread: 5, animation: 'none' },
    disabledBg: 'bg-transparent',
    disabledText: 'text-gray-500',
  },
  glass: {
    bg: 'bg-white/10 backdrop-blur-xl',
    bgHover: 'bg-white/20',
    bgActive: 'bg-white/30',
    text: 'text-white',
    border: 'border-white/10',
    borderHover: 'border-white/30',
    shadow: 'shadow-lg shadow-black/10',
    gradient: { from: 'rgba(255,255,255,0.1)', to: 'rgba(255,255,255,0.05)', direction: 'to-br' },
    glow: { color: '#FFFFFF', intensity: 0.2, spread: 10, animation: 'pulse' },
    disabledBg: 'bg-white/5',
    disabledText: 'text-gray-400',
  },
  premium: {
    bg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500',
    bgHover: 'from-amber-600 via-orange-600 to-pink-600',
    bgActive: 'from-amber-700 via-orange-700 to-pink-700',
    text: 'text-white',
    border: 'border-amber-300/30',
    borderHover: 'border-amber-300/50',
    shadow: 'shadow-xl shadow-amber-500/30',
    gradient: { from: '#F59E0B', via: '#F97316', to: '#EC4899', direction: 'to-r' },
    glow: { color: '#F59E0B', intensity: 0.6, spread: 30, animation: 'shimmer' },
    disabledBg: 'bg-gray-600/50',
    disabledText: 'text-gray-400',
  },
};

// ============================================
// 4. GLOW INTENSITY PRESETS
// ============================================

const GLOW_INTENSITY_CONFIG: Record<GlowIntensity, { intensity: number; spread: number; animation: GlowAnimation }> = {
  none: { intensity: 0, spread: 0, animation: 'none' },
  subtle: { intensity: 0.2, spread: 8, animation: 'none' },
  medium: { intensity: 0.5, spread: 20, animation: 'pulse' },
  strong: { intensity: 0.8, spread: 35, animation: 'breathe' },
  extreme: { intensity: 1, spread: 50, animation: 'double-pulse' },
};

// ============================================
// 5. SHAPE CONFIGURATION
// ============================================

const SHAPE_CONFIG: Record<ButtonShape, { borderRadius: string; padding: string }> = {
  rounded: { borderRadius: '', padding: '' }, // Uses size config
  pill: { borderRadius: '9999px', padding: '' },
  square: { borderRadius: '0', padding: '' },
  circle: { borderRadius: '9999px', padding: '0' },
  icon: { borderRadius: '12px', padding: '0' },
};

// ============================================
// 6. CSS KEYFRAMES
// ============================================

const ANIMATION_STYLES = `
  @keyframes glowing-button-pulse {
    0%, 100% {
      box-shadow: 0 0 var(--glow-spread, 20px) var(--glow-color, rgba(59, 130, 246, 0.4));
    }
    50% {
      box-shadow: 0 0 var(--glow-spread-pulse, 40px) var(--glow-color, rgba(59, 130, 246, 0.7)),
                  0 0 var(--glow-spread-far, 60px) var(--glow-color, rgba(59, 130, 246, 0.3));
    }
  }

  @keyframes glowing-button-breathe {
    0%, 100% {
      box-shadow: 0 0 var(--glow-spread, 15px) var(--glow-color, rgba(59, 130, 246, 0.3));
      transform: scale(1);
    }
    40% {
      box-shadow: 0 0 var(--glow-spread-pulse, 35px) var(--glow-color, rgba(59, 130, 246, 0.6));
      transform: scale(1.02);
    }
    70% {
      box-shadow: 0 0 var(--glow-spread, 10px) var(--glow-color, rgba(59, 130, 246, 0.2));
      transform: scale(0.99);
    }
  }

  @keyframes glowing-button-rotate {
    0% {
      filter: hue-rotate(0deg);
    }
    100% {
      filter: hue-rotate(360deg);
    }
  }

  @keyframes glowing-button-shimmer {
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

  @keyframes glowing-button-ripple {
    0% {
      transform: scale(0);
      opacity: 0.5;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes glowing-button-double-pulse {
    0%, 100% {
      box-shadow: 0 0 var(--glow-spread, 20px) var(--glow-color, rgba(59, 130, 246, 0.4));
    }
    25% {
      box-shadow: 0 0 var(--glow-spread-pulse, 40px) var(--glow-color, rgba(59, 130, 246, 0.7));
    }
    50% {
      box-shadow: 0 0 var(--glow-spread, 10px) var(--glow-color, rgba(59, 130, 246, 0.2));
    }
    75% {
      box-shadow: 0 0 var(--glow-spread-pulse, 50px) var(--glow-color, rgba(59, 130, 246, 0.8));
    }
  }

  @keyframes glowing-button-rainbow {
    0%, 100% {
      filter: hue-rotate(0deg) brightness(1);
    }
    50% {
      filter: hue-rotate(360deg) brightness(1.2);
    }
  }

  @keyframes glowing-button-border-pulse {
    0%, 100% {
      border-color: var(--border-color, rgba(59, 130, 246, 0.3));
    }
    50% {
      border-color: var(--border-color-pulse, rgba(59, 130, 246, 0.8));
    }
  }

  @keyframes glowing-button-sparkle {
    0%, 100% {
      opacity: 0;
      transform: scale(0) rotate(0deg);
    }
    50% {
      opacity: 1;
      transform: scale(1) rotate(180deg);
    }
  }

  @keyframes glowing-button-arrow {
    0%, 100% {
      transform: translateX(0);
      opacity: 0;
    }
    50% {
      transform: translateX(4px);
      opacity: 1;
    }
  }

  @keyframes glowing-button-loading-spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes glowing-button-success-pop {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const GlowingButton = forwardRef<GlowingButtonHandle, GlowingButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      shape = 'rounded',
      fixedWidth,
      width = 'auto',
      icon,
      iconPosition = 'left',
      gradient,
      glow: customGlow,
      glowIntensity: glowIntensityPreset = 'medium',
      glowAnimation,
      border: customBorder,
      disabled = false,
      loading = false,
      loadingText = 'Loading...',
      successText,
      errorText,
      fullWidth = false,
      ripple = true,
      rippleColor,
      sparkle = false,
      showArrow = false,
      hoverScale = true,
      hoverScaleAmount = 1.03,
      sound = false,
      soundUrl,
      type = 'button',
      onClick,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      className = '',
      style,
      id,
      ariaLabel,
      ariaDescribedBy,
      respectReducedMotion = true,
      href,
      target,
      rel,
      external,
      renderState,
    },
    ref
  ) => {
    // ============================================
    // State
    // ============================================

    const [buttonState, setButtonState] = useState<ButtonState>('idle');
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [ripples, setRipples] = useState<RippleEffect[]>([]);
    const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
    const [isStyleInjected, setIsStyleInjected] = useState(false);
    const [sparkleParticles, setSparkleParticles] = useState<
      Array<{ id: string; x: number; y: number; size: number; color: string; delay: number }>
    >([]);

    // Refs
    const buttonRef = useRef<HTMLButtonElement>(null);
    const sparkleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const styleRef = useRef<HTMLStyleElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // ============================================
    // Derived Values
    // ============================================

    const variantConfig = VARIANT_CONFIG[variant];
    const sizeConfig = SIZE_CONFIG[size];
    const shapeConfig = SHAPE_CONFIG[shape];
    const glowConfig = GLOW_INTENSITY_CONFIG[glowIntensityPreset];

    const effectiveGlow = useMemo((): ButtonGlow => {
      const base = {
        ...variantConfig.glow,
        ...glowConfig,
        ...customGlow,
      };

      if (glowAnimation) {
        base.animation = glowAnimation;
      }

      return base;
    }, [variantConfig, glowConfig, customGlow, glowAnimation]);

    const effectiveGradient = useMemo((): ButtonGradient => {
      return gradient || variantConfig.gradient;
    }, [gradient, variantConfig]);

    const isDisabled = disabled || loading;
    const isLink = !!href;

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

      const styleId = 'glowing-button-animations';
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
    // Effects: Sparkle Particles
    // ============================================

    useEffect(() => {
      if (!sparkle || !isHovered || shouldReduceMotion) {
        setSparkleParticles([]);
        return;
      }

      const interval = setInterval(() => {
        const newParticle = {
          id: `sparkle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 2 + Math.random() * 4,
          color: effectiveGradient.from,
          delay: Math.random() * 0.5,
        };

        setSparkleParticles((prev) => {
          const filtered = prev.filter(() => Math.random() > 0.2);
          return [...filtered, newParticle].slice(-15);
        });
      }, 100);

      sparkleTimerRef.current = interval;

      return () => {
        if (sparkleTimerRef.current) {
          clearInterval(sparkleTimerRef.current);
        }
      };
    }, [sparkle, isHovered, shouldReduceMotion, effectiveGradient]);

    // ============================================
    // Effects: Sound
    // ============================================

    useEffect(() => {
      if (sound && soundUrl) {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 0.3;
      }
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    }, [sound, soundUrl]);

    // ============================================
    // Handlers
    // ============================================

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) return;

        // Play sound
        if (sound && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }

        // Ripple effect
        if (ripple && !shouldReduceMotion) {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const size = Math.max(rect.width, rect.height) * 2;

            const newRipple: RippleEffect = {
              x,
              y,
              size,
              id: `ripple-${Date.now()}`,
            };

            setRipples((prev) => [...prev, newRipple]);

            // Clean up ripple
            setTimeout(() => {
              setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
            }, 800);
          }
        }

        // Handle async onClick
        if (onClick) {
          try {
            setButtonState('loading');
            await onClick(event);
            setButtonState('success');
            setTimeout(() => setButtonState('idle'), 2000);
          } catch {
            setButtonState('error');
            setTimeout(() => setButtonState('idle'), 2000);
          }
        }
      },
      [isDisabled, ripple, shouldReduceMotion, onClick, sound]
    );

    const handleMouseEnter = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) return;
        setIsHovered(true);
        setButtonState('hover');
        onMouseEnter?.(event);
      },
      [isDisabled, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        setIsHovered(false);
        setIsPressed(false);
        if (buttonState !== 'loading' && buttonState !== 'success' && buttonState !== 'error') {
          setButtonState('idle');
        }
        onMouseLeave?.(event);
      },
      [buttonState, onMouseLeave]
    );

    const handleMouseDown = useCallback(() => {
      if (isDisabled) return;
      setIsPressed(true);
      setButtonState('active');
    }, [isDisabled]);

    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
      if (buttonState !== 'loading' && buttonState !== 'success' && buttonState !== 'error') {
        setButtonState(isHovered ? 'hover' : 'idle');
      }
    }, [isHovered, buttonState]);

    const handleFocus = useCallback(
      (event: React.FocusEvent<HTMLButtonElement>) => {
        setIsFocused(true);
        onFocus?.(event);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLButtonElement>) => {
        setIsFocused(false);
        onBlur?.(event);
      },
      [onBlur]
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick(event as unknown as React.MouseEvent<HTMLButtonElement>);
        }
      },
      [handleClick]
    );

    // ============================================
    // Public API
    // ============================================

    useImperativeHandle(
      ref,
      () => ({
        focus: () => buttonRef.current?.focus(),
        blur: () => buttonRef.current?.blur(),
        click: () => buttonRef.current?.click(),
        setLoading: (loading: boolean) => {
          setButtonState(loading ? 'loading' : 'idle');
        },
        getElement: () => buttonRef.current,
      }),
      []
    );

    // ============================================
    // Render Helpers
    // ============================================

    const renderIcon = () => {
      if (!icon) return null;

      const iconStyles: CSSProperties = {
        width: sizeConfig.iconSize,
        height: sizeConfig.iconSize,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      };

      return <span style={iconStyles}>{icon}</span>;
    };

    const renderLoadingSpinner = () => (
      <svg
        className="animate-spin"
        style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          opacity="0.3"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="15.7 47.1"
        />
      </svg>
    );

    const renderSuccessIcon = () => (
      <svg
        style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="glowing-button-success-icon"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );

    const renderErrorIcon = () => (
      <svg
        style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );

    const renderArrowIcon = () => (
      <svg
        style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : 'translate-x-0'}`}
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    );

    const getButtonContent = (): ReactNode => {
      // Custom state render
      if (renderState?.[buttonState]) {
        return renderState[buttonState];
      }

      switch (buttonState) {
        case 'loading':
          return (
            <>
              {renderLoadingSpinner()}
              <span>{loadingText}</span>
            </>
          );
        case 'success':
          return (
            <>
              {renderSuccessIcon()}
              <span>{successText || children}</span>
            </>
          );
        case 'error':
          return (
            <>
              {renderErrorIcon()}
              <span>{errorText || children}</span>
            </>
          );
        default:
          return (
            <>
              {iconPosition === 'left' && renderIcon()}
              {iconPosition === 'only' ? (
                renderIcon()
              ) : (
                <span className="relative z-10">{children}</span>
              )}
              {iconPosition === 'right' && renderIcon()}
              {showArrow && !isDisabled && renderArrowIcon()}
            </>
          );
      }
    };

    // ============================================
    // 8. STYLES
    // ============================================

    const buttonStyles = useMemo((): CSSProperties => {
      const base: CSSProperties = {
        ...style,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconPosition === 'only' ? '0' : `${sizeConfig.gap}px`,
        padding:
          shape === 'circle' || shape === 'icon'
            ? `${sizeConfig.paddingY}px`
            : `${sizeConfig.paddingY}px ${sizeConfig.paddingX}px`,
        fontSize: sizeConfig.fontSize,
        lineHeight: sizeConfig.lineHeight,
        fontWeight: 600,
        letterSpacing: sizeConfig.letterSpacing,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: variantConfig.text ? undefined : 'white',
        border: 'none',
        borderRadius:
          shape === 'pill' || shape === 'circle'
            ? '9999px'
            : shape === 'icon'
              ? '12px'
              : `${sizeConfig.borderRadius}px`,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        transition: shouldReduceMotion
          ? 'none'
          : 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        opacity: isDisabled ? 0.5 : 1,
        minWidth:
          shape === 'circle'
            ? `${sizeConfig.paddingY * 2 + parseInt(sizeConfig.iconSize)}px`
            : shape === 'icon'
              ? `${sizeConfig.paddingY * 2 + parseInt(sizeConfig.iconSize)}px`
              : fixedWidth
                ? `${fixedWidth}px`
                : `${sizeConfig.minWidth}px`,
        width:
          fullWidth || width === 'full'
            ? '100%'
            : shape === 'circle' || shape === 'icon'
              ? undefined
              : width === 'auto'
                ? 'auto'
                : undefined,
        height:
          shape === 'circle' || shape === 'icon'
            ? `${sizeConfig.paddingY * 2 + parseInt(sizeConfig.iconSize)}px`
            : undefined,
      };

      // Scale on hover
      if (hoverScale && isHovered && !isDisabled && !shouldReduceMotion) {
        base.transform = `scale(${hoverScaleAmount})`;
      }

      if (isPressed && !isDisabled) {
        base.transform = `scale(0.97)`;
      }

      return base;
    }, [
      style,
      sizeConfig,
      shape,
      variantConfig,
      isDisabled,
      isHovered,
      isPressed,
      hoverScale,
      hoverScaleAmount,
      shouldReduceMotion,
      fullWidth,
      width,
      fixedWidth,
      iconPosition,
      buttonState,
    ]);

    // Gradient background style
    const gradientStyle = useMemo((): CSSProperties => {
      const { from, to, via, direction = 'to-r' } = effectiveGradient;

      if (isDisabled) {
        return {
          position: 'absolute' as const,
          inset: 0,
          backgroundColor: variantConfig.disabledBg,
          backgroundImage: 'none',
          borderRadius: 'inherit',
          zIndex: 0,
        };
      }

      const stops = via ? `${from}, ${via}, ${to}` : `${from}, ${to}`;
      const dir = direction.replace('to-', 'to ');

      return {
        position: 'absolute' as const,
        inset: 0,
        background: `linear-gradient(${dir}, ${stops})`,
        backgroundSize: effectiveGlow.animation === 'shimmer' ? '200% 200%' : '100% 100%',
        borderRadius: 'inherit',
        zIndex: 0,
        animation:
          effectiveGlow.animation === 'shimmer' && !shouldReduceMotion
            ? 'glowing-button-shimmer 3s ease infinite'
            : 'none',
      };
    }, [effectiveGradient, isDisabled, variantConfig, effectiveGlow, shouldReduceMotion]);

    // Glow effect style
    const glowStyle = useMemo((): CSSProperties => {
      if (effectiveGlow.intensity <= 0 || shouldReduceMotion) return {};

      const spread = effectiveGlow.spread;
      const color = effectiveGlow.color;
      const animName = (() => {
        switch (effectiveGlow.animation) {
          case 'pulse':
            return 'glowing-button-pulse';
          case 'breathe':
            return 'glowing-button-breathe';
          case 'double-pulse':
            return 'glowing-button-double-pulse';
          case 'rainbow':
            return 'glowing-button-rainbow';
          default:
            return 'none';
        }
      })();

      return {
        '--glow-color': color,
        '--glow-spread': `${spread}px`,
        '--glow-spread-pulse': `${spread * 2}px`,
        '--glow-spread-far': `${spread * 3}px`,
        animation:
          effectiveGlow.animation !== 'none'
            ? `${animName} 3s ease-in-out infinite`
            : 'none',
        boxShadow:
          effectiveGlow.animation === 'none'
            ? `0 0 ${spread}px ${color}`
            : undefined,
      } as CSSProperties;
    }, [effectiveGlow, shouldReduceMotion]);

    // Inner glow
    const innerGlowStyle = useMemo((): CSSProperties => {
      if (!effectiveGlow.innerGlow) return {};

      return {
        position: 'absolute' as const,
        inset: '1px',
        borderRadius: 'inherit',
        background: `radial-gradient(circle at center, ${effectiveGlow.innerColor || effectiveGlow.color}20 0%, transparent 70%)`,
        pointerEvents: 'none' as const,
        zIndex: 1,
      };
    }, [effectiveGlow]);

    // Border style
    const borderStyle = useMemo((): CSSProperties => {
      if (!customBorder) {
        return {
          position: 'absolute' as const,
          inset: 0,
          borderRadius: 'inherit',
          border: `1px solid ${variantConfig.border.replace('border-', '')}`,
          pointerEvents: 'none' as const,
          zIndex: 2,
        };
      }

      const { width, style: borderStyle, color, secondaryColor } = customBorder;

      if (borderStyle === 'gradient') {
        return {
          position: 'absolute' as const,
          inset: `-${width}px`,
          borderRadius: `calc(${typeof sizeConfig.borderRadius === 'number' ? `${sizeConfig.borderRadius}px` : sizeConfig.borderRadius} + ${width}px)`,
          padding: `${width}px`,
          background: `linear-gradient(135deg, ${color}, ${secondaryColor || color})`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          pointerEvents: 'none' as const,
          zIndex: 2,
          animation:
            customBorder.animation && !shouldReduceMotion
              ? 'glowing-button-border-pulse 2s ease-in-out infinite'
              : 'none',
        } as CSSProperties;
      }

      return {
        position: 'absolute' as const,
        inset: 0,
        borderRadius: 'inherit',
        border: `${width}px ${borderStyle} ${color}`,
        pointerEvents: 'none' as const,
        zIndex: 2,
        animation:
          customBorder.animation && !shouldReduceMotion
            ? 'glowing-button-border-pulse 2s ease-in-out infinite'
            : 'none',
      } as CSSProperties;
    }, [customBorder, variantConfig, sizeConfig, shouldReduceMotion]);

    // ============================================
    // 9. RENDER
    // ============================================

    const commonProps = {
      ref: buttonRef,
      id,
      type: isLink ? undefined : type,
      className: `
        glowing-button
        ${variantConfig.text}
        ${isFocused ? 'ring-2 ring-offset-2 ring-offset-[#0B0F1A] ring-blue-500/50' : ''}
        ${className}
      `.trim(),
      style: buttonStyles,
      onClick: isLink ? undefined : handleClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      disabled: isDisabled,
      'aria-label': ariaLabel || (typeof children === 'string' ? children : undefined),
      'aria-describedby': ariaDescribedBy,
      'aria-busy': loading,
      'aria-disabled': isDisabled,
      role: isLink ? undefined : 'button',
      tabIndex: isDisabled ? -1 : 0,
    };

    const innerContent = (
      <>
        {/* Background Gradient */}
        <div style={gradientStyle} aria-hidden="true" />

        {/* Glow Layer */}
        {effectiveGlow.intensity > 0 && (
          <div
            className="absolute inset-0 rounded-[inherit] pointer-events-none z-0"
            style={glowStyle}
            aria-hidden="true"
          />
        )}

        {/* Inner Glow */}
        {effectiveGlow.innerGlow && <div style={innerGlowStyle} aria-hidden="true" />}

        {/* Border */}
        <div style={borderStyle} aria-hidden="true" />

        {/* Glass Overlay */}
        {variant === 'glass' && (
          <div
            className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-[3]"
            aria-hidden="true"
          />
        )}

        {/* Shimmer Effect for Premium */}
        {variant === 'premium' && isHovered && !shouldReduceMotion && (
          <div
            className="absolute inset-0 rounded-[inherit] pointer-events-none z-[3] overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.15) 55%, transparent 60%)',
                animation: 'glowing-button-shimmer 2s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Ripple Effects */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute rounded-full pointer-events-none z-[4]"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor || 'rgba(255, 255, 255, 0.3)',
              animation: 'glowing-button-ripple 0.8s ease-out forwards',
            }}
            aria-hidden="true"
          />
        ))}

        {/* Sparkle Particles */}
        {sparkleParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full pointer-events-none z-[5]"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              animation: `glowing-button-sparkle 1s ease-out ${particle.delay}s forwards`,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Content */}
        <span
          className="relative z-10 inline-flex items-center justify-center"
          style={{ gap: `${sizeConfig.gap}px` }}
        >
          {getButtonContent()}
        </span>
      </>
    );

    // Render as link or button
    if (isLink) {
      return (
        <a
          {...commonProps}
          href={href}
          target={external ? '_blank' : target}
          rel={external ? 'noopener noreferrer' : rel}
          onClick={(e) => {
            if (isDisabled) {
              e.preventDefault();
              return;
            }
            handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
          }}
        >
          {innerContent}
        </a>
      );
    }

    return <button {...commonProps}>{innerContent}</button>;
  }
);

// ============================================
// 10. BUTTON GROUP COMPONENT
// ============================================

interface ButtonGroupProps {
  children: ReactNode;
  direction?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  direction = 'row',
  gap = 'md',
  align = 'center',
  className = '',
}) => {
  const gapConfig: Record<string, string> = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  const alignConfig: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  return (
    <div
      className={`
        flex
        ${direction === 'column' ? 'flex-col' : 'flex-row flex-wrap'}
        ${gapConfig[gap]}
        ${alignConfig[align]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// ============================================
// 11. ICON BUTTON COMPONENT
// ============================================

interface IconButtonProps extends Omit<GlowingButtonProps, 'children' | 'iconPosition'> {
  children?: ReactNode;
  label: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  label,
  size = 'md',
  shape = 'icon',
  ...props
}) => {
  return (
    <GlowingButton
      {...props}
      size={size}
      shape={shape}
      icon={children}
      iconPosition="only"
      ariaLabel={label}
    />
  );
};

// ============================================
// 12. DISPLAY NAMES
// ============================================

GlowingButton.displayName = 'GlowingButton';
ButtonGroup.displayName = 'ButtonGroup';
IconButton.displayName = 'IconButton';

// ============================================
// 13. NAMED EXPORTS
// ============================================

export {
  SIZE_CONFIG,
  VARIANT_CONFIG,
  GLOW_INTENSITY_CONFIG,
  SHAPE_CONFIG,
  ANIMATION_STYLES,
};

// ============================================
// 14. TYPE EXPORTS
// ============================================

export type {
  ButtonVariant,
  ButtonSize,
  GlowIntensity,
  GlowAnimation,
  ButtonShape,
  ButtonWidth,
  GradientDirection,
  IconPosition,
  ButtonState,
  ButtonGradient,
  ButtonGlow,
  ButtonBorder,
  RippleEffect,
  GlowingButtonProps,
  GlowingButtonHandle,
  ButtonGroupProps,
  IconButtonProps,
};

// ============================================
// 15. DEFAULT EXPORT
// ============================================

export default GlowingButton;
