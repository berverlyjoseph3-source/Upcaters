// enterprise-ai-agent-platform/apps/api/src/routes/health.routes.ts
import { Router } from 'express';
import { prisma } from '../db/client';
import { HealthController } from '../controllers/health.controller';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';
import { RedisInitService } from '../services/redis-init.service';
import { agentRegistry } from '../agents/core/agent.registry';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
  const redisHealth = await RedisInitService.getHealthStatus();
  const agentHealth = await agentRegistry.getAllHealthStatus();
  const agentsHealthy = Object.values(agentHealth).filter(a => a.status !== 'error').length;
  const agentsTotal = Object.keys(agentHealth).length;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected',
      redis: redisHealth,
      agents: {
        total: agentsTotal,
        healthy: agentsHealthy,
        degraded: agentsTotal - agentsHealthy,
      },
    },
  });
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (req, res) => {
  const redisReady = RedisInitService.isReady();
  let dbReady = false;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
  } catch (error) {
    logger.error({ error }, 'Database readiness check failed');
  }
  
  const allReady = redisReady && dbReady;
  
  if (allReady) {
    res.status(200).json({
      ready: true,
      services: {
        database: dbReady,
        redis: redisReady,
      },
    });
  } else {
    res.status(503).json({
      ready: false,
      services: {
        database: dbReady,
        redis: redisReady,
      },
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/metrics
 * Detailed metrics for monitoring
 */
router.get('/metrics', async (req, res) => {
  const redisStats = await RedisInitService.getStats().catch(() => null);
  const agentHealth = await agentRegistry.getAllHealthStatus();
  
  // Get database connection pool stats
  let dbPoolStats = null;
  try {
    const result = await prisma.$queryRaw < Array < { name: string;setting: string } >> `
      SELECT name, setting FROM pg_settings WHERE name IN ('max_connections', 'superuser_reserved_connections')
    `;
    dbPoolStats = result;
  } catch (error) {
    logger.error({ error }, 'Failed to get DB pool stats');
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: {
      usage: process.cpuUsage(),
    },
    services: {
      database: {
        status: 'connected',
        pool: dbPoolStats,
      },
      redis: redisStats,
      agents: agentHealth,
    },
  });
});

/**
 * GET /health/agents
 * Agent-specific health status
 */
router.get('/agents', async (req, res) => {
  const agentHealth = await agentRegistry.getAllHealthStatus();
  
  res.json({
    success: true,
    data: agentHealth,
  });
});

/**
 * GET /health/agent/:agentType
 * Specific agent health
 */
router.get('/agent/:agentType', async (req, res) => {
  const { agentType } = req.params;
  const agent = agentRegistry.getAgent(agentType as any);
  
  if (!agent) {
    res.status(404).json({
      success: false,
      error: `Agent ${agentType} not found`,
      code: 'AGENT_NOT_FOUND',
    });
    return;
  }
  
  const health = await agent.getHealth();
  
  res.json({
    success: true,
    data: health,
  });
});

/**
 * GET /health/dependencies
 * Check all external dependencies
 */
router.get('/dependencies', async (req, res) => {
  const checks: Record < string, { status: 'healthy' | 'unhealthy' | 'unknown';latency ? : number;error ? : string } > = {};
  
  // Check Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - dbStart };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  // Check Redis
  const redisStart = Date.now();
  const redisReady = RedisInitService.isReady();
  if (redisReady) {
    checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
  } else {
    checks.redis = { status: 'unhealthy', error: 'Redis not connected' };
  }
  
  // Check Stripe API
  const stripeStart = Date.now();
  try {
    const stripe = await import('stripe');
    const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY!, { timeout: 5000 });
    await stripeClient.balance.retrieve();
    checks.stripe = { status: 'healthy', latency: Date.now() - stripeStart };
  } catch (error) {
    checks.stripe = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  // Check OpenAI
  const openaiStart = Date.now();
  try {
    const { OpenAIService } = await import('../services/ai/openai.service');
    await OpenAIService.listModels();
    checks.openai = { status: 'healthy', latency: Date.now() - openaiStart };
  } catch (error) {
    checks.openai = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
  }
  
  res.json({
    success: true,
    data: checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;