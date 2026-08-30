"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/queues/worker.ts
const logger_1 = require("../utils/logger");
const scheduled_posts_queue_1 = require("./scheduled-posts.queue");
const email_digest_queue_1 = require("./email-digest.queue");
const analytics_report_queue_1 = require("./analytics-report.queue");
const usage_report_job_1 = require("./usage-report.job");
const oauth_refresh_job_1 = require("./oauth-refresh.job");
/**
 * Initialize all queue workers
 */
async function initializeWorkers() {
    logger_1.logger.info('Initializing queue workers...');
    // Social media scheduled posts
    scheduled_posts_queue_1.scheduledPostsWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'Scheduled posts worker error');
    });
    // Email digest workers
    email_digest_queue_1.dailyDigestWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'Daily digest worker error');
    });
    email_digest_queue_1.weeklyDigestWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'Weekly digest worker error');
    });
    // Analytics report worker
    analytics_report_queue_1.analyticsReportWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'Analytics report worker error');
    });
    // Usage report workers
    usage_report_job_1.usageReportWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'Usage report worker error');
    });
    usage_report_job_1.usageBillingWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'Usage billing worker error');
    });
    // OAuth refresh worker
    oauth_refresh_job_1.oauthRefreshWorker.on('error', (error) => {
        logger_1.logger.error({ error }, 'OAuth refresh worker error');
    });
    logger_1.logger.info('All queue workers initialized');
}
/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
    logger_1.logger.info('Received shutdown signal, closing workers...');
    const shutdownPromises = [
        scheduled_posts_queue_1.scheduledPostsWorker.close(),
        email_digest_queue_1.dailyDigestWorker.close(),
        email_digest_queue_1.weeklyDigestWorker.close(),
        analytics_report_queue_1.analyticsReportWorker.close(),
        usage_report_job_1.usageReportWorker.close(),
        usage_report_job_1.usageBillingWorker.close(),
        oauth_refresh_job_1.oauthRefreshWorker.close(),
    ];
    await Promise.all(shutdownPromises);
    logger_1.logger.info('All workers closed gracefully');
    process.exit(0);
}
// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger_1.logger.error({ error }, 'Uncaught exception in worker');
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error({ reason }, 'Unhandled rejection in worker');
    process.exit(1);
});
// Start workers
initializeWorkers().catch((error) => {
    logger_1.logger.error({ error }, 'Failed to initialize workers');
    process.exit(1);
});
//# sourceMappingURL=worker.js.map