// enterprise-ai-agent-platform/apps/api/tests/unit/agents/task.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { TaskAgent } from '../../../src/agents/task/task.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('TaskAgent', () => {
  let taskAgent: TaskAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    taskAgent = new TaskAgent();
    await taskAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-task-${Date.now()}@example.com`,
        name: 'Task Test User',
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
        defaultTaskProvider: 'google_tasks',
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
    await taskAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return TASK agent type', () => {
      expect(taskAgent.getType()).toBe('task');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(taskAgent.getName()).toBe('Task Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = taskAgent.getDescription();
      expect(description).toContain('Google Tasks');
      expect(description).toContain('Asana');
      expect(description).toContain('Monday.com');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = taskAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('create_task');
      expect(toolNames).toContain('list_tasks');
      expect(toolNames).toContain('update_task');
      expect(toolNames).toContain('delete_task');
      expect(toolNames).toContain('complete_task');
      expect(toolNames).toContain('get_task_summary');
      expect(toolNames).toContain('get_projects');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = taskAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await taskAgent.getHealth();
      expect(health.agentType).toBe('task');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('execute', () => {
    it('should handle create task request', async () => {
      const request: AgentRequest = {
        id: 'test_create_task',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Create a task: Review pull requests',
      };
      
      const response = await taskAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('task');
      expect(response.timestamp).toBeInstanceOf(Date);
    });
    
    it('should handle list tasks request', async () => {
      const request: AgentRequest = {
        id: 'test_list_tasks',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Show my pending tasks',
      };
      
      const response = await taskAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('task');
    });
    
    it('should handle complete task request', async () => {
      const request: AgentRequest = {
        id: 'test_complete_task',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Complete task ID 123',
      };
      
      const response = await taskAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('task');
    });
    
    it('should handle task summary request', async () => {
      const request: AgentRequest = {
        id: 'test_summary',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Show me my task summary',
      };
      
      const response = await taskAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('task');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute create_task tool', async () => {
      const result = await taskAgent.executeTool('create_task', {
        title: 'Test Task from Unit Test',
        description: 'This is a test task',
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.title).toBe('Test Task from Unit Test');
    });
    
    it('should execute list_tasks tool', async () => {
      const result = await taskAgent.executeTool('list_tasks', {
        status: 'pending',
        limit: 10,
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.tasks).toBeDefined();
    });
    
    it('should execute get_task_summary tool', async () => {
      const result = await taskAgent.executeTool('get_task_summary', {}, testContext);
      
      expect(result).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.completed).toBeDefined();
      expect(result.pending).toBeDefined();
    });
    
    it('should execute get_projects tool', async () => {
      const result = await taskAgent.executeTool('get_projects', {}, testContext);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = taskAgent.validateToolParams('create_task', {
        title: 'Test Task',
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = taskAgent.validateToolParams('create_task', {});
      expect(isValid).toBe(false);
    });
  });
});