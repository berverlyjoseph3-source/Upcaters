"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const redis_init_service_1 = require("./redis-init.service");
const uuid_1 = require("uuid");
const jwt = __importStar(require("jsonwebtoken"));
const auth_config_1 = require("../config/auth.config");
class AdminService {
    // ============================================
    // User Management
    // ============================================
    static async getUsers(filters) {
        const { page, limit, search, planId, role, status, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
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
        if (status) {
            where.isActive = status === 'active';
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                where.createdAt.lte = new Date(dateTo);
        }
        const [users, total] = await Promise.all([
            client_1.prisma.user.findMany({
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
            client_1.prisma.user.count({ where }),
        ]);
        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getUserById(userId) {
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
        return user;
    }
    static async updateUser(userId, data) {
        const oldUser = await client_1.prisma.user.findUnique({ where: { id: userId } });
        const user = await client_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
        if (data.planId && oldUser && oldUser.planId !== data.planId) {
            await client_1.prisma.planHistory.create({
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
    static async suspendUser(userId, reason) {
        await client_1.prisma.user.update({
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
        await client_1.prisma.session.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true },
        });
    }
    static async activateUser(userId) {
        await client_1.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: true,
                metadata: {
                    activatedAt: new Date().toISOString(),
                },
            },
        });
    }
    static async deleteUser(userId) {
        await client_1.prisma.user.delete({ where: { id: userId } });
    }
    static async impersonateUser(userId) {
        const user = await client_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        const token = jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            planId: user.planId,
            type: 'impersonate',
            jti: (0, uuid_1.v4)(),
        }, auth_config_1.authConfig.jwt.accessSecret, { expiresIn: '1h' });
        return token;
    }
    // ============================================
    // Platform Metrics
    // ============================================
    static async getPlatformMetrics() {
        const [totalUsers, activeUsers, newToday, newThisWeek, newThisMonth, totalExecutions, totalCost, executionsLast24h] = await Promise.all([
            client_1.prisma.user.count(),
            client_1.prisma.user.count({ where: { isActive: true } }),
            client_1.prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
            client_1.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
            client_1.prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
            client_1.prisma.agentExecution.count(),
            client_1.prisma.agentExecution.aggregate({ _sum: { costUsd: true } }),
            client_1.prisma.agentExecution.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 3600000) } } }),
        ]);
        const usersByPlan = await client_1.prisma.user.groupBy({
            by: ['planId'],
            _count: { id: true },
        });
        const usersByRole = await client_1.prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
        });
        const executionsByAgent = await client_1.prisma.agentExecution.groupBy({
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
                redisHealth: redis_init_service_1.RedisInitService.isReady() ? 'healthy' : 'down',
                queueHealth: 'healthy',
                uptime: process.uptime(),
                version: '1.0.0',
            },
        };
    }
    static async getRevenueMetrics(period) {
        const now = new Date();
        let startDate;
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
        const invoices = await client_1.prisma.billingInvoice.findMany({
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
    static async getUsageMetrics(period) {
        const now = new Date();
        let startDate;
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
        const executions = await client_1.prisma.agentExecution.groupBy({
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
    static async getAuditLogs(filters) {
        const { page, limit, userId, action, entityType, dateFrom, dateTo } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (userId)
            where.userId = userId;
        if (action)
            where.action = action;
        if (entityType)
            where.entityType = entityType;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                where.createdAt.lte = new Date(dateTo);
        }
        const [logs, total] = await Promise.all([
            client_1.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true, name: true } },
                },
            }),
            client_1.prisma.auditLog.count({ where }),
        ]);
        return {
            data: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async exportAuditLogs(dateFrom, dateTo, format = 'csv') {
        const where = {};
        if (dateFrom)
            where.createdAt = { gte: new Date(dateFrom) };
        if (dateTo)
            where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };
        const logs = await client_1.prisma.auditLog.findMany({
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
    static async getTickets(filters) {
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
    static async getTicketById(ticketId) {
        return null;
    }
    static async updateTicketStatus(ticketId, status) {
        return { id: ticketId, status };
    }
    static async assignTicket(ticketId, adminId) {
        return { id: ticketId, assignedTo: adminId };
    }
    static async addTicketMessage(ticketId, message, isAdmin) {
        return { id: (0, uuid_1.v4)(), ticketId, message, isAdmin, createdAt: new Date() };
    }
    // ============================================
    // Announcements
    // ============================================
    static async getAnnouncements(activeOnly = false) {
        const where = {};
        if (activeOnly) {
            where.isActive = true;
            where.startDate = { lte: new Date() };
            where.OR = [
                { endDate: null },
                { endDate: { gte: new Date() } },
            ];
        }
        return await client_1.prisma.announcement.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }
    static async createAnnouncement(data) {
        return await client_1.prisma.announcement.create({
            data: {
                id: (0, uuid_1.v4)(),
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
    static async updateAnnouncement(id, data) {
        return await client_1.prisma.announcement.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    static async deleteAnnouncement(id) {
        await client_1.prisma.announcement.delete({ where: { id } });
    }
    // ============================================
    // System Settings
    // ============================================
    static async getSystemSettings() {
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
    static async updateSystemSettings(settings) {
        // This would update settings in database
        return settings;
    }
    // ============================================
    // System Health
    // ============================================
    static async getSystemHealth() {
        const redisReady = redis_init_service_1.RedisInitService.isReady();
        let dbHealthy = true;
        try {
            await client_1.prisma.$queryRaw `SELECT 1`;
        }
        catch {
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
    static async clearCache() {
        // Clear Redis cache
        const redis = redis_init_service_1.RedisInitService.getClient();
        const keys = await redis.keys('*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
    static async toggleMaintenance(enabled, message) {
        // Update maintenance mode in database
        logger_1.logger.info({ enabled, message }, 'Maintenance mode toggled');
    }
    // ============================================
    // Export
    // ============================================
    static async exportUsers(filters) {
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
        if (filters.status)
            where.isActive = filters.status === 'active';
        const users = await client_1.prisma.user.findMany({
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
exports.AdminService = AdminService;
//# sourceMappingURL=admin.service.js.map