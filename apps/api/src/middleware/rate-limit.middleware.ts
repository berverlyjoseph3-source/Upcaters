// enterprise-ai-agent-platform/apps/api/src/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (fallback)
const memoryStore = new Map<string, RateLimitRecord>();

class RateLimiter {
  private redis: Redis | null = null;
  private useRedis: boolean = true;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              this.useRedis = false;
              logger.warn('Redis unavailable for rate limiting, falling back to memory store');
              return null;
            }
            return Math.min(times * 50, 2000);
          },
        });
      } catch (error) {
        this.useRedis = false;
        logger.warn('Failed to connect to Redis for rate limiting, using memory store');
      }
    } else {
      this.useRedis = false;
    }
  }

  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAfter: number }> {
    const now = Date.now();

    if (this.useRedis && this.redis) {
      const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;
      const multi = this.redis.multi();
      multi.incr(windowKey);
      multi.expire(windowKey, Math.ceil(config.windowMs / 1000));
      multi.ttl(windowKey);
      
      const results = await multi.exec();
      const count = (results?.[0]?.[1] as number) || 0;
      const ttl = (results?.[2]?.[1] as number) || Math.ceil(config.windowMs / 1000);
      
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

let rateLimiterInstance: RateLimiter | null = null;

function getRateLimiter(redisUrl?: string): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(redisUrl || process.env.REDIS_URL);
  }
  return rateLimiterInstance;
}

/**
 * Create a rate limiter middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const limiter = getRateLimiter();
  const keyGenerator = config.keyGenerator || ((req: Request) => {
    const userId = (req as any).user?.id;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyGenerator(req);
    const result = await limiter.checkLimit(key, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAfter);

    if (!result.allowed) {
      logger.warn({ key, limit: config.maxRequests, resetAfter: result.resetAfter }, 'Rate limit exceeded');
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

    res.send = function(body: any): any {
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
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

export const moderateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 60,
});

export const relaxedRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 300,
});

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
});

export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 1000,
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey ? `apikey:${apiKey}` : `ip:${req.ip}`;
  },
});