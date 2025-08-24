import { Readable } from 'stream';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { 
  BaseCloudProvider, 
  ICloudProvider, 
  UploadOptions 
} from './ICloudProvider';
import {
  FileItem,
  FileFilter,
  CloudCredentials,
  CloudProviderConfig,
  CloudProviderCapabilities,
  CloudQuota,
  TransferProgress,
  OAuthCredentials
} from '../types';
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
  NotFoundError,
  FileExistsError,
  InsufficientStorageError,
  FileSizeLimitError,
  APIError,
  createErrorFromResponse
} from './errors';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * PikPak cloud storage provider implementation
 * Supports OAuth 2.0 authentication and file operations
 */
export class PikPakProvider extends BaseCloudProvider implements ICloudProvider {
  public readonly providerType = 'pikpak';
  public readonly displayName = 'PikPak';
  public readonly capabilities: CloudProviderCapabilities = {
    supportsUpload: true,
    supportsDownload: true,
    supportsDelete: true,
    supportsFolders: true,
    supportsMove: true,
    supportsCopy: false, // PikPak doesn't support direct copy
    supportsResume: true,
    supportsChunkedUpload: true,
    maxFileSize: 50 * 1024 * 1024 * 1024, // 50GB
    supportedMimeTypes: undefined // PikPak supports most file types
  };

