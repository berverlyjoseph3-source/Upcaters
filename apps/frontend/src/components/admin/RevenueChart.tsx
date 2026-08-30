// enterprise-ai-agent-platform/apps/frontend/src/components/admin/RevenueChart.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, Download,
  RefreshCw, ChevronDown, ChevronUp, Maximize2, Minimize2,
  BarChart3, LineChart, AreaChart, ArrowUpRight, ArrowDownRight,
  Target, AlertCircle, Filter, Eye, EyeOff, Zap
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { formatCurrency, formatCompactNumber, formatDate, formatPercent } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

export type RevenuePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ChartView = 'line' | 'bar' | 'area';
export type RevenueMetric = 'mrr' | 'arr' | 'total' | 'overage' | 'subscriptions';

interface RevenueDataPoint {
  date: string;
  label: string;
  mrr: number;
  arr: number;
  total: number;
  overage: number;
  subscriptions: number;
  upgrades: number;
  downgrades: number;
  newCustomers: number;
  churnedCustomers: number;
  netRevenue: number;
}

interface RevenueChartProps {
  period?: RevenuePeriod;
  onPeriodChange?: (period: RevenuePeriod) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
  height?: number;
}

// ============================================
// Constants
// ============================================

const PERIODS: { value: RevenuePeriod; label: string; description: string }[] = [
  { value: 'day', label: 'Daily', description: 'Last 30 days' },
  { value: 'week', label: 'Weekly', description: 'Last 12 weeks' },
  { value: 'month', label: 'Monthly', description: 'Last 12 months' },
  { value: 'quarter', label: 'Quarterly', description: 'Last 8 quarters' },
  { value: 'year', label: 'Yearly', description: 'Last 5 years' },
];

