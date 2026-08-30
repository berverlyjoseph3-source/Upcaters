"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleTasksClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/task/googletasks.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class GoogleTasksClient {
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
            baseURL: api_config_1.apiConfig.google.tasks.apiUrl,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Google Tasks API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Google Tasks API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Google Tasks token expired or invalid');
            }
            else if (error.response?.status === 403) {
                logger_1.logger.error('Google Tasks access denied');
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
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Google Tasks API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async listTaskLists(params) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/users/@me/lists', { params });
            return response.data;
        }, 'listTaskLists');
    }
    async getTaskList(taskListId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/users/@me/lists/${taskListId}`);
            return response.data;
        }, `getTaskList(${taskListId})`);
    }
    async createTaskList(title) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post('/users/@me/lists', { title });
            return response.data;
        }, `createTaskList(${title})`);
    }
    async updateTaskList(taskListId, title) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.put(`/users/@me/lists/${taskListId}`, { title });
            return response.data;
        }, `updateTaskList(${taskListId})`);
    }
    async deleteTaskList(taskListId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/users/@me/lists/${taskListId}`);
        }, `deleteTaskList(${taskListId})`);
    }
    async listTasks(taskListId, params) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/lists/${taskListId}/tasks`, { params });
            return response.data;
        }, `listTasks(${taskListId})`);
    }
    async getTask(taskListId, taskId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/lists/${taskListId}/tasks/${taskId}`);
            return response.data;
        }, `getTask(${taskListId}, ${taskId})`);
    }
    async createTask(taskListId, task) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/lists/${taskListId}/tasks`, task);
            return response.data;
        }, `createTask(${taskListId})`);
    }
    async updateTask(taskListId, taskId, task) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.put(`/lists/${taskListId}/tasks/${taskId}`, task);
            return response.data;
        }, `updateTask(${taskListId}, ${taskId})`);
    }
    async patchTask(taskListId, taskId, updates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.patch(`/lists/${taskListId}/tasks/${taskId}`, updates);
            return response.data;
        }, `patchTask(${taskListId}, ${taskId})`);
    }
    async deleteTask(taskListId, taskId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/lists/${taskListId}/tasks/${taskId}`);
        }, `deleteTask(${taskListId}, ${taskId})`);
    }
    async completeTask(taskListId, taskId) {
        return this.patchTask(taskListId, taskId, { status: 'completed' });
    }
    async uncompleteTask(taskListId, taskId) {
        return this.patchTask(taskListId, taskId, { status: 'needsAction' });
    }
    async clearTasks(taskListId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/lists/${taskListId}/clear`);
        }, `clearTasks(${taskListId})`);
    }
    async moveTask(taskListId, taskId, parent, previous) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {};
            if (parent)
                params.parent = parent;
            if (previous)
                params.previous = previous;
            const response = await this.client.post(`/lists/${taskListId}/tasks/${taskId}/move`, null, { params });
            return response.data;
        }, `moveTask(${taskListId}, ${taskId})`);
    }
    async batchCreateTasks(taskListId, tasks) {
        const results = [];
        for (const task of tasks) {
            const created = await this.createTask(taskListId, task);
            results.push(created);
        }
        return results;
    }
    async batchDeleteTasks(taskListId, taskIds) {
        await Promise.all(taskIds.map(id => this.deleteTask(taskListId, id).catch(e => logger_1.logger.warn({ error: e, taskId: id }, 'Failed to delete task'))));
    }
    async getDefaultTaskList() {
        const lists = await this.listTaskLists({ maxResults: 1 });
        return lists.items[0] || null;
    }
    async getAllTasks(taskListId, includeCompleted = true) {
        const allTasks = [];
        let pageToken;
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
    async searchTasks(taskListId, query) {
        const allTasks = await this.getAllTasks(taskListId);
        const lowerQuery = query.toLowerCase();
        return allTasks.filter(task => task.title.toLowerCase().includes(lowerQuery) ||
            task.notes?.toLowerCase().includes(lowerQuery));
    }
}
exports.GoogleTasksClient = GoogleTasksClient;
//# sourceMappingURL=googletasks.client.js.map