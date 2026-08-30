"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyPlatformMetricsCron = exports.weeklyReportCron = void 0;
// enterprise-ai-agent-platform/apps/api/src/cron/weekly-report.cron.ts
const cron_1 = require("cron");
const email_digest_queue_1 = require("../queues/email-digest.queue");
const logger_1 = require("../utils/logger");
const client_1 = require("../db/client");
/**
 * Weekly report cron job
 * Runs every Monday at 9:00 AM
 */
exports.weeklyReportCron = new cron_1.CronJob('0 9 * * 1', // At 09:00:00 on Monday
async () => {
    logger_1.logger.info('Starting weekly report cron job');
    try {
        const result = await (0, email_digest_queue_1.batchProcessWeeklyDigests)();
        logger_1.logger.info({
            total: result.total,
            successful: result.successful,
            failed: result.failed,
        }, 'Weekly report cron job completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Weekly report cron job failed');
    }
}, null, true, 'America/New_York');
/**
 * Weekly platform metrics report (admin)
 * Runs every Monday at 10:00 AM
 */
exports.weeklyPlatformMetricsCron = new cron_1.CronJob('0 10 * * 1', // At 10:00:00 on Monday
async () => {
    logger_1.logger.info('Starting weekly platform metrics cron job');
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        // Get platform metrics for the week
        const [newUsers, totalExecutions, totalCost, activeUsers] = await Promise.all([
            client_1.prisma.user.count({ where: { createdAt: { gte: startDate } } }),
            client_1.prisma.agentExecution.count({ where: { createdAt: { gte: startDate } } }),
            client_1.prisma.agentExecution.aggregate({
                where: { createdAt: { gte: startDate } },
                _sum: { costUsd: true },
            }),
            client_1.prisma.user.count({ where: { lastLoginAt: { gte: startDate } } }),
        ]);
        logger_1.logger.info({
            weekStart: startDate.toISOString().split('T')[0],
            newUsers,
            totalExecutions,
            totalCost: Number(totalCost._sum.costUsd || 0),
            activeUsers,
        }, 'Weekly platform metrics');
        // This could send an email to admin or store in a reporting table
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Weekly platform metrics cron job failed');
    }
}, null, true, 'America/New_York');
//# sourceMappingURL=weekly-report.cron.js.map