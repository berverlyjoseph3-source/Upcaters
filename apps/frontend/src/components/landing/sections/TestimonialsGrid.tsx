// ============================================
// apps/frontend/src/components/landing/sections/TestimonialsGrid.tsx
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

type TestimonialVariant = 'default' | 'card' | 'minimal' | 'quote' | 'social' | 'enterprise' | 'glass';

type TestimonialSize = 'sm' | 'md' | 'lg';

type TestimonialLayout = 'grid' | 'masonry' | 'carousel' | 'featured' | 'marquee';

type TestimonialAnimation = 'fade' | 'slide' | 'scale' | 'none';

type TestimonialRating = 1 | 2 | 3 | 4 | 5;

type TestimonialCategory = 'all' | 'startup' | 'enterprise' | 'agency' | 'freelancer' | 'developer';

interface TestimonialAuthor {
  /** Author name */
  name: string;
  /** Author role/title */
  role?: string;
  /** Author company */
  company?: string;
  /** Company logo URL */
  companyLogo?: string;
  /** Author avatar URL */
  avatar?: string;
  /** Author initials fallback */
  initials?: string;
  /** Whether author is verified */
  verified?: boolean;
  /** Author social handle */
  socialHandle?: string;
  /** Author location */
  location?: string;
}

interface TestimonialMetric {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string;
  /** Metric change percentage */
  change?: number;
  /** Metric trend direction */
  trend?: 'up' | 'down' | 'stable';
}

interface TestimonialVideo {
  /** Video URL */
  url: string;
  /** Video thumbnail URL */
  thumbnail?: string;
  /** Video duration in seconds */
  duration?: number;
}

interface TestimonialItem {
  /** Unique testimonial ID */
  id: string;
  /** Quote content */
  content: string;
  /** Short excerpt for preview */
  excerpt?: string;
  /** Author information */
  author: TestimonialAuthor;
  /** Rating (1-5) */
  rating?: TestimonialRating;
  /** Metrics shown with testimonial */
  metrics?: TestimonialMetric[];
  /** Category for filtering */
  category?: TestimonialCategory;
  /** Industry */
  industry?: string;
  /** Company size */
  companySize?: 'startup' | 'small' | 'medium' | 'enterprise';
  /** Whether this is a featured testimonial */
  featured?: boolean;
  /** Whether this testimonial is verified */
  verified?: boolean;
  /** Video testimonial */
  video?: TestimonialVideo;
  /** Case study URL */
  caseStudyUrl?: string;
  /** Date of testimonial */
  date?: Date;
  /** Custom color accent */
  color?: string;
  /** Custom gradient accent */
  gradient?: string;
  /** Tags for filtering */
  tags?: string[];
  /** Whether to highlight this testimonial */
  highlight?: boolean;
  /** Use case description */
  useCase?: string;
}

interface TestimonialsGridProps {
  /** Array of testimonials */
  testimonials: TestimonialItem[];
  /** Visual variant */
  variant?: TestimonialVariant;
  /** Size preset */
  size?: TestimonialSize;
  /** Layout style */
  layout?: TestimonialLayout;
  /** Number of columns (for grid layout) */
  columns?: 1 | 2 | 3 | 4;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Entrance animation */
  animation?: TestimonialAnimation;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether to animate on scroll */
  animateOnView?: boolean;
  /** Whether to stagger animation */
  stagger?: boolean;
  /** Stagger delay in ms */
  staggerDelay?: number;
  /** Whether to show ratings */
  showRatings?: boolean;
  /** Whether to show author details */
  showAuthor?: boolean;
  /** Whether to show company logos */
  showCompanyLogo?: boolean;
  /** Whether to show verification badge */
  showVerified?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show case study links */
  showCaseStudy?: boolean;
  /** Whether to show video testimonials */
  showVideo?: boolean;
  /** Whether to show quote icons */
  showQuoteIcon?: boolean;
  /** Whether to show featured badge */
  showFeaturedBadge?: boolean;
  /** Whether to show category filter */
  showFilter?: boolean;
  /** Whether to truncate long content */
  truncate?: boolean;
  /** Maximum characters before truncation */
  maxLength?: number;
  /** Category filter callback */
  onFilterChange?: (category: TestimonialCategory) => void;
  /** Callback when testimonial is clicked */
  onTestimonialClick?: (testimonial: TestimonialItem) => void;
  /** Callback when case study is clicked */
  onCaseStudyClick?: (testimonial: TestimonialItem) => void;
  /** Callback when video is played */
  onVideoPlay?: (testimonial: TestimonialItem) => void;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Section badge */
  badge?: string;
  /** Empty state message */
  emptyMessage?: string;
}

