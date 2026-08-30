// enterprise-ai-agent-platform/apps/frontend/src/services/dashboard.service.ts
import { apiClient } from '../api/client';
import {
  FilterOptions,
  OperationalMetrics,
  AnalyticalMetrics,
  StrategicMetrics,
  TacticalMetrics,
  InformationalMetrics,
} from '../types/dashboard.types';

class DashboardService {
  private buildQueryParams(filters: FilterOptions): URLSearchParams {
    const params = new URLSearchParams();
    params.append('startDate', filters.dateRange.start.toISOString());
    params.append('endDate', filters.dateRange.end.toISOString());
    if (filters.productType?.length) {
      filters.productType.forEach(pt => params.append('productType', pt));
    }
    if (filters.region?.length) {
      filters.region.forEach(r => params.append('region', r));
    }
    if (filters.minPrice !== undefined) {
      params.append('minPrice', String(filters.minPrice));
    }
    if (filters.maxPrice !== undefined) {
      params.append('maxPrice', String(filters.maxPrice));
    }
    if (filters.segment) {
      params.append('segment', filters.segment);
    }
    return params;
  }
  
  async getOperationalMetrics(filters: FilterOptions): Promise < OperationalMetrics > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < OperationalMetrics > (`/api/dashboard/operational?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch operational metrics');
    }
    return response.data;
  }
  
  async getAnalyticalMetrics(filters: FilterOptions): Promise < AnalyticalMetrics > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticalMetrics > (`/api/dashboard/analytical?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch analytical metrics');
    }
    return response.data;
  }
  
  async getStrategicMetrics(filters: FilterOptions): Promise < StrategicMetrics > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < StrategicMetrics > (`/api/dashboard/strategic?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch strategic metrics');
    }
    return response.data;
  }
  
  async getTacticalMetrics(filters: FilterOptions): Promise < TacticalMetrics > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < TacticalMetrics > (`/api/dashboard/tactical?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch tactical metrics');
    }
    return response.data;
  }
  
  async getInformationalMetrics(filters: FilterOptions): Promise < InformationalMetrics > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < InformationalMetrics > (`/api/dashboard/informational?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch informational metrics');
    }
    return response.data;
  }
}

export const dashboardService = new DashboardService();