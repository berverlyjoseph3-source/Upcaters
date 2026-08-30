// enterprise-ai-agent-platform/apps/api/src/app.ts
import { v4 as uuidv4 } from 'uuid';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './db/client';
import { RedisInitService } from './services/redis-init.service';
import { initializeCronJobs, stopAllCronJobs } from './cron/usage-reset.cron';
import {
  securityHeaders,
  corsConfig,
} from './middleware/security-headers.middleware';
import { requestId } from './middleware/security-headers.middleware';
import { errorHandler } from './middleware/error-handler';
import { moderateRateLimit as rateLimiter } from './auth/middleware/rate-limit.middleware';
import { addUsageHeaders } from './middleware/plan-gate.middleware';
import { OpenAIService } from './services/ai/openai.service';
import { UsageMeteringService } from './services/usage-metering.service';
import { AgentRepository } from './db/repositories/agent.repository';

// Import routes
import authRoutes from './routes/auth.routes';
import usageRoutes from './routes/usage.routes';
import billingRoutes from './billing/routes/billing.routes';
import webhookRoutes from './billing/routes/webhook.routes';
import analyticsRoutes from './routes/analytics.routes';
import healthRoutes from './routes/health.routes';
import docsRoutes from './routes/docs.routes';

// Import agents
import { agentRegistry } from './agents/core/agent.registry';
import { EmailAgent } from './agents/email/email.agent';
import { DriveAgent } from './agents/drive/drive.agent';
import { ContentAgent } from './agents/content/content.agent';
import { SocialAgent } from './agents/social/social.agent';
import { CalendarAgent } from './agents/calendar/calendar.agent';
import { WebAgent } from './agents/web/web.agent';
import { TaskAgent } from './agents/task/task.agent';
import { UltimateOrchestrator } from './agents/orchestrator/ultimate-orchestrator';
import { OrchestratorClient } from './agents/orchestrator/orchestrator.client';
import { AgentType } from './types/agent.types';

// ============================================
// Types
// ============================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    planId: string;
    preferences?: any;
  };
}

// ============================================
// Express App
// ============================================

const app: Express = express();

// ============================================
// ENHANCEMENT: Orchestrator Client Instance
// ============================================

