// enterprise-ai-agent-platform/apps/frontend/src/store/drive.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export interface DriveUser {
  id: string;
  emailAddress?: string;
  displayName?: string;
  photoLink?: string;
  me?: boolean;
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
  sharedWithMeTime?: Date;
  capabilities?: {
    canEdit?: boolean;
    canComment?: boolean;
    canShare?: boolean;
    canDelete?: boolean;
    canDownload?: boolean;
    canMoveItemWithinDrive?: boolean;
    canRename?: boolean;
    canAddChildren?: boolean;
    canRemoveChildren?: boolean;
    canTrash?: boolean;
    canUntrash?: boolean;
  };
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  type: 'folder';
  size: number;
  createdTime: Date;
  modifiedTime: Date;
  parents?: string[];
  webViewLink?: string;
  owners?: DriveUser[];
  permissions?: DrivePermission[];
  starred: boolean;
  trashed: boolean;
  childCount?: number;
  color?: string;
}

export interface DriveQuotaInfo {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
  remaining: number;
  percentUsed: number;
}

export interface DriveUploadOptions {
  name: string;
  content: File;
  mimeType?: string;
  parents?: string[];
  description?: string;
  convertToGoogleDoc?: boolean;
  ocrLanguage?: string;
}

export interface DriveUploadResponse {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

export interface DriveListOptions {
  pageSize?: number;
  pageToken?: string;
  q?: string;
  orderBy?: string;
  folderId?: string;
  includeTrashed?: boolean;
  includeStarred?: boolean;
}

export interface DriveSearchOptions {
  query: string;
  mimeType?: string;
  pageSize?: number;
  folderId?: string;
  isFullText?: boolean;
}

export interface DriveShareOptions {
  fileId: string;
  email: string;
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  sendNotificationEmail?: boolean;
  emailMessage?: string;
  expirationTime?: Date;
}

export interface DriveCreateFolderOptions {
  name: string;
  parentId?: string;
  description?: string;
}

export interface DriveMoveOptions {
  fileId: string;
  newParentId: string;
}

export interface DriveCopyOptions {
  fileId: string;
  newName?: string;
  parentId?: string;
}

export interface DriveRenameOptions {
  fileId: string;
  newName: string;
}

export interface DriveBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

export interface DriveActivity {
  id: string;
  action: 'create' | 'edit' | 'move' | 'copy' | 'rename' | 'delete' | 'restore' | 'share' | 'unshare';
  target: {
    type: 'file' | 'folder';
    id: string;
    name: string;
  };
  actor?: {
    name: string;
    email: string;
  };
  timestamp: Date;
  details?: Record<string, any>;
}

// ============================================
// View & Sort Types
// ============================================

export type DriveView = 'my-drive' | 'shared' | 'starred' | 'trash' | 'recent';
export type DriveViewMode = 'grid' | 'list';
export type DriveSortField = 'name' | 'modifiedTime' | 'size' | 'createdTime';
export type DriveSortDirection = 'asc' | 'desc';

// ============================================
// Store State Interface
// ============================================

interface DriveState {
  // ============================================
  // Data State
  // ============================================
  files: DriveFile[];
  folders: DriveFolder[];
  selectedFileId: string | null;
  currentFolderId: string | null;
  folderPath: Array<{ id: string; name: string }>;
  quotaInfo: DriveQuotaInfo | null;
  recentFiles: DriveFile[];
  activities: DriveActivity[];
  sharedFiles: DriveFile[];

  // ============================================
  // UI State
  // ============================================
  activeView: DriveView;
  viewMode: DriveViewMode;
  isLoading: boolean;
  isUploading: boolean;
  isDownloading: boolean;
  isSharing: boolean;
  isCreating: boolean;
  isMoving: boolean;
  isCopying: boolean;
  isFetchingMore: boolean;
  error: string | null;
  searchQuery: string;
  sortField: DriveSortField;
  sortDirection: DriveSortDirection;
  selectedFileIds: Set<string>;
  nextPageToken: string | null;
  hasMoreFiles: boolean;
  uploadProgress: number;
  uploadQueue: Array<{ file: File; progress: number; status: 'pending' | 'uploading' | 'success' | 'error'; error?: string }>;
  lastSyncTime: Date | null;

  // ============================================
  // Dialog State
  // ============================================
  shareDialogOpen: boolean;
  shareFileId: string | null;
  createFolderDialogOpen: boolean;
  renameDialogOpen: boolean;
  renameFileId: string | null;
  renameFileName: string;
  previewFile: DriveFile | null;
  previewOpen: boolean;

  // ============================================
  // Computed
  // ============================================
  getSelectedFile: () => DriveFile | null;
  getCurrentFolder: () => DriveFolder | null;
  getBreadcrumbs: () => Array<{ id: string; name: string }>;
  getFilteredFiles: () => DriveFile[];
  getFolderFiles: () => DriveFile[];
  getStarredFiles: () => DriveFile[];
  getTrashedFiles: () => DriveFile[];
  getSharedWithMeFiles: () => DriveFile[];
  getRecentFiles: () => DriveFile[];
  getSelectedCount: () => number;
  getTotalStorageUsed: () => string;
  getStoragePercentage: () => number;
  getFileTypeIcon: (mimeType: string) => string;

