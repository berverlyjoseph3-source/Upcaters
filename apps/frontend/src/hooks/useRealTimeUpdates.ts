// enterprise-ai-agent-platform/apps/frontend/src/hooks/useRealTimeUpdates.ts
import { useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '../store/dashboard.store';
import { WebSocketService, webSocketService } from '../services/websocket.service';
import { DashboardType, DashboardUpdateEvent } from '../types/dashboard.types';

export const useRealTimeUpdates = (dashboardType: DashboardType, enabled: boolean = true) => {
  const { updateMetric, setLastUpdated } = useDashboardStore();
  const wsRef = useRef < WebSocketService | null > (null);
  
  const handleMetricUpdate = useCallback((event: DashboardUpdateEvent) => {
    if (event.dashboardType === dashboardType) {
      updateMetric(dashboardType, event.metricId, event.newValue);
      setLastUpdated(new Date());
    }
  }, [dashboardType, updateMetric, setLastUpdated]);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Initialize WebSocket connection
    const ws = webSocketService;
    wsRef.current = ws;
    ws.connect();
    
    // Subscribe to metric updates for this dashboard
    const unsubscribe = ws.subscribeToDashboard(dashboardType, handleMetricUpdate);
    
    return () => {
      unsubscribe();
      // Do not disconnect globally because other dashboards might use it
    };
  }, [dashboardType, enabled, handleMetricUpdate]);
  
  return {
    isConnected: wsRef.current?.isConnected() ?? false,
  };
};