// enterprise-ai-agent-platform/apps/api/src/routes/user.routes.ts
import { Router } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/plan-gate.middleware';

const router = Router();

// Apply authentication to all user routes
router.use(JwtAuthGuard.protect);

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get(
  '/profile',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          planId: true,
          planStartedAt: true,
          planExpiresAt: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          metadata: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get user profile');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user profile',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
router.put(
  '/profile',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { name, avatarUrl, metadata } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: name !== undefined ? name : undefined,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
          metadata: metadata !== undefined ? metadata : undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          planId: true,
          role: true,
          updatedAt: true,
        },
      });

      logger.info({ userId: req.user.id }, 'User profile updated');

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to update user profile');
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/user/connections
 * Get all OAuth connections for current user
 */
router.get(
  '/connections',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const connections = await prisma.oAuthConnection.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          provider: true,
          providerUserId: true,
          providerEmail: true,
          scope: true,
          syncStatus: true,
          lastSyncedAt: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        data: connections,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get connections');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve connections',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/user/connections/:provider
 * Disconnect an OAuth provider
 */
router.delete(
  '/connections/:provider',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { provider } = req.params;

      await prisma.oAuthConnection.deleteMany({
        where: {
          userId: req.user.id,
          provider: provider.toUpperCase() as any,
        },
      });

      logger.info({ userId: req.user.id, provider }, 'OAuth connection disconnected');

      res.json({
        success: true,
        message: `${provider} disconnected successfully`,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id, provider: req.params.provider }, 'Failed to disconnect');
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect provider',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/user/api-keys
 * Get all API keys for current user
 */
router.get(
  '/api-keys',
  RolesGuard.requirePermission('api:key:manage'),
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          apiKeyPrefix: true,
          metadata: true,
        },
      });

      const metadata = user?.metadata as any;
      const apiKeys = metadata?.apiKeys || [];

      res.json({
        success: true,
        data: {
          currentApiKey: user?.apiKeyPrefix ? {
            prefix: user.apiKeyPrefix,
            name: metadata?.currentApiKey?.name,
            permissions: metadata?.currentApiKey?.permissions,
            createdAt: metadata?.currentApiKey?.createdAt,
            lastUsedAt: metadata?.lastApiKeyUse,
          } : null,
          history: apiKeys,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get API keys');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve API keys',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /api/user/api-keys
 * Generate a new API key
 */
router.post(
  '/api-keys',
  RolesGuard.requirePermission('api:key:manage'),
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { name, permissions, rateLimit } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Name is required',
          code: 'MISSING_NAME',
        });
        return;
      }

      const { ApiKeyAuthGuard } = await import('../auth/guards/api-key-auth.guard');
      const result = await ApiKeyAuthGuard.generateApiKey(
        req.user.id,
        name,
        permissions || ['*'],
        rateLimit
      );

      if (!result || 'error' in result) {
        res.status(500).json({
          success: false,
          error: !result ? 'Failed to generate API key' : result.error,
          code: 'GENERATION_FAILED',
        });
        return;
      }

      logger.info({ userId: req.user.id, apiKeyPrefix: result.prefix }, 'API key generated');

      res.json({
        success: true,
        data: {
          apiKey: result.apiKey,
          prefix: result.prefix,
          message: 'Save this API key. It will not be shown again.',
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to generate API key');
      res.status(500).json({
        success: false,
        error: 'Failed to generate API key',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/user/api-keys
 * Revoke current API key
 */
router.delete(
  '/api-keys',
  RolesGuard.requirePermission('api:key:manage'),
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { ApiKeyAuthGuard } = await import('../auth/guards/api-key-auth.guard');
      const result = await ApiKeyAuthGuard.revokeApiKey(req.user.id);

      if (!result) {
        res.status(500).json({
          success: false,
          error: 'Failed to revoke API key',
          code: 'REVOCATION_FAILED',
        });
        return;
      }

      logger.info({ userId: req.user.id }, 'API key revoked');

      res.json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to revoke API key');
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/user/notifications
 * Get user's notification preferences
 */
router.get(
  '/notifications',
  RateLimitMiddleware.relaxed(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      let prefs = await prisma.notificationPreference.findUnique({
        where: { userId: req.user.id },
      });

      if (!prefs) {
        prefs = await prisma.notificationPreference.create({
          data: { userId: req.user.id },
        });
      }

      res.json({
        success: true,
        data: prefs,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get notification preferences');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve notification preferences',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * PUT /api/user/notifications
 * Update user's notification preferences
 */
router.put(
  '/notifications',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const {
        emailNotifications,
        slackWebhookUrl,
        webhookUrl,
        notifyOnSuccess,
        notifyOnFailure,
        notifyOnLimit,
        dailyDigest,
        weeklyReport,
        quietHoursStart,
        quietHoursEnd,
      } = req.body;

      const updated = await prisma.notificationPreference.upsert({
        where: { userId: req.user.id },
        update: {
          emailNotifications: emailNotifications !== undefined ? emailNotifications : undefined,
          slackWebhookUrl: slackWebhookUrl !== undefined ? slackWebhookUrl : undefined,
          webhookUrl: webhookUrl !== undefined ? webhookUrl : undefined,
          notifyOnSuccess: notifyOnSuccess !== undefined ? notifyOnSuccess : undefined,
          notifyOnFailure: notifyOnFailure !== undefined ? notifyOnFailure : undefined,
          notifyOnLimit: notifyOnLimit !== undefined ? notifyOnLimit : undefined,
          dailyDigest: dailyDigest !== undefined ? dailyDigest : undefined,
          weeklyReport: weeklyReport !== undefined ? weeklyReport : undefined,
          quietHoursStart: quietHoursStart !== undefined ? quietHoursStart : undefined,
          quietHoursEnd: quietHoursEnd !== undefined ? quietHoursEnd : undefined,
          updatedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          emailNotifications: emailNotifications ?? true,
          notifyOnSuccess: notifyOnSuccess ?? false,
          notifyOnFailure: notifyOnFailure ?? true,
          notifyOnLimit: notifyOnLimit ?? true,
          dailyDigest: dailyDigest ?? true,
          weeklyReport: weeklyReport ?? true,
          slackWebhookUrl,
          webhookUrl,
          quietHoursStart,
          quietHoursEnd,
        },
      });

      logger.info({ userId: req.user.id }, 'Notification preferences updated');

      res.json({
        success: true,
        data: updated,
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to update notification preferences');
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
        code: 'SERVER_ERROR',
      });
    }
  }
);

export default router;