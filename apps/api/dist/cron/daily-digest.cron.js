"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyUsageSummaryCron = exports.dailyDigestCron = void 0;
// enterprise-ai-agent-platform/apps/api/src/cron/daily-digest.cron.ts
const cron_1 = require("cron");
const email_digest_queue_1 = require("../queues/email-digest.queue");
const logger_1 = require("../utils/logger");
const client_1 = require("../db/client");
/**
 * Daily digest cron job
 * Runs every day at 8:00 AM
 */
exports.dailyDigestCron = new cron_1.CronJob('0 8 * * *', // At 08:00:00 every day
async () => {
    logger_1.logger.info('Starting daily digest cron job');
    try {
        const result = await (0, email_digest_queue_1.batchProcessDailyDigests)();
        logger_1.logger.info({
            total: result.total,
            successful: result.successful,
            failed: result.failed,
        }, 'Daily digest cron job completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Daily digest cron job failed');
    }
}, null, true, // Start the job
'America/New_York' // Timezone
);
/**
 * Daily usage summary cron job
 * Runs every day at 23:59 to prepare end-of-day stats
 */
exports.dailyUsageSummaryCron = new cron_1.CronJob('59 23 * * *', // At 23:59:00 every day
async () => {
    logger_1.logger.info('Starting daily usage summary cron job');
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Get daily usage stats
        const dailyUsage = await client_1.prisma.agentExecution.groupBy({
            by: ['agentType'],
            where: {
                createdAt: { gte: yesterday, lt: today },
                status: 'SUCCESS',
            },
            _count: { id: true },
            _sum: { costUsd: true, tokensUsed: true },
        });
        // Store in a daily summary table (optional)
        logger_1.logger.info({ date: yesterday.toISOString().split('T')[0], usage: dailyUsage }, 'Daily usage summary');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Daily usage summary cron job failed');
    }
}, null, true, 'America/New_York');
//# sourceMappingURL=daily-digest.cron.js.map