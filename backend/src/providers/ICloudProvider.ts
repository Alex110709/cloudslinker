import { Readable } from 'stream';
import {
  FileItem,
  FileFilter,
  CloudCredentials,
  CloudProviderConfig,
  CloudProviderCapabilities,
  CloudQuota,
  TransferProgress
} from '../types';

/**
 * Base interface that all cloud providers must implement
 * This provides a consistent API across different cloud storage services
 */
export interface ICloudProvider {
  /**
   * Provider type identifier
   */
  readonly providerType: string;

  /**
   * Provider display name
   */
  readonly displayName: string;

  /**
   * Provider capabilities
   */
  readonly capabilities: CloudProviderCapabilities;

  /**
   * Authenticate with the cloud provider
   * @param credentials Authentication credentials
   * @param config Provider-specific configuration
   */
  authenticate(credentials: CloudCredentials, config?: CloudProviderConfig): Promise<void>;

  /**
   * Test the connection to the cloud provider
   * @returns Promise that resolves to true if connection is successful
   */
  testConnection(): Promise<boolean>;

  /**
   * Get account information and storage quota
   * @returns Promise that resolves to quota information
   */
  getQuota(): Promise<CloudQuota>;

  /**
   * List files and folders at the specified path
   * @param path The path to list files from
   * @param filters Optional filters to apply
   * @returns Promise that resolves to an array of file items
   */
  listFiles(path: string, filters?: FileFilter): Promise<FileItem[]>;

  /**
   * Get detailed information about a specific file or folder
   * @param path The path to the file or folder
   * @returns Promise that resolves to file information
   */
  getFileInfo(path: string): Promise<FileItem>;

  /**
   * Create a folder at the specified path
   * @param path The path where to create the folder
   * @returns Promise that resolves to the created folder information
   */
  createFolder(path: string): Promise<FileItem>;

  /**
   * Download a file as a readable stream
   * @param path The path to the file to download
   * @returns Promise that resolves to a readable stream
   */
  downloadFile(path: string): Promise<Readable>;

  /**
   * Upload a file from a readable stream
   * @param path The destination path for the file
   * @param stream The readable stream containing file data
   * @param options Upload options (optional)
   * @returns Promise that resolves to the uploaded file information
   */
  uploadFile(
    path: string, 
    stream: Readable, 
    options?: UploadOptions
  ): Promise<FileItem>;

  /**
   * Delete a file or folder
   * @param path The path to the file or folder to delete
   * @returns Promise that resolves when deletion is complete
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Move/rename a file or folder
   * @param sourcePath The current path of the file or folder
   * @param destinationPath The new path for the file or folder
   * @returns Promise that resolves to the moved file information
   */
  moveFile(sourcePath: string, destinationPath: string): Promise<FileItem>;

  /**
   * Copy a file or folder
   * @param sourcePath The path of the file or folder to copy
   * @param destinationPath The destination path for the copy
   * @returns Promise that resolves to the copied file information
   */
  copyFile(sourcePath: string, destinationPath: string): Promise<FileItem>;

  /**
   * Search for files matching a query
   * @param query The search query
   * @param path The path to search within (optional)
   * @param filters Additional filters (optional)
   * @returns Promise that resolves to matching files
   */
  searchFiles(query: string, path?: string, filters?: FileFilter): Promise<FileItem[]>;

  /**
   * Get a direct download URL for a file (if supported)
   * @param path The path to the file
   * @param expiresIn Expiration time in seconds (optional)
   * @returns Promise that resolves to the download URL
   */
  getDownloadUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * Get upload progress for chunked uploads (if supported)
   * @param uploadId The upload session ID
   * @returns Promise that resolves to upload progress
   */
  getUploadProgress?(uploadId: string): Promise<TransferProgress>;

  /**
   * Cancel an ongoing upload (if supported)
   * @param uploadId The upload session ID
   * @returns Promise that resolves when upload is cancelled
   */
  cancelUpload?(uploadId: string): Promise<void>;

  /**
   * Resume a paused upload (if supported)
   * @param uploadId The upload session ID
   * @param stream The readable stream to continue upload
   * @returns Promise that resolves to the uploaded file information
   */
  resumeUpload?(uploadId: string, stream: Readable): Promise<FileItem>;
}

/**
 * Upload options interface
 */
export interface UploadOptions {
  /**
   * MIME type of the file
   */
  mimeType?: string;

  /**
   * File size in bytes
   */
  fileSize?: number;

  /**
   * Whether to overwrite existing files
   */
  overwrite?: boolean;

  /**
   * Chunk size for chunked uploads
   */
  chunkSize?: number;

