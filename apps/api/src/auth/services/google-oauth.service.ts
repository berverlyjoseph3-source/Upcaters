// enterprise-ai-agent-platform/apps/api/src/auth/services/google-oauth.service.ts
import axios from 'axios';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import crypto from 'crypto';
import { authConfig } from '../../config/auth.config';
import { prisma } from '../../db/client';
import { OAuthRepository } from '../../db/repositories/oauth.repository';
import { UserRepository } from '../../db/repositories/user.repository';
import { logger } from '../../utils/logger';
import { AuthService } from './auth.service';
import { OAuthProvider, SyncStatus } from '@prisma/client';

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  hd?: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

// ============================================
// PKCE (Proof Key for Code Exchange) Types
// ============================================

interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  createdAt: Date;
  expiresAt: Date;
  redirectUri: string;
  userId?: string;
  service?: string;
}

// In-memory PKCE store (use Redis in production)
const pkceStore = new Map<string, PKCEChallenge>();
const PKCE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const PKCE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes

// ============================================
// Rate Limiting for OAuth Operations
// ============================================

interface OAuthRateLimit {
  count: number;
  windowStart: number;
}

const oauthRateLimits = new Map<string, OAuthRateLimit>();
const OAUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OAUTH_ATTEMPTS = 10;

export class GoogleOAuthService {
  private static oAuth2Client: OAuth2Client | null = null;

  /**
   * Initialize Google OAuth client
   */
  static init(): void {
    if (!this.oAuth2Client && authConfig.google.clientId && authConfig.google.clientSecret) {
      this.oAuth2Client = new OAuth2Client(
        authConfig.google.clientId,
        authConfig.google.clientSecret,
        authConfig.google.redirectUri
      );
      logger.info('Google OAuth client initialized');
      
      // Start PKCE cleanup interval
      setInterval(() => this.cleanupExpiredPKCE(), PKCE_CLEANUP_INTERVAL_MS);
    }
  }

  /**
   * Get OAuth2 client instance
   */
  static getClient(): OAuth2Client {
    if (!this.oAuth2Client) {
      this.init();
    }
    if (!this.oAuth2Client) {
      throw new Error('Google OAuth client not initialized');
    }
    return this.oAuth2Client;
  }

  // ============================================
  // PKCE Implementation
  // ============================================

  /**
   * Generate PKCE code verifier and challenge
   * Uses S256 method (SHA-256)
   */
  static generatePKCE(): { codeVerifier: string; codeChallenge: string } {
    // Generate cryptographically secure random verifier
    const codeVerifier = crypto
      .randomBytes(32)
      .toString('base64url')
      .replace(/=/g, '');
    
    // Generate SHA-256 challenge
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = hash
      .toString('base64url')
      .replace(/=/g, '');
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate a secure state parameter for CSRF protection
   */
  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store PKCE challenge for later verification
   */
  static storePKCE(
    codeVerifier: string,
    codeChallenge: string,
    state: string,
    redirectUri: string,
    userId?: string,
    service?: string
  ): void {
    const pkceData: PKCEChallenge = {
      codeVerifier,
      codeChallenge,
      state,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + PKCE_EXPIRY_MS),
      redirectUri,
      userId,
      service,
    };

    pkceStore.set(state, pkceData);
    
    logger.debug({ 
      state: state.substring(0, 8), 
      userId, 
      service,
      expiresAt: pkceData.expiresAt 
    }, 'PKCE challenge stored');
  }

  /**
   * Verify PKCE challenge
   */
  static verifyPKCE(state: string, codeVerifier?: string): { 
    valid: boolean; 
    pkceData?: PKCEChallenge; 
    error?: string 
  } {
    const pkceData = pkceStore.get(state);

    if (!pkceData) {
      return { valid: false, error: 'Invalid state parameter. Authentication session expired or not found.' };
    }

    // Check expiry
    if (new Date() > pkceData.expiresAt) {
      pkceStore.delete(state);
      return { valid: false, error: 'Authentication session expired. Please try again.' };
    }

    // If code verifier is provided, verify it matches
    if (codeVerifier) {
      const challengeHash = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest()
        .toString('base64url')
        .replace(/=/g, '');

      if (challengeHash !== pkceData.codeChallenge) {
        logger.error({ state: state.substring(0, 8) }, 'PKCE verification failed - code challenge mismatch');
        pkceStore.delete(state);
        return { valid: false, error: 'PKCE verification failed. Possible CSRF attack.' };
      }
    }

    return { valid: true, pkceData };
  }

