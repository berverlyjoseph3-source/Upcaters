// apps/frontend/src/services/task.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type TaskProvider = 'google_tasks' | 'asana' | 'monday';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskViewType = 'list' | 'board' | 'calendar' | 'timeline';

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  provider: TaskProvider;
  projectId?: string;
  projectName?: string;
  boardId?: string;
  boardName?: string;
  groupId?: string;
  groupName?: string;
  sectionId?: string;
  sectionName?: string;
  assignee?: TaskUser;
  creator?: TaskUser;
  labels: string[];
  tags?: string[];
  parentTaskId?: string;
  subtasks?: Task[];
  subtaskCount?: number;
  completedSubtaskCount?: number;
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  customFields?: Record<string, any>;
  position?: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  startDate?: Date;
  dependencyIds?: string[];
  dependentIds?: string[];
  webUrl?: string;
  color?: string;
  isIncomplete?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskUser {
  id?: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  previewUrl?: string;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
  isExternal?: boolean;
  source?: string;
  createdAt?: Date;
  createdBy?: TaskUser;
}

export interface TaskComment {
  id: string;
  text: string;
  author: TaskUser;
  createdAt: Date;
  isSystem?: boolean;
  attachment?: TaskAttachment;
}

export interface TaskProject {
  id: string;
  name: string;
  description?: string;
  provider: TaskProvider;
  workspaceId?: string;
  workspaceName?: string;
  color?: string;
  icon?: string;
  taskCount: number;
  completedTaskCount: number;
  archived?: boolean;
  defaultView?: TaskViewType;
  isPrivate?: boolean;
  members?: TaskUser[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskBoard {
  id: string;
  name: string;
  description?: string;
  provider: TaskProvider;
  projectId?: string;
  columns: TaskColumn[];
  groups: TaskGroup[];
  workspaceId?: string;
  createdAt?: Date;
}

export interface TaskColumn {
  id: string;
  name: string;
  type?: string;
  position: number;
  color?: string;
  limit?: number;
  settings?: Record<string, any>;
}

export interface TaskGroup {
  id: string;
  title: string;
  position: string;
  color?: string;
  archived?: boolean;
  itemsCount?: number;
}

export interface CreateTaskOptions {
  title: string;
  description?: string;
  notes?: string;
  dueDate?: Date;
  startDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
  provider?: TaskProvider;
  projectId?: string;
  projectName?: string;
  boardId?: string;
  groupId?: string;
  sectionId?: string;
  assigneeEmail?: string;
  labels?: string[];
  tags?: string[];
  parentTaskId?: string;
  estimatedMinutes?: number;
  customFields?: Record<string, any>;
  dependencyIds?: string[];
  attachments?: Array<{
    name: string;
    url?: string;
    file?: File;
    mimeType?: string;
  }>;
}

export interface UpdateTaskOptions {
  taskId: string;
  title?: string;
  description?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  startDate?: Date | null;
  provider?: TaskProvider;
  assigneeEmail?: string | null;
  labels?: string[];
  tags?: string[];
  projectId?: string;
  boardId?: string;
  groupId?: string;
  sectionId?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  customFields?: Record<string, any>;
  position?: number;
  dependencyIds?: string[];
  parentTaskId?: string;
  color?: string;
}

export interface TaskFilterOptions {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  provider?: TaskProvider | TaskProvider[];
  projectId?: string;
  boardId?: string;
  groupId?: string;
  sectionId?: string;
  assigneeEmail?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  startDateBefore?: Date;
  startDateAfter?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  search?: string;
  labels?: string[];
  tags?: string[];
  includeSubtasks?: boolean;
  includeCompleted?: boolean;
  includeCancelled?: boolean;
  isIncomplete?: boolean;
  hasAttachments?: boolean;
  hasComments?: boolean;
  parentTaskId?: string;
}

export interface TaskSortOptions {
  field: 'title' | 'priority' | 'status' | 'dueDate' | 'startDate' | 'createdAt' | 'updatedAt' | 'position' | 'assignee';
  direction: 'asc' | 'desc';
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  dueNextWeek: number;
  highPriority: number;
  urgentPriority: number;
  unassigned: number;
  withAttachments: number;
  withComments: number;
  averageCompletionTimeHours?: number;
  onTimeCompletionRate?: number;
}

export interface BatchTaskResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    task?: Task;
    error?: string;
    input: { title: string };
  }>;
}

