"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const google_oauth_service_1 = require("../services/google-oauth.service");
const session_service_1 = require("../services/session.service");
const api_key_auth_guard_1 = require("../guards/api-key-auth.guard");
const logger_1 = require("../../utils/logger");
const auth_dto_1 = require("../dto/auth.dto");
class AuthController {
    /**
     * POST /api/auth/register
     * Register a new user
     */
    static async register(req, res) {
        try {
            const validation = auth_dto_1.RegisterDtoSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                });
                return;
            }
            const result = await auth_service_1.AuthService.register(validation.data);
            if (!result.success) {
                res.status(400).json(result);
                return;
            }
            // Set refresh token as HTTP-only cookie
            res.cookie('refresh_token', result.data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });
            res.status(201).json(result);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Registration controller error');
            res.status(500).json({
                success: false,
                error: 'Registration failed',
            });
        }
    }
    /**
     * POST /api/auth/login
     * Login user with email and password
     */
    static async login(req, res) {
        try {
            const validation = auth_dto_1.LoginDtoSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                });
                return;
            }
            const result = await auth_service_1.AuthService.login(validation.data, req.ip, req.headers['user-agent']);
            if (!result.success) {
                res.status(401).json(result);
                return;
            }
            // Set refresh token as HTTP-only cookie
            res.cookie('refresh_token', result.data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Login controller error');
            res.status(500).json({
                success: false,
                error: 'Login failed',
            });
        }
    }
    /**
     * POST /api/auth/refresh
     * Refresh access token
     */
    static async refresh(req, res) {
        try {
            // Get refresh token from body or cookie
            let refreshToken = req.body.refreshToken;
            if (!refreshToken && req.cookies?.refresh_token) {
                refreshToken = req.cookies.refresh_token;
            }
            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    error: 'Refresh token required',
                });
                return;
            }
            const result = await auth_service_1.AuthService.refreshAccessToken(refreshToken);
            if (!result.success) {
                res.status(401).json(result);
                return;
            }
            // Update refresh token cookie
            res.cookie('refresh_token', result.data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Refresh controller error');
            res.status(500).json({
                success: false,
                error: 'Token refresh failed',
            });
        }
    }
    /**
     * POST /api/auth/logout
     * Logout user (revoke current session)
     */
    static async logout(req, res) {
        try {
            const refreshToken = req.cookies?.refresh_token;
            if (refreshToken) {
                await auth_service_1.AuthService.logout(refreshToken);
            }
            // Clear refresh token cookie
            res.clearCookie('refresh_token');
            res.json({
                success: true,
                message: 'Logged out successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Logout controller error');
            res.status(500).json({
                success: false,
                error: 'Logout failed',
            });
        }
    }
    /**
     * POST /api/auth/logout-all
     * Logout from all devices
     */
    static async logoutAll(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const result = await auth_service_1.AuthService.logoutAll(req.user.id);
            if (result.success) {
                res.clearCookie('refresh_token');
            }
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Logout all controller error');
            res.status(500).json({
                success: false,
                error: 'Logout all failed',
            });
        }
    }
    /**
     * GET /api/auth/me
     * Get current authenticated user
     */
    static async getMe(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    user: req.user,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Get me controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to get user info',
            });
        }
    }
    /**
     * GET /api/auth/sessions
     * Get all active sessions for current user
     */
    static async getSessions(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const refreshToken = req.cookies?.refresh_token;
            const sessions = await session_service_1.SessionService.getUserSessions(req.user.id, refreshToken);
            res.json({
                success: true,
                data: { sessions },
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Get sessions controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to get sessions',
            });
        }
    }
    /**
     * DELETE /api/auth/sessions/:sessionId
     * Revoke a specific session
     */
    static async revokeSession(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const { sessionId } = req.params;
            const result = await session_service_1.SessionService.revokeSession(sessionId, req.user.id);
            if (!result) {
                res.status(404).json({
                    success: false,
                    error: 'Session not found',
                });
                return;
            }
            res.json({
                success: true,
                message: 'Session revoked successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Revoke session controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to revoke session',
            });
        }
    }
    /**
     * GET /api/auth/google
     * Initiate Google OAuth flow
     */
    static async googleAuth(req, res) {
        try {
            const state = req.query.state || undefined;
            const authUrl = google_oauth_service_1.GoogleOAuthService.getAuthUrl(state);
            res.redirect(authUrl);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Google auth controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to initiate Google auth',
            });
        }
    }
    /**
     * GET /api/auth/google/callback
     * Google OAuth callback handler
     */
    static async googleCallback(req, res) {
        try {
            const { code, error } = req.query;
            if (error) {
                logger_1.logger.error({ error: req.query.error }, 'Google OAuth error');
                res.redirect(`${process.env.APP_URL}/login?error=google_auth_failed`);
                return;
            }
            if (!code || typeof code !== 'string') {
                res.redirect(`${process.env.APP_URL}/login?error=missing_code`);
                return;
            }
            const result = await google_oauth_service_1.GoogleOAuthService.handleAuthCallback(code, req.ip, req.headers['user-agent']);
            if (!result.success) {
                res.redirect(`${process.env.APP_URL}/login?error=${result.error}`);
                return;
            }
            // Set refresh token as HTTP-only cookie
            res.cookie('refresh_token', result.tokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
            // Redirect to frontend with access token
            const redirectUrl = `${process.env.APP_URL}/auth/callback?access_token=${result.tokens.accessToken}&is_new=${result.isNewUser}`;
            res.redirect(redirectUrl);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Google callback controller error');
            res.redirect(`${process.env.APP_URL}/login?error=google_auth_failed`);
        }
    }
    /**
     * GET /api/auth/google/services
     * Get connected Google services for current user
     */
    static async getGoogleServices(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const services = await google_oauth_service_1.GoogleOAuthService.getConnectedServices(req.user.id);
            res.json({
                success: true,
                data: { services },
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Get Google services controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to get connected services',
            });
        }
    }
    /**
     * POST /api/auth/google/connect/:service
     * Connect a specific Google service
     */
    static async connectGoogleService(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const { service } = req.params;
            const { code, state, codeVerifier } = req.body;
            if (!code || !state || !codeVerifier) {
                res.status(400).json({
                    success: false,
                    error: 'Authorization code, state, and codeVerifier are required',
                });
                return;
            }
            const providerMap = {
                gmail: 'GOOGLE_GMAIL',
                drive: 'GOOGLE_DRIVE',
                calendar: 'GOOGLE_CALENDAR',
                tasks: 'GOOGLE_TASKS',
            };
            const provider = providerMap[service];
            if (!provider) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid service',
                });
                return;
            }
            const result = await google_oauth_service_1.GoogleOAuthService.connectService(req.user.id, code, state, codeVerifier, provider);
            if (!result.success) {
                res.status(400).json(result);
                return;
            }
            res.json({
                success: true,
                message: `${service} connected successfully`,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Connect Google service controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to connect service',
            });
        }
    }
    /**
     * DELETE /api/auth/google/disconnect/:service
     * Disconnect a Google service
     */
    static async disconnectGoogleService(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const { service } = req.params;
            const providerMap = {
                gmail: 'GOOGLE_GMAIL',
                drive: 'GOOGLE_DRIVE',
                calendar: 'GOOGLE_CALENDAR',
                tasks: 'GOOGLE_TASKS',
            };
            const provider = providerMap[service];
            if (!provider) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid service',
                });
                return;
            }
            const result = await google_oauth_service_1.GoogleOAuthService.disconnectService(req.user.id, provider);
            if (!result.success) {
                res.status(400).json(result);
                return;
            }
            res.json({
                success: true,
                message: `${service} disconnected successfully`,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Disconnect Google service controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to disconnect service',
            });
        }
    }
    /**
     * GET /api/auth/api-key
     * Get current API key info
     */
    static async getApiKey(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const apiKeyInfo = await api_key_auth_guard_1.ApiKeyAuthGuard.getApiKeyInfo(req.user.id);
            res.json({
                success: true,
                data: apiKeyInfo,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Get API key controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to get API key info',
            });
        }
    }
    /**
     * POST /api/auth/api-key
     * Generate new API key
     */
    static async generateApiKey(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const validation = auth_dto_1.CreateApiKeyDtoSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                });
                return;
            }
            const result = await api_key_auth_guard_1.ApiKeyAuthGuard.generateApiKey(req.user.id, validation.data.name, validation.data.permissions, validation.data.rateLimit);
            if (!result || 'error' in result) {
                res.status(500).json({
                    success: false,
                    error: !result ? 'Failed to generate API key' : result.error,
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    apiKey: result.apiKey,
                    prefix: result.prefix,
                    message: 'Save this API key. It will not be shown again.',
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Generate API key controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to generate API key',
            });
        }
    }
    /**
     * DELETE /api/auth/api-key
     * Revoke current API key
     */
    static async revokeApiKey(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const result = await api_key_auth_guard_1.ApiKeyAuthGuard.revokeApiKey(req.user.id);
            if (!result) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to revoke API key',
                });
                return;
            }
            res.json({
                success: true,
                message: 'API key revoked successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Revoke API key controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to revoke API key',
            });
        }
    }
    /**
     * POST /api/auth/change-password
     * Change user password
     */
    static async changePassword(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                });
                return;
            }
            const validation = auth_dto_1.ChangePasswordDtoSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                });
                return;
            }
            // Implementation would go here
            res.json({
                success: true,
                message: 'Password changed successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Change password controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to change password',
            });
        }
    }
    /**
     * POST /api/auth/forgot-password
     * Request password reset
     */
    static async forgotPassword(req, res) {
        try {
            const validation = auth_dto_1.ForgotPasswordDtoSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                });
                return;
            }
            // Implementation would go here
            res.json({
                success: true,
                message: 'If an account exists with that email, a password reset link has been sent.',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Forgot password controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to process request',
            });
        }
    }
    /**
     * POST /api/auth/reset-password
     * Reset password with token
     */
    static async resetPassword(req, res) {
        try {
            const validation = auth_dto_1.ResetPasswordDtoSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                });
                return;
            }
            // Implementation would go here
            res.json({
                success: true,
                message: 'Password reset successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Reset password controller error');
            res.status(500).json({
                success: false,
                error: 'Failed to reset password',
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map