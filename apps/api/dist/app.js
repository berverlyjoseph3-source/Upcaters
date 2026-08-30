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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestratorClient = exports.app = void 0;
// enterprise-ai-agent-platform/apps/api/src/app.ts
const uuid_1 = require("uuid");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const client_1 = require("./db/client");
const redis_init_service_1 = require("./services/redis-init.service");
const usage_reset_cron_1 = require("./cron/usage-reset.cron");
const security_headers_middleware_1 = require("./middleware/security-headers.middleware");
const security_headers_middleware_2 = require("./middleware/security-headers.middleware");
const error_handler_1 = require("./middleware/error-handler");
const rate_limit_middleware_1 = require("./auth/middleware/rate-limit.middleware");
const plan_gate_middleware_1 = require("./middleware/plan-gate.middleware");
const openai_service_1 = require("./services/ai/openai.service");
const usage_metering_service_1 = require("./services/usage-metering.service");
const agent_repository_1 = require("./db/repositories/agent.repository");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const usage_routes_1 = __importDefault(require("./routes/usage.routes"));
const billing_routes_1 = __importDefault(require("./billing/routes/billing.routes"));
const webhook_routes_1 = __importDefault(require("./billing/routes/webhook.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const docs_routes_1 = __importDefault(require("./routes/docs.routes"));
// Import agents
const agent_registry_1 = require("./agents/core/agent.registry");
const email_agent_1 = require("./agents/email/email.agent");
const drive_agent_1 = require("./agents/drive/drive.agent");
const content_agent_1 = require("./agents/content/content.agent");
const social_agent_1 = require("./agents/social/social.agent");
const calendar_agent_1 = require("./agents/calendar/calendar.agent");
const web_agent_1 = require("./agents/web/web.agent");
const task_agent_1 = require("./agents/task/task.agent");
const ultimate_orchestrator_1 = require("./agents/orchestrator/ultimate-orchestrator");
const orchestrator_client_1 = require("./agents/orchestrator/orchestrator.client");
const agent_types_1 = require("./types/agent.types");
// ============================================
// Express App
// ============================================
const app = (0, express_1.default)();
exports.app = app;
// ============================================
// ENHANCEMENT: Orchestrator Client Instance
// ============================================
let orchestratorClient = null;
exports.orchestratorClient = orchestratorClient;
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Initialize all services
 */
async function initializeServices() {
    try {
        logger_1.logger.info('Initializing services...');
        // Initialize OpenAI service
        if (config_1.config.ai.openai.apiKey) {
            openai_service_1.OpenAIService.initialize();
            logger_1.logger.info('OpenAI service initialized');
        }
        else {
            logger_1.logger.warn('OpenAI API key not configured - AI features will not work');
        }
        // Initialize Redis for usage metering
        const redisUrl = process.env.REDIS_URL || config_1.config.redis.url;
        const redisInitialized = await redis_init_service_1.RedisInitService.initialize(redisUrl);
        if (!redisInitialized) {
            logger_1.logger.warn('Redis initialization failed - usage metering will use fallback mode');
        }
        else {
            logger_1.logger.info('Redis initialized successfully');
            usage_metering_service_1.UsageMeteringService.initRedis(redisUrl);
        }
        // Initialize cron jobs for usage metering
        (0, usage_reset_cron_1.initializeCronJobs)();
        logger_1.logger.info('Cron jobs initialized');
        // Test database connection
        await client_1.prisma.$queryRaw `SELECT 1`;
        logger_1.logger.info('Database connection verified');
        // ENHANCEMENT: Initialize orchestrator client
        exports.orchestratorClient = orchestratorClient = new orchestrator_client_1.OrchestratorClient({
            maxStepsPerPlan: 10,
            maxRetriesPerStep: 3,
            maxPlanRetries: 2,
            maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '10') || 10,
            defaultTimeoutMs: 30000,
            executionTimeoutMs: parseInt(process.env.EXECUTION_TIMEOUT_MS || '300000') || 300000,
            enableAutomaticFallbacks: process.env.ENABLE_AUTO_FALLBACKS !== 'false',
            enablePlanOptimization: process.env.ENABLE_PLAN_OPTIMIZATION !== 'false',
            enableMemoryConsolidation: process.env.ENABLE_MEMORY_CONSOLIDATION !== 'false',
            enableExecutionReflection: process.env.ENABLE_EXECUTION_REFLECTION !== 'false',
            enablePreExecutionCostCheck: process.env.ENABLE_PRE_EXECUTION_COST_CHECK !==
                'false',
            enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
            enableBackpressure: process.env.ENABLE_BACKPRESSURE !== 'false',
            circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5') || 5,
            circuitBreakerTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS ||
                '60000') || 60000,
            retryBaseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000') || 1000,
            retryMaxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || '30000') || 30000,
            defaultModel: process.env.DEFAULT_AI_MODEL || 'gpt-4',
            modelFallbackChain: [
                'openai',
                ...(process.env.MODEL_FALLBACK_CHAIN?.split(',') || ['anthropic', 'gemini']),
            ],
            classificationOptions: {
                confidenceThreshold: 0.6,
                maxAlternatives: 3,
                useCache: true,
                cacheTTL: 3600,
                useAIFallback: true,
                extractEntities: true,
                includeComplexityEstimation: true,
                preferredMethod: 'hybrid',
            },
            planningOptions: {
                maxSteps: 10,
                enableParallelization: true,
                enableFallbacks: true,
                estimatedCost: true,
                optimizationGoal: 'balanced',
                maxDepth: 3,
                timeout: 15000,
            },
            executionOptions: {
                maxRetries: 3,
                parallel: true,
                stopOnError: false,
                timeout: 60000,
                priority: 1,
                storeInMemory: true,
                generateEmbeddings: true,
            },
            memoryOptions: {
                maxShortTermEntries: 50,
                shortTermTTLSeconds: 3600,
                longTermImportanceThreshold: 0.7,
                enableVectorSearch: true,
            },
            streamingOptions: {
                enabled: true,
                chunkDelayMs: 50,
                maxChunkSize: 200,
            },
            rateLimiting: {
                requestsPerMinute: 60,
                tokensPerMinute: 90000,
                costPerHour: 50,
            },
        });
        logger_1.logger.info('Orchestrator client initialized');
        logger_1.logger.info('All services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to initialize services');
        throw error;
    }
}
/**
 * Initialize all agents
 */
