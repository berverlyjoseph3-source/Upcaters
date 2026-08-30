// enterprise-ai-agent-platform/apps/api/src/auth/services/linkedin-oauth.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../db/client';
import { OAuthRepository } from '../../db/repositories/oauth.repository';
import { logger } from '../../utils/logger';
import { OAuthProvider, SyncStatus } from '@prisma/client';

export interface LinkedInUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
  headline?: string;
  location?: string;
}

export interface LinkedInTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

// ============================================
// PKCE Store (shared with Google OAuth for consistency)
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

export class LinkedInOAuthService {
  private static readonly CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
  private static readonly REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
  
  private static readonly AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
  private static readonly TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
  private static readonly USER_INFO_URL = 'https://api.linkedin.com/v2/userinfo';
  private static readonly PROFILE_URL = 'https://api.linkedin.com/v2/me';
  private static readonly EMAIL_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
  
  private static readonly SCOPES = [
    'openid',
    'profile',
    'email',
    'w_member_social',
  ];

  /**
   * Generate PKCE for LinkedIn
   */
  static generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url').replace(/=/g, '');
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = hash.toString('base64url').replace(/=/g, '');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate secure state parameter
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
  }

  /**
   * Verify PKCE challenge
   */
  private static verifyPKCE(state: string, codeVerifier?: string): { valid: boolean; pkceData?: PKCEChallenge; error?: string } {
    const pkceData = pkceStore.get(state);
    if (!pkceData) return { valid: false, error: 'Invalid state. Session expired.' };
    if (new Date() > pkceData.expiresAt) {
      pkceStore.delete(state);
      return { valid: false, error: 'Session expired. Please try again.' };
    }
    if (codeVerifier) {
      const challengeHash = crypto.createHash('sha256').update(codeVerifier).digest().toString('base64url').replace(/=/g, '');
      if (challengeHash !== pkceData.codeChallenge) {
        pkceStore.delete(state);
        return { valid: false, error: 'PKCE verification failed.' };
      }
    }
    return { valid: true, pkceData };
  }

  /**
   * Clear PKCE data
   */
  private static clearPKCE(state: string): void {
    pkceStore.delete(state);
  }

  /**
   * Generate LinkedIn OAuth URL with PKCE
   */
  static getAuthUrl(state?: string, redirectUri?: string, userId?: string): { url: string; state: string; codeVerifier: string } {
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

    return {
      url: `${this.AUTH_URL}?${params.toString()}`,
      state: stateParam,
      codeVerifier,
    };
  }

  /**
   * Exchange code for tokens with PKCE verification
   */
  static async getTokens(code: string, state: string, codeVerifier: string): Promise<LinkedInTokens> {
    try {
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        throw new Error(pkceCheck.error);
      }

      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: pkceCheck.pkceData!.redirectUri || this.REDIRECT_URI!,
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        code_verifier: codeVerifier,
      });

      const response = await axios.post(this.TOKEN_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      this.clearPKCE(state);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in || 5184000,
        scope: response.data.scope,
        token_type: response.data.token_type || 'Bearer',
      };
    } catch (error) {
      logger.error({ error }, 'Failed to exchange LinkedIn OAuth code');
      throw new Error('Failed to get LinkedIn tokens');
    }
  }

  /**
   * Handle LinkedIn OAuth callback
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
        logger.error({ state: state?.substring(0, 8), ipAddress }, 'LinkedIn PKCE verification failed');
        return { success: false, error: pkceCheck.error };
      }

      const tokens = await this.getTokens(code, state, codeVerifier);
      const linkedInUser = await this.getUserInfo(tokens.access_token);

      let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
      let isNewUser = false;

      if (!user) {
        user = await prisma.user.findUnique({ where: { email: linkedInUser.email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: linkedInUser.email,
              name: `${linkedInUser.firstName} ${linkedInUser.lastName}`.trim(),
              avatarUrl: linkedInUser.profilePicture,
              planId: 'FREE',
              apiKey: crypto.createHash('sha256').update(`ak_${crypto.randomBytes(32).toString('hex')}`).digest('hex'),
              apiKeyPrefix: 'ak_temp',
              metadata: {
                linkedInId: linkedInUser.id,
                linkedInHeadline: linkedInUser.headline,
              },
            },
          });
          isNewUser = true;
          logger.info({ userId: user.id, email: user.email }, 'New user created via LinkedIn OAuth');
        }
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is disabled.' };
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      
      await OAuthRepository.upsertConnection({
        userId: user.id,
        provider: OAuthProvider.LINKEDIN,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        scope: tokens.scope,
        providerUserId: linkedInUser.id,
        providerEmail: linkedInUser.email,
      });

      this.clearPKCE(state);

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'oauth_login',
          entityType: 'oauth_connection',
          entityId: linkedInUser.id,
          ipAddress,
          userAgent,
          metadata: { provider: 'linkedin', isNewUser } as any,
        },
      });

      logger.info({ userId: user.id, isNewUser }, 'LinkedIn OAuth authentication successful');

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
      logger.error({ error }, 'LinkedIn OAuth callback failed');
      return { success: false, error: 'LinkedIn authentication failed.' };
    }
  }

  /**
   * Get user info from LinkedIn
   */
  private static async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    try {
      const [profileResponse, emailResponse] = await Promise.all([
        axios.get(this.PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } }),
        axios.get(this.EMAIL_URL, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);

      const email = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress || '';
      const profile = profileResponse.data;

      return {
        id: profile.id,
        email,
        firstName: profile.localizedFirstName || '',
        lastName: profile.localizedLastName || '',
        profilePicture: '',
        headline: profile.headline?.localized?.['en_US'],
        location: profile.location?.localized?.['en_US'],
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get LinkedIn user info');
      throw new Error('Failed to get user info from LinkedIn');
    }
  }

  /**
   * Post to LinkedIn
   */
  static async postToLinkedIn(userId: string, content: string, mediaUrl?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const connection = await OAuthRepository.getConnection(userId, OAuthProvider.LINKEDIN);
      if (!connection) {
        return { success: false, error: 'LinkedIn account not connected' };
      }

      let accessToken = connection.accessToken;
      
      if (connection.expiresAt && connection.expiresAt < new Date() && connection.refreshToken) {
        const refreshed = await this.refreshAccessToken(connection.refreshToken);
        accessToken = refreshed.access_token;
        
        await OAuthRepository.updateTokens(userId, OAuthProvider.LINKEDIN, {
          accessToken,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          syncStatus: SyncStatus.SUCCESS,
        });
      }

      const postData = {
        author: `urn:li:person:${connection.providerUserId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: mediaUrl ? 'IMAGE' : 'NONE',
            media: mediaUrl ? [{ status: 'READY', description: { text: content.substring(0, 200) }, media: mediaUrl }] : [],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      };

      const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      logger.info({ userId, postId: response.data.id }, 'Posted to LinkedIn successfully');
      return { success: true, postId: response.data.id };
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to post to LinkedIn');
      return { success: false, error: error.response?.data?.message || 'Failed to post to LinkedIn' };
    }
  }

  /**
   * Refresh LinkedIn access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
      });

      const response = await axios.post(this.TOKEN_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in || 5184000,
        refresh_token: response.data.refresh_token,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to refresh LinkedIn access token');
      throw new Error('Failed to refresh LinkedIn token');
    }
  }

  /**
   * Get valid access token
   */
  static async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const connection = await OAuthRepository.getConnection(userId, OAuthProvider.LINKEDIN);
      if (!connection) return null;

      const isExpiring = connection.expiresAt && connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
      
      if (isExpiring && connection.refreshToken) {
        const refreshed = await this.refreshAccessToken(connection.refreshToken);
        
        await OAuthRepository.updateTokens(userId, OAuthProvider.LINKEDIN, {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token || connection.refreshToken,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          syncStatus: SyncStatus.SUCCESS,
        });

        return refreshed.access_token;
      }

      return connection.accessToken;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get valid LinkedIn access token');
      await OAuthRepository.updateSyncStatus(userId, OAuthProvider.LINKEDIN, SyncStatus.ERROR, String(error));
      return null;
    }
  }

  /**
   * Check if LinkedIn is connected
   */
  static async isConnected(userId: string): Promise<boolean> {
    const connection = await OAuthRepository.getConnection(userId, OAuthProvider.LINKEDIN);
    return !!connection && connection.syncStatus !== SyncStatus.ERROR;
  }

  /**
   * Disconnect LinkedIn
   */
  static async disconnect(userId: string): Promise<boolean> {
    try {
      await OAuthRepository.deleteConnection(userId, OAuthProvider.LINKEDIN);
      logger.info({ userId }, 'LinkedIn account disconnected');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to disconnect LinkedIn');
      return false;
    }
  }
}