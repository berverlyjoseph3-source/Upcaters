// ============================================
// apps/frontend/src/components/landing/ui/GridPattern.tsx
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

type PatternType =
  | 'dots'
  | 'grid'
  | 'crosshatch'
  | 'diagonal'
  | 'hexagonal'
  | 'triangles'
  | 'concentric'
  | 'voronoi'
  | 'circuit'
  | 'waves';

type PatternColorMode = 'single' | 'gradient' | 'multi' | 'random';

type PatternSize = 'sm' | 'md' | 'lg' | 'xl' | 'custom';

type PatternOpacity = 'subtle' | 'medium' | 'strong' | 'custom';

type PatternAnimation =
  | 'none'
  | 'drift'
  | 'pulse'
  | 'rotate'
  | 'wave'
  | 'glow'
  | 'morph';

type PatternBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'difference';

interface PatternColor {
  color: string;
  stop?: number;
}

interface GridPatternProps {
  /** Pattern type */
  type?: PatternType;
  /** Cell size in pixels */
  cellSize?: number;
  /** Line/dot thickness in pixels */
  strokeWidth?: number;
  /** Pattern color(s) */
  color?: string | string[];
  /** Color mode */
  colorMode?: PatternColorMode;
  /** Gradient colors (when colorMode is 'gradient') */
  gradientColors?: PatternColor[];
  /** Gradient angle in degrees */
  gradientAngle?: number;
  /** Pattern size preset */
  size?: PatternSize;
  /** Pattern opacity */
  opacity?: PatternOpacity;
  /** Custom opacity value (0-1) */
  customOpacity?: number;
  /** Gap between cells in pixels */
  gap?: number;
  /** Offset X in pixels */
  offsetX?: number;
  /** Offset Y in pixels */
  offsetY?: number;
  /** Rotation in degrees */
  rotation?: number;
  /** Animation style */
  animation?: PatternAnimation;
  /** Animation duration in seconds */
  duration?: number;
  /** Animation delay in seconds */
  delay?: number;
  /** Whether to animate on hover only */
  animateOnHover?: boolean;
  /** Blend mode */
  blendMode?: PatternBlendMode;
  /** Whether to fill pattern area */
  fill?: boolean;
  /** Fill color for pattern cells */
  fillColor?: string;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Whether to show border */
  showBorder?: boolean;
  /** Border color */
  borderColor?: string;
  /** Whether to render as background (absolute positioned) */
  asBackground?: boolean;
  /** Whether to invert colors for dark mode */
  darkModeInvert?: boolean;
  /** Whether to add noise texture overlay */
  noise?: boolean;
  /** Noise opacity (0-1) */
  noiseOpacity?: number;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Width override */
  width?: number | string;
  /** Height override */
  height?: number | string;
  /** Whether to clip to bounds */
  clipToBounds?: boolean;
  /** Children to render on top of pattern */
  children?: ReactNode;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
}

// ============================================
// 2. SIZE PRESETS
// ============================================

const SIZE_PRESETS: Record<PatternSize, { cellSize: number; strokeWidth: number; gap: number }> = {
  sm: { cellSize: 20, strokeWidth: 1, gap: 0 },
  md: { cellSize: 40, strokeWidth: 1.5, gap: 0 },
  lg: { cellSize: 60, strokeWidth: 2, gap: 1 },
  xl: { cellSize: 80, strokeWidth: 2.5, gap: 2 },
  custom: { cellSize: 40, strokeWidth: 1, gap: 0 },
};

const OPACITY_PRESETS: Record<PatternOpacity, number> = {
  subtle: 0.08,
  medium: 0.15,
  strong: 0.3,
  custom: 0.15,
};

// ============================================
// 3. PATTERN GENERATORS
// ============================================

const generateDotsPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;
  const radius = strokeWidth * 1.5;
  const cx = size / 2;
  const cy = size / 2;

  return `
    <pattern id="dots-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}" />
    </pattern>
  `;
};

const generateGridPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;
  const halfStroke = strokeWidth / 2;

  return `
    <pattern id="grid-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      <rect x="${halfStroke}" y="${halfStroke}" width="${size - strokeWidth}" height="${size - strokeWidth}" fill="none" stroke="${color}" stroke-width="${strokeWidth * 0.5}" opacity="0.3" />
    </pattern>
  `;
};

const generateCrosshatchPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;

  return `
    <pattern id="crosshatch-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" opacity="0.5" />
      <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" opacity="0.5" />
      <line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="${color}" stroke-width="${strokeWidth * 0.3}" opacity="0.3" />
      <line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth * 0.3}" opacity="0.3" />
    </pattern>
  `;
};

const generateDiagonalPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;

  return `
    <pattern id="diagonal-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth}" />
      <line x1="${size * 0.5}" y1="0" x2="${size}" y2="${size * 0.5}" stroke="${color}" stroke-width="${strokeWidth * 0.4}" opacity="0.4" />
      <line x1="0" y1="${size * 0.5}" x2="${size * 0.5}" y2="${size}" stroke="${color}" stroke-width="${strokeWidth * 0.4}" opacity="0.4" />
    </pattern>
  `;
};

const generateHexagonalPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;
  const w = size;
  const h = size * Math.sin(Math.PI / 3);
  const hexRadius = size * 0.4;

  // Vertices of a hexagon
  const vertices = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = w / 2 + hexRadius * Math.cos(angle);
    const y = h / 2 + hexRadius * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return `
    <pattern id="hexagonal-pattern" x="0" y="0" width="${w}" height="${h * 2}" patternUnits="userSpaceOnUse">
      <!-- First hex -->
      <polygon points="${vertices}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      <!-- Second hex (offset) -->
      <polygon points="${vertices}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" transform="translate(${w / 2}, ${h})" />
    </pattern>
  `;
};

const generateTrianglesPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;

  return `
    <pattern id="triangles-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <!-- Up triangle -->
      <polygon
        points="${0},${size} ${size / 2},${0} ${size},${size}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
      />
      <!-- Down triangle (offset) -->
      <polygon
        points="${0},${0} ${size / 2},${size} ${size},${0}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        transform="translate(0, 0)"
      />
    </pattern>
  `;
};

const generateConcentricPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;
  const center = size / 2;
  const rings = 4;

  let circles = '';
  for (let i = rings; i >= 1; i--) {
    const r = (size / 2 / rings) * i;
    const opacity = 0.2 + (i / rings) * 0.4;
    circles += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth * (i / rings)}" opacity="${opacity}" />`;
  }

  return `
    <pattern id="concentric-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      ${circles}
    </pattern>
  `;
};

const generateCircuitPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;
  const pad = size * 0.15;
  const mid = size / 2;

  const randomPath = () => {
    // Generate a circuit-like path within the cell
    const points = [];
    const numSegments = 3 + Math.floor(Math.random() * 3);
    let x = pad;
    let y = mid;

    for (let i = 0; i < numSegments; i++) {
      x = Math.min(size - pad, Math.max(pad, x + (Math.random() - 0.5) * size * 0.6));
      y = Math.min(size - pad, Math.max(pad, y + (Math.random() - 0.5) * size * 0.6));
      points.push(`${x},${y}`);
    }

    return `M${points.join(' L')}`;
  };

  return `
    <pattern id="circuit-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="${size}" height="${size}" fill="none" />
      <circle cx="${pad}" cy="${mid}" r="${strokeWidth * 1.5}" fill="${color}" opacity="0.3" />
      <circle cx="${size - pad}" cy="${mid}" r="${strokeWidth * 1.5}" fill="${color}" opacity="0.3" />
      <path d="M${pad},${mid} L${size - pad * 2},${mid} L${size - pad * 2},${size - pad} L${size - pad},${size - pad}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="0.3" />
      <path d="M${pad},${mid} L${mid},${mid} L${mid},${pad}" fill="none" stroke="${color}" stroke-width="${strokeWidth * 0.7}" opacity="0.2" />
    </pattern>
  `;
};

