"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
// enterprise-ai-agent-platform/apps/api/src/services/agent.service.ts
const uuid_1 = require("uuid");
const agent_registry_1 = require("../agents/core/agent.registry");
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const usage_types_1 = require("../types/usage.types");
const usage_metering_service_1 = require("./usage-metering.service");
class AgentService {
    /**
     * Execute an agent through the orchestrator
     */
    static async executeAgent(userId, input, sessionId, agentType = 'orchestrator', action, ipAddress, userAgent) {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)();
        try {
            // Log execution start
            await this.logExecutionStart(requestId, userId, agentType, input, ipAddress, userAgent);
            // Get the agent
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                throw new Error(`Agent ${agentType} not found`);
            }
            // Prepare request and context
            const request = {
                id: requestId,
                userId,
                sessionId,
                input,
                priority: 1,
            };
            const context = {
                sessionId,
                userId,
                previousResponses: [],
                preferences: {},
                plan: { id: 'default', name: 'Default', limits: { aiActions: 0, apiCalls: 0 }, features: [] },
            };
            // Execute
            const response = await agent.execute(request, context);
            const executionTimeMs = Date.now() - startTime;
            // Log execution completion
            await this.logExecutionComplete(requestId, response, executionTimeMs);
            // Track usage
            await usage_metering_service_1.UsageMeteringService.incrementUsage(userId, usage_types_1.ActionType.AI_ORCHESTRATOR, response.metadata.tokensUsed || 0);
            return {
                success: response.success,
                output: response.output,
                error: response.error,
                metadata: {
                    requestId,
                    agentType: agent.getType(),
                    executionTimeMs,
                    tokensUsed: response.metadata.tokensUsed || 0,
                    costUsd: response.metadata.costUsd || 0,
                },
                agentType: agent.getType(),
                requestId,
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.logExecutionError(requestId, errorMessage, executionTimeMs);
            return {
                success: false,
                output: null,
                error: errorMessage,
                metadata: {
                    requestId,
                    agentType,
                    executionTimeMs,
                    tokensUsed: 0,
                    costUsd: 0,
                },
                agentType,
                requestId,
            };
        }
    }
    /**
     * Execute an agent with streaming
     */
    static async executeAgentStream(userId, input, sessionId, agentType = 'orchestrator', onChunk) {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)();
        try {
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                throw new Error(`Agent ${agentType} not found`);
            }
            const request = {
                id: requestId,
                userId,
                sessionId,
                input,
                priority: 1,
            };
            const context = {
                sessionId,
                userId,
                previousResponses: [],
                preferences: {},
                plan: { id: 'default', name: 'Default', limits: { aiActions: 0, apiCalls: 0 }, features: [] },
            };
            const response = await agent.executeStream(request, context, onChunk);
            const executionTimeMs = Date.now() - startTime;
            await usage_metering_service_1.UsageMeteringService.incrementUsage(userId, usage_types_1.ActionType.AI_ORCHESTRATOR, response.metadata.tokensUsed || 0);
            return {
                success: response.success,
                output: response.output,
                error: response.error,
                metadata: {
                    requestId,
                    agentType: agent.getType(),
                    executionTimeMs,
                    tokensUsed: response.metadata.tokensUsed || 0,
                    costUsd: response.metadata.costUsd || 0,
                },
                agentType: agent.getType(),
                requestId,
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                output: null,
                error: errorMessage,
                metadata: {
                    requestId,
                    agentType,
                    executionTimeMs,
                    tokensUsed: 0,
                    costUsd: 0,
                },
                agentType,
                requestId,
            };
        }
    }
    /**
     * Execute a specific agent directly (bypass orchestrator)
     */
    static async executeSpecificAgent(userId, agentType, input, sessionId, ipAddress, userAgent) {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)();
        try {
            const agent = agent_registry_1.agentRegistry.getAgent(agentType);
            if (!agent) {
                throw new Error(`Agent ${agentType} not found`);
            }
            const request = {
                id: requestId,
                userId,
                sessionId,
                input,
                priority: 1,
            };
            const context = {
                sessionId,
                userId,
                previousResponses: [],
                preferences: {},
                plan: { id: 'default', name: 'Default', limits: { aiActions: 0, apiCalls: 0 }, features: [] },
            };
            const response = await agent.execute(request, context);
            const executionTimeMs = Date.now() - startTime;
            return {
                success: response.success,
                output: response.output,
                error: response.error,
                metadata: {
                    requestId,
                    agentType: agent.getType(),
                    executionTimeMs,
                    tokensUsed: response.metadata.tokensUsed || 0,
                    costUsd: response.metadata.costUsd || 0,
                },
                agentType: agent.getType(),
                requestId,
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                output: null,
                error: errorMessage,
                metadata: {
                    requestId,
                    agentType: agentType.toString(),
                    executionTimeMs,
                    tokensUsed: 0,
                    costUsd: 0,
                },
                agentType: agentType.toString(),
                requestId,
            };
        }
    }
    /**
     * Create a new agent session
     */
    static async createSession(userId, sessionId) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session
        const session = await client_1.prisma.session.create({
            data: {
                userId,
                refreshToken: sessionId,
                expiresAt,
                lastActivityAt: new Date(),
            },
        });
        return session;
    }
    /**
     * End an agent session
     */
    static async endSession(userId, sessionId) {
        await client_1.prisma.session.updateMany({
            where: {
                userId,
                refreshToken: sessionId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
            },
        });
    }
    /**
     * Get session details
     */
    static async getSession(userId, sessionId) {
        const session = await client_1.prisma.session.findFirst({
            where: {
                userId,
                refreshToken: sessionId,
                isRevoked: false,
                expiresAt: { gt: new Date() },
            },
        });
        return session;
    }
    /**
     * Log execution start to database
     */
    static async logExecutionStart(requestId, userId, agentType, input, ipAddress, userAgent) {
        try {
            await client_1.prisma.agentExecution.create({
                data: {
                    id: requestId,
                    userId,
                    agentType: agentType.toUpperCase(),
                    actionType: 'execute',
                    input: { text: input.substring(0, 1000) },
                    status: 'RUNNING',
                    ipAddress,
                    userAgent,
                    createdAt: new Date(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, requestId }, 'Failed to log execution start');
        }
    }
    /**
     * Log execution completion
     */
    static async logExecutionComplete(requestId, response, durationMs) {
        try {
            await client_1.prisma.agentExecution.update({
                where: { id: requestId },
                data: {
                    status: response.success ? 'SUCCESS' : 'ERROR',
                    output: response.output,
                    errorMessage: response.error,
                    durationMs,
                    tokensUsed: response.metadata.tokensUsed,
                    costUsd: response.metadata.costUsd,
                    completedAt: new Date(),
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, requestId }, 'Failed to log execution completion');
        }
    }
    /**
     * Log execution error
     */
    static async logExecutionError(requestId, error, durationMs) {
        try {
            await client_1.prisma.agentExecution.update({
                where: { id: requestId },
                data: {
                    status: 'ERROR',
                    errorMessage: error,
                    durationMs,
                    completedAt: new Date(),
                },
            });
        }
        catch (err) {
            logger_1.logger.error({ err, requestId }, 'Failed to log execution error');
        }
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=agent.service.js.map