import { Readable } from 'stream';
import axios, { AxiosInstance } from 'axios';
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
  AccountCredentials
} from '../types';
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError,
  FileExistsError,
  InvalidOperationError,
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
 * Synology NAS provider implementation using DSM API
 * Supports username/password authentication with session management
 */
export class SynologyProvider extends BaseCloudProvider implements ICloudProvider {
  public readonly providerType = 'synology';
  public readonly displayName = 'Synology NAS';
  public readonly capabilities: CloudProviderCapabilities = {
    supportsUpload: true,
    supportsDownload: true,
    supportsDelete: true,
    supportsFolders: true,
    supportsMove: true,
    supportsCopy: true,
    supportsResume: false, // DSM API doesn't support resumable uploads
    supportsChunkedUpload: true,
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB (typical DSM limit)
    supportedMimeTypes: undefined // Synology supports all file types
  };

  private httpClient: AxiosInstance;
  private sessionId?: string;
  private synoToken?: string;
  private host: string = '';
  private port: number = 5001;
  private secure: boolean = true;
  private username: string = '';
  private password: string = '';
  private apiVersion: string = '7.0';

  constructor(config: CloudProviderConfig = {}) {
    super({
      timeout: 30000,
      retryAttempts: 3,
      chunkSize: 1024 * 1024, // 1MB chunks for Synology
      ...config
    });

    this.apiVersion = config.apiVersion || '7.0';

    // Initialize HTTP client (will be reconfigured after authentication)
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'CloudsLinker/1.0.0'
      }
    });
  }

  /**
   * Authenticate with Synology DSM using username/password
   */
  public async authenticate(credentials: CloudCredentials, config?: CloudProviderConfig): Promise<void> {
    try {
      const accountCreds = credentials as AccountCredentials;
      
      if (accountCreds.type !== 'account') {
        throw new AuthenticationError(
          'Synology provider requires account credentials',
          this.providerType
        );
      }

      if (!accountCreds.host || !accountCreds.username || !accountCreds.password) {
        throw new AuthenticationError(
          'Synology requires host, username, and password',
          this.providerType
        );
      }

      this.host = accountCreds.host;
      this.port = accountCreds.port || 5001;
      this.secure = accountCreds.secure !== false;
      this.username = accountCreds.username;
      this.password = accountCreds.password;

      // Configure base URL
      const protocol = this.secure ? 'https' : 'http';
      const baseURL = `${protocol}://${this.host}:${this.port}`;
      
      this.httpClient = axios.create({
        baseURL,
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'CloudsLinker/1.0.0'
        },
        // Allow self-signed certificates for NAS devices
        httpsAgent: this.secure ? { rejectUnauthorized: false } : undefined
      });

      // Perform login
      await this.login();
      this.authenticated = true;
      logger.info('Synology authentication successful');

    } catch (error) {
      this.authenticated = false;
      logger.error('Synology authentication failed:', error);
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new AuthenticationError(
        `Synology authentication failed: ${error instanceof Error ? error.message : error}`,
        this.providerType
      );
    }
  }

  /**
   * Test connection to Synology DSM
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.sessionId) {
        await this.login();
      }
      
      // Test with a simple API call
      await this.httpClient.get('/webapi/query.cgi', {
        params: {
          api: 'SYNO.API.Info',
          version: 1,
          method: 'query',
          query: 'SYNO.FileStation.Info'
        }
      });
      
      return true;
    } catch (error) {
      logger.warn('Synology connection test failed:', error);
      return false;
    }
  }

  /**
   * Get storage quota information
   */
  public async getQuota(): Promise<CloudQuota> {
    this.ensureAuthenticated();
    
    try {
      const response = await this.apiCall('SYNO.FileStation.Info', 'get', 2);
      
      const data = response.data;
      const quota = data.volume_quota || {};
      
      return {
        total: parseInt(quota.total_space) || 0,
        used: parseInt(quota.used_space) || 0,
        available: parseInt(quota.free_space) || 0,
        unit: 'bytes'
      };
    } catch (error) {
      logger.error('Failed to get Synology quota:', error);
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
      
      const response = await this.apiCall('SYNO.FileStation.List', 'list', 2, {
        folder_path: normalizedPath,
        limit: 1000,
        offset: 0,
        sort_by: 'name',
        sort_direction: 'asc',
        pattern: '',
        filetype: 'all',
        goto_path: '',
        additional: ['real_path', 'size', 'owner', 'time', 'perm', 'type']
      });

      const files: FileItem[] = response.data.files.map((file: any) => this.mapSynologyFileToFileItem(file));
      
      return this.applyFilters(files, filters);
    } catch (error) {
      logger.error(`Failed to list Synology files at ${path}:`, error);
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
      
      const response = await this.apiCall('SYNO.FileStation.List', 'getinfo', 2, {
        path: [normalizedPath],
        additional: ['real_path', 'size', 'owner', 'time', 'perm', 'type']
      });
      
      if (!response.data.files || response.data.files.length === 0) {
        throw new NotFoundError(`File not found: ${path}`, this.providerType, path);
      }
      
      return this.mapSynologyFileToFileItem(response.data.files[0]);
    } catch (error) {
      logger.error(`Failed to get Synology file info for ${path}:`, error);
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
      
      await this.apiCall('SYNO.FileStation.CreateFolder', 'create', 2, {
        folder_path: parentPath,
        name: [folderName],
        force_parent: false,
        additional: ['real_path', 'size', 'owner', 'time', 'perm', 'type']
      });
      
      return await this.getFileInfo(normalizedPath);
    } catch (error) {
      logger.error(`Failed to create Synology folder ${path}:`, error);
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
      
      const response = await this.httpClient.get('/webapi/entry.cgi', {
        params: {
          api: 'SYNO.FileStation.Download',
          version: 2,
          method: 'download',
          path: normalizedPath,
          mode: 'download',
          _sid: this.sessionId
        },
        responseType: 'stream'
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to download Synology file ${path}:`, error);
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
      
      // Check file size limit
      if (options?.fileSize && options.fileSize > this.capabilities.maxFileSize!) {
        throw new FileSizeLimitError(
          `File size ${options.fileSize} exceeds maximum size ${this.capabilities.maxFileSize}`,
          this.providerType,
          options.fileSize,
          this.capabilities.maxFileSize!
        );
      }

      // Create form data
      const formData = new FormData();
      formData.append('api', 'SYNO.FileStation.Upload');
      formData.append('version', '2');
      formData.append('method', 'upload');
      formData.append('path', parentPath);
      formData.append('create_parents', 'false');
      formData.append('overwrite', options?.overwrite ? 'true' : 'false');
      formData.append('_sid', this.sessionId!);
      
      if (this.synoToken) {
        formData.append('SynoToken', this.synoToken);
      }

      formData.append('file', stream, {
        filename: fileName,
        contentType: options?.mimeType || 'application/octet-stream'
      });

      const uploadResponse = await this.httpClient.post('/webapi/entry.cgi', formData, {
        headers: {
          ...formData.getHeaders()
        },
        timeout: this.config.timeout! * 3, // Longer timeout for uploads
        onUploadProgress: (progressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const progress: TransferProgress = {
              jobId: normalizedPath,
              status: 'running',
              progressPercentage: Math.round((progressEvent.loaded / progressEvent.total) * 100),
              filesTotal: 1,
              filesCompleted: 0,
              filesFailed: 0,
              bytesTotal: progressEvent.total,
              bytesTransferred: progressEvent.loaded,
              transferSpeed: 0,
              estimatedTimeRemaining: 0,
              currentFile: fileName,
              updatedAt: new Date()
            };
            options.onProgress(progress);
          }
        }
      });

      if (!uploadResponse.data.success) {
        throw new APIError(
          `Upload failed: ${uploadResponse.data.error?.code}`,
          this.providerType,
          uploadResponse.status
        );
      }

      return await this.getFileInfo(normalizedPath);
    } catch (error) {
      logger.error(`Failed to upload file to Synology ${path}:`, error);
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
      
      await this.apiCall('SYNO.FileStation.Delete', 'delete', 2, {
        path: [normalizedPath],
        accurate: true,
        recursive: true
      });
    } catch (error) {
      logger.error(`Failed to delete Synology file ${path}:`, error);
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
      const normalizedSource = this.normalizePath(sourcePath);
      const normalizedDest = this.normalizePath(destinationPath);
      
      const destParts = normalizedDest.split('/').filter(part => part);
      const newName = destParts.pop();
      const destFolder = destParts.length > 0 ? '/' + destParts.join('/') : '/';
      
      await this.apiCall('SYNO.FileStation.CopyMove', 'start', 3, {
        path: [normalizedSource],
        dest_folder_path: destFolder,
        overwrite: false,
        remove_src: true,
        accurate: true,
        search_taskid: ''
      });
      
      // If name is different, we need to rename after move
      const sourceFileName = normalizedSource.split('/').pop();
      if (sourceFileName !== newName) {
        const movedPath = destFolder + '/' + sourceFileName;
        await this.apiCall('SYNO.FileStation.Rename', 'rename', 2, {
          path: [movedPath],
          name: [newName!],
          additional: ['real_path', 'size', 'owner', 'time', 'perm', 'type']
        });
      }
      
      return await this.getFileInfo(normalizedDest);
    } catch (error) {
      logger.error(`Failed to move Synology file from ${sourcePath} to ${destinationPath}:`, error);
      throw this.handleError(error, 'moveFile');
    }
  }

  /**
   * Copy a file or folder
   */
  public async copyFile(sourcePath: string, destinationPath: string): Promise<FileItem> {
    this.ensureAuthenticated();
    this.validatePath(sourcePath);
    this.validatePath(destinationPath);
    
    try {
      const normalizedSource = this.normalizePath(sourcePath);
      const normalizedDest = this.normalizePath(destinationPath);
      
      const destParts = normalizedDest.split('/').filter(part => part);
      const newName = destParts.pop();
      const destFolder = destParts.length > 0 ? '/' + destParts.join('/') : '/';
      
      await this.apiCall('SYNO.FileStation.CopyMove', 'start', 3, {
        path: [normalizedSource],
        dest_folder_path: destFolder,
        overwrite: false,
        remove_src: false,
        accurate: true,
        search_taskid: ''
      });
      
      // If name is different, we need to rename after copy
      const sourceFileName = normalizedSource.split('/').pop();
      if (sourceFileName !== newName) {
        const copiedPath = destFolder + '/' + sourceFileName;
        await this.apiCall('SYNO.FileStation.Rename', 'rename', 2, {
          path: [copiedPath],
          name: [newName!],
          additional: ['real_path', 'size', 'owner', 'time', 'perm', 'type']
        });
      }
      
      return await this.getFileInfo(normalizedDest);
    } catch (error) {
      logger.error(`Failed to copy Synology file from ${sourcePath} to ${destinationPath}:`, error);
      throw this.handleError(error, 'copyFile');
    }
  }

  /**
   * Search files
   */
  public async searchFiles(query: string, path?: string, filters?: FileFilter): Promise<FileItem[]> {
    this.ensureAuthenticated();
    
    try {
      const searchPath = path ? this.normalizePath(path) : '/';
      
      const response = await this.apiCall('SYNO.FileStation.Search', 'start', 2, {
        folder_path: searchPath,
        recursive: true,
        pattern: query,
        extension: '',
        filetype: 'all',
        size_from: 0,
        size_to: -1,
        mtime_from: 0,
        mtime_to: 0,
        crtime_from: 0,
        crtime_to: 0,
        atime_from: 0,
        atime_to: 0
      });

      const taskId = response.data.taskid;
      
      // Wait for search to complete and get results
      let searchResults;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      do {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await this.apiCall('SYNO.FileStation.Search', 'list', 2, {
          taskid: taskId,
          offset: 0,
          limit: 1000,
          sort_by: 'name',
          sort_direction: 'asc',
          pattern: '',
          filetype: 'all',
          additional: ['real_path', 'size', 'owner', 'time', 'perm', 'type']
        });
        
        if (statusResponse.data.finished) {
          searchResults = statusResponse.data.files;
          break;
        }
        
        attempts++;
      } while (attempts < maxAttempts);

      // Clean up search task
      await this.apiCall('SYNO.FileStation.Search', 'stop', 2, {
        taskid: taskId
      });

      if (!searchResults) {
        throw new Error('Search timeout');
      }

      const files: FileItem[] = searchResults.map((file: any) => this.mapSynologyFileToFileItem(file));
      
      return this.applyFilters(files, filters);
    } catch (error) {
      logger.error(`Failed to search Synology files with query "${query}":`, error);
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
      const normalizedPath = this.normalizePath(path);
      
      // Synology doesn't provide temporary URLs, return direct download URL
      const protocol = this.secure ? 'https' : 'http';
      const baseUrl = `${protocol}://${this.host}:${this.port}`;
      
      return `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=${encodeURIComponent(normalizedPath)}&mode=download&_sid=${this.sessionId}`;
    } catch (error) {
      logger.error(`Failed to get download URL for Synology file ${path}:`, error);
      throw this.handleError(error, 'getDownloadUrl');
    }
  }

  // Private helper methods

  private async login(): Promise<void> {
    try {
      const response = await this.httpClient.get('/webapi/auth.cgi', {
        params: {
          api: 'SYNO.API.Auth',
          version: 6,
          method: 'login',
          account: this.username,
          passwd: this.password,
          session: 'FileStation',
          format: 'sid'
        }
      });

      if (!response.data.success) {
        throw new AuthenticationError(
          `Login failed: ${response.data.error?.code}`,
          this.providerType
        );
      }

      this.sessionId = response.data.data.sid;
      this.synoToken = response.data.data.synotoken;
      
      logger.info('Synology login successful');
    } catch (error) {
      logger.error('Synology login failed:', error);
      throw error;
    }
  }

  private async logout(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.httpClient.get('/webapi/auth.cgi', {
          params: {
            api: 'SYNO.API.Auth',
            version: 6,
            method: 'logout',
            session: 'FileStation',
            _sid: this.sessionId
          }
        });
      } catch (error) {
        logger.warn('Synology logout failed:', error);
      }
      
      this.sessionId = undefined;
      this.synoToken = undefined;
    }
  }

  private async apiCall(api: string, method: string, version: number, params: any = {}): Promise<any> {
    const response = await this.httpClient.get('/webapi/entry.cgi', {
      params: {
        api,
        version,
        method,
        _sid: this.sessionId,
        ...params
      }
    });

    if (!response.data.success) {
      const errorCode = response.data.error?.code;
      throw new APIError(
        `Synology API error: ${errorCode}`,
        this.providerType,
        response.status,
        response.data
      );
    }

    return response.data;
  }

  private mapSynologyFileToFileItem(file: any): FileItem {
    const isFolder = file.isdir;
    
    return {
      id: file.path,
      name: file.name,
      path: file.path,
      type: isFolder ? 'folder' : 'file',
      size: isFolder ? undefined : parseInt(file.size) || 0,
      mimeType: file.type || undefined,
      modifiedAt: file.additional?.time?.mtime ? new Date(file.additional.time.mtime * 1000) : undefined,
      createdAt: file.additional?.time?.crtime ? new Date(file.additional.time.crtime * 1000) : undefined,
      checksum: undefined,
      thumbnailUrl: undefined,
      downloadUrl: undefined,
      parentId: undefined,
      isShared: file.additional?.perm?.share || false
    };
  }

  private handleError(error: any, operation: string): Error {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error?.code) {
        const errorCode = error.response.data.error.code;
        
        switch (errorCode) {
          case 400:
          case 401:
            return new AuthenticationError(
              'Synology authentication failed',
              this.providerType
            );
          case 403:
            return new AuthorizationError(
              'Access denied to Synology resource',
              this.providerType
            );
          case 408:
            return new NotFoundError(
              'Synology resource not found',
              this.providerType,
              operation
            );
          default:
            return new APIError(
              `Synology API error: ${errorCode}`,
              this.providerType,
              error.response.status,
              error.response.data
            );
        }
      }
      
      return createErrorFromResponse(error.response, this.providerType, operation);
    }
    
    return new APIError(
      `Synology ${operation} failed: ${error instanceof Error ? error.message : error}`,
      this.providerType,
      undefined,
      error
    );
  }
}