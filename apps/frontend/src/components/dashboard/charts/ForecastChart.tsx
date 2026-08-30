// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/ForecastChart.tsx
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Area } from 'recharts';

interface ForecastChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  actualKey?: string;
  forecastKey?: string;
  optimisticKey?: string;
  pessimisticKey?: string;
  confidenceInterval?: boolean;
  height?: number;
  forecastStartIndex?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  xKey,
  actualKey = 'actual',
  forecastKey = 'forecast',
  optimisticKey = 'optimistic',
  pessimisticKey = 'pessimistic',
  confidenceInterval = true,
  height = 350,
  forecastStartIndex,
}) => {
  const hasActual = data.some(d => d[actualKey] !== null && d[actualKey] !== undefined);
  const hasForecast = data.some(d => d[forecastKey] !== null && d[forecastKey] !== undefined);
  const startIndex = forecastStartIndex ?? (hasActual ? data.findIndex(d => d[actualKey] === null) : Math.floor(data.length / 2));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />

        {/* Vertical line separating actual from forecast */}
        {startIndex > 0 && (
          <ReferenceLine
            x={data[startIndex]?.[xKey]}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{ value: 'Forecast Start', position: 'top', fill: '#64748b', fontSize: 11 }}
          />
        )}

        {/* Actual data line */}
        {hasActual && (
          <Line
            type="monotone"
            dataKey={actualKey}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Actual"
            connectNulls={false}
          />
        )}

        {/* Forecast line */}
        {hasForecast && (
          <Line
            type="monotone"
            dataKey={forecastKey}
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            name="Forecast"
          />
        )}

        {/* Optimistic scenario */}
        {optimisticKey && data.some(d => d[optimisticKey] !== undefined) && (
          <Line
            type="monotone"
            dataKey={optimisticKey}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            name="Optimistic"
          />
        )}

        {/* Pessimistic scenario */}
        {pessimisticKey && data.some(d => d[pessimisticKey] !== undefined) && (
          <Line
            type="monotone"
            dataKey={pessimisticKey}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            name="Pessimistic"
          />
        )}

        {/* Confidence interval area (shaded between optimistic and pessimistic) */}
        {confidenceInterval && optimisticKey && pessimisticKey && data.some(d => d[optimisticKey] !== undefined) && (
          <Area
            type="monotone"
            dataKey={optimisticKey}
            fill="#f59e0b"
            fillOpacity={0.1}
            stroke="none"
            name="Confidence Interval"
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};
export default ForecastChart;
