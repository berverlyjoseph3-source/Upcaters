// enterprise-ai-agent-platform/apps/api/src/routes/admin.routes.ts
import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/plan-gate.middleware';

const router = Router();

// Apply authentication and admin role to all admin routes
router.use(JwtAuthGuard.protect);
router.use(RolesGuard.requireRole('ADMIN'));

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get(
  '/users',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const planId = req.query.planId as string;
      const role = req.query.role as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (planId) where.planId = planId;
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
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
            stripeCustomerId: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            _count: {
              select: {
                agentExecutions: true,
                scheduledPosts: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get users');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/users/:userId
 * Get a specific user by ID
 */
router.get(
  '/users/:userId',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          oauthConnections: {
            select: {
              provider: true,
              providerEmail: true,
              syncStatus: true,
              lastSyncedAt: true,
              createdAt: true,
            },
          },
          planHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10,
          },
          agentExecutions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          usageLogs: {
            orderBy: { billingPeriod: 'desc' },
            take: 12,
          },
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
      logger.error({ error, userId: req.params.userId }, 'Failed to get user');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * PUT /api/admin/users/:userId
 * Update a user (plan, role, status)
 */
router.put(
  '/users/:userId',
  RateLimitMiddleware.strict(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { planId, role, isActive, name, metadata } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { planId: true, role: true },
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          planId: planId !== undefined ? planId : undefined,
          role: role !== undefined ? role : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          name: name !== undefined ? name : undefined,
          metadata: metadata !== undefined ? metadata : undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          planId: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      // Log plan change to history
      if (planId && planId !== existingUser.planId) {
        await prisma.planHistory.create({
          data: {
            userId,
            oldPlan: existingUser.planId,
            newPlan: planId,
            changedBy: req.user?.email || 'admin',
            reason: 'Admin updated plan',
          },
        });
      }

      logger.info({ adminId: req.user?.id, userId, updates: { planId, role, isActive } }, 'User updated by admin');

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to update user');
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/admin/users/:userId
 * Soft delete a user (deactivate)
 */
router.delete(
  '/users/:userId',
  RateLimitMiddleware.strict(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
          metadata: {
            deactivatedAt: new Date().toISOString(),
            deactivatedBy: req.user?.email,
          },
        },
      });

      logger.info({ adminId: req.user?.id, userId }, 'User deactivated by admin');

      res.json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to deactivate user');
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate user',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate a deactivated user
 */
router.post(
  '/users/:userId/reactivate',
  RateLimitMiddleware.strict(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          updatedAt: new Date(),
          metadata: {
            reactivatedAt: new Date().toISOString(),
            reactivatedBy: req.user?.email,
          },
        },
      });

      logger.info({ adminId: req.user?.id, userId }, 'User reactivated by admin');

      res.json({
        success: true,
        message: 'User reactivated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to reactivate user');
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate user',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/metrics/platform
 * Get platform-wide metrics
 */
router.get(
  '/metrics/platform',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const [totalUsers, activeUsers, usersByPlan, totalExecutions, totalRevenue] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.groupBy({
          by: ['planId'],
          _count: { id: true },
        }),
        prisma.agentExecution.count(),
        prisma.billingInvoice.aggregate({
          where: { status: 'paid' },
          _sum: { amount: true },
        }),
      ]);

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = await prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      });

      // Get executions by agent type
      const executionsByAgent = await prisma.agentExecution.groupBy({
        by: ['agentType'],
        _count: { id: true },
      });

      res.json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            active: activeUsers,
            recentSignups,
            byPlan: usersByPlan.map(p => ({ plan: p.planId, count: p._count.id })),
          },
          executions: {
            total: totalExecutions,
            byAgent: executionsByAgent.map(e => ({ agent: e.agentType, count: e._count.id })),
          },
          revenue: {
            total: totalRevenue._sum.amount || 0,
            currency: 'usd',
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get platform metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve platform metrics',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/metrics/usage
 * Get usage metrics for all users
 */
router.get(
  '/metrics/usage',
  RateLimitMiddleware.moderate(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const period = req.query.period as string || 'month';
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const usageLogs = await prisma.usageLog.findMany({
        where: {
          updatedAt: { gte: startDate },
        },
        select: {
          actionType: true,
          count: true,
          tokensUsed: true,
          costUsd: true,
          billingPeriod: true,
        },
      });

      const totalActions = usageLogs.reduce((sum, l) => sum + l.count, 0);
      const totalTokens = usageLogs.reduce((sum, l) => sum + Number(l.tokensUsed), 0);
      const totalCost = usageLogs.reduce((sum, l) => sum + Number(l.costUsd), 0);

      // Group by action type
      const byActionType: Record<string, number> = {};
      for (const log of usageLogs) {
        byActionType[log.actionType] = (byActionType[log.actionType] || 0) + log.count;
      }

      res.json({
        success: true,
        data: {
          period,
          startDate: startDate.toISOString(),
          summary: {
            totalActions,
            totalTokens,
            totalCostUsd: totalCost,
          },
          byActionType,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get usage metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage metrics',
        code: 'SERVER_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/export/users
 * Export users as CSV
 */
router.get(
  '/export/users',
  RateLimitMiddleware.strict(),
  async (req: AuthenticatedRequest, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          planId: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      const headers = ['ID', 'Email', 'Name', 'Plan', 'Role', 'Active', 'Created At', 'Last Login'];
      const rows = users.map(u => [
        u.id,
        u.email,
        u.name || '',
        u.planId,
        u.role,
        u.isActive ? 'Yes' : 'No',
        u.createdAt.toISOString(),
        u.lastLoginAt?.toISOString() || '',
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (error) {
      logger.error({ error }, 'Failed to export users');
      res.status(500).json({
        success: false,
        error: 'Failed to export users',
        code: 'SERVER_ERROR',
      });
    }
  }
);

export default router;