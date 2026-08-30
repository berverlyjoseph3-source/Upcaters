// enterprise-ai-agent-platform/apps/api/tests/unit/agents/drive.agent.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { DriveAgent } from '../../../src/agents/drive/drive.agent';
import { AgentRequest, AgentContext } from '../../../src/types/agent.types';
import { prisma } from '../../../src/db/client';

describe('DriveAgent', () => {
  let driveAgent: DriveAgent;
  let testUserId: string;
  let testContext: AgentContext;
  
  beforeAll(async () => {
    driveAgent = new DriveAgent();
    await driveAgent.initialize();
    
    const user = await prisma.user.create({
      data: {
        email: `test-drive-${Date.now()}@example.com`,
        name: 'Drive Test User',
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
        defaultDriveFolderId: 'root',
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
    await driveAgent.shutdown();
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('getType', () => {
    it('should return DRIVE agent type', () => {
      expect(driveAgent.getType()).toBe('drive');
    });
  });
  
  describe('getName', () => {
    it('should return agent name', () => {
      expect(driveAgent.getName()).toBe('Drive Agent');
    });
  });
  
  describe('getDescription', () => {
    it('should return agent description', () => {
      const description = driveAgent.getDescription();
      expect(description).toContain('Google Drive');
      expect(description).toContain('file');
    });
  });
  
  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = driveAgent.getTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('list_files');
      expect(toolNames).toContain('upload_file');
      expect(toolNames).toContain('download_file');
      expect(toolNames).toContain('delete_file');
      expect(toolNames).toContain('share_file');
      expect(toolNames).toContain('create_folder');
    });
  });
  
  describe('getMetrics', () => {
    it('should return metrics object with zero values initially', () => {
      const metrics = driveAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });
  });
  
  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await driveAgent.getHealth();
      expect(health.agentType).toBe('drive');
      expect(health.status).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
  
  describe('resetMetrics', () => {
    it('should reset metrics to zero', async () => {
      driveAgent.resetMetrics();
      const metrics = driveAgent.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successfulExecutions).toBe(0);
      expect(metrics.failedExecutions).toBe(0);
    });
  });
  
  describe('canHandle', () => {
    it('should return true for drive-related requests', () => {
      const request: AgentRequest = {
        id: 'test_1',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Upload a file to my drive',
      };
      expect(driveAgent.canHandle(request)).toBe(true);
    });
  });
  
  describe('execute', () => {
    it('should handle list files request', async () => {
      const request: AgentRequest = {
        id: 'test_list_files',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Show me my files',
      };
      
      const response = await driveAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.metadata.agentType).toBe('drive');
      expect(response.timestamp).toBeInstanceOf(Date);
    });
    
    it('should handle create folder request', async () => {
      const request: AgentRequest = {
        id: 'test_create_folder',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Create a folder called "Test Folder"',
      };
      
      const response = await driveAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('drive');
    });
    
    it('should handle upload file request', async () => {
      const request: AgentRequest = {
        id: 'test_upload_file',
        userId: testUserId,
        sessionId: 'test_session',
        input: 'Upload a file named test.txt',
      };
      
      const response = await driveAgent.execute(request, testContext);
      
      expect(response).toBeDefined();
      expect(response.metadata.agentType).toBe('drive');
    });
  });
  
  describe('Tool Execution', () => {
    it('should execute list_files tool', async () => {
      const result = await driveAgent.executeTool('list_files', {
        pageSize: 10,
      }, testContext);
      
      expect(result).toBeDefined();
    });
    
    it('should execute create_folder tool', async () => {
      const result = await driveAgent.executeTool('create_folder', {
        name: 'API Test Folder',
      }, testContext);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('API Test Folder');
    });
    
    it('should validate tool parameters correctly', () => {
      const isValid = driveAgent.validateToolParams('upload_file', {
        name: 'test.txt',
        content: Buffer.from('test').toString('base64'),
      });
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid tool parameters', () => {
      const isValid = driveAgent.validateToolParams('upload_file', {
        name: 'test.txt',
      });
      expect(isValid).toBe(false);
    });
  });
});