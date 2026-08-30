// ============================================
// apps/frontend/src/components/landing/ui/ParticleBackground.tsx
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

type ParticleShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon' | 'mixed';

type ParticleMovement = 'float' | 'drift' | 'burst' | 'orbit' | 'spiral' | 'vortex' | 'rain' | 'snow';

type ParticleConnection = 'none' | 'lines' | 'mesh' | 'constellation' | 'web' | 'proximity';

type ParticleTheme = 'default' | 'aurora' | 'firefly' | 'galaxy' | 'matrix' | 'nebula' | 'ocean' | 'sunset';

type ParticleDensity = 'minimal' | 'low' | 'medium' | 'high' | 'dense';

type ParticleInteraction = 'none' | 'repel' | 'attract' | 'trail' | 'bubble';

type ParticleSize = 'uniform' | 'random' | 'graduated' | 'depth';

interface ParticleColor {
  color: string;
  weight?: number;
}

interface ParticleConfig {
  /** Number of particles */
  count: number;
  /** Particle shape */
  shape: ParticleShape;
  /** Movement pattern */
  movement: ParticleMovement;
  /** Connection style between particles */
  connection: ParticleConnection;
  /** Connection distance threshold in px */
  connectionDistance: number;
  /** Connection line width */
  connectionWidth: number;
  /** Connection line opacity (0-1) */
  connectionOpacity: number;
  /** Particle color(s) */
  colors: string[] | ParticleColor[];
  /** Particle size range [min, max] in px */
  sizeRange: [number, number];
  /** Particle size distribution */
  sizeDistribution: ParticleSize;
  /** Particle speed multiplier */
  speed: number;
  /** Particle opacity range [min, max] */
  opacityRange: [number, number];
  /** Whether particles have glow effect */
  glow: boolean;
  /** Glow intensity (0-1) */
  glowIntensity: number;
  /** Particle density */
  density: ParticleDensity;
  /** Mouse interaction type */
  interaction: ParticleInteraction;
  /** Interaction radius in px */
  interactionRadius: number;
  /** Interaction force (0-1) */
  interactionForce: number;
  /** Whether particles wrap around edges */
  wrapAround: boolean;
  /** Whether to show center vortex */
  vortex: boolean;
  /** Vortex strength (0-1) */
  vortexStrength: number;
  /** Whether to respond to scroll */
  scrollResponse: boolean;
  /** Scroll parallax factor */
  scrollFactor: number;
}

interface ParticleBackgroundProps {
  /** Preset theme (overrides individual config) */
  theme?: ParticleTheme;
  /** Full particle configuration */
  config?: Partial<ParticleConfig>;
  /** Container width */
  width?: number | string;
  /** Container height */
  height?: number | string;
  /** Background color */
  backgroundColor?: string;
  /** Whether to resize with window */
  responsive?: boolean;
  /** Whether to pause animation */
  paused?: boolean;
  /** Animation FPS cap */
  fps?: number;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Whether to show on mobile */
  showOnMobile?: boolean;
  /** Mobile particle count multiplier */
  mobileMultiplier?: number;
  /** Children to render on top */
  children?: ReactNode;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Canvas ref for external control */
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  /** Callback when particles are initialized */
  onInit?: (particleCount: number) => void;
  /** Callback on each animation frame */
  onFrame?: (ctx: CanvasRenderingContext2D, delta: number) => void;
}

// ============================================
// 2. PARTICLE CLASS (Internal)
// ============================================

interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  opacity: number;
  baseOpacity: number;
  shape: ParticleShape;
  angle: number;
  rotationSpeed: number;
  orbitRadius: number;
  orbitAngle: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; opacity: number }>;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  opacity: number;
  baseOpacity: number;
  shape: ParticleShape;
  angle: number;
  rotationSpeed: number;
  orbitRadius: number;
  orbitAngle: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; opacity: number }>;

  private canvasWidth: number;
  private canvasHeight: number;
  private config: ParticleConfig;
  private colorIndex: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    config: ParticleConfig,
    forcedShape?: ParticleShape
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.config = config;

    // Position
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;

    // Velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 0.5 + 0.5) * config.speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Size
    const [minSize, maxSize] = config.sizeRange;
    this.radius = minSize + Math.random() * (maxSize - minSize);
    this.baseRadius = this.radius;

    // Shape
    if (forcedShape) {
      this.shape = forcedShape;
    } else if (config.shape === 'mixed') {
      const shapes: ParticleShape[] = ['circle', 'square', 'triangle', 'diamond'];
      this.shape = shapes[Math.floor(Math.random() * shapes.length)];
    } else {
      this.shape = config.shape;
    }

    // Color
    this.colorIndex = Math.floor(Math.random() * config.colors.length);
    this.color = this.getWeightedColor();

    // Opacity
    const [minOpacity, maxOpacity] = config.opacityRange;
    this.baseOpacity = minOpacity + Math.random() * (maxOpacity - minOpacity);
    this.opacity = this.baseOpacity;

    // Rotation
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;

    // Orbit
    this.orbitRadius = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;

    // Life
    this.life = 1;
    this.maxLife = 1;

    // Trail
    this.trail = [];
  }

  private getWeightedColor(): string {
    const colors = this.config.colors;
    if (typeof colors[0] === 'string') {
      return colors[Math.floor(Math.random() * colors.length)] as string;
    }
    // Weighted selection
    const weighted = colors as ParticleColor[];
    const totalWeight = weighted.reduce((sum, c) => sum + (c.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const c of weighted) {
      random -= c.weight || 1;
      if (random <= 0) return c.color;
    }
    return weighted[weighted.length - 1].color;
  }

  update(
    delta: number,
    mouseX: number,
    mouseY: number,
    scrollY: number,
    config: ParticleConfig
  ): void {
    // Life management
    if (this.life <= 0) {
      this.reset();
    }

    // Movement patterns
    switch (config.movement) {
      case 'float':
        this.updateFloat(delta);
        break;
      case 'drift':
        this.updateDrift(delta);
        break;
      case 'burst':
        this.updateBurst(delta);
        break;
      case 'orbit':
        this.updateOrbit(delta);
        break;
      case 'spiral':
        this.updateSpiral(delta);
        break;
      case 'vortex':
        this.updateVortex(delta, config);
        break;
      case 'rain':
        this.updateRain(delta);
        break;
      case 'snow':
        this.updateSnow(delta);
        break;
      default:
        this.updateFloat(delta);
    }

    // Mouse interaction
    if (config.interaction !== 'none') {
      this.handleInteraction(mouseX, mouseY, config);
    }

    // Scroll response
    if (config.scrollResponse) {
      this.vy += scrollY * config.scrollFactor * 0.0001;
    }

    // Vortex effect
    if (config.vortex) {
      const centerX = this.canvasWidth / 2;
      const centerY = this.canvasHeight / 2;
      const dx = this.x - centerX;
      const dy = this.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const force = config.vortexStrength / (dist * 0.01 + 1);
        this.vx -= (dx / dist) * force * 0.1;
        this.vy -= (dy / dist) * force * 0.1;
      }
    }

    // Update position
    this.x += this.vx * delta;
    this.y += this.vy * delta;

    // Wrap around
    if (config.wrapAround) {
      if (this.x < -this.radius) this.x = this.canvasWidth + this.radius;
      if (this.x > this.canvasWidth + this.radius) this.x = -this.radius;
      if (this.y < -this.radius) this.y = this.canvasHeight + this.radius;
      if (this.y > this.canvasHeight + this.radius) this.y = -this.radius;
    } else {
      // Bounce
      if (this.x < this.radius || this.x > this.canvasWidth - this.radius) {
        this.vx *= -1;
        this.x = Math.max(this.radius, Math.min(this.canvasWidth - this.radius, this.x));
      }
      if (this.y < this.radius || this.y > this.canvasHeight - this.radius) {
        this.vy *= -1;
        this.y = Math.max(this.radius, Math.min(this.canvasHeight - this.radius, this.y));
      }
    }

    // Rotation
    this.angle += this.rotationSpeed * delta;

    // Trail
    if (config.interaction === 'trail') {
      this.trail.push({ x: this.x, y: this.y, opacity: this.opacity });
      if (this.trail.length > 10) {
        this.trail.shift();
      }
    }

    // Fade trail
    this.trail = this.trail.map(t => ({
      ...t,
      opacity: t.opacity * 0.9,
    }));

    // Life decay
    this.life -= delta * 0.0001;
  }

  private updateFloat(delta: number): void {
    // Add subtle random drift
    this.vx += (Math.random() - 0.5) * 0.01 * delta;
    this.vy += (Math.random() - 0.5) * 0.01 * delta;

    // Dampen velocity
    const maxSpeed = this.config.speed * 2;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  private updateDrift(delta: number): void {
    // Constant slow drift
    this.vx += (Math.random() - 0.48) * 0.005 * delta;
    this.vy += (Math.random() - 0.48) * 0.005 * delta;

    // Gentle deceleration
    this.vx *= 0.9995;
    this.vy *= 0.9995;
  }

  private updateBurst(delta: number): void {
    // Particles burst outward from center
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.canvasWidth * 1.5) {
      this.vx += (dx / (dist + 1)) * 0.02 * delta;
      this.vy += (dy / (dist + 1)) * 0.02 * delta;
    }
  }

  private updateOrbit(delta: number): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.orbitAngle += 0.002 * delta;
    this.orbitRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.4;

    this.x = centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = centerY + Math.sin(this.orbitAngle) * this.orbitRadius;
  }

  private updateSpiral(delta: number): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;

    this.orbitAngle += 0.003 * delta;
    this.orbitRadius = (this.orbitRadius + 0.05 * delta) % (Math.min(this.canvasWidth, this.canvasHeight) * 0.5);

    this.x = centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
    this.y = centerY + Math.sin(this.orbitAngle) * this.orbitRadius;
  }

  private updateVortex(delta: number, config: ParticleConfig): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      // Tangential force (spin)
      const tangentialForce = config.vortexStrength * 0.02;
      this.vx += (-dy / dist) * tangentialForce * delta;
      this.vy += (dx / dist) * tangentialForce * delta;
    }
  }

  private updateRain(delta: number): void {
    this.vy = this.config.speed * 2;
    this.vx = (Math.random() - 0.5) * 0.1;

    if (this.y > this.canvasHeight + this.radius) {
      this.y = -this.radius;
      this.x = Math.random() * this.canvasWidth;
    }
  }

  private updateSnow(delta: number): void {
    this.vy = this.config.speed * 0.5;
    this.vx = Math.sin(Date.now() * 0.001 + this.x * 0.01) * 0.5;

    if (this.y > this.canvasHeight + this.radius) {
      this.y = -this.radius;
      this.x = Math.random() * this.canvasWidth;
    }
  }

  private handleInteraction(
    mouseX: number,
    mouseY: number,
    config: ParticleConfig
  ): void {
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.interactionRadius) {
      const force = (1 - dist / config.interactionRadius) * config.interactionForce;

      switch (config.interaction) {
        case 'repel':
          this.vx += (dx / (dist + 1)) * force * 0.5;
          this.vy += (dy / (dist + 1)) * force * 0.5;
          this.opacity = Math.min(1, this.baseOpacity + force);
          this.radius = this.baseRadius * (1 + force * 0.5);
          break;

        case 'attract':
          this.vx -= (dx / (dist + 1)) * force * 0.3;
          this.vy -= (dy / (dist + 1)) * force * 0.3;
          this.opacity = Math.max(0.1, this.baseOpacity - force * 0.3);
          break;

        case 'trail':
          // Trail is handled in update()
          break;

        case 'bubble':
          this.radius = this.baseRadius * (1 + force * 2);
          this.opacity = Math.min(1, this.baseOpacity + force * 0.5);
          break;
      }
    } else {
      // Return to base values
      this.opacity += (this.baseOpacity - this.opacity) * 0.1;
      this.radius += (this.baseRadius - this.radius) * 0.1;
    }
  }

  private reset(): void {
    this.x = Math.random() * this.canvasWidth;
    this.y = Math.random() * this.canvasHeight;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 0.5 + 0.5) * this.config.speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = this.maxLife;
    this.opacity = this.baseOpacity;
    this.radius = this.baseRadius;
    this.trail = [];
  }

  draw(
    ctx: CanvasRenderingContext2D,
    config: ParticleConfig
  ): void {
    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Glow effect
    if (config.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.radius * 4 * config.glowIntensity;
    }

    // Draw trail
    if (this.trail.length > 0) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 0.5;
      ctx.beginPath();
      const first = this.trail[0];
      if (first) ctx.moveTo(first.x, first.y);
      for (const point of this.trail) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
    }

    // Draw particle
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.radius * 0.3;

    ctx.beginPath();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    switch (this.shape) {
      case 'circle':
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        break;

      case 'square':
        ctx.rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        break;

      case 'triangle':
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.866, this.radius * 0.5);
        ctx.lineTo(-this.radius * 0.866, this.radius * 0.5);
        ctx.closePath();
        break;

      case 'diamond':
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius, 0);
        ctx.closePath();
        break;

      case 'star':
        this.drawStar(ctx, 0, 0, this.radius, this.radius * 0.4, 5);
        break;

      case 'hexagon':
        this.drawPolygon(ctx, 0, 0, this.radius, 6);
        break;

      default:
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    }

    ctx.fill();
    if (config.connection !== 'none') {
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number
  ): void {
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawPolygon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    sides: number
  ): void {
    const step = (Math.PI * 2) / sides;
    for (let i = 0; i < sides; i++) {
      const angle = i * step - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

// ============================================
// 3. THEME PRESETS
// ============================================

const THEME_PRESETS: Record<ParticleTheme, ParticleConfig> = {
  default: {
    count: 80,
    shape: 'circle',
    movement: 'float',
    connection: 'lines',
    connectionDistance: 150,
    connectionWidth: 0.5,
    connectionOpacity: 0.15,
    colors: ['#3B82F6', '#7C3AED', '#EC4899'],
    sizeRange: [1, 4],
    sizeDistribution: 'random',
    speed: 1,
    opacityRange: [0.2, 0.6],
    glow: true,
    glowIntensity: 0.5,
    density: 'medium',
    interaction: 'repel',
    interactionRadius: 100,
    interactionForce: 0.5,
    wrapAround: false,
    vortex: false,
    vortexStrength: 0.3,
    scrollResponse: false,
    scrollFactor: 1,
  },
  aurora: {
    count: 100,
    shape: 'circle',
    movement: 'drift',
    connection: 'lines',
    connectionDistance: 200,
    connectionWidth: 0.3,
    connectionOpacity: 0.1,
    colors: [
      { color: '#06b6d4', weight: 3 },
      { color: '#8b5cf6', weight: 2 },
      { color: '#ec4899', weight: 1 },
    ],
    sizeRange: [2, 8],
    sizeDistribution: 'graduated',
    speed: 0.5,
    opacityRange: [0.1, 0.4],
    glow: true,
    glowIntensity: 0.8,
    density: 'medium',
    interaction: 'none',
    interactionRadius: 0,
    interactionForce: 0,
    wrapAround: true,
    vortex: false,
    vortexStrength: 0,
    scrollResponse: true,
    scrollFactor: 2,
  },
  firefly: {
    count: 50,
    shape: 'circle',
    movement: 'float',
    connection: 'none',
    connectionDistance: 0,
    connectionWidth: 0,
    connectionOpacity: 0,
    colors: ['#fbbf24', '#f59e0b', '#84cc16', '#22c55e'],
    sizeRange: [2, 6],
    sizeDistribution: 'random',
    speed: 0.8,
    opacityRange: [0.3, 1],
    glow: true,
    glowIntensity: 1,
    density: 'low',
    interaction: 'attract',
    interactionRadius: 150,
    interactionForce: 0.3,
    wrapAround: false,
    vortex: false,
    vortexStrength: 0,
    scrollResponse: false,
    scrollFactor: 1,
  },
  galaxy: {
    count: 200,
    shape: 'circle',
    movement: 'vortex',
    connection: 'mesh',
    connectionDistance: 120,
    connectionWidth: 0.2,
    connectionOpacity: 0.08,
    colors: [
      { color: '#ffffff', weight: 5 },
      { color: '#a78bfa', weight: 3 },
      { color: '#60a5fa', weight: 2 },
      { color: '#f472b6', weight: 1 },
    ],
    sizeRange: [0.5, 3],
    sizeDistribution: 'depth',
    speed: 0.3,
    opacityRange: [0.3, 0.9],
    glow: true,
    glowIntensity: 0.6,
    density: 'dense',
    interaction: 'none',
    interactionRadius: 0,
    interactionForce: 0,
    wrapAround: false,
    vortex: true,
    vortexStrength: 0.6,
    scrollResponse: false,
    scrollFactor: 1,
  },
  matrix: {
    count: 150,
    shape: 'square',
    movement: 'rain',
    connection: 'none',
    connectionDistance: 0,
    connectionWidth: 0,
    connectionOpacity: 0,
    colors: ['#22c55e', '#16a34a', '#15803d', '#86efac'],
    sizeRange: [1, 3],
    sizeDistribution: 'uniform',
    speed: 2,
    opacityRange: [0.3, 0.8],
    glow: true,
    glowIntensity: 0.4,
    density: 'high',
    interaction: 'none',
    interactionRadius: 0,
    interactionForce: 0,
    wrapAround: false,
    vortex: false,
    vortexStrength: 0,
    scrollResponse: false,
    scrollFactor: 1,
  },
  nebula: {
    count: 120,
    shape: 'circle',
    movement: 'spiral',
    connection: 'proximity',
    connectionDistance: 160,
    connectionWidth: 0.4,
    connectionOpacity: 0.12,
    colors: [
      { color: '#c084fc', weight: 4 },
      { color: '#818cf8', weight: 3 },
      { color: '#38bdf8', weight: 2 },
      { color: '#fb7185', weight: 1 },
    ],
    sizeRange: [1, 7],
    sizeDistribution: 'graduated',
    speed: 0.4,
    opacityRange: [0.1, 0.5],
    glow: true,
    glowIntensity: 0.7,
    density: 'medium',
    interaction: 'none',
    interactionRadius: 0,
    interactionForce: 0,
    wrapAround: true,
    vortex: true,
    vortexStrength: 0.3,
    scrollResponse: true,
    scrollFactor: 1.5,
  },
  ocean: {
    count: 100,
    shape: 'circle',
    movement: 'drift',
    connection: 'web',
    connectionDistance: 180,
    connectionWidth: 0.3,
    connectionOpacity: 0.08,
    colors: ['#06b6d4', '#0ea5e9', '#3b82f6', '#2563eb'],
    sizeRange: [1, 5],
    sizeDistribution: 'depth',
    speed: 0.6,
    opacityRange: [0.1, 0.4],
    glow: true,
    glowIntensity: 0.5,
    density: 'medium',
    interaction: 'repel',
    interactionRadius: 80,
    interactionForce: 0.4,
    wrapAround: false,
    vortex: false,
    vortexStrength: 0,
    scrollResponse: false,
    scrollFactor: 1,
  },
  sunset: {
    count: 80,
    shape: 'mixed',
    movement: 'float',
    connection: 'constellation',
    connectionDistance: 140,
    connectionWidth: 0.4,
    connectionOpacity: 0.1,
    colors: [
      { color: '#f97316', weight: 3 },
      { color: '#ef4444', weight: 2 },
      { color: '#ec4899', weight: 2 },
      { color: '#fbbf24', weight: 1 },
    ],
    sizeRange: [2, 6],
    sizeDistribution: 'random',
    speed: 0.7,
    opacityRange: [0.2, 0.6],
    glow: true,
    glowIntensity: 0.6,
    density: 'medium',
    interaction: 'bubble',
    interactionRadius: 120,
    interactionForce: 0.5,
    wrapAround: false,
    vortex: false,
    vortexStrength: 0,
    scrollResponse: false,
    scrollFactor: 1,
  },
};

const DENSITY_MULTIPLIERS: Record<ParticleDensity, number> = {
  minimal: 0.25,
  low: 0.5,
  medium: 1,
  high: 1.5,
  dense: 2.5,
};

// ============================================
// 4. MAIN COMPONENT
// ============================================

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  theme = 'default',
  config: customConfig = {},
  width = '100%',
  height = '100%',
  backgroundColor = 'transparent',
  responsive = true,
  paused = false,
  fps = 60,
  respectReducedMotion = true,
  showOnMobile = true,
  mobileMultiplier = 0.5,
  children,
  className = '',
  style,
  id = 'particle-background',
  canvasRef: externalCanvasRef,
  onInit,
  onFrame,
}) => {
  // ============================================
  // State
  // ============================================

  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const scrollRef = useRef(0);
  const isActiveRef = useRef(true);

  // ============================================
  // Derived Values
  // ============================================

  const mergedConfig = useMemo((): ParticleConfig => {
    const themeConfig = THEME_PRESETS[theme];
    const densityMultiplier = DENSITY_MULTIPLIERS[customConfig.density || themeConfig.density];

    return {
      ...themeConfig,
      ...customConfig,
      count: Math.floor((customConfig.count || themeConfig.count) * densityMultiplier),
      colors: customConfig.colors || themeConfig.colors,
    };
  }, [theme, customConfig]);

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
  // Effects: Canvas Setup & Animation
  // ============================================

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Check if should render
    if (shouldReduceMotion || (!showOnMobile && isMobile)) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const resizeCanvas = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR for performance

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    if (responsive) {
      window.addEventListener('resize', resizeCanvas);
    }

    // Initialize particles
    const effectiveCount = isMobile
      ? Math.floor(mergedConfig.count * mobileMultiplier)
      : mergedConfig.count;

    particlesRef.current = Array.from(
      { length: effectiveCount },
      () => new Particle(canvas.width, canvas.height, mergedConfig)
    );

    setIsReady(true);
    onInit?.(effectiveCount);

    // Animation loop
    const frameInterval = 1000 / fps;
    let accumulator = 0;

    const animate = (timestamp: number) => {
      if (!isActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      if (paused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      accumulator += delta;

      while (accumulator >= frameInterval) {
        accumulator -= frameInterval;

        const canvasWidth = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
        const canvasHeight = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Update and draw particles
        const particles = particlesRef.current;

        for (const particle of particles) {
          particle.update(
            frameInterval / 16.67, // Normalize to ~60fps
            mouseRef.current.x,
            mouseRef.current.y,
            scrollRef.current,
            mergedConfig
          );
          particle.draw(ctx, mergedConfig);
        }

        // Draw connections
        if (mergedConfig.connection !== 'none') {
          drawConnections(ctx, particles, mergedConfig);
        }

        // Call onFrame callback
        onFrame?.(ctx, frameInterval);

        // Update scroll reference
        if (mergedConfig.scrollResponse) {
          scrollRef.current = window.scrollY;
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (responsive) {
        window.removeEventListener('resize', resizeCanvas);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    mergedConfig,
    paused,
    fps,
    responsive,
    shouldReduceMotion,
    isMobile,
    showOnMobile,
    mobileMultiplier,
    onInit,
    onFrame,
  ]);

  // ============================================
  // Effects: Mouse Tracking
  // ============================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseRef.current = {
        x: (e.clientX - rect.left),
        y: (e.clientY - rect.top),
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // ============================================
  // Effects: Lifecycle
  // ============================================

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  // ============================================
  // Draw Connections Between Particles
  // ============================================

  const drawConnections = (
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    config: ParticleConfig
  ): void => {
    const maxDist = config.connectionDistance;
    const totalParticles = particles.length;

    ctx.globalAlpha = config.connectionOpacity;
    ctx.strokeStyle = typeof config.colors[0] === 'string'
      ? (config.colors[0] as string)
      : (config.colors[0] as ParticleColor).color;
    ctx.lineWidth = config.connectionWidth;

    for (let i = 0; i < totalParticles; i++) {
      const a = particles[i];

      // Limit checked connections based on style
      const checkLimit = config.connection === 'mesh' ? totalParticles :
                        config.connection === 'web' ? Math.min(totalParticles, i + 15) :
                        config.connection === 'constellation' ? Math.min(totalParticles, i + 5) :
                        totalParticles;

      for (let j = i + 1; j < checkLimit; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          // Proximity-based opacity
          const alpha = (1 - dist / maxDist) * config.connectionOpacity;

          // For constellation, only connect bright particles
          if (config.connection === 'constellation' && (a.opacity < 0.4 || b.opacity < 0.4)) {
            continue;
          }

          ctx.globalAlpha = alpha;

          // Use gradient for lines
          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          gradient.addColorStop(0, a.color);
          gradient.addColorStop(1, b.color);
          ctx.strokeStyle = gradient;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.globalAlpha = 1;
  };

  // ============================================
  // Container Styles
  // ============================================

  const containerStyle = useMemo((): CSSProperties => {
    return {
      position: 'relative',
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      backgroundColor,
      overflow: 'hidden',
      ...style,
    };
  }, [width, height, backgroundColor, style]);

  // ============================================
  // 5. RENDER
  // ============================================

  const shouldRenderParticles =
    !shouldReduceMotion && (showOnMobile || !isMobile);

  return (
    <div
      ref={containerRef}
      id={id}
      className={`particle-background ${className}`}
      style={containerStyle}
    >
      {/* Canvas */}
      {shouldRenderParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-0"
          style={{
            pointerEvents: 'none',
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
          }}
          aria-hidden="true"
        />
      )}

      {/* Fallback gradient for reduced motion */}
      {!shouldRenderParticles && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${typeof mergedConfig.colors[0] === 'string' ? mergedConfig.colors[0] : (mergedConfig.colors[0] as ParticleColor).color}08, ${typeof mergedConfig.colors[mergedConfig.colors.length - 1] === 'string' ? mergedConfig.colors[mergedConfig.colors.length - 1] : (mergedConfig.colors[mergedConfig.colors.length - 1] as ParticleColor).color}05)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Children */}
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  );
};

// ============================================
// 6. PRESET COMPONENTS
// ============================================

interface PresetParticleProps {
  children?: ReactNode;
  className?: string;
  config?: Partial<ParticleConfig>;
}

export const AuroraParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="aurora" {...props} />
);

export const FireflyParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="firefly" {...props} />
);

export const GalaxyParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="galaxy" {...props} />
);

export const MatrixParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="matrix" {...props} />
);