  // ============================================
  // Actions - File Fetching
  // ============================================
  fetchFiles: (options?: DriveListOptions) => Promise<void>;
  fetchMoreFiles: () => Promise<void>;
  fetchFileById: (fileId: string) => Promise<DriveFile | null>;
  fetchQuotaInfo: () => Promise<void>;
  fetchRecentFiles: () => Promise<void>;
  fetchActivities: () => Promise<void>;
  fetchSharedFiles: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  navigateToFolder: (folderId: string | null) => Promise<void>;
  navigateUp: () => Promise<void>;

  // ============================================
  // Actions - File Operations
  // ============================================
  uploadFile: (options: DriveUploadOptions) => Promise<{ success: boolean; fileId?: string; error?: string }>;
  uploadFiles: (files: File[], parentId?: string) => Promise<void>;
  downloadFile: (fileId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  createFolder: (options: DriveCreateFolderOptions) => Promise<{ success: boolean; folderId?: string; error?: string }>;
  renameFile: (options: DriveRenameOptions) => Promise<{ success: boolean; error?: string }>;
  moveFile: (options: DriveMoveOptions) => Promise<{ success: boolean; error?: string }>;
  copyFile: (options: DriveCopyOptions) => Promise<{ success: boolean; newFileId?: string; error?: string }>;
  deleteFile: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  deleteFiles: (fileIds: string[]) => Promise<DriveBatchResult>;
  trashFile: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  restoreFile: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  toggleStar: (fileId: string) => Promise<void>;
  emptyTrash: () => Promise<{ success: boolean; error?: string }>;

  // ============================================
  // Actions - Sharing
  // ============================================
  shareFile: (options: DriveShareOptions) => Promise<{ success: boolean; permissionId?: string; error?: string }>;
  updatePermission: (fileId: string, permissionId: string, role: string) => Promise<void>;
  removePermission: (fileId: string, permissionId: string) => Promise<void>;
  getFilePermissions: (fileId: string) => Promise<DrivePermission[]>;
  openShareDialog: (fileId: string) => void;
  closeShareDialog: () => void;

  // ============================================
  // Actions - Search
  // ============================================
  searchFiles: (options: DriveSearchOptions) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // ============================================
  // Actions - UI State
  // ============================================
  setActiveView: (view: DriveView) => void;
  setViewMode: (mode: DriveViewMode) => void;
  selectFile: (fileId: string | null) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  setSortOrder: (field: DriveSortField, direction: DriveSortDirection) => void;
  openPreview: (file: DriveFile) => void;
  closePreview: () => void;
  openCreateFolderDialog: () => void;
  closeCreateFolderDialog: () => void;
  openRenameDialog: (fileId: string, currentName: string) => void;
  closeRenameDialog: () => void;
  updateRenameFileName: (name: string) => void;
  clearError: () => void;
  resetState: () => void;
}

// ============================================
// Helper Functions
// ============================================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getFileTypeIcon = (mimeType: string): string => {
  if (mimeType === 'application/vnd.google-apps.folder') return '📁';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('presentation') || mimeType.includes('slides')) return '📊';
  if (mimeType.includes('spreadsheet') || mimeType.includes('sheets')) return '📈';
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('docs')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar')) return '🗜️';
  if (mimeType.includes('code') || mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return '💻';
  return '📁';
};

const isFolder = (mimeType: string): boolean => {
  return mimeType === 'application/vnd.google-apps.folder';
};

// ============================================
// Store Implementation
// ============================================

const initialState = {
  files: [],
  folders: [],
  selectedFileId: null,
  currentFolderId: null,
  folderPath: [{ id: 'root', name: 'My Drive' }],
  quotaInfo: null,
  recentFiles: [],
  activities: [],
  sharedFiles: [],

  activeView: 'my-drive' as DriveView,
  viewMode: 'grid' as DriveViewMode,
  isLoading: false,
  isUploading: false,
  isDownloading: false,
  isSharing: false,
  isCreating: false,
  isMoving: false,
  isCopying: false,
  isFetchingMore: false,
  error: null as string | null,
  searchQuery: '',
  sortField: 'modifiedTime' as DriveSortField,
  sortDirection: 'desc' as DriveSortDirection,
  selectedFileIds: new Set<string>(),
  nextPageToken: null as string | null,
  hasMoreFiles: false,
  uploadProgress: 0,
  uploadQueue: [],
  lastSyncTime: null as Date | null,

  shareDialogOpen: false,
  shareFileId: null as string | null,
  createFolderDialogOpen: false,
  renameDialogOpen: false,
  renameFileId: null as string | null,
  renameFileName: '',
  previewFile: null as DriveFile | null,
  previewOpen: false,
};

export const useDriveStore = create<DriveState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // Computed Getters
        // ============================================

