// enterprise-ai-agent-platform/apps/api/src/auth/services/twitter-oauth.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { OAuthRepository } from '../../db/repositories/oauth.repository';
import { logger } from '../../utils/logger';
import { OAuthProvider, SyncStatus } from '@prisma/client';

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  email: string;
  profileImageUrl: string;
  verified: boolean;
}

export interface TwitterTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface TwitterPostResult {
  success: boolean;
  postId?: string;
  error?: string;
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

export class TwitterOAuthService {
  private static readonly CLIENT_ID = process.env.TWITTER_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.TWITTER_REDIRECT_URI;

  private static readonly AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
  private static readonly TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
  private static readonly USER_INFO_URL = 'https://api.twitter.com/2/users/me';
  private static readonly POST_URL = 'https://api.twitter.com/2/tweets';

  private static readonly SCOPES = [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access',
  ];

  /**
   * Generate PKCE for Twitter (requires S256)
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
   * Store PKCE
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
    logger.debug({ state: state.substring(0, 8), userId }, 'Twitter PKCE stored');
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
        logger.error({ state: state.substring(0, 8) }, 'Twitter PKCE verification failed');
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
   * Generate Twitter OAuth URL with PKCE
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
      response_type: 'code',
      client_id: this.CLIENT_ID!,
      redirect_uri: redirectUriParam,
      scope: this.SCOPES.join(' '),
      state: stateParam,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    logger.info({ state: stateParam.substring(0, 8), userId }, 'Twitter OAuth URL generated with PKCE');

    return {
      url: `${this.AUTH_URL}?${params.toString()}`,
      state: stateParam,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens with PKCE
   */
  static async getTokens(code: string, state: string, codeVerifier: string): Promise<TwitterTokens> {
    try {
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        throw new Error(pkceCheck.error);
      }

      const params = new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID!,
        redirect_uri: pkceCheck.pkceData!.redirectUri || this.REDIRECT_URI!,
        code_verifier: codeVerifier,
      });

      const auth = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64');

