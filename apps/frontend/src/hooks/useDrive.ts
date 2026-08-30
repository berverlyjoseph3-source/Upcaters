// enterprise-ai-agent-platform/apps/frontend/src/hooks/useDrive.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ============================================
// Types
// ============================================

export interface DriveUser {
  id: string;
  emailAddress?: string;
  displayName?: string;
  photoLink?: string;
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
  deleted?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  type: 'file' | 'folder';
  createdTime: Date;
  modifiedTime: Date;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  owners?: DriveUser[];
  permissions?: DrivePermission[];
  starred: boolean;
  trashed: boolean;
  description?: string;
  version?: string;
  fileExtension?: string;
  md5Checksum?: string;
  shared?: boolean;
  capabilities?: Record<string, boolean>;
}

export interface DriveListOptions {
  pageSize?: number;
  pageToken?: string;
  query?: string;
  orderBy?: string;
  folderId?: string;
  includeTrashed?: boolean;
  driveId?: string;
}

export interface DriveUploadOptions {
  name: string;
  content: File | Blob | string;
  mimeType?: string;
  parents?: string[];
  description?: string;
  properties?: Record<string, string>;
}

export interface DriveShareOptions {
  fileId: string;
  email: string;
  role: 'reader' | 'commenter' | 'writer' | 'owner';
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

export interface DriveSearchOptions {
  query: string;
  mimeType?: string;
  pageSize?: number;
  folderId?: string;
  orderBy?: string;
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

export interface DriveViewState {
  currentFolderId: string | null;
  folderPath: Array<{ id: string; name: string }>;
  selectedFileId: string | null;
  isUploaderOpen: boolean;
  isPreviewOpen: boolean;
  isShareDialogOpen: boolean;
  viewMode: 'grid' | 'list';
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  totalFiles: number;
  hasMorePages: boolean;
  isConnected: boolean;
  lastSyncAt: Date | null;
  selectedFileIds: Set<string>;
}

// ============================================
// Hook State Interface
// ============================================

interface UseDriveState extends DriveViewState {
  files: DriveFile[];
  folders: DriveFile[];
  starredFiles: DriveFile[];
  recentFiles: DriveFile[];
  quota: DriveQuotaInfo | null;
  uploadProgress: number;
  isUploading: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

// ============================================
// Hook
// ============================================

export function useDrive() {
  const { isAuthenticated } = useAuthStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // State
  // ============================================

  const [state, setState] = useState<UseDriveState>({
    // View state
    currentFolderId: null,
    folderPath: [],
    selectedFileId: null,
    isUploaderOpen: false,
    isPreviewOpen: false,
    isShareDialogOpen: false,
    viewMode: 'grid',
    searchQuery: '',
    sortBy: 'modifiedTime',
    sortOrder: 'desc',
    currentPage: 1,
    pageSize: 50,
    totalFiles: 0,
    hasMorePages: false,
    isConnected: false,
    lastSyncAt: null,
    selectedFileIds: new Set(),

    // Data
    files: [],
    folders: [],
    starredFiles: [],
    recentFiles: [],
    quota: null,
    uploadProgress: 0,
    isUploading: false,

    // Status
    isLoading: false,
    error: null,
    successMessage: null,
  });

  // ============================================
  // Helpers
  // ============================================

  const updateState = useCallback((partial: Partial<UseDriveState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const clearError = useCallback(() => updateState({ error: null }), [updateState]);
  
  const clearSuccess = useCallback(() => updateState({ successMessage: null }), [updateState]);

  const showSuccess = useCallback((message: string) => {
    updateState({ successMessage: message });
    setTimeout(() => updateState({ successMessage: null }), 3000);
  }, [updateState]);

  // ============================================
  // Connection Check
  // ============================================

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ connected: boolean }>('/api/auth/connected-services');
      const connected = response.data?.connected || false;
      updateState({ isConnected: connected });
      return connected;
    } catch {
      updateState({ isConnected: false });
      return false;
    }
  }, [updateState]);

  // ============================================
  // List Files
  // ============================================

