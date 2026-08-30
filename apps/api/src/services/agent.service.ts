// enterprise-ai-agent-platform/apps/api/src/services/agent.service.ts
import { v4 as uuidv4 } from 'uuid';
import { agentRegistry } from '../agents/core/agent.registry';
import { AgentType, AgentRequest, AgentContext, AgentResponse, StreamingChunk } from '../types/agent.types';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { ActionType } from '../types/usage.types';
import { UsageMeteringService } from './usage-metering.service';

export interface AgentExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  metadata: {
    requestId: string;
    agentType: string;
    executionTimeMs: number;
    tokensUsed: number;
    costUsd: number;
  };
  agentType: string;
  requestId: string;
}

export class AgentService {
  /**
   * Execute an agent through the orchestrator
   */
  static async executeAgent(
    userId: string,
    input: string,
    sessionId: string,
    agentType: string = 'orchestrator',
    action?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      // Log execution start
      await this.logExecutionStart(requestId, userId, agentType, input, ipAddress, userAgent);

      // Get the agent
      const agent = agentRegistry.getAgent(agentType as AgentType);
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      // Prepare request and context
      const request: AgentRequest = {
        id: requestId,
        userId,
        sessionId,
        input,
        priority: 1,
      };

      const context: AgentContext = {
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
      await UsageMeteringService.incrementUsage(
        userId,
        ActionType.AI_ORCHESTRATOR,
        response.metadata.tokensUsed || 0
      );

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
    } catch (error) {
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
  static async executeAgentStream(
    userId: string,
    input: string,
    sessionId: string,
    agentType: string = 'orchestrator',
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const agent = agentRegistry.getAgent(agentType as AgentType);
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      const request: AgentRequest = {
        id: requestId,
        userId,
        sessionId,
        input,
        priority: 1,
      };

      const context: AgentContext = {
        sessionId,
        userId,
        previousResponses: [],
        preferences: {},
        plan: { id: 'default', name: 'Default', limits: { aiActions: 0, apiCalls: 0 }, features: [] },
      };

      const response = await agent.executeStream(request, context, onChunk);
      const executionTimeMs = Date.now() - startTime;

      await UsageMeteringService.incrementUsage(
        userId,
        ActionType.AI_ORCHESTRATOR,
        response.metadata.tokensUsed || 0
      );

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
    } catch (error) {
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
  static async executeSpecificAgent(
    userId: string,
    agentType: AgentType,
    input: string,
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      const agent = agentRegistry.getAgent(agentType);
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      const request: AgentRequest = {
        id: requestId,
        userId,
        sessionId,
        input,
        priority: 1,
      };

      const context: AgentContext = {
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
    } catch (error) {
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
  static async createSession(userId: string, sessionId: string): Promise<any> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    const session = await prisma.session.create({
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
  static async endSession(userId: string, sessionId: string): Promise<void> {
    await prisma.session.updateMany({
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
  static async getSession(userId: string, sessionId: string): Promise<any> {
    const session = await prisma.session.findFirst({
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
  private static async logExecutionStart(
    requestId: string,
    userId: string,
    agentType: string,
    input: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.agentExecution.create({
        data: {
          id: requestId,
          userId,
          agentType: agentType.toUpperCase() as any,
          actionType: 'execute',
          input: { text: input.substring(0, 1000) },
          status: 'RUNNING',
          ipAddress,
          userAgent,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      logger.error({ error, requestId }, 'Failed to log execution start');
    }
  }

  /**
   * Log execution completion
   */
  private static async logExecutionComplete(
    requestId: string,
    response: AgentResponse,
    durationMs: number
  ): Promise<void> {
    try {
      await prisma.agentExecution.update({
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
    } catch (error) {
      logger.error({ error, requestId }, 'Failed to log execution completion');
    }
  }

  /**
   * Log execution error
   */
  private static async logExecutionError(
    requestId: string,
    error: string,
    durationMs: number
  ): Promise<void> {
    try {
      await prisma.agentExecution.update({
        where: { id: requestId },
        data: {
          status: 'ERROR',
          errorMessage: error,
          durationMs,
          completedAt: new Date(),
        },
      });
    } catch (err) {
      logger.error({ err, requestId }, 'Failed to log execution error');
    }
  }
}