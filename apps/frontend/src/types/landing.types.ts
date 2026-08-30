// ============================================
// apps/frontend/src/types/landing.types.ts
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react';

// ============================================
// 1. DESIGN TOKENS (Source of Truth)
// ============================================

export type ColorToken =
  | 'brand-primary'
  | 'brand-secondary'
  | 'brand-dark'
  | 'brand-surface'
  | 'brand-elevated'
  | 'brand-border'
  | 'brand-accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted';

export type SpacingToken = 
  | 'xs'   // 4px
  | 'sm'   // 8px
  | 'md'   // 16px
  | 'lg'   // 24px
  | 'xl'   // 32px
  | '2xl'  // 48px
  | '3xl'; // 64px

export type RadiusToken = 
  | 'sm'   // 8px
  | 'md'   // 12px
  | 'lg'   // 16px
  | 'xl';  // 20px

export type ShadowToken = 
  | 'sm'     // subtle card shadow
  | 'md'     // medium elevation
  | 'glow';  // purple glow effect

export type MotionDuration = 
  | 'fast'    // 150ms
  | 'normal'  // 250ms
  | 'slow';   // 400ms

export type MotionEasing = 
  | 'ease-out'
  | 'ease-in-out';

// ============================================
// 2. RESPONSIVE BREAKPOINTS
// ============================================

export type Breakpoint = 
  | 'sm'    // 640px
  | 'md'    // 768px
  | 'lg'    // 1024px
  | 'xl'    // 1280px
  | '2xl';  // 1536px

export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// ============================================
// 3. INTERACTION STATES
// ============================================

export type InteractionState = 
  | 'idle'
  | 'hover'
  | 'active'
  | 'focus'
  | 'disabled'
  | 'loading';

export type ComponentState = {
  [K in InteractionState]?: Partial<{
    scale: number;
    opacity: number;
    shadow: ShadowToken;
    border: ColorToken;
    background: ColorToken;
  }>;
};

// ============================================
// 4. NAVIGATION TYPES
// ============================================

export interface NavSubItem {
  /** Display label */
  label: string;
  /** URL path or anchor hash */
  href: string;
  /** Optional description shown in dropdown */
  description?: string;
  /** Optional icon component */
  icon?: ReactNode;
  /** Whether link opens in new tab */
  external?: boolean;
  /** Badge text (e.g., "New", "Beta") */
  badge?: string;
  /** Badge color variant */
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'warning';
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Tracking event name */
  trackingEvent?: string;
}

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** URL path or anchor hash (with # prefix for sections) */
  href: string;
  /** Optional children for dropdown */
  children?: NavSubItem[];
  /** Icon component for the link */
  icon?: ReactNode;
  /** Whether link opens in new tab */
  external?: boolean;
  /** Badge text */
  badge?: string;
  /** Badge color variant */
  badgeVariant?: 'primary' | 'secondary' | 'success' | 'warning';
  /** Whether this nav item is a CTA button */
  isCTA?: boolean;
  /** CTA variant */
  ctaVariant?: 'primary' | 'secondary' | 'outline';
  /** Whether this item requires authentication */
  requiresAuth?: boolean;
  /** Tracking event name */
  trackingEvent?: string;
}

export interface NavbarConfig {
  /** Logo component or image URL */
  logo: NavLogo;
  /** Main navigation items */
  items: NavItem[];
  /** Right-side CTA buttons (e.g., Login, Sign Up) */
  ctas: NavItem[];
  /** Whether navbar is transparent on hero (becomes solid on scroll) */
  transparentOnTop?: boolean;
  /** Whether to show the mobile hamburger menu */
  showMobileMenu?: boolean;
  /** Callback when mobile menu opens/closes */
  onMobileMenuToggle?: (isOpen: boolean) => void;
}

export interface NavLogo {
  /** Image src for light variant */
  light: string;
  /** Image src for dark variant */
  dark?: string;
  /** Alt text */
  alt: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** URL to navigate when clicking logo */
  href?: string;
}

