// enterprise-ai-agent-platform/apps/api/src/queues/email-digest.queue.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { EmailService } from '../services/email.service';

// Initialize Redis connection
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Queue names
const DAILY_DIGEST_QUEUE = 'daily-digest';
const WEEKLY_DIGEST_QUEUE = 'weekly-digest';

// Create queues
export const dailyDigestQueue = new Queue(DAILY_DIGEST_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const weeklyDigestQueue = new Queue(WEEKLY_DIGEST_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Schedule daily digest for a user
 */
export async function scheduleDailyDigest(userId: string): Promise<void> {
  await dailyDigestQueue.add(
    `digest-${userId}`,
    { userId, type: 'daily', timestamp: new Date().toISOString() },
    {
      jobId: `daily-${userId}`,
    }
  );
  logger.debug({ userId }, 'Daily digest scheduled');
}

/**
 * Schedule weekly digest for a user
 */
export async function scheduleWeeklyDigest(userId: string): Promise<void> {
  await weeklyDigestQueue.add(
    `digest-${userId}`,
    { userId, type: 'weekly', timestamp: new Date().toISOString() },
    {
      jobId: `weekly-${userId}`,
    }
  );
  logger.debug({ userId }, 'Weekly digest scheduled');
}

/**
 * Process daily digest for a user
 */
async function processDailyDigest(userId: string): Promise<void> {
  try {
    // Get user preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.dailyDigest) {
      logger.debug({ userId }, 'User opted out of daily digest');
      return;
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for digest');
      return;
    }

    // Get yesterday's executions
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(endDate.getDate() - 1);

    const executions = await prisma.agentExecution.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        agentType: true,
        status: true,
        tokensUsed: true,
        costUsd: true,
        createdAt: true,
      },
    });

    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    const failed = executions.filter(e => e.status === 'ERROR').length;
    const totalCost = executions.reduce((sum, e) => sum + Number(e.costUsd || 0), 0);
    const totalTokens = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

    const byAgent = executions.reduce((acc, e) => {
      acc[e.agentType] = (acc[e.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Send email digest
    await EmailService.sendEmail({
      to: user.email,
      toName: user.name || user.email.split('@')[0],
      subject: `Your Daily Digest - ${new Date().toLocaleDateString()}`,
      template: 'daily_digest',
      data: {
        recipientName: user.name || user.email.split('@')[0],
        date: new Date().toLocaleDateString(),
        totalExecutions: executions.length,
        successful,
        failed,
        totalCost: totalCost.toFixed(2),
        totalTokens,
        byAgent,
        dashboardUrl: `${process.env.APP_URL}/dashboard`,
      },
    });

    logger.info({ userId, executions: executions.length }, 'Daily digest sent');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to process daily digest');
    throw error;
  }
}

/**
 * Process weekly digest for a user
 */
async function processWeeklyDigest(userId: string): Promise<void> {
  try {
    // Get user preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.weeklyReport) {
      logger.debug({ userId }, 'User opted out of weekly report');
      return;
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for weekly digest');
      return;
    }

    // Get last 7 days executions
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const executions = await prisma.agentExecution.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        agentType: true,
        status: true,
        tokensUsed: true,
        costUsd: true,
        createdAt: true,
      },
    });

    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    const failed = executions.filter(e => e.status === 'ERROR').length;
    const totalCost = executions.reduce((sum, e) => sum + Number(e.costUsd || 0), 0);
    const totalTokens = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

    const byAgent = executions.reduce((acc, e) => {
      acc[e.agentType] = (acc[e.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get daily breakdown
    const dailyBreakdown = executions.reduce((acc, e) => {
      const date = e.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Send email digest
    await EmailService.sendEmail({
      to: user.email,
      toName: user.name || user.email.split('@')[0],
      subject: `Your Weekly Report - Week of ${new Date().toLocaleDateString()}`,
      template: 'weekly_report',
      data: {
        recipientName: user.name || user.email.split('@')[0],
        startDate: startDate.toLocaleDateString(),
        endDate: new Date().toLocaleDateString(),
        totalExecutions: executions.length,
        successful,
        failed,
        totalCost: totalCost.toFixed(2),
        totalTokens,
        byAgent,
        dailyBreakdown,
        dashboardUrl: `${process.env.APP_URL}/dashboard`,
      },
    });

    logger.info({ userId, executions: executions.length }, 'Weekly digest sent');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to process weekly digest');
    throw error;
  }
}

/**
 * Worker for daily digest
 */
export const dailyDigestWorker = new Worker(
  DAILY_DIGEST_QUEUE,
  async (job: Job) => {
    const { userId } = job.data;
    await processDailyDigest(userId);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/**
 * Worker for weekly digest
 */
export const weeklyDigestWorker = new Worker(
  WEEKLY_DIGEST_QUEUE,
  async (job: Job) => {
    const { userId } = job.data;
    await processWeeklyDigest(userId);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/**
 * Batch process daily digests for all eligible users
 */
export async function batchProcessDailyDigests(): Promise<{ total: number; successful: number; failed: number }> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      notificationPreferences: {
        dailyDigest: true,
      },
    },
    select: { id: true },
  });

  let successful = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await scheduleDailyDigest(user.id);
      successful++;
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Failed to schedule daily digest');
      failed++;
    }
  }

  logger.info({ total: users.length, successful, failed }, 'Daily digests scheduled');
  return { total: users.length, successful, failed };
}

/**
 * Batch process weekly digests for all eligible users
 */
export async function batchProcessWeeklyDigests(): Promise<{ total: number; successful: number; failed: number }> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      notificationPreferences: {
        weeklyReport: true,
      },
    },
    select: { id: true },
  });

  let successful = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await scheduleWeeklyDigest(user.id);
      successful++;
    } catch (error) {
      logger.error({ error, userId: user.id }, 'Failed to schedule weekly digest');
      failed++;
    }
  }

  logger.info({ total: users.length, successful, failed }, 'Weekly digests scheduled');
  return { total: users.length, successful, failed };
}

// Worker event handlers
dailyDigestWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, userId: job.data.userId }, 'Daily digest job completed');
});

dailyDigestWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Daily digest job failed');
});

weeklyDigestWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, userId: job.data.userId }, 'Weekly digest job completed');
});

weeklyDigestWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Weekly digest job failed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await dailyDigestWorker.close();
  await weeklyDigestWorker.close();
  await dailyDigestQueue.close();
  await weeklyDigestQueue.close();
  logger.info('Email digest queues shut down');
});