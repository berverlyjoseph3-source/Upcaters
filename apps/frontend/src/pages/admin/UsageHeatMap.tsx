// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/UsageHeatMap.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Filter, Download, RefreshCw, Calendar,
  ChevronDown, ChevronUp, Zap, Activity, TrendingUp,
  Clock, Users, BarChart3, Maximize2, Minimize2,
  Sun, Moon, Cloud, Flame
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { UsageHeatMapData, UsageHeatMapCell } from '../../types/admin.types';
import { formatCompactNumber, formatCurrency } from '../../utils/format.utils';

// ============================================
// Types
// ============================================

type HeatMapMetric = 'executions' | 'tokens' | 'cost';
type TimeGranularity = 'hour' | 'day' | 'week';
type ColorTheme = 'blue' | 'green' | 'purple' | 'fire';

interface HeatMapConfig {
  metric: HeatMapMetric;
  granularity: TimeGranularity;
  colorTheme: ColorTheme;
  showNumbers: boolean;
  normalizeByUser: boolean;
}

interface HeatMapTooltip {
  x: number;
  y: number;
  cell: UsageHeatMapCell | null;
  visible: boolean;
}

// ============================================
// Color Scales
// ============================================

const colorScales: Record<ColorTheme, (intensity: number) => string> = {
  blue: (intensity) => {
    const r = Math.floor(235 - intensity * 176);
    const g = Math.floor(245 - intensity * 152);
    const b = Math.floor(255 - intensity * 30);
    return `rgb(${r}, ${g}, ${b})`;
  },
  green: (intensity) => {
    const r = Math.floor(240 - intensity * 224);
    const g = Math.floor(253 - intensity * 120);
    const b = Math.floor(244 - intensity * 150);
    return `rgb(${r}, ${g}, ${b})`;
  },
  purple: (intensity) => {
    const r = Math.floor(237 - intensity * 90);
    const g = Math.floor(233 - intensity * 180);
    const b = Math.floor(254 - intensity * 60);
    return `rgb(${r}, ${g}, ${b})`;
  },
  fire: (intensity) => {
    // Yellow → Orange → Red gradient
    if (intensity < 0.33) {
      const t = intensity / 0.33;
      return `rgb(${Math.floor(255)}, ${Math.floor(255 - t * 100)}, ${Math.floor(200 - t * 150)})`;
    } else if (intensity < 0.66) {
      const t = (intensity - 0.33) / 0.33;
      return `rgb(${Math.floor(255 - t * 55)}, ${Math.floor(155 - t * 100)}, ${Math.floor(50 - t * 20)})`;
    } else {
      const t = (intensity - 0.66) / 0.34;
      return `rgb(${Math.floor(200 - t * 50)}, ${Math.floor(55 - t * 40)}, ${Math.floor(30 - t * 20)})`;
    }
  },
};

const colorThemeLabels: Record<ColorTheme, { label: string; icon: React.ReactNode }> = {
  blue: { label: 'Ocean Blue', icon: <Cloud className="h-3 w-3" /> },
  green: { label: 'Forest Green', icon: <Activity className="h-3 w-3" /> },
  purple: { label: 'Royal Purple', icon: <Moon className="h-3 w-3" /> },
  fire: { label: 'Fire', icon: <Flame className="h-3 w-3" /> },
};

// ============================================
// Component
// ============================================

