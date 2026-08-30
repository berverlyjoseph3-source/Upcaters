"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRepository = void 0;
// enterprise-ai-agent-platform/apps/api/src/db/repositories/agent.repository.ts
const client_1 = require("@prisma/client");
const client_2 = require("../client");
const logger_1 = require("../../utils/logger");
// ============================================
// Agent Repository
// ============================================
class AgentRepository {
    /**
     * Create a new agent execution log entry
     */
    static async createExecution(data) {
        try {
            const execution = await client_2.prisma.agentExecution.create({
                data: {
                    userId: data.userId,
                    agentType: data.agentType,
                    actionType: data.actionType,
                    input: data.input || {},
                    sessionId: data.sessionId,
                    metadata: {
                        ...(data.metadata || {}),
                        executionId: data.executionId,
                        planId: data.planId,
                    },
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    status: client_1.ExecutionStatus.PENDING,
                },
                select: {
                    id: true,
                    createdAt: true,
                },
            });
            logger_1.logger.debug({
                executionId: execution.id,
                userId: data.userId,
                agentType: data.agentType,
                actionType: data.actionType,
            }, 'Agent execution created');
            return execution;
        }
        catch (error) {
            logger_1.logger.error({ error, data }, 'Failed to create agent execution');
            throw error;
        }
    }
    /**
     * Update agent execution with results
     */
    static async updateExecution(executionId, data) {
        try {
            const updateData = {
                ...data,
            };
            // Only set completedAt for terminal states
            if (data.status === client_1.ExecutionStatus.SUCCESS ||
                data.status === client_1.ExecutionStatus.ERROR ||
                data.status === client_1.ExecutionStatus.CANCELLED) {
                updateData.completedAt = new Date();
            }
            await client_2.prisma.agentExecution.update({
                where: { id: executionId },
                data: updateData,
            });
            logger_1.logger.debug({ executionId, ...data }, 'Agent execution updated');
        }
        catch (error) {
            logger_1.logger.error({ error, executionId, data }, 'Failed to update agent execution');
            throw error;
        }
    }
    /**
     * Get execution by ID
     */
    static async getExecution(executionId) {
        try {
            return await client_2.prisma.agentExecution.findUnique({
                where: { id: executionId },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            planId: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, executionId }, 'Failed to get agent execution');
            throw error;
        }
    }
    /**
     * Get recent executions for a user with pagination
     */
    static async getUserExecutions(userId, filters = {}, pagination = {}) {
        try {
            const { agentType, actionType, status, startDate, endDate, sessionId, minDurationMs, maxDurationMs, hasErrors, search, } = filters;
            const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc', } = pagination;
            const skip = (page - 1) * limit;
            const where = { userId };
            if (agentType) {
                where.agentType = Array.isArray(agentType)
                    ? { in: agentType }
                    : agentType;
            }
            if (actionType) {
                where.actionType = actionType;
            }
            if (status) {
                where.status = Array.isArray(status)
                    ? { in: status }
                    : status;
            }
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = startDate;
                if (endDate)
                    where.createdAt.lte = endDate;
            }
            if (sessionId) {
                where.sessionId = sessionId;
            }
            if (minDurationMs !== undefined || maxDurationMs !== undefined) {
                where.durationMs = {};
                if (minDurationMs !== undefined)
                    where.durationMs.gte = minDurationMs;
                if (maxDurationMs !== undefined)
                    where.durationMs.lte = maxDurationMs;
            }
            if (hasErrors === true) {
                where.errorMessage = { not: null };
            }
            else if (hasErrors === false) {
                where.errorMessage = null;
            }
            if (search) {
                where.OR = [
                    {
                        actionType: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        errorMessage: {
                            contains: search,
                            mode: 'insensitive',
                        },
                    },
                ];
            }
            const orderBy = {
                [sortBy]: sortOrder,
            };
            const [executions, total] = await Promise.all([
                client_2.prisma.agentExecution.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                }),
                client_2.prisma.agentExecution.count({ where }),
            ]);
            return { executions, total, page, limit };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get user executions');
            throw error;
        }
    }
    /**
     * Get execution statistics for a user
     */
    static async getExecutionStats(userId, startDate, endDate, agentType) {
        try {
            const where = { userId };
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate)
                    where.createdAt.gte = startDate;
                if (endDate)
                    where.createdAt.lte = endDate;
            }
            if (agentType) {
                where.agentType = agentType;
            }
            // Aggregate statistics
            const stats = await client_2.prisma.agentExecution.aggregate({
                where,
                _count: { id: true },
                _sum: { tokensUsed: true, costUsd: true, durationMs: true },
                _avg: { durationMs: true, tokensUsed: true, costUsd: true },
                _min: { createdAt: true, durationMs: true },
                _max: { createdAt: true, durationMs: true },
            });
            // Group by status
            const byStatus = await client_2.prisma.agentExecution.groupBy({
                by: ['status'],
                where,
                _count: { id: true },
                _sum: { costUsd: true },
            });
            // Group by agent type
            const byAgentType = await client_2.prisma.agentExecution.groupBy({
                by: ['agentType'],
                where,
                _count: { id: true },
                _sum: { costUsd: true, tokensUsed: true },
                _avg: { durationMs: true },
            });
            // Group by action type
            const byActionType = await client_2.prisma.agentExecution.groupBy({
                by: ['actionType'],
                where,
                _count: { id: true },
                _sum: { costUsd: true },
            });
            // ENHANCEMENT: Calculate percentiles
            const recentDurations = await client_2.prisma.agentExecution.findMany({
                where: { ...where, durationMs: { not: null } },
                select: { durationMs: true },
                orderBy: { durationMs: 'asc' },
                take: 1000,
            });
            const durations = recentDurations
                .map((e) => e.durationMs)
                .filter((d) => d !== null)
                .sort((a, b) => a - b);
            const p50 = durations.length > 0
                ? durations[Math.floor(durations.length * 0.5)]
                : 0;
            const p95 = durations.length > 0
                ? durations[Math.floor(durations.length * 0.95)]
                : 0;
            const p99 = durations.length > 0
                ? durations[Math.floor(durations.length * 0.99)]
                : 0;
            return {
                totalExecutions: stats._count.id || 0,
                totalTokensUsed: stats._sum.tokensUsed || 0,
                totalCostUsd: stats._sum.costUsd || 0,
                totalDurationMs: stats._sum.durationMs || 0,
                avgDurationMs: Math.round(stats._avg.durationMs || 0),
                avgTokensUsed: Math.round(stats._avg.tokensUsed || 0),
                avgCostUsd: Number((stats._avg.costUsd || 0).toFixed(6)),
                firstExecutionAt: stats._min.createdAt,
                lastExecutionAt: stats._max.createdAt,
                minDurationMs: stats._min.durationMs || 0,
                maxDurationMs: stats._max.durationMs || 0,
                percentiles: {
                    p50,
                    p95,
                    p99,
                },
                byStatus: byStatus.reduce((acc, curr) => {
                    acc[curr.status] = {
                        count: curr._count.id,
                        costUsd: Number(curr._sum.costUsd || 0),
                    };
                    return acc;
                }, {}),
                byAgentType: byAgentType.reduce((acc, curr) => {
                    acc[curr.agentType] = {
                        executions: curr._count.id,
                        costUsd: Number(curr._sum.costUsd || 0),
                        tokensUsed: Number(curr._sum.tokensUsed || 0),
                        avgDurationMs: Math.round(curr._avg.durationMs || 0),
                    };
                    return acc;
                }, {}),
                byActionType: byActionType.reduce((acc, curr) => {
                    acc[curr.actionType] = {
                        count: curr._count.id,
                        costUsd: Number(curr._sum.costUsd || 0),
                    };
                    return acc;
                }, {}),
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get execution stats');
            throw error;
        }
    }
    /**
     * Get failed executions that need retry
     */
    static async getFailedExecutionsForRetry(maxRetries = 3, limit = 100, agentTypes) {
        try {
            const where = {
                status: client_1.ExecutionStatus.ERROR,
                retryCount: { lt: maxRetries },
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                },
            };
            if (agentTypes && agentTypes.length > 0) {
                where.agentType = { in: agentTypes };
            }
            return await client_2.prisma.agentExecution.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                take: limit,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get failed executions for retry');
            throw error;
        }
    }
    /**
     * Increment retry count for an execution
     */
    static async incrementRetryCount(executionId, retryCount) {
        try {
            await client_2.prisma.agentExecution.update({
                where: { id: executionId },
                data: {
                    retryCount: retryCount !== undefined
                        ? retryCount
                        : { increment: 1 },
                    status: client_1.ExecutionStatus.RETRYING,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, executionId }, 'Failed to increment retry count');
            throw error;
        }
    }
    /**
     * Get execution timeline for analytics
     */
    static async getExecutionTimeline(userId, days = 30, agentType) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);
            const where = {
                userId,
                createdAt: { gte: startDate },
            };
            if (agentType) {
                where.agentType = agentType;
            }
            const executions = await client_2.prisma.agentExecution.findMany({
                where,
                select: {
                    createdAt: true,
                    agentType: true,
                    status: true,
                    durationMs: true,
                    costUsd: true,
                    tokensUsed: true,
                },
                orderBy: { createdAt: 'asc' },
            });
            // Group by day
            const timeline = {};
            for (const exec of executions) {
                const dateKey = exec.createdAt.toISOString().split('T')[0];
                if (!timeline[dateKey]) {
                    timeline[dateKey] = {
                        date: dateKey,
                        total: 0,
                        successful: 0,
                        failed: 0,
                        byAgent: {},
                        avgDurationMs: 0,
                        totalCostUsd: 0,
                        totalTokens: 0,
                    };
                }
                timeline[dateKey].total++;
                if (exec.status === client_1.ExecutionStatus.SUCCESS) {
                    timeline[dateKey].successful++;
                }
                else if (exec.status === client_1.ExecutionStatus.ERROR) {
                    timeline[dateKey].failed++;
                }
                timeline[dateKey].byAgent[exec.agentType] =
                    (timeline[dateKey].byAgent[exec.agentType] || 0) + 1;
                timeline[dateKey].totalCostUsd += Number(exec.costUsd || 0);
                timeline[dateKey].totalTokens += exec.tokensUsed || 0;
                // Running average duration
                const currentAvg = timeline[dateKey].avgDurationMs;
                const currentTotal = timeline[dateKey].total;
                timeline[dateKey].avgDurationMs =
                    (currentAvg * (currentTotal - 1) +
                        (exec.durationMs || 0)) /
                        currentTotal;
            }
            return Object.values(timeline);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get execution timeline');
            throw error;
        }
    }
    // ============================================
    // ENHANCEMENT: Execution State Persistence
    // ============================================
    /**
     * Save execution state for crash recovery
     */
    static async saveExecutionState(state) {
        try {
            const existing = await client_2.prisma.agentExecution.findFirst({
                where: {
                    metadata: {
                        path: ['executionId'],
                        equals: state.executionId,
                    },
                },
            });
            const metadata = {
                executionId: state.executionId,
                planId: state.planId,
                stepStates: state.stepStates,
                overallStatus: state.overallStatus,
                totalTokensUsed: state.totalTokensUsed || 0,
                totalCostUsd: state.totalCostUsd || 0,
                persistedAt: state.persistedAt.toISOString(),
                version: (state.version || 0) + 1,
                resumedAt: state.resumedAt?.toISOString(),
            };
            if (existing) {
                // Update existing execution's metadata
                await client_2.prisma.agentExecution.update({
                    where: { id: existing.id },
                    data: {
                        metadata: metadata,
                        updatedAt: new Date(),
                    },
                });
            }
            else {
                // Create a new execution record for state tracking
                await client_2.prisma.agentExecution.create({
                    data: {
                        userId: 'system', // Orchestrator-level state
                        agentType: 'ORCHESTRATOR',
                        actionType: 'execution_state',
                        input: { planId: state.planId },
                        metadata: metadata,
                        status: state.overallStatus === 'completed'
                            ? client_1.ExecutionStatus.SUCCESS
                            : state.overallStatus === 'failed'
                                ? client_1.ExecutionStatus.ERROR
                                : client_1.ExecutionStatus.RUNNING,
                    },
                });
            }
            logger_1.logger.info({
                executionId: state.executionId,
                overallStatus: state.overallStatus,
                stepCount: state.stepStates.length,
            }, 'Execution state persisted');
        }
        catch (error) {
            logger_1.logger.error({ error, executionId: state.executionId }, 'Failed to save execution state');
            throw error;
        }
    }
    /**
     * Load execution state for recovery
     */
    static async loadExecutionState(executionId) {
        try {
            const execution = await client_2.prisma.agentExecution.findFirst({
                where: {
                    metadata: {
                        path: ['executionId'],
                        equals: executionId,
                    },
                    actionType: 'execution_state',
                },
                orderBy: { createdAt: 'desc' },
            });
            if (!execution || !execution.metadata) {
                logger_1.logger.warn({ executionId }, 'No persisted execution state found');
                return null;
            }
            const metadata = execution.metadata;
            const state = {
                executionId: metadata.executionId || executionId,
                planId: metadata.planId || '',
                stepStates: (metadata.stepStates || []).map((step) => ({
                    stepId: step.stepId,
                    status: step.status || 'pending',
                    agentType: step.agentType || '',
                    retryCount: step.retryCount || 0,
                    maxRetries: step.maxRetries || 3,
                    startedAt: step.startedAt
                        ? new Date(step.startedAt)
                        : undefined,
                    completedAt: step.completedAt
                        ? new Date(step.completedAt)
                        : undefined,
                    output: step.output,
                    error: step.error,
                    tokensUsed: step.tokensUsed,
                    costUsd: step.costUsd,
                    fallbackUsed: step.fallbackUsed,
                    fallbackAgentType: step.fallbackAgentType,
                    metadata: step.metadata,
                })),
                overallStatus: metadata.overallStatus || 'running',
                totalTokensUsed: metadata.totalTokensUsed || 0,
                totalCostUsd: metadata.totalCostUsd || 0,
                startedAt: execution.createdAt,
                completedAt: execution.completedAt || undefined,
                persistedAt: metadata.persistedAt
                    ? new Date(metadata.persistedAt)
                    : execution.createdAt,
                resumedAt: metadata.resumedAt
                    ? new Date(metadata.resumedAt)
                    : undefined,
                version: metadata.version || 1,
                metadata: metadata,
            };
            logger_1.logger.info({
                executionId,
                overallStatus: state.overallStatus,
                completedSteps: state.stepStates.filter((s) => s.status === 'completed').length,
                failedSteps: state.stepStates.filter((s) => s.status === 'failed').length,
            }, 'Execution state loaded');
            return state;
        }
        catch (error) {
            logger_1.logger.error({ error, executionId }, 'Failed to load execution state');
            return null;
        }
    }
    /**
     * Delete execution state (cleanup after successful completion)
     */
    static async deleteExecutionState(executionId) {
        try {
            await client_2.prisma.agentExecution.deleteMany({
                where: {
                    metadata: {
                        path: ['executionId'],
                        equals: executionId,
                    },
                    actionType: 'execution_state',
                },
            });
            logger_1.logger.info({ executionId }, 'Execution state deleted');
        }
        catch (error) {
            logger_1.logger.error({ error, executionId }, 'Failed to delete execution state');
        }
    }
    /**
     * List all persisted execution states
     */
    static async listExecutionStates(status, limit = 50, offset = 0) {
        try {
            const where = {
                actionType: 'execution_state',
            };
            if (status) {
                const mappedStatus = status === 'completed'
                    ? client_1.ExecutionStatus.SUCCESS
                    : status === 'failed'
                        ? client_1.ExecutionStatus.ERROR
                        : client_1.ExecutionStatus.RUNNING;
                where.status = mappedStatus;
            }
            const [executions, total] = await Promise.all([
                client_2.prisma.agentExecution.findMany({
                    where,
                    skip: offset,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                client_2.prisma.agentExecution.count({ where }),
            ]);
            const states = [];
            for (const exec of executions) {
                if (exec.metadata) {
                    const metadata = exec.metadata;
                    states.push({
                        executionId: metadata.executionId || exec.id,
                        planId: metadata.planId || '',
                        stepStates: metadata.stepStates || [],
                        overallStatus: metadata.overallStatus || 'running',
                        startedAt: exec.createdAt,
                        completedAt: exec.completedAt || undefined,
                        persistedAt: metadata.persistedAt
                            ? new Date(metadata.persistedAt)
                            : exec.createdAt,
                        version: metadata.version || 1,
                    });
                }
            }
            return { states, total };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to list execution states');
            throw error;
        }
    }
    /**
     * Clean up old execution states
     */
    static async cleanupOldExecutionStates(daysToKeep = 7) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const result = await client_2.prisma.agentExecution.deleteMany({
                where: {
                    actionType: 'execution_state',
                    createdAt: { lt: cutoffDate },
                    status: {
                        in: [
                            client_1.ExecutionStatus.SUCCESS,
                            client_1.ExecutionStatus.ERROR,
                            client_1.ExecutionStatus.CANCELLED,
                        ],
                    },
                },
            });
            logger_1.logger.info({ deletedCount: result.count, daysToKeep }, 'Old execution states cleaned up');
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to clean up old execution states');
            throw error;
        }
    }
    // ============================================
    // ENHANCEMENT: Circuit Breaker Tracking
    // ============================================
    /**
     * Get agent error rate for circuit breaker decisions
     */
    static async getAgentErrorRate(agentType, windowMs = 60000) {
        try {
            const since = new Date(Date.now() - windowMs);
            const [total, failed] = await Promise.all([
                client_2.prisma.agentExecution.count({
                    where: {
                        agentType,
                        createdAt: { gte: since },
                    },
                }),
                client_2.prisma.agentExecution.count({
                    where: {
                        agentType,
                        status: client_1.ExecutionStatus.ERROR,
                        createdAt: { gte: since },
                    },
                }),
            ]);
            return {
                total,
                failed,
                errorRate: total > 0 ? failed / total : 0,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, agentType }, 'Failed to get agent error rate');
            return { total: 0, failed: 0, errorRate: 0 };
        }
    }
    /**
     * Get recent errors for an agent type
     */
    static async getRecentAgentErrors(agentType, limit = 10) {
        try {
            return await client_2.prisma.agentExecution.findMany({
                where: {
                    agentType,
                    status: client_1.ExecutionStatus.ERROR,
                    createdAt: {
                        gte: new Date(Date.now() - 3600000), // Last hour
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true,
                    errorMessage: true,
                    createdAt: true,
                    durationMs: true,
                    retryCount: true,
                },
            });
        }
        catch (error) {
            logger_1.logger.error({ error, agentType }, 'Failed to get recent agent errors');
            return [];
        }
    }
    // ============================================
    // ENHANCEMENT: Cost Tracking
    // ============================================
    /**
     * Get total cost for an execution
     */
    static async getExecutionCost(executionId) {
        try {
            const result = await client_2.prisma.agentExecution.aggregate({
                where: {
                    metadata: {
                        path: ['executionId'],
                        equals: executionId,
                    },
                },
                _sum: {
                    tokensUsed: true,
                    costUsd: true,
                },
            });
            return {
                tokens: result._sum.tokensUsed || 0,
                costUsd: Number(result._sum.costUsd || 0),
            };
        }
        catch (error) {
            logger_1.logger.error({ error, executionId }, 'Failed to get execution cost');
            return { tokens: 0, costUsd: 0 };
        }
    }
    /**
     * Get cost breakdown by agent for an execution
     */
    static async getExecutionCostBreakdown(executionId) {
        try {
            const breakdown = await client_2.prisma.agentExecution.groupBy({
                by: ['agentType'],
                where: {
                    metadata: {
                        path: ['executionId'],
                        equals: executionId,
                    },
                },
                _sum: {
                    tokensUsed: true,
                    costUsd: true,
                },
                _count: { id: true },
            });
            return breakdown.map((item) => ({
                agentType: item.agentType,
                tokens: item._sum.tokensUsed || 0,
                costUsd: Number(item._sum.costUsd || 0),
                count: item._count.id,
            }));
        }
        catch (error) {
            logger_1.logger.error({ error, executionId }, 'Failed to get execution cost breakdown');
            return [];
        }
    }
    // ============================================
    // ENHANCEMENT: Bulk Operations
    // ============================================
    /**
     * Bulk create execution logs
     */
    static async bulkCreateExecutions(executions) {
        try {
            const result = await client_2.prisma.agentExecution.createMany({
                data: executions.map((data) => ({
                    userId: data.userId,
                    agentType: data.agentType,
                    actionType: data.actionType,
                    input: data.input || {},
                    sessionId: data.sessionId,
                    metadata: data.metadata || {},
                    ipAddress: data.ipAddress,
                    userAgent: data.userAgent,
                    status: client_1.ExecutionStatus.PENDING,
                })),
                skipDuplicates: true,
            });
            logger_1.logger.info({ count: result.count }, 'Bulk executions created');
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to bulk create executions');
            throw error;
        }
    }
    /**
     * Bulk update execution statuses
     */
    static async bulkUpdateStatus(executionIds, status) {
        try {
            const result = await client_2.prisma.agentExecution.updateMany({
                where: {
                    id: { in: executionIds },
                },
                data: {
                    status,
                    completedAt: status === client_1.ExecutionStatus.SUCCESS ||
                        status === client_1.ExecutionStatus.ERROR ||
                        status === client_1.ExecutionStatus.CANCELLED
                        ? new Date()
                        : undefined,
                },
            });
            logger_1.logger.info({ count: result.count, status }, 'Bulk status updated');
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error, status }, 'Failed to bulk update status');
            throw error;
        }
    }
    /**
     * Clean up old execution logs
     */
    static async cleanupOldExecutions(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const result = await client_2.prisma.agentExecution.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    status: {
                        in: [
                            client_1.ExecutionStatus.SUCCESS,
                            client_1.ExecutionStatus.ERROR,
                            client_1.ExecutionStatus.CANCELLED,
                        ],
                    },
                    actionType: { not: 'execution_state' }, // Don't clean up state records
                },
            });
            logger_1.logger.info({ deletedCount: result.count, daysToKeep }, 'Old executions cleaned up');
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to clean up old executions');
            throw error;
        }
    }
}
exports.AgentRepository = AgentRepository;
//# sourceMappingURL=agent.repository.js.map