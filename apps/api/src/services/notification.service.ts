// enterprise-ai-agent-platform/apps/api/src/services/notification.service.ts
import { logger } from '../utils/logger';
import { prisma } from '../db/client';
import { EmailService } from './email.service';

export interface Notification {
  userId: string;
  type: 'email' | 'slack' | 'webhook';
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface WebhookPayload {
  event: string;
  userId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export class NotificationService {
  /**
   * Send a notification to a user based on their preferences
   */
  static async sendNotification(notification: Notification): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: notification.userId },
    });

    if (!prefs) return;

    if (notification.type === 'email' && prefs.emailNotifications) {
      await this.sendEmailNotification(notification);
    }

    if (notification.type === 'slack' && prefs.slackWebhookUrl) {
      await this.sendSlackNotification(notification, prefs.slackWebhookUrl);
    }

    if (notification.type === 'webhook' && prefs.webhookUrl) {
      await this.sendWebhookNotification(notification, prefs.webhookUrl);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(notification: Notification): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: notification.userId },
      select: { email: true, name: true },
    });

    if (!user) return;

    await EmailService.sendEmail({
      to: user.email,
      toName: user.name || user.email.split('@')[0],
      subject: notification.title,
      template: 'notification',
      data: {
        title: notification.title,
        message: notification.message,
        ...notification.data,
      },
    });
  }

  /**
   * Send Slack notification
   */
  private static async sendSlackNotification(notification: Notification, webhookUrl: string): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*${notification.title}*\n${notification.message}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${notification.title}*\n${notification.message}`,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        logger.error({ status: response.status, notification }, 'Slack notification failed');
      }
    } catch (error) {
      logger.error({ error, notification }, 'Failed to send Slack notification');
    }
  }

  /**
   * Send webhook notification
   */
  private static async sendWebhookNotification(notification: Notification, webhookUrl: string): Promise<void> {
    try {
      const payload: WebhookPayload = {
        event: notification.title.toLowerCase().replace(/\s/g, '_'),
        userId: notification.userId,
        timestamp: new Date(),
        data: {
          message: notification.message,
          ...notification.data,
        },
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        logger.error({ status: response.status, notification }, 'Webhook notification failed');
      }
    } catch (error) {
      logger.error({ error, notification }, 'Failed to send webhook notification');
    }
  }

  /**
   * Notify user about successful agent execution
   */
  static async notifyExecutionSuccess(userId: string, agentType: string, executionId: string, details?: any): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.notifyOnSuccess) return;

    await this.sendNotification({
      userId,
      type: 'email',
      title: `Agent Execution Successful`,
      message: `Your ${agentType} agent completed successfully.`,
      data: { agentType, executionId, ...details },
    });
  }

  /**
   * Notify user about failed agent execution
   */
  static async notifyExecutionFailure(userId: string, agentType: string, executionId: string, error: string): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.notifyOnFailure) return;

    await this.sendNotification({
      userId,
      type: 'email',
      title: `Agent Execution Failed`,
      message: `Your ${agentType} agent failed to execute. Error: ${error}`,
      data: { agentType, executionId, error },
    });
  }

  /**
   * Notify user about approaching usage limit
   */
  static async notifyUsageLimit(userId: string, metric: string, used: number, limit: number, percentage: number): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.notifyOnLimit) return;

    await this.sendNotification({
      userId,
      type: 'email',
      title: `Usage Limit Alert`,
      message: `You have used ${percentage}% of your ${metric} limit (${used}/${limit}).`,
      data: { metric, used, limit, percentage },
    });
  }

  /**
   * Send daily digest
   */
  static async sendDailyDigest(userId: string): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.dailyDigest) return;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 1);

    const executions = await prisma.agentExecution.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        agentType: true,
        status: true,
        createdAt: true,
      },
    });

    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    const failed = executions.filter(e => e.status === 'ERROR').length;

    await this.sendNotification({
      userId,
      type: 'email',
      title: 'Your Daily Digest',
      message: `You had ${executions.length} agent executions in the last 24 hours (${successful} successful, ${failed} failed).`,
      data: { executions, successful, failed },
    });
  }

  /**
   * Send weekly report
   */
  static async sendWeeklyReport(userId: string): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs?.weeklyReport) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const executions = await prisma.agentExecution.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        agentType: true,
        status: true,
        tokensUsed: true,
        costUsd: true,
      },
    });

    const totalExecutions = executions.length;
    const totalCost = executions.reduce((sum, e) => sum + Number(e.costUsd || 0), 0);
    const byAgent = executions.reduce((acc, e) => {
      acc[e.agentType] = (acc[e.agentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    await this.sendNotification({
      userId,
      type: 'email',
      title: 'Your Weekly Report',
      message: `You had ${totalExecutions} agent executions this week, costing $${totalCost.toFixed(2)}.`,
      data: { totalExecutions, totalCost, byAgent },
    });
  }

  /**
   * Send bulk notification to multiple users
   */
  static async sendBulkNotification(userIds: string[], notification: Omit<Notification, 'userId'>): Promise<{ total: number; successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await this.sendNotification({ ...notification, userId });
        successful++;
      } catch (error) {
        logger.error({ error, userId }, 'Failed to send bulk notification');
        failed++;
      }
    }

    return { total: userIds.length, successful, failed };
  }

  /**
   * Send system announcement to all users
   */
  static async sendSystemAnnouncement(title: string, message: string, data?: Record<string, any>): Promise<void> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    await this.sendBulkNotification(
      users.map(u => u.id),
      { type: 'email', title, message, data }
    );

    logger.info({ title, recipientCount: users.length }, 'System announcement sent');
  }
}