const generateWavesPattern = (
  cellSize: number,
  strokeWidth: number,
  color: string,
  gap: number
): string => {
  const size = cellSize + gap;
  const amplitude = size * 0.3;
  const frequency = (2 * Math.PI) / size;

  let wavePaths = '';
  for (let i = 0; i < 3; i++) {
    const offset = i * (size / 3);
    const pathPoints: string[] = [];

    for (let x = 0; x <= size; x += 2) {
      const y = size / 2 + Math.sin(x * frequency + offset) * amplitude * (0.5 + i * 0.2);
      pathPoints.push(`${x},${y}`);
    }

    wavePaths += `<path d="M${pathPoints.join(' L')}" fill="none" stroke="${color}" stroke-width="${strokeWidth * (1 - i * 0.2)}" opacity="${0.15 + i * 0.1}" />`;
  }

  return `
    <pattern id="waves-pattern" x="0" y="0" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
      ${wavePaths}
    </pattern>
  `;
};

// ============================================
// 4. PATTERN GENERATOR MAP
// ============================================

const PATTERN_GENERATORS: Record<
  PatternType,
  (cellSize: number, strokeWidth: number, color: string, gap: number) => string
> = {
  dots: generateDotsPattern,
  grid: generateGridPattern,
  crosshatch: generateCrosshatchPattern,
  diagonal: generateDiagonalPattern,
  hexagonal: generateHexagonalPattern,
  triangles: generateTrianglesPattern,
  concentric: generateConcentricPattern,
  voronoi: generateDotsPattern, // Fallback to dots (voronoi would need Canvas)
  circuit: generateCircuitPattern,
  waves: generateWavesPattern,
};

// ============================================
// 5. ANIMATION KEYFRAMES
// ============================================

