// enterprise-ai-agent-platform/apps/frontend/src/hooks/useRealtime.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../store/auth.store';

interface RealtimeEvent {
  type: string;
  payload: any;
  timestamp: number;
}

interface UseRealtimeOptions {
  channels ? : string[];
  onAgentUpdate ? : (agentType: string, status: string, data ? : any) => void;
  onNotification ? : (title: string, message: string, data ? : any) => void;
  onUsageUpdate ? : (aiActions: { used: number;limit: number }, apiCalls: { used: number;limit: number }) => void;
  autoConnect ? : boolean;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  events: RealtimeEvent[];
  clearEvents: () => void;
  sendAgentUpdate: (agentType: string, status: string, data ? : any) => void;
  sendNotification: (title: string, message: string, data ? : any) => void;
}

export const useRealtime = (options: UseRealtimeOptions = {}): UseRealtimeReturn => {
  const [events, setEvents] = useState < RealtimeEvent[] > ([]);
  const [lastEvent, setLastEvent] = useState < RealtimeEvent | null > (null);
  const { isAuthenticated } = useAuthStore();
  
  const messageHandler = useCallback((data: any) => {
    const event: RealtimeEvent = {
      type: data.type,
      payload: data.payload,
      timestamp: data.timestamp || Date.now(),
    };
    
    setEvents(prev => [event, ...prev].slice(0, 100));
    setLastEvent(event);
    
    switch (data.type) {
      case 'agent_update':
        options.onAgentUpdate?.(data.payload.agentType, data.payload.status, data.payload.data);
        break;
      case 'notification':
        options.onNotification?.(data.payload.title, data.payload.message, data.payload.data);
        break;
      case 'usage_update':
        options.onUsageUpdate?.(
          data.payload.aiActions,
          data.payload.apiCalls
        );
        break;
    }
  }, [options.onAgentUpdate, options.onNotification, options.onUsageUpdate]);
  
  const { isConnected, sendMessage, subscribe, unsubscribe, connect, disconnect } = useWebSocket({
    autoConnect: options.autoConnect !== false && isAuthenticated,
    onMessage: messageHandler,
  });
  
  // Subscribe to channels when connected
  useEffect(() => {
    if (isConnected && options.channels?.length) {
      options.channels.forEach(channel => subscribe(channel));
    }
  }, [isConnected, options.channels, subscribe]);
  
  // Reconnect when authentication changes
  useEffect(() => {
    if (isAuthenticated && options.autoConnect !== false) {
      connect();
    } else if (!isAuthenticated) {
      disconnect();
    }
  }, [isAuthenticated, options.autoConnect, connect, disconnect]);
  
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);
  
  const sendAgentUpdate = useCallback((agentType: string, status: string, data ? : any) => {
    sendMessage({
      type: 'agent_update',
      payload: { agentType, status, data },
      timestamp: Date.now(),
    });
  }, [sendMessage]);
  
  const sendNotification = useCallback((title: string, message: string, data ? : any) => {
    sendMessage({
      type: 'notification',
      payload: { title, message, data },
      timestamp: Date.now(),
    });
  }, [sendMessage]);
  
  return {
    isConnected,
    lastEvent,
    events,
    clearEvents,
    sendAgentUpdate,
    sendNotification,
  };
};