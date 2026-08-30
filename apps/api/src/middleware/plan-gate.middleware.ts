// enterprise-ai-agent-platform/apps/api/src/middleware/plan-gate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { PlanGateService, FeatureName } from '../services/plan-gate.service';
import { UsageMeteringService } from '../services/usage-metering.service';
import { logger } from '../utils/logger';
import { ActionType } from '../types/usage.types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    planId: string;
  };
}

/**
 * Middleware to check if user has access to a specific feature
 * Returns HTTP 402 Payment Required if feature not available
 */
export function requirePlanFeature(feature: FeatureName) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const result = await PlanGateService.checkFeatureAccess(req.user.id, feature);

      if (!result.allowed) {
        logger.warn({
          userId: req.user.id,
          planId: result.currentPlan,
          feature,
          requiredPlan: result.requiredPlan,
        }, 'Feature access denied by plan');

        res.status(402).json({
          success: false,
          error: 'PLAN_LIMIT_EXCEEDED',
          feature: feature,
          currentPlan: result.currentPlan,
          requiredPlan: result.requiredPlan,
          upgradeUrl: result.upgradeUrl,
          message: result.error,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error, feature }, 'Plan gate middleware error');
      res.status(500).json({
        success: false,
        error: 'Failed to verify plan access',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Middleware to check usage limit before executing an action
 * Returns HTTP 429 Too Many Requests if limit reached
 */
export function requireUsageLimit(
  actionType: ActionType,
  tokensUsed: number = 0
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const result = await UsageMeteringService.checkLimit(
        req.user.id,
        actionType,
        tokensUsed
      );

      if (!result.allowed) {
        const category = result.category === 'ai_action' ? 'AI Actions' : 'API Calls';
        
        logger.warn({
          userId: req.user.id,
          actionType,
          category: result.category,
          used: result.used,
          limit: result.limit,
          resetDate: result.resetDate,
        }, 'Usage limit reached');

        res.status(429).json({
          success: false,
          error: 'USAGE_LIMIT_REACHED',
          category: result.category,
          used: result.used,
          limit: result.limit,
          remaining: result.remaining,
          resetDate: result.resetDate.toISOString(),
          upgradeUrl: result.upgradeUrl,
          message: `${category} limit reached. You have used ${result.used}/${result.limit} this billing period.`,
        });
        return;
      }

      // Attach usage info to request for downstream use
      (req as any).usageInfo = {
        actionType,
        category: result.category,
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
      };

      next();
    } catch (error) {
      logger.error({ error, actionType }, 'Usage limit middleware error');
      res.status(500).json({
        success: false,
        error: 'Failed to verify usage limit',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Middleware that combines feature check AND usage limit check
 * For endpoints that require both
 */
export function requirePlanFeatureWithUsage(
  feature: FeatureName,
  actionType: ActionType,
  tokensUsed: number = 0
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // First check feature access
      const featureResult = await PlanGateService.checkFeatureAccess(req.user.id, feature);

      if (!featureResult.allowed) {
        logger.warn({
          userId: req.user.id,
          planId: featureResult.currentPlan,
          feature,
          requiredPlan: featureResult.requiredPlan,
        }, 'Feature access denied by plan');

        res.status(402).json({
          success: false,
          error: 'PLAN_LIMIT_EXCEEDED',
          feature: feature,
          currentPlan: featureResult.currentPlan,
          requiredPlan: featureResult.requiredPlan,
          upgradeUrl: featureResult.upgradeUrl,
          message: featureResult.error,
        });
        return;
      }

      // Then check usage limit
      const usageResult = await UsageMeteringService.checkLimit(
        req.user.id,
        actionType,
        tokensUsed
      );

      if (!usageResult.allowed) {
        const category = usageResult.category === 'ai_action' ? 'AI Actions' : 'API Calls';
        
        logger.warn({
          userId: req.user.id,
          actionType,
          category: usageResult.category,
          used: usageResult.used,
          limit: usageResult.limit,
          resetDate: usageResult.resetDate,
        }, 'Usage limit reached');

        res.status(429).json({
          success: false,
          error: 'USAGE_LIMIT_REACHED',
          category: usageResult.category,
          used: usageResult.used,
          limit: usageResult.limit,
          remaining: usageResult.remaining,
          resetDate: usageResult.resetDate.toISOString(),
          upgradeUrl: usageResult.upgradeUrl,
          message: `${category} limit reached. You have used ${usageResult.used}/${usageResult.limit} this billing period.`,
        });
        return;
      }

      // Attach usage info to request
      (req as any).usageInfo = {
        actionType,
        category: usageResult.category,
        used: usageResult.used,
        limit: usageResult.limit,
        remaining: usageResult.remaining,
      };

      next();
    } catch (error) {
      logger.error({ error, feature, actionType }, 'Combined plan gate middleware error');
      res.status(500).json({
        success: false,
        error: 'Failed to verify access',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Middleware to check if user has reached warning threshold (80% usage)
 * Adds warning headers but does not block the request
 */
export function warnAtUsageThreshold(threshold: number = 80) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next();
        return;
      }

      const usage = await PlanGateService.getUsagePercentage(req.user.id);
      
      // Check if either usage is above threshold
      const aiWarning = usage.aiActions.percentage >= threshold;
      const apiWarning = usage.apiCalls.percentage >= threshold;
      
      if (aiWarning || apiWarning) {
        res.setHeader('X-Usage-Warning', 'true');
        res.setHeader('X-AI-Actions-Used', usage.aiActions.used);
        res.setHeader('X-AI-Actions-Limit', String(usage.aiActions.limit));
        res.setHeader('X-AI-Actions-Percentage', Math.round(usage.aiActions.percentage));
        res.setHeader('X-API-Calls-Used', usage.apiCalls.used);
        res.setHeader('X-API-Calls-Limit', String(usage.apiCalls.limit));
        res.setHeader('X-API-Calls-Percentage', Math.round(usage.apiCalls.percentage));
        
        if (usage.aiActions.percentage >= 100 || usage.apiCalls.percentage >= 100) {
          res.setHeader('X-Limit-Reached', 'true');
        }
      }
      
      next();
    } catch (error) {
      // Don't block the request if warning check fails
      logger.error({ error }, 'Usage warning middleware error');
      next();
    }
  };
}

/**
 * Middleware to track usage automatically after an action completes
 * Should be used after the actual action is executed
 */
export function trackUsageAfterAction(
  actionType: ActionType,
  tokensUsed: number = 0
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store the original end function
    const originalEnd = res.end;
    const originalJson = res.json;
    
    // Track if action was successful
    let actionSuccessful = false;
    
    // Override json to capture success status
    res.json = function(body: any): Response {
      if (body && (body.success === true || body.status === 'success')) {
        actionSuccessful = true;
      }
      return originalJson.call(this, body);
    };
    
    // Override end to track usage after response
    res.end = function(chunk?: any, encoding?: any, cb?: any): any {
      if (actionSuccessful && req.user) {
        // Track usage asynchronously - don't block response
        UsageMeteringService.incrementUsage(req.user!.id, actionType, tokensUsed)
          .then(result => {
            logger.debug({
              userId: req.user!.id,
              actionType,
              cost: result.cost,
              remaining: result.remaining,
            }, 'Usage tracked after action');
          })
          .catch(error => {
            logger.error({ error, userId: req.user!.id, actionType }, 'Failed to track usage');
          });
      }
      
      return originalEnd.call(this, chunk, encoding, cb);
    };
    
    next();
  };
}

/**
 * Middleware to add usage headers to all authenticated responses
 * Useful for showing usage in dashboard
 */
export function addUsageHeaders() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }
    
    try {
      const usage = await PlanGateService.getUsagePercentage(req.user.id);
      
      res.setHeader('X-Plan', req.user.planId);
      res.setHeader('X-AI-Actions-Used', usage.aiActions.used);
      res.setHeader('X-AI-Actions-Limit', String(usage.aiActions.limit));
      res.setHeader('X-AI-Actions-Percentage', Math.round(usage.aiActions.percentage));
      res.setHeader('X-API-Calls-Used', usage.apiCalls.used);
      res.setHeader('X-API-Calls-Limit', String(usage.apiCalls.limit));
      res.setHeader('X-API-Calls-Percentage', Math.round(usage.apiCalls.percentage));
      
      const resetDate = UsageMeteringService.getBillingPeriodEndDate();
      res.setHeader('X-Billing-Reset-Date', resetDate.toISOString());
      
      next();
    } catch (error) {
      logger.error({ error }, 'Failed to add usage headers');
      next();
    }
  };
}

/**
 * Middleware for admin to override plan limits (for testing/support)
 * Only works for ADMIN role
 */
export function adminOverridePlanLimit() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.role === 'ADMIN') {
      (req as any).adminOverride = true;
      res.setHeader('X-Admin-Override', 'true');
      logger.warn({ userId: req.user.id, path: req.path }, 'Admin plan limit override active');
    }
    next();
  };
}

/**
 * Middleware to check if user can access multi-platform posting
 * Special check for PROFESSIONAL+ plans
 */
export function requireMultiPlatformPosting() {
  return requirePlanFeature('multiPlatformPosts');
}

/**
 * Middleware to check if user can access API
 * Special check for PROFESSIONAL+ plans
 */
export function requireApiAccess() {
  return requirePlanFeature('apiAccess');
}

/**
 * Middleware to check if user can access white-label feature
 * Special check for ENTERPRISE only
 */
export function requireWhiteLabel() {
  return requirePlanFeature('whiteLabel');
}

/**
 * Middleware to check if user can access video generation
 * Special check for ENTERPRISE only
 */
export function requireVideoGeneration() {
  return requirePlanFeature('contentAgentVideo');
}

/**
 * Middleware to check if user can access image generation
 * Special check for PROFESSIONAL+ plans
 */
export function requireImageGeneration() {
  return requirePlanFeature('contentAgentImage');
}