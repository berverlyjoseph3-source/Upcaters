// enterprise-ai-agent-platform/apps/api/src/queues/usage-report.job.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import Stripe from 'stripe';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { UsageMeteringService } from '../services/usage-metering.service';
import { StripeUsageReport } from '../types/usage.types';

// Initialize Redis connection
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Queue names
export const USAGE_REPORT_QUEUE = 'usage-report';
export const USAGE_BILLING_QUEUE = 'usage-billing';

// Create queues
export const usageReportQueue = new Queue(USAGE_REPORT_QUEUE, {
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

export const usageBillingQueue = new Queue(USAGE_BILLING_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Schedule usage report generation
 */
export async function scheduleUsageReport(userId: string): Promise<void> {
  await usageReportQueue.add(
    `report-${userId}`,
    { userId, timestamp: new Date().toISOString() },
    {
      jobId: `report-${userId}`,
      delay: 5000, // 5 second delay to allow usage to settle
    }
  );
  logger.debug({ userId }, 'Usage report scheduled');
}

/**
 * Schedule batch usage reporting for all users
 */
export async function scheduleBatchUsageReport(): Promise<void> {
  await usageReportQueue.add(
    'batch-report',
    { batch: true, timestamp: new Date().toISOString() },
    {
      jobId: `batch-${new Date().toISOString().split('T')[0]}`,
    }
  );
  logger.info('Batch usage report scheduled');
}

/**
 * Schedule usage-based billing report to Stripe
 */
export async function scheduleStripeBillingReport(
  userId: string,
  stripeCustomerId: string,
  billingPeriod: string
): Promise<void> {
  await usageBillingQueue.add(
    `stripe-${userId}-${billingPeriod}`,
    {
      userId,
      stripeCustomerId,
      billingPeriod,
      timestamp: new Date().toISOString(),
    },
    {
      jobId: `stripe-${userId}-${billingPeriod}`,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute initial delay
      },
    }
  );
  logger.debug({ userId, billingPeriod }, 'Stripe billing report scheduled');
}

/**
 * Worker to process usage report generation
 */
export const usageReportWorker = new Worker(
  USAGE_REPORT_QUEUE,
  async (job: Job) => {
    const { userId, batch } = job.data;
    
    if (batch) {
      return await processBatchUsageReports();
    }
    
    return await generateUsageReport(userId);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/**
 * Generate usage report for a single user
 */
async function generateUsageReport(userId: string): Promise<{
  userId: string;
  generatedAt: string;
  report: any;
}> {
  try {
    logger.info({ userId }, 'Generating usage report');
    
    const stats = await UsageMeteringService.getUsageStats(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, planId: true, stripeCustomerId: true },
    });
    
    const report = {
      userId,
      email: user?.email,
      planId: user?.planId,
      generatedAt: new Date().toISOString(),
      period: stats.currentPeriod,
      usage: {
        byActionType: stats.byActionType,
        byAgent: stats.byAgent,
        topActions: stats.topActions,
      },
      historical: stats.historical,
    };
    
    // Store report in database for historical reference
    await prisma.$executeRaw`
      INSERT INTO agent_memory (user_id, memory_type, content, metadata, created_at)
      VALUES (${userId}, 'SEMANTIC', ${JSON.stringify(report)}, ${JSON.stringify({ type: 'usage_report' })}, NOW())
    `;
    
    logger.info({ userId, reportSize: JSON.stringify(report).length }, 'Usage report generated');
    
    // If user has Stripe, schedule billing report
    if (user?.stripeCustomerId && user.planId !== 'FREE') {
      await scheduleStripeBillingReport(
        userId,
        user.stripeCustomerId,
        stats.currentPeriod.period
      );
    }
    
    return {
      userId,
      generatedAt: report.generatedAt,
      report,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Failed to generate usage report');
    throw error;
  }
}

/**
 * Process batch usage reports for all active users
 */
async function processBatchUsageReports(): Promise<{
  total: number;
  successful: number;
  failed: number;
  generatedAt: string;
}> {
  try {
    logger.info('Starting batch usage report generation');
    
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    
    let successful = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        await generateUsageReport(user.id);
        successful++;
      } catch (error) {
        logger.error({ error, userId: user.id }, 'Failed to generate report for user');
        failed++;
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    logger.info({ total: users.length, successful, failed }, 'Batch usage report completed');
    
    return {
      total: users.length,
      successful,
      failed,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ error }, 'Batch usage report failed');
    throw error;
  }
}

/**
 * Worker to process Stripe billing reports
 */
export const usageBillingWorker = new Worker(
  USAGE_BILLING_QUEUE,
  async (job: Job) => {
    const { userId, stripeCustomerId, billingPeriod } = job.data;
    
    return await sendStripeUsageReport(userId, stripeCustomerId, billingPeriod);
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

/**
 * Send usage report to Stripe for usage-based billing
 */
async function sendStripeUsageReport(
  userId: string,
  stripeCustomerId: string,
  billingPeriod: string
): Promise<{
  success: boolean;
  stripeCustomerId: string;
  billingPeriod: string;
  usageSubmitted: boolean;
}> {
  try {
    logger.info({ userId, stripeCustomerId, billingPeriod }, 'Sending usage report to Stripe');
    
    const stats = await UsageMeteringService.getUsageStats(userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true, stripeSubscriptionId: true },
    });
    
    if (!user?.stripeSubscriptionId) {
      logger.warn({ userId }, 'No Stripe subscription found for user');
      return {
        success: false,
        stripeCustomerId,
        billingPeriod,
        usageSubmitted: false,
      };
    }
    
    // Get the subscription to find the usage record ID
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // Find the usage record for the subscription item
    // This assumes you have a usage-based price on the subscription
    const subscriptionItem = subscription.items.data.find(
      item => item.price.recurring?.usage_type === 'metered'
    );
    
    if (!subscriptionItem) {
      logger.warn({ userId }, 'No metered price found on subscription');
      return {
        success: false,
        stripeCustomerId,
        billingPeriod,
        usageSubmitted: false,
      };
    }
    
    // Calculate overage for AI Actions
    const aiActionsOverage = Math.max(0, stats.currentPeriod.aiActionsUsed - stats.currentPeriod.aiActionsLimit);
    
    // Calculate overage for API Calls
    const apiCallsOverage = Math.max(0, stats.currentPeriod.apiCallsUsed - stats.currentPeriod.apiCallsLimit);
    
    // Submit usage records to Stripe
    const usageRecords = [];
    
    if (aiActionsOverage > 0) {
      const record = await stripe.subscriptionItems.createUsageRecord(
        subscriptionItem.id,
        {
          quantity: aiActionsOverage,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment',
        }
      );
      usageRecords.push(record);
      logger.info({ userId, overage: aiActionsOverage }, 'AI Actions overage reported to Stripe');
    }
    
    if (apiCallsOverage > 0) {
      const record = await stripe.subscriptionItems.createUsageRecord(
        subscriptionItem.id,
        {
          quantity: apiCallsOverage,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment',
        }
      );
      usageRecords.push(record);
      logger.info({ userId, overage: apiCallsOverage }, 'API Calls overage reported to Stripe');
    }
    
    // Store billing report in database
    await prisma.$executeRaw`
      INSERT INTO billing_invoices (user_id, stripe_invoice_id, amount, currency, status, period_start, period_end, created_at)
      VALUES (
        ${userId}, 
        ${`usage_${billingPeriod}_${Date.now()}`}, 
        ${(aiActionsOverage * 0.01) + (apiCallsOverage * 0.005)}, 
        'usd', 
        'pending', 
        ${stats.currentPeriod.startDate}, 
        ${stats.currentPeriod.endDate}, 
        NOW()
      )
    `;
    
    logger.info({ userId, usageRecords: usageRecords.length }, 'Stripe usage report sent successfully');
    
    return {
      success: true,
      stripeCustomerId,
      billingPeriod,
      usageSubmitted: usageRecords.length > 0,
    };
  } catch (error) {
    logger.error({ error, userId, stripeCustomerId }, 'Failed to send Stripe usage report');
    throw error;
  }
}

/**
 * Generate weekly usage digest for users
 */
export async function generateWeeklyDigest(): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  try {
    logger.info('Generating weekly usage digest');
    
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        notificationPreferences: {
          weeklyReport: true,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        const stats = await UsageMeteringService.getUsageStats(user.id);
        
        // This would integrate with email service
        // await EmailService.sendWeeklyUsageDigest(user.email, user.name, stats);
        
        sent++;
        logger.debug({ userId: user.id }, 'Weekly digest sent');
      } catch (error) {
        logger.error({ error, userId: user.id }, 'Failed to send weekly digest');
        failed++;
      }
    }
    
    logger.info({ total: users.length, sent, failed }, 'Weekly digest generation completed');
    
    return {
      total: users.length,
      sent,
      failed,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to generate weekly digest');
    throw error;
  }
}

/**
 * Clean up old usage reports
 */
export async function cleanupOldReports(daysToKeep: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Delete old usage reports from agent_memory
    const result = await prisma.$executeRaw`
      DELETE FROM agent_memory 
      WHERE memory_type = 'SEMANTIC' 
        AND metadata->>'type' = 'usage_report'
        AND created_at < ${cutoffDate}
    `;
    
    logger.info({ deletedCount: result, daysToKeep }, 'Old usage reports cleaned up');
    
    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup old reports');
    return 0;
  }
}

// Worker event handlers
usageReportWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Usage report job completed');
});

usageReportWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Usage report job failed');
});

usageBillingWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Stripe billing job completed');
});

usageBillingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Stripe billing job failed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await usageReportWorker.close();
  await usageBillingWorker.close();
  await usageReportQueue.close();
  await usageBillingQueue.close();
  await redisConnection.quit();
  logger.info('Usage report workers shut down');
});