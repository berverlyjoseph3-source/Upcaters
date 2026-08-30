// enterprise-ai-agent-platform/apps/api/src/agents/core/agent.registry.ts
import { IAgent, IAgentEventListener, IAgentMiddleware } from './agent.interface';
import { AgentType, AgentRequest, AgentResponse, AgentContext, AgentHealthStatus } from '../../types/agent.types';
import { logger } from '../../utils/logger';

/**
 * Agent Registry - Manages all agent instances
 * Singleton pattern for centralized agent management
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentType, IAgent> = new Map();
  private listeners: IAgentEventListener[] = [];
  private middlewares: IAgentMiddleware[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent
   */
  registerAgent(agent: IAgent): void {
    const agentType = agent.getType();
    
    if (this.agents.has(agentType)) {
      logger.warn({ agentType }, 'Agent already registered, overwriting');
    }
    
    this.agents.set(agentType, agent);
    logger.info({ agentType, name: agent.getName(), version: agent.getVersion() }, 'Agent registered');
  }

  /**
   * Get an agent by type
   */
  getAgent(type: AgentType): IAgent | undefined {
    return this.agents.get(type);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all agent types
   */
  getAgentTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Check if an agent is registered
   */
  hasAgent(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * Initialize all agents
   */
  async initializeAll(): Promise<void> {
    logger.info('Initializing all agents...');
    
    const initPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        await agent.initialize();
        logger.info({ agentType: agent.getType() }, 'Agent initialized successfully');
      } catch (error) {
        logger.error({ error, agentType: agent.getType() }, 'Failed to initialize agent');
        throw error;
      }
    });
    
    await Promise.all(initPromises);
    
    // Start health check monitoring
    this.startHealthCheck();
    
    logger.info('All agents initialized successfully');
  }

  /**
   * Execute an action with a specific agent
   */
  async execute(
    agentType: AgentType,
    request: AgentRequest,
    context: AgentContext
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentType);
    
    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }
    
    // Apply pre-execution middlewares
    let processedRequest = request;
    let processedContext = context;
    
    for (const middleware of this.middlewares) {
      if (middleware.preProcess) {
        processedRequest = await middleware.preProcess(processedRequest, processedContext);
      }
    }
    
    // Notify listeners before execution
    await this.notifyBeforeExecute(processedRequest, processedContext);
    
    const startTime = Date.now();
    
    try {
      const response = await agent.execute(processedRequest, processedContext);
      
      // Apply post-execution middlewares
      let processedResponse = response;
      for (const middleware of this.middlewares) {
        if (middleware.postProcess) {
          processedResponse = await middleware.postProcess(processedResponse, processedContext);
        }
      }
      
      // Notify listeners after execution
      await this.notifyAfterExecute(processedRequest, processedResponse, processedContext);
      
      logger.debug({
        agentType,
        requestId: request.id,
        userId: request.userId,
        executionTimeMs: Date.now() - startTime,
        success: true,
      }, 'Agent execution completed');
      
      return processedResponse;
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Notify listeners of error
      await this.notifyError(processedRequest, errorObj, processedContext);
      
      // Apply error middleware
      for (const middleware of this.middlewares) {
        if (middleware.onError) {
          const fallbackResponse = await middleware.onError(errorObj, processedRequest, processedContext);
          if (fallbackResponse) {
            return fallbackResponse;
          }
        }
      }
      
      logger.error({
        agentType,
        requestId: request.id,
        userId: request.userId,
        executionTimeMs: Date.now() - startTime,
        error: errorObj.message,
      }, 'Agent execution failed');
      
      throw error;
    }
  }

  /**
   * Execute with streaming support
   */
  async executeStream(
    agentType: AgentType,
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: any) => void
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentType);
    
    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }
    
    if (!agent.executeStream) {
      // Fallback to regular execution
      const response = await this.execute(agentType, request, context);
      onChunk({
        type: 'output',
        content: response.success ? response.output : response.error,
        timestamp: new Date(),
      });
      return response;
    }
    
    return await agent.executeStream(request, context, onChunk);
  }

  /**
   * Get health status for all agents
   */
  async getAllHealthStatus(): Promise<Record<AgentType, AgentHealthStatus>> {
    const status: Record<AgentType, AgentHealthStatus> = {} as Record<AgentType, AgentHealthStatus>;
    
    for (const [type, agent] of this.agents.entries()) {
      try {
        status[type] = await agent.getHealth();
      } catch (error) {
        status[type] = {
          agentType: type,
          status: 'error' as any,
          metrics: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageResponseTimeMs: 0,
            p95ResponseTimeMs: 0,
            p99ResponseTimeMs: 0,
            totalTokensUsed: 0,
            totalCostUsd: 0,
            errorRate: 1,
          },
          lastHeartbeat: new Date(),
          message: error instanceof Error ? error.message : 'Health check failed',
        };
      }
    }
    
    return status;
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const healthStatus = await this.getAllHealthStatus();
      
      // Log unhealthy agents
      for (const [type, status] of Object.entries(healthStatus)) {
        if (status.status === 'error') {
          logger.warn({ agentType: type, message: status.message }, 'Agent unhealthy');
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Add event listener
   */
  addListener(listener: IAgentEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeListener(listener: IAgentEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add middleware
   */
  addMiddleware(middleware: IAgentMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Remove middleware
   */
  removeMiddleware(middleware: IAgentMiddleware): void {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
    }
  }

  /**
   * Notify listeners before execution
   */
  private async notifyBeforeExecute(request: AgentRequest, context: AgentContext): Promise<void> {
    for (const listener of this.listeners) {
      if (listener.onBeforeExecute) {
        await listener.onBeforeExecute(request, context);
      }
    }
  }

  /**
   * Notify listeners after execution
   */
  private async notifyAfterExecute(
    request: AgentRequest,
    response: AgentResponse,
    context: AgentContext
  ): Promise<void> {
    for (const listener of this.listeners) {
      if (listener.onAfterExecute) {
        await listener.onAfterExecute(request, response, context);
      }
    }
  }

  /**
   * Notify listeners of error
   */
  private async notifyError(
    request: AgentRequest,
    error: Error,
    context: AgentContext
  ): Promise<void> {
    for (const listener of this.listeners) {
      if (listener.onError) {
        await listener.onError(request, error, context);
      }
    }
  }

  /**
   * Shutdown all agents
   */
  async shutdownAll(): Promise<void> {
    this.stopHealthCheck();
    
    logger.info('Shutting down all agents...');
    
    const shutdownPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        await agent.shutdown();
        logger.info({ agentType: agent.getType() }, 'Agent shutdown successfully');
      } catch (error) {
        logger.error({ error, agentType: agent.getType() }, 'Error shutting down agent');
      }
    });
    
    await Promise.all(shutdownPromises);
    
    logger.info('All agents shutdown complete');
  }

  /**
   * Reset metrics for all agents
   */
  resetAllMetrics(): void {
    for (const agent of this.agents.values()) {
      agent.resetMetrics();
    }
    logger.info('All agent metrics reset');
  }
}

// Export singleton instance
export const agentRegistry = AgentRegistry.getInstance();