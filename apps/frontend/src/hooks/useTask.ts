// apps/frontend/src/hooks/useTask.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ============================================
// Types
// ============================================

export type TaskProvider = 'google_tasks' | 'asana' | 'monday';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskViewMode = 'board' | 'list' | 'calendar';

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
  groupId?: string;
  groupName?: string;
  assignee?: {
    email: string;
    name?: string;
    avatar?: string;
  };
  labels: string[];
  tags?: string[];
  parentTaskId?: string;
  subtasks?: Task[];
  attachments?: TaskAttachment[];
  customFields?: Record<string, any>;
  position?: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  webUrl?: string;
  dependencyIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  thumbnailUrl?: string;
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
  completedCount: number;
  archived?: boolean;
  defaultView?: 'list' | 'board' | 'calendar' | 'timeline';
  isPrivate?: boolean;
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
}

export interface TaskColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
  limit?: number;
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
  dueDate?: Date;
  priority?: TaskPriority;
  provider?: TaskProvider;
  projectId?: string;
  boardId?: string;
  groupId?: string;
  assigneeEmail?: string;
  labels?: string[];
  tags?: string[];
  parentTaskId?: string;
  estimatedMinutes?: number;
  customFields?: Record<string, any>;
}

export interface UpdateTaskOptions {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date | null;
  provider?: TaskProvider;
  assigneeEmail?: string | null;
  labels?: string[];
  tags?: string[];
  projectId?: string;
  groupId?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  customFields?: Record<string, any>;
}

export interface TaskFilterOptions {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  provider?: TaskProvider | TaskProvider[];
  projectId?: string;
  assigneeEmail?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  search?: string;
  labels?: string[];
  tags?: string[];
  includeSubtasks?: boolean;
  includeCompleted?: boolean;
}

