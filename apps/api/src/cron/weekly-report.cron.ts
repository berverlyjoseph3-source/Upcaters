// enterprise-ai-agent-platform/apps/api/src/cron/weekly-report.cron.ts
import { CronJob } from 'cron';
import { batchProcessWeeklyDigests } from '../queues/email-digest.queue';
import { logger } from '../utils/logger';
import { prisma } from '../db/client';

/**
 * Weekly report cron job
 * Runs every Monday at 9:00 AM
 */
export const weeklyReportCron = new CronJob(
  '0 9 * * 1', // At 09:00:00 on Monday
  async () => {
      logger.info('Starting weekly report cron job');
      
      try {
        const result = await batchProcessWeeklyDigests();
        
        logger.info({
          total: result.total,
          successful: result.successful,
          failed: result.failed,
        }, 'Weekly report cron job completed');
      } catch (error) {
        logger.error({ error }, 'Weekly report cron job failed');
      }
    },
    null,
    true,
    'America/New_York'
);

/**
 * Weekly platform metrics report (admin)
 * Runs every Monday at 10:00 AM
 */
export const weeklyPlatformMetricsCron = new CronJob(
  '0 10 * * 1', // At 10:00:00 on Monday
  async () => {
      logger.info('Starting weekly platform metrics cron job');
      
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        
        // Get platform metrics for the week
        const [newUsers, totalExecutions, totalCost, activeUsers] = await Promise.all([
          prisma.user.count({ where: { createdAt: { gte: startDate } } }),
          prisma.agentExecution.count({ where: { createdAt: { gte: startDate } } }),
          prisma.agentExecution.aggregate({
            where: { createdAt: { gte: startDate } },
            _sum: { costUsd: true },
          }),
          prisma.user.count({ where: { lastLoginAt: { gte: startDate } } }),
        ]);
        
        logger.info({
          weekStart: startDate.toISOString().split('T')[0],
          newUsers,
          totalExecutions,
          totalCost: Number(totalCost._sum.costUsd || 0),
          activeUsers,
        }, 'Weekly platform metrics');
        
        // This could send an email to admin or store in a reporting table
      } catch (error) {
        logger.error({ error }, 'Weekly platform metrics cron job failed');
      }
    },
    null,
    true,
    'America/New_York'
);