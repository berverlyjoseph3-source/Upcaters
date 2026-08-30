"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const logger_1 = require("../utils/logger");
/**
 * Parse optional startDate/endDate query params into concrete Dates.
 * All AnalyticsService methods require non-optional Date arguments, so
 * default to the last 30 days when the caller doesn't specify a range.
 */
function parseDateRange(startDate, endDate) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end };
}
class AnalyticsController {
    /**
     * GET /api/analytics
     * Get complete analytics data
     */
    static async getAnalytics(req, res) {
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
            const analytics = await analytics_service_1.AnalyticsService.getAnalytics(req.user.id, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, agentType, actionType, comparison);
            res.json({
                success: true,
                data: analytics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get analytics');
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
    static async getUsageSummary(req, res) {
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
            const summary = await analytics_service_1.AnalyticsService.getUsageSummary(req.user.id, dateRange.startDate, dateRange.endDate, comparison);
            res.json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get usage summary');
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
    static async getDailyUsage(req, res) {
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
            const dailyUsage = await analytics_service_1.AnalyticsService.getDailyUsage(req.user.id, dateRange.startDate, dateRange.endDate);
            res.json({
                success: true,
                data: dailyUsage,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get daily usage');
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
    static async getUsageByAgent(req, res) {
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
            const byAgent = await analytics_service_1.AnalyticsService.getUsageByAgent(req.user.id, dateRange.startDate, dateRange.endDate);
            res.json({
                success: true,
                data: byAgent,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get usage by agent');
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
    static async getUsageByAction(req, res) {
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
            const byAction = await analytics_service_1.AnalyticsService.getUsageByAction(req.user.id, dateRange.startDate, dateRange.endDate);
            res.json({
                success: true,
                data: byAction,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get usage by action');
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
    static async getCostBreakdown(req, res) {
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
            const costBreakdown = await analytics_service_1.AnalyticsService.getCostBreakdown(req.user.id, dateRange.startDate, dateRange.endDate);
            res.json({
                success: true,
                data: costBreakdown,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get cost breakdown');
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
    static async getForecast(req, res) {
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
            const forecast = await analytics_service_1.AnalyticsService.getForecast(req.user.id, dateRange.startDate, dateRange.endDate, days ? parseInt(days) : 30);
            res.json({
                success: true,
                data: forecast,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get forecast');
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
    static async getTopActions(req, res) {
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
            const topActions = await analytics_service_1.AnalyticsService.getTopActions(req.user.id, dateRange.startDate, dateRange.endDate, limit ? parseInt(limit) : 10);
            res.json({
                success: true,
                data: topActions,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to get top actions');
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
    static async exportAnalytics(req, res) {
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
            const result = await analytics_service_1.AnalyticsService.exportAnalytics(req.user.id, format, dateRange?.start ? new Date(dateRange.start) : undefined, dateRange?.end ? new Date(dateRange.end) : undefined, includeCharts, metrics);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to export analytics');
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
    static async downloadExport(req, res) {
        try {
            const { fileId } = req.params;
            // This would retrieve the file from storage
            // For now, return error
            res.status(404).json({
                success: false,
                error: 'File not found',
                code: 'NOT_FOUND',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to download export');
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
    static async getPlatformAnalytics(req, res) {
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
            const analytics = await analytics_service_1.AnalyticsService.getPlatformAnalytics(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json({
                success: true,
                data: analytics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get platform analytics');
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
    static async getUserAnalytics(req, res) {
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
            const analytics = await analytics_service_1.AnalyticsService.getUserAnalytics(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json({
                success: true,
                data: analytics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get user analytics');
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
    static async getRevenueAnalytics(req, res) {
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
            const analytics = await analytics_service_1.AnalyticsService.getRevenueAnalytics(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, period);
            res.json({
                success: true,
                data: analytics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get revenue analytics');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve revenue analytics',
                code: 'ANALYTICS_ERROR',
            });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=analytics.controller.js.map