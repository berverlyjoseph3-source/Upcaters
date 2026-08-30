// enterprise-ai-agent-platform/apps/api/src/agents/task/googletasks.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface TaskList {
  id: string;
  title: string;
  updated: string;
  selfLink: string;
  etag ? : string;
}

export interface Task {
  id: string;
  title: string;
  notes ? : string;
  status: 'needsAction' | 'completed';
  due ? : string;
  completed ? : string;
  deleted ? : boolean;
  hidden ? : boolean;
  updated: string;
  selfLink: string;
  parent ? : string;
  position: string;
  etag ? : string;
  links ? : Array < { type: string;link: string;description: string } > ;
  webViewLink ? : string;
  assignees ? : Array < { email: string;displayName ? : string } > ;
}

export interface TaskListsResponse {
  items: TaskList[];
  nextPageToken ? : string;
}

export interface TasksResponse {
  items: Task[];
  nextPageToken ? : string;
}

export class GoogleTasksClient {
  private client: AxiosInstance | null = null;
  private accessToken: string = '';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.initializeClient();
  }
  
  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.google.tasks.apiUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.timeouts.default,
    });
    
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Google Tasks API request');
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Google Tasks API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Google Tasks token expired or invalid');
        } else if (error.response?.status === 403) {
          logger.error('Google Tasks access denied');
        }
        throw error;
      }
    );
  }
  
  async updateAccessToken(newToken: string): Promise < void > {
    this.accessToken = newToken;
    this.initializeClient();
  }
  
  /**
   * Retry wrapper for API calls
   */
  private async retryRequest < T > (fn: () => Promise < T > , context: string): Promise < T > {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Google Tasks API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }
  
  async listTaskLists(params ? : { maxResults ? : number;pageToken ? : string }): Promise < TaskListsResponse > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/users/@me/lists', { params });
      return response.data;
    }, 'listTaskLists');
  }
  
  async getTaskList(taskListId: string): Promise < TaskList > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/users/@me/lists/${taskListId}`);
      return response.data;
    }, `getTaskList(${taskListId})`);
  }
  
  async createTaskList(title: string): Promise < TaskList > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post('/users/@me/lists', { title });
      return response.data;
    }, `createTaskList(${title})`);
  }
  
  async updateTaskList(taskListId: string, title: string): Promise < TaskList > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.put(`/users/@me/lists/${taskListId}`, { title });
      return response.data;
    }, `updateTaskList(${taskListId})`);
  }
  
  async deleteTaskList(taskListId: string): Promise < void > {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/users/@me/lists/${taskListId}`);
    }, `deleteTaskList(${taskListId})`);
  }
  
  async listTasks(taskListId: string, params ? : {
    maxResults ? : number;
    pageToken ? : string;
    showCompleted ? : boolean;
    showDeleted ? : boolean;
    showHidden ? : boolean;
    dueMin ? : string;
    dueMax ? : string;
    updatedMin ? : string;
    completedMin ? : string;
    completedMax ? : string;
  }): Promise < TasksResponse > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/lists/${taskListId}/tasks`, { params });
      return response.data;
    }, `listTasks(${taskListId})`);
  }
  
  async getTask(taskListId: string, taskId: string): Promise < Task > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/lists/${taskListId}/tasks/${taskId}`);
      return response.data;
    }, `getTask(${taskListId}, ${taskId})`);
  }
  
  async createTask(taskListId: string, task: {
    title: string;
    notes ? : string;
    due ? : string;
    parent ? : string;
    previous ? : string;
    status ? : 'needsAction' | 'completed';
    assignees ? : Array < { email: string } > ;
  }): Promise < Task > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(`/lists/${taskListId}/tasks`, task);
      return response.data;
    }, `createTask(${taskListId})`);
  }
  
  async updateTask(taskListId: string, taskId: string, task: Partial < Task > ): Promise < Task > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.put(`/lists/${taskListId}/tasks/${taskId}`, task);
      return response.data;
    }, `updateTask(${taskListId}, ${taskId})`);
  }
  
  async patchTask(taskListId: string, taskId: string, updates: Partial < Task > ): Promise < Task > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.patch(`/lists/${taskListId}/tasks/${taskId}`, updates);
      return response.data;
    }, `patchTask(${taskListId}, ${taskId})`);
  }
  
  async deleteTask(taskListId: string, taskId: string): Promise < void > {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/lists/${taskListId}/tasks/${taskId}`);
    }, `deleteTask(${taskListId}, ${taskId})`);
  }
  
  async completeTask(taskListId: string, taskId: string): Promise < Task > {
    return this.patchTask(taskListId, taskId, { status: 'completed' });
  }
  
  async uncompleteTask(taskListId: string, taskId: string): Promise < Task > {
    return this.patchTask(taskListId, taskId, { status: 'needsAction' });
  }
  
  async clearTasks(taskListId: string): Promise < void > {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/lists/${taskListId}/clear`);
    }, `clearTasks(${taskListId})`);
  }
  
  async moveTask(taskListId: string, taskId: string, parent ? : string, previous ? : string): Promise < Task > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const params: any = {};
      if (parent) params.parent = parent;
      if (previous) params.previous = previous;
      const response = await this.client.post(`/lists/${taskListId}/tasks/${taskId}/move`, null, { params });
      return response.data;
    }, `moveTask(${taskListId}, ${taskId})`);
  }
  
  async batchCreateTasks(taskListId: string, tasks: Array < { title: string;notes ? : string;due ? : string } > ): Promise < Task[] > {
    const results: Task[] = [];
    for (const task of tasks) {
      const created = await this.createTask(taskListId, task);
      results.push(created);
    }
    return results;
  }
  
  async batchDeleteTasks(taskListId: string, taskIds: string[]): Promise < void > {
    await Promise.all(taskIds.map(id => this.deleteTask(taskListId, id).catch(e => logger.warn({ error: e, taskId: id }, 'Failed to delete task'))));
  }
  
  async getDefaultTaskList(): Promise < TaskList | null > {
    const lists = await this.listTaskLists({ maxResults: 1 });
    return lists.items[0] || null;
  }
  
  async getAllTasks(taskListId: string, includeCompleted: boolean = true): Promise < Task[] > {
    const allTasks: Task[] = [];
    let pageToken: string | undefined;
    
    do {
      const response = await this.listTasks(taskListId, {
        maxResults: 100,
        pageToken,
        showCompleted: includeCompleted,
      });
      
      allTasks.push(...response.items);
      pageToken = response.nextPageToken;
    } while (pageToken);
    
    return allTasks;
  }
  
  async searchTasks(taskListId: string, query: string): Promise < Task[] > {
    const allTasks = await this.getAllTasks(taskListId);
    const lowerQuery = query.toLowerCase();
    return allTasks.filter(task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      task.notes?.toLowerCase().includes(lowerQuery)
    );
  }
}