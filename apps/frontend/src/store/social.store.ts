// enterprise-ai-agent-platform/apps/frontend/src/store/social.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type SocialPlatform = 'linkedin' | 'instagram' | 'facebook' | 'x_twitter' | 'threads' | 'tiktok';
export type PostStatus = 'draft' | 'scheduled' | 'processing' | 'published' | 'failed' | 'cancelled';
export type PostView = 'all' | 'scheduled' | 'published' | 'failed' | 'draft';
export type SortField = 'scheduledAt' | 'publishedAt' | 'createdAt' | 'platform' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface SocialAccount {
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accountImage?: string;
  followersCount?: number;
  followingCount?: number;
  isConnected: boolean;
  lastSyncedAt?: Date;
  pages?: FacebookPage[];
}

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  followersCount?: number;
  instagramBusinessAccount?: { id: string };
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls: string[];
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PostStatus;
  error?: string;
  postUrl?: string;
  platformPostId?: string;
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

export interface CarouselItem {
  imageUrl: string;
  altText?: string;
  description?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
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

export interface SchedulePostOptions {
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  scheduledAt: Date;
  metadata?: PostMetadata;
  timezone?: string;
}

export interface BatchPostOptions {
  posts: SchedulePostOptions[];
  parallel?: boolean;
  maxConcurrent?: number;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  platform: SocialPlatform;
  error?: string;
  publishedAt: Date;
}

export interface BatchPostResult {
  results: PostResult[];
  totalSuccess: number;
  totalFailed: number;
  totalTimeMs: number;
}

export interface AnalyticsData {
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
  followerGrowth?: number;
  impressionsOverTime?: Array<{ date: string; impressions: number }>;
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
}

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

export interface AIContentSuggestion {
  content: string;
  hashtags: string[];
  tone: string;
  estimatedEngagement: number;
  confidence: number;
}

// ============================================
// Platform Configuration
// ============================================

export const PLATFORM_CONFIG: Record<SocialPlatform, {
  name: string;
  color: string;
  gradient: string;
  characterLimit: number;
  maxMediaItems: number;
  supportedMediaTypes: string[];
  icon: string;
}> = {
  linkedin: {
    name: 'LinkedIn',
    color: '#0077B5',
    gradient: 'from-[#0077B5] to-[#005e8c]',
    characterLimit: 3000,
    maxMediaItems: 9,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    icon: '🔗',
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    gradient: 'from-[#E4405F] to-[#C13584]',
    characterLimit: 2200,
    maxMediaItems: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    icon: '📷',
  },
  facebook: {
    name: 'Facebook',
    color: '#4267B2',
    gradient: 'from-[#4267B2] to-[#365899]',
    characterLimit: 63206,
    maxMediaItems: 1,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    icon: '👍',
  },
  x_twitter: {
    name: 'X (Twitter)',
    color: '#1DA1F2',
    gradient: 'from-[#1DA1F2] to-[#0c7abf]',
    characterLimit: 280,
    maxMediaItems: 4,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    icon: '𝕏',
  },
  threads: {
    name: 'Threads',
    color: '#000000',
    gradient: 'from-[#000000] to-[#333333]',
    characterLimit: 500,
    maxMediaItems: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    icon: '🧵',
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    gradient: 'from-[#000000] to-[#FE2C55]',
    characterLimit: 2200,
    maxMediaItems: 1,
    supportedMediaTypes: ['video/mp4'],
    icon: '🎵',
  },
};

// ============================================
// Store State Interface
// ============================================

interface SocialState {
  // ============================================
  // Account State
  // ============================================
  accounts: SocialAccount[];
  connectedAccounts: SocialAccount[];
  isLoadingAccounts: boolean;
  isConnectingAccount: boolean;

  // ============================================
  // Posts State
  // ============================================
  posts: SocialPost[];
  selectedPostId: string | null;
  isLoadingPosts: boolean;
  isLoadingMore: boolean;
  isPublishing: boolean;
  isScheduling: boolean;
  error: string | null;
  searchQuery: string;
  activeView: PostView;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedPostIds: Set<string>;
  nextPageToken: string | null;
  hasMorePosts: boolean;
  lastSyncTime: Date | null;

  // ============================================
  // Compose State
  // ============================================
  composeOpen: boolean;
  composeContent: string;
  composeMediaUrls: string[];
  composeSelectedPlatforms: SocialPlatform[];
  composeScheduledDate: string;
  composeScheduledTime: string;
  composeTimezone: string;
  composeHashtags: string[];
  composeLocation: string;
  composeLinkUrl: string;
  composeIsAiEnhancing: boolean;
  composeAiSuggestions: AIContentSuggestion | null;

  // ============================================
  // Analytics State
  // ============================================
  analytics: Record<SocialPlatform, AnalyticsData | null>;
  isLoadingAnalytics: boolean;
  analyticsTimeRange: '7d' | '30d' | '90d' | '1y';

