"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyDigestWorker = exports.dailyDigestWorker = exports.weeklyDigestQueue = exports.dailyDigestQueue = void 0;
exports.scheduleDailyDigest = scheduleDailyDigest;
exports.scheduleWeeklyDigest = scheduleWeeklyDigest;
exports.batchProcessDailyDigests = batchProcessDailyDigests;
exports.batchProcessWeeklyDigests = batchProcessWeeklyDigests;
// enterprise-ai-agent-platform/apps/api/src/queues/email-digest.queue.ts
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const email_service_1 = require("../services/email.service");
// Initialize Redis connection
const redisConnection = new ioredis_1.default(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});
// Queue names
const DAILY_DIGEST_QUEUE = 'daily-digest';
const WEEKLY_DIGEST_QUEUE = 'weekly-digest';
// Create queues
exports.dailyDigestQueue = new bullmq_1.Queue(DAILY_DIGEST_QUEUE, {
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
exports.weeklyDigestQueue = new bullmq_1.Queue(WEEKLY_DIGEST_QUEUE, {
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
async function scheduleDailyDigest(userId) {
    await exports.dailyDigestQueue.add(`digest-${userId}`, { userId, type: 'daily', timestamp: new Date().toISOString() }, {
        jobId: `daily-${userId}`,
    });
    logger_1.logger.debug({ userId }, 'Daily digest scheduled');
}
/**
 * Schedule weekly digest for a user
 */
async function scheduleWeeklyDigest(userId) {
    await exports.weeklyDigestQueue.add(`digest-${userId}`, { userId, type: 'weekly', timestamp: new Date().toISOString() }, {
        jobId: `weekly-${userId}`,
    });
    logger_1.logger.debug({ userId }, 'Weekly digest scheduled');
}
/**
 * Process daily digest for a user
 */
async function processDailyDigest(userId) {
    try {
        // Get user preferences
        const prefs = await client_1.prisma.notificationPreference.findUnique({
            where: { userId },
        });
        if (!prefs?.dailyDigest) {
            logger_1.logger.debug({ userId }, 'User opted out of daily digest');
            return;
        }
        // Get user details
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) {
            logger_1.logger.warn({ userId }, 'User not found for digest');
            return;
        }
        // Get yesterday's executions
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        endDate.setDate(endDate.getDate() - 1);
        const executions = await client_1.prisma.agentExecution.findMany({
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
        }, {});
        // Send email digest
        await email_service_1.EmailService.sendEmail({
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
        logger_1.logger.info({ userId, executions: executions.length }, 'Daily digest sent');
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to process daily digest');
        throw error;
    }
}
/**
 * Process weekly digest for a user
 */
async function processWeeklyDigest(userId) {
    try {
        // Get user preferences
        const prefs = await client_1.prisma.notificationPreference.findUnique({
            where: { userId },
        });
        if (!prefs?.weeklyReport) {
            logger_1.logger.debug({ userId }, 'User opted out of weekly report');
            return;
        }
        // Get user details
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) {
            logger_1.logger.warn({ userId }, 'User not found for weekly digest');
            return;
        }
        // Get last 7 days executions
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        const executions = await client_1.prisma.agentExecution.findMany({
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
        }, {});
        // Get daily breakdown
        const dailyBreakdown = executions.reduce((acc, e) => {
            const date = e.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        // Send email digest
        await email_service_1.EmailService.sendEmail({
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
        logger_1.logger.info({ userId, executions: executions.length }, 'Weekly digest sent');
    }
    catch (error) {
        logger_1.logger.error({ error, userId }, 'Failed to process weekly digest');
        throw error;
    }
}
/**
 * Worker for daily digest
 */
exports.dailyDigestWorker = new bullmq_1.Worker(DAILY_DIGEST_QUEUE, async (job) => {
    const { userId } = job.data;
    await processDailyDigest(userId);
}, {
    connection: redisConnection,
    concurrency: 5,
});
/**
 * Worker for weekly digest
 */
exports.weeklyDigestWorker = new bullmq_1.Worker(WEEKLY_DIGEST_QUEUE, async (job) => {
    const { userId } = job.data;
    await processWeeklyDigest(userId);
}, {
    connection: redisConnection,
    concurrency: 5,
});
/**
 * Batch process daily digests for all eligible users
 */
async function batchProcessDailyDigests() {
    const users = await client_1.prisma.user.findMany({
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId: user.id }, 'Failed to schedule daily digest');
            failed++;
        }
    }
    logger_1.logger.info({ total: users.length, successful, failed }, 'Daily digests scheduled');
    return { total: users.length, successful, failed };
}
/**
 * Batch process weekly digests for all eligible users
 */
async function batchProcessWeeklyDigests() {
    const users = await client_1.prisma.user.findMany({
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
        }
        catch (error) {
            logger_1.logger.error({ error, userId: user.id }, 'Failed to schedule weekly digest');
            failed++;
        }
    }
    logger_1.logger.info({ total: users.length, successful, failed }, 'Weekly digests scheduled');
    return { total: users.length, successful, failed };
}
// Worker event handlers
exports.dailyDigestWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, userId: job.data.userId }, 'Daily digest job completed');
});
exports.dailyDigestWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Daily digest job failed');
});
exports.weeklyDigestWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, userId: job.data.userId }, 'Weekly digest job completed');
});
exports.weeklyDigestWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Weekly digest job failed');
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.dailyDigestWorker.close();
    await exports.weeklyDigestWorker.close();
    await exports.dailyDigestQueue.close();
    await exports.weeklyDigestQueue.close();
    logger_1.logger.info('Email digest queues shut down');
});
//# sourceMappingURL=email-digest.queue.js.map