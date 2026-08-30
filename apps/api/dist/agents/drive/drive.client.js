"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/drive/drive.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class DriveClient {
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
            baseURL: api_config_1.apiConfig.google.drive.apiUrl,
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: api_config_1.apiConfig.timeouts.fileUpload,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Drive API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Drive API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('Drive token expired or invalid');
            }
            else if (error.response?.status === 403) {
                logger_1.logger.error('Drive access denied - insufficient permissions');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Drive rate limit exceeded');
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
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Drive API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async listFiles(options = {}) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {
                pageSize: options.pageSize || 100,
                fields: options.fields || 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,starred,trashed,description,version,capabilities,shared),nextPageToken,incompleteSearch',
                supportsAllDrives: options.supportsAllDrives !== false,
            };
            if (options.pageToken)
                params.pageToken = options.pageToken;
            if (options.q)
                params.q = options.q;
            if (options.orderBy)
                params.orderBy = options.orderBy;
            if (options.driveId)
                params.driveId = options.driveId;
            if (options.corpora)
                params.corpora = options.corpora;
            if (options.includeItemsFromAllDrives !== undefined)
                params.includeItemsFromAllDrives = options.includeItemsFromAllDrives;
            const response = await this.client.get('/files', { params });
            return response.data;
        }, 'listFiles');
    }
    async getFile(fileId, fields) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const params = {
                supportsAllDrives: true,
            };
            if (fields)
                params.fields = fields;
            const response = await this.client.get(`/files/${fileId}`, { params });
            return response.data;
        }, `getFile(${fileId})`);
    }
    async uploadFile(options) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const metadata = {
                name: options.name,
                mimeType: options.mimeType || 'application/octet-stream',
            };
            if (options.parents && options.parents.length > 0)
                metadata.parents = options.parents;
            if (options.description)
                metadata.description = options.description;
            if (options.properties)
                metadata.properties = options.properties;
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            let contentBlob;
            if (Buffer.isBuffer(options.content)) {
                contentBlob = new Blob([options.content], { type: metadata.mimeType });
            }
            else if (typeof options.content === 'string') {
                contentBlob = new Blob([options.content], { type: metadata.mimeType });
            }
            else {
                throw new Error('Unsupported content type');
            }
            formData.append('file', contentBlob, options.name);
            const response = await this.client.post('/files', formData, {
                headers: { 'Content-Type': 'multipart/related' },
                params: {
                    uploadType: 'multipart',
                    supportsAllDrives: true,
                },
            });
            return response.data;
        }, `uploadFile(${options.name})`);
    }
    async downloadFile(fileId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/files/${fileId}`, {
                params: { alt: 'media', supportsAllDrives: true },
                responseType: 'arraybuffer',
            });
            return Buffer.from(response.data);
        }, `downloadFile(${fileId})`);
    }
    async deleteFile(fileId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/files/${fileId}`, {
                params: { supportsAllDrives: true },
            });
        }, `deleteFile(${fileId})`);
    }
    async trashFile(fileId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.patch(`/files/${fileId}`, { trashed: true }, {
                params: { supportsAllDrives: true },
            });
            return response.data;
        }, `trashFile(${fileId})`);
    }
    async restoreFile(fileId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.patch(`/files/${fileId}`, { trashed: false }, {
                params: { supportsAllDrives: true },
            });
            return response.data;
        }, `restoreFile(${fileId})`);
    }
    async updateFile(fileId, updates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.patch(`/files/${fileId}`, updates, {
                params: { supportsAllDrives: true },
            });
            return response.data;
        }, `updateFile(${fileId})`);
    }
    async copyFile(fileId, newName) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const body = { supportsAllDrives: true };
            if (newName)
                body.name = newName;
            const response = await this.client.post(`/files/${fileId}/copy`, body);
            return response.data;
        }, `copyFile(${fileId})`);
    }
    async createFolder(name, parentId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const metadata = {
                name,
                mimeType: 'application/vnd.google-apps.folder',
            };
            if (parentId)
                metadata.parents = [parentId];
            const response = await this.client.post('/files', metadata, {
                params: { supportsAllDrives: true },
            });
            return response.data;
        }, `createFolder(${name})`);
    }
    async moveFile(fileId, newParentId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const file = await this.getFile(fileId);
            const previousParents = file.parents?.join(',') || '';
            const response = await this.client.patch(`/files/${fileId}`, null, {
                params: {
                    addParents: newParentId,
                    removeParents: previousParents,
                    supportsAllDrives: true,
                },
            });
            return response.data;
        }, `moveFile(${fileId})`);
    }
    async searchFiles(options) {
        let query = options.query;
        if (options.query && !options.query.includes('trashed')) {
            query = `(${query}) and trashed = false`;
        }
        return this.listFiles({
            q: query,
            pageSize: options.pageSize,
            pageToken: options.pageToken,
            orderBy: options.orderBy,
            fields: options.fields,
            corpora: options.corpora,
            driveId: options.driveId,
            includeItemsFromAllDrives: options.includeItemsFromAllDrives,
            supportsAllDrives: options.supportsAllDrives,
        });
    }
    async getPermissions(fileId) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/files/${fileId}/permissions`, {
                params: { supportsAllDrives: true },
            });
            return response.data.permissions || [];
        }, `getPermissions(${fileId})`);
    }
    async createPermission(fileId, permission) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.post(`/files/${fileId}/permissions`, permission, {
                params: {
                    sendNotificationEmail: permission.sendNotificationEmail || false,
                    supportsAllDrives: true,
                },
            });
            return response.data;
        }, `createPermission(${fileId})`);
    }
    async updatePermission(fileId, permissionId, updates) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.patch(`/files/${fileId}/permissions/${permissionId}`, updates, {
                params: { supportsAllDrives: true },
            });
            return response.data;
        }, `updatePermission(${fileId})`);
    }
    async deletePermission(fileId, permissionId) {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete(`/files/${fileId}/permissions/${permissionId}`, {
                params: { supportsAllDrives: true },
            });
        }, `deletePermission(${fileId})`);
    }
    async getAbout() {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/about', {
                params: { fields: 'user,storageQuota,maxImportSizes' },
            });
            return response.data;
        }, 'getAbout');
    }
    async getStorageQuota() {
        const about = await this.getAbout();
        return about.storageQuota;
    }
    async exportFile(fileId, mimeType) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get(`/files/${fileId}/export`, {
                params: { mimeType },
                responseType: 'arraybuffer',
            });
            return Buffer.from(response.data);
        }, `exportFile(${fileId})`);
    }
    async emptyTrash() {
        await this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            await this.client.delete('/files/trash');
        }, 'emptyTrash');
    }
    async generateIds(count = 1) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/files/generateIds', { params: { count } });
            return response.data.ids || [];
        }, `generateIds(${count})`);
    }
}
exports.DriveClient = DriveClient;
//# sourceMappingURL=drive.client.js.map