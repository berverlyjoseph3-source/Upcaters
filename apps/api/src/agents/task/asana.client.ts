// enterprise-ai-agent-platform/apps/api/src/agents/task/asana.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface AsanaWorkspace {
  gid: string;
  name: string;
  resource_type: string;
  is_organization?: boolean;
  email_domains?: string[];
}

export interface AsanaProject {
  gid: string;
  name: string;
  resource_type: string;
  workspace: { gid: string; name: string };
  archived: boolean;
  color?: string;
  due_date?: string;
  due_on?: string;
  start_on?: string;
  created_at?: string;
  modified_at?: string;
  owner?: { gid: string; name: string };
  current_status?: any;
  public?: boolean;
  team?: { gid: string; name: string };
  layout?: 'list' | 'board' | 'timeline' | 'calendar';
  notes?: string;
  default_view?: 'list' | 'board' | 'calendar' | 'timeline';
  icon?: string;
  permalink_url?: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  resource_type: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  due_at?: string;
  start_on?: string;
  start_at?: string;
  assignee?: { gid: string; name: string; email?: string; photo?: any };
  assignee_status?: string;
  projects: Array<{ gid: string; name: string }>;
  tags: Array<{ gid: string; name: string; color?: string }>;
  parent?: { gid: string; name: string };
  workspace: { gid: string; name: string };
  created_at: string;
  modified_at: string;
  hearted?: boolean;
  hearts?: Array<{ gid: string; user: { gid: string; name: string } }>;
  num_hearts?: number;
  memberships?: Array<{ project: { gid: string; name: string }; section: { gid: string; name: string } }>;
  followers?: Array<{ gid: string; name: string }>;
  custom_fields?: Array<{ 
    gid: string; 
    name: string; 
    type: string;
    enum_value?: { gid: string; name: string; color: string };
    number_value?: number;
    text_value?: string;
    display_value?: string;
  }>;
  permalink_url: string;
  html_notes?: string;
  is_rendered_as_separator?: boolean;
  liked?: boolean;
  likes?: Array<{ gid: string; user: { gid: string; name: string } }>;
  num_likes?: number;
  resource_subtype?: string;
}

export interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
  photo?: { image_21x21?: string; image_27x27?: string; image_36x36?: string; image_60x60?: string; image_128x128?: string };
  resource_type: string;
  workspaces?: Array<{ gid: string; name: string }>;
}

export interface AsanaSection {
  gid: string;
  name: string;
  resource_type: string;
  project: { gid: string; name: string };
  created_at?: string;
}

export interface AsanaStory {
  gid: string;
  resource_type: string;
  created_at: string;
  created_by: { gid: string; name: string; resource_type: string };
  type: string;
  text: string;
  html_text?: string;
  is_pinned?: boolean;
  sticker_name?: string;
  source?: string;
  target?: { gid: string; resource_type: string };
  hearts?: Array<{ gid: string; user: { gid: string; name: string } }>;
}

