// enterprise-ai-agent-platform/apps/frontend/src/utils/chart.utils.ts

/**
 * Generate a color from a string (for consistent categorical colors)
 */
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Get a predefined color palette
 */
export const getColorPalette = (index: number): string => {
  const palette = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec489a', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ];
  return palette[index % palette.length];
};

/**
 * Generate gradient colors for a gauge chart
 */
export const gaugeGradient = (value: number): string => {
  if (value < 30) return '#ef4444';
  if (value < 70) return '#f59e0b';
  return '#10b981';
};

/**
 * Format tooltip value with unit
 */
export const formatTooltipValue = (value: number, unit ? : string): string => {
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'USD') return `$${value.toLocaleString()}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

/**
 * Calculate moving average for smoothing data
 */
export const movingAverage = (data: number[], windowSize: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(avg);
  }
  return result;
};

/**
 * Detect outliers in dataset (using IQR)
 */
export const detectOutliers = (data: number[]): number[] => {
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  return data.filter(v => v < lowerBound || v > upperBound);
};