// ============================================
// 5. HERO SECTION TYPES
// ============================================

export interface HeroBadge {
  /** Badge text */
  text: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Optional link */
  href?: string;
  /** Background color token */
  bgColor?: ColorToken;
  /** Border color token */
  borderColor?: ColorToken;
  /** Text color token */
  textColor?: ColorToken;
}

export interface HeroCTA {
  /** Button label */
  label: string;
  /** URL or anchor */
  href: string;
  /** Button variant */
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Optional icon before text */
  icon?: ReactNode;
  /** Optional icon after text */
  iconRight?: ReactNode;
  /** Tracking event name */
  trackingEvent?: string;
  /** Whether this opens a modal (e.g., video) instead of navigating */
  opensModal?: 'video' | 'signup' | 'demo';
}

export interface HeroStat {
  /** Display value (e.g., "10,000+") */
  value: string;
  /** Label below value */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
}

export interface HeroConfig {
  /** Badge shown above headline */
  badge?: HeroBadge;
  /** Main headline text */
  headline: string;
  /** Highlighted word(s) in headline (will get gradient effect) */
  highlightedWords: string[];
  /** Subheadline paragraph */
  subheadline: string;
  /** Primary CTA button */
  primaryCTA: HeroCTA;
  /** Secondary CTA button (optional) */
  secondaryCTA?: HeroCTA;
  /** Social proof stats below CTAs */
  stats?: HeroStat[];
  /** Whether to show the animated background orbs */
  showOrbs?: boolean;
  /** Background gradient configuration */
  backgroundGradient?: {
    from: ColorToken;
    via?: ColorToken;
    to: ColorToken;
  };
  /** Whether to show scroll-down indicator */
  showScrollIndicator?: boolean;
  /** Optional background video URL */
  backgroundVideo?: string;
  /** Optional hero image or illustration */
  heroImage?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    /** Float animation config */
    floatAnimation?: boolean;
  };
}

// ============================================
// 6. FEATURE / AGENT CARD TYPES
// ============================================

export interface FeatureIcon {
  /** Lucide icon name or custom icon component */
  name: string;
  /** Or provide a custom React node */
  component?: ReactNode;
}

export interface AgentCapability {
  /** Short feature name */
  name: string;
  /** Optional description */
  description?: string;
  /** Whether this is a premium (paid) feature */
  premium?: boolean;
  /** Whether this is coming soon */
  comingSoon?: boolean;
}

export interface FeatureCard {
  /** Unique identifier */
  id: string;
  /** Display title */
  title: string;
  /** Short description (max 2 lines) */
  description: string;
  /** Icon configuration */
  icon: FeatureIcon;
  /** CSS gradient classes for the card accent */
  gradient: string;
  /** List of capabilities */
  capabilities: AgentCapability[];
  /** Whether this card is highlighted/featured */
  highlight?: boolean;
  /** Highlight badge text */
  highlightBadge?: string;
  /** URL for "Learn more" link */
  learnMoreUrl?: string;
  /** Whether this feature is available on current plan */
  available?: boolean;
  /** Required plan tier */
  requiredPlan?: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  /** Animation configuration */
  animation?: {
    delay?: number;
    duration?: MotionDuration;
    direction?: 'up' | 'down' | 'left' | 'right';
  };
}

export interface FeaturesSectionConfig {
  /** Section heading */
  heading: string;
  /** Section subheading */
  subheading: string;
  /** Feature cards to display */
  cards: FeatureCard[];
  /** Layout style */
  layout: 'grid' | 'carousel' | 'masonry';
  /** Grid columns at different breakpoints */
  columns?: ResponsiveValue<number>;
  /** Whether to show the "View all features" link */
  showViewAll?: boolean;
  /** View all link URL */
  viewAllUrl?: string;
}

// ============================================
// 7. WORKFLOW / PIPELINE TYPES
// ============================================

