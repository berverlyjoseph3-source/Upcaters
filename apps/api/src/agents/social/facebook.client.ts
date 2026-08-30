// enterprise-ai-agent-platform/apps/api/src/agents/social/facebook.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  category_list?: Array<{ id: string; name: string }>;
  tasks?: string[];
  instagram_business_account?: { id: string };
  followers_count?: number;
  fan_count?: number;
}

export interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

export interface InstagramMediaResponse {
  id: string;
  media_id?: string;
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  updated_time: string;
  shares?: { count: number };
  reactions?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  permalink_url?: string;
}

export interface FacebookInsights {
  impressions: number;
  reach: number;
  engagement: number;
  reactions: number;
  comments: number;
  shares: number;
}

export class FacebookClient {
  private client: AxiosInstance | null = null;
  private accessToken: string = '';
  private pageAccessTokens: Map<string, string> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.facebook.apiUrl,
      params: { access_token: this.accessToken },
      timeout: apiConfig.timeouts.default,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Facebook API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Facebook API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Facebook token expired or invalid');
        } else if (error.response?.status === 429) {
          logger.warn('Facebook rate limit exceeded');
        }
        throw error;
      }
    );
  }

  async updateAccessToken(newToken: string): Promise<void> {
    this.accessToken = newToken;
    this.initializeClient();
  }

  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Facebook API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async getPages(): Promise<FacebookPage[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/me/accounts', {
        params: {
          fields: 'id,name,access_token,category,category_list,tasks,instagram_business_account,fan_count',
        },
      });
      
      const pages = response.data.data || [];
      for (const page of pages) {
        this.pageAccessTokens.set(page.id, page.access_token);
      }
      
      return pages;
    }, 'getPages');
  }

  async getPageAccessToken(pageId: string): Promise<string> {
    if (this.pageAccessTokens.has(pageId)) {
      return this.pageAccessTokens.get(pageId)!;
    }
    
    const pages = await this.getPages();
    const page = pages.find(p => p.id === pageId);
    if (!page) {
      throw new Error(`Page ${pageId} not found`);
    }
    
    return page.access_token;
  }

  async postToPage(pageId: string, content: string, mediaUrl?: string): Promise<FacebookPostResponse> {
    return this.retryRequest(async () => {
      const pageToken = await this.getPageAccessToken(pageId);

      if (mediaUrl) {
        const response = await axios.post(
          `${apiConfig.facebook.apiUrl}/${pageId}/photos`,
          {
            url: mediaUrl,
            caption: content,
            access_token: pageToken,
            published: true,
          }
        );
        return { id: response.data.id, post_id: response.data.post_id };
      } else {
        const response = await axios.post(
          `${apiConfig.facebook.apiUrl}/${pageId}/feed`,
          {
            message: content,
            access_token: pageToken,
          }
        );
        return { id: response.data.id };
      }
    }, `postToPage(${pageId})`);
  }

  async postToInstagram(pageId: string, imageUrl: string, caption: string): Promise<InstagramMediaResponse> {
    return this.retryRequest(async () => {
      const page = await this.getPageInfo(pageId);
      if (!page.instagram_business_account) {
        throw new Error('Page does not have an Instagram Business Account connected');
      }

      const igUserId = page.instagram_business_account.id;
      const pageToken = await this.getPageAccessToken(pageId);

      // Step 1: Create media container
      const createResponse = await axios.post(
        `${apiConfig.facebook.apiUrl}/${igUserId}/media`,
        {
          image_url: imageUrl,
          caption: caption,
          access_token: pageToken,
        }
      );

      const creationId = createResponse.data.id;

      // Step 2: Publish the media
      const publishResponse = await axios.post(
        `${apiConfig.facebook.apiUrl}/${igUserId}/media_publish`,
        {
          creation_id: creationId,
          access_token: pageToken,
        }
      );

      return { id: publishResponse.data.id, media_id: publishResponse.data.id };
    }, `postToInstagram(${pageId})`);
  }

  async postCarouselToInstagram(pageId: string, imageUrls: string[], caption: string): Promise<InstagramMediaResponse> {
    return this.retryRequest(async () => {
      const page = await this.getPageInfo(pageId);
      if (!page.instagram_business_account) {
        throw new Error('Page does not have an Instagram Business Account connected');
      }

      const igUserId = page.instagram_business_account.id;
      const pageToken = await this.getPageAccessToken(pageId);

      // Step 1: Create media containers for each image
      const containerIds: string[] = [];
      for (const imageUrl of imageUrls) {
        const createResponse = await axios.post(
          `${apiConfig.facebook.apiUrl}/${igUserId}/media`,
          {
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: pageToken,
          }
        );
        containerIds.push(createResponse.data.id);
      }

      // Step 2: Create carousel container
      const carouselResponse = await axios.post(
        `${apiConfig.facebook.apiUrl}/${igUserId}/media`,
        {
          media_type: 'CAROUSEL',
          children: containerIds,
          caption: caption,
          access_token: pageToken,
        }
      );

      // Step 3: Publish
      const publishResponse = await axios.post(
        `${apiConfig.facebook.apiUrl}/${igUserId}/media_publish`,
        {
          creation_id: carouselResponse.data.id,
          access_token: pageToken,
        }
      );

      return { id: publishResponse.data.id };
    }, `postCarouselToInstagram(${pageId})`);
  }

  async getPageInfo(pageId: string): Promise<FacebookPage> {
    return this.retryRequest(async () => {
      const pageToken = await this.getPageAccessToken(pageId);
      const response = await axios.get(
        `${apiConfig.facebook.apiUrl}/${pageId}`,
        {
          params: {
            fields: 'id,name,category,category_list,instagram_business_account,fan_count,followers_count',
            access_token: pageToken,
          },
        }
      );
      return response.data;
    }, `getPageInfo(${pageId})`);
  }

  async getPost(postId: string, pageId?: string): Promise<FacebookPost> {
    return this.retryRequest(async () => {
      let token = this.accessToken;
      if (pageId) {
        token = await this.getPageAccessToken(pageId);
      }
      
      const response = await axios.get(
        `${apiConfig.facebook.apiUrl}/${postId}`,
        {
          params: {
            fields: 'id,message,created_time,updated_time,shares,reactions.summary(true),comments.summary(true),permalink_url',
            access_token: token,
          },
        }
      );
      return response.data;
    }, `getPost(${postId})`);
  }

  async getPostAnalytics(postId: string, pageId?: string): Promise<FacebookInsights> {
    return this.retryRequest(async () => {
      let token = this.accessToken;
      if (pageId) {
        token = await this.getPageAccessToken(pageId);
      }

      const response = await axios.get(
        `${apiConfig.facebook.apiUrl}/${postId}/insights`,
        {
          params: {
            metric: 'post_impressions,post_reach,post_engaged_users,post_reactions_by_type_total,post_comments_count,post_shares_count',
            access_token: token,
          },
        }
      );

      const insights = response.data.data || [];
      const getValue = (metric: string) => {
        const item = insights.find((i: any) => i.name === metric);
        return item?.values?.[0]?.value || 0;
      };

      return {
        impressions: getValue('post_impressions'),
        reach: getValue('post_reach'),
        engagement: getValue('post_engaged_users'),
        reactions: getValue('post_reactions_by_type_total'),
        comments: getValue('post_comments_count'),
        shares: getValue('post_shares_count'),
      };
    }, `getPostAnalytics(${postId})`);
  }

  async deletePost(postId: string, pageId?: string): Promise<void> {
    await this.retryRequest(async () => {
      let token = this.accessToken;
      if (pageId) {
        token = await this.getPageAccessToken(pageId);
      }
      await axios.delete(`${apiConfig.facebook.apiUrl}/${postId}`, {
        params: { access_token: token },
      });
    }, `deletePost(${postId})`);
  }

  async getUserProfile(): Promise<{ id: string; name: string; email: string; picture: string }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/me', {
        params: { fields: 'id,name,email,picture' },
      });
      
      return {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        picture: response.data.picture?.data?.url || '',
      };
    }, 'getUserProfile');
  }

  async getInstagramBusinessAccount(pageId: string): Promise<{ id: string; username: string; name: string; biography?: string; followers_count?: number; media_count?: number } | null> {
    return this.retryRequest(async () => {
      const page = await this.getPageInfo(pageId);
      if (!page.instagram_business_account) return null;

      const igUserId = page.instagram_business_account.id;
      const pageToken = await this.getPageAccessToken(pageId);
      
      const response = await axios.get(
        `${apiConfig.facebook.apiUrl}/${igUserId}`,
        {
          params: {
            fields: 'id,username,name,biography,followers_count,media_count',
            access_token: pageToken,
          },
        }
      );
      
      return response.data;
    }, `getInstagramBusinessAccount(${pageId})`);
  }

  async getInstagramMedia(igUserId: string, pageId: string, limit: number = 20): Promise<any[]> {
    return this.retryRequest(async () => {
      const pageToken = await this.getPageAccessToken(pageId);
      const response = await axios.get(
        `${apiConfig.facebook.apiUrl}/${igUserId}/media`,
        {
          params: {
            fields: 'id,caption,media_url,permalink,timestamp,media_type,like_count,comments_count',
            limit,
            access_token: pageToken,
          },
        }
      );
      return response.data.data || [];
    }, `getInstagramMedia(${igUserId})`);
  }

  async refreshLongLivedToken(): Promise<string> {
    return this.retryRequest(async () => {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: apiConfig.facebook.appId,
          client_secret: apiConfig.facebook.appSecret,
          fb_exchange_token: this.accessToken,
        },
      });
      
      const newToken = response.data.access_token;
      await this.updateAccessToken(newToken);
      return newToken;
    }, 'refreshLongLivedToken');
  }

  async getPageInsights(pageId: string, since?: Date, until?: Date): Promise<Record<string, number>> {
    return this.retryRequest(async () => {
      const pageToken = await this.getPageAccessToken(pageId);
      
      const params: any = {
        metric: 'page_impressions,page_engaged_users,page_fans,page_fan_adds,page_fan_removes',
        access_token: pageToken,
      };
      
      if (since) params.since = Math.floor(since.getTime() / 1000);
      if (until) params.until = Math.floor(until.getTime() / 1000);

      const response = await axios.get(
        `${apiConfig.facebook.apiUrl}/${pageId}/insights`,
        { params }
      );

      const insights: Record<string, number> = {};
      for (const item of response.data.data || []) {
        insights[item.name] = item.values?.[0]?.value || 0;
      }
      
      return insights;
    }, `getPageInsights(${pageId})`);
  }
}