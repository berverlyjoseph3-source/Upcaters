// enterprise-ai-agent-platform/apps/api/src/agents/social/social.agent.ts
import { BaseAgent } from '../core/base.agent';
import { LinkedInClient } from './linkedin.client';
import { FacebookClient } from './facebook.client';
import { TwitterClient } from './twitter.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { LinkedInOAuthService } from '../../auth/services/linkedin-oauth.service';
import { FacebookOAuthService } from '../../auth/services/facebook-oauth.service';
import { TwitterOAuthService } from '../../auth/services/twitter-oauth.service';
import { AgentType, AgentRequest, AgentContext, AgentResponse, StreamingChunk } from '../../types/agent.types';
import { logger } from '../../utils/logger';
import { OpenAIService } from '../../services/ai/openai.service';
import { prisma } from '../../db/client';
import { SocialTools } from './social.tools';
import { SocialPlatform } from './social.types';

export class SocialAgent extends BaseAgent {
  constructor() {
    super(
      AgentType.SOCIAL,
      'Social Agent',
      'Post to LinkedIn, Instagram, Facebook, and X (Twitter)',
      '1.0.0'
    );
  }

  protected registerTools(): void {
    this.registerTool(SocialTools.postToLinkedInTool());
    this.registerTool(SocialTools.postToInstagramTool());
    this.registerTool(SocialTools.postToFacebookTool());
    this.registerTool(SocialTools.postToXTool());
    this.registerTool(SocialTools.schedulePostTool());
    this.registerTool(SocialTools.getPostAnalyticsTool());
    this.registerTool(SocialTools.getConnectedAccountsTool());
    this.registerTool(SocialTools.batchPostTool());
  }

  /**
   * Get LinkedIn client for user
   */
  private async getLinkedInClient(userId: string): Promise<LinkedInClient | null> {
    try {
      const token = await LinkedInOAuthService.getValidAccessToken(userId);
      if (!token) return null;
      return new LinkedInClient(token);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get LinkedIn client');
      return null;
    }
  }

  /**
   * Get Facebook client for user
   */
  private async getFacebookClient(userId: string): Promise<FacebookClient | null> {
    try {
      const token = await FacebookOAuthService.getValidAccessToken(userId, OAuthProvider.FACEBOOK);
      if (!token) return null;
      return new FacebookClient(token);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Facebook client');
      return null;
    }
  }

  /**
   * Get Twitter client for user
   */
  private async getTwitterClient(userId: string): Promise<TwitterClient | null> {
    try {
      const connection = await prisma.oAuthConnection.findFirst({
        where: {
          userId,
          provider: OAuthProvider.X_TWITTER,
        },
      });

      if (!connection) return null;

      // In production, decrypt tokens properly
      const accessToken = connection.accessToken;
      const accessSecret = ''; // Would be stored separately

      return new TwitterClient(accessToken, accessSecret);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Twitter client');
      return null;
    }
  }

