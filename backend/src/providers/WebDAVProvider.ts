import { Readable } from 'stream';
import { createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { createClient, WebDAVClient } from 'webdav';
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
  BasicAuthCredentials
} from '../types';
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  NotFoundError,
  FileExistsError,
  InvalidOperationError,
  UnsupportedOperationError,
  APIError
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
 * WebDAV cloud storage provider implementation
 * Supports Basic and Digest authentication
 */
export class WebDAVProvider extends BaseCloudProvider implements ICloudProvider {
  public readonly providerType = 'webdav';
  public readonly displayName = 'WebDAV';
  public readonly capabilities: CloudProviderCapabilities = {
    supportsUpload: true,
    supportsDownload: true,
    supportsDelete: true,
    supportsFolders: true,
    supportsMove: true,
    supportsCopy: true,
    supportsResume: false, // Most WebDAV servers don't support resumable uploads
    supportsChunkedUpload: false,
    maxFileSize: undefined, // Depends on server configuration
    supportedMimeTypes: undefined // WebDAV supports all file types
  };

  private client?: WebDAVClient;
  private endpoint: string = '';
  private username: string = '';
  private password: string = '';

  constructor(config: CloudProviderConfig = {}) {
    super({
      timeout: 30000,
      retryAttempts: 3,
      verifySSL: true,
      ...config
    });
  }

  /**
   * Authenticate with WebDAV server using Basic or Digest auth
   */
  public async authenticate(credentials: CloudCredentials, config?: CloudProviderConfig): Promise<void> {
    try {
      const basicCreds = credentials as BasicAuthCredentials;
      
      if (basicCreds.type !== 'basic') {
        throw new AuthenticationError(
          'WebDAV provider requires basic authentication credentials',
          this.providerType
        );
      }

      if (!basicCreds.endpoint || !basicCreds.username || !basicCreds.password) {
        throw new AuthenticationError(
          'WebDAV requires endpoint, username, and password',
          this.providerType
        );
      }

      this.endpoint = basicCreds.endpoint;
      this.username = basicCreds.username;
      this.password = basicCreds.password;

      // Create WebDAV client
      this.client = createClient(this.endpoint, {
        username: this.username,
        password: this.password,
        maxBodyLength: this.config.maxBodyLength || 50 * 1024 * 1024, // 50MB
        maxContentLength: this.config.maxContentLength || 50 * 1024 * 1024,
        timeout: this.config.timeout,
        ...(config?.verifySSL === false && { 
          httpsAgent: { rejectUnauthorized: false } 
        })
      });

      // Test connection
      await this.testConnection();
      this.authenticated = true;
      logger.info('WebDAV authentication successful');

    } catch (error) {
      this.authenticated = false;
      logger.error('WebDAV authentication failed:', error);
      
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new AuthenticationError(
        `WebDAV authentication failed: ${error instanceof Error ? error.message : error}`,
        this.providerType
      );
    }
  }

  /**
   * Test connection to WebDAV server
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        throw new Error('WebDAV client not initialized');
      }

      // Try to list root directory
      await this.client.getDirectoryContents('/');
      return true;
    } catch (error) {
      logger.warn('WebDAV connection test failed:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new AuthenticationError('Invalid WebDAV credentials', this.providerType);
        }
        if (error.message.includes('403') || error.message.includes('Forbidden')) {
          throw new AuthorizationError('Access denied to WebDAV server', this.providerType);
        }
        if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          throw new NetworkError('Cannot connect to WebDAV server', this.providerType);
        }
      }
      
      return false;
    }
  }

  /**
   * Get storage quota (not supported by most WebDAV servers)
   */
  public async getQuota(): Promise<CloudQuota> {
    this.ensureAuthenticated();
    
    // Most WebDAV servers don't provide quota information
    // Return unknown quota
    return {
      total: 0,
      used: 0,
      available: 0,
      unit: 'bytes'
    };
  }

