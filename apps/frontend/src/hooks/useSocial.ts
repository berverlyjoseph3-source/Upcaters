// enterprise-ai-agent-platform/apps/frontend/src/hooks/useSocial.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ============================================
// Types
// ============================================

export type SocialPlatform = 'linkedin' | 'instagram' | 'facebook' | 'x_twitter' | 'threads' | 'tiktok';
export type PostStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';
export type PostVisibility = 'public' | 'connections' | 'private';
export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accountImage?: string;
  followersCount?: number;
  followingCount?: number;
  isConnected: boolean;
  lastSyncedAt?: Date;
  permissions?: string[];
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  status: PostStatus;
  visibility: PostVisibility;
  scheduledAt?: Date;
  publishedAt?: Date;
  postId?: string;
  postUrl?: string;
  error?: string;
  retryCount: number;
  engagement?: EngagementMetrics;
  metadata?: PostMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostMetadata {
  hashtags?: string[];
  mentions?: string[];
  location?: string;
  linkPreview?: LinkPreview;
  altText?: string;
  isCarousel?: boolean;
  carouselItems?: CarouselItem[];
  platformSpecific?: Record<string, any>;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

export interface CarouselItem {
  imageUrl: string;
  altText?: string;
  description?: string;
  order: number;
}

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

export interface CreatePostOptions {
  platform: SocialPlatform | SocialPlatform[];
  content: string;
  mediaUrls?: string[];
  visibility?: PostVisibility;
  scheduledAt?: Date;
  hashtags?: string[];
  location?: string;
  linkPreview?: LinkPreview;
  altText?: string;
  metadata?: Record<string, any>;
}

export interface SchedulePostOptions {
  platform: SocialPlatform | SocialPlatform[];
  content: string;
  mediaUrls?: string[];
  scheduledAt: Date;
  visibility?: PostVisibility;
  recurrence?: {
    frequency: ScheduleFrequency;
    interval?: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };
}

export interface AnalyticsOverview {
  totalPosts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  totalFollowers: number;
  followerGrowth: number;
  topPerformingPost?: {
    id: string;
    content: string;
    platform: SocialPlatform;
    engagement: EngagementMetrics;
    publishedAt: Date;
  };
  bestTimeToPost?: {
    dayOfWeek: number;
    hourOfDay: number;
    platform: SocialPlatform;
    engagementRate: number;
  };
}

export interface PlatformAnalytics {
  platform: SocialPlatform;
  posts: SocialPost[];
  totalEngagement: EngagementMetrics;
  averageEngagementRate: number;
  topPerformingPost?: SocialPost;
  bestTimeToPost?: {
    dayOfWeek: number;
    hourOfDay: number;
    engagementRate: number;
  };
  followerTrend: Array<{
    date: string;
    followers: number;
    following: number;
    netChange: number;
  }>;
  postFrequency: Array<{
    date: string;
    count: number;
    engagement: number;
  }>;
}

export interface ContentCalendar {
  id: string;
  name: string;
  posts: SocialPost[];
  dateRange: {
    start: Date;
    end: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchPostResult {
  results: Array<{
    platform: SocialPlatform;
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: string;
  }>;
  totalSuccess: number;
  totalFailed: number;
  totalTimeMs: number;
}

export interface SocialSettings {
  autoHashtag: boolean;
  defaultHashtags: string[];
  defaultVisibility: PostVisibility;
  scheduleBufferMinutes: number;
  maxPostsPerDay: Record<SocialPlatform, number>;
  enableAnalytics: boolean;
  enableNotifications: boolean;
  imageQuality: 'standard' | 'high';
  linkShortening: boolean;
  contentApprovalRequired: boolean;
  timezone: string;
}

// ============================================
// Hook State
// ============================================

interface UseSocialState {
  activeTab: 'compose' | 'schedule' | 'analytics' | 'calendar' | 'accounts';
  accounts: SocialAccount[];
  posts: SocialPost[];
  scheduledPosts: SocialPost[];
  publishedPosts: SocialPost[];
  drafts: SocialPost[];
  calendar: ContentCalendar | null;
  analyticsOverview: AnalyticsOverview | null;
  platformAnalytics: Record<SocialPlatform, PlatformAnalytics>;
  settings: SocialSettings;
  selectedPost: SocialPost | null;
  isPosting: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

// ============================================
// Hook
// ============================================

export function useSocial() {
  const { isAuthenticated } = useAuthStore();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // State
  // ============================================

  const [state, setState] = useState<UseSocialState>({
    activeTab: 'compose',
    accounts: [],
    posts: [],
    scheduledPosts: [],
    publishedPosts: [],
    drafts: [],
    calendar: null,
    analyticsOverview: null,
    platformAnalytics: {} as Record<SocialPlatform, PlatformAnalytics>,
    settings: {
      autoHashtag: true,
      defaultHashtags: ['ai', 'automation', 'productivity'],
      defaultVisibility: 'public',
      scheduleBufferMinutes: 5,
      maxPostsPerDay: {
        linkedin: 50,
        instagram: 25,
        facebook: 50,
        x_twitter: 100,
        threads: 25,
        tiktok: 3,
      },
      enableAnalytics: true,
      enableNotifications: true,
      imageQuality: 'high',
      linkShortening: true,
      contentApprovalRequired: false,
      timezone: 'America/New_York',
    },
    selectedPost: null,
    isPosting: false,
    isLoading: false,
    error: null,
    successMessage: null,
  });

  // ============================================
  // Helpers
  // ============================================

  const updateState = useCallback((partial: Partial<UseSocialState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const clearError = useCallback(() => updateState({ error: null }), [updateState]);
  const clearSuccess = useCallback(() => updateState({ successMessage: null }), [updateState]);

  const showSuccess = useCallback((message: string) => {
    updateState({ successMessage: message });
    setTimeout(() => updateState({ successMessage: null }), 3000);
  }, [updateState]);

  const setActiveTab = useCallback((tab: UseSocialState['activeTab']) => {
    updateState({ activeTab: tab, error: null });
  }, [updateState]);

  // ============================================
  // Account Management
  // ============================================

  const fetchAccounts = useCallback(async (): Promise<SocialAccount[]> => {
    try {
      const response = await apiClient.get<SocialAccount[]>('/api/agent/social/accounts');
      if (response.success && response.data) {
        const accounts = response.data.map(a => ({
          ...a,
          lastSyncedAt: a.lastSyncedAt ? new Date(a.lastSyncedAt) : undefined,
        }));
        updateState({ accounts });
        return accounts;
      }
      return [];
    } catch (error) {
      updateState({ error: 'Failed to fetch social accounts' });
      return [];
    }
  }, [updateState]);

  const connectAccount = useCallback(async (
    platform: SocialPlatform,
    code: string,
    redirectUri: string
  ): Promise<boolean> => {
    updateState({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/api/agent/social/connect', {
        platform,
        code,
        redirectUri,
      });

      if (response.success) {
        showSuccess(`${platform} account connected successfully!`);
        await fetchAccounts();
        return true;
      }

      updateState({ error: response.error || 'Failed to connect account' });
      return false;
    } catch (error) {
      updateState({ error: 'Failed to connect account' });
      return false;
    } finally {
      updateState({ isLoading: false });
    }
  }, [fetchAccounts, showSuccess, updateState]);

  const disconnectAccount = useCallback(async (platform: SocialPlatform): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/api/agent/social/disconnect/${platform}`);
      if (response.success) {
        setState(prev => ({
          ...prev,
          accounts: prev.accounts.filter(a => a.platform !== platform),
        }));
        showSuccess(`${platform} account disconnected`);
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to disconnect account' });
      return false;
    }
  }, [showSuccess, updateState]);

  const refreshAccount = useCallback(async (platform: SocialPlatform): Promise<boolean> => {
    try {
      const response = await apiClient.post(`/api/agent/social/refresh/${platform}`);
      if (response.success) {
        showSuccess(`${platform} account refreshed`);
        await fetchAccounts();
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to refresh account' });
      return false;
    }
  }, [fetchAccounts, showSuccess, updateState]);

  const getOAuthUrl = useCallback(async (platform: SocialPlatform): Promise<string | null> => {
    try {
      const response = await apiClient.get<{ url: string }>(
        `/api/agent/social/auth-url/${platform}`
      );
      return response.success && response.data ? response.data.url : null;
    } catch (error) {
      updateState({ error: 'Failed to get auth URL' });
      return null;
    }
  }, [updateState]);

  // ============================================
  // Post Management
  // ============================================

  const createPost = useCallback(async (
    options: CreatePostOptions
  ): Promise<SocialPost | null> => {
    updateState({ isPosting: true, error: null });

    try {
      const response = await apiClient.post<SocialPost>(
        '/api/agent/social/post',
        {
          platforms: Array.isArray(options.platform) ? options.platform : [options.platform],
          content: options.content,
          mediaUrls: options.mediaUrls || [],
          visibility: options.visibility,
          hashtags: options.hashtags,
          location: options.location,
          altText: options.altText,
          metadata: options.metadata,
        }
      );

      if (response.success && response.data) {
        const post = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          scheduledAt: response.data.scheduledAt ? new Date(response.data.scheduledAt) : undefined,
          publishedAt: response.data.publishedAt ? new Date(response.data.publishedAt) : undefined,
        };

        setState(prev => ({
          ...prev,
          posts: [post, ...prev.posts],
          publishedPosts: post.status === 'published' ? [post, ...prev.publishedPosts] : prev.publishedPosts,
          scheduledPosts: post.status === 'scheduled' ? [post, ...prev.scheduledPosts] : prev.scheduledPosts,
        }));

        showSuccess(post.status === 'scheduled' ? 'Post scheduled!' : 'Post published!');
        return post;
      }

      updateState({ error: response.error || 'Failed to create post' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to create post' });
      return null;
    } finally {
      updateState({ isPosting: false });
    }
  }, [showSuccess, updateState]);

  const schedulePost = useCallback(async (
    options: SchedulePostOptions
  ): Promise<SocialPost | null> => {
    return createPost({
      ...options,
      scheduledAt: options.scheduledAt,
      platform: options.platform,
      content: options.content,
      mediaUrls: options.mediaUrls,
      visibility: options.visibility,
    });
  }, [createPost]);

  const batchPost = useCallback(async (
    posts: CreatePostOptions[]
  ): Promise<BatchPostResult | null> => {
    updateState({ isPosting: true, error: null });

    try {
      const response = await apiClient.post<BatchPostResult>(
        '/api/agent/social/batch-post',
        { posts, parallel: true, maxConcurrent: 3 }
      );

      if (response.success && response.data) {
        showSuccess(
          `Posted to ${response.data.totalSuccess} of ${posts.length} platforms`
        );
        await fetchPosts();
        return response.data;
      }

      updateState({ error: response.error || 'Batch post failed' });
      return null;
    } catch (error) {
      updateState({ error: 'Batch post failed' });
      return null;
    } finally {
      updateState({ isPosting: false });
    }
  }, [fetchPosts, showSuccess, updateState]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/agent/social/posts/${postId}`);
      setState(prev => ({
        ...prev,
        posts: prev.posts.filter(p => p.id !== postId),
        scheduledPosts: prev.scheduledPosts.filter(p => p.id !== postId),
        publishedPosts: prev.publishedPosts.filter(p => p.id !== postId),
        drafts: prev.drafts.filter(p => p.id !== postId),
      }));
      showSuccess('Post deleted');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to delete post' });
      return false;
    }
  }, [showSuccess, updateState]);

  const cancelScheduledPost = useCallback(async (postId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/api/agent/social/posts/${postId}/cancel`);
      setState(prev => ({
        ...prev,
        scheduledPosts: prev.scheduledPosts.filter(p => p.id !== postId),
        posts: prev.posts.map(p =>
          p.id === postId ? { ...p, status: 'cancelled' as PostStatus } : p
        ),
      }));
      showSuccess('Scheduled post cancelled');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to cancel post' });
      return false;
    }
  }, [showSuccess, updateState]);

  const reschedulePost = useCallback(async (
    postId: string,
    newDate: Date
  ): Promise<boolean> => {
    try {
      await apiClient.put(`/api/agent/social/posts/${postId}/reschedule`, {
        scheduledAt: newDate.toISOString(),
      });

      setState(prev => ({
        ...prev,
        scheduledPosts: prev.scheduledPosts.map(p =>
          p.id === postId ? { ...p, scheduledAt: newDate } : p
        ),
        posts: prev.posts.map(p =>
          p.id === postId ? { ...p, scheduledAt: newDate, status: 'scheduled' as PostStatus } : p
        ),
      }));

      showSuccess('Post rescheduled');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to reschedule post' });
      return false;
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Drafts
  // ============================================

  const saveDraft = useCallback(async (
    content: string,
    platforms: SocialPlatform[],
    mediaUrls?: string[]
  ): Promise<SocialPost | null> => {
    try {
      const response = await apiClient.post<SocialPost>(
        '/api/agent/social/drafts',
        { content, platforms, mediaUrls }
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          drafts: [response.data!, ...prev.drafts],
        }));
        showSuccess('Draft saved');
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to save draft' });
      return null;
    }
  }, [showSuccess, updateState]);

  const updateDraft = useCallback(async (
    draftId: string,
    updates: Partial<CreatePostOptions>
  ): Promise<boolean> => {
    try {
      await apiClient.put(`/api/agent/social/drafts/${draftId}`, updates);
      setState(prev => ({
        ...prev,
        drafts: prev.drafts.map(d =>
          d.id === draftId ? { ...d, ...updates, updatedAt: new Date() } : d
        ),
      }));
      showSuccess('Draft updated');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to update draft' });
      return false;
    }
  }, [showSuccess, updateState]);

  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/agent/social/drafts/${draftId}`);
      setState(prev => ({
        ...prev,
        drafts: prev.drafts.filter(d => d.id !== draftId),
      }));
      return true;
    } catch (error) {
      updateState({ error: 'Failed to delete draft' });
      return false;
    }
  }, [updateState]);

  // ============================================
  // Posts Fetching
  // ============================================

  const fetchPosts = useCallback(async (
    options?: {
      status?: PostStatus;
      platform?: SocialPlatform;
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SocialPost[]> => {
    updateState({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.platform) params.append('platform', options.platform);
      if (options?.page) params.append('page', String(options.page));
      if (options?.limit) params.append('limit', String(options.limit || 20));
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());

      const response = await apiClient.get<SocialPost[]>(
        `/api/agent/social/posts?${params.toString()}`
      );

      if (response.success && response.data) {
        const posts = response.data.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : undefined,
          publishedAt: p.publishedAt ? new Date(p.publishedAt) : undefined,
          engagement: p.engagement ? {
            ...p.engagement,
            updatedAt: new Date(p.engagement.updatedAt),
          } : undefined,
        }));

        updateState({ posts });

        // Update categorized lists
        setState(prev => ({
          ...prev,
          scheduledPosts: posts.filter(p => p.status === 'scheduled'),
          publishedPosts: posts.filter(p => p.status === 'published'),
        }));

        return posts;
      }

      return [];
    } catch (error) {
      updateState({ error: 'Failed to fetch posts' });
      return [];
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  const fetchScheduledPosts = useCallback(async (
    page: number = 1,
    limit: number = 20
  ): Promise<SocialPost[]> => {
    return fetchPosts({ status: 'scheduled', page, limit });
  }, [fetchPosts]);

  const fetchPublishedPosts = useCallback(async (
    platform?: SocialPlatform,
    page: number = 1,
    limit: number = 20
  ): Promise<SocialPost[]> => {
    return fetchPosts({ status: 'published', platform, page, limit });
  }, [fetchPosts]);

  const selectPost = useCallback((post: SocialPost | null) => {
    updateState({ selectedPost: post });
  }, [updateState]);

  // ============================================
  // Content Enhancement
  // ============================================

  const enhanceContent = useCallback(async (
    content: string,
    platform: SocialPlatform,
    tone?: 'professional' | 'casual' | 'engaging' | 'formal'
  ): Promise<string | null> => {
    try {
      const response = await apiClient.post<{ enhanced: string }>(
        '/api/agent/social/enhance',
        { content, platform, tone }
      );

      if (response.success && response.data) {
        return response.data.enhanced;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to enhance content' });
      return null;
    }
  }, [updateState]);

  const generateHashtags = useCallback(async (
    content: string,
    platform: SocialPlatform,
    count: number = 5
  ): Promise<string[]> => {
    try {
      const response = await apiClient.post<{ hashtags: string[] }>(
        '/api/agent/social/generate-hashtags',
        { content, platform, count }
      );

      if (response.success && response.data) {
        return response.data.hashtags;
      }
      return [];
    } catch (error) {
      return [];
    }
  }, []);

  // ============================================
  // Analytics
  // ============================================

  const fetchAnalyticsOverview = useCallback(async (
    days: number = 30
  ): Promise<AnalyticsOverview | null> => {
    try {
      const response = await apiClient.get<AnalyticsOverview>(
        `/api/agent/social/analytics/overview?days=${days}`
      );

      if (response.success && response.data) {
        updateState({ analyticsOverview: response.data });
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to fetch analytics overview' });
      return null;
    }
  }, [updateState]);

  const fetchPlatformAnalytics = useCallback(async (
    platform: SocialPlatform,
    days: number = 30
  ): Promise<PlatformAnalytics | null> => {
    try {
      const response = await apiClient.get<PlatformAnalytics>(
        `/api/agent/social/analytics/${platform}?days=${days}`
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          platformAnalytics: {
            ...prev.platformAnalytics,
            [platform]: response.data!,
          },
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: `Failed to fetch ${platform} analytics` });
      return null;
    }
  }, [updateState]);

  const fetchPostAnalytics = useCallback(async (
    postId: string
  ): Promise<EngagementMetrics | null> => {
    try {
      const response = await apiClient.get<EngagementMetrics>(
        `/api/agent/social/posts/${postId}/analytics`
      );

      if (response.success && response.data) {
        return {
          ...response.data,
          updatedAt: new Date(response.data.updatedAt),
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const exportAnalytics = useCallback(async (
    format: 'csv' | 'json' | 'pdf' = 'csv',
    options?: {
      platform?: SocialPlatform;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Blob | null> => {
    try {
      const params = new URLSearchParams({ format });
      if (options?.platform) params.append('platform', options.platform);
      if (options?.startDate) params.append('startDate', options.startDate.toISOString());
      if (options?.endDate) params.append('endDate', options.endDate.toISOString());

      const response = await apiClient.get<Blob>(
        `/api/agent/social/analytics/export?${params.toString()}`,
        { responseType: 'blob' } as any
      );

      return response.success && response.data ? response.data : null;
    } catch (error) {
      updateState({ error: 'Failed to export analytics' });
      return null;
    }
  }, [updateState]);

  // ============================================
  // Content Calendar
  // ============================================

  const fetchCalendar = useCallback(async (
    startDate?: Date,
    endDate?: Date
  ): Promise<ContentCalendar | null> => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await apiClient.get<ContentCalendar>(
        `/api/agent/social/calendar?${params.toString()}`
      );

      if (response.success && response.data) {
        const calendar = {
          ...response.data,
          dateRange: {
            start: new Date(response.data.dateRange.start),
            end: new Date(response.data.dateRange.end),
          },
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
          posts: response.data.posts.map(p => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : undefined,
            publishedAt: p.publishedAt ? new Date(p.publishedAt) : undefined,
          })),
        };

        updateState({ calendar });
        return calendar;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to fetch calendar' });
      return null;
    }
  }, [updateState]);

  // ============================================
  // Settings
  // ============================================

  const fetchSettings = useCallback(async (): Promise<SocialSettings | null> => {
    try {
      const response = await apiClient.get<SocialSettings>('/api/agent/social/settings');
      if (response.success && response.data) {
        updateState({ settings: response.data });
        return response.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [updateState]);

  const updateSettings = useCallback(async (
    settings: Partial<SocialSettings>
  ): Promise<boolean> => {
    try {
      const response = await apiClient.put('/api/agent/social/settings', settings);
      if (response.success) {
        updateState({ settings: { ...state.settings, ...settings } });
        showSuccess('Settings updated');
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to update settings' });
      return false;
    }
  }, [state.settings, showSuccess, updateState]);

  // ============================================
  // Initialize & Cleanup
  // ============================================

  const initialize = useCallback(async () => {
    if (!isAuthenticated) return;

    updateState({ isLoading: true });
    await Promise.all([
      fetchAccounts(),
      fetchPosts(),
      fetchAnalyticsOverview(),
    ]);
    updateState({ isLoading: false });

    startAutoRefresh();
  }, [isAuthenticated, fetchAccounts, fetchPosts, fetchAnalyticsOverview, updateState]);

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchAccounts(),
      fetchPosts(),
      fetchScheduledPosts(),
      fetchAnalyticsOverview(),
    ]);
  }, [fetchAccounts, fetchPosts, fetchScheduledPosts, fetchAnalyticsOverview]);

  const startAutoRefresh = useCallback((intervalMs: number = 300000) => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(() => {
      refresh();
    }, intervalMs);
  }, [refresh]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // ============================================
  // Return API
  // ============================================

  return {
    // State
    ...state,

    // Tab management
    setActiveTab,

    // Account management
    fetchAccounts,
    connectAccount,
    disconnectAccount,
    refreshAccount,
    getOAuthUrl,

    // Post management
    createPost,
    schedulePost,
    batchPost,
    deletePost,
    cancelScheduledPost,
    reschedulePost,

    // Drafts
    saveDraft,
    updateDraft,
    deleteDraft,

    // Posts fetching
    fetchPosts,
    fetchScheduledPosts,
    fetchPublishedPosts,
    selectPost,

    // Content enhancement
    enhanceContent,
    generateHashtags,

    // Analytics
    fetchAnalyticsOverview,
    fetchPlatformAnalytics,
    fetchPostAnalytics,
    exportAnalytics,

    // Calendar
    fetchCalendar,

    // Settings
    fetchSettings,
    updateSettings,

    // Initialize & Refresh
    initialize,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,

    // Utilities
    clearError,
    clearSuccess,
    updateState,
  };
}

export default useSocial;