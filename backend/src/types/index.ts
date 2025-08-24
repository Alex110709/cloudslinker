// Common types for CloudsLinker platform

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CloudProvider {
  id: string;
  userId: string;
  providerType: CloudProviderType;
  alias: string;
  credentials: CloudCredentials;
  config: CloudProviderConfig;
  isActive: boolean;
  lastConnected?: Date;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CloudProviderType = 
  | 'pikpak' 
  | 'webdav' 
  | 'synology' 
  | 'google_drive' 
  | 'onedrive' 
  | 'dropbox';

export interface CloudCredentials {
  type: 'oauth' | 'basic' | 'api_key' | 'account';
  [key: string]: any;
}

export interface CloudProviderConfig {
  timeout?: number;
  retryAttempts?: number;
  chunkSize?: number;
  [key: string]: any;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  modifiedAt?: Date;
  createdAt?: Date;
  checksum?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  parentId?: string;
  isShared?: boolean;
}

export interface FileFilter {
  includePatterns?: string[];
  excludePatterns?: string[];
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  fileTypes?: string[];
  folderDepth?: number;
}

export interface TransferJob {
  id: string;
  userId: string;
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  status: TransferStatus;
  progressPercentage: number;
  filesTotal: number;
  filesCompleted: number;
  filesFailed: number;
  bytesTotal: number;
  bytesTransferred: number;
  transferSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  filters?: FileFilter;
  options?: TransferOptions;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TransferStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface TransferOptions {
  overwriteExisting?: boolean;
  preserveTimestamps?: boolean;
  verifyIntegrity?: boolean;
  createMissingFolders?: boolean;
  deleteSourceAfterTransfer?: boolean;
  parallelTransfers?: number;
}

export interface SyncJob {
  id: string;
  userId: string;
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  syncMode: 'one_way' | 'two_way' | 'mirror';
  scheduleCron?: string;
  isActive: boolean;
  lastSync?: Date;
  nextSync?: Date;
  lastSyncStatus: 'pending' | 'running' | 'completed' | 'failed';
  filters?: FileFilter;
  options?: SyncOptions;
  conflictResolution: 'skip' | 'overwrite' | 'rename';
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncOptions {
  deleteOrphanedFiles?: boolean;
  preserveTimestamps?: boolean;
  createMissingFolders?: boolean;
  maxSyncDepth?: number;
  excludeHiddenFiles?: boolean;
}

export interface FileTransferLog {
  id: string;
  transferJobId?: string;
  syncJobId?: string;
  filePath: string;
  fileSize?: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'skipped';
  errorMessage?: string;
  transferredAt?: Date;
  createdAt: Date;
}

export interface TransferProgress {
  jobId: string;
  status: TransferStatus;
  progressPercentage: number;
  filesTotal: number;
  filesCompleted: number;
  filesFailed: number;
  bytesTotal: number;
  bytesTransferred: number;
  transferSpeed: number;
  estimatedTimeRemaining: number;
  currentFile?: string;
  errorMessage?: string;
  updatedAt: Date;
}

export interface CloudStorage {
  totalSpace?: number;
  usedSpace?: number;
  freeSpace?: number;
  currency?: string;
}

export interface CloudQuota {
  total: number;
  used: number;
  available: number;
  unit: 'bytes' | 'GB' | 'TB';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CloudProviderCapabilities {
  supportsUpload: boolean;
  supportsDownload: boolean;
  supportsDelete: boolean;
  supportsFolders: boolean;
  supportsMove: boolean;
  supportsCopy: boolean;
  supportsResume: boolean;
  supportsChunkedUpload: boolean;
  maxFileSize?: number;
  supportedMimeTypes?: string[];
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: Date;
  scope?: string;
}

export interface OAuthCredentials extends CloudCredentials {
  type: 'oauth';
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface BasicAuthCredentials extends CloudCredentials {
  type: 'basic';
  username: string;
  password: string;
  endpoint?: string;
}

export interface APIKeyCredentials extends CloudCredentials {
  type: 'api_key';
  apiKey: string;
  endpoint?: string;
}

export interface AccountCredentials extends CloudCredentials {
  type: 'account';
  username: string;
  password: string;
  host?: string;
  port?: number;
  secure?: boolean;
}