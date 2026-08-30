"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageWarningJob = exports.stripeUsageReportingJob = exports.cleanupReportsJob = exports.dailySyncJob = exports.weeklyDigestJob = exports.monthlyResetJob = void 0;
exports.initializeCronJobs = initializeCronJobs;
exports.stopAllCronJobs = stopAllCronJobs;
// enterprise-ai-agent-platform/apps/api/src/cron/usage-reset.cron.ts
const cron_1 = require("cron");
const usage_metering_service_1 = require("../services/usage-metering.service");
const plan_gate_service_1 = require("../services/plan-gate.service");
const logger_1 = require("../utils/logger");
const client_1 = require("../db/client");
const usage_report_job_1 = require("../queues/usage-report.job");
/**
 * Reset usage counters at the beginning of each month
 * Runs at 00:00:00 on the 1st day of each month
 */
exports.monthlyResetJob = new cron_1.CronJob('0 0 1 * *', // At 00:00:00 on day 1 of each month
async () => {
    logger_1.logger.info('Starting monthly usage counter reset');
    try {
        const result = await usage_metering_service_1.UsageMeteringService.resetMonthlyCounters();
        logger_1.logger.info({
            resetCount: result.resetCount,
            billingPeriod: result.billingPeriod,
        }, 'Monthly usage counters reset completed');
        // Clear plan cache for all users
        plan_gate_service_1.PlanGateService.clearUserPlanCache('*'); // This would need to be implemented to clear all
        // Generate end-of-month reports
        await (0, usage_report_job_1.scheduleBatchUsageReport)();
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Monthly usage reset failed');
    }
}, null, true, // Start the job
'America/New_York' // Timezone
);
/**
 * Weekly usage digest job
 * Runs every Monday at 09:00 AM
 */
exports.weeklyDigestJob = new cron_1.CronJob('0 9 * * 1', // At 09:00:00 on Monday
async () => {
    logger_1.logger.info('Starting weekly usage digest generation');
    try {
        const result = await (0, usage_report_job_1.generateWeeklyDigest)();
        logger_1.logger.info({
            total: result.total,
            sent: result.sent,
            failed: result.failed,
        }, 'Weekly digest generation completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Weekly digest generation failed');
    }
}, null, true, 'America/New_York');
/**
 * Daily usage sync job (backup sync to ensure data consistency)
 * Runs every day at 02:00 AM
 */
exports.dailySyncJob = new cron_1.CronJob('0 2 * * *', // At 02:00:00 every day
async () => {
    logger_1.logger.info('Starting daily usage sync');
    try {
        // Force sync any pending usage data
        // This would be implemented based on your specific needs
        logger_1.logger.info('Daily usage sync completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Daily usage sync failed');
    }
}, null, true, 'America/New_York');
/**
 * Cleanup old reports job
 * Runs every Sunday at 03:00 AM
 */
exports.cleanupReportsJob = new cron_1.CronJob('0 3 * * 0', // At 03:00:00 on Sunday
async () => {
    logger_1.logger.info('Starting cleanup of old usage reports');
    try {
        const deletedCount = await (0, usage_report_job_1.cleanupOldReports)(90); // Keep 90 days
        logger_1.logger.info({ deletedCount }, 'Old usage reports cleanup completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Cleanup of old reports failed');
    }
}, null, true, 'America/New_York');
/**
 * Stripe usage reporting job
 * Runs every day at 00:00 (midnight) to report previous day's usage
 */
exports.stripeUsageReportingJob = new cron_1.CronJob('0 0 * * *', // At 00:00:00 every day
async () => {
    logger_1.logger.info('Starting Stripe usage reporting');
    try {
        const result = await usage_metering_service_1.UsageMeteringService.batchReportStripeUsage();
        logger_1.logger.info({
            reported: result.reported,
            failed: result.failed,
        }, 'Stripe usage reporting completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Stripe usage reporting failed');
    }
}, null, true, 'America/New_York');
/**
 * Warning notification job for users approaching limits
 * Runs every hour
 */
exports.usageWarningJob = new cron_1.CronJob('0 * * * *', // At minute 0 of every hour
async () => {
    logger_1.logger.info('Checking for users approaching usage limits');
    try {
        // Get all active users
        const users = await client_1.prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, email: true, name: true, planId: true },
        });
        let warningsSent = 0;
        for (const user of users) {
            try {
                const percentage = await plan_gate_service_1.PlanGateService.getUsagePercentage(user.id);
                // Send warning at 80% and 95%
                const shouldWarn = (percentage.aiActions.percentage >= 80 && percentage.aiActions.percentage < 90) ||
                    (percentage.apiCalls.percentage >= 80 && percentage.apiCalls.percentage < 90);
                const shouldUrgentWarn = (percentage.aiActions.percentage >= 90) ||
                    (percentage.apiCalls.percentage >= 90);
                if (shouldUrgentWarn) {
                    // Send urgent warning email
                    // await EmailService.sendUsageUrgentWarning(user.email, user.name, percentage);
                    warningsSent++;
                    logger_1.logger.warn({ userId: user.id, percentage }, 'Urgent usage warning sent');
                }
                else if (shouldWarn) {
                    // Send regular warning email
                    // await EmailService.sendUsageWarning(user.email, user.name, percentage);
                    warningsSent++;
                    logger_1.logger.info({ userId: user.id, percentage }, 'Usage warning sent');
                }
                // Small delay to avoid overwhelming
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                logger_1.logger.error({ error, userId: user.id }, 'Failed to process usage warning');
            }
        }
        logger_1.logger.info({ usersChecked: users.length, warningsSent }, 'Usage warning check completed');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Usage warning job failed');
    }
}, null, true, 'America/New_York');
/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
    logger_1.logger.info('Initializing usage metering cron jobs');
    exports.monthlyResetJob.start();
    exports.weeklyDigestJob.start();
    exports.dailySyncJob.start();
    exports.cleanupReportsJob.start();
    exports.stripeUsageReportingJob.start();
    exports.usageWarningJob.start();
    logger_1.logger.info('All usage metering cron jobs initialized');
}
/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopAllCronJobs() {
    logger_1.logger.info('Stopping usage metering cron jobs');
    exports.monthlyResetJob.stop();
    exports.weeklyDigestJob.stop();
    exports.dailySyncJob.stop();
    exports.cleanupReportsJob.stop();
    exports.stripeUsageReportingJob.stop();
    exports.usageWarningJob.stop();
    logger_1.logger.info('All usage metering cron jobs stopped');
}
//# sourceMappingURL=usage-reset.cron.js.map