  // ============================================
  // Templates & Calendar
  // ============================================
  templates: PostTemplate[];
  contentCalendars: ContentCalendar[];
  selectedTemplate: string | null;
  isLoadingTemplates: boolean;
  showTemplatePanel: boolean;
  showCalendarPanel: boolean;

  // ============================================
  // Computed
  // ============================================
  getSelectedPost: () => SocialPost | null;
  getFilteredPosts: () => SocialPost[];
  getScheduledPosts: () => SocialPost[];
  getPublishedPosts: () => SocialPost[];
  getFailedPosts: () => SocialPost[];
  getDraftPosts: () => SocialPost[];
  getPostCount: () => number;
  getScheduledCount: () => number;
  getPublishedCount: () => number;
  getFailedCount: () => number;
  getConnectedPlatforms: () => SocialPlatform[];
  getDisconnectedPlatforms: () => SocialPlatform[];
  getPlatformCharacterLimit: (platform: SocialPlatform) => number;
  getCharacterCount: () => number;
  getRemainingCharacters: (platform: SocialPlatform) => number;

  // ============================================
  // Actions - Account Management
  // ============================================
  fetchAccounts: () => Promise<void>;
  connectAccount: (platform: SocialPlatform, code: string) => Promise<{ success: boolean; error?: string }>;
  disconnectAccount: (platform: SocialPlatform) => Promise<{ success: boolean; error?: string }>;
  refreshAccount: (platform: SocialPlatform) => Promise<void>;

  // ============================================
  // Actions - Post Management
  // ============================================
  fetchPosts: (view?: PostView, options?: { pageToken?: string; limit?: number }) => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  fetchPostById: (postId: string) => Promise<SocialPost | null>;
  refreshPosts: () => Promise<void>;

  // ============================================
  // Actions - Publishing
  // ============================================
  publishPost: (content: string, platforms: SocialPlatform[], mediaUrls?: string[]) => Promise<BatchPostResult>;
  schedulePost: (options: SchedulePostOptions) => Promise<{ success: boolean; postId?: string; error?: string }>;
  publishNow: (postId: string) => Promise<{ success: boolean; error?: string }>;
  updatePost: (postId: string, updates: Partial<SocialPost>) => Promise<{ success: boolean; error?: string }>;
  deletePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  deletePosts: (postIds: string[]) => Promise<{ success: boolean; processedCount: number; failedCount: number }>;
  cancelScheduledPost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  retryFailedPost: (postId: string) => Promise<{ success: boolean; error?: string }>;

  // ============================================
  // Actions - AI Features
  // ============================================
  enhanceContent: (content: string, platform: SocialPlatform) => Promise<AIContentSuggestion | null>;
  generateHashtags: (content: string, platform: SocialPlatform) => Promise<string[]>;
  suggestBestTimeToPost: (platform: SocialPlatform) => Promise<{ dayOfWeek: number; hourOfDay: number } | null>;

  // ============================================
  // Actions - Analytics
  // ============================================
  fetchAnalytics: (platform: SocialPlatform) => Promise<void>;
  fetchAllAnalytics: () => Promise<void>;
  setAnalyticsTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;

  // ============================================
  // Actions - Templates & Calendar
  // ============================================
  fetchTemplates: () => Promise<void>;
  createTemplate: (template: Omit<PostTemplate, 'id'>) => Promise<{ success: boolean; templateId?: string; error?: string }>;
  updateTemplate: (templateId: string, updates: Partial<PostTemplate>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  applyTemplate: (templateId: string) => void;
  fetchContentCalendar: () => Promise<void>;

  // ============================================
  // Actions - Search & Filter
  // ============================================
  searchPosts: (query: string) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // ============================================
  // Actions - UI State
  // ============================================
  setActiveView: (view: PostView) => void;
  selectPost: (postId: string | null) => void;
  togglePostSelection: (postId: string) => void;
  selectAllPosts: () => void;
  clearSelection: () => void;
  setSortOrder: (field: SortField, direction: SortDirection) => void;
  openCompose: (options?: { content?: string; platforms?: SocialPlatform[]; scheduleDate?: Date }) => void;
  closeCompose: () => void;
  updateComposeField: (field: string, value: any) => void;
  togglePlatform: (platform: SocialPlatform) => void;
  addComposeMedia: (url: string) => void;
  removeComposeMedia: (index: number) => void;
  addComposeHashtag: (hashtag: string) => void;
  removeComposeHashtag: (hashtag: string) => void;
  toggleTemplatePanel: () => void;
  toggleCalendarPanel: () => void;
  clearError: () => void;
  resetState: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  accounts: [] as SocialAccount[],
  connectedAccounts: [] as SocialAccount[],
  isLoadingAccounts: false,
  isConnectingAccount: false,

  posts: [] as SocialPost[],
  selectedPostId: null as string | null,
  isLoadingPosts: false,
  isLoadingMore: false,
  isPublishing: false,
  isScheduling: false,
  error: null as string | null,
  searchQuery: '',
  activeView: 'all' as PostView,
  sortField: 'scheduledAt' as SortField,
  sortDirection: 'desc' as SortDirection,
  selectedPostIds: new Set<string>(),
  nextPageToken: null as string | null,
  hasMorePosts: false,
  lastSyncTime: null as Date | null,

  composeOpen: false,
  composeContent: '',
  composeMediaUrls: [] as string[],
  composeSelectedPlatforms: ['linkedin', 'x_twitter'] as SocialPlatform[],
  composeScheduledDate: '',
  composeScheduledTime: '',
  composeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  composeHashtags: [] as string[],
  composeLocation: '',
  composeLinkUrl: '',
  composeIsAiEnhancing: false,
  composeAiSuggestions: null as AIContentSuggestion | null,

  analytics: {} as Record<SocialPlatform, AnalyticsData | null>,
  isLoadingAnalytics: false,
  analyticsTimeRange: '30d' as '7d' | '30d' | '90d' | '1y',

  templates: [] as PostTemplate[],
  contentCalendars: [] as ContentCalendar[],
  selectedTemplate: null as string | null,
  isLoadingTemplates: false,
  showTemplatePanel: false,
  showCalendarPanel: false,
};

// ============================================
// Store Implementation
// ============================================

export const useSocialStore = create<SocialState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // Computed Getters
        // ============================================

