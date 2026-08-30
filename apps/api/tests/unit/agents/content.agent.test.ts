// enterprise-ai-agent-platform/apps/api/tests/unit/agents/content.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { ContentAgent } from '../../../src/agents/content/content.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('ContentAgent', () => {
  let contentAgent: ContentAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    contentAgent = new ContentAgent();
    await contentAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-content-${Date.now()}@example.com`,
        name: 'Content Test User',
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
        defaultModel: 'gpt-4',
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
    await contentAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return CONTENT agent type', () => {
      expect(contentAgent.getType()).toBe('content');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(contentAgent.getName()).toBe('Content Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = contentAgent.getDescription();
      expect(description).toContain('text');
      expect(description).toContain('images');
      expect(description).toContain('videos');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = contentAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('generate_text');
      expect(toolNames).toContain('generate_image');
      expect(toolNames).toContain('analyze_content');
      expect(toolNames).toContain('summarize_text');
      expect(toolNames).toContain('translate_text');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = contentAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await contentAgent.getHealth();
      expect(health.agentType).toBe('content');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('resetMetrics', () => {
    it('should reset metrics to zero', async () => {
      contentAgent.resetMetrics();
      const metrics = contentAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('execute', () => {
    it('should handle text generation request', async () => {
      const request: AgentRequest = {
        id: 'test_generate_text',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Write a short story about a robot learning to love',
      };
      
      const response = await contentAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('content');
      expect(response.timestamp).toBeInstanceOf(Date);
    });
    
    it('should handle image generation request', async () => {
      const request: AgentRequest = {
        id: 'test_generate_image',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Generate an image of a sunset over mountains',
      };
      
      const response = await contentAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('content');
    });
    
    it('should handle content analysis request', async () => {
      const request: AgentRequest = {
        id: 'test_analyze',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Analyze the sentiment of "I love this product!"',
      };
      
      const response = await contentAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('content');
    });
    
    it('should handle summarization request', async () => {
      const request: AgentRequest = {
        id: 'test_summarize',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Summarize the following text: [long text content]',
      };
      
      const response = await contentAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('content');
    });
  });
  
  describe('executeStream', () => {
    it('should handle streaming execution', async () => {
      const chunks: any[] = [];
      const onChunk = (chunk: any) => {
        chunks.push(chunk);
      };
      
      const request: AgentRequest = {
        id: 'test_stream',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Write a poem about AI',
      };
      
      const response = await contentAgent.executeStream(request, testContext, onChunk);
      
      expect(response).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('thought');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute generate_text tool', async () => {
      const result = await contentAgent.executeTool('generate_text', {
        prompt: 'Say hello world',
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
    
    it('should execute analyze_content tool', async () => {
      const result = await contentAgent.executeTool('analyze_content', {
        content: 'This is great!',
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = contentAgent.validateToolParams('generate_text', {
        prompt: 'Write something',
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = contentAgent.validateToolParams('generate_text', {});
      expect(isValid).toBe(false);
    });
  });
});