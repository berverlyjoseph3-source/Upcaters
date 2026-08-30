"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageBillingWorker = exports.usageReportWorker = exports.usageBillingQueue = exports.usageReportQueue = exports.USAGE_BILLING_QUEUE = exports.USAGE_REPORT_QUEUE = void 0;
exports.scheduleUsageReport = scheduleUsageReport;
exports.scheduleBatchUsageReport = scheduleBatchUsageReport;
exports.scheduleStripeBillingReport = scheduleStripeBillingReport;
exports.generateWeeklyDigest = generateWeeklyDigest;
exports.cleanupOldReports = cleanupOldReports;
// enterprise-ai-agent-platform/apps/api/src/queues/usage-report.job.ts
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const stripe_1 = __importDefault(require("stripe"));
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const usage_metering_service_1 = require("../services/usage-metering.service");
// Initialize Redis connection
const redisConnection = new ioredis_1.default(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
});
// Queue names
exports.USAGE_REPORT_QUEUE = 'usage-report';
exports.USAGE_BILLING_QUEUE = 'usage-billing';
// Create queues
exports.usageReportQueue = new bullmq_1.Queue(exports.USAGE_REPORT_QUEUE, {
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
exports.usageBillingQueue = new bullmq_1.Queue(exports.USAGE_BILLING_QUEUE, {
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
async function scheduleUsageReport(userId) {
    await exports.usageReportQueue.add(`report-${userId}`, { userId, timestamp: new Date().toISOString() }, {
        jobId: `report-${userId}`,
        delay: 5000, // 5 second delay to allow usage to settle
    });
    logger_1.logger.debug({ userId }, 'Usage report scheduled');
}
/**
 * Schedule batch usage reporting for all users
 */
async function scheduleBatchUsageReport() {
    await exports.usageReportQueue.add('batch-report', { batch: true, timestamp: new Date().toISOString() }, {
        jobId: `batch-${new Date().toISOString().split('T')[0]}`,
    });
    logger_1.logger.info('Batch usage report scheduled');
}
/**
 * Schedule usage-based billing report to Stripe
 */
async function scheduleStripeBillingReport(userId, stripeCustomerId, billingPeriod) {
    await exports.usageBillingQueue.add(`stripe-${userId}-${billingPeriod}`, {
        userId,
        stripeCustomerId,
        billingPeriod,
        timestamp: new Date().toISOString(),
    }, {
        jobId: `stripe-${userId}-${billingPeriod}`,
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute initial delay
        },
    });
    logger_1.logger.debug({ userId, billingPeriod }, 'Stripe billing report scheduled');
}
/**
 * Worker to process usage report generation
 */
exports.usageReportWorker = new bullmq_1.Worker(exports.USAGE_REPORT_QUEUE, async (job) => {
    const { userId, batch } = job.data;
    if (batch) {
        return await processBatchUsageReports();
    }
    return await generateUsageReport(userId);
}, {
    connection: redisConnection,
    concurrency: 5,
});
/**
 * Generate usage report for a single user
 */
async function generateUsageReport(userId) {
    try {
        logger_1.logger.info({ userId }, 'Generating usage report');
        const stats = await usage_metering_service_1.UsageMeteringService.getUsageStats(userId);
        const user = await client_1.prisma.user.findUnique({
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
        await client_1.prisma.$executeRaw `
      INSERT INTO agent_memory (user_id, memory_type, content, metadata, created_at)
      VALUES (${userId}, 'SEMANTIC', ${JSON.stringify(report)}, ${JSON.stringify({ type: 'usage_report' })}, NOW())
    `;
        logger_1.logger.info({ userId, reportSize: JSON.stringify(report).length }, 'Usage report generated');
        // If user has Stripe, schedule billing report
        if (user?.stripeCustomerId && user.planId !== 'FREE') {
            await scheduleStripeBillingReport(userId, user.stripeCustomerId, stats.currentPeriod.period);
        }
        return {
            userId,
            generatedAt: report.generatedAt,
            report,
        };
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to generate usage report');
        throw error;
    }
}
/**
 * Process batch usage reports for all active users
 */
async function processBatchUsageReports() {
    try {
        logger_1.logger.info('Starting batch usage report generation');
        const users = await client_1.prisma.user.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        let successful = 0;
        let failed = 0;
        for (const user of users) {
            try {
                await generateUsageReport(user.id);
                successful++;
            }
            catch (error) {
                logger_1.logger.error({ error, userId: user.id }, 'Failed to generate report for user');
                failed++;
            }
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        logger_1.logger.info({ total: users.length, successful, failed }, 'Batch usage report completed');
        return {
            total: users.length,
            successful,
            failed,
            generatedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Batch usage report failed');
        throw error;
    }
}
/**
 * Worker to process Stripe billing reports
 */
exports.usageBillingWorker = new bullmq_1.Worker(exports.USAGE_BILLING_QUEUE, async (job) => {
    const { userId, stripeCustomerId, billingPeriod } = job.data;
    return await sendStripeUsageReport(userId, stripeCustomerId, billingPeriod);
}, {
    connection: redisConnection,
    concurrency: 3,
});
/**
 * Send usage report to Stripe for usage-based billing
 */
async function sendStripeUsageReport(userId, stripeCustomerId, billingPeriod) {
    try {
        logger_1.logger.info({ userId, stripeCustomerId, billingPeriod }, 'Sending usage report to Stripe');
        const stats = await usage_metering_service_1.UsageMeteringService.getUsageStats(userId);
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { planId: true, stripeSubscriptionId: true },
        });
        if (!user?.stripeSubscriptionId) {
            logger_1.logger.warn({ userId }, 'No Stripe subscription found for user');
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
        const subscriptionItem = subscription.items.data.find(item => item.price.recurring?.usage_type === 'metered');
        if (!subscriptionItem) {
            logger_1.logger.warn({ userId }, 'No metered price found on subscription');
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
            const record = await stripe.subscriptionItems.createUsageRecord(subscriptionItem.id, {
                quantity: aiActionsOverage,
                timestamp: Math.floor(Date.now() / 1000),
                action: 'increment',
            });
            usageRecords.push(record);
            logger_1.logger.info({ userId, overage: aiActionsOverage }, 'AI Actions overage reported to Stripe');
        }
        if (apiCallsOverage > 0) {
            const record = await stripe.subscriptionItems.createUsageRecord(subscriptionItem.id, {
                quantity: apiCallsOverage,
                timestamp: Math.floor(Date.now() / 1000),
                action: 'increment',
            });
            usageRecords.push(record);
            logger_1.logger.info({ userId, overage: apiCallsOverage }, 'API Calls overage reported to Stripe');
        }
        // Store billing report in database
        await client_1.prisma.$executeRaw `
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
        logger_1.logger.info({ userId, usageRecords: usageRecords.length }, 'Stripe usage report sent successfully');
        return {
            success: true,
            stripeCustomerId,
            billingPeriod,
            usageSubmitted: usageRecords.length > 0,
        };
    }
    catch (error) {
        logger_1.logger.error({ error, userId, stripeCustomerId }, 'Failed to send Stripe usage report');
        throw error;
    }
}
/**
 * Generate weekly usage digest for users
 */
async function generateWeeklyDigest() {
    try {
        logger_1.logger.info('Generating weekly usage digest');
        const users = await client_1.prisma.user.findMany({
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
                const stats = await usage_metering_service_1.UsageMeteringService.getUsageStats(user.id);
                // This would integrate with email service
                // await EmailService.sendWeeklyUsageDigest(user.email, user.name, stats);
                sent++;
                logger_1.logger.debug({ userId: user.id }, 'Weekly digest sent');
            }
            catch (error) {
                logger_1.logger.error({ error, userId: user.id }, 'Failed to send weekly digest');
                failed++;
            }
        }
        logger_1.logger.info({ total: users.length, sent, failed }, 'Weekly digest generation completed');
        return {
            total: users.length,
            sent,
            failed,
        };
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to generate weekly digest');
        throw error;
    }
}
/**
 * Clean up old usage reports
 */
async function cleanupOldReports(daysToKeep = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        // Delete old usage reports from agent_memory
        const result = await client_1.prisma.$executeRaw `
      DELETE FROM agent_memory 
      WHERE memory_type = 'SEMANTIC' 
        AND metadata->>'type' = 'usage_report'
        AND created_at < ${cutoffDate}
    `;
        logger_1.logger.info({ deletedCount: result, daysToKeep }, 'Old usage reports cleaned up');
        return result;
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to cleanup old reports');
        return 0;
    }
}
// Worker event handlers
exports.usageReportWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, data: job.data }, 'Usage report job completed');
});
exports.usageReportWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Usage report job failed');
});
exports.usageBillingWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, data: job.data }, 'Stripe billing job completed');
});
exports.usageBillingWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Stripe billing job failed');
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.usageReportWorker.close();
    await exports.usageBillingWorker.close();
    await exports.usageReportQueue.close();
    await exports.usageBillingQueue.close();
    await redisConnection.quit();
    logger_1.logger.info('Usage report workers shut down');
});
//# sourceMappingURL=usage-report.job.js.map