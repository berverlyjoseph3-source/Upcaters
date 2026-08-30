// enterprise-ai-agent-platform/apps/api/src/auth/services/facebook-oauth.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { OAuthRepository } from '../../db/repositories/oauth.repository';
import { logger } from '../../utils/logger';
import { OAuthProvider, SyncStatus } from '@prisma/client';

export interface FacebookUserInfo {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture: string;
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  access_token: string;
  category: string;
  instagram_business_account?: { id: string };
}

export interface FacebookTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

// ============================================
// PKCE Store
// ============================================

interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  createdAt: Date;
  expiresAt: Date;
  redirectUri: string;
  userId?: string;
}

const pkceStore = new Map<string, PKCEChallenge>();
const PKCE_EXPIRY_MS = 10 * 60 * 1000;

export class FacebookOAuthService {
  private static readonly APP_ID = process.env.FACEBOOK_APP_ID;
  private static readonly APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  private static readonly REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI;

  private static readonly AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
  private static readonly TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private static readonly USER_INFO_URL = 'https://graph.facebook.com/v18.0/me';
  private static readonly PAGE_POST_URL = 'https://graph.facebook.com/v18.0/{page_id}/feed';

  private static readonly SCOPES = [
    'email',
    'public_profile',
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
  ];

