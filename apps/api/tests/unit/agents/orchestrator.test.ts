// enterprise-ai-agent-platform/apps/api/tests/unit/agents/orchestrator.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { UltimateOrchestrator } from '../../../src/agents/orchestrator/ultimate-orchestrator';
import { IntentClassifier } from '../../../src/agents/orchestrator/intent-classifier';
import { TaskPlanner } from '../../../src/agents/orchestrator/task-planner';
import { MemoryManager } from '../../../src/agents/orchestrator/memory-manager';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { AgentType } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('Orchestrator - UltimateOrchestrator', () => {
  let orchestrator: UltimateOrchestrator;
  let testUserId: string;
  let testContext: AgentContext;

  beforeAll(async () => {
    orchestrator = new UltimateOrchestrator();
    await orchestrator.initialize();

    const user = await prisma.user.create({
      data: {
        email: `test-orchestrator-${Date.now()}@example.com`,
        name: 'Orchestrator Test User',
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
    await orchestrator.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe('getType', () => {
    it('should return ORCHESTRATOR agent type', () => {
      expect(orchestrator.getType()).toBe(AgentType.ORCHESTRATOR);
    });
  });

  describe('getName', () => {
    it('should return agent name', () => {
      expect(orchestrator.getName()).toBe('Ultimate AI Agent');
    });
  });

  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = orchestrator.getDescription();
      expect(description).toContain('orchestrator');
      expect(description).toContain('coordinator');
    });
  });

  describe('getVersion', () => {
    it('should return version 2.0.0', () => {
      expect(orchestrator.getVersion()).toBe('2.0.0');
    });
  });

  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = orchestrator.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('delegate_to_agent');
      expect(toolNames).toContain('get_memory');
      expect(toolNames).toContain('store_memory');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = orchestrator.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await orchestrator.getHealth();
      expect(health.agentType).toBe(AgentType.ORCHESTRATOR);
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });

  describe('resetMetrics', () => {
    it('should reset metrics to zero', async () => {
      orchestrator.resetMetrics();
      const metrics = orchestrator.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });

  describe('canHandle', () => {
    it('should return true for any request', () => {
      const request: AgentRequest = {
        id: 'test_1',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Send an email to john@example.com',
      };
      expect(orchestrator.canHandle(request)).toBe(true);
    });

    it('should return true for complex requests', () => {
      const request: AgentRequest = {
        id: 'test_2',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Search for the latest news and send it as an email',
      };
      expect(orchestrator.canHandle(request)).toBe(true);
    });
  });

  describe('execute', () => {
    it('should handle simple email request', async () => {
      const request: AgentRequest = {
        id: 'test_email_execution',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Send an email to test@example.com saying Hello World',
      };

      const response = await orchestrator.execute(request, testContext);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe(AgentType.ORCHESTRATOR);
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('should handle web search request', async () => {
      const request: AgentRequest = {
        id: 'test_web_execution',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Search for AI news',
      };

      const response = await orchestrator.execute(request, testContext);

      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe(AgentType.ORCHESTRATOR);
    });

    it('should handle calendar scheduling request', async () => {
      const request: AgentRequest = {
        id: 'test_calendar_execution',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Schedule a meeting tomorrow at 2pm',
      };

      const response = await orchestrator.execute(request, testContext);

      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe(AgentType.ORCHESTRATOR);
    });

    it('should handle multi-agent complex request', async () => {
      const request: AgentRequest = {
        id: 'test_multi_execution',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Create a task about the email I need to send and schedule a meeting',
      };

      const response = await orchestrator.execute(request, testContext);

      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe(AgentType.ORCHESTRATOR);
    });

    it('should handle error gracefully on failed execution', async () => {
      const request: AgentRequest = {
        id: 'test_error_execution',
        userId: 'non-existent-user',
        sessionId: 'test_session',
        input: 'Do something impossible',
      };

      const response = await orchestrator.execute(request, testContext);

      expect(response).toBeDefined();
      // Orchestrator should return a response even on error
      expect(response.id).toBeDefined();
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
        input: 'What is the weather in New York?',
      };

      const response = await orchestrator.executeStream(request, testContext, onChunk);

      expect(response).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].type).toBe('thought');
    });
  });

  describe('Tool Execution', () => {
    it('should execute delegate_to_agent tool', async () => {
      const result = await orchestrator.executeTool('delegate_to_agent', {
        agentType: 'email',
        task: 'Send a test email',
        input: { to: 'test@example.com', subject: 'Test', body: 'Hello' },
      }, testContext);

      expect(result).toBeDefined();
    });

    it('should execute get_memory tool', async () => {
      const result = await orchestrator.executeTool('get_memory', {
        query: 'email preferences',
        limit: 5,
      }, testContext);

      expect(result).toBeDefined();
    });

    it('should execute store_memory tool', async () => {
      const result = await orchestrator.executeTool('store_memory', {
        content: 'User prefers short emails',
        importance: 0.8,
      }, testContext);

      expect(result).toBeDefined();
    });

    it('should validate tool parameters correctly', () => {
      const isValid = orchestrator.validateToolParams('delegate_to_agent', {
        agentType: 'email',
        task: 'Send email',
      });
      expect(isValid).toBe(true);
    });

    it('should reject invalid tool parameters', () => {
      const isValid = orchestrator.validateToolParams('delegate_to_agent', {
        // Missing required agentType and task
      });
      expect(isValid).toBe(false);
    });
  });
});

