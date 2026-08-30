"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/usage.routes.ts
const express_1 = require("express");
const usage_controller_1 = require("../controllers/usage.controller");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const plan_gate_middleware_1 = require("../middleware/plan-gate.middleware");
const rate_limit_middleware_1 = require("../auth/middleware/rate-limit.middleware");
const router = (0, express_1.Router)();
// Apply authentication and usage headers to all routes in this router
router.use(jwt_auth_guard_1.JwtAuthGuard.protect);
router.use((0, plan_gate_middleware_1.addUsageHeaders)());
router.use((0, plan_gate_middleware_1.warnAtUsageThreshold)(80));
// ============================================
// Usage Statistics Routes
// ============================================
/**
 * GET /api/usage/stats
 * Get current usage statistics for authenticated user
 */
router.get('/stats', rate_limit_middleware_1.RateLimitMiddleware.moderate(), usage_controller_1.UsageController.getUsageStats);
/**
 * GET /api/usage/limits
 * Get plan limits for authenticated user
 */
router.get('/limits', rate_limit_middleware_1.RateLimitMiddleware.moderate(), usage_controller_1.UsageController.getPlanLimits);
/**
 * GET /api/usage/history
 * Get historical usage data for charts
 * Query params: ?months=6 (default)
 */
router.get('/history', rate_limit_middleware_1.RateLimitMiddleware.moderate(), usage_controller_1.UsageController.getUsageHistory);
/**
 * GET /api/usage/percentage
 * Get usage percentage for dashboard progress bars
 */
router.get('/percentage', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), usage_controller_1.UsageController.getUsagePercentage);
/**
 * GET /api/usage/actions
 * Get all available action types with their costs
 */
router.get('/actions', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), usage_controller_1.UsageController.getActionCosts);
// ============================================
// Feature & Limit Check Routes
// ============================================
/**
 * GET /api/usage/check-feature/:feature
 * Check if user has access to a specific feature
 */
router.get('/check-feature/:feature', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), usage_controller_1.UsageController.checkFeatureAccess);
/**
 * GET /api/usage/check-limit/:category
 * Check if user has reached usage limit for a category
 * Categories: ai_action, api_call
 */
router.get('/check-limit/:category', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), usage_controller_1.UsageController.checkUsageLimit);
// ============================================
// Export Routes
// ============================================
/**
 * GET /api/usage/export
 * Export usage data as CSV
 */
router.get('/export', rate_limit_middleware_1.RateLimitMiddleware.moderate(), usage_controller_1.UsageController.exportUsageCSV);
// ============================================
// Admin Only Routes
// ============================================
/**
 * POST /api/usage/sync
 * Force sync usage from Redis to PostgreSQL (admin only)
 */
router.post('/sync', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), usage_controller_1.UsageController.syncUsageToDatabase);
/**
 * POST /api/usage/reset
 * Reset usage counters for a user (admin only)
 * Body: { userId: string }
 */
router.post('/reset', roles_guard_1.RolesGuard.requireRole('ADMIN'), rate_limit_middleware_1.RateLimitMiddleware.strict(), usage_controller_1.UsageController.resetUserUsage);
exports.default = router;
//# sourceMappingURL=usage.routes.js.map