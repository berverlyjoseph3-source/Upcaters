// enterprise-ai-agent-platform/apps/frontend/src/store/task.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { 
  Task, 
  TaskStatus, 
  TaskPriority,
  TaskProvider,
  Project,
  TaskSummary,
  BatchTaskResult 
} from '../types/task.types';

// ============================================
// Types
// ============================================

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  provider?: TaskProvider;
  projectId?: string;
  searchQuery?: string;
  assignee?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  labels?: string[];
}

export interface TasksByStatus {
  todo: Task[];
  in_progress: Task[];
  done: Task[];
}

interface TaskStoreState {
  // State
  tasks: Task[];
  tasksByStatus: TasksByStatus;
  projects: Project[];
  selectedTask: Task | null;
  selectedProjectId: string | null;
  taskSummary: TaskSummary | null;
  filters: TaskFilters;
  viewMode: 'board' | 'list' | 'calendar';
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
  connectedProviders: TaskProvider[];
  isDragging: boolean;
  draggedTask: Task | null;
  lastBatchResult: BatchTaskResult | null;

  // Actions
  setViewMode: (mode: 'board' | 'list' | 'calendar') => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  setSelectedTask: (task: Task | null) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setDraggedTask: (task: Task | null) => void;
  setIsDragging: (isDragging: boolean) => void;

  // CRUD Operations
  fetchTasks: (projectId?: string) => Promise<void>;
  fetchTask: (taskId: string) => Promise<Task | null>;
  createTask: (task: Partial<Task> & { title: string }) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  completeTask: (taskId: string) => Promise<boolean>;
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  
  // Batch Operations
  batchCreateTasks: (tasks: Array<{ title: string; description?: string; priority?: TaskPriority; dueDate?: Date }>) => Promise<BatchTaskResult | null>;
  batchUpdateTasks: (taskIds: string[], updates: Partial<Task>) => Promise<boolean>;
  batchDeleteTasks: (taskIds: string[]) => Promise<BatchTaskResult | null>;
  batchCompleteTasks: (taskIds: string[]) => Promise<BatchTaskResult | null>;
  batchMoveTasks: (taskIds: string[], newStatus: TaskStatus) => Promise<void>;

  // Projects
  fetchProjects: () => Promise<void>;
  createProject: (name: string) => Promise<Project | null>;

  // Summary & Stats
  fetchTaskSummary: () => Promise<void>;
  
  // Provider Management
  fetchConnectedProviders: () => Promise<void>;
  
  // Sync
  syncTasks: () => Promise<void>;
  
  // Optimistic Updates
  optimisticUpdate: (taskId: string, updates: Partial<Task>) => void;
  optimisticDelete: (taskId: string) => void;
  optimisticCreate: (task: Task) => void;
  rollbackOptimisticUpdate: (taskId: string, previousState: Task) => void;
  
  // Drag & Drop
  handleDragStart: (task: Task) => void;
  handleDragEnd: () => void;
  handleDrop: (newStatus: TaskStatus) => Promise<void>;
  
  // Cleanup
  reset: () => void;
  clearError: () => void;
}

// ============================================
// Default Filters
// ============================================

const defaultFilters: TaskFilters = {
  status: undefined,
  priority: undefined,
  provider: undefined,
  projectId: undefined,
  searchQuery: '',
  assignee: undefined,
  dueDateFrom: undefined,
  dueDateTo: undefined,
  labels: [],
};

// ============================================
// Initial State
// ============================================

const initialState = {
  tasks: [],
  tasksByStatus: {
    todo: [],
    in_progress: [],
    done: [],
  },
  projects: [],
  selectedTask: null,
  selectedProjectId: null,
  taskSummary: null,
  filters: { ...defaultFilters },
  viewMode: 'board' as const,
  isLoading: false,
  isSyncing: false,
  error: null,
  lastSyncedAt: null,
  connectedProviders: [],
  isDragging: false,
  draggedTask: null,
  lastBatchResult: null,
};

// ============================================
// Helpers
// ============================================

const groupTasksByStatus = (tasks: Task[]): TasksByStatus => {
  return {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };
};