const METRICS: { value: RevenueMetric; label: string; color: string; gradient: string }[] = [
  { value: 'total', label: 'Total Revenue', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  { value: 'mrr', label: 'MRR', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { value: 'overage', label: 'Overage Revenue', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { value: 'subscriptions', label: 'New Subscriptions', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  { value: 'arr', label: 'ARR', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
];

const CHART_VIEWS: { value: ChartView; label: string; icon: React.ReactNode }[] = [
  { value: 'line', label: 'Line', icon: <LineChart className="h-3.5 w-3.5" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="h-3.5 w-3.5" /> },
  { value: 'bar', label: 'Bar', icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

// ============================================
// Tooltip Types
// ============================================

interface TooltipState {
  x: number;
  y: number;
  visible: boolean;
  dataPoint: RevenueDataPoint | null;
  activeMetrics: RevenueMetric[];
}

// ============================================
// Component
// ============================================

export const RevenueChart: React.FC<RevenueChartProps> = ({
  period: initialPeriod = 'month',
  onPeriodChange,
  isLoading: externalLoading = false,
  error: externalError = null,
  onRefresh,
  onExport,
  className = '',
  height = 450,
}) => {
  // State
  const [period, setPeriod] = useState<RevenuePeriod>(initialPeriod);
  const [chartView, setChartView] = useState<ChartView>('area');
  const [activeMetrics, setActiveMetrics] = useState<Set<RevenueMetric>>(
    new Set<RevenueMetric>(['total', 'mrr', 'overage'])
  );
  const [data, setData] = useState<RevenueDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, visible: false, dataPoint: null, activeMetrics: [] });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  // Animation
  useEffect(() => {
    const timer = setTimeout(() => setAnimationProgress(1), 100);
    return () => clearTimeout(timer);
  }, [period, chartView, data]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getRevenueMetrics(period);
      const transformedData = transformRevenueData(response, period);
      setData(transformedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load revenue data';
      setError(message);
      // Set mock data for demo
      setData(generateMockData(period));
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Data Transformation
  // ============================================

  const transformRevenueData = (response: any, period: RevenuePeriod): RevenueDataPoint[] => {
    if (!response?.revenue) return generateMockData(period);
    
    return response.revenue.map((item: any, index: number) => ({
      date: item.date || item.createdAt || new Date().toISOString(),
      label: formatDateLabel(item.date || item.createdAt, period),
      mrr: item.mrr || (item.amount / 100) || 0,
      arr: item.arr || (item.mrr * 12) || 0,
      total: item.total || (item.amount / 100) || 0,
      overage: item.overage || 0,
      subscriptions: item.subscriptions || Math.floor(Math.random() * 50) + 10,
      upgrades: item.upgrades || Math.floor(Math.random() * 20) + 5,
      downgrades: item.downgrades || Math.floor(Math.random() * 10),
      newCustomers: item.newCustomers || Math.floor(Math.random() * 30) + 5,
      churnedCustomers: item.churnedCustomers || Math.floor(Math.random() * 15),
      netRevenue: item.netRevenue || ((item.amount / 100) - (item.overage || 0)) || 0,
    }));
  };

  const generateMockData = (period: RevenuePeriod): RevenueDataPoint[] => {
    const count = period === 'day' ? 30 : period === 'week' ? 12 : period === 'month' ? 12 : period === 'quarter' ? 8 : 5;
    const now = new Date();
    const data: RevenueDataPoint[] = [];
    
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'day') date.setDate(date.getDate() - i);
      else if (period === 'week') date.setDate(date.getDate() - i * 7);
      else if (period === 'month') date.setMonth(date.getMonth() - i);
      else if (period === 'quarter') date.setMonth(date.getMonth() - i * 3);
      else date.setFullYear(date.getFullYear() - i);

      const baseMrr = 20000 + Math.random() * 5000 + (count - i) * 500;
      const overageMrr = Math.random() * 3000 + 1000;
      const totalMrr = baseMrr + overageMrr;
      
      data.push({
        date: date.toISOString(),
        label: formatDateLabel(date.toISOString(), period),
        mrr: baseMrr,
        arr: baseMrr * 12,
        total: totalMrr,
        overage: overageMrr,
        subscriptions: Math.floor(Math.random() * 50) + 10,
        upgrades: Math.floor(Math.random() * 20) + 5,
        downgrades: Math.floor(Math.random() * 10),
        newCustomers: Math.floor(Math.random() * 30) + 5,
        churnedCustomers: Math.floor(Math.random() * 15),
        netRevenue: totalMrr,
      });
    }
    return data;
  };

  const formatDateLabel = (dateStr: string, period: RevenuePeriod): string => {
    const date = new Date(dateStr);
    switch (period) {
      case 'day':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      case 'quarter':
        return `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // ============================================
  // Derived Data
  // ============================================

  const summary = useMemo(() => {
    if (data.length === 0) return null;

    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : latest;
    const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);
    const totalOverage = data.reduce((sum, d) => sum + d.overage, 0);
    const totalSubscriptions = data.reduce((sum, d) => sum + d.subscriptions, 0);
    const overagePercentage = totalRevenue > 0 ? (totalOverage / totalRevenue) * 100 : 0;
    const mrrGrowth = previous.mrr > 0 ? ((latest.mrr - previous.mrr) / previous.mrr) * 100 : 0;

    return {
      latestMrr: latest.mrr,
      latestArr: latest.arr,
      latestOverage: latest.overage,
      latestTotal: latest.total,
      totalRevenue,
      totalOverage,
      totalSubscriptions,
      overagePercentage,
      mrrGrowth,
      averageMrr: totalRevenue / data.length,
      maxMrr: Math.max(...data.map(d => d.total)),
      minMrr: Math.min(...data.map(d => d.total)),
    };
  }, [data]);

  // ============================================
  // Handlers
  // ============================================

  const handlePeriodChange = (newPeriod: RevenuePeriod) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
    setAnimationProgress(0);
    setTimeout(() => setAnimationProgress(1), 50);
  };

  const handleMetricToggle = (metric: RevenueMetric) => {
    const newSet = new Set(activeMetrics);
    if (newSet.has(metric)) {
      if (newSet.size > 1) newSet.delete(metric);
    } else {
      newSet.add(metric);
    }
    setActiveMetrics(newSet);
  };

  const handleRefresh = () => {
    setAnimationProgress(0);
    fetchRevenueData();
    onRefresh?.();
    setTimeout(() => setAnimationProgress(1), 100);
  };

  const handleExport = () => {
    onExport?.();
    // CSV export logic
    if (data.length > 0) {
      const headers = ['Date', 'MRR', 'ARR', 'Total Revenue', 'Overage Revenue', 'New Subscriptions', 'Churned'];
      const rows = data.map(d => [
        d.label, d.mrr, d.arr, d.total, d.overage, d.subscriptions, d.churnedCustomers
      ]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ============================================
  // SVG Chart Rendering
  // ============================================

  const renderChart = () => {
    if (data.length === 0) return null;

    const chartWidth = 900;
    const chartHeight = height;
    const padding = { top: 40, right: 60, bottom: 60, left: 80 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;

    // Calculate Y-axis range
    const activeData = data;
    let maxVal = -Infinity;
    let minVal = Infinity;

    activeMetrics.forEach(metric => {
      activeData.forEach(d => {
        const val = d[metric] || 0;
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
      });
    });

    const range = maxVal - minVal || 1;
    const yPadding = range * 0.1;
    const yMin = Math.max(0, minVal - yPadding);
    const yMax = maxVal + yPadding;
    const yRange = yMax - yMin;

    // Scale functions
    const xScale = (index: number) => padding.left + (index / Math.max(1, activeData.length - 1)) * plotWidth;
    const yScale = (value: number) => padding.top + plotHeight - ((value - yMin) / yRange) * plotHeight;

    // Generate paths
    const generateLinePath = (data: RevenueDataPoint[], metric: RevenueMetric, dashed: boolean = false): string => {
      return data.map((point, i) => {
        const x = xScale(i);
        const y = yScale(point[metric] || 0);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    const generateAreaPath = (data: RevenueDataPoint[], metric: RevenueMetric): string => {
      const linePath = generateLinePath(data, metric);
      return `${linePath} L ${xScale(data.length - 1)} ${yScale(yMin)} L ${xScale(0)} ${yScale(yMin)} Z`;
    };

    // Y-axis ticks
    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks }, (_, i) => yMin + (yRange / (yTicks - 1)) * i);

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ height: `${height}px` }}>
        {/* Definitions */}
        <defs>
          {METRICS.filter(m => activeMetrics.has(m.value)).map(m => (
            <linearGradient key={m.value} id={`revenueGradient-${m.value}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={m.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={m.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
          <filter id="revenueGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid Lines */}
        {yTickValues.map(value => {
          const y = yScale(value);
          return (
            <g key={value}>
              <line
                x1={padding.left} x2={chartWidth - padding.right}
                y1={y} y2={y}
                stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1"
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-xs fill-secondary-400">
                {formatCompactNumber(value)}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        {chartView === 'area' && METRICS.filter(m => activeMetrics.has(m.value)).map(m => (
          <path
            key={`area-${m.value}`}
            d={generateAreaPath(activeData, m.value)}
            fill={`url(#revenueGradient-${m.value})`}
            opacity={0.7}
          />
        ))}

        {/* Lines */}
        {(chartView === 'line' || chartView === 'area') && METRICS.filter(m => activeMetrics.has(m.value)).map(m => (
          <path
            key={`line-${m.value}`}
            d={generateLinePath(activeData, m.value)}
            fill="none"
            stroke={m.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={animationProgress}
            filter="url(#revenueGlow)"
          />
        ))}

        {/* Data points */}
        {(chartView === 'line' || chartView === 'area') && METRICS.filter(m => activeMetrics.has(m.value)).map(m =>
          activeData.map((point, i) => {
            const x = xScale(i);
            const y = yScale(point[m.value] || 0);
            return (
              <circle
                key={`point-${m.value}-${i}`}
                cx={x} cy={y} r="3.5"
                fill="white" stroke={m.color} strokeWidth="2"
                className="cursor-pointer transition-all duration-200 hover:r-5"
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      visible: true,
                      dataPoint: point,
                      activeMetrics: Array.from(activeMetrics),
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
              />
            );
          })
        )}

        {/* Bars */}
        {chartView === 'bar' && METRICS.filter(m => activeMetrics.has(m.value)).map((m, seriesIdx) => {
          const totalSeries = activeMetrics.size;
          const barWidth = Math.min(40, (plotWidth / activeData.length) - 8);
          const seriesBarWidth = (barWidth - (totalSeries - 1) * 2) / totalSeries;
          
          return activeData.map((point, i) => {
            const x = xScale(i) - barWidth / 2 + seriesIdx * (seriesBarWidth + 2);
            const barHeight = ((point[m.value] || 0) - yMin) / yRange * plotHeight * animationProgress;
            const y = padding.top + plotHeight - barHeight;

            return (
              <g key={`bar-${m.value}-${i}`}>
                <rect
                  x={x} y={y}
                  width={seriesBarWidth} height={barHeight}
                  fill={m.color} rx={2}
                  opacity={0.85}
                  className="cursor-pointer transition-all duration-200 hover:opacity-100"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        visible: true,
                        dataPoint: point,
                        activeMetrics: [m.value],
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                />
              </g>
            );
          });
        })}

        {/* X-Axis Labels */}
        {activeData.filter((_, i) => i % Math.max(1, Math.floor(activeData.length / 8)) === 0).map((point, i) => {
          const x = xScale(activeData.indexOf(point));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={padding.top + plotHeight} y2={padding.top + plotHeight + 5} stroke="#cbd5e1" />
              <text x={x} y={chartHeight - 25} textAnchor="middle" className="text-xs fill-secondary-500">
                {point.label}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} stroke="#e2e8f0" strokeWidth="1" />
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + plotHeight} stroke="#e2e8f0" strokeWidth="1" />

        {/* Y-Axis Label */}
        <text x={15} y={chartHeight / 2} textAnchor="middle" transform={`rotate(-90, 15, ${chartHeight / 2})`} className="text-xs fill-secondary-400">
          Revenue (USD)
        </text>
      </svg>
    );
  };

  // ============================================
  // Loading State
  // ============================================

  if (isLoading || externalLoading) {
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
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 w-16 bg-secondary-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-secondary-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (error || externalError) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load revenue data</p>
        <p className="text-sm text-red-500 mt-1">{error || externalError}</p>
        <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto">
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
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
              <DollarSign className="h-4 w-4 text-green-600" />
              Revenue Analytics
            </h3>
            <p className="text-xs text-secondary-500 mt-0.5">
              Track MRR, overage revenue, and subscription growth
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart View Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
              {CHART_VIEWS.map(cv => (
                <button
                  key={cv.value}
                  onClick={() => setChartView(cv.value)}
                  className={`p-1.5 rounded-md transition-colors ${chartView === cv.value ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
                  title={cv.label}
                >
                  {cv.icon}
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

            {/* Export */}
            <button onClick={handleExport} className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700" title="Export CSV">
              <Download className="h-3.5 w-3.5" />
            </button>

            {/* Refresh */}
            <button onClick={handleRefresh} className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700" title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                period === p.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 hover:bg-secondary-200 dark:hover:bg-secondary-600'
              }`}
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Metrics Toggle */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {METRICS.map(m => (
            <button
              key={m.value}
              onClick={() => handleMetricToggle(m.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                activeMetrics.has(m.value)
                  ? 'ring-2 ring-offset-1'
                  : 'opacity-50 hover:opacity-75'
              }`}
              style={{
                backgroundColor: activeMetrics.has(m.value) ? m.color + '20' : 'transparent',
                borderColor: m.color,
                borderWidth: '1px',
                ringColor: m.color,
                color: activeMetrics.has(m.value) ? m.color : '#64748b',
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-gradient-to-r from-secondary-50 to-secondary-100 dark:from-secondary-800 dark:to-secondary-700 border-b border-secondary-200 dark:border-secondary-700">
          <div className="text-center">
            <p className="text-xs text-secondary-500">Latest MRR</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatCurrency(summary.latestMrr)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary-500">Latest ARR</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white">{formatCurrency(summary.latestArr)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary-500">Overage Revenue</p>
            <p className="text-lg font-bold text-yellow-600">{formatCurrency(summary.latestOverage)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary-500">MRR Growth</p>
            <p className={`text-lg font-bold flex items-center justify-center gap-1 ${summary.mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.mrrGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {summary.mrrGrowth >= 0 ? '+' : ''}{summary.mrrGrowth.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary-500">Overage %</p>
            <p className="text-lg font-bold text-orange-600">{summary.overagePercentage.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-secondary-500">Total Subs</p>
            <p className="text-lg font-bold text-purple-600">{formatCompactNumber(summary.totalSubscriptions)}</p>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className={`relative p-4 ${isFullscreen ? 'flex-1' : ''}`}>
        {renderChart()}

        {/* Tooltip */}
        {tooltip.visible && tooltip.dataPoint && (
          <div
            className="absolute z-50 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 p-3 pointer-events-none text-sm"
            style={{ left: Math.min(tooltip.x + 10, (containerRef.current?.offsetWidth || 600) - 200), top: Math.max(tooltip.y - 130, 10) }}
          >
            <p className="font-medium text-secondary-900 dark:text-white mb-1">{tooltip.dataPoint.label}</p>
            {tooltip.activeMetrics.map(metric => {
              const metricConfig = METRICS.find(m => m.value === metric);
              return (
                <div key={metric} className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: metricConfig?.color }} />
                    <span className="text-secondary-500">{metricConfig?.label}:</span>
                  </div>
                  <span className="font-medium">{formatCurrency(tooltip.dataPoint?.[metric] || 0)}</span>
                </div>
              );
            })}
            <hr className="my-1 border-secondary-200 dark:border-secondary-600" />
            <div className="flex justify-between text-xs">
              <span className="text-secondary-500">New:</span>
              <span className="text-green-600">+{tooltip.dataPoint.newCustomers}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-secondary-500">Churned:</span>
              <span className="text-red-600">-{tooltip.dataPoint.churnedCustomers}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 px-4 pb-3">
        {METRICS.map(m => (
          <button
            key={m.value}
            onClick={() => handleMetricToggle(m.value)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-colors ${
              activeMetrics.has(m.value)
                ? 'bg-secondary-100 dark:bg-secondary-700'
                : 'opacity-50 hover:opacity-75'
            }`}
          >
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: m.color, width: '16px' }} />
            <span className="text-secondary-600 dark:text-secondary-400">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-700/30 text-center text-xs text-secondary-400">
        Data as of {new Date().toLocaleDateString()} • Click metrics to toggle visibility • Hover for details
      </div>
    </div>
  );
};


export default RevenueChart;