export interface TaskSortOptions {
  field: 'title' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'status';
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
  highPriority: number;
  urgentPriority: number;
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

// ============================================
// Hook
// ============================================

export function useTask() {
  const { user, isAuthenticated } = useAuthStore();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [boards, setBoards] = useState<TaskBoard[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<TaskProvider>('google_tasks');
  const [viewMode, setViewMode] = useState<TaskViewMode>('board');
  const [statusColumns, setStatusColumns] = useState<TaskStatus[]>([
    'pending',
    'in_progress',
    'completed',
    'cancelled',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<TaskProvider[]>([]);

  // ============================================
  // Fetch Tasks
  // ============================================

  const fetchTasks = useCallback(async (
    filters?: TaskFilterOptions,
    sort?: TaskSortOptions
  ) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        provider: filters?.provider || selectedProvider,
        projectId: filters?.projectId || selectedProjectId,
        sortField: sort?.field || 'updatedAt',
        sortDirection: sort?.direction || 'desc',
        includeSubtasks: filters?.includeSubtasks ?? true,
        includeCompleted: filters?.includeCompleted ?? true,
      };

      if (filters?.status) {
        params.status = Array.isArray(filters.status)
          ? filters.status.join(',')
          : filters.status;
      }
      if (filters?.priority) {
        params.priority = Array.isArray(filters.priority)
          ? filters.priority.join(',')
          : filters.priority;
      }
      if (filters?.assigneeEmail) {
        params.assigneeEmail = filters.assigneeEmail;
      }
      if (filters?.dueDateBefore) {
        params.dueDateBefore = filters.dueDateBefore.toISOString();
      }
      if (filters?.dueDateAfter) {
        params.dueDateAfter = filters.dueDateAfter.toISOString();
      }
      if (filters?.search) {
        params.search = filters.search;
      }
      if (filters?.labels && filters.labels.length > 0) {
        params.labels = filters.labels.join(',');
      }
      if (filters?.tags && filters.tags.length > 0) {
        params.tags = filters.tags.join(',');
      }

      const response = await apiClient.get<{ tasks: Task[] }>(
        '/api/agent/task/tasks',
        { params }
      );

      if (response.success && response.data) {
        const parsedTasks = response.data.tasks.map(transformTask);
        setTasks(parsedTasks);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedProvider, selectedProjectId]);

  // ============================================
  // Fetch Task by ID
  // ============================================

  const getTaskById = useCallback(async (taskId: string): Promise<Task | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await apiClient.get<Task>(`/api/agent/task/tasks/${taskId}`);

      if (response.success && response.data) {
        const task = transformTask(response.data);
        setTasks(prev => prev.map(t => t.id === task.id ? task : t));
        return task;
      }

      return null;
    } catch (err) {
      console.error('Failed to fetch task:', err);
      return null;
    }
  }, [isAuthenticated]);

  // ============================================
  // Create Task
  // ============================================

  const createTask = useCallback(async (options: CreateTaskOptions): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<Task>('/api/agent/task/tasks', {
        ...options,
        dueDate: options.dueDate?.toISOString(),
        provider: options.provider || selectedProvider,
        projectId: options.projectId || selectedProjectId,
      });

      if (response.success && response.data) {
        const newTask = transformTask(response.data);
        setTasks(prev => [newTask, ...prev]);
        return { success: true, task: newTask };
      }

      return { success: false, error: response.error || 'Failed to create task' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, selectedProvider, selectedProjectId]);

  // ============================================
  // Batch Create Tasks
  // ============================================

  const batchCreateTasks = useCallback(async (
    tasks: Array<{ title: string; description?: string; dueDate?: Date; priority?: TaskPriority }>,
    provider?: TaskProvider,
    projectId?: string
  ): Promise<BatchTaskResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        total: tasks.length,
        successful: 0,
        failed: tasks.length,
        results: tasks.map(t => ({ success: false, error: 'Not authenticated', input: { title: t.title } })),
      };
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<BatchTaskResult>('/api/agent/task/tasks/batch', {
        tasks: tasks.map(t => ({
          ...t,
          dueDate: t.dueDate?.toISOString(),
        })),
        provider: provider || selectedProvider,
        projectId: projectId || selectedProjectId,
      });

      if (response.success && response.data) {
        // Refresh tasks after batch creation
        await fetchTasks();
        return response.data;
      }

      return {
        success: false,
        total: tasks.length,
        successful: 0,
        failed: tasks.length,
        results: tasks.map(t => ({ success: false, error: response.error || 'Batch creation failed', input: { title: t.title } })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch creation failed';
      setError(message);
      return {
        success: false,
        total: tasks.length,
        successful: 0,
        failed: tasks.length,
        results: tasks.map(t => ({ success: false, error: message, input: { title: t.title } })),
      };
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, selectedProvider, selectedProjectId, fetchTasks]);

  // ============================================
  // Update Task
  // ============================================

  const updateTask = useCallback(async (options: UpdateTaskOptions): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsUpdating(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        ...options,
        dueDate: options.dueDate !== undefined
          ? (options.dueDate?.toISOString() || null)
          : undefined,
      };

      const response = await apiClient.put<Task>(
        `/api/agent/task/tasks/${options.taskId}`,
        payload
      );

      if (response.success && response.data) {
        const updatedTask = transformTask(response.data);
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        return { success: true, task: updatedTask };
      }

      return { success: false, error: response.error || 'Failed to update task' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update task';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsUpdating(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Quick Status Update (for drag & drop)
  // ============================================

  const updateTaskStatus = useCallback(async (
    taskId: string,
    status: TaskStatus
  ): Promise<{ success: boolean; error?: string }> => {
    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status,
              completedAt: status === 'completed' ? new Date() : t.completedAt,
              updatedAt: new Date(),
            }
          : t
      )
    );

    const result = await updateTask({ taskId, status });

    if (!result.success) {
      // Revert on failure
      await fetchTasks();
    }

    return result;
  }, [updateTask, fetchTasks]);

  // ============================================
  // Complete Task
  // ============================================

  const completeTask = useCallback(async (taskId: string): Promise<{
    success: boolean;
    task?: Task;
    error?: string;
  }> => {
    return updateTask({
      taskId,
      status: 'completed',
      completedAt: new Date(),
    } as UpdateTaskOptions);
  }, [updateTask]);

