// enterprise-ai-agent-platform/apps/api/src/auth/middleware/rate-limit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
}

interface RateLimitInfo {
  totalHits: number;
  resetTime: Date;
  remaining: number;
}

// Redis client (will be initialized once)
let redisClient: Redis | null = null;

export class RateLimitMiddleware {
  /**
   * Initialize Redis client for rate limiting
   */
  static initRedis(url: string): void {
    if (!redisClient) {
      redisClient = new Redis(url, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
      
      redisClient.on('error', (error) => {
        logger.error({ error }, 'Redis rate limit client error');
      });
      
      logger.info('Redis rate limit client initialized');
    }
  }

  /**
   * Get Redis client
   */
  static getRedis(): Redis | null {
    return redisClient;
  }

  /**
   * Default key generator based on IP and user ID
   */
  static defaultKeyGenerator(req: Request): string {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || 'anonymous';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    
    return `rate_limit:${userId}:${ip}:${method}:${endpoint}`;
  }

  /**
   * Default rate limit handler
   */
  static defaultHandler(req: Request, res: Response, next: NextFunction): void {
    const retryAfter = 60; // seconds
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
    });
  }

  /**
   * Create rate limiter middleware
   */
  static limiter(config: RateLimitConfig) {
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;
    const keyGenerator = config.keyGenerator || this.defaultKeyGenerator;
    const handler = config.handler || this.defaultHandler;
    const skipSuccessful = config.skipSuccessfulRequests || false;
    const skipFailed = config.skipFailedRequests || false;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        let info: RateLimitInfo;

        if (redisClient) {
          // Use Redis for distributed rate limiting
          info = await this.redisRateLimit(key, windowMs, maxRequests, now);
        } else {
          // Fallback to memory store (single instance only)
          info = await this.memoryRateLimit(key, windowMs, maxRequests, now);
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', info.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

        if (info.totalHits > maxRequests) {
          logger.warn({
            key,
            ip: req.ip,
            path: req.path,
            totalHits: info.totalHits,
            limit: maxRequests,
          }, 'Rate limit exceeded');
          
          return handler(req, res, next);
        }

        // Track response to conditionally increment counter
        const originalSend = res.send;
        let shouldIncrement = true;

        res.send = function(body: any): any {
          if (skipSuccessful && res.statusCode >= 200 && res.statusCode < 300) {
            shouldIncrement = false;
          }
          if (skipFailed && res.statusCode >= 400) {
            shouldIncrement = false;
          }
          
          originalSend.call(this, body);
        };

        // Increment counter after response
        res.on('finish', async () => {
          if (shouldIncrement) {
            if (redisClient) {
              await this.incrementRedis(key, windowMs);
            } else {
              await this.incrementMemory(key, windowMs);
            }
          }
        });

        next();
      } catch (error) {
        logger.error({ error }, 'Rate limit middleware error');
        // On error, allow the request to proceed
        next();
      }
    };
  }

  /**
   * Redis-based rate limiting
   */
  private static async redisRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number,
    now: number
  ): Promise<RateLimitInfo> {
    const client = this.getRedis();
    if (!client) {
      throw new Error('Redis client not initialized');
    }

    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    const multi = client.multi();
    
    multi.incr(windowKey);
    multi.expire(windowKey, Math.ceil(windowMs / 1000));
    multi.ttl(windowKey);
    
    const results = await multi.exec();
    const totalHits = (results?.[0]?.[1] as number) || 0;
    const ttl = (results?.[2]?.[1] as number) || Math.ceil(windowMs / 1000);
    
    const resetTime = new Date(now + (ttl * 1000));
    const remaining = Math.max(0, maxRequests - totalHits);
    
    return { totalHits, resetTime, remaining };
  }

  /**
   * Memory-based rate limiting (fallback)
   */
  private static memoryStore = new Map<string, { count: number; resetTime: number }>();

  private static async memoryRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number,
    now: number
  ): Promise<RateLimitInfo> {
    const record = this.memoryStore.get(key);
    const resetTime = new Date(now + windowMs);
    
    if (!record || record.resetTime < now) {
      this.memoryStore.set(key, { count: 1, resetTime: now + windowMs });
      return { totalHits: 1, resetTime, remaining: maxRequests - 1 };
    }
    
    const totalHits = record.count + 1;
    const remaining = Math.max(0, maxRequests - totalHits);
    
    return { totalHits, resetTime, remaining };
  }

  private static async incrementRedis(key: string, windowMs: number): Promise<void> {
    const client = this.getRedis();
    if (!client) return;
    
    const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;
    await client.incr(windowKey);
    await client.expire(windowKey, Math.ceil(windowMs / 1000));
  }

  private static async incrementMemory(key: string, windowMs: number): Promise<void> {
    const record = this.memoryStore.get(key);
    const now = Date.now();
    
    if (!record || record.resetTime < now) {
      this.memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      record.count++;
      this.memoryStore.set(key, record);
    }
  }

  /**
   * Pre-configured rate limiters for common use cases
   */
  static strict() {
    return this.limiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
    });
  }

  static moderate() {
    return this.limiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
    });
  }

  static relaxed() {
    return this.limiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 300,
    });
  }

  static login() {
    return this.limiter({
      windowMs: authConfig.rateLimit.login.windowMs,
      maxRequests: authConfig.rateLimit.login.max,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Too many login attempts. Please try again later.',
          code: 'LOGIN_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(authConfig.rateLimit.login.windowMs / 60000),
        });
      },
    });
  }

  static register() {
    return this.limiter({
      windowMs: authConfig.rateLimit.register.windowMs,
      maxRequests: authConfig.rateLimit.register.max,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          error: 'Too many registration attempts from this IP.',
          code: 'REGISTER_RATE_LIMIT_EXCEEDED',
        });
      },
    });
  }

  static apiKey() {
    return this.limiter({
      windowMs: authConfig.rateLimit.apiKey.windowMs,
      maxRequests: authConfig.rateLimit.apiKey.max,
    });
  }

  /**
   * Clean up old memory store entries periodically
   */
  static startCleanup(intervalMs: number = 5 * 60 * 1000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.memoryStore.entries()) {
        if (record.resetTime < now) {
          this.memoryStore.delete(key);
        }
      }
    }, intervalMs);
  }
}

// Express middleware wrappers
export const rateLimit = (config: RateLimitConfig) => RateLimitMiddleware.limiter(config);
export const strictRateLimit = RateLimitMiddleware.strict();
export const moderateRateLimit = RateLimitMiddleware.moderate();
export const relaxedRateLimit = RateLimitMiddleware.relaxed();
export const loginRateLimit = RateLimitMiddleware.login();
export const registerRateLimit = RateLimitMiddleware.register();
export const apiKeyRateLimit = RateLimitMiddleware.apiKey();