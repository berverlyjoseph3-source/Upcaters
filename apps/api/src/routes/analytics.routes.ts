// enterprise-ai-agent-platform/apps/api/src/routes/analytics.routes.ts
import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';
import { addUsageHeaders } from '../middleware/plan-gate.middleware';

const router = Router();

// Apply authentication to all analytics routes
router.use(JwtAuthGuard.protect);
router.use(addUsageHeaders());

// ============================================
// Core Analytics Routes
// ============================================

/**
 * GET /api/analytics
 * Get complete analytics data for current user
 * Query params: startDate, endDate, agentType, actionType, comparison
 */
router.get(
  '/',
  RateLimitMiddleware.moderate(),
  AnalyticsController.getAnalytics
);

/**
 * GET /api/analytics/summary
 * Get usage summary for current user
 * Query params: startDate, endDate, comparison
 */
router.get(
  '/summary',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.getUsageSummary
);

/**
 * GET /api/analytics/daily
 * Get daily usage data for charts
 * Query params: startDate, endDate
 */
router.get(
  '/daily',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.getDailyUsage
);

/**
 * GET /api/analytics/by-agent
 * Get usage breakdown by agent
 * Query params: startDate, endDate
 */
router.get(
  '/by-agent',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.getUsageByAgent
);

/**
 * GET /api/analytics/by-action
 * Get usage breakdown by action type
 * Query params: startDate, endDate
 */
router.get(
  '/by-action',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.getUsageByAction
);

/**
 * GET /api/analytics/cost
 * Get cost breakdown
 * Query params: startDate, endDate
 */
router.get(
  '/cost',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.getCostBreakdown
);

/**
 * GET /api/analytics/forecast
 * Get usage forecast
 * Query params: startDate, endDate, days
 */
router.get(
  '/forecast',
  RateLimitMiddleware.moderate(),
  AnalyticsController.getForecast
);

/**
 * GET /api/analytics/top-actions
 * Get top actions by usage
 * Query params: startDate, endDate, limit
 */
router.get(
  '/top-actions',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.getTopActions
);

// ============================================
// Export Routes
// ============================================

/**
 * POST /api/analytics/export
 * Export analytics data in CSV, JSON, or PDF format
 * Body: { format, dateRange, includeCharts, metrics }
 */
router.post(
  '/export',
  RateLimitMiddleware.moderate(),
  AnalyticsController.exportAnalytics
);

/**
 * GET /api/analytics/export/download/:fileId
 * Download exported file
 */
router.get(
  '/export/download/:fileId',
  RateLimitMiddleware.relaxed(),
  AnalyticsController.downloadExport
);

// ============================================
// Admin Analytics Routes
// ============================================

/**
 * GET /api/analytics/admin/platform
 * Get platform-wide analytics (admin only)
 * Query params: startDate, endDate
 */
router.get(
  '/admin/platform',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.moderate(),
  AnalyticsController.getPlatformAnalytics
);

/**
 * GET /api/analytics/admin/users
 * Get user analytics (admin only)
 * Query params: startDate, endDate
 */
router.get(
  '/admin/users',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.moderate(),
  AnalyticsController.getUserAnalytics
);

/**
 * GET /api/analytics/admin/revenue
 * Get revenue analytics (admin only)
 * Query params: startDate, endDate, period
 */
router.get(
  '/admin/revenue',
  RolesGuard.requireRole('ADMIN'),
  RateLimitMiddleware.moderate(),
  AnalyticsController.getRevenueAnalytics
);

export default router;