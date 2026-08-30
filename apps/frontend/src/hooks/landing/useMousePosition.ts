// ============================================
// apps/frontend/src/hooks/landing/useMousePosition.ts
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================
// 1. TYPES
// ============================================

interface MousePosition {
  x: number;
  y: number;
  xPercentage: number;
  yPercentage: number;
  isInViewport: boolean;
  timestamp: number;
}

interface MouseVelocity {
  x: number;
  y: number;
  speed: number;
  angle: number;
  angleDegrees: number;
}

interface MousePositionRelative {
  x: number;
  y: number;
  xPercentage: number;
  yPercentage: number;
  isInside: boolean;
}

interface UseMousePositionOptions {
  enabled?: boolean;
  trackVelocity?: boolean;
  velocityInterval?: number;
  throttle?: boolean;
  throttleInterval?: number;
  targetRef?: React.RefObject<HTMLElement | null>;
  smooth?: boolean;
  smoothFactor?: number;
  onMove?: (position: MousePosition) => void;
  onEnter?: (position: MousePosition) => void;
  onLeave?: () => void;
  onElementEnter?: (position: MousePositionRelative) => void;
  onElementLeave?: () => void;
  onClick?: (position: MousePosition) => void;
}

interface UseMousePositionReturn {
  position: MousePosition;
  velocity: MouseVelocity | null;
  relativePosition: MousePositionRelative | null;
  isMoving: boolean;
  isInViewport: boolean;
  isInElement: boolean;
  isPressed: boolean;
  pressedButton: number | null;
  reset: () => void;
}

interface UseParallaxOptions {
  strength?: number;
  invert?: boolean;
  maxOffset?: number;
  enabled?: boolean;
}

interface UseParallaxReturn {
  value: number;
  transform: string;
}

interface UseMouseParallaxOptions {
  ref: React.RefObject<HTMLElement | null>;
  strength?: number;
  invert?: boolean;
  maxRotation?: number;
  enabled?: boolean;
}

interface UseMouseParallaxReturn {
  transform: string;
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  isHovering: boolean;
}

interface UseMouseGlowOptions {
  color?: string;
  size?: number;
  blur?: number;
  opacity?: number;
  enabled?: boolean;
  zIndex?: number;
}

interface UseMouseGlowReturn {
  glowStyles: React.CSSProperties;
  glowRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_SMOOTH_FACTOR = 0.8;
const DEFAULT_THROTTLE_INTERVAL = 16;
const DEFAULT_VELOCITY_INTERVAL = 50;
const DEFAULT_PARALLAX_STRENGTH = 0.2;
const DEFAULT_PARALLAX_MAX_OFFSET = 20;
const DEFAULT_TILT_STRENGTH = 0.3;
const DEFAULT_TILT_MAX_ROTATION = 15;
const DEFAULT_GLOW_SIZE = 400;
const DEFAULT_GLOW_BLUR = 100;
const DEFAULT_GLOW_OPACITY = 0.15;
const DEFAULT_GLOW_Z_INDEX = -1;

const INITIAL_POSITION: MousePosition = {
  x: 0,
  y: 0,
  xPercentage: 0,
  yPercentage: 0,
  isInViewport: false,
  timestamp: 0,
};

const INITIAL_VELOCITY: MouseVelocity = {
  x: 0,
  y: 0,
  speed: 0,
  angle: 0,
  angleDegrees: 0,
};

// ============================================
// 3. UTILITY FUNCTIONS
// ============================================

function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateAngle(dx: number, dy: number): { radians: number; degrees: number } {
  const radians = Math.atan2(dy, dx);
  let degrees = (radians * 180) / Math.PI;
  if (degrees < 0) degrees += 360;
  return { radians, degrees };
}

function calculateSpeed(dx: number, dy: number, dtMs: number): number {
  if (dtMs <= 0) return 0;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return (distance / dtMs) * 1000;
}

// ============================================
// 4. MAIN HOOK: useMousePosition
// ============================================

export function useMousePosition(options: UseMousePositionOptions = {}): UseMousePositionReturn {
  const {
    enabled = true,
    trackVelocity = false,
    velocityInterval = DEFAULT_VELOCITY_INTERVAL,
    throttle = false,
    throttleInterval = DEFAULT_THROTTLE_INTERVAL,
    targetRef,
    smooth = false,
    smoothFactor = DEFAULT_SMOOTH_FACTOR,
    onMove,
    onEnter,
    onLeave,
    onElementEnter,
    onElementLeave,
    onClick,
  } = options;

  const [rawPosition, setRawPosition] = useState<MousePosition>(INITIAL_POSITION);
  const [smoothedPosition, setSmoothedPosition] = useState<MousePosition>(INITIAL_POSITION);
  const [velocity, setVelocity] = useState<MouseVelocity | null>(null);
  const [relativePosition, setRelativePosition] = useState<MousePositionRelative | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isInElement, setIsInElement] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [pressedButton, setPressedButton] = useState<number | null>(null);