  private httpClient: AxiosInstance;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiresAt?: Date;
  private readonly apiEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: CloudProviderConfig = {}) {
    super({
      timeout: 30000,
      retryAttempts: 3,
      chunkSize: 4 * 1024 * 1024, // 4MB chunks for PikPak
      ...config
    });

    this.apiEndpoint = config.apiEndpoint || process.env.PIKPAK_API_ENDPOINT || 'https://api-drive.mypikpak.com';
    this.clientId = config.clientId || process.env.PIKPAK_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.PIKPAK_CLIENT_SECRET || '';

    this.httpClient = axios.create({
      baseURL: this.apiEndpoint,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'CloudsLinker/1.0.0',
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Authenticate with PikPak using OAuth 2.0
   */
  public async authenticate(credentials: CloudCredentials, config?: CloudProviderConfig): Promise<void> {
    try {
      const oauthCreds = credentials as OAuthCredentials;
      
      if (oauthCreds.type !== 'oauth') {
        throw new AuthenticationError(
          'PikPak provider requires OAuth credentials',
          this.providerType
        );
      }

      this.accessToken = oauthCreds.accessToken;
      this.refreshToken = oauthCreds.refreshToken;
      this.tokenExpiresAt = oauthCreds.expiresAt;

      // Test the connection with current token
      if (this.accessToken) {
        try {
          await this.getUserInfo();
          this.authenticated = true;
          logger.info('PikPak authentication successful');
          return;
        } catch (error) {
          // Token might be expired, try to refresh
          if (this.refreshToken) {
            await this.refreshAccessToken();
            this.authenticated = true;
            logger.info('PikPak authentication successful after token refresh');
            return;
          }
        }
      }

      throw new AuthenticationError(
        'Invalid or expired PikPak credentials',
        this.providerType
      );

    } catch (error) {
      this.authenticated = false;
      logger.error('PikPak authentication failed:', error);
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new AuthenticationError(
        `PikPak authentication failed: ${error instanceof Error ? error.message : error}`,
        this.providerType
      );
    }
  }

  /**
   * Test connection to PikPak
   */
  public async testConnection(): Promise<boolean> {
    try {
      this.ensureAuthenticated();
      await this.getUserInfo();
      return true;
    } catch (error) {
      logger.warn('PikPak connection test failed:', error);
      return false;
    }
  }

  /**
   * Get storage quota information
   */
  public async getQuota(): Promise<CloudQuota> {
    this.ensureAuthenticated();
    
    try {
      const response = await this.httpClient.get('/drive/v1/about');
      const data = response.data;
      
      return {
        total: parseInt(data.quota_limit) || 0,
        used: parseInt(data.quota_used) || 0,
        available: parseInt(data.quota_limit) - parseInt(data.quota_used) || 0,
        unit: 'bytes'
      };
    } catch (error) {
      logger.error('Failed to get PikPak quota:', error);
      throw this.handleError(error, 'getQuota');
    }
  }

  /**
   * List files in a directory
   */
  public async listFiles(path: string, filters?: FileFilter): Promise<FileItem[]> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      
      // Get folder ID for the path
      const folderId = await this.getFolderIdByPath(normalizedPath);
      
      const response = await this.httpClient.get('/drive/v1/files', {
        params: {
          parent_id: folderId,
          limit: 1000,
          with_audit: false
        }
      });

      const files: FileItem[] = response.data.files.map((file: any) => this.mapPikPakFileToFileItem(file));
      
      return this.applyFilters(files, filters);
    } catch (error) {
      logger.error(`Failed to list PikPak files at ${path}:`, error);
      throw this.handleError(error, 'listFiles');
    }
  }

  /**
   * Get file information
   */
  public async getFileInfo(path: string): Promise<FileItem> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      const fileId = await this.getFileIdByPath(normalizedPath);
      
      const response = await this.httpClient.get(`/drive/v1/files/${fileId}`);
      
      return this.mapPikPakFileToFileItem(response.data);
    } catch (error) {
      logger.error(`Failed to get PikPak file info for ${path}:`, error);
      throw this.handleError(error, 'getFileInfo');
    }
  }

  /**
   * Create a folder
   */
  public async createFolder(path: string): Promise<FileItem> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      const pathParts = normalizedPath.split('/').filter(part => part);
      const folderName = pathParts.pop();
      const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
      
      const parentId = await this.getFolderIdByPath(parentPath);
      
      const response = await this.httpClient.post('/drive/v1/files', {
        kind: 'drive#folder',
        parent_id: parentId,
        name: folderName
      });
      
      return this.mapPikPakFileToFileItem(response.data);
    } catch (error) {
      logger.error(`Failed to create PikPak folder ${path}:`, error);
      throw this.handleError(error, 'createFolder');
    }
  }

  /**
   * Download a file
   */
  public async downloadFile(path: string): Promise<Readable> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      const fileId = await this.getFileIdByPath(normalizedPath);
      
      // Get download URL
      const downloadUrlResponse = await this.httpClient.get(`/drive/v1/files/${fileId}`, {
        params: { alt: 'media' }
      });
      
      const downloadUrl = downloadUrlResponse.data.web_content_link;
      
      // Download file as stream
      const response = await this.httpClient.get(downloadUrl, {
        responseType: 'stream'
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to download PikPak file ${path}:`, error);
      throw this.handleError(error, 'downloadFile');
    }
  }

  /**
   * Upload a file
   */
  public async uploadFile(path: string, stream: Readable, options?: UploadOptions): Promise<FileItem> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      const pathParts = normalizedPath.split('/').filter(part => part);
      const fileName = pathParts.pop();
      const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
      
      const parentId = await this.getFolderIdByPath(parentPath);
      
      // Check file size limit
      if (options?.fileSize && options.fileSize > this.capabilities.maxFileSize!) {
        throw new FileSizeLimitError(
          `File size ${options.fileSize} exceeds maximum size ${this.capabilities.maxFileSize}`,
          this.providerType,
          options.fileSize,
          this.capabilities.maxFileSize!
        );
      }

      // Create upload session
      const uploadResponse = await this.httpClient.post('/drive/v1/files/upload', {
        kind: 'drive#file',
        parent_id: parentId,
        name: fileName,
        size: options?.fileSize,
        mime_type: options?.mimeType
      });

      const uploadId = uploadResponse.data.upload_id;
      const uploadUrl = uploadResponse.data.upload_url;

      // Upload file content
      const formData = new FormData();
      formData.append('file', stream, {
        filename: fileName,
        contentType: options?.mimeType
      });

      const uploadContentResponse = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.accessToken}`
        },
        timeout: this.config.timeout,
        onUploadProgress: (progressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const progress: TransferProgress = {
              jobId: uploadId,
              status: 'running',
              progressPercentage: Math.round((progressEvent.loaded / progressEvent.total) * 100),
              filesTotal: 1,
              filesCompleted: 0,
              filesFailed: 0,
              bytesTotal: progressEvent.total,
              bytesTransferred: progressEvent.loaded,
              transferSpeed: 0, // Calculate separately
              estimatedTimeRemaining: 0, // Calculate separately
              currentFile: fileName,
              updatedAt: new Date()
            };
            options.onProgress(progress);
          }
        }
      });

      return this.mapPikPakFileToFileItem(uploadContentResponse.data);
    } catch (error) {
      logger.error(`Failed to upload file to PikPak ${path}:`, error);
      throw this.handleError(error, 'uploadFile');
    }
  }

  /**
   * Delete a file or folder
   */
  public async deleteFile(path: string): Promise<void> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      const fileId = await this.getFileIdByPath(normalizedPath);
      
      await this.httpClient.delete(`/drive/v1/files/${fileId}`);
    } catch (error) {
      logger.error(`Failed to delete PikPak file ${path}:`, error);
      throw this.handleError(error, 'deleteFile');
    }
  }

  /**
   * Move a file or folder
   */
  public async moveFile(sourcePath: string, destinationPath: string): Promise<FileItem> {
    this.ensureAuthenticated();
    this.validatePath(sourcePath);
    this.validatePath(destinationPath);
    
    try {
      const sourceFileId = await this.getFileIdByPath(this.normalizePath(sourcePath));
      
      const destPathParts = this.normalizePath(destinationPath).split('/').filter(part => part);
      const newName = destPathParts.pop();
      const newParentPath = destPathParts.length > 0 ? '/' + destPathParts.join('/') : '/';
      const newParentId = await this.getFolderIdByPath(newParentPath);
      
      const response = await this.httpClient.patch(`/drive/v1/files/${sourceFileId}`, {
        name: newName,
        parent_id: newParentId
      });
      
      return this.mapPikPakFileToFileItem(response.data);
    } catch (error) {
      logger.error(`Failed to move PikPak file from ${sourcePath} to ${destinationPath}:`, error);
      throw this.handleError(error, 'moveFile');
    }
  }

  /**
   * Copy file (not directly supported by PikPak, throws error)
   */
  public async copyFile(sourcePath: string, destinationPath: string): Promise<FileItem> {
    throw new Error('Copy operation is not supported by PikPak provider');
  }

  /**
   * Search files
   */
  public async searchFiles(query: string, path?: string, filters?: FileFilter): Promise<FileItem[]> {
    this.ensureAuthenticated();
    
    try {
      const searchParams: any = {
        q: query,
        limit: 1000
      };

      if (path) {
        const folderId = await this.getFolderIdByPath(this.normalizePath(path));
        searchParams.parent_id = folderId;
      }

      const response = await this.httpClient.get('/drive/v1/files/search', {
        params: searchParams
      });

      const files: FileItem[] = response.data.files.map((file: any) => this.mapPikPakFileToFileItem(file));
      
      return this.applyFilters(files, filters);
    } catch (error) {
      logger.error(`Failed to search PikPak files with query "${query}":`, error);
      throw this.handleError(error, 'searchFiles');
    }
  }

  /**
   * Get download URL
   */
  public async getDownloadUrl(path: string, expiresIn?: number): Promise<string> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const fileId = await this.getFileIdByPath(this.normalizePath(path));
      
      const response = await this.httpClient.get(`/drive/v1/files/${fileId}`, {
        params: { 
          alt: 'media',
          expires_in: expiresIn || 3600 // 1 hour default
        }
      });
      
      return response.data.web_content_link;
    } catch (error) {
      logger.error(`Failed to get download URL for PikPak file ${path}:`, error);
      throw this.handleError(error, 'getDownloadUrl');
    }
  }

  // Private helper methods

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.httpClient.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.httpClient(originalRequest);
          } catch (refreshError) {
            this.authenticated = false;
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new AuthenticationError('No refresh token available', this.providerType);
    }

    try {
      const response = await axios.post(`${this.apiEndpoint}/oauth2/token`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token || this.refreshToken;
      this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      
      logger.info('PikPak access token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh PikPak access token:', error);
      throw new AuthenticationError('Failed to refresh access token', this.providerType);
    }
  }

  private async getUserInfo(): Promise<any> {
    const response = await this.httpClient.get('/drive/v1/about');
    return response.data;
  }

  private async getFolderIdByPath(path: string): Promise<string> {
    if (path === '/') {
      return 'root'; // PikPak root folder ID
    }

    const pathParts = path.split('/').filter(part => part);
    let currentId = 'root';

    for (const part of pathParts) {
      const response = await this.httpClient.get('/drive/v1/files', {
        params: {
          parent_id: currentId,
          name: part,
          trashed: false
        }
      });

      const folder = response.data.files.find((file: any) => 
        file.name === part && file.kind === 'drive#folder'
      );

      if (!folder) {
        throw new NotFoundError(`Folder not found: ${part}`, this.providerType, path);
      }

      currentId = folder.id;
    }

    return currentId;
  }

  private async getFileIdByPath(path: string): Promise<string> {
    const pathParts = path.split('/').filter(part => part);
    const fileName = pathParts.pop();
    const parentPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
    
    const parentId = await this.getFolderIdByPath(parentPath);
    
    const response = await this.httpClient.get('/drive/v1/files', {
      params: {
        parent_id: parentId,
        name: fileName,
        trashed: false
      }
    });

    const file = response.data.files.find((f: any) => f.name === fileName);
    
    if (!file) {
      throw new NotFoundError(`File not found: ${fileName}`, this.providerType, path);
    }

    return file.id;
  }

  private mapPikPakFileToFileItem(file: any): FileItem {
    return {
      id: file.id,
      name: file.name,
      path: file.path || '/', // PikPak may not provide full path
      type: file.kind === 'drive#folder' ? 'folder' : 'file',
      size: file.size ? parseInt(file.size) : undefined,
      mimeType: file.mime_type,
      modifiedAt: file.modified_time ? new Date(file.modified_time) : undefined,
      createdAt: file.created_time ? new Date(file.created_time) : undefined,
      checksum: file.md5_checksum,
      thumbnailUrl: file.thumbnail_link,
      downloadUrl: file.web_content_link,
      parentId: file.parent_id,
      isShared: file.shared || false
    };
  }

  private handleError(error: any, operation: string): Error {
    if (axios.isAxiosError(error)) {
      return createErrorFromResponse(error.response, this.providerType, operation);
    }
    
    return new APIError(
      `PikPak ${operation} failed: ${error.message}`,
      this.providerType,
      undefined,
      error
    );
  }
}