export interface WorkflowNode {
  /** Unique node ID */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Icon configuration */
  icon: FeatureIcon;
  /** CSS gradient for node */
  gradient: string;
  /** What this node does in the pipeline */
  role: 'input' | 'processor' | 'output' | 'trigger' | 'condition';
  /** Whether node is currently executing (animation) */
  isActive?: boolean;
  /** Execution status for demo */
  status?: 'pending' | 'running' | 'completed' | 'error';
  /** Execution duration label */
  duration?: string;
  /** Node position in the flow */
  position?: {
    x: number;
    y: number;
  };
}

export interface WorkflowConnection {
  /** Source node ID */
  from: string;
  /** Target node ID */
  to: string;
  /** Connection label */
  label?: string;
  /** Whether connection is animated */
  animated?: boolean;
  /** Whether connection shows data flowing */
  showDataFlow?: boolean;
}

export interface WorkflowDemoConfig {
  /** Section heading */
  heading: string;
  /** Section subheading */
  subheading: string;
  /** Workflow nodes */
  nodes: WorkflowNode[];
  /** Connections between nodes */
  connections: WorkflowConnection[];
  /** Whether to show the workflow step-by-step (animated) */
  animated?: boolean;
  /** Animation speed multiplier */
  animationSpeed?: number;
  /** CTA shown after workflow completes */
  cta?: {
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
  };
  /** Background style */
  background?: 'solid' | 'gradient' | 'grid' | 'dots';
}

// ============================================
// 8. PRICING TYPES
// ============================================

export interface PricingFeature {
  /** Feature name */
  name: string;
  /** Whether this feature is included */
  included: boolean;
  /** Optional tooltip explaining the feature */
  tooltip?: string;
  /** Whether this is a highlighted/important feature */
  highlight?: boolean;
}

export interface PricingPlan {
  /** Unique plan ID */
  id: string;
  /** Plan name */
  name: string;
  /** Short description */
  description: string;
  /** Monthly price in dollars (use 0 for free) */
  monthlyPrice: number;
  /** Yearly price in dollars (use 0 for free) */
  yearlyPrice: number;
  /** Currency code */
  currency: string;
  /** Whether this plan is highlighted as "Most Popular" */
  popular?: boolean;
  /** Custom badge text (overrides "Most Popular") */
  badge?: string;
  /** Plan features list */
  features: PricingFeature[];
  /** Feature names that are highlighted in the card */
  highlightedFeatureNames: string[];
  /** CTA button text */
  cta: string;
  /** CTA button URL or anchor */
  ctaHref: string;
  /** CSS gradient for plan card accent */
  gradient: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether this is a custom/enterprise plan */
  isCustom?: boolean;
  /** Custom plan contact text */
  customText?: string;
  /** Plan limits summary */
  limits?: {
    aiActions: number | 'unlimited';
    apiCalls: number | 'unlimited';
    teamMembers: number;
    storageGB: number;
  };
}

export interface PricingSectionConfig {
  /** Section heading */
  heading: string;
  /** Section subheading */
  subheading: string;
  /** Pricing plans */
  plans: PricingPlan[];
  /** Whether to show monthly/yearly toggle */
  showToggle?: boolean;
  /** Default billing interval */
  defaultInterval?: 'monthly' | 'yearly';
  /** Yearly discount percentage text */
  yearlyDiscountText?: string;
  /** Feature comparison table (optional) */
  comparisonFeatures?: Array<{
    name: string;
    values: Record<string, string | boolean>;
  }>;
  /** FAQ link shown below pricing */
  faqLink?: {
    label: string;
    href: string;
  };
  /** Enterprise contact CTA */
  enterpriseCTA?: {
    label: string;
    href: string;
  };
}

// ============================================
// 9. TESTIMONIAL TYPES
// ============================================

export interface TestimonialMetric {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string;
  /** Optional change indicator */
  trend?: 'up' | 'down' | 'stable';
}

