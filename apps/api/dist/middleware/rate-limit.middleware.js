"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRateLimit = exports.registerRateLimit = exports.loginRateLimit = exports.relaxedRateLimit = exports.moderateRateLimit = exports.strictRateLimit = void 0;
exports.rateLimit = rateLimit;
const ioredis_1 = require("ioredis");
const logger_1 = require("../utils/logger");
// In-memory store (fallback)
const memoryStore = new Map();
class RateLimiter {
    constructor(redisUrl) {
        this.redis = null;
        this.useRedis = true;
        if (redisUrl) {
            try {
                this.redis = new ioredis_1.Redis(redisUrl, {
                    retryStrategy: (times) => {
                        if (times > 3) {
                            this.useRedis = false;
                            logger_1.logger.warn('Redis unavailable for rate limiting, falling back to memory store');
                            return null;
                        }
                        return Math.min(times * 50, 2000);
                    },
                });
            }
            catch (error) {
                this.useRedis = false;
                logger_1.logger.warn('Failed to connect to Redis for rate limiting, using memory store');
            }
        }
        else {
            this.useRedis = false;
        }
    }
    async checkLimit(key, config) {
        const now = Date.now();
        if (this.useRedis && this.redis) {
            const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;
            const multi = this.redis.multi();
            multi.incr(windowKey);
            multi.expire(windowKey, Math.ceil(config.windowMs / 1000));
            multi.ttl(windowKey);
            const results = await multi.exec();
            const count = results?.[0]?.[1] || 0;
            const ttl = results?.[2]?.[1] || Math.ceil(config.windowMs / 1000);
            const allowed = count <= config.maxRequests;
            const remaining = Math.max(0, config.maxRequests - count);
            return { allowed, remaining, resetAfter: ttl };
        }
        // Memory store fallback
        const record = memoryStore.get(key);
        if (!record || record.resetTime < now) {
            memoryStore.set(key, {
                count: 1,
                resetTime: now + config.windowMs,
            });
            return { allowed: true, remaining: config.maxRequests - 1, resetAfter: Math.ceil(config.windowMs / 1000) };
        }
        const allowed = record.count < config.maxRequests;
        const remaining = Math.max(0, config.maxRequests - record.count);
        const resetAfter = Math.ceil((record.resetTime - now) / 1000);
        if (allowed) {
            record.count++;
            memoryStore.set(key, record);
        }
        return { allowed, remaining, resetAfter };
    }
}
let rateLimiterInstance = null;
function getRateLimiter(redisUrl) {
    if (!rateLimiterInstance) {
        rateLimiterInstance = new RateLimiter(redisUrl || process.env.REDIS_URL);
    }
    return rateLimiterInstance;
}
/**
 * Create a rate limiter middleware
 */
function rateLimit(config) {
    const limiter = getRateLimiter();
    const keyGenerator = config.keyGenerator || ((req) => {
        const userId = req.user?.id;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return userId ? `user:${userId}` : `ip:${ip}`;
    });
    return async (req, res, next) => {
        const key = keyGenerator(req);
        const result = await limiter.checkLimit(key, config);
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetAfter);
        if (!result.allowed) {
            logger_1.logger.warn({ key, limit: config.maxRequests, resetAfter: result.resetAfter }, 'Rate limit exceeded');
            res.status(429).json({
                success: false,
                error: 'Too many requests, please try again later.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: result.resetAfter,
            });
            return;
        }
        // Track response to conditionally increment counter
        const originalSend = res.send;
        let shouldIncrement = true;
        res.send = function (body) {
            if (config.skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) {
                shouldIncrement = false;
            }
            if (config.skipFailedRequests && res.statusCode >= 400) {
                shouldIncrement = false;
            }
            originalSend.call(this, body);
        };
        next();
    };
}
/**
 * Pre-configured rate limiters
 */
exports.strictRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
});
exports.moderateRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 60,
});
exports.relaxedRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 300,
});
exports.loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
});
exports.registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
});
exports.apiKeyRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyGenerator: (req) => {
        const apiKey = req.headers['x-api-key'];
        return apiKey ? `apikey:${apiKey}` : `ip:${req.ip}`;
    },
});
//# sourceMappingURL=rate-limit.middleware.js.map