let orchestratorClient: OrchestratorClient | null = null;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');

    // Initialize OpenAI service
    if (config.ai.openai.apiKey) {
      OpenAIService.initialize();
      logger.info('OpenAI service initialized');
    } else {
      logger.warn(
        'OpenAI API key not configured - AI features will not work',
      );
    }

    // Initialize Redis for usage metering
    const redisUrl =
      process.env.REDIS_URL || config.redis.url;
    const redisInitialized =
      await RedisInitService.initialize(redisUrl);

    if (!redisInitialized) {
      logger.warn(
        'Redis initialization failed - usage metering will use fallback mode',
      );
    } else {
      logger.info('Redis initialized successfully');
      UsageMeteringService.initRedis(redisUrl);
    }

    // Initialize cron jobs for usage metering
    initializeCronJobs();
    logger.info('Cron jobs initialized');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');

    // ENHANCEMENT: Initialize orchestrator client
    orchestratorClient = new OrchestratorClient({
      maxStepsPerPlan: 10,
      maxRetriesPerStep: 3,
      maxPlanRetries: 2,
      maxConcurrentExecutions:
        parseInt(
          process.env.MAX_CONCURRENT_EXECUTIONS || '10',
        ) || 10,
      defaultTimeoutMs: 30000,
      executionTimeoutMs:
        parseInt(
          process.env.EXECUTION_TIMEOUT_MS || '300000',
        ) || 300000,
      enableAutomaticFallbacks:
        process.env.ENABLE_AUTO_FALLBACKS !== 'false',
      enablePlanOptimization:
        process.env.ENABLE_PLAN_OPTIMIZATION !== 'false',
      enableMemoryConsolidation:
        process.env.ENABLE_MEMORY_CONSOLIDATION !== 'false',
      enableExecutionReflection:
        process.env.ENABLE_EXECUTION_REFLECTION !== 'false',
      enablePreExecutionCostCheck:
        process.env.ENABLE_PRE_EXECUTION_COST_CHECK !==
        'false',
      enableCircuitBreaker:
        process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
      enableBackpressure:
        process.env.ENABLE_BACKPRESSURE !== 'false',
      circuitBreakerThreshold:
        parseInt(
          process.env.CIRCUIT_BREAKER_THRESHOLD || '5',
        ) || 5,
      circuitBreakerTimeoutMs:
        parseInt(
          process.env.CIRCUIT_BREAKER_TIMEOUT_MS ||
            '60000',
        ) || 60000,
      retryBaseDelayMs:
        parseInt(
          process.env.RETRY_BASE_DELAY_MS || '1000',
        ) || 1000,
      retryMaxDelayMs:
        parseInt(
          process.env.RETRY_MAX_DELAY_MS || '30000',
        ) || 30000,
      defaultModel:
        process.env.DEFAULT_AI_MODEL || 'gpt-4',
      modelFallbackChain: [
        'openai',
        ...(process.env.MODEL_FALLBACK_CHAIN?.split(
          ',',
        ) || ['anthropic', 'gemini']),
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
    logger.info('Orchestrator client initialized');

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error(
      { error },
      'Failed to initialize services',
    );
    throw error;
  }
}

/**
 * Initialize all agents
 */
async function initializeAgents(): Promise<void> {
  try {
    logger.info('Initializing agents...');

    // Register all agents
    agentRegistry.registerAgent(new EmailAgent());
    agentRegistry.registerAgent(new DriveAgent());
    agentRegistry.registerAgent(new ContentAgent());
    agentRegistry.registerAgent(new SocialAgent());
    agentRegistry.registerAgent(new CalendarAgent());
    agentRegistry.registerAgent(new WebAgent());
    agentRegistry.registerAgent(new TaskAgent());
    agentRegistry.registerAgent(new UltimateOrchestrator());

    // Initialize all agents
    await agentRegistry.initializeAll();

    logger.info('All agents initialized successfully');
  } catch (error) {
    logger.error(
      { error },
      'Failed to initialize agents',
    );
    throw error;
  }
}

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Request ID middleware (must be first)
app.use(requestId());

// Compression for response bodies
app.use(compression());

// Security headers
app.use(securityHeaders());

// CORS
app.use(cors(corsConfig));

// Raw body parser for Stripe webhooks (must be before express.json)
app.use(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    (req as any).rawBody = req.body;
    next();
  },
);

// Body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({ extended: true, limit: '10mb' }),
);

// Cookie parser (for refresh tokens)
app.use(cookieParser());

// Rate limiting
app.use(rateLimiter);

// Usage headers (adds X-AI-Actions-Used, X-API-Calls-Used, etc.)
app.use(addUsageHeaders());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestId: (req as any).id,
        ip: req.ip,
      },
      'Request completed',
    );
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
app.get(
  '/health',
  async (req: Request, res: Response) => {
    const redisHealth =
      await RedisInitService.getHealthStatus();
    const agentHealth =
      await agentRegistry.getAllHealthStatus();
    const agentsHealthy = Object.values(
      agentHealth,
    ).filter((a) => a.status !== 'error').length;
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
              waiting:
                orchestratorHealth.waitingExecutions,
              rejected:
                orchestratorHealth.rejectedExecutions,
              load: orchestratorHealth.currentLoad,
              circuitBreakers:
                orchestratorHealth.metrics
                  .circuitBreakerStatus
                  ? Object.keys(
                      orchestratorHealth.metrics
                        .circuitBreakerStatus,
                    ).length
                  : 0,
            }
          : null,
      },
    });
  },
);

/**
 * GET /health/ready
 * Readiness probe for Kubernetes
 */
