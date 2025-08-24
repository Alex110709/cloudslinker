import { Request, Response } from 'express';
import { TransferJob, TransferStatus, FileFilter, TransferOptions } from '../types';
import { transferEngine, CreateTransferJobRequest } from '../services/TransferEngine';
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

export interface CreateTransferRequest {
  sourceCloudId: string;
  destinationCloudId: string;
  sourcePath: string;
  destinationPath: string;
  filters?: FileFilter;
  options?: TransferOptions;
}

export class TransferController {
  /**
   * Create a new transfer job
   */
  public static async createTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferRequest: CreateTransferRequest = req.body;

      // Validate required fields
      if (!transferRequest.sourceCloudId || !transferRequest.destinationCloudId || 
          !transferRequest.sourcePath || !transferRequest.destinationPath) {
        res.status(400).json({
          success: false,
          error: 'Source cloud, destination cloud, source path, and destination path are required',
          timestamp: new Date()
        });
        return;
      }

      // Create transfer job
      const jobRequest: CreateTransferJobRequest = {
        userId,
        sourceCloudId: transferRequest.sourceCloudId,
        destinationCloudId: transferRequest.destinationCloudId,
        sourcePath: transferRequest.sourcePath,
        destinationPath: transferRequest.destinationPath,
        filters: transferRequest.filters,
        options: transferRequest.options
      };

      const transferJob = await transferEngine.createTransferJob(jobRequest);

      // Add to queue for background processing
      await queueManager.addTransferJob({
        transferJobId: transferJob.id,
        userId
      });

      res.status(201).json({
        success: true,
        data: { transfer: transferJob },
        message: 'Transfer job created successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to create transfer:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create transfer',
        timestamp: new Date()
      });
    }
  }

  /**
   * List transfer jobs for user
   */
  public static async listTransfers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;
      const status = req.query.status as TransferStatus;

      const { jobs, total } = await transferEngine.listTransferJobs(userId, limit, offset, status);

      res.status(200).json({
        success: true,
        data: {
          transfers: jobs,
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
      logger.error('Failed to list transfers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list transfers',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get transfer job details
   */
  public static async getTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { transfer },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get transfer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transfer',
        timestamp: new Date()
      });
    }
  }

  /**
   * Start a transfer job
   */
  public static async startTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      // Add to queue for processing
      await queueManager.addTransferJob({
        transferJobId: transferId,
        userId
      });

      res.status(200).json({
        success: true,
        message: 'Transfer job started successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to start transfer:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start transfer',
        timestamp: new Date()
      });
    }
  }

  /**
   * Pause a transfer job
   */
  public static async pauseTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      await transferEngine.pauseTransfer(transferId);

      res.status(200).json({
        success: true,
        message: 'Transfer job paused successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to pause transfer:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause transfer',
        timestamp: new Date()
      });
    }
  }

  /**
   * Resume a transfer job
   */
  public static async resumeTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      await transferEngine.resumeTransfer(transferId);

      res.status(200).json({
        success: true,
        message: 'Transfer job resumed successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to resume transfer:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume transfer',
        timestamp: new Date()
      });
    }
  }

  /**
   * Cancel a transfer job
   */
  public static async cancelTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      await transferEngine.cancelTransfer(transferId);

      res.status(200).json({
        success: true,
        message: 'Transfer job cancelled successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to cancel transfer:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel transfer',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get transfer progress
   */
  public static async getTransferProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      const progress = transferEngine.getTransferProgress(transferId);

      res.status(200).json({
        success: true,
        data: { 
          progress: progress || {
            jobId: transferId,
            status: transfer.status,
            progressPercentage: transfer.progressPercentage,
            filesTotal: transfer.filesTotal,
            filesCompleted: transfer.filesCompleted,
            filesFailed: transfer.filesFailed,
            bytesTotal: transfer.bytesTotal,
            bytesTransferred: transfer.bytesTransferred,
            transferSpeed: transfer.transferSpeed,
            estimatedTimeRemaining: transfer.estimatedTimeRemaining,
            updatedAt: transfer.updatedAt
          }
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get transfer progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transfer progress',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get transfer statistics for user
   */
  public static async getTransferStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      // Get statistics from database
      const statsResult = await transferEngine.query(
        `SELECT 
          COUNT(*) as total_transfers,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transfers,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transfers,
          COUNT(CASE WHEN status = 'running' THEN 1 END) as running_transfers,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transfers,
          COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_transfers,
          COALESCE(SUM(bytes_transferred), 0) as total_bytes_transferred,
          COALESCE(AVG(CASE WHEN status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL 
                       THEN EXTRACT(EPOCH FROM (completed_at - started_at)) END), 0) as avg_completion_time
         FROM transfer_jobs 
         WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];
      const activeTransfers = transferEngine.getActiveTransferCount();

      res.status(200).json({
        success: true,
        data: {
          totalTransfers: parseInt(stats.total_transfers),
          completedTransfers: parseInt(stats.completed_transfers),
          failedTransfers: parseInt(stats.failed_transfers),
          runningTransfers: parseInt(stats.running_transfers),
          pendingTransfers: parseInt(stats.pending_transfers),
          pausedTransfers: parseInt(stats.paused_transfers),
          totalBytesTransferred: parseInt(stats.total_bytes_transferred),
          averageCompletionTime: parseFloat(stats.avg_completion_time),
          activeTransfers
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get transfer stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transfer stats',
        timestamp: new Date()
      });
    }
  }

  /**
   * Delete a transfer job
   */
  public static async deleteTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const transferId = req.params.id;

      const transfer = await transferEngine.getTransferJob(transferId);

      if (!transfer) {
        res.status(404).json({
          success: false,
          error: 'Transfer job not found',
          timestamp: new Date()
        });
        return;
      }

      // Check if user owns the transfer
      if (transfer.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          timestamp: new Date()
        });
        return;
      }

      // Can only delete completed, failed, or cancelled transfers
      if (['running', 'pending', 'paused'].includes(transfer.status)) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete active transfer. Please cancel it first.',
          timestamp: new Date()
        });
        return;
      }

      // Delete from database
      await transferEngine.query(
        'DELETE FROM transfer_jobs WHERE id = $1',
        [transferId]
      );

      res.status(200).json({
        success: true,
        message: 'Transfer job deleted successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to delete transfer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete transfer',
        timestamp: new Date()
      });
    }
  }
}