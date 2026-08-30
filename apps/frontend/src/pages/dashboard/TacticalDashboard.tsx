// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/TacticalDashboard.tsx
import React, { useMemo } from 'react';
import { useDashboardStore } from '../../store/dashboard.store';
import { KpiCard } from '../../components/dashboard/common/KpiCard';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { BarChart, GaugeChart } from '../../components/dashboard/charts';
import { DataTable } from '../../components/dashboard/tables/DataTable';
import { TaskTable } from '../../components/dashboard/tables/TaskTable';
import { ResourceUtilization } from '../../components/dashboard/widgets/ResourceUtilization';
import { BudgetTracking } from '../../components/dashboard/widgets/BudgetTracking';
import { Activity, Target, Users, DollarSign, Clock, TrendingUp } from 'lucide-react';

export const TacticalDashboard: React.FC = () => {
  const { tactical, isLoading } = useDashboardStore();

  if (isLoading || !tactical) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    departmentKPIs,
    resourceUtilization,
    midTermGoals,
    tasks,
    teamPerformance,
    budgetTracking,
    issueRiskTracking,
  } = tactical;

  const kpiCards = [
    {
      id: 'salesGrowth',
      title: 'Sales Growth (MoM)',
      value: { current: departmentKPIs.salesGrowth, previous: 12, trend: 'up' as const, percentageChange: 58 },
      icon: TrendingUp,
      color: 'bg-green-500',
      unit: '%',
    },
    {
      id: 'operationalEfficiency',
      title: 'Operational Efficiency',
      value: { current: departmentKPIs.operationalEfficiency, previous: 108, trend: 'up' as const, percentageChange: 11 },
      icon: Activity,
      color: 'bg-blue-500',
      unit: 'units/hr',
    },
    {
      id: 'customerSatisfaction',
      title: 'Customer Satisfaction',
      value: { current: departmentKPIs.customerSatisfaction, previous: 82, trend: 'up' as const, percentageChange: 3.7 },
      icon: Target,
      color: 'bg-purple-500',
      unit: '%',
    },
  ];

  const teamProductivityData = useMemo(() => ({
    labels: ['Team A', 'Team B', 'Team C', 'Team D'],
    values: [
      teamPerformance.instrumentalProductivity,
      teamPerformance.groupProgramActivity,
      teamPerformance.groupProgramInitiative,
      78, // placeholder for Team D
    ],
  }), [teamPerformance]);

  const goalProgressData = useMemo(() => {
    return midTermGoals.map(goal => ({
      name: goal.goal,
      progress: parseInt(goal.actual) || 0,
      target: parseInt(goal.target) || 100,
    }));
  }, [midTermGoals]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map(kpi => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Resource Utilization & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResourceUtilization data={resourceUtilization} />
        <ChartContainer title="Team Productivity" description="Weekly output by team">
          <BarChart data={teamProductivityData.labels.map((l, i) => ({ name: l, value: teamProductivityData.values[i] }))} xKey="name" yKey="value" color="#10b981" />
        </ChartContainer>
      </div>

      {/* Mid-Term Goals Progress */}
      <ChartContainer title="Mid-Term Goals Progress" description="Target vs Actual completion">
        <BarChart data={goalProgressData} xKey="name" yKeys={['progress', 'target']} />
      </ChartContainer>

      {/* Budget Tracking */}
      <BudgetTracking data={budgetTracking} />

      {/* Tasks & Issues Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskTable tasks={tasks} />
        <DataTable
          title="Issue / Risk Tracking"
          columns={[
            { key: 'issue', label: 'Issue/Risk' },
            { key: 'status', label: 'Status' },
            { key: 'duration', label: 'Duration' },
            { key: 'resolution', label: 'Resolution Timeline' },
          ]}
          data={issueRiskTracking}
        />
      </div>
    </div>
  );
};
