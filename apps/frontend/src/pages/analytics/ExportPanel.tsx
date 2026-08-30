// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/ExportPanel.tsx
import React, { useState } from 'react';
import { X, Download, FileText, FileJson, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { FilterOptions, ExportOptions } from '../../types/analytics.types';
import { DateRangeFilter } from '../../components/analytics/DateRangeFilter';
import { AgentFilter } from '../../components/analytics/AgentFilter';
import { ActionTypeFilter } from '../../components/analytics/ActionTypeFilter';

interface ExportPanelProps {
  filters: FilterOptions;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise < void > ;
}

const exportFormats = [
  { id: 'csv', label: 'CSV', icon: <FileSpreadsheet className="h-5 w-5" />, description: 'Compatible with Excel, Google Sheets' },
  { id: 'json', label: 'JSON', icon: <FileJson className="h-5 w-5" />, description: 'Raw data format for developers' },
  { id: 'pdf', label: 'PDF', icon: <FileText className="h-5 w-5" />, description: 'Printable report with charts' },
];

const metricOptions = [
  { id: 'ai_actions', label: 'AI Actions' },
  { id: 'api_calls', label: 'API Calls' },
  { id: 'cost', label: 'Cost' },
  { id: 'tokens', label: 'Tokens' },
];

export const ExportPanel: React.FC < ExportPanelProps > = ({ filters, onClose, onExport }) => {
  const [format, setFormat] = useState < 'csv' | 'json' | 'pdf' > ('csv');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState < string[] > (['ai_actions', 'api_calls', 'cost']);
  const [exportDateRange, setExportDateRange] = useState(filters.dateRange);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState < 'idle' | 'success' | 'error' > ('idle');
  const [errorMessage, setErrorMessage] = useState < string | null > (null);
  
  const handleMetricToggle = (metricId: string) => {
    if (selectedMetrics.includes(metricId)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metricId));
    } else {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };
  
  const handleExport = async () => {
    if (selectedMetrics.length === 0) {
      setErrorMessage('Please select at least one metric to export');
      return;
    }
    setIsExporting(true);
    setExportStatus('idle');
    setErrorMessage(null);
    try {
      await onExport({
        format,
        dateRange: exportDateRange,
        includeCharts: format === 'pdf' ? includeCharts : undefined,
        metrics: selectedMetrics as any,
      });
      setExportStatus('success');
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setExportStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Export Analytics</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              {exportFormats.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as any)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    format === fmt.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-secondary-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {fmt.icon}
                    <span className="text-sm font-medium">{fmt.label}</span>
                    <span className="text-xs text-secondary-400 text-center">{fmt.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Date Range</label>
            <DateRangeFilter
              startDate={exportDateRange.start}
              endDate={exportDateRange.end}
              onChange={(start, end, label) => setExportDateRange({ start, end, label })}
              onPreset={() => {}}
            />
          </div>

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Metrics to Include</label>
            <div className="flex flex-wrap gap-2">
              {metricOptions.map(metric => (
                <button
                  key={metric.id}
                  onClick={() => handleMetricToggle(metric.id)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedMetrics.includes(metric.id)
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          {/* Include Charts (PDF only) */}
          {format === 'pdf' && (
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Include Charts</label>
                <p className="text-xs text-secondary-400">Add visualizations to the report</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          )}

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Export started! Your file will download shortly.
            </div>
          )}

          {exportStatus === 'error' && errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedMetrics.length === 0}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};
export default ExportPanel;
