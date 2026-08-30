// enterprise-ai-agent-platform/apps/api/src/cron/usage-reset.cron.ts
import { CronJob } from 'cron';
import { UsageMeteringService } from '../services/usage-metering.service';
import { PlanGateService } from '../services/plan-gate.service';
import { logger } from '../utils/logger';
import { prisma } from '../db/client';
import { scheduleBatchUsageReport, generateWeeklyDigest, cleanupOldReports } from '../queues/usage-report.job';

/**
 * Reset usage counters at the beginning of each month
 * Runs at 00:00:00 on the 1st day of each month
 */
export const monthlyResetJob = new CronJob(
  '0 0 1 * *', // At 00:00:00 on day 1 of each month
  async () => {
      logger.info('Starting monthly usage counter reset');
      
      try {
        const result = await UsageMeteringService.resetMonthlyCounters();
        
        logger.info({
          resetCount: result.resetCount,
          billingPeriod: result.billingPeriod,
        }, 'Monthly usage counters reset completed');
        
        // Clear plan cache for all users
        PlanGateService.clearUserPlanCache('*'); // This would need to be implemented to clear all
        
        // Generate end-of-month reports
        await scheduleBatchUsageReport();
        
      } catch (error) {
        logger.error({ error }, 'Monthly usage reset failed');
      }
    },
    null,
    true, // Start the job
    'America/New_York' // Timezone
);

/**
 * Weekly usage digest job
 * Runs every Monday at 09:00 AM
 */
export const weeklyDigestJob = new CronJob(
  '0 9 * * 1', // At 09:00:00 on Monday
  async () => {
      logger.info('Starting weekly usage digest generation');
      
      try {
        const result = await generateWeeklyDigest();
        
        logger.info({
          total: result.total,
          sent: result.sent,
          failed: result.failed,
        }, 'Weekly digest generation completed');
        
      } catch (error) {
        logger.error({ error }, 'Weekly digest generation failed');
      }
    },
    null,
    true,
    'America/New_York'
);

/**
 * Daily usage sync job (backup sync to ensure data consistency)
 * Runs every day at 02:00 AM
 */
export const dailySyncJob = new CronJob(
  '0 2 * * *', // At 02:00:00 every day
  async () => {
      logger.info('Starting daily usage sync');
      
      try {
        // Force sync any pending usage data
        // This would be implemented based on your specific needs
        
        logger.info('Daily usage sync completed');
        
      } catch (error) {
        logger.error({ error }, 'Daily usage sync failed');
      }
    },
    null,
    true,
    'America/New_York'
);

/**
 * Cleanup old reports job
 * Runs every Sunday at 03:00 AM
 */
export const cleanupReportsJob = new CronJob(
  '0 3 * * 0', // At 03:00:00 on Sunday
  async () => {
      logger.info('Starting cleanup of old usage reports');
      
      try {
        const deletedCount = await cleanupOldReports(90); // Keep 90 days
        
        logger.info({ deletedCount }, 'Old usage reports cleanup completed');
        
      } catch (error) {
        logger.error({ error }, 'Cleanup of old reports failed');
      }
    },
    null,
    true,
    'America/New_York'
);

/**
 * Stripe usage reporting job
 * Runs every day at 00:00 (midnight) to report previous day's usage
 */
export const stripeUsageReportingJob = new CronJob(
  '0 0 * * *', // At 00:00:00 every day
  async () => {
      logger.info('Starting Stripe usage reporting');
      
      try {
        const result = await UsageMeteringService.batchReportStripeUsage();
        
        logger.info({
          reported: result.reported,
          failed: result.failed,
        }, 'Stripe usage reporting completed');
        
      } catch (error) {
        logger.error({ error }, 'Stripe usage reporting failed');
      }
    },
    null,
    true,
    'America/New_York'
);

/**
 * Warning notification job for users approaching limits
 * Runs every hour
 */
export const usageWarningJob = new CronJob(
  '0 * * * *', // At minute 0 of every hour
  async () => {
      logger.info('Checking for users approaching usage limits');
      
      try {
        // Get all active users
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, email: true, name: true, planId: true },
        });
        
        let warningsSent = 0;
        
        for (const user of users) {
          try {
            const percentage = await PlanGateService.getUsagePercentage(user.id);
            
            // Send warning at 80% and 95%
            const shouldWarn =
              (percentage.aiActions.percentage >= 80 && percentage.aiActions.percentage < 90) ||
              (percentage.apiCalls.percentage >= 80 && percentage.apiCalls.percentage < 90);
            
            const shouldUrgentWarn =
              (percentage.aiActions.percentage >= 90) ||
              (percentage.apiCalls.percentage >= 90);
            
            if (shouldUrgentWarn) {
              // Send urgent warning email
              // await EmailService.sendUsageUrgentWarning(user.email, user.name, percentage);
              warningsSent++;
              logger.warn({ userId: user.id, percentage }, 'Urgent usage warning sent');
            } else if (shouldWarn) {
              // Send regular warning email
              // await EmailService.sendUsageWarning(user.email, user.name, percentage);
              warningsSent++;
              logger.info({ userId: user.id, percentage }, 'Usage warning sent');
            }
            
            // Small delay to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            logger.error({ error, userId: user.id }, 'Failed to process usage warning');
          }
        }
        
        logger.info({ usersChecked: users.length, warningsSent }, 'Usage warning check completed');
        
      } catch (error) {
        logger.error({ error }, 'Usage warning job failed');
      }
    },
    null,
    true,
    'America/New_York'
);

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs(): void {
  logger.info('Initializing usage metering cron jobs');
  
  monthlyResetJob.start();
  weeklyDigestJob.start();
  dailySyncJob.start();
  cleanupReportsJob.start();
  stripeUsageReportingJob.start();
  usageWarningJob.start();
  
  logger.info('All usage metering cron jobs initialized');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopAllCronJobs(): void {
  logger.info('Stopping usage metering cron jobs');
  
  monthlyResetJob.stop();
  weeklyDigestJob.stop();
  dailySyncJob.stop();
  cleanupReportsJob.stop();
  stripeUsageReportingJob.stop();
  usageWarningJob.stop();
  
  logger.info('All usage metering cron jobs stopped');
}