export const NebulaParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="nebula" {...props} />
);

export const OceanParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="ocean" {...props} />
);

export const SunsetParticles: React.FC<PresetParticleProps> = (props) => (
  <ParticleBackground theme="sunset" {...props} />
);

// ============================================
// 7. HERO PARTICLES WRAPPER
// ============================================

interface HeroParticlesProps {
  children: ReactNode;
  theme?: ParticleTheme;
  className?: string;
}

export const HeroParticles: React.FC<HeroParticlesProps> = ({
  children,
  theme = 'default',
  className = '',
}) => {
  return (
    <div className={`relative min-h-screen ${className}`}>
      <ParticleBackground
        theme={theme}
        config={{
          count: 100,
          interaction: 'repel',
          interactionRadius: 120,
          interactionForce: 0.4,
          connection: 'lines',
          connectionDistance: 150,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ============================================
// 8. DISPLAY NAMES
// ============================================

ParticleBackground.displayName = 'ParticleBackground';
AuroraParticles.displayName = 'AuroraParticles';
FireflyParticles.displayName = 'FireflyParticles';
GalaxyParticles.displayName = 'GalaxyParticles';
MatrixParticles.displayName = 'MatrixParticles';
NebulaParticles.displayName = 'NebulaParticles';
OceanParticles.displayName = 'OceanParticles';
SunsetParticles.displayName = 'SunsetParticles';
HeroParticles.displayName = 'HeroParticles';

// ============================================
// 9. NAMED EXPORTS
// ============================================

export {
  Particle,
  THEME_PRESETS,
  DENSITY_MULTIPLIERS,
};

// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  ParticleShape,
  ParticleMovement,
  ParticleConnection,
  ParticleTheme,
  ParticleDensity,
  ParticleInteraction,
  ParticleSize,
  ParticleColor,
  ParticleConfig,
  ParticleBackgroundProps,
  PresetParticleProps,
  HeroParticlesProps,
  ParticleState,
};

// ============================================
// 11. DEFAULT EXPORT
// ============================================

export default ParticleBackground;
