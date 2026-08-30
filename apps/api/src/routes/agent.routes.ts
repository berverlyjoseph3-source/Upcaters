// enterprise-ai-agent-platform/apps/api/src/routes/agent.routes.ts
import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { requirePlanFeature } from '../middleware/plan-gate.middleware';
import { RateLimitMiddleware } from '../auth/middleware/rate-limit.middleware';
import { addUsageHeaders, warnAtUsageThreshold } from '../middleware/plan-gate.middleware';

const router = Router();

// Apply authentication and usage headers to all agent routes
router.use(JwtAuthGuard.protect);
router.use(addUsageHeaders());
router.use(warnAtUsageThreshold(80));

// ============================================
// Core Agent Execution Routes
// ============================================

/**
 * POST /api/agent/execute
 * Execute an agent action through the orchestrator
 * Rate limit: 60 requests per minute
 */
router.post(
  '/execute',
  RateLimitMiddleware.limiter({ windowMs: 60 * 1000, maxRequests: 60 }),
  AgentController.execute
);

/**
 * POST /api/agent/stream
 * Execute an agent action with streaming response (SSE)
 * Rate limit: 30 requests per minute
 */
router.post(
  '/stream',
  RateLimitMiddleware.limiter({ windowMs: 60 * 1000, maxRequests: 30 }),
  AgentController.executeStream
);

// ============================================
// Agent Information Routes
// ============================================

/**
 * GET /api/agent/status
 * Get status of all agents
 */
router.get(
  '/status',
  RateLimitMiddleware.relaxed(),
  AgentController.getAgentStatus
);

/**
 * GET /api/agent/agents
 * List all available agents
 */
router.get(
  '/agents',
  RateLimitMiddleware.relaxed(),
  AgentController.listAgents
);

/**
 * GET /api/agent/agents/:agentType/tools
 * List tools for a specific agent
 */
router.get(
  '/agents/:agentType/tools',
  RateLimitMiddleware.relaxed(),
  AgentController.getAgentTools
);

/**
 * GET /api/agent/health/:agentType
 * Get health status for a specific agent
 */
router.get(
  '/health/:agentType',
  RateLimitMiddleware.relaxed(),
  AgentController.getAgentHealth
);

/**
 * GET /api/agent/metrics/:agentType
 * Get metrics for a specific agent (admin only)
 */
router.get(
  '/metrics/:agentType',
  RateLimitMiddleware.moderate(),
  AgentController.getAgentMetrics
);

// ============================================
// Specific Agent Direct Execution Routes
// ============================================

/**
 * POST /api/agent/email/execute
 * Execute email agent directly
 */
router.post(
  '/email/execute',
  requirePlanFeature('emailAgent'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

/**
 * POST /api/agent/drive/execute
 * Execute drive agent directly
 */
router.post(
  '/drive/execute',
  requirePlanFeature('driveAgent'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

/**
 * POST /api/agent/content/execute
 * Execute content agent directly
 */
router.post(
  '/content/execute',
  requirePlanFeature('contentAgentText'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

/**
 * POST /api/agent/content/image
 * Generate image (requires PROFESSIONAL plan)
 */
router.post(
  '/content/image',
  requirePlanFeature('contentAgentImage'),
  RateLimitMiddleware.moderate(),
  AgentController.generateImage
);

/**
 * POST /api/agent/content/video
 * Generate video (requires ENTERPRISE plan)
 */
router.post(
  '/content/video',
  requirePlanFeature('contentAgentVideo'),
  RateLimitMiddleware.moderate(),
  AgentController.generateVideo
);

/**
 * POST /api/agent/social/execute
 * Execute social agent directly
 */
router.post(
  '/social/execute',
  requirePlanFeature('socialUploadAgent'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

/**
 * POST /api/agent/social/multi-platform
 * Post to multiple platforms (requires PROFESSIONAL plan)
 */
router.post(
  '/social/multi-platform',
  requirePlanFeature('multiPlatformPosts'),
  RateLimitMiddleware.moderate(),
  AgentController.multiPlatformPost
);

/**
 * POST /api/agent/calendar/execute
 * Execute calendar agent directly
 */
router.post(
  '/calendar/execute',
  requirePlanFeature('calendarAgent'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

/**
 * POST /api/agent/web/execute
 * Execute web agent directly
 */
router.post(
  '/web/execute',
  requirePlanFeature('webAgent'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

/**
 * POST /api/agent/task/execute
 * Execute task agent directly
 */
router.post(
  '/task/execute',
  requirePlanFeature('taskAgent'),
  RateLimitMiddleware.moderate(),
  AgentController.executeSpecificAgent
);

// ============================================
// Agent Session Routes
// ============================================

/**
 * POST /api/agent/session/start
 * Start a new agent session
 */
router.post(
  '/session/start',
  RateLimitMiddleware.moderate(),
  AgentController.startSession
);

/**
 * POST /api/agent/session/:sessionId/end
 * End an agent session
 */
router.post(
  '/session/:sessionId/end',
  RateLimitMiddleware.moderate(),
  AgentController.endSession
);

/**
 * GET /api/agent/session/:sessionId
 * Get session details
 */
router.get(
  '/session/:sessionId',
  RateLimitMiddleware.relaxed(),
  AgentController.getSession
);

// ============================================
// Admin Routes
// ============================================

/**
 * POST /api/agent/reset-metrics
 * Reset metrics for all agents (admin only)
 */
router.post(
  '/reset-metrics',
  JwtAuthGuard.protect,
  AgentController.resetMetrics
);

/**
 * POST /api/agent/agents/:agentType/reset
 * Reset a specific agent (admin only)
 */
router.post(
  '/agents/:agentType/reset',
  JwtAuthGuard.protect,
  AgentController.resetAgent
);

export default router;