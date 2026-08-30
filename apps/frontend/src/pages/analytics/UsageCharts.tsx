// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/UsageCharts.tsx
import React, { useState } from 'react';
import { DailyUsage, UsageByAgent, UsageByAction } from '../../types/analytics.types';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { LineChart, BarChart, PieChart } from '../../components/dashboard/charts';
import { format } from 'date-fns';

interface UsageChartsProps {
  dailyUsage: DailyUsage[];
  byAgent: UsageByAgent[];
  byAction: UsageByAction[];
  topActions: UsageByAction[];
}

type ChartMetric = 'aiActions' | 'apiCalls' | 'cost';

export const UsageCharts: React.FC < UsageChartsProps > = ({ dailyUsage, byAgent, byAction, topActions }) => {
  const [metric, setMetric] = useState < ChartMetric > ('aiActions');
  
  const dailyData = dailyUsage.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    aiActions: day.aiActions,
    apiCalls: day.apiCalls,
    cost: day.cost,
  }));
  
  const pieData = byAgent.map(agent => ({
    name: agent.agentType.charAt(0).toUpperCase() + agent.agentType.slice(1),
    value: agent.count,
  }));
  
  const metricOptions = [
    { id: 'aiActions', label: 'AI Actions' },
    { id: 'apiCalls', label: 'API Calls' },
    { id: 'cost', label: 'Cost' },
  ];
  
  return (
    <div className="space-y-6">
      {/* Daily Usage Trend */}
      <ChartContainer title="Daily Usage Trend" description="Usage pattern over time">
        <div className="mb-4 flex justify-end gap-2">
          {metricOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setMetric(opt.id as ChartMetric)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                metric === opt.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <LineChart
          data={dailyData}
          xKey="date"
          yKey={metric}
          color={metric === 'aiActions' ? '#3b82f6' : metric === 'apiCalls' ? '#10b981' : '#8b5cf6'}
        />
      </ChartContainer>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Usage by Agent" description="Distribution across agents">
          <BarChart data={byAgent} xKey="agentType" yKey="count" color="#f59e0b" />
        </ChartContainer>
        <ChartContainer title="Usage Distribution" description="Share by agent">
          <PieChart data={pieData} />
        </ChartContainer>
      </div>

      {/* Top Actions */}
      <ChartContainer title="Top Actions" description="Most frequently used actions">
        <BarChart
          data={topActions.map(a => ({ actionType: a.actionType.replace(/_/g, ' '), count: a.count }))}
          xKey="actionType"
          yKey="count"
          color="#ec489a"
          layout="vertical"
        />
      </ChartContainer>
    </div>
  );
};
export default UsageCharts;
