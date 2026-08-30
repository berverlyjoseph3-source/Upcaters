"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwitterOAuthService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/twitter-oauth.service.ts
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../../db/client");
const oauth_repository_1 = require("../../db/repositories/oauth.repository");
const logger_1 = require("../../utils/logger");
const client_2 = require("@prisma/client");
const pkceStore = new Map();
const PKCE_EXPIRY_MS = 10 * 60 * 1000;
class TwitterOAuthService {
    /**
     * Generate PKCE for Twitter (requires S256)
     */
    static generatePKCE() {
        const codeVerifier = crypto_1.default.randomBytes(32).toString('base64url').replace(/=/g, '');
        const hash = crypto_1.default.createHash('sha256').update(codeVerifier).digest();
        const codeChallenge = hash.toString('base64url').replace(/=/g, '');
        return { codeVerifier, codeChallenge };
    }
    /**
     * Generate secure state
     */
    static generateState() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Store PKCE
     */
    static storePKCE(codeVerifier, codeChallenge, state, redirectUri, userId) {
        pkceStore.set(state, {
            codeVerifier,
            codeChallenge,
            state,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + PKCE_EXPIRY_MS),
            redirectUri,
            userId,
        });
        logger_1.logger.debug({ state: state.substring(0, 8), userId }, 'Twitter PKCE stored');
    }
    /**
     * Verify PKCE
     */
    static verifyPKCE(state, codeVerifier) {
        const pkceData = pkceStore.get(state);
        if (!pkceData)
            return { valid: false, error: 'Invalid state. Session expired.' };
        if (new Date() > pkceData.expiresAt) {
            pkceStore.delete(state);
            return { valid: false, error: 'Session expired. Please try again.' };
        }
        if (codeVerifier) {
            const challengeHash = crypto_1.default.createHash('sha256').update(codeVerifier).digest()
                .toString('base64url').replace(/=/g, '');
            if (challengeHash !== pkceData.codeChallenge) {
                pkceStore.delete(state);
                logger_1.logger.error({ state: state.substring(0, 8) }, 'Twitter PKCE verification failed');
                return { valid: false, error: 'PKCE verification failed. Possible CSRF attack.' };
            }
        }
        return { valid: true, pkceData };
    }
    /**
     * Clear PKCE
     */
    static clearPKCE(state) {
        pkceStore.delete(state);
    }
    /**
     * Generate Twitter OAuth URL with PKCE
     */
    static getAuthUrl(state, redirectUri, userId) {
        const stateParam = state || this.generateState();
        const { codeVerifier, codeChallenge } = this.generatePKCE();
        const redirectUriParam = redirectUri || this.REDIRECT_URI;
        this.storePKCE(codeVerifier, codeChallenge, stateParam, redirectUriParam, userId);
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.CLIENT_ID,
            redirect_uri: redirectUriParam,
            scope: this.SCOPES.join(' '),
            state: stateParam,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        logger_1.logger.info({ state: stateParam.substring(0, 8), userId }, 'Twitter OAuth URL generated with PKCE');
        return {
            url: `${this.AUTH_URL}?${params.toString()}`,
            state: stateParam,
            codeVerifier,
        };
    }
    /**
     * Exchange authorization code for tokens with PKCE
     */
    static async getTokens(code, state, codeVerifier) {
        try {
            const pkceCheck = this.verifyPKCE(state, codeVerifier);
            if (!pkceCheck.valid) {
                throw new Error(pkceCheck.error);
            }
            const params = new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: this.CLIENT_ID,
                redirect_uri: pkceCheck.pkceData.redirectUri || this.REDIRECT_URI,
                code_verifier: codeVerifier,
            });
            const auth = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64');
            const response = await axios_1.default.post(this.TOKEN_URL, params.toString(), {
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
        }
        catch (error) {
            logger_1.logger.error({ error, state: state?.substring(0, 8) }, 'Failed to exchange Twitter OAuth code');
            throw new Error('Failed to get Twitter tokens');
        }
    }
    /**
     * Refresh access token
     */
    static async refreshAccessToken(refreshToken) {
        try {
            const params = new URLSearchParams({
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                client_id: this.CLIENT_ID,
            });
            const auth = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64');
            const response = await axios_1.default.post(this.TOKEN_URL, params.toString(), {
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to refresh Twitter access token');
            throw new Error('Failed to refresh Twitter token');
        }
    }
    /**
     * Get user info from Twitter
     */
    static async getUserInfo(accessToken) {
        try {
            const params = new URLSearchParams({
                'user.fields': 'id,name,username,profile_image_url,verified',
            });
            const response = await axios_1.default.get(`${this.USER_INFO_URL}?${params.toString()}`, {
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get Twitter user info');
            throw new Error('Failed to get user info from Twitter');
        }
    }
    /**
     * Handle Twitter OAuth callback with PKCE
     */
    static async handleAuthCallback(code, state, codeVerifier, userId, ipAddress, userAgent) {
        try {
            const pkceCheck = this.verifyPKCE(state, codeVerifier);
            if (!pkceCheck.valid) {
                logger_1.logger.error({ state: state?.substring(0, 8), ipAddress }, 'Twitter PKCE verification failed');
                return { success: false, error: pkceCheck.error };
            }
            const tokens = await this.getTokens(code, state, codeVerifier);
            const twitterUser = await this.getUserInfo(tokens.access_token);
            let user = userId ? await client_1.prisma.user.findUnique({ where: { id: userId } }) : null;
            let isNewUser = false;
            if (!user) {
                user = await client_1.prisma.user.findUnique({ where: { email: twitterUser.email } });
                if (!user) {
                    user = await client_1.prisma.user.create({
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
                    logger_1.logger.info({ userId: user.id, email: user.email }, 'New user created via Twitter OAuth');
                }
            }
            if (!user.isActive) {
                return { success: false, error: 'Account is disabled. Please contact support.' };
            }
            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
            await oauth_repository_1.OAuthRepository.upsertConnection({
                userId: user.id,
                provider: client_2.OAuthProvider.X_TWITTER,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
                scope: tokens.scope,
                providerUserId: twitterUser.id,
                providerEmail: twitterUser.email,
            });
            this.clearPKCE(state);
            // Log security event
            await client_1.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'oauth_login',
                    entityType: 'oauth_connection',
                    entityId: twitterUser.id,
                    ipAddress,
                    userAgent,
                    metadata: { provider: 'twitter', isNewUser },
                },
            });
            logger_1.logger.info({ userId: user.id, isNewUser }, 'Twitter OAuth authentication successful');
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Twitter OAuth callback failed');
            return { success: false, error: 'Twitter authentication failed. Please try again.' };
        }
    }
    /**
     * Post tweet
     */
    static async postTweet(userId, content, mediaUrl, replyToTweetId) {
        try {
            if (content.length > 280) {
                return { success: false, error: 'Tweet exceeds 280 character limit' };
            }
            const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, client_2.OAuthProvider.X_TWITTER);
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
                await oauth_repository_1.OAuthRepository.updateTokens(userId, client_2.OAuthProvider.X_TWITTER, {
                    accessToken,
                    refreshToken: refreshed.refresh_token,
                    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                    syncStatus: client_2.SyncStatus.SUCCESS,
                });
            }
            const tweetData = { text: content };
            if (replyToTweetId) {
                tweetData.reply = { in_reply_to_tweet_id: replyToTweetId };
            }
            // Handle media upload if URL provided
            if (mediaUrl) {
                const imageResponse = await axios_1.default.get(mediaUrl, { responseType: 'arraybuffer' });
                const mediaUploadResponse = await axios_1.default.post('https://upload.twitter.com/1.1/media/upload.json', imageResponse.data, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/octet-stream',
                    },
                });
                tweetData.media = { media_ids: [mediaUploadResponse.data.media_id_string] };
            }
            const response = await axios_1.default.post(this.POST_URL, tweetData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            logger_1.logger.info({ userId, tweetId: response.data.data.id }, 'Tweet posted successfully');
            return { success: true, postId: response.data.data.id };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to post tweet');
            return { success: false, error: error.response?.data?.detail || 'Failed to post tweet' };
        }
    }
    /**
     * Get valid access token
     */
    static async getValidAccessToken(userId) {
        try {
            const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, client_2.OAuthProvider.X_TWITTER);
            if (!connection)
                return null;
            const isExpiring = connection.expiresAt &&
                connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
            if (isExpiring && connection.refreshToken) {
                const refreshed = await this.refreshAccessToken(connection.refreshToken);
                await oauth_repository_1.OAuthRepository.updateTokens(userId, client_2.OAuthProvider.X_TWITTER, {
                    accessToken: refreshed.access_token,
                    refreshToken: refreshed.refresh_token,
                    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                    syncStatus: client_2.SyncStatus.SUCCESS,
                });
                return refreshed.access_token;
            }
            return connection.accessToken;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get valid Twitter access token');
            await oauth_repository_1.OAuthRepository.updateSyncStatus(userId, client_2.OAuthProvider.X_TWITTER, client_2.SyncStatus.ERROR, String(error));
            return null;
        }
    }
    /**
     * Check if connected
     */
    static async isConnected(userId) {
        const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, client_2.OAuthProvider.X_TWITTER);
        return !!connection && connection.syncStatus !== client_2.SyncStatus.ERROR;
    }
    /**
     * Disconnect
     */
    static async disconnect(userId) {
        try {
            await oauth_repository_1.OAuthRepository.deleteConnection(userId, client_2.OAuthProvider.X_TWITTER);
            logger_1.logger.info({ userId }, 'Twitter account disconnected');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to disconnect Twitter');
            return false;
        }
    }
}
exports.TwitterOAuthService = TwitterOAuthService;
TwitterOAuthService.CLIENT_ID = process.env.TWITTER_CLIENT_ID;
TwitterOAuthService.CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
TwitterOAuthService.REDIRECT_URI = process.env.TWITTER_REDIRECT_URI;
TwitterOAuthService.AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
TwitterOAuthService.TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
TwitterOAuthService.USER_INFO_URL = 'https://api.twitter.com/2/users/me';
TwitterOAuthService.POST_URL = 'https://api.twitter.com/2/tweets';
TwitterOAuthService.SCOPES = [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access',
];
//# sourceMappingURL=twitter-oauth.service.js.map