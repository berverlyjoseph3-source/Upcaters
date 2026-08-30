// enterprise-ai-agent-platform/apps/api/src/agents/drive/drive.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Readable } from 'stream';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string; photoLink: string; me: boolean }>;
  permissions?: DrivePermission[];
  starred?: boolean;
  trashed?: boolean;
  explicitlyTrashed?: boolean;
  description?: string;
  version?: string;
  capabilities?: Record<string, boolean>;
  hasThumbnail?: boolean;
  thumbnailVersion?: string;
  isAppAuthorized?: boolean;
  exportLinks?: Record<string, string>;
  fullFileExtension?: string;
  fileExtension?: string;
  md5Checksum?: string;
  shared?: boolean;
  sharedWithMeTime?: string;
}

export interface DrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
  displayName?: string;
  photoLink?: string;
  expirationTime?: string;
  deleted?: boolean;
  pendingOwner?: boolean;
}

export interface DriveFileList {
  files: DriveFile[];
  nextPageToken?: string;
  incompleteSearch: boolean;
}

export interface DriveUploadOptions {
  name: string;
  content: Buffer | Readable | string;
  mimeType?: string;
  parents?: string[];
  description?: string;
  properties?: Record<string, string>;
  useContentAsIndexableText?: boolean;
}

export interface DriveSearchOptions {
  query: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  fields?: string;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
  corpora?: 'user' | 'domain' | 'drive' | 'allDrives';
  driveId?: string;
}

