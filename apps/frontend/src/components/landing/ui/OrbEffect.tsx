// ============================================
// apps/frontend/src/components/landing/ui/OrbEffect.tsx
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

type OrbShape = 'circle' | 'blob' | 'ring' | 'gradient-ring' | 'double-ring' | 'morphing';

type OrbAnimation = 'float' | 'pulse' | 'rotate' | 'morph' | 'orbit' | 'breathe' | 'drift';

type OrbSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';

type OrbBlendMode = 'normal' | 'screen' | 'overlay' | 'soft-light' | 'color-dodge' | 'lighten';

type OrbPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

interface OrbConfig {
  /** Orb color */
  color: string;
  /** Secondary color for gradients */
  secondaryColor?: string;
  /** Tertiary color for complex effects */
  tertiaryColor?: string;
  /** Orb size in pixels */
  size: number;
  /** Secondary size (for blob/morph shapes) */
  secondarySize?: number;
  /** Orb shape */
  shape: OrbShape;
  /** Animation style */
  animation: OrbAnimation;
  /** Animation duration in seconds */
  duration: number;
  /** Animation delay in seconds */
  delay: number;
  /** Position on screen */
  position: OrbPosition;
  /** Custom position { x, y } in percentage */
  customPosition?: { x: number; y: number };
  /** Opacity (0-1) */
  opacity: number;
  /** Blur amount in pixels */
  blur: number;
  /** Blend mode */
  blendMode: OrbBlendMode;
  /** Z-index */
  zIndex: number;
  /** Scale factor */
  scale: number;
  /** Rotation in degrees */
  rotation: number;
  /** Whether orb responds to mouse */
  interactive: boolean;
  /** Mouse influence radius (px) */
  interactiveRadius: number;
  /** Mouse influence strength (0-1) */
  interactiveStrength: number;
  /** Whether orb is currently visible */
  visible: boolean;
  /** Custom gradient stops */
  gradientStops?: Array<{ offset: number; color: string; opacity?: number }>;
}

interface OrbEffectProps {
  /** Array of orb configurations */
  orbs?: OrbConfig[];
  /** Number of orbs to auto-generate */
  orbCount?: number;
  /** Auto-generated orb color palette */
  colorPalette?: string[];
  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** Whether to fill parent container */
  fillContainer?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Whether to pause animations */
  paused?: boolean;
  /** Whether to show on mobile */
  showOnMobile?: boolean;
  /** Mobile scale multiplier */
  mobileScale?: number;
  /** Children to render on top */
  children?: ReactNode;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Whether to use canvas rendering (better performance for many orbs) */
  useCanvas?: boolean;
  /** Canvas DPR cap */
  maxDPR?: number;
}

// ============================================
// 2. ORB SIZE PRESETS
// ============================================

const SIZE_PRESETS: Record<OrbSize, number> = {
  sm: 150,
  md: 300,
  lg: 500,
  xl: 700,
  '2xl': 1000,
  custom: 400,
};

// ============================================
// 3. POSITION PRESETS
// ============================================

const POSITION_PRESETS: Record<OrbPosition, { x: number; y: number }> = {
  'top-left': { x: 15, y: 15 },
  'top-center': { x: 50, y: 10 },
  'top-right': { x: 85, y: 15 },
  'center-left': { x: 10, y: 50 },
  center: { x: 50, y: 50 },
  'center-right': { x: 90, y: 50 },
  'bottom-left': { x: 15, y: 85 },
  'bottom-center': { x: 50, y: 90 },
  'bottom-right': { x: 85, y: 85 },
  custom: { x: 50, y: 50 },
};

// ============================================
// 4. DEFAULT COLOR PALETTES
// ============================================

const DEFAULT_PALETTES: Record<string, string[]> = {
  primary: ['#3B82F6', '#2563EB', '#1D4ED8'],
  secondary: ['#7C3AED', '#6D28D9', '#5B21B6'],
  accent: ['#EC4899', '#DB2777', '#BE185D'],
  warm: ['#F97316', '#EF4444', '#F59E0B'],
  cool: ['#06B6D4', '#3B82F6', '#8B5CF6'],
  nature: ['#22C55E', '#10B981', '#14B8A6'],
  sunset: ['#FF6B6B', '#FFA07A', '#FFD700'],
  ocean: ['#0077B6', '#00B4D8', '#90E0EF'],
  aurora: ['#06b6d4', '#8b5cf6', '#ec4899'],
};