// ============================================
// 2. SIZE & VARIANT PRESETS
// ============================================

const SIZE_CONFIG: Record<
  TestimonialSize,
  {
    content: string;
    author: string;
    role: string;
    avatar: string;
    padding: string;
    gap: string;
    quoteIcon: string;
    ratingStar: string;
    metric: string;
    companyLogo: string;
  }
> = {
  sm: {
    content: 'text-sm',
    author: 'text-sm',
    role: 'text-xs',
    avatar: 'w-8 h-8',
    padding: 'p-4',
    gap: 'gap-3',
    quoteIcon: 'w-6 h-6',
    ratingStar: 'w-3 h-3',
    metric: 'text-xs',
    companyLogo: 'h-4',
  },
  md: {
    content: 'text-base',
    author: 'text-base',
    role: 'text-sm',
    avatar: 'w-10 h-10',
    padding: 'p-5',
    gap: 'gap-4',
    quoteIcon: 'w-8 h-8',
    ratingStar: 'w-4 h-4',
    metric: 'text-sm',
    companyLogo: 'h-5',
  },
  lg: {
    content: 'text-lg',
    author: 'text-lg',
    role: 'text-sm',
    avatar: 'w-12 h-12',
    padding: 'p-6',
    gap: 'gap-5',
    quoteIcon: 'w-10 h-10',
    ratingStar: 'w-5 h-5',
    metric: 'text-base',
    companyLogo: 'h-6',
  },
};

const VARIANT_CONFIG: Record<
  TestimonialVariant,
  {
    container: string;
    item: string;
    itemFeatured: string;
    itemHover: string;
    contentColor: string;
    authorColor: string;
    roleColor: string;
    border: string;
    shadow: string;
    quoteColor: string;
  }
