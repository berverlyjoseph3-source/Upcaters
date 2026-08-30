"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisInit = exports.RedisInitService = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/redis-init.service.ts
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const usage_metering_service_1 = require("./usage-metering.service");
class RedisInitService {
    /**
     * Initialize Redis connection for usage metering
     */
    static async initialize(redisUrl) {
        try {
            const url = redisUrl || process.env.REDIS_URL;
            if (!url) {
                throw new Error('REDIS_URL environment variable is not set');
            }
            // Initialize main Redis connection
            this.redis = new ioredis_1.default(url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    logger_1.logger.warn({ times, delay }, 'Redis connection retry');
                    return delay;
                },
                reconnectOnError: (err) => {
                    logger_1.logger.error({ error: err.message }, 'Redis error, attempting reconnect');
                    return true;
                },
            });
            // Set up event handlers
            this.redis.on('connect', () => {
                this.isConnected = true;
                logger_1.logger.info('Redis connected successfully');
            });
            this.redis.on('ready', () => {
                logger_1.logger.info('Redis ready for operations');
            });
            this.redis.on('error', (error) => {
                this.isConnected = false;
                logger_1.logger.error({ error: error.message }, 'Redis connection error');
            });
            this.redis.on('close', () => {
                this.isConnected = false;
                logger_1.logger.warn('Redis connection closed');
            });
            this.redis.on('reconnecting', () => {
                logger_1.logger.warn('Redis reconnecting...');
            });
            // Test connection
            await this.testConnection();
            // Initialize UsageMeteringService with Redis
            usage_metering_service_1.UsageMeteringService.initRedis(url);
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to initialize Redis');
            return false;
        }
    }
    /**
     * Test Redis connection
     */
    static async testConnection() {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }
        try {
            const pong = await this.redis.ping();
            if (pong === 'PONG') {
                logger_1.logger.info('Redis ping successful');
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Redis ping failed');
            return false;
        }
    }
    /**
     * Get Redis client instance
     */
    static getClient() {
        if (!this.redis) {
            throw new Error('Redis not initialized. Call initialize() first.');
        }
        return this.redis;
    }
    /**
     * Check if Redis is connected
     */
    static isReady() {
        return this.isConnected && this.redis?.status === 'ready';
    }
    /**
     * Get Redis health status
     */
    static async getHealthStatus() {
        if (!this.redis || !this.isConnected) {
            return {
                connected: false,
                status: this.redis?.status || 'disconnected',
            };
        }
        try {
            // Measure latency
            const start = Date.now();
            await this.redis.ping();
            const latency = Date.now() - start;
            // Get memory info
            const memoryInfo = await this.redis.info('memory');
            const memoryMatch = memoryInfo.match(/used_memory_human:(\d+\.?\d* ?[KMG]?B)/);
            const memory = memoryMatch ? memoryMatch[1] : undefined;
            return {
                connected: true,
                status: this.redis.status,
                latency,
                memory,
            };
        }
        catch (error) {
            return {
                connected: false,
                status: 'error',
            };
        }
    }
    /**
     * Flush all usage data (admin only, for testing)
     */
    static async flushUsageData() {
        if (!this.redis) {
            return false;
        }
        try {
            const keys = await this.redis.keys('usage:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
                logger_1.logger.info({ deletedCount: keys.length }, 'Usage data flushed from Redis');
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to flush usage data');
            return false;
        }
    }
    /**
     * Get Redis stats
     */
    static async getStats() {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }
        try {
            const [keys, info] = await Promise.all([
                this.redis.keys('usage:*'),
                this.redis.info('stats'),
            ]);
            const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
            const connectedClientsMatch = info.match(/connected_clients:(\d+)/);
            const memoryMatch = info.match(/used_memory_human:(\d+\.?\d* ?[KMG]?B)/);
            return {
                keys: keys.length,
                memory: memoryMatch ? memoryMatch[1] : 'unknown',
                uptime: uptimeMatch ? `${Math.floor(parseInt(uptimeMatch[1]) / 86400)} days` : 'unknown',
                connectedClients: connectedClientsMatch ? parseInt(connectedClientsMatch[1], 10) : 0,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get Redis stats');
            throw error;
        }
    }
    /**
     * Clean up expired usage keys
     */
    static async cleanupExpiredKeys() {
        if (!this.redis) {
            return 0;
        }
        try {
            // Redis automatically expires keys with TTL
            // This just logs the current state
            const keys = await this.redis.keys('usage:*');
            let expired = 0;
            for (const key of keys) {
                const ttl = await this.redis.ttl(key);
                if (ttl === -2) {
                    // Key doesn't exist (already expired)
                    expired++;
                }
            }
            logger_1.logger.info({ totalKeys: keys.length, expired }, 'Redis keys cleanup check');
            return expired;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to cleanup expired keys');
            return 0;
        }
    }
    /**
     * Close Redis connection
     */
    static async disconnect() {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
            this.isConnected = false;
            logger_1.logger.info('Redis connection closed');
        }
    }
    /**
     * Create Redis backup (export keys)
     */
    static async backupUsageData() {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }
        const backup = new Map();
        const keys = await this.redis.keys('usage:*');
        for (const key of keys) {
            const value = await this.redis.get(key);
            if (value) {
                backup.set(key, value);
            }
        }
        logger_1.logger.info({ keysBackedUp: backup.size }, 'Usage data backed up');
        return backup;
    }
    /**
     * Restore usage data from backup
     */
    static async restoreUsageData(backup) {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }
        let restored = 0;
        for (const [key, value] of backup.entries()) {
            await this.redis.set(key, value);
            restored++;
        }
        logger_1.logger.info({ keysRestored: restored }, 'Usage data restored');
        return restored;
    }
}
exports.RedisInitService = RedisInitService;
RedisInitService.redis = null;
RedisInitService.isConnected = false;
// Export a singleton instance
exports.redisInit = RedisInitService;
//# sourceMappingURL=redis-init.service.js.map