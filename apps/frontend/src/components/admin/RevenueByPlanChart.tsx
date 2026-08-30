// enterprise-ai-agent-platform/apps/frontend/src/components/admin/RevenueByPlanChart.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart3, PieChart, TrendingUp, DollarSign, Download,
  RefreshCw, ChevronDown, Filter, Maximize2, Minimize2,
  ArrowUpRight, ArrowDownRight, Users, Target
} from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

export interface PlanRevenueData {
  planId: string;
  planName: string;
  userCount: number;
  subscriptionRevenue: number; // in cents
  overageRevenue: number; // in cents
  totalRevenue: number; // in cents
  averageRevenuePerUser: number; // in cents
  growth: number; // percentage
  churnRate: number; // percentage
  newSubscriptions: number;
  cancelledSubscriptions: number;
  netGrowth: number;
  mrr: number; // in cents
  arr: number; // in cents
  percentageOfTotal: number;
  color: string;
  gradient: string;
}

export type ChartType = 'bar' | 'pie' | 'stacked' | 'donut';
export type MetricType = 'revenue' | 'users' | 'growth' | 'arpu';

interface RevenueByPlanChartProps {
  data: PlanRevenueData[];
  isLoading?: boolean;
  error?: string | null;
  chartType?: ChartType;
  metricType?: MetricType;
  showOverageBreakdown?: boolean;
  onChartTypeChange?: (type: ChartType) => void;
  onMetricTypeChange?: (type: MetricType) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onPlanClick?: (planId: string) => void;
  className?: string;
  height?: number;
}

// ============================================
// Default Colors
// ============================================