  /**
   * Whether to preserve original timestamps
   */
  preserveTimestamps?: boolean;

  /**
   * Progress callback function
   */
  onProgress?: (progress: TransferProgress) => void;

  /**
   * Custom metadata to attach to the file
   */
  metadata?: Record<string, any>;
}

/**
 * Base abstract class that provides common functionality for cloud providers
 */
export abstract class BaseCloudProvider implements ICloudProvider {
  protected credentials?: CloudCredentials;
  protected config: CloudProviderConfig;
  protected authenticated = false;

  constructor(config: CloudProviderConfig = {}) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      chunkSize: 1024 * 1024, // 1MB default chunk size
      ...config
    };
  }

  // Abstract properties that must be implemented by concrete classes
  abstract readonly providerType: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: CloudProviderCapabilities;

  // Abstract methods that must be implemented by concrete classes
  abstract authenticate(credentials: CloudCredentials, config?: CloudProviderConfig): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  abstract getQuota(): Promise<CloudQuota>;
  abstract listFiles(path: string, filters?: FileFilter): Promise<FileItem[]>;
  abstract getFileInfo(path: string): Promise<FileItem>;
  abstract createFolder(path: string): Promise<FileItem>;
  abstract downloadFile(path: string): Promise<Readable>;
  abstract uploadFile(path: string, stream: Readable, options?: UploadOptions): Promise<FileItem>;
  abstract deleteFile(path: string): Promise<void>;
  abstract moveFile(sourcePath: string, destinationPath: string): Promise<FileItem>;
  abstract copyFile(sourcePath: string, destinationPath: string): Promise<FileItem>;
  abstract searchFiles(query: string, path?: string, filters?: FileFilter): Promise<FileItem[]>;
  abstract getDownloadUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * Ensure the provider is authenticated before performing operations
   */
  protected ensureAuthenticated(): void {
    if (!this.authenticated) {
      throw new Error(`${this.providerType} provider is not authenticated`);
    }
  }

  /**
   * Helper method to retry operations with exponential backoff
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    retries: number = this.config.retryAttempts || 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retry(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  /**
   * Helper method to validate file paths
   */
  protected validatePath(path: string): void {
    if (!path || path.trim() === '') {
      throw new Error('Path cannot be empty');
    }
    
    if (path.includes('..')) {
      throw new Error('Path cannot contain ".." segments');
    }
  }

  /**
   * Helper method to normalize file paths
   */
  protected normalizePath(path: string): string {
    // Remove leading/trailing whitespace
    path = path.trim();
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Remove duplicate slashes
    path = path.replace(/\/+/g, '/');
    
    // Remove trailing slash (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    
    return path;
  }

  /**
   * Helper method to apply file filters
   */
  protected applyFilters(files: FileItem[], filters?: FileFilter): FileItem[] {
    if (!filters) return files;

    return files.filter(file => {
      // Apply include patterns
      if (filters.includePatterns && filters.includePatterns.length > 0) {
        const included = filters.includePatterns.some(pattern =>
          this.matchesPattern(file.name, pattern)
        );
        if (!included) return false;
      }

      // Apply exclude patterns
      if (filters.excludePatterns && filters.excludePatterns.length > 0) {
        const excluded = filters.excludePatterns.some(pattern =>
          this.matchesPattern(file.name, pattern)
        );
        if (excluded) return false;
      }

      // Apply size filters
      if (file.size !== undefined) {
        if (filters.minSize !== undefined && file.size < filters.minSize) {
          return false;
        }
        if (filters.maxSize !== undefined && file.size > filters.maxSize) {
          return false;
        }
      }

      // Apply date filters
      if (file.modifiedAt) {
        if (filters.modifiedAfter && file.modifiedAt < filters.modifiedAfter) {
          return false;
        }
        if (filters.modifiedBefore && file.modifiedAt > filters.modifiedBefore) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Helper method to match file names against patterns (simple glob-like matching)
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
  }
}

/**
 * Cloud provider factory interface
 */
export interface ICloudProviderFactory {
  /**
   * Create a cloud provider instance
   * @param providerType The type of provider to create
   * @param config Provider configuration
   * @returns Promise that resolves to the provider instance
   */
  createProvider(providerType: string, config?: CloudProviderConfig): Promise<ICloudProvider>;

  /**
   * Get list of supported provider types
   * @returns Array of supported provider type names
   */
  getSupportedProviders(): string[];

  /**
   * Register a new provider type
   * @param providerType The provider type name
   * @param providerClass The provider class constructor
   */
  registerProvider(providerType: string, providerClass: new (config?: CloudProviderConfig) => ICloudProvider): void;
}