  const previousPositionRef = useRef({ x: 0, y: 0, timestamp: 0 });
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const currentPositionRef = useRef({ x: 0, y: 0 });
  const velocityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const throttleTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const calculatePosition = useCallback((event: MouseEvent): MousePosition => {
    const x = event.clientX;
    const y = event.clientY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    return {
      x,
      y,
      xPercentage: viewportWidth > 0 ? clamp(x / viewportWidth, 0, 1) : 0,
      yPercentage: viewportHeight > 0 ? clamp(y / viewportHeight, 0, 1) : 0,
      isInViewport: true,
      timestamp: Date.now(),
    };
  }, []);

  const calculateRelativePosition = useCallback(
    (event: MouseEvent): MousePositionRelative | null => {
      if (!targetRef?.current) return null;
      const rect = targetRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      return {
        x,
        y,
        xPercentage: rect.width > 0 ? clamp(x / rect.width, 0, 1) : 0,
        yPercentage: rect.height > 0 ? clamp(y / rect.height, 0, 1) : 0,
        isInside,
      };
    },
    [targetRef]
  );

  const updateVelocity = useCallback(() => {
    const prev = previousPositionRef.current;
    const current = currentPositionRef.current;
    const dt = current.timestamp - prev.timestamp;
    if (dt > 0) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      const speed = calculateSpeed(dx, dy, dt);
      const { radians, degrees } = calculateAngle(dx, dy);
      setVelocity({
        x: dx / (dt / 1000),
        y: dy / (dt / 1000),
        speed,
        angle: radians,
        angleDegrees: degrees,
      });
    }
    previousPositionRef.current = { ...current };
  }, []);

  const animateSmooth = useCallback(() => {
    const target = targetPositionRef.current;
    const current = currentPositionRef.current;
    const newX = lerp(current.x, target.x, smoothFactor);
    const newY = lerp(current.y, target.y, smoothFactor);
    currentPositionRef.current = { x: newX, y: newY };
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    setSmoothedPosition({
      x: newX,
      y: newY,
      xPercentage: viewportWidth > 0 ? clamp(newX / viewportWidth, 0, 1) : 0,
      yPercentage: viewportHeight > 0 ? clamp(newY / viewportHeight, 0, 1) : 0,
      isInViewport: true,
      timestamp: Date.now(),
    });
    animationFrameRef.current = requestAnimationFrame(animateSmooth);
  }, [smoothFactor]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;
      if (throttle && throttleTimerRef.current !== null) return;
      const position = calculatePosition(event);
      targetPositionRef.current = { x: position.x, y: position.y };
      setRawPosition((prev) => {
        if (prev.x === position.x && prev.y === position.y) return prev;
        return position;
      });
      if (!smooth) {
        currentPositionRef.current = { x: position.x, y: position.y };
        setSmoothedPosition(position);
      }
      if (targetRef) {
        const relPos = calculateRelativePosition(event);
        setRelativePosition(relPos);
        setIsInElement((prev) => {
          const isInside = relPos?.isInside ?? false;
          if (isInside && !prev) relPos && onElementEnter?.(relPos);
          else if (!isInside && prev) onElementLeave?.();
          return isInside;
        });
      }
      setIsMoving(true);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      moveTimerRef.current = setTimeout(() => setIsMoving(false), 150);
      if (trackVelocity) {
        currentPositionRef.current = { x: position.x, y: position.y, timestamp: position.timestamp };
      }
      if (throttle) {
        throttleTimerRef.current = window.setTimeout(() => {
          throttleTimerRef.current = null;
        }, throttleInterval);
      }
      onMove?.(smooth ? smoothedPosition : position);
    },
    [
      enabled, throttle, throttleInterval, calculatePosition, calculateRelativePosition,
      targetRef, smooth, smoothedPosition, trackVelocity, onMove, onElementEnter, onElementLeave,
    ]
  );

  const handleMouseEnter = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;
      const position = calculatePosition(event);
      setRawPosition(position);
      if (smooth) targetPositionRef.current = { x: position.x, y: position.y };
      else setSmoothedPosition(position);
      setIsInViewport(true);
      onEnter?.(position);
    },
    [enabled, calculatePosition, smooth, onEnter]
  );

  const handleMouseLeave = useCallback(() => {
    if (!enabled) return;
    setIsInViewport(false);
    setIsInElement(false);
    setIsMoving(false);
    setRelativePosition(null);
    onLeave?.();
    onElementLeave?.();
  }, [enabled, onLeave, onElementLeave]);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;
      setIsPressed(true);
      setPressedButton(event.button);
    },
    [enabled]
  );

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
    setPressedButton(null);
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;
      const position = calculatePosition(event);
      onClick?.(position);
    },
    [enabled, calculatePosition, onClick]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClick);
    };
  }, [enabled, handleMouseMove, handleMouseEnter, handleMouseLeave, handleMouseDown, handleMouseUp, handleClick]);

  useEffect(() => {
    if (smooth && enabled) {
      animationFrameRef.current = requestAnimationFrame(animateSmooth);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [smooth, enabled, animateSmooth]);

  useEffect(() => {
    if (trackVelocity && enabled) {
      velocityTimerRef.current = setInterval(updateVelocity, velocityInterval);
      return () => {
        if (velocityTimerRef.current) clearInterval(velocityTimerRef.current);
      };
    }
  }, [trackVelocity, enabled, velocityInterval, updateVelocity]);

  useEffect(() => {
    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      if (velocityTimerRef.current) clearInterval(velocityTimerRef.current);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const reset = useCallback(() => {
    setRawPosition(INITIAL_POSITION);
    setSmoothedPosition(INITIAL_POSITION);
    setVelocity(trackVelocity ? INITIAL_VELOCITY : null);
    setRelativePosition(null);
    setIsMoving(false);
    setIsInViewport(false);
    setIsInElement(false);
    setIsPressed(false);
    setPressedButton(null);
    previousPositionRef.current = { x: 0, y: 0, timestamp: 0 };
    targetPositionRef.current = { x: 0, y: 0 };
    currentPositionRef.current = { x: 0, y: 0 };
  }, [trackVelocity]);

  return useMemo(
    () => ({
      position: smooth ? smoothedPosition : rawPosition,
      velocity,
      relativePosition,
      isMoving,
      isInViewport,
      isInElement,
      isPressed,
      pressedButton,
      reset,
    }),
    [smooth, smoothedPosition, rawPosition, velocity, relativePosition, isMoving, isInViewport, isInElement, isPressed, pressedButton, reset]
  );
}

// ============================================
// 5. DERIVED HOOK: useParallax
// ============================================

export function useParallax(options: UseParallaxOptions = {}): UseParallaxReturn {
  const {
    strength = DEFAULT_PARALLAX_STRENGTH,
    invert = false,
    maxOffset = DEFAULT_PARALLAX_MAX_OFFSET,
    enabled = true,
  } = options;

  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setPosition({ x: 0, y: 0 });
      return;
    }
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  return useMemo(() => {
    if (!enabled) return { value: 0, transform: 'translate3d(0px, 0px, 0px)' };
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = ((position.x - centerX) / centerX) * maxOffset * strength;
    const offsetY = ((position.y - centerY) / centerY) * maxOffset * strength;
    const finalX = invert ? -offsetX : offsetX;
    const finalY = invert ? -offsetY : offsetY;
    return {
      value: Math.sqrt(finalX * finalX + finalY * finalY),
      transform: `translate3d(${finalX.toFixed(2)}px, ${finalY.toFixed(2)}px, 0px)`,
    };
  }, [enabled, position, strength, invert, maxOffset]);
}

// ============================================
// 6. DERIVED HOOK: useMouseParallax
// ============================================

export function useMouseParallax(options: UseMouseParallaxOptions): UseMouseParallaxReturn {
  const {
    ref,
    strength = DEFAULT_TILT_STRENGTH,
    invert = false,
    maxRotation = DEFAULT_TILT_MAX_ROTATION,
    enabled = true,
  } = options;

  const [relativePos, setRelativePos] = useState<MousePositionRelative | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!enabled || !ref.current) {
      setRelativePos(null);
      setIsHovering(false);
      return;
    }
    const element = ref.current;
    const handleMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      setRelativePos({
        x, y,
        xPercentage: rect.width > 0 ? clamp(x / rect.width, 0, 1) : 0,
        yPercentage: rect.height > 0 ? clamp(y / rect.height, 0, 1) : 0,
        isInside,
      });
      setIsHovering(isInside);
    };
    const handleMouseLeave = () => {
      setRelativePos(null);
      setIsHovering(false);
    };
    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, ref]);

  return useMemo(() => {
    if (!enabled || !relativePos || !isHovering) {
      return {
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px)',
        rotateX: 0,
        rotateY: 0,
        translateX: 0,
        translateY: 0,
        isHovering: false,
      };
    }
    const rotX = (relativePos.yPercentage - 0.5) * maxRotation * strength;
    const rotY = (relativePos.xPercentage - 0.5) * maxRotation * strength;
    const transX = (relativePos.xPercentage - 0.5) * 10 * strength;
    const transY = (relativePos.yPercentage - 0.5) * 10 * strength;
    const finalRotX = invert ? -rotX : rotX;
    const finalRotY = invert ? rotY : -rotY;
    const finalTransX = invert ? -transX : transX;
    const finalTransY = invert ? -transY : transY;
    return {
      transform: `perspective(1000px) rotateX(${finalRotX.toFixed(2)}deg) rotateY(${finalRotY.toFixed(2)}deg) translate3d(${finalTransX.toFixed(2)}px, ${finalTransY.toFixed(2)}px, 0px)`,
      rotateX: finalRotX,
      rotateY: finalRotY,
      translateX: finalTransX,
      translateY: finalTransY,
      isHovering: true,
    };
  }, [enabled, relativePos, isHovering, strength, invert, maxRotation]);
}

