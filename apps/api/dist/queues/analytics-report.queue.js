"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsReportWorker = exports.usageReportQueue = exports.analyticsReportQueue = void 0;
exports.scheduleAnalyticsReport = scheduleAnalyticsReport;
exports.batchProcessAnalyticsReports = batchProcessAnalyticsReports;
// enterprise-ai-agent-platform/apps/api/src/queues/analytics-report.queue.ts
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const email_service_1 = require("../services/email.service");
const date_fns_1 = require("date-fns");
// Initialize Redis connection
const redisConnection = new ioredis_1.default(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});
// Queue names
const ANALYTICS_REPORT_QUEUE = 'analytics-report';
const USAGE_REPORT_QUEUE = 'usage-report';
// Create queues
exports.analyticsReportQueue = new bullmq_1.Queue(ANALYTICS_REPORT_QUEUE, {
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
exports.usageReportQueue = new bullmq_1.Queue(USAGE_REPORT_QUEUE, {
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
 * Schedule analytics report for a user
 */
async function scheduleAnalyticsReport(userId, reportType, format = 'pdf') {
    await exports.analyticsReportQueue.add(`report-${userId}-${reportType}`, {
        userId,
        reportType,
        format,
        timestamp: new Date().toISOString(),
    }, {
        jobId: `analytics-${userId}-${reportType}`,
    });
    logger_1.logger.debug({ userId, reportType, format }, 'Analytics report scheduled');
}
/**
 * Generate analytics report for a user
 */
async function generateAnalyticsReport(userId, reportType, format) {
    let startDate;
    let endDate = new Date();
    switch (reportType) {
        case 'daily':
            startDate = (0, date_fns_1.subDays)(endDate, 1);
            break;
        case 'weekly':
            startDate = (0, date_fns_1.subDays)(endDate, 7);
            break;
        case 'monthly':
            startDate = (0, date_fns_1.subMonths)(endDate, 1);
            break;
        default:
            startDate = (0, date_fns_1.subDays)(endDate, 7);
    }
    // Get user data
    const user = await client_1.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, planId: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    // Get executions data
    const executions = await client_1.prisma.agentExecution.findMany({
        where: {
            userId,
            createdAt: { gte: startDate, lte: endDate },
        },
        select: {
            agentType: true,
            actionType: true,
            status: true,
            tokensUsed: true,
            costUsd: true,
            durationMs: true,
            createdAt: true,
        },
    });
    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    const failed = executions.filter(e => e.status === 'ERROR').length;
    const totalCost = executions.reduce((sum, e) => sum + Number(e.costUsd || 0), 0);
    const totalTokens = executions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);
    const avgDuration = executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.durationMs || 0), 0) / executions.length
        : 0;
    const byAgent = executions.reduce((acc, e) => {
        acc[e.agentType] = (acc[e.agentType] || 0) + 1;
        return acc;
    }, {});
    // Get daily breakdown
    const dailyBreakdown = executions.reduce((acc, e) => {
        const date = (0, date_fns_1.format)(e.createdAt, 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});
    const periodLabel = reportType === 'daily' ? 'Last 24 Hours' : reportType === 'weekly' ? 'Last 7 Days' : 'Last 30 Days';
    if (format === 'json') {
        const content = JSON.stringify({
            user: { id: userId, email: user.email, name: user.name, planId: user.planId },
            period: { type: reportType, startDate, endDate, label: periodLabel },
            summary: {
                totalExecutions: executions.length,
                successful,
                failed,
                successRate: executions.length > 0 ? (successful / executions.length) * 100 : 0,
                totalCost,
                totalTokens,
                averageDurationMs: avgDuration,
            },
            breakdown: { byAgent, daily: dailyBreakdown },
            executions: executions.slice(0, 100),
            generatedAt: new Date().toISOString(),
        }, null, 2);
        return {
            content,
            filename: `analytics_report_${userId}_${reportType}_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.json`,
            mimeType: 'application/json',
        };
    }
    if (format === 'csv') {
        const headers = ['Date', 'Agent', 'Action', 'Status', 'Duration (ms)', 'Tokens', 'Cost (USD)'];
        const rows = executions.map(e => [
            (0, date_fns_1.format)(e.createdAt, 'yyyy-MM-dd HH:mm:ss'),
            e.agentType,
            e.actionType,
            e.status,
            e.durationMs || 0,
            e.tokensUsed || 0,
            Number(e.costUsd || 0).toFixed(6),
        ]);
        const content = [headers, ...rows].map(row => row.join(',')).join('\n');
        return {
            content,
            filename: `analytics_report_${userId}_${reportType}_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.csv`,
            mimeType: 'text/csv',
        };
    }
    // PDF format - HTML content
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analytics Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .summary { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
    .card { background: #f3f4f6; border-radius: 8px; padding: 15px; flex: 1; min-width: 150px; }
    .card-value { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .card-label { font-size: 12px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
  </style>
</head>
<body>
  <h1>AI Agent Platform - Analytics Report</h1>
  <p><strong>User:</strong> ${user.name || user.email}</p>
  <p><strong>Plan:</strong> ${user.planId}</p>
  <p><strong>Period:</strong> ${periodLabel} (${(0, date_fns_1.format)(startDate, 'MMM d, yyyy')} - ${(0, date_fns_1.format)(endDate, 'MMM d, yyyy')})</p>
  <p><strong>Generated:</strong> ${(0, date_fns_1.format)(new Date(), 'PPP p')}</p>

  <h2>Summary</h2>
  <div class="summary">
    <div class="card">
      <div class="card-value">${executions.length}</div>
      <div class="card-label">Total Executions</div>
    </div>
    <div class="card">
      <div class="card-value">${successful}</div>
      <div class="card-label">Successful</div>
    </div>
    <div class="card">
      <div class="card-value">${failed}</div>
      <div class="card-label">Failed</div>
    </div>
    <div class="card">
      <div class="card-value">${((successful / (executions.length || 1)) * 100).toFixed(1)}%</div>
      <div class="card-label">Success Rate</div>
    </div>
    <div class="card">
      <div class="card-value">$${totalCost.toFixed(2)}</div>
      <div class="card-label">Total Cost</div>
    </div>
    <div class="card">
      <div class="card-value">${(totalTokens / 1000).toFixed(1)}K</div>
      <div class="card-label">Tokens Used</div>
    </div>
  </div>

  <h2>Usage by Agent</h2>
  <table>
    <thead>
      <tr><th>Agent</th><th>Executions</th><th>Percentage</th></tr>
    </thead>
    <tbody>
      ${Object.entries(byAgent).map(([agent, count]) => `
        <tr><td>${agent}</td><td>${count}</td><td>${((count / executions.length) * 100).toFixed(1)}%</td></tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Recent Executions</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Agent</th><th>Action</th><th>Status</th><th>Duration</th></tr>
    </thead>
    <tbody>
      ${executions.slice(0, 20).map(e => `
        <tr>
          <td>${(0, date_fns_1.format)(e.createdAt, 'MMM d, HH:mm')}</td>
          <td>${e.agentType}</td>
          <td>${e.actionType}</td>
          <td>${e.status}</td>
          <td>${e.durationMs || 0}ms</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>AI Agent Platform - Automated Analytics Report</p>
    <p>View detailed analytics at: ${process.env.APP_URL}/analytics</p>
  </div>
</body>
</html>
  `;
    return {
        content,
        filename: `analytics_report_${userId}_${reportType}_${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.pdf`,
        mimeType: 'text/html',
    };
}
/**
 * Process analytics report
 */
async function processAnalyticsReport(userId, reportType, format) {
    try {
        const user = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user) {
            logger_1.logger.warn({ userId }, 'User not found for analytics report');
            return;
        }
        const report = await generateAnalyticsReport(userId, reportType, format);
        // Send email with attachment
        await email_service_1.EmailService.sendEmail({
            to: user.email,
            toName: user.name || user.email.split('@')[0],
            subject: `Your ${reportType} Analytics Report`,
            template: 'analytics_report',
            data: {
                recipientName: user.name || user.email.split('@')[0],
                reportType,
                date: new Date().toLocaleDateString(),
                dashboardUrl: `${process.env.APP_URL}/analytics`,
            },
            attachments: [
                {
                    filename: report.filename,
                    content: report.content,
                    contentType: report.mimeType,
                },
            ],
        });
        logger_1.logger.info({ userId, reportType, format }, 'Analytics report sent');
    }
    catch (error) {
        logger_1.logger.error({ error, userId, reportType }, 'Failed to process analytics report');
        throw error;
    }
}
/**
 * Worker for analytics report
 */
exports.analyticsReportWorker = new bullmq_1.Worker(ANALYTICS_REPORT_QUEUE, async (job) => {
    const { userId, reportType, format } = job.data;
    await processAnalyticsReport(userId, reportType, format);
}, {
    connection: redisConnection,
    concurrency: 3,
});
/**
 * Batch process analytics reports for all users
 */
async function batchProcessAnalyticsReports(reportType, format = 'pdf') {
    const users = await client_1.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
    });
    let scheduled = 0;
    let failed = 0;
    for (const user of users) {
        try {
            await scheduleAnalyticsReport(user.id, reportType, format);
            scheduled++;
        }
        catch (error) {
            logger_1.logger.error({ error, userId: user.id }, 'Failed to schedule analytics report');
            failed++;
        }
    }
    logger_1.logger.info({ total: users.length, scheduled, failed, reportType }, 'Analytics reports scheduled');
    return { total: users.length, scheduled, failed };
}
// Worker event handlers
exports.analyticsReportWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, userId: job.data.userId, reportType: job.data.reportType }, 'Analytics report job completed');
});
exports.analyticsReportWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Analytics report job failed');
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.analyticsReportWorker.close();
    await exports.analyticsReportQueue.close();
    logger_1.logger.info('Analytics report queue shut down');
});
//# sourceMappingURL=analytics-report.queue.js.map