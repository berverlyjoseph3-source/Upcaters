// enterprise-ai-agent-platform/apps/api/tests/integration/orchestrator.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { agentRegistry } from '../../src/agents/core/agent.registry';
import { AgentType } from '../../src/types/agent.types';

describe('Orchestrator API Integration Tests', () => {
  let testUserId: string;
  let testUserEmail: string;
  let accessToken: string;
  
  beforeAll(async () => {
    testUserEmail = `test-orchestrator-${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Orchestrator Test User',
        planId: 'PROFESSIONAL',
        isActive: true,
      },
    });
    testUserId = user.id;
    
    const { AuthService } = await import('../../src/auth/services/auth.service');
    accessToken = AuthService.generateAccessToken(testUserId, testUserEmail, 'USER', 'PROFESSIONAL');
  });
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    // Clear any stored memories
    await prisma.agentMemory.deleteMany({ where: { userId: testUserId } }).catch(() => {});
  });
  
  describe('Agent Registry', () => {
    it('should have orchestrator registered', () => {
      const orchestrator = agentRegistry.getAgent(AgentType.ORCHESTRATOR);
      expect(orchestrator).toBeDefined();
    });
    
    it('should have all 8 agents registered', () => {
      const agents = agentRegistry.getAllAgents();
      // Should have 8 agents: 7 specialized + 1 orchestrator
      expect(agents.length).toBe(8);
    });
    
    it('should get orchestrator health status', async () => {
      const health = await agentRegistry.getAllHealthStatus();
      expect(health[AgentType.ORCHESTRATOR]).toBeDefined();
    });
  });
  
  describe('POST /api/agent/execute', () => {
    it('should execute a simple request through orchestrator', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'What is the weather in New York?',
          sessionId: 'test-orch-session-1',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });
    
    it('should handle email-related request through orchestrator', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Send an email to test@example.com saying Hello World',
          sessionId: 'test-orch-session-2',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should handle calendar-related request through orchestrator', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Schedule a meeting tomorrow at 2pm called Team Sync',
          sessionId: 'test-orch-session-3',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should handle multi-agent complex request through orchestrator', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Search for the latest AI news and send it as an email to test@example.com',
          sessionId: 'test-orch-session-4',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should return 400 for missing input', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .send({
          input: 'Test without auth',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/agent/stream', () => {
    it('should stream response for agent execution', async () => {
      const response = await request(app)
        .post('/api/agent/stream')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Tell me about AI',
          sessionId: 'test-stream-session',
        })
        .buffer(false)
        .parse((res: any, callback: any) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            callback(null, data);
          });
        });
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('data:');
    });
  });
  
  describe('GET /api/agent/status', () => {
    it('should return all agent statuses', async () => {
      const response = await request(app)
        .get('/api/agent/status')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
  
  describe('GET /api/agent/agents', () => {
    it('should list all available agents', async () => {
      const response = await request(app)
        .get('/api/agent/agents')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(8);
      expect(response.body.data.agents).toBeDefined();
    });
    
    it('should include orchestrator in agent list', async () => {
      const response = await request(app)
        .get('/api/agent/agents')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const agents = response.body.data.agents;
      const orchestrator = agents.find((a: any) => a.type === 'orchestrator');
      expect(orchestrator).toBeDefined();
      expect(orchestrator.name).toBe('Ultimate AI Agent');
    });
  });
  
  describe('GET /api/agent/agents/orchestrator/tools', () => {
    it('should list orchestrator tools', async () => {
      const response = await request(app)
        .get('/api/agent/agents/orchestrator/tools')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tools).toBeDefined();
      expect(response.body.data.toolCount).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/agent/health/orchestrator', () => {
    it('should return orchestrator health', async () => {
      const response = await request(app)
        .get('/api/agent/health/orchestrator')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.agentType).toBe(AgentType.ORCHESTRATOR);
    });
  });
  
  describe('Session Management', () => {
    let sessionId: string;
    
    it('should start a new agent session', async () => {
      const response = await request(app)
        .post('/api/agent/session/start')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
      sessionId = response.body.data.sessionId;
    });
    
    it('should get session details', async () => {
      const response = await request(app)
        .get(`/api/agent/session/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should execute agent within session context', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Show my recent tasks',
          sessionId,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should end the session', async () => {
      const response = await request(app)
        .post(`/api/agent/session/${sessionId}/end`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle agent execution timeout gracefully', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Do something very complex that takes too long',
          sessionId: 'test-timeout-session',
          timeout: 100, // Very short timeout
        });
      
      // Should still return a response
      expect(response.status).toBe(200);
    });
    
    it('should handle invalid agent type gracefully', async () => {
      const response = await request(app)
        .post('/api/agent/nonexistent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Test invalid agent',
        });
      
      expect(response.status).toBe(404);
    });
  });
});