// enterprise-ai-agent-platform/apps/api/tests/integration/agent.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Agent API Integration Tests', () => {
  let testUserId: string;
  let testUserEmail: string;
  let accessToken: string;
  
  beforeAll(async () => {
    testUserEmail = `test-agent-${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Agent Test User',
        planId: 'PROFESSIONAL',
        isActive: true,
      },
    });
    testUserId = user.id;
    
    // Generate a test token
    const { AuthService } = await import('../../src/auth/services/auth.service');
    accessToken = AuthService.generateAccessToken(testUserId, testUserEmail, 'USER', 'PROFESSIONAL');
  });
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('POST /api/agent/execute', () => {
    it('should execute agent successfully with valid input', async () => {
      const response = await request(app)
        .post('/api/agent/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'What is the weather in New York?',
          sessionId: 'test-session-123',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
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
          input: 'Test input',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should execute email agent directly', async () => {
      const response = await request(app)
        .post('/api/agent/email/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Show my unread emails',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should execute content agent for text generation', async () => {
      const response = await request(app)
        .post('/api/agent/content/execute')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          input: 'Write a short story about a robot',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/agent/status', () => {
    it('should return agent status', async () => {
      const response = await request(app)
        .get('/api/agent/status')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.agents).toBeDefined();
    });
  });
  
  describe('GET /api/agent/agents', () => {
    it('should list all available agents', async () => {
      const response = await request(app)
        .get('/api/agent/agents')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toBeDefined();
      expect(response.body.data.count).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/agent/agents/:agentType/tools', () => {
    it('should list tools for email agent', async () => {
      const response = await request(app)
        .get('/api/agent/agents/email/tools')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tools).toBeDefined();
      expect(response.body.data.toolCount).toBeGreaterThan(0);
    });
    
    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/agent/agents/nonexistent/tools')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/agent/session/start', () => {
    it('should start a new agent session', async () => {
      const response = await request(app)
        .post('/api/agent/session/start')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
    });
  });
  
  describe('POST /api/agent/session/:sessionId/end', () => {
    it('should end an agent session', async () => {
      const sessionResponse = await request(app)
        .post('/api/agent/session/start')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const sessionId = sessionResponse.body.data.sessionId;
      
      const response = await request(app)
        .post(`/api/agent/session/${sessionId}/end`)
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});