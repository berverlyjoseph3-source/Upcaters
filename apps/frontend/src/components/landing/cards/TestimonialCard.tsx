// ============================================
// apps/frontend/src/components/landing/cards/TestimonialCard.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  Star,
  Quote,
  ThumbsUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Pause,
  ExternalLink,
  CheckCircle,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Award,
  Shield,
  Users,
  Zap,
  DollarSign,
  BarChart3,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Verified,
  Globe,
  Briefcase,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type TestimonialVariant =
  | 'default'
  | 'card'
  | 'minimal'
  | 'quote'
  | 'social'
  | 'metric'
  | 'video'
  | 'enterprise';

type TestimonialSize = 'sm' | 'md' | 'lg' | 'xl';

type TestimonialLayout = 'grid' | 'carousel' | 'masonry' | 'single' | 'marquee';

type MetricTrend = 'up' | 'down' | 'stable';

interface TestimonialMetric {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string;
  /** Optional change percentage */
  change?: number;
  /** Metric trend direction */
  trend?: MetricTrend;
  /** Optional icon override */
  icon?: ReactNode;
}

interface TestimonialSource {
  /** Platform name */
  platform: string;
  /** Platform logo */
  logo?: string;
  /** Review page URL */
  url?: string;
  /** Published date */
  publishedAt?: Date;
}

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
  /** Whether identity is verified */
  verified?: boolean;
  /** Author location */
  location?: string;
  /** Author social handle */
  socialHandle?: string;
  /** Custom badge */
  badge?: string;
}

interface TestimonialData {
  /** Unique testimonial ID */
  id: string;
  /** Quote text */
  content: string;
  /** Short excerpt (for card preview) */
  excerpt?: string;
  /** Rating (1-5) */
  rating?: number;
  /** Author information */
  author: TestimonialAuthor;
  /** Featured metrics */
  metrics?: TestimonialMetric[];
  /** Source platform details */
  source?: TestimonialSource;
  /** Industry */
  industry?: string;
  /** Company size */
  companySize?: 'startup' | 'small' | 'medium' | 'enterprise';
  /** Use case tags */
  tags?: string[];
  /** Whether this is a featured testimonial */
  featured?: boolean;
  /** Video testimonial URL */
  videoUrl?: string;
  /** Video thumbnail URL */
  videoThumbnail?: string;
  /** Video duration in seconds */
  videoDuration?: number;
  /** Case study URL */
  caseStudyUrl?: string;
  /** Custom gradient for card accent */
  gradient?: string;
  /** Whether testimonial is verified */
  verified?: boolean;
  /** Date of testimonial */
  date?: Date;
  /** Language */
  language?: string;
  /** Whether to show as highlighted */
  highlight?: boolean;
}

interface TestimonialCardProps {
  /** Testimonial data */
  testimonial: TestimonialData;
  /** Card variant */
  variant?: TestimonialVariant;
  /** Card size */
  size?: TestimonialSize;
  /** Whether to show the rating stars */
  showRating?: boolean;
  /** Whether to show author details */
  showAuthor?: boolean;
  /** Whether to show company logo */
  showCompanyLogo?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Whether to show source */
  showSource?: boolean;
  /** Whether to show verification badge */
  showVerified?: boolean;
  /** Whether to show the quote icon */
  showQuoteIcon?: boolean;
  /** Whether to show the featured badge */
  showFeaturedBadge?: boolean;
  /** Whether to show tags */
  showTags?: boolean;
  /** Whether to show case study link */
  showCaseStudy?: boolean;
  /** Whether to truncate long content */
  truncateContent?: boolean;
  /** Maximum characters before truncation */
  maxContentLength?: number;
  /** Callback when card is clicked */
  onClick?: (testimonial: TestimonialData) => void;
  /** Callback when read more is clicked */
  onReadMore?: (testimonial: TestimonialData) => void;
  /** Callback when case study is clicked */
  onCaseStudy?: (testimonial: TestimonialData) => void;
  /** Callback when video play is clicked */
  onVideoPlay?: (testimonial: TestimonialData) => void;
  /** Whether the card is interactive */
  interactive?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
}

