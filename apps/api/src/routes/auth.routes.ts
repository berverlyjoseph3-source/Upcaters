// enterprise-ai-agent-platform/apps/api/src/routes/auth.routes.ts
import { Router, Response } from 'express';
import { AuthController } from '../auth/controllers/auth.controller';
import { JwtAuthGuard, AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';
import { loginRateLimit, registerRateLimit } from '../auth/middleware/rate-limit.middleware';

const router = Router();

// ============================================
// Public Routes (No Authentication Required)
// ============================================

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  registerRateLimit,
  AuthController.register
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  loginRateLimit,
  AuthController.login
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  RateLimitMiddleware.moderate(),
  AuthController.refresh
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  RateLimitMiddleware.limiter({ windowMs: 60 * 60 * 1000, maxRequests: 3 }),
  AuthController.forgotPassword
);

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post(
  '/reset-password',
  RateLimitMiddleware.moderate(),
  AuthController.resetPassword
);

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  RateLimitMiddleware.relaxed(),
  AuthController.googleAuth
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback handler
 */
router.get(
  '/google/callback',
  RateLimitMiddleware.relaxed(),
  AuthController.googleCallback
);

/**
 * GET /api/auth/linkedin
 * Initiate LinkedIn OAuth flow
 */
router.get(
  '/linkedin',
  RateLimitMiddleware.relaxed(),
  (req, res) => {
    const { LinkedInOAuthService } = require('../auth/services/linkedin-oauth.service');
    const authUrl = LinkedInOAuthService.getAuthUrl();
    res.redirect(authUrl);
  }
);

/**
 * GET /api/auth/linkedin/callback
 * LinkedIn OAuth callback handler
 */
router.get(
  '/linkedin/callback',
  RateLimitMiddleware.relaxed(),
  async (req, res) => {
    const { code } = req.query;
    const { LinkedInOAuthService } = require('../auth/services/linkedin-oauth.service');
    const result = await LinkedInOAuthService.handleAuthCallback(
      code as string,
      undefined,
      req.ip,
      req.headers['user-agent']
    );
    
    if (result.success) {
      // Set refresh token cookie
      // Redirect to frontend with access token
      res.redirect(`${process.env.APP_URL}/auth/callback?access_token=${result.user?.tempToken}&provider=linkedin`);
    } else {
      res.redirect(`${process.env.APP_URL}/login?error=linkedin_auth_failed`);
    }
  }
);

/**
 * GET /api/auth/facebook
 * Initiate Facebook OAuth flow
 */
router.get(
  '/facebook',
  RateLimitMiddleware.relaxed(),
  (req, res) => {
    const { FacebookOAuthService } = require('../auth/services/facebook-oauth.service');
    const authUrl = FacebookOAuthService.getAuthUrl();
    res.redirect(authUrl);
  }
);

/**
 * GET /api/auth/facebook/callback
 * Facebook OAuth callback handler
 */
router.get(
  '/facebook/callback',
  RateLimitMiddleware.relaxed(),
  async (req, res) => {
    const { code } = req.query;
    const { FacebookOAuthService } = require('../auth/services/facebook-oauth.service');
    const result = await FacebookOAuthService.handleAuthCallback(
      code as string,
      undefined,
      req.ip,
      req.headers['user-agent']
    );
    
    if (result.success) {
      res.redirect(`${process.env.APP_URL}/auth/callback?access_token=${result.user?.tempToken}&provider=facebook`);
    } else {
      res.redirect(`${process.env.APP_URL}/login?error=facebook_auth_failed`);
    }
  }
);

/**
 * GET /api/auth/twitter
 * Initiate Twitter OAuth flow
 */
router.get(
  '/twitter',
  RateLimitMiddleware.relaxed(),
  (req, res) => {
    const { TwitterOAuthService } = require('../auth/services/twitter-oauth.service');
    const { url, codeVerifier } = TwitterOAuthService.getAuthUrl();
    // Store codeVerifier in session or temporary storage
    req.session = req.session || {};
    (req.session as any).twitterCodeVerifier = codeVerifier;
    res.redirect(url);
  }
);

/**
 * GET /api/auth/twitter/callback
 * Twitter OAuth callback handler
 */
router.get(
  '/twitter/callback',
  RateLimitMiddleware.relaxed(),
  async (req, res) => {
    const { code } = req.query;
    const codeVerifier = (req.session as any)?.twitterCodeVerifier;
    const { TwitterOAuthService } = require('../auth/services/twitter-oauth.service');
    const result = await TwitterOAuthService.handleAuthCallback(
      code as string,
      codeVerifier,
      undefined,
      req.ip,
      req.headers['user-agent']
    );
    
    if (result.success) {
      res.redirect(`${process.env.APP_URL}/auth/callback?access_token=${result.user?.tempToken}&provider=twitter`);
    } else {
      res.redirect(`${process.env.APP_URL}/login?error=twitter_auth_failed`);
    }
  }
);

// ============================================
// Protected Routes (Authentication Required)
// ============================================

/**
 * POST /api/auth/logout
 * Logout current user (revoke current session)
 */
router.post(
  '/logout',
  JwtAuthGuard.protect,
  AuthController.logout
);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post(
  '/logout-all',
  JwtAuthGuard.protect,
  AuthController.logoutAll
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  JwtAuthGuard.protect,
  AuthController.getMe
);

