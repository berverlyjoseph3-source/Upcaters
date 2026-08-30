// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/RegionalPerformance.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapPin, TrendingUp, TrendingDown } from 'lucide-react';

interface RegionData {
  region: string;
  sales: number;
  growth: number;
  target: number;
}

interface RegionalPerformanceProps {
  data: RegionData[];
  onRegionClick ? : (region: string) => void;
}

const getGrowthColor = (growth: number) => {
  if (growth > 10) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-yellow-600';
};

export const RegionalPerformance: React.FC < RegionalPerformanceProps > = ({ data, onRegionClick }) => {
  const totalSales = data.reduce((sum, r) => sum + r.sales, 0);
  const avgGrowth = data.reduce((sum, r) => sum + r.growth, 0) / data.length;
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Regional Performance</h3>
        <MapPin className="h-5 w-5 text-secondary-400" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
        <div>
          <p className="text-xs text-secondary-500">Total Sales</p>
          <p className="text-xl font-bold text-secondary-900 dark:text-white">${(totalSales / 1000).toFixed(0)}K</p>
        </div>
        <div>
          <p className="text-xs text-secondary-500">Avg Growth</p>
          <div className="flex items-center gap-1">
            {avgGrowth >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            <span className={`text-xl font-bold ${getGrowthColor(avgGrowth)}`}>{avgGrowth > 0 ? '+' : ''}{avgGrowth.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="region" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${v/1000}K`} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Sales']}
              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={(data) => onRegionClick?.(data.region)} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Region table */}
      <div className="space-y-2">
        {data.map(region => (
          <div
            key={region.region}
            onClick={() => onRegionClick?.(region.region)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 cursor-pointer transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">{region.region}</p>
              <p className="text-xs text-secondary-500">Target: ${(region.target / 1000).toFixed(0)}K</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-secondary-900 dark:text-white">${(region.sales / 1000).toFixed(0)}K</p>
              <div className="flex items-center gap-1 justify-end">
                {region.growth >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                <span className={`text-xs ${getGrowthColor(region.growth)}`}>{region.growth > 0 ? '+' : ''}{region.growth}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RegionalPerformance;