  // ============================================
  // Delete Task
  // ============================================

  const deleteTask = useCallback(async (taskId: string): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // Optimistic deletion
    setTasks(prev => prev.filter(t => t.id !== taskId));

    setIsDeleting(true);
    setError(null);

    try {
      const response = await apiClient.delete(`/api/agent/task/tasks/${taskId}`);

      if (response.success) {
        return { success: true };
      }

      // Revert on failure
      await fetchTasks();
      return { success: false, error: response.error || 'Failed to delete task' };
    } catch (err) {
      // Revert on failure
      await fetchTasks();
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsDeleting(false);
    }
  }, [isAuthenticated, fetchTasks]);

  // ============================================
  // Batch Delete Tasks
  // ============================================

  const batchDeleteTasks = useCallback(async (taskIds: string[]): Promise<{
    success: boolean;
    deleted: number;
    failed: number;
    errors: Array<{ taskId: string; error: string }>;
  }> => {
    if (!isAuthenticated) {
      return { success: false, deleted: 0, failed: taskIds.length, errors: [] };
    }

    setIsDeleting(true);
    const errors: Array<{ taskId: string; error: string }> = [];
    let deleted = 0;

    for (const taskId of taskIds) {
      const result = await deleteTask(taskId);
      if (result.success) {
        deleted++;
      } else {
        errors.push({ taskId, error: result.error || 'Unknown error' });
      }
    }

    setIsDeleting(false);

    return {
      success: errors.length === 0,
      deleted,
      failed: errors.length,
      errors,
    };
  }, [isAuthenticated, deleteTask]);

  // ============================================
  // Move Task (between columns/lists)
  // ============================================

  const moveTask = useCallback(async (
    taskId: string,
    newStatus: TaskStatus,
    position?: number,
    newGroupId?: string,
    newProjectId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              ...(newGroupId ? { groupId: newGroupId } : {}),
              ...(newProjectId ? { projectId: newProjectId } : {}),
              updatedAt: new Date(),
            }
          : t
      )
    );

    try {
      const response = await apiClient.post(`/api/agent/task/tasks/${taskId}/move`, {
        status: newStatus,
        position,
        groupId: newGroupId,
        projectId: newProjectId,
      });

      if (response.success) {
        return { success: true };
      }

      await fetchTasks();
      return { success: false, error: response.error || 'Failed to move task' };
    } catch (err) {
      await fetchTasks();
      const message = err instanceof Error ? err.message : 'Failed to move task';
      return { success: false, error: message };
    }
  }, [isAuthenticated, fetchTasks]);

  // ============================================
  // Fetch Projects
  // ============================================

  const fetchProjects = useCallback(async (provider?: TaskProvider) => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<{ projects: TaskProject[] }>(
        '/api/agent/task/projects',
        { params: { provider: provider || selectedProvider } }
      );

      if (response.success && response.data) {
        setProjects(response.data.projects);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, [isAuthenticated, selectedProvider]);

  // ============================================
  // Fetch Boards
  // ============================================

  const fetchBoards = useCallback(async (provider?: TaskProvider) => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<{ boards: TaskBoard[] }>(
        '/api/agent/task/boards',
        { params: { provider: provider || selectedProvider } }
      );

      if (response.success && response.data) {
        setBoards(response.data.boards);
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  }, [isAuthenticated, selectedProvider]);

  // ============================================
  // Create Project
  // ============================================

  const createProject = useCallback(async (
    name: string,
    options?: {
      description?: string;
      provider?: TaskProvider;
      color?: string;
      icon?: string;
    }
  ): Promise<{ success: boolean; project?: TaskProject; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await apiClient.post<TaskProject>('/api/agent/task/projects', {
        name,
        ...options,
        provider: options?.provider || selectedProvider,
      });

      if (response.success && response.data) {
        setProjects(prev => [...prev, response.data!]);
        return { success: true, project: response.data };
      }

      return { success: false, error: response.error || 'Failed to create project' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      return { success: false, error: message };
    }
  }, [isAuthenticated, selectedProvider]);

  // ============================================
  // Get Task Stats
  // ============================================

  const getTaskStats = useCallback(async (): Promise<TaskStats | null> => {
    if (!isAuthenticated) return null;

    try {
      const response = await apiClient.get<TaskStats>(
        '/api/agent/task/stats',
        { params: { provider: selectedProvider, projectId: selectedProjectId } }
      );

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (err) {
      console.error('Failed to fetch task stats:', err);
      return null;
    }
  }, [isAuthenticated, selectedProvider, selectedProjectId]);

  // ============================================
  // Get Connected Providers
  // ============================================

  const fetchConnectedProviders = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<{ providers: TaskProvider[] }>(
        '/api/agent/task/providers'
      );

      if (response.success && response.data) {
        setConnectedProviders(response.data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch connected providers:', err);
    }
  }, [isAuthenticated]);

  // ============================================
  // Task Filters
  // ============================================

  const getFilteredTasks = useCallback((
    tasks: Task[],
    filters?: TaskFilterOptions
  ): Task[] => {
    let filtered = [...tasks];

    if (filters?.status) {
      const statusArr = Array.isArray(filters.status) ? filters.status : [filters.status];
      filtered = filtered.filter(t => statusArr.includes(t.status));
    }

    if (filters?.priority) {
      const priorityArr = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      filtered = filtered.filter(t => priorityArr.includes(t.priority));
    }

    if (filters?.provider) {
      const providerArr = Array.isArray(filters.provider) ? filters.provider : [filters.provider];
      filtered = filtered.filter(t => providerArr.includes(t.provider));
    }

    if (filters?.projectId) {
      filtered = filtered.filter(t => t.projectId === filters.projectId);
    }

    if (filters?.assigneeEmail) {
      filtered = filtered.filter(t =>
        t.assignee?.email?.toLowerCase().includes(filters.assigneeEmail!.toLowerCase())
      );
    }

    if (filters?.dueDateBefore) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate <= filters.dueDateBefore!);
    }

    if (filters?.dueDateAfter) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate >= filters.dueDateAfter!);
    }

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    if (filters?.labels && filters.labels.length > 0) {
      filtered = filtered.filter(t =>
        t.labels.some(l => filters.labels!.includes(l))
      );
    }

    if (filters?.includeCompleted === false) {
      filtered = filtered.filter(t => t.status !== 'completed');
    }

    return filtered;
  }, []);

  // ============================================
  // Group Tasks by Status
  // ============================================

  const getTasksByStatus = useCallback((
    tasks: Task[],
    columns: TaskStatus[]
  ): Record<TaskStatus, Task[]> => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, []);

  // ============================================
  // Compute Task Stats
  // ============================================

  const computeStats = useCallback((taskList: Task[]): TaskStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

    return {
      total: taskList.length,
      pending: taskList.filter(t => t.status === 'pending').length,
      inProgress: taskList.filter(t => t.status === 'in_progress').length,
      completed: taskList.filter(t => t.status === 'completed').length,
      cancelled: taskList.filter(t => t.status === 'cancelled').length,
      overdue: taskList.filter(t =>
        t.dueDate && t.dueDate < now && t.status !== 'completed' && t.status !== 'cancelled'
      ).length,
      dueToday: taskList.filter(t =>
        t.dueDate &&
        t.dueDate >= today &&
        t.dueDate < new Date(today.getTime() + 86400000) &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
      ).length,
      dueThisWeek: taskList.filter(t =>
        t.dueDate &&
        t.dueDate >= today &&
        t.dueDate < endOfWeek &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
      ).length,
      highPriority: taskList.filter(t => t.priority === 'high').length,
      urgentPriority: taskList.filter(t => t.priority === 'urgent').length,
    };
  }, []);

  // ============================================
  // Local Stats (memoized)
  // ============================================

  const taskStats = useMemo(() => computeStats(tasks), [tasks, computeStats]);

  // ============================================
  // Helpers
  // ============================================

  const transformTask = (task: any): Task => ({
    id: task.id,
    title: task.title || task.name || 'Untitled Task',
    description: task.description || task.notes,
    notes: task.notes,
    status: mapStatus(task.status),
    priority: mapPriority(task.priority),
    dueDate: task.dueDate || task.due ? new Date(task.dueDate || task.due) : undefined,
    completedAt: task.completedAt || task.completed ? new Date(task.completedAt || task.completed) : undefined,
    provider: task.provider || 'google_tasks',
    projectId: task.projectId,
    projectName: task.projectName,
    boardId: task.boardId,
    groupId: task.groupId,
    groupName: task.groupName,
    assignee: task.assignee ? {
      email: task.assignee.email || task.assignee,
      name: task.assignee.name || task.assignee.displayName,
      avatar: task.assignee.avatar || task.assignee.photoThumb,
    } : undefined,
    labels: task.labels || [],
    tags: task.tags || [],
    parentTaskId: task.parentTaskId || task.parent,
    subtasks: task.subtasks?.map(transformTask),
    attachments: task.attachments?.map((a: any) => ({
      id: a.id,
      name: a.name || a.filename,
      url: a.url,
      mimeType: a.mimeType,
      size: a.size,
      thumbnailUrl: a.thumbnailUrl,
    })),
    customFields: task.customFields || task.custom_fields,
    position: task.position,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: task.actualMinutes,
    webUrl: task.webUrl || task.webViewLink || task.permalink_url,
    dependencyIds: task.dependencyIds || task.dependencies,
    createdAt: task.createdAt || task.created_at ? new Date(task.createdAt || task.created_at) : new Date(),
    updatedAt: task.updatedAt || task.updated_at ? new Date(task.updatedAt || task.updated_at) : new Date(),
  });

  const mapStatus = (status: string): TaskStatus => {
    const lower = status?.toLowerCase() || '';
    if (lower === 'needsaction' || lower === 'active' || lower === 'todo' || lower === 'open') return 'pending';
    if (lower === 'in_progress' || lower === 'inprogress' || lower === 'doing') return 'in_progress';
    if (lower === 'completed' || lower === 'done' || lower === 'resolved') return 'completed';
    if (lower === 'cancelled' || lower === 'canceled' || lower === 'archived' || lower === 'deleted') return 'cancelled';
    return 'pending';
  };

  const mapPriority = (priority: string): TaskPriority => {
    const lower = priority?.toLowerCase() || '';
    if (lower === 'urgent' || lower === 'critical') return 'urgent';
    if (lower === 'high' || lower === 'important') return 'high';
    if (lower === 'medium' || lower === 'normal') return 'medium';
    if (lower === 'low' || lower === 'minor') return 'low';
    return 'medium';
  };

  // ============================================
  // Initialize on mount
  // ============================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchConnectedProviders();
      fetchTasks();
      fetchProjects();
    }
  }, [isAuthenticated]);

  // ============================================
  // Refetch when provider or project changes
  // ============================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
      fetchProjects();
    }
  }, [selectedProvider, selectedProjectId]);

  // ============================================
  // Auto-refresh every 2 minutes for active tasks
  // ============================================

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchTasks();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchTasks]);

  // ============================================
  // Return
  // ============================================

  return {
    // State
    tasks,
    projects,
    boards,
    selectedProjectId,
    selectedProvider,
    viewMode,
    statusColumns,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    lastSync,
    connectedProviders,
    taskStats,

    // Task CRUD
    fetchTasks,
    getTaskById,
    createTask,
    batchCreateTasks,
    updateTask,
    updateTaskStatus,
    completeTask,
    deleteTask,
    batchDeleteTasks,
    moveTask,

    // Projects
    fetchProjects,
    createProject,

    // Boards
    fetchBoards,

    // Stats
    getTaskStats,

    // Providers
    fetchConnectedProviders,

    // Selection
    setSelectedProjectId,
    setSelectedProvider,
    setViewMode,
    setStatusColumns,

    // Filtering
    getFilteredTasks,
    getTasksByStatus,
    computeStats,

    // Error
    setError,
  };
}

export default useTask;