// enterprise-ai-agent-platform/apps/api/src/agents/task/task.agent.ts
import { BaseAgent } from '../core/base.agent';
import { GoogleTasksClient } from './googletasks.client';
import { AsanaClient } from './asana.client';
import { MondayClient } from './monday.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { AgentType, AgentRequest, AgentContext, AgentResponse, StreamingChunk } from '../../types/agent.types';
import { logger } from '../../utils/logger';
import { OpenAIService } from '../../services/ai/openai.service';
import { prisma } from '../../db/client';
import { TaskTools } from './task.tools';

export class TaskAgent extends BaseAgent {
  constructor() {
    super(
      AgentType.TASK,
      'Task Agent',
      'Manage tasks across Google Tasks, Asana, and Monday.com',
      '1.0.0'
    );
  }

  protected registerTools(): void {
    this.registerTool(TaskTools.createTaskTool());
    this.registerTool(TaskTools.listTasksTool());
    this.registerTool(TaskTools.updateTaskTool());
    this.registerTool(TaskTools.deleteTaskTool());
    this.registerTool(TaskTools.completeTaskTool());
    this.registerTool(TaskTools.getTaskSummaryTool());
    this.registerTool(TaskTools.getProjectsTool());
    this.registerTool(TaskTools.batchCreateTasksTool());
  }