        getSelectedFile: () => {
          const { files, selectedFileId } = get();
          return files.find(f => f.id === selectedFileId) || null;
        },

        getCurrentFolder: () => {
          const { folders, currentFolderId } = get();
          return folders.find(f => f.id === currentFolderId) || null;
        },

        getBreadcrumbs: () => {
          return get().folderPath;
        },

        getFilteredFiles: () => {
          const { files, activeView, searchQuery, sortField, sortDirection, currentFolderId } = get();
          let filtered = [...files];

          // Filter by view
          switch (activeView) {
            case 'my-drive':
              filtered = filtered.filter(f => !f.trashed && !f.shared);
              if (currentFolderId) {
                filtered = filtered.filter(f => f.parents?.includes(currentFolderId));
              } else {
                filtered = filtered.filter(f => !f.parents || f.parents.length === 0 || f.parents.includes('root'));
              }
              break;
            case 'shared':
              filtered = filtered.filter(f => f.shared && !f.trashed);
              break;
            case 'starred':
              filtered = filtered.filter(f => f.starred && !f.trashed);
              break;
            case 'trash':
              filtered = filtered.filter(f => f.trashed);
              break;
            case 'recent':
              filtered = filtered.filter(f => !f.trashed);
              filtered.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
              break;
          }

          // Filter by search
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(f =>
              f.name.toLowerCase().includes(query) ||
              f.description?.toLowerCase().includes(query) ||
              f.mimeType.toLowerCase().includes(query)
            );
          }