> = {
  default: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border',
    itemFeatured: 'ring-2 ring-brand-primary/30 border-brand-primary/30',
    itemHover: 'hover:shadow-lg hover:border-brand-primary/20 hover:-translate-y-0.5',
    contentColor: 'text-text-secondary',
    authorColor: 'text-text-primary',
    roleColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-sm',
    quoteColor: 'text-brand-primary/10',
  },
  card: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border shadow-md',
    itemFeatured: 'ring-2 ring-brand-primary/30 border-brand-primary/30 shadow-xl',
    itemHover: 'hover:shadow-xl hover:border-brand-primary/30 hover:-translate-y-1',
    contentColor: 'text-text-secondary',
    authorColor: 'text-text-primary',
    roleColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-md',
    quoteColor: 'text-brand-primary/10',
  },
  minimal: {
    container: '',
    item: 'bg-transparent border-0',
    itemFeatured: 'bg-brand-primary/[0.02]',
    itemHover: 'hover:bg-brand-primary/[0.03]',
    contentColor: 'text-text-secondary',
    authorColor: 'text-text-primary',
    roleColor: 'text-text-muted',
    border: 'border-transparent',
    shadow: 'shadow-none',
    quoteColor: 'text-brand-primary/5',
  },
  quote: {
    container: '',
    item: 'bg-gradient-to-br from-brand-primary/[0.03] to-brand-secondary/[0.03] dark:from-brand-primary/[0.05] dark:to-brand-secondary/[0.05] rounded-2xl border border-brand-primary/10',
    itemFeatured: 'border-brand-primary/30 from-brand-primary/[0.06] to-brand-secondary/[0.06]',
    itemHover: 'hover:shadow-lg hover:border-brand-primary/20',
    contentColor: 'text-text-secondary',
    authorColor: 'text-text-primary',
    roleColor: 'text-text-muted',
    border: 'border-brand-primary/10',
    shadow: 'shadow-sm',
    quoteColor: 'text-brand-primary/15',
  },
  social: {
    container: '',
    item: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border',
    itemFeatured: 'ring-2 ring-brand-primary/30',
    itemHover: 'hover:shadow-md',
    contentColor: 'text-text-secondary',
    authorColor: 'text-text-primary',
    roleColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-sm',
    quoteColor: 'text-brand-primary/10',
  },
  enterprise: {
    container: '',
    item: 'bg-gradient-to-br from-brand-surface to-brand-dark rounded-2xl border border-brand-border shadow-lg',
    itemFeatured: 'border-brand-primary/30 shadow-xl shadow-brand-primary/5',
    itemHover: 'hover:shadow-2xl hover:border-brand-primary/30 hover:-translate-y-1',
    contentColor: 'text-text-secondary',
    authorColor: 'text-text-primary',
    roleColor: 'text-text-muted',
    border: 'border-brand-border',
    shadow: 'shadow-lg',
    quoteColor: 'text-brand-primary/10',
  },
  glass: {
    container: '',
    item: 'bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10',
    itemFeatured: 'bg-white/10 border-white/20',
    itemHover: 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg',
    contentColor: 'text-white/80',
    authorColor: 'text-white',
    roleColor: 'text-white/60',
    border: 'border-white/10',
    shadow: 'shadow-lg',
    quoteColor: 'text-white/10',
  },
};

const LAYOUT_GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const GAP_CONFIG: Record<string, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

const CATEGORY_CONFIG: Record<TestimonialCategory, { label: string; color: string }> = {
  all: { label: 'All', color: '#6B7280' },
  startup: { label: 'Startups', color: '#22C55E' },
  enterprise: { label: 'Enterprise', color: '#3B82F6' },
  agency: { label: 'Agencies', color: '#7C3AED' },
  freelancer: { label: 'Freelancers', color: '#F59E0B' },
  developer: { label: 'Developers', color: '#EC4899' },
};

// ============================================
// 3. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes testimonials-fade-in {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes testimonials-slide-in {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  @keyframes testimonials-scale-in {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes testimonials-marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes testimonials-avatar-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
  }

  @keyframes testimonials-quote-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-5px) rotate(2deg); }
  }

  @keyframes testimonials-play-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
  }
