import Queue, { Job, JobOptions } from 'bull';
import { EventEmitter } from 'events';
import { redis } from '../database/connection';
import { transferEngine } from './TransferEngine';
import { syncEngine } from './SyncEngine';
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

export interface QueueJobData {
  type: string;
  payload: any;
  userId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

export interface TransferJobData {
  transferJobId: string;
  userId: string;
}

export interface SyncJobData {
  syncJobId: string;
  userId: string;
}

export interface CleanupJobData {
  type: 'expired_sessions' | 'old_logs' | 'temp_files';
  olderThan?: Date;
}

export class QueueManager extends EventEmitter {
  private queues: Map<string, Queue.Queue> = new Map();
  private readonly redisConfig: any;
  private readonly defaultJobOptions: JobOptions;

  constructor() {
    super();
    
    this.redisConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_QUEUE_DB || '1'),
      }
    };

    this.defaultJobOptions = {
      attempts: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs
    };

    this.initializeQueues();
  }

  /**
   * Initialize all queue types
   */
  private initializeQueues(): void {
    // Transfer queue - for file transfer jobs
    this.createQueue('transfer', {
      concurrency: parseInt(process.env.TRANSFER_QUEUE_CONCURRENCY || '3'),
      processor: this.processTransferJob.bind(this)
    });

    // Sync queue - for sync jobs
    this.createQueue('sync', {
      concurrency: parseInt(process.env.SYNC_QUEUE_CONCURRENCY || '2'),
      processor: this.processSyncJob.bind(this)
    });

    // Cleanup queue - for maintenance tasks
    this.createQueue('cleanup', {
      concurrency: 1,
      processor: this.processCleanupJob.bind(this)
    });

    // Email queue - for sending emails
    this.createQueue('email', {
      concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5'),
      processor: this.processEmailJob.bind(this)
    });

    // Webhook queue - for webhook notifications
    this.createQueue('webhook', {
      concurrency: parseInt(process.env.WEBHOOK_QUEUE_CONCURRENCY || '10'),
      processor: this.processWebhookJob.bind(this)
    });

    logger.info('Queue manager initialized with all queues');
  }

  /**
   * Create a new queue
   */
  private createQueue(name: string, options: { concurrency: number; processor: Function }): void {
    const queue = new Queue(name, this.redisConfig);
    
    // Set up processors
    queue.process(options.concurrency, options.processor);

    // Set up event listeners
    this.setupQueueEventListeners(queue, name);

    this.queues.set(name, queue);
    logger.info(`Created queue: ${name} with concurrency: ${options.concurrency}`);
  }

  /**
   * Set up event listeners for a queue
   */
  private setupQueueEventListeners(queue: Queue.Queue, queueName: string): void {
    queue.on('completed', (job: Job, result: any) => {
      logger.info(`Job completed in queue ${queueName}:`, {
        jobId: job.id,
        duration: Date.now() - job.timestamp,
        result
      });
      this.emit('jobCompleted', { queueName, job, result });
    });

    queue.on('failed', (job: Job, error: Error) => {
      logger.error(`Job failed in queue ${queueName}:`, {
        jobId: job.id,
        attempts: job.attemptsMade,
        error: error.message,
        data: job.data
      });
      this.emit('jobFailed', { queueName, job, error });
    });

    queue.on('progress', (job: Job, progress: number) => {
      logger.debug(`Job progress in queue ${queueName}:`, {
        jobId: job.id,
        progress
      });
      this.emit('jobProgress', { queueName, job, progress });
    });

    queue.on('stalled', (job: Job) => {
      logger.warn(`Job stalled in queue ${queueName}:`, {
        jobId: job.id,
        data: job.data
      });
      this.emit('jobStalled', { queueName, job });
    });

    queue.on('error', (error: Error) => {
      logger.error(`Queue ${queueName} error:`, error);
      this.emit('queueError', { queueName, error });
    });
  }

  /**
   * Add a job to a specific queue
   */
  public async addJob(
    queueName: string,
    data: QueueJobData,
    options?: JobOptions
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const jobOptions: JobOptions = {
      ...this.defaultJobOptions,
      ...options,
      priority: data.priority || 0,
      delay: data.delay || 0,
      attempts: data.attempts || this.defaultJobOptions.attempts,
    };

    const job = await queue.add(data.type, data, jobOptions);
    
    logger.info(`Job added to queue ${queueName}:`, {
      jobId: job.id,
      type: data.type,
      userId: data.userId
    });

    return job;
  }

  /**
   * Add transfer job to queue
   */
  public async addTransferJob(data: TransferJobData, options?: JobOptions): Promise<Job> {
    return this.addJob('transfer', {
      type: 'transfer',
      payload: data,
      userId: data.userId,
      priority: 5 // High priority for transfer jobs
    }, options);
  }

  /**
   * Add sync job to queue
   */
  public async addSyncJob(data: SyncJobData, options?: JobOptions): Promise<Job> {
    return this.addJob('sync', {
      type: 'sync',
      payload: data,
      userId: data.userId,
      priority: 3 // Medium priority for sync jobs
    }, options);
  }

  /**
   * Add cleanup job to queue
   */
  public async addCleanupJob(data: CleanupJobData, options?: JobOptions): Promise<Job> {
    return this.addJob('cleanup', {
      type: 'cleanup',
      payload: data,
      priority: 1 // Low priority for cleanup jobs
    }, options);
  }

  /**
   * Add email job to queue
   */
  public async addEmailJob(emailData: any, options?: JobOptions): Promise<Job> {
    return this.addJob('email', {
      type: 'email',
      payload: emailData,
      priority: 4 // Medium-high priority for emails
    }, options);
  }

  /**
   * Add webhook job to queue
   */
  public async addWebhookJob(webhookData: any, options?: JobOptions): Promise<Job> {
    return this.addJob('webhook', {
      type: 'webhook',
      payload: webhookData,
      priority: 2 // Low-medium priority for webhooks
    }, options);
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
      queue.getPaused(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused.length,
    };
  }

  /**
   * Get all queue statistics
   */
  public async getAllQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [queueName] of this.queues) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  /**
   * Pause a queue
   */
  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
  }

  /**
   * Clean up old jobs from a queue
   */
  public async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    
    logger.info(`Queue cleaned: ${queueName}`);
  }

  /**
   * Get job by ID
   */
  public async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJob(jobId);
  }

  /**
   * Remove job by ID
   */
  public async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info(`Job removed: ${jobId} from queue: ${queueName}`);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager...');
    
    for (const [queueName, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue closed: ${queueName}`);
    }
    
    logger.info('Queue manager shutdown complete');
  }

  // Job processors

  /**
   * Process transfer jobs
   */
  private async processTransferJob(job: Job<QueueJobData>): Promise<any> {
    const { payload } = job.data;
    const transferData = payload as TransferJobData;

    try {
      logger.info(`Processing transfer job: ${transferData.transferJobId}`);
      
      // Update job progress
      await job.progress(10);

      // Start the transfer using transfer engine
      await transferEngine.startTransfer(transferData.transferJobId);

      await job.progress(100);
      
      return { success: true, transferJobId: transferData.transferJobId };
    } catch (error) {
      logger.error(`Transfer job failed: ${transferData.transferJobId}`, error);
      throw error;
    }
  }

  /**
   * Process sync jobs
   */
  private async processSyncJob(job: Job<QueueJobData>): Promise<any> {
    const { payload } = job.data;
    const syncData = payload as SyncJobData;

    try {
      logger.info(`Processing sync job: ${syncData.syncJobId}`);
      
      await job.progress(10);

      // Start the sync using sync engine
      await syncEngine.startSync(syncData.syncJobId);

      await job.progress(100);
      
      return { success: true, syncJobId: syncData.syncJobId };
    } catch (error) {
      logger.error(`Sync job failed: ${syncData.syncJobId}`, error);
      throw error;
    }
  }

  /**
   * Process cleanup jobs
   */
  private async processCleanupJob(job: Job<QueueJobData>): Promise<any> {
    const { payload } = job.data;
    const cleanupData = payload as CleanupJobData;

    try {
      logger.info(`Processing cleanup job: ${cleanupData.type}`);
      
      await job.progress(20);

      switch (cleanupData.type) {
        case 'expired_sessions':
          await this.cleanupExpiredSessions();
          break;
        case 'old_logs':
          await this.cleanupOldLogs(cleanupData.olderThan);
          break;
        case 'temp_files':
          await this.cleanupTempFiles();
          break;
        default:
          throw new Error(`Unknown cleanup type: ${cleanupData.type}`);
      }

      await job.progress(100);
      
      return { success: true, type: cleanupData.type };
    } catch (error) {
      logger.error(`Cleanup job failed: ${cleanupData.type}`, error);
      throw error;
    }
  }

  /**
   * Process email jobs
   */
  private async processEmailJob(job: Job<QueueJobData>): Promise<any> {
    const { payload } = job.data;

    try {
      logger.info(`Processing email job`);
      
      await job.progress(25);

      // TODO: Implement email sending logic
      // await emailService.sendEmail(payload);

      await job.progress(100);
      
      return { success: true };
    } catch (error) {
      logger.error(`Email job failed`, error);
      throw error;
    }
  }

  /**
   * Process webhook jobs
   */
  private async processWebhookJob(job: Job<QueueJobData>): Promise<any> {
    const { payload } = job.data;

    try {
      logger.info(`Processing webhook job`);
      
      await job.progress(25);

      // TODO: Implement webhook sending logic
      // await webhookService.sendWebhook(payload);

      await job.progress(100);
      
      return { success: true };
    } catch (error) {
      logger.error(`Webhook job failed`, error);
      throw error;
    }
  }

  // Cleanup methods

  private async cleanupExpiredSessions(): Promise<void> {
    // TODO: Implement session cleanup
    logger.info('Cleaning up expired sessions');
  }

  private async cleanupOldLogs(olderThan?: Date): Promise<void> {
    // TODO: Implement log cleanup
    logger.info('Cleaning up old logs');
  }

  private async cleanupTempFiles(): Promise<void> {
    // TODO: Implement temp file cleanup
    logger.info('Cleaning up temporary files');
  }
}

/**
 * Queue scheduler for recurring jobs
 */
export class QueueScheduler {
  private queueManager: QueueManager;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
    this.initializeScheduledJobs();
  }

  /**
   * Initialize scheduled maintenance jobs
   */
  private initializeScheduledJobs(): void {
    // Schedule cleanup jobs
    this.scheduleRecurringJob('cleanup-sessions', () => {
      return this.queueManager.addCleanupJob({
        type: 'expired_sessions'
      });
    }, 60 * 60 * 1000); // Every hour

    this.scheduleRecurringJob('cleanup-logs', () => {
      return this.queueManager.addCleanupJob({
        type: 'old_logs',
        olderThan: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      });
    }, 24 * 60 * 60 * 1000); // Daily

    this.scheduleRecurringJob('cleanup-temp', () => {
      return this.queueManager.addCleanupJob({
        type: 'temp_files'
      });
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    logger.info('Queue scheduler initialized with recurring jobs');
  }

  /**
   * Schedule a recurring job
   */
  public scheduleRecurringJob(
    name: string,
    jobFunction: () => Promise<any>,
    intervalMs: number
  ): void {
    const existingJob = this.scheduledJobs.get(name);
    if (existingJob) {
      clearInterval(existingJob);
    }

    const interval = setInterval(async () => {
      try {
        await jobFunction();
        logger.debug(`Scheduled job executed: ${name}`);
      } catch (error) {
        logger.error(`Scheduled job failed: ${name}`, error);
      }
    }, intervalMs);

    this.scheduledJobs.set(name, interval);
    logger.info(`Scheduled recurring job: ${name} (interval: ${intervalMs}ms)`);
  }

  /**
   * Cancel a scheduled job
   */
  public cancelScheduledJob(name: string): void {
    const job = this.scheduledJobs.get(name);
    if (job) {
      clearInterval(job);
      this.scheduledJobs.delete(name);
      logger.info(`Cancelled scheduled job: ${name}`);
    }
  }

  /**
   * Shutdown scheduler
   */
  public shutdown(): void {
    for (const [name, job] of this.scheduledJobs) {
      clearInterval(job);
      logger.info(`Cancelled scheduled job: ${name}`);
    }
    this.scheduledJobs.clear();
    logger.info('Queue scheduler shutdown complete');
  }
}

// Export singleton instances
export const queueManager = new QueueManager();
export const queueScheduler = new QueueScheduler(queueManager);