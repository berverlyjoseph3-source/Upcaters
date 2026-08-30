"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageRepository = void 0;
// enterprise-ai-agent-platform/apps/api/src/db/repositories/usage.repository.ts
const client_1 = require("../client");
const logger_1 = require("../../utils/logger");
class UsageRepository {
    /**
     * Increment usage counter for a user
     */
    static async incrementUsage(userId, actionType, tokensUsed = 0, costUsd = 0) {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            await client_1.prisma.usageLog.upsert({
                where: {
                    userId_billingPeriod_actionType: {
                        userId,
                        billingPeriod,
                        actionType,
                    },
                },
                update: {
                    count: { increment: 1 },
                    tokensUsed: { increment: tokensUsed },
                    costUsd: { increment: costUsd },
                    updatedAt: new Date(),
                },
                create: {
                    userId,
                    billingPeriod,
                    actionType,
                    count: 1,
                    tokensUsed,
                    costUsd,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId, actionType }, 'Failed to increment usage');
            throw error;
        }
    }
    /**
     * Get current usage for a user in current billing period
     */
    static async getCurrentUsage(userId) {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            const usageLogs = await client_1.prisma.usageLog.findMany({
                where: {
                    userId,
                    billingPeriod,
                },
            });
            const byActionType = {};
            let totalActions = 0;
            let totalTokens = 0;
            let totalCost = 0;
            for (const log of usageLogs) {
                byActionType[log.actionType] = {
                    count: log.count,
                    tokens: Number(log.tokensUsed),
                    cost: Number(log.costUsd),
                };
                totalActions += log.count;
                totalTokens += Number(log.tokensUsed);
                totalCost += Number(log.costUsd);
            }
            return {
                totalActions,
                totalTokens,
                totalCost,
                byActionType,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get current usage');
            throw error;
        }
    }
    /**
     * Check if user has exceeded a specific limit
     */
    static async checkLimit(userId, actionType, limit) {
        try {
            const billingPeriod = this.getCurrentBillingPeriod();
            const usage = await client_1.prisma.usageLog.findUnique({
                where: {
                    userId_billingPeriod_actionType: {
                        userId,
                        billingPeriod,
                        actionType,
                    },
                },
            });
            const current = usage?.count || 0;
            const remaining = Math.max(0, limit - current);
            return {
                allowed: current < limit,
                current,
                remaining,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId, actionType }, 'Failed to check limit');
            throw error;
        }
    }
    /**
     * Reset all usage counters for a billing period (called by cron)
     */
    static async resetMonthlyCounters(billingPeriod) {
        try {
            // Archive old records to a separate table if needed
            const result = await client_1.prisma.usageLog.deleteMany({
                where: {
                    billingPeriod,
                    lastResetAt: {
                        lt: new Date(new Date().setDate(1)), // Before current month
                    },
                },
            });
            logger_1.logger.info({ billingPeriod, deletedCount: result.count }, 'Reset monthly counters');
        }
        catch (error) {
            logger_1.logger.error({ error, billingPeriod }, 'Failed to reset monthly counters');
            throw error;
        }
    }
    /**
     * Get historical usage for dashboard charts
     */
    static async getHistoricalUsage(userId, months = 6) {
        try {
            const currentPeriod = this.getCurrentBillingPeriod();
            const [year, month] = currentPeriod.split('-');
            const currentDate = new Date(parseInt(year), parseInt(month) - 1);
            const periods = [];
            for (let i = 0; i < months; i++) {
                const date = new Date(currentDate);
                date.setMonth(currentDate.getMonth() - i);
                periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
            }
            const usageLogs = await client_1.prisma.usageLog.groupBy({
                by: ['billingPeriod'],
                where: {
                    userId,
                    billingPeriod: { in: periods },
                },
                _sum: {
                    count: true,
                    costUsd: true,
                },
            });
            const result = periods.map(period => {
                const found = usageLogs.find(log => log.billingPeriod === period);
                return {
                    month: period,
                    totalActions: found?._sum.count || 0,
                    totalCost: Number(found?._sum.costUsd || 0),
                };
            });
            return result.reverse();
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get historical usage');
            throw error;
        }
    }
    /**
     * Get current billing period in YYYY-MM format
     */
    static getCurrentBillingPeriod() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    /**
     * Get billing period end date
     */
    static getBillingPeriodEndDate() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    /**
     * Get days remaining in current billing period
     */
    static getDaysRemaining() {
        const endDate = this.getBillingPeriodEndDate();
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}
exports.UsageRepository = UsageRepository;
//# sourceMappingURL=usage.repository.js.map