  /**
   * List files in a directory
   */
  public async listFiles(path: string, filters?: FileFilter): Promise<FileItem[]> {
    this.ensureAuthenticated();
    this.validatePath(path);
    
    try {
      const normalizedPath = this.normalizePath(path);
      const contents = await this.client!.getDirectoryContents(normalizedPath, {
        details: true
      });

      const files: FileItem[] = Array.isArray(contents) 
        ? contents.map((item: any) => this.mapWebDAVItemToFileItem(item))
        : [];
      
      return this.applyFilters(files, filters);
    } catch (error) {
      logger.error(`Failed to list WebDAV files at ${path}:`, error);
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
      const stat = await this.client!.stat(normalizedPath, { details: true });
      
      return this.mapWebDAVItemToFileItem(stat.data);
    } catch (error) {
      logger.error(`Failed to get WebDAV file info for ${path}:`, error);
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
      
      // Check if folder already exists
      try {
        const existing = await this.getFileInfo(normalizedPath);
        if (existing.type === 'folder') {
          throw new FileExistsError(
            `Folder already exists: ${path}`,
            this.providerType,
            path
          );
        }
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }
        // Folder doesn't exist, proceed with creation
      }

      await this.client!.createDirectory(normalizedPath);
      
      // Return folder info
      return await this.getFileInfo(normalizedPath);
    } catch (error) {
      logger.error(`Failed to create WebDAV folder ${path}:`, error);
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
      const stream = this.client!.createReadStream(normalizedPath);
      
      return stream;
    } catch (error) {
      logger.error(`Failed to download WebDAV file ${path}:`, error);
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
      
      // Check if file already exists and overwrite option
      if (!options?.overwrite) {
        try {
          await this.getFileInfo(normalizedPath);
          throw new FileExistsError(
            `File already exists: ${path}`,
            this.providerType,
            path
          );
        } catch (error) {
          if (!(error instanceof NotFoundError)) {
            throw error;
          }
          // File doesn't exist, proceed with upload
        }
      }

      // Create write stream and pipe
      const writeStream = this.client!.createWriteStream(normalizedPath, {
        overwrite: options?.overwrite || false
      });

      // Handle upload progress if callback provided
      let totalBytes = options?.fileSize || 0;
      let uploadedBytes = 0;

      if (options?.onProgress && totalBytes > 0) {
        stream.on('data', (chunk: Buffer) => {
          uploadedBytes += chunk.length;
          const progress: TransferProgress = {
            jobId: normalizedPath,
            status: 'running',
            progressPercentage: Math.round((uploadedBytes / totalBytes) * 100),
            filesTotal: 1,
            filesCompleted: 0,
            filesFailed: 0,
            bytesTotal: totalBytes,
            bytesTransferred: uploadedBytes,
            transferSpeed: 0, // Calculate separately
            estimatedTimeRemaining: 0, // Calculate separately
            currentFile: path.split('/').pop() || path,
            updatedAt: new Date()
          };
          options.onProgress!(progress);
        });
      }

      // Pipe the stream
      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        stream.on('error', reject);
      });

      // Return uploaded file info
      return await this.getFileInfo(normalizedPath);
    } catch (error) {
      logger.error(`Failed to upload file to WebDAV ${path}:`, error);
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
      await this.client!.deleteFile(normalizedPath);
    } catch (error) {
      logger.error(`Failed to delete WebDAV file ${path}:`, error);
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
      
      await this.client!.moveFile(normalizedSource, normalizedDest);
      
      return await this.getFileInfo(normalizedDest);
    } catch (error) {
      logger.error(`Failed to move WebDAV file from ${sourcePath} to ${destinationPath}:`, error);
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
      
      await this.client!.copyFile(normalizedSource, normalizedDest);
      
      return await this.getFileInfo(normalizedDest);
    } catch (error) {
      logger.error(`Failed to copy WebDAV file from ${sourcePath} to ${destinationPath}:`, error);
      throw this.handleError(error, 'copyFile');
    }
  }

  /**
   * Search files (basic implementation using list and filter)
   */
  public async searchFiles(query: string, path?: string, filters?: FileFilter): Promise<FileItem[]> {
    this.ensureAuthenticated();
    
    try {
      const searchPath = path ? this.normalizePath(path) : '/';
      
      // WebDAV doesn't have native search, so we'll do a recursive listing
      const allFiles = await this.listFilesRecursive(searchPath);
      
      // Filter by query (simple name matching)
      const matchedFiles = allFiles.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase())
      );
      
      return this.applyFilters(matchedFiles, filters);
    } catch (error) {
      logger.error(`Failed to search WebDAV files with query "${query}":`, error);
      throw this.handleError(error, 'searchFiles');
    }
  }

  /**
   * Get download URL (WebDAV doesn't support direct URLs)
   */
  public async getDownloadUrl(path: string, expiresIn?: number): Promise<string> {
    throw new UnsupportedOperationError(
      'WebDAV does not support direct download URLs',
      this.providerType,
      'getDownloadUrl'
    );
  }

  // Private helper methods

  private async listFilesRecursive(path: string, maxDepth: number = 3, currentDepth: number = 0): Promise<FileItem[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const files = await this.listFiles(path);
    const allFiles: FileItem[] = [...files];

    // Recursively search in subdirectories
    for (const file of files) {
      if (file.type === 'folder') {
        const subFiles = await this.listFilesRecursive(
          join(path, file.name), 
          maxDepth, 
          currentDepth + 1
        );
        allFiles.push(...subFiles);
      }
    }

    return allFiles;
  }

  private mapWebDAVItemToFileItem(item: any): FileItem {
    const isFolder = item.type === 'directory';
    
    return {
      id: item.filename, // WebDAV uses filename as ID
      name: item.basename,
      path: item.filename,
      type: isFolder ? 'folder' : 'file',
      size: isFolder ? undefined : parseInt(item.size) || 0,
      mimeType: item.mime || undefined,
      modifiedAt: item.lastmod ? new Date(item.lastmod) : undefined,
      createdAt: undefined, // WebDAV doesn't typically provide creation time
      checksum: item.etag || undefined,
      thumbnailUrl: undefined,
      downloadUrl: undefined,
      parentId: undefined,
      isShared: undefined
    };
  }

  private handleError(error: any, operation: string): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('401') || message.includes('unauthorized')) {
        return new AuthenticationError(
          'WebDAV authentication failed',
          this.providerType
        );
      }
      
      if (message.includes('403') || message.includes('forbidden')) {
        return new AuthorizationError(
          'Access denied to WebDAV resource',
          this.providerType
        );
      }
      
      if (message.includes('404') || message.includes('not found')) {
        return new NotFoundError(
          'WebDAV resource not found',
          this.providerType,
          operation
        );
      }
      
      if (message.includes('409') || message.includes('conflict')) {
        return new FileExistsError(
          'WebDAV resource already exists',
          this.providerType,
          operation
        );
      }
      
      if (message.includes('timeout') || message.includes('econnrefused')) {
        return new NetworkError(
          'WebDAV connection failed',
          this.providerType
        );
      }
      
      if (message.includes('405') || message.includes('method not allowed')) {
        return new UnsupportedOperationError(
          `WebDAV operation not supported: ${operation}`,
          this.providerType,
          operation
        );
      }
    }
    
    return new APIError(
      `WebDAV ${operation} failed: ${error instanceof Error ? error.message : error}`,
      this.providerType,
      undefined,
      error
    );
  }
}