  /**
   * Clear PKCE data after successful authentication
   */
  static clearPKCE(state: string): void {
    pkceStore.delete(state);
    logger.debug({ state: state.substring(0, 8) }, 'PKCE challenge cleared');
  }

  /**
   * Clean up expired PKCE challenges
   */
  private static cleanupExpiredPKCE(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [state, data] of pkceStore.entries()) {
      if (now > data.expiresAt) {
        pkceStore.delete(state);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug({ cleanedCount }, 'Cleaned up expired PKCE challenges');
    }
  }

  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Check OAuth rate limit
   */
  private static checkOAuthRateLimit(identifier: string): { allowed: boolean; error?: string } {
    const now = Date.now();
    const record = oauthRateLimits.get(identifier);

    if (!record || now - record.windowStart > OAUTH_RATE_LIMIT_WINDOW_MS) {
      oauthRateLimits.set(identifier, { count: 1, windowStart: now });
      return { allowed: true };
    }

    if (record.count >= MAX_OAUTH_ATTEMPTS) {
      const remainingMs = OAUTH_RATE_LIMIT_WINDOW_MS - (now - record.windowStart);
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return {
        allowed: false,
        error: `Too many authentication attempts. Please try again in ${remainingMinutes} minutes.`,
      };
    }

    record.count++;
    return { allowed: true };
  }

  // ============================================
  // OAuth URL Generation (with PKCE)
  // ============================================

  /**
   * Generate Google OAuth URL with PKCE
   */
  static getAuthUrl(
    state?: string,
    scope?: string[],
    redirectUri?: string,
    userId?: string,
    service?: string
  ): { url: string; state: string; codeVerifier: string } {
    const client = this.getClient();
    const scopes = scope || authConfig.google.scopes;
    const stateParam = state || this.generateState();
    const redirectUriParam = redirectUri || authConfig.google.redirectUri;

    // Generate PKCE
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    // Store PKCE for later verification
    this.storePKCE(codeVerifier, codeChallenge, stateParam, redirectUriParam, userId, service);

    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: stateParam,
      include_granted_scopes: true,
      redirect_uri: redirectUriParam,
      // PKCE parameters
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    logger.info({ 
      state: stateParam.substring(0, 8), 
      userId, 
      service,
      scopeCount: scopes.length 
    }, 'Google OAuth URL generated with PKCE');

    return { url, state: stateParam, codeVerifier };
  }

  // ============================================
  // Token Exchange (with PKCE verification)
  // ============================================