`;

// ============================================
// 4. SUB-COMPONENT: Star Rating
// ============================================

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: TestimonialSize;
  showNumeric?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  showNumeric = true,
}) => {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return (
            <div key={i} className="relative">
              <svg
                className={`${sizeConfig.ratingStar} text-yellow-500/20`}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {fill > 0 && (
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <svg
                    className={`${sizeConfig.ratingStar} text-yellow-500`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showNumeric && (
        <span className="text-sm font-semibold text-text-primary ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Video Thumbnail
// ============================================

interface VideoThumbnailProps {
  video: TestimonialVideo;
  onPlay: () => void;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  video,
  onPlay,
}) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group/video mb-4"
      onClick={onPlay}
      role="button"
      tabIndex={0}
      aria-label="Play video testimonial"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      {video.thumbnail ? (
        <img
          src={video.thumbnail}
          alt="Video testimonial thumbnail"
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-brand-primary/80 flex items-center justify-center group-hover/video:scale-110 transition-transform duration-300 animate-testimonials-play-pulse">
            <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="8 5 19 12 8 19 8 5" />
            </svg>
          </div>
        </div>
      )}

      {/* Play overlay on hover */}
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
        <div className="w-12 h-12 rounded-full bg-brand-primary/90 flex items-center justify-center">
          <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="8 5 19 12 8 19 8 5" />
          </svg>
        </div>
      </div>

      {/* Duration badge */}
      {video.duration && (
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs font-medium">
          {formatDuration(video.duration)}
        </span>
      )}
    </div>
  );
};

// ============================================
// 6. SUB-COMPONENT: Category Filter
// ============================================

interface CategoryFilterProps {
  categories: TestimonialCategory[];
  activeCategory: TestimonialCategory;
  onSelect: (category: TestimonialCategory) => void;
  counts: Record<string, number>;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onSelect,
  counts,
}) => (
  <div className="flex justify-center mb-8">
    <div className="inline-flex flex-wrap gap-2 p-1.5 bg-brand-border/10 rounded-xl">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;

        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              whitespace-nowrap
              flex items-center gap-2
              ${
                isActive
                  ? 'bg-white dark:bg-brand-surface text-brand-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
              }
            `}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
            {counts[category] !== undefined && (
              <span
                className={`
                  px-1.5 py-0.5 rounded-full text-xs
                  ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-border/20 text-text-muted'}
                `}
              >
                {counts[category]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ============================================
// 7. MAIN COMPONENT
// ============================================

export const TestimonialsGrid: React.FC<TestimonialsGridProps> = ({
  testimonials,
  variant = 'default',
  size = 'md',
  layout = 'grid',
  columns = 3,
  gap = 'md',
  animation = 'fade',
  animationDuration = 600,
  animateOnView = true,
  stagger = true,
  staggerDelay = 100,
  showRatings = true,
  showAuthor = true,
  showCompanyLogo = true,
  showVerified = true,
  showMetrics = true,
  showCaseStudy = true,
  showVideo = true,
  showQuoteIcon = true,
  showFeaturedBadge = true,
  showFilter = false,
  truncate = true,
  maxLength = 280,
  onFilterChange,
  onTestimonialClick,
  onCaseStudyClick,
  onVideoPlay,
  respectReducedMotion = true,
  className = '',
  style,
  id = 'testimonials-grid',
  title,
  subtitle,
  badge,
  emptyMessage = 'No testimonials found.',
}) => {
  // ============================================
  // State
  // ============================================

  const [activeCategory, setActiveCategory] = useState<TestimonialCategory>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isInView, setIsInView] = useState(!animateOnView);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];

  // Extract categories
  const categories = useMemo(() => {
    if (!showFilter) return [];
    const cats = new Set<TestimonialCategory>();
    testimonials.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return ['all', ...Array.from(cats)] as TestimonialCategory[];
  }, [testimonials, showFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: testimonials.length };
    testimonials.forEach((t) => {
      const cat = t.category || 'all';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [testimonials]);

  // Filter testimonials
  const filteredTestimonials = useMemo(() => {
    if (activeCategory === 'all') return testimonials;
    return testimonials.filter((t) => t.category === activeCategory);
  }, [testimonials, activeCategory]);

  // Sort: featured first
  const sortedTestimonials = useMemo(() => {
    return [...filteredTestimonials].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [filteredTestimonials]);

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

    const styleId = 'testimonials-grid-animations';
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
    if (!animateOnView || !containerRef.current) return;

    const element = containerRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateOnView]);

  // ============================================
  // Handlers
  // ============================================

  const handleCategorySelect = useCallback(
    (category: TestimonialCategory) => {
      setActiveCategory(category);
      onFilterChange?.(category);
    },
    [onFilterChange]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleTestimonialClick = useCallback(
    (testimonial: TestimonialItem) => {
      onTestimonialClick?.(testimonial);
    },
    [onTestimonialClick]
  );

  const handleCaseStudyClick = useCallback(
    (e: React.MouseEvent, testimonial: TestimonialItem) => {
      e.stopPropagation();
      onCaseStudyClick?.(testimonial);
    },
    [onCaseStudyClick]
  );

  const handleVideoPlay = useCallback(
    (testimonial: TestimonialItem) => {
      onVideoPlay?.(testimonial);
    },
    [onVideoPlay]
  );

  // ============================================
  // Animation Style
  // ============================================

  const getAnimationStyle = useCallback(
    (index: number): CSSProperties => {
      if (shouldReduceMotion || animation === 'none' || !isInView) return {};

      const delay = stagger ? index * staggerDelay : 0;

      return {
        animation: `testimonials-${animation}-in ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
      };
    },
    [shouldReduceMotion, animation, animationDuration, isInView, stagger, staggerDelay]
  );

  // ============================================
  // Render: Single Testimonial Card
  // ============================================

  const renderTestimonial = useCallback(
    (testimonial: TestimonialItem, index: number) => {
      const isExpanded = expandedIds.has(testimonial.id);
      const isHovered = hoveredId === testimonial.id;
      const isTruncated = truncate && testimonial.content.length > maxLength && !isExpanded;
      const displayContent = isTruncated
        ? `${testimonial.content.substring(0, maxLength)}...`
        : testimonial.content;

      return (
        <div
          key={testimonial.id}
          id={`testimonial-${testimonial.id}`}
          className={`
            testimonial-item
            ${variantConfig.item}
            ${variantConfig.itemHover}
            ${testimonial.featured ? variantConfig.itemFeatured : ''}
            ${testimonial.highlight ? 'relative' : ''}
            ${sizeConfig.padding}
            transition-all duration-300
            flex flex-col
            ${sizeConfig.gap}
            cursor-pointer
          `}
          style={getAnimationStyle(index)}
          onClick={() => handleTestimonialClick(testimonial)}
          onMouseEnter={() => setHoveredId(testimonial.id)}
          onMouseLeave={() => setHoveredId(null)}
          role="article"
          aria-label={`Testimonial from ${testimonial.author.name}`}
        >
          {/* Video Thumbnail */}
          {showVideo && testimonial.video && (
            <VideoThumbnail
              video={testimonial.video}
              onPlay={() => handleVideoPlay(testimonial)}
            />
          )}

          {/* Quote Icon */}
          {showQuoteIcon && (
            <div
              className={`
                ${variantConfig.quoteColor}
                transition-transform duration-300
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
              aria-hidden="true"
            >
              <svg className={sizeConfig.quoteIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>
          )}

          {/* Featured Badge */}
          {showFeaturedBadge && testimonial.featured && (
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Featured
              </span>
            </div>
          )}

          {/* Rating */}
          {showRatings && testimonial.rating && (
            <StarRating rating={testimonial.rating} size={size} />
          )}

          {/* Content */}
          <blockquote className={`${sizeConfig.content} ${variantConfig.contentColor} leading-relaxed italic flex-1`}>
            "{displayContent}"
            {isTruncated && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(testimonial.id);
                }}
                className="text-brand-primary hover:text-brand-primary/80 text-sm font-medium ml-1 transition-colors"
              >
                Read more
              </button>
            )}
            {isExpanded && truncate && testimonial.content.length > maxLength && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(testimonial.id);
                }}
                className="text-brand-primary hover:text-brand-primary/80 text-sm font-medium ml-1 transition-colors"
              >
                Show less
              </button>
            )}
          </blockquote>

          {/* Metrics */}
          {showMetrics && testimonial.metrics && testimonial.metrics.length > 0 && (
            <div className={`grid grid-cols-2 gap-3 pt-4 border-t ${variantConfig.border}`}>
              {testimonial.metrics.map((metric, idx) => (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`font-bold text-text-primary ${sizeConfig.metric}`}>
                      {metric.value}
                    </span>
                    {metric.trend === 'up' && (
                      <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      </svg>
                    )}
                    {metric.trend === 'down' && (
                      <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      </svg>
                    )}
                  </div>
                  <p className="text-text-muted text-xs">{metric.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Author + Footer */}
          <div className={`flex items-end justify-between pt-4 border-t ${variantConfig.border} mt-auto`}>
            {/* Author Info */}
            {showAuthor && (
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`${sizeConfig.avatar} rounded-full overflow-hidden flex-shrink-0`}>
                  {testimonial.author.avatar ? (
                    <img
                      src={testimonial.author.avatar}
                      alt={testimonial.author.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.author.initials || testimonial.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name + Role */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold truncate ${variantConfig.authorColor} ${sizeConfig.author}`}>
                      {testimonial.author.name}
                    </span>
                    {showVerified && testimonial.verified && (
                      <svg className="w-4 h-4 text-brand-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </div>
                  <p className={`${sizeConfig.role} ${variantConfig.roleColor} truncate`}>
                    {testimonial.author.role}
                    {testimonial.author.role && testimonial.author.company && ' at '}
                    {testimonial.author.company}
                  </p>
                </div>
              </div>
            )}

            {/* Company Logo */}
            {showCompanyLogo && testimonial.author.companyLogo && (
              <img
                src={testimonial.author.companyLogo}
                alt={testimonial.author.company || 'Company'}
                className={`${sizeConfig.companyLogo} w-auto object-contain opacity-60 flex-shrink-0`}
                loading="lazy"
              />
            )}
          </div>

          {/* Case Study Link */}
          {showCaseStudy && testimonial.caseStudyUrl && (
            <a
              href={testimonial.caseStudyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-primary hover:text-brand-primary/80 font-medium transition-colors mt-2"
              onClick={(e) => handleCaseStudyClick(e, testimonial)}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Read full case study
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          )}

          {/* Highlight Glow */}
          {testimonial.highlight && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${testimonial.color || '#3B82F6'}08, transparent 60%)`,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      );
    },
    [
      expandedIds,
      hoveredId,
      sizeConfig,
      variantConfig,
      showRatings,
      showAuthor,
      showCompanyLogo,
      showVerified,
      showMetrics,
      showCaseStudy,
      showVideo,
      showQuoteIcon,
      showFeaturedBadge,
      truncate,
      maxLength,
      size,
      getAnimationStyle,
      handleTestimonialClick,
      handleCaseStudyClick,
      handleVideoPlay,
      handleToggleExpand,
    ]
  );

  // ============================================
  // 8. RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`testimonials-grid ${className}`}
      style={style}
    >
      {/* Section Header */}
      {(title || subtitle || badge) && (
        <div className="text-center mb-12 md:mb-16">
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-4">
              {badge}
            </span>
          )}
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-text-muted max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Category Filter */}
      {showFilter && categories.length > 1 && (
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
          counts={categoryCounts}
        />
      )}

      {/* Grid Layout */}
      {layout === 'grid' && (
        <>
          {sortedTestimonials.length > 0 ? (
            <div className={`grid ${LAYOUT_GRID[columns]} ${GAP_CONFIG[gap]}`}>
              {sortedTestimonials.map((testimonial, index) =>
                renderTestimonial(testimonial, index)
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>{emptyMessage}</p>
            </div>
          )}
        </>
      )}

      {/* Masonry Layout */}
      {layout === 'masonry' && (
        <>
          {sortedTestimonials.length > 0 ? (
            <div className={`columns-1 md:columns-2 lg:columns-${Math.min(columns + 1, 4)} ${GAP_CONFIG[gap]}`}>
              {sortedTestimonials.map((testimonial, index) => (
                <div key={testimonial.id} className="break-inside-avoid mb-4">
                  {renderTestimonial(testimonial, index)}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted">{emptyMessage}</div>
          )}
        </>
      )}

      {/* Carousel Layout */}
      {layout === 'carousel' && (
        <div className="relative overflow-hidden">
          <div
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollBehavior: 'smooth' }}
          >
            {sortedTestimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className="flex-shrink-0 w-[350px] md:w-[400px] snap-center"
              >
                {renderTestimonial(testimonial, index)}
              </div>
            ))}
          </div>

          {/* Carousel fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" aria-hidden="true" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" aria-hidden="true" />
        </div>
      )}

      {/* Featured Layout */}
      {layout === 'featured' && (
        <div className="space-y-8">
          {/* Featured Testimonials */}
          {sortedTestimonials.filter((t) => t.featured).length > 0 && (
            <div className={`grid ${LAYOUT_GRID[Math.min(columns, 2)]} ${GAP_CONFIG[gap]}`}>
              {sortedTestimonials
                .filter((t) => t.featured)
                .map((testimonial, index) =>
                  renderTestimonial(testimonial, index)
                )}
            </div>
          )}

          {/* Remaining Testimonials */}
          <div className={`grid ${LAYOUT_GRID[columns]} ${GAP_CONFIG[gap]}`}>
            {sortedTestimonials
              .filter((t) => !t.featured)
              .map((testimonial, index) =>
                renderTestimonial(
                  testimonial,
                  index + sortedTestimonials.filter((t) => t.featured).length
                )
              )}
          </div>
        </div>
      )}

      {/* Marquee Layout */}
      {layout === 'marquee' && sortedTestimonials.length > 0 && (
        <div className="relative overflow-hidden py-4">
          <div
            className="flex gap-4 animate-testimonials-marquee"
            style={{
              animation: shouldReduceMotion ? 'none' : `testimonials-marquee ${sortedTestimonials.length * 5}s linear infinite`,
              width: 'max-content',
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...sortedTestimonials, ...sortedTestimonials].map((testimonial, index) => (
              <div key={`${testimonial.id}-${index}`} className="flex-shrink-0 w-[350px]">
                {renderTestimonial(testimonial, index % sortedTestimonials.length)}
              </div>
            ))}
          </div>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0B0F1A] to-transparent pointer-events-none" aria-hidden="true" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0B0F1A] to-transparent pointer-events-none" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

// ============================================
// 9. TESTIMONIALS SECTION WRAPPER
// ============================================

interface TestimonialsSectionProps extends TestimonialsGridProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({
  sectionId = 'testimonials',
  background = 'default',
  ...props
}) => {
  const bgConfig: Record<string, string> = {
    default: 'bg-[#0B0F1A]',
    surface: 'bg-[#111827]',
    elevated: 'bg-[#1F2937]',
  };

  return (
    <section
      id={sectionId}
      className={`py-16 md:py-24 ${bgConfig[background]}`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <TestimonialsGrid {...props} />
      </div>
    </section>
  );
};

// ============================================
// 10. DISPLAY NAMES
// ============================================

TestimonialsGrid.displayName = 'TestimonialsGrid';
TestimonialsSection.displayName = 'TestimonialsSection';
StarRating.displayName = 'StarRating';
VideoThumbnail.displayName = 'VideoThumbnail';
CategoryFilter.displayName = 'CategoryFilter';

// ============================================
// 11. NAMED EXPORTS
// ============================================

export {
  StarRating,
  VideoThumbnail,
  CategoryFilter,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  LAYOUT_GRID,
  GAP_CONFIG,
  CATEGORY_CONFIG,
  ANIMATION_STYLES,
};

// ============================================
// 12. TYPE EXPORTS
// ============================================

export type {
  TestimonialVariant,
  TestimonialSize,
  TestimonialLayout,
  TestimonialAnimation,
  TestimonialRating,
  TestimonialCategory,
  TestimonialAuthor,
  TestimonialMetric,
  TestimonialVideo,
  TestimonialItem,
  TestimonialsGridProps,
  TestimonialsSectionProps,
  StarRatingProps,
  VideoThumbnailProps,
  CategoryFilterProps,
};

// ============================================
// 13. DEFAULT EXPORT
// ============================================

export default TestimonialsGrid;
