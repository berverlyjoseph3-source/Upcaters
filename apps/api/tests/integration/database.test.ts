// enterprise-ai-agent-platform/apps/api/tests/integration/database.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '../../src/db/client';

describe('Database Integration Tests', () => {
  let testUserId: string;
  
  beforeAll(async () => {
    // Ensure database is clean before tests
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
  });
  
  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });
  
  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-crud-${Date.now()}@example.com`,
          name: 'CRUD Test User',
          planId: 'FREE',
          isActive: true,
        },
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toContain('test-crud');
      testUserId = user.id;
    });
    
    it('should read user by ID', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
    });
    
    it('should update user', async () => {
      const updatedUser = await prisma.user.update({
        where: { id: testUserId },
        data: {
          name: 'Updated Name',
          planId: 'PROFESSIONAL',
        },
      });
      
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.planId).toBe('PROFESSIONAL');
    });
    
    it('should delete user', async () => {
      await prisma.user.delete({ where: { id: testUserId } });
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user).toBeNull();
      testUserId = '';
    });
  });
  
  describe('OAuth Connection Operations', () => {
    let userId: string;
    
    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-oauth-${Date.now()}@example.com`,
          name: 'OAuth Test User',
          planId: 'PROFESSIONAL',
          isActive: true,
        },
      });
      userId = user.id;
    });
    
    afterAll(async () => {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    });
    
    it('should create OAuth connection', async () => {
      const connection = await prisma.oAuthConnection.create({
        data: {
          userId,
          provider: 'GOOGLE_GMAIL',
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          providerUserId: 'google-123',
          providerEmail: 'test@gmail.com',
        },
      });
      
      expect(connection).toBeDefined();
      expect(connection.provider).toBe('GOOGLE_GMAIL');
      expect(connection.userId).toBe(userId);
    });
    
    it('should retrieve OAuth connections for user', async () => {
      const connections = await prisma.oAuthConnection.findMany({
        where: { userId },
      });
      
      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].provider).toBe('GOOGLE_GMAIL');
    });
    
    it('should update OAuth token', async () => {
      const updated = await prisma.oAuthConnection.updateMany({
        where: { userId, provider: 'GOOGLE_GMAIL' },
        data: { accessToken: 'new-access-token' },
      });
      
      expect(updated.count).toBe(1);
    });
  });
  
  describe('Agent Execution Logging', () => {
    let userId: string;
    
    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-exec-${Date.now()}@example.com`,
          name: 'Execution Test User',
          planId: 'PROFESSIONAL',
          isActive: true,
        },
      });
      userId = user.id;
    });
    
    afterAll(async () => {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    });
    
    it('should create agent execution log', async () => {
      const execution = await prisma.agentExecution.create({
        data: {
          userId,
          agentType: 'EMAIL',
          actionType: 'send_email',
          input: { to: 'test@example.com', subject: 'Test' },
          status: 'SUCCESS',
          durationMs: 150,
        },
      });
      
      expect(execution).toBeDefined();
      expect(execution.id).toBeDefined();
      expect(execution.agentType).toBe('EMAIL');
      expect(execution.status).toBe('SUCCESS');
    });
    
    it('should retrieve executions for user', async () => {
      const executions = await prisma.agentExecution.findMany({
        where: { userId },
      });
      
      expect(executions.length).toBeGreaterThan(0);
    });
  });
  
  describe('Usage Log Operations', () => {
    let userId: string;
    
    beforeAll(async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-usage-${Date.now()}@example.com`,
          name: 'Usage Test User',
          planId: 'STARTER',
          isActive: true,
        },
      });
      userId = user.id;
    });
    
    afterAll(async () => {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    });
    
    it('should create usage log', async () => {
      const billingPeriod = new Date().toISOString().slice(0, 7);
      
      const usage = await prisma.usageLog.upsert({
        where: {
          userId_billingPeriod_actionType: {
            userId,
            billingPeriod,
            actionType: 'ai_action',
          },
        },
        update: { count: { increment: 5 } },
        create: {
          userId,
          billingPeriod,
          actionType: 'ai_action',
          count: 5,
          tokensUsed: 1000,
          costUsd: 0.01,
        },
      });
      
      expect(usage).toBeDefined();
      expect(usage.count).toBe(5);
    });
    
    it('should aggregate usage logs', async () => {
      const usage = await prisma.usageLog.aggregate({
        where: { userId },
        _sum: { count: true, costUsd: true },
      });
      
      expect(usage._sum.count).toBeGreaterThanOrEqual(5);
    });
  });
  
  describe('Transaction Support', () => {
    it('should handle multi-table transactions', async () => {
      const email = `test-transaction-${Date.now()}@example.com`;
      
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            name: 'Transaction User',
            planId: 'FREE',
            isActive: true,
          },
        });
        
        const execution = await tx.agentExecution.create({
          data: {
            userId: user.id,
            agentType: 'EMAIL',
            actionType: 'test',
            status: 'SUCCESS',
          },
        });
        
        return { user, execution };
      });
      
      expect(result.user.id).toBeDefined();
      expect(result.execution.id).toBeDefined();
      
      await prisma.user.delete({ where: { id: result.user.id } });
    });
    
    it('should rollback on error', async () => {
      const email = `test-rollback-${Date.now()}@example.com`;
      
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              email,
              name: 'Rollback User',
              planId: 'FREE',
              isActive: true,
            },
          });
          
          throw new Error('Forced rollback');
        })
      ).rejects.toThrow();
      
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeNull();
    });
  });
});