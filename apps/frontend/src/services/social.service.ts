// apps/frontend/src/services/social.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type SocialPlatform = 'linkedin' | 'instagram' | 'facebook' | 'x_twitter' | 'threads' | 'tiktok' | 'youtube' | 'pinterest';

export type PostStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';

export type PostVisibility = 'public' | 'connections' | 'followers' | 'private';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accountImage?: string;
  accountUrl?: string;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  isConnected: boolean;
  isVerified?: boolean;
  lastSyncedAt?: Date;
  profileData?: Record<string, any>;
  pages?: SocialPage[];
}

export interface SocialPage {
  id: string;
  name: string;
  category?: string;
  followers?: number;
  accessToken?: string;
  instagramBusinessAccount?: {
    id: string;
    username: string;
    followers?: number;
  };
}

export interface PostContent {
  text: string;
  mediaUrls?: string[];
  linkUrl?: string;
  linkPreview?: {
    title?: string;
    description?: string;
    imageUrl?: string;
  };
  hashtags?: string[];
  mentions?: string[];
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  altText?: string;
}

export interface CreatePostOptions {
  platform: SocialPlatform | SocialPlatform[];
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  hashtags?: string[];
  visibility?: PostVisibility;
  scheduledAt?: Date;
  timezone?: string;
  replyToId?: string;
  quotePostId?: string;
  aiEnhance?: boolean;
  aiEnhanceOptions?: {
    tone?: 'professional' | 'casual' | 'friendly' | 'humorous' | 'inspirational';
    addHashtags?: boolean;
    optimizeLength?: boolean;
  };
}

export interface ScheduledPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  scheduledAt: Date;
  status: PostStatus;
  visibility: PostVisibility;
  metadata?: {
    hashtags?: string[];
    mentions?: string[];
    linkPreview?: any;
    characterCount?: number;
    wordCount?: number;
    estimatedEngagement?: number;
    aiGenerated?: boolean;
    bestTimeToPost?: boolean;
  };
  error?: string;
  publishedAt?: Date;
  postId?: string;
  postUrl?: string;
  engagement?: PostEngagement;
  retryCount?: number;
  lastRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  reposts?: number;
  saves?: number;
  clicks?: number;
  impressions: number;
  reach?: number;
  engagementRate: number;
  updatedAt: Date;
}

export interface PostAnalytics {
  platform: SocialPlatform;
  posts: PostEngagement[];
  totalEngagement: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    engagementRate: number;
  };
  averageEngagementRate: number;
  topPerformingPost?: {
    id: string;
    content: string;
    engagement: PostEngagement;
    postedAt: Date;
  };
  bestTimeToPost?: {
    dayOfWeek: number;
    hourOfDay: number;
    engagementRate: number;
  };
  audienceInsights?: {
    topCountries: Array<{ country: string; percentage: number }>;
    topCities: Array<{ city: string; percentage: number }>;
    ageRanges: Array<{ range: string; percentage: number }>;
    genderSplit: { male: number; female: number; other: number };
    topInterests: string[];
  };
  growthMetrics?: {
    followersGained: number;
    followersLost: number;
    netFollowers: number;
    growthRate: number;
    profileVisits: number;
    websiteClicks: number;
  };
}

