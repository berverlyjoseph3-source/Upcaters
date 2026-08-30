// enterprise-ai-agent-platform/apps/api/src/db/repositories/usage.repository.ts
import { prisma } from '../client';
import { logger } from '../../utils/logger';

export interface UsageRecord {
  userId: string;
  billingPeriod: string;
  actionType: string;
  count: number;
  tokensUsed: number;
  costUsd: number;
}

export class UsageRepository {
  /**
   * Increment usage counter for a user
   */
  static async incrementUsage(
    userId: string,
    actionType: string,
    tokensUsed: number = 0,
    costUsd: number = 0
  ): Promise<void> {
    try {
      const billingPeriod = this.getCurrentBillingPeriod();
      
      await prisma.usageLog.upsert({
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
    } catch (error) {
      logger.error({ error, userId, actionType }, 'Failed to increment usage');
      throw error;
    }
  }

  /**
   * Get current usage for a user in current billing period
   */
  static async getCurrentUsage(userId: string): Promise<{
    totalActions: number;
    totalTokens: number;
    totalCost: number;
    byActionType: Record<string, { count: number; tokens: number; cost: number }>;
  }> {
    try {
      const billingPeriod = this.getCurrentBillingPeriod();
      
      const usageLogs = await prisma.usageLog.findMany({
        where: {
          userId,
          billingPeriod,
        },
      });

      const byActionType: Record<string, { count: number; tokens: number; cost: number }> = {};
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
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get current usage');
      throw error;
    }
  }

  /**
   * Check if user has exceeded a specific limit
   */
  static async checkLimit(
    userId: string,
    actionType: string,
    limit: number
  ): Promise<{ allowed: boolean; current: number; remaining: number }> {
    try {
      const billingPeriod = this.getCurrentBillingPeriod();
      
      const usage = await prisma.usageLog.findUnique({
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
    } catch (error) {
      logger.error({ error, userId, actionType }, 'Failed to check limit');
      throw error;
    }
  }

  /**
   * Reset all usage counters for a billing period (called by cron)
   */
  static async resetMonthlyCounters(billingPeriod: string): Promise<void> {
    try {
      // Archive old records to a separate table if needed
      const result = await prisma.usageLog.deleteMany({
        where: {
          billingPeriod,
          lastResetAt: {
            lt: new Date(new Date().setDate(1)), // Before current month
          },
        },
      });
      
      logger.info({ billingPeriod, deletedCount: result.count }, 'Reset monthly counters');
    } catch (error) {
      logger.error({ error, billingPeriod }, 'Failed to reset monthly counters');
      throw error;
    }
  }

  /**
   * Get historical usage for dashboard charts
   */
  static async getHistoricalUsage(
    userId: string,
    months: number = 6
  ): Promise<Array<{ month: string; totalActions: number; totalCost: number }>> {
    try {
      const currentPeriod = this.getCurrentBillingPeriod();
      const [year, month] = currentPeriod.split('-');
      const currentDate = new Date(parseInt(year), parseInt(month) - 1);
      
      const periods: string[] = [];
      for (let i = 0; i < months; i++) {
        const date = new Date(currentDate);
        date.setMonth(currentDate.getMonth() - i);
        periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }

      const usageLogs = await prisma.usageLog.groupBy({
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
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get historical usage');
      throw error;
    }
  }

  /**
   * Get current billing period in YYYY-MM format
   */
  static getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Get billing period end date
   */
  static getBillingPeriodEndDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Get days remaining in current billing period
   */
  static getDaysRemaining(): number {
    const endDate = this.getBillingPeriodEndDate();
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}