// apps/frontend/src/services/drive.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  type: 'file' | 'folder';
  size: number;
  createdTime: Date;
  modifiedTime: Date;
  modifiedByMeTime?: Date;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  thumbnailVersion?: string;
  owners?: DriveUser[];
  lastModifyingUser?: DriveUser;
  sharingUser?: DriveUser;
  permissions?: DrivePermission[];
  starred: boolean;
  trashed: boolean;
  explicitlyTrashed?: boolean;
  properties?: Record<string, string>;
  appProperties?: Record<string, string>;
  description?: string;
  version?: string;
  fullFileExtension?: string;
  fileExtension?: string;
  md5Checksum?: string;
  sha1Checksum?: string;
  sha256Checksum?: string;
  headRevisionId?: string;
  capabilities?: {
    canEdit?: boolean;
    canComment?: boolean;
    canShare?: boolean;
    canDelete?: boolean;
    canRename?: boolean;
    canMove?: boolean;
    canCopy?: boolean;
    canDownload?: boolean;
    canTrash?: boolean;
    canUntrash?: boolean;
    canChangeSecurityUpdateEligibility?: boolean;
  };
  viewedByMe?: boolean;
  viewedByMeTime?: Date;
  shared?: boolean;
  sharedWithMeTime?: Date;
  quotaBytesUsed?: number;
  isAppAuthorized?: boolean;
  exportLinks?: Record<string, string>;
  contentHints?: {
    thumbnail?: { image: string; mimeType: string };
    indexableText?: string;
  };
  imageMediaMetadata?: {
    width?: number;
    height?: number;
    rotation?: number;
    location?: { latitude: number; longitude: number; altitude: number };
    time?: string;
    cameraMake?: string;
    cameraModel?: string;
    exposureTime?: number;
    aperture?: number;
    flashUsed?: boolean;
    focalLength?: number;
    iso?: number;
    meteringMode?: string;
    sensor?: string;
    exposureMode?: string;
    colorSpace?: string;
    whiteBalance?: string;
    exposureBias?: number;
    maxApertureValue?: number;
    subjectDistance?: number;
    lens?: string;
  };
  videoMediaMetadata?: {
    width?: number;
    height?: number;
    durationMillis?: number;
  };
}

export interface DriveUser {
  id: string;
  emailAddress?: string;
  displayName?: string;
  photoLink?: string;
  me?: boolean;
  permissionId?: string;
}

export interface DrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  domain?: string;
  displayName?: string;
  photoLink?: string;
  expirationTime?: Date;
  allowFileDiscovery?: boolean;
  deleted?: boolean;
  pendingOwner?: boolean;
  inherited?: boolean;
  inheritedFrom?: string;
  permissionDetails?: Array<{
    permissionType: string;
    role: string;
    inheritedFrom?: string;
    inherited?: boolean;
  }>;
}

export interface DriveListOptions {
  pageSize?: number;
  pageToken?: string;
  q?: string;
  orderBy?: string;
  fields?: string;
  spaces?: 'drive' | 'appDataFolder' | 'photos';
  corpora?: 'user' | 'domain' | 'drive' | 'allDrives';
  driveId?: string;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
  includePermissions?: boolean;
}

export interface DriveUploadOptions {
  name: string;
  content: File | Blob | Buffer;
  mimeType?: string;
  parents?: string[];
  description?: string;
  properties?: Record<string, string>;
  appProperties?: Record<string, string>;
  starred?: boolean;
  useContentAsIndexableText?: boolean;
  keepRevisionForever?: boolean;
  ocrLanguage?: string;
}

export interface DriveSearchOptions {
  query: string;
  mimeType?: string;
  pageSize?: number;
  pageToken?: string;
  orderBy?: string;
  trashFilter?: 'trashed' | 'untrashed' | 'any';
  includePermissions?: boolean;
}