const filterTasks = (tasks: Task[], filters: TaskFilters): Task[] => {
  return tasks.filter(task => {
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(task.status)) return false;
    }

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) return false;

    // Project filter
    if (filters.projectId && task.projectId !== filters.projectId) return false;

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDescription = task.description?.toLowerCase().includes(query) || false;
      if (!matchesTitle && !matchesDescription) return false;
    }

    // Assignee filter
    if (filters.assignee) {
      const matchesAssignee = task.assignee?.email === filters.assignee || 
                              task.assignee?.name === filters.assignee;
      if (!matchesAssignee) return false;
    }

    // Due date range filter
    if (filters.dueDateFrom && task.dueDate) {
      if (new Date(task.dueDate) < filters.dueDateFrom) return false;
    }
    if (filters.dueDateTo && task.dueDate) {
      if (new Date(task.dueDate) > filters.dueDateTo) return false;
    }

    // Labels filter
    if (filters.labels && filters.labels.length > 0) {
      const hasAllLabels = filters.labels.every(label => task.labels.includes(label));
      if (!hasAllLabels) return false;
    }

    return true;
  });
};

// ============================================
// Snapshot for Optimistic Rollbacks
// ============================================

const taskSnapshots = new Map<string, Task>();

const saveSnapshot = (task: Task) => {
  if (!taskSnapshots.has(task.id)) {
    taskSnapshots.set(task.id, { ...task });
  }
};

const getSnapshot = (taskId: string): Task | undefined => {
  return taskSnapshots.get(taskId);
};

const clearSnapshot = (taskId: string) => {
  taskSnapshots.delete(taskId);
};

// ============================================
// Store
// ============================================