const generateAnimationsStyles = (): string => {
  return `
    @keyframes grid-pattern-drift {
      0% {
        transform: translate(0, 0);
      }
      100% {
        transform: translate(var(--drift-x, 20px), var(--drift-y, 20px));
      }
    }

    @keyframes grid-pattern-pulse {
      0%, 100% {
        opacity: var(--base-opacity, 0.15);
      }
      50% {
        opacity: var(--pulse-opacity, 0.3);
      }
    }

    @keyframes grid-pattern-rotate {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes grid-pattern-wave {
      0%, 100% {
        transform: scale(1) rotate(0deg);
      }
      25% {
        transform: scale(1.05) rotate(1deg);
      }
      75% {
        transform: scale(0.95) rotate(-1deg);
      }
    }

    @keyframes grid-pattern-glow {
      0%, 100% {
        filter: brightness(1) blur(0px);
      }
      50% {
        filter: brightness(1.3) blur(0.5px);
      }
    }

    @keyframes grid-pattern-morph {
      0% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.1);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0.8;
      }
    }

    @keyframes grid-pattern-shimmer {
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
// 6. NOISE SVG FILTER
// ============================================

const NOISE_FILTER = `
  <filter id="noise-filter">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.65"
      numOctaves="3"
      stitchTiles="stitch"
    />
    <feColorMatrix type="saturate" values="0" />
    <feComponentTransfer>
      <feFuncA type="linear" slope="0.1" />
    </feComponentTransfer>
  </filter>
`;

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const GridPattern: React.FC<GridPatternProps> = ({
  type = 'dots',
  cellSize,
  strokeWidth,
  color = '#3B82F6',
  colorMode = 'single',
  gradientColors,
  gradientAngle = 135,
  size = 'md',
  opacity: opacityPreset = 'medium',
  customOpacity,
  gap,
  offsetX = 0,
  offsetY = 0,
  rotation = 0,
  animation = 'none',
  duration = 20,
  delay = 0,
  animateOnHover = false,
  blendMode = 'normal',
  fill = false,
  fillColor,
  fillOpacity = 0.05,
  showBorder = false,
  borderColor,
  asBackground = true,
  darkModeInvert = false,
  noise = false,
  noiseOpacity = 0.05,
  className = '',
  style,
  id,
  width = '100%',
  height = '100%',
  clipToBounds = true,
  children,
  respectReducedMotion = true,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [uniqueId] = useState(
    `grid-pattern-${Math.random().toString(36).substr(2, 9)}`
  );
  const [styleElementId] = useState(
    `grid-pattern-styles-${Math.random().toString(36).substr(2, 9)}`
  );
  const [isStyleInjected, setIsStyleInjected] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const sizeConfig = SIZE_PRESETS[size];
  const effectiveCellSize = cellSize || sizeConfig.cellSize;
  const effectiveStrokeWidth = strokeWidth || sizeConfig.strokeWidth;
  const effectiveGap = gap !== undefined ? gap : sizeConfig.gap;
  const effectiveOpacity =
    customOpacity !== undefined ? customOpacity : OPACITY_PRESETS[opacityPreset];

  // Determine which animation is active
  const isAnimated = animation !== 'none' && !shouldReduceMotion;
  const shouldAnimate =
    isAnimated && (!animateOnHover || (animateOnHover && isHovered));

  // Build gradient definition if using gradient color mode
  const gradientDef = useMemo(() => {
    if (colorMode !== 'gradient' || !gradientColors || gradientColors.length < 2)
      return null;

    const angleRad = (gradientAngle * Math.PI) / 180;
    const x1 = 50 - Math.cos(angleRad) * 50;
    const y1 = 50 - Math.sin(angleRad) * 50;
    const x2 = 50 + Math.cos(angleRad) * 50;
    const y2 = 50 + Math.sin(angleRad) * 50;

    const stops = gradientColors
      .map(
        (pc, index) =>
          `<stop offset="${pc.stop !== undefined ? `${pc.stop}%` : `${(index / (gradientColors.length - 1)) * 100}%`}" stop-color="${pc.color}" />`
      )
      .join('');

    return `
      <linearGradient id="pattern-gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        ${stops}
      </linearGradient>
    `;
  }, [colorMode, gradientColors, gradientAngle]);

  // Resolve pattern color
  const patternColor = useMemo(() => {
    if (colorMode === 'gradient') return 'url(#pattern-gradient)';
    if (Array.isArray(color)) return color[0];
    return color as string;
  }, [colorMode, color, gradientColors]);

  // Multi-color handling (for randomized patterns)
  const getRandomColor = useCallback(() => {
    if (Array.isArray(color) && colorMode === 'random') {
      return color[Math.floor(Math.random() * color.length)];
    }
    return patternColor;
  }, [color, colorMode, patternColor]);

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
  // Effects: Inject Animation Styles
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    const existingStyle = document.getElementById(styleElementId);
    if (existingStyle) {
      setIsStyleInjected(true);
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleElementId;
    styleElement.textContent = generateAnimationsStyles();
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
  // Generate SVG Pattern
  // ============================================

  const svgPattern = useMemo(() => {
    const generator =
      PATTERN_GENERATORS[type] || PATTERN_GENERATORS.dots;
    const colorToUse = colorMode === 'random' ? patternColor : getRandomColor();
    return generator(effectiveCellSize, effectiveStrokeWidth, colorToUse, effectiveGap);
  }, [type, effectiveCellSize, effectiveStrokeWidth, patternColor, effectiveGap, colorMode, getRandomColor]);

  // ============================================
  // Handlers
  // ============================================

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // ============================================
  // Animation Props
  // ============================================

  const animationStyle = useMemo((): CSSProperties => {
    if (!shouldAnimate) return {};

    const base: CSSProperties = {};

    switch (animation) {
      case 'drift':
        base.animation = `grid-pattern-drift ${duration}s linear infinite`;
        base.setProperty('--drift-x', `${effectiveCellSize}px`);
        base.setProperty('--drift-y', `${effectiveCellSize * 0.5}px`);
        break;

      case 'pulse':
        base.animation = `grid-pattern-pulse ${duration}s ease-in-out infinite`;
        base.setProperty('--base-opacity', `${effectiveOpacity}`);
        base.setProperty('--pulse-opacity', `${Math.min(1, effectiveOpacity * 2)}`);
        break;

      case 'rotate':
        base.animation = `grid-pattern-rotate ${duration}s linear infinite`;
        break;

      case 'wave':
        base.animation = `grid-pattern-wave ${duration}s ease-in-out infinite`;
        break;

      case 'glow':
        base.animation = `grid-pattern-glow ${duration}s ease-in-out infinite`;
        break;

      case 'morph':
        base.animation = `grid-pattern-morph ${duration}s ease-in-out infinite`;
        break;
    }

    if (delay > 0) {
      base.animationDelay = `${delay}s`;
    }

    return base;
  }, [shouldAnimate, animation, duration, delay, effectiveCellSize, effectiveOpacity]);

  // ============================================
  // Container Styles
  // ============================================

  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      ...style,
      ...(asBackground
        ? {
            position: 'absolute',
            inset: 0,
          }
        : {
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            position: 'relative',
          }),
      overflow: clipToBounds ? 'hidden' : 'visible',
      ...animationStyle,
    };

    if (darkModeInvert) {
      base.setProperty = base.setProperty || (() => {});
    }

    return base;
  }, [asBackground, width, height, style, clipToBounds, animationStyle, darkModeInvert]);

  // ============================================
  // 8. RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        grid-pattern-container
        ${darkModeInvert ? 'dark:invert' : ''}
        ${className}
      `}
      style={containerStyle}
      onMouseEnter={animateOnHover ? handleMouseEnter : undefined}
      onMouseLeave={animateOnHover ? handleMouseLeave : undefined}
    >
      {/* SVG Pattern Layer */}
      <svg
        className={`
          absolute inset-0
          ${blendMode !== 'normal' ? `mix-blend-${blendMode}` : ''}
        `}
        width="100%"
        height="100%"
        style={{
          opacity: effectiveOpacity,
          transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
          ...animationStyle,
        }}
        aria-hidden="true"
      >
        {/* Definitions */}
        <defs>
          {gradientDef}
          {noise && NOISE_FILTER}
          <pattern
            id={`${uniqueId}-pattern`}
            x="0"
            y="0"
            width={effectiveCellSize + effectiveGap}
            height={effectiveCellSize + effectiveGap}
            patternUnits="userSpaceOnUse"
          >
            {/* We inject the pattern content via dangerouslySetInnerHTML on a foreignObject */}
          </pattern>
        </defs>

        {/* Pattern Fill */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={
            fill && fillColor
              ? fillColor
              : `url(#${uniqueId}-pattern)`
          }
          fillOpacity={fill ? fillOpacity : 1}
          stroke={showBorder ? borderColor || (color as string) : 'none'}
          strokeWidth={showBorder ? effectiveStrokeWidth : 0}
        />

        {/* Render pattern via SVG inner content */}
        <g
          dangerouslySetInnerHTML={{
            __html: svgPattern.replace(
              /id="([^"]*-pattern)"/,
              `id="${uniqueId}-pattern"`
            ),
          }}
        />

        {/* Apply pattern fill */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#${uniqueId}-pattern)`}
          opacity={1}
        />

        {/* Noise Overlay */}
        {noise && (
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            filter="url(#noise-filter)"
            opacity={noiseOpacity}
            style={{ mixBlendMode: 'overlay' as any }}
          />
        )}
      </svg>

      {/* Fill Layer (separate for better performance) */}
      {fill && fillColor && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: fillColor,
            opacity: fillOpacity,
          }}
          aria-hidden="true"
        />
      )}

      {/* Content Layer */}
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  );
};

