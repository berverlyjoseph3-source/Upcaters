// enterprise-ai-agent-platform/apps/frontend/src/services/analytics.service.ts
import { apiClient } from '../api/client';
import { AnalyticsData, DateRange, ExportOptions, ExportResult, FilterOptions } from '../types/analytics.types';

class AnalyticsService {
  private buildQueryParams(filters: FilterOptions): URLSearchParams {
    const params = new URLSearchParams();
    params.append('startDate', filters.dateRange.start.toISOString());
    params.append('endDate', filters.dateRange.end.toISOString());
    
    if (filters.comparisonPeriod) {
      params.append('comparison', filters.comparisonPeriod);
    }
    
    if (filters.agentTypes?.length) {
      filters.agentTypes.forEach(at => params.append('agentType', at));
    }
    
    if (filters.actionTypes?.length) {
      filters.actionTypes.forEach(at => params.append('actionType', at));
    }
    
    return params;
  }
  
  async getAnalytics(filters: FilterOptions): Promise < AnalyticsData > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticsData > (`/api/analytics?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch analytics data');
    }
    return response.data;
  }
  
  async getUsageSummary(filters: FilterOptions): Promise < AnalyticsData['summary'] > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticsData['summary'] > (`/api/analytics/summary?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch usage summary');
    }
    return response.data;
  }
  
  async getDailyUsage(filters: FilterOptions): Promise < AnalyticsData['dailyUsage'] > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticsData['dailyUsage'] > (`/api/analytics/daily?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch daily usage');
    }
    return response.data;
  }
  
  async getUsageByAgent(filters: FilterOptions): Promise < AnalyticsData['byAgent'] > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticsData['byAgent'] > (`/api/analytics/by-agent?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch usage by agent');
    }
    return response.data;
  }
  
  async getUsageByAction(filters: FilterOptions): Promise < AnalyticsData['byAction'] > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticsData['byAction'] > (`/api/analytics/by-action?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch usage by action');
    }
    return response.data;
  }
  
  async getForecast(filters: FilterOptions): Promise < AnalyticsData['forecast'] > {
    const params = this.buildQueryParams(filters);
    const response = await apiClient.get < AnalyticsData['forecast'] > (`/api/analytics/forecast?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch forecast data');
    }
    return response.data;
  }
  
  async exportData(options: ExportOptions): Promise < ExportResult > {
    const response = await apiClient.post < ExportResult > ('/api/analytics/export', options);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to export data');
    }
    return response.data;
  }
  
  async downloadExport(url: string): Promise < void > {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.${url.split('.').pop() || 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }
}

export const analyticsService = new AnalyticsService();