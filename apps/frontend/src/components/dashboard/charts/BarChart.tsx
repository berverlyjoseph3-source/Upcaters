// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/BarChart.tsx
import React from 'react';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey?: string;
  yKeys?: string[];
  color?: string;
  colors?: string[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  stacked?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a'];

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  yKeys,
  color = '#3b82f6',
  colors = defaultColors,
  height = 300,
  layout = 'horizontal',
  stacked = false,
  showGrid = true,
  showLegend = true,
}) => {
  const keys = yKey ? [yKey] : yKeys || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        barCategoryGap={layout === 'vertical' ? 10 : 'auto'}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
          </>
        )}
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
          <Bar
            key={key}
            dataKey={key}
            fill={colors[idx % colors.length]}
            stackId={stacked ? 'stack' : undefined}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
};
export default BarChart;
