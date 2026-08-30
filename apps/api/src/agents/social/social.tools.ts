// enterprise-ai-agent-platform/apps/api/src/agents/social/social.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { LinkedInClient } from './linkedin.client';
import { FacebookClient } from './facebook.client';
import { TwitterClient } from './twitter.client';
import { OAuthProvider, Prisma } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { LinkedInOAuthService } from '../../auth/services/linkedin-oauth.service';
import { FacebookOAuthService } from '../../auth/services/facebook-oauth.service';
import { TwitterOAuthService } from '../../auth/services/twitter-oauth.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/client';
import { 
  SocialPlatform, 
  SchedulePostOptions, 
  PostResult, 
  AnalyticsRequest, 
  AnalyticsResult,
  BatchPostOptions,
  BatchPostResult,
  SocialAccountInfo,
} from './social.types';

export class SocialTools {
  /**
   * Post to LinkedIn
   */
  static postToLinkedInTool(): AgentTool {
    return {
      name: 'post_to_linkedin',
      description: 'Post content to LinkedIn',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Post content/text' },
        { name: 'mediaUrl', type: 'string', required: false, description: 'URL of image to attach' },
        { name: 'scheduleAt', type: 'string', required: false, description: 'Schedule date/time (ISO format)' },
      ],
      execute: async (params, context) => {
        const result = await this.postToLinkedIn(context.userId, params.content, params.mediaUrl);
        return result;
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Post to Instagram
   */
  static postToInstagramTool(): AgentTool {
    return {
      name: 'post_to_instagram',
      description: 'Post image/video to Instagram Business account',
      parameters: [
        { name: 'imageUrl', type: 'string', required: true, description: 'URL of image to post' },
        { name: 'caption', type: 'string', required: true, description: 'Post caption' },
        { name: 'scheduleAt', type: 'string', required: false, description: 'Schedule date/time (ISO format)' },
      ],
      execute: async (params, context) => {
        const result = await this.postToInstagram(context.userId, params.imageUrl, params.caption);
        return result;
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Post to Facebook
   */
  static postToFacebookTool(): AgentTool {
    return {
      name: 'post_to_facebook',
      description: 'Post content to Facebook Page',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Post content/text' },
        { name: 'mediaUrl', type: 'string', required: false, description: 'URL of image/video to attach' },
        { name: 'pageId', type: 'string', required: false, description: 'Facebook Page ID (uses default if not specified)' },
        { name: 'scheduleAt', type: 'string', required: false, description: 'Schedule date/time (ISO format)' },
      ],
      execute: async (params, context) => {
        const result = await this.postToFacebook(context.userId, params.content, params.mediaUrl, params.pageId);
        return result;
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Post to X (Twitter)
   */
  static postToXTool(): AgentTool {
    return {
      name: 'post_to_x',
      description: 'Post tweet to X (Twitter)',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Tweet content (max 280 chars)' },
        { name: 'mediaUrl', type: 'string', required: false, description: 'URL of image/video to attach' },
        { name: 'replyToId', type: 'string', required: false, description: 'ID of tweet to reply to' },
      ],
      execute: async (params, context) => {
        const result = await this.postToX(context.userId, params.content, params.mediaUrl, params.replyToId);
        return result;
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Schedule post
   */
  static schedulePostTool(): AgentTool {
    return {
      name: 'schedule_post',
      description: 'Schedule a post for future publishing',
      parameters: [
        { name: 'platform', type: 'string', required: true, description: 'Platform (linkedin, instagram, facebook, x_twitter)' },
        { name: 'content', type: 'string', required: true, description: 'Post content' },
        { name: 'scheduledAt', type: 'string', required: true, description: 'Schedule date/time (ISO format)' },
        { name: 'mediaUrls', type: 'array', required: false, description: 'Array of media URLs' },
      ],
      execute: async (params, context) => {
        return await this.schedulePost(context.userId, {
          platform: params.platform,
          content: params.content,
          mediaUrls: params.mediaUrls,
          scheduledAt: new Date(params.scheduledAt),
        });
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Get post analytics
   */
  static getPostAnalyticsTool(): AgentTool {
    return {
      name: 'get_post_analytics',
      description: 'Get engagement analytics for a post',
      parameters: [
        { name: 'platform', type: 'string', required: true, description: 'Platform (linkedin, instagram, facebook, x_twitter)' },
        { name: 'postId', type: 'string', required: true, description: 'Post ID from the platform' },
      ],
      execute: async (params, context) => {
        return await this.getPostAnalytics(context.userId, {
          platform: params.platform,
          postId: params.postId,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get connected accounts
   */
  static getConnectedAccountsTool(): AgentTool {
    return {
      name: 'get_connected_accounts',
      description: 'Get all connected social media accounts',
      parameters: [],
      execute: async (params, context) => {
        return await this.getConnectedAccounts(context.userId);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Batch post to multiple platforms
   */
  static batchPostTool(): AgentTool {
    return {
      name: 'batch_post',
      description: 'Post the same content to multiple platforms',
      parameters: [
        { name: 'platforms', type: 'array', required: true, description: 'Array of platforms to post to' },
        { name: 'content', type: 'string', required: true, description: 'Post content' },
        { name: 'mediaUrl', type: 'string', required: false, description: 'Media URL to attach' },
      ],
      execute: async (params, context) => {
        return await this.batchPost(context.userId, {
          posts: params.platforms.map((platform: string) => ({
            platform: platform as SocialPlatform,
            content: params.content,
            mediaUrls: params.mediaUrl ? [params.mediaUrl] : undefined,
            scheduledAt: new Date(),
          })),
          parallel: true,
          maxConcurrent: 3,
        });
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  /**
   * Get LinkedIn client for user
   */
  private static async getLinkedInClient(userId: string): Promise<LinkedInClient | null> {
    try {
      const token = await LinkedInOAuthService.getValidAccessToken(userId);
      if (!token) {
        logger.warn({ userId }, 'LinkedIn not connected');
        return null;
      }
      return new LinkedInClient(token);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get LinkedIn client');
      return null;
    }
  }

  /**
   * Get Facebook client for user
   */
  private static async getFacebookClient(userId: string): Promise<FacebookClient | null> {
    try {
      const token = await FacebookOAuthService.getValidAccessToken(userId, OAuthProvider.FACEBOOK);
      if (!token) {
        logger.warn({ userId }, 'Facebook not connected');
        return null;
      }
      return new FacebookClient(token);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Facebook client');
      return null;
    }
  }

  /**
   * Get Twitter client for user
   */
  private static async getTwitterClient(userId: string): Promise<TwitterClient | null> {
    try {
      const connection = await prisma.oAuthConnection.findFirst({
        where: {
          userId,
          provider: OAuthProvider.X_TWITTER,
        },
      });

      if (!connection) {
        logger.warn({ userId }, 'Twitter not connected');
        return null;
      }

      // Decrypt tokens
      const accessToken = connection.accessToken; // Would need decryption
      const accessSecret = ''; // Would need to be stored separately

      return new TwitterClient(accessToken, accessSecret);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Twitter client');
      return null;
    }
  }

  /**
   * Post to LinkedIn
   */
  static async postToLinkedIn(
    userId: string,
    content: string,
    mediaUrl?: string
  ): Promise<PostResult> {
    try {
      const client = await this.getLinkedInClient(userId);
      if (!client) {
        return {
          success: false,
          platform: SocialPlatform.LINKEDIN,
          publishedAt: new Date(),
          error: 'LinkedIn account not connected. Please connect in Settings.',
        };
      }

      let result;
      if (mediaUrl) {
        result = await client.createImagePost({ text: content, mediaUrl });
      } else {
        result = await client.createTextPost(content);
      }

      return {
        success: true,
        postId: result.id,
        platform: SocialPlatform.LINKEDIN,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, userId, content: content.substring(0, 100) }, 'Failed to post to LinkedIn');
      return {
        success: false,
        platform: SocialPlatform.LINKEDIN,
        publishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Failed to post to LinkedIn',
      };
    }
  }

  /**
   * Post to Instagram
   */
  static async postToInstagram(
    userId: string,
    imageUrl: string,
    caption: string
  ): Promise<PostResult> {
    try {
      const fbClient = await this.getFacebookClient(userId);
      if (!fbClient) {
        return {
          success: false,
          platform: SocialPlatform.INSTAGRAM,
          publishedAt: new Date(),
          error: 'Facebook/Instagram account not connected. Please connect in Settings.',
        };
      }

      // Find page with Instagram Business Account
      const pages = await fbClient.getPages();
      const pageWithIg = pages.find(p => p.instagram_business_account);
      
      if (!pageWithIg) {
        return {
          success: false,
          platform: SocialPlatform.INSTAGRAM,
          publishedAt: new Date(),
          error: 'No Instagram Business Account found on connected Facebook pages.',
        };
      }

      const igUserId = pageWithIg.instagram_business_account!.id;
      
      // Step 1: Create media container
      const createResponse = await fbClient.postToInstagram(pageWithIg.id, imageUrl, caption);

      return {
        success: true,
        postId: createResponse.id || `ig_${Date.now()}`,
        platform: SocialPlatform.INSTAGRAM,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, userId, imageUrl }, 'Failed to post to Instagram');
      return {
        success: false,
        platform: SocialPlatform.INSTAGRAM,
        publishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Failed to post to Instagram',
      };
    }
  }

  /**
   * Post to Facebook
   */
  static async postToFacebook(
    userId: string,
    content: string,
    mediaUrl?: string,
    pageId?: string
  ): Promise<PostResult> {
    try {
      const fbClient = await this.getFacebookClient(userId);
      if (!fbClient) {
        return {
          success: false,
          platform: SocialPlatform.FACEBOOK,
          publishedAt: new Date(),
          error: 'Facebook account not connected. Please connect in Settings.',
        };
      }

      let targetPageId = pageId;
      if (!targetPageId) {
        const pages = await fbClient.getPages();
        if (pages.length === 0) {
          return {
            success: false,
            platform: SocialPlatform.FACEBOOK,
            publishedAt: new Date(),
            error: 'No Facebook Pages found. Create a Page to post.',
          };
        }
        targetPageId = pages[0].id;
      }

      const result = await fbClient.postToPage(targetPageId, content, mediaUrl);

      return {
        success: true,
        postId: result.id || `fb_${Date.now()}`,
        platform: SocialPlatform.FACEBOOK,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, userId, content: content.substring(0, 100) }, 'Failed to post to Facebook');
      return {
        success: false,
        platform: SocialPlatform.FACEBOOK,
        publishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Failed to post to Facebook',
      };
    }
  }

  /**
   * Post to X (Twitter)
   */
  static async postToX(
    userId: string,
    content: string,
    mediaUrl?: string,
    replyToId?: string
  ): Promise<PostResult> {
    try {
      if (content.length > 280) {
        content = content.substring(0, 277) + '...';
      }

      const twitterClient = await this.getTwitterClient(userId);
      if (!twitterClient) {
        return {
          success: false,
          platform: SocialPlatform.X_TWITTER,
          publishedAt: new Date(),
          error: 'X (Twitter) account not connected. Please connect in Settings.',
        };
      }

      let result;
      if (mediaUrl) {
        // Download media and post with attachment
        const imageResponse = await fetch(mediaUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        result = await twitterClient.postTweetWithMedia(content, imageBuffer, 'image/jpeg');
      } else if (replyToId) {
        result = await twitterClient.replyToTweet(replyToId, content);
      } else {
        result = await twitterClient.postTweet(content);
      }

      return {
        success: true,
        postId: result.id,
        platform: SocialPlatform.X_TWITTER,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, userId, content: content.substring(0, 100) }, 'Failed to post to X');
      return {
        success: false,
        platform: SocialPlatform.X_TWITTER,
        publishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Failed to post to X',
      };
    }
  }

  /**
   * Schedule a post
   */
  static async schedulePost(
    userId: string,
    options: SchedulePostOptions
  ): Promise<{ success: boolean; scheduledPostId: string; scheduledAt: Date }> {
    try {
      const scheduledPost = await prisma.scheduledPost.create({
        data: {
          userId,
          platform: options.platform.toUpperCase() as any,
          content: options.content,
          mediaUrls: options.mediaUrls || [],
          scheduledAt: options.scheduledAt,
          status: 'SCHEDULED',
          metadata: (options.metadata || {}) as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info({
        userId,
        platform: options.platform,
        scheduledAt: options.scheduledAt,
        postId: scheduledPost.id,
      }, 'Post scheduled successfully');

      return {
        success: true,
        scheduledPostId: scheduledPost.id,
        scheduledAt: options.scheduledAt,
      };
    } catch (error) {
      logger.error({ error, userId, options }, 'Failed to schedule post');
      throw error;
    }
  }

  /**
   * Get post analytics
   */
  static async getPostAnalytics(
    userId: string,
    request: AnalyticsRequest
  ): Promise<AnalyticsResult> {
    try {
      let metrics = { likes: 0, comments: 0, shares: 0, views: 0 };

      switch (request.platform) {
        case SocialPlatform.LINKEDIN: {
          const linkedInClient = await this.getLinkedInClient(userId);
          if (linkedInClient && request.postId) {
            const analytics = await linkedInClient.getPostAnalytics(request.postId);
            metrics = {
              likes: analytics.likes || 0,
              comments: analytics.comments || 0,
              shares: analytics.shares || 0,
              views: 0,
            };
          }
          break;
        }
        case SocialPlatform.FACEBOOK: {
          const fbClient = await this.getFacebookClient(userId);
          if (fbClient && request.postId) {
            const analytics = await fbClient.getPostAnalytics(request.postId);
            metrics = {
              likes: analytics.reactions || 0,
              comments: analytics.comments || 0,
              shares: analytics.shares || 0,
              views: analytics.impressions || 0,
            };
          }
          break;
        }
        case SocialPlatform.X_TWITTER: {
          const twitterClient = await this.getTwitterClient(userId);
          if (twitterClient && request.postId) {
            const analytics = await twitterClient.getTweetAnalytics(request.postId);
            metrics = {
              likes: analytics.likes || 0,
              comments: analytics.replies || 0,
              shares: analytics.retweets || 0,
              views: 0,
            };
          }
          break;
        }
      }

      return {
        platform: request.platform as any,
        posts: [{
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          views: metrics.views,
          engagementRate: 0,
          updatedAt: new Date(),
        }],
        totalEngagement: metrics,
        averageEngagementRate: 0,
      };
    } catch (error) {
      logger.error({ error, userId, request }, 'Failed to get post analytics');
      throw error;
    }
  }

  /**
   * Get connected social accounts
   */
  private static async getConnectedAccounts(userId: string): Promise<SocialAccountInfo[]> {
    try {
      const accounts: SocialAccountInfo[] = [];

      // Check LinkedIn connection
      try {
        const linkedInConnected = await LinkedInOAuthService.isConnected(userId);
        if (linkedInConnected) {
          accounts.push({
            platform: SocialPlatform.LINKEDIN,
            accountId: `linkedin_${userId}`,
            accountName: 'LinkedIn Account',
            isConnected: true,
          });
        }
      } catch (error) {
        logger.warn({ error, userId }, 'Failed to check LinkedIn connection');
      }

      // Check Facebook connection
      try {
        const facebookConnected = await FacebookOAuthService.isConnected(userId);
        if (facebookConnected) {
          accounts.push({
            platform: SocialPlatform.FACEBOOK,
            accountId: `facebook_${userId}`,
            accountName: 'Facebook Account',
            isConnected: true,
          });
        }
      } catch (error) {
        logger.warn({ error, userId }, 'Failed to check Facebook connection');
      }

      // Check X/Twitter connection
      try {
        const xConnected = await TwitterOAuthService.isConnected(userId);
        if (xConnected) {
          accounts.push({
            platform: SocialPlatform.X_TWITTER,
            accountId: `x_${userId}`,
            accountName: 'X (Twitter) Account',
            isConnected: true,
          });
        }
      } catch (error) {
        logger.warn({ error, userId }, 'Failed to check Twitter connection');
      }

      return accounts;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get connected accounts');
      return [];
    }
  }

  /**
   * Batch post to multiple platforms
   */
  static async batchPost(
    userId: string,
    options: BatchPostOptions
  ): Promise<BatchPostResult> {
    const startTime = Date.now();
    const results: PostResult[] = [];

    const postToPlatform = async (post: SchedulePostOptions): Promise<PostResult> => {
      switch (post.platform) {
        case SocialPlatform.LINKEDIN:
          return await this.postToLinkedIn(userId, post.content, post.mediaUrls?.[0]);
        case SocialPlatform.INSTAGRAM:
          return await this.postToInstagram(userId, post.mediaUrls?.[0] || '', post.content);
        case SocialPlatform.FACEBOOK:
          return await this.postToFacebook(userId, post.content, post.mediaUrls?.[0]);
        case SocialPlatform.X_TWITTER:
          return await this.postToX(userId, post.content, post.mediaUrls?.[0]);
        default:
          return {
            success: false,
            platform: post.platform,
            publishedAt: new Date(),
            error: `Unsupported platform: ${post.platform}`,
          };
      }
    };

    if (options.parallel && options.posts.length > 1) {
      // Parallel execution with concurrency limit
      const chunks = [];
      for (let i = 0; i < options.posts.length; i += options.maxConcurrent!) {
        chunks.push(options.posts.slice(i, i + options.maxConcurrent!));
      }

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(postToPlatform));
        results.push(...chunkResults);
      }
    } else {
      // Sequential execution
      for (const post of options.posts) {
        const result = await postToPlatform(post);
        results.push(result);
      }
    }

    const totalSuccess = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    return {
      results,
      totalSuccess,
      totalFailed,
      totalTimeMs: Date.now() - startTime,
    };
  }
}