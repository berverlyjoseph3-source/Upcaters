// enterprise-ai-agent-platform/apps/api/tests/unit/agents/calendar.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { CalendarAgent } from '../../../src/agents/calendar/calendar.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('CalendarAgent', () => {
  let calendarAgent: CalendarAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    calendarAgent = new CalendarAgent();
    await calendarAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-calendar-${Date.now()}@example.com`,
        name: 'Calendar Test User',
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
        defaultCalendarId: 'primary',
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
    await calendarAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return CALENDAR agent type', () => {
      expect(calendarAgent.getType()).toBe('calendar');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(calendarAgent.getName()).toBe('Calendar Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = calendarAgent.getDescription();
      expect(description).toContain('Google Calendar');
      expect(description).toContain('scheduling');
      expect(description).toContain('meeting');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = calendarAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('list_events');
      expect(toolNames).toContain('create_event');
      expect(toolNames).toContain('update_event');
      expect(toolNames).toContain('delete_event');
      expect(toolNames).toContain('get_free_busy');
      expect(toolNames).toContain('quick_add_event');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = calendarAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await calendarAgent.getHealth();
      expect(health.agentType).toBe('calendar');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('execute', () => {
    it('should handle list events request', async () => {
      const request: AgentRequest = {
        id: 'test_list_events',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Show my events for today',
      };
      
      const response = await calendarAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('calendar');
      expect(response.timestamp).toBeInstanceOf(Date);
    });
    
    it('should handle create event request', async () => {
      const request: AgentRequest = {
        id: 'test_create_event',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Create a meeting tomorrow at 2pm called "Team Sync"',
      };
      
      const response = await calendarAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('calendar');
    });
    
    it('should handle update event request', async () => {
      const request: AgentRequest = {
        id: 'test_update_event',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Update event ID 123 to 3pm',
      };
      
      const response = await calendarAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('calendar');
    });
    
    it('should handle delete event request', async () => {
      const request: AgentRequest = {
        id: 'test_delete_event',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Delete event ID 123',
      };
      
      const response = await calendarAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('calendar');
    });
    
    it('should handle find free time request', async () => {
      const request: AgentRequest = {
        id: 'test_free_time',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Find free time tomorrow for 1 hour meeting with john@example.com',
      };
      
      const response = await calendarAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('calendar');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute list_events tool', async () => {
      const result = await calendarAgent.executeTool('list_events', {
        maxResults: 10,
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
    });
    
    it('should execute get_free_busy tool', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const endOfDay = new Date(tomorrow);
      endOfDay.setHours(17, 0, 0, 0);
      
      const result = await calendarAgent.executeTool('get_free_busy', {
        timeMin: tomorrow.toISOString(),
        timeMax: endOfDay.toISOString(),
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.busySlots).toBeDefined();
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = calendarAgent.validateToolParams('create_event', {
        title: 'Test Meeting',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = calendarAgent.validateToolParams('create_event', {
        title: 'Test Meeting',
      });
      expect(isValid).toBe(false);
    });
  });
});