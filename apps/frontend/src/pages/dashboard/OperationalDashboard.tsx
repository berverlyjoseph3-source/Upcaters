// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/OperationalDashboard.tsx
import React, { useMemo } from 'react';
import { useDashboardStore } from '../../store/dashboard.store';
import { KpiCard } from '../../components/dashboard/common/KpiCard';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { LineChart, BarChart, GaugeChart } from '../../components/dashboard/charts';
import { Activity, Package, Server, Ticket, DollarSign, Zap } from 'lucide-react';

export const OperationalDashboard: React.FC = () => {
  const { operational, isLoading } = useDashboardStore();

  if (isLoading || !operational) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    inventoryLevel,
    systemUptime,
    activeSupportTickets,
    hourlySales,
    ticketStatus,
    serverLoad,
    orderFulfillment,
    last24HoursRevenue,
  } = operational;

  const kpiCards = [
    {
      id: 'inventory',
      title: 'Inventory Level',
      value: { current: inventoryLevel, previous: inventoryLevel * 0.95, trend: 'up' as const, percentageChange: 5 },
      icon: <Package className="h-5 w-5" />,
      color: 'bg-blue-500',
    },
    {
      id: 'uptime',
      title: 'System Uptime',
      value: { current: systemUptime, previous: 99.5, trend: 'stable' as const, percentageChange: 0.3 },
      icon: <Server className="h-5 w-5" />,
      color: 'bg-green-500',
      unit: '%',
    },
    {
      id: 'tickets',
      title: 'Active Support Tickets',
      value: { current: activeSupportTickets, previous: 18, trend: 'down' as const, percentageChange: -33 },
      icon: <Ticket className="h-5 w-5" />,
      color: 'bg-yellow-500',
    },
    {
      id: 'revenue',
      title: 'Last 24h Revenue',
      value: { current: last24HoursRevenue, previous: 85000, trend: 'up' as const, percentageChange: 17.6 },
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-purple-500',
      unit: 'USD',
    },
  ];

  const hourlySalesData = useMemo(() => {
    return hourlySales.map(h => ({ name: h.hour, sales: h.amount }));
  }, [hourlySales]);

  const ticketStatusData = useMemo(() => {
    return [
      { name: 'Open', value: ticketStatus.open },
      { name: 'In Progress', value: ticketStatus.inProgress },
      { name: 'Resolved', value: ticketStatus.resolved },
    ];
  }, [ticketStatus]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(kpi => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Hourly Sales (Last 24 Hours)" description="Sales trend by hour">
          <LineChart data={hourlySalesData} xKey="name" yKey="sales" color="#3b82f6" />
        </ChartContainer>

        <ChartContainer title="Support Ticket Status" description="Current ticket distribution">
          <BarChart data={ticketStatusData} xKey="name" yKey="value" color="#f59e0b" />
        </ChartContainer>
      </div>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary-500">Server Load</h3>
            <Zap className="h-4 w-4 text-secondary-400" />
          </div>
          <GaugeChart value={serverLoad} min={0} max={100} unit="%" />
          <p className="text-xs text-secondary-500 mt-2 text-center">
            {serverLoad < 70 ? 'Normal load' : serverLoad < 90 ? 'High load' : 'Critical load'}
          </p>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary-500">Order Fulfillment</h3>
            <Activity className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-3xl font-bold text-secondary-900 dark:text-white">{orderFulfillment}</span>
            <span className="text-secondary-500">orders/min</span>
          </div>
          <div className="mt-3 h-2 bg-secondary-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (orderFulfillment / 100) * 100)}%` }} />
          </div>
          <p className="text-xs text-secondary-500 mt-2 text-center">Peak: 145 orders/min at 14:30</p>
        </div>

        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-secondary-500">Active Issues</h3>
            <AlertCircle className="h-4 w-4 text-secondary-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>High Priority</span>
              <span className="font-medium text-red-600">3</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Medium Priority</span>
              <span className="font-medium text-yellow-600">7</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Low Priority</span>
              <span className="font-medium text-blue-600">12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OperationalDashboard;