async function initializeAgents() {
    try {
        logger_1.logger.info('Initializing agents...');
        // Register all agents
        agent_registry_1.agentRegistry.registerAgent(new email_agent_1.EmailAgent());
        agent_registry_1.agentRegistry.registerAgent(new drive_agent_1.DriveAgent());
        agent_registry_1.agentRegistry.registerAgent(new content_agent_1.ContentAgent());
        agent_registry_1.agentRegistry.registerAgent(new social_agent_1.SocialAgent());
        agent_registry_1.agentRegistry.registerAgent(new calendar_agent_1.CalendarAgent());
        agent_registry_1.agentRegistry.registerAgent(new web_agent_1.WebAgent());
        agent_registry_1.agentRegistry.registerAgent(new task_agent_1.TaskAgent());
        agent_registry_1.agentRegistry.registerAgent(new ultimate_orchestrator_1.UltimateOrchestrator());
        // Initialize all agents
        await agent_registry_1.agentRegistry.initializeAll();
        logger_1.logger.info('All agents initialized successfully');
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to initialize agents');
        throw error;
    }
}
// ============================================
// MIDDLEWARE SETUP
// ============================================
// Request ID middleware (must be first)
app.use((0, security_headers_middleware_2.requestId)());
// Compression for response bodies
app.use((0, compression_1.default)());
// Security headers
app.use((0, security_headers_middleware_1.securityHeaders)());
// CORS
app.use((0, cors_1.default)(security_headers_middleware_1.corsConfig));
// Raw body parser for Stripe webhooks (must be before express.json)
app.use('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), (req, res, next) => {
    req.rawBody = req.body;
    next();
});
// Body parsing for all other routes
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parser (for refresh tokens)
app.use((0, cookie_parser_1.default)());
// Rate limiting
app.use(rate_limit_middleware_1.moderateRateLimit);
// Usage headers (adds X-AI-Actions-Used, X-API-Calls-Used, etc.)
app.use((0, plan_gate_middleware_1.addUsageHeaders)());
// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.debug({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            requestId: req.id,
            ip: req.ip,
        }, 'Request completed');
    });
    next();
});
// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================
/**
 * GET /health
 * Basic health check
 */
