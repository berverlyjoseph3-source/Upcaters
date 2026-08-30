// enterprise-ai-agent-platform/apps/api/src/middleware/agent-rate-limit.ts
import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { AgentType } from '../types/agent.types';
import { prisma } from '../db/client';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

interface AgentRateLimitConfig {
  [key: string]: RateLimitConfig;
}

// Default rate limits per agent type
const AGENT_RATE_LIMITS: AgentRateLimitConfig = {
  email: { windowMs: 60 * 1000, maxRequests: 60, blockDurationMs: 5 * 60 * 1000 },
  drive: { windowMs: 60 * 1000, maxRequests: 60, blockDurationMs: 5 * 60 * 1000 },
  content: { windowMs: 60 * 1000, maxRequests: 30, blockDurationMs: 5 * 60 * 1000 },
  social: { windowMs: 60 * 1000, maxRequests: 20, blockDurationMs: 5 * 60 * 1000 },
  calendar: { windowMs: 60 * 1000, maxRequests: 60, blockDurationMs: 5 * 60 * 1000 },
  web: { windowMs: 60 * 1000, maxRequests: 30, blockDurationMs: 5 * 60 * 1000 },
  task: { windowMs: 60 * 1000, maxRequests: 60, blockDurationMs: 5 * 60 * 1000 },
  orchestrator: { windowMs: 60 * 1000, maxRequests: 50, blockDurationMs: 5 * 60 * 1000 },
};

// Default rate limit for unauthenticated users
const UNAUTHENTICATED_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  blockDurationMs: 15 * 60 * 1000,
};

// In-memory store for rate limiting (fallback when Redis is unavailable)
interface RateLimitRecord {
  count: number;
  windowStart: number;
  blockedUntil: number | null;
}

const memoryStore = new Map<string, RateLimitRecord>();