export interface DriveShareOptions {
  fileId: string;
  email: string;
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  sendNotificationEmail?: boolean;
  emailMessage?: string;
  expirationTime?: Date;
}

export interface DriveQuotaInfo {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
  remaining: number;
  percentUsed: number;
}

export interface DriveActivity {
  id: string;
  timestamp: Date;
  actor: DriveUser;
  action: 'create' | 'edit' | 'move' | 'copy' | 'rename' | 'delete' | 'restore' | 'share' | 'unshare' | 'view' | 'download' | 'upload';
  target: {
    type: 'file' | 'folder';
    id: string;
    name: string;
    mimeType?: string;
  };
  details?: Record<string, any>;
}

export interface DriveChange {
  id: string;
  fileId?: string;
  file?: DriveFile;
  removed: boolean;
  time: Date;
  driveId?: string;
  type: 'file' | 'folder';
}

export interface DriveExportOptions {
  fileId: string;
  mimeType: string;
}

export interface DriveBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

export interface DriveFileTree {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  children?: DriveFileTree[];
  parentId?: string;
}

// ============================================
// Drive Service
// ============================================

class DriveService {
  // ============================================
  // List Files
  // ============================================

  static async listFiles(options: DriveListOptions = {}): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    const params: Record<string, any> = {
      pageSize: options.pageSize || 100,
      pageToken: options.pageToken,
      q: options.q,
      orderBy: options.orderBy || 'modifiedTime desc',
      fields: options.fields || 'files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,permissions,starred,trashed,description,version,capabilities,shared,imageMediaMetadata,videoMediaMetadata),nextPageToken',
      spaces: options.spaces || 'drive',
      corpora: options.corpora || 'user',
      driveId: options.driveId,
      includeItemsFromAllDrives: options.includeItemsFromAllDrives,
      supportsAllDrives: options.supportsAllDrives !== false,
    };

    const response = await apiClient.get<{
      files: any[];
      nextPageToken?: string;
    }>('/api/agent/drive/files', { params });

    if (response.success && response.data) {
      return {
        files: response.data.files.map(DriveService.transformFile),
        nextPageToken: response.data.nextPageToken,
      };
    }