  const fetchFiles = useCallback(async (options?: DriveListOptions) => {
    updateState({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      params.append('pageSize', String(options?.pageSize || state.pageSize));

      if (options?.pageToken) params.append('pageToken', options.pageToken);
      if (options?.query) params.append('q', options.query);
      if (options?.orderBy) params.append('orderBy', options.orderBy);
      if (state.sortBy) params.append('orderBy', `${state.sortBy} ${state.sortOrder}`);
      if (state.searchQuery) params.append('q', `name contains '${state.searchQuery}'`);
      if (state.currentFolderId) {
        params.append('q', `'${state.currentFolderId}' in parents and trashed = false`);
      }
      if (options?.folderId) params.append('folderId', options.folderId);

      const response = await apiClient.get<{
        files: DriveFile[];
        nextPageToken?: string;
      }>(`/api/agent/drive/files?${params.toString()}`);

      if (response.success && response.data) {
        const files = response.data.files.map(f => ({
          ...f,
          createdTime: new Date(f.createdTime),
          modifiedTime: new Date(f.modifiedTime),
          type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' as const : 'file' as const,
        }));

        const folders = files.filter(f => f.type === 'folder');
        const regularFiles = files.filter(f => f.type === 'file');

        updateState({
          files: regularFiles,
          folders,
          totalFiles: files.length,
          hasMorePages: !!response.data.nextPageToken,
          lastSyncAt: new Date(),
        });
      }
    } catch (error) {
      updateState({ error: 'Failed to fetch files' });
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.currentFolderId, state.pageSize, state.sortBy, state.sortOrder, state.searchQuery, updateState]);

  // ============================================
  // Navigate Folders
  // ============================================

  const navigateToFolder = useCallback(async (folderId: string, folderName: string) => {
    setState(prev => ({
      ...prev,
      currentFolderId: folderId,
      folderPath: [...prev.folderPath, { id: folderId, name: folderName }],
      selectedFileId: null,
      currentPage: 1,
    }));
  }, []);

  const navigateUp = useCallback(async () => {
    setState(prev => {
      const newPath = [...prev.folderPath];
      newPath.pop();
      return {
        ...prev,
        currentFolderId: newPath.length > 0 ? newPath[newPath.length - 1].id : null,
        folderPath: newPath,
        selectedFileId: null,
        currentPage: 1,
      };
    });
  }, []);

  const navigateToRoot = useCallback(() => {
    updateState({
      currentFolderId: null,
      folderPath: [],
      selectedFileId: null,
      currentPage: 1,
    });
  }, [updateState]);

  // ============================================
  // File Operations
  // ============================================

  const getFileInfo = useCallback(async (fileId: string): Promise<DriveFile | null> => {
    try {
      const response = await apiClient.get<DriveFile>(
        `/api/agent/drive/files/${fileId}?fields=*`
      );
      if (response.success && response.data) {
        return {
          ...response.data,
          createdTime: new Date(response.data.createdTime),
          modifiedTime: new Date(response.data.modifiedTime),
        };
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to get file info' });
      return null;
    }
  }, [updateState]);

  const selectFile = useCallback((fileId: string | null) => {
    updateState({ selectedFileId: fileId, isPreviewOpen: !!fileId });
  }, [updateState]);

  const downloadFile = useCallback(async (fileId: string): Promise<Blob | null> => {
    try {
      const response = await apiClient.get<Blob>(
        `/api/agent/drive/files/${fileId}/download`,
        { responseType: 'blob' } as any
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to download file' });
      return null;
    }
  }, [updateState]);

  const exportFile = useCallback(async (
    fileId: string,
    format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'csv' | 'txt'
  ): Promise<Blob | null> => {
    try {
      const response = await apiClient.get<Blob>(
        `/api/agent/drive/files/${fileId}/export?format=${format}`,
        { responseType: 'blob' } as any
      );
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to export file' });
      return null;
    }
  }, [updateState]);

  // ============================================
  // Upload
  // ============================================

  const uploadFile = useCallback(async (options: DriveUploadOptions): Promise<DriveFile | null> => {
    updateState({ isUploading: true, uploadProgress: 0, error: null });

    try {
      const formData = new FormData();
      formData.append('name', options.name);
      formData.append('content', options.content);
      if (options.mimeType) formData.append('mimeType', options.mimeType);
      if (options.parents) {
        options.parents.forEach(p => formData.append('parents', p));
      }
      if (options.description) formData.append('description', options.description);
      if (state.currentFolderId) formData.append('parents', state.currentFolderId);

      const response = await apiClient.post<DriveFile>(
        '/api/agent/drive/files/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (response.success && response.data) {
        showSuccess('File uploaded successfully!');
        await fetchFiles();
        updateState({ isUploaderOpen: false });
        return response.data;
      }

      updateState({ error: 'Failed to upload file' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to upload file' });
      return null;
    } finally {
      updateState({ isUploading: false, uploadProgress: 0 });
    }
  }, [state.currentFolderId, fetchFiles, showSuccess, updateState]);

  const uploadFolder = useCallback(async (
    files: File[],
    folderName?: string
  ): Promise<boolean> => {
    if (files.length === 0) return false;

    updateState({ isUploading: true, error: null });
    let successCount = 0;

    try {
      // Create folder if name provided
      let folderId = state.currentFolderId;
      if (folderName) {
        const folder = await createFolder(folderName);
        if (folder) folderId = folder.id;
      }

      // Upload files sequentially
      for (const file of files) {
        const result = await uploadFile({
          name: file.name,
          content: file,
          mimeType: file.type || 'application/octet-stream',
          parents: folderId ? [folderId] : undefined,
        });
        if (result) successCount++;
      }

      if (successCount === files.length) {
        showSuccess(`Uploaded ${successCount} files successfully!`);
        return true;
      } else if (successCount > 0) {
        showSuccess(`Uploaded ${successCount} of ${files.length} files`);
        return true;
      }

      return false;
    } catch (error) {
      updateState({ error: 'Failed to upload files' });
      return false;
    } finally {
      updateState({ isUploading: false });
    }
  }, [state.currentFolderId, uploadFile, showSuccess, updateState]);

  // ============================================
  // Folder Operations
  // ============================================

  const createFolder = useCallback(async (
    name: string,
    parentId?: string
  ): Promise<DriveFile | null> => {
    try {
      const response = await apiClient.post<DriveFile>('/api/agent/drive/folders', {
        name,
        parentId: parentId || state.currentFolderId,
      });

      if (response.success && response.data) {
        showSuccess('Folder created successfully!');
        await fetchFiles();
        return response.data;
      }

      return null;
    } catch (error) {
      updateState({ error: 'Failed to create folder' });
      return null;
    }
  }, [state.currentFolderId, fetchFiles, showSuccess, updateState]);

  // ============================================
  // File Modifications
  // ============================================

  const renameFile = useCallback(async (
    fileId: string,
    newName: string
  ): Promise<boolean> => {
    try {
      const response = await apiClient.patch(`/api/agent/drive/files/${fileId}`, {
        name: newName,
      });

      if (response.success) {
        setState(prev => ({
          ...prev,
          files: prev.files.map(f =>
            f.id === fileId ? { ...f, name: newName } : f
          ),
          folders: prev.folders.map(f =>
            f.id === fileId ? { ...f, name: newName } : f
          ),
        }));
        showSuccess('File renamed successfully');
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to rename file' });
      return false;
    }
  }, [showSuccess, updateState]);

  const moveFile = useCallback(async (
    fileId: string,
    destinationFolderId: string
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post(`/api/agent/drive/files/${fileId}/move`, {
        destinationFolderId,
      });

      if (response.success) {
        showSuccess('File moved successfully');
        await fetchFiles();
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to move file' });
      return false;
    }
  }, [fetchFiles, showSuccess, updateState]);

  const copyFile = useCallback(async (
    fileId: string,
    newName?: string
  ): Promise<DriveFile | null> => {
    try {
      const response = await apiClient.post(`/api/agent/drive/files/${fileId}/copy`, {
        name: newName,
      });

      if (response.success && response.data) {
        showSuccess('File copied successfully');
        await fetchFiles();
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to copy file' });
      return null;
    }
  }, [fetchFiles, showSuccess, updateState]);

  // ============================================
  // Trash & Delete
  // ============================================

  const trashFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/api/agent/drive/files/${fileId}/trash`);
      setState(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== fileId),
        folders: prev.folders.filter(f => f.id !== fileId),
      }));
      showSuccess('File moved to trash');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to move file to trash' });
      return false;
    }
  }, [showSuccess, updateState]);

  const restoreFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/api/agent/drive/files/${fileId}/restore`);
      showSuccess('File restored successfully');
      await fetchFiles();
      return true;
    } catch (error) {
      updateState({ error: 'Failed to restore file' });
      return false;
    }
  }, [fetchFiles, showSuccess, updateState]);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/agent/drive/files/${fileId}`);
      setState(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== fileId),
        folders: prev.folders.filter(f => f.id !== fileId),
      }));
      showSuccess('File permanently deleted');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to delete file' });
      return false;
    }
  }, [showSuccess, updateState]);

  const emptyTrash = useCallback(async (): Promise<boolean> => {
    try {
      await apiClient.post('/api/agent/drive/trash/empty');
      showSuccess('Trash emptied');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to empty trash' });
      return false;
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Batch Operations
  // ============================================

  const batchDelete = useCallback(async (fileIds: string[]): Promise<DriveBatchResult> => {
    try {
      const response = await apiClient.post<DriveBatchResult>(
        '/api/agent/drive/batch-delete',
        { fileIds }
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          files: prev.files.filter(f => !fileIds.includes(f.id)),
          folders: prev.folders.filter(f => !fileIds.includes(f.id)),
        }));
        showSuccess(`Deleted ${response.data.processedCount} files`);
        return response.data;
      }

      return { success: false, processedCount: 0, failedCount: fileIds.length, results: [] };
    } catch (error) {
      updateState({ error: 'Batch delete failed' });
      return { success: false, processedCount: 0, failedCount: fileIds.length, results: [] };
    }
  }, [showSuccess, updateState]);

  const batchMove = useCallback(async (
    fileIds: string[],
    destinationFolderId: string
  ): Promise<DriveBatchResult> => {
    try {
      const response = await apiClient.post<DriveBatchResult>(
        '/api/agent/drive/batch-move',
        { fileIds, destinationFolderId }
      );

      if (response.success && response.data) {
        showSuccess(`Moved ${response.data.processedCount} files`);
        await fetchFiles();
        return response.data;
      }

      return { success: false, processedCount: 0, failedCount: fileIds.length, results: [] };
    } catch (error) {
      updateState({ error: 'Batch move failed' });
      return { success: false, processedCount: 0, failedCount: fileIds.length, results: [] };
    }
  }, [fetchFiles, showSuccess, updateState]);

  // ============================================
  // Sharing
  // ============================================

  const shareFile = useCallback(async (options: DriveShareOptions): Promise<boolean> => {
    try {
      const response = await apiClient.post(
        `/api/agent/drive/files/${options.fileId}/permissions`,
        {
          email: options.email,
          role: options.role,
          sendNotificationEmail: options.sendNotificationEmail ?? true,
          emailMessage: options.emailMessage,
          expirationTime: options.expirationTime?.toISOString(),
        }
      );

      if (response.success) {
        showSuccess(`File shared with ${options.email}`);
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to share file' });
      return false;
    }
  }, [showSuccess, updateState]);

  const removePermission = useCallback(async (
    fileId: string,
    permissionId: string
  ): Promise<boolean> => {
    try {
      await apiClient.delete(
        `/api/agent/drive/files/${fileId}/permissions/${permissionId}`
      );
      showSuccess('Permission removed');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to remove permission' });
      return false;
    }
  }, [showSuccess, updateState]);

  const updatePermission = useCallback(async (
    fileId: string,
    permissionId: string,
    role: 'reader' | 'commenter' | 'writer'
  ): Promise<boolean> => {
    try {
      await apiClient.patch(
        `/api/agent/drive/files/${fileId}/permissions/${permissionId}`,
        { role }
      );
      showSuccess('Permission updated');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to update permission' });
      return false;
    }
  }, [showSuccess, updateState]);

  const getPermissions = useCallback(async (fileId: string): Promise<DrivePermission[]> => {
    try {
      const response = await apiClient.get<DrivePermission[]>(
        `/api/agent/drive/files/${fileId}/permissions`
      );
      return response.success && response.data ? response.data : [];
    } catch (error) {
      return [];
    }
  }, []);

  // ============================================
  // Starred & Recent
  // ============================================

  const toggleStar = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      await apiClient.post(`/api/agent/drive/files/${fileId}/star`);
      setState(prev => ({
        ...prev,
        files: prev.files.map(f =>
          f.id === fileId ? { ...f, starred: !f.starred } : f
        ),
        folders: prev.folders.map(f =>
          f.id === fileId ? { ...f, starred: !f.starred } : f
        ),
      }));
      return true;
    } catch (error) {
      updateState({ error: 'Failed to toggle star' });
      return false;
    }
  }, [updateState]);

  const getStarredFiles = useCallback(async () => {
    try {
      const response = await apiClient.get<DriveFile[]>(
        '/api/agent/drive/files?starred=true'
      );
      if (response.success && response.data) {
        updateState({ starredFiles: response.data });
        return response.data;
      }
      return [];
    } catch (error) {
      updateState({ error: 'Failed to get starred files' });
      return [];
    }
  }, [updateState]);

  const getRecentFiles = useCallback(async (limit: number = 20) => {
    try {
      const response = await apiClient.get<DriveFile[]>(
        `/api/agent/drive/files?orderBy=modifiedTime desc&pageSize=${limit}`
      );
      if (response.success && response.data) {
        updateState({ recentFiles: response.data });
        return response.data;
      }
      return [];
    } catch (error) {
      updateState({ error: 'Failed to get recent files' });
      return [];
    }
  }, [updateState]);

  // ============================================
  // Search & Quota
  // ============================================

  const searchFiles = useCallback(async (options: DriveSearchOptions) => {
    updateState({ searchQuery: options.query, currentPage: 1 });
    await fetchFiles({
      query: options.query,
      pageSize: options.pageSize,
      orderBy: options.orderBy,
    });
  }, [fetchFiles, updateState]);

  const clearSearch = useCallback(() => {
    updateState({ searchQuery: '' });
    fetchFiles();
  }, [fetchFiles, updateState]);

  const getQuotaInfo = useCallback(async (): Promise<DriveQuotaInfo | null> => {
    try {
      const response = await apiClient.get<DriveQuotaInfo>(
        '/api/agent/drive/quota'
      );
      if (response.success && response.data) {
        updateState({ quota: response.data });
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to get quota info' });
      return null;
    }
  }, [updateState]);

  // ============================================
  // View Management
  // ============================================

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    updateState({ viewMode: mode });
  }, [updateState]);

  const setSortOrder = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    updateState({ sortBy, sortOrder, currentPage: 1 });
  }, [updateState]);

  const openUploader = useCallback(() => updateState({ isUploaderOpen: true }), [updateState]);
  const closeUploader = useCallback(() => updateState({ isUploaderOpen: false }), [updateState]);
  const closePreview = useCallback(() => updateState({ isPreviewOpen: false, selectedFileId: null }), [updateState]);
  const openShareDialog = useCallback(() => updateState({ isShareDialogOpen: true }), [updateState]);
  const closeShareDialog = useCallback(() => updateState({ isShareDialogOpen: false }), [updateState]);

  const nextPage = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
  }, []);
  
  const prevPage = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }));
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setState(prev => {
      const newSet = new Set(prev.selectedFileIds);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return { ...prev, selectedFileIds: newSet };
    });
  }, []);

  const selectAllFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFileIds: new Set([...prev.files.map(f => f.id), ...prev.folders.map(f => f.id)]),
    }));
  }, []);

  const clearSelection = useCallback(() => {
    updateState({ selectedFileIds: new Set() });
  }, [updateState]);

  // ============================================
  // Data Refresh
  // ============================================

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchFiles(),
      getQuotaInfo(),
      checkConnection(),
    ]);
  }, [fetchFiles, getQuotaInfo, checkConnection]);

  const startAutoRefresh = useCallback((intervalMs: number = 120000) => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(() => {
      fetchFiles();
      getQuotaInfo();
    }, intervalMs);
  }, [fetchFiles, getQuotaInfo]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // ============================================
  // Initialize
  // ============================================

  const initialize = useCallback(async () => {
    if (!isAuthenticated) return;

    updateState({ isLoading: true });
    const connected = await checkConnection();

    if (connected) {
      await Promise.all([
        fetchFiles(),
        getQuotaInfo(),
        getStarredFiles(),
        getRecentFiles(),
      ]);
    }

    updateState({ isLoading: false });
    startAutoRefresh();
  }, [isAuthenticated, checkConnection, fetchFiles, getQuotaInfo, getStarredFiles, getRecentFiles, startAutoRefresh, updateState]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [stopAutoRefresh]);

  // ============================================
  // Return API
  // ============================================

  return {
    // State
    ...state,

    // Connection
    checkConnection,
    initialize,

    // Files
    fetchFiles,
    getFileInfo,
    selectFile,
    downloadFile,
    exportFile,

    // Navigation
    navigateToFolder,
    navigateUp,
    navigateToRoot,

    // Upload
    uploadFile,
    uploadFolder,
    createFolder,

    // Modifications
    renameFile,
    moveFile,
    copyFile,

    // Trash
    trashFile,
    restoreFile,
    deleteFile,
    emptyTrash,

    // Batch
    batchDelete,
    batchMove,

    // Sharing
    shareFile,
    removePermission,
    updatePermission,
    getPermissions,

    // Starred & Recent
    toggleStar,
    getStarredFiles,
    getRecentFiles,

    // Search & Quota
    searchFiles,
    clearSearch,
    getQuotaInfo,

    // View
    setViewMode,
    setSortOrder,
    openUploader,
    closeUploader,
    closePreview,
    openShareDialog,
    closeShareDialog,
    nextPage,
    prevPage,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,

    // Refresh
    refresh,
    startAutoRefresh,
    stopAutoRefresh,

    // Utilities
    clearError,
    clearSuccess,
    updateState,
  };
}

export default useDrive;