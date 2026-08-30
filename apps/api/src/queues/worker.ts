// enterprise-ai-agent-platform/apps/api/src/queues/worker.ts
import { logger } from '../utils/logger';
import { scheduledPostsWorker } from './scheduled-posts.queue';
import { dailyDigestWorker, weeklyDigestWorker } from './email-digest.queue';
import { analyticsReportWorker } from './analytics-report.queue';
import { usageReportWorker, usageBillingWorker } from './usage-report.job';
import { oauthRefreshWorker } from './oauth-refresh.job';

/**
 * Initialize all queue workers
 */
async function initializeWorkers(): Promise < void > {
  logger.info('Initializing queue workers...');
  
  // Social media scheduled posts
  scheduledPostsWorker.on('error', (error) => {
    logger.error({ error }, 'Scheduled posts worker error');
  });
  
  // Email digest workers
  dailyDigestWorker.on('error', (error) => {
    logger.error({ error }, 'Daily digest worker error');
  });
  
  weeklyDigestWorker.on('error', (error) => {
    logger.error({ error }, 'Weekly digest worker error');
  });
  
  // Analytics report worker
  analyticsReportWorker.on('error', (error) => {
    logger.error({ error }, 'Analytics report worker error');
  });
  
  // Usage report workers
  usageReportWorker.on('error', (error) => {
    logger.error({ error }, 'Usage report worker error');
  });
  
  usageBillingWorker.on('error', (error) => {
    logger.error({ error }, 'Usage billing worker error');
  });
  
  // OAuth refresh worker
  oauthRefreshWorker.on('error', (error) => {
    logger.error({ error }, 'OAuth refresh worker error');
  });
  
  logger.info('All queue workers initialized');
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(): Promise < void > {
  logger.info('Received shutdown signal, closing workers...');
  
  const shutdownPromises = [
    scheduledPostsWorker.close(),
    dailyDigestWorker.close(),
    weeklyDigestWorker.close(),
    analyticsReportWorker.close(),
    usageReportWorker.close(),
    usageBillingWorker.close(),
    oauthRefreshWorker.close(),
  ];
  
  await Promise.all(shutdownPromises);
  
  logger.info('All workers closed gracefully');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception in worker');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker');
  process.exit(1);
});

// Start workers
initializeWorkers().catch((error) => {
  logger.error({ error }, 'Failed to initialize workers');
  process.exit(1);
});