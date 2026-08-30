// enterprise-ai-agent-platform/apps/frontend/src/services/realtime.service.ts
import { webSocketManager } from './websocket.service';
import { notificationService } from './notification.service';
import { useAuthStore } from '../store/auth.store';

export interface RealtimeSubscription {
  channel: string;
  callback: (data: any) => void;
}

class RealtimeService {
  private subscriptions: Map < string, Set < (data: any) => void >> = new Map();
  private isInitialized: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  /**
   * Initialize realtime service
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    // Set up WebSocket event handlers
    webSocketManager.onEvent('connected', () => {
      console.log('Realtime service connected');
      this.reconnectAttempts = 0;
      this.resubscribeAll();
    });
    
    webSocketManager.onEvent('disconnected', () => {
      console.log('Realtime service disconnected');
    });
    
    webSocketManager.onEvent('reconnecting', () => {
      console.log('Realtime service reconnecting...');
    });
    
    // Handle incoming messages
    webSocketManager.onMessage('*', (data) => {
      if (data.channel && this.subscriptions.has(data.channel)) {
        this.subscriptions.get(data.channel) !.forEach(callback => {
          try {
            callback(data.payload);
          } catch (err) {
            console.error('Error in realtime callback:', err);
          }
        });
      }
    });
    
    // Handle agent updates
    webSocketManager.onMessage('agent_update', (data) => {
      if (this.subscriptions.has('agent_updates')) {
        this.subscriptions.get('agent_updates') !.forEach(callback => {
          callback(data.payload);
        });
      }
    });
    
    // Handle usage updates
    webSocketManager.onMessage('usage_update', (data) => {
      if (this.subscriptions.has('usage_updates')) {
        this.subscriptions.get('usage_updates') !.forEach(callback => {
          callback(data.payload);
        });
      }
    });
    
    // Handle notifications
    notificationService.subscribeToRealtime(webSocketManager);
    
    this.isInitialized = true;
  }
  
  /**
   * Connect to realtime service
   */
  async connect(): Promise < void > {
    if (!this.isInitialized) {
      this.initialize();
    }
    
    try {
      await webSocketManager.connect();
    } catch (error) {
      console.error('Failed to connect to realtime service:', error);
      this.handleReconnect();
    }
  }
  
  /**
   * Disconnect from realtime service
   */
  disconnect(): void {
    webSocketManager.disconnect();
  }
  
  /**
   * Subscribe to a channel
   */
  subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel) !.add(callback);
    
    if (webSocketManager.isSocketConnected()) {
      webSocketManager.subscribe(channel);
    }
    
    return () => {
      this.unsubscribe(channel, callback);
    };
  }
  
  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string, callback: (data: any) => void): void {
    const callbacks = this.subscriptions.get(channel);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(channel);
        if (webSocketManager.isSocketConnected()) {
          webSocketManager.unsubscribe(channel);
        }
      }
    }
  }
  
  /**
   * Subscribe to agent updates
   */
  onAgentUpdate(callback: (data: { agentType: string;status: string;data ? : any }) => void): () => void {
    return this.subscribe('agent_updates', callback);
  }
  
  /**
   * Subscribe to usage updates
   */
  onUsageUpdate(callback: (data: { aiActions: { used: number;limit: number };apiCalls: { used: number;limit: number } }) => void): () => void {
    return this.subscribe('usage_updates', callback);
  }
  
  /**
   * Send an agent update
   */
  sendAgentUpdate(agentType: string, status: string, data ? : any): void {
    webSocketManager.send({
      type: 'agent_update',
      payload: { agentType, status, data },
      timestamp: Date.now(),
    });
  }
  
  /**
   * Get connection status
   */
  isConnected(): boolean {
    return webSocketManager.isSocketConnected();
  }
  
  /**
   * Get connection status string
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return webSocketManager.getConnectionStatus();
  }
  
  /**
   * Resubscribe to all channels
   */
  private resubscribeAll(): void {
    for (const channel of this.subscriptions.keys()) {
      webSocketManager.subscribe(channel);
    }
  }
  
  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      this.connect().catch(() => {
        this.handleReconnect();
      });
    }, delay);
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();