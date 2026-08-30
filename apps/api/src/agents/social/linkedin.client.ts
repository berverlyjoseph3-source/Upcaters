// enterprise-ai-agent-platform/apps/api/src/agents/social/linkedin.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface LinkedInProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  headline?: string;
  location?: string;
  industry?: string;
  summary?: string;
}

export interface LinkedInPostResponse {
  id: string;
  author: string;
  lifecycleState: string;
  created: number;
  lastModified: number;
}

export interface LinkedInShareContent {
  text: string;
  mediaUrl?: string;
  mediaTitle?: string;
  mediaDescription?: string;
}

export interface LinkedInOrganization {
  id: string;
  name: string;
  vanityName?: string;
  localizedName?: string;
  logoUrl?: string;
}

export class LinkedInClient {
  private client: AxiosInstance | null = null;
  private accessToken: string = '';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.linkedin.apiUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202312',
      },
      timeout: apiConfig.timeouts.default,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'LinkedIn API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'LinkedIn API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('LinkedIn token expired or invalid');
        } else if (error.response?.status === 429) {
          logger.warn('LinkedIn rate limit exceeded');
        }
        throw error;
      }
    );
  }

  async updateAccessToken(newToken: string): Promise<void> {
    this.accessToken = newToken;
    this.initializeClient();
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn({ attempt, delay, context, error: lastError.message }, 'LinkedIn API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async getProfile(): Promise<LinkedInProfile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');

      const [profileResponse, emailResponse] = await Promise.all([
        this.client.get('/me', {
          params: { projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,industry,summary)' },
        }),
        this.client.get('/emailAddress?q=members&projection=(elements*(handle~))'),
      ]);

      const profile = profileResponse.data;
      const email = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress;

      let profilePicture: string | undefined;
      const displayImage = profile.profilePicture?.['displayImage~'];
      if (displayImage?.elements?.length > 0) {
        profilePicture = displayImage.elements[0].identifiers?.[0]?.identifier;
      }

      return {
        id: profile.id,
        firstName: profile.firstName?.localized?.en_US,
        lastName: profile.lastName?.localized?.en_US,
        email,
        profilePicture,
        headline: profile.headline?.localized?.en_US,
        industry: profile.industry?.localized?.en_US,
        summary: profile.summary?.localized?.en_US,
      };
    }, 'getProfile');
  }

  async createTextPost(content: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<LinkedInPostResponse> {
    return this.retryRequest(async () => {
      const profile = await this.getProfile();
      const author = `urn:li:person:${profile.id}`;

      const postData = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };

      const response = await this.client!.post('/ugcPosts', postData);
      return {
        id: response.data.id,
        author: response.data.author,
        lifecycleState: response.data.lifecycleState,
        created: response.data.created,
        lastModified: response.data.lastModified,
      };
    }, 'createTextPost');
  }

  async createImagePost(content: LinkedInShareContent): Promise<LinkedInPostResponse> {
    return this.retryRequest(async () => {
      const profile = await this.getProfile();
      const author = `urn:li:person:${profile.id}`;

      // Step 1: Register the image upload
      const registerResponse = await this.client!.post('/assets?action=registerUpload', {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: author,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      });

      const uploadUrl = registerResponse.data.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;
      const asset = registerResponse.data.value.asset;

      // Step 2: Upload the image
      if (content.mediaUrl) {
        const imageResponse = await axios.get(content.mediaUrl, { responseType: 'arraybuffer' });
        await axios.put(uploadUrl, imageResponse.data, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }

      // Step 3: Create the post with image
      const postData = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content.text },
            shareMediaCategory: 'IMAGE',
            media: [
              {
                status: 'READY',
                description: { text: content.mediaTitle || content.text.substring(0, 200) },
                media: asset,
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await this.client!.post('/ugcPosts', postData);
      return {
        id: response.data.id,
        author: response.data.author,
        lifecycleState: response.data.lifecycleState,
        created: response.data.created,
        lastModified: response.data.lastModified,
      };
    }, 'createImagePost');
  }

  async createArticlePost(title: string, content: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<any> {
    return this.retryRequest(async () => {
      const profile = await this.getProfile();
      const author = `urn:li:person:${profile.id}`;

      const articleData = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: title },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                description: { text: title },
                originalUrl: '',
                title: { text: title },
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };

      const response = await this.client!.post('/ugcPosts', articleData);
      return response.data;
    }, 'createArticlePost');
  }

  async deletePost(postId: string): Promise<void> {
    await this.retryRequest(async () => {
      await this.client!.delete(`/ugcPosts/${postId}`);
    }, `deletePost(${postId})`);
  }

  async getPost(postId: string): Promise<any> {
    return this.retryRequest(async () => {
      const response = await this.client!.get(`/ugcPosts/${postId}`);
      return response.data;
    }, `getPost(${postId})`);
  }

  async getPostAnalytics(postId: string): Promise<{ likes: number; comments: number; shares: number; impressions: number }> {
    return this.retryRequest(async () => {
      const response = await this.client!.get(`/socialActions/${postId}`);
      return {
        likes: response.data.likesSummary?.totalLikes || 0,
        comments: response.data.commentsSummary?.totalComments || 0,
        shares: response.data.sharesSummary?.totalShares || 0,
        impressions: response.data.impressionSummary?.totalImpressions || 0,
      };
    }, `getPostAnalytics(${postId})`);
  }

  async getOrganizations(): Promise<LinkedInOrganization[]> {
    return this.retryRequest(async () => {
      const response = await this.client!.get('/organizationalEntityAcls', {
        params: { q: 'roleAssignee', role: 'ADMINISTRATOR', state: 'APPROVED' },
      });
      return (response.data.elements || []).map((e: any) => ({
        id: e.organizationalTarget?.split(':').pop(),
        name: e.organizationalTargetName?.localized?.en_US || '',
      }));
    }, 'getOrganizations');
  }

  async getOrganizationPosts(organizationId: string, maxResults: number = 10): Promise<any[]> {
    return this.retryRequest(async () => {
      const response = await this.client!.get(`/organizations/${organizationId}/posts`, {
        params: { q: 'author', count: maxResults },
      });
      return response.data.elements || [];
    }, `getOrganizationPosts(${organizationId})`);
  }

  async getConnections(): Promise<any[]> {
    return this.retryRequest(async () => {
      const response = await this.client!.get('/connections', {
        params: { q: 'viewer', count: 100 },
      });
      return response.data.elements || [];
    }, 'getConnections');
  }

  async searchPeople(query: string, maxResults: number = 20): Promise<any[]> {
    return this.retryRequest(async () => {
      const response = await this.client!.get('/search/people', {
        params: { q: 'keywords', keywords: query, count: maxResults },
      });
      return response.data.elements || [];
    }, `searchPeople(${query})`);
  }
}