app.get('/health', async (req, res) => {
    const redisHealth = await redis_init_service_1.RedisInitService.getHealthStatus();
    const agentHealth = await agent_registry_1.agentRegistry.getAllHealthStatus();
    const agentsHealthy = Object.values(agentHealth).filter((a) => a.status !== 'error').length;
    const agentsTotal = Object.keys(agentHealth).length;
    // ENHANCEMENT: Orchestrator health
    const orchestratorHealth = orchestratorClient
        ? await orchestratorClient.getHealth()
        : null;
    res.json({
        status: orchestratorHealth?.isHealthy
            ? 'healthy'
            : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '3.0.0',
        services: {
            database: 'connected',
            redis: redisHealth,
            agents: {
                total: agentsTotal,
                healthy: agentsHealthy,
                degraded: agentsTotal - agentsHealthy,
            },
            orchestrator: orchestratorHealth
                ? {
                    active: orchestratorHealth
                        .activeExecutions,
                    waiting: orchestratorHealth.waitingExecutions,
                    rejected: orchestratorHealth.rejectedExecutions,
                    load: orchestratorHealth.currentLoad,
                    circuitBreakers: orchestratorHealth.metrics
                        .circuitBreakerStatus
                        ? Object.keys(orchestratorHealth.metrics
                            .circuitBreakerStatus).length
                        : 0,
                }
                : null,
        },
    });
});
/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
app.get('/health/ready', async (req, res) => {
    const redisReady = redis_init_service_1.RedisInitService.isReady();
    let dbReady = false;
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        dbReady = true;
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Database readiness check failed');
    }
    const allReady = dbReady && redisReady;
    if (allReady) {
        res.status(200).json({
            ready: true,
            services: {
                database: dbReady,
                redis: redisReady,
                orchestrator: orchestratorClient?.getConfig()
                    .enableCircuitBreaker
                    ? 'configured'
                    : 'active',
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
app.get('/health/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /health/metrics
 * Detailed metrics for monitoring
 */
app.get('/health/metrics', async (req, res) => {
    const redisStats = await redis_init_service_1.RedisInitService.getStats().catch(() => null);
    const agentHealth = await agent_registry_1.agentRegistry.getAllHealthStatus();
    const orchestratorMetrics = orchestratorClient
        ? orchestratorClient.getMetrics()
        : null;
    const circuitBreakerStatus = orchestratorClient
        ? orchestratorClient.getCircuitBreakerStatus()
        : null;
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
            },
            redis: redisStats,
            agents: agentHealth,
        },
        orchestrator: orchestratorMetrics
            ? {
                executions: {
                    total: orchestratorMetrics.totalExecutions,
                    successful: orchestratorMetrics.successfulExecutions,
                    failed: orchestratorMetrics.failedExecutions,
                    partialSuccess: orchestratorMetrics.partialSuccessExecutions,
                    rejected: orchestratorMetrics.rejectedExecutions,
                },
                performance: {
                    avgTimeMs: orchestratorMetrics.averageExecutionTimeMs,
                    p95TimeMs: orchestratorMetrics.p95ExecutionTimeMs,
                    p99TimeMs: orchestratorMetrics.p99ExecutionTimeMs,
                },
                cost: {
                    totalTokens: orchestratorMetrics.totalTokensUsed,
                    totalCostUsd: orchestratorMetrics.totalCostUsd,
                },
                circuitBreakers: circuitBreakerStatus,
            }
            : null,
    });
});
/**
 * GET /health/dependencies
 * Check external API dependencies
 */
app.get('/health/dependencies', async (req, res) => {
    const checks = {};
    // Check Stripe
    const stripeStart = Date.now();
    try {
        const stripe = await Promise.resolve().then(() => __importStar(require('stripe')));
        const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY, { timeout: 5000 });
        await stripeClient.balance.retrieve();
        checks.stripe = {
            status: 'healthy',
            latency: Date.now() - stripeStart,
        };
    }
    catch (error) {
        checks.stripe = {
            status: 'unhealthy',
            error: error instanceof Error
                ? error.message
                : 'Unknown error',
        };
    }
    // Check OpenAI
    const openaiStart = Date.now();
    try {
        await openai_service_1.OpenAIService.listModels();
        checks.openai = {
            status: 'healthy',
            latency: Date.now() - openaiStart,
        };
    }
    catch (error) {
        checks.openai = {
            status: 'unhealthy',
            error: error instanceof Error
                ? error.message
                : 'Unknown error',
        };
    }
    // ENHANCEMENT: Check Redis
    const redisStart = Date.now();
    try {
        const redis = redis_init_service_1.RedisInitService.getClient();
        await redis.ping();
        checks.redis = {
            status: 'healthy',
            latency: Date.now() - redisStart,
        };
    }
    catch (error) {
        checks.redis = {
            status: 'unhealthy',
            error: error instanceof Error
                ? error.message
                : 'Redis not connected',
        };
    }
    res.json({
        success: true,
        data: checks,
        timestamp: new Date().toISOString(),
    });
});
// ============================================
// ENHANCEMENT: ORCHESTRATOR MANAGEMENT ENDPOINTS
// ============================================
/**
 * GET /health/orchestrator/status
 * Get orchestrator circuit breaker and backpressure status
 */
app.get('/health/orchestrator/status', async (req, res) => {
    try {
        if (!orchestratorClient) {
            res.status(503).json({
                success: false,
                error: 'Orchestrator client not initialized',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        const health = await orchestratorClient.getHealth();
        const circuitBreakers = orchestratorClient.getCircuitBreakerStatus();
        res.json({
            success: true,
            data: {
                health,
                circuitBreakers,
                config: orchestratorClient.getConfig(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get orchestrator status');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve orchestrator status',
            code: 'ORCHESTRATOR_STATUS_ERROR',
        });
    }
});
/**
 * POST /health/orchestrator/circuit-breaker/:agentType/reset
 * Reset circuit breaker for a specific agent (admin only)
 */
app.post('/health/orchestrator/circuit-breaker/:agentType/reset', async (req, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({
                success: false,
                error: 'Admin access required',
                code: 'FORBIDDEN',
            });
            return;
        }
        const { agentType } = req.params;
        if (!orchestratorClient) {
            res.status(503).json({
                success: false,
                error: 'Orchestrator client not initialized',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        orchestratorClient.resetCircuitBreaker(agentType);
        logger_1.logger.info({ agentType, adminId: req.user.id }, 'Circuit breaker reset by admin');
        res.json({
            success: true,
            message: `Circuit breaker for "${agentType}" reset successfully`,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, agentType: req.params.agentType }, 'Failed to reset circuit breaker');
        res.status(500).json({
            success: false,
            error: 'Failed to reset circuit breaker',
            code: 'RESET_ERROR',
        });
    }
});
/**
 * POST /health/orchestrator/circuit-breaker/reset-all
 * Reset all circuit breakers (admin only)
 */
app.post('/health/orchestrator/circuit-breaker/reset-all', async (req, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({
                success: false,
                error: 'Admin access required',
                code: 'FORBIDDEN',
            });
            return;
        }
        if (!orchestratorClient) {
            res.status(503).json({
                success: false,
                error: 'Orchestrator client not initialized',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        const breakers = orchestratorClient.getCircuitBreakerStatus();
        for (const agentType of Object.keys(breakers)) {
            orchestratorClient.resetCircuitBreaker(agentType);
        }
        logger_1.logger.info({ adminId: req.user.id }, 'All circuit breakers reset by admin');
        res.json({
            success: true,
            message: `All circuit breakers (${Object.keys(breakers).length}) reset successfully`,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to reset all circuit breakers');
        res.status(500).json({
            success: false,
            error: 'Failed to reset circuit breakers',
            code: 'RESET_ERROR',
        });
    }
});
/**
 * GET /health/orchestrator/metrics
 * Get detailed orchestrator metrics (admin only)
 */
app.get('/health/orchestrator/metrics', async (req, res) => {
    try {
        if (!orchestratorClient) {
            res.status(503).json({
                success: false,
                error: 'Orchestrator client not initialized',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        const metrics = orchestratorClient.getMetrics();
        const status = orchestratorClient.getCircuitBreakerStatus();
        res.json({
            success: true,
            data: {
                ...metrics,
                circuitBreakerStatus: status,
                timestamp: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get orchestrator metrics');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics',
            code: 'METRICS_ERROR',
        });
    }
});
// ============================================
// ENHANCEMENT: EXECUTION RECOVERY ENDPOINTS
// ============================================
/**
 * GET /api/execution/state/:executionId
 * Get persisted execution state
 */
app.get('/api/execution/state/:executionId', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
            });
            return;
        }
        const state = await agent_repository_1.AgentRepository.loadExecutionState(req.params.executionId);
        if (!state) {
            res.status(404).json({
                success: false,
                error: 'Execution state not found',
                code: 'NOT_FOUND',
            });
            return;
        }
        res.json({
            success: true,
            data: state,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, executionId: req.params.executionId }, 'Failed to get execution state');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve execution state',
            code: 'STATE_ERROR',
        });
    }
});
/**
 * POST /api/execution/resume/:executionId
 * Resume a failed execution
 */
app.post('/api/execution/resume/:executionId', async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'UNAUTHORIZED',
            });
            return;
        }
        const orchestrator = agent_registry_1.agentRegistry.getAgent(agent_types_1.AgentType.ORCHESTRATOR);
        if (!orchestrator) {
            res.status(503).json({
                success: false,
                error: 'Orchestrator not available',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        const context = {
            sessionId: req.body.sessionId || (0, uuid_1.v4)(),
            userId: req.user.id,
            preferences: req.user.preferences || {},
            plan: { id: req.user.planId, name: req.user.planId },
        };
        const result = await orchestrator.resumeExecution(req.params.executionId, context);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error({ error, executionId: req.params.executionId }, 'Failed to resume execution');
        res.status(500).json({
            success: false,
            error: 'Failed to resume execution',
            code: 'RESUME_ERROR',
        });
    }
});
/**
 * GET /api/execution/states
 * List all persisted execution states (admin only)
 */
app.get('/api/execution/states', async (req, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            res.status(403).json({
                success: false,
                error: 'Admin access required',
                code: 'FORBIDDEN',
            });
            return;
        }
        const status = req.query.status;
        const limit = parseInt(req.query.limit || '50');
        const offset = parseInt(req.query.offset || '0');
        const result = await agent_repository_1.AgentRepository.listExecutionStates(status, limit, offset);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to list execution states');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve execution states',
            code: 'LIST_ERROR',
        });
    }
});
// ============================================
// AGENT ROUTES
// ============================================
/**
 * POST /api/agent/execute
 * Execute an agent action through the orchestrator
 */
app.post('/api/agent/execute', async (req, res) => {
    try {
        const { input, sessionId, context } = req.body;
        if (!input) {
            res.status(400).json({
                success: false,
                error: 'Input is required',
                code: 'MISSING_INPUT',
            });
            return;
        }
        const orchestrator = agent_registry_1.agentRegistry.getAgent(agent_types_1.AgentType.ORCHESTRATOR);
        if (!orchestrator) {
            res.status(500).json({
                success: false,
                error: 'Orchestrator not available',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        const request = {
            id: (0, uuid_1.v4)(),
            userId: req.user?.id || 'anonymous',
            sessionId: sessionId || `session_${Date.now()}`,
            input: typeof input === 'string'
                ? input
                : JSON.stringify(input),
            context: context || {},
            priority: req.body.priority || 1,
        };
        const agentContext = {
            sessionId: request.sessionId,
            userId: request.userId,
            previousResponses: [],
            preferences: req.user?.preferences || {},
            plan: {
                id: req.user?.planId || 'FREE',
                name: req.user?.planId || 'Free',
                limits: {
                    aiActions: 2500,
                    apiCalls: 15000,
                },
                features: [],
            },
        };
        // ENHANCEMENT: Pre-execution cost check
        if (req.user?.id) {
            const costCheck = await usage_metering_service_1.UsageMeteringService.canAffordExecution(req.user.id, 1000, 0.01);
            if (costCheck.reason) {
                res.setHeader('X-Cost-Warning', costCheck.reason);
                if (costCheck.recommendation) {
                    res.setHeader('X-Upgrade-Recommendation', JSON.stringify(costCheck.recommendation));
                }
            }
        }
        const response = await orchestrator.execute(request, agentContext);
        res.json({
            success: response.success,
            data: response.output?.data || response.output,
            metadata: {
                ...response.metadata,
                status: response.output?.status || 'success',
            },
            error: response.error,
            warnings: response.output?.warnings,
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Agent execution failed');
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Agent execution failed',
            code: 'EXECUTION_ERROR',
        });
    }
});
/**
 * POST /api/agent/stream
 * Execute an agent action with streaming response (SSE)
 */
app.post('/api/agent/stream', async (req, res) => {
    try {
        const { input, sessionId, context } = req.body;
        if (!input) {
            res.status(400).json({
                success: false,
                error: 'Input is required',
                code: 'MISSING_INPUT',
            });
            return;
        }
        const orchestrator = agent_registry_1.agentRegistry.getAgent(agent_types_1.AgentType.ORCHESTRATOR);
        if (!orchestrator) {
            res.status(500).json({
                success: false,
                error: 'Orchestrator not available',
                code: 'ORCHESTRATOR_NOT_READY',
            });
            return;
        }
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            timestamp: new Date().toISOString(),
        })}\n\n`);
        const request = {
            id: (0, uuid_1.v4)(),
            userId: req.user?.id || 'anonymous',
            sessionId: sessionId || `session_${Date.now()}`,
            input: typeof input === 'string'
                ? input
                : JSON.stringify(input),
            context: context || {},
            priority: req.body.priority || 1,
        };
        const agentContext = {
            sessionId: request.sessionId,
            userId: request.userId,
            previousResponses: [],
            preferences: req.user?.preferences || {},
            plan: {
                id: req.user?.planId || 'FREE',
                name: req.user?.planId || 'Free',
                limits: {
                    aiActions: 2500,
                    apiCalls: 15000,
                },
                features: [],
            },
        };
        const onChunk = (chunk) => {
            res.write(`data: ${JSON.stringify({
                ...chunk,
                timestamp: new Date().toISOString(),
            })}\n\n`);
        };
        const response = await orchestrator.executeStream(request, agentContext, onChunk);
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            data: response.output,
            metadata: response.metadata,
            timestamp: new Date().toISOString(),
        })}\n\n`);
        res.end();
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Agent streaming failed');
        res.write(`data: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error
                ? error.message
                : 'Agent execution failed',
            timestamp: new Date().toISOString(),
        })}\n\n`);
        res.end();
    }
});
/**
 * GET /api/agent/status
 * Get status of all agents with orchestrator metrics
 */
