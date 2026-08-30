// enterprise-ai-agent-platform/apps/api/src/agents/social/twitter.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface TwitterTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    bookmark_count: number;
    impression_count: number;
  };
  attachments?: {
    media_keys?: string[];
    poll_ids?: string[];
  };
  entities?: {
    mentions?: Array<{ start: number; end: number; username: string; id: string }>;
    hashtags?: Array<{ start: number; end: number; tag: string }>;
    urls?: Array<{ start: number; end: number; url: string; expanded_url: string; display_url: string }>;
  };
  conversation_id?: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: Array<{ type: 'replied_to' | 'quoted' | 'retweeted'; id: string }>;
  lang?: string;
  possibly_sensitive?: boolean;
  source?: string;
  withheld?: any;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  verified?: boolean;
  protected?: boolean;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
  created_at?: string;
  location?: string;
  url?: string;
  entities?: {
    url?: { urls: Array<{ url: string; expanded_url: string; display_url: string }> };
    description?: { urls: Array<{ url: string; expanded_url: string; display_url: string }>; hashtags: Array<{ start: number; end: number; tag: string }> };
  };
  pinned_tweet_id?: string;
  withheld?: any;
}

export interface TwitterPostResponse {
  id: string;
  text: string;
}

export interface TwitterStreamRule {
  id: string;
  value: string;
  tag?: string;
}

export class TwitterClient {
  private client: AxiosInstance | null = null;
  private oauth: OAuth | null = null;
  private accessToken: string = '';
  private accessSecret: string = '';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(accessToken: string, accessSecret: string) {
    this.accessToken = accessToken;
    this.accessSecret = accessSecret;
    this.initializeClient();
  }

