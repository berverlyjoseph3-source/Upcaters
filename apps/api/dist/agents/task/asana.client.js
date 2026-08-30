"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsanaClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/task/asana.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class AsanaClient {
    constructor(accessToken) {
        this.client = null;
        this.accessToken = '';
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.accessToken = accessToken;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.asana.apiUrl,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Asana API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Asana API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Asana token expired or invalid');
            }
            else if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                logger_1.logger.warn({ retryAfter }, 'Asana rate limit exceeded');
            }
            throw error;
        });
    }
    async updateAccessToken(newToken) {
        this.accessToken = newToken;
        this.initializeClient();
    }
    /**
     * Retry wrapper for API calls
     */
    async retryRequest(fn, context) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.MAX_RETRIES) {
                    const axiosError = error;
                    let delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    if (axiosError.response?.status === 429) {
                        const retryAfter = axiosError.response.headers['retry-after'];
                        delay = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;
                    }
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Asana API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async getWorkspaces() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/workspaces', {
                params: { limit: 100 },
            });
            return response.data.data || [];
        }, 'getWorkspaces');
    }
    async getProjects(workspaceGid, options) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = { limit: options?.limit || 50 };
            if (workspaceGid)
                params.workspace = workspaceGid;
            if (options?.archived !== undefined)
                params.archived = options.archived;
            const response = await this.client.get('/projects', { params });
            return response.data.data || [];
        }, `getProjects(${workspaceGid || 'all'})`);
    }
    async getProject(projectGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/projects/${projectGid}`);
            return response.data.data;
        }, `getProject(${projectGid})`);
    }
    async createProject(data) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('/projects', { data });
            return response.data.data;
        }, `createProject(${data.name})`);
    }
    async createTask(task) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('/tasks', { data: task });
            return response.data.data;
        }, `createTask(${task.name})`);
    }
    async getTask(taskGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/tasks/${taskGid}`);
            return response.data.data;
        }, `getTask(${taskGid})`);
    }
    async updateTask(taskGid, updates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.put(`/tasks/${taskGid}`, { data: updates });
            return response.data.data;
        }, `updateTask(${taskGid})`);
    }
    async deleteTask(taskGid) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/tasks/${taskGid}`);
        }, `deleteTask(${taskGid})`);
    }
    async completeTask(taskGid) {
        return this.updateTask(taskGid, { completed: true });
    }
    async uncompleteTask(taskGid) {
        return this.updateTask(taskGid, { completed: false });
    }
    async getTasks(projectGid, options) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = { project: projectGid, limit: options?.limit || 50 };
            if (options?.completed_since)
                params.completed_since = options.completed_since;
            if (options?.assignee)
                params.assignee = options.assignee;
            if (options?.due_on)
                params.due_on = options.due_on;
            if (options?.due_on_before)
                params.due_on_before = options.due_on_before;
            if (options?.due_on_after)
                params.due_on_after = options.due_on_after;
            if (options?.start_on)
                params.start_on = options.start_on;
            if (options?.modified_since)
                params.modified_since = options.modified_since;
            if (options?.section)
                params.section = options.section;
            if (options?.opt_fields)
                params.opt_fields = options.opt_fields.join(',');
            const response = await this.client.get('/tasks', { params });
            return response.data.data || [];
        }, `getTasks(${projectGid})`);
    }
    async getMyTasks(workspaceGid, assignee) {
        const me = await this.getCurrentUser();
        return this.getTasks(workspaceGid, { assignee: assignee || me.gid });
    }
    async getSubtasks(taskGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/tasks/${taskGid}/subtasks`);
            return response.data.data || [];
        }, `getSubtasks(${taskGid})`);
    }
    async addProjectToTask(taskGid, projectGid) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/tasks/${taskGid}/addProject`, { data: { project: projectGid } });
        }, `addProjectToTask(${taskGid})`);
    }
    async removeProjectFromTask(taskGid, projectGid) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/tasks/${taskGid}/removeProject`, { data: { project: projectGid } });
        }, `removeProjectFromTask(${taskGid})`);
    }
    async addTagToTask(taskGid, tagGid) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/tasks/${taskGid}/addTag`, { data: { tag: tagGid } });
        }, `addTagToTask(${taskGid})`);
    }
    async getCurrentUser() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users/me');
            return response.data.data;
        }, 'getCurrentUser');
    }
    async getUsers(workspaceGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = { limit: 100 };
            if (workspaceGid)
                params.workspace = workspaceGid;
            const response = await this.client.get('/users', { params });
            return response.data.data || [];
        }, `getUsers(${workspaceGid || 'all'})`);
    }
    async getTags(workspaceGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (workspaceGid)
                params.workspace = workspaceGid;
            const response = await this.client.get('/tags', { params });
            return response.data.data || [];
        }, 'getTags');
    }
    async getSections(projectGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/projects/${projectGid}/sections`);
            return response.data.data || [];
        }, `getSections(${projectGid})`);
    }
    async getStories(taskGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/tasks/${taskGid}/stories`);
            return response.data.data || [];
        }, `getStories(${taskGid})`);
    }
    async addComment(taskGid, text, isPinned) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/tasks/${taskGid}/stories`, {
                data: { text, is_pinned: isPinned },
            });
            return response.data.data;
        }, `addComment(${taskGid})`);
    }
    async searchTasks(workspaceGid, query, options) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
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
    async addFollowers(taskGid, followers) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/tasks/${taskGid}/addFollowers`, {
                data: { followers },
            });
            return response.data.data;
        }, `addFollowers(${taskGid})`);
    }
    async setParent(taskGid, parentGid) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/tasks/${taskGid}/setParent`, {
                data: { parent: parentGid },
            });
            return response.data.data;
        }, `setParent(${taskGid})`);
    }
}
exports.AsanaClient = AsanaClient;
//# sourceMappingURL=asana.client.js.map