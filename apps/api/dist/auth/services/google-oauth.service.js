"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleOAuthService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/google-oauth.service.ts
const axios_1 = __importDefault(require("axios"));
const google_auth_library_1 = require("google-auth-library");
const crypto_1 = __importDefault(require("crypto"));
const auth_config_1 = require("../../config/auth.config");
const client_1 = require("../../db/client");
const oauth_repository_1 = require("../../db/repositories/oauth.repository");
const user_repository_1 = require("../../db/repositories/user.repository");
const logger_1 = require("../../utils/logger");
const auth_service_1 = require("./auth.service");
const client_2 = require("@prisma/client");
// In-memory PKCE store (use Redis in production)
const pkceStore = new Map();
const PKCE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const PKCE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up every 5 minutes
const oauthRateLimits = new Map();
const OAUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OAUTH_ATTEMPTS = 10;
class GoogleOAuthService {
    /**
     * Initialize Google OAuth client
     */
    static init() {
        if (!this.oAuth2Client && auth_config_1.authConfig.google.clientId && auth_config_1.authConfig.google.clientSecret) {
            this.oAuth2Client = new google_auth_library_1.OAuth2Client(auth_config_1.authConfig.google.clientId, auth_config_1.authConfig.google.clientSecret, auth_config_1.authConfig.google.redirectUri);
            logger_1.logger.info('Google OAuth client initialized');
            // Start PKCE cleanup interval
            setInterval(() => this.cleanupExpiredPKCE(), PKCE_CLEANUP_INTERVAL_MS);
        }
    }
    /**
     * Get OAuth2 client instance
     */
    static getClient() {
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
    static generatePKCE() {
        // Generate cryptographically secure random verifier
        const codeVerifier = crypto_1.default
            .randomBytes(32)
            .toString('base64url')
            .replace(/=/g, '');
        // Generate SHA-256 challenge
        const hash = crypto_1.default.createHash('sha256').update(codeVerifier).digest();
        const codeChallenge = hash
            .toString('base64url')
            .replace(/=/g, '');
        return { codeVerifier, codeChallenge };
    }
    /**
     * Generate a secure state parameter for CSRF protection
     */
    static generateState() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Store PKCE challenge for later verification
     */
    static storePKCE(codeVerifier, codeChallenge, state, redirectUri, userId, service) {
        const pkceData = {
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
        logger_1.logger.debug({
            state: state.substring(0, 8),
            userId,
            service,
            expiresAt: pkceData.expiresAt
        }, 'PKCE challenge stored');
    }
    /**
     * Verify PKCE challenge
     */
    static verifyPKCE(state, codeVerifier) {
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
            const challengeHash = crypto_1.default
                .createHash('sha256')
                .update(codeVerifier)
                .digest()
                .toString('base64url')
                .replace(/=/g, '');
            if (challengeHash !== pkceData.codeChallenge) {
                logger_1.logger.error({ state: state.substring(0, 8) }, 'PKCE verification failed - code challenge mismatch');
                pkceStore.delete(state);
                return { valid: false, error: 'PKCE verification failed. Possible CSRF attack.' };
            }
        }
        return { valid: true, pkceData };
    }
    /**
     * Clear PKCE data after successful authentication
     */
    static clearPKCE(state) {
        pkceStore.delete(state);
        logger_1.logger.debug({ state: state.substring(0, 8) }, 'PKCE challenge cleared');
    }
    /**
     * Clean up expired PKCE challenges
     */
    static cleanupExpiredPKCE() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [state, data] of pkceStore.entries()) {
            if (now > data.expiresAt) {
                pkceStore.delete(state);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger_1.logger.debug({ cleanedCount }, 'Cleaned up expired PKCE challenges');
        }
    }
    // ============================================
    // Rate Limiting
    // ============================================
    /**
     * Check OAuth rate limit
     */
    static checkOAuthRateLimit(identifier) {
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
    static getAuthUrl(state, scope, redirectUri, userId, service) {
        const client = this.getClient();
        const scopes = scope || auth_config_1.authConfig.google.scopes;
        const stateParam = state || this.generateState();
        const redirectUriParam = redirectUri || auth_config_1.authConfig.google.redirectUri;
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
            code_challenge_method: google_auth_library_1.CodeChallengeMethod.S256,
        });
        logger_1.logger.info({
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
    static async getTokens(code, state, codeVerifier) {
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
            }
            else {
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
                redirect_uri: redirectUri || auth_config_1.authConfig.google.redirectUri,
            });
            if (!tokens.access_token) {
                throw new Error('No access token received from Google');
            }
            // Clear PKCE data after successful exchange
            this.clearPKCE(state);
            return {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
                scope: tokens.scope,
                token_type: tokens.token_type || 'Bearer',
                id_token: tokens.id_token,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, state: state?.substring(0, 8) }, 'Failed to exchange OAuth code');
            throw new Error('Failed to get Google tokens: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
    /**
     * Get redirect URI from stored PKCE data
     */
    static getPKCERedirectUri(state) {
        const pkceData = pkceStore.get(state);
        return pkceData?.redirectUri || null;
    }
    // ============================================
    // Token Refresh
    // ============================================
    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken) {
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to refresh Google access token');
            throw new Error('Failed to refresh Google token');
        }
    }
    /**
     * Get user info from Google
     */
    static async getUserInfo(accessToken) {
        try {
            const response = await axios_1.default.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get Google user info');
            throw new Error('Failed to get user info from Google');
        }
    }
    // ============================================
    // Authentication Handlers (with PKCE)
    // ============================================
    /**
     * Handle Google OAuth callback with PKCE verification
     */
    static async handleAuthCallback(code, state, codeVerifier, ipAddress, userAgent) {
        try {
            // Check rate limit
            const rateCheck = this.checkOAuthRateLimit(`callback:${ipAddress || 'unknown'}`);
            if (!rateCheck.allowed) {
                return { success: false, error: rateCheck.error };
            }
            // Verify PKCE
            const pkceCheck = this.verifyPKCE(state, codeVerifier);
            if (!pkceCheck.valid) {
                logger_1.logger.error({ state: state?.substring(0, 8), ipAddress }, 'PKCE verification failed in callback');
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
            let user = await user_repository_1.UserRepository.findByEmail(googleUser.email);
            let isNewUser = false;
            if (!user) {
                // Create new user
                user = await user_repository_1.UserRepository.create({
                    email: googleUser.email,
                    name: googleUser.name,
                    avatarUrl: googleUser.picture,
                    planId: 'FREE',
                    apiKeyHash: crypto_1.default.createHash('sha256').update(`ak_${crypto_1.default.randomBytes(32).toString('hex')}`).digest('hex'),
                    apiKeyPrefix: 'ak_temp',
                });
                isNewUser = true;
                logger_1.logger.info({ userId: user.id, email: user.email }, 'New user created via Google OAuth');
            }
            if (!user.isActive) {
                return { success: false, error: 'Account is disabled. Please contact support.' };
            }
            // Store OAuth tokens for services
            const expiresAt = new Date(Date.now() + googleTokens.expires_in * 1000);
            await Promise.all([
                oauth_repository_1.OAuthRepository.upsertConnection({
                    userId: user.id,
                    provider: client_2.OAuthProvider.GOOGLE_GMAIL,
                    accessToken: googleTokens.access_token,
                    refreshToken: googleTokens.refresh_token,
                    expiresAt,
                    scope: googleTokens.scope,
                    providerUserId: googleUser.id,
                    providerEmail: googleUser.email,
                }),
                oauth_repository_1.OAuthRepository.upsertConnection({
                    userId: user.id,
                    provider: client_2.OAuthProvider.GOOGLE_DRIVE,
                    accessToken: googleTokens.access_token,
                    refreshToken: googleTokens.refresh_token,
                    expiresAt,
                    scope: googleTokens.scope,
                    providerUserId: googleUser.id,
                    providerEmail: googleUser.email,
                }),
                oauth_repository_1.OAuthRepository.upsertConnection({
                    userId: user.id,
                    provider: client_2.OAuthProvider.GOOGLE_CALENDAR,
                    accessToken: googleTokens.access_token,
                    refreshToken: googleTokens.refresh_token,
                    expiresAt,
                    scope: googleTokens.scope,
                    providerUserId: googleUser.id,
                    providerEmail: googleUser.email,
                }),
            ]);
            // Generate JWT tokens
            const accessToken = auth_service_1.AuthService.generateAccessToken(user.id, user.email, user.role, user.planId);
            const { token: refreshToken } = auth_service_1.AuthService.generateRefreshToken(user.id, user.email, user.role, user.planId);
            // Create token family
            await auth_service_1.AuthService.createTokenFamily(user.id, refreshToken);
            // Create session
            await auth_service_1.AuthService.createSession(user.id, refreshToken, ipAddress, userAgent);
            // Update last login
            await user_repository_1.UserRepository.updateLastLogin(user.id, ipAddress, userAgent);
            // Log security event
            await client_1.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'oauth_login',
                    entityType: 'oauth_connection',
                    entityId: googleUser.id,
                    ipAddress,
                    userAgent,
                    metadata: { provider: 'google', isNewUser },
                },
            });
            logger_1.logger.info({ userId: user.id, isNewUser }, 'Google OAuth authentication successful');
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Google OAuth callback failed');
            return { success: false, error: 'Google authentication failed. Please try again.' };
        }
    }
    // ============================================
    // Service Connection Management
    // ============================================
    /**
     * Connect additional Google service
     */
    static async connectService(userId, code, state, codeVerifier, provider) {
        try {
            // Verify PKCE
            const pkceCheck = this.verifyPKCE(state, codeVerifier);
            if (!pkceCheck.valid) {
                return { success: false, error: pkceCheck.error };
            }
            const googleTokens = await this.getTokens(code, state, codeVerifier);
            const googleUser = await this.getUserInfo(googleTokens.access_token);
            const expiresAt = new Date(Date.now() + googleTokens.expires_in * 1000);
            await oauth_repository_1.OAuthRepository.upsertConnection({
                userId,
                provider,
                accessToken: googleTokens.access_token,
                refreshToken: googleTokens.refresh_token,
                expiresAt,
                scope: googleTokens.scope,
                providerUserId: googleUser.id,
                providerEmail: googleUser.email,
            });
            logger_1.logger.info({ userId, provider }, 'Google service connected successfully');
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to connect Google service');
            return { success: false, error: 'Failed to connect service. Please try again.' };
        }
    }
    /**
     * Disconnect a Google service
     */
    static async disconnectService(userId, provider) {
        try {
            const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, provider);
            if (connection) {
                await this.revokeAccess(connection.accessToken);
            }
            await oauth_repository_1.OAuthRepository.deleteConnection(userId, provider);
            logger_1.logger.info({ userId, provider }, 'Google service disconnected');
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to disconnect Google service');
            return { success: false, error: 'Failed to disconnect service. Please try again.' };
        }
    }
    /**
     * Revoke Google access
     */
    static async revokeAccess(accessToken) {
        try {
            await axios_1.default.post('https://oauth2.googleapis.com/revoke', `token=${accessToken}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            logger_1.logger.info('Google access revoked successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to revoke Google access');
            return false;
        }
    }
    /**
     * Get valid access token for a user's service
     */
    static async getValidAccessToken(userId, provider) {
        try {
            const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, provider);
            if (!connection) {
                logger_1.logger.warn({ userId, provider }, 'No OAuth connection found');
                return null;
            }
            const isExpiring = connection.expiresAt &&
                connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
            if (isExpiring && connection.refreshToken) {
                const refreshed = await this.refreshAccessToken(connection.refreshToken);
                await oauth_repository_1.OAuthRepository.updateTokens(userId, provider, {
                    accessToken: refreshed.access_token,
                    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                    syncStatus: client_2.SyncStatus.SUCCESS,
                });
                return refreshed.access_token;
            }
            return connection.accessToken;
        }
        catch (error) {
            logger_1.logger.error({ error, userId, provider }, 'Failed to get valid access token');
            await oauth_repository_1.OAuthRepository.updateSyncStatus(userId, provider, client_2.SyncStatus.ERROR, String(error));
            return null;
        }
    }
    /**
     * Check if user has connected a specific Google service
     */
    static async isServiceConnected(userId, provider) {
        const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, provider);
        return !!connection && connection.syncStatus !== client_2.SyncStatus.ERROR;
    }
    /**
     * Get all connected Google services for a user
     */
    static async getConnectedServices(userId) {
        const connections = await client_1.prisma.oAuthConnection.findMany({
            where: {
                userId,
                provider: {
                    in: [
                        client_2.OAuthProvider.GOOGLE_GMAIL,
                        client_2.OAuthProvider.GOOGLE_DRIVE,
                        client_2.OAuthProvider.GOOGLE_CALENDAR,
                        client_2.OAuthProvider.GOOGLE_TASKS,
                    ],
                },
                syncStatus: { not: client_2.SyncStatus.ERROR },
            },
            select: { provider: true },
        });
        return connections.map(c => c.provider);
    }
}
exports.GoogleOAuthService = GoogleOAuthService;
GoogleOAuthService.oAuth2Client = null;
// Initialize on module load
GoogleOAuthService.init();
//# sourceMappingURL=google-oauth.service.js.map