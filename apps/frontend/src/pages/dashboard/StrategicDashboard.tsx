// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/StrategicDashboard.tsx
import React, { useMemo } from 'react';
import { useDashboardStore } from '../../store/dashboard.store';
import { KpiCard } from '../../components/dashboard/common/KpiCard';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { LineChart, BarChart, GaugeChart } from '../../components/dashboard/charts';
import { InitiativeTracker } from '../../components/dashboard/widgets/InitiativeTracker';
import { RiskAssessment } from '../../components/dashboard/widgets/RiskAssessment';
import { TrendingUp, TrendingDown, Target, Shield, BarChart3, LineChart as LineChartIcon } from 'lucide-react';

export const StrategicDashboard: React.FC = () => {
  const { strategic, isLoading } = useDashboardStore();

  if (isLoading || !strategic) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    revenue,
    profitMargin,
    marketShare,
    competitivePositioning,
    yoyRevenueGrowth,
    yoyProfitGrowth,
    initiatives,
    riskAssessment,
    projectedRevenue,
  } = strategic;

  const revenueKpi = {
    id: 'revenue',
    title: 'Revenue',
    value: revenue,
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-green-500',
    unit: 'USD',
  };

  const profitKpi = {
    id: 'profitMargin',
    title: 'Profit Margin',
    value: { current: profitMargin, previous: 25, trend: 'up' as const, percentageChange: 12 },
    icon: <Target className="h-5 w-5" />,
    color: 'bg-blue-500',
    unit: '%',
  };

  const marketShareData = useMemo(() => {
    return marketShare.map(ms => ({ year: ms.year, share: ms.share }));
  }, [marketShare]);

  const competitiveData = useMemo(() => {
    return competitivePositioning.map(cp => ({ year: cp.year, position: cp.position }));
  }, [competitivePositioning]);

  const projectedData = useMemo(() => {
    return projectedRevenue.map(pr => ({
      year: pr.year,
      Optimistic: pr.optimistic,
      Base: pr.base,
      Pessimistic: pr.pessimistic,
    }));
  }, [projectedRevenue]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard {...revenueKpi} />
        <KpiCard {...profitKpi} />
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-secondary-500">YoY Revenue Growth</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{yoyRevenueGrowth}%</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-secondary-500">YoY Profit Growth</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{yoyProfitGrowth}%</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <LineChartIcon className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Market Share & Competitive Positioning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Market Share (5-Year)" description="Company market share trend">
          <LineChart data={marketShareData} xKey="year" yKey="share" color="#3b82f6" />
        </ChartContainer>

        <ChartContainer title="Competitive Positioning" description="Relative market position">
          <LineChart data={competitiveData} xKey="year" yKey="position" color="#f59e0b" />
        </ChartContainer>
      </div>

      {/* Strategic Initiatives & Risk Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InitiativeTracker initiatives={initiatives} />
        <RiskAssessment risks={riskAssessment} />
      </div>

      {/* Future Forecasting */}
      <ChartContainer title="Projected Revenue (2025-2027)" description="Optimistic, Base, and Pessimistic scenarios">
        <LineChart data={projectedData} xKey="year" yKeys={['Optimistic', 'Base', 'Pessimistic']} />
      </ChartContainer>

      {/* Strategic Summary */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Strategic Summary</h3>
        <p className="text-primary-100 mb-4">
          Based on current trends and market conditions, the company is on track to achieve 15% revenue growth and expand market share to 18% by end of fiscal year.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-white/20 rounded-lg px-3 py-1">Priority: Market Expansion</div>
          <div className="bg-white/20 rounded-lg px-3 py-1">Risk Level: Moderate</div>
          <div className="bg-white/20 rounded-lg px-3 py-1">Next Review: Q2 2025</div>
        </div>
      </div>
    </div>
  );
};
export default StrategicDashboard;
