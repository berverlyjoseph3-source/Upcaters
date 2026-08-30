// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/CustomerSegmentation.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users, TrendingUp, AlertTriangle, Moon } from 'lucide-react';

interface SegmentationData {
  highValue: number;
  newSales: number;
  atRisk: number;
  dormant: number;
}

interface CustomerSegmentationProps {
  data: SegmentationData;
  onSegmentClick ? : (segment: string) => void;
}

const SEGMENT_CONFIG = {
  highValue: { label: 'High-Value', color: '#10b981', icon: TrendingUp, description: 'Loyal, high-spending customers' },
  newSales: { label: 'New Sales', color: '#3b82f6', icon: Users, description: 'Acquired in last 30 days' },
  atRisk: { label: 'At-Risk', color: '#f59e0b', icon: AlertTriangle, description: 'Decreasing engagement' },
  dormant: { label: 'Dormant', color: '#6b7280', icon: Moon, description: 'No activity in 90+ days' },
};

export const CustomerSegmentation: React.FC < CustomerSegmentationProps > = ({ data, onSegmentClick }) => {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: SEGMENT_CONFIG[key as keyof SegmentationData].label,
    value,
    originalKey: key,
  }));
  
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  const handleClick = (entry: any) => {
    if (onSegmentClick) {
      onSegmentClick(entry.originalKey);
    }
  };
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-3">Customer Segmentation</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onClick={handleClick}
                cursor={onSegmentClick ? 'pointer' : 'default'}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={SEGMENT_CONFIG[entry.originalKey as keyof SegmentationData].color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${((value / total) * 100).toFixed(1)}%`, 'Share']}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px', border: 'none' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => {
            const config = SEGMENT_CONFIG[key as keyof SegmentationData];
            const Icon = config.icon;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return (
              <div
                key={key}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 cursor-pointer transition-colors"
                onClick={() => onSegmentClick?.(key)}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${config.color}20` }}>
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-white">{config.label}</p>
                    <p className="text-xs text-secondary-500">{config.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white">{value.toLocaleString()}</p>
                  <p className="text-xs text-secondary-500">{percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div> 
    </div>
  );
};
export default CustomerSegmentation;
