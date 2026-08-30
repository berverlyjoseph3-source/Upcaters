// ============================================
// apps/frontend/src/components/landing/interactive/LottieAnimation.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
  lazy,
} from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Info,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Settings,
  Volume2,
  VolumeX,
  Heart,
  Sparkles,
  Image,
  FileJson,
  Link,
  Upload,
  X,
  Sliders,
  Gauge,
  Palette,
  Repeat,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type AnimationSource =
  | 'url'          // Remote JSON URL
  | 'local'        // Bundled import
  | 'inline'       // Inline JSON object
  | 'sprite'       // Sprite sheet
  | 'dotlottie';   // .lottie file format

type AnimationState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'complete'
  | 'error'
  | 'stopped';

type AnimationDirection = 1 | -1;

type AnimationTheme = 'auto' | 'light' | 'dark';

type RendererType = 'svg' | 'canvas' | 'html';

type QualityLevel = 'low' | 'medium' | 'high';

type AnimationEvent =
  | 'complete'
  | 'loop'
  | 'enterFrame'
  | 'segmentStart'
  | 'destroy'
  | 'config_ready'
  | 'data_ready'
  | 'DOMLoaded'
  | 'error'
  | 'loaded_images';

interface AnimationPlaybackOptions {
  /** Speed multiplier (1 = normal) */
  speed?: number;
  /** Direction: 1 = forward, -1 = reverse */
  direction?: AnimationDirection;
  /** Loop the animation */
  loop?: boolean;
  /** Number of times to loop (0 = infinite) */
  loopCount?: number;
  /** Play from specific frame */
  startFrame?: number;
  /** Play to specific frame */
  endFrame?: number;
  /** Specific segments to play */
  segments?: [number, number] | [number, number][];
  /** Autoplay on load */
  autoplay?: boolean;
  /** Initial frame to render before playing */
  initialSegment?: [number, number];
  /** Preserve aspect ratio */
  preserveAspectRatio?: string;
}

interface LottieAnimationProps {
  /** Animation source type */
  source?: AnimationSource;
  /** URL to Lottie JSON file */
  url?: string;
  /** Local import of Lottie JSON */
  animationData?: object;
  /** Inline Lottie JSON string */
  inlineData?: string;
  /** .lottie file URL */
  dotLottieUrl?: string;
  /** Width of the animation container */
  width?: number | string;
  /** Height of the animation container */
  height?: number | string;
  /** Aspect ratio override (e.g., "16/9") */
  aspectRatio?: string;
  /** Playback options */
  playback?: AnimationPlaybackOptions;
  /** Renderer type */
  renderer?: RendererType;
  /** Quality level */
  quality?: QualityLevel;
  /** Theme for interactive elements */
  theme?: AnimationTheme;
  /** Whether to show loading skeleton */
  showLoading?: boolean;
  /** Whether to show controls overlay */
  showControls?: boolean;
  /** Whether controls are always visible */
  alwaysShowControls?: boolean;
  /** Whether to auto-hide controls after inactivity */
  autoHideControls?: boolean;
  /** Auto-hide delay in ms */
  autoHideDelay?: number;
  /** Whether to show the frame counter */
  showFrameCounter?: boolean;
  /** Whether to show the progress bar */
  showProgressBar?: boolean;
  /** Whether to show speed control */
  showSpeedControl?: boolean;
  /** Whether to show the quality toggle */
  showQualityToggle?: boolean;
  /** Whether to allow fullscreen */
  allowFullscreen?: boolean;
  /** Whether to mute (for animations with audio) */
  muted?: boolean;
  /** Whether to respect user's reduced motion preference */
  respectReducedMotion?: boolean;
  /** Whether the animation is interactive (responds to mouse) */
  interactive?: boolean;
  /** Hover effect */
  hoverEffect?: 'none' | 'scale' | 'glow' | 'bounce';
  /** Callback when animation loads */
  onLoad?: () => void;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback when animation loops */
  onLoop?: () => void;
  /** Callback on each frame */
  onFrame?: (currentFrame: number, totalFrames: number) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback when state changes */
  onStateChange?: (state: AnimationState) => void;
  /** Callback when animation is ready to play */
  onReady?: () => void;
  /** GIF fallback URL (shown on devices that don't support Lottie) */
  gifFallback?: string;
  /** PNG fallback URL (static image shown before load) */
  posterUrl?: string;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
  /** aria-label for accessibility */
  ariaLabel?: string;
  /** aria-describedby for accessibility */
  ariaDescribedBy?: string;
  /** Custom action buttons */
  customActions?: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }>;
}

