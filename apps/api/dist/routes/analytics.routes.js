"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/analytics.routes.ts
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const rate_limit_middleware_1 = require("../auth/middleware/rate-limit.middleware");
const plan_gate_middleware_1 = require("../middleware/plan-gate.middleware");
const router = (0, express_1.Router)();
// Apply authentication to all analytics routes
router.use(jwt_auth_guard_1.JwtAuthGuard.protect);
router.use((0, plan_gate_middleware_1.addUsageHeaders)());
// ============================================
// Core Analytics Routes
// ============================================
/**
 * GET /api/analytics
 * Get complete analytics data for current user
 * Query params: startDate, endDate, agentType, actionType, comparison
 */
router.get('/', rate_limit_middleware_1.RateLimitMiddleware.moderate(), analytics_controller_1.AnalyticsController.getAnalytics);
/**
 * GET /api/analytics/summary
 * Get usage summary for current user
 * Query params: startDate, endDate, comparison
 */
router.get('/summary', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.getUsageSummary);
/**
 * GET /api/analytics/daily
 * Get daily usage data for charts
 * Query params: startDate, endDate
 */
router.get('/daily', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.getDailyUsage);
/**
 * GET /api/analytics/by-agent
 * Get usage breakdown by agent
 * Query params: startDate, endDate
 */
router.get('/by-agent', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.getUsageByAgent);
/**
 * GET /api/analytics/by-action
 * Get usage breakdown by action type
 * Query params: startDate, endDate
 */
router.get('/by-action', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.getUsageByAction);
/**
 * GET /api/analytics/cost
 * Get cost breakdown
 * Query params: startDate, endDate
 */
router.get('/cost', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.getCostBreakdown);
/**
 * GET /api/analytics/forecast
 * Get usage forecast
 * Query params: startDate, endDate, days
 */
router.get('/forecast', rate_limit_middleware_1.RateLimitMiddleware.moderate(), analytics_controller_1.AnalyticsController.getForecast);
/**
 * GET /api/analytics/top-actions
 * Get top actions by usage
 * Query params: startDate, endDate, limit
 */
router.get('/top-actions', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.getTopActions);
// ============================================
// Export Routes
// ============================================
/**
 * POST /api/analytics/export
 * Export analytics data in CSV, JSON, or PDF format
 * Body: { format, dateRange, includeCharts, metrics }
 */
router.post('/export', rate_limit_middleware_1.RateLimitMiddleware.moderate(), analytics_controller_1.AnalyticsController.exportAnalytics);
/**
 * GET /api/analytics/export/download/:fileId
 * Download exported file
 */
router.get('/export/download/:fileId', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), analytics_controller_1.AnalyticsController.downloadExport);
// ============================================
// Admin Analytics Routes
// ============================================
/**
 * GET /api/analytics/admin/platform
 * Get platform-wide analytics (admin only)
 * Query params: startDate, endDate
 */
router.get('/admin/platform', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), analytics_controller_1.AnalyticsController.getPlatformAnalytics);
/**
 * GET /api/analytics/admin/users
 * Get user analytics (admin only)
 * Query params: startDate, endDate
 */
router.get('/admin/users', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), analytics_controller_1.AnalyticsController.getUserAnalytics);
/**
 * GET /api/analytics/admin/revenue
 * Get revenue analytics (admin only)
 * Query params: startDate, endDate, period
 */
router.get('/admin/revenue', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), analytics_controller_1.AnalyticsController.getRevenueAnalytics);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map