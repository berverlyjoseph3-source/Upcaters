// enterprise-ai-agent-platform/apps/api/src/utils/websocket.ts
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { verify } from 'jsonwebtoken';
import { logger } from './logger';
import { authConfig } from '../config/auth.config';

export interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  subscriptions: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

export interface WebSocketMessage {
  type: 'ping' | 'pong' | 'subscribe' | 'unsubscribe' | 'agent_update' | 'notification' | 'usage_update';
  payload: any;
  channel?: string;
  timestamp?: number;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private channelSubscribers: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly CLIENT_TIMEOUT = 60000;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      logger.error({ error }, 'WebSocket server error');
    });

    this.startHeartbeat();

    logger.info('WebSocket server initialized on path /ws');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const token = this.extractToken(req);
    if (!token) {
      ws.close(1008, 'No authentication token provided');
      return;
    }

    let payload: any;
    try {
      payload = verify(token, authConfig.jwt.accessSecret!);
    } catch (error) {
      ws.close(1008, 'Invalid authentication token');
      return;
    }

    const clientId = `${payload.sub}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const client: WebSocketClient = {
      ws,
      userId: payload.sub,
      sessionId: payload.jti || `session_${Date.now()}`,
      subscriptions: new Set(),
      lastPing: Date.now(),
      isAlive: true,
    };

    this.clients.set(clientId, client);

    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('pong', () => {
      const c = this.clients.get(clientId);
      if (c) {
        c.isAlive = true;
        c.lastPing = Date.now();
      }
    });
    ws.on('error', (error) => {
      logger.error({ error, clientId }, 'WebSocket client error');
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now(),
      clientId,
    }));

    logger.info({ clientId, userId: payload.sub }, 'WebSocket client connected');
  }

  private extractToken(req: any): string | null {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) return token;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private handleMessage(clientId: string, data: RawData): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      client.lastPing = Date.now();

      switch (message.type) {
        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: Date.now() });
          break;

        case 'subscribe':
          this.handleSubscribe(client, message.channel);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(client, message.channel);
          break;

        default:
          logger.debug({ clientId, messageType: message.type }, 'Unknown message type');
      }
    } catch (error) {
      logger.error({ error, clientId }, 'Failed to parse WebSocket message');
    }
  }

  private handleSubscribe(client: WebSocketClient, channel?: string): void {
    if (!channel) return;

    client.subscriptions.add(channel);

    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)!.add(client.ws);

    logger.debug({ userId: client.userId, channel }, 'Client subscribed to channel');
  }

  private handleUnsubscribe(client: WebSocketClient, channel?: string): void {
    if (!channel) return;

    client.subscriptions.delete(channel);

    const subscribers = this.channelSubscribers.get(channel);
    if (subscribers) {
      subscribers.delete(client.ws);
      if (subscribers.size === 0) {
        this.channelSubscribers.delete(channel);
      }
    }

    logger.debug({ userId: client.userId, channel }, 'Client unsubscribed from channel');
  }

  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      for (const channel of client.subscriptions) {
        const subscribers = this.channelSubscribers.get(channel);
        if (subscribers) {
          subscribers.delete(client.ws);
          if (subscribers.size === 0) {
            this.channelSubscribers.delete(channel);
          }
        }
      }
      this.clients.delete(clientId);
      logger.info({ clientId, userId: client.userId }, 'WebSocket client disconnected');
    }
  }

  private sendToClient(client: WebSocketClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  sendToUser(userId: string, message: any): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  broadcast(message: any): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    }
  }

  sendToChannel(channel: string, message: any): void {
    const subscribers = this.channelSubscribers.get(channel);
    if (!subscribers) return;

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  sendAgentUpdate(userId: string, agentType: string, status: string, data?: any): void {
    this.sendToUser(userId, {
      type: 'agent_update',
      timestamp: Date.now(),
      payload: { agentType, status, data },
    });
  }

  sendNotification(userId: string, title: string, message: string, data?: any): void {
    this.sendToUser(userId, {
      type: 'notification',
      timestamp: Date.now(),
      payload: { title, message, data },
    });
  }

  sendUsageUpdate(userId: string, aiActionsUsed: number, aiActionsLimit: number, apiCallsUsed: number, apiCallsLimit: number): void {
    this.sendToUser(userId, {
      type: 'usage_update',
      timestamp: Date.now(),
      payload: {
        aiActions: { used: aiActionsUsed, limit: aiActionsLimit },
        apiCalls: { used: apiCallsUsed, limit: apiCallsLimit },
      },
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients.entries()) {
        if (!client.isAlive) {
          logger.info({ clientId, userId: client.userId }, 'Client timed out');
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        client.isAlive = false;
        client.ws.ping();
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getActiveSubscriptionsCount(): number {
    let total = 0;
    for (const subscribers of this.channelSubscribers.values()) {
      total += subscribers.size;
    }
    return total;
  }

  getConnectedUsers(): string[] {
    const users = new Set<string>();
    for (const client of this.clients.values()) {
      users.add(client.userId);
    }
    return Array.from(users);
  }

  shutdown(): void {
    this.stopHeartbeat();

    for (const [clientId, client] of this.clients.entries()) {
      client.ws.close(1000, 'Server shutting down');
    }
    this.clients.clear();
    this.channelSubscribers.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('WebSocket server shut down');
  }
}

export const webSocketManager = WebSocketManager.getInstance();