export const useTaskStore = create<TaskStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // View & Filter Management
        // ============================================

        setViewMode: (mode) => set({ viewMode: mode }),

        setFilters: (filters) => {
          const state = get();
          const newFilters = { ...state.filters, ...filters };
          const filteredTasks = filterTasks(state.tasks, newFilters);
          set({
            filters: newFilters,
            tasksByStatus: groupTasksByStatus(filteredTasks),
          });
        },

        clearFilters: () => {
          const state = get();
          set({
            filters: { ...defaultFilters },
            tasksByStatus: groupTasksByStatus(state.tasks),
          });
        },

        setSelectedTask: (task) => set({ selectedTask: task }),

        setSelectedProjectId: (projectId) => set({ selectedProjectId: projectId }),

        setDraggedTask: (task) => set({ draggedTask: task }),

        setIsDragging: (isDragging) => set({ isDragging }),

        // ============================================
        // CRUD Operations
        // ============================================

        fetchTasks: async (projectId) => {
          set({ isLoading: true, error: null });
          try {
            const params: Record<string, any> = {};
            if (projectId) params.projectId = projectId;

            const response = await apiClient.get<Task[]>('/api/agent/task/tasks', params);
            
            if (response.success && response.data) {
              const tasks = response.data.map(t => ({
                ...t,
                dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                created: new Date(t.created),
                updated: new Date(t.updated),
              }));

              const state = get();
              const filteredTasks = filterTasks(tasks, state.filters);

              set({
                tasks,
                tasksByStatus: groupTasksByStatus(filteredTasks),
                lastSyncedAt: new Date(),
              });
            } else {
              set({ error: response.error || 'Failed to fetch tasks' });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
            set({ error: message });
          } finally {
            set({ isLoading: false });
          }
        },

        fetchTask: async (taskId) => {
          try {
            const response = await apiClient.get<Task>(`/api/agent/task/tasks/${taskId}`);
            if (response.success && response.data) {
              const task: Task = {
                ...response.data,
                dueDate: response.data.dueDate ? new Date(response.data.dueDate) : undefined,
                created: new Date(response.data.created),
                updated: new Date(response.data.updated),
              };
              set({ selectedTask: task });
              return task;
            }
            return null;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch task';
            set({ error: message });
            return null;
          }
        },

        createTask: async (taskData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.post<Task>('/api/agent/task/tasks', taskData);
            
            if (response.success && response.data) {
              const newTask: Task = {
                ...response.data,
                dueDate: response.data.dueDate ? new Date(response.data.dueDate) : undefined,
                created: new Date(),
                updated: new Date(),
              };

              const state = get();
              const updatedTasks = [newTask, ...state.tasks];
              const filteredTasks = filterTasks(updatedTasks, state.filters);

              set({
                tasks: updatedTasks,
                tasksByStatus: groupTasksByStatus(filteredTasks),
                lastSyncedAt: new Date(),
              });

              return newTask;
            } else {
              set({ error: response.error || 'Failed to create task' });
              return null;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create task';
            set({ error: message });
            return null;
          } finally {
            set({ isLoading: false });
          }
        },

        updateTask: async (taskId, updates) => {
          try {
            // Save snapshot for rollback
            const state = get();
            const existingTask = state.tasks.find(t => t.id === taskId);
            if (existingTask) {
              saveSnapshot(existingTask);
            }

            // Optimistic update
            state.optimisticUpdate(taskId, updates);

            const response = await apiClient.put<Task>(`/api/agent/task/tasks/${taskId}`, updates);
            
            if (response.success && response.data) {
              const updatedTask: Task = {
                ...response.data,
                updated: new Date(),
              };

              const currentState = get();
              const updatedTasks = currentState.tasks.map(t => 
                t.id === taskId ? { ...t, ...updatedTask } : t
              );
              const filteredTasks = filterTasks(updatedTasks, currentState.filters);

              set({
                tasks: updatedTasks,
                tasksByStatus: groupTasksByStatus(filteredTasks),
                selectedTask: currentState.selectedTask?.id === taskId 
                  ? { ...currentState.selectedTask, ...updatedTask } 
                  : currentState.selectedTask,
                lastSyncedAt: new Date(),
              });

              clearSnapshot(taskId);
              return updatedTask;
            } else {
              // Rollback on failure
              state.rollbackOptimisticUpdate(taskId, getSnapshot(taskId) || existingTask!);
              set({ error: response.error || 'Failed to update task' });
              return null;
            }
          } catch (err) {
            const state = get();
            const existingTask = state.tasks.find(t => t.id === taskId);
            if (existingTask && getSnapshot(taskId)) {
              state.rollbackOptimisticUpdate(taskId, getSnapshot(taskId)!);
            }
            const message = err instanceof Error ? err.message : 'Failed to update task';
            set({ error: message });
            return null;
          }
        },

        deleteTask: async (taskId) => {
          try {
            const state = get();
            const existingTask = state.tasks.find(t => t.id === taskId);
            if (existingTask) {
              saveSnapshot(existingTask);
            }

            // Optimistic delete
            state.optimisticDelete(taskId);

            const response = await apiClient.delete(`/api/agent/task/tasks/${taskId}`);
            
            if (response.success) {
              clearSnapshot(taskId);
              return true;
            } else {
              // Rollback
              if (existingTask) {
                const currentState = get();
                const restoredTasks = [...currentState.tasks, existingTask];
                const filteredTasks = filterTasks(restoredTasks, currentState.filters);
                set({
                  tasks: restoredTasks,
                  tasksByStatus: groupTasksByStatus(filteredTasks),
                });
              }
              set({ error: response.error || 'Failed to delete task' });
              return false;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete task';
            set({ error: message });
            return false;
          }
        },

        completeTask: async (taskId) => {
          return !!(await get().updateTask(taskId, { status: 'done' }));
        },

        moveTask: async (taskId, newStatus) => {
          const state = get();
          await state.updateTask(taskId, { status: newStatus });
        },

        // ============================================
        // Batch Operations
        // ============================================

        batchCreateTasks: async (tasks) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.post<BatchTaskResult>('/api/agent/task/tasks/batch', { tasks });
            
            if (response.success && response.data) {
              set({ lastBatchResult: response.data });
              // Refresh tasks to get the newly created ones
              await get().fetchTasks(get().selectedProjectId || undefined);
              return response.data;
            } else {
              set({ error: response.error || 'Failed to create batch tasks' });
              return null;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create batch tasks';
            set({ error: message });
            return null;
          } finally {
            set({ isLoading: false });
          }
        },

        batchUpdateTasks: async (taskIds, updates) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.put('/api/agent/task/tasks/batch', {
              taskIds,
              updates,
            });
            
            if (response.success) {
              await get().fetchTasks(get().selectedProjectId || undefined);
              return true;
            }
            return false;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to batch update tasks';
            set({ error: message });
            return false;
          } finally {
            set({ isLoading: false });
          }
        },

        batchDeleteTasks: async (taskIds) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.post<BatchTaskResult>('/api/agent/task/tasks/batch-delete', {
              taskIds,
            });
            
            if (response.success && response.data) {
              set({ lastBatchResult: response.data });
              await get().fetchTasks(get().selectedProjectId || undefined);
              return response.data;
            }
            return null;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to batch delete tasks';
            set({ error: message });
            return null;
          } finally {
            set({ isLoading: false });
          }
        },

        batchCompleteTasks: async (taskIds) => {
          set({ isLoading: true, error: null });
          try {
            const response = await apiClient.post<BatchTaskResult>('/api/agent/task/tasks/batch-complete', {
              taskIds,
            });
            
            if (response.success && response.data) {
              set({ lastBatchResult: response.data });
              // Update local state optimistically
              const state = get();
              const updatedTasks = state.tasks.map(task =>
                taskIds.includes(task.id) ? { ...task, status: 'done' as TaskStatus, updated: new Date() } : task
              );
              const filteredTasks = filterTasks(updatedTasks, state.filters);
              set({
                tasks: updatedTasks,
                tasksByStatus: groupTasksByStatus(filteredTasks),
              });
              return response.data;
            } else {
              set({ error: response.error || 'Failed to complete batch tasks' });
              return null;
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to complete batch tasks';
            set({ error: message });
            return null;
          } finally {
            set({ isLoading: false });
          }
        },

        batchMoveTasks: async (taskIds, newStatus) => {
          await get().batchUpdateTasks(taskIds, { status: newStatus });
        },

        // ============================================
        // Projects
        // ============================================

        fetchProjects: async () => {
          set({ isLoading: true });
          try {
            const response = await apiClient.get<Project[]>('/api/agent/task/projects');
            if (response.success && response.data) {
              set({ projects: response.data });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch projects';
            set({ error: message });
          } finally {
            set({ isLoading: false });
          }
        },

        createProject: async (name) => {
          try {
            const response = await apiClient.post<Project>('/api/agent/task/projects', { name });
            if (response.success && response.data) {
              const state = get();
              set({ projects: [...state.projects, response.data] });
              return response.data;
            }
            return null;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create project';
            set({ error: message });
            return null;
          }
        },

        // ============================================
        // Summary & Stats
        // ============================================

        fetchTaskSummary: async () => {
          try {
            const response = await apiClient.get<TaskSummary>('/api/agent/task/summary');
            if (response.success && response.data) {
              set({ taskSummary: response.data });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch task summary';
            set({ error: message });
          }
        },

        // ============================================
        // Provider Management
        // ============================================

        fetchConnectedProviders: async () => {
          try {
            const response = await apiClient.get<TaskProvider[]>('/api/agent/task/providers');
            if (response.success && response.data) {
              set({ connectedProviders: response.data });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch providers';
            set({ error: message });
          }
        },

        // ============================================
        // Sync
        // ============================================

        syncTasks: async () => {
          set({ isSyncing: true });
          try {
            const response = await apiClient.post('/api/agent/task/sync');
            if (response.success) {
              await get().fetchTasks(get().selectedProjectId || undefined);
              set({ lastSyncedAt: new Date() });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Task sync failed';
            set({ error: message });
          } finally {
            set({ isSyncing: false });
          }
        },

        // ============================================
        // Optimistic Updates
        // ============================================

        optimisticUpdate: (taskId, updates) => {
          const state = get();
          const updatedTasks = state.tasks.map(task =>
            task.id === taskId ? { ...task, ...updates, updated: new Date() } : task
          );
          const filteredTasks = filterTasks(updatedTasks, state.filters);
          
          set({
            tasks: updatedTasks,
            tasksByStatus: groupTasksByStatus(filteredTasks),
            selectedTask: state.selectedTask?.id === taskId
              ? { ...state.selectedTask, ...updates }
              : state.selectedTask,
          });
        },

        optimisticDelete: (taskId) => {
          const state = get();
          const updatedTasks = state.tasks.filter(task => task.id !== taskId);
          const filteredTasks = filterTasks(updatedTasks, state.filters);
          
          set({
            tasks: updatedTasks,
            tasksByStatus: groupTasksByStatus(filteredTasks),
            selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask,
          });
        },

        optimisticCreate: (task) => {
          const state = get();
          const updatedTasks = [task, ...state.tasks];
          const filteredTasks = filterTasks(updatedTasks, state.filters);
          
          set({
            tasks: updatedTasks,
            tasksByStatus: groupTasksByStatus(filteredTasks),
          });
        },

        rollbackOptimisticUpdate: (taskId, previousState) => {
          const state = get();
          const updatedTasks = state.tasks.map(task =>
            task.id === taskId ? { ...previousState } : task
          );
          const filteredTasks = filterTasks(updatedTasks, state.filters);
          
          set({
            tasks: updatedTasks,
            tasksByStatus: groupTasksByStatus(filteredTasks),
            selectedTask: state.selectedTask?.id === taskId
              ? { ...previousState }
              : state.selectedTask,
          });
        },

        // ============================================
        // Drag & Drop
        // ============================================

        handleDragStart: (task) => {
          set({
            draggedTask: task,
            isDragging: true,
          });
        },

        handleDragEnd: () => {
          set({
            draggedTask: null,
            isDragging: false,
          });
        },

        handleDrop: async (newStatus) => {
          const { draggedTask } = get();
          if (!draggedTask || draggedTask.status === newStatus) {
            get().handleDragEnd();
            return;
          }

          // Optimistic update
          get().optimisticUpdate(draggedTask.id, { status: newStatus });

          try {
            await get().updateTask(draggedTask.id, { status: newStatus });
          } catch (err) {
            // Rollback on failure
            const existingTask = getSnapshot(draggedTask.id);
            if (existingTask) {
              get().rollbackOptimisticUpdate(draggedTask.id, existingTask);
            }
          } finally {
            get().handleDragEnd();
          }
        },

        // ============================================
        // Cleanup
        // ============================================

        reset: () => {
          taskSnapshots.clear();
          set({ ...initialState });
        },

        clearError: () => set({ error: null }),
      }),
      {
        name: 'task-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
          selectedProjectId: state.selectedProjectId,
          filters: {
            searchQuery: state.filters.searchQuery,
          },
        }),
      }
    )
  )
);

