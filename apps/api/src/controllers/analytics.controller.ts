// enterprise-ai-agent-platform/apps/api/src/controllers/analytics.controller.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/plan-gate.middleware';
import { AnalyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';
import { prisma } from '../db/client';

/**
 * Parse optional startDate/endDate query params into concrete Dates.
 * All AnalyticsService methods require non-optional Date arguments, so
 * default to the last 30 days when the caller doesn't specify a range.
 */
function parseDateRange(
  startDate: unknown,
  endDate: unknown
): { startDate: Date; endDate: Date } {
  const end = endDate ? new Date(endDate as string) : new Date();
  const start = startDate
    ? new Date(startDate as string)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate: start, endDate: end };
}

export class AnalyticsController {
  /**
   * GET /api/analytics
   * Get complete analytics data
   */
  static async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate, agentType, actionType, comparison } = req.query;
      
      const analytics = await AnalyticsService.getAnalytics(
        req.user.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        agentType as string,
        actionType as string,
        comparison as 'previous' | 'year_over_year'
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/summary
   * Get usage summary
   */
  static async getUsageSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate, comparison } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const summary = await AnalyticsService.getUsageSummary(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate,
        comparison as 'previous' | 'year_over_year'
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage summary');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage summary',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/daily
   * Get daily usage data
   */
  static async getDailyUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const dailyUsage = await AnalyticsService.getDailyUsage(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate
      );

      res.json({
        success: true,
        data: dailyUsage,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get daily usage');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve daily usage',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/by-agent
   * Get usage breakdown by agent
   */
  static async getUsageByAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const byAgent = await AnalyticsService.getUsageByAgent(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate
      );

      res.json({
        success: true,
        data: byAgent,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage by agent');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage by agent',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/by-action
   * Get usage breakdown by action type
   */
  static async getUsageByAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const byAction = await AnalyticsService.getUsageByAction(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate
      );

      res.json({
        success: true,
        data: byAction,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage by action');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage by action',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/cost
   * Get cost breakdown
   */
  static async getCostBreakdown(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const costBreakdown = await AnalyticsService.getCostBreakdown(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate
      );

      res.json({
        success: true,
        data: costBreakdown,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get cost breakdown');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cost breakdown',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/forecast
   * Get usage forecast
   */
  static async getForecast(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate, days } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const forecast = await AnalyticsService.getForecast(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate,
        days ? parseInt(days as string) : 30
      );

      res.json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get forecast');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve forecast',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/top-actions
   * Get top actions
   */
  static async getTopActions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { startDate, endDate, limit } = req.query;
      const dateRange = parseDateRange(startDate, endDate);
      
      const topActions = await AnalyticsService.getTopActions(
        req.user.id,
        dateRange.startDate,
        dateRange.endDate,
        limit ? parseInt(limit as string) : 10
      );

      res.json({
        success: true,
        data: topActions,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get top actions');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top actions',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * POST /api/analytics/export
   * Export analytics data
   */
  static async exportAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const { format, dateRange, includeCharts, metrics } = req.body;

      if (!format || !['csv', 'json', 'pdf'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Invalid format. Use csv, json, or pdf',
          code: 'INVALID_FORMAT',
        });
        return;
      }

      const result = await AnalyticsService.exportAnalytics(
        req.user.id,
        format,
        dateRange?.start ? new Date(dateRange.start) : undefined,
        dateRange?.end ? new Date(dateRange.end) : undefined,
        includeCharts,
        metrics
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to export analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics',
        code: 'EXPORT_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/export/download/:fileId
   * Download exported file
   */
  static async downloadExport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      
      // This would retrieve the file from storage
      // For now, return error
      res.status(404).json({
        success: false,
        error: 'File not found',
        code: 'NOT_FOUND',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to download export');
      res.status(500).json({
        success: false,
        error: 'Failed to download export',
        code: 'DOWNLOAD_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/admin/platform
   * Get platform-wide analytics (admin only)
   */
  static async getPlatformAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      
      const analytics = await AnalyticsService.getPlatformAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get platform analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve platform analytics',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/admin/users
   * Get user analytics (admin only)
   */
  static async getUserAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const { startDate, endDate } = req.query;
      
      const analytics = await AnalyticsService.getUserAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get user analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user analytics',
        code: 'ANALYTICS_ERROR',
      });
    }
  }

  /**
   * GET /api/analytics/admin/revenue
   * Get revenue analytics (admin only)
   */
  static async getRevenueAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const { startDate, endDate, period } = req.query;
      
      const analytics = await AnalyticsService.getRevenueAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        period as 'day' | 'week' | 'month' | 'year'
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get revenue analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve revenue analytics',
        code: 'ANALYTICS_ERROR',
      });
    }
  }
}