export interface Testimonial {
  /** Unique ID */
  id: string;
  /** Person's name */
  name: string;
  /** Person's role */
  role: string;
  /** Company name */
  company: string;
  /** Company logo URL */
  companyLogo?: string;
  /** Testimonial quote text */
  content: string;
  /** Rating (1-5) */
  rating: number;
  /** Key metrics to highlight */
  metrics?: TestimonialMetric[];
  /** Person's avatar URL */
  avatar?: string;
  /** Whether identity is verified */
  verified?: boolean;
  /** Video testimonial URL (optional) */
  videoUrl?: string;
  /** Industry */
  industry?: string;
  /** Company size */
  companySize?: 'small' | 'medium' | 'enterprise';
}

export interface TestimonialsSectionConfig {
  /** Section heading */
  heading: string;
  /** Section subheading */
  subheading: string;
  /** Testimonials to display */
  testimonials: Testimonial[];
  /** Display layout */
  layout: 'grid' | 'carousel' | 'marquee';
  /** Grid columns */
  columns?: ResponsiveValue<number>;
  /** Whether to auto-rotate (carousel) */
  autoRotate?: boolean;
  /** Auto-rotation interval in ms */
  autoRotateInterval?: number;
}

// ============================================
// 10. INTEGRATION TYPES
// ============================================

export interface Integration {
  /** Unique ID */
  id: string;
  /** Integration name */
  name: string;
  /** Integration logo URL */
  logo: string;
  /** Logo dark mode variant */
  logoDark?: string;
  /** Integration category */
  category?: string;
  /** Integration description */
  description?: string;
  /** Whether this integration requires setup */
  requiresSetup?: boolean;
  /** Setup documentation URL */
  setupUrl?: string;
  /** Whether this is a premium integration */
  premium?: boolean;
}

export interface IntegrationsSectionConfig {
  /** Section heading */
  heading: string;
  /** Section subheading */
  subheading: string;
  /** Integrations to display */
  integrations: Integration[];
  /** Display style */
  style: 'grid' | 'marquee' | 'list';
  /** Whether to show the "View all" link */
  showViewAll?: boolean;
  /** View all URL */
  viewAllUrl?: string;
  /** Total number of integrations (if not all shown) */
  totalCount?: number;
}

// ============================================
// 11. STATS COUNTER TYPES
// ============================================

export interface StatItem {
  /** Unique ID */
  id: string;
  /** Display value (supports formatting like "99.9%") */
  value: string;
  /** Label below value */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether to animate the counter */
  animate?: boolean;
  /** Custom animation duration in ms */
  animationDuration?: number;
  /** Optional prefix before value */
  prefix?: string;
  /** Optional suffix after value */
  suffix?: string;
}

export interface StatsSectionConfig {
  /** Section heading (optional — can just show stats) */
  heading?: string;
  /** Section subheading */
  subheading?: string;
  /** Stats to display */
  stats: StatItem[];
  /** Layout */
  layout: 'row' | 'grid';
  /** Columns configuration */
  columns?: ResponsiveValue<number>;
  /** Background variant */
  background?: 'solid' | 'gradient' | 'transparent';
}

// ============================================
// 12. CTA BANNER TYPES
// ============================================

export interface CTABannerConfig {
  /** Banner heading */
  heading: string;
  /** Banner subheading */
  subheading: string;
  /** Primary CTA */
  primaryCTA: {
    label: string;
    href: string;
    variant: 'primary' | 'secondary';
    icon?: ReactNode;
  };
  /** Secondary CTA (optional) */
  secondaryCTA?: {
    label: string;
    href: string;
    variant: 'outline' | 'ghost';
    icon?: ReactNode;
  };
  /** Background style */
  background: 'gradient' | 'solid' | 'image' | 'pattern';
  /** Background gradient configuration */
  backgroundGradient?: {
    from: ColorToken;
    to: ColorToken;
    angle?: number;
  };
  /** Whether to show animated particles */
  showParticles?: boolean;
  /** Trust badges shown below CTAs */
  trustBadges?: string[];
}

// ============================================
// 13. FAQ TYPES
// ============================================

