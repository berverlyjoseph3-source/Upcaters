// enterprise-ai-agent-platform/apps/frontend/src/utils/analytics.utils.ts
import { format, subDays, subWeeks, subMonths, subYears, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface AggregatedData {
  date: string;
  value: number;
  category ? : string;
}

/**
 * Format number with K/M/B suffix
 */
export const formatMetricValue = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
};

/**
 * Format currency
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Get date range for a given period
 */
export const getDateRange = (period: 'day' | 'week' | 'month' | 'quarter' | 'year'): DateRange => {
  const end = new Date();
  let start: Date;
  let label: string;
  
  switch (period) {
    case 'day':
      start = subDays(end, 1);
      label = 'Last 24 hours';
      break;
    case 'week':
      start = subWeeks(end, 1);
      label = 'Last 7 days';
      break;
    case 'month':
      start = subMonths(end, 1);
      label = 'Last 30 days';
      break;
    case 'quarter':
      start = subMonths(end, 3);
      label = 'Last 90 days';
      break;
    case 'year':
      start = subYears(end, 1);
      label = 'Last 12 months';
      break;
    default:
      start = subMonths(end, 1);
      label = 'Last 30 days';
  }
  
  return { start, end, label };
};

/**
 * Get previous period date range for comparison
 */
export const getPreviousPeriodRange = (currentStart: Date, currentEnd: Date): DateRange => {
  const duration = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return {
    start: previousStart,
    end: previousEnd,
    label: 'Previous Period',
  };
};

/**
 * Calculate percentage change between two values
 */
export const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/**
 * Aggregate daily data into weekly or monthly
 */
export const aggregateData = (
  data: Array < { date: string;value: number } > ,
  granularity: 'day' | 'week' | 'month'
): Array < { date: string;value: number } > => {
  if (granularity === 'day') return data;
  
  const aggregated: Map < string, { sum: number;count: number } > = new Map();
  
  data.forEach(item => {
    let groupKey: string;
    const date = new Date(item.date);
    
    if (granularity === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      groupKey = format(weekStart, 'yyyy-MM-dd');
    } else {
      groupKey = format(date, 'yyyy-MM');
    }
    
    const existing = aggregated.get(groupKey);
    if (existing) {
      existing.sum += item.value;
      existing.count++;
    } else {
      aggregated.set(groupKey, { sum: item.value, count: 1 });
    }
  });
  
  const result: Array < { date: string;value: number } > = [];
  for (const [date, { sum, count }] of aggregated) {
    result.push({ date, value: granularity === 'week' ? sum : sum / count });
  }
  
  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Calculate moving average for smoothing
 */
export const calculateMovingAverage = (
  data: Array < { date: string;value: number } > ,
  windowSize: number = 7
): Array < { date: string;value: number;movingAverage: number } > => {
  return data.map((item, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const window = data.slice(start, index + 1);
    const avg = window.reduce((sum, w) => sum + w.value, 0) / window.length;
    return { ...item, movingAverage: avg };
  });
};

/**
 * Detect outliers in dataset
 */
export const detectOutliers = (values: number[]): number[] => {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  return values.filter(v => v < lowerBound || v > upperBound);
};

/**
 * Get chart colors based on category
 */
export const getChartColor = (index: number, category ? : string): string => {
  const colors = {
    ai_actions: '#3b82f6',
    api_calls: '#10b981',
    cost: '#8b5cf6',
    tokens: '#f59e0b',
    email: '#3b82f6',
    drive: '#10b981',
    content: '#8b5cf6',
    social: '#ec489a',
    calendar: '#f97316',
    web: '#06b6d4',
    task: '#6366f1',
  };
  
  if (category && colors[category as keyof typeof colors]) {
    return colors[category as keyof typeof colors];
  }
  
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16'];
  return defaultColors[index % defaultColors.length];
};

/**
 * Format tooltip value based on metric type
 */
export const formatTooltipValue = (value: number, metricType: string): string => {
  switch (metricType) {
    case 'cost':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value);
    case 'tokens':
      return `${formatMetricValue(value)} tokens`;
    default:
      return formatMetricValue(value);
  }
};

/**
 * Calculate forecast using simple linear regression
 */
export const calculateLinearForecast = (
  data: Array < { date: string;value: number } > ,
  daysToForecast: number = 30
): Array < { date: string;value: number;confidence: [number, number] } > => {
  if (data.length < 2) return [];
  
  const x = data.map((_, i) => i);
  const y = data.map(d => d.value);
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const lastDate = new Date(data[data.length - 1].date);
  const forecast: Array < { date: string;value: number;confidence: [number, number] } > = [];
  
  for (let i = 1; i <= daysToForecast; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(lastDate.getDate() + i);
    const predictedValue = intercept + slope * (n + i - 1);
    const confidenceMargin = Math.abs(predictedValue * 0.15);
    
    forecast.push({
      date: format(forecastDate, 'yyyy-MM-dd'),
      value: Math.max(0, predictedValue),
      confidence: [Math.max(0, predictedValue - confidenceMargin), predictedValue + confidenceMargin],
    });
  }
  
  return forecast;
};