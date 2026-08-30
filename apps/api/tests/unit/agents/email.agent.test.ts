// enterprise-ai-agent-platform/apps/api/tests/unit/agents/email.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { EmailAgent } from '../../../src/agents/email/email.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('EmailAgent', () => {
  let emailAgent: EmailAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    emailAgent = new EmailAgent();
    await emailAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-email-${Date.now()}@example.com`,
        name: 'Email Test User',
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
        timezone: 'America/New_York',
        emailSignature: 'Best regards,\nAI Agent',
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
    await emailAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return EMAIL agent type', () => {
      expect(emailAgent.getType()).toBe('email');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(emailAgent.getName()).toBe('Email Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = emailAgent.getDescription();
      expect(description).toContain('Gmail');
      expect(description).toContain('email');
    });
  });
  
  describe('getVersion', () => {
    it('should return agent version', () => {
      expect(emailAgent.getVersion()).toBe('1.0.0');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = emailAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('get_emails');
      expect(toolNames).toContain('send_email');
      expect(toolNames).toContain('reply_to_email');
      expect(toolNames).toContain('mark_as_read');
      expect(toolNames).toContain('create_draft');
      expect(toolNames).toContain('classify_email');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = emailAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.averageResponseTimeMs).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await emailAgent.getHealth();
      expect(health.agentType).toBe('email');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('resetMetrics', () => {
    it('should reset metrics to zero', async () => {
      emailAgent.resetMetrics();
      const metrics = emailAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('canHandle', () => {
    it('should return true for email-related requests', () => {
      const request: AgentRequest = {
        id: 'test_1',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Send an email to john@example.com',
      };
      expect(emailAgent.canHandle(request)).toBe(true);
    });
    
    it('should return true for any request (default behavior)', () => {
      const request: AgentRequest = {
        id: 'test_2',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'What is the weather?',
      };
      expect(emailAgent.canHandle(request)).toBe(true);
    });
  });
  
  describe('execute', () => {
    it('should handle send email request', async () => {
      const request: AgentRequest = {
        id: 'test_send_email',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Send an email to test@example.com saying Hello World',
      };
      
      const response = await emailAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('email');
      expect(response.timestamp).toBeInstanceOf(Date);
    });
    
    it('should handle read emails request', async () => {
      const request: AgentRequest = {
        id: 'test_read_emails',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Show me my unread emails',
      };
      
      const response = await emailAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('email');
    });
    
    it('should handle reply to email request', async () => {
      const request: AgentRequest = {
        id: 'test_reply_email',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Reply to email ID msg_123 saying Thank you',
      };
      
      const response = await emailAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('email');
    });
    
    it('should handle classify emails request', async () => {
      const request: AgentRequest = {
        id: 'test_classify',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Classify my unread emails by urgency',
      };
      
      const response = await emailAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('email');
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
        input: 'Send a test email',
      };
      
      const response = await emailAgent.executeStream(request, testContext, onChunk);
      
      expect(response).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('thought');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute get_emails tool', async () => {
      const result = await emailAgent.executeTool('get_emails', {
        maxResults: 5,
      }, testContext);
      
      expect(result).toBeDefined();
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = emailAgent.validateToolParams('send_email', {
        to: 'test@example.com',
        subject: 'Test',
        body: 'Hello',
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = emailAgent.validateToolParams('send_email', {
        subject: 'Missing required fields',
      });
      expect(isValid).toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing Gmail connection gracefully', async () => {
      const request: AgentRequest = {
        id: 'test_error',
        userId: 'non-existent-user',
        sessionId: 'test_session',
        input: 'Send an email',
      };
      
      const response = await emailAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
});