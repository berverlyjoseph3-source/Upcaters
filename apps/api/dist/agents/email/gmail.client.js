"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/email/gmail.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class GmailClient {
    constructor(accessToken) {
        this.client = null;
        this.accessToken = '';
        this.userId = 'me';
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.accessToken = accessToken;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.google.gmail.apiUrl,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        // Request interceptor for logging
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Gmail API request');
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Gmail API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Gmail token expired or invalid');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Gmail rate limit exceeded, will retry');
            }
            throw error;
        });
    }
    /**
     * Update access token
     */
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
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Gmail API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    /**
     * Get user profile
     */
    async getProfile() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/profile`);
            return response.data;
        }, 'getProfile');
    }
    /**
     * List messages
     */
    async listMessages(params) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/messages`, { params });
            return response.data;
        }, 'listMessages');
    }
    /**
     * Get a specific message
     */
    async getMessage(messageId, format = 'full') {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/messages/${messageId}`, {
                params: { format },
            });
            return response.data;
        }, `getMessage(${messageId})`);
    }
    /**
     * Send a message
     */
    async sendMessage(rawMessage, threadId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const body = { raw: rawMessage };
            if (threadId)
                body.threadId = threadId;
            const response = await this.client.post(`/${this.userId}/messages/send`, body);
            return response.data;
        }, 'sendMessage');
    }
    /**
     * Create a draft
     */
    async createDraft(rawMessage, threadId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const body = { message: { raw: rawMessage } };
            if (threadId)
                body.message.threadId = threadId;
            const response = await this.client.post(`/${this.userId}/drafts`, body);
            return response.data;
        }, 'createDraft');
    }
    /**
     * Update a draft
     */
    async updateDraft(draftId, rawMessage) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.put(`/${this.userId}/drafts/${draftId}`, {
                message: { raw: rawMessage },
            });
            return response.data;
        }, `updateDraft(${draftId})`);
    }
    /**
     * Delete a message permanently
     */
    async deleteMessage(messageId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/${this.userId}/messages/${messageId}`);
        }, `deleteMessage(${messageId})`);
    }
    /**
     * Move message to trash
     */
    async trashMessage(messageId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/${this.userId}/messages/${messageId}/trash`);
        }, `trashMessage(${messageId})`);
    }
    /**
     * Remove message from trash
     */
    async untrashMessage(messageId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/${this.userId}/messages/${messageId}/untrash`);
        }, `untrashMessage(${messageId})`);
    }
    /**
     * Modify message labels
     */
    async modifyMessage(messageId, addLabelIds, removeLabelIds) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/${this.userId}/messages/${messageId}/modify`, {
                addLabelIds,
                removeLabelIds,
            });
        }, `modifyMessage(${messageId})`);
    }
    /**
     * Batch modify messages
     */
    async batchModifyMessages(ids, addLabelIds, removeLabelIds) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/${this.userId}/messages/batchModify`, {
                ids,
                addLabelIds,
                removeLabelIds,
            });
        }, `batchModifyMessages(${ids.length} messages)`);
    }
    /**
     * Get all labels
     */
    async getLabels() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/labels`);
            return response.data.labels || [];
        }, 'getLabels');
    }
    /**
     * Create a label
     */
    async createLabel(name, messageListVisibility = 'show', labelListVisibility = 'labelShow') {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/${this.userId}/labels`, {
                name,
                messageListVisibility,
                labelListVisibility,
            });
            return response.data;
        }, `createLabel(${name})`);
    }
    /**
     * Delete a label
     */
    async deleteLabel(labelId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/${this.userId}/labels/${labelId}`);
        }, `deleteLabel(${labelId})`);
    }
    /**
     * Update a label
     */
    async updateLabel(labelId, updates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.put(`/${this.userId}/labels/${labelId}`, updates);
            return response.data;
        }, `updateLabel(${labelId})`);
    }
    /**
     * Search messages
     */
    async searchMessages(query, maxResults = 20) {
        return this.listMessages({ q: query, maxResults });
    }
    /**
     * Mark message as read
     */
    async markAsRead(messageId) {
        await this.modifyMessage(messageId, [], ['UNREAD']);
    }
    /**
     * Mark message as unread
     */
    async markAsUnread(messageId) {
        await this.modifyMessage(messageId, ['UNREAD'], []);
    }
    /**
     * Archive message (remove from inbox)
     */
    async archiveMessage(messageId) {
        await this.modifyMessage(messageId, [], ['INBOX']);
    }
    /**
     * Star message
     */
    async starMessage(messageId) {
        await this.modifyMessage(messageId, ['STARRED'], []);
    }
    /**
     * Unstar message
     */
    async unstarMessage(messageId) {
        await this.modifyMessage(messageId, [], ['STARRED']);
    }
    /**
     * Get attachment
     */
    async getAttachment(messageId, attachmentId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/messages/${messageId}/attachments/${attachmentId}`, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        }, `getAttachment(${messageId}, ${attachmentId})`);
    }
    /**
     * Get thread
     */
    async getThread(threadId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/threads/${threadId}`);
            return response.data;
        }, `getThread(${threadId})`);
    }
    /**
     * List threads
     */
    async listThreads(params) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/${this.userId}/threads`, { params });
            return response.data;
        }, 'listThreads');
    }
    /**
     * Delete a thread
     */
    async deleteThread(threadId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/${this.userId}/threads/${threadId}`);
        }, `deleteThread(${threadId})`);
    }
    /**
     * Modify thread labels
     */
    async modifyThread(threadId, addLabelIds, removeLabelIds) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.post(`/${this.userId}/threads/${threadId}/modify`, {
                addLabelIds,
                removeLabelIds,
            });
        }, `modifyThread(${threadId})`);
    }
}
exports.GmailClient = GmailClient;
//# sourceMappingURL=gmail.client.js.map