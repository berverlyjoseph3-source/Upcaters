"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveAgent = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/drive/drive.agent.ts
const base_agent_1 = require("../core/base.agent");
const drive_client_1 = require("./drive.client");
const client_1 = require("@prisma/client");
const google_oauth_service_1 = require("../../auth/services/google-oauth.service");
const agent_types_1 = require("../../types/agent.types");
const logger_1 = require("../../utils/logger");
const drive_tools_1 = require("./drive.tools");
class DriveAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(agent_types_1.AgentType.DRIVE, 'Drive Agent', 'File management, search, sharing, and organization across Google Drive', '1.0.0');
    }
    registerTools() {
        this.registerTool(drive_tools_1.DriveTools.listFilesTool());
        this.registerTool(drive_tools_1.DriveTools.searchFilesTool());
        this.registerTool(drive_tools_1.DriveTools.uploadFileTool());
        this.registerTool(drive_tools_1.DriveTools.downloadFileTool());
        this.registerTool(drive_tools_1.DriveTools.deleteFileTool());
        this.registerTool(drive_tools_1.DriveTools.trashFileTool());
        this.registerTool(drive_tools_1.DriveTools.restoreFileTool());
        this.registerTool(drive_tools_1.DriveTools.shareFileTool());
        this.registerTool(drive_tools_1.DriveTools.getFileInfoTool());
        this.registerTool(drive_tools_1.DriveTools.createFolderTool());
        this.registerTool(drive_tools_1.DriveTools.moveFileTool());
        this.registerTool(drive_tools_1.DriveTools.copyFileTool());
        this.registerTool(drive_tools_1.DriveTools.renameFileTool());
        this.registerTool(drive_tools_1.DriveTools.getQuotaInfoTool());
        this.registerTool(drive_tools_1.DriveTools.batchDeleteTool());
    }
    /**
     * Get Drive client for a user
     */
    async getDriveClient(userId) {
        const accessToken = await google_oauth_service_1.GoogleOAuthService.getValidAccessToken(userId, client_1.OAuthProvider.GOOGLE_DRIVE);
        if (!accessToken) {
            throw new Error('Google Drive not connected. Please connect your Drive account in Settings.');
        }
        return new drive_client_1.DriveClient(accessToken);
    }
    /**
     * Check if agent can handle the request
     */
    canHandle(request) {
        const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
        const driveKeywords = [
            'drive', 'file', 'document', 'upload', 'download', 'folder',
            'share', 'google drive', 'pdf', 'spreadsheet', 'presentation',
            'rename', 'copy', 'move', 'delete', 'trash', 'restore',
            'storage', 'quota', 'disk space'
        ];
        return driveKeywords.some(keyword => input.includes(keyword));
    }
    /**
     * Execute drive agent logic
     */
    async doExecute(request, context) {
        const startTime = Date.now();
        const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
        const lowerInput = input.toLowerCase();
        try {
            // Check Drive connection first
            try {
                await this.getDriveClient(context.userId);
            }
            catch (error) {
                return {
                    success: false,
                    message: 'Google Drive is not connected. Please connect your Drive account in Settings.',
                    action: 'connect_drive',
                    error: error instanceof Error ? error.message : 'Connection failed',
                };
            }
            // Handle upload
            if (lowerInput.includes('upload') || lowerInput.includes('save file') || lowerInput.includes('add file')) {
                return await this.handleUpload(context.userId, input);
            }
            // Handle download
            if (lowerInput.includes('download') || lowerInput.includes('get file')) {
                return await this.handleDownload(context.userId, input);
            }
            // Handle share
            if (lowerInput.includes('share') || lowerInput.includes('permission')) {
                return await this.handleShare(context.userId, input);
            }
            // Handle create folder
            if (lowerInput.includes('create folder') || lowerInput.includes('new folder') || lowerInput.includes('make folder')) {
                return await this.handleCreateFolder(context.userId, input);
            }
            // Handle move file
            if (lowerInput.includes('move') && (lowerInput.includes('file') || lowerInput.includes('folder'))) {
                return await this.handleMoveFile(context.userId, input);
            }
            // Handle rename
            if (lowerInput.includes('rename')) {
                return await this.handleRename(context.userId, input);
            }
            // Handle copy
            if (lowerInput.includes('copy') || lowerInput.includes('duplicate')) {
                return await this.handleCopyFile(context.userId, input);
            }
            // Handle delete
            if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('trash')) {
                return await this.handleDelete(context.userId, input);
            }
            // Handle restore
            if (lowerInput.includes('restore') || lowerInput.includes('recover') || lowerInput.includes('undelete')) {
                return await this.handleRestore(context.userId, input);
            }
            // Handle search
            if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look for')) {
                return await this.handleSearch(context.userId, input);
            }
            // Handle quota/storage info
            if (lowerInput.includes('storage') || lowerInput.includes('quota') || lowerInput.includes('space') || lowerInput.includes('capacity')) {
                return await this.handleQuotaInfo(context.userId, input);
            }
            // Handle file info
            if (lowerInput.includes('info') || lowerInput.includes('details') || lowerInput.includes('metadata')) {
                return await this.handleFileInfo(context.userId, input);
            }
            // Default: list files
            return await this.handleListFiles(context.userId, input);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Drive agent execution failed');
            return {
                success: false,
                message: `Failed to process drive request: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle list files
     */
    async handleListFiles(userId, input) {
        try {
            const pageSize = parseInt(input.match(/(\d+)\s+files?/i)?.[1] || '20');
            const folderMatch = input.match(/(?:in|from|folder)\s+["']?([^"']+)["']?/i);
            const query = folderMatch ? `'${folderMatch[1]}' in parents` : undefined;
            const orderMatch = input.match(/order by\s+(\w+)\s*(asc|desc)?/i);
            const orderBy = orderMatch ? `${orderMatch[1]} ${orderMatch[2] || 'desc'}` : 'modifiedTime desc';
            const result = await drive_tools_1.DriveTools.listFiles(userId, {
                pageSize,
                q: query,
                orderBy,
            });
            return {
                success: true,
                message: `Found ${result.files.length} file(s)`,
                files: result.files.map(f => ({
                    id: f.id,
                    name: f.name,
                    mimeType: f.mimeType,
                    size: f.size,
                    modifiedTime: f.modifiedTime,
                    webViewLink: f.webViewLink,
                    parents: f.parents,
                    starred: f.starred,
                    trashed: f.trashed,
                })),
                count: result.files.length,
                hasMore: !!result.nextPageToken,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'List files handling failed');
            return {
                success: false,
                message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle upload file
     */
    async handleUpload(userId, input) {
        try {
            const nameMatch = input.match(/(?:name|called|named)\s+["']?([^"'\n]+)["']?/i);
            const folderMatch = input.match(/(?:in|to|folder)\s+["']?([^"'\n]+)["']?/i);
            const name = nameMatch?.[1] || `file_${Date.now()}.txt`;
            const content = 'Sample file content - replace with actual file upload';
            const result = await drive_tools_1.DriveTools.uploadFile(userId, {
                name,
                content: Buffer.from(content),
                mimeType: 'text/plain',
                parents: folderMatch ? [folderMatch[1]] : undefined,
            });
            return {
                success: true,
                message: `File "${name}" uploaded successfully!`,
                file: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Upload handling failed');
            return {
                success: false,
                message: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle download file
     */
    async handleDownload(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:id|file)[:\s]+([a-zA-Z0-9_-]+)/i);
            if (!fileIdMatch) {
                // Show recent files to choose from
                const files = await drive_tools_1.DriveTools.listFiles(userId, { pageSize: 5 });
                return {
                    success: false,
                    message: 'Please specify which file to download. Here are your recent files:',
                    action: 'select_file',
                    files: files.files.map(f => ({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                    })),
                };
            }
            const result = await drive_tools_1.DriveTools.downloadFile(userId, fileIdMatch[1]);
            return {
                success: true,
                message: `File "${result.file.name}" downloaded successfully!`,
                file: result.file,
                content: result.content.toString('base64'),
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Download handling failed');
            return {
                success: false,
                message: `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle share file
     */
    async handleShare(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:id|file)[:\s]+([a-zA-Z0-9_-]+)/i);
            const emailMatch = input.match(/(?:with|to|email)\s+([^\s]+@[^\s]+)/i);
            const roleMatch = input.match(/(?:as|role)\s+(reader|writer|commenter|viewer|editor)/i);
            if (!fileIdMatch || !emailMatch) {
                return {
                    success: false,
                    message: 'Please specify the file ID and the email address to share with.',
                    action: 'specify_share_details',
                };
            }
            const result = await drive_tools_1.DriveTools.shareFile(userId, {
                fileId: fileIdMatch[1],
                email: emailMatch[1],
                role: roleMatch?.[1] || 'reader',
                sendNotificationEmail: true,
            });
            return {
                success: true,
                message: `File shared with ${emailMatch[1]} as ${roleMatch?.[1] || 'reader'}`,
                permission: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Share handling failed');
            return {
                success: false,
                message: `Failed to share file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle create folder
     */
    async handleCreateFolder(userId, input) {
        try {
            const nameMatch = input.match(/(?:folder|directory)[:\s]+["']?([^"'\n]+)["']?/i);
            const parentMatch = input.match(/(?:in|under|parent)\s+["']?([^"'\n]+)["']?/i);
            const name = nameMatch?.[1] || 'New Folder';
            const result = await drive_tools_1.DriveTools.createFolder(userId, name, parentMatch?.[1]);
            return {
                success: true,
                message: `Folder "${name}" created successfully!`,
                folder: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Create folder handling failed');
            return {
                success: false,
                message: `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle move file
     */
    async handleMoveFile(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:file|id)[:\s]+([a-zA-Z0-9_-]+)/i);
            const folderIdMatch = input.match(/(?:to|folder|destination)[:\s]+([a-zA-Z0-9_-]+)/i);
            if (!fileIdMatch || !folderIdMatch) {
                return {
                    success: false,
                    message: 'Please specify the file ID and destination folder ID.',
                    action: 'specify_move_details',
                };
            }
            const result = await drive_tools_1.DriveTools.moveFile(userId, fileIdMatch[1], folderIdMatch[1]);
            return {
                success: true,
                message: 'File moved successfully!',
                file: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Move file handling failed');
            return {
                success: false,
                message: `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle rename file
     */
    async handleRename(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:file|id)[:\s]+([a-zA-Z0-9_-]+)/i);
            const nameMatch = input.match(/(?:to|name|rename to)\s+["']?([^"'\n]+)["']?/i);
            if (!fileIdMatch || !nameMatch) {
                return {
                    success: false,
                    message: 'Please specify the file ID and new name.',
                    action: 'specify_rename_details',
                };
            }
            const result = await drive_tools_1.DriveTools.renameFile(userId, fileIdMatch[1], nameMatch[1]);
            return {
                success: true,
                message: `File renamed to "${nameMatch[1]}" successfully!`,
                file: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Rename handling failed');
            return {
                success: false,
                message: `Failed to rename file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle copy file
     */
    async handleCopyFile(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:file|id)[:\s]+([a-zA-Z0-9_-]+)/i);
            const nameMatch = input.match(/(?:name|as|called)\s+["']?([^"'\n]+)["']?/i);
            const result = await drive_tools_1.DriveTools.copyFile(userId, fileIdMatch[1], nameMatch?.[1]);
            return {
                success: true,
                message: 'File copied successfully!',
                file: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Copy file handling failed');
            return {
                success: false,
                message: `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle delete file
     */
    async handleDelete(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:file|id)[:\s]+([a-zA-Z0-9_-]+)/gi);
            const fileIds = fileIdMatch?.map(m => m.replace(/.*?([a-zA-Z0-9_-]+)$/, '$1'));
            if (!fileIds || fileIds.length === 0) {
                return {
                    success: false,
                    message: 'Please specify which file(s) to delete.',
                    action: 'specify_files',
                };
            }
            const result = await drive_tools_1.DriveTools.batchDelete(userId, fileIds);
            return {
                success: result.success,
                message: result.success
                    ? `Deleted ${result.processedCount} file(s)`
                    : `Failed to delete some files. Deleted: ${result.processedCount}, Failed: ${result.failedCount}`,
                data: result,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Delete handling failed');
            return {
                success: false,
                message: `Failed to delete files: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle restore file
     */
    async handleRestore(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:file|id)[:\s]+([a-zA-Z0-9_-]+)/i);
            if (!fileIdMatch) {
                return {
                    success: false,
                    message: 'Please specify which file to restore.',
                    action: 'specify_file',
                };
            }
            await drive_tools_1.DriveTools.restoreFile(userId, fileIdMatch[1]);
            return {
                success: true,
                message: 'File restored successfully!',
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Restore handling failed');
            return {
                success: false,
                message: `Failed to restore file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle search files
     */
    async handleSearch(userId, input) {
        try {
            let query = input;
            const actionWords = ['search', 'find', 'look for'];
            for (const word of actionWords) {
                query = query.replace(new RegExp(`^.*${word}\\s+`, 'i'), '');
            }
            const result = await drive_tools_1.DriveTools.searchFiles(userId, {
                query: query.trim(),
                pageSize: 20,
            });
            return {
                success: true,
                message: `Found ${result.length} file(s) matching "${query.trim()}"`,
                files: result.map(f => ({
                    id: f.id,
                    name: f.name,
                    mimeType: f.mimeType,
                    size: f.size,
                    modifiedTime: f.modifiedTime,
                    webViewLink: f.webViewLink,
                })),
                count: result.length,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Search handling failed');
            return {
                success: false,
                message: `Failed to search files: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle quota info
     */
    async handleQuotaInfo(userId, input) {
        try {
            const result = await drive_tools_1.DriveTools.getQuotaInfo(userId);
            const usedGB = (result.usage / (1024 * 1024 * 1024)).toFixed(1);
            const totalGB = (result.limit / (1024 * 1024 * 1024)).toFixed(1);
            const remainingGB = (result.remaining / (1024 * 1024 * 1024)).toFixed(1);
            return {
                success: true,
                message: `You are using ${usedGB}GB of ${totalGB}GB (${result.percentUsed.toFixed(1)}%)`,
                details: {
                    usedGB,
                    totalGB,
                    remainingGB,
                    percentUsed: result.percentUsed,
                    usageInDrive: result.usageInDrive,
                    usageInDriveTrash: result.usageInDriveTrash,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Quota info handling failed');
            return {
                success: false,
                message: `Failed to get storage info: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Handle file info
     */
    async handleFileInfo(userId, input) {
        try {
            const fileIdMatch = input.match(/(?:file|id)[:\s]+([a-zA-Z0-9_-]+)/i);
            if (!fileIdMatch) {
                return {
                    success: false,
                    message: 'Please specify which file to get info for.',
                    action: 'specify_file',
                };
            }
            const result = await drive_tools_1.DriveTools.getFileInfo(userId, fileIdMatch[1]);
            return {
                success: true,
                message: `File "${result.name}" details retrieved`,
                file: {
                    id: result.id,
                    name: result.name,
                    mimeType: result.mimeType,
                    size: result.size,
                    createdTime: result.createdTime,
                    modifiedTime: result.modifiedTime,
                    parents: result.parents,
                    webViewLink: result.webViewLink,
                    owners: result.owners,
                    starred: result.starred,
                    trashed: result.trashed,
                    permissions: result.permissions,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'File info handling failed');
            return {
                success: false,
                message: `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    /**
     * Execute with streaming support
     */
    async executeStream(request, context, onChunk) {
        const startTime = Date.now();
        try {
            onChunk({
                type: 'thought',
                content: 'Checking your Drive connection...',
                timestamp: new Date(),
            });
            const result = await this.doExecute(request, context);
            onChunk({
                type: 'output',
                content: result.message || JSON.stringify(result),
                timestamp: new Date(),
            });
            return {
                id: `drive_${Date.now()}`,
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
                id: `drive_${Date.now()}`,
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
exports.DriveAgent = DriveAgent;
//# sourceMappingURL=drive.agent.js.map