export interface FAQItem {
  /** Unique ID */
  id: string;
  /** Question text */
  question: string;
  /** Answer text (supports basic HTML) */
  answer: string;
  /** Category for grouping */
  category?: string;
  /** Whether this item is expanded by default */
  defaultExpanded?: boolean;
}

export interface FAQSectionConfig {
  /** Section heading */
  heading: string;
  /** Section subheading */
  subheading: string;
  /** FAQ items */
  items: FAQItem[];
  /** Whether to group by category */
  groupByCategory?: boolean;
  /** Layout style */
  layout: 'single-column' | 'two-column' | 'accordion';
  /** Show search bar to filter FAQs */
  showSearch?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** "Still have questions" CTA */
  contactCTA?: {
    label: string;
    href: string;
  };
}

// ============================================
// 14. FOOTER TYPES
// ============================================

export interface FooterColumn {
  /** Column heading */
  heading: string;
  /** Links in this column */
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
    badge?: string;
  }>;
}

export interface FooterConfig {
  /** Logo config */
  logo: NavLogo;
  /** Company description/tagline */
  description: string;
  /** Navigation columns */
  columns: FooterColumn[];
  /** Social media links */
  socialLinks: Array<{
    platform: string;
    href: string;
    icon: ReactNode;
  }>;
  /** Copyright text */
  copyright: string;
  /** Bottom links (Privacy, Terms, etc.) */
  bottomLinks: Array<{
    label: string;
    href: string;
  }>;
  /** Newsletter signup */
  newsletter?: {
    heading: string;
    placeholder: string;
    buttonLabel: string;
    onSubmit: (email: string) => void;
  };
}

// ============================================
// 15. ANIMATION & EFFECTS TYPES
// ============================================

export interface ScrollRevealOptions {
  /** Animation direction */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Animation duration (seconds) */
  duration?: number;
  /** Whether animation triggers only once */
  once?: boolean;
  /** How much of element must be visible to trigger (0-1) */
  amount?: number;
  /** Easing function */
  easing?: MotionEasing;
}

export interface GlowOrb {
  /** Unique orb ID */
  id: string;
  /** CSS color */
  color: string;
  /** Orb size in pixels */
  size: number;
  /** Horizontal position */
  x: string;
  /** Vertical position */
  y: string;
  /** Blur amount in pixels */
  blur: number;
  /** Opacity values [min, ideal, max] */
  opacity: [number, number, number];
  /** Animation cycle duration in seconds */
  duration: number;
  /** Animation start delay in seconds */
  delay: number;
}

export interface ParticleEffect {
  /** Number of particles */
  count: number;
  /** Particle colors */
  colors: string[];
  /** Minimum particle size */
  minSize: number;
  /** Maximum particle size */
  maxSize: number;
  /** Particle movement speed */
  speed: number;
  /** Whether particles connect with lines */
  connectParticles?: boolean;
  /** Connection line max distance */
  connectionDistance?: number;
  /** Whether particles respond to mouse */
  interactive?: boolean;
}

export interface GradientBorderOptions {
  /** Gradient CSS string */
  gradient?: string;
  /** Border radius */
  borderRadius?: string;
  /** Border width */
  borderWidth?: string;
  /** Whether to add glow on hover */
  glowOnHover?: boolean;
  /** Inner padding */
  padding?: string;
  /** Variant type */
  variant?: 'card' | 'button' | 'container' | 'input';
  /** Animation duration */
  animationDuration?: MotionDuration;
}

// ============================================
// 16. LANDING PAGE ROOT CONFIG
// ============================================

export interface LandingPageMeta {
  /** Page title */
  title: string;
  /** Page description for SEO */
  description: string;
  /** Open Graph image URL */
  ogImage: string;
  /** Canonical URL */
  canonicalUrl: string;
  /** Keywords for SEO */
  keywords: string[];
  /** Author */
  author: string;
  /** Theme color for browsers */
  themeColor: string;
}