class AgentRateLimiter {
  private redis: Redis | null = null;
  private useRedis: boolean = true;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          retryStrategy: (times) => {
            if (times > 3) {
              this.useRedis = false;
              logger.warn('Redis unavailable, falling back to memory store for rate limiting');
              return null;
            }
            return Math.min(times * 50, 2000);
          },
        });
        logger.info('Agent rate limiter Redis client initialized');
      } catch (error) {
        this.useRedis = false;
        logger.warn('Failed to connect to Redis, using memory store for rate limiting');
      }
    } else {
      this.useRedis = false;
    }
  }

  private getRedisKey(identifier: string, agentType: string): string {
    return `rate_limit:${identifier}:${agentType}`;
  }

  private async checkRedisLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAfter: number; blockedUntil?: number }> {
    if (!this.redis) {
      return this.checkMemoryLimit(key, config);
    }

    const now = Date.now();
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
    const resetAfter = ttl;
    
    return { allowed, remaining, resetAfter };
  }

  private async checkMemoryLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAfter: number; blockedUntil?: number }> {
    const now = Date.now();
    const record = memoryStore.get(key);
    
    // Check if currently blocked
    if (record?.blockedUntil && record.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAfter: Math.ceil((record.blockedUntil - now) / 1000),
        blockedUntil: record.blockedUntil,
      };
    }
    
    // Check if window has expired
    if (!record || now - record.windowStart >= config.windowMs) {
      memoryStore.set(key, {
        count: 1,
        windowStart: now,
        blockedUntil: null,
      });
      return { allowed: true, remaining: config.maxRequests - 1, resetAfter: Math.ceil(config.windowMs / 1000) };
    }
    
    // Check if within limit
    if (record.count >= config.maxRequests) {
      const blockedUntil = now + (config.blockDurationMs || config.windowMs);
      memoryStore.set(key, { ...record, blockedUntil });
      return {
        allowed: false,
        remaining: 0,
        resetAfter: Math.ceil((blockedUntil - now) / 1000),
        blockedUntil,
      };
    }
    
    // Increment counter
    record.count++;
    memoryStore.set(key, record);
    
    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetAfter: Math.ceil((config.windowMs - (now - record.windowStart)) / 1000),
    };
  }

  /**
   * Check rate limit for a specific agent and user
   */
  async checkLimit(
    userId: string,
    agentType: string,
    ipAddress?: string
  ): Promise<{ allowed: boolean; remaining: number; resetAfter: number; limit: number }> {
    const config = AGENT_RATE_LIMITS[agentType] || AGENT_RATE_LIMITS.orchestrator;
    const identifier = ipAddress ? `${userId}:${ipAddress}` : userId;
    const key = this.getRedisKey(identifier, agentType);
    
    let result;
    if (this.useRedis && this.redis) {
      result = await this.checkRedisLimit(key, config);
    } else {
      result = await this.checkMemoryLimit(key, config);
    }
    
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAfter: result.resetAfter,
      limit: config.maxRequests,
    };
  }

  /**
   * Check rate limit for unauthenticated users
   */
  async checkUnauthenticatedLimit(ipAddress: string): Promise<{ allowed: boolean; remaining: number; resetAfter: number; limit: number }> {
    const key = `rate_limit:unauthenticated:${ipAddress}`;
    
    let result;
    if (this.useRedis && this.redis) {
      result = await this.checkRedisLimit(key, UNAUTHENTICATED_LIMIT);
    } else {
      result = await this.checkMemoryLimit(key, UNAUTHENTICATED_LIMIT);
    }
    
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAfter: result.resetAfter,
      limit: UNAUTHENTICATED_LIMIT.maxRequests,
    };
  }

  /**
   * Reset rate limit for a user
   */
  async resetLimit(userId: string, agentType?: string): Promise<void> {
    if (agentType) {
      const key = this.getRedisKey(userId, agentType);
      if (this.useRedis && this.redis) {
        const pattern = `${key}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        memoryStore.delete(key);
      }
    } else {
      // Reset all agent types
      for (const type of Object.keys(AGENT_RATE_LIMITS)) {
        const key = this.getRedisKey(userId, type);
        if (this.useRedis && this.redis) {
          const pattern = `${key}:*`;
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          memoryStore.delete(key);
        }
      }
    }
    logger.info({ userId, agentType }, 'Rate limit reset');
  }

  /**
   * Get current rate limit status for a user
   */
  async getStatus(userId: string, agentType: string): Promise<{ remaining: number; resetAfter: number; limit: number }> {
    const config = AGENT_RATE_LIMITS[agentType] || AGENT_RATE_LIMITS.orchestrator;
    const key = this.getRedisKey(userId, agentType);
    
    let count: number;
    let ttl: number;
    
    if (this.useRedis && this.redis) {
      const now = Date.now();
      const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;
      count = await this.redis.get(windowKey).then(v => parseInt(v || '0', 10));
      ttl = await this.redis.ttl(windowKey);
    } else {
      const record = memoryStore.get(key);
      const now = Date.now();
      if (record && now - record.windowStart < config.windowMs) {
        count = record.count;
        ttl = Math.ceil((config.windowMs - (now - record.windowStart)) / 1000);
      } else {
        count = 0;
        ttl = config.windowMs / 1000;
      }
    }
    
    return {
      remaining: Math.max(0, config.maxRequests - count),
      resetAfter: ttl,
      limit: config.maxRequests,
    };
  }
}

// Singleton instance
let rateLimiterInstance: AgentRateLimiter | null = null;

export function getAgentRateLimiter(redisUrl?: string): AgentRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new AgentRateLimiter(redisUrl || process.env.REDIS_URL);
  }
  return rateLimiterInstance;
}

/**
 * Express middleware for agent rate limiting
 */
export function agentRateLimit(agentType: AgentType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.socket.remoteAddress;
    
    const limiter = getAgentRateLimiter();
    
    let result;
    if (userId) {
      result = await limiter.checkLimit(userId, agentType, ipAddress);
    } else {
      result = await limiter.checkUnauthenticatedLimit(ipAddress || 'unknown');
    }
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit?.toString() || UNAUTHENTICATED_LIMIT.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetAfter.toString());
    
    if (!result.allowed) {
      logger.warn({
        userId,
        agentType,
        ip: ipAddress,
        limit: result.limit,
        resetAfter: result.resetAfter,
      }, 'Agent rate limit exceeded');
      
      res.status(429).json({
        success: false,
        error: 'Too many requests. Rate limit exceeded.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.resetAfter,
        limit: result.limit || UNAUTHENTICATED_LIMIT.maxRequests,
        remaining: 0,
      });
      return;
    }
    
    next();
  };
}

/**
 * Clear rate limits for a user (admin only)
 */
export async function clearUserRateLimits(userId: string, agentType?: string): Promise<void> {
  const limiter = getAgentRateLimiter();
  await limiter.resetLimit(userId, agentType);
  logger.info({ userId, agentType }, 'User rate limits cleared by admin');
}