interface ControlsOverlayProps {
  state: AnimationState;
  progress: number;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  direction: AnimationDirection;
  muted: boolean;
  isFullscreen: boolean;
  showQualityToggle: boolean;
  showSpeedControl: boolean;
  showFrameCounter: boolean;
  showProgressBar: boolean;
  customActions?: LottieAnimationProps['customActions'];
  theme: AnimationTheme;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleDirection: () => void;
  onSpeedChange: (speed: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 400;
const DEFAULT_SPEED = 1;
const DEFAULT_AUTO_HIDE_DELAY = 3000;
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

const STATE_LABELS: Record<AnimationState, string> = {
  idle: 'Ready',
  loading: 'Loading...',
  playing: 'Playing',
  paused: 'Paused',
  complete: 'Complete',
  error: 'Error',
  stopped: 'Stopped',
};

const STATE_ICONS: Record<AnimationState, React.ReactNode> = {
  idle: <Play className="h-5 w-5" />,
  loading: <Loader2 className="h-5 w-5 animate-spin" />,
  playing: <Play className="h-5 w-5" />,
  paused: <Pause className="h-5 w-5" />,
  complete: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  stopped: <RotateCcw className="h-5 w-5" />,
};

// ============================================
// 3. HELPER: Lazy load Lottie player
// ============================================

// Dynamic import to reduce bundle size if not used
const loadLottiePlayer = () =>
  import('@lottiefiles/lottie-player').then((mod) => mod.default || mod);

// ============================================
// 4. SUB-COMPONENT: Controls Overlay
// ============================================

const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  state,
  progress,
  currentFrame,
  totalFrames,
  speed,
  direction,
  muted,
  isFullscreen,
  showQualityToggle,
  showSpeedControl,
  showFrameCounter,
  showProgressBar,
  customActions,
  theme,
  onPlay,
  onPause,
  onStop,
  onToggleDirection,
  onSpeedChange,
  onMuteToggle,
  onFullscreenToggle,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const isPlaying = state === 'playing';
  const isDark = theme === 'dark' || theme === 'auto';

  const containerClasses = `
    absolute bottom-0 left-0 right-0
    bg-gradient-to-t from-black/80 via-black/40 to-transparent
    p-4 rounded-b-xl
    transition-opacity duration-300
  `;

  const buttonClasses = `
    p-2 rounded-lg
    text-white/80 hover:text-white
    hover:bg-white/10
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-brand-primary
  `;

  return (
    <div className={containerClasses}>
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="mb-3">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-1">
          {/* Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={buttonClasses}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>

          {/* Stop / Reset */}
          <button
            onClick={onStop}
            className={buttonClasses}
            aria-label="Reset animation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Direction Toggle */}
          <button
            onClick={onToggleDirection}
            className={buttonClasses}
            aria-label={`Play ${direction === 1 ? 'backward' : 'forward'}`}
          >
            {direction === 1 ? (
              <Rewind className="h-4 w-4" />
            ) : (
              <FastForward className="h-4 w-4" />
            )}
          </button>

          {/* Volume Toggle */}
          <button
            onClick={onMuteToggle}
            className={buttonClasses}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Center: Frame Counter */}
        {showFrameCounter && (
          <div className="text-xs text-white/60 font-mono">
            {currentFrame} / {totalFrames}
          </div>
        )}

        {/* Right: Additional Controls */}
        <div className="flex items-center gap-1">
          {/* Speed Control */}
          {showSpeedControl && (
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className={buttonClasses}
                aria-label="Playback speed"
              >
                <Gauge className="h-4 w-4" />
                <span className="text-xs ml-1">{speed}x</span>
              </button>

              {showSpeedMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSpeedMenu(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-32 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl z-20 overflow-hidden">
                    {SPEED_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          onSpeedChange(s);
                          setShowSpeedMenu(false);
                        }}
                        className={`
                          w-full text-left px-3 py-1.5 text-sm
                          ${s === speed ? 'bg-brand-primary text-white' : 'text-white/70 hover:bg-white/10'}
                          transition-colors
                        `}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Custom Actions */}
          {customActions?.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`
                ${buttonClasses}
                ${action.active ? 'text-brand-primary bg-brand-primary/20' : ''}
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-label={action.label}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}

          {/* Fullscreen Toggle */}
          <button
            onClick={onFullscreenToggle}
            className={buttonClasses}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Loading Skeleton
// ============================================

const LoadingSkeleton: React.FC<{
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  className?: string;
}> = ({ width, height, aspectRatio, className = '' }) => {
  const containerStyle: React.CSSProperties = {
    width: width || DEFAULT_WIDTH,
    height: height || DEFAULT_HEIGHT,
    aspectRatio: aspectRatio || undefined,
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-brand-surface border border-brand-border
        flex items-center justify-center
        ${className}
      `}
      style={containerStyle}
    >
      <div className="text-center">
        <div className="mx-auto w-16 h-16 mb-4 relative">
          <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
          <div className="absolute inset-0 rounded-full border-4 border-t-brand-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-brand-primary" />
          </div>
        </div>
        <p className="text-sm text-text-secondary">Loading animation...</p>
        <div className="mt-4 w-32 h-1.5 bg-brand-border rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>
  );
};

// ============================================
// 6. SUB-COMPONENT: Error State
// ============================================

const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
  gifFallback?: string;
  posterUrl?: string;
  width?: number | string;
  height?: number | string;
}> = ({ message, onRetry, gifFallback, posterUrl, width, height }) => {
  // Show fallback image if available
  const fallbackSrc = gifFallback || posterUrl;

  if (fallbackSrc) {
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ width: width || DEFAULT_WIDTH, height: height || DEFAULT_HEIGHT }}
      >
        <img
          src={fallbackSrc}
          alt="Animation fallback"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-xs text-white/70 text-center">
          Static preview — animation could not load
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        rounded-xl border border-red-500/30
        bg-red-500/5
        flex flex-col items-center justify-center
        p-8 text-center
      "
      style={{ width: width || DEFAULT_WIDTH, height: height || DEFAULT_HEIGHT }}
    >
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-7 w-7 text-red-500" />
      </div>
      <h4 className="text-base font-semibold text-text-primary mb-2">
        Animation Failed
      </h4>
      <p className="text-sm text-text-muted mb-4 max-w-xs">
        {message || 'Could not load the Lottie animation. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            inline-flex items-center gap-2
            px-4 py-2 rounded-lg
            text-sm font-medium text-white
            bg-red-600 hover:bg-red-700
            transition-colors duration-200
          "
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
};

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  source = 'url',
  url,
  animationData,
  inlineData,
  dotLottieUrl,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  aspectRatio,
  playback = {},
  renderer = 'svg',
  quality = 'high',
  theme = 'auto',
  showLoading = true,
  showControls = true,
  alwaysShowControls = false,
  autoHideControls = true,
  autoHideDelay = DEFAULT_AUTO_HIDE_DELAY,
  showFrameCounter = true,
  showProgressBar = true,
  showSpeedControl = true,
  showQualityToggle = false,
  allowFullscreen = true,
  muted = true,
  respectReducedMotion = true,
  interactive = false,
  hoverEffect = 'none',
  onLoad,
  onComplete,
  onLoop,
  onFrame,
  onError,
  onStateChange,
  onReady,
  gifFallback,
  posterUrl,
  className = '',
  style,
  id,
  ariaLabel = 'Lottie animation',
  ariaDescribedBy,
  customActions,
}) => {
  // ============================================
  // State
  // ============================================

  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(
    playback.speed || DEFAULT_SPEED
  );
  const [currentDirection, setCurrentDirection] = useState<AnimationDirection>(
    playback.direction || 1
  );
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsOverlay, setShowControlsOverlay] = useState(alwaysShowControls);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLottieReady, setIsLottieReady] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [renderedSrc, setRenderedSrc] = useState<string>('');
  const [isHovered, setIsHovered] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<any>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lottieModuleRef = useRef<any>(null);

  // ============================================
  // Effects: Reduced Motion Detection
  // ============================================

  useEffect(() => {
    if (!respectReducedMotion) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [respectReducedMotion]);

  // ============================================
  // Effects: Mouse interaction for control visibility
  // ============================================

  const resetHideTimer = useCallback(() => {
    if (!autoHideControls || alwaysShowControls) return;

    setShowControlsOverlay(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setShowControlsOverlay(false);
    }, autoHideDelay);
  }, [autoHideControls, alwaysShowControls, autoHideDelay]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // ============================================
  // Effects: Load Lottie Animation
  // ============================================

  useEffect(() => {
    if (shouldReduceMotion) {
      setAnimationState('idle');
      return;
    }

    let cancelled = false;

    const loadAnimation = async () => {
      setAnimationState('loading');
      setErrorMessage(null);

      try {
        let animationSrc: string | object | undefined;

        // Determine the source
        switch (source) {
          case 'url':
            animationSrc = url;
            break;
          case 'local':
          case 'inline':
            animationSrc = animationData || (inlineData ? JSON.parse(inlineData) : undefined);
            break;
          case 'sprite':
            // Sprite sheets not directly supported by Lottie — use poster fallback
            if (posterUrl) {
              setRenderedSrc(posterUrl);
              setAnimationState('complete');
              onReady?.();
              return;
            }
            throw new Error('Sprite sheets require poster fallback');
          case 'dotlottie':
            animationSrc = dotLottieUrl;
            break;
        }

        if (!animationSrc) {
          throw new Error('No animation source provided');
        }

        // For demo/development: simulate Lottie loading
        // In production, use the actual Lottie player

        // Simulate async loading
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (cancelled) return;

        // Determine rendered source
        if (typeof animationSrc === 'string') {
          setRenderedSrc(animationSrc);
        } else {
          // Convert object data to a placeholder display
          setRenderedSrc('');
        }

        setIsLottieReady(true);
        setAnimationState('idle');
        setTotalFrames(120); // Placeholder — actual frames from animation data
        onLoad?.();
        onReady?.();

        // If autoplay
        if (playback.autoplay !== false) {
          handlePlay();
        }
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error('Failed to load animation');
        setErrorMessage(error.message);
        setAnimationState('error');
        onError?.(error);
      }
    };

    loadAnimation();

    return () => {
      cancelled = true;
    };
  }, [source, url, animationData, inlineData, dotLottieUrl, posterUrl, shouldReduceMotion]);

  // ============================================
  // Effects: Frame simulation for demo
  // ============================================

  useEffect(() => {
    if (animationState !== 'playing' || !isLottieReady) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      setCurrentFrame((prev) => {
        const frameStep = (delta / (1000 / 30)) * currentSpeed;
        const newFrame = prev + frameStep * currentDirection;

        if (newFrame >= totalFrames) {
          setProgress(100);
          setAnimationState('complete');
          onComplete?.();
          return totalFrames;
        }

        if (newFrame <= 0) {
          setProgress(0);
          setAnimationState('complete');
          onComplete?.();
          return 0;
        }

        const newProgress = (newFrame / totalFrames) * 100;
        setProgress(newProgress);
        onFrame?.(Math.floor(newFrame), totalFrames);

        return newFrame;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [animationState, isLottieReady, currentSpeed, currentDirection, totalFrames, onComplete, onFrame]);

  // ============================================
  // Handlers
  // ============================================

  const handlePlay = useCallback(() => {
    if (!isLottieReady) return;

    if (animationState === 'complete') {
      setCurrentFrame(currentDirection === 1 ? 0 : totalFrames);
      setProgress(currentDirection === 1 ? 0 : 100);
    }

    setAnimationState('playing');
    onStateChange?.('playing');
  }, [isLottieReady, animationState, currentDirection, totalFrames, onStateChange]);

  const handlePause = useCallback(() => {
    setAnimationState('paused');
    onStateChange?.('paused');
  }, [onStateChange]);

  const handleStop = useCallback(() => {
    setAnimationState('stopped');
    setCurrentFrame(currentDirection === 1 ? 0 : totalFrames);
    setProgress(currentDirection === 1 ? 0 : 100);
    onStateChange?.('stopped');
  }, [currentDirection, totalFrames, onStateChange]);

  const handleToggleDirection = useCallback(() => {
    setCurrentDirection((prev) => (prev === 1 ? -1 : 1) as AnimationDirection);

    if (animationState === 'complete') {
      setCurrentFrame(currentDirection === 1 ? 0 : totalFrames);
      setAnimationState('playing');
    }
  }, [animationState, currentDirection, totalFrames]);

  const handleSpeedChange = useCallback((speed: number) => {
    setCurrentSpeed(speed);
  }, []);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }

    setIsFullscreen((prev) => !prev);
  }, [isFullscreen]);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setAnimationState('idle');
    // Reload animation
    setRenderedSrc('');
    setIsLottieReady(false);
    // Re-trigger the load effect by changing a dependency
    // In a real implementation, this would reload the animation source
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    resetHideTimer();
  }, [resetHideTimer]);

  const handleMouseMove = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!alwaysShowControls) {
      setShowControlsOverlay(false);
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
  }, [alwaysShowControls]);

  // ============================================
  // Derived: Hover Effect Styles
  // ============================================

  const hoverEffectClasses = useMemo(() => {
    switch (hoverEffect) {
      case 'scale':
        return 'hover:scale-105 transition-transform duration-300';
      case 'glow':
        return 'hover:shadow-glow-secondary transition-shadow duration-300';
      case 'bounce':
        return 'hover:animate-bounce-small';
      default:
        return '';
    }
  }, [hoverEffect]);

  // ============================================
  // Derived: Container Style
  // ============================================

  const containerStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      aspectRatio: aspectRatio || undefined,
      ...style,
    };

    if (isFullscreen) {
      base.width = '100vw';
      base.height = '100vh';
      base.aspectRatio = undefined;
    }

    return base;
  }, [width, height, aspectRatio, style, isFullscreen]);

  // ============================================
  // 8. RENDER: Lottie Player
  // ============================================

  const renderLottiePlayer = () => {
    if (shouldReduceMotion) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center p-4">
            <Eye className="h-12 w-12 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Animation paused for accessibility
            </p>
            <button
              onClick={() => setShouldReduceMotion(false)}
              className="mt-2 text-xs text-brand-primary hover:text-brand-primary/80 underline"
            >
              Play anyway
            </button>
          </div>
        </div>
      );
    }

    if (!isLottieReady && !renderedSrc) {
      return null;
    }

    // If we have a rendered source (URL), display it
    if (renderedSrc) {
      return (
        <div className="relative w-full h-full">
          {/* Lottie player placeholder */}
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `scale(${currentDirection})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Actual Lottie player would go here */}
            <lottie-player
              ref={lottieRef}
              autoplay={false}
              loop={playback.loop ?? false}
              mode="normal"
              src={renderedSrc}
              style={{ width: '100%', height: '100%' }}
            />

            {/* Visual indicator for demo (when lottie-player not loaded) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative"
                style={{
                  width: '80%',
                  height: '80%',
                }}
              >
                {/* Animated gradient placeholder */}
                <div
                  className={`
                    absolute inset-0 rounded-full
                    bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-accent
                    opacity-20 blur-3xl
                    transition-all duration-500
                  `}
                  style={{
                    transform: `scale(${0.8 + (progress / 100) * 0.4}) rotate(${progress * 3.6}deg)`,
                    opacity: 0.15 + (progress / 100) * 0.15,
                  }}
                />

                {/* Lottie icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="
                      w-16 h-16 rounded-2xl
                      bg-gradient-to-br from-brand-primary to-brand-secondary
                      flex items-center justify-center
                      shadow-lg
                      transition-all duration-500
                    "
                    style={{
                      transform: `rotate(${progress * 3.6}deg) scale(${1 + (progress / 100) * 0.1})`,
                    }}
                  >
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* Orbiting particles */}
                {[0, 72, 144, 216, 288].map((angle, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full bg-brand-primary/60"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) rotate(${angle + progress * 7.2}deg) translateX(${60 + i * 10}px)`,
                      opacity: 0.3 + (i * 0.1),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Inline animation data display
    if (animationData || inlineData) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="h-16 w-16 text-brand-primary mx-auto mb-4 animate-pulse" />
            <p className="text-sm text-text-secondary">
              Lottie Animation Ready
            </p>
            <p className="text-xs text-text-muted mt-1">
              {totalFrames} frames • {currentSpeed}x speed
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  // ============================================
  // 9. RENDER: Main Component
  // ============================================

  const showLoadingState = showLoading && animationState === 'loading';
  const showErrorState = animationState === 'error';
  const isControlsVisible = alwaysShowControls || showControlsOverlay || isHovered;

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        relative overflow-hidden rounded-xl
        bg-gradient-to-br from-brand-surface to-brand-dark
        border border-brand-border
        ${hoverEffectClasses}
        ${interactive ? 'cursor-pointer' : ''}
        ${isFullscreen ? 'fixed inset-0 z-50' : ''}
        ${className}
      `}
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onClick={interactive ? (animationState === 'playing' ? handlePause : handlePlay) : undefined}
    >
      {/* Poster Image (shown before animation loads) */}
      {posterUrl && !isLottieReady && !renderedSrc && (
        <img
          src={posterUrl}
          alt="Animation poster"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      )}

      {/* Loading State */}
      {showLoadingState && (
        <LoadingSkeleton width={width} height={height} aspectRatio={aspectRatio} />
      )}

      {/* Error State */}
      {showErrorState && (
        <ErrorState
          message={errorMessage || undefined}
          onRetry={handleRetry}
          gifFallback={gifFallback}
          posterUrl={posterUrl}
          width={width}
          height={height}
        />
      )}

      {/* Animation Player */}
      {!showLoadingState && !showErrorState && renderLottiePlayer()}

      {/* State Indicator Badge */}
      {animationState !== 'idle' && animationState !== 'loading' && !showErrorState && (
        <div className="absolute top-3 left-3">
          <span
            className={`
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-full
              text-xs font-medium
              backdrop-blur-xl
              ${
                animationState === 'playing'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : animationState === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-white/10 text-white/60 border border-white/10'
              }
            `}
          >
            {STATE_ICONS[animationState]}
            {STATE_LABELS[animationState]}
          </span>
        </div>
      )}

      {/* Progress Bar (top) */}
      {showProgressBar && !showControls && animationState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && isLottieReady && isControlsVisible && (
        <ControlsOverlay
          state={animationState}
          progress={progress}
          currentFrame={Math.floor(currentFrame)}
          totalFrames={totalFrames}
          speed={currentSpeed}
          direction={currentDirection}
          muted={isMuted}
          isFullscreen={isFullscreen}
          showQualityToggle={showQualityToggle}
          showSpeedControl={showSpeedControl}
          showFrameCounter={showFrameCounter}
          showProgressBar={showProgressBar}
          customActions={customActions}
          theme={theme}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onToggleDirection={handleToggleDirection}
          onSpeedChange={handleSpeedChange}
          onMuteToggle={handleMuteToggle}
          onFullscreenToggle={handleFullscreenToggle}
        />
      )}

      {/* Fullscreen Exit Button (when in fullscreen) */}
      {isFullscreen && (
        <button
          onClick={handleFullscreenToggle}
          className="
            absolute top-4 right-4
            p-2 rounded-lg
            bg-black/60 backdrop-blur-xl
            text-white hover:text-white
            hover:bg-white/10
            transition-all duration-200
            z-50
          "
          aria-label="Exit fullscreen"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

// ============================================
// 10. DISPLAY NAME
// ============================================

LottieAnimation.displayName = 'LottieAnimation';
ControlsOverlay.displayName = 'ControlsOverlay';
LoadingSkeleton.displayName = 'LoadingSkeleton';
ErrorState.displayName = 'ErrorState';

// ============================================
// 11. NAMED EXPORTS
// ============================================

export {
  ControlsOverlay,
  LoadingSkeleton,
  ErrorState,
  SPEED_OPTIONS,
  STATE_LABELS,
  STATE_ICONS,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
};

// ============================================
// 12. TYPE EXPORTS
// ============================================

export type {
  AnimationSource,
  AnimationState,
  AnimationDirection,
  AnimationTheme,
  RendererType,
  QualityLevel,
  AnimationEvent,
  AnimationPlaybackOptions,
  LottieAnimationProps,
  ControlsOverlayProps,
};

// ============================================
// 13. DEFAULT EXPORT
// ============================================

export default LottieAnimation;