// ============================================
// 7. DERIVED HOOK: useMouseGlow
// ============================================

export function useMouseGlow(options: UseMouseGlowOptions = {}): UseMouseGlowReturn {
  const {
    color = '#3B82F6',
    size = DEFAULT_GLOW_SIZE,
    blur = DEFAULT_GLOW_BLUR,
    opacity = DEFAULT_GLOW_OPACITY,
    enabled = true,
    zIndex = DEFAULT_GLOW_Z_INDEX,
  } = options;

  const glowRef = useRef<HTMLDivElement | null>(null);
  const { position } = useMousePosition({ enabled });

  const glowStyles: React.CSSProperties = useMemo(() => {
    if (!enabled) return { display: 'none' };
    return {
      position: 'fixed',
      left: `${position.x - size / 2}px`,
      top: `${position.y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      filter: `blur(${blur}px)`,
      opacity: position.isInViewport ? opacity : 0,
      pointerEvents: 'none',
      zIndex,
      transition: 'opacity 0.3s ease-out',
      transform: 'translate3d(0, 0, 0)',
      willChange: 'left, top',
    };
  }, [enabled, position.x, position.y, position.isInViewport, size, color, blur, opacity, zIndex]);

  return {
    glowStyles,
    glowRef: glowRef as React.RefObject<HTMLDivElement | null>,
  };
}

// ============================================
// 8. NAMED EXPORTS
// ============================================

export type {
  MousePosition,
  MouseVelocity,
  MousePositionRelative,
  UseMousePositionOptions,
  UseMousePositionReturn,
  UseParallaxOptions,
  UseParallaxReturn,
  UseMouseParallaxOptions,
  UseMouseParallaxReturn,
  UseMouseGlowOptions,
  UseMouseGlowReturn,
};

export default useMousePosition;