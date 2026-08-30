// enterprise-ai-agent-platform/apps/frontend/src/types/dashboard.types.ts

export type DashboardType = 'operational' | 'analytical' | 'strategic' | 'tactical' | 'informational';

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface FilterOptions {
  dateRange: TimeRange;
  productType ? : string[];
  region ? : string[];
  minPrice ? : number;
  maxPrice ? : number;
  segment ? : 'high-value' | 'new-sales' | 'at-risk' | 'dormant';
}

export interface KpiValue {
  current: number;
  previous: number;
  unit ? : string;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

export interface KpiCardData {
  id: string;
  title: string;
  value: KpiValue;
  icon ? : string;
  color ? : string;
  description ? : string;
}

// Operational Dashboard
export interface OperationalMetrics {
  inventoryLevel: number;
  systemUptime: number;
  activeSupportTickets: number;
  hourlySales: Array < { hour: string;amount: number } > ;
  ticketStatus: { open: number;inProgress: number;resolved: number };
  serverLoad: number;
  orderFulfillment: number;
  last24HoursRevenue: number;
}

// Analytical Dashboard
export interface AnalyticalMetrics {
  revenueVsCostVsProfit: Array < { month: string;revenue: number;cost: number;profit: number } > ;
  variableCorrelation: {
    customerSpend: number[];
    capaSpend: number[];
    engagement: number[];
    churnRate: number[];
  };
  customerSegmentation: {
    highValue: number;
    newSales: number;
    atRisk: number;
    dormant: number;
  };
  varianceAnalysis: {
    rSquared: number;
    impact: number;
    nextQuarterProjection: number;
  };
  forecastedSales: {
    zeros: number;
    steady: number;
    fast: number;
    close: number;
    read: number;
    ties: number;
    actualVsBudget: number;
  };
}

// Strategic Dashboard
export interface StrategicMetrics {
  revenue: KpiValue;
  profitMargin: number;
  marketShare: Array < { year: number;share: number } > ;
  competitivePositioning: Array < { year: number;position: number } > ;
  yoyRevenueGrowth: number;
  yoyProfitGrowth: number;
  initiatives: Array < { name: string;progress: number;status: string } > ;
  riskAssessment: { openTexts: number;aditiin: number };
  projectedRevenue: Array < { year: number;optimistic: number;pessimistic: number;base: number } > ;
}

// Tactical Dashboard
export interface TacticalMetrics {
  projectTracking: Array < { project: string;progress: number;status: string;dueDate: string } > ;
  departmentKPIs: {
    salesGrowth: number;
    operationalEfficiency: number;
    customerSatisfaction: number;
  };
  resourceUtilization: {
    teamA: { available: number;allocated: number };
    teamB: { available: number;allocated: number };
    teamC: { available: number;allocated: number };
    teamD: { available: number;allocated: number };
  };
  midTermGoals: Array < { goal: string;target: string;actual: string;status: string } > ;
  tasks: Array < { task: string;priority: 'High' | 'Medium' | 'Low';dueDate: string } > ;
  teamPerformance: {
    instrumentalProductivity: number;
    groupProgramActivity: number;
    groupProgramInitiative: number;
  };
  budgetTracking: {
    marketingCampaign: number;
    xeroing: number;
    productDevelopment: number;
    training: number;
  };
  issueRiskTracking: Array < { issue: string;status: string;duration: string;resolution ? : string } > ;
}

// Informational Dashboard
export interface InformationalMetrics {
  globalWellbeingIndex: number;
  regionalHappiness: Array < { region: string;score: number } > ;
  wellnessTrend: Array < { month: string;score: number } > ;
  educationFund: number;
  globalEducationFund: number;
  digitalAccessInitiative: string;
  contributors: { education: number;healthcare: number;environment: number };
  demographics: { age18_35: number;age36_55: number;age56plus: number };
  literacyRate: number;
  newJobsReached: number;
  peopleReached: number;
}

// Real-time update event
export interface DashboardUpdateEvent {
  dashboardType: DashboardType;
  metricId: string;
  newValue: any;
  timestamp: Date;
}

// WebSocket message types
export enum WebSocketMessageType {
  METRIC_UPDATE = 'metric_update',
    BULK_UPDATE = 'bulk_update',
    CONNECTED = 'connected',
    ERROR = 'error',
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

export interface DashboardState {
  activeDashboard: DashboardType;
  filters: FilterOptions;
  operational: OperationalMetrics | null;
  analytical: AnalyticalMetrics | null;
  strategic: StrategicMetrics | null;
  tactical: TacticalMetrics | null;
  informational: InformationalMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}