export class DriveClient {
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
      baseURL: apiConfig.google.drive.apiUrl,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.timeouts.fileUpload,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Drive API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Drive API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Drive token expired or invalid');
        } else if (error.response?.status === 403) {
          logger.error('Drive access denied - insufficient permissions');
        } else if (error.response?.status === 429) {
          logger.warn('Drive rate limit exceeded');
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
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Drive API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async listFiles(options: {
    pageSize?: number;
    pageToken?: string;
    q?: string;
    orderBy?: string;
    fields?: string;
    driveId?: string;
    corpora?: string;
    includeItemsFromAllDrives?: boolean;
    supportsAllDrives?: boolean;
  } = {}): Promise<DriveFileList> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {
        pageSize: options.pageSize || 100,
        fields: options.fields || 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,starred,trashed,description,version,capabilities,shared),nextPageToken,incompleteSearch',
        supportsAllDrives: options.supportsAllDrives !== false,
      };
      
      if (options.pageToken) params.pageToken = options.pageToken;
      if (options.q) params.q = options.q;
      if (options.orderBy) params.orderBy = options.orderBy;
      if (options.driveId) params.driveId = options.driveId;
      if (options.corpora) params.corpora = options.corpora;
      if (options.includeItemsFromAllDrives !== undefined) params.includeItemsFromAllDrives = options.includeItemsFromAllDrives;

      const response = await this.client.get('/files', { params });
      return response.data;
    }, 'listFiles');
  }

  async getFile(fileId: string, fields?: string): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {
        supportsAllDrives: true,
      };
      if (fields) params.fields = fields;
      
      const response = await this.client.get(`/files/${fileId}`, { params });
      return response.data;
    }, `getFile(${fileId})`);
  }

  async uploadFile(options: DriveUploadOptions): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');

      const metadata: any = {
        name: options.name,
        mimeType: options.mimeType || 'application/octet-stream',
      };
      if (options.parents && options.parents.length > 0) metadata.parents = options.parents;
      if (options.description) metadata.description = options.description;
      if (options.properties) metadata.properties = options.properties;

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

      let contentBlob: Blob;
      if (Buffer.isBuffer(options.content)) {
        contentBlob = new Blob([options.content], { type: metadata.mimeType });
      } else if (typeof options.content === 'string') {
        contentBlob = new Blob([options.content], { type: metadata.mimeType });
      } else {
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

  async downloadFile(fileId: string): Promise<Buffer> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get(`/files/${fileId}`, {
        params: { alt: 'media', supportsAllDrives: true },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    }, `downloadFile(${fileId})`);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/files/${fileId}`, {
        params: { supportsAllDrives: true },
      });
    }, `deleteFile(${fileId})`);
  }

  async trashFile(fileId: string): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.patch(`/files/${fileId}`, { trashed: true }, {
        params: { supportsAllDrives: true },
      });
      return response.data;
    }, `trashFile(${fileId})`);
  }

  async restoreFile(fileId: string): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.patch(`/files/${fileId}`, { trashed: false }, {
        params: { supportsAllDrives: true },
      });
      return response.data;
    }, `restoreFile(${fileId})`);
  }

  async updateFile(fileId: string, updates: Partial<DriveFile>): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.patch(`/files/${fileId}`, updates, {
        params: { supportsAllDrives: true },
      });
      return response.data;
    }, `updateFile(${fileId})`);
  }

  async copyFile(fileId: string, newName?: string): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const body: any = { supportsAllDrives: true };
      if (newName) body.name = newName;
      const response = await this.client.post(`/files/${fileId}/copy`, body);
      return response.data;
    }, `copyFile(${fileId})`);
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const metadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };
      if (parentId) metadata.parents = [parentId];
      const response = await this.client.post('/files', metadata, {
        params: { supportsAllDrives: true },
      });
      return response.data;
    }, `createFolder(${name})`);
  }

  async moveFile(fileId: string, newParentId: string): Promise<DriveFile> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
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

  async searchFiles(options: DriveSearchOptions): Promise<DriveFileList> {
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

  async getPermissions(fileId: string): Promise<DrivePermission[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/files/${fileId}/permissions`, {
        params: { supportsAllDrives: true },
      });
      return response.data.permissions || [];
    }, `getPermissions(${fileId})`);
  }

  async createPermission(fileId: string, permission: {
    type: 'user' | 'group' | 'domain' | 'anyone';
    role: 'owner' | 'writer' | 'commenter' | 'reader';
    emailAddress?: string;
    domain?: string;
    sendNotificationEmail?: boolean;
    emailMessage?: string;
    expirationTime?: string;
  }): Promise<DrivePermission> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.post(`/files/${fileId}/permissions`, permission, {
        params: {
          sendNotificationEmail: permission.sendNotificationEmail || false,
          supportsAllDrives: true,
        },
      });
      return response.data;
    }, `createPermission(${fileId})`);
  }

  async updatePermission(fileId: string, permissionId: string, updates: Partial<DrivePermission>): Promise<DrivePermission> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.patch(`/files/${fileId}/permissions/${permissionId}`, updates, {
        params: { supportsAllDrives: true },
      });
      return response.data;
    }, `updatePermission(${fileId})`);
  }

  async deletePermission(fileId: string, permissionId: string): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete(`/files/${fileId}/permissions/${permissionId}`, {
        params: { supportsAllDrives: true },
      });
    }, `deletePermission(${fileId})`);
  }

  async getAbout(): Promise<{ user: any; storageQuota: any; maxImportSizes: any }> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/about', {
        params: { fields: 'user,storageQuota,maxImportSizes' },
      });
      return response.data;
    }, 'getAbout');
  }

  async getStorageQuota(): Promise<{ limit: string; usage: string; usageInDrive: string; usageInDriveTrash: string }> {
    const about = await this.getAbout();
    return about.storageQuota;
  }

  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get(`/files/${fileId}/export`, {
        params: { mimeType },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    }, `exportFile(${fileId})`);
  }

  async emptyTrash(): Promise<void> {
    await this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      await this.client.delete('/files/trash');
    }, 'emptyTrash');
  }

  async generateIds(count: number = 1): Promise<string[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      const response = await this.client.get('/files/generateIds', { params: { count } });
      return response.data.ids || [];
    }, `generateIds(${count})`);
  }
}