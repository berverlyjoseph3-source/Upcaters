"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
const uuid_1 = require("uuid");
const agent_registry_1 = require("../agents/core/agent.registry");
const agent_service_1 = require("../services/agent.service");
const logger_1 = require("../utils/logger");
const usage_types_1 = require("../types/usage.types");
const usage_metering_service_1 = require("../services/usage-metering.service");
const agent_types_1 = require("../types/agent.types");
class AgentController {
    /**
     * POST /api/agent/execute
     * Execute an agent action through the orchestrator
     */
    static async execute(req, res) {
        try {
            const { input, sessionId, context, agentType, action, stream = false } = req.body;
            if (!input) {
                res.status(400).json({
                    success: false,
                    error: 'Input is required',
                    code: 'MISSING_INPUT',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const startTime = Date.now();
            const response = await agent_service_1.AgentService.executeAgent(req.user.id, input, sessionId || `session_${req.user.id}_${Date.now()}`, agentType || 'orchestrator', action, req.ip, req.headers['user-agent']);
            const executionTime = Date.now() - startTime;
            await usage_metering_service_1.UsageMeteringService.incrementUsage(req.user.id, usage_types_1.ActionType.AI_ORCHESTRATOR, response.metadata?.tokensUsed || 0);
            res.json({
                success: response.success,
                data: response.output,
                metadata: {
                    ...response.metadata,
                    executionTimeMs: executionTime,
                    agentType: response.agentType,
                    requestId: response.requestId,
                },
                error: response.error,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Agent execution failed');
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Agent execution failed',
                code: 'EXECUTION_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/stream
     * Execute an agent action with streaming response (SSE)
     */
    static async executeStream(req, res) {
        try {
            const { input, sessionId, context, agentType } = req.body;
            if (!input) {
                res.status(400).json({
                    success: false,
                    error: 'Input is required',
                    code: 'MISSING_INPUT',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            // Set up SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            // Send initial connection event
            res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
            const onChunk = (chunk) => {
                res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk, timestamp: new Date().toISOString() })}\n\n`);
            };
            const response = await agent_service_1.AgentService.executeAgentStream(req.user.id, input, sessionId || `session_${req.user.id}_${Date.now()}`, agentType || 'orchestrator', onChunk);
            res.write(`data: ${JSON.stringify({
                type: 'complete',
                data: response.output,
                metadata: response.metadata,
                timestamp: new Date().toISOString(),
            })}\n\n`);
            res.end();
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Agent streaming failed');
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Agent execution failed',
                timestamp: new Date().toISOString(),
            })}\n\n`);
            res.end();
        }
    }
    /**
     * GET /api/agent/status
     * Get status of all agents
     */
    static async getAgentStatus(req, res) {
        try {
            const health = await agent_registry_1.agentRegistry.getAllHealthStatus();
            const agents = Object.values(health);
            const healthyCount = agents.filter(a => a.status === 'idle' || a.status === 'running').length;
            const errorCount = agents.filter(a => a.status === 'error').length;
            const totalCount = agents.length;
            let overallStatus = 'healthy';
            if (errorCount === totalCount)
                overallStatus = 'down';
            else if (errorCount > 0)
                overallStatus = 'degraded';
            res.json({
                success: true,
                data: {
                    overallStatus,
                    totalAgents: totalCount,
                    healthyAgents: healthyCount,
                    errorAgents: errorCount,
                    agents: health,
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
    }
    /**
     * GET /api/agent/agents
     * List all available agents
     */
    static async listAgents(req, res) {
        try {
            const agents = agent_registry_1.agentRegistry.getAllAgents();
            const agentList = agents.map(agent => ({
                type: agent.getType(),
                name: agent.getName(),
                description: agent.getDescription(),
                version: agent.getVersion(),
                tools: agent.getTools().map(t => ({ name: t.name, description: t.description })),
                metrics: agent.getMetrics(),
            }));
            res.json({
                success: true,
                data: {
                    count: agentList.length,
                    agents: agentList,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to list agents');
            res.status(500).json({
                success: false,
                error: 'Failed to list agents',
                code: 'LIST_ERROR',
            });
        }
    }
    /**
     * GET /api/agent/agents/:agentType/tools
     * List tools for a specific agent
     */
    static async getAgentTools(req, res) {
        try {
            const { agentType } = req.params;
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                res.status(404).json({
                    success: false,
                    error: `Agent "${agentType}" not found`,
                    code: 'AGENT_NOT_FOUND',
                });
                return;
            }
            const tools = agent.getTools().map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
                requiresApiCall: tool.requiresApiCall,
                cost: tool.cost,
            }));
            res.json({
                success: true,
                data: {
                    agentType: agent.getType(),
                    agentName: agent.getName(),
                    toolCount: tools.length,
                    tools,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, agentType: req.params.agentType }, 'Failed to get agent tools');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve agent tools',
                code: 'TOOLS_ERROR',
            });
        }
    }
    /**
     * GET /api/agent/health/:agentType
     * Get health status for a specific agent
     */
    static async getAgentHealth(req, res) {
        try {
            const { agentType } = req.params;
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                res.status(404).json({
                    success: false,
                    error: `Agent "${agentType}" not found`,
                    code: 'AGENT_NOT_FOUND',
                });
                return;
            }
            const health = await agent.getHealth();
            res.json({
                success: true,
                data: health,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, agentType: req.params.agentType }, 'Failed to get agent health');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve agent health',
                code: 'HEALTH_ERROR',
            });
        }
    }
    /**
     * GET /api/agent/metrics/:agentType
     * Get metrics for a specific agent
     */
    static async getAgentMetrics(req, res) {
        try {
            const { agentType } = req.params;
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                res.status(404).json({
                    success: false,
                    error: `Agent "${agentType}" not found`,
                    code: 'AGENT_NOT_FOUND',
                });
                return;
            }
            const metrics = agent.getMetrics();
            res.json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, agentType: req.params.agentType }, 'Failed to get agent metrics');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve agent metrics',
                code: 'METRICS_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/execute-specific
     * Execute a specific agent directly (bypass orchestrator)
     */
    static async executeSpecificAgent(req, res) {
        try {
            const { agentType } = req.params;
            const { input, sessionId, context } = req.body;
            if (!input) {
                res.status(400).json({
                    success: false,
                    error: 'Input is required',
                    code: 'MISSING_INPUT',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const response = await agent_service_1.AgentService.executeSpecificAgent(req.user.id, agentType, input, sessionId || `session_${req.user.id}_${Date.now()}`, req.ip, req.headers['user-agent']);
            res.json({
                success: response.success,
                data: response.output,
                metadata: response.metadata,
                error: response.error,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id, agentType: req.params.agentType }, 'Agent execution failed');
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Agent execution failed',
                code: 'EXECUTION_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/content/image
     * Generate image (requires PROFESSIONAL plan)
     */
    static async generateImage(req, res) {
        try {
            const { prompt, size, quality } = req.body;
            if (!prompt) {
                res.status(400).json({
                    success: false,
                    error: 'Prompt is required',
                    code: 'MISSING_PROMPT',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const response = await agent_service_1.AgentService.executeSpecificAgent(req.user.id, agent_types_1.AgentType.CONTENT, `Generate image: ${prompt}${size ? ` Size: ${size}` : ''}${quality ? ` Quality: ${quality}` : ''}`, `session_${req.user.id}_${Date.now()}`);
            res.json({
                success: response.success,
                data: response.output,
                metadata: response.metadata,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Image generation failed');
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Image generation failed',
                code: 'GENERATION_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/content/video
     * Generate video (requires ENTERPRISE plan)
     */
    static async generateVideo(req, res) {
        try {
            const { prompt, duration, style } = req.body;
            if (!prompt) {
                res.status(400).json({
                    success: false,
                    error: 'Prompt is required',
                    code: 'MISSING_PROMPT',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const response = await agent_service_1.AgentService.executeSpecificAgent(req.user.id, agent_types_1.AgentType.CONTENT, `Generate video: ${prompt}${duration ? ` Duration: ${duration} seconds` : ''}${style ? ` Style: ${style}` : ''}`, `session_${req.user.id}_${Date.now()}`);
            res.json({
                success: response.success,
                data: response.output,
                metadata: response.metadata,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Video generation failed');
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Video generation failed',
                code: 'GENERATION_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/social/multi-platform
     * Post to multiple platforms (requires PROFESSIONAL plan)
     */
    static async multiPlatformPost(req, res) {
        try {
            const { content, platforms, mediaUrl } = req.body;
            if (!content) {
                res.status(400).json({
                    success: false,
                    error: 'Content is required',
                    code: 'MISSING_CONTENT',
                });
                return;
            }
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const platformsList = platforms || ['linkedin', 'facebook', 'twitter'];
            const response = await agent_service_1.AgentService.executeSpecificAgent(req.user.id, agent_types_1.AgentType.SOCIAL, `Post to ${platformsList.join(', ')}: ${content}${mediaUrl ? ` with image ${mediaUrl}` : ''}`, `session_${req.user.id}_${Date.now()}`);
            res.json({
                success: response.success,
                data: response.output,
                metadata: response.metadata,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Multi-platform post failed');
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to post',
                code: 'POST_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/session/start
     * Start a new agent session
     */
    static async startSession(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const sessionId = (0, uuid_1.v4)();
            const session = await agent_service_1.AgentService.createSession(req.user.id, sessionId);
            res.json({
                success: true,
                data: {
                    sessionId: session.id,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id }, 'Failed to start session');
            res.status(500).json({
                success: false,
                error: 'Failed to start session',
                code: 'SESSION_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/session/:sessionId/end
     * End an agent session
     */
    static async endSession(req, res) {
        try {
            const { sessionId } = req.params;
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            await agent_service_1.AgentService.endSession(req.user.id, sessionId);
            res.json({
                success: true,
                message: 'Session ended successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id, sessionId: req.params.sessionId }, 'Failed to end session');
            res.status(500).json({
                success: false,
                error: 'Failed to end session',
                code: 'SESSION_ERROR',
            });
        }
    }
    /**
     * GET /api/agent/session/:sessionId
     * Get session details
     */
    static async getSession(req, res) {
        try {
            const { sessionId } = req.params;
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const session = await agent_service_1.AgentService.getSession(req.user.id, sessionId);
            if (!session) {
                res.status(404).json({
                    success: false,
                    error: 'Session not found',
                    code: 'NOT_FOUND',
                });
                return;
            }
            res.json({
                success: true,
                data: session,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.user?.id, sessionId: req.params.sessionId }, 'Failed to get session');
            res.status(500).json({
                success: false,
                error: 'Failed to get session',
                code: 'SESSION_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/reset-metrics
     * Reset metrics for all agents (admin only)
     */
    static async resetMetrics(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            agent_registry_1.agentRegistry.resetAllMetrics();
            res.json({
                success: true,
                message: 'All agent metrics reset successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to reset metrics');
            res.status(500).json({
                success: false,
                error: 'Failed to reset metrics',
                code: 'RESET_ERROR',
            });
        }
    }
    /**
     * POST /api/agent/agents/:agentType/reset
     * Reset a specific agent (admin only)
     */
    static async resetAgent(req, res) {
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
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                res.status(404).json({
                    success: false,
                    error: `Agent "${agentType}" not found`,
                    code: 'AGENT_NOT_FOUND',
                });
                return;
            }
            agent.resetMetrics();
            res.json({
                success: true,
                message: `Agent "${agentType}" metrics reset successfully`,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, agentType: req.params.agentType }, 'Failed to reset agent');
            res.status(500).json({
                success: false,
                error: 'Failed to reset agent metrics',
                code: 'RESET_ERROR',
            });
        }
    }
}
exports.AgentController = AgentController;
//# sourceMappingURL=agent.controller.js.map