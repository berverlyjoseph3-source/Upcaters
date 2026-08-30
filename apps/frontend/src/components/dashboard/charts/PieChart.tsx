// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/PieChart.tsx
import React from 'react';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface PieChartProps {
  data: Array < { name: string;value: number } > ;
  colors ? : string[];
  innerRadius ? : number;
  outerRadius ? : number;
  height ? : number;
  showLegend ? : boolean;
  showLabels ? : boolean;
}

const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec489a', '#06b6d4', '#84cc16'];

export const PieChart: React.FC < PieChartProps > = ({
  data,
  colors = defaultColors,
  innerRadius = 0,
  outerRadius = 80,
  height = 300,
  showLegend = true,
  showLabels = false,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / total) * 100).toFixed(0);
    return `${entry.name}: ${percent}%`;
  };
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={showLabels ? renderLabel : undefined}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value.toLocaleString()}`, 'Value']}
          contentStyle={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </RePieChart>
    </ResponsiveContainer>
  );
};
export default PieChart;
