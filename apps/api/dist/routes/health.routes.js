"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/health.routes.ts
const express_1 = require("express");
const client_1 = require("../db/client");
const redis_init_service_1 = require("../services/redis-init.service");
const agent_registry_1 = require("../agents/core/agent.registry");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
    const redisHealth = await redis_init_service_1.RedisInitService.getHealthStatus();
    const agentHealth = await agent_registry_1.agentRegistry.getAllHealthStatus();
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
    const redisReady = redis_init_service_1.RedisInitService.isReady();
    let dbReady = false;
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        dbReady = true;
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Database readiness check failed');
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
    }
    else {
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
    const redisStats = await redis_init_service_1.RedisInitService.getStats().catch(() => null);
    const agentHealth = await agent_registry_1.agentRegistry.getAllHealthStatus();
    // Get database connection pool stats
    let dbPoolStats = null;
    try {
        const result = await client_1.prisma.$queryRaw `
      SELECT name, setting FROM pg_settings WHERE name IN ('max_connections', 'superuser_reserved_connections')
    `;
        dbPoolStats = result;
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get DB pool stats');
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
    const agentHealth = await agent_registry_1.agentRegistry.getAllHealthStatus();
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
    const agent = agent_registry_1.agentRegistry.getAgent(agentType);
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
    const checks = {};
    // Check Database
    const dbStart = Date.now();
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    }
    catch (error) {
        checks.database = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
    // Check Redis
    const redisStart = Date.now();
    const redisReady = redis_init_service_1.RedisInitService.isReady();
    if (redisReady) {
        checks.redis = { status: 'healthy', latency: Date.now() - redisStart };
    }
    else {
        checks.redis = { status: 'unhealthy', error: 'Redis not connected' };
    }
    // Check Stripe API
    const stripeStart = Date.now();
    try {
        const stripe = await Promise.resolve().then(() => __importStar(require('stripe')));
        const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY, { timeout: 5000 });
        await stripeClient.balance.retrieve();
        checks.stripe = { status: 'healthy', latency: Date.now() - stripeStart };
    }
    catch (error) {
        checks.stripe = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
    // Check OpenAI
    const openaiStart = Date.now();
    try {
        const { OpenAIService } = await Promise.resolve().then(() => __importStar(require('../services/ai/openai.service')));
        await OpenAIService.listModels();
        checks.openai = { status: 'healthy', latency: Date.now() - openaiStart };
    }
    catch (error) {
        checks.openai = { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' };
    }
    res.json({
        success: true,
        data: checks,
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map