"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskAgent = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/task/task.agent.ts
const base_agent_1 = require("../core/base.agent");
const googletasks_client_1 = require("./googletasks.client");
const asana_client_1 = require("./asana.client");
const monday_client_1 = require("./monday.client");
const client_1 = require("@prisma/client");
const google_oauth_service_1 = require("../../auth/services/google-oauth.service");
const agent_types_1 = require("../../types/agent.types");
const logger_1 = require("../../utils/logger");
const openai_service_1 = require("../../services/ai/openai.service");
const client_2 = require("../../db/client");
const task_tools_1 = require("./task.tools");
class TaskAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(agent_types_1.AgentType.TASK, 'Task Agent', 'Manage tasks across Google Tasks, Asana, and Monday.com', '1.0.0');
    }
    registerTools() {
        this.registerTool(task_tools_1.TaskTools.createTaskTool());
        this.registerTool(task_tools_1.TaskTools.listTasksTool());
        this.registerTool(task_tools_1.TaskTools.updateTaskTool());
        this.registerTool(task_tools_1.TaskTools.deleteTaskTool());
        this.registerTool(task_tools_1.TaskTools.completeTaskTool());
        this.registerTool(task_tools_1.TaskTools.getTaskSummaryTool());
        this.registerTool(task_tools_1.TaskTools.getProjectsTool());
        this.registerTool(task_tools_1.TaskTools.batchCreateTasksTool());
    }
    /**
     * Get Google Tasks client
     */
    async getGoogleTasksClient(userId) {
        try {
            const token = await google_oauth_service_1.GoogleOAuthService.getValidAccessToken(userId, client_1.OAuthProvider.GOOGLE_TASKS);
            if (!token)
                return null;
            return new googletasks_client_1.GoogleTasksClient(token);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get Google Tasks client');
            return null;
        }
    }
    /**
     * Get Asana client
     */
    async getAsanaClient(userId) {
        try {
            const user = await client_2.prisma.user.findUnique({
                where: { id: userId },
                select: { metadata: true },
            });
            const asanaToken = user?.metadata?.asanaToken;
            if (!asanaToken)
                return null;
            return new asana_client_1.AsanaClient(asanaToken);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get Asana client');
            return null;
        }
    }
    /**
     * Get Monday.com client
     */
    async getMondayClient(userId) {
        try {
            const user = await client_2.prisma.user.findUnique({
                where: { id: userId },
                select: { metadata: true },
            });
            const mondayToken = user?.metadata?.mondayToken;
            if (!mondayToken)
                return null;
            return new monday_client_1.MondayClient(mondayToken);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get Monday.com client');
            return null;
        }
    }
    /**
     * Check if agent can handle the request
     */
    canHandle(request) {
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
    async doExecute(request, context) {
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
            const connectedProviders = [];
            if (gtClient)
                connectedProviders.push('google_tasks');
            if (asanaClient)
                connectedProviders.push('asana');
            if (mondayClient)
                connectedProviders.push('monday');
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Task agent execution failed');
            return {
                success: false,
                message: `Failed to process task request: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    isCreateRequest(input) {
        const keywords = ['create', 'add', 'new task', 'make task', 'add to-do', 'create to-do'];
        return keywords.some(k => input.includes(k));
    }
    isCompleteRequest(input) {
        const keywords = ['complete', 'finish', 'done', 'mark as done', 'mark complete', 'check off'];
        return keywords.some(k => input.includes(k));
    }
    isDeleteRequest(input) {
        const keywords = ['delete', 'remove', 'trash', 'discard'];
        return keywords.some(k => input.includes(k));
    }
    isUpdateRequest(input) {
        const keywords = ['update', 'change', 'modify', 'edit', 'rename', 'move', 'reschedule'];
        return keywords.some(k => input.includes(k));
    }
    isSummaryRequest(input) {
        const keywords = ['summary', 'overview', 'stats', 'statistics', 'progress', 'report'];
        return keywords.some(k => input.includes(k));
    }
    isProjectsRequest(input) {
        const keywords = ['projects', 'boards', 'lists', 'workspaces', 'project list'];
        return keywords.some(k => input.includes(k));
    }
    isBatchRequest(input) {
        const keywords = ['batch', 'multiple', 'bulk', 'several tasks', 'many tasks'];
        return keywords.some(k => input.includes(k));
    }
    /**
     * Extract task details using AI
     */
    async extractTaskDetails(input) {
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
            const result = await openai_service_1.OpenAIService.complete({
                prompt: extractionPrompt,
                temperature: 0.3,
                maxTokens: 300,
            });
            return JSON.parse(result.content);
        }
        catch (error) {
            logger_1.logger.warn({ error, input }, 'AI task extraction failed, using fallback');
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
    async handleCreateTask(userId, input) {
        try {
            const taskDetails = await this.extractTaskDetails(input);
            if (!taskDetails.title) {
                return {
                    success: false,
                    message: 'Please provide a title for the task.',
                    action: 'provide_title',
                };
            }
            const result = await task_tools_1.TaskTools.createTask(userId, taskDetails.title, taskDetails.description, taskDetails.dueDate, taskDetails.priority, taskDetails.provider || 'google_tasks', taskDetails.projectName, taskDetails.assignee);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Task "${taskDetails.title}" created successfully!`,
                task: result,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
            logger_1.logger.error({ error, userId }, 'Create task failed');
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
    async handleListTasks(userId, input) {
        try {
            let status;
            if (input.includes('completed') || input.includes('done') || input.includes('finished')) {
                status = 'completed';
            }
            else if (input.includes('pending') || input.includes('open') || input.includes('active')) {
                status = 'pending';
            }
            const providerMatch = input.match(/in\s+(google tasks|asana|monday)/i);
            const provider = providerMatch?.[1]?.toLowerCase().replace(' ', '_');
            const limit = parseInt(input.match(/(\d+)\s+tasks?/i)?.[1] || '20');
            const result = await task_tools_1.TaskTools.listTasks(userId, status, provider, limit);
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to list tasks';
            logger_1.logger.error({ error, userId }, 'List tasks failed');
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
    async handleCompleteTask(userId, input) {
        try {
            const taskIdMatch = input.match(/(?:complete|finish|done)\s+(?:task|id)?[:\s]+([a-zA-Z0-9_-]+)/i);
            if (!taskIdMatch) {
                // Show pending tasks
                const tasks = await task_tools_1.TaskTools.listTasks(userId, 'pending', undefined, 5);
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
            const result = await task_tools_1.TaskTools.completeTask(userId, taskIdMatch[1]);
            return {
                ...result,
                success: result.success,
                message: result.success ? 'Task completed successfully!' : 'Failed to complete task',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to complete task';
            logger_1.logger.error({ error, userId }, 'Complete task failed');
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
    async handleDeleteTask(userId, input) {
        try {
            const taskIdMatch = input.match(/(?:delete|remove|trash)\s+(?:task|id)?[:\s]+([a-zA-Z0-9_-]+)/i);
            if (!taskIdMatch) {
                return {
                    success: false,
                    message: 'Please specify which task to delete.',
                    action: 'specify_task',
                };
            }
            const result = await task_tools_1.TaskTools.deleteTask(userId, taskIdMatch[1]);
            return {
                ...result,
                success: result.success,
                message: result.success ? 'Task deleted successfully!' : 'Failed to delete task',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
            logger_1.logger.error({ error, userId }, 'Delete task failed');
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
    async handleUpdateTask(userId, input) {
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
            const result = await task_tools_1.TaskTools.updateTask(userId, taskIdMatch[1], updates.title, updates.description, updates.dueDate, updates.priority, undefined, updates.provider, updates.assignee);
            return {
                success: result.success,
                message: result.success ? 'Task updated successfully!' : 'Failed to update task',
                ...result,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
            logger_1.logger.error({ error, userId }, 'Update task failed');
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
    async handleTaskSummary(userId, input) {
        try {
            const result = await task_tools_1.TaskTools.getTaskSummary(userId);
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
            if (summary.overdue > 0)
                message += `${summary.overdue} overdue! `;
            if (summary.dueToday > 0)
                message += `${summary.dueToday} due today. `;
            return {
                success: true,
                message,
                summary,
                byProvider: result.byProvider,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to get task summary';
            logger_1.logger.error({ error, userId }, 'Task summary failed');
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
    async handleListProjects(userId, input) {
        try {
            const providerMatch = input.match(/in\s+(asana|monday|google tasks)/i);
            const provider = providerMatch?.[1]?.toLowerCase().replace(' ', '_');
            const result = await task_tools_1.TaskTools.getProjects(userId, provider);
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to list projects';
            logger_1.logger.error({ error, userId }, 'List projects failed');
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
    async handleBatchCreate(userId, input) {
        try {
            const tasksMatch = input.match(/tasks?:?\s*\[([^\]]+)\]/i);
            let tasks = [];
            if (tasksMatch) {
                tasks = tasksMatch[1].split(',').map(t => ({ title: t.trim().replace(/["']/g, '') }));
            }
            else {
                // Try to extract with AI
                const extractionPrompt = `
Extract tasks from this request as a JSON array of task objects with "title" field:
"${input}"

Return ONLY valid JSON array.`;
                const result = await openai_service_1.OpenAIService.complete({
                    prompt: extractionPrompt,
                    temperature: 0.3,
                    maxTokens: 500,
                });
                try {
                    tasks = JSON.parse(result.content);
                }
                catch {
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
            const result = await task_tools_1.TaskTools.batchCreateTasks(userId, tasks);
            return {
                success: result.successful > 0,
                message: `Created ${result.successful} of ${result.total} tasks`,
                successful: result.successful,
                failed: result.failed,
                results: result.results,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Batch create failed';
            logger_1.logger.error({ error, userId }, 'Batch create failed');
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
    async getConnectedProviders(userId) {
        const providers = [];
        const gtClient = await this.getGoogleTasksClient(userId);
        if (gtClient)
            providers.push('google_tasks');
        const asanaClient = await this.getAsanaClient(userId);
        if (asanaClient)
            providers.push('asana');
        const mondayClient = await this.getMondayClient(userId);
        if (mondayClient)
            providers.push('monday');
        return providers;
    }
    /**
     * Execute with streaming support
     */
    async executeStream(request, context, onChunk) {
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
        }
        catch (error) {
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
exports.TaskAgent = TaskAgent;
//# sourceMappingURL=task.agent.js.map