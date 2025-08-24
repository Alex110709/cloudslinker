import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as cron from 'node-cron';
import { SyncJob, FileItem, SyncOptions, TransferProgress } from '../types';
import { query } from '../database/connection';
import { cloudProviderFactory } from '../providers/CloudProviderFactory';
import { ICloudProvider } from '../providers/ICloudProvider';
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

export interface CreateSyncJobRequest {
  userId: string;
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  syncMode: 'one_way' | 'two_way' | 'mirror';
  scheduleCron?: string;
  filters?: any;
  options?: SyncOptions;
  conflictResolution?: 'skip' | 'overwrite' | 'rename';
}

export interface SyncJobUpdate {
  isActive?: boolean;
  lastSync?: Date;
  nextSync?: Date;
  lastSyncStatus?: 'pending' | 'running' | 'completed' | 'failed';
  scheduleCron?: string;
  filters?: any;
  options?: SyncOptions;
  conflictResolution?: 'skip' | 'overwrite' | 'rename';
}

export interface SyncOperation {
  type: 'upload' | 'download' | 'delete';
  sourcePath: string;
  destinationPath: string;
  file: FileItem;
  direction: 'source_to_dest' | 'dest_to_source';
}

export class SyncEngine extends EventEmitter {
  private activeSyncs = new Map<string, SyncExecution>();
  private scheduledJobs = new Map<string, cron.ScheduledTask>();
  private readonly maxConcurrentSyncs: number;

  constructor() {
    super();
    this.maxConcurrentSyncs = parseInt(process.env.MAX_CONCURRENT_SYNCS || '3');
    
    // Initialize scheduled jobs on startup
    this.initializeScheduledJobs();
  }