  /**
   * Get Google Tasks client
   */
  private async getGoogleTasksClient(userId: string): Promise<GoogleTasksClient | null> {
    try {
      const token = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_TASKS);
      if (!token) return null;
      return new GoogleTasksClient(token);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Google Tasks client');
      return null;
    }
  }

  /**
   * Get Asana client
   */
  private async getAsanaClient(userId: string): Promise<AsanaClient | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });
      const asanaToken = (user?.metadata as any)?.asanaToken;
      if (!asanaToken) return null;
      return new AsanaClient(asanaToken);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Asana client');
      return null;
    }
  }

  /**
   * Get Monday.com client
   */
  private async getMondayClient(userId: string): Promise<MondayClient | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });
      const mondayToken = (user?.metadata as any)?.mondayToken;
      if (!mondayToken) return null;
      return new MondayClient(mondayToken);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Monday.com client');
      return null;
    }
  }

  /**
   * Check if agent can handle the request
   */
  canHandle(request: AgentRequest): boolean {
    const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
    
    const taskKeywords = [
      'task', 'todo', 'to-do', 'to do', 'asana', 'monday',
      'reminder', 'complete', 'pending', 'checklist',
      'project', 'board', 'workspace', 'assign', 'due date',
      'create task', 'add task', 'new task', 'list tasks',
      'show tasks', 'my tasks', 'what do i need to do',
      'mark as done', 'mark complete', 'finish task'
    ];
    
    return taskKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * Execute task agent logic
   */
  protected async doExecute(request: AgentRequest, context: AgentContext): Promise<any> {
    const startTime = Date.now();
    const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
    const lowerInput = input.toLowerCase();

    try {
      // Check if any provider is connected
      const [gtClient, asanaClient, mondayClient] = await Promise.all([
        this.getGoogleTasksClient(context.userId),
        this.getAsanaClient(context.userId),
        this.getMondayClient(context.userId),
      ]);

      const connectedProviders: string[] = [];
      if (gtClient) connectedProviders.push('google_tasks');
      if (asanaClient) connectedProviders.push('asana');
      if (mondayClient) connectedProviders.push('monday');

      if (connectedProviders.length === 0) {
        return {
          success: false,
          message: 'No task providers connected. Please connect Google Tasks, Asana, or Monday.com in Settings.',
          action: 'connect_provider',
          availableProviders: ['google_tasks', 'asana', 'monday'],
        };
      }

      // Handle create task
      if (this.isCreateRequest(lowerInput)) {
        return await this.handleCreateTask(context.userId, input);
      }

      // Handle complete task
      if (this.isCompleteRequest(lowerInput)) {
        return await this.handleCompleteTask(context.userId, input);
      }

      // Handle delete task
      if (this.isDeleteRequest(lowerInput)) {
        return await this.handleDeleteTask(context.userId, input);
      }

      // Handle update task
      if (this.isUpdateRequest(lowerInput)) {
        return await this.handleUpdateTask(context.userId, input);
      }

      // Handle task summary
      if (this.isSummaryRequest(lowerInput)) {
        return await this.handleTaskSummary(context.userId, input);
      }

      // Handle list projects
      if (this.isProjectsRequest(lowerInput)) {
        return await this.handleListProjects(context.userId, input);
      }

      // Handle batch create
      if (this.isBatchRequest(lowerInput)) {
        return await this.handleBatchCreate(context.userId, input);
      }

      // Default: list tasks
      return await this.handleListTasks(context.userId, input);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Task agent execution failed');
      
      return {
        success: false,
        message: `Failed to process task request: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  private isCreateRequest(input: string): boolean {
    const keywords = ['create', 'add', 'new task', 'make task', 'add to-do', 'create to-do'];
    return keywords.some(k => input.includes(k));
  }

  private isCompleteRequest(input: string): boolean {
    const keywords = ['complete', 'finish', 'done', 'mark as done', 'mark complete', 'check off'];
    return keywords.some(k => input.includes(k));
  }

  private isDeleteRequest(input: string): boolean {
    const keywords = ['delete', 'remove', 'trash', 'discard'];
    return keywords.some(k => input.includes(k));
  }

  private isUpdateRequest(input: string): boolean {
    const keywords = ['update', 'change', 'modify', 'edit', 'rename', 'move', 'reschedule'];
    return keywords.some(k => input.includes(k));
  }

  private isSummaryRequest(input: string): boolean {
    const keywords = ['summary', 'overview', 'stats', 'statistics', 'progress', 'report'];
    return keywords.some(k => input.includes(k));
  }

  private isProjectsRequest(input: string): boolean {
    const keywords = ['projects', 'boards', 'lists', 'workspaces', 'project list'];
    return keywords.some(k => input.includes(k));
  }

  private isBatchRequest(input: string): boolean {
    const keywords = ['batch', 'multiple', 'bulk', 'several tasks', 'many tasks'];
    return keywords.some(k => input.includes(k));
  }

  /**
   * Extract task details using AI
   */
  private async extractTaskDetails(input: string): Promise<any> {
    try {
      const extractionPrompt = `
Extract task details from: "${input}"

Return JSON with:
- title: task title (required)
- description: task description (optional, null if none)
- dueDate: due date in ISO format (optional, null if none)
- priority: low, medium, or high (optional, null if none)
- provider: google_tasks, asana, or monday (optional, null if none)
- projectName: project or board name (optional, null if none)
- assignee: assignee email or name (optional, null if none)

Return ONLY valid JSON.`;

      const result = await OpenAIService.complete({
        prompt: extractionPrompt,
        temperature: 0.3,
        maxTokens: 300,
      });

      return JSON.parse(result.content);
    } catch (error) {
      logger.warn({ error, input }, 'AI task extraction failed, using fallback');
      
      // Fallback extraction
      const titleMatch = input.match(/(?:task|to-do|todo)[:\s]+["']?([^"'\n]+)["']?/i);
      const dateMatch = input.match(/(?:by|due|before|on)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|tomorrow|next week)/i);
      const priorityMatch = input.match(/priority[:\s]+(low|medium|high)/i);
      const providerMatch = input.match(/in\s+(google tasks|asana|monday)/i);

      return {
        title: titleMatch?.[1] || input.substring(0, 100),
        description: null,
        dueDate: dateMatch?.[1] || null,
        priority: priorityMatch?.[1] || null,
        provider: providerMatch?.[1]?.toLowerCase().replace(' ', '_') || null,
        projectName: null,
        assignee: null,
      };
    }
  }

  /**
   * Handle create task
   */
  private async handleCreateTask(userId: string, input: string): Promise<any> {
    try {
      const taskDetails = await this.extractTaskDetails(input);

      if (!taskDetails.title) {
        return {
          success: false,
          message: 'Please provide a title for the task.',
          action: 'provide_title',
        };
      }

      const result = await TaskTools.createTask(
        userId,
        taskDetails.title,
        taskDetails.description,
        taskDetails.dueDate,
        taskDetails.priority,
        taskDetails.provider || 'google_tasks',
        taskDetails.projectName,
        taskDetails.assignee,
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: `Task "${taskDetails.title}" created successfully!`,
        task: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      logger.error({ error, userId }, 'Create task failed');
      
      return {
        success: false,
        message: `Failed to create task: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle list tasks
   */
  private async handleListTasks(userId: string, input: string): Promise<any> {
    try {
      let status: string | undefined;
      if (input.includes('completed') || input.includes('done') || input.includes('finished')) {
        status = 'completed';
      } else if (input.includes('pending') || input.includes('open') || input.includes('active')) {
        status = 'pending';
      }

      const providerMatch = input.match(/in\s+(google tasks|asana|monday)/i);
      const provider = providerMatch?.[1]?.toLowerCase().replace(' ', '_');

      const limit = parseInt(input.match(/(\d+)\s+tasks?/i)?.[1] || '20');

      const result = await TaskTools.listTasks(userId, status, provider, limit);

      if (!result.success) {
        return result;
      }

      const tasks = result.tasks || [];

      return {
        success: true,
        message: `Found ${tasks.length} task(s)`,
        tasks,
        total: tasks.length,
        providers: result.providers,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list tasks';
      logger.error({ error, userId }, 'List tasks failed');
      
      return {
        success: false,
        message: `Failed to list tasks: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle complete task
   */
  private async handleCompleteTask(userId: string, input: string): Promise<any> {
    try {
      const taskIdMatch = input.match(/(?:complete|finish|done)\s+(?:task|id)?[:\s]+([a-zA-Z0-9_-]+)/i);
      
      if (!taskIdMatch) {
        // Show pending tasks
        const tasks = await TaskTools.listTasks(userId, 'pending', undefined, 5);
        
        if (!tasks.success || !tasks.tasks || tasks.tasks.length === 0) {
          return {
            success: false,
            message: 'Please specify which task to complete. No pending tasks found.',
            action: 'specify_task',
          };
        }

        return {
          success: false,
          message: 'Please specify which task to complete. Your pending tasks:',
          action: 'specify_task',
          tasks: tasks.tasks.slice(0, 5).map(t => ({
            id: t.id,
            title: t.title,
            provider: t.provider,
          })),
        };
      }

      const result = await TaskTools.completeTask(userId, taskIdMatch[1]);

      return {
        ...result,
        success: result.success,
        message: result.success ? 'Task completed successfully!' : 'Failed to complete task',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete task';
      logger.error({ error, userId }, 'Complete task failed');
      
      return {
        success: false,
        message: `Failed to complete task: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle delete task
   */
  private async handleDeleteTask(userId: string, input: string): Promise<any> {
    try {
      const taskIdMatch = input.match(/(?:delete|remove|trash)\s+(?:task|id)?[:\s]+([a-zA-Z0-9_-]+)/i);

      if (!taskIdMatch) {
        return {
          success: false,
          message: 'Please specify which task to delete.',
          action: 'specify_task',
        };
      }

      const result = await TaskTools.deleteTask(userId, taskIdMatch[1]);

      return {
        ...result,
        success: result.success,
        message: result.success ? 'Task deleted successfully!' : 'Failed to delete task',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      logger.error({ error, userId }, 'Delete task failed');
      
      return {
        success: false,
        message: `Failed to delete task: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle update task
   */
  private async handleUpdateTask(userId: string, input: string): Promise<any> {
    try {
      const taskIdMatch = input.match(/(?:update|change|modify|edit)\s+(?:task|id)?[:\s]+([a-zA-Z0-9_-]+)/i);
      
      if (!taskIdMatch) {
        return {
          success: false,
          message: 'Please specify which task to update.',
          action: 'specify_task',
        };
      }

      const updates = await this.extractTaskDetails(input);

      const result = await TaskTools.updateTask(
        userId,
        taskIdMatch[1],
        updates.title,
        updates.description,
        updates.dueDate,
        updates.priority,
        undefined,
        updates.provider,
        updates.assignee,
      );

      return {
        success: result.success,
        message: result.success ? 'Task updated successfully!' : 'Failed to update task',
        ...result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
      logger.error({ error, userId }, 'Update task failed');
      
      return {
        success: false,
        message: `Failed to update task: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle task summary
   */
  private async handleTaskSummary(userId: string, input: string): Promise<any> {
    try {
      const result = await TaskTools.getTaskSummary(userId);

      if (!result.success || !result.summary) {
        return {
          success: false,
          message: 'Failed to get task summary',
          error: result.error,
        };
      }

      const summary = result.summary;

      let message = `Task Summary: `;
      message += `${summary.total} total tasks, `;
      message += `${summary.completed} completed (${summary.completionRate}%), `;
      message += `${summary.pending} pending. `;
      if (summary.overdue > 0) message += `${summary.overdue} overdue! `;
      if (summary.dueToday > 0) message += `${summary.dueToday} due today. `;

      return {
        success: true,
        message,
        summary,
        byProvider: result.byProvider,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get task summary';
      logger.error({ error, userId }, 'Task summary failed');
      
      return {
        success: false,
        message: `Failed to get task summary: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle list projects
   */
  private async handleListProjects(userId: string, input: string): Promise<any> {
    try {
      const providerMatch = input.match(/in\s+(asana|monday|google tasks)/i);
      const provider = providerMatch?.[1]?.toLowerCase().replace(' ', '_');

      const result = await TaskTools.getProjects(userId, provider);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: `Found ${result.total} project(s)/board(s)`,
        projects: result.projects,
        total: result.total,
        errors: result.errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list projects';
      logger.error({ error, userId }, 'List projects failed');
      
      return {
        success: false,
        message: `Failed to list projects: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle batch create tasks
   */
  private async handleBatchCreate(userId: string, input: string): Promise<any> {
    try {
      const tasksMatch = input.match(/tasks?:?\s*\[([^\]]+)\]/i);
      
      let tasks: Array<{ title: string }> = [];
      
      if (tasksMatch) {
        tasks = tasksMatch[1].split(',').map(t => ({ title: t.trim().replace(/["']/g, '') }));
      } else {
        // Try to extract with AI
        const extractionPrompt = `
Extract tasks from this request as a JSON array of task objects with "title" field:
"${input}"

Return ONLY valid JSON array.`;

        const result = await OpenAIService.complete({
          prompt: extractionPrompt,
          temperature: 0.3,
          maxTokens: 500,
        });

        try {
          tasks = JSON.parse(result.content);
        } catch {
          // Fallback: split by newlines or numbered items
          const lines = input.split(/[\n\r]+/).filter(l => l.trim().match(/^\d+[\.\)]|^[-•*]/));
          if (lines.length > 0) {
            tasks = lines.map(l => ({ title: l.replace(/^\d+[\.\)]\s*|^[-•*]\s*/, '').trim() }));
          }
        }
      }

      if (tasks.length === 0) {
        return {
          success: false,
          message: 'Please specify the tasks to create. Example: "Create tasks: Buy groceries, Call dentist, Submit report"',
          action: 'provide_tasks',
        };
      }

      const result = await TaskTools.batchCreateTasks(userId, tasks);

      return {
        success: result.successful > 0,
        message: `Created ${result.successful} of ${result.total} tasks`,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch create failed';
      logger.error({ error, userId }, 'Batch create failed');
      
      return {
        success: false,
        message: `Batch create failed: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Get connected providers for user
   */
  private async getConnectedProviders(userId: string): Promise<string[]> {
    const providers: string[] = [];
    
    const gtClient = await this.getGoogleTasksClient(userId);
    if (gtClient) providers.push('google_tasks');
    
    const asanaClient = await this.getAsanaClient(userId);
    if (asanaClient) providers.push('asana');
    
    const mondayClient = await this.getMondayClient(userId);
    if (mondayClient) providers.push('monday');
    
    return providers;
  }

  /**
   * Execute with streaming support
   */
  async executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      onChunk({
        type: 'thought',
        content: 'Managing your tasks...',
        timestamp: new Date(),
      });

      const result = await this.doExecute(request, context);

      onChunk({
        type: 'output',
        content: result.message || JSON.stringify(result),
        timestamp: new Date(),
      });

      return {
        id: `task_${Date.now()}`,
        success: result.success !== false,
        output: result,
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      onChunk({
        type: 'error',
        content: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date(),
      });

      return {
        id: `task_${Date.now()}`,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    }
  }
}