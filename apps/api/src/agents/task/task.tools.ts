// enterprise-ai-agent-platform/apps/api/src/agents/task/task.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { GoogleTasksClient } from './googletasks.client';
import { AsanaClient } from './asana.client';
import { MondayClient } from './monday.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/client';

export class TaskTools {
  /**
   * Create task tool
   */
  static createTaskTool(): AgentTool {
    return {
      name: 'create_task',
      description: 'Create a new task in Google Tasks, Asana, or Monday.com',
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Task title' },
        { name: 'description', type: 'string', required: false, description: 'Task description' },
        { name: 'dueDate', type: 'string', required: false, description: 'Due date (ISO format)' },
        { name: 'priority', type: 'string', required: false, description: 'Priority (low, medium, high)' },
        { name: 'provider', type: 'string', required: false, description: 'Task provider (google_tasks, asana, monday)' },
        { name: 'projectId', type: 'string', required: false, description: 'Project/Board ID for the task' },
        { name: 'assignee', type: 'string', required: false, description: 'Assignee email or ID' },
        { name: 'labels', type: 'array', required: false, description: 'Array of labels/tags' },
      ],
      execute: async (params, context) => {
        if (!params.title || params.title.trim().length === 0) {
          throw new Error('Task title is required');
        }
        
        return await this.createTask(
          context.userId,
          params.title,
          params.description,
          params.dueDate,
          params.priority,
          params.provider || 'google_tasks',
          params.projectId,
          params.assignee,
          params.labels,
        );
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * List tasks tool
   */
  static listTasksTool(): AgentTool {
    return {
      name: 'list_tasks',
      description: 'List tasks from connected task providers',
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, completed, all)' },
        { name: 'provider', type: 'string', required: false, description: 'Task provider (google_tasks, asana, monday)' },
        { name: 'limit', type: 'number', required: false, description: 'Maximum number of tasks (default: 20)' },
        { name: 'projectId', type: 'string', required: false, description: 'Filter by project/board ID' },
        { name: 'priority', type: 'string', required: false, description: 'Filter by priority' },
      ],
      execute: async (params, context) => {
        return await this.listTasks(
          context.userId,
          params.status,
          params.provider,
          params.limit || 20,
          params.projectId,
          params.priority,
        );
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Update task tool
   */
  static updateTaskTool(): AgentTool {
    return {
      name: 'update_task',
      description: 'Update an existing task',
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Task ID' },
        { name: 'title', type: 'string', required: false, description: 'New title' },
        { name: 'description', type: 'string', required: false, description: 'New description' },
        { name: 'dueDate', type: 'string', required: false, description: 'New due date' },
        { name: 'priority', type: 'string', required: false, description: 'New priority' },
        { name: 'completed', type: 'boolean', required: false, description: 'Mark as completed' },
        { name: 'provider', type: 'string', required: false, description: 'Task provider' },
        { name: 'assignee', type: 'string', required: false, description: 'New assignee' },
      ],
      execute: async (params, context) => {
        if (!params.taskId) {
          throw new Error('Task ID is required');
        }
        
        return await this.updateTask(
          context.userId,
          params.taskId,
          params.title,
          params.description,
          params.dueDate,
          params.priority,
          params.completed,
          params.provider,
          params.assignee,
        );
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Delete task tool
   */
  static deleteTaskTool(): AgentTool {
    return {
      name: 'delete_task',
      description: 'Delete a task',
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Task ID' },
        { name: 'provider', type: 'string', required: false, description: 'Task provider' },
      ],
      execute: async (params, context) => {
        if (!params.taskId) {
          throw new Error('Task ID is required');
        }
        
        return await this.deleteTask(context.userId, params.taskId, params.provider);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Complete task tool
   */
  static completeTaskTool(): AgentTool {
    return {
      name: 'complete_task',
      description: 'Mark a task as completed',
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Task ID' },
        { name: 'provider', type: 'string', required: false, description: 'Task provider' },
      ],
      execute: async (params, context) => {
        if (!params.taskId) {
          throw new Error('Task ID is required');
        }
        
        return await this.completeTask(context.userId, params.taskId, params.provider);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Get task summary tool
   */
  static getTaskSummaryTool(): AgentTool {
    return {
      name: 'get_task_summary',
      description: 'Get summary statistics for tasks',
      parameters: [],
      execute: async (params, context) => {
        return await this.getTaskSummary(context.userId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get projects tool
   */
  static getProjectsTool(): AgentTool {
    return {
      name: 'get_projects',
      description: 'Get projects/boards from connected task providers',
      parameters: [
        { name: 'provider', type: 'string', required: false, description: 'Task provider' },
      ],
      execute: async (params, context) => {
        return await this.getProjects(context.userId, params.provider);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Batch create tasks tool
   */
  static batchCreateTasksTool(): AgentTool {
    return {
      name: 'batch_create_tasks',
      description: 'Create multiple tasks at once',
      parameters: [
        { name: 'tasks', type: 'array', required: true, description: 'Array of task objects {title, description, dueDate, priority}' },
        { name: 'provider', type: 'string', required: false, description: 'Task provider' },
      ],
      execute: async (params, context) => {
        if (!params.tasks || !Array.isArray(params.tasks)) {
          throw new Error('Tasks array is required');
        }
        
        return await this.batchCreateTasks(context.userId, params.tasks, params.provider || 'google_tasks');
      },
      requiresApiCall: true,
      cost: 0, // Cost calculated per task
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  /**
   * Get Google Tasks client for a user
   */
  private static async getGoogleTasksClient(userId: string): Promise<GoogleTasksClient | null> {
    try {
      const token = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_TASKS);
      if (!token) {
        logger.warn({ userId }, 'Google Tasks not connected');
        return null;
      }
      return new GoogleTasksClient(token);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Google Tasks client');
      return null;
    }
  }

  /**
   * Get Asana client for a user
   */
  private static async getAsanaClient(userId: string): Promise<AsanaClient | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });
      
      const asanaToken = (user?.metadata as any)?.asanaToken;
      if (!asanaToken) {
        logger.debug({ userId }, 'Asana not connected');
        return null;
      }
      
      return new AsanaClient(asanaToken);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Asana client');
      return null;
    }
  }

  /**
   * Get Monday.com client for a user
   */
  private static async getMondayClient(userId: string): Promise<MondayClient | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { metadata: true },
      });
      
      const mondayToken = (user?.metadata as any)?.mondayToken;
      if (!mondayToken) {
        logger.debug({ userId }, 'Monday.com not connected');
        return null;
      }
      
      return new MondayClient(mondayToken);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get Monday.com client');
      return null;
    }
  }

  /**
   * Create a task
   */
  static async createTask(
    userId: string,
    title: string,
    description?: string,
    dueDate?: string,
    priority?: string,
    provider: string = 'google_tasks',
    projectId?: string,
    assignee?: string,
    labels?: string[],
  ): Promise<any> {
    let errors: string[] = [];

    try {
      switch (provider) {
        case 'google_tasks': {
          const client = await this.getGoogleTasksClient(userId);
          if (!client) {
            return { success: false, error: 'Google Tasks not connected', provider: 'google_tasks' };
          }
          
          const taskList = await client.getDefaultTaskList();
          if (!taskList) {
            return { success: false, error: 'No task list found', provider: 'google_tasks' };
          }
          
          const result = await client.createTask(taskList.id, {
            title,
            notes: description,
            due: dueDate,
          });
          
          logger.info({ userId, taskId: result.id, title }, 'Task created in Google Tasks');
          
          return {
            success: true,
            id: result.id,
            title: result.title,
            status: result.status || 'needsAction',
            provider: 'google_tasks',
            createdAt: new Date().toISOString(),
          };
        }
        
        case 'asana': {
          const client = await this.getAsanaClient(userId);
          if (!client) {
            return { success: false, error: 'Asana not connected', provider: 'asana' };
          }
          
          const workspaces = await client.getWorkspaces();
          if (workspaces.length === 0) {
            return { success: false, error: 'No workspace found', provider: 'asana' };
          }
          
          const taskData: any = {
            name: title,
            notes: description,
            due_on: dueDate?.split('T')[0],
            workspace: workspaces[0].gid,
          };
          
          if (projectId) {
            taskData.projects = [projectId];
          }
          
          if (assignee) {
            taskData.assignee = assignee;
          }
          
          const result = await client.createTask(taskData);
          
          logger.info({ userId, taskId: result.gid, title }, 'Task created in Asana');
          
          return {
            success: true,
            id: result.gid,
            title: result.name,
            status: result.completed ? 'completed' : 'pending',
            provider: 'asana',
            createdAt: result.created_at || new Date().toISOString(),
          };
        }
        
        case 'monday': {
          const client = await this.getMondayClient(userId);
          if (!client) {
            return { success: false, error: 'Monday.com not connected', provider: 'monday' };
          }
          
          const boardId = projectId;
          if (!boardId) {
            const boards = await client.getBoards(1);
            if (boards.length === 0) {
              return { success: false, error: 'No board found', provider: 'monday' };
            }
          }
          
          const targetBoardId = boardId || (await client.getBoards(1))[0].id;
          
          const columnValues: Record<string, any> = {};
          if (description) columnValues.text = description;
          if (dueDate) columnValues.date = dueDate;
          if (priority) columnValues.status = priority;
          
          const result = await client.createItem({
            boardId: targetBoardId,
            itemName: title,
            columnValues,
          });
          
          logger.info({ userId, taskId: result.id, title }, 'Task created in Monday.com');
          
          return {
            success: true,
            id: result.id,
            name: result.name,
            status: result.state || 'active',
            provider: 'monday',
            createdAt: result.created_at || new Date().toISOString(),
          };
        }
        
        default:
          return {
            success: false,
            error: `Unknown provider: ${provider}`,
            provider,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId, title, provider }, 'Failed to create task');
      
      return {
        success: false,
        error: errorMessage,
        provider,
        title,
      };
    }
  }

  /**
   * List tasks
   */
  static async listTasks(
    userId: string,
    status?: string,
    provider?: string,
    limit: number = 20,
    projectId?: string,
    priority?: string,
  ): Promise<any> {
    const tasks: any[] = [];
    let errors: Array<{ provider: string; error: string }> = [];
    const connectedProviders: string[] = [];

    try {
      // Google Tasks
      if (!provider || provider === 'google_tasks') {
        const client = await this.getGoogleTasksClient(userId);
        if (client) {
          connectedProviders.push('google_tasks');
          try {
            const taskList = await client.getDefaultTaskList();
            if (taskList) {
              const tasksResponse = await client.listTasks(taskList.id, {
                maxResults: limit,
                showCompleted: status === 'completed' || status === 'all' || !status,
                showHidden: status === 'all',
              });
              
              let items = tasksResponse.items || [];
              
              if (status === 'pending') {
                items = items.filter(t => t.status !== 'completed');
              } else if (status === 'completed') {
                items = items.filter(t => t.status === 'completed');
              }
              
              tasks.push(...items.slice(0, limit).map(t => ({
                id: t.id,
                title: t.title,
                description: t.notes,
                status: t.status === 'completed' ? 'completed' : 'pending',
                dueDate: t.due,
                provider: 'google_tasks',
                updatedAt: t.updated,
              })));
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch Google Tasks';
            errors.push({ provider: 'google_tasks', error: errorMsg });
            logger.error({ error, userId }, 'Failed to fetch Google Tasks');
          }
        }
      }

      // Asana
      if (!provider || provider === 'asana') {
        const client = await this.getAsanaClient(userId);
        if (client) {
          connectedProviders.push('asana');
          try {
            const workspaces = await client.getWorkspaces();
            if (workspaces.length > 0) {
              const projects = projectId
                ? [{ gid: projectId }]
                : await client.getProjects(workspaces[0].gid);
              
              for (const project of projects.slice(0, 3)) {
                const projectTasks = await client.getTasks(project.gid);
                
                let items = projectTasks || [];
                
                if (status === 'pending') {
                  items = items.filter(t => !t.completed);
                } else if (status === 'completed') {
                  items = items.filter(t => t.completed);
                }
                
                tasks.push(...items.slice(0, limit).map(t => ({
                  id: t.gid,
                  title: t.name,
                  description: t.notes,
                  status: t.completed ? 'completed' : 'pending',
                  dueDate: t.due_on,
                  provider: 'asana',
                  projectId: project.gid,
                  projectName: project.name,
                  updatedAt: t.modified_at,
                })));
              }
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch Asana tasks';
            errors.push({ provider: 'asana', error: errorMsg });
            logger.error({ error, userId }, 'Failed to fetch Asana tasks');
          }
        }
      }

      // Monday.com
      if (!provider || provider === 'monday') {
        const client = await this.getMondayClient(userId);
        if (client) {
          connectedProviders.push('monday');
          try {
            const boardId = projectId;
            let boards;
            if (boardId) {
              boards = [await client.getBoard(boardId)];
            } else {
              boards = await client.getBoards(1);
            }
            
            if (boards.length > 0) {
              const items = await client.getItems(boards[0].id, limit);
              
              let filteredItems = items || [];
              
              if (status === 'pending') {
                filteredItems = filteredItems.filter(i => i.state === 'active');
              } else if (status === 'completed') {
                filteredItems = filteredItems.filter(i => i.state !== 'active');
              }
              
              tasks.push(...filteredItems.map(i => ({
                id: i.id,
                title: i.name,
                status: i.state === 'active' ? 'pending' : 'completed',
                provider: 'monday',
                boardId: i.board?.id,
                groupId: i.group?.id,
                groupName: i.group?.title,
                updatedAt: i.updated_at,
              })));
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch Monday.com items';
            errors.push({ provider: 'monday', error: errorMsg });
            logger.error({ error, userId }, 'Failed to fetch Monday.com items');
          }
        }
      }

      return {
        success: true,
        tasks,
        total: tasks.length,
        providers: connectedProviders,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId }, 'Failed to list tasks');
      
      return {
        success: false,
        error: errorMessage,
        tasks: [],
        total: 0,
      };
    }
  }

  /**
   * Update a task
   */
  static async updateTask(
    userId: string,
    taskId: string,
    title?: string,
    description?: string,
    dueDate?: string,
    priority?: string,
    completed?: boolean,
    provider?: string,
    assignee?: string,
  ): Promise<any> {
    try {
      // Try each provider until we find the task
      const providers = provider ? [provider] : ['google_tasks', 'asana', 'monday'];
      let lastError: string | null = null;

      for (const prov of providers) {
        try {
          switch (prov) {
            case 'google_tasks': {
              const client = await this.getGoogleTasksClient(userId);
              if (!client) continue;
              
              const taskList = await client.getDefaultTaskList();
              if (!taskList) continue;
              
              const updates: any = {};
              if (title) updates.title = title;
              if (description) updates.notes = description;
              if (dueDate) updates.due = dueDate;
              if (completed !== undefined) updates.status = completed ? 'completed' : 'needsAction';
              
              const result = await client.updateTask(taskList.id, taskId, updates);
              
              logger.info({ userId, taskId, provider: prov }, 'Task updated');
              
              return {
                success: true,
                id: result.id,
                title: result.title,
                status: result.status,
                provider: prov,
                updatedAt: result.updated || new Date().toISOString(),
              };
            }

            case 'asana': {
              const client = await this.getAsanaClient(userId);
              if (!client) continue;
              
              const updates: any = {};
              if (title) updates.name = title;
              if (description) updates.notes = description;
              if (dueDate) updates.due_on = dueDate?.split('T')[0];
              if (completed !== undefined) updates.completed = completed;
              if (assignee) updates.assignee = assignee;
              
              const result = await client.updateTask(taskId, updates);
              
              logger.info({ userId, taskId, provider: prov }, 'Task updated');
              
              return {
                success: true,
                id: result.gid,
                title: result.name,
                status: result.completed ? 'completed' : 'pending',
                provider: prov,
                updatedAt: result.modified_at || new Date().toISOString(),
              };
            }

            case 'monday': {
              const client = await this.getMondayClient(userId);
              if (!client) continue;
              
              const columnValues: Record<string, any> = {};
              if (title) columnValues.name = title;
              if (description) columnValues.text = description;
              if (dueDate) columnValues.date = dueDate;
              if (priority) columnValues.status = priority;
              if (completed !== undefined) {
                columnValues.status = completed ? 'Done' : 'Working on it';
              }
              
              const result = await client.updateItem({
                itemId: taskId,
                columnValues,
              });
              
              logger.info({ userId, taskId, provider: prov }, 'Task updated');
              
              return {
                success: true,
                id: result.id,
                title: result.name,
                status: result.state || 'active',
                provider: prov,
                updatedAt: result.updated_at || new Date().toISOString(),
              };
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : `Failed to update in ${prov}`;
          logger.warn({ error, userId, taskId, provider: prov }, 'Update attempt failed');
        }
      }

      return {
        success: false,
        error: lastError || 'Task not found in any connected provider',
        taskId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId, taskId }, 'Failed to update task');
      
      return {
        success: false,
        error: errorMessage,
        taskId,
      };
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(userId: string, taskId: string, provider?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const providers = provider ? [provider] : ['google_tasks', 'asana', 'monday'];
      let lastError: string | null = null;

      for (const prov of providers) {
        try {
          switch (prov) {
            case 'google_tasks': {
              const client = await this.getGoogleTasksClient(userId);
              if (!client) continue;
              
              const taskList = await client.getDefaultTaskList();
              if (!taskList) continue;
              
              await client.deleteTask(taskList.id, taskId);
              logger.info({ userId, taskId, provider: prov }, 'Task deleted');
              return { success: true };
            }

            case 'asana': {
              const client = await this.getAsanaClient(userId);
              if (!client) continue;
              
              await client.deleteTask(taskId);
              logger.info({ userId, taskId, provider: prov }, 'Task deleted');
              return { success: true };
            }

            case 'monday': {
              const client = await this.getMondayClient(userId);
              if (!client) continue;
              
              await client.deleteItem(taskId);
              logger.info({ userId, taskId, provider: prov }, 'Task deleted');
              return { success: true };
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : `Failed to delete in ${prov}`;
          logger.warn({ error, userId, taskId, provider: prov }, 'Delete attempt failed');
        }
      }

      return {
        success: false,
        error: lastError || 'Task not found in any connected provider',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId, taskId }, 'Failed to delete task');
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Complete a task
   */
  static async completeTask(userId: string, taskId: string, provider?: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.updateTask(userId, taskId, undefined, undefined, undefined, undefined, true, provider);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId, taskId }, 'Failed to complete task');
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get task summary
   */
  static async getTaskSummary(userId: string): Promise<any> {
    try {
      const tasks = await this.listTasks(userId, undefined, undefined, 100);
      
      if (!tasks.success) {
        return {
          success: false,
          error: tasks.error,
          summary: null,
        };
      }
      
      const allTasks = tasks.tasks || [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let completed = 0;
      let pending = 0;
      let overdue = 0;
      let dueToday = 0;
      let dueThisWeek = 0;

      const byProvider: Record<string, { total: number; completed: number; pending: number }> = {};

      for (const task of allTasks) {
        if (!byProvider[task.provider]) {
          byProvider[task.provider] = { total: 0, completed: 0, pending: 0 };
        }
        byProvider[task.provider].total++;

        if (task.status === 'completed') {
          completed++;
          byProvider[task.provider].completed++;
        } else {
          pending++;
          byProvider[task.provider].pending++;

          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            
            if (dueDate < now) {
              overdue++;
            } else if (dueDate.toDateString() === today.toDateString()) {
              dueToday++;
            } else if (dueDate >= today && dueDate < new Date(today.getTime() + 7 * 86400000)) {
              dueThisWeek++;
            }
          }
        }
      }

      return {
        success: true,
        summary: {
          total: allTasks.length,
          completed,
          pending,
          overdue,
          dueToday,
          dueThisWeek,
          completionRate: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0,
        },
        byProvider,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId }, 'Failed to get task summary');
      
      return {
        success: false,
        error: errorMessage,
        summary: null,
      };
    }
  }

  /**
   * Get projects
   */
  static async getProjects(userId: string, provider?: string): Promise<any> {
    const projects: any[] = [];
    const errors: Array<{ provider: string; error: string }> = [];

    try {
      // Asana projects
      if (!provider || provider === 'asana') {
        const client = await this.getAsanaClient(userId);
        if (client) {
          try {
            const workspaces = await client.getWorkspaces();
            if (workspaces.length > 0) {
              const asanaProjects = await client.getProjects(workspaces[0].gid);
              projects.push(...asanaProjects.map(p => ({
                id: p.gid,
                name: p.name,
                provider: 'asana',
                workspaceId: workspaces[0].gid,
                workspaceName: workspaces[0].name,
                archived: p.archived || false,
                color: p.color,
              })));
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch Asana projects';
            errors.push({ provider: 'asana', error: errorMsg });
            logger.error({ error, userId }, 'Failed to fetch Asana projects');
          }
        }
      }

      // Monday.com boards
      if (!provider || provider === 'monday') {
        const client = await this.getMondayClient(userId);
        if (client) {
          try {
            const boards = await client.getBoards(20);
            projects.push(...boards.map(b => ({
              id: b.id,
              name: b.name,
              provider: 'monday',
              description: b.description,
              state: b.state,
              permissions: b.permissions,
            })));
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch Monday.com boards';
            errors.push({ provider: 'monday', error: errorMsg });
            logger.error({ error, userId }, 'Failed to fetch Monday.com boards');
          }
        }
      }

      // Google Tasks lists
      if (!provider || provider === 'google_tasks') {
        const client = await this.getGoogleTasksClient(userId);
        if (client) {
          try {
            const taskLists = await client.listTaskLists();
            projects.push(...(taskLists.items || []).map(tl => ({
              id: tl.id,
              name: tl.title,
              provider: 'google_tasks',
              updatedAt: tl.updated,
            })));
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to fetch Google Task lists';
            errors.push({ provider: 'google_tasks', error: errorMsg });
            logger.error({ error, userId }, 'Failed to fetch Google Task lists');
          }
        }
      }

      return {
        success: true,
        projects,
        total: projects.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId }, 'Failed to get projects');
      
      return {
        success: false,
        error: errorMessage,
        projects: [],
        total: 0,
      };
    }
  }

  /**
   * Batch create tasks
   */
  static async batchCreateTasks(
    userId: string,
    tasks: Array<{ title: string; description?: string; dueDate?: string; priority?: string; projectId?: string }>,
    provider: string = 'google_tasks',
  ): Promise<any> {
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        if (!task.title || task.title.trim().length === 0) {
          results.push({ success: false, error: 'Title is required', task });
          failed++;
          continue;
        }

        const result = await this.createTask(
          userId,
          task.title,
          task.description,
          task.dueDate,
          task.priority,
          provider,
          task.projectId,
        );

        results.push(result);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ success: false, error: errorMessage, task });
        failed++;
      }
    }

    return {
      success: failed === 0,
      total: tasks.length,
      successful,
      failed,
      results,
      provider,
    };
  }
}