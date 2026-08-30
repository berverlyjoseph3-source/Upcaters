// enterprise-ai-agent-platform/apps/api/src/cron/daily-digest.cron.ts
import { CronJob } from 'cron';
import { batchProcessDailyDigests } from '../queues/email-digest.queue';
import { logger } from '../utils/logger';
import { prisma } from '../db/client';

/**
 * Daily digest cron job
 * Runs every day at 8:00 AM
 */
export const dailyDigestCron = new CronJob(
  '0 8 * * *', // At 08:00:00 every day
  async () => {
      logger.info('Starting daily digest cron job');
      
      try {
        const result = await batchProcessDailyDigests();
        
        logger.info({
          total: result.total,
          successful: result.successful,
          failed: result.failed,
        }, 'Daily digest cron job completed');
      } catch (error) {
        logger.error({ error }, 'Daily digest cron job failed');
      }
    },
    null,
    true, // Start the job
    'America/New_York' // Timezone
);

/**
 * Daily usage summary cron job
 * Runs every day at 23:59 to prepare end-of-day stats
 */
export const dailyUsageSummaryCron = new CronJob(
  '59 23 * * *', // At 23:59:00 every day
  async () => {
      logger.info('Starting daily usage summary cron job');
      
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get daily usage stats
        const dailyUsage = await prisma.agentExecution.groupBy({
          by: ['agentType'],
          where: {
            createdAt: { gte: yesterday, lt: today },
            status: 'SUCCESS',
          },
          _count: { id: true },
          _sum: { costUsd: true, tokensUsed: true },
        });
        
        // Store in a daily summary table (optional)
        logger.info({ date: yesterday.toISOString().split('T')[0], usage: dailyUsage }, 'Daily usage summary');
      } catch (error) {
        logger.error({ error }, 'Daily usage summary cron job failed');
      }
    },
    null,
    true,
    'America/New_York'
);