// ============================================
// 9. PRESET PATTERN COMPONENTS
// ============================================

interface PresetPatternProps {
  className?: string;
  opacity?: PatternOpacity;
  color?: string;
  children?: ReactNode;
}

export const DotGrid: React.FC<PresetPatternProps> = ({
  className = '',
  opacity = 'subtle',
  color = '#3B82F6',
  children,
}) => (
  <GridPattern
    type="dots"
    size="md"
    opacity={opacity}
    color={color}
    className={className}
  >
    {children}
  </GridPattern>
);

export const LineGrid: React.FC<PresetPatternProps> = ({
  className = '',
  opacity = 'subtle',
  color = '#3B82F6',
  children,
}) => (
  <GridPattern
    type="grid"
    size="md"
    opacity={opacity}
    color={color}
    className={className}
  >
    {children}
  </GridPattern>
);

export const CrosshatchPattern: React.FC<PresetPatternProps> = ({
  className = '',
  opacity = 'subtle',
  color = '#3B82F6',
  children,
}) => (
  <GridPattern
    type="crosshatch"
    size="md"
    opacity={opacity}
    color={color}
    className={className}
  >
    {children}
  </GridPattern>
);

export const HexagonalGrid: React.FC<PresetPatternProps> = ({
  className = '',
  opacity = 'subtle',
  color = '#3B82F6',
  children,
}) => (
  <GridPattern
    type="hexagonal"
    size="lg"
    opacity={opacity}
    color={color}
    className={className}
  >
    {children}
  </GridPattern>
);

