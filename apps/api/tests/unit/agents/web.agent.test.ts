// enterprise-ai-agent-platform/apps/api/tests/unit/agents/web.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { WebAgent } from '../../../src/agents/web/web.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('WebAgent', () => {
  let webAgent: WebAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    webAgent = new WebAgent();
    await webAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-web-${Date.now()}@example.com`,
        name: 'Web Test User',
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
        defaultSearchProvider: 'brave',
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
    await webAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return WEB agent type', () => {
      expect(webAgent.getType()).toBe('web');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(webAgent.getName()).toBe('Web Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = webAgent.getDescription();
      expect(description).toContain('search');
      expect(description).toContain('weather');
      expect(description).toContain('research');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = webAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('search_web');
      expect(toolNames).toContain('get_weather');
      expect(toolNames).toContain('research');
      expect(toolNames).toContain('get_news');
      expect(toolNames).toContain('get_air_quality');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = webAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await webAgent.getHealth();
      expect(health.agentType).toBe('web');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('execute', () => {
    it('should handle web search request', async () => {
      const request: AgentRequest = {
        id: 'test_search',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Search for artificial intelligence news',
      };
      
      const response = await webAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('web');
      expect(response.timestamp).toBeInstanceOf(Date);
    });
    
    it('should handle weather request', async () => {
      const request: AgentRequest = {
        id: 'test_weather',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'What is the weather in New York?',
      };
      
      const response = await webAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('web');
    });
    
    it('should handle research request', async () => {
      const request: AgentRequest = {
        id: 'test_research',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Research the impact of AI on healthcare',
      };
      
      const response = await webAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('web');
    });
    
    it('should handle news request', async () => {
      const request: AgentRequest = {
        id: 'test_news',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Get latest technology news',
      };
      
      const response = await webAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('web');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute search_web tool', async () => {
      const result = await webAgent.executeTool('search_web', {
        query: 'latest AI developments',
        count: 5,
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.query).toBe('latest AI developments');
      expect(result.results).toBeDefined();
    });
    
    it('should execute get_weather tool', async () => {
      const result = await webAgent.executeTool('get_weather', {
        location: 'London',
        days: 3,
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.location).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.forecast).toBeDefined();
    });
    
    it('should execute research tool', async () => {
      const result = await webAgent.executeTool('research', {
        query: 'Quantum computing breakthroughs',
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.query).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
    });
    
    it('should execute get_news tool', async () => {
      const result = await webAgent.executeTool('get_news', {
        topic: 'space exploration',
        count: 5,
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.topic).toBe('space exploration');
      expect(result.articles).toBeDefined();
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = webAgent.validateToolParams('search_web', {
        query: 'test query',
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = webAgent.validateToolParams('search_web', {});
      expect(isValid).toBe(false);
    });
  });
});