// enterprise-ai-agent-platform/apps/api/src/routes/usage.routes.ts
import { Router } from 'express';
import { UsageController } from '../controllers/usage.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { addUsageHeaders, warnAtUsageThreshold } from '../middleware/plan-gate.middleware';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';

const router = Router();

// Apply authentication and usage headers to all routes in this router
router.use(JwtAuthGuard.protect);
router.use(addUsageHeaders());
router.use(warnAtUsageThreshold(80));

// ============================================
// Usage Statistics Routes
// ============================================

/**
 * GET /api/usage/stats
 * Get current usage statistics for authenticated user
 */
router.get(
  '/stats',
  RateLimitMiddleware.moderate(),
  UsageController.getUsageStats
);

/**
 * GET /api/usage/limits
 * Get plan limits for authenticated user
 */
router.get(
  '/limits',
  RateLimitMiddleware.moderate(),
  UsageController.getPlanLimits
);

/**
 * GET /api/usage/history
 * Get historical usage data for charts
 * Query params: ?months=6 (default)
 */
router.get(
  '/history',
  RateLimitMiddleware.moderate(),
  UsageController.getUsageHistory
);

/**
 * GET /api/usage/percentage
 * Get usage percentage for dashboard progress bars
 */
router.get(
  '/percentage',
  RateLimitMiddleware.relaxed(),
  UsageController.getUsagePercentage
);

/**
 * GET /api/usage/actions
 * Get all available action types with their costs
 */
router.get(
  '/actions',
  RateLimitMiddleware.relaxed(),
  UsageController.getActionCosts
);

// ============================================
// Feature & Limit Check Routes
// ============================================

/**
 * GET /api/usage/check-feature/:feature
 * Check if user has access to a specific feature
 */
router.get(
  '/check-feature/:feature',
  RateLimitMiddleware.relaxed(),
  UsageController.checkFeatureAccess
);

/**
 * GET /api/usage/check-limit/:category
 * Check if user has reached usage limit for a category
 * Categories: ai_action, api_call
 */
router.get(
  '/check-limit/:category',
  RateLimitMiddleware.relaxed(),
  UsageController.checkUsageLimit
);

// ============================================
// Export Routes
// ============================================

/**
 * GET /api/usage/export
 * Export usage data as CSV
 */
router.get(
  '/export',
  RateLimitMiddleware.moderate(),
  UsageController.exportUsageCSV
);

// ============================================
// Admin Only Routes
// ============================================

/**
 * POST /api/usage/sync
 * Force sync usage from Redis to PostgreSQL (admin only)
 */
router.post(
  '/sync',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  UsageController.syncUsageToDatabase
);

/**
 * POST /api/usage/reset
 * Reset usage counters for a user (admin only)
 * Body: { userId: string }
 */
router.post(
  '/reset',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.strict(),
  UsageController.resetUserUsage
);

export default router;