"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupRedisKeysCron = exports.cleanupAuditLogsCron = exports.cleanupAgentMemoryCron = exports.cleanupScheduledPostsCron = exports.cleanupEmailTokensCron = exports.cleanupPasswordTokensCron = exports.cleanupRateLimitsCron = exports.cleanupWebhookEventsCron = exports.cleanupSessionsCron = exports.cleanupExecutionLogsCron = void 0;
exports.initializeCleanupCrons = initializeCleanupCrons;
exports.stopCleanupCrons = stopCleanupCrons;
// enterprise-ai-agent-platform/apps/api/src/cron/cleanup-jobs.cron.ts
const cron_1 = require("cron");
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const scheduled_posts_queue_1 = require("../queues/scheduled-posts.queue");
const redis_init_service_1 = require("../services/redis-init.service");
/**
 * Clean up old execution logs
 * Runs every day at 2:00 AM
 */
exports.cleanupExecutionLogsCron = new cron_1.CronJob('0 2 * * *', // At 02:00:00 every day
async () => {
    logger_1.logger.info('Starting execution logs cleanup');
    try {
        const daysToKeep = 90; // Keep 90 days of logs
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await client_1.prisma.agentExecution.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                status: { in: ['SUCCESS', 'ERROR', 'CANCELLED'] },
            },
        });
        logger_1.logger.info({ deletedCount: result.count, daysToKeep }, 'Execution logs cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Execution logs cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old sessions
 * Runs every day at 3:00 AM
 */
exports.cleanupSessionsCron = new cron_1.CronJob('0 3 * * *', // At 03:00:00 every day
async () => {
    logger_1.logger.info('Starting sessions cleanup');
    try {
        const result = await client_1.prisma.session.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        logger_1.logger.info({ deletedCount: result.count }, 'Expired sessions cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Sessions cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old webhook events
 * Runs every day at 4:00 AM
 */
exports.cleanupWebhookEventsCron = new cron_1.CronJob('0 4 * * *', // At 04:00:00 every day
async () => {
    logger_1.logger.info('Starting webhook events cleanup');
    try {
        const daysToKeep = 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await client_1.prisma.webhookEvent.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                processed: true,
            },
        });
        logger_1.logger.info({ deletedCount: result.count, daysToKeep }, 'Webhook events cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Webhook events cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old rate limit records
 * Runs every hour
 */
exports.cleanupRateLimitsCron = new cron_1.CronJob('0 * * * *', // At minute 0 of every hour
async () => {
    logger_1.logger.info('Starting rate limits cleanup');
    try {
        const result = await client_1.prisma.rateLimit.deleteMany({
            where: {
                windowEnd: { lt: new Date() },
            },
        });
        logger_1.logger.info({ deletedCount: result.count }, 'Rate limit records cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Rate limits cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old password reset tokens
 * Runs every day at 5:00 AM
 */
exports.cleanupPasswordTokensCron = new cron_1.CronJob('0 5 * * *', // At 05:00:00 every day
async () => {
    logger_1.logger.info('Starting password reset tokens cleanup');
    try {
        const result = await client_1.prisma.passwordResetToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { usedAt: { not: null } },
                ],
            },
        });
        logger_1.logger.info({ deletedCount: result.count }, 'Password reset tokens cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Password tokens cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old email verification tokens
 * Runs every day at 5:30 AM
 */
exports.cleanupEmailTokensCron = new cron_1.CronJob('30 5 * * *', // At 05:30:00 every day
async () => {
    logger_1.logger.info('Starting email verification tokens cleanup');
    try {
        const result = await client_1.prisma.emailVerificationToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { usedAt: { not: null } },
                ],
            },
        });
        logger_1.logger.info({ deletedCount: result.count }, 'Email verification tokens cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Email tokens cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old scheduled posts (published)
 * Runs every Sunday at 2:00 AM
 */
exports.cleanupScheduledPostsCron = new cron_1.CronJob('0 2 * * 0', // At 02:00:00 on Sunday
async () => {
    logger_1.logger.info('Starting scheduled posts cleanup');
    try {
        const daysToKeep = 30;
        const deletedCount = await (0, scheduled_posts_queue_1.cleanupPublishedPosts)(daysToKeep);
        logger_1.logger.info({ deletedCount, daysToKeep }, 'Published posts cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Scheduled posts cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old agent memory (expired)
 * Runs every day at 6:00 AM
 */
exports.cleanupAgentMemoryCron = new cron_1.CronJob('0 6 * * *', // At 06:00:00 every day
async () => {
    logger_1.logger.info('Starting agent memory cleanup');
    try {
        const result = await client_1.prisma.agentMemory.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        logger_1.logger.info({ deletedCount: result.count }, 'Expired agent memory cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Agent memory cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up old audit logs (keep for compliance)
 * Runs every month on the 1st at 1:00 AM
 */
exports.cleanupAuditLogsCron = new cron_1.CronJob('0 1 1 * *', // At 01:00:00 on day 1 of every month
async () => {
    logger_1.logger.info('Starting audit logs cleanup');
    try {
        const daysToKeep = 365; // Keep 1 year of audit logs
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await client_1.prisma.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });
        logger_1.logger.info({ deletedCount: result.count, daysToKeep }, 'Audit logs cleaned up');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Audit logs cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Clean up Redis expired keys
 * Runs every hour
 */
exports.cleanupRedisKeysCron = new cron_1.CronJob('30 * * * *', // At minute 30 of every hour
async () => {
    logger_1.logger.info('Starting Redis keys cleanup');
    try {
        const redis = redis_init_service_1.RedisInitService.getClient();
        const keys = await redis.keys('usage:*');
        let expiredCount = 0;
        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl === -2) { // Key doesn't exist (already expired)
                expiredCount++;
            }
        }
        logger_1.logger.info({ totalKeys: keys.length, expired: expiredCount }, 'Redis keys checked');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Redis keys cleanup failed');
    }
}, null, true, 'America/New_York');
/**
 * Initialize all cleanup cron jobs
 */
function initializeCleanupCrons() {
    logger_1.logger.info('Initializing cleanup cron jobs');
    exports.cleanupExecutionLogsCron.start();
    exports.cleanupSessionsCron.start();
    exports.cleanupWebhookEventsCron.start();
    exports.cleanupRateLimitsCron.start();
    exports.cleanupPasswordTokensCron.start();
    exports.cleanupEmailTokensCron.start();
    exports.cleanupScheduledPostsCron.start();
    exports.cleanupAgentMemoryCron.start();
    exports.cleanupAuditLogsCron.start();
    exports.cleanupRedisKeysCron.start();
    logger_1.logger.info('All cleanup cron jobs initialized');
}
/**
 * Stop all cleanup cron jobs
 */
function stopCleanupCrons() {
    logger_1.logger.info('Stopping cleanup cron jobs');
    exports.cleanupExecutionLogsCron.stop();
    exports.cleanupSessionsCron.stop();
    exports.cleanupWebhookEventsCron.stop();
    exports.cleanupRateLimitsCron.stop();
    exports.cleanupPasswordTokensCron.stop();
    exports.cleanupEmailTokensCron.stop();
    exports.cleanupScheduledPostsCron.stop();
    exports.cleanupAgentMemoryCron.stop();
    exports.cleanupAuditLogsCron.stop();
    exports.cleanupRedisKeysCron.stop();
    logger_1.logger.info('All cleanup cron jobs stopped');
}
//# sourceMappingURL=cleanup-jobs.cron.js.map