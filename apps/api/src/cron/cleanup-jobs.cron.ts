// enterprise-ai-agent-platform/apps/api/src/cron/cleanup-jobs.cron.ts
import { CronJob } from 'cron';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { cleanupPublishedPosts } from '../queues/scheduled-posts.queue';
import { RedisInitService } from '../services/redis-init.service';

/**
 * Clean up old execution logs
 * Runs every day at 2:00 AM
 */
export const cleanupExecutionLogsCron = new CronJob(
  '0 2 * * *', // At 02:00:00 every day
  async () => {
    logger.info('Starting execution logs cleanup');
    
    try {
      const daysToKeep = 90; // Keep 90 days of logs
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.agentExecution.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['SUCCESS', 'ERROR', 'CANCELLED'] },
        },
      });

      logger.info({ deletedCount: result.count, daysToKeep }, 'Execution logs cleaned up');
    } catch (error) {
      logger.error({ error }, 'Execution logs cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old sessions
 * Runs every day at 3:00 AM
 */
export const cleanupSessionsCron = new CronJob(
  '0 3 * * *', // At 03:00:00 every day
  async () => {
    logger.info('Starting sessions cleanup');
    
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      logger.info({ deletedCount: result.count }, 'Expired sessions cleaned up');
    } catch (error) {
      logger.error({ error }, 'Sessions cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old webhook events
 * Runs every day at 4:00 AM
 */
export const cleanupWebhookEventsCron = new CronJob(
  '0 4 * * *', // At 04:00:00 every day
  async () => {
    logger.info('Starting webhook events cleanup');
    
    try {
      const daysToKeep = 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.webhookEvent.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          processed: true,
        },
      });

      logger.info({ deletedCount: result.count, daysToKeep }, 'Webhook events cleaned up');
    } catch (error) {
      logger.error({ error }, 'Webhook events cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old rate limit records
 * Runs every hour
 */
export const cleanupRateLimitsCron = new CronJob(
  '0 * * * *', // At minute 0 of every hour
  async () => {
    logger.info('Starting rate limits cleanup');
    
    try {
      const result = await prisma.rateLimit.deleteMany({
        where: {
          windowEnd: { lt: new Date() },
        },
      });

      logger.info({ deletedCount: result.count }, 'Rate limit records cleaned up');
    } catch (error) {
      logger.error({ error }, 'Rate limits cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old password reset tokens
 * Runs every day at 5:00 AM
 */
export const cleanupPasswordTokensCron = new CronJob(
  '0 5 * * *', // At 05:00:00 every day
  async () => {
    logger.info('Starting password reset tokens cleanup');
    
    try {
      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { usedAt: { not: null } },
          ],
        },
      });

      logger.info({ deletedCount: result.count }, 'Password reset tokens cleaned up');
    } catch (error) {
      logger.error({ error }, 'Password tokens cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old email verification tokens
 * Runs every day at 5:30 AM
 */
export const cleanupEmailTokensCron = new CronJob(
  '30 5 * * *', // At 05:30:00 every day
  async () => {
    logger.info('Starting email verification tokens cleanup');
    
    try {
      const result = await prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { usedAt: { not: null } },
          ],
        },
      });

      logger.info({ deletedCount: result.count }, 'Email verification tokens cleaned up');
    } catch (error) {
      logger.error({ error }, 'Email tokens cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old scheduled posts (published)
 * Runs every Sunday at 2:00 AM
 */
export const cleanupScheduledPostsCron = new CronJob(
  '0 2 * * 0', // At 02:00:00 on Sunday
  async () => {
    logger.info('Starting scheduled posts cleanup');
    
    try {
      const daysToKeep = 30;
      const deletedCount = await cleanupPublishedPosts(daysToKeep);
      logger.info({ deletedCount, daysToKeep }, 'Published posts cleaned up');
    } catch (error) {
      logger.error({ error }, 'Scheduled posts cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old agent memory (expired)
 * Runs every day at 6:00 AM
 */
export const cleanupAgentMemoryCron = new CronJob(
  '0 6 * * *', // At 06:00:00 every day
  async () => {
    logger.info('Starting agent memory cleanup');
    
    try {
      const result = await prisma.agentMemory.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      logger.info({ deletedCount: result.count }, 'Expired agent memory cleaned up');
    } catch (error) {
      logger.error({ error }, 'Agent memory cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up old audit logs (keep for compliance)
 * Runs every month on the 1st at 1:00 AM
 */
export const cleanupAuditLogsCron = new CronJob(
  '0 1 1 * *', // At 01:00:00 on day 1 of every month
  async () => {
    logger.info('Starting audit logs cleanup');
    
    try {
      const daysToKeep = 365; // Keep 1 year of audit logs
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      });

      logger.info({ deletedCount: result.count, daysToKeep }, 'Audit logs cleaned up');
    } catch (error) {
      logger.error({ error }, 'Audit logs cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Clean up Redis expired keys
 * Runs every hour
 */
export const cleanupRedisKeysCron = new CronJob(
  '30 * * * *', // At minute 30 of every hour
  async () => {
    logger.info('Starting Redis keys cleanup');
    
    try {
      const redis = RedisInitService.getClient();
      const keys = await redis.keys('usage:*');
      let expiredCount = 0;
      
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -2) { // Key doesn't exist (already expired)
          expiredCount++;
        }
      }
      
      logger.info({ totalKeys: keys.length, expired: expiredCount }, 'Redis keys checked');
    } catch (error) {
      logger.error({ error }, 'Redis keys cleanup failed');
    }
  },
  null,
  true,
  'America/New_York'
);

/**
 * Initialize all cleanup cron jobs
 */
export function initializeCleanupCrons(): void {
  logger.info('Initializing cleanup cron jobs');
  
  cleanupExecutionLogsCron.start();
  cleanupSessionsCron.start();
  cleanupWebhookEventsCron.start();
  cleanupRateLimitsCron.start();
  cleanupPasswordTokensCron.start();
  cleanupEmailTokensCron.start();
  cleanupScheduledPostsCron.start();
  cleanupAgentMemoryCron.start();
  cleanupAuditLogsCron.start();
  cleanupRedisKeysCron.start();
  
  logger.info('All cleanup cron jobs initialized');
}

/**
 * Stop all cleanup cron jobs
 */
export function stopCleanupCrons(): void {
  logger.info('Stopping cleanup cron jobs');
  
  cleanupExecutionLogsCron.stop();
  cleanupSessionsCron.stop();
  cleanupWebhookEventsCron.stop();
  cleanupRateLimitsCron.stop();
  cleanupPasswordTokensCron.stop();
  cleanupEmailTokensCron.stop();
  cleanupScheduledPostsCron.stop();
  cleanupAgentMemoryCron.stop();
  cleanupAuditLogsCron.stop();
  cleanupRedisKeysCron.stop();
  
  logger.info('All cleanup cron jobs stopped');
}