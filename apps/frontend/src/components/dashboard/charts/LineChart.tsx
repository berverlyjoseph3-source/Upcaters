// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/LineChart.tsx
import React from 'react';
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface LineChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey?: string;
  yKeys?: string[];
  color?: string;
  colors?: string[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKey,
  yKeys,
  color = '#3b82f6',
  colors = defaultColors,
  height = 300,
  showGrid = true,
  showLegend = true,
}) => {
  const keys = yKey ? [yKey] : yKeys || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
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
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[idx % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
};
export default LineChart;