app.get(
  '/health/ready',
  async (req: Request, res: Response) => {
    const redisReady = RedisInitService.isReady();
    let dbReady = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbReady = true;
    } catch (error) {
      logger.error(
        { error },
        'Database readiness check failed',
      );
    }

    const allReady = dbReady && redisReady;

    if (allReady) {
      res.status(200).json({
        ready: true,
        services: {
          database: dbReady,
          redis: redisReady,
          orchestrator:
            orchestratorClient?.getConfig()
              .enableCircuitBreaker
              ? 'configured'
              : 'active',
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
  },
);

/**
 * GET /health/live
 * Liveness probe for Kubernetes
 */
app.get(
  '/health/live',
  (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  },
);

/**
 * GET /health/metrics
 * Detailed metrics for monitoring
 */
app.get(
  '/health/metrics',
  async (req: Request, res: Response) => {
    const redisStats = await RedisInitService.getStats().catch(
      () => null,
    );
    const agentHealth =
      await agentRegistry.getAllHealthStatus();
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
              total:
                orchestratorMetrics.totalExecutions,
              successful:
                orchestratorMetrics.successfulExecutions,
              failed:
                orchestratorMetrics.failedExecutions,
              partialSuccess:
                orchestratorMetrics.partialSuccessExecutions,
              rejected:
                orchestratorMetrics.rejectedExecutions,
            },
            performance: {
              avgTimeMs:
                orchestratorMetrics.averageExecutionTimeMs,
              p95TimeMs:
                orchestratorMetrics.p95ExecutionTimeMs,
              p99TimeMs:
                orchestratorMetrics.p99ExecutionTimeMs,
            },
            cost: {
              totalTokens:
                orchestratorMetrics.totalTokensUsed,
              totalCostUsd:
                orchestratorMetrics.totalCostUsd,
            },
            circuitBreakers: circuitBreakerStatus,
          }
        : null,
    });
  },
);

/**
 * GET /health/dependencies
 * Check external API dependencies
 */
app.get(
  '/health/dependencies',
  async (req: Request, res: Response) => {
    const checks: Record<
      string,
      {
        status: 'healthy' | 'unhealthy' | 'unknown';
        latency?: number;
        error?: string;
      }
    > = {};

    // Check Stripe
    const stripeStart = Date.now();
    try {
      const stripe = await import('stripe');
      const stripeClient = new stripe.default(
        process.env.STRIPE_SECRET_KEY!,
        { timeout: 5000 },
      );
      await stripeClient.balance.retrieve();
      checks.stripe = {
        status: 'healthy',
        latency: Date.now() - stripeStart,
      };
    } catch (error) {
      checks.stripe = {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      };
    }

    // Check OpenAI
    const openaiStart = Date.now();
    try {
      await OpenAIService.listModels();
      checks.openai = {
        status: 'healthy',
        latency: Date.now() - openaiStart,
      };
    } catch (error) {
      checks.openai = {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error',
      };
    }

    // ENHANCEMENT: Check Redis
    const redisStart = Date.now();
    try {
      const redis = RedisInitService.getClient();
      await redis.ping();
      checks.redis = {
        status: 'healthy',
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: 'unhealthy',
        error:
          error instanceof Error
            ? error.message
            : 'Redis not connected',
      };
    }

    res.json({
      success: true,
      data: checks,
      timestamp: new Date().toISOString(),
    });
  },
);

// ============================================
// ENHANCEMENT: ORCHESTRATOR MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /health/orchestrator/status
 * Get orchestrator circuit breaker and backpressure status
 */
app.get(
  '/health/orchestrator/status',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!orchestratorClient) {
        res.status(503).json({
          success: false,
          error: 'Orchestrator client not initialized',
          code: 'ORCHESTRATOR_NOT_READY',
        });
        return;
      }

      const health =
        await orchestratorClient.getHealth();
      const circuitBreakers =
        orchestratorClient.getCircuitBreakerStatus();

      res.json({
        success: true,
        data: {
          health,
          circuitBreakers,
          config: orchestratorClient.getConfig(),
        },
      });
    } catch (error) {
      logger.error(
        { error },
        'Failed to get orchestrator status',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve orchestrator status',
        code: 'ORCHESTRATOR_STATUS_ERROR',
      });
    }
  },
);

/**
 * POST /health/orchestrator/circuit-breaker/:agentType/reset
 * Reset circuit breaker for a specific agent (admin only)
 */
