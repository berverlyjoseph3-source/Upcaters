// enterprise-ai-agent-platform/apps/frontend/src/store/dashboard.store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  DashboardType,
  FilterOptions,
  OperationalMetrics,
  AnalyticalMetrics,
  StrategicMetrics,
  TacticalMetrics,
  InformationalMetrics,
  DashboardState,
} from '../types/dashboard.types';
import { dashboardService } from '../services/dashboard.service';

const defaultFilters: FilterOptions = {
  dateRange: {
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
    label: 'Last 30 days',
  },
};

interface DashboardStore extends DashboardState {
  // Actions
  setActiveDashboard: (dashboard: DashboardType) => void;
  setFilters: (filters: Partial < FilterOptions > ) => void;
  resetFilters: () => void;
  loadDashboardData: (dashboardType: DashboardType, filters ? : FilterOptions) => Promise < void > ;
  updateMetric: (dashboardType: DashboardType, metricId: string, newValue: any) => void;
  setLastUpdated: (timestamp: Date) => void;
  clearError: () => void;
  refreshAll: () => Promise < void > ;
}

export const useDashboardStore = create < DashboardStore > ()(
  devtools(
    (set, get) => ({
      // Initial state
      activeDashboard: 'operational',
      filters: defaultFilters,
      operational: null,
      analytical: null,
      strategic: null,
      tactical: null,
      informational: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      setActiveDashboard: (dashboard) => set({ activeDashboard: dashboard }),
      
      setFilters: (filters) => {
        const newFilters = { ...get().filters, ...filters };
        set({ filters: newFilters });
        // Reload current dashboard with new filters
        const { activeDashboard } = get();
        get().loadDashboardData(activeDashboard, newFilters);
      },
      
      resetFilters: () => {
        set({ filters: defaultFilters });
        const { activeDashboard } = get();
        get().loadDashboardData(activeDashboard, defaultFilters);
      },
      
      loadDashboardData: async (dashboardType, filters = get().filters) => {
        set({ isLoading: true, error: null });
        try {
          let data;
          switch (dashboardType) {
            case 'operational':
              data = await dashboardService.getOperationalMetrics(filters);
              set({ operational: data });
              break;
            case 'analytical':
              data = await dashboardService.getAnalyticalMetrics(filters);
              set({ analytical: data });
              break;
            case 'strategic':
              data = await dashboardService.getStrategicMetrics(filters);
              set({ strategic: data });
              break;
            case 'tactical':
              data = await dashboardService.getTacticalMetrics(filters);
              set({ tactical: data });
              break;
            case 'informational':
              data = await dashboardService.getInformationalMetrics(filters);
              set({ informational: data });
              break;
            default:
              throw new Error(`Unknown dashboard type: ${dashboardType}`);
          }
          set({ lastUpdated: new Date(), isLoading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
          set({ error: errorMessage, isLoading: false });
          console.error(`Error loading ${dashboardType} dashboard:`, err);
        }
      },
      
      updateMetric: (dashboardType, metricId, newValue) => {
        const state = get();
        const currentData = state[dashboardType];
        if (!currentData) return;
        
        // Deep update the specific metric – simplified for brevity; in production use immutable update helpers
        const updatedData = { ...currentData, [metricId]: newValue };
        set({
          [dashboardType]: updatedData, lastUpdated: new Date() });
      },
      
      setLastUpdated: (timestamp) => set({ lastUpdated: timestamp }),
      
      clearError: () => set({ error: null }),
      
      refreshAll: async () => {
        const { activeDashboard, filters } = get();
        await get().loadDashboardData(activeDashboard, filters);
      },
    }), { name: 'dashboard-store' }
  )
);