// ============================================
// Selectors
// ============================================

export const selectTasksByStatus = (state: TaskStoreState) => state.tasksByStatus;
export const selectTasksCount = (state: TaskStoreState) => state.tasks.length;
export const selectTasksTodo = (state: TaskStoreState) => state.tasksByStatus.todo;
export const selectTasksInProgress = (state: TaskStoreState) => state.tasksByStatus.in_progress;
export const selectTasksDone = (state: TaskStoreState) => state.tasksByStatus.done;
export const selectSelectedTask = (state: TaskStoreState) => state.selectedTask;
export const selectIsLoading = (state: TaskStoreState) => state.isLoading;
export const selectIsSyncing = (state: TaskStoreState) => state.isSyncing;
export const selectError = (state: TaskStoreState) => state.error;
export const selectTaskSummary = (state: TaskStoreState) => state.taskSummary;
export const selectProjects = (state: TaskStoreState) => state.projects;
export const selectConnectedProviders = (state: TaskStoreState) => state.connectedProviders;
export const selectDraggedTask = (state: TaskStoreState) => state.draggedTask;
export const selectIsDragging = (state: TaskStoreState) => state.isDragging;
export const selectViewMode = (state: TaskStoreState) => state.viewMode;
export const selectFilters = (state: TaskStoreState) => state.filters;

// Count selectors for dashboard
export const selectTasksCountByStatus = (state: TaskStoreState) => ({
  todo: state.tasksByStatus.todo.length,
  inProgress: state.tasksByStatus.in_progress.length,
  done: state.tasksByStatus.done.length,
  total: state.tasks.length,
});

export const selectTasksCountByPriority = (state: TaskStoreState) => {
  const counts: Record<TaskPriority, number> = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  
  state.tasks.forEach(task => {
    if (task.priority) {
      counts[task.priority] = (counts[task.priority] || 0) + 1;
    }
  });
  
  return counts;
};

export const selectOverdueTasks = (state: TaskStoreState) => {
  const now = new Date();
  return state.tasks.filter(task => 
    task.status !== 'done' && 
    task.dueDate && 
    task.dueDate < now
  );
};

export const selectTasksDueToday = (state: TaskStoreState) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return state.tasks.filter(task => 
    task.status !== 'done' && 
    task.dueDate && 
    task.dueDate >= today && 
    task.dueDate < tomorrow
  );
};

export default useTaskStore;