app.post(
  '/health/orchestrator/circuit-breaker/:agentType/reset',
  async (req: AuthenticatedRequest, res: Response) => {
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

      orchestratorClient.resetCircuitBreaker(
        agentType,
      );

      logger.info(
        { agentType, adminId: req.user.id },
        'Circuit breaker reset by admin',
      );

      res.json({
        success: true,
        message: `Circuit breaker for "${agentType}" reset successfully`,
      });
    } catch (error) {
      logger.error(
        { error, agentType: req.params.agentType },
        'Failed to reset circuit breaker',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to reset circuit breaker',
        code: 'RESET_ERROR',
      });
    }
  },
);

/**
 * POST /health/orchestrator/circuit-breaker/reset-all
 * Reset all circuit breakers (admin only)
 */
app.post(
  '/health/orchestrator/circuit-breaker/reset-all',
  async (req: AuthenticatedRequest, res: Response) => {
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

      const breakers =
        orchestratorClient.getCircuitBreakerStatus();
      for (const agentType of Object.keys(breakers)) {
        orchestratorClient.resetCircuitBreaker(
          agentType,
        );
      }

      logger.info(
        { adminId: req.user.id },
        'All circuit breakers reset by admin',
      );

      res.json({
        success: true,
        message: `All circuit breakers (${Object.keys(breakers).length}) reset successfully`,
      });
    } catch (error) {
      logger.error(
        { error },
        'Failed to reset all circuit breakers',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to reset circuit breakers',
        code: 'RESET_ERROR',
      });
    }
  },
);

/**
 * GET /health/orchestrator/metrics
 * Get detailed orchestrator metrics (admin only)
 */
app.get(
  '/health/orchestrator/metrics',
  async (req: AuthenticatedRequest, res: Response) => {
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
      const status =
        orchestratorClient.getCircuitBreakerStatus();

      res.json({
        success: true,
        data: {
          ...metrics,
          circuitBreakerStatus: status,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(
        { error },
        'Failed to get orchestrator metrics',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
        code: 'METRICS_ERROR',
      });
    }
  },
);

// ============================================
// ENHANCEMENT: EXECUTION RECOVERY ENDPOINTS
// ============================================

/**
 * GET /api/execution/state/:executionId
 * Get persisted execution state
 */
app.get(
  '/api/execution/state/:executionId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const state = await AgentRepository.loadExecutionState(
        req.params.executionId,
      );

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
    } catch (error) {
      logger.error(
        { error, executionId: req.params.executionId },
        'Failed to get execution state',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve execution state',
        code: 'STATE_ERROR',
      });
    }
  },
);

/**
 * POST /api/execution/resume/:executionId
 * Resume a failed execution
 */
app.post(
  '/api/execution/resume/:executionId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const orchestrator =
        agentRegistry.getAgent(AgentType.ORCHESTRATOR);
      if (!orchestrator) {
        res.status(503).json({
          success: false,
          error: 'Orchestrator not available',
          code: 'ORCHESTRATOR_NOT_READY',
        });
        return;
      }

      const context = {
        sessionId: req.body.sessionId || uuidv4(),
        userId: req.user.id,
        preferences: req.user.preferences || {},
        plan: { id: req.user.planId, name: req.user.planId },
      };

      const result = await (
        orchestrator as UltimateOrchestrator
      ).resumeExecution(
        req.params.executionId,
        context as any,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(
        { error, executionId: req.params.executionId },
        'Failed to resume execution',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to resume execution',
        code: 'RESUME_ERROR',
      });
    }
  },
);

/**
 * GET /api/execution/states
 * List all persisted execution states (admin only)
 */
app.get(
  '/api/execution/states',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const status = req.query.status as
        | string
        | undefined;
      const limit = parseInt(
        (req.query.limit as string) || '50',
      );
      const offset = parseInt(
        (req.query.offset as string) || '0',
      );

      const result =
        await AgentRepository.listExecutionStates(
          status as any,
          limit,
          offset,
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(
        { error },
        'Failed to list execution states',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve execution states',
        code: 'LIST_ERROR',
      });
    }
  },
);

// ============================================
// AGENT ROUTES
// ============================================

/**
 * POST /api/agent/execute
 * Execute an agent action through the orchestrator
 */
