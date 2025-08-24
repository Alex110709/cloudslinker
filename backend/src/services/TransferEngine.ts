import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { PassThrough, Readable } from 'stream';
import { TransferJob, TransferStatus, FileItem, TransferProgress, TransferOptions } from '../types';
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

export interface CreateTransferJobRequest {
  userId: string;
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  filters?: any;
  options?: TransferOptions;
}

export interface TransferJobUpdate {
  status?: TransferStatus;
  progressPercentage?: number;
  filesTotal?: number;
  filesCompleted?: number;
  filesFailed?: number;
  bytesTotal?: number;
  bytesTransferred?: number;
  transferSpeed?: number;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
}

export class TransferEngine extends EventEmitter {
  private activeTransfers = new Map<string, TransferExecution>();
  private readonly maxConcurrentTransfers: number;

  constructor() {
    super();
    this.maxConcurrentTransfers = parseInt(process.env.MAX_CONCURRENT_TRANSFERS || '5');
  }

  /**
   * Create a new transfer job
   */
  public async createTransferJob(request: CreateTransferJobRequest): Promise<TransferJob> {
    try {
      const jobId = uuidv4();
      const now = new Date();

      // Validate cloud providers
      await this.validateCloudProviders(request.sourceCloudId, request.destinationCloudId);

      const result = await query(
        `INSERT INTO transfer_jobs (
          id, user_id, source_cloud_id, destination_cloud_id,
          source_path, destination_path, status, filters, options,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          jobId,
          request.userId,
          request.sourceCloudId,
          request.destinationCloudId,
          request.sourcePath,
          request.destinationPath,
          'pending',
          JSON.stringify(request.filters || {}),
          JSON.stringify(request.options || {}),
          now,
          now
        ]
      );

      const transferJob = this.mapDbRowToTransferJob(result.rows[0]);
      
      logger.info(`Transfer job created: ${jobId}`);
      
      // Emit event for real-time updates
      this.emit('jobCreated', transferJob);

      return transferJob;
    } catch (error) {
      logger.error('Failed to create transfer job:', error);
      throw error;
    }
  }

  /**
   * Start a transfer job
   */
  public async startTransfer(jobId: string): Promise<void> {
    try {
      // Check if transfer is already running
      if (this.activeTransfers.has(jobId)) {
        throw new Error('Transfer is already running');
      }

      // Check concurrent transfer limit
      if (this.activeTransfers.size >= this.maxConcurrentTransfers) {
        throw new Error('Maximum concurrent transfers reached');
      }

      // Get transfer job
      const job = await this.getTransferJob(jobId);
      if (!job) {
        throw new Error('Transfer job not found');
      }

      if (job.status !== 'pending' && job.status !== 'paused') {
        throw new Error(`Cannot start transfer with status: ${job.status}`);
      }

      // Update status to running
      await this.updateTransferJob(jobId, { status: 'running' });

      // Create transfer execution
      const execution = new TransferExecution(job, this);
      this.activeTransfers.set(jobId, execution);

      // Start the transfer
      execution.start();

      logger.info(`Transfer started: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to start transfer ${jobId}:`, error);
      await this.updateTransferJob(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Pause a transfer job
   */
  public async pauseTransfer(jobId: string): Promise<void> {
    try {
      const execution = this.activeTransfers.get(jobId);
      if (!execution) {
        throw new Error('Transfer is not running');
      }

      await execution.pause();
      await this.updateTransferJob(jobId, { status: 'paused' });

      logger.info(`Transfer paused: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to pause transfer ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a paused transfer job
   */
  public async resumeTransfer(jobId: string): Promise<void> {
    try {
      const job = await this.getTransferJob(jobId);
      if (!job || job.status !== 'paused') {
        throw new Error('Transfer is not paused');
      }

      await this.startTransfer(jobId);

      logger.info(`Transfer resumed: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to resume transfer ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a transfer job
   */
  public async cancelTransfer(jobId: string): Promise<void> {
    try {
      const execution = this.activeTransfers.get(jobId);
      if (execution) {
        await execution.cancel();
        this.activeTransfers.delete(jobId);
      }

      await this.updateTransferJob(jobId, { status: 'cancelled' });

      logger.info(`Transfer cancelled: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to cancel transfer ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get transfer job by ID
   */
  public async getTransferJob(jobId: string): Promise<TransferJob | null> {
    try {
      const result = await query(
        'SELECT * FROM transfer_jobs WHERE id = $1',
        [jobId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbRowToTransferJob(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to get transfer job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * List transfer jobs for a user
   */
  public async listTransferJobs(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    status?: TransferStatus
  ): Promise<{ jobs: TransferJob[]; total: number }> {
    try {
      let whereClause = 'WHERE user_id = $1';
      const params: any[] = [userId];

      if (status) {
        whereClause += ' AND status = $2';
        params.push(status);
      }

      const countResult = await query(
        `SELECT COUNT(*) as total FROM transfer_jobs ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      const jobsResult = await query(
        `SELECT * FROM transfer_jobs ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const jobs = jobsResult.rows.map(row => this.mapDbRowToTransferJob(row));

      return { jobs, total };
    } catch (error) {
      logger.error(`Failed to list transfer jobs for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update transfer job
   */
  public async updateTransferJob(jobId: string, updates: TransferJobUpdate): Promise<void> {
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbColumn = this.camelToSnakeCase(key);
          setClause.push(`${dbColumn} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (setClause.length === 0) {
        return;
      }

      setClause.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(jobId);

      await query(
        `UPDATE transfer_jobs SET ${setClause.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      // Get updated job and emit event
      const updatedJob = await this.getTransferJob(jobId);
      if (updatedJob) {
        this.emit('jobUpdated', updatedJob);
      }

    } catch (error) {
      logger.error(`Failed to update transfer job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Handle transfer completion
   */
  public async completeTransfer(jobId: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      const updates: TransferJobUpdate = {
        status: success ? 'completed' : 'failed',
        progressPercentage: success ? 100 : undefined,
        errorMessage
      };

      await this.updateTransferJob(jobId, updates);

      // Remove from active transfers
      this.activeTransfers.delete(jobId);

      logger.info(`Transfer ${success ? 'completed' : 'failed'}: ${jobId}`);

    } catch (error) {
      logger.error(`Failed to complete transfer ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get active transfer count
   */
  public getActiveTransferCount(): number {
    return this.activeTransfers.size;
  }

  /**
   * Get transfer progress
   */
  public getTransferProgress(jobId: string): TransferProgress | null {
    const execution = this.activeTransfers.get(jobId);
    return execution ? execution.getProgress() : null;
  }

  // Private helper methods

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

  private mapDbRowToTransferJob(row: any): TransferJob {
    return {
      id: row.id,
      userId: row.user_id,
      sourceCloudId: row.source_cloud_id,
      destinationCloudId: row.destination_cloud_id,
      sourcePath: row.source_path,
      destinationPath: row.destination_path,
      status: row.status,
      progressPercentage: row.progress_percentage,
      filesTotal: row.files_total,
      filesCompleted: row.files_completed,
      filesFailed: row.files_failed,
      bytesTotal: row.bytes_total,
      bytesTransferred: row.bytes_transferred,
      transferSpeed: row.transfer_speed,
      estimatedTimeRemaining: row.estimated_time_remaining,
      filters: row.filters ? JSON.parse(row.filters) : undefined,
      options: row.options ? JSON.parse(row.options) : undefined,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

/**
 * Individual transfer execution handler
 */
class TransferExecution {
  private job: TransferJob;
  private engine: TransferEngine;
  private sourceProvider?: ICloudProvider;
  private destProvider?: ICloudProvider;
  private cancelled = false;
  private paused = false;
  private startTime?: Date;
  private progress: TransferProgress;

  constructor(job: TransferJob, engine: TransferEngine) {
    this.job = job;
    this.engine = engine;
    
    this.progress = {
      jobId: job.id,
      status: 'running',
      progressPercentage: 0,
      filesTotal: 0,
      filesCompleted: 0,
      filesFailed: 0,
      bytesTotal: 0,
      bytesTransferred: 0,
      transferSpeed: 0,
      estimatedTimeRemaining: 0,
      updatedAt: new Date()
    };
  }

  public async start(): Promise<void> {
    try {
      this.startTime = new Date();
      
      // Initialize providers
      await this.initializeProviders();

      // Start transfer process
      await this.processTransfer();

    } catch (error) {
      logger.error(`Transfer execution failed: ${this.job.id}`, error);
      await this.engine.completeTransfer(
        this.job.id,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  public async pause(): Promise<void> {
    this.paused = true;
  }

  public async cancel(): Promise<void> {
    this.cancelled = true;
  }

  public getProgress(): TransferProgress {
    return { ...this.progress };
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

  private async processTransfer(): Promise<void> {
    if (!this.sourceProvider || !this.destProvider) {
      throw new Error('Providers not initialized');
    }

    try {
      // List files to transfer
      const filesToTransfer = await this.sourceProvider.listFiles(
        this.job.sourcePath,
        this.job.filters
      );

      this.progress.filesTotal = filesToTransfer.length;
      this.progress.bytesTotal = filesToTransfer.reduce((total, file) => total + (file.size || 0), 0);

      await this.engine.updateTransferJob(this.job.id, {
        filesTotal: this.progress.filesTotal,
        bytesTotal: this.progress.bytesTotal
      });

      // Transfer files
      for (const file of filesToTransfer) {
        if (this.cancelled) {
          throw new Error('Transfer cancelled');
        }

        if (this.paused) {
          throw new Error('Transfer paused');
        }

        await this.transferFile(file);
        
        this.progress.filesCompleted++;
        this.progress.progressPercentage = Math.round(
          (this.progress.filesCompleted / this.progress.filesTotal) * 100
        );

        await this.updateProgress();
      }

      // Complete successfully
      await this.engine.completeTransfer(this.job.id, true);

    } catch (error) {
      await this.engine.completeTransfer(
        this.job.id,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async transferFile(file: FileItem): Promise<void> {
    if (file.type === 'folder') {
      // Create folder in destination
      const destPath = this.buildDestinationPath(file.path);
      await this.destProvider!.createFolder(destPath);
      return;
    }

    try {
      // Download from source
      const downloadStream = await this.sourceProvider!.downloadFile(file.path);
      
      // Upload to destination
      const destPath = this.buildDestinationPath(file.path);
      
      // Track progress
      let transferredBytes = 0;
      const passThrough = new PassThrough();
      
      downloadStream.on('data', (chunk: Buffer) => {
        transferredBytes += chunk.length;
        this.progress.bytesTransferred += chunk.length;
        this.progress.currentFile = file.name;
        this.updateTransferSpeed();
      });

      downloadStream.pipe(passThrough);

      await this.destProvider!.uploadFile(destPath, passThrough, {
        fileSize: file.size,
        mimeType: file.mimeType,
        overwrite: this.job.options?.overwriteExisting || false
      });

    } catch (error) {
      this.progress.filesFailed++;
      logger.error(`Failed to transfer file ${file.path}:`, error);
      
      // Continue with other files unless it's a critical error
      if (error instanceof Error && error.message.includes('authentication')) {
        throw error;
      }
    }
  }

  private buildDestinationPath(sourcePath: string): string {
    // Replace source path with destination path
    const relativePath = sourcePath.replace(this.job.sourcePath, '');
    return this.job.destinationPath + relativePath;
  }

  private updateTransferSpeed(): void {
    if (!this.startTime) return;

    const elapsedSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    this.progress.transferSpeed = Math.round(this.progress.bytesTransferred / elapsedSeconds);

    // Estimate remaining time
    const remainingBytes = this.progress.bytesTotal - this.progress.bytesTransferred;
    this.progress.estimatedTimeRemaining = this.progress.transferSpeed > 0 
      ? Math.round(remainingBytes / this.progress.transferSpeed)
      : 0;
  }

  private async updateProgress(): Promise<void> {
    this.progress.updatedAt = new Date();
    
    await this.engine.updateTransferJob(this.job.id, {
      progressPercentage: this.progress.progressPercentage,
      filesCompleted: this.progress.filesCompleted,
      filesFailed: this.progress.filesFailed,
      bytesTransferred: this.progress.bytesTransferred,
      transferSpeed: this.progress.transferSpeed,
      estimatedTimeRemaining: this.progress.estimatedTimeRemaining
    });
  }
}

// Export singleton instance
export const transferEngine = new TransferEngine();