export class AsanaClient {
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
      baseURL: apiConfig.asana.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.timeouts.default,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Asana API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Asana API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Asana token expired or invalid');
        } else if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          logger.warn({ retryAfter }, 'Asana rate limit exceeded');
        }
        throw error;
      }
    );
  }

  async updateAccessToken(newToken: string): Promise<void> {
    this.accessToken = newToken;
    this.initializeClient();
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const axiosError = error as AxiosError;
          let delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          
          if (axiosError.response?.status === 429) {
            const retryAfter = axiosError.response.headers['retry-after'];
            delay = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;
          }
          
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Asana API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/workspaces', {
        params: { limit: 100 },
      });
      return response.data.data || [];
    }, 'getWorkspaces');
  }

  async getProjects(workspaceGid?: string, options?: { archived?: boolean; limit?: number }): Promise<AsanaProject[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const params: any = { limit: options?.limit || 50 };
      if (workspaceGid) params.workspace = workspaceGid;
      if (options?.archived !== undefined) params.archived = options.archived;
      
      const response = await this.client.get('/projects', { params });
      return response.data.data || [];
    }, `getProjects(${workspaceGid || 'all'})`);
  }

  async getProject(projectGid: string): Promise<AsanaProject> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/projects/${projectGid}`);
      return response.data.data;
    }, `getProject(${projectGid})`);
  }

  async createProject(data: { name: string; workspace: string; team?: string; notes?: string; color?: string; due_on?: string }): Promise<AsanaProject> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post('/projects', { data });
      return response.data.data;
    }, `createProject(${data.name})`);
  }

  async createTask(task: {
    name: string;
    notes?: string;
    projects?: string[];
    assignee?: string;
    due_on?: string;
    due_at?: string;
    completed?: boolean;
    workspace: string;
    parent?: string;
    start_on?: string;
    tags?: string[];
    followers?: string[];
    html_notes?: string;
    custom_fields?: Record<string, any>;
  }): Promise<AsanaTask> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post('/tasks', { data: task });
      return response.data.data;
    }, `createTask(${task.name})`);
  }

  async getTask(taskGid: string): Promise<AsanaTask> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/tasks/${taskGid}`);
      return response.data.data;
    }, `getTask(${taskGid})`);
  }

  async updateTask(taskGid: string, updates: Partial<AsanaTask>): Promise<AsanaTask> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.put(`/tasks/${taskGid}`, { data: updates });
      return response.data.data;
    }, `updateTask(${taskGid})`);
  }

  async deleteTask(taskGid: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/tasks/${taskGid}`);
    }, `deleteTask(${taskGid})`);
  }

  async completeTask(taskGid: string): Promise<AsanaTask> {
    return this.updateTask(taskGid, { completed: true });
  }

  async uncompleteTask(taskGid: string): Promise<AsanaTask> {
    return this.updateTask(taskGid, { completed: false });
  }

  async getTasks(projectGid: string, options?: { 
    completed_since?: string; 
    assignee?: string;
    limit?: number;
    due_on?: string;
    due_on_before?: string;
    due_on_after?: string;
    start_on?: string;
    modified_since?: string;
    section?: string;
    opt_fields?: string[];
  }): Promise<AsanaTask[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const params: any = { project: projectGid, limit: options?.limit || 50 };
      if (options?.completed_since) params.completed_since = options.completed_since;
      if (options?.assignee) params.assignee = options.assignee;
      if (options?.due_on) params.due_on = options.due_on;
      if (options?.due_on_before) params.due_on_before = options.due_on_before;
      if (options?.due_on_after) params.due_on_after = options.due_on_after;
      if (options?.start_on) params.start_on = options.start_on;
      if (options?.modified_since) params.modified_since = options.modified_since;
      if (options?.section) params.section = options.section;
      if (options?.opt_fields) params.opt_fields = options.opt_fields.join(',');
      
      const response = await this.client.get('/tasks', { params });
      return response.data.data || [];
    }, `getTasks(${projectGid})`);
  }

  async getMyTasks(workspaceGid: string, assignee?: string): Promise<AsanaTask[]> {
    const me = await this.getCurrentUser();
    return this.getTasks(workspaceGid, { assignee: assignee || me.gid });
  }

  async getSubtasks(taskGid: string): Promise<AsanaTask[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/tasks/${taskGid}/subtasks`);
      return response.data.data || [];
    }, `getSubtasks(${taskGid})`);
  }

  async addProjectToTask(taskGid: string, projectGid: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/tasks/${taskGid}/addProject`, { data: { project: projectGid } });
    }, `addProjectToTask(${taskGid})`);
  }

  async removeProjectFromTask(taskGid: string, projectGid: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/tasks/${taskGid}/removeProject`, { data: { project: projectGid } });
    }, `removeProjectFromTask(${taskGid})`);
  }

  async addTagToTask(taskGid: string, tagGid: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.post(`/tasks/${taskGid}/addTag`, { data: { tag: tagGid } });
    }, `addTagToTask(${taskGid})`);
  }

  async getCurrentUser(): Promise<AsanaUser> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/users/me');
      return response.data.data;
    }, 'getCurrentUser');
  }

  async getUsers(workspaceGid?: string): Promise<AsanaUser[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const params: any = { limit: 100 };
      if (workspaceGid) params.workspace = workspaceGid;
      const response = await this.client.get('/users', { params });
      return response.data.data || [];
    }, `getUsers(${workspaceGid || 'all'})`);
  }

  async getTags(workspaceGid?: string): Promise<Array<{ gid: string; name: string; color?: string }>> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const params: any = {};
      if (workspaceGid) params.workspace = workspaceGid;
      const response = await this.client.get('/tags', { params });
      return response.data.data || [];
    }, 'getTags');
  }

  async getSections(projectGid: string): Promise<AsanaSection[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/projects/${projectGid}/sections`);
      return response.data.data || [];
    }, `getSections(${projectGid})`);
  }

  async getStories(taskGid: string): Promise<AsanaStory[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/tasks/${taskGid}/stories`);
      return response.data.data || [];
    }, `getStories(${taskGid})`);
  }

  async addComment(taskGid: string, text: string, isPinned?: boolean): Promise<AsanaStory> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(`/tasks/${taskGid}/stories`, {
        data: { text, is_pinned: isPinned },
      });
      return response.data.data;
    }, `addComment(${taskGid})`);
  }

  async searchTasks(workspaceGid: string, query: string, options?: { limit?: number }): Promise<AsanaTask[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/workspaces/${workspaceGid}/tasks/search`, {
        params: {
          text: query,
          limit: options?.limit || 50,
          resource_subtype: 'default_task',
        },
      });
      return response.data.data || [];
    }, `searchTasks(${workspaceGid}, ${query})`);
  }

  async addFollowers(taskGid: string, followers: string[]): Promise<AsanaTask> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(`/tasks/${taskGid}/addFollowers`, {
        data: { followers },
      });
      return response.data.data;
    }, `addFollowers(${taskGid})`);
  }

  async setParent(taskGid: string, parentGid: string): Promise<AsanaTask> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(`/tasks/${taskGid}/setParent`, {
        data: { parent: parentGid },
      });
      return response.data.data;
    }, `setParent(${taskGid})`);
  }
}