/**
 * GET /api/auth/sessions
 * Get all active sessions for current user
 */
router.get(
  '/sessions',
  JwtAuthGuard.protect,
  AuthController.getSessions
);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete(
  '/sessions/:sessionId',
  JwtAuthGuard.protect,
  AuthController.revokeSession
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  JwtAuthGuard.protect,
  AuthController.changePassword
);

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 */
router.post(
  '/resend-verification',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { PasswordResetService } = require('../auth/services/password-reset.service');
    const result = await PasswordResetService.resendVerification(req.user!.email);
    res.json(result);
  }
);

/**
 * GET /api/auth/verify-email
 * Verify email with token
 */
router.get(
  '/verify-email',
  RateLimitMiddleware.relaxed(),
  async (req, res) => {
    const { token } = req.query;
    const { PasswordResetService } = require('../auth/services/password-reset.service');
    const result = await PasswordResetService.verifyEmail(token as string);
    
    if (result.success) {
      res.redirect(`${process.env.APP_URL}/login?email_verified=true`);
    } else {
      res.redirect(`${process.env.APP_URL}/login?error=email_verification_failed`);
    }
  }
);

// ============================================
// API Key Protected Routes
// ============================================

/**
 * GET /api/auth/api-key
 * Get current API key info
 */
router.get(
  '/api-key',
  JwtAuthGuard.protect,
  RolesGuard.requirePermission('api:key:manage'),
  AuthController.getApiKey
);

/**
 * POST /api/auth/api-key
 * Generate new API key
 */
router.post(
  '/api-key',
  JwtAuthGuard.protect,
  RolesGuard.requirePermission('api:key:manage'),
  AuthController.generateApiKey
);

/**
 * DELETE /api/auth/api-key
 * Revoke current API key
 */
router.delete(
  '/api-key',
  JwtAuthGuard.protect,
  RolesGuard.requirePermission('api:key:manage'),
  AuthController.revokeApiKey
);

// ============================================
// OAuth Service Management Routes
// ============================================

/**
 * GET /api/auth/connected-services
 * Get all connected OAuth services
 */
router.get(
  '/connected-services',
  JwtAuthGuard.protect,
  AuthController.getGoogleServices
);

/**
 * POST /api/auth/connect/google/:service
 * Connect a Google service
 */
router.post(
  '/connect/google/:service',
  JwtAuthGuard.protect,
  AuthController.connectGoogleService
);

/**
 * DELETE /api/auth/disconnect/google/:service
 * Disconnect a Google service
 */
router.delete(
  '/disconnect/google/:service',
  JwtAuthGuard.protect,
  AuthController.disconnectGoogleService
);

/**
 * POST /api/auth/connect/linkedin
 * Connect LinkedIn account
 */
router.post(
  '/connect/linkedin',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body;
    const { LinkedInOAuthService } = require('../auth/services/linkedin-oauth.service');
    const result = await LinkedInOAuthService.handleAuthCallback(
      code,
      req.user!.id,
      req.ip,
      req.headers['user-agent']
    );
    res.json(result);
  }
);

/**
 * DELETE /api/auth/disconnect/linkedin
 * Disconnect LinkedIn account
 */
router.delete(
  '/disconnect/linkedin',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { LinkedInOAuthService } = require('../auth/services/linkedin-oauth.service');
    const result = await LinkedInOAuthService.disconnect(req.user!.id);
    res.json({ success: result });
  }
);

/**
 * POST /api/auth/connect/facebook
 * Connect Facebook account
 */
router.post(
  '/connect/facebook',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { code } = req.body;
    const { FacebookOAuthService } = require('../auth/services/facebook-oauth.service');
    const result = await FacebookOAuthService.handleAuthCallback(
      code,
      req.user!.id,
      req.ip,
      req.headers['user-agent']
    );
    res.json(result);
  }
);

/**
 * DELETE /api/auth/disconnect/facebook
 * Disconnect Facebook account
 */
router.delete(
  '/disconnect/facebook',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { FacebookOAuthService } = require('../auth/services/facebook-oauth.service');
    const result = await FacebookOAuthService.disconnect(req.user!.id, 'FACEBOOK');
    res.json({ success: result });
  }
);

/**
 * POST /api/auth/connect/twitter
 * Connect Twitter account
 */
router.post(
  '/connect/twitter',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { code, codeVerifier } = req.body;
    const { TwitterOAuthService } = require('../auth/services/twitter-oauth.service');
    const result = await TwitterOAuthService.handleAuthCallback(
      code,
      codeVerifier,
      req.user!.id,
      req.ip,
      req.headers['user-agent']
    );
    res.json(result);
  }
);

/**
 * DELETE /api/auth/disconnect/twitter
 * Disconnect Twitter account
 */
router.delete(
  '/disconnect/twitter',
  JwtAuthGuard.protect,
  async (req: AuthenticatedRequest, res: Response) => {
    const { TwitterOAuthService } = require('../auth/services/twitter-oauth.service');
    const result = await TwitterOAuthService.disconnect(req.user!.id);
    res.json({ success: result });
  }
);

export default router;