  /**
   * Generate PKCE
   */
  static generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url').replace(/=/g, '');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = hash.toString('base64url').replace(/=/g, '');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate secure state
   */
  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store PKCE challenge
   */
  private static storePKCE(
    codeVerifier: string,
    codeChallenge: string,
    state: string,
    redirectUri: string,
    userId?: string
  ): void {
    pkceStore.set(state, {
      codeVerifier,
      codeChallenge,
      state,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + PKCE_EXPIRY_MS),
      redirectUri,
      userId,
    });
    logger.debug({ state: state.substring(0, 8), userId }, 'Facebook PKCE stored');
  }

  /**
   * Verify PKCE
   */
  private static verifyPKCE(state: string, codeVerifier?: string): {
    valid: boolean;
    pkceData?: PKCEChallenge;
    error?: string;
  } {
    const pkceData = pkceStore.get(state);
    if (!pkceData) return { valid: false, error: 'Invalid state. Session expired.' };
    
    if (new Date() > pkceData.expiresAt) {
      pkceStore.delete(state);
      return { valid: false, error: 'Session expired. Please try again.' };
    }

    if (codeVerifier) {
      const challengeHash = crypto.createHash('sha256').update(codeVerifier).digest()
        .toString('base64url').replace(/=/g, '');
      
      if (challengeHash !== pkceData.codeChallenge) {
        pkceStore.delete(state);
        logger.error({ state: state.substring(0, 8) }, 'Facebook PKCE verification failed');
        return { valid: false, error: 'PKCE verification failed. Possible CSRF attack.' };
      }
    }

    return { valid: true, pkceData };
  }

  /**
   * Clear PKCE
   */
  private static clearPKCE(state: string): void {
    pkceStore.delete(state);
  }

  /**
   * Generate Facebook OAuth URL with PKCE
   */
  static getAuthUrl(state?: string, redirectUri?: string, userId?: string): {
    url: string;
    state: string;
    codeVerifier: string;
  } {
    const stateParam = state || this.generateState();
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const redirectUriParam = redirectUri || this.REDIRECT_URI!;

    this.storePKCE(codeVerifier, codeChallenge, stateParam, redirectUriParam, userId);

    const params = new URLSearchParams({
      client_id: this.APP_ID!,
      redirect_uri: redirectUriParam,
      scope: this.SCOPES.join(','),
      response_type: 'code',
      state: stateParam,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    logger.info({ state: stateParam.substring(0, 8), userId }, 'Facebook OAuth URL generated with PKCE');

    return {
      url: `${this.AUTH_URL}?${params.toString()}`,
      state: stateParam,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens with PKCE
   */
  static async getTokens(code: string, state: string, codeVerifier: string): Promise<FacebookTokens> {
    try {
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        throw new Error(pkceCheck.error);
      }

      const params = new URLSearchParams({
        client_id: this.APP_ID!,
        client_secret: this.APP_SECRET!,
        redirect_uri: pkceCheck.pkceData!.redirectUri || this.REDIRECT_URI!,
        code,
        code_verifier: codeVerifier,
      });

      const response = await axios.get(`${this.TOKEN_URL}?${params.toString()}`);

      this.clearPKCE(state);

      // Exchange for long-lived token
      const longLivedToken = await this.getLongLivedToken(response.data.access_token);

      return {
        access_token: longLivedToken,
        token_type: 'Bearer',
        expires_in: 5184000, // 60 days
        scope: this.SCOPES.join(','),
      };
    } catch (error) {
      logger.error({ error, state: state?.substring(0, 8) }, 'Failed to exchange Facebook OAuth code');
      throw new Error('Failed to get Facebook tokens');
    }
  }

  /**
   * Get long-lived access token
   */
  static async getLongLivedToken(shortLivedToken: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.APP_ID!,
        client_secret: this.APP_SECRET!,
        fb_exchange_token: shortLivedToken,
      });

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`
      );

      return response.data.access_token;
    } catch (error) {
      logger.error({ error }, 'Failed to get long-lived Facebook token');
      throw new Error('Failed to exchange for long-lived token');
    }
  }

  /**
   * Get user info from Facebook
   */
  static async getUserInfo(accessToken: string): Promise<FacebookUserInfo> {
    try {
      const params = new URLSearchParams({
        fields: 'id,name,first_name,last_name,email,picture',
        access_token: accessToken,
      });

      const response = await axios.get(`${this.USER_INFO_URL}?${params.toString()}`);

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        picture: response.data.picture?.data?.url || '',
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get Facebook user info');
      throw new Error('Failed to get user info from Facebook');
    }
  }

  /**
   * Get user's Facebook pages
   */
  static async getUserPages(accessToken: string): Promise<FacebookPageInfo[]> {
    try {
      const params = new URLSearchParams({
        fields: 'id,name,access_token,category,instagram_business_account',
        access_token: accessToken,
      });

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?${params.toString()}`
      );

      return response.data.data || [];
    } catch (error) {
      logger.error({ error }, 'Failed to get Facebook pages');
      return [];
    }
  }

  /**
   * Handle Facebook OAuth callback with PKCE
   */
  static async handleAuthCallback(
    code: string,
    state: string,
    codeVerifier: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: any;
    isNewUser?: boolean;
    pages?: FacebookPageInfo[];
    error?: string;
  }> {
    try {
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        logger.error({ state: state?.substring(0, 8), ipAddress }, 'Facebook PKCE verification failed');
        return { success: false, error: pkceCheck.error };
      }

      const tokens = await this.getTokens(code, state, codeVerifier);
      const facebookUser = await this.getUserInfo(tokens.access_token);
      const pages = await this.getUserPages(tokens.access_token);

      // Validate email
      if (!facebookUser.email) {
        return { success: false, error: 'Facebook account does not have a verified email' };
      }

      let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      let isNewUser = false;

      if (!user) {
        user = await prisma.user.findUnique({ where: { email: facebookUser.email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: facebookUser.email,
              name: facebookUser.name,
              avatarUrl: facebookUser.picture,
              planId: 'FREE',
              metadata: {
                facebookId: facebookUser.id,
                facebookPages: pages.map(p => ({ id: p.id, name: p.name })),
              },
            },
          });
          isNewUser = true;
          logger.info({ userId: user.id, email: user.email }, 'New user created via Facebook OAuth');
        }
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is disabled. Please contact support.' };
      }

      // Store Facebook OAuth tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await OAuthRepository.upsertConnection({
        userId: user.id,
        provider: OAuthProvider.FACEBOOK,
        accessToken: tokens.access_token,
        expiresAt,
        scope: tokens.scope,
        providerUserId: facebookUser.id,
        providerEmail: facebookUser.email,
      });

      // Store Instagram connection if available
      for (const page of pages) {
        if (page.instagram_business_account) {
          await OAuthRepository.upsertConnection({
            userId: user.id,
            provider: OAuthProvider.INSTAGRAM,
            accessToken: page.access_token,
            expiresAt,
            scope: 'instagram_basic,instagram_content_publish',
            providerUserId: page.instagram_business_account.id,
            providerEmail: facebookUser.email,
          });
        }
      }

      this.clearPKCE(state);

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'oauth_login',
          entityType: 'oauth_connection',
          entityId: facebookUser.id,
          ipAddress,
          userAgent,
          metadata: { provider: 'facebook', isNewUser, pagesCount: pages.length } as any,
        },
      });

      logger.info({ userId: user.id, isNewUser, pagesCount: pages.length }, 'Facebook OAuth successful');

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          planId: user.planId,
          role: user.role,
        },
        isNewUser,
        pages,
      };
    } catch (error) {
      logger.error({ error }, 'Facebook OAuth callback failed');
      return { success: false, error: 'Facebook authentication failed. Please try again.' };
    }
  }

  /**
   * Post to Facebook Page
   */
  static async postToFacebook(
    userId: string,
    pageId: string,
    content: string,
    mediaUrl?: string
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const connection = await OAuthRepository.getConnection(userId, OAuthProvider.FACEBOOK);

      if (!connection) {
        return { success: false, error: 'Facebook account not connected' };
      }

      let accessToken = connection.accessToken;

      if (connection.expiresAt && connection.expiresAt < new Date()) {
        return { success: false, error: 'Facebook connection expired. Please reconnect.' };
      }

      const postUrl = this.PAGE_POST_URL.replace('{page_id}', pageId);
      const postData: any = {
        message: content,
        access_token: accessToken,
      };

      if (mediaUrl) {
        const mediaResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/photos`,
          {
            url: mediaUrl,
            published: false,
            access_token: accessToken,
          }
        );

        if (mediaResponse.data.id) {
          postData.attached_media = JSON.stringify([{ media_fbid: mediaResponse.data.id }]);
        }
      }

      const response = await axios.post(postUrl, postData);

      logger.info({ userId, pageId, postId: response.data.id }, 'Posted to Facebook');
      return { success: true, postId: response.data.id };
    } catch (error: any) {
      logger.error({ error, userId, pageId }, 'Failed to post to Facebook');
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to post to Facebook',
      };
    }
  }

  /**
   * Get valid access token
   */
  static async getValidAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
    try {
      const connection = await OAuthRepository.getConnection(userId, provider);
      if (!connection) return null;

      const isExpiring = connection.expiresAt &&
        connection.expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

      if (isExpiring) {
        return null; // Facebook long-lived tokens require re-authentication
      }

      return connection.accessToken;
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to get valid access token');
      await OAuthRepository.updateSyncStatus(userId, provider, SyncStatus.ERROR, String(error));
      return null;
    }
  }

  /**
   * Check if connected
   */
  static async isConnected(userId: string, provider: OAuthProvider = OAuthProvider.FACEBOOK): Promise<boolean> {
    const connection = await OAuthRepository.getConnection(userId, provider);
    return !!connection && connection.syncStatus !== SyncStatus.ERROR;
  }

  /**
   * Disconnect
   */
  static async disconnect(userId: string, provider: OAuthProvider = OAuthProvider.FACEBOOK): Promise<boolean> {
    try {
      await OAuthRepository.deleteConnection(userId, provider);
      logger.info({ userId, provider }, 'Facebook/Instagram account disconnected');
      return true;
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to disconnect');
      return false;
    }
  }
}