  /**
   * Exchange authorization code for tokens with PKCE verification
   */
  static async getTokens(code: string, state: string, codeVerifier?: string): Promise<GoogleTokens> {
    try {
      // Check rate limit
      const rateCheck = this.checkOAuthRateLimit(`exchange:${state.substring(0, 8)}`);
      if (!rateCheck.allowed) {
        throw new Error(rateCheck.error);
      }

      // Verify PKCE if code verifier is provided
      if (codeVerifier) {
        const pkceCheck = this.verifyPKCE(state, codeVerifier);
        if (!pkceCheck.valid) {
          throw new Error(pkceCheck.error);
        }
      } else {
        // Still validate state exists in store
        const pkceCheck = this.verifyPKCE(state);
        if (!pkceCheck.valid) {
          throw new Error(pkceCheck.error);
        }
      }

      const client = this.getClient();
      const redirectUri = this.getPKCERedirectUri(state);

      const { tokens } = await client.getToken({
        code,
        redirect_uri: redirectUri || authConfig.google.redirectUri,
      });

      if (!tokens.access_token) {
        throw new Error('No access token received from Google');
      }

      // Clear PKCE data after successful exchange
      this.clearPKCE(state);

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token!,
        expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        scope: tokens.scope!,
        token_type: tokens.token_type || 'Bearer',
        id_token: tokens.id_token!,
      };
    } catch (error) {
      logger.error({ error, state: state?.substring(0, 8) }, 'Failed to exchange OAuth code');
      throw new Error('Failed to get Google tokens: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Get redirect URI from stored PKCE data
   */
  private static getPKCERedirectUri(state: string): string | null {
    const pkceData = pkceStore.get(state);
    return pkceData?.redirectUri || null;
  }

  // ============================================
  // Token Refresh
  // ============================================

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    try {
      const client = this.getClient();
      client.setCredentials({ refresh_token: refreshToken });
      
      const { credentials } = await client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('No access token returned from refresh');
      }
      
      return {
        access_token: credentials.access_token,
        expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to refresh Google access token');
      throw new Error('Failed to refresh Google token');
    }
  }

  /**
   * Get user info from Google
   */
  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to get Google user info');
      throw new Error('Failed to get user info from Google');
    }
  }

  // ============================================
  // Authentication Handlers (with PKCE)
  // ============================================

  /**
   * Handle Google OAuth callback with PKCE verification
   */
  static async handleAuthCallback(
    code: string,
    state: string,
    codeVerifier?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: any;
    tokens?: { accessToken: string; refreshToken: string };
    isNewUser?: boolean;
    error?: string;
  }> {
    try {
      // Check rate limit
      const rateCheck = this.checkOAuthRateLimit(`callback:${ipAddress || 'unknown'}`);
      if (!rateCheck.allowed) {
        return { success: false, error: rateCheck.error };
      }

      // Verify PKCE
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        logger.error({ state: state?.substring(0, 8), ipAddress }, 'PKCE verification failed in callback');
        return { success: false, error: pkceCheck.error };
      }

      // Exchange code for tokens with PKCE verification
      const googleTokens = await this.getTokens(code, state, codeVerifier);
      
      // Get user info
      const googleUser = await this.getUserInfo(googleTokens.access_token);
      
      // Validate email
      if (!googleUser.email || !googleUser.verified_email) {
        return { success: false, error: 'Google account email not verified' };
      }

      // Check if user exists
      let user = await UserRepository.findByEmail(googleUser.email);
      let isNewUser = false;

      if (!user) {
        // Create new user
        user = await UserRepository.create({
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          planId: 'FREE',
          apiKeyHash: crypto.createHash('sha256').update(`ak_${crypto.randomBytes(32).toString('hex')}`).digest('hex'),
          apiKeyPrefix: 'ak_temp',
        });
        isNewUser = true;
        logger.info({ userId: user.id, email: user.email }, 'New user created via Google OAuth');
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is disabled. Please contact support.' };
      }

      // Store OAuth tokens for services
      const expiresAt = new Date(Date.now() + googleTokens.expires_in * 1000);

      await Promise.all([
        OAuthRepository.upsertConnection({
          userId: user.id,
          provider: OAuthProvider.GOOGLE_GMAIL,
          accessToken: googleTokens.access_token,
          refreshToken: googleTokens.refresh_token,
          expiresAt,
          scope: googleTokens.scope,
          providerUserId: googleUser.id,
          providerEmail: googleUser.email,
        }),
        OAuthRepository.upsertConnection({
          userId: user.id,
          provider: OAuthProvider.GOOGLE_DRIVE,
          accessToken: googleTokens.access_token,
          refreshToken: googleTokens.refresh_token,
          expiresAt,
          scope: googleTokens.scope,
          providerUserId: googleUser.id,
          providerEmail: googleUser.email,
        }),
        OAuthRepository.upsertConnection({
          userId: user.id,
          provider: OAuthProvider.GOOGLE_CALENDAR,
          accessToken: googleTokens.access_token,
          refreshToken: googleTokens.refresh_token,
          expiresAt,
          scope: googleTokens.scope,
          providerUserId: googleUser.id,
          providerEmail: googleUser.email,
        }),
      ]);

      // Generate JWT tokens
      const accessToken = AuthService.generateAccessToken(user.id, user.email, user.role, user.planId);
      const { token: refreshToken } = AuthService.generateRefreshToken(user.id, user.email, user.role, user.planId);
      
      // Create token family
      await AuthService.createTokenFamily(user.id, refreshToken);

      // Create session
      await AuthService.createSession(user.id, refreshToken, ipAddress, userAgent);

      // Update last login
      await UserRepository.updateLastLogin(user.id, ipAddress, userAgent);

      // Log security event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'oauth_login',
          entityType: 'oauth_connection',
          entityId: googleUser.id,
          ipAddress,
          userAgent,
          metadata: { provider: 'google', isNewUser } as any,
        },
      });

      logger.info({ userId: user.id, isNewUser }, 'Google OAuth authentication successful');

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
        tokens: { accessToken, refreshToken },
        isNewUser,
      };
    } catch (error) {
      logger.error({ error }, 'Google OAuth callback failed');
      return { success: false, error: 'Google authentication failed. Please try again.' };
    }
  }

  // ============================================
  // Service Connection Management
  // ============================================

  /**
   * Connect additional Google service
   */
  static async connectService(
    userId: string,
    code: string,
    state: string,
    codeVerifier: string,
    provider: OAuthProvider
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify PKCE
      const pkceCheck = this.verifyPKCE(state, codeVerifier);
      if (!pkceCheck.valid) {
        return { success: false, error: pkceCheck.error };
      }

      const googleTokens = await this.getTokens(code, state, codeVerifier);
      const googleUser = await this.getUserInfo(googleTokens.access_token);
      
      const expiresAt = new Date(Date.now() + googleTokens.expires_in * 1000);
      
      await OAuthRepository.upsertConnection({
        userId,
        provider,
        accessToken: googleTokens.access_token,
        refreshToken: googleTokens.refresh_token,
        expiresAt,
        scope: googleTokens.scope,
        providerUserId: googleUser.id,
        providerEmail: googleUser.email,
      });

      logger.info({ userId, provider }, 'Google service connected successfully');
      return { success: true };
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to connect Google service');
      return { success: false, error: 'Failed to connect service. Please try again.' };
    }
  }

  /**
   * Disconnect a Google service
   */
  static async disconnectService(userId: string, provider: OAuthProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await OAuthRepository.getConnection(userId, provider);
      
      if (connection) {
        await this.revokeAccess(connection.accessToken);
      }
      
      await OAuthRepository.deleteConnection(userId, provider);
      
      logger.info({ userId, provider }, 'Google service disconnected');
      return { success: true };
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to disconnect Google service');
      return { success: false, error: 'Failed to disconnect service. Please try again.' };
    }
  }

  /**
   * Revoke Google access
   */
  static async revokeAccess(accessToken: string): Promise<boolean> {
    try {
      await axios.post(
        'https://oauth2.googleapis.com/revoke',
        `token=${accessToken}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      logger.info('Google access revoked successfully');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to revoke Google access');
      return false;
    }
  }

  /**
   * Get valid access token for a user's service
   */
  static async getValidAccessToken(userId: string, provider: OAuthProvider): Promise<string | null> {
    try {
      const connection = await OAuthRepository.getConnection(userId, provider);
      
      if (!connection) {
        logger.warn({ userId, provider }, 'No OAuth connection found');
        return null;
      }

      const isExpiring = connection.expiresAt && 
        connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

      if (isExpiring && connection.refreshToken) {
        const refreshed = await this.refreshAccessToken(connection.refreshToken);
        
        await OAuthRepository.updateTokens(userId, provider, {
          accessToken: refreshed.access_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          syncStatus: SyncStatus.SUCCESS,
        });

        return refreshed.access_token;
      }

      return connection.accessToken;
    } catch (error) {
      logger.error({ error, userId, provider }, 'Failed to get valid access token');
      await OAuthRepository.updateSyncStatus(userId, provider, SyncStatus.ERROR, String(error));
      return null;
    }
  }

  /**
   * Check if user has connected a specific Google service
   */
  static async isServiceConnected(userId: string, provider: OAuthProvider): Promise<boolean> {
    const connection = await OAuthRepository.getConnection(userId, provider);
    return !!connection && connection.syncStatus !== SyncStatus.ERROR;
  }

  /**
   * Get all connected Google services for a user
   */
  static async getConnectedServices(userId: string): Promise<OAuthProvider[]> {
    const connections = await prisma.oAuthConnection.findMany({
      where: {
        userId,
        provider: {
          in: [
            OAuthProvider.GOOGLE_GMAIL,
            OAuthProvider.GOOGLE_DRIVE,
            OAuthProvider.GOOGLE_CALENDAR,
            OAuthProvider.GOOGLE_TASKS,
          ],
        },
        syncStatus: { not: SyncStatus.ERROR },
      },
      select: { provider: true },
    });
    
    return connections.map(c => c.provider);
  }
}

// Initialize on module load
GoogleOAuthService.init();