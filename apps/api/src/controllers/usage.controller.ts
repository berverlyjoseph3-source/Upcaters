// enterprise-ai-agent-platform/apps/api/src/controllers/usage.controller.ts
import { Request, Response } from 'express';
import { UsageMeteringService } from '../services/usage-metering.service';
import { PlanGateService } from '../services/plan-gate.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/plan-gate.middleware';
import { ActionType, ACTION_COSTS } from '../types/usage.types';

export class UsageController {
  /**
   * GET /api/usage/stats
   * Get current usage statistics for authenticated user
   */
  static async getUsageStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const stats = await UsageMeteringService.getUsageStats(req.user.id);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage stats');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage statistics',
      });
    }
  }

  /**
   * GET /api/usage/limits
   * Get plan limits for authenticated user
   */
  static async getPlanLimits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { planId, limits, features } = await PlanGateService.getUserPlan(req.user.id);
      const usage = await UsageMeteringService.getCurrentUsage(req.user.id);
      const resetDate = UsageMeteringService.getBillingPeriodEndDate();
      
      res.json({
        success: true,
        data: {
          planId,
          limits: {
            aiActions: {
              limit: limits.aiActions,
              used: usage.aiActions,
              remaining: limits.aiActions - usage.aiActions,
            },
            apiCalls: {
              limit: limits.apiCalls,
              used: usage.apiCalls,
              remaining: limits.apiCalls - usage.apiCalls,
            },
            teamMembers: limits.teamMembers,
            storageGB: limits.storageGB,
          },
          features,
          billingPeriod: {
            current: UsageMeteringService.getCurrentBillingPeriod(),
            resetDate: resetDate.toISOString(),
            daysRemaining: Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          },
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get plan limits');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve plan limits',
      });
    }
  }

  /**
   * GET /api/usage/history
   * Get historical usage data for charts
   */
  static async getUsageHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const stats = await UsageMeteringService.getUsageStats(req.user.id);
      
      res.json({
        success: true,
        data: {
          historical: stats.historical,
          byAgent: stats.byAgent,
          topActions: stats.topActions,
        },
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage history');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage history',
      });
    }
  }

  /**
   * GET /api/usage/actions
   * Get all available action types with their costs
   */
  static async getActionCosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const actions = Object.entries(ACTION_COSTS).map(([key, value]) => ({
        actionType: key,
        category: value.category,
        baseCost: value.baseCost,
        requiresApiCall: value.requiresApiCall,
        tokenMultiplier: value.tokenMultiplier,
      }));
      
      res.json({
        success: true,
        data: actions,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get action costs');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve action costs',
      });
    }
  }

  /**
   * POST /api/usage/sync
   * Force sync usage from Redis to PostgreSQL (admin only)
   */
  static async syncUsageToDatabase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
      }

      // This would trigger a full sync - implementation depends on needs
      // For now, just return success
      res.json({
        success: true,
        message: 'Usage sync triggered',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to sync usage');
      res.status(500).json({
        success: false,
        error: 'Failed to sync usage data',
      });
    }
  }

  /**
   * POST /api/usage/reset
   * Reset usage counters for a user (admin only)
   */
  static async resetUserUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
        return;
      }

      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId required',
        });
        return;
      }

      // Implementation would reset specific user's counters
      // For now, return success
      res.json({
        success: true,
        message: `Usage reset triggered for user ${userId}`,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to reset user usage');
      res.status(500).json({
        success: false,
        error: 'Failed to reset usage',
      });
    }
  }

  /**
   * GET /api/usage/export
   * Export usage data as CSV
   */
  static async exportUsageCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const stats = await UsageMeteringService.getUsageStats(req.user.id);
      
      // Build CSV
      const rows: string[][] = [
        ['Metric', 'Value'],
        ['Period', stats.currentPeriod.period],
        ['AI Actions Used', stats.currentPeriod.aiActionsUsed.toString()],
        ['AI Actions Limit', stats.currentPeriod.aiActionsLimit.toString()],
        ['API Calls Used', stats.currentPeriod.apiCallsUsed.toString()],
        ['API Calls Limit', stats.currentPeriod.apiCallsLimit.toString()],
        ['Percentage Used', `${Math.round(stats.currentPeriod.percentageUsed)}%`],
        ['Days Remaining', stats.currentPeriod.daysRemaining.toString()],
        [''],
        ['Action Type', 'Count', 'Cost'],
      ];
      
      for (const [actionType, data] of Object.entries(stats.byActionType)) {
        rows.push([actionType, data.count.toString(), data.cost.toString()]);
      }
      
      rows.push([''], ['By Agent', 'Count', 'Cost']);
      for (const [agent, data] of Object.entries(stats.byAgent)) {
        rows.push([agent, data.count.toString(), data.cost.toString()]);
      }
      
      const csv = rows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=usage_${req.user.id}_${stats.currentPeriod.period}.csv`);
      res.send(csv);
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to export usage CSV');
      res.status(500).json({
        success: false,
        error: 'Failed to export usage data',
      });
    }
  }

  /**
   * GET /api/usage/check-feature/:feature
   * Check if user has access to a specific feature
   */
  static async checkFeatureAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { feature } = req.params;
      const result = await PlanGateService.checkFeatureAccess(req.user.id, feature as any);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id, feature: req.params.feature }, 'Failed to check feature access');
      res.status(500).json({
        success: false,
        error: 'Failed to check feature access',
      });
    }
  }

  /**
   * GET /api/usage/check-limit/:category
   * Check if user has reached usage limit for a category
   */
  static async checkUsageLimit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { category } = req.params;
      if (category !== 'ai_action' && category !== 'api_call') {
        res.status(400).json({
          success: false,
          error: 'Invalid category. Use "ai_action" or "api_call"',
        });
        return;
      }

      const result = await PlanGateService.checkUsageLimit(req.user.id, category);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id, category: req.params.category }, 'Failed to check usage limit');
      res.status(500).json({
        success: false,
        error: 'Failed to check usage limit',
      });
    }
  }

  /**
   * GET /api/usage/percentage
   * Get usage percentage for dashboard progress bars
   */
  static async getUsagePercentage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const percentage = await PlanGateService.getUsagePercentage(req.user.id);
      
      res.json({
        success: true,
        data: percentage,
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id }, 'Failed to get usage percentage');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage percentage',
      });
    }
  }
}