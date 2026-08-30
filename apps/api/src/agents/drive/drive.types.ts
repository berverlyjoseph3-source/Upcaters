// enterprise-ai-agent-platform/apps/api/src/agents/drive/drive.types.ts

/**
 * Drive File Interface
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: Date;
  modifiedTime: Date;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  owners?: DriveUser[];
  sharingUser?: DriveUser;
  permissions?: DrivePermission[];
  starred?: boolean;
  trashed?: boolean;
  explicitlyTrashed?: boolean;
  properties?: Record<string, string>;
  description?: string;
  version?: string;
}

/**
 * Drive Folder Interface
 */
export interface DriveFolder extends DriveFile {
  isFolder: true;
  childCount?: number;
}

/**
 * Drive User Interface
 */
export interface DriveUser {
  id: string;
  emailAddress?: string;
  displayName?: string;
  photoLink?: string;
  me?: boolean;
}

/**
 * Drive Permission Interface
 */
export interface DrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
  displayName?: string;
  photoLink?: string;
  expirationTime?: Date;
  deleted?: boolean;
}

/**
 * Drive File List Options
 */
export interface DriveListOptions {
  pageSize?: number;
  pageToken?: string;
  q?: string;
  corpora?: 'user' | 'domain' | 'drive' | 'allDrives';
  fields?: string;
  orderBy?: string;
  driveId?: string;
  includeItemsFromAllDrives?: boolean;
  supportsAllDrives?: boolean;
}

/**
 * Drive File Upload Options
 */
export interface DriveUploadOptions {
  name: string;
  content: Buffer | string;
  mimeType?: string;
  parents?: string[];
  description?: string;
  properties?: Record<string, string>;
}

/**
 * Drive Search Options
 */
// NOTE: DriveSearchOptions used to be duplicated here (a thinner version
// missing pageToken/orderBy/fields/includeItemsFromAllDrives/supportsAllDrives)
// while drive.client.ts had the real, complete one that DriveClient.searchFiles
// actually uses. drive.tools.ts now imports the correct one from drive.client.ts.

/**
 * Drive Share Options
 */
export interface DriveShareOptions {
  fileId: string;
  email: string;
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  sendNotificationEmail?: boolean;
  emailMessage?: string;
  expirationTime?: Date;
}

/**
 * Drive Batch Operation Result
 */
export interface DriveBatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

/**
 * Drive Quota Info
 */
export interface DriveQuotaInfo {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
  remaining: number;
  percentUsed: number;
}

/**
 * Drive Change Interface
 */
export interface DriveChange {
  id: string;
  fileId?: string;
  file?: DriveFile;
  removed: boolean;
  time: Date;
  driveId?: string;
}

/**
 * Drive Activity Interface
 */
export interface DriveActivity {
  id: string;
  timestamp: Date;
  actor: DriveUser;
  action: 'create' | 'edit' | 'move' | 'copy' | 'rename' | 'delete' | 'restore' | 'share' | 'unshare';
  target: {
    type: 'file' | 'folder';
    id: string;
    name: string;
  };
  details?: Record<string, any>;
}

/**
 * Google Drive API Response Types
 */
export interface GoogleDriveFileResponse {
  kind: string;
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string; photoLink: string; me: boolean }>;
  permissions?: GoogleDrivePermissionResponse[];
  starred?: boolean;
  trashed?: boolean;
  explicitlyTrashed?: boolean;
  properties?: Record<string, string>;
  description?: string;
  version?: string;
}

export interface GoogleDrivePermissionResponse {
  id: string;
  type: string;
  role: string;
  emailAddress?: string;
  domain?: string;
  allowFileDiscovery?: boolean;
  displayName?: string;
  photoLink?: string;
  expirationTime?: string;
  deleted?: boolean;
}

export interface GoogleDriveListResponse {
  kind: string;
  nextPageToken?: string;
  incompleteSearch: boolean;
  files: GoogleDriveFileResponse[];
}

/**
 * Drive Agent Configuration
 */
export interface DriveAgentConfig {
  maxUploadSizeMB: number;
  supportedMimeTypes: string[];
  enableAutoBackup: boolean;
  backupFolderId?: string;
  syncIntervalMinutes: number;
}