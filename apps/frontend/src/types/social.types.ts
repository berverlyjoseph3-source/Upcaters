// enterprise-ai-agent-platform/apps/api/src/agents/social/social.types.ts

/**
 * Social Media Platform Enum
 */
export enum SocialPlatform {
  LINKEDIN = 'linkedin',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  X_TWITTER = 'x_twitter',
  THREADS = 'threads',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
}

/**
 * Post Status Enum
 */
export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

/**
 * Post Interface
 */
export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PostStatus;
  metadata?: PostMetadata;
  error?: string;
  engagement?: EngagementMetrics;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Post Metadata
 */
export interface PostMetadata {
  platformSpecific?: Record<string, any>;
  hashtags?: string[];
  mentions?: string[];
  location?: string;
  linkPreview?: LinkPreview;
  altText?: string;
  isCarousel?: boolean;
  carouselItems?: CarouselItem[];
}

/**
 * Carousel Item (for multi-image posts)
 */
export interface CarouselItem {
  imageUrl: string;
  altText?: string;
  description?: string;
}

/**
 * Link Preview
 */
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Engagement Metrics
 */
export interface EngagementMetrics {
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  clicks?: number;
  impressions?: number;
  engagementRate?: number;
  updatedAt: Date;
}

/**
 * Schedule Post Options
 */
export interface SchedulePostOptions {
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  scheduledAt: Date;
  metadata?: PostMetadata;
  timezone?: string;
}

/**
 * Post Result
 */
export interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  platform: SocialPlatform;
  error?: string;
  publishedAt: Date;
}

/**
 * Batch Post Options
 */
export interface BatchPostOptions {
  posts: SchedulePostOptions[];
  parallel?: boolean;
  maxConcurrent?: number;
}

/**
 * Batch Post Result
 */
export interface BatchPostResult {
  results: PostResult[];
  totalSuccess: number;
  totalFailed: number;
  totalTimeMs: number;
}

/**
 * Analytics Request
 */
export interface AnalyticsRequest {
  platform: SocialPlatform;
  postId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Analytics Result
 */
export interface AnalyticsResult {
  platform: SocialPlatform;
  posts: EngagementMetrics[];
  totalEngagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  averageEngagementRate: number;
  topPerformingPost?: {
    id: string;
    content: string;
    engagement: EngagementMetrics;
  };
  bestTimeToPost?: {
    dayOfWeek: number;
    hourOfDay: number;
    engagementRate: number;
  };
}

/**
 * LinkedIn API Response Types
 */
export interface LinkedInPostResponse {
  id: string;
  author: string;
  lifecycleState: string;
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: string;
      media?: Array<{
        status: string;
        media: string;
      }>;
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': string;
  };
  created: number;
  lastModified: number;
}

/**
 * Facebook/Instagram API Response Types
 */
export interface FacebookPostResponse {
  id: string;
  post_id?: string;
  success: boolean;
}

export interface InstagramMediaResponse {
  id: string;
  media_id?: string;
  status: string;
}

/**
 * X (Twitter) API Response Types
 */
export interface TwitterPostResponse {
  data: {
    id: string;
    text: string;
  };
  includes?: {
    media?: Array<{
      media_id: string;
      url: string;
    }>;
  };
}

/**
 * Social Account Info
 */
export interface SocialAccountInfo {
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accountImage?: string;
  followersCount?: number;
  followingCount?: number;
  isConnected: boolean;
  lastSyncedAt?: Date;
}

/**
 * Post Template
 */
export interface PostTemplate {
  id: string;
  name: string;
  platform: SocialPlatform;
  content: string;
  variables: string[];
  mediaPlaceholders?: string[];
  category?: string;
}

/**
 * Content Calendar
 */
export interface ContentCalendar {
  id: string;
  name: string;
  posts: SocialPost[];
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Social Agent Configuration
 */
export interface SocialAgentConfig {
  maxImageSizeMB: number;           // Maximum image upload size
  maxVideoSizeMB: number;           // Maximum video upload size
  supportedImageTypes: string[];     // Supported image MIME types
  supportedVideoTypes: string[];     // Supported video MIME types
  maxPostLength: Record<SocialPlatform, number>; // Character limits per platform
  defaultSchedulingWindowDays: number; // Default days to look ahead for scheduling
  enableAutoHashtag: boolean;        // Enable automatic hashtag generation
}