export const CircuitBoard: React.FC<PresetPatternProps> = ({
  className = '',
  opacity = 'subtle',
  color = '#3B82F6',
  children,
}) => (
  <GridPattern
    type="circuit"
    size="lg"
    opacity={opacity}
    color={color}
    className={className}
  >
    {children}
  </GridPattern>
);

export const WavePattern: React.FC<PresetPatternProps> = ({
  className = '',
  opacity = 'subtle',
  color = '#3B82F6',
  children,
}) => (
  <GridPattern
    type="waves"
    size="xl"
    opacity={opacity}
    color={color}
    animation="drift"
    duration={30}
    className={className}
  >
    {children}
  </GridPattern>
);

// ============================================
// 10. ANIMATED BACKGROUND WRAPPER
// ============================================

interface AnimatedPatternBackgroundProps {
  children: ReactNode;
  type?: PatternType;
  animation?: PatternAnimation;
  duration?: number;
  className?: string;
}

export const AnimatedPatternBackground: React.FC<AnimatedPatternBackgroundProps> = ({
  children,
  type = 'dots',
  animation = 'drift',
  duration = 20,
  className = '',
}) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <GridPattern
        type={type}
        animation={animation}
        duration={duration}
        opacity="subtle"
        asBackground
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ============================================
// 11. DISPLAY NAMES
// ============================================

GridPattern.displayName = 'GridPattern';
DotGrid.displayName = 'DotGrid';
LineGrid.displayName = 'LineGrid';
CrosshatchPattern.displayName = 'CrosshatchPattern';
HexagonalGrid.displayName = 'HexagonalGrid';
CircuitBoard.displayName = 'CircuitBoard';
WavePattern.displayName = 'WavePattern';
AnimatedPatternBackground.displayName = 'AnimatedPatternBackground';

// ============================================
// 12. NAMED EXPORTS
// ============================================

export {
  SIZE_PRESETS,
  OPACITY_PRESETS,
  PATTERN_GENERATORS,
  NOISE_FILTER,
  generateAnimationsStyles,
};

// ============================================
// 13. TYPE EXPORTS
// ============================================

export type {
  PatternType,
  PatternColorMode,
  PatternSize,
  PatternOpacity,
  PatternAnimation,
  PatternBlendMode,
  PatternColor,
  GridPatternProps,
  PresetPatternProps,
  AnimatedPatternBackgroundProps,
};

// ============================================
// 14. DEFAULT EXPORT
// ============================================

export default GridPattern;
