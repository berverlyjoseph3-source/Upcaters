"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("../client");
const logger_1 = require("../../utils/logger");
class UserRepository {
    /**
     * Create a new user
     */
    static async create(data) {
        try {
            const user = await client_1.prisma.user.create({
                data: {
                    email: data.email,
                    name: data.name,
                    avatarUrl: data.avatarUrl,
                    planId: data.planId || 'FREE',
                    stripeCustomerId: data.stripeCustomerId,
                    apiKey: data.apiKeyHash,
                    apiKeyPrefix: data.apiKeyPrefix,
                    metadata: {
                        createdVia: 'signup',
                        ...data.metadata,
                    },
                },
            });
            // Create initial plan history entry
            await client_1.prisma.planHistory.create({
                data: {
                    userId: user.id,
                    oldPlan: 'FREE',
                    newPlan: user.planId,
                    changedBy: 'system',
                    reason: 'Initial user creation',
                },
            });
            logger_1.logger.info({ userId: user.id, email: user.email }, 'User created successfully');
            return user;
        }
        catch (error) {
            logger_1.logger.error({ error, data }, 'Failed to create user');
            throw error;
        }
    }
    /**
     * Find user by ID
     */
    static async findById(id) {
        try {
            return await client_1.prisma.user.findUnique({
                where: { id },
                include: {
                    oauthConnections: true,
                    apiKeys: {
                        where: { isActive: true },
                        select: { id: true, name: true, keyPrefix: true, createdAt: true },
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, id }, 'Failed to find user by ID');
            throw error;
        }
    }
    /**
     * Find user by email
     */
    static async findByEmail(email) {
        try {
            return await client_1.prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, email }, 'Failed to find user by email');
            throw error;
        }
    }
    /**
     * Find user by API key hash
     */
    static async findByApiKeyHash(keyHash) {
        try {
            return await client_1.prisma.user.findFirst({
                where: {
                    apiKey: keyHash,
                    isActive: true,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    planId: true,
                    role: true,
                    apiKey: true,
                    apiKeyPrefix: true,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, keyHashPrefix: keyHash.substring(0, 8) }, 'Failed to find user by API key');
            throw error;
        }
    }
    /**
     * Find user by Stripe customer ID
     */
    static async findByStripeCustomerId(stripeCustomerId) {
        try {
            return await client_1.prisma.user.findUnique({
                where: { stripeCustomerId },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, stripeCustomerId }, 'Failed to find user by Stripe customer ID');
            throw error;
        }
    }
    /**
     * Update user
     */
    static async update(id, data) {
        try {
            const oldUser = await client_1.prisma.user.findUnique({ where: { id } });
            const user = await client_1.prisma.user.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date(),
                },
            });
            // Log plan changes to history
            if (data.planId && oldUser && oldUser.planId !== data.planId) {
                await client_1.prisma.planHistory.create({
                    data: {
                        userId: user.id,
                        oldPlan: oldUser.planId,
                        newPlan: data.planId,
                        changedBy: 'system',
                        reason: 'Plan updated via API',
                    },
                });
                logger_1.logger.info({ userId: id, oldPlan: oldUser.planId, newPlan: data.planId }, 'User plan changed');
            }
            return user;
        }
        catch (error) {
            logger_1.logger.error({ error, id, data }, 'Failed to update user');
            throw error;
        }
    }
    /**
     * Update last login timestamp
     */
    static async updateLastLogin(id, ipAddress, userAgent) {
        try {
            await client_1.prisma.user.update({
                where: { id },
                data: {
                    lastLoginAt: new Date(),
                    metadata: {
                        lastLoginIp: ipAddress,
                        lastLoginUserAgent: userAgent,
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, id }, 'Failed to update last login');
            throw error;
        }
    }
    /**
     * Get users by plan with pagination
     */
    static async findByPlan(planId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const [users, total] = await Promise.all([
                client_1.prisma.user.findMany({
                    where: { planId, isActive: true },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                client_1.prisma.user.count({ where: { planId, isActive: true } }),
            ]);
            return { users, total };
        }
        catch (error) {
            logger_1.logger.error({ error, planId }, 'Failed to find users by plan');
            throw error;
        }
    }
    /**
     * Get all users with filters (admin only)
     */
    static async findAll(filters, page = 1, limit = 50) {
        try {
            const skip = (page - 1) * limit;
            const where = {};
            if (filters.search) {
                where.OR = [
                    { email: { contains: filters.search, mode: 'insensitive' } },
                    { name: { contains: filters.search, mode: 'insensitive' } },
                ];
            }
            if (filters.planId)
                where.planId = filters.planId;
            if (filters.role)
                where.role = filters.role;
            if (filters.isActive !== undefined)
                where.isActive = filters.isActive;
            if (filters.fromDate || filters.toDate) {
                where.createdAt = {};
                if (filters.fromDate)
                    where.createdAt.gte = filters.fromDate;
                if (filters.toDate)
                    where.createdAt.lte = filters.toDate;
            }
            const [users, total] = await Promise.all([
                client_1.prisma.user.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
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
            return { users, total };
        }
        catch (error) {
            logger_1.logger.error({ error, filters }, 'Failed to find users');
            throw error;
        }
    }
    /**
     * Soft delete user
     */
    static async softDelete(id) {
        try {
            return await client_1.prisma.user.update({
                where: { id },
                data: {
                    isActive: false,
                    updatedAt: new Date(),
                    metadata: {
                        deletedAt: new Date().toISOString(),
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, id }, 'Failed to soft delete user');
            throw error;
        }
    }
    /**
     * Get usage statistics for a user
     */
    static async getUsageStats(userId) {
        try {
            const executions = await client_1.prisma.agentExecution.aggregate({
                where: { userId },
                _count: { id: true },
                _sum: { tokensUsed: true, costUsd: true },
            });
            const byAgent = await client_1.prisma.agentExecution.groupBy({
                by: ['agentType'],
                where: { userId },
                _count: { id: true },
            });
            const executionsByAgent = byAgent.reduce((acc, curr) => {
                acc[curr.agentType] = curr._count.id;
                return acc;
            }, {});
            return {
                totalExecutions: executions._count.id || 0,
                totalTokensUsed: executions._sum.tokensUsed || 0,
                totalCostUsd: executions._sum.costUsd ? Number(executions._sum.costUsd) : 0,
                executionsByAgent,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get user usage stats');
            throw error;
        }
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=user.repository.js.map