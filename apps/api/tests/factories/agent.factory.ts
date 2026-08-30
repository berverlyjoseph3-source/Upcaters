// enterprise-ai-agent-platform/apps/api/tests/factories/agent.factory.ts
import { faker } from '@faker-js/faker';
import { prisma } from '../../src/db/client';
import { AgentType, ExecutionStatus } from '@prisma/client';

export interface AgentExecutionFactoryParams {
  userId ? : string;
  agentType ? : AgentType;
  actionType ? : string;
  status ? : ExecutionStatus;
  tokensUsed ? : number;
  costUsd ? : number;
  durationMs ? : number;
  errorMessage ? : string;
  metadata ? : Record < string, any > ;
}

export class AgentExecutionFactory {
  static async create(params: AgentExecutionFactoryParams = {}) {
    const userId = params.userId || (await this.getDefaultUserId());
    const agentType = params.agentType || AgentType.EMAIL;
    const actionType = params.actionType || faker.helpers.arrayElement(['send_email', 'read_email', 'reply_email']);
    const status = params.status || ExecutionStatus.SUCCESS;
    const tokensUsed = params.tokensUsed ?? faker.number.int({ min: 100, max: 5000 });
    const costUsd = params.costUsd ?? tokensUsed * 0.000001;
    const durationMs = params.durationMs ?? faker.number.int({ min: 50, max: 2000 });
    
    return await prisma.agentExecution.create({
      data: {
        userId,
        agentType,
        actionType,
        status,
        tokensUsed,
        costUsd,
        durationMs,
        errorMessage: params.errorMessage,
        metadata: params.metadata || {},
        input: { test: true },
        output: { result: 'success' },
      },
    });
  }
  
  static async createBatch(count: number, baseParams: AgentExecutionFactoryParams = {}) {
    const executions = [];
    for (let i = 0; i < count; i++) {
      executions.push(await this.create(baseParams));
    }
    return executions;
  }
  
  static async createSuccessful(userId: string, agentType ? : AgentType) {
    return this.create({ userId, agentType, status: ExecutionStatus.SUCCESS });
  }
  
  static async createFailed(userId: string, agentType ? : AgentType, errorMessage ? : string) {
    return this.create({
      userId,
      agentType,
      status: ExecutionStatus.ERROR,
      errorMessage: errorMessage || 'Test error message',
    });
  }
  
  static async createRunning(userId: string, agentType ? : AgentType) {
    return this.create({ userId, agentType, status: ExecutionStatus.RUNNING });
  }
  
  static async createPending(userId: string, agentType ? : AgentType) {
    return this.create({ userId, agentType, status: ExecutionStatus.PENDING });
  }
  
  static async createForAllAgents(userId: string) {
    const agents = Object.values(AgentType);
    const executions = [];
    for (const agent of agents) {
      executions.push(await this.create({ userId, agentType: agent }));
    }
    return executions;
  }
  
  private static async getDefaultUserId(): Promise < string > {
    const user = await prisma.user.findFirst();
    if (user) return user.id;
    
    const newUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        planId: 'FREE',
        isActive: true,
      },
    });
    return newUser.id;
  }
  
  static async delete(executionId: string) {
    await prisma.agentExecution.delete({ where: { id: executionId } }).catch(() => {});
  }
  
  static async deleteMany(executionIds: string[]) {
    await prisma.agentExecution.deleteMany({ where: { id: { in: executionIds } } }).catch(() => {});
  }
  
  static async countByStatus(userId: string, status: ExecutionStatus) {
    return await prisma.agentExecution.count({
      where: { userId, status },
    });
  }
  
  static async getTotalCost(userId: string) {
    const result = await prisma.agentExecution.aggregate({
      where: { userId },
      _sum: { costUsd: true },
    });
    return result._sum.costUsd || 0;
  }
  
  static async getAverageDuration(userId: string) {
    const result = await prisma.agentExecution.aggregate({
      where: { userId, status: ExecutionStatus.SUCCESS },
      _avg: { durationMs: true },
    });
    return result._avg.durationMs || 0;
  }
}

export class UsageLogFactory {
  static async create(userId: string, actionType: string = 'ai_action', count: number = 1) {
    const billingPeriod = new Date().toISOString().slice(0, 7);
    
    return await prisma.usageLog.upsert({
      where: {
        userId_billingPeriod_actionType: {
          userId,
          billingPeriod,
          actionType,
        },
      },
      update: { count: { increment: count } },
      create: {
        userId,
        billingPeriod,
        actionType,
        count,
        tokensUsed: count * 100,
        costUsd: count * 0.001,
      },
    });
  }
  
  static async createBatch(userId: string, actions: Array < { actionType: string;count: number } > ) {
    const results = [];
    for (const action of actions) {
      results.push(await this.create(userId, action.actionType, action.count));
    }
    return results;
  }
  
  static async getTotalUsage(userId: string) {
    const result = await prisma.usageLog.aggregate({
      where: { userId },
      _sum: { count: true, costUsd: true },
    });
    return {
      totalActions: result._sum.count || 0,
      totalCost: result._sum.costUsd || 0,
    };
  }
}