  /**
   * Create a new sync job
   */
  public async createSyncJob(request: CreateSyncJobRequest): Promise<SyncJob> {
    try {
      const jobId = uuidv4();
      const now = new Date();

      // Validate cron expression if provided
      if (request.scheduleCron && !cron.validate(request.scheduleCron)) {
        throw new Error('Invalid cron expression');
      }

      // Calculate next sync time
      const nextSync = request.scheduleCron 
        ? this.calculateNextSync(request.scheduleCron)
        : null;

      // Validate cloud providers
      await this.validateCloudProviders(request.sourceCloudId, request.destinationCloudId);

      const result = await query(
        `INSERT INTO sync_jobs (
          id, user_id, source_cloud_id, destination_cloud_id,
          source_path, destination_path, sync_mode, schedule_cron,
          next_sync, filters, options, conflict_resolution,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          jobId,
          request.userId,
          request.sourceCloudId,
          request.destinationCloudId,
          request.sourcePath,
          request.destinationPath,
          request.syncMode,
          request.scheduleCron || null,
          nextSync,
          JSON.stringify(request.filters || {}),
          JSON.stringify(request.options || {}),
          request.conflictResolution || 'skip',
          now,
          now
        ]
      );

      const syncJob = this.mapDbRowToSyncJob(result.rows[0]);
      
      // Schedule the job if cron is provided
      if (syncJob.scheduleCron && syncJob.isActive) {
        this.scheduleJob(syncJob);
      }
      
      logger.info(`Sync job created: ${jobId}`);
      
      // Emit event for real-time updates
      this.emit('syncJobCreated', syncJob);

      return syncJob;
    } catch (error) {
      logger.error('Failed to create sync job:', error);
      throw error;
    }
  }

  /**
   * Start a sync job manually
   */
  public async startSync(jobId: string): Promise<void> {
    try {
      // Check if sync is already running
      if (this.activeSyncs.has(jobId)) {
        throw new Error('Sync is already running');
      }

      // Check concurrent sync limit
      if (this.activeSyncs.size >= this.maxConcurrentSyncs) {
        throw new Error('Maximum concurrent syncs reached');
      }

      // Get sync job
      const job = await this.getSyncJob(jobId);
      if (!job) {
        throw new Error('Sync job not found');
      }

      if (!job.isActive) {
        throw new Error('Sync job is not active');
      }

      // Update status to running
      await this.updateSyncJob(jobId, { 
        lastSyncStatus: 'running',
        lastSync: new Date()
      });

      // Create sync execution
      const execution = new SyncExecution(job, this);
      this.activeSyncs.set(jobId, execution);

      // Start the sync
      execution.start();

      logger.info(`Sync started: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to start sync ${jobId}:`, error);
      await this.updateSyncJob(jobId, {
        lastSyncStatus: 'failed'
      });
      throw error;
    }
  }

  /**
   * Stop a sync job
   */
  public async stopSync(jobId: string): Promise<void> {
    try {
      const execution = this.activeSyncs.get(jobId);
      if (execution) {
        await execution.stop();
        this.activeSyncs.delete(jobId);
      }

      logger.info(`Sync stopped: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to stop sync ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Update sync job
   */
  public async updateSyncJob(jobId: string, updates: SyncJobUpdate): Promise<SyncJob> {
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbColumn = this.camelToSnakeCase(key);
          setClause.push(`${dbColumn} = $${paramIndex++}`);
          
          if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      if (setClause.length === 0) {
        const job = await this.getSyncJob(jobId);
        if (!job) throw new Error('Sync job not found');
        return job;
      }

      setClause.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      // Handle schedule updates
      if (updates.scheduleCron !== undefined) {
        const nextSync = updates.scheduleCron 
          ? this.calculateNextSync(updates.scheduleCron)
          : null;
        setClause.push(`next_sync = $${paramIndex++}`);
        values.push(nextSync);
      }

      values.push(jobId);

      const result = await query(
        `UPDATE sync_jobs SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Sync job not found');
      }

      const updatedJob = this.mapDbRowToSyncJob(result.rows[0]);

      // Update scheduled job
      this.updateScheduledJob(updatedJob);

      // Emit event
      this.emit('syncJobUpdated', updatedJob);

      return updatedJob;
    } catch (error) {
      logger.error(`Failed to update sync job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync job by ID
   */
  public async getSyncJob(jobId: string): Promise<SyncJob | null> {
    try {
      const result = await query(
        'SELECT * FROM sync_jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbRowToSyncJob(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to get sync job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * List sync jobs for a user
   */
  public async listSyncJobs(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    isActive?: boolean
  ): Promise<{ jobs: SyncJob[]; total: number }> {
    try {
      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];

      if (isActive !== undefined) {
        whereClause += ' AND is_active = $2';
        params.push(isActive);
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM sync_jobs ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      const jobsResult = await query(
        `SELECT * FROM sync_jobs ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const jobs = jobsResult.rows.map(row => this.mapDbRowToSyncJob(row));

      return { jobs, total };
    } catch (error) {
      logger.error(`Failed to list sync jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete sync job
   */
  public async deleteSyncJob(jobId: string): Promise<void> {
    try {
      // Stop sync if running
      await this.stopSync(jobId);

      // Remove scheduled job
      const scheduledTask = this.scheduledJobs.get(jobId);
      if (scheduledTask) {
        scheduledTask.stop();
        this.scheduledJobs.delete(jobId);
      }

      // Delete from database
      await query('DELETE FROM sync_jobs WHERE id = $1', [jobId]);

      logger.info(`Sync job deleted: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to delete sync job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Handle sync completion
   */
  public async completeSync(jobId: string, success: boolean): Promise<void> {
    try {
      const updates: SyncJobUpdate = {
        lastSyncStatus: success ? 'completed' : 'failed'
      };

      // Calculate next sync time if scheduled
      const job = await this.getSyncJob(jobId);
      if (job?.scheduleCron) {
        updates.nextSync = this.calculateNextSync(job.scheduleCron);
      }

      await this.updateSyncJob(jobId, updates);

      // Remove from active syncs
      this.activeSyncs.delete(jobId);

      logger.info(`Sync ${success ? 'completed' : 'failed'}: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to complete sync ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get active sync count
   */
  public getActiveSyncCount(): number {
    return this.activeSyncs.size;
  }

  // Private helper methods

  private async initializeScheduledJobs(): Promise<void> {
    try {
      const result = await query(
        'SELECT * FROM sync_jobs WHERE is_active = true AND schedule_cron IS NOT NULL'
      );

      for (const row of result.rows) {
        const job = this.mapDbRowToSyncJob(row);
        this.scheduleJob(job);
      }

      logger.info(`Initialized ${result.rows.length} scheduled sync jobs`);
    } catch (error) {
      logger.error('Failed to initialize scheduled jobs:', error);
    }
  }

  private scheduleJob(job: SyncJob): void {
    if (!job.scheduleCron) return;

    try {
      const task = cron.schedule(job.scheduleCron, async () => {
        try {
          await this.startSync(job.id);
        } catch (error) {
          logger.error(`Scheduled sync failed: ${job.id}`, error);
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      task.start();
      this.scheduledJobs.set(job.id, task);

      logger.info(`Scheduled sync job: ${job.id} with cron: ${job.scheduleCron}`);
    } catch (error) {
      logger.error(`Failed to schedule job ${job.id}:`, error);
    }
  }

  private updateScheduledJob(job: SyncJob): void {
    // Remove existing scheduled job
    const existingTask = this.scheduledJobs.get(job.id);
    if (existingTask) {
      existingTask.stop();
      this.scheduledJobs.delete(job.id);
    }

    // Add new scheduled job if active and has cron
    if (job.isActive && job.scheduleCron) {
      this.scheduleJob(job);
    }
  }

  private calculateNextSync(cronExpression: string): Date {
    // This is a simplified calculation
    // In a real implementation, you might want to use a more robust cron parser
    const interval = cron.validate(cronExpression);
    if (!interval) {
      throw new Error('Invalid cron expression');
    }

    // For now, return next hour as placeholder
    // TODO: Implement proper cron parsing
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  private async validateCloudProviders(sourceId: string, destinationId: string): Promise<void> {
    const sourceResult = await query(
      'SELECT * FROM cloud_providers WHERE id = $1 AND is_active = true',
      [sourceId]
    );

    const destResult = await query(
      'SELECT * FROM cloud_providers WHERE id = $1 AND is_active = true',
      [destinationId]
    );

    if (sourceResult.rows.length === 0) {
      throw new Error('Source cloud provider not found or inactive');
    }

    if (destResult.rows.length === 0) {
      throw new Error('Destination cloud provider not found or inactive');
    }
  }

  private mapDbRowToSyncJob(row: any): SyncJob {
    return {
      id: row.id,
      userId: row.user_id,
      sourceCloudId: row.source_cloud_id,
      destinationCloudId: row.destination_cloud_id,
      sourcePath: row.source_path,
      destinationPath: row.destination_path,
      syncMode: row.sync_mode,
      scheduleCron: row.schedule_cron,
      isActive: row.is_active,
      lastSync: row.last_sync,
      nextSync: row.next_sync,
      lastSyncStatus: row.last_sync_status,
      filters: row.filters ? JSON.parse(row.filters) : undefined,
      options: row.options ? JSON.parse(row.options) : undefined,
      conflictResolution: row.conflict_resolution,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

/**
 * Individual sync execution handler
 */
class SyncExecution {
  private job: SyncJob;
  private engine: SyncEngine;
  private sourceProvider?: ICloudProvider;
  private destProvider?: ICloudProvider;
  private stopped = false;

  constructor(job: SyncJob, engine: SyncEngine) {
    this.job = job;
    this.engine = engine;
  }

  public async start(): Promise<void> {
    try {
      // Initialize providers
      await this.initializeProviders();

      // Start sync process based on mode
      switch (this.job.syncMode) {
        case 'one_way':
          await this.performOneWaySync();
          break;
        case 'two_way':
          await this.performTwoWaySync();
          break;
        case 'mirror':
          await this.performMirrorSync();
          break;
        default:
          throw new Error(`Unknown sync mode: ${this.job.syncMode}`);
      }

      await this.engine.completeSync(this.job.id, true);

    } catch (error) {
      logger.error(`Sync execution failed: ${this.job.id}`, error);
      await this.engine.completeSync(this.job.id, false);
    }
  }

  public async stop(): Promise<void> {
    this.stopped = true;
  }

  private async initializeProviders(): Promise<void> {
    // Get cloud provider configs from database
    const sourceResult = await query(
      'SELECT * FROM cloud_providers WHERE id = $1',
      [this.job.sourceCloudId]
    );

    const destResult = await query(
      'SELECT * FROM cloud_providers WHERE id = $1',
      [this.job.destinationCloudId]
    );

    if (sourceResult.rows.length === 0 || destResult.rows.length === 0) {
      throw new Error('Cloud provider configuration not found');
    }

    const sourceConfig = sourceResult.rows[0];
    const destConfig = destResult.rows[0];

    // Create provider instances
    this.sourceProvider = await cloudProviderFactory.createProvider(
      sourceConfig.provider_type,
      sourceConfig.config ? JSON.parse(sourceConfig.config) : {}
    );

    this.destProvider = await cloudProviderFactory.createProvider(
      destConfig.provider_type,
      destConfig.config ? JSON.parse(destConfig.config) : {}
    );

    // Authenticate providers
    await this.sourceProvider.authenticate(
      JSON.parse(sourceConfig.credentials),
      sourceConfig.config ? JSON.parse(sourceConfig.config) : {}
    );

    await this.destProvider.authenticate(
      JSON.parse(destConfig.credentials),
      destConfig.config ? JSON.parse(destConfig.config) : {}
    );
  }

  private async performOneWaySync(): Promise<void> {
    if (!this.sourceProvider || !this.destProvider) {
      throw new Error('Providers not initialized');
    }

    // Get source files
    const sourceFiles = await this.sourceProvider.listFiles(
      this.job.sourcePath,
      this.job.filters
    );

    // Get destination files
    const destFiles = await this.destProvider.listFiles(
      this.job.destinationPath,
      this.job.filters
    );

    // Calculate operations
    const operations = this.calculateOneWayOperations(sourceFiles, destFiles);

    // Execute operations
    await this.executeOperations(operations);
  }

  private async performTwoWaySync(): Promise<void> {
    if (!this.sourceProvider || !this.destProvider) {
      throw new Error('Providers not initialized');
    }

    // Get files from both sides
    const sourceFiles = await this.sourceProvider.listFiles(
      this.job.sourcePath,
      this.job.filters
    );

    const destFiles = await this.destProvider.listFiles(
      this.job.destinationPath,
      this.job.filters
    );

    // Calculate bidirectional operations
    const operations = this.calculateTwoWayOperations(sourceFiles, destFiles);

    // Execute operations
    await this.executeOperations(operations);
  }

  private async performMirrorSync(): Promise<void> {
    if (!this.sourceProvider || !this.destProvider) {
      throw new Error('Providers not initialized');
    }

    // Get files from both sides
    const sourceFiles = await this.sourceProvider.listFiles(
      this.job.sourcePath,
      this.job.filters
    );

    const destFiles = await this.destProvider.listFiles(
      this.job.destinationPath,
      this.job.filters
    );

    // Calculate mirror operations (destination matches source exactly)
    const operations = this.calculateMirrorOperations(sourceFiles, destFiles);

    // Execute operations
    await this.executeOperations(operations);
  }

  private calculateOneWayOperations(sourceFiles: FileItem[], destFiles: FileItem[]): SyncOperation[] {
    const operations: SyncOperation[] = [];
    const destFileMap = new Map(destFiles.map(f => [f.name, f]));

    for (const sourceFile of sourceFiles) {
      if (this.stopped) break;

      const destFile = destFileMap.get(sourceFile.name);
      
      if (!destFile) {
        // File doesn't exist in destination - upload
        operations.push({
          type: 'upload',
          sourcePath: sourceFile.path,
          destinationPath: this.buildDestinationPath(sourceFile.path),
          file: sourceFile,
          direction: 'source_to_dest'
        });
      } else if (this.shouldUpdateFile(sourceFile, destFile)) {
        // File exists but needs update
        operations.push({
          type: 'upload',
          sourcePath: sourceFile.path,
          destinationPath: destFile.path,
          file: sourceFile,
          direction: 'source_to_dest'
        });
      }
    }

    return operations;
  }

  private calculateTwoWayOperations(sourceFiles: FileItem[], destFiles: FileItem[]): SyncOperation[] {
    const operations: SyncOperation[] = [];
    const sourceFileMap = new Map(sourceFiles.map(f => [f.name, f]));
    const destFileMap = new Map(destFiles.map(f => [f.name, f]));

    // Process source files
    for (const sourceFile of sourceFiles) {
      if (this.stopped) break;

      const destFile = destFileMap.get(sourceFile.name);
      
      if (!destFile) {
        operations.push({
          type: 'upload',
          sourcePath: sourceFile.path,
          destinationPath: this.buildDestinationPath(sourceFile.path),
          file: sourceFile,
          direction: 'source_to_dest'
        });
      } else if (this.shouldUpdateFile(sourceFile, destFile)) {
        operations.push({
          type: 'upload',
          sourcePath: sourceFile.path,
          destinationPath: destFile.path,
          file: sourceFile,
          direction: 'source_to_dest'
        });
      }
    }

    // Process destination files (opposite direction)
    for (const destFile of destFiles) {
      if (this.stopped) break;

      const sourceFile = sourceFileMap.get(destFile.name);
      
      if (!sourceFile) {
        operations.push({
          type: 'download',
          sourcePath: destFile.path,
          destinationPath: this.buildSourcePath(destFile.path),
          file: destFile,
          direction: 'dest_to_source'
        });
      } else if (this.shouldUpdateFile(destFile, sourceFile)) {
        operations.push({
          type: 'download',
          sourcePath: destFile.path,
          destinationPath: sourceFile.path,
          file: destFile,
          direction: 'dest_to_source'
        });
      }
    }

    return operations;
  }

  private calculateMirrorOperations(sourceFiles: FileItem[], destFiles: FileItem[]): SyncOperation[] {
    const operations: SyncOperation[] = [];
    const sourceFileMap = new Map(sourceFiles.map(f => [f.name, f]));
    const destFileMap = new Map(destFiles.map(f => [f.name, f]));

    // Upload new/updated files from source
    for (const sourceFile of sourceFiles) {
      if (this.stopped) break;

      const destFile = destFileMap.get(sourceFile.name);
      
      if (!destFile || this.shouldUpdateFile(sourceFile, destFile)) {
        operations.push({
          type: 'upload',
          sourcePath: sourceFile.path,
          destinationPath: destFile?.path || this.buildDestinationPath(sourceFile.path),
          file: sourceFile,
          direction: 'source_to_dest'
        });
      }
    }

    // Delete files that don't exist in source
    for (const destFile of destFiles) {
      if (this.stopped) break;

      if (!sourceFileMap.has(destFile.name)) {
        operations.push({
          type: 'delete',
          sourcePath: destFile.path,
          destinationPath: destFile.path,
          file: destFile,
          direction: 'source_to_dest'
        });
      }
    }

    return operations;
  }

  private async executeOperations(operations: SyncOperation[]): Promise<void> {
    for (const operation of operations) {
      if (this.stopped) break;

      try {
        await this.executeOperation(operation);
      } catch (error) {
        logger.error(`Sync operation failed:`, error);
        
        // Handle conflict resolution
        if (this.job.conflictResolution === 'skip') {
          continue;
        } else if (this.job.conflictResolution === 'rename') {
          // TODO: Implement file renaming logic
          continue;
        }
        // 'overwrite' will naturally retry the operation
      }
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'upload':
        await this.uploadFile(operation);
        break;
      case 'download':
        await this.downloadFile(operation);
        break;
      case 'delete':
        await this.deleteFile(operation);
        break;
    }
  }

  private async uploadFile(operation: SyncOperation): Promise<void> {
    const stream = await this.sourceProvider!.downloadFile(operation.sourcePath);
    await this.destProvider!.uploadFile(operation.destinationPath, stream, {
      fileSize: operation.file.size,
      mimeType: operation.file.mimeType,
      overwrite: this.job.conflictResolution === 'overwrite'
    });
  }

  private async downloadFile(operation: SyncOperation): Promise<void> {
    const stream = await this.destProvider!.downloadFile(operation.sourcePath);
    await this.sourceProvider!.uploadFile(operation.destinationPath, stream, {
      fileSize: operation.file.size,
      mimeType: operation.file.mimeType,
      overwrite: this.job.conflictResolution === 'overwrite'
    });
  }

  private async deleteFile(operation: SyncOperation): Promise<void> {
    await this.destProvider!.deleteFile(operation.destinationPath);
  }

  private shouldUpdateFile(file1: FileItem, file2: FileItem): boolean {
    // Compare modification times
    if (file1.modifiedAt && file2.modifiedAt) {
      return file1.modifiedAt > file2.modifiedAt;
    }
    
    // Compare file sizes if no modification time
    if (file1.size !== file2.size) {
      return true;
    }
    
    // Compare checksums if available
    if (file1.checksum && file2.checksum) {
      return file1.checksum !== file2.checksum;
    }
    
    return false;
  }

  private buildDestinationPath(sourcePath: string): string {
    const relativePath = sourcePath.replace(this.job.sourcePath, '');
    return this.job.destinationPath + relativePath;
  }

  private buildSourcePath(destPath: string): string {
    const relativePath = destPath.replace(this.job.destinationPath, '');
    return this.job.sourcePath + relativePath;
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();