      const response = await axios.post(this.TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
      });

      this.clearPKCE(state);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 7200,
        scope: response.data.scope,
        token_type: response.data.token_type || 'Bearer',
      };
    } catch (error) {
      logger.error({ error, state: state?.substring(0, 8) }, 'Failed to exchange Twitter OAuth code');
      throw new Error('Failed to get Twitter tokens');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const params = new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.CLIENT_ID!,
      });

      const auth = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64');

      const response = await axios.post(this.TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 7200,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to refresh Twitter access token');
      throw new Error('Failed to refresh Twitter token');
    }
  }

  /**
   * Get user info from Twitter
   */
  static async getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
    try {
      const params = new URLSearchParams({
        'user.fields': 'id,name,username,profile_image_url,verified',
      });

      const response = await axios.get(`${this.USER_INFO_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const user = response.data.data;

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        email: `${user.username}@twitter.social`,
        profileImageUrl: user.profile_image_url?.replace('_normal', '') || '',
        verified: user.verified || false,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get Twitter user info');
      throw new Error('Failed to get user info from Twitter');
    }
  }

  /**
   * Handle Twitter OAuth callback with PKCE
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
    error?: string;
  }> {
    try {
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        logger.error({ state: state?.substring(0, 8), ipAddress }, 'Twitter PKCE verification failed');
        return { success: false, error: pkceCheck.error };
      }

      const tokens = await this.getTokens(code, state, codeVerifier);
      const twitterUser = await this.getUserInfo(tokens.access_token);

      let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      let isNewUser = false;

      if (!user) {
        user = await prisma.user.findUnique({ where: { email: twitterUser.email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: twitterUser.email,
              name: twitterUser.name,
              avatarUrl: twitterUser.profileImageUrl,
              planId: 'FREE',
              metadata: {
                twitterId: twitterUser.id,
                twitterUsername: twitterUser.username,
                twitterVerified: twitterUser.verified,
              },
            },
          });
          isNewUser = true;
          logger.info({ userId: user.id, email: user.email }, 'New user created via Twitter OAuth');
        }
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is disabled. Please contact support.' };
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await OAuthRepository.upsertConnection({
        userId: user.id,
        provider: OAuthProvider.X_TWITTER,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        providerUserId: twitterUser.id,
        providerEmail: twitterUser.email,
      });

      this.clearPKCE(state);

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'oauth_login',
          entityType: 'oauth_connection',
          entityId: twitterUser.id,
          ipAddress,
          userAgent,
          metadata: { provider: 'twitter', isNewUser } as any,
        },
      });

      logger.info({ userId: user.id, isNewUser }, 'Twitter OAuth authentication successful');

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
      };
    } catch (error) {
      logger.error({ error }, 'Twitter OAuth callback failed');
      return { success: false, error: 'Twitter authentication failed. Please try again.' };
    }
  }

  /**
   * Post tweet
   */
  static async postTweet(
    userId: string,
    content: string,
    mediaUrl?: string,
    replyToTweetId?: string
  ): Promise<TwitterPostResult> {
    try {
      if (content.length > 280) {
        return { success: false, error: 'Tweet exceeds 280 character limit' };
      }

      const connection = await OAuthRepository.getConnection(userId, OAuthProvider.X_TWITTER);
      if (!connection) {
        return { success: false, error: 'Twitter account not connected' };
      }

      let accessToken = connection.accessToken;

      if (connection.expiresAt && connection.expiresAt < new Date()) {
        if (!connection.refreshToken) {
          return { success: false, error: 'Twitter connection expired. Please reconnect.' };
        }

        const refreshed = await this.refreshAccessToken(connection.refreshToken);
        accessToken = refreshed.access_token;

        await OAuthRepository.updateTokens(userId, OAuthProvider.X_TWITTER, {
          accessToken,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          syncStatus: SyncStatus.SUCCESS,
        });
      }

      const tweetData: any = { text: content };
      if (replyToTweetId) {
        tweetData.reply = { in_reply_to_tweet_id: replyToTweetId };
      }

      // Handle media upload if URL provided
      if (mediaUrl) {
        const imageResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
        const mediaUploadResponse = await axios.post(
          'https://upload.twitter.com/1.1/media/upload.json',
          imageResponse.data,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/octet-stream',
            },
          }
        );
        tweetData.media = { media_ids: [mediaUploadResponse.data.media_id_string] };
      }

      const response = await axios.post(this.POST_URL, tweetData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info({ userId, tweetId: response.data.data.id }, 'Tweet posted successfully');
      return { success: true, postId: response.data.data.id };
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to post tweet');
      return { success: false, error: error.response?.data?.detail || 'Failed to post tweet' };
    }
  }

  /**
   * Get valid access token
   */
  static async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const connection = await OAuthRepository.getConnection(userId, OAuthProvider.X_TWITTER);
      if (!connection) return null;

      const isExpiring = connection.expiresAt &&
        connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

      if (isExpiring && connection.refreshToken) {
        const refreshed = await this.refreshAccessToken(connection.refreshToken);

        await OAuthRepository.updateTokens(userId, OAuthProvider.X_TWITTER, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          syncStatus: SyncStatus.SUCCESS,
        });

        return refreshed.access_token;
      }

      return connection.accessToken;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get valid Twitter access token');
      await OAuthRepository.updateSyncStatus(userId, OAuthProvider.X_TWITTER, SyncStatus.ERROR, String(error));
      return null;
    }
  }

  /**
   * Check if connected
   */
  static async isConnected(userId: string): Promise<boolean> {
    const connection = await OAuthRepository.getConnection(userId, OAuthProvider.X_TWITTER);
    return !!connection && connection.syncStatus !== SyncStatus.ERROR;
  }

  /**
   * Disconnect
   */
  static async disconnect(userId: string): Promise<boolean> {
    try {
      await OAuthRepository.deleteConnection(userId, OAuthProvider.X_TWITTER);
      logger.info({ userId }, 'Twitter account disconnected');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to disconnect Twitter');
      return false;
    }
  }
}