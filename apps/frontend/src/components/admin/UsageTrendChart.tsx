// enterprise-ai-agent-platform/apps/frontend/src/components/admin/UsageTrendChart.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Activity, Zap, Download,
  RefreshCw, Calendar, Filter, ChevronDown, Maximize2,
  Minimize2, BarChart3, LineChart, ArrowUpRight,
  ArrowDownRight, Target, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { formatCompactNumber, formatCurrency, formatDate } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
export type ChartType = 'line' | 'area' | 'bar';
export type MetricType = 'executions' | 'tokens' | 'cost' | 'users';
export type Granularity = 'hour' | 'day' | 'week' | 'month';

export interface UsageDataPoint {
  timestamp: Date | string;
  value: number;
  label: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface UsageTrendSeries {
  id: string;
  name: string;
  color: string;
  data: UsageDataPoint[];
  visible: boolean;
  type?: 'solid' | 'dashed' | 'dotted';
  yAxis?: 'left' | 'right';
}

export interface UsageThreshold {
  value: number;
  label: string;
  color: string;
  type: 'warning' | 'critical' | 'info';
  dashed?: boolean;
}

export interface UsageForecast {
  data: UsageDataPoint[];
  confidence: number; // 0-1
  method: string;
}

export interface UsageTrendChartProps {
  title?: string;
  description?: string;
  series: UsageTrendSeries[];
  thresholds?: UsageThreshold[];
  forecast?: UsageForecast | null;
  isLoading?: boolean;
  error?: string | null;
  timeRange?: TimeRange;
  chartType?: ChartType;
  metricType?: MetricType;
  granularity?: Granularity;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showForecast?: boolean;
  showThresholds?: boolean;
  animate?: boolean;
  height?: number;
  onTimeRangeChange?: (range: TimeRange) => void;
  onChartTypeChange?: (type: ChartType) => void;
  onMetricTypeChange?: (type: MetricType) => void;
  onSeriesToggle?: (seriesId: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onDataPointClick?: (point: UsageDataPoint, series: UsageTrendSeries) => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'line', label: 'Line', icon: <LineChart className="h-3.5 w-3.5" /> },
  { value: 'area', label: 'Area', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: 'bar', label: 'Bar', icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

const METRIC_TYPES: { value: MetricType; label: string; icon: React.ReactNode }[] = [
  { value: 'executions', label: 'Executions', icon: <Activity className="h-3.5 w-3.5" /> },
  { value: 'tokens', label: 'Tokens', icon: <Zap className="h-3.5 w-3.5" /> },
  { value: 'cost', label: 'Cost', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: 'users', label: 'Users', icon: <Target className="h-3.5 w-3.5" /> },
];

// ============================================
// Tooltip Types
// ============================================

interface TooltipState {
  x: number;
  y: number;
  visible: boolean;
  points: Array<{
    series: UsageTrendSeries;
    dataPoint: UsageDataPoint;
  }>;
  xValue: string;
}

// ============================================
// Component
// ============================================

export const UsageTrendChart: React.FC<UsageTrendChartProps> = ({
  title = 'Usage Trend',
  description,
  series = [],
  thresholds = [],
  forecast = null,
  isLoading = false,
  error = null,
  timeRange: initialTimeRange = '30d',
  chartType: initialChartType = 'area',
  metricType: initialMetricType = 'executions',
  granularity: initialGranularity = 'day',
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  showForecast = false,
  showThresholds = true,
  animate = true,
  height = 400,
  onTimeRangeChange,
  onChartTypeChange,
  onMetricTypeChange,
  onSeriesToggle,
  onRefresh,
  onExport,
  onDataPointClick,
  className = '',
}) => {
  // State
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [metricType, setMetricType] = useState<MetricType>(initialMetricType);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, visible: false, points: [], xValue: '' });
  const [animationProgress, setAnimationProgress] = useState(0);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.filter(s => s.visible !== false).map(s => s.id))
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  // Animation
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimationProgress(1), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimationProgress(1);
    }
  }, [animate, timeRange, chartType]);

  // Filter visible series
  const visibleSeriesData = useMemo(() => {
    return series.filter(s => visibleSeries.has(s.id));
  }, [series, visibleSeries]);

  // Calculate data bounds
  const dataBounds = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    let allPoints: UsageDataPoint[] = [];

    visibleSeriesData.forEach(s => {
      s.data.forEach(point => {
        if (point.value < minVal) minVal = point.value;
        if (point.value > maxVal) maxVal = point.value;
      });
      allPoints = [...allPoints, ...s.data];
    });

    // Include forecast data if visible
    if (showForecast && forecast) {
      forecast.data.forEach(point => {
        if (point.value < minVal) minVal = point.value;
        if (point.value > maxVal) maxVal = point.value;
      });
    }

    // Include thresholds
    thresholds.forEach(t => {
      if (t.value < minVal) minVal = t.value;
      if (t.value > maxVal) maxVal = t.value;
    });

    // Add padding
    const padding = (maxVal - minVal) * 0.1 || maxVal * 0.1 || 10;
    return {
      min: Math.max(0, minVal - padding),
      max: maxVal + padding,
      points: allPoints,
    };
  }, [visibleSeriesData, showForecast, forecast, thresholds]);

  // Generate x-axis labels
  const xLabels = useMemo(() => {
    if (visibleSeriesData.length === 0 && (!forecast || forecast.data.length === 0)) return [];
    
    const allData = visibleSeriesData.length > 0 
      ? visibleSeriesData[0].data 
      : forecast?.data || [];
    
    const maxLabels = 10;
    const step = Math.max(1, Math.floor(allData.length / maxLabels));
    
    return allData.filter((_, i) => i % step === 0).map(d => ({
      label: d.label,
      index: allData.indexOf(d),
    }));
  }, [visibleSeriesData, forecast]);

  // Summary statistics
  const summary = useMemo(() => {
    if (visibleSeriesData.length === 0) return null;

    const allValues = visibleSeriesData.flatMap(s => s.data.map(d => d.value));
    const total = allValues.reduce((sum, v) => sum + v, 0);
    const average = allValues.length > 0 ? total / allValues.length : 0;
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    
    // Calculate trend (simple linear regression on last 10 points)
    const lastPoints = allValues.slice(-10);
    const trend = lastPoints.length >= 2 
      ? (lastPoints[lastPoints.length - 1] - lastPoints[0]) / lastPoints[0] * 100 
      : 0;

    return { total, average, max, min, trend, pointCount: allValues.length };
  }, [visibleSeriesData]);

  // ============================================
  // Handlers
  // ============================================

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
    setAnimationProgress(0);
    setTimeout(() => setAnimationProgress(1), 50);
  };

  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    onChartTypeChange?.(type);
  };

  const handleMetricTypeChange = (type: MetricType) => {
    setMetricType(type);
    onMetricTypeChange?.(type);
    setAnimationProgress(0);
    setTimeout(() => setAnimationProgress(1), 50);
  };

  const handleSeriesToggle = (seriesId: string) => {
    const newSet = new Set(visibleSeries);
    if (newSet.has(seriesId)) {
      newSet.delete(seriesId);
    } else {
      newSet.add(seriesId);
    }
    setVisibleSeries(newSet);
    onSeriesToggle?.(seriesId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!showTooltip || !chartRef.current) return;

    const svgRect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    // Calculate chart area
    const padding = { top: 30, right: 40, bottom: 50, left: 70 };
    const plotWidth = svgRect.width - padding.left - padding.right;

    // Find closest data point
    if (visibleSeriesData.length > 0) {
      const dataLength = visibleSeriesData[0].data.length;
      const dataIndex = Math.round(((x - padding.left) / plotWidth) * (dataLength - 1));
      const clampedIndex = Math.max(0, Math.min(dataLength - 1, dataIndex));

      const points = visibleSeriesData.map(s => ({
        series: s,
        dataPoint: s.data[clampedIndex],
      }));

      const xValue = visibleSeriesData[0].data[clampedIndex]?.label || '';

      setTooltip({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        points,
        xValue,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const getMetricFormat = (value: number): string => {
    switch (metricType) {
      case 'executions': return formatCompactNumber(value);
      case 'tokens': return formatCompactNumber(value);
      case 'cost': return formatCurrency(value);
      case 'users': return formatCompactNumber(value);
      default: return formatCompactNumber(value);
    }
  };

  // ============================================
  // SVG Chart Rendering
  // ============================================

  const renderChart = () => {
    if (visibleSeriesData.length === 0 && (!forecast || forecast.data.length === 0)) {
      return (
        <div className="flex items-center justify-center h-full text-secondary-400">
          <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      );
    }

    const chartWidth = 900;
    const chartHeight = height;
    const padding = { top: 30, right: 60, bottom: 60, left: 80 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    const { min, max, points } = dataBounds;
    const dataLength = visibleSeriesData.length > 0 ? visibleSeriesData[0].data.length : (forecast?.data.length || 0);
    const range = max - min || 1;

    // Scale functions
    const xScale = (index: number) => padding.left + (index / Math.max(1, dataLength - 1)) * plotWidth;
    const yScale = (value: number) => padding.top + plotHeight - ((value - min) / range) * plotHeight;

    // Generate path for a series
    const generateLinePath = (data: UsageDataPoint[], color: string, dashed: boolean = false): string => {
      return data.map((point, i) => {
        const x = xScale(i);
        const y = yScale(point.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    // Generate area path
    const generateAreaPath = (data: UsageDataPoint[]): string => {
      const linePath = generateLinePath(data, '');
      return `${linePath} L ${xScale(data.length - 1)} ${yScale(min)} L ${xScale(0)} ${yScale(min)} Z`;
    };

    // Generate bar positions
    const barWidth = Math.min(30, (plotWidth / dataLength) - 4);
    const barGap = 2;

    return (
      <svg
        ref={chartRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Definitions */}
        <defs>
          {visibleSeriesData.map((s, i) => (
            <linearGradient key={s.id} id={`areaGradient-${s.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
          {forecast && (
            <linearGradient id="forecastGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
          )}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid Lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = yScale(min + range * pct);
          const value = min + range * pct;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-secondary-400"
              >
                {getMetricFormat(value)}
              </text>
            </g>
          );
        })}

        {/* Threshold Lines */}
        {showThresholds && thresholds.map(threshold => {
          const y = yScale(threshold.value);
          return (
            <g key={threshold.label}>
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                stroke={threshold.color}
                strokeWidth="1.5"
                strokeDasharray={threshold.dashed ? "6 4" : "none"}
                opacity="0.7"
              />
              <text
                x={chartWidth - padding.right - 5}
                y={y - 8}
                textAnchor="end"
                className="text-xs font-medium"
                fill={threshold.color}
              >
                {threshold.label} ({getMetricFormat(threshold.value)})
              </text>
              <rect
                x={chartWidth - padding.right - 5}
                y={y - 2}
                width="6"
                height="6"
                rx="3"
                fill={threshold.color}
              />
            </g>
          );
        })}

        {/* Chart Content */}
        {chartType === 'bar' ? (
          // Bar Chart
          visibleSeriesData.map((s, seriesIdx) => {
            const totalSeries = visibleSeriesData.length;
            const seriesBarWidth = (barWidth - (totalSeries - 1) * barGap) / totalSeries;
            
            return s.data.map((point, i) => {
              const x = xScale(i) - (barWidth / 2) + seriesIdx * (seriesBarWidth + barGap);
              const barHeight = ((point.value - min) / range) * plotHeight * animationProgress;
              const y = padding.top + plotHeight - barHeight;

              return (
                <g key={`${s.id}-${i}`}>
                  <rect
                    x={x}
                    y={y}
                    width={seriesBarWidth}
                    height={barHeight}
                    fill={s.color}
                    rx={2}
                    opacity={0.85}
                    className="cursor-pointer transition-all duration-200 hover:opacity-100"
                    onClick={() => onDataPointClick?.(point, s)}
                  />
                  {barHeight > 15 && (
                    <text
                      x={x + seriesBarWidth / 2}
                      y={y + barHeight / 2 + 4}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white"
                      style={{ fontSize: '8px' }}
                    >
                      {point.value > 0 ? formatCompactNumber(point.value) : ''}
                    </text>
                  )}
                </g>
              );
            });
          })
        ) : chartType === 'area' ? (
          // Area Chart
          <>
            {visibleSeriesData.map(s => (
              <path
                key={`area-${s.id}`}
                d={generateAreaPath(s.data)}
                fill={`url(#areaGradient-${s.id})`}
                opacity={0.6}
              />
            ))}
            {/* Forecast area */}
            {showForecast && forecast && (
              <path
                d={generateAreaPath(forecast.data)}
                fill="url(#forecastGradient)"
                opacity={0.4}
                className="transition-all duration-500"
              />
            )}
          </>
        ) : null}

        {/* Lines (for line and area charts) */}
        {chartType !== 'bar' && (
          <>
            {visibleSeriesData.map(s => (
              <path
                key={`line-${s.id}`}
                d={generateLinePath(s.data, s.color)}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={animationProgress}
                className="transition-all duration-500"
                filter="url(#glow)"
              />
            ))}

            {/* Forecast line */}
            {showForecast && forecast && (
              <>
                <path
                  d={generateLinePath(forecast.data, '#f59e0b')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  opacity={animationProgress}
                />
                {/* Forecast confidence band */}
                <path
                  d={`
                    ${generateLinePath(forecast.data.map(d => ({ ...d, value: d.value * (1 + 0.15) })), '')}
                    L ${xScale(forecast.data.length - 1)} ${yScale(min)}
                    L ${xScale(0)} ${yScale(min)} Z
                  `}
                  fill="#f59e0b"
                  opacity="0.08"
                />
                <path
                  d={`
                    ${generateLinePath(forecast.data.map(d => ({ ...d, value: d.value * (1 - 0.15) })), '')}
                    L ${xScale(forecast.data.length - 1)} ${yScale(min)}
                    L ${xScale(0)} ${yScale(min)} Z
                  `}
                  fill="#f59e0b"
                  opacity="0.08"
                />
              </>
            )}
          </>
        )}

        {/* Data Points */}
        {chartType !== 'bar' && visibleSeriesData.map(s =>
          s.data.map((point, i) => {
            const x = xScale(i);
            const y = yScale(point.value);
            return (
              <circle
                key={`point-${s.id}-${i}`}
                cx={x}
                cy={y}
                r="4"
                fill="white"
                stroke={s.color}
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200 hover:r-6"
                onClick={() => onDataPointClick?.(point, s)}
              />
            );
          })
        )}

        {/* X-Axis Labels */}
        {xLabels.map(({ label, index }) => {
          const x = xScale(index);
          return (
            <g key={index}>
              <line
                x1={x}
                x2={x}
                y1={padding.top + plotHeight}
                y2={padding.top + plotHeight + 5}
                stroke="#cbd5e1"
              />
              <text
                x={x}
                y={chartHeight - 30}
                textAnchor="middle"
                className="text-xs fill-secondary-500"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* X-Axis Line */}
        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={padding.top + plotHeight}
          y2={padding.top + plotHeight}
          stroke="#e2e8f0"
          strokeWidth="1"
        />

        {/* Y-Axis Line */}
        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={padding.top + plotHeight}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      </svg>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 ${className}`}>
        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-5 w-32 bg-secondary-200 rounded"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 w-20 bg-secondary-200 rounded"></div>
              ))}
            </div>
            <div className="h-80 bg-secondary-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center ${className}`}>
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load trend data</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col' : ''
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              {title}
            </h3>
            {description && (
              <p className="text-xs text-secondary-500 mt-0.5">{description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Time Range */}
            <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
              {TIME_RANGES.map(tr => (
                <button
                  key={tr.value}
                  onClick={() => handleTimeRangeChange(tr.value)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                    timeRange === tr.value ? 'bg-white dark:bg-secondary-600 shadow-sm font-medium' : 'hover:text-secondary-900'
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>

            {/* Chart Type */}
            <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => handleChartTypeChange(ct.value)}
                  className={`p-1.5 rounded-md transition-colors ${chartType === ct.value ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
                  title={ct.label}
                >
                  {ct.icon}
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>

            {/* Actions */}
            {onExport && (
              <button onClick={onExport} className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700" title="Export">
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700" title="Refresh">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Metric Type Selector */}
        <div className="flex gap-2 mt-3">
          {METRIC_TYPES.map(mt => (
            <button
              key={mt.value}
              onClick={() => handleMetricTypeChange(mt.value)}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors ${
                metricType === mt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 hover:bg-secondary-200 dark:hover:bg-secondary-600'
              }`}
            >
              {mt.icon}
              {mt.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setShowForecast(!showForecast)}
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${
              showForecast ? 'bg-yellow-600 text-white' : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600'
            }`}
            title={showForecast ? 'Hide Forecast' : 'Show Forecast'}
          >
            {showForecast ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            Forecast
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative flex-1">
        {/* Summary Stats */}
        {summary && (
          <div className="absolute top-2 left-4 z-10 flex gap-3">
            <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-secondary-200 dark:border-secondary-700">
              <p className="text-xs text-secondary-500">Total</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white">{getMetricFormat(summary.total)}</p>
            </div>
            <div className="bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-secondary-200 dark:border-secondary-700">
              <p className="text-xs text-secondary-500">Average</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white">{getMetricFormat(summary.average)}</p>
            </div>
            <div className={`bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border ${summary.trend >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <p className="text-xs text-secondary-500">Trend</p>
              <p className={`text-sm font-bold flex items-center gap-1 ${summary.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(summary.trend).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* SVG Chart */}
        <div className={`p-4 ${isFullscreen ? 'flex-1' : ''}`}>
          {renderChart()}
        </div>

        {/* Legend */}
        {showLegend && series.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 px-4 pb-4">
            {series.map(s => (
              <button
                key={s.id}
                onClick={() => handleSeriesToggle(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  visibleSeries.has(s.id)
                    ? 'bg-secondary-100 dark:bg-secondary-700'
                    : 'opacity-50 hover:opacity-75'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-secondary-700 dark:text-secondary-300">{s.name}</span>
                {!visibleSeries.has(s.id) && <EyeOff className="h-3 w-3 text-secondary-400" />}
              </button>
            ))}
            {showForecast && forecast && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <div className="w-3 h-0.5 bg-yellow-500" style={{ borderTop: '2px dashed #f59e0b' }} />
                <span className="text-secondary-500">Forecast ({Math.round(forecast.confidence * 100)}% confidence)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forecast Info Bar */}
      {showForecast && forecast && (
        <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 bg-yellow-50 dark:bg-yellow-900/10 flex items-center justify-between text-xs">
          <span className="text-yellow-700 dark:text-yellow-400">
            {forecast.method} forecast • {forecast.data.length} periods ahead
          </span>
          <span className="text-yellow-600 dark:text-yellow-500">
            Confidence: {Math.round(forecast.confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};


export default UsageTrendChart;
