import { ICloudProvider, ICloudProviderFactory } from './ICloudProvider';
import { CloudProviderConfig } from '../types';
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
 * Factory class for creating cloud provider instances
 */
export class CloudProviderFactory implements ICloudProviderFactory {
  private static instance: CloudProviderFactory;
  private providers: Map<string, new (config?: CloudProviderConfig) => ICloudProvider> = new Map();

  private constructor() {
    // Register default providers
    this.registerDefaultProviders();
  }

  /**
   * Get singleton instance of the factory
   */
  public static getInstance(): CloudProviderFactory {
    if (!CloudProviderFactory.instance) {
      CloudProviderFactory.instance = new CloudProviderFactory();
    }
    return CloudProviderFactory.instance;
  }

  /**
   * Create a cloud provider instance
   * @param providerType The type of provider to create
   * @param config Provider configuration
   * @returns Promise that resolves to the provider instance
   */
  public async createProvider(
    providerType: string, 
    config?: CloudProviderConfig
  ): Promise<ICloudProvider> {
    const ProviderClass = this.providers.get(providerType.toLowerCase());
    
    if (!ProviderClass) {
      const supportedProviders = Array.from(this.providers.keys()).join(', ');
      throw new Error(
        `Unsupported provider type: ${providerType}. Supported providers: ${supportedProviders}`
      );
    }

    try {
      const provider = new ProviderClass(config);
      logger.info(`Created ${providerType} provider instance`);
      return provider;
    } catch (error) {
      logger.error(`Failed to create ${providerType} provider:`, error);
      throw new Error(`Failed to create ${providerType} provider: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get list of supported provider types
   * @returns Array of supported provider type names
   */
  public getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Register a new provider type
   * @param providerType The provider type name
   * @param providerClass The provider class constructor
   */
  public registerProvider(
    providerType: string, 
    providerClass: new (config?: CloudProviderConfig) => ICloudProvider
  ): void {
    const normalizedType = providerType.toLowerCase();
    
    if (this.providers.has(normalizedType)) {
      logger.warn(`Provider ${providerType} is already registered. Overwriting...`);
    }

    this.providers.set(normalizedType, providerClass);
    logger.info(`Registered provider: ${providerType}`);
  }

  /**
   * Unregister a provider type
   * @param providerType The provider type name to unregister
   */
  public unregisterProvider(providerType: string): boolean {
    const normalizedType = providerType.toLowerCase();
    const existed = this.providers.delete(normalizedType);
    
    if (existed) {
      logger.info(`Unregistered provider: ${providerType}`);
    } else {
      logger.warn(`Attempted to unregister non-existent provider: ${providerType}`);
    }
    
    return existed;
  }

  /**
   * Check if a provider type is supported
   * @param providerType The provider type to check
   * @returns True if the provider is supported
   */
  public isProviderSupported(providerType: string): boolean {
    return this.providers.has(providerType.toLowerCase());
  }

  /**
   * Get provider capabilities without creating an instance
   * @param providerType The provider type
   * @returns Provider capabilities or null if not supported
   */
  public async getProviderCapabilities(providerType: string): Promise<any> {
    if (!this.isProviderSupported(providerType)) {
      return null;
    }

    try {
      // Create a temporary instance to get capabilities
      const provider = await this.createProvider(providerType);
      return provider.capabilities;
    } catch (error) {
      logger.error(`Failed to get capabilities for ${providerType}:`, error);
      return null;
    }
  }

  /**
   * Register default providers (imported dynamically to avoid circular dependencies)
   */
  private registerDefaultProviders(): void {
    // We'll import and register providers dynamically as they're implemented
    // This avoids circular dependencies and allows for lazy loading
    
    logger.info('CloudProviderFactory initialized');
    logger.debug('Default providers will be registered when modules are loaded');
  }

  /**
   * Register all available providers by auto-discovering them
   */
  public async autoRegisterProviders(): Promise<void> {
    try {
      // Dynamic imports to avoid circular dependencies
      
      // Register PikPak provider
      try {
        const { PikPakProvider } = await import('./PikPakProvider');
        this.registerProvider('pikpak', PikPakProvider);
      } catch (error) {
        logger.debug('PikPak provider not available:', error instanceof Error ? error.message : error);
      }

      // Register WebDAV provider
      try {
        const { WebDAVProvider } = await import('./WebDAVProvider');
        this.registerProvider('webdav', WebDAVProvider);
      } catch (error) {
        logger.debug('WebDAV provider not available:', error instanceof Error ? error.message : error);
      }

      // Register Synology provider
      try {
        const { SynologyProvider } = await import('./SynologyProvider');
        this.registerProvider('synology', SynologyProvider);
      } catch (error) {
        logger.debug('Synology provider not available:', error instanceof Error ? error.message : error);
      }

      // Register Google Drive provider
      try {
        const { GoogleDriveProvider } = await import('./GoogleDriveProvider');
        this.registerProvider('google_drive', GoogleDriveProvider);
      } catch (error) {
        logger.debug('Google Drive provider not available:', error instanceof Error ? error.message : error);
      }

      // Register OneDrive provider
      try {
        const { OneDriveProvider } = await import('./OneDriveProvider');
        this.registerProvider('onedrive', OneDriveProvider);
      } catch (error) {
        logger.debug('OneDrive provider not available:', error instanceof Error ? error.message : error);
      }

      // Register Dropbox provider
      try {
        const { DropboxProvider } = await import('./DropboxProvider');
        this.registerProvider('dropbox', DropboxProvider);
      } catch (error) {
        logger.debug('Dropbox provider not available:', error instanceof Error ? error.message : error);
      }

      logger.info(`Auto-registered ${this.providers.size} cloud providers`);
      
    } catch (error) {
      logger.error('Error during auto-registration of providers:', error);
    }
  }
}

// Export singleton instance
export const cloudProviderFactory = CloudProviderFactory.getInstance();