export interface TaskDependency {
  id: string;
  dependsOnId: string;
  dependentId: string;
  type: 'blocking' | 'related' | 'duplicate';
  createdAt: Date;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'completed' | 'reopened' | 'commented' | 'attached';
  actor: TaskUser;
  details?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    comment?: string;
  };
  timestamp: Date;
}

// ============================================
// Task Service
// ============================================

class TaskService {
  // ============================================
  // Tasks CRUD
  // ============================================

  static async listTasks(
    filters?: TaskFilterOptions,
    sort?: TaskSortOptions,
    limit?: number,
    offset?: number
  ): Promise<{ tasks: Task[]; total: number }> {
    const params: Record<string, any> = {
      limit: limit || 100,
      offset: offset || 0,
      sortField: sort?.field || 'updatedAt',
      sortDirection: sort?.direction || 'desc',
      includeSubtasks: filters?.includeSubtasks ?? true,
      includeCompleted: filters?.includeCompleted ?? true,
    };

    if (filters?.status) {
      params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
    }
    if (filters?.priority) {
      params.priority = Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority;
    }
    if (filters?.provider) {
      params.provider = Array.isArray(filters.provider) ? filters.provider.join(',') : filters.provider;
    }
    if (filters?.projectId) params.projectId = filters.projectId;
    if (filters?.boardId) params.boardId = filters.boardId;
    if (filters?.groupId) params.groupId = filters.groupId;
    if (filters?.assigneeEmail) params.assigneeEmail = filters.assigneeEmail;
    if (filters?.dueDateBefore) params.dueDateBefore = filters.dueDateBefore.toISOString();
    if (filters?.dueDateAfter) params.dueDateAfter = filters.dueDateAfter.toISOString();
    if (filters?.search) params.search = filters.search;
    if (filters?.labels?.length) params.labels = filters.labels.join(',');
    if (filters?.tags?.length) params.tags = filters.tags.join(',');
    if (filters?.parentTaskId) params.parentTaskId = filters.parentTaskId;
    if (filters?.isIncomplete) params.isIncomplete = true;
    if (filters?.hasAttachments) params.hasAttachments = true;

    const response = await apiClient.get<{ tasks: Task[]; total: number }>(
      '/api/agent/task/tasks',
      { params }
    );

    if (response.success && response.data) {
      return {
        tasks: (response.data.tasks || []).map(TaskService.transformTask),
        total: response.data.total || 0,
      };
    }

    throw new Error(response.error || 'Failed to list tasks');
  }

  static async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get<Task>(
      `/api/agent/task/tasks/${taskId}`
    );

    if (response.success && response.data) {
      return TaskService.transformTask(response.data);
    }