          // Sort
          filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
              case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
              case 'modifiedTime':
                comparison = new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
                break;
              case 'size':
                comparison = a.size - b.size;
                break;
              case 'createdTime':
                comparison = new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
                break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
          });

          return filtered;
        },

        getFolderFiles: () => {
          const { files, currentFolderId } = get();
          if (!currentFolderId) return files.filter(f => !f.trashed && !f.parents);
          return files.filter(f => f.parents?.includes(currentFolderId) && !f.trashed);
        },

        getStarredFiles: () => {
          return get().files.filter(f => f.starred && !f.trashed);
        },

        getTrashedFiles: () => {
          return get().files.filter(f => f.trashed);
        },

        getSharedWithMeFiles: () => {
          return get().files.filter(f => f.shared && !f.trashed);
        },

        getRecentFiles: () => {
          return [...get().files]
            .filter(f => !f.trashed)
            .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
            .slice(0, 20);
        },

        getSelectedCount: () => {
          return get().selectedFileIds.size;
        },

        getTotalStorageUsed: () => {
          return formatFileSize(get().quotaInfo?.usage || 0);
        },

        getStoragePercentage: () => {
          return get().quotaInfo?.percentUsed || 0;
        },

        getFileTypeIcon: (mimeType: string) => {
          return getFileTypeIcon(mimeType);
        },

        // ============================================
        // File Fetching Actions
        // ============================================

        fetchFiles: async (options?: DriveListOptions) => {
          set({ isLoading: true, error: null });

          try {
            const params: Record<string, any> = {
              pageSize: options?.pageSize || 50,
              orderBy: options?.orderBy || 'modifiedTime desc',
            };

            if (options?.pageToken) params.pageToken = options.pageToken;
            if (options?.q) params.q = options.q;
            if (options?.folderId) params.folderId = options.folderId;

            const response = await apiClient.get<{
              files: DriveFile[];
              nextPageToken?: string;
            }>('/api/agent/drive/list', params);

            if (response.success && response.data) {
              const files = response.data.files.map((file: any) => ({
                ...file,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
              }));

              const regularFiles = files.filter((f: DriveFile) => f.mimeType !== 'application/vnd.google-apps.folder');
              const folders = files.filter((f: DriveFile) => f.mimeType === 'application/vnd.google-apps.folder');

              set({
                files: regularFiles,
                folders,
                nextPageToken: response.data.nextPageToken || null,
                hasMoreFiles: !!response.data.nextPageToken,
                lastSyncTime: new Date(),
                isLoading: false,
              });
            } else {
              set({ isLoading: false, error: response.error || 'Failed to fetch files' });
            }
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch files',
            });
          }
        },

        fetchMoreFiles: async () => {
          const { nextPageToken, isFetchingMore } = get();
          if (!nextPageToken || isFetchingMore) return;

          set({ isFetchingMore: true, error: null });

          try {
            const response = await apiClient.get<{
              files: DriveFile[];
              nextPageToken?: string;
            }>('/api/agent/drive/list', {
              pageSize: 50,
              pageToken: nextPageToken,
            });

            if (response.success && response.data) {
              const newFiles = response.data.files.map((file: any) => ({
                ...file,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
              }));

              set(state => ({
                files: [...state.files, ...newFiles],
                nextPageToken: response.data?.nextPageToken || null,
                hasMoreFiles: !!response.data?.nextPageToken,
                isFetchingMore: false,
              }));
            } else {
              set({ isFetchingMore: false, error: response.error || 'Failed to fetch more files' });
            }
          } catch (err) {
            set({
              isFetchingMore: false,
              error: err instanceof Error ? err.message : 'Failed to fetch more files',
            });
          }
        },

        fetchFileById: async (fileId: string) => {
          try {
            const response = await apiClient.get<DriveFile>(`/api/agent/drive/${fileId}`);
            if (response.success && response.data) {
              const file = {
                ...response.data,
                createdTime: new Date(response.data.createdTime),
                modifiedTime: new Date(response.data.modifiedTime),
              };

              set(state => ({
                files: state.files.map(f => f.id === fileId ? file : f),
              }));

              return file;
            }
            return null;
          } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to fetch file' });
            return null;
          }
        },

        fetchQuotaInfo: async () => {
          try {
            const response = await apiClient.get<DriveQuotaInfo>('/api/agent/drive/quota');
            if (response.success && response.data) {
              set({ quotaInfo: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch quota info:', err);
          }
        },

        fetchRecentFiles: async () => {
          try {
            const response = await apiClient.get<DriveFile[]>('/api/agent/drive/recent', { limit: 20 });
            if (response.success && response.data) {
              const recentFiles = response.data.map((file: any) => ({
                ...file,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
              }));
              set({ recentFiles });
            }
          } catch (err) {
            console.error('Failed to fetch recent files:', err);
          }
        },

        fetchActivities: async () => {
          try {
            const response = await apiClient.get<DriveActivity[]>('/api/agent/drive/activities', { limit: 50 });
            if (response.success && response.data) {
              set({ activities: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch activities:', err);
          }
        },

        fetchSharedFiles: async () => {
          try {
            const response = await apiClient.get<DriveFile[]>('/api/agent/drive/shared-with-me');
            if (response.success && response.data) {
              const sharedFiles = response.data.map((file: any) => ({
                ...file,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
                shared: true,
              }));
              set({ sharedFiles });
            }
          } catch (err) {
            console.error('Failed to fetch shared files:', err);
          }
        },

        refreshFiles: async () => {
          await Promise.all([
            get().fetchFiles(),
            get().fetchQuotaInfo(),
            get().fetchRecentFiles(),
          ]);
        },

        navigateToFolder: async (folderId: string | null) => {
          const state = get();

          if (folderId === null) {
            set({
              currentFolderId: null,
              folderPath: [{ id: 'root', name: 'My Drive' }],
              selectedFileId: null,
              selectedFileIds: new Set(),
            });
            await get().fetchFiles();
            return;
          }

          // Build folder path
          const folder = state.folders.find(f => f.id === folderId) ||
                        state.files.find(f => f.id === folderId);
          
          if (folder) {
            const currentPath = state.folderPath;

            // Check if this folder is already in the path (navigating back)
            const existingIndex = currentPath.findIndex(p => p.id === folderId);
            if (existingIndex >= 0) {
              set({
                currentFolderId: folderId,
                folderPath: currentPath.slice(0, existingIndex + 1),
                selectedFileId: null,
                selectedFileIds: new Set(),
              });
            } else {
              set({
                currentFolderId: folderId,
                folderPath: [...currentPath, { id: folder.id, name: folder.name }],
                selectedFileId: null,
                selectedFileIds: new Set(),
              });
            }
          }

          await get().fetchFiles({ folderId });
        },

        navigateUp: async () => {
          const { folderPath } = get();
          if (folderPath.length <= 1) return;

          const newPath = folderPath.slice(0, -1);
          const parentId = newPath[newPath.length - 1].id === 'root' ? null : newPath[newPath.length - 1].id;

          set({
            currentFolderId: parentId,
            folderPath: newPath,
            selectedFileId: null,
            selectedFileIds: new Set(),
          });

          await get().fetchFiles({ folderId: parentId || undefined });
        },

        // ============================================
        // File Operation Actions
        // ============================================

        uploadFile: async (options: DriveUploadOptions) => {
          set({ isUploading: true, uploadProgress: 0, error: null });

          try {
            const formData = new FormData();
            formData.append('file', options.content, options.name);
            if (options.parents) {
              options.parents.forEach(p => formData.append('parents', p));
            }
            if (options.mimeType) formData.append('mimeType', options.mimeType);
            if (options.description) formData.append('description', options.description);
            if (options.convertToGoogleDoc !== undefined) formData.append('convert', String(options.convertToGoogleDoc));

            const response = await apiClient.post<DriveUploadResponse>(
              '/api/agent/drive/upload',
              formData,
              {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent: any) => {
                  const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                  set({ uploadProgress: progress });
                },
              }
            );

            if (response.success && response.data) {
              set({ isUploading: false, uploadProgress: 100 });
              await get().refreshFiles();
              return { success: true, fileId: response.data.id };
            }

            set({ isUploading: false, error: response.error || 'Failed to upload file' });
            return { success: false, error: response.error || 'Failed to upload file' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
            set({ isUploading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        uploadFiles: async (files: File[], parentId?: string) => {
          const parents = parentId ? [parentId] : undefined;

          set(state => ({
            uploadQueue: files.map(file => ({
              file,
              progress: 0,
              status: 'pending' as const,
            })),
          }));

          for (let i = 0; i < files.length; i++) {
            const file = files[i];

            set(state => ({
              uploadQueue: state.uploadQueue.map((item, idx) =>
                idx === i ? { ...item, status: 'uploading' as const } : item
              ),
            }));

            const result = await get().uploadFile({
              name: file.name,
              content: file,
              mimeType: file.type || 'application/octet-stream',
              parents,
            });

            set(state => ({
              uploadQueue: state.uploadQueue.map((item, idx) =>
                idx === i
                  ? { ...item, progress: 100, status: result.success ? 'success' as const : 'error' as const, error: result.error }
                  : item
              ),
            }));
          }

          // Clear upload queue after 3 seconds
          setTimeout(() => {
            set({ uploadQueue: [] });
          }, 3000);
        },

        downloadFile: async (fileId: string) => {
          set({ isDownloading: true, error: null });

          try {
            const response = await apiClient.get<{ url: string }>(`/api/agent/drive/${fileId}/download`);

            if (response.success && response.data?.url) {
              // Trigger download
              const a = document.createElement('a');
              a.href = response.data.url;
              a.download = '';
              a.click();

              set({ isDownloading: false });
              return { success: true, url: response.data.url };
            }

            set({ isDownloading: false, error: response.error || 'Failed to download file' });
            return { success: false, error: response.error || 'Failed to download file' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to download file';
            set({ isDownloading: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        createFolder: async (options: DriveCreateFolderOptions) => {
          set({ isCreating: true, error: null });

          try {
            const response = await apiClient.post<{ id: string; name: string }>(
              '/api/agent/drive/folders',
              {
                name: options.name,
                parentId: options.parentId || get().currentFolderId,
                description: options.description,
              }
            );

            if (response.success && response.data) {
              set({ isCreating: false });
              await get().refreshFiles();
              return { success: true, folderId: response.data.id };
            }

            set({ isCreating: false, error: response.error || 'Failed to create folder' });
            return { success: false, error: response.error || 'Failed to create folder' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
            set({ isCreating: false, error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        renameFile: async (options: DriveRenameOptions) => {
          set({ error: null });

          try {
            const response = await apiClient.patch(`/api/agent/drive/${options.fileId}`, {
              name: options.newName,
            });

            if (response.success) {
              set(state => ({
                files: state.files.map(f =>
                  f.id === options.fileId
                    ? { ...f, name: options.newName, modifiedTime: new Date() }
                    : f
                ),
                folders: state.folders.map(f =>
                  f.id === options.fileId
                    ? { ...f, name: options.newName, modifiedTime: new Date() }
                    : f
                ),
                renameDialogOpen: false,
                renameFileId: null,
                renameFileName: '',
              }));
              return { success: true };
            }

            set({ error: response.error || 'Failed to rename file' });
            return { success: false, error: response.error || 'Failed to rename file' };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to rename file';
            set({ error: errorMessage });
            return { success: false, error: errorMessage };
          }
        },

        moveFile: async (options: DriveMoveOptions) => {
          set({ isMoving: true, error: null });

          try {
            const response = await apiClient.post(`/api/agent/drive/${options.fileId}/move`, {
              newParentId: options.newParentId,
            });

            if (response.success) {
              set(state => ({
                files: state.files.map(f =>
                  f.id === options.fileId
                    ? { ...f, parents: [options.newParentId], modifiedTime: new Date() }
                    : f
                ),
                folders: state.folders.map(f =>
                  f.id === options.fileId
                    ? { ...f, parents: [options.newParentId], modifiedTime: new Date() }
                    : f
                ),
                isMoving: false,
              }));
              return { success: true };
            }

            set({ isMoving: false, error: response.error || 'Failed to move file' });
            return { success: false, error: response.error || 'Failed to move file' };
          } catch (err) {
            set({ isMoving: false, error: err instanceof Error ? err.message : 'Failed to move file' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to move file' };
          }
        },

        copyFile: async (options: DriveCopyOptions) => {
          set({ isCopying: true, error: null });

          try {
            const response = await apiClient.post<{ id: string }>(`/api/agent/drive/${options.fileId}/copy`, {
              newName: options.newName,
              parentId: options.parentId || get().currentFolderId,
            });

            if (response.success && response.data) {
              set({ isCopying: false });
              await get().refreshFiles();
              return { success: true, newFileId: response.data.id };
            }

            set({ isCopying: false, error: response.error || 'Failed to copy file' });
            return { success: false, error: response.error || 'Failed to copy file' };
          } catch (err) {
            set({ isCopying: false, error: err instanceof Error ? err.message : 'Failed to copy file' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to copy file' };
          }
        },

        deleteFile: async (fileId: string) => {
          try {
            const response = await apiClient.delete(`/api/agent/drive/${fileId}`);
            if (response.success) {
              set(state => ({
                files: state.files.filter(f => f.id !== fileId),
                folders: state.folders.filter(f => f.id !== fileId),
                selectedFileId: state.selectedFileId === fileId ? null : state.selectedFileId,
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to delete file' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete file' };
          }
        },

        deleteFiles: async (fileIds: string[]) => {
          set(state => ({
            files: state.files.filter(f => !fileIds.includes(f.id)),
            folders: state.folders.filter(f => !fileIds.includes(f.id)),
          }));

          try {
            const response = await apiClient.post<DriveBatchResult>('/api/agent/drive/batch-delete', { fileIds });
            if (response.success) {
              set({ selectedFileIds: new Set(), selectedFileId: null });
            }
            return response.data || { success: true, processedCount: fileIds.length, failedCount: 0, results: [] };
          } catch (err) {
            await get().refreshFiles();
            return { success: false, processedCount: 0, failedCount: fileIds.length, results: [] };
          }
        },

        trashFile: async (fileId: string) => {
          set(state => ({
            files: state.files.map(f =>
              f.id === fileId ? { ...f, trashed: true } : f
            ),
            folders: state.folders.map(f =>
              f.id === fileId ? { ...f, trashed: true } : f
            ),
          }));

          try {
            const response = await apiClient.post(`/api/agent/drive/${fileId}/trash`);
            if (response.success) return { success: true };

            set(state => ({
              files: state.files.map(f =>
                f.id === fileId ? { ...f, trashed: false } : f
              ),
              folders: state.folders.map(f =>
                f.id === fileId ? { ...f, trashed: false } : f
              ),
            }));
            return { success: false, error: response.error || 'Failed to trash file' };
          } catch (err) {
            set(state => ({
              files: state.files.map(f =>
                f.id === fileId ? { ...f, trashed: false } : f
              ),
              folders: state.folders.map(f =>
                f.id === fileId ? { ...f, trashed: false } : f
              ),
            }));
            return { success: false, error: err instanceof Error ? err.message : 'Failed to trash file' };
          }
        },

        restoreFile: async (fileId: string) => {
          set(state => ({
            files: state.files.map(f =>
              f.id === fileId ? { ...f, trashed: false } : f
            ),
            folders: state.folders.map(f =>
              f.id === fileId ? { ...f, trashed: false } : f
            ),
          }));

          try {
            const response = await apiClient.post(`/api/agent/drive/${fileId}/restore`);
            if (response.success) return { success: true };

            set(state => ({
              files: state.files.map(f =>
                f.id === fileId ? { ...f, trashed: true } : f
              ),
              folders: state.folders.map(f =>
                f.id === fileId ? { ...f, trashed: true } : f
              ),
            }));
            return { success: false, error: response.error || 'Failed to restore file' };
          } catch (err) {
            set(state => ({
              files: state.files.map(f =>
                f.id === fileId ? { ...f, trashed: true } : f
              ),
              folders: state.folders.map(f =>
                f.id === fileId ? { ...f, trashed: true } : f
              ),
            }));
            return { success: false, error: err instanceof Error ? err.message : 'Failed to restore file' };
          }
        },

        toggleStar: async (fileId: string) => {
          const file = get().files.find(f => f.id === fileId) || get().folders.find(f => f.id === fileId);
          if (!file) return;

          const newStarred = !file.starred;

          set(state => ({
            files: state.files.map(f =>
              f.id === fileId ? { ...f, starred: newStarred } : f
            ),
            folders: state.folders.map(f =>
              f.id === fileId ? { ...f, starred: newStarred } : f
            ),
          }));

          try {
            if (newStarred) {
              await apiClient.post(`/api/agent/drive/${fileId}/star`);
            } else {
              await apiClient.post(`/api/agent/drive/${fileId}/unstar`);
            }
          } catch (err) {
            set(state => ({
              files: state.files.map(f =>
                f.id === fileId ? { ...f, starred: !newStarred } : f
              ),
              folders: state.folders.map(f =>
                f.id === fileId ? { ...f, starred: !newStarred } : f
              ),
            }));
          }
        },

        emptyTrash: async () => {
          try {
            const response = await apiClient.delete('/api/agent/drive/trash');
            if (response.success) {
              set(state => ({
                files: state.files.filter(f => !f.trashed),
                folders: state.folders.filter(f => !f.trashed),
              }));
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to empty trash' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to empty trash' };
          }
        },

        // ============================================
        // Sharing Actions
        // ============================================

        shareFile: async (options: DriveShareOptions) => {
          set({ isSharing: true, error: null });

          try {
            const response = await apiClient.post<{ id: string }>(`/api/agent/drive/${options.fileId}/share`, {
              email: options.email,
              role: options.role,
              sendNotificationEmail: options.sendNotificationEmail ?? true,
              emailMessage: options.emailMessage,
              expirationTime: options.expirationTime?.toISOString(),
            });

            if (response.success && response.data) {
              set({ isSharing: false });
              await get().fetchFileById(options.fileId);
              return { success: true, permissionId: response.data.id };
            }

            set({ isSharing: false, error: response.error || 'Failed to share file' });
            return { success: false, error: response.error || 'Failed to share file' };
          } catch (err) {
            set({ isSharing: false, error: err instanceof Error ? err.message : 'Failed to share file' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to share file' };
          }
        },

        updatePermission: async (fileId: string, permissionId: string, role: string) => {
          try {
            await apiClient.patch(`/api/agent/drive/${fileId}/permissions/${permissionId}`, { role });
            await get().fetchFileById(fileId);
          } catch (err) {
            console.error('Failed to update permission:', err);
          }
        },

        removePermission: async (fileId: string, permissionId: string) => {
          try {
            await apiClient.delete(`/api/agent/drive/${fileId}/permissions/${permissionId}`);
            await get().fetchFileById(fileId);
          } catch (err) {
            console.error('Failed to remove permission:', err);
          }
        },

        getFilePermissions: async (fileId: string) => {
          try {
            const response = await apiClient.get<DrivePermission[]>(`/api/agent/drive/${fileId}/permissions`);
            return response.data || [];
          } catch (err) {
            return [];
          }
        },

        openShareDialog: (fileId: string) => {
          set({ shareDialogOpen: true, shareFileId: fileId });
        },

        closeShareDialog: () => {
          set({ shareDialogOpen: false, shareFileId: null });
        },

        // ============================================
        // Search Actions
        // ============================================

        searchFiles: async (options: DriveSearchOptions) => {
          set({ isLoading: true, searchQuery: options.query, error: null });

          try {
            const params: Record<string, any> = {
              query: options.query,
              pageSize: options.pageSize || 50,
            };
            if (options.mimeType) params.mimeType = options.mimeType;
            if (options.folderId) params.folderId = options.folderId;

            const response = await apiClient.get<{
              files: DriveFile[];
              nextPageToken?: string;
            }>('/api/agent/drive/search', params);

            if (response.success && response.data) {
              const files = response.data.files.map((file: any) => ({
                ...file,
                createdTime: new Date(file.createdTime),
                modifiedTime: new Date(file.modifiedTime),
              }));

              set({
                files,
                nextPageToken: response.data.nextPageToken || null,
                hasMoreFiles: !!response.data.nextPageToken,
                isLoading: false,
              });
            } else {
              set({ isLoading: false, error: response.error || 'Failed to search files' });
            }
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to search files',
            });
          }
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
          if (!query) {
            get().fetchFiles();
          }
        },

        clearSearch: () => {
          set({ searchQuery: '' });
          get().fetchFiles();
        },

        // ============================================
        // UI State Actions
        // ============================================

        setActiveView: (view: DriveView) => {
          set({
            activeView: view,
            selectedFileId: null,
            selectedFileIds: new Set(),
            searchQuery: '',
          });

          switch (view) {
            case 'my-drive':
              get().fetchFiles();
              break;
            case 'shared':
              get().fetchSharedFiles();
              break;
            case 'starred':
              get().fetchFiles({ q: 'starred = true' });
              break;
            case 'trash':
              get().fetchFiles({ q: 'trashed = true', includeTrashed: true });
              break;
            case 'recent':
              get().fetchRecentFiles();
              break;
          }
        },

        setViewMode: (mode: DriveViewMode) => {
          set({ viewMode: mode });
        },

        selectFile: (fileId: string | null) => {
          set({ selectedFileId: fileId });
        },

        toggleFileSelection: (fileId: string) => {
          set(state => {
            const newSet = new Set(state.selectedFileIds);
            if (newSet.has(fileId)) {
              newSet.delete(fileId);
            } else {
              newSet.add(fileId);
            }
            return { selectedFileIds: newSet };
          });
        },

        selectAllFiles: () => {
          const filtered = get().getFilteredFiles();
          if (filtered.length === get().selectedFileIds.size) {
            set({ selectedFileIds: new Set() });
          } else {
            set({ selectedFileIds: new Set(filtered.map(f => f.id)) });
          }
        },

        clearSelection: () => {
          set({ selectedFileIds: new Set() });
        },

        setSortOrder: (field: DriveSortField, direction: DriveSortDirection) => {
          set({ sortField: field, sortDirection: direction });
        },

        openPreview: (file: DriveFile) => {
          set({ previewFile: file, previewOpen: true });
        },

        closePreview: () => {
          set({ previewFile: null, previewOpen: false });
        },

        openCreateFolderDialog: () => {
          set({ createFolderDialogOpen: true });
        },

        closeCreateFolderDialog: () => {
          set({ createFolderDialogOpen: false });
        },

        openRenameDialog: (fileId: string, currentName: string) => {
          set({
            renameDialogOpen: true,
            renameFileId: fileId,
            renameFileName: currentName,
          });
        },

        closeRenameDialog: () => {
          set({
            renameDialogOpen: false,
            renameFileId: null,
            renameFileName: '',
          });
        },

        updateRenameFileName: (name: string) => {
          set({ renameFileName: name });
        },

        clearError: () => {
          set({ error: null });
        },

        resetState: () => {
          set({
            ...initialState,
            selectedFileIds: new Set<string>(),
            uploadQueue: [],
            folderPath: [{ id: 'root', name: 'My Drive' }],
          });
        },
      }),
      {
        name: 'drive-agent-store',
        partialize: (state) => ({
          activeView: state.activeView,
          viewMode: state.viewMode,
          sortField: state.sortField,
          sortDirection: state.sortDirection,
          currentFolderId: state.currentFolderId,
          folderPath: state.folderPath,
        }),
      }
    )
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useDriveFiles = () => useDriveStore(state => ({
  files: state.files,
  folders: state.folders,
  isLoading: state.isLoading,
  isFetchingMore: state.isFetchingMore,
  error: state.error,
  activeView: state.activeView,
  viewMode: state.viewMode,
  searchQuery: state.searchQuery,
  sortField: state.sortField,
  sortDirection: state.sortDirection,
  currentFolderId: state.currentFolderId,
  folderPath: state.folderPath,
  selectedFileIds: state.selectedFileIds,
  hasMoreFiles: state.hasMoreFiles,
  lastSyncTime: state.lastSyncTime,
  uploadQueue: state.uploadQueue,
  uploadProgress: state.uploadProgress,
  isUploading: state.isUploading,
  fetchFiles: state.fetchFiles,
  fetchMoreFiles: state.fetchMoreFiles,
  refreshFiles: state.refreshFiles,
  navigateToFolder: state.navigateToFolder,
  navigateUp: state.navigateUp,
  setActiveView: state.setActiveView,
  setViewMode: state.setViewMode,
  selectFile: state.selectFile,
  toggleFileSelection: state.toggleFileSelection,
  selectAllFiles: state.selectAllFiles,
  clearSelection: state.clearSelection,
  setSortOrder: state.setSortOrder,
  searchFiles: state.searchFiles,
  clearSearch: state.clearSearch,
  setSearchQuery: state.setSearchQuery,
  uploadFile: state.uploadFile,
  uploadFiles: state.uploadFiles,
  downloadFile: state.downloadFile,
  renameFile: state.renameFile,
  moveFile: state.moveFile,
  copyFile: state.copyFile,
  deleteFile: state.deleteFile,
  deleteFiles: state.deleteFiles,
  trashFile: state.trashFile,
  restoreFile: state.restoreFile,
  toggleStar: state.toggleStar,
  emptyTrash: state.emptyTrash,
  getFilteredFiles: state.getFilteredFiles,
  getSelectedCount: state.getSelectedCount,
  getFileTypeIcon: state.getFileTypeIcon,
}));

export const useDrivePreview = () => useDriveStore(state => ({
  previewFile: state.previewFile,
  previewOpen: state.previewOpen,
  openPreview: state.openPreview,
  closePreview: state.closePreview,
}));

export const useDriveOperations = () => useDriveStore(state => ({
  isUploading: state.isUploading,
  isDownloading: state.isDownloading,
  isSharing: state.isSharing,
  isCreating: state.isCreating,
  isMoving: state.isMoving,
  isCopying: state.isCopying,
  uploadFile: state.uploadFile,
  uploadFiles: state.uploadFiles,
  downloadFile: state.downloadFile,
  createFolder: state.createFolder,
  renameFile: state.renameFile,
  moveFile: state.moveFile,
  copyFile: state.copyFile,
  deleteFile: state.deleteFile,
  deleteFiles: state.deleteFiles,
  trashFile: state.trashFile,
  restoreFile: state.restoreFile,
  emptyTrash: state.emptyTrash,
  toggleStar: state.toggleStar,
}));

export const useDriveSharing = () => useDriveStore(state => ({
  shareDialogOpen: state.shareDialogOpen,
  shareFileId: state.shareFileId,
  isSharing: state.isSharing,
  shareFile: state.shareFile,
  updatePermission: state.updatePermission,
  removePermission: state.removePermission,
  getFilePermissions: state.getFilePermissions,
  openShareDialog: state.openShareDialog,
  closeShareDialog: state.closeShareDialog,
}));

export const useDriveDialogs = () => useDriveStore(state => ({
  createFolderDialogOpen: state.createFolderDialogOpen,
  renameDialogOpen: state.renameDialogOpen,
  renameFileId: state.renameFileId,
  renameFileName: state.renameFileName,
  openCreateFolderDialog: state.openCreateFolderDialog,
  closeCreateFolderDialog: state.closeCreateFolderDialog,
  openRenameDialog: state.openRenameDialog,
  closeRenameDialog: state.closeRenameDialog,
  updateRenameFileName: state.updateRenameFileName,
}));

export const useDriveQuota = () => useDriveStore(state => ({
  quotaInfo: state.quotaInfo,
  fetchQuotaInfo: state.fetchQuotaInfo,
  getTotalStorageUsed: state.getTotalStorageUsed,
  getStoragePercentage: state.getStoragePercentage,
}));