// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

// Cloud Provider Types
export interface CloudProvider {
  id: string;
  userId: string;
  providerType: 'pikpak' | 'webdav' | 'synology' | 'gdrive' | 'onedrive' | 'dropbox';
  alias: string;
  isActive: boolean;
  lastConnected?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectProviderRequest {
  providerType: string;
  credentials: CloudCredentials;
  alias: string;
  config?: CloudProviderConfig;
}

export interface CloudCredentials {
  type: 'oauth' | 'basic' | 'apikey';
  [key: string]: any;
}

export interface CloudProviderConfig {
  [key: string]: any;
}

// File and Folder Types
export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  modifiedAt?: string;
  createdAt?: string;
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
  modifiedAfter?: string;
  modifiedBefore?: string;
  fileTypes?: string[];
}

// Transfer Types
export interface TransferJob {
  id: string;
  userId: string;
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  filesTotal: number;
  filesCompleted: number;
  filesFailed: number;
  bytesTotal: number;
  bytesTransferred: number;
  transferSpeed: number;
  estimatedTimeRemaining: number;
  filters?: FileFilter;
  options?: TransferOptions;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferJobRequest {
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  filters?: FileFilter;
  options?: TransferOptions;
}

export interface TransferOptions {
  overwriteExisting?: boolean;
  preserveTimestamps?: boolean;
  verifyIntegrity?: boolean;
  dryRun?: boolean;
}

// Sync Types
export interface SyncJob {
  id: string;
  userId: string;
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  syncMode: 'one_way' | 'two_way';
  scheduleCron?: string;
  isActive: boolean;
  lastSync?: string;
  nextSync?: string;
  filters?: FileFilter;
  options?: SyncOptions;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSyncJobRequest {
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  syncMode: 'one_way' | 'two_way';
  scheduleCron?: string;
  filters?: FileFilter;
  options?: SyncOptions;
}

export interface SyncOptions {
  deleteExtraFiles?: boolean;
  preserveTimestamps?: boolean;
  verifyIntegrity?: boolean;
  conflictResolution?: 'source_wins' | 'destination_wins' | 'newer_wins' | 'larger_wins';
}

// Progress and Status Types
export interface TransferProgress {
  jobId: string;
  status: string;
  progressPercentage: number;
  filesTotal: number;
  filesCompleted: number;
  filesFailed: number;
  bytesTotal: number;
  bytesTransferred: number;
  transferSpeed: number;
  estimatedTimeRemaining: number;
  currentFile?: string;
  updatedAt: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// UI State Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  read?: boolean;
  createdAt: string;
}

export interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  loading: {
    [key: string]: boolean;
  };
  modals: {
    [key: string]: boolean;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface TransferProgressMessage extends WebSocketMessage {
  type: 'transfer:progress';
  payload: TransferProgress;
}

export interface TransferCompleteMessage extends WebSocketMessage {
  type: 'transfer:complete';
  payload: {
    jobId: string;
    status: 'completed' | 'failed';
    result?: any;
    error?: string;
  };
}