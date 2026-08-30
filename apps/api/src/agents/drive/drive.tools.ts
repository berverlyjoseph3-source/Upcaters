// enterprise-ai-agent-platform/apps/api/src/agents/drive/drive.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { DriveClient, DriveSearchOptions } from './drive.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { logger } from '../../utils/logger';
import { 
  DriveFile, 
  DriveListOptions, 
  DriveUploadOptions, 
  DriveShareOptions,
  DriveBatchResult,
  DriveQuotaInfo,
  DrivePermission,
} from './drive.types';

export class DriveTools {
  /**
   * List files from Google Drive
   */
  static listFilesTool(): AgentTool {
    return {
      name: 'list_files',
      description: 'List files and folders from Google Drive',
      parameters: [
        { name: 'pageSize', type: 'number', required: false, description: 'Number of files to return (default: 10)' },
        { name: 'query', type: 'string', required: false, description: 'Search query (e.g., "name contains \'report\'")' },
        { name: 'folderId', type: 'string', required: false, description: 'Folder ID to list contents of' },
        { name: 'orderBy', type: 'string', required: false, description: 'Order by field (e.g., "modifiedTime desc")' },
      ],
      execute: async (params, context) => {
        return await this.listFiles(context.userId, {
          pageSize: params.pageSize || 10,
          q: params.query || (params.folderId ? `'${params.folderId}' in parents` : undefined),
          orderBy: params.orderBy || 'modifiedTime desc',
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Search files in Google Drive
   */
  static searchFilesTool(): AgentTool {
    return {
      name: 'search_files',
      description: 'Search for files in Google Drive by name, content, or metadata',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query (supports full text search)' },
        { name: 'mimeType', type: 'string', required: false, description: 'Filter by MIME type (e.g., "application/pdf")' },
        { name: 'pageSize', type: 'number', required: false, description: 'Maximum results to return (default: 20)' },
      ],
      execute: async (params, context) => {
        return await this.searchFiles(context.userId, {
          query: params.query,
          mimeType: params.mimeType,
          pageSize: params.pageSize || 20,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Upload file to Google Drive
   */
  static uploadFileTool(): AgentTool {
    return {
      name: 'upload_file',
      description: 'Upload a file to Google Drive',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Name of the file' },
        { name: 'content', type: 'string', required: true, description: 'File content (base64 encoded or text)' },
        { name: 'mimeType', type: 'string', required: false, description: 'MIME type of the file' },
        { name: 'folderId', type: 'string', required: false, description: 'Folder ID to upload to' },
        { name: 'description', type: 'string', required: false, description: 'File description' },
      ],
      execute: async (params, context) => {
        const content = Buffer.from(params.content, params.content.startsWith('data:') ? 'base64' : 'utf8');
        return await this.uploadFile(context.userId, {
          name: params.name,
          content: content,
          mimeType: params.mimeType || 'application/octet-stream',
          parents: params.folderId ? [params.folderId] : undefined,
          description: params.description,
        });
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Download file from Google Drive
   */
  static downloadFileTool(): AgentTool {
    return {
      name: 'download_file',
      description: 'Download a file from Google Drive',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to download' },
      ],
      execute: async (params, context) => {
        return await this.downloadFile(context.userId, params.fileId);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Delete file from Google Drive
   */
  static deleteFileTool(): AgentTool {
    return {
      name: 'delete_file',
      description: 'Delete a file from Google Drive',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to delete' },
      ],
      execute: async (params, context) => {
        return await this.deleteFile(context.userId, params.fileId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Move file to trash
   */
  static trashFileTool(): AgentTool {
    return {
      name: 'trash_file',
      description: 'Move a file to Google Drive trash',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to trash' },
      ],
      execute: async (params, context) => {
        return await this.trashFile(context.userId, params.fileId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Restore file from trash
   */
  static restoreFileTool(): AgentTool {
    return {
      name: 'restore_file',
      description: 'Restore a file from Google Drive trash',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to restore' },
      ],
      execute: async (params, context) => {
        return await this.restoreFile(context.userId, params.fileId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Share file with user
   */
  static shareFileTool(): AgentTool {
    return {
      name: 'share_file',
      description: 'Share a file with another user',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to share' },
        { name: 'email', type: 'string', required: true, description: 'Email address of the user to share with' },
        { name: 'role', type: 'string', required: true, description: 'Permission role (reader, commenter, writer)' },
        { name: 'sendNotification', type: 'boolean', required: false, description: 'Send email notification' },
      ],
      execute: async (params, context) => {
        return await this.shareFile(context.userId, {
          fileId: params.fileId,
          email: params.email,
          role: params.role as any,
          sendNotificationEmail: params.sendNotification !== false,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get file info
   */
  static getFileInfoTool(): AgentTool {
    return {
      name: 'get_file_info',
      description: 'Get metadata about a file',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file' },
      ],
      execute: async (params, context) => {
        return await this.getFileInfo(context.userId, params.fileId);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Create folder
   */
  static createFolderTool(): AgentTool {
    return {
      name: 'create_folder',
      description: 'Create a new folder in Google Drive',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Name of the folder' },
        { name: 'parentId', type: 'string', required: false, description: 'Parent folder ID' },
      ],
      execute: async (params, context) => {
        return await this.createFolder(context.userId, params.name, params.parentId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Move file to folder
   */
  static moveFileTool(): AgentTool {
    return {
      name: 'move_file',
      description: 'Move a file to a different folder',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to move' },
        { name: 'folderId', type: 'string', required: true, description: 'Destination folder ID' },
      ],
      execute: async (params, context) => {
        return await this.moveFile(context.userId, params.fileId, params.folderId);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Copy file
   */
  static copyFileTool(): AgentTool {
    return {
      name: 'copy_file',
      description: 'Create a copy of a file',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to copy' },
        { name: 'newName', type: 'string', required: false, description: 'Name for the copy' },
      ],
      execute: async (params, context) => {
        return await this.copyFile(context.userId, params.fileId, params.newName);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Rename file
   */
  static renameFileTool(): AgentTool {
    return {
      name: 'rename_file',
      description: 'Rename a file or folder',
      parameters: [
        { name: 'fileId', type: 'string', required: true, description: 'ID of the file to rename' },
        { name: 'newName', type: 'string', required: true, description: 'New name for the file' },
      ],
      execute: async (params, context) => {
        return await this.renameFile(context.userId, params.fileId, params.newName);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Get quota info
   */
  static getQuotaInfoTool(): AgentTool {
    return {
      name: 'get_quota_info',
      description: 'Get Google Drive storage quota information',
      parameters: [],
      execute: async (params, context) => {
        return await this.getQuotaInfo(context.userId);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Batch delete files
   */
  static batchDeleteTool(): AgentTool {
    return {
      name: 'batch_delete',
      description: 'Delete multiple files at once',
      parameters: [
        { name: 'fileIds', type: 'array', required: true, description: 'Array of file IDs to delete' },
      ],
      execute: async (params, context) => {
        return await this.batchDelete(context.userId, params.fileIds);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  /**
   * Get Drive client for a user
   */
  private static async getDriveClient(userId: string): Promise<DriveClient> {
    const accessToken = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_DRIVE);
    if (!accessToken) {
      throw new Error('Google Drive not connected. Please connect your Drive account in Settings.');
    }
    return new DriveClient(accessToken);
  }

  /**
   * List files from Google Drive
   */
  static async listFiles(
    userId: string,
    options: DriveListOptions
  ): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
    try {
      const client = await this.getDriveClient(userId);
      
      logger.info({ userId, options }, 'Listing files');
      
      const result = await client.listFiles({
        pageSize: options.pageSize,
        pageToken: options.pageToken,
        q: options.q,
        orderBy: options.orderBy,
        fields: options.fields,
        driveId: options.driveId,
        includeItemsFromAllDrives: options.includeItemsFromAllDrives,
        supportsAllDrives: options.supportsAllDrives,
      });

      const files: DriveFile[] = (result.files || []).map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size) : 0,
        createdTime: new Date(f.createdTime),
        modifiedTime: new Date(f.modifiedTime),
        parents: f.parents,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        owners: f.owners as any,
        starred: f.starred,
        trashed: f.trashed,
        description: f.description,
        version: f.version,
      }));

      return {
        files,
        nextPageToken: result.nextPageToken,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to list files');
      throw new Error('Failed to list files from Google Drive');
    }
  }

  /**
   * Search files in Google Drive
   */
  static async searchFiles(
    userId: string,
    options: DriveSearchOptions
  ): Promise<DriveFile[]> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, query: options.query }, 'Searching files');

      let query = options.query;
      if (!query.includes('trashed')) {
        query = `(${query}) and trashed = false`;
      }

      const result = await client.searchFiles({
        query,
        pageSize: options.pageSize,
        pageToken: options.pageToken,
        orderBy: options.orderBy,
        fields: options.fields,
        includeItemsFromAllDrives: options.includeItemsFromAllDrives,
        supportsAllDrives: options.supportsAllDrives,
      });

      return (result.files || []).map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size) : 0,
        createdTime: new Date(f.createdTime),
        modifiedTime: new Date(f.modifiedTime),
        parents: f.parents,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink,
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        owners: f.owners as any,
        starred: f.starred,
        trashed: f.trashed,
        description: f.description,
        version: f.version,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to search files');
      throw new Error('Failed to search files in Google Drive');
    }
  }

  /**
   * Upload file to Google Drive
   */
  static async uploadFile(
    userId: string,
    options: DriveUploadOptions
  ): Promise<DriveFile> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, name: options.name, size: options.content.length }, 'Uploading file');

      const file = await client.uploadFile({
        name: options.name,
        content: options.content,
        mimeType: options.mimeType,
        parents: options.parents,
        description: options.description,
        properties: options.properties,
      });

      const result: DriveFile = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        createdTime: new Date(file.createdTime),
        modifiedTime: new Date(file.modifiedTime),
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        owners: file.owners as any,
        starred: file.starred,
        trashed: file.trashed,
        description: file.description,
        version: file.version,
      };

      return result;
    } catch (error) {
      logger.error({ error, userId, name: options.name }, 'Failed to upload file');
      throw new Error(`Failed to upload file "${options.name}" to Google Drive`);
    }
  }

  /**
   * Download file from Google Drive
   */
  static async downloadFile(userId: string, fileId: string): Promise<{ content: Buffer; file: DriveFile }> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, fileId }, 'Downloading file');

      const [fileMeta, content] = await Promise.all([
        client.getFile(fileId),
        client.downloadFile(fileId),
      ]);

      const file: DriveFile = {
        id: fileMeta.id,
        name: fileMeta.name,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size ? parseInt(fileMeta.size) : 0,
        createdTime: new Date(fileMeta.createdTime),
        modifiedTime: new Date(fileMeta.modifiedTime),
        parents: fileMeta.parents,
        webViewLink: fileMeta.webViewLink,
        webContentLink: fileMeta.webContentLink,
        iconLink: fileMeta.iconLink,
        thumbnailLink: fileMeta.thumbnailLink,
        owners: fileMeta.owners as any,
        starred: fileMeta.starred,
        trashed: fileMeta.trashed,
        description: fileMeta.description,
        version: fileMeta.version,
      };

      return { content, file };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to download file');
      throw new Error('Failed to download file from Google Drive');
    }
  }

  /**
   * Delete file from Google Drive
   */
  private static async deleteFile(userId: string, fileId: string): Promise<{ success: boolean }> {
    try {
      const client = await this.getDriveClient(userId);
      await client.deleteFile(fileId);
      
      logger.info({ userId, fileId }, 'File deleted');
      return { success: true };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to delete file');
      throw new Error('Failed to delete file from Google Drive');
    }
  }

  /**
   * Move file to trash
   */
  private static async trashFile(userId: string, fileId: string): Promise<{ success: boolean }> {
    try {
      const client = await this.getDriveClient(userId);
      await client.trashFile(fileId);
      
      logger.info({ userId, fileId }, 'File moved to trash');
      return { success: true };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to trash file');
      throw new Error('Failed to move file to trash');
    }
  }

  /**
   * Restore file from trash
   */
  static async restoreFile(userId: string, fileId: string): Promise<{ success: boolean }> {
    try {
      const client = await this.getDriveClient(userId);
      await client.restoreFile(fileId);
      
      logger.info({ userId, fileId }, 'File restored from trash');
      return { success: true };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to restore file');
      throw new Error('Failed to restore file from trash');
    }
  }

  /**
   * Share file with user
   */
  static async shareFile(
    userId: string,
    options: DriveShareOptions
  ): Promise<DrivePermission> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, fileId: options.fileId, email: options.email, role: options.role }, 'Sharing file');

      const permission = await client.createPermission(options.fileId, {
        type: 'user',
        role: options.role,
        emailAddress: options.email,
        sendNotificationEmail: options.sendNotificationEmail,
      });

      return {
        id: permission.id,
        type: permission.type,
        role: permission.role,
        emailAddress: permission.emailAddress,
        displayName: permission.displayName,
        photoLink: permission.photoLink,
        expirationTime: permission.expirationTime ? new Date(permission.expirationTime) : undefined,
        deleted: permission.deleted,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to share file');
      throw new Error(`Failed to share file with ${options.email}`);
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(userId: string, fileId: string): Promise<DriveFile> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, fileId }, 'Getting file info');

      const fileMeta = await client.getFile(fileId, 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,iconLink,thumbnailLink,owners,permissions,starred,trashed,description,version');

      return {
        id: fileMeta.id,
        name: fileMeta.name,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size ? parseInt(fileMeta.size) : 0,
        createdTime: new Date(fileMeta.createdTime),
        modifiedTime: new Date(fileMeta.modifiedTime),
        parents: fileMeta.parents,
        webViewLink: fileMeta.webViewLink,
        webContentLink: fileMeta.webContentLink,
        iconLink: fileMeta.iconLink,
        thumbnailLink: fileMeta.thumbnailLink,
        owners: fileMeta.owners as any,
        permissions: fileMeta.permissions as any,
        starred: fileMeta.starred,
        trashed: fileMeta.trashed,
        description: fileMeta.description,
        version: fileMeta.version,
      };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to get file info');
      throw new Error('Failed to get file information');
    }
  }

  /**
   * Create folder
   */
  static async createFolder(userId: string, name: string, parentId?: string): Promise<DriveFile> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, name, parentId }, 'Creating folder');

      const folder = await client.createFolder(name, parentId);

      return {
        id: folder.id,
        name: folder.name,
        mimeType: folder.mimeType,
        size: folder.size ? parseInt(folder.size) : 0,
        createdTime: new Date(folder.createdTime),
        modifiedTime: new Date(folder.modifiedTime),
        parents: folder.parents,
        webViewLink: folder.webViewLink,
        webContentLink: folder.webContentLink,
        iconLink: folder.iconLink,
        thumbnailLink: folder.thumbnailLink,
        owners: folder.owners as any,
        starred: folder.starred,
        trashed: folder.trashed,
        description: folder.description,
        version: folder.version,
      };
    } catch (error) {
      logger.error({ error, userId, name }, 'Failed to create folder');
      throw new Error(`Failed to create folder "${name}"`);
    }
  }

  /**
   * Move file to folder
   */
  static async moveFile(userId: string, fileId: string, folderId: string): Promise<DriveFile> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, fileId, folderId }, 'Moving file');

      const file = await client.moveFile(fileId, folderId);

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        createdTime: new Date(file.createdTime),
        modifiedTime: new Date(file.modifiedTime),
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        owners: file.owners as any,
        starred: file.starred,
        trashed: file.trashed,
        description: file.description,
        version: file.version,
      };
    } catch (error) {
      logger.error({ error, userId, fileId, folderId }, 'Failed to move file');
      throw new Error('Failed to move file to folder');
    }
  }

  /**
   * Copy file
   */
  static async copyFile(userId: string, fileId: string, newName?: string): Promise<DriveFile> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, fileId, newName }, 'Copying file');

      const file = await client.copyFile(fileId, newName);

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        createdTime: new Date(file.createdTime),
        modifiedTime: new Date(file.modifiedTime),
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        owners: file.owners as any,
        starred: file.starred,
        trashed: file.trashed,
        description: file.description,
        version: file.version,
      };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to copy file');
      throw new Error('Failed to copy file');
    }
  }

  /**
   * Rename file
   */
  static async renameFile(userId: string, fileId: string, newName: string): Promise<DriveFile> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, fileId, newName }, 'Renaming file');

      const file = await client.updateFile(fileId, { name: newName });

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : 0,
        createdTime: new Date(file.createdTime),
        modifiedTime: new Date(file.modifiedTime),
        parents: file.parents,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        iconLink: file.iconLink,
        thumbnailLink: file.thumbnailLink,
        owners: file.owners as any,
        starred: file.starred,
        trashed: file.trashed,
        description: file.description,
        version: file.version,
      };
    } catch (error) {
      logger.error({ error, userId, fileId }, 'Failed to rename file');
      throw new Error('Failed to rename file');
    }
  }

  /**
   * Get quota info
   */
  static async getQuotaInfo(userId: string): Promise<DriveQuotaInfo> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId }, 'Getting quota info');