// ============================================
// 5. CSS KEYFRAMES
// ============================================

const ANIMATION_KEYFRAMES = `
  @keyframes orb-float-1 {
    0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
    25% { transform: translate(30px, -40px) scale(1.05) rotate(5deg); }
    50% { transform: translate(-20px, -70px) scale(0.95) rotate(-3deg); }
    75% { transform: translate(-40px, -20px) scale(1.02) rotate(2deg); }
  }

  @keyframes orb-float-2 {
    0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
    33% { transform: translate(-35px, 30px) scale(1.08) rotate(-4deg); }
    66% { transform: translate(25px, -35px) scale(0.92) rotate(3deg); }
  }

  @keyframes orb-float-3 {
    0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
    50% { transform: translate(40px, 50px) scale(1.03) rotate(-2deg); }
  }

  @keyframes orb-pulse {
    0%, 100% { transform: scale(1); opacity: var(--orb-opacity, 0.6); }
    50% { transform: scale(1.15); opacity: var(--orb-opacity-pulse, 0.9); }
  }

  @keyframes orb-rotate {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.05); }
    100% { transform: rotate(360deg) scale(1); }
  }

  @keyframes orb-morph-1 {
    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  }

  @keyframes orb-morph-2 {
    0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
    33% { border-radius: 60% 40% 30% 70% / 50% 30% 70% 50%; }
    66% { border-radius: 50% 50% 60% 40% / 30% 60% 40% 70%; }
  }

  @keyframes orb-orbit {
    0% { transform: translate(-50%, -50%) rotate(0deg) translateX(var(--orbit-radius, 100px)) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg) translateX(var(--orbit-radius, 100px)) rotate(-360deg); }
  }

  @keyframes orb-breathe {
    0%, 100% { transform: scale(0.8); opacity: 0.3; }
    50% { transform: scale(1.2); opacity: 0.8; }
  }

  @keyframes orb-drift {
    0% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(var(--drift-x1, 60px), var(--drift-y1, -40px)) scale(1.05); }
    50% { transform: translate(var(--drift-x2, -30px), var(--drift-y2, -60px)) scale(0.95); }
    75% { transform: translate(var(--drift-x3, -50px), var(--drift-y3, -20px)) scale(1.02); }
    100% { transform: translate(0, 0) scale(1); }
  }

  @keyframes orb-shimmer {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  @keyframes orb-glow-pulse {
    0%, 100% { filter: blur(var(--orb-blur, 80px)) brightness(1); }
    50% { filter: blur(var(--orb-blur-pulse, 100px)) brightness(1.3); }
  }

  @keyframes orb-ring-rotate {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

// ============================================
// 6. AUTO-GENERATE ORB CONFIGURATIONS
// ============================================

function generateOrbConfigs(
  count: number,
  palette: string[],
  containerWidth: number,
  containerHeight: number
): OrbConfig[] {
  const shapes: OrbShape[] = ['circle', 'blob', 'ring', 'gradient-ring', 'double-ring', 'morphing'];
  const animations: OrbAnimation[] = ['float', 'pulse', 'rotate', 'morph', 'drift', 'breathe'];
  const blendModes: OrbBlendMode[] = ['screen', 'overlay', 'soft-light', 'color-dodge', 'lighten'];

  return Array.from({ length: count }, (_, index) => {
    const colorIndex = index % palette.length;
    const secondaryColorIndex = (index + 1) % palette.length;
    const tertiaryColorIndex = (index + 2) % palette.length;

    const baseSize =
      SIZE_PRESETS[['sm', 'md', 'lg', 'xl', '2xl'][index % 5] as OrbSize] ||
      SIZE_PRESETS.md;

    const sizeVariation = 0.5 + Math.random() * 1.5;

    return {
      color: palette[colorIndex],
      secondaryColor: palette[secondaryColorIndex],
      tertiaryColor: palette[tertiaryColorIndex],
      size: Math.floor(baseSize * sizeVariation),
      secondarySize: Math.floor(baseSize * sizeVariation * 0.8),
      shape: shapes[index % shapes.length],
      animation: animations[index % animations.length],
      duration: 8 + Math.random() * 12,
      delay: index * (Math.random() * 2),
      position: 'custom' as OrbPosition,
      customPosition: {
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
      },
      opacity: 0.3 + Math.random() * 0.4,
      blur: 40 + Math.random() * 80,
      blendMode: blendModes[index % blendModes.length],
      zIndex: index,
      scale: 0.8 + Math.random() * 0.4,
      rotation: Math.random() * 360,
      interactive: Math.random() > 0.5,
      interactiveRadius: 100 + Math.random() * 200,
      interactiveStrength: 0.1 + Math.random() * 0.3,
      visible: true,
    };
  });
}

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const OrbEffect: React.FC<OrbEffectProps> = ({
  orbs: customOrbs,
  orbCount = 5,
  colorPalette,
  width = '100%',
  height = '100%',
  fillContainer = true,
  backgroundColor = 'transparent',
  respectReducedMotion = true,
  paused = false,
  showOnMobile = true,
  mobileScale = 0.6,
  children,
  className = '',
  style,
  id = 'orb-effect',
  useCanvas = false,
  maxDPR = 2,
}) => {
  // ============================================
  // State
  // ============================================

  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isStyleInjected, setIsStyleInjected] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const orbsRef = useRef<OrbConfig[]>([]);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const palette = colorPalette || DEFAULT_PALETTES.primary;

  const orbs = useMemo(() => {
    if (customOrbs && customOrbs.length > 0) return customOrbs;
    if (orbsRef.current.length === 0 && dimensions.width > 0) {
      orbsRef.current = generateOrbConfigs(orbCount, palette, dimensions.width, dimensions.height);
    }
    return orbsRef.current;
  }, [customOrbs, orbCount, palette, dimensions]);

  const effectiveScale = isMobile ? mobileScale : 1;

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
  // Effects: Mobile Detection
  // ============================================

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================
  // Effects: Inject Keyframe Styles
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    const styleId = 'orb-effect-keyframes';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      setIsStyleInjected(true);
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = ANIMATION_KEYFRAMES;
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
  // Effects: Dimensions Observer
  // ============================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
      setIsReady(true);
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(container);

    window.addEventListener('resize', updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // ============================================
  // Effects: Mouse Tracking
  // ============================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const hasInteractiveOrbs = orbs.some((orb) => orb.interactive);
    if (!hasInteractiveOrbs) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };

    const handleMouseLeave = () => {
      setMousePosition({ x: -1000, y: -1000 });
    };

    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [orbs]);

  // ============================================
  // Effects: Canvas Animation
  // ============================================

  useEffect(() => {
    if (!useCanvas || !isReady || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      if (paused || shouldReduceMotion) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      time += 0.016; // ~60fps
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      for (const orb of orbs) {
        if (!orb.visible) continue;

        const pos = orb.position === 'custom'
          ? orb.customPosition || { x: 50, y: 50 }
          : POSITION_PRESETS[orb.position];

        let x = (pos.x / 100) * dimensions.width;
        let y = (pos.y / 100) * dimensions.height;
        const size = orb.size * effectiveScale;

        // Interactive movement
        if (orb.interactive && mousePosition.x > 0) {
          const dx = mousePosition.x - pos.x;
          const dy = mousePosition.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < orb.interactiveRadius / 10) {
            const force = (1 - dist / (orb.interactiveRadius / 10)) * orb.interactiveStrength;
            x -= dx * force * 2;
            y -= dy * force * 2;
          }
        }

        // Animation offset
        let animOffset = 0;
        switch (orb.animation) {
          case 'float':
            animOffset = Math.sin(time * (1 / orb.duration) * Math.PI * 2 + orb.delay) * 30;
            x += Math.cos(time * 0.5 + orb.delay) * animOffset;
            y += Math.sin(time * 0.7 + orb.delay) * animOffset;
            break;
          case 'pulse':
            animOffset = Math.sin(time * (1 / orb.duration) * Math.PI * 2 + orb.delay);
            break;
          case 'drift':
            x += Math.sin(time * 0.3 + orb.delay) * 50 * effectiveScale;
            y += Math.cos(time * 0.4 + orb.delay) * 50 * effectiveScale;
            break;
          default:
            break;
        }

        // Draw orb
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
        gradient.addColorStop(0, orb.color + '80');
        gradient.addColorStop(0.4, orb.color + '40');
        gradient.addColorStop(0.7, (orb.secondaryColor || orb.color) + '10');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.globalAlpha = orb.opacity;
        ctx.globalCompositeOperation = orb.blendMode as any;

        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Reset
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [useCanvas, isReady, dimensions, orbs, paused, shouldReduceMotion, mousePosition, effectiveScale, maxDPR]);

  // ============================================
  // Render: Single Orb (CSS-based)
  // ============================================

  const renderOrb = useCallback(
    (orb: OrbConfig, index: number) => {
      if (!orb.visible) return null;

      const pos =
        orb.position === 'custom'
          ? orb.customPosition || { x: 50, y: 50 }
          : POSITION_PRESETS[orb.position];

      const size = orb.size * effectiveScale;
      const secondarySize = (orb.secondarySize || size * 0.8) * effectiveScale;

      const interactiveTransform = useMemo(() => {
        if (!orb.interactive || mousePosition.x < 0) return {};
        const dx = mousePosition.x - pos.x;
        const dy = mousePosition.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < orb.interactiveRadius / 10) {
          const force =
            (1 - dist / (orb.interactiveRadius / 10)) * orb.interactiveStrength;
          return {
            transform: `translate(${-dx * force * 2}px, ${-dy * force * 2}px)`,
          };
        }
        return {};
      }, [orb.interactive, mousePosition.x, mousePosition.y, pos.x, pos.y, orb.interactiveRadius, orb.interactiveStrength]);

      const buildGradient = (): string => {
        const stops = orb.gradientStops
          ? orb.gradientStops
              .map(
                (stop) =>
                  `${stop.color}${stop.opacity !== undefined ? Math.floor(stop.opacity * 255).toString(16).padStart(2, '0') : ''} ${stop.offset}%`
              )
              .join(', ')
          : `${orb.color} 0%, ${orb.secondaryColor || orb.color} 50%, ${orb.tertiaryColor || orb.color} 100%`;

        return `radial-gradient(circle at center, ${stops})`;
      };

      // Animation properties
      const animName = (() => {
        switch (orb.animation) {
          case 'float':
            return `orb-float-${(index % 3) + 1}`;
          case 'pulse':
            return 'orb-pulse';
          case 'rotate':
            return 'orb-rotate';
          case 'morph':
            return `orb-morph-${(index % 2) + 1}`;
          case 'orbit':
            return 'orb-orbit';
          case 'breathe':
            return 'orb-breathe';
          case 'drift':
            return 'orb-drift';
          default:
            return 'orb-float-1';
        }
      })();

      const shouldAnimate = !paused && !shouldReduceMotion;

      // Render different shapes
      switch (orb.shape) {
        // ============================================
        // Ring Shape
        // ============================================
        case 'ring':
          return (
            <div
              key={`orb-${index}`}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate(-50%, -50%) scale(${orb.scale}) rotate(${orb.rotation}deg)`,
                zIndex: orb.zIndex,
                pointerEvents: 'none',
                ...interactiveTransform,
              }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `2px solid ${orb.color}`,
                  borderColor: `transparent ${orb.color} transparent ${orb.secondaryColor || orb.color}`,
                  opacity: orb.opacity,
                  filter: `blur(${orb.blur * 0.1}px)`,
                  animation: shouldAnimate
                    ? `${animName} ${orb.duration}s ease-in-out infinite`
                    : 'none',
                  animationDelay: `${orb.delay}s`,
                }}
              />
              {orb.shape === 'double-ring' && (
                <div
                  className="absolute rounded-full"
                  style={{
                    inset: '15%',
                    border: `1.5px solid ${orb.secondaryColor || orb.color}`,
                    borderColor: `${orb.secondaryColor || orb.color} transparent ${orb.color} transparent`,
                    opacity: orb.opacity * 0.7,
                    filter: `blur(${orb.blur * 0.05}px)`,
                    animation: shouldAnimate
                      ? `orb-ring-rotate ${orb.duration * 0.7}s linear infinite`
                      : 'none',
                    animationDelay: `${orb.delay + 0.5}s`,
                    animationDirection: 'reverse',
                  }}
                />
              )}
            </div>
          );

        // ============================================
        // Blob / Morphing Shape
        // ============================================
        case 'blob':
        case 'morphing':
          return (
            <div
              key={`orb-${index}`}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate(-50%, -50%) scale(${orb.scale}) rotate(${orb.rotation}deg)`,
                zIndex: orb.zIndex,
                pointerEvents: 'none',
                ...interactiveTransform,
              }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: buildGradient(),
                  borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                  opacity: orb.opacity,
                  filter: `blur(${orb.blur}px)`,
                  mixBlendMode: orb.blendMode as any,
                  animation: shouldAnimate
                    ? `${animName} ${orb.duration}s ease-in-out infinite`
                    : 'none',
                  animationDelay: `${orb.delay}s`,
                }}
              />
              {/* Secondary blob for depth */}
              <div
                className="absolute"
                style={{
                  width: `${secondarySize}px`,
                  height: `${secondarySize}px`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: buildGradient(),
                  borderRadius: '40% 60% 50% 50% / 30% 40% 60% 50%',
                  opacity: orb.opacity * 0.5,
                  filter: `blur(${orb.blur * 1.2}px)`,
                  mixBlendMode: orb.blendMode as any,
                  animation: shouldAnimate
                    ? `${orb.shape === 'morphing' ? 'orb-morph-2' : 'orb-morph-1'} ${orb.duration * 0.8}s ease-in-out infinite`
                    : 'none',
                  animationDelay: `${orb.delay + 0.3}s`,
                  animationDirection: 'reverse',
                }}
              />
            </div>
          );

        // ============================================
        // Default Circle Shape
        // ============================================
        case 'circle':
        case 'gradient-ring':
        default:
          return (
            <div
              key={`orb-${index}`}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate(-50%, -50%) scale(${orb.scale}) rotate(${orb.rotation}deg)`,
                zIndex: orb.zIndex,
                pointerEvents: 'none',
                ...interactiveTransform,
              }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: buildGradient(),
                  opacity: orb.opacity,
                  filter: `blur(${orb.blur}px)`,
                  mixBlendMode: orb.blendMode as any,
                  animation: shouldAnimate
                    ? `${animName} ${orb.duration}s ease-in-out infinite`
                    : 'none',
                  animationDelay: `${orb.delay}s`,
                }}
              />
              {/* Inner glow */}
              <div
                className="absolute rounded-full"
                style={{
                  inset: '20%',
                  background: buildGradient(),
                  opacity: orb.opacity * 0.6,
                  filter: `blur(${orb.blur * 0.5}px)`,
                  mixBlendMode: 'screen' as any,
                  animation: shouldAnimate
                    ? `orb-glow-pulse ${orb.duration * 1.5}s ease-in-out infinite`
                    : 'none',
                  animationDelay: `${orb.delay}s`,
                }}
              />
            </div>
          );
      }
    },
    [paused, shouldReduceMotion, effectiveScale, mousePosition]
  );

  // ============================================
  // Container Styles
  // ============================================

  const containerStyle = useMemo((): CSSProperties => {
    return {
      position: fillContainer ? 'absolute' : 'relative',
      inset: fillContainer ? 0 : undefined,
      width: fillContainer ? undefined : typeof width === 'number' ? `${width}px` : width,
      height: fillContainer ? undefined : typeof height === 'number' ? `${height}px` : height,
      backgroundColor,
      overflow: 'hidden',
      ...style,
    };
  }, [fillContainer, width, height, backgroundColor, style]);

  // ============================================
  // 8. RENDER
  // ============================================

  if (!showOnMobile && isMobile) {
    return (
      <div
        ref={containerRef}
        id={id}
        className={`orb-effect ${className}`}
        style={containerStyle}
      >
        {children && <div className="relative z-10">{children}</div>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={id}
      className={`orb-effect ${className}`}
      style={containerStyle}
    >
      {/* Canvas Layer (optional, for performance) */}
      {useCanvas && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-0"
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        />
      )}

      {/* CSS Orbs Layer */}
      {!useCanvas && (
        <div className="absolute inset-0 z-0" aria-hidden="true">
          {orbs.map((orb, index) => renderOrb(orb, index))}
        </div>
      )}

      {/* Content Layer */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
};

// ============================================
// 9. PRESET ORB LAYOUTS
// ============================================

interface PresetOrbEffectProps {
  children?: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'warm' | 'cool' | 'aurora';
  intensity?: 'subtle' | 'medium' | 'strong';
}

const INTENSITY_CONFIG: Record<string, { count: number; opacity: number; blur: number; size: OrbSize }> = {
  subtle: { count: 3, opacity: 0.3, blur: 60, size: 'lg' },
  medium: { count: 5, opacity: 0.5, blur: 80, size: 'xl' },
  strong: { count: 7, opacity: 0.7, blur: 100, size: '2xl' },
};

export const GradientOrbs: React.FC<PresetOrbEffectProps> = ({
  children,
  className = '',
  variant = 'primary',
  intensity = 'medium',
}) => {
  const palette = DEFAULT_PALETTES[variant] || DEFAULT_PALETTES.primary;
  const config = INTENSITY_CONFIG[intensity];

  const orbs: OrbConfig[] = useMemo(() => {
    const positions: OrbPosition[] = [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
      'center',
      'top-center',
      'center-right',
    ];

    const shapes: OrbShape[] = ['circle', 'blob', 'circle', 'blob', 'circle', 'blob', 'circle'];
    const animations: OrbAnimation[] = ['float', 'pulse', 'drift', 'float', 'breathe', 'morph', 'float'];

    return Array.from({ length: config.count }, (_, i) => ({
      color: palette[i % palette.length],
      secondaryColor: palette[(i + 1) % palette.length],
      size: SIZE_PRESETS[config.size],
      shape: shapes[i % shapes.length],
      animation: animations[i % animations.length],
      duration: 10 + i * 2,
      delay: i * 0.5,
      position: positions[i % positions.length],
      opacity: config.opacity * (0.7 + Math.random() * 0.3),
      blur: config.blur + Math.random() * 20,
      blendMode: 'screen' as OrbBlendMode,
      zIndex: i,
      scale: 0.8 + Math.random() * 0.4,
      rotation: i * 45,
      interactive: true,
      interactiveRadius: 150,
      interactiveStrength: 0.15,
      visible: true,
    }));
  }, [variant, intensity, config]);

  return (
    <OrbEffect orbs={orbs} className={className}>
      {children}
    </OrbEffect>
  );
};

// ============================================
// 10. HERO ORB WRAPPER
// ============================================

interface HeroOrbsProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'aurora';
  className?: string;
}

export const HeroOrbs: React.FC<HeroOrbsProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      <GradientOrbs variant={variant} intensity="medium" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ============================================
// 11. SINGLE ORB COMPONENT (Standalone)
// ============================================

interface SingleOrbProps {
  color?: string;
  secondaryColor?: string;
  size?: OrbSize | number;
  shape?: OrbShape;
  animation?: OrbAnimation;
  position?: OrbPosition;
  opacity?: number;
  blur?: number;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
}

export const SingleOrb: React.FC<SingleOrbProps> = ({
  color = '#3B82F6',
  secondaryColor = '#7C3AED',
  size = 'lg',
  shape = 'circle',
  animation = 'float',
  position = 'center',
  opacity = 0.5,
  blur = 80,
  className = '',
  style,
  interactive = true,
}) => {
  const orbSize = typeof size === 'number' ? size : SIZE_PRESETS[size] || SIZE_PRESETS.lg;

  const orb: OrbConfig = useMemo(
    () => ({
      color,
      secondaryColor,
      size: orbSize,
      shape,
      animation,
      duration: 10,
      delay: 0,
      position,
      opacity,
      blur,
      blendMode: 'screen',
      zIndex: 0,
      scale: 1,
      rotation: 0,
      interactive,
      interactiveRadius: 150,
      interactiveStrength: 0.2,
      visible: true,
    }),
    [color, secondaryColor, orbSize, shape, animation, position, opacity, blur, interactive]
  );

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <OrbEffect orbs={[orb]} width="100%" height="100%" />
    </div>
  );
};

// ============================================
// 12. DISPLAY NAMES
// ============================================

OrbEffect.displayName = 'OrbEffect';
GradientOrbs.displayName = 'GradientOrbs';
HeroOrbs.displayName = 'HeroOrbs';
SingleOrb.displayName = 'SingleOrb';

// ============================================
// 13. NAMED EXPORTS
// ============================================

export {
  SIZE_PRESETS,
  POSITION_PRESETS,
  DEFAULT_PALETTES,
  ANIMATION_KEYFRAMES,
  generateOrbConfigs,
};

// ============================================
// 14. TYPE EXPORTS
// ============================================

export type {
  OrbShape,
  OrbAnimation,
  OrbSize,
  OrbBlendMode,
  OrbPosition,
  OrbConfig,
  OrbEffectProps,
  PresetOrbEffectProps,
  HeroOrbsProps,
  SingleOrbProps,
};

// ============================================
// 15. DEFAULT EXPORT
// ============================================

export default OrbEffect;
