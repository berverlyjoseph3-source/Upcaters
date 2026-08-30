// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/ForecastPanel.tsx
import React, { useState } from 'react';
import { TrendingUp, Calendar, AlertCircle, Download } from 'lucide-react';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { LineChart } from '../../components/dashboard/charts';
import { ForecastData, DailyUsage } from '../../types/analytics.types';
import { format, subDays } from 'date-fns';

interface ForecastPanelProps {
  forecast: ForecastData[];
  dailyUsage: DailyUsage[];
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

export const ForecastPanel: React.FC < ForecastPanelProps > = ({ forecast, dailyUsage }) => {
  const [forecastMetric, setForecastMetric] = useState < 'usage' | 'cost' > ('usage');
  
  // Prepare historical data (last 30 days)
  const historicalData = dailyUsage.slice(-30).map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    actual: forecastMetric === 'usage' ? day.aiActions + day.apiCalls : day.cost,
  }));
  
  // Prepare forecast data
  const forecastData = forecast.map(f => ({
    date: format(new Date(f.date), 'MMM dd'),
    forecast: forecastMetric === 'usage' ? f.forecast : f.forecast * 0.001, // Approximate cost per unit
    lowerBound: forecastMetric === 'usage' ? f.lowerBound : f.lowerBound * 0.001,
    upperBound: forecastMetric === 'usage' ? f.upperBound : f.upperBound * 0.001,
  }));
  
  // Combine historical and forecast for chart
  const chartData = [...historicalData, ...forecastData];
  
  const totalForecastedUsage = forecast.reduce((sum, f) => sum + f.forecast, 0);
  const totalForecastedCost = forecast.reduce((sum, f) => sum + f.forecast * 0.001, 0);
  const expectedGrowth = ((forecast[forecast.length - 1]?.forecast || 0) / (forecast[0]?.forecast || 1) - 1) * 100;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Forecast Period</p>
          <p className="text-lg font-semibold text-secondary-900 dark:text-white">
            {forecast.length} days
          </p>
          <p className="text-xs text-secondary-400">
            {forecast[0]?.date ? format(new Date(forecast[0].date), 'MMM dd') : '—'} -{' '}
            {forecast[forecast.length - 1]?.date ? format(new Date(forecast[forecast.length - 1].date), 'MMM dd') : '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Projected {forecastMetric === 'usage' ? 'Usage' : 'Cost'}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">
            {forecastMetric === 'usage'
              ? totalForecastedUsage.toLocaleString()
              : formatCurrency(totalForecastedCost)}
          </p>
          <p className="text-xs text-secondary-400">
            {expectedGrowth >= 0 ? '↑' : '↓'} {Math.abs(expectedGrowth).toFixed(1)}% vs current period
          </p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Confidence Level</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">85%</p>
          <p className="text-xs text-secondary-400">Based on historical patterns</p>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setForecastMetric('usage')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            forecastMetric === 'usage'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          Usage Forecast
        </button>
        <button
          onClick={() => setForecastMetric('cost')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            forecastMetric === 'cost'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          Cost Forecast
        </button>
      </div>

      {/* Forecast Chart */}
      <ChartContainer title="Usage & Cost Forecast" description="Projected trend with confidence intervals">
        <LineChart
          data={chartData}
          xKey="date"
          yKeys={['actual', 'forecast', 'upperBound', 'lowerBound']}
          colors={['#3b82f6', '#10b981', '#f59e0b', '#f59e0b']}
        />
      </ChartContainer>

      {/* Interpretation */}
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Interpretation</h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
              Based on historical usage patterns, we forecast{' '}
              <strong>{expectedGrowth >= 0 ? 'an increase' : 'a decrease'}</strong> of{' '}
              <strong>{Math.abs(expectedGrowth).toFixed(1)}%</strong> in{' '}
              {forecastMetric === 'usage' ? 'usage' : 'cost'} over the next {forecast.length} days.
              {expectedGrowth > 20 && (
                ' Consider upgrading your plan to optimize costs.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="text-center text-xs text-secondary-400">
        Forecasts are based on historical data and may not reflect actual future usage.
        Predictions have a confidence interval of ±15%.
      </div>
    </div>
  );
};
export default ForecastPanel;