      const about = await client.getAbout();
      const quota = about.storageQuota;

      const limit = parseInt(quota.limit) || 15 * 1024 * 1024 * 1024; // 15 GB default
      const usage = parseInt(quota.usage) || 0;
      const usageInDrive = parseInt(quota.usageInDrive) || 0;
      const usageInDriveTrash = parseInt(quota.usageInDriveTrash) || 0;
      const remaining = limit - usage;
      const percentUsed = limit > 0 ? (usage / limit) * 100 : 0;

      return {
        limit,
        usage,
        usageInDrive,
        usageInDriveTrash,
        remaining,
        percentUsed,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get quota info');
      throw new Error('Failed to get storage quota information');
    }
  }

  /**
   * Batch delete files
   */
  static async batchDelete(userId: string, fileIds: string[]): Promise<DriveBatchResult> {
    try {
      const client = await this.getDriveClient(userId);

      logger.info({ userId, count: fileIds.length }, 'Batch deleting files');

      const results: Array<{ id: string; success: boolean; error?: string }> = [];
      let failedCount = 0;

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < fileIds.length; i += batchSize) {
        const batch = fileIds.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (id) => {
            try {
              await client.deleteFile(id);
              return { id, success: true };
            } catch (error) {
              return { 
                id, 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              };
            }
          })
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            if (!result.value.success) failedCount++;
          } else {
            results.push({ id: 'unknown', success: false, error: result.reason?.message });
            failedCount++;
          }
        }
      }

      return {
        success: failedCount === 0,
        processedCount: fileIds.length,
        failedCount,
        results,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to batch delete files');
      throw new Error('Failed to batch delete files');
    }
  }
}