// ============================================
// 2. CONSTANTS
// ============================================

const STAR_COUNT = 5;
const DEFAULT_MAX_CONTENT_LENGTH = 280;

const SIZE_MAP: Record<
  TestimonialSize,
  {
    padding: string;
    avatar: string;
    name: string;
    role: string;
    content: string;
    quoteIcon: string;
    ratingStar: string;
    gap: string;
    metricValue: string;
    metricLabel: string;
  }
> = {
  sm: {
    padding: 'p-4',
    avatar: 'w-8 h-8',
    name: 'text-sm',
    role: 'text-xs',
    content: 'text-sm',
    quoteIcon: 'h-6 w-6',
    ratingStar: 'h-3.5 w-3.5',
    gap: 'gap-3',
    metricValue: 'text-lg',
    metricLabel: 'text-xs',
  },
  md: {
    padding: 'p-5',
    avatar: 'w-10 h-10',
    name: 'text-base',
    role: 'text-sm',
    content: 'text-base',
    quoteIcon: 'h-8 w-8',
    ratingStar: 'h-4 w-4',
    gap: 'gap-4',
    metricValue: 'text-xl',
    metricLabel: 'text-xs',
  },
  lg: {
    padding: 'p-6',
    avatar: 'w-12 h-12',
    name: 'text-lg',
    role: 'text-sm',
    content: 'text-lg',
    quoteIcon: 'h-10 w-10',
    ratingStar: 'h-5 w-5',
    gap: 'gap-5',
    metricValue: 'text-2xl',
    metricLabel: 'text-sm',
  },
  xl: {
    padding: 'p-8',
    avatar: 'w-14 h-14',
    name: 'text-xl',
    role: 'text-base',
    content: 'text-xl',
    quoteIcon: 'h-12 w-12',
    ratingStar: 'h-6 w-6',
    gap: 'gap-6',
    metricValue: 'text-3xl',
    metricLabel: 'text-sm',
  },
};

const VARIANT_MAP: Record<
  TestimonialVariant,
  {
    background: string;
    border: string;
    shadow: string;
    hover: string;
    accent: string;
  }
> = {
  default: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-lg hover:-translate-y-1',
    accent: '',
  },
  card: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    hover: 'hover:shadow-xl hover:-translate-y-1 hover:border-brand-primary/30',
    accent: '',
  },
  minimal: {
    background: 'bg-transparent',
    border: 'border-0',
    shadow: 'shadow-none',
    hover: '',
    accent: '',
  },
  quote: {
    background: 'bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 dark:from-brand-primary/10 dark:to-brand-secondary/10',
    border: 'border border-brand-primary/20',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md hover:border-brand-primary/30',
    accent: '',
  },
  social: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-sm',
    hover: 'hover:shadow-md',
    accent: '',
  },
  metric: {
    background: 'bg-white dark:bg-brand-surface',
    border: 'border border-brand-border',
    shadow: 'shadow-md',
    hover: 'hover:shadow-xl hover:-translate-y-1',
    accent: '',
  },
  video: {
    background: 'bg-brand-dark',
    border: 'border border-brand-border',
    shadow: 'shadow-lg',
    hover: 'hover:shadow-xl hover:-translate-y-1',
    accent: '',
  },
  enterprise: {
    background: 'bg-gradient-to-br from-brand-surface to-brand-dark',
    border: 'border border-brand-border',
    shadow: 'shadow-xl',
    hover: 'hover:shadow-2xl hover:-translate-y-1 hover:border-brand-primary/30',
    accent: '',
  },
};

const METRIC_TREND_CONFIG: Record<
  MetricTrend,
  { icon: ReactNode; color: string; bg: string }