const DEFAULT_PLAN_COLORS: Record<string, { solid: string; gradient: string; light: string }> = {
  FREE: { solid: '#94a3b8', gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', light: '#f1f5f9' },
  STARTER: { solid: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', light: '#eff6ff' },
  PROFESSIONAL: { solid: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', light: '#f5f3ff' },
  ENTERPRISE: { solid: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', light: '#fffbeb' },
};

const OVERAGE_COLOR = '#fbbf24';
const OVERAGE_GRADIENT = 'linear-gradient(135deg, #fbbf24, #f59e0b)';

// ============================================
// Tooltip Types
// ============================================

interface TooltipData {
  x: number;
  y: number;
  plan: PlanRevenueData | null;
  visible: boolean;
  segment?: 'subscription' | 'overage';
}

// ============================================
// Component
// ============================================

export const RevenueByPlanChart: React.FC<RevenueByPlanChartProps> = ({
  data,
  isLoading = false,
  error = null,
  chartType: initialChartType = 'bar',
  metricType: initialMetricType = 'revenue',
  showOverageBreakdown = true,
  onChartTypeChange,
  onMetricTypeChange,
  onRefresh,
  onExport,
  onPlanClick,
  className = '',
  height = 400,
}) => {
  // State
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [metricType, setMetricType] = useState<MetricType>(initialMetricType);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, plan: null, visible: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation
  useEffect(() => {
    const timer = setTimeout(() => setAnimationProgress(1), 100);
    return () => clearTimeout(timer);
  }, [data]);

  // Sync with external state changes
  useEffect(() => {
    setChartType(initialChartType);
  }, [initialChartType]);

  useEffect(() => {
    setMetricType(initialMetricType);
  }, [initialMetricType]);

  // ============================================
  // Handlers
  // ============================================

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

  const handlePlanClick = (planId: string) => {
    setSelectedPlan(selectedPlan === planId ? null : planId);
    onPlanClick?.(planId);
  };

  const getMetricValue = useCallback((plan: PlanRevenueData): number => {
    switch (metricType) {
      case 'revenue': return plan.totalRevenue;
      case 'users': return plan.userCount;
      case 'growth': return plan.growth;
      case 'arpu': return plan.averageRevenuePerUser;
      default: return plan.totalRevenue;
    }
  }, [metricType]);

  const formatMetricValue = useCallback((value: number): string => {
    switch (metricType) {
      case 'revenue':
      case 'arpu':
        return formatCurrency(value / 100);
      case 'users':
        return formatCompactNumber(value);
      case 'growth':
        return `${value > 0 ? '+' : ''}${value}%`;
      default:
        return formatCompactNumber(value);
    }
  }, [metricType]);

  // ============================================
  // Bar Chart (Vertical with Overage Overlay)
  // ============================================

  const renderBarChart = () => {
    if (data.length === 0) return null;

    const maxVal = Math.max(...data.map(p => getMetricValue(p)));
    const chartWidth = 700;
    const chartHeight = height;
    const padding = { top: 30, right: 40, bottom: 60, left: 80 };
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    const barWidth = Math.min(100, (plotWidth / data.length) - 20);
    const gap = (plotWidth - barWidth * data.length) / (data.length + 1);

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" style={{ height: `${height}px` }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <g key={pct}>
            <line
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={padding.top + plotHeight - (plotHeight * pct * animationProgress)}
              y2={padding.top + plotHeight - (plotHeight * pct * animationProgress)}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={padding.top + plotHeight - (plotHeight * pct * animationProgress) + 4}
              textAnchor="end"
              className="text-xs fill-secondary-400"
            >
              {metricType === 'growth' ? `${Math.round(maxVal * pct)}%` : formatCompactNumber(maxVal * pct)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((plan, i) => {
          const x = padding.left + gap + i * (barWidth + gap);
          const value = getMetricValue(plan);
          const barHeight = maxVal > 0 ? (value / maxVal) * plotHeight * animationProgress : 0;
          const y = padding.top + plotHeight - barHeight;

          // Calculate overage portion for stacked view
          let overageHeight = 0;
          let subHeight = barHeight;
          
          if (showOverageBreakdown && metricType === 'revenue' && plan.overageRevenue > 0) {
            overageHeight = maxVal > 0 ? (plan.overageRevenue / maxVal) * plotHeight * animationProgress : 0;
            subHeight = barHeight - overageHeight;
          }

          const isSelected = selectedPlan === plan.planId;
          const colors = DEFAULT_PLAN_COLORS[plan.planId] || DEFAULT_PLAN_COLORS.FREE;

          return (
            <g key={plan.planId}>
              {/* Subscription bar */}
              <rect
                x={x}
                y={y + overageHeight}
                width={barWidth}
                height={subHeight}
                fill={colors.solid}
                rx={4}
                opacity={isSelected ? 1 : 0.85}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => handlePlanClick(plan.planId)}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      plan,
                      segment: 'subscription',
                      visible: true,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
              />

              {/* Overage bar on top */}
              {overageHeight > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={overageHeight}
                  fill={OVERAGE_COLOR}
                  rx={4}
                  opacity={isSelected ? 1 : 0.8}
                  className="cursor-pointer transition-all duration-200 hover:opacity-100"
                  onClick={() => handlePlanClick(plan.planId)}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        plan,
                        segment: 'overage',
                        visible: true,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                />
              )}

              {/* Plan name label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 30}
                textAnchor="middle"
                className="text-xs font-medium fill-secondary-600 dark:fill-secondary-400"
              >
                {plan.planName}
              </text>

              {/* User count label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 14}
                textAnchor="middle"
                className="text-xs fill-secondary-400"
              >
                {plan.userCount} users
              </text>

              {/* Value label on top */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className={`text-xs font-semibold fill-secondary-900 dark:fill-white ${barHeight < 20 ? 'opacity-0' : ''}`}
              >
                {formatMetricValue(value)}
              </text>

              {/* Selected indicator */}
              {isSelected && (
                <rect
                  x={x - 2}
                  y={padding.top - 5}
                  width={barWidth + 4}
                  height={plotHeight + 10}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  rx="6"
                  strokeDasharray="4 3"
                />
              )}
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={15}
          y={chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${chartHeight / 2})`}
          className="text-xs fill-secondary-400"
        >
          {metricType === 'revenue' ? 'Revenue (USD)' : 
           metricType === 'users' ? 'Number of Users' : 
           metricType === 'growth' ? 'Growth Rate (%)' : 
           'ARPU (USD)'}
        </text>
      </svg>
    );
  };

  // ============================================
  // Pie / Donut Chart
  // ============================================

  const renderPieChart = (isDonut: boolean = false) => {
    if (data.length === 0) return null;

    const total = data.reduce((sum, p) => sum + getMetricValue(p), 0);
    const size = Math.min(500, height + 100);
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - 40;
    const innerRadius = isDonut ? outerRadius * 0.55 : 0;

    let currentAngle = -90;

    return (
      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: `${size}px`, height: `${size}px` }}>
          {data.map((plan) => {
            const value = getMetricValue(plan);
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const sweepAngle = (percentage / 100) * 360 * animationProgress;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sweepAngle;

            // Calculate arc path
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = cx + outerRadius * Math.cos(startRad);
            const y1 = cy + outerRadius * Math.sin(startRad);
            const x2 = cx + outerRadius * Math.cos(endRad);
            const y2 = cy + outerRadius * Math.sin(endRad);

            const innerX1 = cx + innerRadius * Math.cos(startRad);
            const innerY1 = cy + innerRadius * Math.sin(startRad);
            const innerX2 = cx + innerRadius * Math.cos(endRad);
            const innerY2 = cy + innerRadius * Math.sin(endRad);

            const largeArc = sweepAngle > 180 ? 1 : 0;
            const colors = DEFAULT_PLAN_COLORS[plan.planId] || DEFAULT_PLAN_COLORS.FREE;
            const isSelected = selectedPlan === plan.planId;

            // Arc path
            const path = isDonut
              ? `M ${innerX1} ${innerY1} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1} Z`
              : `M ${cx} ${cy} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            currentAngle = endAngle;

            // Calculate label position
            const midAngle = (startAngle + endAngle) / 2;
            const midRad = (midAngle * Math.PI) / 180;
            const labelRadius = outerRadius * 0.7;
            const labelX = cx + labelRadius * Math.cos(midRad);
            const labelY = cy + labelRadius * Math.sin(midRad);

            return (
              <g key={plan.planId}>
                <path
                  d={path}
                  fill={colors.solid}
                  stroke="white"
                  strokeWidth="2"
                  opacity={isSelected ? 1 : 0.85}
                  className="cursor-pointer transition-all duration-200 hover:opacity-100 hover:scale-105"
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  onClick={() => handlePlanClick(plan.planId)}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        plan,
                        visible: true,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                />
                
                {/* Percentage label (only show for larger slices) */}
                {percentage > 8 && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-bold fill-white"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {percentage.toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Center text for donut */}
          {isDonut && (
            <>
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                className="text-2xl font-bold fill-secondary-900 dark:fill-white"
              >
                {formatMetricValue(total)}
              </text>
              <text
                x={cx}
                y={cy + 16}
                textAnchor="middle"
                className="text-xs fill-secondary-500"
              >
                {metricType === 'revenue' ? 'Total Revenue' : 
                 metricType === 'users' ? 'Total Users' : 
                 metricType === 'growth' ? 'Avg Growth' : 
                 'Avg ARPU'}
              </text>
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {data.map(plan => (
            <button
              key={plan.planId}
              onClick={() => handlePlanClick(plan.planId)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedPlan === plan.planId ? 'bg-secondary-100 dark:bg-secondary-700 ring-2 ring-primary-500' : 'hover:bg-secondary-50 dark:hover:bg-secondary-700'
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEFAULT_PLAN_COLORS[plan.planId]?.solid }} />
              <span className="text-secondary-700 dark:text-secondary-300">{plan.planName}</span>
              <span className="font-medium text-secondary-900 dark:text-white">{formatMetricValue(getMetricValue(plan))}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // Summary Stats
  // ============================================

  const summary = useMemo(() => {
    const totalRevenue = data.reduce((s, p) => s + p.totalRevenue, 0);
    const totalOverage = data.reduce((s, p) => s + p.overageRevenue, 0);
    const totalUsers = data.reduce((s, p) => s + p.userCount, 0);
    const avgGrowth = data.length > 0 ? data.reduce((s, p) => s + p.growth, 0) / data.length : 0;

    return { totalRevenue, totalOverage, totalUsers, avgGrowth };
  }, [data]);

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary-200 rounded w-1/3"></div>
          <div className="h-4 bg-secondary-200 rounded w-1/2"></div>
          <div className="h-80 bg-secondary-200 rounded"></div>
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
        <BarChart3 className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load chart data</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        {onRefresh && (
          <button onClick={onRefresh} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
            Try Again
          </button>
        )}
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (data.length === 0) {
    return (
      <div className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-12 text-center ${className}`}>
        <BarChart3 className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Revenue Data</h3>
        <p className="text-secondary-500">Revenue data will appear once subscriptions are active.</p>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div 
      ref={containerRef}
      className={`bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden ${className} ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Revenue by Plan
            </h3>
            <p className="text-xs text-secondary-500 mt-0.5">
              {metricType === 'revenue' ? 'Subscription + Overage Revenue' :
               metricType === 'users' ? 'User Distribution' :
               metricType === 'growth' ? 'Growth Rate' : 'Average Revenue Per User'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
              {(['revenue', 'users', 'growth', 'arpu'] as MetricType[]).map(metric => (
                <button
                  key={metric}
                  onClick={() => handleMetricTypeChange(metric)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors capitalize ${
                    metricType === metric ? 'bg-white dark:bg-secondary-600 shadow-sm' : 'hover:text-secondary-900'
                  }`}
                >
                  {metric}
                </button>
              ))}
            </div>

            {/* Chart Type Toggle */}
            <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
              <button
                onClick={() => handleChartTypeChange('bar')}
                className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
                title="Bar Chart"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleChartTypeChange('pie')}
                className={`p-1.5 rounded-md transition-colors ${chartType === 'pie' ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
                title="Pie Chart"
              >
                <PieChart className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleChartTypeChange('donut')}
                className={`p-1.5 rounded-md transition-colors ${chartType === 'donut' ? 'bg-white dark:bg-secondary-600 shadow-sm' : ''}`}
                title="Donut Chart"
              >
                <Target className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
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
      </div>

      {/* Chart Area */}
      <div className="relative">
        {/* Chart */}
        {(chartType === 'bar' || chartType === 'stacked') && renderBarChart()}
        {chartType === 'pie' && renderPieChart(false)}
        {chartType === 'donut' && renderPieChart(true)}

        {/* Tooltip */}
        {tooltip.visible && tooltip.plan && (
          <div
            className="absolute z-50 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 p-3 pointer-events-none text-sm"
            style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
          >
            <p className="font-medium text-secondary-900 dark:text-white">{tooltip.plan.planName}</p>
            {tooltip.segment === 'subscription' && (
              <p className="text-secondary-500">Subscription: {formatCurrency(tooltip.plan.subscriptionRevenue / 100)}</p>
            )}
            {tooltip.segment === 'overage' && (
              <p className="text-yellow-600">Overage: {formatCurrency(tooltip.plan.overageRevenue / 100)}</p>
            )}
            <p className="font-semibold text-secondary-900 dark:text-white mt-1">
              Total: {formatCurrency(tooltip.plan.totalRevenue / 100)}
            </p>
            <p className="text-xs text-secondary-400">{tooltip.plan.userCount} users • {tooltip.plan.growth > 0 ? '+' : ''}{tooltip.plan.growth}% growth</p>
          </div>
        )}

        {/* Legend for Bar Chart */}
        {showOverageBreakdown && (chartType === 'bar' || chartType === 'stacked') && (
          <div className="flex justify-center gap-6 pb-4">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-secondary-600">Subscription Revenue</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded bg-yellow-400" />
              <span className="text-secondary-600">Overage Revenue</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Plan Details */}
      {selectedPlan && (
        <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-700/30">
          {data.filter(p => p.planId === selectedPlan).map(plan => (
            <div key={plan.planId} className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-secondary-500">Subscription Revenue</p>
                <p className="font-semibold text-secondary-900 dark:text-white">{formatCurrency(plan.subscriptionRevenue / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Overage Revenue</p>
                <p className="font-semibold text-yellow-600">{formatCurrency(plan.overageRevenue / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Total Revenue</p>
                <p className="font-semibold text-secondary-900 dark:text-white">{formatCurrency(plan.totalRevenue / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">Net Growth</p>
                <p className={`font-semibold ${plan.netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {plan.netGrowth >= 0 ? '+' : ''}{plan.netGrowth}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default RevenueByPlanChart;
