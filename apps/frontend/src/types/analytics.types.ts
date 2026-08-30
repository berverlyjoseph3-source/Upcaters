// enterprise-ai-agent-platform/apps/frontend/src/types/analytics.types.ts

export type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type MetricType = 'ai_actions' | 'api_calls' | 'cost' | 'tokens';
export type ChartType = 'line' | 'bar' | 'area' | 'pie';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface FilterOptions {
  dateRange: DateRange;
  agentTypes ? : string[];
  actionTypes ? : string[];
  comparisonPeriod ? : 'previous' | 'year_over_year';
}

export interface MetricSummary {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface UsageSummary {
  aiActions: MetricSummary;
  apiCalls: MetricSummary;
  totalCost: MetricSummary;
  totalTokens: MetricSummary;
  activeDays: number;
  averageDailyUsage: number;
}

export interface DailyUsage {
  date: string;
  aiActions: number;
  apiCalls: number;
  cost: number;
  tokens: number;
}

export interface UsageByAgent {
  agentType: string;
  count: number;
  cost: number;
  percentage: number;
}

export interface UsageByAction {
  actionType: string;
  count: number;
  cost: number;
  category: 'ai_action' | 'api_call';
}

export interface CostBreakdown {
  byAgent: UsageByAgent[];
  byAction: UsageByAction[];
  totalCost: number;
}

export interface ForecastData {
  date: string;
  actual: number | null;
  forecast: number;
  lowerBound: number;
  upperBound: number;
}

export interface AnalyticsData {
  summary: UsageSummary;
  dailyUsage: DailyUsage[];
  byAgent: UsageByAgent[];
  byAction: UsageByAction[];
  costBreakdown: CostBreakdown;
  forecast: ForecastData[];
  topActions: UsageByAction[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: DateRange;
  includeCharts ? : boolean;
  metrics ? : MetricType[];
}

export interface ExportResult {
  success: boolean;
  url ? : string;
  error ? : string;
}