describe('Intent Classifier', () => {
  describe('classifyByKeywords', () => {
    it('should classify email intent', () => {
      const result = IntentClassifier.classifyByKeywords('Send an email to john@example.com');
      expect(result).not.toBeNull();
      expect(result?.suggestedAgent).toBe(AgentType.EMAIL);
    });

    it('should classify calendar intent', () => {
      const result = IntentClassifier.classifyByKeywords('Schedule a meeting tomorrow at 2pm');
      expect(result).not.toBeNull();
      expect(result?.suggestedAgent).toBe(AgentType.CALENDAR);
    });

    it('should classify web search intent', () => {
      const result = IntentClassifier.classifyByKeywords('Search for the latest AI news');
      expect(result).not.toBeNull();
      expect(result?.suggestedAgent).toBe(AgentType.WEB);
    });

    it('should classify content generation intent', () => {
      const result = IntentClassifier.classifyByKeywords('Generate an image of a sunset');
      expect(result).not.toBeNull();
      expect(result?.suggestedAgent).toBe(AgentType.CONTENT);
    });

    it('should classify social media intent', () => {
      const result = IntentClassifier.classifyByKeywords('Post this to LinkedIn');
      expect(result).not.toBeNull();
      expect(result?.suggestedAgent).toBe(AgentType.SOCIAL);
    });

    it('should classify task management intent', () => {
      const result = IntentClassifier.classifyByKeywords('Create a task to review pull requests');
      expect(result).not.toBeNull();
      expect(result?.suggestedAgent).toBe(AgentType.TASK);
    });

    it('should detect multi-agent patterns', () => {
      const result = IntentClassifier.classifyByKeywords('Generate an image and post it to Instagram');
      expect(result).not.toBeNull();
      expect(result?.requiresMultipleAgents).toBe(true);
      expect(result?.agentChain).toContain(AgentType.CONTENT);
      expect(result?.agentChain).toContain(AgentType.SOCIAL);
    });

    it('should return null for unrecognized input', () => {
      const result = IntentClassifier.classifyByKeywords('xyz abc unknown random text');
      expect(result).toBeNull();
    });
  });

  describe('extractEntities', () => {
    it('should extract email addresses', () => {
      const entities = IntentClassifier.extractEntities('Send to john@example.com and jane@test.com');
      expect(entities.emails).toBeDefined();
      expect(entities.emails).toContain('john@example.com');
      expect(entities.emails).toContain('jane@test.com');
    });

    it('should extract URLs', () => {
      const entities = IntentClassifier.extractEntities('Check this link https://example.com/page');
      expect(entities.urls).toBeDefined();
      expect(entities.urls).toContain('https://example.com/page');
    });

    it('should extract dates', () => {
      const entities = IntentClassifier.extractEntities('Schedule for tomorrow and next week');
      expect(entities.dates).toBeDefined();
      expect(entities.dates).toContain('tomorrow');
    });

    it('should return empty object when nothing extracted', () => {
      const entities = IntentClassifier.extractEntities('Just a simple message');
      expect(entities).toEqual({});
    });
  });

  describe('getConfidenceLevel', () => {
    it('should return high for confidence >= 0.8', () => {
      expect(IntentClassifier.getConfidenceLevel(0.9)).toBe('high');
      expect(IntentClassifier.getConfidenceLevel(0.8)).toBe('high');
    });

    it('should return medium for confidence >= 0.5', () => {
      expect(IntentClassifier.getConfidenceLevel(0.7)).toBe('medium');
      expect(IntentClassifier.getConfidenceLevel(0.5)).toBe('medium');
    });

    it('should return low for confidence < 0.5', () => {
      expect(IntentClassifier.getConfidenceLevel(0.3)).toBe('low');
      expect(IntentClassifier.getConfidenceLevel(0.0)).toBe('low');
    });
  });
});