  private initializeClient(): void {
    this.oauth = new OAuth({
      consumer: {
        key: apiConfig.twitter.apiKey,
        secret: apiConfig.twitter.apiSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
    });

    this.client = axios.create({
      baseURL: apiConfig.twitter.apiUrl,
      timeout: apiConfig.timeouts.default,
    });

    // Request interceptor for OAuth signing
    this.client.interceptors.request.use((config) => {
      if (this.oauth) {
        const oauthData = this.oauth.authorize(
          { url: `${config.baseURL}${config.url}`, method: config.method || 'GET' },
          { key: this.accessToken, secret: this.accessSecret }
        );
        config.headers.Authorization = this.oauth.toHeader(oauthData).Authorization;
      }
      
      logger.debug({ method: config.method, url: config.url }, 'Twitter API request');
      return config;
    }, (error) => Promise.reject(error));

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Twitter API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Twitter token expired or invalid');
        } else if (error.response?.status === 403) {
          logger.error('Twitter access denied');
        } else if (error.response?.status === 429) {
          const resetTime = error.response.headers['x-rate-limit-reset'];
          const waitSeconds = resetTime ? parseInt(resetTime) - Math.floor(Date.now() / 1000) : 900;
          logger.warn({ waitSeconds }, 'Twitter rate limit exceeded');
        }
        throw error;
      }
    );
  }

  async updateTokens(accessToken: string, accessSecret: string): Promise<void> {
    this.accessToken = accessToken;
    this.accessSecret = accessSecret;
    this.initializeClient();
  }

  /**
   * Retry wrapper for API calls with rate limit awareness
   */
  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const axiosError = error as AxiosError;
          
          // Check for rate limit
          if (axiosError.response?.status === 429) {
            const resetTime = axiosError.response.headers['x-rate-limit-reset'];
            const delay = resetTime
              ? (parseInt(resetTime) - Math.floor(Date.now() / 1000)) * 1000
              : this.BASE_DELAY_MS * Math.pow(2, attempt);
            
            logger.warn({ attempt, delay, context }, 'Twitter rate limit hit, waiting');
            await new Promise(resolve => setTimeout(resolve, Math.max(delay, 15000)));
          } else {
            const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
            logger.warn({ attempt, delay, context, error: lastError.message }, 'Twitter API retry');
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async postTweet(text: string, mediaIds?: string[]): Promise<TwitterPostResponse> {
    return this.retryRequest(async () => {
      if (text.length > 280) {
        throw new Error(`Tweet exceeds 280 character limit (${text.length} characters)`);
      }

      if (!this.client) throw new Error('Client not initialized');

      const payload: any = { text };
      if (mediaIds && mediaIds.length > 0) {
        payload.media = { media_ids: mediaIds };
      }

      const response = await this.client.post('/tweets', payload);
      return { id: response.data.data.id, text: response.data.data.text };
    }, 'postTweet');
  }

  async postTweetWithMedia(text: string, mediaData: Buffer, mediaType: string): Promise<TwitterPostResponse> {
    return this.retryRequest(async () => {
      // Step 1: Upload media
      const mediaResponse = await this.uploadMedia(mediaData, mediaType);
      const mediaId = mediaResponse.media_id_string;

      // Step 2: Post tweet with media
      return await this.postTweet(text, [mediaId]);
    }, 'postTweetWithMedia');
  }

  async uploadMedia(mediaData: Buffer, mediaType: string): Promise<{ media_id: number; media_id_string: string; size: number; expires_after_secs: number }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');

      const formData = new FormData();
      const blob = new Blob([mediaData], { type: mediaType });
      formData.append('media', blob, 'media');

      const response = await this.client.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      
      return response.data;
    }, 'uploadMedia');
  }

  async deleteTweet(tweetId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/tweets/${tweetId}`);
    }, `deleteTweet(${tweetId})`);
  }

  async getTweet(tweetId: string): Promise<TwitterTweet> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get(`/tweets/${tweetId}`, {
        params: {
          expansions: 'author_id,attachments.media_keys,referenced_tweets.id',
          'tweet.fields': 'created_at,public_metrics,entities,attachments,conversation_id,in_reply_to_user_id,lang,possibly_sensitive,source',
          'media.fields': 'url,preview_image_url,alt_text,variants',
          'user.fields': 'name,username,profile_image_url,verified',
        },
      });
      
      return response.data.data;
    }, `getTweet(${tweetId})`);
  }

  async getUserTweets(userId: string, maxResults: number = 10, paginationToken?: string): Promise<{ tweets: TwitterTweet[]; nextToken?: string }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,entities',
        exclude: 'retweets,replies',
      };
      
      if (paginationToken) params.pagination_token = paginationToken;

      const response = await this.client.get(`/users/${userId}/tweets`, { params });
      
      return {
        tweets: response.data.data || [],
        nextToken: response.data.meta?.next_token,
      };
    }, `getUserTweets(${userId})`);
  }

  async getMe(): Promise<TwitterUser> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/users/me', {
        params: {
          'user.fields': 'description,profile_image_url,verified,protected,public_metrics,created_at,location,url,entities,pinned_tweet_id',
        },
      });
      
      // Map public_metrics to individual fields
      const user = response.data.data;
      if (user?.public_metrics) {
        user.followers_count = user.public_metrics.followers_count;
        user.following_count = user.public_metrics.following_count;
        user.tweet_count = user.public_metrics.tweet_count;
        user.listed_count = user.public_metrics.listed_count;
      }
      
      return user;
    }, 'getMe');
  }

  async getUser(userId: string): Promise<TwitterUser> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get(`/users/${userId}`, {
        params: {
          'user.fields': 'description,profile_image_url,verified,protected,public_metrics,created_at,location,url,entities,pinned_tweet_id',
        },
      });
      
      const user = response.data.data;
      if (user?.public_metrics) {
        user.followers_count = user.public_metrics.followers_count;
        user.following_count = user.public_metrics.following_count;
        user.tweet_count = user.public_metrics.tweet_count;
        user.listed_count = user.public_metrics.listed_count;
      }
      
      return user;
    }, `getUser(${userId})`);
  }

  async getUsersByIds(userIds: string[]): Promise<TwitterUser[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/users', {
        params: {
          ids: userIds.slice(0, 100).join(','),
          'user.fields': 'description,profile_image_url,verified,public_metrics',
        },
      });
      
      return response.data.data || [];
    }, `getUsersByIds(${userIds.length} users)`);
  }

  async getUsersByUsernames(usernames: string[]): Promise<TwitterUser[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/users/by', {
        params: {
          usernames: usernames.slice(0, 100).join(','),
          'user.fields': 'description,profile_image_url,verified,public_metrics',
        },
      });
      
      return response.data.data || [];
    }, `getUsersByUsernames(${usernames.length} users)`);
  }

  async searchTweets(query: string, maxResults: number = 10, paginationToken?: string): Promise<{ tweets: TwitterTweet[]; nextToken?: string }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {
        query,
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,entities,author_id',
        expansions: 'author_id',
        'user.fields': 'name,username,profile_image_url,verified',
      };
      
      if (paginationToken) params.next_token = paginationToken;

      const response = await this.client.get('/tweets/search/recent', { params });
      
      return {
        tweets: response.data.data || [],
        nextToken: response.data.meta?.next_token,
      };
    }, `searchTweets(${query})`);
  }

  async replyToTweet(tweetId: string, text: string): Promise<TwitterPostResponse> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.post('/tweets', {
        text,
        reply: { in_reply_to_tweet_id: tweetId },
      });
      
      return { id: response.data.data.id, text: response.data.data.text };
    }, `replyToTweet(${tweetId})`);
  }

  async quoteTweet(tweetId: string, text: string): Promise<TwitterPostResponse> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.post('/tweets', {
        text,
        quote_tweet_id: tweetId,
      });
      
      return { id: response.data.data.id, text: response.data.data.text };
    }, `quoteTweet(${tweetId})`);
  }

  async likeTweet(tweetId: string, userId?: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = userId || (await this.getMe()).id;
      await this.client.post(`/users/${authenticatedUser}/likes`, { tweet_id: tweetId });
    }, `likeTweet(${tweetId})`);
  }

  async unlikeTweet(tweetId: string, userId?: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = userId || (await this.getMe()).id;
      await this.client.delete(`/users/${authenticatedUser}/likes/${tweetId}`);
    }, `unlikeTweet(${tweetId})`);
  }

  async retweet(tweetId: string, userId?: string): Promise<{ id: string; retweeted: boolean }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = userId || (await this.getMe()).id;
      const response = await this.client.post(`/users/${authenticatedUser}/retweets`, { tweet_id: tweetId });
      return { id: response.data.data.id, retweeted: response.data.data.retweeted };
    }, `retweet(${tweetId})`);
  }

  async unretweet(tweetId: string, userId?: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = userId || (await this.getMe()).id;
      await this.client.delete(`/users/${authenticatedUser}/retweets/${tweetId}`);
    }, `unretweet(${tweetId})`);
  }

  async getTweetAnalytics(tweetId: string): Promise<{ 
    likes: number; 
    retweets: number; 
    replies: number; 
    quotes: number; 
    bookmarks: number;
    impressions: number;
  }> {
    return this.retryRequest(async () => {
      const tweet = await this.getTweet(tweetId);
      return {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0,
        bookmarks: tweet.public_metrics?.bookmark_count || 0,
        impressions: tweet.public_metrics?.impression_count || 0,
      };
    }, `getTweetAnalytics(${tweetId})`);
  }

  async followUser(targetUserId: string): Promise<{ following: boolean; pending_follow: boolean }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = await this.getMe();
      const response = await this.client.post(`/users/${authenticatedUser.id}/following`, { target_user_id: targetUserId });
      return response.data.data;
    }, `followUser(${targetUserId})`);
  }

  async unfollowUser(targetUserId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = await this.getMe();
      await this.client.delete(`/users/${authenticatedUser.id}/following/${targetUserId}`);
    }, `unfollowUser(${targetUserId})`);
  }

  async blockUser(targetUserId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = await this.getMe();
      await this.client.post(`/users/${authenticatedUser.id}/blocking`, { target_user_id: targetUserId });
    }, `blockUser(${targetUserId})`);
  }

  async unblockUser(targetUserId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = await this.getMe();
      await this.client.delete(`/users/${authenticatedUser.id}/blocking/${targetUserId}`);
    }, `unblockUser(${targetUserId})`);
  }

  async muteUser(targetUserId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = await this.getMe();
      await this.client.post(`/users/${authenticatedUser.id}/muting`, { target_user_id: targetUserId });
    }, `muteUser(${targetUserId})`);
  }

  async unmuteUser(targetUserId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const authenticatedUser = await this.getMe();
      await this.client.delete(`/users/${authenticatedUser.id}/muting/${targetUserId}`);
    }, `unmuteUser(${targetUserId})`);
  }

  async getFollowers(userId: string, maxResults: number = 100): Promise<TwitterUser[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get(`/users/${userId}/followers`, {
        params: {
          max_results: Math.min(maxResults, 1000),
          'user.fields': 'description,profile_image_url,verified,public_metrics',
        },
      });
      
      return response.data.data || [];
    }, `getFollowers(${userId})`);
  }

  async getFollowing(userId: string, maxResults: number = 100): Promise<TwitterUser[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get(`/users/${userId}/following`, {
        params: {
          max_results: Math.min(maxResults, 1000),
          'user.fields': 'description,profile_image_url,verified,public_metrics',
        },
      });
      
      return response.data.data || [];
    }, `getFollowing(${userId})`);
  }

  async getLikedTweets(userId: string, maxResults: number = 100): Promise<TwitterTweet[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get(`/users/${userId}/liked_tweets`, {
        params: {
          max_results: Math.min(maxResults, 100),
          'tweet.fields': 'created_at,public_metrics,author_id',
          expansions: 'author_id',
          'user.fields': 'username,name,profile_image_url',
        },
      });
      
      return response.data.data || [];
    }, `getLikedTweets(${userId})`);
  }

  async getTweetCounts(query: string): Promise<Array<{ start: string; end: string; tweet_count: number }>> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/tweets/counts/recent', {
        params: {
          query,
          granularity: 'day',
        },
      });
      
      return response.data.data || [];
    }, `getTweetCounts(${query})`);
  }
}