  /**
   * Check if agent can handle the request
   */
  canHandle(request: AgentRequest): boolean {
    const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
    
    const socialKeywords = [
      'post', 'tweet', 'linkedin', 'instagram', 'facebook',
      'social', 'share', 'publish', 'schedule', 'x',
      'twitter', 'social media', 'feed', 'timeline',
      'update status', 'write post', 'create post',
      'analytics', 'engagement', 'followers'
    ];
    
    return socialKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * Execute social agent logic
   */
  protected async doExecute(request: AgentRequest, context: AgentContext): Promise<any> {
    const startTime = Date.now();
    const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
    const lowerInput = input.toLowerCase();

    try {
      // Check connected accounts
      const connectedAccounts = await this.getConnectedAccounts(context.userId);
      const connectedPlatforms = connectedAccounts.filter(a => a.isConnected).map(a => a.platform);

      if (connectedPlatforms.length === 0) {
        return {
          success: false,
          message: 'No social media accounts connected. Please connect LinkedIn, Facebook, Instagram, or X (Twitter) in Settings.',
          action: 'connect_account',
          availablePlatforms: ['linkedin', 'instagram', 'facebook', 'x_twitter'],
        };
      }

      // Handle analytics
      if (this.isAnalyticsRequest(lowerInput)) {
        return await this.handleAnalytics(context.userId, input, connectedPlatforms);
      }

      // Handle scheduled posts
      if (this.isScheduleRequest(lowerInput)) {
        return await this.handleSchedulePost(context.userId, input, connectedPlatforms);
      }

      // Handle batch/multi-platform post
      if (this.isBatchRequest(lowerInput)) {
        return await this.handleBatchPost(context.userId, input, connectedPlatforms);
      }

      // Handle connected accounts
      if (this.isAccountsRequest(lowerInput)) {
        return await this.handleConnectedAccounts(connectedAccounts);
      }

      // Handle single platform post
      return await this.handlePlatformPost(context.userId, input, connectedPlatforms);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Social agent execution failed');
      
      return {
        success: false,
        message: `Social media operation failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  private isAnalyticsRequest(input: string): boolean {
    const keywords = ['analytics', 'engagement', 'stats', 'statistics', 'performance', 'metrics', 'insights', 'reach', 'impressions'];
    return keywords.some(k => input.includes(k));
  }

  private isScheduleRequest(input: string): boolean {
    const keywords = ['schedule', 'later', 'future', 'plan', 'queue', 'tomorrow', 'next week', 'at specific time'];
    return keywords.some(k => input.includes(k));
  }

  private isBatchRequest(input: string): boolean {
    const keywords = ['all platforms', 'everywhere', 'multiple', 'batch', 'bulk', 'all social', 'cross post', 'multi-platform'];
    return keywords.some(k => input.includes(k));
  }

  private isAccountsRequest(input: string): boolean {
    const keywords = ['connected', 'accounts', 'connections', 'linked accounts', 'social accounts', 'what platforms'];
    return keywords.some(k => input.includes(k));
  }

  /**
   * Detect target platform from input
   */
  private detectPlatform(input: string): SocialPlatform | null {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('linkedin')) return SocialPlatform.LINKEDIN;
    if (lowerInput.includes('instagram') || lowerInput.includes('ig')) return SocialPlatform.INSTAGRAM;
    if (lowerInput.includes('facebook') || lowerInput.includes('fb')) return SocialPlatform.FACEBOOK;
    if (lowerInput.includes('twitter') || lowerInput.includes('x post') || lowerInput.includes('tweet')) return SocialPlatform.X_TWITTER;
    
    return null;
  }

  /**
   * Extract content from input
   */
  private extractContent(input: string): string {
    let content = input;
    
    // Remove action words
    const actionWords = [
      'post', 'share', 'publish', 'tweet', 'update',
      'to linkedin', 'to instagram', 'to facebook', 'to twitter', 'to x',
      'on linkedin', 'on instagram', 'on facebook', 'on twitter',
      'schedule', 'create', 'write'
    ];
    
    for (const word of actionWords) {
      content = content.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    }
    
    // Remove platform mentions
    const platforms = ['linkedin', 'instagram', 'facebook', 'twitter', 'x'];
    for (const platform of platforms) {
      content = content.replace(new RegExp(`\\b${platform}\\b`, 'gi'), '');
    }
    
    // Remove quotes
    content = content.replace(/^["']|["']$/g, '');
    
    return content.trim();
  }

  /**
   * Extract media URL from input
   */
  private extractMediaUrl(input: string): string | undefined {
    const urlMatch = input.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|mov|avi)/i);
    return urlMatch ? urlMatch[0] : undefined;
  }

  /**
   * Get connected accounts
   */
  private async getConnectedAccounts(userId: string): Promise<Array<{ platform: SocialPlatform; accountId: string; accountName: string; isConnected: boolean }>> {
    const accounts: Array<{ platform: SocialPlatform; accountId: string; accountName: string; isConnected: boolean }> = [];

    // Check LinkedIn
    try {
      const linkedInConnected = await LinkedInOAuthService.isConnected(userId);
      accounts.push({
        platform: SocialPlatform.LINKEDIN,
        accountId: `linkedin_${userId}`,
        accountName: 'LinkedIn',
        isConnected: linkedInConnected,
      });
    } catch (error) {
      accounts.push({
        platform: SocialPlatform.LINKEDIN,
        accountId: 'unknown',
        accountName: 'LinkedIn',
        isConnected: false,
      });
    }

    // Check Facebook/Instagram
    try {
      const facebookConnected = await FacebookOAuthService.isConnected(userId);
      accounts.push({
        platform: SocialPlatform.FACEBOOK,
        accountId: `facebook_${userId}`,
        accountName: 'Facebook',
        isConnected: facebookConnected,
      });
      accounts.push({
        platform: SocialPlatform.INSTAGRAM,
        accountId: `instagram_${userId}`,
        accountName: 'Instagram',
        isConnected: facebookConnected,
      });
    } catch (error) {
      accounts.push({ platform: SocialPlatform.FACEBOOK, accountId: 'unknown', accountName: 'Facebook', isConnected: false });
      accounts.push({ platform: SocialPlatform.INSTAGRAM, accountId: 'unknown', accountName: 'Instagram', isConnected: false });
    }

    // Check Twitter/X
    try {
      const xConnected = await TwitterOAuthService.isConnected(userId);
      accounts.push({
        platform: SocialPlatform.X_TWITTER,
        accountId: `x_${userId}`,
        accountName: 'X (Twitter)',
        isConnected: xConnected,
      });
    } catch (error) {
      accounts.push({ platform: SocialPlatform.X_TWITTER, accountId: 'unknown', accountName: 'X (Twitter)', isConnected: false });
    }

    return accounts;
  }

  /**
   * Handle single platform post
   */
  private async handlePlatformPost(userId: string, input: string, connectedPlatforms: string[]): Promise<any> {
    try {
      const detectedPlatform = this.detectPlatform(input);
      let content = this.extractContent(input);
      const mediaUrl = this.extractMediaUrl(input);

      if (!content || content.length < 1) {
        return {
          success: false,
          message: 'Please provide content to post.',
          action: 'provide_content',
        };
      }

      let targetPlatform = detectedPlatform;

      if (!targetPlatform) {
        // Try to use the first connected platform
        const mappedPlatform = connectedPlatforms[0];
        if (!mappedPlatform) {
          return {
            success: false,
            message: 'Please specify which platform to post to. Connected platforms: ' + connectedPlatforms.join(', '),
            action: 'specify_platform',
            connectedPlatforms,
          };
        }
        targetPlatform = mappedPlatform as SocialPlatform;
      }

      // Check if platform is connected
      if (!connectedPlatforms.includes(targetPlatform)) {
        return {
          success: false,
          message: `${targetPlatform} is not connected. Please connect your account in Settings.`,
          action: 'connect_account',
          platform: targetPlatform,
        };
      }

      let result;

      switch (targetPlatform) {
        case SocialPlatform.LINKEDIN:
          result = await SocialTools.postToLinkedIn(userId, content, mediaUrl);
          break;
        case SocialPlatform.INSTAGRAM:
          if (!mediaUrl) {
            return {
              success: false,
              message: 'Instagram posts require an image. Please provide an image URL.',
              action: 'provide_image',
            };
          }
          result = await SocialTools.postToInstagram(userId, mediaUrl, content);
          break;
        case SocialPlatform.FACEBOOK:
          result = await SocialTools.postToFacebook(userId, content, mediaUrl);
          break;
        case SocialPlatform.X_TWITTER:
          if (content.length > 280) {
            content = content.substring(0, 277) + '...';
          }
          result = await SocialTools.postToX(userId, content, mediaUrl);
          break;
        default:
          return {
            success: false,
            message: `Unsupported platform: ${targetPlatform}`,
          };
      }

      return {
        success: result.success,
        message: result.success ? `Posted to ${targetPlatform} successfully!` : `Failed to post to ${targetPlatform}`,
        platform: targetPlatform,
        postId: result.postId,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Post failed';
      logger.error({ error, userId }, 'Platform post failed');
      
      return {
        success: false,
        message: `Failed to post: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle batch/multi-platform post
   */
  private async handleBatchPost(userId: string, input: string, connectedPlatforms: string[]): Promise<any> {
    try {
      const content = this.extractContent(input);
      const mediaUrl = this.extractMediaUrl(input);

      if (!content || content.length < 1) {
        return {
          success: false,
          message: 'Please provide content to post.',
          action: 'provide_content',
        };
      }

      // Determine platforms to post to
      let targetPlatforms: string[];
      const explicitPlatforms = input.match(/on\s+(linkedin|instagram|facebook|twitter|x)(?:\s+and\s+(linkedin|instagram|facebook|twitter|x))*/gi);
      
      if (explicitPlatforms) {
        targetPlatforms = explicitPlatforms
          .map(p => p.toLowerCase().replace('on ', '').trim())
          .flatMap(p => p.split(/\s+and\s+/));
      } else {
        // Use all connected platforms
        targetPlatforms = connectedPlatforms;
      }

      if (targetPlatforms.length === 0) {
        return {
          success: false,
          message: 'No platforms available for posting.',
          action: 'connect_account',
        };
      }

      // Filter to only connected platforms
      const availablePlatforms = targetPlatforms.filter(p => connectedPlatforms.includes(p));
      
      if (availablePlatforms.length === 0) {
        return {
          success: false,
          message: 'None of the specified platforms are connected.',
          action: 'connect_account',
          requestedPlatforms: targetPlatforms,
          connectedPlatforms,
        };
      }

      const results = await SocialTools.batchPost(userId, {
        posts: availablePlatforms.map(platform => ({
          platform: platform as SocialPlatform,
          content: platform === SocialPlatform.X_TWITTER ? content.substring(0, 280) : content,
          mediaUrls: mediaUrl ? [mediaUrl] : undefined,
          scheduledAt: new Date(),
        })),
        parallel: true,
        maxConcurrent: 3,
      });

      return {
        success: results.totalFailed === 0,
        message: `Posted to ${results.totalSuccess} of ${availablePlatforms.length} platforms`,
        results: results.results,
        totalSuccess: results.totalSuccess,
        totalFailed: results.totalFailed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch post failed';
      logger.error({ error, userId }, 'Batch post failed');
      
      return {
        success: false,
        message: `Batch post failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle schedule post
   */
  private async handleSchedulePost(userId: string, input: string, connectedPlatforms: string[]): Promise<any> {
    try {
      const content = this.extractContent(input);
      const mediaUrl = this.extractMediaUrl(input);
      const detectedPlatform = this.detectPlatform(input);

      if (!content || content.length < 1) {
        return {
          success: false,
          message: 'Please provide content to schedule.',
          action: 'provide_content',
        };
      }

      // Extract schedule time
      const scheduleMatch = input.match(/(?:schedule|post)\s+(?:at|on|for)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:tomorrow|today)?)/i);
      const dateMatch = input.match(/(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?))/);
      
      let scheduledAt: Date;
      if (dateMatch) {
        scheduledAt = new Date(dateMatch[1]);
      } else if (scheduleMatch) {
        // Parse relative time
        scheduledAt = new Date();
        const timeStr = scheduleMatch[1];
        // Simple parsing - in production use a proper date parser
        if (timeStr.includes('tomorrow')) {
          scheduledAt.setDate(scheduledAt.getDate() + 1);
        }
      } else {
        // Default to 1 hour from now
        scheduledAt = new Date(Date.now() + 3600000);
      }

      const platform = detectedPlatform || connectedPlatforms[0] as SocialPlatform;

      const result = await SocialTools.schedulePost(userId, {
        platform,
        content: platform === SocialPlatform.X_TWITTER ? content.substring(0, 280) : content,
        mediaUrls: mediaUrl ? [mediaUrl] : undefined,
        scheduledAt,
      });

      return {
        success: result.success,
        message: `Post scheduled for ${scheduledAt.toLocaleString()} on ${platform}`,
        scheduledPostId: result.scheduledPostId,
        scheduledAt: result.scheduledAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Schedule post failed';
      logger.error({ error, userId }, 'Schedule post failed');
      
      return {
        success: false,
        message: `Failed to schedule post: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle analytics request
   */
  private async handleAnalytics(userId: string, input: string, connectedPlatforms: string[]): Promise<any> {
    try {
      const detectedPlatform = this.detectPlatform(input);
      const platformsToCheck = detectedPlatform ? [detectedPlatform] : connectedPlatforms;

      const results: any[] = [];
      const errors: string[] = [];

      for (const platform of platformsToCheck) {
        try {
          const analytics = await SocialTools.getPostAnalytics(userId, {
            platform: platform as any,
          });
          results.push({
            platform,
            analytics,
          });
        } catch (error) {
          errors.push(`Failed to get ${platform} analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const totalEngagement = results.reduce((sum, r) => {
        const eng = r.analytics?.totalEngagement || {};
        return {
          likes: sum.likes + (eng.likes || 0),
          comments: sum.comments + (eng.comments || 0),
          shares: sum.shares + (eng.shares || 0),
          views: sum.views + (eng.views || 0),
        };
      }, { likes: 0, comments: 0, shares: 0, views: 0 });

      return {
        success: true,
        message: `Analytics retrieved for ${results.length} platform(s)`,
        totalEngagement,
        platformAnalytics: results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analytics failed';
      logger.error({ error, userId }, 'Analytics request failed');
      
      return {
        success: false,
        message: `Failed to get analytics: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle connected accounts display
   */
  private async handleConnectedAccounts(connectedAccounts: Array<{ platform: SocialPlatform; accountId: string; accountName: string; isConnected: boolean }>): Promise<any> {
    const connected = connectedAccounts.filter(a => a.isConnected);
    const disconnected = connectedAccounts.filter(a => !a.isConnected);

    return {
      success: true,
      message: `You have ${connected.length} connected account(s)`,
      connected: connected.map(a => ({
        platform: a.platform,
        name: a.accountName,
      })),
      disconnected: disconnected.map(a => ({
        platform: a.platform,
        name: a.accountName,
        action: 'connect',
      })),
    };
  }

  /**
   * Generate AI-enhanced content
   */
  private async enhanceContent(content: string, platform: SocialPlatform): Promise<string> {
    try {
      const platformGuides: Record<string, string> = {
        [SocialPlatform.LINKEDIN]: 'professional, engaging, 2-3 hashtags max',
        [SocialPlatform.INSTAGRAM]: 'casual, visual, emoji-friendly, up to 30 hashtags',
        [SocialPlatform.FACEBOOK]: 'conversational, community-focused, 1-2 hashtags',
        [SocialPlatform.X_TWITTER]: 'concise, punchy, 1-2 hashtags, max 280 characters',
      };

      const guide = platformGuides[platform] || '';
      const prompt = `Enhance this social media post for ${platform}. Make it ${guide}:\n\nOriginal: "${content}"\n\nReturn ONLY the enhanced post text.`;

      const result = await OpenAIService.complete({
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      return result.content || content;
    } catch (error) {
      logger.warn({ error, platform }, 'AI content enhancement failed, using original');
      return content;
    }
  }

  /**
   * Execute with streaming support
   */
  async executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      onChunk({
        type: 'thought',
        content: 'Preparing your social media post...',
        timestamp: new Date(),
      });

      const result = await this.doExecute(request, context);

      onChunk({
        type: 'output',
        content: result.message || JSON.stringify(result),
        timestamp: new Date(),
      });

      return {
        id: `social_${Date.now()}`,
        success: result.success !== false,
        output: result,
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      onChunk({
        type: 'error',
        content: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date(),
      });

      return {
        id: `social_${Date.now()}`,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    }
  }
}