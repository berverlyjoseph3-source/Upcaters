// enterprise-ai-agent-platform/apps/frontend/src/types/task.types.ts

/**
 * Task Status
 */
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'hold' | 'review' | 'backlog' | 'cancelled';

/**
 * Task Priority
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Task Provider
 */
export type TaskProvider = 'google_tasks' | 'asana' | 'monday';

/**
 * Core Task interface used by the frontend
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  provider: TaskProvider;
  providerTaskId?: string;
  projectId?: string;
  projectName?: string;
  assignee?: TaskAssignee;
  labels: string[];
  parentTaskId?: string;
  subtasks?: Task[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  url?: string;
  position?: string;
  estimatedHours?: number;
  actualHours?: number;
  created: Date;
  updated: Date;
  metadata?: Record<string, any>;
}

/**
 * Task Assignee
 */
export interface TaskAssignee {
  email: string;
  name?: string;
  avatarUrl?: string;
  providerId?: string;
}

/**
 * Task Attachment
 */
export interface TaskAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

/**
 * Task Comment
 */
export interface TaskComment {
  id: string;
  author: {
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Options for creating a task
 */
export interface CreateTaskOptions {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  provider: TaskProvider;
  projectId?: string;
  assignee?: string;
  labels?: string[];
  parentTaskId?: string;
  estimatedHours?: number;
  metadata?: Record<string, any>;
}

/**
 * Options for updating a task
 */
export interface UpdateTaskOptions {
  taskId: string;
  provider: TaskProvider;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assignee?: string;
  labels?: string[];
  projectId?: string;
  estimatedHours?: number;
  completed?: boolean;
}

/**
 * Options for listing tasks
 */
export interface ListTasksOptions {
  provider?: TaskProvider;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  assignee?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  search?: string;
  limit?: number;
  pageToken?: string;
  includeCompleted?: boolean;
  includeSubtasks?: boolean;
  orderBy?: 'dueDate' | 'created' | 'updated' | 'priority' | 'title';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Response from listing tasks
 */
export interface ListTasksResponse {
  success: boolean;
  tasks: Task[];
  total: number;
  nextPageToken?: string;
  providers: string[];
  errors?: Array<{ provider: string; error: string }>;
  error?: string;
}

/**
 * Response from creating a task
 */
export interface CreateTaskResponse {
  success: boolean;
  task?: Task;
  error?: string;
  provider: TaskProvider;
}

/**
 * Response from updating a task
 */
export interface UpdateTaskResponse {
  success: boolean;
  task?: Task;
  error?: string;
  provider: TaskProvider;
}

/**
 * Response from deleting a task
 */
export interface DeleteTaskResponse {
  success: boolean;
  error?: string;
}

/**
 * Options for batch creating tasks
 */
export interface BatchCreateOptions {
  tasks: Array<{
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: Date;
    projectId?: string;
    assignee?: string;
    labels?: string[];
  }>;
  provider: TaskProvider;
}

/**
 * Response from batch creating tasks
 */
export interface BatchCreateResponse {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    task?: Task;
    error?: string;
    index: number;
  }>;
  provider: TaskProvider;
}

/**
 * Options for batch deleting tasks
 */
export interface BatchDeleteOptions {
  taskIds: string[];
  provider: TaskProvider;
}

/**
 * Response from batch deleting tasks
 */
export interface BatchDeleteResponse {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ taskId: string; error: string }>;
  provider: TaskProvider;
}

/**
 * Result of a batch task operation
 */
export interface BatchTaskResult {
  success: boolean;
  results: Array<{
    success: boolean;
    task?: Task;
    error?: string;
  }>;
  totalProcessed: number;
  totalFailed: number;
}

/**
 * Summary of tasks for a user
 */
export interface TaskSummary {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  cancelled: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completionRate: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byProvider: Record<string, {
    total: number;
    completed: number;
    pending: number;
  }>;
  averageCompletionTimeHours?: number;
  byProject?: Record<string, {
    name: string;
    total: number;
    completed: number;
  }>;
}

/**
 * Response from task summary
 */
export interface TaskSummaryResponse {
  success: boolean;
  summary?: TaskSummary;
  error?: string;
  timestamp: Date;
}

/**
 * Project/Board for task management
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  provider: TaskProvider;
  providerProjectId?: string;
  workspaceId?: string;
  workspaceName?: string;
  taskCount: number;
  completedTaskCount: number;
  color?: string;
  archived: boolean;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Response from listing projects
 */
export interface ListProjectsResponse {
  success: boolean;
  projects: Project[];
  total: number;
  errors?: Array<{ provider: string; error: string }>;
  error?: string;
}

/**
 * Task Agent Configuration
 */
export interface TaskAgentConfig {
  defaultProvider: TaskProvider;
  maxTasksPerFetch: number;
  enableAutoSync: boolean;
  syncIntervalMinutes: number;
  enableSmartPrioritization: boolean;
  enableDueDateReminders: boolean;
  reminderAdvanceMinutes: number;
  supportedProviders: TaskProvider[];
}

// ============================================
// Provider-Specific API Response Types
// ============================================

/**
 * Google Tasks API Types
 */
export interface GoogleTasksTaskList {
  id: string;
  title: string;
  updated: string;
  selfLink: string;
  etag?: string;
}

export interface GoogleTasksTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  parent?: string;
  position: string;
  updated: string;
  selfLink: string;
  etag?: string;
  links?: Array<{
    type: string;
    link: string;
    description: string;
  }>;
  webViewLink?: string;
  assignees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface GoogleTasksTaskListsResponse {
  items: GoogleTasksTaskList[];
  nextPageToken?: string;
}

export interface GoogleTasksTasksResponse {
  items: GoogleTasksTask[];
  nextPageToken?: string;
}

/**
 * Asana API Types
 */
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
  memberships?: Array<{
    project: { gid: string; name: string };
    section: { gid: string; name: string };
  }>;
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
  // REMOVED DUPLICATE FIELDS - these were the cause of TS2300 errors:
  // completed_at, due_on, due_at were declared twice in the original file
}

export interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
  photo?: {
    image_21x21?: string;
    image_27x27?: string;
    image_36x36?: string;
    image_60x60?: string;
    image_128x128?: string;
  };
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

/**
 * Monday.com API Types
 */
export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  workspace_id?: string;
  board_kind: 'private' | 'share' | 'public';
  state: 'active' | 'archived' | 'deleted';
  permissions: 'private' | 'share' | 'public';
  columns: MondayColumn[];
  groups: MondayGroup[];
  items: MondayItem[];
  owner?: MondayUser;
  subscribers?: MondayUser[];
  top_group?: MondayGroup;
  created_at?: string;
  updated_at?: string;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
  width?: number;
  archived?: boolean;
}

export interface MondayGroup {
  id: string;
  title: string;
  color?: string;
  position: string;
  archived: boolean;
  items_count?: number;
}

export interface MondayItem {
  id: string;
  name: string;
  board: { id: string; name?: string };
  group: { id: string; title: string };
  column_values: MondayColumnValue[];
  created_at: string;
  updated_at: string;
  state: 'active' | 'archived' | 'deleted';
  parent_item?: { id: string };
  subitems?: MondayItem[];
  creator?: MondayUser;
  subscribers?: MondayUser[];
  assets?: MondayAsset[];
}

export interface MondayColumnValue {
  id: string;
  value: any;
  text: string;
  type: string;
  column?: { id: string; title: string; type: string };
}

export interface MondayUser {
  id: string;
  name: string;
  email: string;
  photo_thumb?: string;
  photo_small?: string;
  photo_original?: string;
  created_at: string;
  is_guest: boolean;
  is_pending: boolean;
  is_view_only: boolean;
  is_verified: boolean;
  enabled: boolean;
  account?: {
    id: string;
    name: string;
  };
  teams?: MondayTeam[];
  title?: string;
  phone?: string;
  location?: string;
  birthday?: string;
  url?: string;
}

export interface MondayTeam {
  id: string;
  name: string;
  picture_url?: string;
}

export interface MondayAsset {
  id: string;
  name: string;
  url: string;
  url_thumbnail?: string;
  public_url: string;
  file_size: number;
  file_extension: string;
  created_at: string;
  uploaded_by: { id: string; name: string };
}

export interface MondayCreateItemOptions {
  boardId: string;
  itemName: string;
  columnValues?: Record<string, any>;
  groupId?: string;
  createLabelsIfMissing?: boolean;
}

export interface MondayUpdateItemOptions {
  itemId: string;
  columnValues: Record<string, any>;
  createLabelsIfMissing?: boolean;
}

export interface MondayWorkspace {
  id: string;
  name: string;
  description?: string;
  kind: 'open' | 'closed';
  state: 'active' | 'archived' | 'deleted';
  created_at: string;
  owner?: MondayUser;
}
