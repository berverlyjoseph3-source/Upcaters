// enterprise-ai-agent-platform/apps/api/src/db/repositories/user.repository.ts
import { Prisma, User, UserRole } from '@prisma/client';
import { prisma, withTransaction } from '../client';
import { logger } from '../../utils/logger';

export interface CreateUserInput {
  email: string;
  name?: string;
  avatarUrl?: string;
  planId?: string;
  stripeCustomerId?: string;
  apiKeyHash?: string;
  apiKeyPrefix?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserInput {
  name?: string;
  avatarUrl?: string;
  planId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  isActive?: boolean;
  role?: UserRole;
  lastLoginAt?: Date;
  metadata?: Prisma.InputJsonValue;
}

export class UserRepository {
  /**
   * Create a new user
   */
  static async create(data: CreateUserInput): Promise<User> {
    try {
      const user = await prisma.user.create({
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
            ...(data.metadata as any),
          },
        },
      });

      // Create initial plan history entry
      await prisma.planHistory.create({
        data: {
          userId: user.id,
          oldPlan: 'FREE',
          newPlan: user.planId,
          changedBy: 'system',
          reason: 'Initial user creation',
        },
      });

      logger.info({ userId: user.id, email: user.email }, 'User created successfully');
      return user;
    } catch (error) {
      logger.error({ error, data }, 'Failed to create user');
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          oauthConnections: true,
          apiKeys: {
            where: { isActive: true },
            select: { id: true, name: true, keyPrefix: true, createdAt: true },
          },
        },
      });
    } catch (error) {
      logger.error({ error, id }, 'Failed to find user by ID');
      throw error;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error({ error, email }, 'Failed to find user by email');
      throw error;
    }
  }

  /**
   * Find user by API key hash
   */
  static async findByApiKeyHash(keyHash: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    planId: string;
    role: UserRole;
    apiKey: string | null;
    apiKeyPrefix: string | null;
  } | null> {
    try {
      return await prisma.user.findFirst({
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
    } catch (error) {
      logger.error({ error, keyHashPrefix: keyHash.substring(0, 8) }, 'Failed to find user by API key');
      throw error;
    }
  }

  /**
   * Find user by Stripe customer ID
   */
  static async findByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { stripeCustomerId },
      });
    } catch (error) {
      logger.error({ error, stripeCustomerId }, 'Failed to find user by Stripe customer ID');
      throw error;
    }
  }

  /**
   * Update user
   */
  static async update(id: string, data: UpdateUserInput): Promise<User> {
    try {
      const oldUser = await prisma.user.findUnique({ where: { id } });
      
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      // Log plan changes to history
      if (data.planId && oldUser && oldUser.planId !== data.planId) {
        await prisma.planHistory.create({
          data: {
            userId: user.id,
            oldPlan: oldUser.planId,
            newPlan: data.planId,
            changedBy: 'system',
            reason: 'Plan updated via API',
          },
        });
        
        logger.info({ userId: id, oldPlan: oldUser.planId, newPlan: data.planId }, 'User plan changed');
      }

      return user;
    } catch (error) {
      logger.error({ error, id, data }, 'Failed to update user');
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          lastLoginAt: new Date(),
          metadata: {
            lastLoginIp: ipAddress,
            lastLoginUserAgent: userAgent,
          },
        },
      });
    } catch (error) {
      logger.error({ error, id }, 'Failed to update last login');
      throw error;
    }
  }

  /**
   * Get users by plan with pagination
   */
  static async findByPlan(
    planId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ users: User[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: { planId, isActive: true },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where: { planId, isActive: true } }),
      ]);

      return { users, total };
    } catch (error) {
      logger.error({ error, planId }, 'Failed to find users by plan');
      throw error;
    }
  }

  /**
   * Get all users with filters (admin only)
   */
  static async findAll(
    filters: {
      search?: string;
      planId?: string;
      role?: UserRole;
      isActive?: boolean;
      fromDate?: Date;
      toDate?: Date;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ users: User[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const where: Prisma.UserWhereInput = {};

      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.planId) where.planId = filters.planId;
      if (filters.role) where.role = filters.role;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      
      if (filters.fromDate || filters.toDate) {
        where.createdAt = {};
        if (filters.fromDate) where.createdAt.gte = filters.fromDate;
        if (filters.toDate) where.createdAt.lte = filters.toDate;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
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
        prisma.user.count({ where }),
      ]);

      return { users, total };
    } catch (error) {
      logger.error({ error, filters }, 'Failed to find users');
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  static async softDelete(id: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
          metadata: {
            deletedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error({ error, id }, 'Failed to soft delete user');
      throw error;
    }
  }

  /**
   * Get usage statistics for a user
   */
  static async getUsageStats(userId: string): Promise<{
    totalExecutions: number;
    totalTokensUsed: number;
    totalCostUsd: number;
    executionsByAgent: Record<string, number>;
  }> {
    try {
      const executions = await prisma.agentExecution.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { tokensUsed: true, costUsd: true },
      });

      const byAgent = await prisma.agentExecution.groupBy({
        by: ['agentType'],
        where: { userId },
        _count: { id: true },
      });

      const executionsByAgent = byAgent.reduce((acc, curr) => {
        acc[curr.agentType] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalExecutions: executions._count.id || 0,
        totalTokensUsed: executions._sum.tokensUsed || 0,
        totalCostUsd: executions._sum.costUsd ? Number(executions._sum.costUsd) : 0,
        executionsByAgent,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user usage stats');
      throw error;
    }
  }
}