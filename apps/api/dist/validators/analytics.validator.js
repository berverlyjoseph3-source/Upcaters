"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopActionsQuerySchema = exports.RevenueAnalyticsQuerySchema = exports.ForecastQuerySchema = exports.ExportAnalyticsSchema = exports.DailyUsageQuerySchema = exports.AnalyticsQuerySchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/validators/analytics.validator.ts
const zod_1 = require("zod");
/**
 * Analytics query parameters validator
 */
exports.AnalyticsQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    agentType: zod_1.z.enum(['email', 'drive', 'content', 'social', 'calendar', 'web', 'task', 'orchestrator']).optional(),
    actionType: zod_1.z.string().optional(),
    comparison: zod_1.z.enum(['previous', 'year_over_year']).optional(),
});
/**
 * Daily usage query validator
 */
exports.DailyUsageQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
/**
 * Export analytics request validator
 */
exports.ExportAnalyticsSchema = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'json', 'pdf']),
    dateRange: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }).optional(),
    includeCharts: zod_1.z.boolean().optional(),
    metrics: zod_1.z.array(zod_1.z.enum(['ai_actions', 'api_calls', 'cost', 'tokens'])).optional(),
});
/**
 * Forecast query validator
 */
exports.ForecastQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    days: zod_1.z.number().int().min(1).max(90).optional(),
});
/**
 * Revenue analytics query validator
 */
exports.RevenueAnalyticsQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    period: zod_1.z.enum(['day', 'week', 'month', 'year']).optional(),
});
/**
 * Top actions query validator
 */
exports.TopActionsQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.number().int().min(1).max(100).optional(),
});
//# sourceMappingURL=analytics.validator.js.map