export interface LandingPageConfig {
  /** Page meta information */
  meta: LandingPageMeta;
  /** Navigation bar configuration */
  navigation: NavbarConfig;
  /** Hero section configuration */
  hero: HeroConfig;
  /** Features section (optional) */
  features?: FeaturesSectionConfig;
  /** Stats counter section (optional) */
  stats?: StatsSectionConfig;
  /** Workflow demo section (optional) */
  workflow?: WorkflowDemoConfig;
  /** Integrations section (optional) */
  integrations?: IntegrationsSectionConfig;
  /** Pricing section (optional) */
  pricing?: PricingSectionConfig;
  /** Testimonials section (optional) */
  testimonials?: TestimonialsSectionConfig;
  /** FAQ section (optional) */
  faq?: FAQSectionConfig;
  /** CTA banner section */
  ctaBanner: CTABannerConfig;
  /** Footer configuration */
  footer: FooterConfig;
  /** Whether to show scroll progress bar */
  showScrollProgress?: boolean;
  /** Whether to enable smooth scrolling */
  smoothScroll?: boolean;
  /** Glow orbs configuration */
  glowOrbs?: GlowOrb[];
  /** Background particle effect */
  particleEffect?: ParticleEffect;
  /** Intercom / chat widget ID */
  chatWidgetId?: string;
  /** Analytics tracking ID */
  analyticsId?: string;
}

// ============================================
// 17. RESPONSIVE HELPERS
// ============================================

export type SectionVisibility = {
  /** Show on mobile */
  mobile?: boolean;
  /** Show on tablet */
  tablet?: boolean;
  /** Show on desktop */
  desktop?: boolean;
};

export type SectionPadding = {
  /** Padding top */
  top?: ResponsiveValue<SpacingToken>;
  /** Padding bottom */
  bottom?: ResponsiveValue<SpacingToken>;
  /** Padding left */
  left?: ResponsiveValue<SpacingToken>;
  /** Padding right */
  right?: ResponsiveValue<SpacingToken>;
};

export type SectionMaxWidth = {
  /** Max width for this section */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Whether to center content */
  centered?: boolean;
};

// ============================================
// 18. UTILITY TYPES
// ============================================

/** Extracts all props from a component */
export type ExtractComponentProps<T extends ElementType> = 
  ComponentPropsWithoutRef<T>;

/** Makes a specific key required */
export type RequiredKey<T, K extends keyof T> = 
  Omit<T, K> & Required<Pick<T, K>>;

/** Makes a specific key optional */
export type OptionalKey<T, K extends keyof T> = 
  Omit<T, K> & Partial<Pick<T, K>>;

/** Intersection type helper */
export type Intersect<A, B> = {
  [K in keyof (A & B)]: (A & B)[K];
};

/** Creates a set of allowed values from an array */
export type AllowedValues<T extends readonly string[]> = T[number];

// ============================================
// 19. EVENT TRACKING TYPES
// ============================================

export type TrackingEventCategory =
  | 'navigation'
  | 'cta_click'
  | 'form_submit'
  | 'section_view'
  | 'pricing_toggle'
  | 'demo_request'
  | 'signup_start'
  | 'video_play';

export interface TrackingEvent {
  /** Event category */
  category: TrackingEventCategory;
  /** Event name/action */
  action: string;
  /** Event label (optional detail) */
  label?: string;
  /** Numeric value if applicable */
  value?: number;
  /** Additional metadata */
  metadata?: Record<string, string | number | boolean>;
}

export interface AnalyticsConfig {
  /** Google Analytics 4 measurement ID */
  ga4Id?: string;
  /** Google Tag Manager ID */
  gtmId?: string;
  /** Facebook Pixel ID */
  facebookPixelId?: string;
  /** LinkedIn Insight Tag ID */
  linkedinInsightId?: string;
  /** Hotjar site ID */
  hotjarId?: string;
  /** Whether to track page views automatically */
  autoTrackPageViews?: boolean;
  /** Whether to track outbound links */
  trackOutboundLinks?: boolean;
  /** Whether to track file downloads */
  trackDownloads?: boolean;
  /** Custom event handlers */
  onEvent?: (event: TrackingEvent) => void;
}