    throw new Error(response.error || 'Failed to get task');
  }

  static async createTask(options: CreateTaskOptions): Promise<Task> {
    const response = await apiClient.post<Task>(
      '/api/agent/task/tasks',
      {
        ...options,
        dueDate: options.dueDate?.toISOString(),
        startDate: options.startDate?.toISOString(),
        provider: options.provider || 'google_tasks',
      }
    );

    if (response.success && response.data) {
      return TaskService.transformTask(response.data);
    }

    throw new Error(response.error || 'Failed to create task');
  }

  static async updateTask(options: UpdateTaskOptions): Promise<Task> {
    const payload: Record<string, any> = {
      ...options,
      dueDate: options.dueDate !== undefined ? (options.dueDate?.toISOString() || null) : undefined,
      startDate: options.startDate !== undefined ? (options.startDate?.toISOString() || null) : undefined,
    };

    const response = await apiClient.put<Task>(
      `/api/agent/task/tasks/${options.taskId}`,
      payload
    );

    if (response.success && response.data) {
      return TaskService.transformTask(response.data);
    }

    throw new Error(response.error || 'Failed to update task');
  }

  static async patchTask(
    taskId: string,
    updates: Partial<UpdateTaskOptions>
  ): Promise<Task> {
    return TaskService.updateTask({ taskId, ...updates });
  }

  static async deleteTask(taskId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/task/tasks/${taskId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete task');
    }
  }

  // ============================================
  // Task Status Management
  // ============================================

  static async moveTask(
    taskId: string,
    newStatus: TaskStatus,
    options?: {
      position?: number;
      newGroupId?: string;
      newProjectId?: string;
      newSectionId?: string;
    }
  ): Promise<Task> {
    const response = await apiClient.post<Task>(
      `/api/agent/task/tasks/${taskId}/move`,
      {
        status: newStatus,
        position: options?.position,
        groupId: options?.newGroupId,
        projectId: options?.newProjectId,
        sectionId: options?.newSectionId,
      }
    );

    if (response.success && response.data) {
      return TaskService.transformTask(response.data);
    }

    throw new Error(response.error || 'Failed to move task');
  }

  static async completeTask(taskId: string): Promise<Task> {
    return TaskService.updateTask({
      taskId,
      status: 'completed',
      completedAt: new Date(),
    } as UpdateTaskOptions);
  }

  static async uncompleteTask(taskId: string): Promise<Task> {
    return TaskService.updateTask({
      taskId,
      status: 'pending',
      completedAt: null,
    } as UpdateTaskOptions);
  }

  static async reopenTask(taskId: string): Promise<Task> {
    return TaskService.updateTask({
      taskId,
      status: 'pending',
      completedAt: null,
    } as UpdateTaskOptions);
  }

  // ============================================
  // Batch Operations
  // ============================================

  static async batchCreateTasks(tasks: CreateTaskOptions[]): Promise<BatchTaskResult> {
    const response = await apiClient.post<BatchTaskResult>(
      '/api/agent/task/tasks/batch/create',
      {
        tasks: tasks.map(t => ({
          ...t,
          dueDate: t.dueDate?.toISOString(),
          startDate: t.startDate?.toISOString(),
        })),
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to batch create tasks');
  }

  static async batchUpdateTasks(updates: UpdateTaskOptions[]): Promise<BatchTaskResult> {
    const response = await apiClient.post<BatchTaskResult>(
      '/api/agent/task/tasks/batch/update',
      { updates }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to batch update tasks');
  }

  static async batchDeleteTasks(taskIds: string[]): Promise<{
    success: boolean;
    deleted: number;
    failed: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      deleted: number;
      failed: Array<{ id: string; error: string }>;
    }>('/api/agent/task/tasks/batch/delete', { taskIds });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to batch delete tasks');
  }

  static async batchMoveTasks(
    taskIds: string[],
    newStatus: TaskStatus,
    options?: { newProjectId?: string; newGroupId?: string }
  ): Promise<BatchTaskResult> {
    const response = await apiClient.post<BatchTaskResult>(
      '/api/agent/task/tasks/batch/move',
      { taskIds, status: newStatus, ...options }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to batch move tasks');
  }

  // ============================================
  // Subtasks
  // ============================================

  static async getSubtasks(taskId: string): Promise<Task[]> {
    const response = await apiClient.get<{ tasks: Task[] }>(
      `/api/agent/task/tasks/${taskId}/subtasks`
    );

    if (response.success && response.data) {
      return (response.data.tasks || []).map(TaskService.transformTask);
    }

    throw new Error(response.error || 'Failed to get subtasks');
  }

  static async createSubtask(
    parentTaskId: string,
    title: string,
    options?: Partial<CreateTaskOptions>
  ): Promise<Task> {
    return TaskService.createTask({
      ...options,
      title,
      parentTaskId,
    });
  }

  // ============================================
  // Attachments
  // ============================================

  static async addAttachment(
    taskId: string,
    file: File,
    options?: { name?: string; isExternal?: boolean; url?: string }
  ): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.name) formData.append('name', options.name);
    if (options?.isExternal) formData.append('isExternal', 'true');
    if (options?.url) formData.append('url', options.url);

    const response = await apiClient.post<TaskAttachment>(
      `/api/agent/task/tasks/${taskId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to add attachment');
  }

  static async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    const response = await apiClient.delete(
      `/api/agent/task/tasks/${taskId}/attachments/${attachmentId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete attachment');
    }
  }

  // ============================================
  // Comments
  // ============================================

  static async getComments(taskId: string): Promise<TaskComment[]> {
    const response = await apiClient.get<{ comments: TaskComment[] }>(
      `/api/agent/task/tasks/${taskId}/comments`
    );

    if (response.success && response.data) {
      return (response.data.comments || []).map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
      }));
    }

    throw new Error(response.error || 'Failed to get comments');
  }

  static async addComment(
    taskId: string,
    text: string,
    options?: { attachmentId?: string }
  ): Promise<TaskComment> {
    const response = await apiClient.post<TaskComment>(
      `/api/agent/task/tasks/${taskId}/comments`,
      { text, ...options }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
      };
    }

    throw new Error(response.error || 'Failed to add comment');
  }

  // ============================================
  // Dependencies
  // ============================================

  static async addDependency(
    taskId: string,
    dependsOnId: string,
    type: 'blocking' | 'related' | 'duplicate' = 'blocking'
  ): Promise<TaskDependency> {
    const response = await apiClient.post<TaskDependency>(
      `/api/agent/task/tasks/${taskId}/dependencies`,
      { dependsOnId, type }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        createdAt: new Date(response.data.createdAt),
      };
    }

    throw new Error(response.error || 'Failed to add dependency');
  }

  static async removeDependency(taskId: string, dependencyId: string): Promise<void> {
    const response = await apiClient.delete(
      `/api/agent/task/tasks/${taskId}/dependencies/${dependencyId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to remove dependency');
    }
  }

  static async getDependencies(taskId: string): Promise<TaskDependency[]> {
    const response = await apiClient.get<{ dependencies: TaskDependency[] }>(
      `/api/agent/task/tasks/${taskId}/dependencies`
    );

    if (response.success && response.data) {
      return (response.data.dependencies || []).map(d => ({
        ...d,
        createdAt: new Date(d.createdAt),
      }));
    }

    throw new Error(response.error || 'Failed to get dependencies');
  }

  // ============================================
  // Activity
  // ============================================

  static async getTaskActivity(
    taskId: string,
    limit: number = 50
  ): Promise<TaskActivity[]> {
    const response = await apiClient.get<{ activities: TaskActivity[] }>(
      `/api/agent/task/tasks/${taskId}/activity`,
      { params: { limit } }
    );

    if (response.success && response.data) {
      return (response.data.activities || []).map(a => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
    }

    throw new Error(response.error || 'Failed to get activity');
  }

  // ============================================
  // Stats
  // ============================================

  static async getTaskStats(filters?: TaskFilterOptions): Promise<TaskStats> {
    const params: Record<string, any> = {};
    if (filters?.projectId) params.projectId = filters.projectId;
    if (filters?.provider) params.provider = Array.isArray(filters.provider) ? filters.provider.join(',') : filters.provider;

    const response = await apiClient.get<TaskStats>(
      '/api/agent/task/stats',
      { params }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get task stats');
  }

  // ============================================
  // Projects
  // ============================================

  static async getProjects(provider?: TaskProvider): Promise<TaskProject[]> {
    const response = await apiClient.get<{ projects: TaskProject[] }>(
      '/api/agent/task/projects',
      { params: { provider } }
    );

    if (response.success && response.data) {
      return response.data.projects || [];
    }

    throw new Error(response.error || 'Failed to get projects');
  }

  static async getProject(projectId: string): Promise<TaskProject> {
    const response = await apiClient.get<TaskProject>(
      `/api/agent/task/projects/${projectId}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get project');
  }

  static async createProject(
    name: string,
    options?: {
      description?: string;
      provider?: TaskProvider;
      color?: string;
      icon?: string;
      defaultView?: TaskViewType;
      workspaceId?: string;
    }
  ): Promise<TaskProject> {
    const response = await apiClient.post<TaskProject>(
      '/api/agent/task/projects',
      { name, ...options }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create project');
  }

  static async updateProject(
    projectId: string,
    updates: Partial<Pick<TaskProject, 'name' | 'description' | 'color' | 'icon' | 'defaultView' | 'archived'>>
  ): Promise<TaskProject> {
    const response = await apiClient.patch<TaskProject>(
      `/api/agent/task/projects/${projectId}`,
      updates
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to update project');
  }

  static async deleteProject(projectId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/task/projects/${projectId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete project');
    }
  }

  // ============================================
  // Boards & Columns
  // ============================================

  static async getBoards(provider?: TaskProvider): Promise<TaskBoard[]> {
    const response = await apiClient.get<{ boards: TaskBoard[] }>(
      '/api/agent/task/boards',
      { params: { provider } }
    );

    if (response.success && response.data) {
      return response.data.boards || [];
    }

    throw new Error(response.error || 'Failed to get boards');
  }

  static async getBoard(boardId: string): Promise<TaskBoard> {
    const response = await apiClient.get<TaskBoard>(
      `/api/agent/task/boards/${boardId}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get board');
  }

  // ============================================
  // Providers
  // ============================================

  static async getConnectedProviders(): Promise<TaskProvider[]> {
    const response = await apiClient.get<{ providers: TaskProvider[] }>(
      '/api/agent/task/providers'
    );

    if (response.success && response.data) {
      return response.data.providers || [];
    }

    throw new Error(response.error || 'Failed to get providers');
  }

  static async isProviderConnected(provider: TaskProvider): Promise<boolean> {
    try {
      const response = await apiClient.get<{ connected: boolean }>(
        `/api/agent/task/providers/${provider}/status`
      );
      return response.data?.connected || false;
    } catch {
      return false;
    }
  }

  static async connectProvider(
    provider: TaskProvider,
    code: string,
    redirectUri?: string
  ): Promise<void> {
    const response = await apiClient.post(
      `/api/agent/task/providers/${provider}/connect`,
      { code, redirectUri }
    );

    if (!response.success) {
      throw new Error(response.error || `Failed to connect ${provider}`);
    }
  }

  static async disconnectProvider(provider: TaskProvider): Promise<void> {
    const response = await apiClient.delete(
      `/api/agent/task/providers/${provider}/disconnect`
    );

    if (!response.success) {
      throw new Error(response.error || `Failed to disconnect ${provider}`);
    }
  }

  // ============================================
  // Sync
  // ============================================

  static async syncTasks(provider?: TaskProvider): Promise<{
    synced: number;
    created: number;
    updated: number;
    deleted: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const response = await apiClient.post<{
      synced: number;
      created: number;
      updated: number;
      deleted: number;
      errors: Array<{ id: string; error: string }>;
    }>('/api/agent/task/sync', { provider });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to sync tasks');
  }

  // ============================================
  // Transform Helpers
  // ============================================

  private static transformTask(task: any): Task {
    return {
      id: task.id,
      title: task.title || task.name || 'Untitled',
      description: task.description || task.notes,
      notes: task.notes,
      status: TaskService.mapStatus(task.status || task.state),
      priority: TaskService.mapPriority(task.priority || task.importance),
      dueDate: task.dueDate || task.due_on ? new Date(task.dueDate || task.due_on) : undefined,
      completedAt: task.completedAt || task.completed_at ? new Date(task.completedAt || task.completed_at) : undefined,
      provider: task.provider || 'google_tasks',
      projectId: task.projectId || task.project?.id,
      projectName: task.projectName || task.project?.name,
      boardId: task.boardId || task.board?.id,
      boardName: task.boardName || task.board?.name,
      groupId: task.groupId || task.group?.id,
      groupName: task.groupName || task.group?.title,
      sectionId: task.sectionId,
      sectionName: task.sectionName,
      assignee: task.assignee ? {
        id: task.assignee.id,
        email: task.assignee.email || task.assignee,
        name: task.assignee.name || task.assignee.displayName,
        avatar: task.assignee.avatar || task.assignee.photoThumb || task.assignee.photo,
      } : undefined,
      creator: task.creator ? {
        id: task.creator.id,
        email: task.creator.email,
        name: task.creator.name || task.creator.displayName,
        avatar: task.creator.avatar,
      } : undefined,
      labels: task.labels || [],
      tags: task.tags || [],
      parentTaskId: task.parentTaskId || task.parent?.id || task.parent,
      subtasks: task.subtasks?.map(TaskService.transformTask),
      subtaskCount: task.subtaskCount || task.subtasks?.length || 0,
      completedSubtaskCount: task.completedSubtaskCount,
      attachments: task.attachments?.map((a: any) => ({
        id: a.id,
        name: a.name || a.filename || a.title,
        url: a.url || a.fileUrl || a.viewUrl,
        previewUrl: a.previewUrl || a.thumbnailUrl,
        mimeType: a.mimeType || a.mime_type,
        size: a.size,
        thumbnailUrl: a.thumbnailUrl,
        isExternal: a.isExternal,
        source: a.source,
        createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
        createdBy: a.createdBy,
      })),
      comments: task.comments?.map((c: any) => ({
        id: c.id,
        text: c.text || c.body || c.content,
        author: c.author || c.created_by,
        createdAt: new Date(c.createdAt || c.created_at || Date.now()),
        isSystem: c.isSystem,
        attachment: c.attachment,
      })),
      customFields: task.customFields || task.custom_fields,
      position: task.position || task.order,
      estimatedMinutes: task.estimatedMinutes || task.estimated_minutes,
      actualMinutes: task.actualMinutes || task.actual_minutes,
      startDate: task.startDate || task.start_on ? new Date(task.startDate || task.start_on) : undefined,
      dependencyIds: task.dependencyIds || task.dependencies,
      dependentIds: task.dependentIds,
      webUrl: task.webUrl || task.webViewLink || task.permalink_url || task.url,
      color: task.color || task.column_values?.find((c: any) => c.type === 'color')?.value,
      isIncomplete: task.isIncomplete,
      metadata: task.metadata,
      createdAt: new Date(task.createdAt || task.created_at || Date.now()),
      updatedAt: new Date(task.updatedAt || task.updated_at || Date.now()),
    };
  }

  private static mapStatus(status: string): TaskStatus {
    const lower = (status || '').toLowerCase();
    if (['needsaction', 'active', 'todo', 'open', 'backlog', 'new'].includes(lower)) return 'pending';
    if (['in_progress', 'inprogress', 'doing', 'working', 'started'].includes(lower)) return 'in_progress';
    if (['completed', 'done', 'resolved', 'finished', 'closed', 'complete'].includes(lower)) return 'completed';
    if (['cancelled', 'canceled', 'archived', 'deleted', 'removed'].includes(lower)) return 'cancelled';
    return 'pending';
  }

  private static mapPriority(priority: string): TaskPriority {
    const lower = (priority || '').toLowerCase();
    if (['urgent', 'critical', 'p0', 'severe'].includes(lower)) return 'urgent';
    if (['high', 'important', 'p1', 'major'].includes(lower)) return 'high';
    if (['medium', 'normal', 'p2', 'moderate'].includes(lower)) return 'medium';
    if (['low', 'minor', 'p3', 'trivial'].includes(lower)) return 'low';
    return 'medium';
  }

  // ============================================
  // Utility
  // ============================================

  static getPriorityColor(priority: TaskPriority): string {
    const colors: Record<TaskPriority, string> = {
      urgent: '#ef4444',
      high: '#f97316',
      medium: '#f59e0b',
      low: '#6b7280',
    };
    return colors[priority];
  }

  static getPriorityLabel(priority: TaskPriority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  static getStatusColor(status: TaskStatus): string {
    const colors: Record<TaskStatus, string> = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981',
      cancelled: '#6b7280',
    };
    return colors[status];
  }

  static getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      pending: 'To Do',
      in_progress: 'In Progress',
      completed: 'Done',
      cancelled: 'Cancelled',
    };
    return labels[status];
  }

  static getProviderColor(provider: TaskProvider): string {
    const colors: Record<TaskProvider, string> = {
      google_tasks: '#4285F4',
      asana: '#FC636B',
      monday: '#0073EA',
    };
    return colors[provider];
  }

  static getProviderLabel(provider: TaskProvider): string {
    const labels: Record<TaskProvider, string> = {
      google_tasks: 'Google Tasks',
      asana: 'Asana',
      monday: 'Monday.com',
    };
    return labels[provider];
  }

  static isTaskOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return task.dueDate < new Date();
  }

  static isTaskDueToday(task: Task): boolean {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    const now = new Date();
    return task.dueDate.toDateString() === now.toDateString();
  }

  static isTaskDueThisWeek(task: Task): boolean {
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    return task.dueDate >= now && task.dueDate <= endOfWeek;
  }

  static formatDueDate(date?: Date): string {
    if (!date) return 'No due date';
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export default TaskService;