export const UsageHeatMap: React.FC = () => {
  const {
    usageHeatMap,
    usageHeatMapLoading,
    usageHeatMapError,
    fetchUsageHeatMap,
    exportUsageHeatMap,
  } = useAdmin();

  // State
  const [config, setConfig] = useState<HeatMapConfig>({
    metric: 'executions',
    granularity: 'day',
    colorTheme: 'blue',
    showNumbers: true,
    normalizeByUser: false,
  });
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tooltip, setTooltip] = useState<HeatMapTooltip>({ x: 0, y: 0, cell: null, visible: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pinnedCells, setPinnedCells] = useState<Set<string>>(new Set());

  // Fetch data on mount and config change
  useEffect(() => {
    fetchUsageHeatMap({
      metric: config.metric,
      granularity: config.granularity,
      agentType: selectedAgent !== 'all' ? selectedAgent : undefined,
      planId: selectedPlan !== 'all' ? selectedPlan : undefined,
    });
  }, [fetchUsageHeatMap, config.metric, config.granularity, selectedAgent, selectedPlan]);

  // ============================================
  // Derived Data
  // ============================================

  const heatMapData = useMemo((): UsageHeatMapCell[][] | null => {
    if (!usageHeatMap?.cells) return null;
    return usageHeatMap.cells;
  }, [usageHeatMap]);

  const rowLabels = useMemo((): string[] => {
    if (!usageHeatMap?.rowLabels) return [];
    return usageHeatMap.rowLabels;
  }, [usageHeatMap]);

  const colLabels = useMemo((): string[] => {
    if (!usageHeatMap?.colLabels) return [];
    return usageHeatMap.colLabels;
  }, [usageHeatMap]);

  // Calculate value range for color scaling
  const valueRange = useMemo(() => {
    if (!heatMapData) return { min: 0, max: 100 };
    
    let min = Infinity;
    let max = -Infinity;
    
    heatMapData.forEach(row => {
      row.forEach(cell => {
        if (cell.value < min) min = cell.value;
        if (cell.value > max) max = cell.value;
      });
    });
    
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 100 : max };
  }, [heatMapData]);

  // Summary statistics
  const summary = useMemo(() => {
    if (!heatMapData) return null;
    
    let totalValue = 0;
    let totalCells = 0;
    let peakValue = 0;
    let peakCell: { row: number; col: number } | null = null;
    
    heatMapData.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        totalValue += cell.value;
        totalCells++;
        if (cell.value > peakValue) {
          peakValue = cell.value;
          peakCell = { row: rowIdx, col: colIdx };
        }
      });
    });
    
    return {
      totalValue,
      averageValue: totalCells > 0 ? totalValue / totalCells : 0,
      peakValue,
      peakCell,
      peakLabel: peakCell ? `${rowLabels[peakCell.row]} @ ${colLabels[peakCell.col]}` : 'N/A',
      totalCells,
    };
  }, [heatMapData, rowLabels, colLabels]);

  // Filter options
  const agentOptions = useMemo(() => {
    if (!usageHeatMap?.availableAgents) return ['all'];
    return ['all', ...usageHeatMap.availableAgents];
  }, [usageHeatMap]);

  const planOptions = useMemo(() => {
    if (!usageHeatMap?.availablePlans) return ['all'];
    return ['all', ...usageHeatMap.availablePlans];
  }, [usageHeatMap]);

  // ============================================
  // Handlers
  // ============================================

  const getHeatColor = useCallback((value: number): string => {
    const { min, max } = valueRange;
    if (max === min) return colorScales[config.colorTheme](0.5);
    const intensity = (value - min) / (max - min);
    return colorScales[config.colorTheme](intensity);
  }, [valueRange, config.colorTheme]);

  const getTextColor = useCallback((value: number): string => {
    const { min, max } = valueRange;
    if (max === min) return '#ffffff';
    const intensity = (value - min) / (max - min);
    return intensity > 0.5 ? '#ffffff' : '#1e293b';
  }, [valueRange]);

  const handleCellHover = (cell: UsageHeatMapCell, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      cell,
      visible: true,
    });
  };

  const handleCellLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleCellClick = (rowIdx: number, colIdx: number) => {
    const key = `${rowIdx}-${colIdx}`;
    const newPinned = new Set(pinnedCells);
    if (newPinned.has(key)) {
      newPinned.delete(key);
    } else {
      newPinned.add(key);
    }
    setPinnedCells(newPinned);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportUsageHeatMap({
        metric: config.metric,
        granularity: config.granularity,
        format: 'csv',
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getMetricLabel = (metric: HeatMapMetric): string => {
    switch (metric) {
      case 'executions': return 'Executions';
      case 'tokens': return 'Tokens Used';
      case 'cost': return 'Cost (USD)';
    }
  };

  const formatValue = (value: number): string => {
    switch (config.metric) {
      case 'executions':
      case 'tokens':
        return formatCompactNumber(value);
      case 'cost':
        return formatCurrency(value);
    }
  };

  // ============================================
  // Loading State
  // ============================================

  if (usageHeatMapLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-500">Generating heat map...</p>
          <p className="text-xs text-secondary-400 mt-1">Crunching usage data</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Error State
  // ============================================

  if (usageHeatMapError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <BarChart3 className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 dark:text-red-300 font-medium">Failed to load heat map</p>
        <p className="text-sm text-red-500 mt-1">{usageHeatMapError}</p>
        <button 
          onClick={() => fetchUsageHeatMap({
            metric: config.metric,
            granularity: config.granularity,
          })}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (!heatMapData || heatMapData.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-12 text-center">
        <BarChart3 className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">No Usage Data</h3>
        <p className="text-secondary-500 max-w-md mx-auto">
          There is no usage data available for the selected filters. Try adjusting the time range or metric.
        </p>
        <button
          onClick={() => fetchUsageHeatMap({
            metric: config.metric,
            granularity: config.granularity,
          })}
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </button>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-secondary-900 p-6 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            Usage Heat Map
          </h2>
          <p className="text-sm text-secondary-500 mt-1">
            Visualize usage patterns across agents, users, and time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:bg-secondary-50 disabled:opacity-50"
          >
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </button>
          <button
            onClick={() => fetchUsageHeatMap({
              metric: config.metric,
              granularity: config.granularity,
            })}
            className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Metric Selector */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 mb-1">Metric</label>
            <select
              value={config.metric}
              onChange={(e) => setConfig(prev => ({ ...prev, metric: e.target.value as HeatMapMetric }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
            >
              <option value="executions">Executions</option>
              <option value="tokens">Tokens</option>
              <option value="cost">Cost</option>
            </select>
          </div>

          {/* Time Granularity */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 mb-1">Time Granularity</label>
            <select
              value={config.granularity}
              onChange={(e) => setConfig(prev => ({ ...prev, granularity: e.target.value as TimeGranularity }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 mb-1">Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
            >
              {agentOptions.map(agent => (
                <option key={agent} value={agent}>
                  {agent === 'all' ? 'All Agents' : agent.charAt(0).toUpperCase() + agent.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 mb-1">Plan</label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
            >
              {planOptions.map(plan => (
                <option key={plan} value={plan}>{plan === 'all' ? 'All Plans' : plan}</option>
              ))}
            </select>
          </div>

          {/* Color Theme */}
          <div>
            <label className="block text-xs font-medium text-secondary-500 mb-1">Color Theme</label>
            <select
              value={config.colorTheme}
              onChange={(e) => setConfig(prev => ({ ...prev, colorTheme: e.target.value as ColorTheme }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-sm"
            >
              {Object.entries(colorThemeLabels).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional Toggles */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showNumbers}
              onChange={(e) => setConfig(prev => ({ ...prev, showNumbers: e.target.checked }))}
              className="w-4 h-4 rounded border-secondary-300 text-primary-600"
            />
            <span className="text-sm text-secondary-600">Show Numbers</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.normalizeByUser}
              onChange={(e) => setConfig(prev => ({ ...prev, normalizeByUser: e.target.checked }))}
              className="w-4 h-4 rounded border-secondary-300 text-primary-600"
            />
            <span className="text-sm text-secondary-600">Normalize by User Count</span>
          </label>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatValue(summary.totalValue)}</p>
            <p className="text-xs text-secondary-500">Total {getMetricLabel(config.metric)}</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatValue(summary.averageValue)}</p>
            <p className="text-xs text-secondary-500">Average per Cell</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{formatValue(summary.peakValue)}</p>
            <p className="text-xs text-secondary-500">Peak Value</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-3 text-center">
            <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{summary.peakLabel}</p>
            <p className="text-xs text-secondary-500">Peak Location</p>
          </div>
        </div>
      )}

      {/* Heat Map Grid */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-auto">
        <div className="min-w-max">
          {/* Column Headers */}
          <div className="flex sticky top-0 bg-white dark:bg-secondary-800 z-10 border-b border-secondary-200 dark:border-secondary-700">
            {/* Top-left corner cell */}
            <div className="w-32 flex-shrink-0 p-2 text-xs font-medium text-secondary-500 border-r border-secondary-200 dark:border-secondary-700">
              {config.granularity === 'hour' ? 'Time' : config.granularity === 'day' ? 'Day' : 'Week'}
            </div>
            {/* Column labels */}
            {colLabels.map((label, idx) => (
              <div
                key={idx}
                className="w-16 flex-shrink-0 p-2 text-xs font-medium text-secondary-500 text-center border-r border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 cursor-default"
                title={label}
              >
                {label.length > 6 ? label.substring(0, 5) + '…' : label}
              </div>
            ))}
          </div>

          {/* Row Headers + Cells */}
          <div className="relative">
            {heatMapData.map((row, rowIdx) => (
              <div key={rowIdx} className="flex border-b border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50/50 dark:hover:bg-secondary-700/30">
                {/* Row label */}
                <div className="w-32 flex-shrink-0 p-2 text-xs text-secondary-600 dark:text-secondary-400 border-r border-secondary-200 dark:border-secondary-700 flex items-center hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-default">
                  <span className="truncate" title={rowLabels[rowIdx]}>
                    {rowLabels[rowIdx]?.length > 15 
                      ? rowLabels[rowIdx].substring(0, 14) + '…' 
                      : rowLabels[rowIdx]}
                  </span>
                </div>
                {/* Cells */}
                {row.map((cell, colIdx) => {
                  const intensity = valueRange.max > valueRange.min 
                    ? (cell.value - valueRange.min) / (valueRange.max - valueRange.min) 
                    : 0;
                  const isPinned = pinnedCells.has(`${rowIdx}-${colIdx}`);

                  return (
                    <div
                      key={colIdx}
                      className={`w-16 flex-shrink-0 p-1 text-center transition-all duration-200 cursor-pointer relative ${
                        isPinned ? 'ring-2 ring-primary-500 z-10 scale-110' : ''
                      }`}
                      style={{
                        backgroundColor: getHeatColor(cell.value),
                        color: getTextColor(cell.value),
                      }}
                      onMouseEnter={(e) => handleCellHover(cell, e)}
                      onMouseLeave={handleCellLeave}
                      onClick={() => handleCellClick(rowIdx, colIdx)}
                      title={`${rowLabels[rowIdx]} @ ${colLabels[colIdx]}: ${formatValue(cell.value)}`}
                    >
                      {config.showNumbers && (
                        <span className="text-xs font-medium" style={{ fontSize: '10px' }}>
                          {formatCompactNumber(cell.value)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip.visible && tooltip.cell && (
          <div
            className="fixed z-50 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 p-3 pointer-events-none"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="text-xs text-secondary-500">{tooltip.cell.label}</p>
            <p className="text-sm font-semibold text-secondary-900 dark:text-white">{formatValue(tooltip.cell.value)}</p>
            {tooltip.cell.metadata && (
              <div className="mt-1 pt-1 border-t border-secondary-200 dark:border-secondary-700">
                {Object.entries(tooltip.cell.metadata).map(([key, val]) => (
                  <p key={key} className="text-xs text-secondary-500">
                    <span className="font-medium">{key}:</span> {String(val)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Color Scale Legend */}
        <div className="flex items-center justify-center gap-2 p-3 border-t border-secondary-200 dark:border-secondary-700">
          <span className="text-xs text-secondary-500">Low</span>
          <div className="flex h-4 rounded-full overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-full"
                style={{ backgroundColor: colorScales[config.colorTheme](i / 19) }}
              />
            ))}
          </div>
          <span className="text-xs text-secondary-500">High</span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-secondary-400">
        Click on any cell to pin it for comparison • Hover for details • {summary?.totalCells.toLocaleString()} data points
      </div>
    </div>
  );
};
export default UsageHeatMap;