app.get('/api/agent/status', async (req, res) => {
    try {
        const health = await agent_registry_1.agentRegistry.getAllHealthStatus();
        const orchestratorHealth = orchestratorClient
            ? await orchestratorClient.getHealth()
            : null;
        res.json({
            success: true,
            data: {
                agents: health,
                orchestrator: orchestratorHealth
                    ? {
                        state: orchestratorHealth.state,
                        isHealthy: orchestratorHealth.isHealthy,
                        activeExecutions: orchestratorHealth.activeExecutions,
                        load: orchestratorHealth.currentLoad,
                        version: orchestratorHealth.version,
                    }
                    : null,
            },
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to get agent status');
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve agent status',
            code: 'STATUS_ERROR',
        });
    }
});
// ============================================
// API ROUTES
// ============================================
// Auth routes (public + protected)
app.use('/api/auth', auth_routes_1.default);
// Usage metering routes (protected)
app.use('/api/usage', usage_routes_1.default);
// Billing routes (protected)
app.use('/api/billing', billing_routes_1.default);
// Webhook routes (public, no auth)
app.use('/api/webhooks', webhook_routes_1.default);
// Analytics routes (protected)
app.use('/api/analytics', analytics_routes_1.default);
// Health routes
app.use('/health', health_routes_1.default);
// Documentation routes
app.use('/api/docs', docs_routes_1.default);
// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/', (req, res) => {
    res.json({
        name: 'Enterprise AI Agent Platform API',
        version: '3.0.0',
        status: 'operational',
        features: {
            orchestrator: 'enhanced',
            circuitBreaker: true,
            backpressure: true,
            preExecutionCostCheck: true,
            executionRecovery: true,
        },
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            usage: '/api/usage',
            billing: '/api/billing',
            agent: '/api/agent',
            analytics: '/api/analytics',
            docs: '/api/docs',
            execution: {
                state: '/api/execution/state/:executionId',
                resume: '/api/execution/resume/:executionId',
                list: '/api/execution/states',
            },
            orchestrator: {
                status: '/health/orchestrator/status',
                metrics: '/health/orchestrator/metrics',
                resetCircuitBreaker: '/health/orchestrator/circuit-breaker/:agentType/reset',
                resetAllCircuitBreakers: '/health/orchestrator/circuit-breaker/reset-all',
            },
        },
        documentation: `${process.env.APP_URL}/api-docs`,
    });
});
// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        code: 'NOT_FOUND',
        path: req.path,
        method: req.method,
    });
});
// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use(error_handler_1.errorHandler);
// ============================================
// GRACEFUL SHUTDOWN
// ============================================
let isShuttingDown = false;
let server = null;
async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        logger_1.logger.warn('Shutdown already in progress');
        return;
    }
    isShuttingDown = true;
    logger_1.logger.info(`${signal} received. Starting graceful shutdown...`);
    const shutdownTimeout = setTimeout(() => {
        logger_1.logger.error('Shutdown timeout reached, forcing exit');
        process.exit(1);
    }, 30000);
    try {
        // Stop accepting new requests
        if (server) {
            logger_1.logger.info('Closing HTTP server...');
            await new Promise((resolve) => {
                server.close(() => {
                    logger_1.logger.info('HTTP server closed');
                    resolve();
                });
            });
        }
        // ENHANCEMENT: Shutdown orchestrator client
        if (orchestratorClient) {
            logger_1.logger.info('Shutting down orchestrator client...');
            await orchestratorClient.shutdown();
        }
        // Stop cron jobs
        logger_1.logger.info('Stopping cron jobs...');
        (0, usage_reset_cron_1.stopAllCronJobs)();
        // Shutdown agents
        logger_1.logger.info('Shutting down agents...');
        await agent_registry_1.agentRegistry.shutdownAll();
        // Close queue workers
        logger_1.logger.info('Closing queue workers...');
        const { usageReportWorker, usageBillingWorker, } = await Promise.resolve().then(() => __importStar(require('./queues/usage-report.job')));
        await Promise.all([
            usageReportWorker?.close(),
            usageBillingWorker?.close(),
        ]).catch(() => { });
        // Close Redis connection
        logger_1.logger.info('Closing Redis connection...');
        await redis_init_service_1.RedisInitService.disconnect();
        // Close database connection
        logger_1.logger.info('Closing database connection...');
        await client_1.prisma.$disconnect();
        clearTimeout(shutdownTimeout);
        logger_1.logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
    }
}
// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error({ reason, promise }, 'Unhandled Rejection at:');
});
// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logger_1.logger.error({ error }, 'Uncaught Exception thrown');
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
// ============================================
// START SERVER
// ============================================
const PORT = config_1.config.port || 3000;
async function startServer() {
    try {
        await initializeServices();
        await initializeAgents();
        server = app.listen(PORT, () => {
            logger_1.logger.info(`🚀 Enterprise AI Agent Platform API v3.0.0`);
            logger_1.logger.info(`📍 Environment: ${config_1.config.nodeEnv}`);
            logger_1.logger.info(`🔗 URL: ${config_1.config.apiUrl}`);
            logger_1.logger.info(`💾 Port: ${PORT}`);
            logger_1.logger.info(`💳 Redis: ${redis_init_service_1.RedisInitService.isReady() ? 'connected' : 'fallback mode'}`);
            logger_1.logger.info(`🤖 Agents: ${agent_registry_1.agentRegistry.getAllAgents().length} registered`);
            logger_1.logger.info(`⚡ Orchestrator: Enhanced (circuit breakers, backpressure, cost checks)`);
            logger_1.logger.info(`⏰ Cron jobs: initialized`);
            logger_1.logger.info(`✨ Ready to accept requests`);
        });
        server.on('error', (error) => {
            logger_1.logger.error({ error }, 'Server error');
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}
// Start the server
startServer();
//# sourceMappingURL=app.js.map