        getSelectedPost: () => {
          const { posts, selectedPostId } = get();
          return posts.find(p => p.id === selectedPostId) || null;
        },

        getFilteredPosts: () => {
          const { posts, activeView, searchQuery, sortField, sortDirection } = get();
          let filtered = [...posts];

          // Filter by view
          switch (activeView) {
            case 'scheduled':
              filtered = filtered.filter(p => p.status === 'scheduled');
              break;
            case 'published':
              filtered = filtered.filter(p => p.status === 'published');
              break;
            case 'failed':
              filtered = filtered.filter(p => p.status === 'failed');
              break;
            case 'draft':
              filtered = filtered.filter(p => p.status === 'draft');
              break;
          }

          // Filter by search
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
              p.content.toLowerCase().includes(query) ||
              p.platform.toLowerCase().includes(query)
            );
          }

          // Sort
          filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
              case 'scheduledAt':
                comparison = (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0);
                break;
              case 'publishedAt':
                comparison = (a.publishedAt?.getTime() || 0) - (b.publishedAt?.getTime() || 0);
                break;
              case 'createdAt':
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
              case 'platform':
                comparison = a.platform.localeCompare(b.platform);
                break;
              case 'status':
                comparison = a.status.localeCompare(b.status);
                break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
          });

          return filtered;
        },

        getScheduledPosts: () => get().posts.filter(p => p.status === 'scheduled'),
        getPublishedPosts: () => get().posts.filter(p => p.status === 'published'),
        getFailedPosts: () => get().posts.filter(p => p.status === 'failed'),
        getDraftPosts: () => get().posts.filter(p => p.status === 'draft'),
        getPostCount: () => get().posts.length,
        getScheduledCount: () => get().getScheduledPosts().length,
        getPublishedCount: () => get().getPublishedPosts().length,
        getFailedCount: () => get().getFailedPosts().length,

        getConnectedPlatforms: () => {
          return get().accounts.filter(a => a.isConnected).map(a => a.platform);
        },

        getDisconnectedPlatforms: () => {
          const allPlatforms: SocialPlatform[] = ['linkedin', 'instagram', 'facebook', 'x_twitter', 'threads', 'tiktok'];
          const connected = get().getConnectedPlatforms();
          return allPlatforms.filter(p => !connected.includes(p));
        },

        getPlatformCharacterLimit: (platform: SocialPlatform) => {
          return PLATFORM_CONFIG[platform]?.characterLimit || 280;
        },

        getCharacterCount: () => {
          return get().composeContent.length;
        },

        getRemainingCharacters: (platform: SocialPlatform) => {
          const limit = PLATFORM_CONFIG[platform]?.characterLimit || 280;
          return limit - get().composeContent.length;
        },

        // ============================================
        // Account Management Actions
        // ============================================

        fetchAccounts: async () => {
          set({ isLoadingAccounts: true, error: null });

          try {
            const response = await apiClient.get<SocialAccount[]>('/api/agent/social/accounts');
            if (response.success && response.data) {
              set({
                accounts: response.data,
                connectedAccounts: response.data.filter(a => a.isConnected),
                isLoadingAccounts: false,
              });
            } else {
              set({ isLoadingAccounts: false, error: response.error || 'Failed to fetch accounts' });
            }
          } catch (err) {
            set({
              isLoadingAccounts: false,
              error: err instanceof Error ? err.message : 'Failed to fetch accounts',
            });
          }
        },

        connectAccount: async (platform: SocialPlatform, code: string) => {
          set({ isConnectingAccount: true, error: null });

          try {
            const response = await apiClient.post<SocialAccount>('/api/agent/social/connect', {
              platform,
              code,
            });

            if (response.success && response.data) {
              set(state => ({
                accounts: state.accounts.map(a =>
                  a.platform === platform ? { ...a, ...response.data, isConnected: true } : a
                ),
                connectedAccounts: [...state.connectedAccounts.filter(a => a.platform !== platform), response.data!],
                isConnectingAccount: false,
              }));
              return { success: true };
            }

            set({ isConnectingAccount: false, error: response.error || 'Failed to connect account' });
            return { success: false, error: response.error || 'Failed to connect account' };
          } catch (err) {
            set({ isConnectingAccount: false, error: err instanceof Error ? err.message : 'Failed to connect account' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to connect account' };
          }
        },

        disconnectAccount: async (platform: SocialPlatform) => {
          try {
            const response = await apiClient.delete(`/api/agent/social/disconnect/${platform}`);
            if (response.success) {
              set(state => ({
                accounts: state.accounts.map(a =>
                  a.platform === platform ? { ...a, isConnected: false } : a
                ),
                connectedAccounts: state.connectedAccounts.filter(a => a.platform !== platform),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to disconnect account' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to disconnect account' };
          }
        },

        refreshAccount: async (platform: SocialPlatform) => {
          try {
            const response = await apiClient.get<SocialAccount>(`/api/agent/social/accounts/${platform}`);
            if (response.success && response.data) {
              set(state => ({
                accounts: state.accounts.map(a =>
                  a.platform === platform ? { ...a, ...response.data } : a
                ),
              }));
            }
          } catch (err) {
            console.error('Failed to refresh account:', err);
          }
        },

        // ============================================
        // Post Management Actions
        // ============================================

        fetchPosts: async (view?: PostView, options?: { pageToken?: string; limit?: number }) => {
          const state = get();
          const targetView = view || state.activeView;

          set({ isLoadingPosts: true, error: null, activeView: targetView });

          try {
            const params: Record<string, any> = {
              limit: options?.limit || 50,
            };

            if (options?.pageToken) params.pageToken = options.pageToken;
            if (targetView !== 'all') params.status = targetView;

            const response = await apiClient.get<{
              posts: SocialPost[];
              nextPageToken?: string;
            }>('/api/agent/social/posts', params);

            if (response.success && response.data) {
              const posts = response.data.posts.map((post: any) => ({
                ...post,
                scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
                publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
                createdAt: new Date(post.createdAt),
                updatedAt: new Date(post.updatedAt),
              }));

              set({
                posts,
                nextPageToken: response.data.nextPageToken || null,
                hasMorePosts: !!response.data.nextPageToken,
                lastSyncTime: new Date(),
                isLoadingPosts: false,
              });
            } else {
              set({ isLoadingPosts: false, error: response.error || 'Failed to fetch posts' });
            }
          } catch (err) {
            set({
              isLoadingPosts: false,
              error: err instanceof Error ? err.message : 'Failed to fetch posts',
            });
          }
        },

        fetchMorePosts: async () => {
          const { nextPageToken, isLoadingMore } = get();
          if (!nextPageToken || isLoadingMore) return;

          set({ isLoadingMore: true, error: null });

          try {
            const response = await apiClient.get<{
              posts: SocialPost[];
              nextPageToken?: string;
            }>('/api/agent/social/posts', {
              pageToken: nextPageToken,
              limit: 50,
            });

            if (response.success && response.data) {
              const newPosts = response.data.posts.map((post: any) => ({
                ...post,
                scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : undefined,
                publishedAt: post.publishedAt ? new Date(post.publishedAt) : undefined,
                createdAt: new Date(post.createdAt),
                updatedAt: new Date(post.updatedAt),
              }));

              set(state => ({
                posts: [...state.posts, ...newPosts],
                nextPageToken: response.data?.nextPageToken || null,
                hasMorePosts: !!response.data?.nextPageToken,
                isLoadingMore: false,
              }));
            } else {
              set({ isLoadingMore: false, error: response.error || 'Failed to fetch more posts' });
            }
          } catch (err) {
            set({
              isLoadingMore: false,
              error: err instanceof Error ? err.message : 'Failed to fetch more posts',
            });
          }
        },

        fetchPostById: async (postId: string) => {
          try {
            const response = await apiClient.get<SocialPost>(`/api/agent/social/posts/${postId}`);
            if (response.success && response.data) {
              const post = {
                ...response.data,
                scheduledAt: response.data.scheduledAt ? new Date(response.data.scheduledAt) : undefined,
                publishedAt: response.data.publishedAt ? new Date(response.data.publishedAt) : undefined,
                createdAt: new Date(response.data.createdAt),
                updatedAt: new Date(response.data.updatedAt),
              };

              set(state => ({
                posts: state.posts.map(p => p.id === postId ? post : p),
              }));

              return post;
            }
            return null;
          } catch (err) {
            return null;
          }
        },

        refreshPosts: async () => {
          await get().fetchPosts();
        },

        // ============================================
        // Publishing Actions
        // ============================================

        publishPost: async (content: string, platforms: SocialPlatform[], mediaUrls?: string[]) => {
          set({ isPublishing: true, error: null });

          try {
            const response = await apiClient.post<BatchPostResult>('/api/agent/social/post', {
              content,
              platforms,
              mediaUrls: mediaUrls || [],
            });

            if (response.success && response.data) {
              set({ isPublishing: false });
              await get().refreshPosts();
              return response.data;
            }

            set({
              isPublishing: false,
              error: response.error || 'Failed to publish post',
            });
            return { results: [], totalSuccess: 0, totalFailed: platforms.length, totalTimeMs: 0 };
          } catch (err) {
            set({
              isPublishing: false,
              error: err instanceof Error ? err.message : 'Failed to publish post',
            });
            return { results: [], totalSuccess: 0, totalFailed: platforms.length, totalTimeMs: 0 };
          }
        },

        schedulePost: async (options: SchedulePostOptions) => {
          set({ isScheduling: true, error: null });

          try {
            const response = await apiClient.post<{ id: string }>('/api/agent/social/schedule', options);
            if (response.success && response.data) {
              set({ isScheduling: false });
              await get().refreshPosts();
              return { success: true, postId: response.data.id };
            }
            set({ isScheduling: false, error: response.error || 'Failed to schedule post' });
            return { success: false, error: response.error || 'Failed to schedule post' };
          } catch (err) {
            set({ isScheduling: false, error: err instanceof Error ? err.message : 'Failed to schedule post' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to schedule post' };
          }
        },

        publishNow: async (postId: string) => {
          try {
            const response = await apiClient.post(`/api/agent/social/posts/${postId}/publish`);
            if (response.success) {
              set(state => ({
                posts: state.posts.map(p =>
                  p.id === postId ? { ...p, status: 'published' as PostStatus, publishedAt: new Date() } : p
                ),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to publish post' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to publish post' };
          }
        },

        updatePost: async (postId: string, updates: Partial<SocialPost>) => {
          try {
            const response = await apiClient.put(`/api/agent/social/posts/${postId}`, updates);
            if (response.success) {
              set(state => ({
                posts: state.posts.map(p =>
                  p.id === postId ? { ...p, ...updates, updatedAt: new Date() } : p
                ),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to update post' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update post' };
          }
        },

        deletePost: async (postId: string) => {
          try {
            const response = await apiClient.delete(`/api/agent/social/posts/${postId}`);
            if (response.success) {
              set(state => ({
                posts: state.posts.filter(p => p.id !== postId),
                selectedPostId: state.selectedPostId === postId ? null : state.selectedPostId,
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to delete post' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete post' };
          }
        },

        deletePosts: async (postIds: string[]) => {
          set(state => ({
            posts: state.posts.filter(p => !postIds.includes(p.id)),
          }));

          try {
            const response = await apiClient.post<{ processedCount: number; failedCount: number }>(
              '/api/agent/social/posts/batch-delete',
              { postIds }
            );

            if (response.success) {
              set({ selectedPostIds: new Set(), selectedPostId: null });
            }

            return {
              success: response.success,
              processedCount: response.data?.processedCount || postIds.length,
              failedCount: response.data?.failedCount || 0,
            };
          } catch (err) {
            await get().refreshPosts();
            return { success: false, processedCount: 0, failedCount: postIds.length };
          }
        },

        cancelScheduledPost: async (postId: string) => {
          try {
            const response = await apiClient.post(`/api/agent/social/posts/${postId}/cancel`);
            if (response.success) {
              set(state => ({
                posts: state.posts.map(p =>
                  p.id === postId ? { ...p, status: 'cancelled' as PostStatus } : p
                ),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to cancel post' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel post' };
          }
        },

        retryFailedPost: async (postId: string) => {
          try {
            const response = await apiClient.post(`/api/agent/social/posts/${postId}/retry`);
            if (response.success) {
              set(state => ({
                posts: state.posts.map(p =>
                  p.id === postId ? { ...p, status: 'processing' as PostStatus, error: undefined } : p
                ),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to retry post' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to retry post' };
          }
        },

        // ============================================
        // AI Feature Actions
        // ============================================

        enhanceContent: async (content: string, platform: SocialPlatform) => {
          set({ composeIsAiEnhancing: true });

          try {
            const response = await apiClient.post<AIContentSuggestion>(
              '/api/agent/social/enhance',
              { content, platform }
            );

            if (response.success && response.data) {
              set({
                composeIsAiEnhancing: false,
                composeAiSuggestions: response.data,
              });
              return response.data;
            }

            set({ composeIsAiEnhancing: false });
            return null;
          } catch (err) {
            set({ composeIsAiEnhancing: false });
            return null;
          }
        },

        generateHashtags: async (content: string, platform: SocialPlatform) => {
          try {
            const response = await apiClient.get<string[]>(
              '/api/agent/social/hashtags',
              { content, platform }
            );
            return response.data || [];
          } catch (err) {
            return [];
          }
        },

        suggestBestTimeToPost: async (platform: SocialPlatform) => {
          try {
            const analytics = get().analytics[platform];
            if (analytics?.bestTimeToPost) {
              return analytics.bestTimeToPost;
            }
            return null;
          } catch (err) {
            return null;
          }
        },

        // ============================================
        // Analytics Actions
        // ============================================

        fetchAnalytics: async (platform: SocialPlatform) => {
          set({ isLoadingAnalytics: true, error: null });

          try {
            const response = await apiClient.get<AnalyticsData>(
              `/api/agent/social/analytics/${platform}`,
              { timeRange: get().analyticsTimeRange }
            );

            if (response.success && response.data) {
              set(state => ({
                analytics: { ...state.analytics, [platform]: response.data },
                isLoadingAnalytics: false,
              }));
            } else {
              set({ isLoadingAnalytics: false, error: response.error || 'Failed to fetch analytics' });
            }
          } catch (err) {
            set({
              isLoadingAnalytics: false,
              error: err instanceof Error ? err.message : 'Failed to fetch analytics',
            });
          }
        },

        fetchAllAnalytics: async () => {
          const connected = get().getConnectedPlatforms();
          await Promise.all(connected.map(platform => get().fetchAnalytics(platform)));
        },

        setAnalyticsTimeRange: (range: '7d' | '30d' | '90d' | '1y') => {
          set({ analyticsTimeRange: range });
        },

        // ============================================
        // Templates & Calendar Actions
        // ============================================

        fetchTemplates: async () => {
          set({ isLoadingTemplates: true });

          try {
            const response = await apiClient.get<PostTemplate[]>('/api/agent/social/templates');
            if (response.success && response.data) {
              set({ templates: response.data, isLoadingTemplates: false });
            } else {
              set({ isLoadingTemplates: false });
            }
          } catch (err) {
            set({ isLoadingTemplates: false });
          }
        },

        createTemplate: async (template: Omit<PostTemplate, 'id'>) => {
          try {
            const response = await apiClient.post<{ id: string }>('/api/agent/social/templates', template);
            if (response.success && response.data) {
              const newTemplate: PostTemplate = { ...template, id: response.data.id };
              set(state => ({ templates: [...state.templates, newTemplate] }));
              return { success: true, templateId: response.data.id };
            }
            return { success: false, error: response.error || 'Failed to create template' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to create template' };
          }
        },

        updateTemplate: async (templateId: string, updates: Partial<PostTemplate>) => {
          try {
            await apiClient.put(`/api/agent/social/templates/${templateId}`, updates);
            set(state => ({
              templates: state.templates.map(t =>
                t.id === templateId ? { ...t, ...updates } : t
              ),
            }));
          } catch (err) {
            console.error('Failed to update template:', err);
          }
        },

        deleteTemplate: async (templateId: string) => {
          try {
            await apiClient.delete(`/api/agent/social/templates/${templateId}`);
            set(state => ({
              templates: state.templates.filter(t => t.id !== templateId),
              selectedTemplate: state.selectedTemplate === templateId ? null : state.selectedTemplate,
            }));
          } catch (err) {
            console.error('Failed to delete template:', err);
          }
        },

        applyTemplate: (templateId: string) => {
          const template = get().templates.find(t => t.id === templateId);
          if (!template) return;

          set({
            composeContent: template.content,
            composeSelectedPlatforms: [template.platform],
            composeMediaUrls: template.mediaPlaceholders?.filter((url: string) => url.startsWith('http')) || [],
            selectedTemplate: templateId,
            showTemplatePanel: false,
          });
        },

        fetchContentCalendar: async () => {
          try {
            const response = await apiClient.get<ContentCalendar[]>('/api/agent/social/calendar');
            if (response.success && response.data) {
              set({ contentCalendars: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch content calendar:', err);
          }
        },

        // ============================================
        // Search & Filter Actions
        // ============================================

        searchPosts: (query: string) => {
          set({ searchQuery: query });
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        clearSearch: () => {
          set({ searchQuery: '' });
        },

        // ============================================
        // UI State Actions
        // ============================================

        setActiveView: (view: PostView) => {
          set({
            activeView: view,
            selectedPostId: null,
            selectedPostIds: new Set(),
            searchQuery: '',
          });
          get().fetchPosts(view);
        },

        selectPost: (postId: string | null) => {
          set({ selectedPostId: postId });
        },

        togglePostSelection: (postId: string) => {
          set(state => {
            const newSet = new Set(state.selectedPostIds);
            if (newSet.has(postId)) {
              newSet.delete(postId);
            } else {
              newSet.add(postId);
            }
            return { selectedPostIds: newSet };
          });
        },

        selectAllPosts: () => {
          const filtered = get().getFilteredPosts();
          if (filtered.length === get().selectedPostIds.size) {
            set({ selectedPostIds: new Set() });
          } else {
            set({ selectedPostIds: new Set(filtered.map(p => p.id)) });
          }
        },

        clearSelection: () => {
          set({ selectedPostIds: new Set() });
        },

        setSortOrder: (field: SortField, direction: SortDirection) => {
          set({ sortField: field, sortDirection: direction });
        },

        openCompose: (options?: { content?: string; platforms?: SocialPlatform[]; scheduleDate?: Date }) => {
          const connected = get().getConnectedPlatforms();
          const defaultPlatforms = connected.length > 0 ? connected.slice(0, 2) : ['linkedin', 'x_twitter'];

          set({
            composeOpen: true,
            composeContent: options?.content || '',
            composeSelectedPlatforms: options?.platforms || defaultPlatforms as SocialPlatform[],
            composeScheduledDate: options?.scheduleDate
              ? options.scheduleDate.toISOString().split('T')[0]
              : '',
            composeScheduledTime: options?.scheduleDate
              ? options.scheduleDate.toTimeString().slice(0, 5)
              : '',
            composeMediaUrls: [],
            composeHashtags: [],
            composeLocation: '',
            composeLinkUrl: '',
            composeAiSuggestions: null,
          });
        },

        closeCompose: () => {
          set({
            composeOpen: false,
            composeContent: '',
            composeMediaUrls: [],
            composeSelectedPlatforms: ['linkedin', 'x_twitter'],
            composeScheduledDate: '',
            composeScheduledTime: '',
            composeHashtags: [],
            composeLocation: '',
            composeLinkUrl: '',
            composeAiSuggestions: null,
          });
        },

        updateComposeField: (field: string, value: any) => {
          const fieldMap: Record<string, string> = {
            content: 'composeContent',
            scheduledDate: 'composeScheduledDate',
            scheduledTime: 'composeScheduledTime',
            timezone: 'composeTimezone',
            location: 'composeLocation',
            linkUrl: 'composeLinkUrl',
          };

          const stateField = fieldMap[field] || `compose${field.charAt(0).toUpperCase() + field.slice(1)}`;
          set({ [stateField]: value } as any);
        },

        togglePlatform: (platform: SocialPlatform) => {
          set(state => {
            const isSelected = state.composeSelectedPlatforms.includes(platform);
            if (isSelected) {
              return {
                composeSelectedPlatforms: state.composeSelectedPlatforms.filter(p => p !== platform),
              };
            } else {
              return {
                composeSelectedPlatforms: [...state.composeSelectedPlatforms, platform],
              };
            }
          });
        },

        addComposeMedia: (url: string) => {
          set(state => ({
            composeMediaUrls: [...state.composeMediaUrls, url],
          }));
        },

        removeComposeMedia: (index: number) => {
          set(state => ({
            composeMediaUrls: state.composeMediaUrls.filter((_, i) => i !== index),
          }));
        },

        addComposeHashtag: (hashtag: string) => {
          const cleanHashtag = hashtag.replace(/^#/, '').trim();
          if (!cleanHashtag) return;

          set(state => ({
            composeHashtags: [...state.composeHashtags, `#${cleanHashtag}`],
          }));
        },

        removeComposeHashtag: (hashtag: string) => {
          set(state => ({
            composeHashtags: state.composeHashtags.filter(h => h !== hashtag),
          }));
        },

        toggleTemplatePanel: () => {
          set(state => ({ showTemplatePanel: !state.showTemplatePanel }));
        },

        toggleCalendarPanel: () => {
          set(state => ({ showCalendarPanel: !state.showCalendarPanel }));
        },

        clearError: () => {
          set({ error: null });
        },

        resetState: () => {
          set({
            ...initialState,
            selectedPostIds: new Set<string>(),
            composeSelectedPlatforms: [],
          });
        },
      }),
      {
        name: 'social-agent-store',
        partialize: (state) => ({
          activeView: state.activeView,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          composeSelectedPlatforms: state.composeSelectedPlatforms,
          composeTimezone: state.composeTimezone,
          analyticsTimeRange: state.analyticsTimeRange,
          showTemplatePanel: state.showTemplatePanel,
          showCalendarPanel: state.showCalendarPanel,
        }),
      }
    )
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useSocialAccounts = () => useSocialStore(state => ({
  accounts: state.accounts,
  connectedAccounts: state.connectedAccounts,
  isLoadingAccounts: state.isLoadingAccounts,
  isConnectingAccount: state.isConnectingAccount,
  fetchAccounts: state.fetchAccounts,
  connectAccount: state.connectAccount,
  disconnectAccount: state.disconnectAccount,
  refreshAccount: state.refreshAccount,
  getConnectedPlatforms: state.getConnectedPlatforms,
  getDisconnectedPlatforms: state.getDisconnectedPlatforms,
}));

export const useSocialPosts = () => useSocialStore(state => ({
  posts: state.posts,
  selectedPostId: state.selectedPostId,
  isLoadingPosts: state.isLoadingPosts,
  isLoadingMore: state.isLoadingMore,
  isPublishing: state.isPublishing,
  isScheduling: state.isScheduling,
  error: state.error,
  searchQuery: state.searchQuery,
  activeView: state.activeView,
  sortField: state.sortField,
  sortDirection: state.sortDirection,
  selectedPostIds: state.selectedPostIds,
  hasMorePosts: state.hasMorePosts,
  lastSyncTime: state.lastSyncTime,
  fetchPosts: state.fetchPosts,
  fetchMorePosts: state.fetchMorePosts,
  refreshPosts: state.refreshPosts,
  setActiveView: state.setActiveView,
  selectPost: state.selectPost,
  togglePostSelection: state.togglePostSelection,
  selectAllPosts: state.selectAllPosts,
  clearSelection: state.clearSelection,
  setSortOrder: state.setSortOrder,
  searchPosts: state.searchPosts,
  clearSearch: state.clearSearch,
  getFilteredPosts: state.getFilteredPosts,
  getSelectedPost: state.getSelectedPost,
  getPostCount: state.getPostCount,
  getScheduledCount: state.getScheduledCount,
  getPublishedCount: state.getPublishedCount,
  getFailedCount: state.getFailedCount,
}));

export const useSocialCompose = () => useSocialStore(state => ({
  composeOpen: state.composeOpen,
  composeContent: state.composeContent,
  composeMediaUrls: state.composeMediaUrls,
  composeSelectedPlatforms: state.composeSelectedPlatforms,
  composeScheduledDate: state.composeScheduledDate,
  composeScheduledTime: state.composeScheduledTime,
  composeTimezone: state.composeTimezone,
  composeHashtags: state.composeHashtags,
  composeLocation: state.composeLocation,
  composeLinkUrl: state.composeLinkUrl,
  composeIsAiEnhancing: state.composeIsAiEnhancing,
  composeAiSuggestions: state.composeAiSuggestions,
  openCompose: state.openCompose,
  closeCompose: state.closeCompose,
  updateComposeField: state.updateComposeField,
  togglePlatform: state.togglePlatform,
  addComposeMedia: state.addComposeMedia,
  removeComposeMedia: state.removeComposeMedia,
  addComposeHashtag: state.addComposeHashtag,
  removeComposeHashtag: state.removeComposeHashtag,
  publishPost: state.publishPost,
  schedulePost: state.schedulePost,
  enhanceContent: state.enhanceContent,
  generateHashtags: state.generateHashtags,
  getCharacterCount: state.getCharacterCount,
  getRemainingCharacters: state.getRemainingCharacters,
  getPlatformCharacterLimit: state.getPlatformCharacterLimit,
}));

export const useSocialPublishing = () => useSocialStore(state => ({
  isPublishing: state.isPublishing,
  isScheduling: state.isScheduling,
  publishPost: state.publishPost,
  schedulePost: state.schedulePost,
  publishNow: state.publishNow,
  updatePost: state.updatePost,
  deletePost: state.deletePost,
  deletePosts: state.deletePosts,
  cancelScheduledPost: state.cancelScheduledPost,
  retryFailedPost: state.retryFailedPost,
}));

export const useSocialAnalytics = () => useSocialStore(state => ({
  analytics: state.analytics,
  isLoadingAnalytics: state.isLoadingAnalytics,
  analyticsTimeRange: state.analyticsTimeRange,
  fetchAnalytics: state.fetchAnalytics,
  fetchAllAnalytics: state.fetchAllAnalytics,
  setAnalyticsTimeRange: state.setAnalyticsTimeRange,
  suggestBestTimeToPost: state.suggestBestTimeToPost,
}));

export const useSocialTemplates = () => useSocialStore(state => ({
  templates: state.templates,
  selectedTemplate: state.selectedTemplate,
  isLoadingTemplates: state.isLoadingTemplates,
  showTemplatePanel: state.showTemplatePanel,
  fetchTemplates: state.fetchTemplates,
  createTemplate: state.createTemplate,
  updateTemplate: state.updateTemplate,
  deleteTemplate: state.deleteTemplate,
  applyTemplate: state.applyTemplate,
  toggleTemplatePanel: state.toggleTemplatePanel,
}));

export const useSocialCalendar = () => useSocialStore(state => ({
  contentCalendars: state.contentCalendars,
  showCalendarPanel: state.showCalendarPanel,
  fetchContentCalendar: state.fetchContentCalendar,
  toggleCalendarPanel: state.toggleCalendarPanel,
}));