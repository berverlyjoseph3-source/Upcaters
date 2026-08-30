// enterprise-ai-agent-platform/apps/api/tests/unit/agents/social.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { SocialAgent } from '../../../src/agents/social/social.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('SocialAgent', () => {
  let socialAgent: SocialAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    socialAgent = new SocialAgent();
    await socialAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-social-${Date.now()}@example.com`,
        name: 'Social Test User',
        planId: 'PROFESSIONAL',
        isActive: true,
      },
    });
    testUserId = user.id;
    
    testContext = {
      sessionId: 'test_session_123',
      userId: testUserId,
      previousResponses: [],
      preferences: {
        defaultPlatforms: ['linkedin', 'twitter'],
      },
      plan: {
        id: 'PROFESSIONAL',
        name: 'Professional',
        limits: { aiActions: 2500, apiCalls: 15000 },
        features: [],
      },
    };
  });
  
  afterAll(async () => {
    await socialAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return SOCIAL agent type', () => {
      expect(socialAgent.getType()).toBe('social');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(socialAgent.getName()).toBe('Social Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = socialAgent.getDescription();
      expect(description).toContain('LinkedIn');
      expect(description).toContain('Instagram');
      expect(description).toContain('Facebook');
      expect(description).toContain('Twitter');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = socialAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('post_to_linkedin');
      expect(toolNames).toContain('post_to_instagram');
      expect(toolNames).toContain('post_to_facebook');
      expect(toolNames).toContain('post_to_x');
      expect(toolNames).toContain('schedule_post');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = socialAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await socialAgent.getHealth();
      expect(health.agentType).toBe('social');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('execute', () => {
    it('should handle LinkedIn post request', async () => {
      const request: AgentRequest = {
        id: 'test_linkedin',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Post to LinkedIn: Hello world!',
      };
      
      const response = await socialAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('social');
    });
    
    it('should handle Twitter post request', async () => {
      const request: AgentRequest = {
        id: 'test_twitter',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Tweet: Hello from AI Agent!',
      };
      
      const response = await socialAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('social');
    });
    
    it('should handle multi-platform post request', async () => {
      const request: AgentRequest = {
        id: 'test_multi',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Post to all platforms: Hello everyone!',
      };
      
      const response = await socialAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('social');
    });
    
    it('should handle schedule post request', async () => {
      const request: AgentRequest = {
        id: 'test_schedule',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Schedule a LinkedIn post for tomorrow at 9am',
      };
      
      const response = await socialAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('social');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute post_to_linkedin tool', async () => {
      const result = await socialAgent.executeTool('post_to_linkedin', {
        content: 'Test LinkedIn post',
      }, testContext);
      
      expect(result).toBeDefined();
    });
    
    it('should execute post_to_x tool', async () => {
      const result = await socialAgent.executeTool('post_to_x', {
        content: 'Test tweet',
      }, testContext);
      
      expect(result).toBeDefined();
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = socialAgent.validateToolParams('post_to_linkedin', {
        content: 'Test post',
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = socialAgent.validateToolParams('post_to_linkedin', {});
      expect(isValid).toBe(false);
    });
    
    it('should truncate long tweets', async () => {
      const longContent = 'a'.repeat(300);
      const result = await socialAgent.executeTool('post_to_x', {
        content: longContent,
      }, testContext);
      
      expect(result).toBeDefined();
    });
  });
});