// enterprise-ai-agent-platform/apps/api/src/validators/analytics.validator.ts
import { z } from 'zod';

/**
 * Analytics query parameters validator
 */
export const AnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  agentType: z.enum(['email', 'drive', 'content', 'social', 'calendar', 'web', 'task', 'orchestrator']).optional(),
  actionType: z.string().optional(),
  comparison: z.enum(['previous', 'year_over_year']).optional(),
});

export type AnalyticsQueryInput = z.infer < typeof AnalyticsQuerySchema > ;

/**
 * Daily usage query validator
 */
export const DailyUsageQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DailyUsageQueryInput = z.infer < typeof DailyUsageQuerySchema > ;

/**
 * Export analytics request validator
 */
export const ExportAnalyticsSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  includeCharts: z.boolean().optional(),
  metrics: z.array(z.enum(['ai_actions', 'api_calls', 'cost', 'tokens'])).optional(),
});

export type ExportAnalyticsInput = z.infer < typeof ExportAnalyticsSchema > ;

/**
 * Forecast query validator
 */
export const ForecastQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  days: z.number().int().min(1).max(90).optional(),
});

export type ForecastQueryInput = z.infer < typeof ForecastQuerySchema > ;

/**
 * Revenue analytics query validator
 */
export const RevenueAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional(),
});

export type RevenueAnalyticsQueryInput = z.infer < typeof RevenueAnalyticsQuerySchema > ;

/**
 * Top actions query validator
 */
export const TopActionsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type TopActionsQueryInput = z.infer < typeof TopActionsQuerySchema > ;