describe('Task Planner', () => {
  describe('createSimplePlan', () => {
    it('should create a simple plan for single agent', async () => {
      const intent = {
        primaryIntent: 'send_email',
        confidence: 0.9,
        alternativeIntents: [],
        entities: {},
        suggestedAgent: AgentType.EMAIL,
        requiresMultipleAgents: false,
      };

      const context: AgentContext = {
        sessionId: 'test_session',
        userId: 'test_user',
        previousResponses: [],
        preferences: {},
        plan: { id: 'PROFESSIONAL', name: 'Professional', limits: { aiActions: 2500, apiCalls: 15000 }, features: [] },
      };

      const plan = await TaskPlanner.createPlan(intent, context);
      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].agentType).toBe(AgentType.EMAIL);
      expect(plan.mode).toBe('sequential');
    });
  });

  describe('validatePlan', () => {
    it('should validate a valid plan', () => {
      const plan = {
        id: 'plan_1',
        steps: [
          {
            id: 'step_1',
            agentType: AgentType.EMAIL,
            action: 'send_email',
            input: { to: 'test@example.com' },
            dependsOn: [],
          },
          {
            id: 'step_2',
            agentType: AgentType.CALENDAR,
            action: 'create_event',
            input: { title: 'Meeting' },
            dependsOn: ['step_1'],
          },
        ],
        mode: 'sequential' as any,
        createdAt: new Date(),
      };

      const validation = TaskPlanner.validatePlan(plan);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect duplicate step IDs', () => {
      const plan = {
        id: 'plan_2',
        steps: [
          { id: 'step_1', agentType: AgentType.EMAIL, action: 'test', input: {}, dependsOn: [] },
          { id: 'step_1', agentType: AgentType.EMAIL, action: 'test', input: {}, dependsOn: [] },
        ],
        mode: 'sequential' as any,
        createdAt: new Date(),
      };

      const validation = TaskPlanner.validatePlan(plan);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Duplicate step ID');
    });
  });
});

describe('Memory Manager', () => {
  let testUserId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-memory-${Date.now()}@example.com`,
        name: 'Memory Test User',
        planId: 'PROFESSIONAL',
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await MemoryManager.clearShortTerm(testUserId);
  });

  describe('storeShortTerm', () => {
    it('should store short-term memory', async () => {
      const result = await MemoryManager.storeShortTerm(
        testUserId,
        'User requested email sending at 9am',
        { type: 'test' }
      );

      expect(result).toBeDefined();
      expect(result.content).toBe('User requested email sending at 9am');
      expect(result.type).toBe('short_term');
    });

    it('should retrieve stored short-term memory', async () => {
      await MemoryManager.storeShortTerm(testUserId, 'Test memory content', {});
      
      const memories = await MemoryManager.getShortTerm(testUserId);
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.length).toBeGreaterThan(0);
    });
  });

  describe('storeLongTerm', () => {
    it('should store long-term memory', async () => {
      const result = await MemoryManager.storeLongTerm(
        testUserId,
        'User prefers professional tone in emails',
        0.9,
        { source: 'user_input' },
        false // Don't generate embedding for test
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('long_term');
      expect(result.importance).toBe(0.9);
    });
  });

  describe('retrieveRelevantMemories', () => {
    it('should retrieve relevant memories by keyword', async () => {
      await MemoryManager.storeLongTerm(
        testUserId,
        'User prefers emails to be concise',
        0.8,
        { source: 'user_input' },
        false
      );

      const memories = await MemoryManager.retrieveRelevantMemories(
        testUserId,
        'email preferences',
        5,
        0.3
      );

      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('clearShortTerm', () => {
    it('should clear short-term memories', async () => {
      await MemoryManager.storeShortTerm(testUserId, 'Temporary memory', {});
      await MemoryManager.clearShortTerm(testUserId);

      const memories = await MemoryManager.getShortTerm(testUserId);
      expect(memories).toHaveLength(0);
    });
  });
});