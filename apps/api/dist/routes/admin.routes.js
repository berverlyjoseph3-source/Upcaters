"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/admin.routes.ts
const express_1 = require("express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const rate_limit_middleware_1 = require("../auth/middleware/rate-limit.middleware");
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Apply authentication and admin role to all admin routes
router.use(jwt_auth_guard_1.JwtAuthGuard.protect);
router.use(roles_guard_1.RolesGuard.requireRole('ADMIN'));
/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/users', rate_limit_middleware_1.RateLimitMiddleware.moderate(), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const planId = req.query.planId;
        const role = req.query.role;
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (planId)
            where.planId = planId;
        if (role)
            where.role = role;
        if (isActive !== undefined)
            where.isActive = isActive;
        const [users, total] = await Promise.all([
            client_1.prisma.user.findMany({
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
            client_1.prisma.user.count({ where }),
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
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get users');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * GET /api/admin/users/:userId
 * Get a specific user by ID
 */
router.get('/users/:userId', rate_limit_middleware_1.RateLimitMiddleware.moderate(), async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await client_1.prisma.user.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to get user');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * PUT /api/admin/users/:userId
 * Update a user (plan, role, status)
 */
router.put('/users/:userId', rate_limit_middleware_1.RateLimitMiddleware.strict(), async (req, res) => {
    try {
        const { userId } = req.params;
        const { planId, role, isActive, name, metadata } = req.body;
        const existingUser = await client_1.prisma.user.findUnique({
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
        const updatedUser = await client_1.prisma.user.update({
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
            await client_1.prisma.planHistory.create({
                data: {
                    userId,
                    oldPlan: existingUser.planId,
                    newPlan: planId,
                    changedBy: req.user?.email || 'admin',
                    reason: 'Admin updated plan',
                },
            });
        }
        logger_1.logger.info({ adminId: req.user?.id, userId, updates: { planId, role, isActive } }, 'User updated by admin');
        res.json({
            success: true,
            data: updatedUser,
            message: 'User updated successfully',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to update user');
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * DELETE /api/admin/users/:userId
 * Soft delete a user (deactivate)
 */
router.delete('/users/:userId', rate_limit_middleware_1.RateLimitMiddleware.strict(), async (req, res) => {
    try {
        const { userId } = req.params;
        const updatedUser = await client_1.prisma.user.update({
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
        logger_1.logger.info({ adminId: req.user?.id, userId }, 'User deactivated by admin');
        res.json({
            success: true,
            message: 'User deactivated successfully',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to deactivate user');
        res.status(500).json({
            success: false,
            error: 'Failed to deactivate user',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate a deactivated user
 */
router.post('/users/:userId/reactivate', rate_limit_middleware_1.RateLimitMiddleware.strict(), async (req, res) => {
    try {
        const { userId } = req.params;
        const updatedUser = await client_1.prisma.user.update({
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
        logger_1.logger.info({ adminId: req.user?.id, userId }, 'User reactivated by admin');
        res.json({
            success: true,
            message: 'User reactivated successfully',
        });
    }
    catch (error) {
        logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to reactivate user');
        res.status(500).json({
            success: false,
            error: 'Failed to reactivate user',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * GET /api/admin/metrics/platform
 * Get platform-wide metrics
 */
router.get('/metrics/platform', rate_limit_middleware_1.RateLimitMiddleware.moderate(), async (req, res) => {
    try {
        const [totalUsers, activeUsers, usersByPlan, totalExecutions, totalRevenue] = await Promise.all([
            client_1.prisma.user.count(),
            client_1.prisma.user.count({ where: { isActive: true } }),
            client_1.prisma.user.groupBy({
                by: ['planId'],
                _count: { id: true },
            }),
            client_1.prisma.agentExecution.count(),
            client_1.prisma.billingInvoice.aggregate({
                where: { status: 'paid' },
                _sum: { amount: true },
            }),
        ]);
        // Get recent signups (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentSignups = await client_1.prisma.user.count({
            where: { createdAt: { gte: sevenDaysAgo } },
        });
        // Get executions by agent type
        const executionsByAgent = await client_1.prisma.agentExecution.groupBy({
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
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get platform metrics');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve platform metrics',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * GET /api/admin/metrics/usage
 * Get usage metrics for all users
 */
router.get('/metrics/usage', rate_limit_middleware_1.RateLimitMiddleware.moderate(), async (req, res) => {
    try {
        const period = req.query.period || 'month';
        let startDate;
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
        const usageLogs = await client_1.prisma.usageLog.findMany({
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
        const byActionType = {};
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
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get usage metrics');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve usage metrics',
            code: 'SERVER_ERROR',
        });
    }
});
/**
 * GET /api/admin/export/users
 * Export users as CSV
 */
router.get('/export/users', rate_limit_middleware_1.RateLimitMiddleware.strict(), async (req, res) => {
    try {
        const users = await client_1.prisma.user.findMany({
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
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to export users');
        res.status(500).json({
            success: false,
            error: 'Failed to export users',
            code: 'SERVER_ERROR',
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map