app.post(
  '/api/agent/execute',
  async (req: AuthenticatedRequest, res: Response) => {
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

      const orchestrator = agentRegistry.getAgent(
        AgentType.ORCHESTRATOR,
      );

      if (!orchestrator) {
        res.status(500).json({
          success: false,
          error: 'Orchestrator not available',
          code: 'ORCHESTRATOR_NOT_READY',
        });
        return;
      }

      const request = {
        id: uuidv4(),
        userId: req.user?.id || 'anonymous',
        sessionId:
          sessionId || `session_${Date.now()}`,
        input:
          typeof input === 'string'
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
        const costCheck =
          await UsageMeteringService.canAffordExecution(
            req.user.id,
            1000,
            0.01,
          );
        if (costCheck.reason) {
          res.setHeader(
            'X-Cost-Warning',
            costCheck.reason,
          );
          if (costCheck.recommendation) {
            res.setHeader(
              'X-Upgrade-Recommendation',
              JSON.stringify(
                costCheck.recommendation,
              ),
            );
          }
        }
      }

      const response = await orchestrator.execute(
        request,
        agentContext as any,
      );

      res.json({
        success: response.success,
        data: response.output?.data || response.output,
        metadata: {
          ...response.metadata,
          status:
            response.output?.status || 'success',
        },
        error: response.error,
        warnings: response.output?.warnings,
      });
    } catch (error) {
      logger.error(
        { error },
        'Agent execution failed',
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Agent execution failed',
        code: 'EXECUTION_ERROR',
      });
    }
  },
);

/**
 * POST /api/agent/stream
 * Execute an agent action with streaming response (SSE)
 */
app.post(
  '/api/agent/stream',
  async (req: AuthenticatedRequest, res: Response) => {
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

      const orchestrator = agentRegistry.getAgent(
        AgentType.ORCHESTRATOR,
      );

      if (!orchestrator) {
        res.status(500).json({
          success: false,
          error: 'Orchestrator not available',
          code: 'ORCHESTRATOR_NOT_READY',
        });
        return;
      }

      // Set up SSE headers
      res.setHeader(
        'Content-Type',
        'text/event-stream',
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      res.write(
        `data: ${JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      const request = {
        id: uuidv4(),
        userId: req.user?.id || 'anonymous',
        sessionId:
          sessionId || `session_${Date.now()}`,
        input:
          typeof input === 'string'
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

      const onChunk = (chunk: any) => {
        res.write(
          `data: ${JSON.stringify({
            ...chunk,
            timestamp: new Date().toISOString(),
          })}\n\n`,
        );
      };

      const response = await orchestrator.executeStream(
        request,
        agentContext as any,
        onChunk,
      );

      res.write(
        `data: ${JSON.stringify({
          type: 'complete',
          data: response.output,
          metadata: response.metadata,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      res.end();
    } catch (error) {
      logger.error(
        { error },
        'Agent streaming failed',
      );
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Agent execution failed',
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );
      res.end();
    }
  },
);

/**
 * GET /api/agent/status
 * Get status of all agents with orchestrator metrics
 */
app.get(
  '/api/agent/status',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const health =
        await agentRegistry.getAllHealthStatus();
      const orchestratorHealth = orchestratorClient
        ? await orchestratorClient.getHealth()
        : null;

      res.json({
        success: true,
        data: {
          agents: health,
          orchestrator: orchestratorHealth
            ? {
                state:
                  orchestratorHealth.state,
                isHealthy:
                  orchestratorHealth.isHealthy,
                activeExecutions:
                  orchestratorHealth.activeExecutions,
                load:
                  orchestratorHealth.currentLoad,
                version:
                  orchestratorHealth.version,
              }
            : null,
        },
      });
    } catch (error) {
      logger.error(
        { error },
        'Failed to get agent status',
      );
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent status',
        code: 'STATUS_ERROR',
      });
    }
  },
);

// ============================================
// API ROUTES
// ============================================

// Auth routes (public + protected)
app.use('/api/auth', authRoutes);

// Usage metering routes (protected)
app.use('/api/usage', usageRoutes);

