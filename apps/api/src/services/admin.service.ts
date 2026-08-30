// enterprise-ai-agent-platform/apps/api/src/services/admin.service.ts
import { UserRole } from '@prisma/client';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { RedisInitService } from './redis-init.service';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.config';

export class AdminService {
  // ============================================
  // User Management
  // ============================================

  static async getUsers(filters: {
    page: number;
    limit: number;
    search?: string;
    planId?: string;
    role?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ users: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page, limit, search, planId, role, status, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
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

    if (status) {
      where.isActive = status === 'active';
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getUserById(userId: string): Promise<any> {
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

    return user;
  }

  static async updateUser(userId: string, data: {
    name?: string;
    planId?: string;
    role?: UserRole;
    isActive?: boolean;
    metadata?: any;
  }): Promise<any> {
    const oldUser = await prisma.user.findUnique({ where: { id: userId } });
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    if (data.planId && oldUser && oldUser.planId !== data.planId) {
      await prisma.planHistory.create({
        data: {
          userId,
          oldPlan: oldUser.planId,
          newPlan: data.planId,
          changedBy: 'admin',
          reason: 'Admin changed plan',
        },
      });
    }

    return user;
  }

  static async suspendUser(userId: string, reason?: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        metadata: {
          suspendedAt: new Date().toISOString(),
          suspendedReason: reason,
        },
      },
    });

    // Revoke all sessions
    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  static async activateUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        metadata: {
          activatedAt: new Date().toISOString(),
        },
      },
    });
  }

  static async deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({ where: { id: userId } });
  }

  static async impersonateUser(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        planId: user.planId,
        type: 'impersonate',
        jti: uuidv4(),
      },
      authConfig.jwt.accessSecret!,
      { expiresIn: '1h' }
    );

    return token;
  }

  // ============================================
  // Platform Metrics
  // ============================================

  static async getPlatformMetrics(): Promise<any> {
    const [totalUsers, activeUsers, newToday, newThisWeek, newThisMonth, totalExecutions, totalCost, executionsLast24h] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      prisma.agentExecution.count(),
      prisma.agentExecution.aggregate({ _sum: { costUsd: true } }),
      prisma.agentExecution.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 3600000) } } }),
    ]);

    const usersByPlan = await prisma.user.groupBy({
      by: ['planId'],
      _count: { id: true },
    });

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    const executionsByAgent = await prisma.agentExecution.groupBy({
      by: ['agentType'],
      _count: { id: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday,
        newThisWeek,
        newThisMonth,
        byPlan: usersByPlan.map(p => ({ plan: p.planId, count: p._count.id })),
        byRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
      },
      executions: {
        total: totalExecutions,
        last24h: executionsLast24h,
        byAgent: executionsByAgent.map(e => ({ agent: e.agentType, count: e._count.id })),
      },
      revenue: {
        total: Number(totalCost._sum.costUsd || 0),
        mrr: Number(totalCost._sum.costUsd || 0) / 12,
        growth: 0,
      },
      system: {
        apiHealth: 'healthy',
        databaseHealth: 'healthy',
        redisHealth: RedisInitService.isReady() ? 'healthy' : 'down',
        queueHealth: 'healthy',
        uptime: process.uptime(),
        version: '1.0.0',
      },
    };
  }

  static async getRevenueMetrics(period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 12));
    }

    const invoices = await prisma.billingInvoice.findMany({
      where: {
        status: 'paid',
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      revenue: invoices.map(i => ({ date: i.createdAt, amount: Number(i.amount) })),
      total: invoices.reduce((sum, i) => sum + Number(i.amount), 0),
      growth: 0,
    };
  }

  static async getUsageMetrics(period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 12));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 12));
    }

    const executions = await prisma.agentExecution.groupBy({
      by: ['createdAt', 'agentType'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });

    return {
      executions,
      total: executions.reduce((sum, e) => sum + e._count.id, 0),
    };
  }

  // ============================================
  // Audit Logs
  // ============================================

  static async getAuditLogs(filters: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any> {
    const { page, limit, userId, action, entityType, dateFrom, dateTo } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async exportAuditLogs(dateFrom?: string, dateTo?: string, format: 'csv' | 'json' = 'csv'): Promise<Buffer> {
    const where: any = {};
    if (dateFrom) where.createdAt = { gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (format === 'json') {
      return Buffer.from(JSON.stringify(logs, null, 2));
    }

    // CSV format
    const headers = ['Timestamp', 'User Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Changes'];
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.user?.email || 'System',
      log.action,
      log.entityType,
      log.entityId || '',
      log.ipAddress || '',
      JSON.stringify(log.changes || {}),
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return Buffer.from(csv);
  }

  // ============================================
  // Support Tickets
  // ============================================

  static async getTickets(filters: {
    page: number;
    limit: number;
    status?: string;
    priority?: string;
    assignedTo?: string;
  }): Promise<any> {
    // This would integrate with a support ticket system
    // For now, return mock data
    return {
      data: [],
      total: 0,
      page: filters.page,
      limit: filters.limit,
      totalPages: 0,
    };
  }

  static async getTicketById(ticketId: string): Promise<any> {
    return null;
  }

  static async updateTicketStatus(ticketId: string, status: string): Promise<any> {
    return { id: ticketId, status };
  }

  static async assignTicket(ticketId: string, adminId: string): Promise<any> {
    return { id: ticketId, assignedTo: adminId };
  }

  static async addTicketMessage(ticketId: string, message: string, isAdmin: boolean): Promise<any> {
    return { id: uuidv4(), ticketId, message, isAdmin, createdAt: new Date() };
  }

  // ============================================
  // Announcements
  // ============================================

  static async getAnnouncements(activeOnly: boolean = false): Promise<any[]> {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
      where.startDate = { lte: new Date() };
      where.OR = [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ];
    }

    return await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createAnnouncement(data: {
    title: string;
    content: string;
    type: string;
    isActive: boolean;
    startDate: Date;
    endDate?: Date | null;
    createdBy: string;
  }): Promise<any> {
    return await prisma.announcement.create({
      data: {
        id: uuidv4(),
        title: data.title,
        content: data.content,
        type: data.type,
        isActive: data.isActive,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: data.createdBy,
      },
    });
  }

  static async updateAnnouncement(id: string, data: {
    title?: string;
    content?: string;
    type?: string;
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date | null;
  }): Promise<any> {
    return await prisma.announcement.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  static async deleteAnnouncement(id: string): Promise<void> {
    await prisma.announcement.delete({ where: { id } });
  }

  // ============================================
  // System Settings
  // ============================================

  static async getSystemSettings(): Promise<any> {
    // This would fetch from a settings table
    return {
      maintenanceMode: false,
      maintenanceMessage: null,
      registrationEnabled: true,
      emailVerificationRequired: false,
      defaultPlan: 'FREE',
      trialDays: 14,
      supportEmail: 'support@example.com',
      supportPhone: null,
      companyName: 'AI Agent Platform',
      companyLogo: null,
      socialLinks: {},
      security: {
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        passwordExpiryDays: null,
        twoFactorRequired: false,
      },
    };
  }

  static async updateSystemSettings(settings: any): Promise<any> {
    // This would update settings in database
    return settings;
  }

  // ============================================
  // System Health
  // ============================================

  static async getSystemHealth(): Promise<any> {
    const redisReady = RedisInitService.isReady();
    let dbHealthy = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbHealthy = false;
    }

    return {
      api: { status: 'healthy', latency: 0 },
      database: { status: dbHealthy ? 'healthy' : 'down', latency: 0 },
      redis: { status: redisReady ? 'healthy' : 'down', latency: 0 },
      queue: { status: 'healthy', latency: 0 },
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  static async clearCache(): Promise<void> {
    // Clear Redis cache
    const redis = RedisInitService.getClient();
    const keys = await redis.keys('*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  static async toggleMaintenance(enabled: boolean, message?: string): Promise<void> {
    // Update maintenance mode in database
    logger.info({ enabled, message }, 'Maintenance mode toggled');
  }

  // ============================================
  // Export
  // ============================================

  static async exportUsers(filters: {
    search?: string;
    planId?: string;
    role?: string;
    status?: string;
  }): Promise<Buffer> {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.planId) where.planId = filters.planId;
    if (filters.role) where.role = filters.role;
    if (filters.status) where.isActive = filters.status === 'active';

    const users = await prisma.user.findMany({
      where,
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
    return Buffer.from(csv);
  }
}