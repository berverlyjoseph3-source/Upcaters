// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/charts/GaugeChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  value: number;
  min ? : number;
  max ? : number;
  unit ? : string;
  segments ? : { from: number;to: number;color: string;label ? : string } [];
  height ? : number;
  title ? : string;
}

const defaultSegments = [
  { from: 0, to: 30, color: '#ef4444', label: 'Critical' },
  { from: 30, to: 70, color: '#f59e0b', label: 'Warning' },
  { from: 70, to: 100, color: '#10b981', label: 'Good' },
];

export const GaugeChart: React.FC < GaugeChartProps > = ({
  value,
  min = 0,
  max = 100,
  unit = '%',
  segments = defaultSegments,
  height = 200,
  title,
}) => {
  const normalizedValue = Math.min(max, Math.max(min, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;
  
  // Gauge uses two data points: value and remaining
  const gaugeData = [
    { name: 'Value', value: percentage, fill: getColorForValue(percentage) },
    { name: 'Remaining', value: 100 - percentage, fill: '#e2e8f0' },
  ];
  
  function getColorForValue(val: number): string {
    for (const seg of segments) {
      if (val >= seg.from && val <= seg.to) return seg.color;
    }
    return segments[0]?.color || '#3b82f6';
  }
  
  const activeSegment = segments.find(s => percentage >= s.from && percentage <= s.to);
  
  return (
    <div className="w-full text-center">
      {title && <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="90%"
            dataKey="value"
            stroke="none"
            cornerRadius={10}
          >
            {gaugeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2">
        <span className="text-2xl font-bold text-secondary-900 dark:text-white">
          {normalizedValue.toFixed(0)}{unit}
        </span>
        {activeSegment?.label && (
          <p className="text-xs text-secondary-500 mt-1">{activeSegment.label}</p>
        )}
      </div>
    </div>
  );
};
export default GaugeChart;
