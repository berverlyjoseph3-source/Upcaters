"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// enterprise-ai-agent-platform/apps/api/src/routes/agent.routes.ts
const express_1 = require("express");
const agent_controller_1 = require("../controllers/agent.controller");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const plan_gate_middleware_1 = require("../middleware/plan-gate.middleware");
const rate_limit_middleware_1 = require("../auth/middleware/rate-limit.middleware");
const plan_gate_middleware_2 = require("../middleware/plan-gate.middleware");
const router = (0, express_1.Router)();
// Apply authentication and usage headers to all agent routes
router.use(jwt_auth_guard_1.JwtAuthGuard.protect);
router.use((0, plan_gate_middleware_2.addUsageHeaders)());
router.use((0, plan_gate_middleware_2.warnAtUsageThreshold)(80));
// ============================================
// Core Agent Execution Routes
// ============================================
/**
 * POST /api/agent/execute
 * Execute an agent action through the orchestrator
 * Rate limit: 60 requests per minute
 */
router.post('/execute', rate_limit_middleware_1.RateLimitMiddleware.limiter({ windowMs: 60 * 1000, maxRequests: 60 }), agent_controller_1.AgentController.execute);
/**
 * POST /api/agent/stream
 * Execute an agent action with streaming response (SSE)
 * Rate limit: 30 requests per minute
 */
router.post('/stream', rate_limit_middleware_1.RateLimitMiddleware.limiter({ windowMs: 60 * 1000, maxRequests: 30 }), agent_controller_1.AgentController.executeStream);
// ============================================
// Agent Information Routes
// ============================================
/**
 * GET /api/agent/status
 * Get status of all agents
 */
router.get('/status', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), agent_controller_1.AgentController.getAgentStatus);
/**
 * GET /api/agent/agents
 * List all available agents
 */
router.get('/agents', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), agent_controller_1.AgentController.listAgents);
/**
 * GET /api/agent/agents/:agentType/tools
 * List tools for a specific agent
 */
router.get('/agents/:agentType/tools', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), agent_controller_1.AgentController.getAgentTools);
/**
 * GET /api/agent/health/:agentType
 * Get health status for a specific agent
 */
router.get('/health/:agentType', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), agent_controller_1.AgentController.getAgentHealth);
/**
 * GET /api/agent/metrics/:agentType
 * Get metrics for a specific agent (admin only)
 */
router.get('/metrics/:agentType', rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.getAgentMetrics);
// ============================================
// Specific Agent Direct Execution Routes
// ============================================
/**
 * POST /api/agent/email/execute
 * Execute email agent directly
 */
router.post('/email/execute', (0, plan_gate_middleware_1.requirePlanFeature)('emailAgent'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
/**
 * POST /api/agent/drive/execute
 * Execute drive agent directly
 */
router.post('/drive/execute', (0, plan_gate_middleware_1.requirePlanFeature)('driveAgent'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
/**
 * POST /api/agent/content/execute
 * Execute content agent directly
 */
router.post('/content/execute', (0, plan_gate_middleware_1.requirePlanFeature)('contentAgentText'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
/**
 * POST /api/agent/content/image
 * Generate image (requires PROFESSIONAL plan)
 */
router.post('/content/image', (0, plan_gate_middleware_1.requirePlanFeature)('contentAgentImage'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.generateImage);
/**
 * POST /api/agent/content/video
 * Generate video (requires ENTERPRISE plan)
 */
router.post('/content/video', (0, plan_gate_middleware_1.requirePlanFeature)('contentAgentVideo'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.generateVideo);
/**
 * POST /api/agent/social/execute
 * Execute social agent directly
 */
router.post('/social/execute', (0, plan_gate_middleware_1.requirePlanFeature)('socialUploadAgent'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
/**
 * POST /api/agent/social/multi-platform
 * Post to multiple platforms (requires PROFESSIONAL plan)
 */
router.post('/social/multi-platform', (0, plan_gate_middleware_1.requirePlanFeature)('multiPlatformPosts'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.multiPlatformPost);
/**
 * POST /api/agent/calendar/execute
 * Execute calendar agent directly
 */
router.post('/calendar/execute', (0, plan_gate_middleware_1.requirePlanFeature)('calendarAgent'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
/**
 * POST /api/agent/web/execute
 * Execute web agent directly
 */
router.post('/web/execute', (0, plan_gate_middleware_1.requirePlanFeature)('webAgent'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
/**
 * POST /api/agent/task/execute
 * Execute task agent directly
 */
router.post('/task/execute', (0, plan_gate_middleware_1.requirePlanFeature)('taskAgent'), rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.executeSpecificAgent);
// ============================================
// Agent Session Routes
// ============================================
/**
 * POST /api/agent/session/start
 * Start a new agent session
 */
router.post('/session/start', rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.startSession);
/**
 * POST /api/agent/session/:sessionId/end
 * End an agent session
 */
router.post('/session/:sessionId/end', rate_limit_middleware_1.RateLimitMiddleware.moderate(), agent_controller_1.AgentController.endSession);
/**
 * GET /api/agent/session/:sessionId
 * Get session details
 */
router.get('/session/:sessionId', rate_limit_middleware_1.RateLimitMiddleware.relaxed(), agent_controller_1.AgentController.getSession);
// ============================================
// Admin Routes
// ============================================
/**
 * POST /api/agent/reset-metrics
 * Reset metrics for all agents (admin only)
 */
router.post('/reset-metrics', jwt_auth_guard_1.JwtAuthGuard.protect, agent_controller_1.AgentController.resetMetrics);
/**
 * POST /api/agent/agents/:agentType/reset
 * Reset a specific agent (admin only)
 */
router.post('/agents/:agentType/reset', jwt_auth_guard_1.JwtAuthGuard.protect, agent_controller_1.AgentController.resetAgent);
exports.default = router;
//# sourceMappingURL=agent.routes.js.map