> = {
  up: {
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  down: {
    icon: <TrendingDown className="h-4 w-4" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  stable: {
    icon: <Minus className="h-4 w-4" />,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
};

// ============================================
// 3. SUB-COMPONENT: Star Rating
// ============================================

const StarRating: React.FC<{
  rating: number;
  maxRating?: number;
  size?: TestimonialSize;
  showNumeric?: boolean;
  className?: string;
}> = ({ rating, maxRating = 5, size = 'md', showNumeric = true, className = '' }) => {
  const sizeConfig = SIZE_MAP[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, i) => {
          const fillPercentage = Math.max(0, Math.min(1, rating - i));
          return (
            <div key={i} className="relative">
              <Star
                className={`${sizeConfig.ratingStar} text-yellow-500/20`}
                fill="currentColor"
              />
              {fillPercentage > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPercentage * 100}%` }}
                >
                  <Star
                    className={`${sizeConfig.ratingStar} text-yellow-500`}
                    fill="currentColor"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showNumeric && (
        <span className={`font-semibold text-text-primary ${sizeConfig.role}`}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// ============================================
// 4. SUB-COMPONENT: Video Thumbnail
// ============================================

const VideoThumbnail: React.FC<{
  thumbnail?: string;
  duration?: number;
  onPlay?: () => void;
}> = ({ thumbnail, duration, onPlay }) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative rounded-xl overflow-hidden group/video cursor-pointer" onClick={onPlay}>
      {thumbnail ? (
        <img
          src={thumbnail}
          alt="Video testimonial"
          className="w-full aspect-video object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-brand-primary/80 flex items-center justify-center group-hover/video:scale-110 transition-transform duration-300">
            <Play className="h-6 w-6 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Play Button Overlay */}
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 rounded-full bg-brand-primary/90 flex items-center justify-center">
          <Play className="h-5 w-5 text-white ml-0.5" />
        </div>
      </div>

      {/* Duration Badge */}
      {duration && (
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs font-medium">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
};

// ============================================
// 5. MAIN COMPONENT
// ============================================

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  testimonial,
  variant = 'card',
  size = 'md',
  showRating = true,
  showAuthor = true,
  showCompanyLogo = false,
  showMetrics = false,
  showSource = false,
  showVerified = true,
  showQuoteIcon = true,
  showFeaturedBadge = true,
  showTags = false,
  showCaseStudy = false,
  truncateContent = true,
  maxContentLength = DEFAULT_MAX_CONTENT_LENGTH,
  onClick,
  onReadMore,
  onCaseStudy,
  onVideoPlay,
  interactive = true,
  className = '',
  style,
  id,
}) => {
  // ============================================
  // State
  // ============================================

  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Effects: Animate on mount
  // ============================================

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // Derived Values
  // ============================================

  const variantConfig = VARIANT_MAP[variant];
  const sizeConfig = SIZE_MAP[size];

  const isTruncated =
    truncateContent &&
    testimonial.content.length > maxContentLength &&
    !isExpanded;

  const displayContent = isTruncated
    ? `${testimonial.content.substring(0, maxContentLength)}...`
    : testimonial.content;

  const isVideo = variant === 'video' && testimonial.videoUrl;

  // ============================================
  // Handlers
  // ============================================

  const handleCardClick = useCallback(() => {
    if (!interactive) return;
    onClick?.(testimonial);
  }, [interactive, onClick, testimonial]);

  const handleReadMore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(true);
      onReadMore?.(testimonial);
    },
    [onReadMore, testimonial]
  );

  const handleShowLess = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(false);
    },
    []
  );

  const handleCaseStudy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCaseStudy?.(testimonial);
    },
    [onCaseStudy, testimonial]
  );

  const handleVideoPlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onVideoPlay?.(testimonial);
    },
    [onVideoPlay, testimonial]
  );

  // ============================================
  // Render: Quote Icon
  // ============================================

  const renderQuoteIcon = () => {
    if (!showQuoteIcon || variant === 'minimal' || variant === 'social') return null;

    return (
      <div
        className={`
          absolute top-4 right-4
          text-brand-primary/10
          pointer-events-none
          transition-transform duration-300
          ${isHovered ? 'scale-110' : 'scale-100'}
        `}
      >
        <Quote className={sizeConfig.quoteIcon} />
      </div>
    );
  };

  // ============================================
  // Render: Rating
  // ============================================

  const renderRating = () => {
    if (!showRating || testimonial.rating === undefined) return null;

    return (
      <StarRating
        rating={testimonial.rating}
        maxRating={STAR_COUNT}
        size={size}
      />
    );
  };

  // ============================================
  // Render: Author Section
  // ============================================

  const renderAuthor = () => {
    if (!showAuthor) return null;

    const author = testimonial.author;

    return (
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`${sizeConfig.avatar} rounded-full overflow-hidden flex-shrink-0`}>
          {author.avatar && !avatarError ? (
            <img
              src={author.avatar}
              alt={author.name}
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-semibold">
              {author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-text-primary truncate ${sizeConfig.name}`}>
              {author.name}
            </span>
            {showVerified && (author.verified || testimonial.verified) && (
              <BadgeCheck className="h-4 w-4 text-brand-primary flex-shrink-0" />
            )}
          </div>
          <div className={`flex items-center gap-1.5 ${sizeConfig.role} text-text-muted`}>
            {author.role && <span className="truncate">{author.role}</span>}
            {author.role && author.company && <span>•</span>}
            {author.company && <span className="truncate">{author.company}</span>}
          </div>
        </div>

        {/* Company Logo */}
        {showCompanyLogo && author.companyLogo && !logoError && (
          <img
            src={author.companyLogo}
            alt={author.company || ''}
            className="h-6 w-auto object-contain flex-shrink-0 opacity-60"
            onError={() => setLogoError(true)}
            loading="lazy"
          />
        )}
      </div>
    );
  };

  // ============================================
  // Render: Metrics
  // ============================================

  const renderMetrics = () => {
    if (
      !showMetrics ||
      !testimonial.metrics ||
      testimonial.metrics.length === 0
    )
      return null;

    return (
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-brand-border/30">
        {testimonial.metrics.map((metric, index) => {
          const trendConfig = metric.trend
            ? METRIC_TREND_CONFIG[metric.trend]
            : null;

          return (
            <div key={index} className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className={`font-bold text-text-primary ${sizeConfig.metricValue}`}>
                  {metric.value}
                </span>
                {trendConfig && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs ${trendConfig.bg} ${trendConfig.color}`}>
                    {trendConfig.icon}
                  </span>
                )}
              </div>
              <p className={`text-text-muted ${sizeConfig.metricLabel}`}>
                {metric.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // Render: Source
  // ============================================

  const renderSource = () => {
    if (!showSource || !testimonial.source) return null;

    const source = testimonial.source;

    return (
      <div className="flex items-center gap-2 pt-3 border-t border-brand-border/30">
        {source.logo ? (
          <img
            src={source.logo}
            alt={source.platform}
            className="h-4 w-auto object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-text-muted">{source.platform}</span>
        )}
        {source.publishedAt && (
          <span className="text-xs text-text-muted/60">
            {new Date(source.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-brand-primary hover:text-brand-primary/80 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Badges & Tags
  // ============================================

  const renderBadges = () => {
    if (!showTags && !showFeaturedBadge) return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Featured Badge */}
        {showFeaturedBadge && testimonial.featured && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
        )}

        {/* Industry Tag */}
        {showTags && testimonial.industry && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-border/20 text-text-muted">
            <Briefcase className="h-3 w-3" />
            {testimonial.industry}
          </span>
        )}

        {/* Company Size Tag */}
        {showTags && testimonial.companySize && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-brand-border/20 text-text-muted capitalize">
            <Users className="h-3 w-3" />
            {testimonial.companySize}
          </span>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Case Study Link
  // ============================================

  const renderCaseStudyLink = () => {
    if (!showCaseStudy || !testimonial.caseStudyUrl) return null;

    return (
      <a
        href={testimonial.caseStudyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText className="h-4 w-4" />
        Read full case study
        <ChevronRight className="h-4 w-4" />
      </a>
    );
  };

  // ============================================
  // 6. MAIN RENDER
  // ============================================

  return (
    <div
      ref={cardRef}
      id={id}
      className={`
        relative
        rounded-2xl
        overflow-hidden
        transition-all duration-300
        ${variantConfig.background}
        ${variantConfig.border}
        ${variantConfig.shadow}
        ${interactive ? variantConfig.hover : ''}
        ${interactive ? 'cursor-pointer' : ''}
        ${sizeConfig.padding}
        ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${className}
      `}
      style={style}
      onClick={handleCardClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={interactive ? 'button' : 'article'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Testimonial from ${testimonial.author.name}`}
    >
      {/* Quote Icon */}
      {renderQuoteIcon()}

      <div className={`flex flex-col ${sizeConfig.gap}`}>
        {/* Video Thumbnail (for video variant) */}
        {isVideo && (
          <VideoThumbnail
            thumbnail={testimonial.videoThumbnail}
            duration={testimonial.videoDuration}
            onPlay={handleVideoPlay}
          />
        )}

        {/* Badges Row */}
        {renderBadges()}

        {/* Rating */}
        {renderRating()}

        {/* Content */}
        <div className="relative">
          {/* Accent Gradient Line (for featured/quote variants) */}
          {variant === 'quote' && (
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-brand-primary to-brand-secondary" />
          )}

          <blockquote
            className={`
              ${variant === 'quote' ? 'pl-5' : ''}
              ${sizeConfig.content}
              text-text-secondary
              leading-relaxed
              italic
            `}
          >
            "{displayContent}"
          </blockquote>

          {/* Read More / Show Less */}
          {truncateContent &&
            testimonial.content.length > maxContentLength && (
              <div className="mt-2">
                {isExpanded ? (
                  <button
                    onClick={handleShowLess}
                    className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
                  >
                    Show less
                  </button>
                ) : (
                  <button
                    onClick={handleReadMore}
                    className="text-sm text-brand-primary hover:text-brand-primary/80 font-medium transition-colors"
                  >
                    Read more
                  </button>
                )}
              </div>
            )}
        </div>

        {/* Metrics */}
        {renderMetrics()}

        {/* Author + Case Study Footer */}
        <div className="flex items-end justify-between gap-4">
          {/* Author Info */}
          {renderAuthor()}

          {/* Case Study Link */}
          {renderCaseStudyLink()}
        </div>

        {/* Source */}
        {renderSource()}

        {/* Highlight Glow Effect */}
        {testimonial.highlight && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-brand-primary/20" />
        )}
      </div>
    </div>
  );
};

// ============================================
// 7. TESTIMONIAL GRID / CAROUSEL HELPERS
// ============================================

interface TestimonialGridProps {
  children: ReactNode;
  variant?: TestimonialLayout;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TestimonialGrid: React.FC<TestimonialGridProps> = ({
  children,
  variant = 'grid',
  columns = 3,
  gap = 'md',
  className = '',
}) => {
  const gridCols: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapSize: Record<string, string> = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  };

  if (variant === 'masonry') {
    return (
      <div className={`columns-1 md:columns-2 lg:columns-3 ${gapSize[gap]} ${className}`}>
        {React.Children.map(children, (child) => (
          <div className="break-inside-avoid mb-4">{child}</div>
        ))}
      </div>
    );
  }

  if (variant === 'marquee') {
    return (
      <div className={`overflow-hidden ${className}`}>
        <div className="flex gap-4 animate-marquee">
          {children}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} ${gapSize[gap]} ${className}`}>
      {children}
    </div>
  );
};

// ============================================
// 8. DISPLAY NAME
// ============================================

TestimonialCard.displayName = 'TestimonialCard';
StarRating.displayName = 'StarRating';
VideoThumbnail.displayName = 'VideoThumbnail';
TestimonialGrid.displayName = 'TestimonialGrid';

// ============================================
// 9. NAMED EXPORTS
// ============================================

export {
  StarRating,
  VideoThumbnail,
  TestimonialGrid,
  SIZE_MAP,
  VARIANT_MAP,
  METRIC_TREND_CONFIG,
};

// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  TestimonialVariant,
  TestimonialSize,
  TestimonialLayout,
  MetricTrend,
  TestimonialMetric,
  TestimonialSource,
  TestimonialAuthor,
  TestimonialData,
  TestimonialCardProps,
  TestimonialGridProps,
};

// ============================================
// 11. DEFAULT EXPORT
// ============================================

export default TestimonialCard;