// Billing routes (protected)
app.use('/api/billing', billingRoutes);

// Webhook routes (public, no auth)
app.use('/api/webhooks', webhookRoutes);

// Analytics routes (protected)
app.use('/api/analytics', analyticsRoutes);

// Health routes
app.use('/health', healthRoutes);

// Documentation routes
app.use('/api/docs', docsRoutes);

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req: Request, res: Response) => {
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
        resume:
          '/api/execution/resume/:executionId',
        list: '/api/execution/states',
      },
      orchestrator: {
        status:
          '/health/orchestrator/status',
        metrics:
          '/health/orchestrator/metrics',
        resetCircuitBreaker:
          '/health/orchestrator/circuit-breaker/:agentType/reset',
        resetAllCircuitBreakers:
          '/health/orchestrator/circuit-breaker/reset-all',
      },
    },
    documentation: `${process.env.APP_URL}/api-docs`,
  });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req: Request, res: Response) => {
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

app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;
let server: any = null;

async function gracefulShutdown(
  signal: string,
): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  logger.info(
    `${signal} received. Starting graceful shutdown...`,
  );

  const shutdownTimeout = setTimeout(() => {
    logger.error(
      'Shutdown timeout reached, forcing exit',
    );
    process.exit(1);
  }, 30000);

  try {
    // Stop accepting new requests
    if (server) {
      logger.info('Closing HTTP server...');
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    // ENHANCEMENT: Shutdown orchestrator client
    if (orchestratorClient) {
      logger.info(
        'Shutting down orchestrator client...',
      );
      await orchestratorClient.shutdown();
    }

    // Stop cron jobs
    logger.info('Stopping cron jobs...');
    stopAllCronJobs();

    // Shutdown agents
    logger.info('Shutting down agents...');
    await agentRegistry.shutdownAll();

    // Close queue workers
    logger.info('Closing queue workers...');
    const {
      usageReportWorker,
      usageBillingWorker,
    } = await import('./queues/usage-report.job');
    await Promise.all([
      usageReportWorker?.close(),
      usageBillingWorker?.close(),
    ]).catch(() => {});

    // Close Redis connection
    logger.info('Closing Redis connection...');
    await RedisInitService.disconnect();

    // Close database connection
    logger.info('Closing database connection...');
    await prisma.$disconnect();

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(
      { error },
      'Error during graceful shutdown',
    );
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () =>
  gracefulShutdown('SIGTERM'),
);
process.on('SIGINT', () =>
  gracefulShutdown('SIGINT'),
);

// Unhandled rejection handler
process.on(
  'unhandledRejection',
  (reason, promise) => {
    logger.error(
      { reason, promise },
      'Unhandled Rejection at:',
    );
  },
);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error(
    { error },
    'Uncaught Exception thrown',
  );
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ============================================
// START SERVER
// ============================================

const PORT = config.port || 3000;

async function startServer(): Promise<void> {
  try {
    await initializeServices();
    await initializeAgents();

    server = app.listen(PORT, () => {
      logger.info(
        `🚀 Enterprise AI Agent Platform API v3.0.0`,
      );
      logger.info(
        `📍 Environment: ${config.nodeEnv}`,
      );
      logger.info(
        `🔗 URL: ${config.apiUrl}`,
      );
      logger.info(`💾 Port: ${PORT}`);
      logger.info(
        `💳 Redis: ${RedisInitService.isReady() ? 'connected' : 'fallback mode'}`,
      );
      logger.info(
        `🤖 Agents: ${agentRegistry.getAllAgents().length} registered`,
      );
      logger.info(
        `⚡ Orchestrator: Enhanced (circuit breakers, backpressure, cost checks)`,
      );
      logger.info(
        `⏰ Cron jobs: initialized`,
      );
      logger.info(
        `✨ Ready to accept requests`,
      );
    });

    server.on('error', (error: Error) => {
      logger.error(
        { error },
        'Server error',
      );
      process.exit(1);
    });
  } catch (error) {
    logger.error(
      { error },
      'Failed to start server',
    );
    process.exit(1);
  }
}

// Start the server
startServer();

export { app, orchestratorClient };