export interface ContentCalendar {
  id: string;
  name: string;
  description?: string;
  platforms: SocialPlatform[];
  posts: ScheduledPost[];
  dateRange: {
    start: Date;
    end: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PostTemplate {
  id: string;
  name: string;
  platform: SocialPlatform;
  content: string;
  variables: string[];
  mediaPlaceholders?: string[];
  category?: string;
  tags?: string[];
  engagementRate?: number;
  useCount?: number;
  createdAt?: Date;
}

export interface AIGenerationOptions {
  topic?: string;
  tone?: string;
  platform?: SocialPlatform;
  industry?: string;
  keywords?: string[];
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  includeCTA?: boolean;
  length?: 'short' | 'medium' | 'long';
  variations?: number;
}

export interface BatchPostResult {
  results: Array<{
    platform: SocialPlatform;
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: string;
    publishedAt?: Date;
  }>;
  totalSuccess: number;
  totalFailed: number;
  totalTimeMs: number;
}

export interface HashtagSuggestion {
  tag: string;
  popularity: number;
  relevance: number;
  postCount?: number;
  category?: string;
}

export interface BestTimeResult {
  platform: SocialPlatform;
  times: Array<{
    dayOfWeek: number;
    hourOfDay: number;
    score: number;
    averageEngagement: number;
  }>;
  overallBest: {
    dayOfWeek: number;
    dayName: string;
    hourOfDay: number;
    timeFormatted: string;
  };
}

// ============================================
// Social Service
// ============================================

class SocialService {
  // ============================================
  // Account Management
  // ============================================

  static async getConnectedAccounts(): Promise<SocialAccount[]> {
    const response = await apiClient.get<{ accounts: SocialAccount[] }>(
      '/api/agent/social/accounts'
    );

    if (response.success && response.data) {
      return response.data.accounts.map(SocialService.transformAccount);
    }

    throw new Error(response.error || 'Failed to get accounts');
  }

  static async getAccount(accountId: string): Promise<SocialAccount> {
    const response = await apiClient.get<SocialAccount>(
      `/api/agent/social/accounts/${accountId}`
    );

    if (response.success && response.data) {
      return SocialService.transformAccount(response.data);
    }

    throw new Error(response.error || 'Failed to get account');
  }

  static async connectAccount(
    platform: SocialPlatform,
    code: string,
    redirectUri?: string
  ): Promise<SocialAccount> {
    const response = await apiClient.post<SocialAccount>(
      `/api/agent/social/connect/${platform}`,
      { code, redirectUri }
    );

    if (response.success && response.data) {
      return SocialService.transformAccount(response.data);
    }

    throw new Error(response.error || 'Failed to connect account');
  }

  static async disconnectAccount(platform: SocialPlatform): Promise<void> {
    const response = await apiClient.delete(`/api/agent/social/disconnect/${platform}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect account');
    }
  }

  static async refreshAccount(platform: SocialPlatform): Promise<SocialAccount> {
    const response = await apiClient.post<SocialAccount>(
      `/api/agent/social/refresh/${platform}`
    );

    if (response.success && response.data) {
      return SocialService.transformAccount(response.data);
    }

    throw new Error(response.error || 'Failed to refresh account');
  }

  // ============================================
  // Posts
  // ============================================

  static async createPost(options: CreatePostOptions): Promise<BatchPostResult> {
    const platforms = Array.isArray(options.platform) ? options.platform : [options.platform];

    const response = await apiClient.post<BatchPostResult>(
      '/api/agent/social/posts',
      {
        ...options,
        platforms,
        scheduledAt: options.scheduledAt?.toISOString(),
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create post');
  }

  static async getPost(postId: string): Promise<ScheduledPost> {
    const response = await apiClient.get<ScheduledPost>(
      `/api/agent/social/posts/${postId}`
    );

    if (response.success && response.data) {
      return SocialService.transformPost(response.data);
    }

    throw new Error(response.error || 'Failed to get post');
  }

  static async updatePost(
    postId: string,
    updates: Partial<Pick<CreatePostOptions, 'content' | 'mediaUrls' | 'scheduledAt' | 'visibility'>>
  ): Promise<ScheduledPost> {
    const response = await apiClient.put<ScheduledPost>(
      `/api/agent/social/posts/${postId}`,
      {
        ...updates,
        scheduledAt: updates.scheduledAt?.toISOString(),
      }
    );

    if (response.success && response.data) {
      return SocialService.transformPost(response.data);
    }

    throw new Error(response.error || 'Failed to update post');
  }

  static async deletePost(postId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/social/posts/${postId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete post');
    }
  }

  // ============================================
  // Scheduled Posts
  // ============================================

  static async getScheduledPosts(
    options?: {
      platform?: SocialPlatform;
      status?: PostStatus;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ posts: ScheduledPost[]; total: number }> {
    const params: Record<string, any> = {
      platform: options?.platform,
      status: options?.status,
      fromDate: options?.fromDate?.toISOString(),
      toDate: options?.toDate?.toISOString(),
      limit: options?.limit || 50,
      offset: options?.offset || 0,
    };

    const response = await apiClient.get<{ posts: ScheduledPost[]; total: number }>(
      '/api/agent/social/posts/scheduled',
      { params }
    );

    if (response.success && response.data) {
      return {
        posts: response.data.posts.map(SocialService.transformPost),
        total: response.data.total,
      };
    }

    throw new Error(response.error || 'Failed to get scheduled posts');
  }

  static async schedulePost(options: CreatePostOptions): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      '/api/agent/social/posts/schedule',
      {
        ...options,
        scheduledAt: options.scheduledAt?.toISOString(),
      }
    );

    if (response.success && response.data) {
      return SocialService.transformPost(response.data);
    }

    throw new Error(response.error || 'Failed to schedule post');
  }

  static async reschedulePost(
    postId: string,
    newDate: Date
  ): Promise<ScheduledPost> {
    return SocialService.updatePost(postId, { scheduledAt: newDate });
  }

  static async cancelScheduledPost(postId: string): Promise<void> {
    const response = await apiClient.post(`/api/agent/social/posts/${postId}/cancel`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to cancel scheduled post');
    }
  }

  // ============================================
  // Bulk Operations
  // ============================================

  static async bulkCreatePosts(posts: CreatePostOptions[]): Promise<BatchPostResult> {
    const response = await apiClient.post<BatchPostResult>(
      '/api/agent/social/posts/bulk',
      { posts }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create bulk posts');
  }

  static async bulkDeletePosts(postIds: string[]): Promise<{
    success: boolean;
    deleted: number;
    failed: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      deleted: number;
      failed: Array<{ id: string; error: string }>;
    }>('/api/agent/social/posts/bulk/delete', { postIds });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to bulk delete posts');
  }

  // ============================================
  // Analytics
  // ============================================

  static async getPostAnalytics(
    postId: string,
    platform: SocialPlatform
  ): Promise<PostEngagement> {
    const response = await apiClient.get<PostEngagement>(
      `/api/agent/social/analytics/posts/${postId}`,
      { params: { platform } }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        updatedAt: new Date(response.data.updatedAt),
      };
    }

    throw new Error(response.error || 'Failed to get post analytics');
  }

  static async getAccountAnalytics(
    platform: SocialPlatform,
    options?: {
      startDate?: Date;
      endDate?: Date;
      granularity?: 'day' | 'week' | 'month';
    }
  ): Promise<PostAnalytics> {
    const params: Record<string, any> = {
      platform,
      startDate: options?.startDate?.toISOString(),
      endDate: options?.endDate?.toISOString(),
      granularity: options?.granularity || 'day',
    };

    const response = await apiClient.get<PostAnalytics>(
      '/api/agent/social/analytics/account',
      { params }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get account analytics');
  }

  static async getAggregatedAnalytics(
    platforms?: SocialPlatform[]
  ): Promise<{
    platforms: PostAnalytics[];
    total: PostEngagement;
    period: { start: Date; end: Date };
  }> {
    const response = await apiClient.get<{
      platforms: PostAnalytics[];
      total: PostEngagement;
      period: { start: Date; end: Date };
    }>('/api/agent/social/analytics/aggregated', {
      params: { platforms: platforms?.join(',') },
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get aggregated analytics');
  }

  // ============================================
  // Content Calendar
  // ============================================

  static async getContentCalendars(): Promise<ContentCalendar[]> {
    const response = await apiClient.get<{ calendars: ContentCalendar[] }>(
      '/api/agent/social/calendars'
    );

    if (response.success && response.data) {
      return response.data.calendars.map(c => ({
        ...c,
        dateRange: {
          start: new Date(c.dateRange.start),
          end: new Date(c.dateRange.end),
        },
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        posts: c.posts.map(SocialService.transformPost),
      }));
    }

    throw new Error(response.error || 'Failed to get calendars');
  }

  static async createContentCalendar(
    name: string,
    options?: {
      description?: string;
      platforms?: SocialPlatform[];
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<ContentCalendar> {
    const response = await apiClient.post<ContentCalendar>(
      '/api/agent/social/calendars',
      options
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create calendar');
  }

  static async addPostToCalendar(
    calendarId: string,
    postId: string
  ): Promise<void> {
    const response = await apiClient.post(
      `/api/agent/social/calendars/${calendarId}/posts/${postId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to add post to calendar');
    }
  }

  // ============================================
  // Templates
  // ============================================

  static async getPostTemplates(options?: {
    platform?: SocialPlatform;
    category?: string;
  }): Promise<PostTemplate[]> {
    const response = await apiClient.get<{ templates: PostTemplate[] }>(
      '/api/agent/social/templates',
      { params: options }
    );

    if (response.success && response.data) {
      return response.data.templates;
    }

    throw new Error(response.error || 'Failed to get templates');
  }

  static async createPostTemplate(template: Omit<PostTemplate, 'id'>): Promise<PostTemplate> {
    const response = await apiClient.post<PostTemplate>(
      '/api/agent/social/templates',
      template
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create template');
  }

  static async deletePostTemplate(templateId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/social/templates/${templateId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete template');
    }
  }

  static async useTemplate(templateId: string, variables: Record<string, string>): Promise<string> {
    const response = await apiClient.post<{ content: string }>(
      `/api/agent/social/templates/${templateId}/render`,
      { variables }
    );

    if (response.success && response.data) {
      return response.data.content;
    }

    throw new Error(response.error || 'Failed to render template');
  }

  // ============================================
  // AI Features
  // ============================================

  static async generateContent(options: AIGenerationOptions): Promise<string[]> {
    const response = await apiClient.post<{ suggestions: string[] }>(
      '/api/agent/social/ai/generate',
      options
    );

    if (response.success && response.data) {
      return response.data.suggestions;
    }

    throw new Error(response.error || 'Failed to generate content');
  }

  static async enhanceContent(
    content: string,
    options?: {
      tone?: string;
      addHashtags?: boolean;
      addEmojis?: boolean;
      optimizeLength?: boolean;
      platform?: SocialPlatform;
    }
  ): Promise<{
    enhanced: string;
    changes: Array<{ type: string; description: string; original?: string; updated?: string }>;
    hashtags?: string[];
  }> {
    const response = await apiClient.post<{
      enhanced: string;
      changes: Array<{ type: string; description: string; original?: string; updated?: string }>;
      hashtags?: string[];
    }>('/api/agent/social/ai/enhance', { content, ...options });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to enhance content');
  }

  static async suggestHashtags(
    content: string,
    platform: SocialPlatform,
    count?: number
  ): Promise<HashtagSuggestion[]> {
    const response = await apiClient.post<{ suggestions: HashtagSuggestion[] }>(
      '/api/agent/social/ai/hashtags',
      { content, platform, count: count || 10 }
    );

    if (response.success && response.data) {
      return response.data.suggestions;
    }

    throw new Error(response.error || 'Failed to suggest hashtags');
  }

  static async analyzeBestTimeToPost(
    platform: SocialPlatform
  ): Promise<BestTimeResult> {
    const response = await apiClient.get<BestTimeResult>(
      `/api/agent/social/ai/best-time/${platform}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get best time');
  }

  static async predictEngagement(
    content: string,
    platform: SocialPlatform
  ): Promise<{
    estimatedLikes: number;
    estimatedComments: number;
    estimatedShares: number;
    estimatedImpressions: number;
    engagementRate: number;
    confidence: number;
    recommendations: string[];
  }> {
    const response = await apiClient.post<{
      estimatedLikes: number;
      estimatedComments: number;
      estimatedShares: number;
      estimatedImpressions: number;
      engagementRate: number;
      confidence: number;
      recommendations: string[];
    }>('/api/agent/social/ai/predict', { content, platform });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to predict engagement');
  }

  // ============================================
  // Media Upload
  // ============================================

  static async uploadMedia(
    file: File,
    platform: SocialPlatform
  ): Promise<{
    mediaId: string;
    url: string;
    previewUrl?: string;
    mimeType: string;
    size: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', platform);

    const response = await apiClient.post<{
      mediaId: string;
      url: string;
      previewUrl?: string;
      mimeType: string;
      size: number;
    }>('/api/agent/social/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to upload media');
  }

  // ============================================
  // Platform-Specific Features
  // ============================================

  static async getLinkedInCompanies(): Promise<SocialPage[]> {
    const response = await apiClient.get<{ companies: SocialPage[] }>(
      '/api/agent/social/linkedin/companies'
    );

    if (response.success && response.data) {
      return response.data.companies;
    }

    throw new Error(response.error || 'Failed to get LinkedIn companies');
  }

  static async getFacebookPages(): Promise<SocialPage[]> {
    const response = await apiClient.get<{ pages: SocialPage[] }>(
      '/api/agent/social/facebook/pages'
    );

    if (response.success && response.data) {
      return response.data.pages;
    }

    throw new Error(response.error || 'Failed to get Facebook pages');
  }

  static async getInstagramBusinessAccounts(): Promise<SocialPage[]> {
    const response = await apiClient.get<{ accounts: SocialPage[] }>(
      '/api/agent/social/instagram/accounts'
    );

    if (response.success && response.data) {
      return response.data.accounts;
    }

    throw new Error(response.error || 'Failed to get Instagram accounts');
  }

  // ============================================
  // Post Engagement Actions
  // ============================================

  static async getPostEngagement(
    postId: string,
    platform: SocialPlatform
  ): Promise<PostEngagement> {
    const response = await apiClient.get<PostEngagement>(
      `/api/agent/social/posts/${postId}/engagement`,
      { params: { platform } }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        updatedAt: new Date(response.data.updatedAt),
      };
    }

    throw new Error(response.error || 'Failed to get engagement');
  }

  // ============================================
  // Cross-Posting
  // ============================================

  static async crossPost(
    content: string,
    platforms: SocialPlatform[],
    options?: {
      optimizeForPlatform?: boolean;
      mediaUrls?: string[];
      scheduledAt?: Date;
    }
  ): Promise<BatchPostResult> {
    const response = await apiClient.post<BatchPostResult>(
      '/api/agent/social/cross-post',
      { content, platforms, ...options }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to cross-post');
  }

  // ============================================
  // Publishing Queue
  // ============================================

  static async getPublishingQueue(): Promise<ScheduledPost[]> {
    const response = await apiClient.get<{ queue: ScheduledPost[] }>(
      '/api/agent/social/queue'
    );

    if (response.success && response.data) {
      return response.data.queue.map(SocialService.transformPost);
    }

    throw new Error(response.error || 'Failed to get queue');
  }

  static async retryFailedPost(postId: string): Promise<ScheduledPost> {
    const response = await apiClient.post<ScheduledPost>(
      `/api/agent/social/posts/${postId}/retry`
    );

    if (response.success && response.data) {
      return SocialService.transformPost(response.data);
    }

    throw new Error(response.error || 'Failed to retry post');
  }

  // ============================================
  // Transform Helpers
  // ============================================

  private static transformAccount(account: any): SocialAccount {
    return {
      id: account.id,
      platform: account.platform,
      accountId: account.accountId,
      accountName: account.accountName,
      accountImage: account.accountImage,
      accountUrl: account.accountUrl,
      followersCount: account.followersCount,
      followingCount: account.followingCount,
      postCount: account.postCount,
      isConnected: account.isConnected,
      isVerified: account.isVerified,
      lastSyncedAt: account.lastSyncedAt ? new Date(account.lastSyncedAt) : undefined,
      profileData: account.profileData,
      pages: account.pages?.map(SocialService.transformPage),
    };
  }

  private static transformPage(page: any): SocialPage {
    return {
      id: page.id,
      name: page.name,
      category: page.category,
      followers: page.followers,
      accessToken: page.accessToken,
      instagramBusinessAccount: page.instagramBusinessAccount ? {
        id: page.instagramBusinessAccount.id,
        username: page.instagramBusinessAccount.username,
        followers: page.instagramBusinessAccount.followers,
      } : undefined,
    };
  }

  private static transformPost(post: any): ScheduledPost {
    return {
      id: post.id,
      platform: post.platform,
      content: post.content,
      mediaUrls: post.mediaUrls,
      scheduledAt: new Date(post.scheduledAt),
      status: post.status,
      visibility: post.visibility,
      metadata: post.metadata,
      error: post.error,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
      postId: post.postId,
      postUrl: post.postUrl,
      engagement: post.engagement ? {
        ...post.engagement,
        updatedAt: new Date(post.engagement.updatedAt),
      } : undefined,
      retryCount: post.retryCount,
      lastRetryAt: post.lastRetryAt ? new Date(post.lastRetryAt) : undefined,
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
    };
  }

  // ============================================
  // Utility
  // ============================================

  static getCharacterLimit(platform: SocialPlatform): number {
    const limits: Record<SocialPlatform, number> = {
      linkedin: 3000,
      instagram: 2200,
      facebook: 63206,
      x_twitter: 280,
      threads: 500,
      tiktok: 2200,
      youtube: 5000,
      pinterest: 500,
    };
    return limits[platform] || 2000;
  }

  static getMaxMediaCount(platform: SocialPlatform): number {
    const limits: Record<SocialPlatform, number> = {
      linkedin: 9,
      instagram: 10,
      facebook: 10,
      x_twitter: 4,
      threads: 10,
      tiktok: 1,
      youtube: 1,
      pinterest: 1,
    };
    return limits[platform] || 1;
  }

  static getSupportedMediaTypes(platform: SocialPlatform): string[] {
    const types: Record<SocialPlatform, string[]> = {
      linkedin: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      instagram: ['image/jpeg', 'image/png', 'video/mp4'],
      facebook: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      x_twitter: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      threads: ['image/jpeg', 'image/png', 'video/mp4'],
      tiktok: ['video/mp4', 'video/quicktime'],
      youtube: ['video/*'],
      pinterest: ['image/jpeg', 'image/png', 'image/gif'],
    };
    return types[platform] || ['image/jpeg', 'image/png'];
  }

  static getPlatformColor(platform: SocialPlatform): string {
    const colors: Record<SocialPlatform, string> = {
      linkedin: '#0077B5',
      instagram: '#E4405F',
      facebook: '#4267B2',
      x_twitter: '#1DA1F2',
      threads: '#000000',
      tiktok: '#000000',
      youtube: '#FF0000',
      pinterest: '#E60023',
    };
    return colors[platform] || '#666666';
  }

  static getPlatformUrl(platform: SocialPlatform, accountId: string): string {
    const urls: Record<SocialPlatform, (id: string) => string> = {
      linkedin: (id) => `https://linkedin.com/company/${id}`,
      instagram: (id) => `https://instagram.com/${id}`,
      facebook: (id) => `https://facebook.com/${id}`,
      x_twitter: (id) => `https://x.com/${id}`,
      threads: (id) => `https://threads.net/@${id}`,
      tiktok: (id) => `https://tiktok.com/@${id}`,
      youtube: (id) => `https://youtube.com/@${id}`,
      pinterest: (id) => `https://pinterest.com/${id}`,
    };
    return urls[platform]?.(accountId) || '#';
  }

  static getOptimalPostingTimes(platform: SocialPlatform): Array<{ day: string; time: string; score: number }> {
    const times: Record<SocialPlatform, Array<{ day: string; time: string; score: number }>> = {
      linkedin: [
        { day: 'Tuesday', time: '10:00 AM', score: 92 },
        { day: 'Wednesday', time: '11:00 AM', score: 88 },
        { day: 'Thursday', time: '9:00 AM', score: 85 },
      ],
      instagram: [
        { day: 'Monday', time: '11:00 AM', score: 90 },
        { day: 'Wednesday', time: '11:00 AM', score: 87 },
        { day: 'Friday', time: '9:00 AM', score: 85 },
      ],
      facebook: [
        { day: 'Wednesday', time: '11:00 AM', score: 89 },
        { day: 'Thursday', time: '1:00 PM', score: 85 },
        { day: 'Friday', time: '9:00 AM', score: 83 },
      ],
      x_twitter: [
        { day: 'Wednesday', time: '9:00 AM', score: 88 },
        { day: 'Tuesday', time: '12:00 PM', score: 85 },
        { day: 'Thursday', time: '11:00 AM', score: 83 },
      ],
      threads: [
        { day: 'Monday', time: '10:00 AM', score: 85 },
        { day: 'Wednesday', time: '11:00 AM', score: 83 },
        { day: 'Friday', time: '9:00 AM', score: 80 },
      ],
      tiktok: [
        { day: 'Tuesday', time: '2:00 PM', score: 90 },
        { day: 'Thursday', time: '7:00 PM', score: 87 },
        { day: 'Sunday', time: '10:00 AM', score: 85 },
      ],
      youtube: [
        { day: 'Friday', time: '3:00 PM', score: 88 },
        { day: 'Saturday', time: '10:00 AM', score: 85 },
        { day: 'Thursday', time: '12:00 PM', score: 83 },
      ],
      pinterest: [
        { day: 'Saturday', time: '8:00 PM', score: 90 },
        { day: 'Sunday', time: '7:00 PM', score: 87 },
        { day: 'Friday', time: '3:00 PM', score: 84 },
      ],
    };
    return times[platform] || [];
  }
}

export default SocialService;