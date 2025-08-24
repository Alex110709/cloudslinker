import { Request, Response } from 'express';
import { SyncJob, FileFilter, SyncOptions } from '../types';
import { syncEngine, CreateSyncJobRequest } from '../services/SyncEngine';
import { queueManager } from '../services/QueueManager';
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

export interface CreateSyncRequest {
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  syncMode: 'one_way' | 'two_way' | 'mirror';
  scheduleCron?: string;
  filters?: FileFilter;
  options?: SyncOptions;
  conflictResolution?: 'skip' | 'overwrite' | 'rename';
}

export class SyncController {
  /**
   * Create a new sync job
   */
  public static async createSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncRequest: CreateSyncRequest = req.body;

      // Validate required fields
      if (!syncRequest.sourceCloudId || !syncRequest.destinationCloudId || 
          !syncRequest.sourcePath || !syncRequest.destinationPath || !syncRequest.syncMode) {
        res.status(400).json({
          success: false,
          error: 'Source cloud, destination cloud, source path, destination path, and sync mode are required',
          timestamp: new Date()
        });
        return;
      }

      // Validate sync mode
      if (!['one_way', 'two_way', 'mirror'].includes(syncRequest.syncMode)) {
        res.status(400).json({
          success: false,
          error: 'Invalid sync mode. Must be one of: one_way, two_way, mirror',
          timestamp: new Date()
        });
        return;
      }

      // Create sync job
      const jobRequest: CreateSyncJobRequest = {
        userId,
        sourceCloudId: syncRequest.sourceCloudId,
        destinationCloudId: syncRequest.destinationCloudId,
        sourcePath: syncRequest.sourcePath,
        destinationPath: syncRequest.destinationPath,
        syncMode: syncRequest.syncMode,
        scheduleCron: syncRequest.scheduleCron,
        filters: syncRequest.filters,
        options: syncRequest.options,
        conflictResolution: syncRequest.conflictResolution || 'skip'
      };

      const syncJob = await syncEngine.createSyncJob(jobRequest);

      res.status(201).json({
        success: true,
        data: { sync: syncJob },
        message: 'Sync job created successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to create sync:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * List sync jobs for user
   */
  public static async listSyncs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;

      const { jobs, total } = await syncEngine.listSyncJobs(userId, limit, offset, isActive);

      res.status(200).json({
        success: true,
        data: {
          syncs: jobs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
          }
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to list syncs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list syncs',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get sync job details
   */
  public static async getSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { sync },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get sync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * Update sync job
   */
  public static async updateSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;
      const updates = req.body;

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      const updatedSync = await syncEngine.updateSyncJob(syncId, updates);

      res.status(200).json({
        success: true,
        data: { sync: updatedSync },
        message: 'Sync job updated successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to update sync:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * Start a sync job manually
   */
  public static async startSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      // Add to queue for processing
      await queueManager.addSyncJob({
        syncJobId: syncId,
        userId
      });

      res.status(200).json({
        success: true,
        message: 'Sync job started successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to start sync:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * Stop a sync job
   */
  public static async stopSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      await syncEngine.stopSync(syncId);

      res.status(200).json({
        success: true,
        message: 'Sync job stopped successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to stop sync:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * Enable/disable sync job
   */
  public static async toggleSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isActive must be a boolean value',
          timestamp: new Date()
        });
        return;
      }

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      const updatedSync = await syncEngine.updateSyncJob(syncId, { isActive });

      res.status(200).json({
        success: true,
        data: { sync: updatedSync },
        message: `Sync job ${isActive ? 'enabled' : 'disabled'} successfully`,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to toggle sync:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * Delete sync job
   */
  public static async deleteSync(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      await syncEngine.deleteSyncJob(syncId);

      res.status(200).json({
        success: true,
        message: 'Sync job deleted successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to delete sync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete sync',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get sync job history/logs
   */
  public static async getSyncHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const syncId = req.params.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const sync = await syncEngine.getSyncJob(syncId);

      if (!sync) {
        res.status(404).json({
          success: false,
          error: 'Sync job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the sync
      if (sync.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      // TODO: Implement sync history/logs retrieval
      // For now, return basic sync information
      const history = [
        {
          id: 'history-1',
          syncId: syncId,
          status: sync.lastSyncStatus,
          startedAt: sync.lastSync,
          completedAt: sync.lastSync,
          filesProcessed: 0,
          filesTransferred: 0,
          bytesTransferred: 0,
          errors: []
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          history,
          pagination: {
            page,
            limit,
            total: history.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get sync history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync history',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get sync statistics for user
   */
  public static async getSyncStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      // Get statistics from database
      const statsResult = await syncEngine.query(
        `SELECT 
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_syncs,
          COUNT(CASE WHEN last_sync_status = 'completed' THEN 1 END) as successful_syncs,
          COUNT(CASE WHEN last_sync_status = 'failed' THEN 1 END) as failed_syncs,
          COUNT(CASE WHEN last_sync_status = 'running' THEN 1 END) as running_syncs,
          COUNT(CASE WHEN schedule_cron IS NOT NULL THEN 1 END) as scheduled_syncs
         FROM sync_jobs 
         WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];
      const activeSyncs = syncEngine.getActiveSyncCount();

      res.status(200).json({
        success: true,
        data: {
          totalSyncs: parseInt(stats.total_syncs),
          activeSyncs: parseInt(stats.active_syncs),
          successfulSyncs: parseInt(stats.successful_syncs),
          failedSyncs: parseInt(stats.failed_syncs),
          runningSyncs: parseInt(stats.running_syncs),
          scheduledSyncs: parseInt(stats.scheduled_syncs),
          currentlyRunning: activeSyncs
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get sync stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync stats',
        timestamp: new Date()
      });
    }
  }

  /**
   * Validate cron expression
   */
  public static async validateCron(req: Request, res: Response): Promise<void> {
    try {
      const { cronExpression } = req.body;

      if (!cronExpression) {
        res.status(400).json({
          success: false,
          error: 'Cron expression is required',
          timestamp: new Date()
        });
        return;
      }

      const cron = require('node-cron');
      const isValid = cron.validate(cronExpression);

      if (isValid) {
        // Calculate next few run times
        const now = new Date();
        const nextRuns = [];
        
        // TODO: Implement proper next run calculation
        // For now, just return validation result
        
        res.status(200).json({
          success: true,
          data: {
            valid: true,
            nextRuns,
            description: 'Valid cron expression'
          },
          timestamp: new Date()
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid cron expression',
          timestamp: new Date()
        });
      }

    } catch (error) {
      logger.error('Failed to validate cron:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid cron expression',
        timestamp: new Date()
      });
    }
  }
}