// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/AnalyticalDashboard.tsx
import React, { useMemo, useState } from 'react';
import { useDashboardStore } from '../../store/dashboard.store';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { LineChart, BarChart, CorrelationMatrix, HeatMap } from '../../components/dashboard/charts';
import { CustomerSegmentation } from '../../components/dashboard/widgets/CustomerSegmentation';
import { FilterBar } from '../../components/dashboard/common/FilterBar';
import { MetricSelector } from '../../components/dashboard/common/MetricSelector';
import { DrillDownModal } from '../../components/dashboard/common/DrillDownModal';
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';

export const AnalyticalDashboard: React.FC = () => {
  const { analytical, isLoading, filters, setFilters } = useDashboardStore();
  const [drillDownMetric, setDrillDownMetric] = useState < string | null > (null);
  
  if (isLoading || !analytical) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  const {
    revenueVsCostVsProfit,
    variableCorrelation,
    customerSegmentation,
    varianceAnalysis,
    forecastedSales,
  } = analytical;
  
  const revenueProfitData = useMemo(() => {
    return revenueVsCostVsProfit.map(item => ({
      month: item.month,
      Revenue: item.revenue,
      Cost: item.cost,
      Profit: item.profit,
    }));
  }, [revenueVsCostVsProfit]);
  
  const correlationData = useMemo(() => {
    return {
      variables: ['Customer Spend', 'CAPA Spend', 'Engagement', 'Churn Rate'],
      matrix: [
        [1, 0.72, 0.65, -0.58],
        [0.72, 1, 0.68, -0.62],
        [0.65, 0.68, 1, -0.71],
        [-0.58, -0.62, -0.71, 1],
      ],
    };
  }, []);
  
  const forecastData = useMemo(() => {
    return [
      { quarter: 'Q1 2024', actual: 210, forecast: 205 },
      { quarter: 'Q2 2024', actual: 235, forecast: 228 },
      { quarter: 'Q3 2024', actual: 258, forecast: 252 },
      { quarter: 'Q4 2024', actual: 275, forecast: 270 },
      { quarter: 'Q1 2025', actual: null, forecast: 295 },
      { quarter: 'Q2 2025', actual: null, forecast: 310 },
    ];
  }, []);
  
  const handleDrillDown = (metric: string) => {
    setDrillDownMetric(metric);
  };
  
  return (
    <div className="space-y-6">
      {/* Variance & Forecast Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-secondary-500">R-squared</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{varianceAnalysis.rSquared}</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-secondary-500 mt-2">Model explains {Math.round(varianceAnalysis.rSquared * 100)}% of variance</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-secondary-500">Impact Factor</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{varianceAnalysis.impact}%</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-secondary-500 mt-2">Next quarter projection: +{varianceAnalysis.nextQuarterProjection}%</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-secondary-500">Forecast Accuracy</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">94.2%</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <PieChart className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-secondary-500 mt-2">MAPE: 5.8%</p>
        </div>
      </div>

      {/* Revenue vs Cost vs Profit */}
      <ChartContainer title="Revenue vs Cost vs Profit" description="Monthly trend analysis">
        <LineChart data={revenueProfitData} xKey="month" yKeys={['Revenue', 'Cost', 'Profit']} />
      </ChartContainer>

      {/* Variable Correlation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Variable Correlation Matrix" description="Pearson correlation coefficients">
          <CorrelationMatrix data={correlationData.matrix} labels={correlationData.variables} />
        </ChartContainer>

        <ChartContainer title="Forecasted Sales" description="Actual vs Budget projection">
          <BarChart data={forecastData} xKey="quarter" yKeys={['actual', 'forecast']} />
        </ChartContainer>
      </div>

      {/* Customer Segmentation & Heat Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustomerSegmentation data={customerSegmentation} onSegmentClick={handleDrillDown} />
        
        <ChartContainer title="Regional Performance Heat Map" description="Sales intensity by region">
          <HeatMap
            data={[
              { region: 'North America', value: 92 },
              { region: 'Europe', value: 78 },
              { region: 'Asia Pacific', value: 85 },
              { region: 'Latin America', value: 54 },
              { region: 'Middle East', value: 62 },
              { region: 'Africa', value: 38 },
            ]}
            xKey="region"
            yKey="value"
          />
        </ChartContainer>
      </div>

      {/* Drill Down Modal */}
      {drillDownMetric && (
        <DrillDownModal
          metric={drillDownMetric}
          data={customerSegmentation}
          onClose={() => setDrillDownMetric(null)}
        />
      )}
    </div>
  );
};
export default AnalyticalDashboard;