    throw new Error(response.error || 'Failed to list files');
  }

  // ============================================
  // Get File
  // ============================================

  static async getFile(
    fileId: string,
    options?: {
      fields?: string;
      includePermissions?: boolean;
      acknowledgeAbuse?: boolean;
    }
  ): Promise<DriveFile> {
    const params: Record<string, any> = {
      fields: options?.fields || '*',
      includePermissions: options?.includePermissions !== false,
      acknowledgeAbuse: options?.acknowledgeAbuse,
      supportsAllDrives: true,
    };

    const response = await apiClient.get<any>(`/api/agent/drive/files/${fileId}`, { params });

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to get file');
  }

  // ============================================
  // Upload File
  // ============================================

  static async uploadFile(options: DriveUploadOptions): Promise<DriveFile> {
    const formData = new FormData();

    // Cast content to Blob for FormData compatibility
    formData.append('file', options.content as Blob, options.name);
    formData.append('name', options.name);

    if (options.mimeType) {
      formData.append('mimeType', options.mimeType);
    }
    if (options.parents && options.parents.length > 0) {
      formData.append('parents', JSON.stringify(options.parents));
    }
    if (options.description) {
      formData.append('description', options.description);
    }
    if (options.properties) {
      formData.append('properties', JSON.stringify(options.properties));
    }
    if (options.appProperties) {
      formData.append('appProperties', JSON.stringify(options.appProperties));
    }
    if (options.starred) {
      formData.append('starred', 'true');
    }
    if (options.useContentAsIndexableText) {
      formData.append('useContentAsIndexableText', 'true');
    }
    if (options.keepRevisionForever) {
      formData.append('keepRevisionForever', 'true');
    }

    const response = await apiClient.post<any>('/api/agent/drive/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to upload file');
  }

  // ============================================
  // Upload Multiple Files
  // ============================================

  static async uploadMultipleFiles(files: DriveUploadOptions[]): Promise<DriveBatchResult> {
    const formData = new FormData();

    files.forEach((file, index) => {
      // Cast content to Blob for FormData compatibility
      formData.append(`files[${index}][file]`, file.content as Blob, file.name);
      formData.append(`files[${index}][name]`, file.name);
      if (file.mimeType) formData.append(`files[${index}][mimeType]`, file.mimeType);
      if (file.parents) formData.append(`files[${index}][parents]`, JSON.stringify(file.parents));
      if (file.description) formData.append(`files[${index}][description]`, file.description);
    });

    const response = await apiClient.post<DriveBatchResult>(
      '/api/agent/drive/files/upload/batch',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to upload files');
  }

  // ============================================
  // Download File
  // ============================================

  static async downloadFile(fileId: string): Promise<{ content: Blob; filename: string; mimeType: string }> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/api/agent/drive/files/${fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] || 'download';
    const mimeType = response.headers.get('Content-Type') || 'application/octet-stream';
    const content = await response.blob();

    return { content, filename, mimeType };
  }

  // ============================================
  // Download and Open File
  // ============================================

  static async getFileContent(fileId: string): Promise<string> {
    const response = await apiClient.get<{ content: string }>(
      `/api/agent/drive/files/${fileId}/content`
    );

    if (response.success && response.data) {
      return response.data.content;
    }

    throw new Error(response.error || 'Failed to get file content');
  }

  // ============================================
  // Delete File
  // ============================================

  static async deleteFile(fileId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/drive/files/${fileId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete file');
    }
  }

  // ============================================
  // Trash File
  // ============================================

  static async trashFile(fileId: string): Promise<DriveFile> {
    const response = await apiClient.post<DriveFile>(`/api/agent/drive/files/${fileId}/trash`);

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to trash file');
  }

  static async untrashFile(fileId: string): Promise<DriveFile> {
    const response = await apiClient.post<DriveFile>(`/api/agent/drive/files/${fileId}/untrash`);

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to restore file');
  }

  // ============================================
  // Empty Trash
  // ============================================

  static async emptyTrash(): Promise<void> {
    const response = await apiClient.post('/api/agent/drive/trash/empty');

    if (!response.success) {
      throw new Error(response.error || 'Failed to empty trash');
    }
  }

  // ============================================
  // Update File
  // ============================================

  static async updateFile(
    fileId: string,
    updates: Partial<Pick<DriveFile, 'name' | 'description' | 'mimeType' | 'starred' | 'properties' | 'appProperties'>>
  ): Promise<DriveFile> {
    const response = await apiClient.patch<DriveFile>(
      `/api/agent/drive/files/${fileId}`,
      updates
    );

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to update file');
  }

  // ============================================
  // Copy File
  // ============================================

  static async copyFile(
    fileId: string,
    newName?: string,
    newParents?: string[]
  ): Promise<DriveFile> {
    const response = await apiClient.post<DriveFile>(`/api/agent/drive/files/${fileId}/copy`, {
      name: newName,
      parents: newParents,
    });

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to copy file');
  }

  // ============================================
  // Move File
  // ============================================

  static async moveFile(
    fileId: string,
    newParentId: string,
    options?: { previousParentId?: string }
  ): Promise<DriveFile> {
    const response = await apiClient.post<DriveFile>(`/api/agent/drive/files/${fileId}/move`, {
      addParents: newParentId,
      removeParents: options?.previousParentId,
    });

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to move file');
  }

  // ============================================
  // Create Folder
  // ============================================

  static async createFolder(
    name: string,
    parentId?: string,
    options?: { properties?: Record<string, string> }
  ): Promise<DriveFile> {
    const response = await apiClient.post<DriveFile>('/api/agent/drive/folders', {
      name,
      parentId,
      properties: options?.properties,
    });

    if (response.success && response.data) {
      return DriveService.transformFile(response.data);
    }

    throw new Error(response.error || 'Failed to create folder');
  }

  // ============================================
  // Search Files
  // ============================================

  static async searchFiles(options: DriveSearchOptions): Promise<DriveFile[]> {
    let query = options.query;

    // Add trash filter
    if (options.trashFilter === 'untrashed') {
      query = `(${query}) and trashed = false`;
    } else if (options.trashFilter === 'trashed') {
      query = `(${query}) and trashed = true`;
    }

    // Add mime type filter
    if (options.mimeType) {
      query = `(${query}) and mimeType = '${options.mimeType}'`;
    }

    const result = await DriveService.listFiles({
      q: query,
      pageSize: options.pageSize || 100,
      pageToken: options.pageToken,
      orderBy: options.orderBy || 'modifiedTime desc',
    });

    return result.files;
  }

  // ============================================
  // Star / Unstar
  // ============================================

  static async starFile(fileId: string): Promise<DriveFile> {
    return DriveService.updateFile(fileId, { starred: true });
  }

  static async unstarFile(fileId: string): Promise<DriveFile> {
    return DriveService.updateFile(fileId, { starred: false });
  }

  // ============================================
  // Batch Operations
  // ============================================

  static async batchDelete(fileIds: string[]): Promise<DriveBatchResult> {
    const results: DriveBatchResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      results: [],
    };

    for (const fileId of fileIds) {
      try {
        await DriveService.deleteFile(fileId);
        results.processedCount++;
        results.results.push({ id: fileId, success: true });
      } catch (err) {
        results.failedCount++;
        results.success = false;
        results.results.push({
          id: fileId,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to delete',
        });
      }
    }

    return results;
  }

  static async batchTrash(fileIds: string[]): Promise<DriveBatchResult> {
    const response = await apiClient.post<DriveBatchResult>(
      '/api/agent/drive/files/batch/trash',
      { fileIds }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to batch trash');
  }

  static async batchMove(
    fileIds: string[],
    newParentId: string
  ): Promise<DriveBatchResult> {
    const response = await apiClient.post<DriveBatchResult>(
      '/api/agent/drive/files/batch/move',
      { fileIds, newParentId }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to batch move');
  }

  // ============================================
  // Permissions
  // ============================================

  static async getPermissions(fileId: string): Promise<DrivePermission[]> {
    const response = await apiClient.get<{ permissions: DrivePermission[] }>(
      `/api/agent/drive/files/${fileId}/permissions`,
      { params: { supportsAllDrives: true } }
    );

    if (response.success && response.data) {
      return response.data.permissions.map(DriveService.transformPermission);
    }

    throw new Error(response.error || 'Failed to get permissions');
  }

  static async shareFile(options: DriveShareOptions): Promise<DrivePermission> {
    const response = await apiClient.post<DrivePermission>(
      `/api/agent/drive/files/${options.fileId}/permissions`,
      {
        type: 'user',
        role: options.role,
        emailAddress: options.email,
        sendNotificationEmail: options.sendNotificationEmail !== false,
        emailMessage: options.emailMessage,
        expirationTime: options.expirationTime?.toISOString(),
      }
    );

    if (response.success && response.data) {
      return DriveService.transformPermission(response.data);
    }

    throw new Error(response.error || 'Failed to share file');
  }

  static async updatePermission(
    fileId: string,
    permissionId: string,
    updates: Partial<Pick<DrivePermission, 'role' | 'expirationTime'>>
  ): Promise<DrivePermission> {
    const response = await apiClient.patch<DrivePermission>(
      `/api/agent/drive/files/${fileId}/permissions/${permissionId}`,
      updates
    );

    if (response.success && response.data) {
      return DriveService.transformPermission(response.data);
    }

    throw new Error(response.error || 'Failed to update permission');
  }

  static async removePermission(fileId: string, permissionId: string): Promise<void> {
    const response = await apiClient.delete(
      `/api/agent/drive/files/${fileId}/permissions/${permissionId}`
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to remove permission');
    }
  }

  // ============================================
  // Quota
  // ============================================

  static async getQuotaInfo(): Promise<DriveQuotaInfo> {
    const response = await apiClient.get<DriveQuotaInfo>('/api/agent/drive/quota');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get quota info');
  }

  // ============================================
  // Activity
  // ============================================

  static async getRecentActivity(
    limit: number = 20,
    pageToken?: string
  ): Promise<{ activities: DriveActivity[]; nextPageToken?: string }> {
    const response = await apiClient.get<{
      activities: any[];
      nextPageToken?: string;
    }>('/api/agent/drive/activity', {
      params: { limit, pageToken },
    });

    if (response.success && response.data) {
      return {
        activities: response.data.activities.map(DriveService.transformActivity),
        nextPageToken: response.data.nextPageToken,
      };
    }

    throw new Error(response.error || 'Failed to get activity');
  }

  // ============================================
  // Changes
  // ============================================

  static async getChanges(
    startPageToken?: string,
    options?: {
      pageSize?: number;
      includeRemoved?: boolean;
      includeItemsFromAllDrives?: boolean;
      driveId?: string;
    }
  ): Promise<{
    changes: DriveChange[];
    newStartPageToken: string;
    nextPageToken?: string;
  }> {
    const response = await apiClient.get<{
      changes: any[];
      newStartPageToken: string;
      nextPageToken?: string;
    }>('/api/agent/drive/changes', {
      params: {
        pageToken: startPageToken,
        pageSize: options?.pageSize || 100,
        includeRemoved: options?.includeRemoved !== false,
        includeItemsFromAllDrives: options?.includeItemsFromAllDrives,
        driveId: options?.driveId,
      },
    });

    if (response.success && response.data) {
      return {
        changes: response.data.changes.map(DriveService.transformChange),
        newStartPageToken: response.data.newStartPageToken,
        nextPageToken: response.data.nextPageToken,
      };
    }

    throw new Error(response.error || 'Failed to get changes');
  }

  static async getStartPageToken(): Promise<string> {
    const response = await apiClient.get<{ startPageToken: string }>(
      '/api/agent/drive/changes/startPageToken'
    );

    if (response.success && response.data) {
      return response.data.startPageToken;
    }

    throw new Error(response.error || 'Failed to get start page token');
  }

  // ============================================
  // Watch Changes
  // ============================================

  static async watchChanges(
    webhookUrl: string,
    pageToken: string
  ): Promise<{ resourceId: string; channelId: string; expiration: string }> {
    const response = await apiClient.post<{
      resourceId: string;
      channelId: string;
      expiration: string;
    }>('/api/agent/drive/changes/watch', {
      webhookUrl,
      pageToken,
      type: 'web_hook',
      address: webhookUrl,
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to setup watch');
  }

  // ============================================
  // Export
  // ============================================

  static async exportFile(
    options: DriveExportOptions
  ): Promise<{ content: Blob; filename: string; mimeType: string }> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(
      `${apiUrl}/api/agent/drive/files/${options.fileId}/export?mimeType=${encodeURIComponent(options.mimeType)}`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const mimeType = response.headers.get('Content-Type') || options.mimeType;
    const contentDisposition = response.headers.get('Content-Disposition');
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch?.[1] || `export.${DriveService.getExtensionForMimeType(mimeType)}`;
    const content = await response.blob();

    return { content, filename, mimeType };
  }

  // ============================================
  // Generate IDs
  // ============================================

  static async generateIds(count: number = 1): Promise<string[]> {
    const response = await apiClient.get<{ ids: string[] }>(
      '/api/agent/drive/generateIds',
      { params: { count } }
    );

    if (response.success && response.data) {
      return response.data.ids;
    }

    throw new Error(response.error || 'Failed to generate IDs');
  }

  // ============================================
  // File Tree
  // ============================================

  static async getFileTree(rootFolderId?: string): Promise<DriveFileTree[]> {
    const params: Record<string, any> = {
      rootFolderId: rootFolderId || 'root',
      maxDepth: 5,
      orderBy: 'name',
    };

    const response = await apiClient.get<{ tree: DriveFileTree[] }>(
      '/api/agent/drive/tree',
      { params }
    );

    if (response.success && response.data) {
      return response.data.tree;
    }

    throw new Error(response.error || 'Failed to get file tree');
  }

  // ============================================
  // Connection
  // ============================================

  static async isConnected(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ connected: boolean }>('/api/agent/drive/status');
      return response.data?.connected || false;
    } catch {
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    const response = await apiClient.delete('/api/agent/drive/disconnect');
    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect');
    }
  }

  // ============================================
  // Transform Helpers
  // ============================================

  private static transformFile(file: any): DriveFile {
    return {
      id: file.id,
      name: file.name || 'Untitled',
      mimeType: file.mimeType || 'application/octet-stream',
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: file.size ? parseInt(file.size, 10) : 0,
      createdTime: new Date(file.createdTime || Date.now()),
      modifiedTime: new Date(file.modifiedTime || Date.now()),
      modifiedByMeTime: file.modifiedByMeTime ? new Date(file.modifiedByMeTime) : undefined,
      parents: file.parents,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      iconLink: file.iconLink,
      thumbnailLink: file.thumbnailLink,
      thumbnailVersion: file.thumbnailVersion,
      owners: file.owners?.map(DriveService.transformUser),
      lastModifyingUser: file.lastModifyingUser ? DriveService.transformUser(file.lastModifyingUser) : undefined,
      sharingUser: file.sharingUser ? DriveService.transformUser(file.sharingUser) : undefined,
      permissions: file.permissions?.map(DriveService.transformPermission),
      starred: file.starred || false,
      trashed: file.trashed || false,
      explicitlyTrashed: file.explicitlyTrashed,
      properties: file.properties,
      appProperties: file.appProperties,
      description: file.description,
      version: file.version,
      fullFileExtension: file.fullFileExtension,
      fileExtension: file.fileExtension,
      md5Checksum: file.md5Checksum,
      sha1Checksum: file.sha1Checksum,
      sha256Checksum: file.sha256Checksum,
      headRevisionId: file.headRevisionId,
      capabilities: file.capabilities,
      viewedByMe: file.viewedByMe,
      viewedByMeTime: file.viewedByMeTime ? new Date(file.viewedByMeTime) : undefined,
      shared: file.shared,
      sharedWithMeTime: file.sharedWithMeTime ? new Date(file.sharedWithMeTime) : undefined,
      quotaBytesUsed: file.quotaBytesUsed,
      isAppAuthorized: file.isAppAuthorized,
      exportLinks: file.exportLinks,
      contentHints: file.contentHints,
      imageMediaMetadata: file.imageMediaMetadata,
      videoMediaMetadata: file.videoMediaMetadata,
    };
  }

  private static transformUser(user: any): DriveUser {
    return {
      id: user.id || user.permissionId || '',
      emailAddress: user.emailAddress,
      displayName: user.displayName,
      photoLink: user.photoLink,
      me: user.me,
      permissionId: user.permissionId,
    };
  }

  private static transformPermission(permission: any): DrivePermission {
    return {
      id: permission.id,
      type: permission.type || 'user',
      role: permission.role || 'reader',
      emailAddress: permission.emailAddress,
      domain: permission.domain,
      displayName: permission.displayName,
      photoLink: permission.photoLink,
      expirationTime: permission.expirationTime ? new Date(permission.expirationTime) : undefined,
      allowFileDiscovery: permission.allowFileDiscovery,
      deleted: permission.deleted,
      pendingOwner: permission.pendingOwner,
      inherited: permission.inherited,
      inheritedFrom: permission.inheritedFrom,
      permissionDetails: permission.permissionDetails,
    };
  }

  private static transformActivity(activity: any): DriveActivity {
    return {
      id: activity.id,
      timestamp: new Date(activity.timestamp || activity.time || Date.now()),
      actor: DriveService.transformUser(activity.actor || activity.primaryActionDetail?.user),
      action: activity.action || activity.primaryActionDetail?.permissionChange?.addedPermissions?.[0]?.role ? 'share' : 'edit',
      target: activity.target || {
        type: activity.targets?.[0]?.driveItem?.mimeType?.includes('folder') ? 'folder' : 'file',
        id: activity.targets?.[0]?.driveItem?.name?.split('/').pop() || '',
        name: activity.targets?.[0]?.driveItem?.name || '',
      },
      details: activity.details,
    };
  }

  private static transformChange(change: any): DriveChange {
    return {
      id: change.id || change.fileId,
      fileId: change.fileId,
      file: change.file ? DriveService.transformFile(change.file) : undefined,
      removed: change.removed || false,
      time: new Date(change.time || Date.now()),
      driveId: change.driveId,
      type: change.file?.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
    };
  }

  // ============================================
  // Utility
  // ============================================

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('spreadsheet')) return '📈';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('xml')) return '💻';
    if (mimeType === 'application/vnd.google-apps.folder') return '📁';
    return '📎';
  }

  static getColorForMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'bg-blue-500';
    if (mimeType.startsWith('video/')) return 'bg-purple-500';
    if (mimeType.startsWith('audio/')) return 'bg-green-500';
    if (mimeType === 'application/pdf') return 'bg-red-500';
    if (mimeType.includes('presentation')) return 'bg-orange-500';
    if (mimeType.includes('spreadsheet')) return 'bg-emerald-500';
    if (mimeType.includes('document')) return 'bg-sky-500';
    if (mimeType === 'application/vnd.google-apps.folder') return 'bg-yellow-500';
    return 'bg-secondary-500';
  }

  static getExtensionForMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'application/json': 'json',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'audio/mp3': 'mp3',
      'application/zip': 'zip',
    };
    return map[mimeType] || 'bin';
  }

  static isPreviewable(mimeType: string): boolean {
    const previewable = [
      'image/', 'video/', 'audio/',
      'application/pdf',
      'text/plain', 'text/csv', 'text/html',
      'application/json',
    ];
    return previewable.some(type => mimeType.startsWith(type));
  }

  static isEditable(mimeType: string): boolean {
    const editable = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'text/plain', 'text/csv',
      'application/json',
    ];
    return editable.includes(mimeType);
  }

  static buildSearchQuery(params: {
    name?: string;
    mimeType?: string;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    createdAfter?: Date;
    createdBefore?: Date;
    owner?: string;
    starred?: boolean;
    trashed?: boolean;
    shared?: boolean;
    parentId?: string;
  }): string {
    const parts: string[] = [];

    if (params.name) parts.push(`name contains '${params.name}'`);
    if (params.mimeType) parts.push(`mimeType = '${params.mimeType}'`);
    if (params.modifiedAfter) parts.push(`modifiedTime > '${params.modifiedAfter.toISOString()}'`);
    if (params.modifiedBefore) parts.push(`modifiedTime < '${params.modifiedBefore.toISOString()}'`);
    if (params.createdAfter) parts.push(`createdTime > '${params.createdAfter.toISOString()}'`);
    if (params.createdBefore) parts.push(`createdTime < '${params.createdBefore.toISOString()}'`);
    if (params.owner) parts.push(`'${params.owner}' in owners`);
    if (params.starred) parts.push('starred = true');
    if (params.trashed !== undefined) parts.push(`trashed = ${params.trashed}`);
    if (params.shared) parts.push('sharedWithMe = true');
    if (params.parentId) parts.push(`'${params.parentId}' in parents`);

    return parts.join(' and ');
  }
}

export default DriveService;
