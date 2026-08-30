"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketManager = exports.WebSocketManager = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = require("jsonwebtoken");
const logger_1 = require("./logger");
const auth_config_1 = require("../config/auth.config");
class WebSocketManager {
    constructor() {
        this.wss = null;
        this.clients = new Map();
        this.channelSubscribers = new Map();
        this.heartbeatInterval = null;
        this.HEARTBEAT_INTERVAL = 30000;
        this.CLIENT_TIMEOUT = 60000;
    }
    static getInstance() {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', this.handleConnection.bind(this));
        this.wss.on('error', (error) => {
            logger_1.logger.error({ error }, 'WebSocket server error');
        });
        this.startHeartbeat();
        logger_1.logger.info('WebSocket server initialized on path /ws');
    }
    handleConnection(ws, req) {
        const token = this.extractToken(req);
        if (!token) {
            ws.close(1008, 'No authentication token provided');
            return;
        }
        let payload;
        try {
            payload = (0, jsonwebtoken_1.verify)(token, auth_config_1.authConfig.jwt.accessSecret);
        }
        catch (error) {
            ws.close(1008, 'Invalid authentication token');
            return;
        }
        const clientId = `${payload.sub}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const client = {
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
            logger_1.logger.error({ error, clientId }, 'WebSocket client error');
        });
        // Send initial connection confirmation
        ws.send(JSON.stringify({
            type: 'connected',
            timestamp: Date.now(),
            clientId,
        }));
        logger_1.logger.info({ clientId, userId: payload.sub }, 'WebSocket client connected');
    }
    extractToken(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (token)
            return token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return null;
    }
    handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        try {
            const message = JSON.parse(data.toString());
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
                    logger_1.logger.debug({ clientId, messageType: message.type }, 'Unknown message type');
            }
        }
        catch (error) {
            logger_1.logger.error({ error, clientId }, 'Failed to parse WebSocket message');
        }
    }
    handleSubscribe(client, channel) {
        if (!channel)
            return;
        client.subscriptions.add(channel);
        if (!this.channelSubscribers.has(channel)) {
            this.channelSubscribers.set(channel, new Set());
        }
        this.channelSubscribers.get(channel).add(client.ws);
        logger_1.logger.debug({ userId: client.userId, channel }, 'Client subscribed to channel');
    }
    handleUnsubscribe(client, channel) {
        if (!channel)
            return;
        client.subscriptions.delete(channel);
        const subscribers = this.channelSubscribers.get(channel);
        if (subscribers) {
            subscribers.delete(client.ws);
            if (subscribers.size === 0) {
                this.channelSubscribers.delete(channel);
            }
        }
        logger_1.logger.debug({ userId: client.userId, channel }, 'Client unsubscribed from channel');
    }
    handleDisconnect(clientId) {
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
            logger_1.logger.info({ clientId, userId: client.userId }, 'WebSocket client disconnected');
        }
    }
    sendToClient(client, message) {
        if (client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }
    sendToUser(userId, message) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.userId === userId && client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
            }
        }
    }
    broadcast(message) {
        for (const [clientId, client] of this.clients.entries()) {
            if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(JSON.stringify(message));
            }
        }
    }
    sendToChannel(channel, message) {
        const subscribers = this.channelSubscribers.get(channel);
        if (!subscribers)
            return;
        for (const ws of subscribers) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
    }
    sendAgentUpdate(userId, agentType, status, data) {
        this.sendToUser(userId, {
            type: 'agent_update',
            timestamp: Date.now(),
            payload: { agentType, status, data },
        });
    }
    sendNotification(userId, title, message, data) {
        this.sendToUser(userId, {
            type: 'notification',
            timestamp: Date.now(),
            payload: { title, message, data },
        });
    }
    sendUsageUpdate(userId, aiActionsUsed, aiActionsLimit, apiCallsUsed, apiCallsLimit) {
        this.sendToUser(userId, {
            type: 'usage_update',
            timestamp: Date.now(),
            payload: {
                aiActions: { used: aiActionsUsed, limit: aiActionsLimit },
                apiCalls: { used: apiCallsUsed, limit: apiCallsLimit },
            },
        });
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            for (const [clientId, client] of this.clients.entries()) {
                if (!client.isAlive) {
                    logger_1.logger.info({ clientId, userId: client.userId }, 'Client timed out');
                    client.ws.terminate();
                    this.clients.delete(clientId);
                    continue;
                }
                client.isAlive = false;
                client.ws.ping();
            }
        }, this.HEARTBEAT_INTERVAL);
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
    getActiveSubscriptionsCount() {
        let total = 0;
        for (const subscribers of this.channelSubscribers.values()) {
            total += subscribers.size;
        }
        return total;
    }
    getConnectedUsers() {
        const users = new Set();
        for (const client of this.clients.values()) {
            users.add(client.userId);
        }
        return Array.from(users);
    }
    shutdown() {
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
        logger_1.logger.info('WebSocket server shut down');
    }
}
exports.WebSocketManager = WebSocketManager;
exports.webSocketManager = WebSocketManager.getInstance();
//# sourceMappingURL=websocket.js.map