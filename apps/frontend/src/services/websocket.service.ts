// enterprise-ai-agent-platform/apps/frontend/src/services/websocket.service.ts
import { apiClient } from '../api/client';

type WebSocketEventType = |
  'connected' |
  'disconnected' |
  'message' |
  'error' |
  'reconnecting' |
  'reconnected';

type WebSocketMessageHandler = (data: any) => void;
type WebSocketEventHandler = (event ? : any) => void;

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp ? : number;
  channel ? : string;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isIntentionalClose: boolean = false;
  private messageHandlers: Map < string, Set < WebSocketMessageHandler >> = new Map();
  private eventHandlers: Map < WebSocketEventType, Set < WebSocketEventHandler >> = new Map();
  private pendingMessages: any[] = [];
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  
  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
    this.url = `${host}/ws`;
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): Promise < void > {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }
      
      if (this.isConnecting) {
        // Wait for connection
        const checkInterval = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection failed'));
          }
        }, 100);
        return;
      }
      
      this.isConnecting = true;
      this.isIntentionalClose = false;
      
      // Get auth token
      const token = apiClient.getAccessToken();
      const wsUrl = token ? `${this.url}?token=${token}` : this.url;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emitEvent('connected');
        this.startHeartbeat();
        
        // Send pending messages
        while (this.pendingMessages.length > 0) {
          const msg = this.pendingMessages.shift();
          this.send(msg);
        }
        
        resolve();
      };
      
      this.socket.onclose = (event) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emitEvent('disconnected', event);
        
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        this.emitEvent('error', error);
        reject(error);
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };
    });
  }
  
  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
  }
  
  /**
   * Send a message through WebSocket
   */
  send(message: any): void {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(messageStr);
    } else {
      this.pendingMessages.push(message);
      if (!this.isConnecting) {
        this.connect().catch(console.error);
      }
    }
  }
  
  /**
   * Subscribe to a channel
   */
  subscribe(channel: string): void {
    this.send({ type: 'subscribe', channel });
  }
  
  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.send({ type: 'unsubscribe', channel });
  }
  
  /**
   * Register message handler for specific message type
   */
  onMessage(type: string, handler: WebSocketMessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type) !.add(handler);
    
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }
  
  /**
   * Register event handler
   */
  onEvent(event: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event) !.add(handler);
    
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }
  
  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.isConnected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }
  
  private handleReconnect(): void {
    this.emitEvent('reconnecting');
    
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(() => {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emitEvent('error', new Error('Max reconnection attempts reached'));
        }
      });
    }, delay);
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emitEvent('message', data);
      
      // Route to type-specific handlers
      if (data.type && this.messageHandlers.has(data.type)) {
        this.messageHandlers.get(data.type) !.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error('Error in message handler:', err);
          }
        });
      }
      
      // Also route to wildcard handlers
      if (this.messageHandlers.has('*')) {
        this.messageHandlers.get('*') !.forEach(handler => {
          try {
            handler(data);
          } catch (err) {
            console.error('Error in wildcard handler:', err);
          }
        });
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  private emitEvent(event: WebSocketEventType, data ? : any): void {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event) !.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in ${event} event handler:`, err);
        }
      });
    }
  }
}

// Singleton instance
export const webSocketManager = new WebSocketService();