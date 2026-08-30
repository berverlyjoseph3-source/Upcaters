// enterprise-ai-agent-platform/apps/frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { webSocketManager } from '../services/websocket.service';

interface UseWebSocketOptions {
  autoConnect ? : boolean;
  onMessage ? : (data: any) => void;
  onConnect ? : () => void;
  onDisconnect ? : () => void;
  onError ? : (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef < NodeJS.Timeout > ();
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;
  
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      options.onMessage?.(data);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, [options.onMessage]);
  
  const handleOpen = useCallback(() => {
    setIsConnected(true);
    setIsConnecting(false);
    setError(null);
    reconnectAttempts.current = 0;
    options.onConnect?.();
  }, [options.onConnect]);
  
  const handleClose = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    options.onDisconnect?.();
  }, [options.onDisconnect]);
  
  const handleError = useCallback((event: Event) => {
    const errorMsg = 'WebSocket connection error';
    setError(errorMsg);
    options.onError?.(event);
  }, [options.onError]);
  
  const connect = useCallback(() => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    webSocketManager.connect({
      onMessage: handleMessage,
      onOpen: handleOpen,
      onClose: handleClose,
      onError: handleError,
    });
  }, [isConnected, isConnecting, handleMessage, handleOpen, handleClose, handleError]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    webSocketManager.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
  }, []);
  
  const sendMessage = useCallback((message: any) => {
    if (!isConnected) {
      console.warn('WebSocket is not connected');
      return;
    }
    webSocketManager.send(message);
  }, [isConnected]);
  
  const subscribe = useCallback((channel: string) => {
    if (!isConnected) {
      console.warn('WebSocket is not connected, cannot subscribe');
      return;
    }
    webSocketManager.send({ type: 'subscribe', channel });
  }, [isConnected]);
  
  const unsubscribe = useCallback((channel: string) => {
    if (!isConnected) return;
    webSocketManager.send({ type: 'unsubscribe', channel });
  }, [isConnected]);
  
  // Auto-connect on mount
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [options.autoConnect, connect, disconnect]);
  
  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
};