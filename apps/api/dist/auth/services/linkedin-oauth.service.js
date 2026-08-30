"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedInOAuthService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/linkedin-oauth.service.ts
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("../../db/client");
const oauth_repository_1 = require("../../db/repositories/oauth.repository");
const logger_1 = require("../../utils/logger");
const client_2 = require("@prisma/client");
const pkceStore = new Map();
const PKCE_EXPIRY_MS = 10 * 60 * 1000;
class LinkedInOAuthService {
    /**
     * Generate PKCE for LinkedIn
     */
    static generatePKCE() {
        const codeVerifier = crypto_1.default.randomBytes(32).toString('base64url').replace(/=/g, '');
        const hash = crypto_1.default.createHash('sha256').update(codeVerifier).digest();
        const codeChallenge = hash.toString('base64url').replace(/=/g, '');
        return { codeVerifier, codeChallenge };
    }
    /**
     * Generate secure state parameter
     */
    static generateState() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Store PKCE challenge
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
    }
    /**
     * Verify PKCE challenge
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
            const challengeHash = crypto_1.default.createHash('sha256').update(codeVerifier).digest().toString('base64url').replace(/=/g, '');
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
    static clearPKCE(state) {
        pkceStore.delete(state);
    }
    /**
     * Generate LinkedIn OAuth URL with PKCE
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
        return {
            url: `${this.AUTH_URL}?${params.toString()}`,
            state: stateParam,
            codeVerifier,
        };
    }
    /**
     * Exchange code for tokens with PKCE verification
     */
    static async getTokens(code, state, codeVerifier) {
        try {
            const pkceCheck = this.verifyPKCE(state, codeVerifier);
            if (!pkceCheck.valid) {
                throw new Error(pkceCheck.error);
            }
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: pkceCheck.pkceData.redirectUri || this.REDIRECT_URI,
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
                code_verifier: codeVerifier,
            });
            const response = await axios_1.default.post(this.TOKEN_URL, params.toString(), {
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to exchange LinkedIn OAuth code');
            throw new Error('Failed to get LinkedIn tokens');
        }
    }
    /**
     * Handle LinkedIn OAuth callback
     */
    static async handleAuthCallback(code, state, codeVerifier, userId, ipAddress, userAgent) {
        try {
            const pkceCheck = this.verifyPKCE(state, codeVerifier);
            if (!pkceCheck.valid) {
                logger_1.logger.error({ state: state?.substring(0, 8), ipAddress }, 'LinkedIn PKCE verification failed');
                return { success: false, error: pkceCheck.error };
            }
            const tokens = await this.getTokens(code, state, codeVerifier);
            const linkedInUser = await this.getUserInfo(tokens.access_token);
            let user = userId ? await client_1.prisma.user.findUnique({ where: { id: userId } }) : null;
            let isNewUser = false;
            if (!user) {
                user = await client_1.prisma.user.findUnique({ where: { email: linkedInUser.email } });
                if (!user) {
                    user = await client_1.prisma.user.create({
                        data: {
                            email: linkedInUser.email,
                            name: `${linkedInUser.firstName} ${linkedInUser.lastName}`.trim(),
                            avatarUrl: linkedInUser.profilePicture,
                            planId: 'FREE',
                            apiKey: crypto_1.default.createHash('sha256').update(`ak_${crypto_1.default.randomBytes(32).toString('hex')}`).digest('hex'),
                            apiKeyPrefix: 'ak_temp',
                            metadata: {
                                linkedInId: linkedInUser.id,
                                linkedInHeadline: linkedInUser.headline,
                            },
                        },
                    });
                    isNewUser = true;
                    logger_1.logger.info({ userId: user.id, email: user.email }, 'New user created via LinkedIn OAuth');
                }
            }
            if (!user.isActive) {
                return { success: false, error: 'Account is disabled.' };
            }
            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
            await oauth_repository_1.OAuthRepository.upsertConnection({
                userId: user.id,
                provider: client_2.OAuthProvider.LINKEDIN,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
                scope: tokens.scope,
                providerUserId: linkedInUser.id,
                providerEmail: linkedInUser.email,
            });
            this.clearPKCE(state);
            // Log security event
            await client_1.prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'oauth_login',
                    entityType: 'oauth_connection',
                    entityId: linkedInUser.id,
                    ipAddress,
                    userAgent,
                    metadata: { provider: 'linkedin', isNewUser },
                },
            });
            logger_1.logger.info({ userId: user.id, isNewUser }, 'LinkedIn OAuth authentication successful');
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
            logger_1.logger.error({ error }, 'LinkedIn OAuth callback failed');
            return { success: false, error: 'LinkedIn authentication failed.' };
        }
    }
    /**
     * Get user info from LinkedIn
     */
    static async getUserInfo(accessToken) {
        try {
            const [profileResponse, emailResponse] = await Promise.all([
                axios_1.default.get(this.PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } }),
                axios_1.default.get(this.EMAIL_URL, { headers: { Authorization: `Bearer ${accessToken}` } }),
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
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get LinkedIn user info');
            throw new Error('Failed to get user info from LinkedIn');
        }
    }
    /**
     * Post to LinkedIn
     */
    static async postToLinkedIn(userId, content, mediaUrl) {
        try {
            const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, client_2.OAuthProvider.LINKEDIN);
            if (!connection) {
                return { success: false, error: 'LinkedIn account not connected' };
            }
            let accessToken = connection.accessToken;
            if (connection.expiresAt && connection.expiresAt < new Date() && connection.refreshToken) {
                const refreshed = await this.refreshAccessToken(connection.refreshToken);
                accessToken = refreshed.access_token;
                await oauth_repository_1.OAuthRepository.updateTokens(userId, client_2.OAuthProvider.LINKEDIN, {
                    accessToken,
                    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                    syncStatus: client_2.SyncStatus.SUCCESS,
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
            const response = await axios_1.default.post('https://api.linkedin.com/v2/ugcPosts', postData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            });
            logger_1.logger.info({ userId, postId: response.data.id }, 'Posted to LinkedIn successfully');
            return { success: true, postId: response.data.id };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to post to LinkedIn');
            return { success: false, error: error.response?.data?.message || 'Failed to post to LinkedIn' };
        }
    }
    /**
     * Refresh LinkedIn access token
     */
    static async refreshAccessToken(refreshToken) {
        try {
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: this.CLIENT_ID,
                client_secret: this.CLIENT_SECRET,
            });
            const response = await axios_1.default.post(this.TOKEN_URL, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in || 5184000,
                refresh_token: response.data.refresh_token,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to refresh LinkedIn access token');
            throw new Error('Failed to refresh LinkedIn token');
        }
    }
    /**
     * Get valid access token
     */
    static async getValidAccessToken(userId) {
        try {
            const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, client_2.OAuthProvider.LINKEDIN);
            if (!connection)
                return null;
            const isExpiring = connection.expiresAt && connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
            if (isExpiring && connection.refreshToken) {
                const refreshed = await this.refreshAccessToken(connection.refreshToken);
                await oauth_repository_1.OAuthRepository.updateTokens(userId, client_2.OAuthProvider.LINKEDIN, {
                    accessToken: refreshed.access_token,
                    refreshToken: refreshed.refresh_token || connection.refreshToken,
                    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                    syncStatus: client_2.SyncStatus.SUCCESS,
                });
                return refreshed.access_token;
            }
            return connection.accessToken;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get valid LinkedIn access token');
            await oauth_repository_1.OAuthRepository.updateSyncStatus(userId, client_2.OAuthProvider.LINKEDIN, client_2.SyncStatus.ERROR, String(error));
            return null;
        }
    }
    /**
     * Check if LinkedIn is connected
     */
    static async isConnected(userId) {
        const connection = await oauth_repository_1.OAuthRepository.getConnection(userId, client_2.OAuthProvider.LINKEDIN);
        return !!connection && connection.syncStatus !== client_2.SyncStatus.ERROR;
    }
    /**
     * Disconnect LinkedIn
     */
    static async disconnect(userId) {
        try {
            await oauth_repository_1.OAuthRepository.deleteConnection(userId, client_2.OAuthProvider.LINKEDIN);
            logger_1.logger.info({ userId }, 'LinkedIn account disconnected');
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to disconnect LinkedIn');
            return false;
        }
    }
}
exports.LinkedInOAuthService = LinkedInOAuthService;
LinkedInOAuthService.CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
LinkedInOAuthService.CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
LinkedInOAuthService.REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
LinkedInOAuthService.AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
LinkedInOAuthService.TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
LinkedInOAuthService.USER_INFO_URL = 'https://api.linkedin.com/v2/userinfo';
LinkedInOAuthService.PROFILE_URL = 'https://api.linkedin.com/v2/me';
LinkedInOAuthService.EMAIL_URL = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
LinkedInOAuthService.SCOPES = [
    'openid',
    'profile',
    'email',
    'w_member_social',
];
//# sourceMappingURL=linkedin-oauth.service.js.map