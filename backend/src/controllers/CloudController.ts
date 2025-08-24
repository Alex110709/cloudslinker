import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CloudProvider, CloudCredentials, CloudProviderConfig } from '../types';
import { query } from '../database/connection';
import { cloudProviderFactory } from '../providers/CloudProviderFactory';
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

export interface ConnectCloudProviderRequest {
  providerType: string;
  alias: string;
  credentials: CloudCredentials;
  config?: CloudProviderConfig;
}

export class CloudController {
  /**
   * Get supported cloud providers
   */
  public static async getSupportedProviders(req: Request, res: Response): Promise<void> {
    try {
      const supportedProviders = cloudProviderFactory.getSupportedProviders();
      
      const providersWithCapabilities = await Promise.all(
        supportedProviders.map(async (providerType) => {
          const capabilities = await cloudProviderFactory.getProviderCapabilities(providerType);
          return {
            type: providerType,
            capabilities
          };
        })
      );

      res.status(200).json({
        success: true,
        data: { providers: providersWithCapabilities },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get supported providers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get supported providers',
        timestamp: new Date()
      });
    }
  }

  /**
   * Connect a new cloud provider
   */
  public static async connectProvider(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const connectRequest: ConnectCloudProviderRequest = req.body;

      // Validate required fields
      if (!connectRequest.providerType || !connectRequest.alias || !connectRequest.credentials) {
        res.status(400).json({
          success: false,
          error: 'Provider type, alias, and credentials are required',
          timestamp: new Date()
        });
        return;
      }

      // Check if provider is supported
      if (!cloudProviderFactory.isProviderSupported(connectRequest.providerType)) {
        res.status(400).json({
          success: false,
          error: `Unsupported provider type: ${connectRequest.providerType}`,
          timestamp: new Date()
        });
        return;
      }

      // Test connection
      const provider = await cloudProviderFactory.createProvider(
        connectRequest.providerType,
        connectRequest.config
      );

      await provider.authenticate(connectRequest.credentials, connectRequest.config);
      
      const isConnected = await provider.testConnection();
      if (!isConnected) {
        res.status(400).json({
          success: false,
          error: 'Failed to connect to cloud provider',
          timestamp: new Date()
        });
        return;
      }

      // Save to database
      const providerId = uuidv4();
      const now = new Date();

      const result = await query(
        `INSERT INTO cloud_providers (
          id, user_id, provider_type, alias, credentials, config,
          connection_status, last_connected, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          providerId,
          userId,
          connectRequest.providerType,
          connectRequest.alias,
          JSON.stringify(connectRequest.credentials),
          JSON.stringify(connectRequest.config || {}),
          'connected',
          now,
          now,
          now
        ]
      );

      const cloudProvider = CloudController.mapDbRowToCloudProvider(result.rows[0]);

      res.status(201).json({
        success: true,
        data: { provider: cloudProvider },
        message: 'Cloud provider connected successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to connect provider:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect provider',
        timestamp: new Date()
      });
    }
  }

  /**
   * List connected cloud providers for user
   */
  public static async listProviders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = (page - 1) * limit;

      const countResult = await query(
        'SELECT COUNT(*) as total FROM cloud_providers WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0].total);

      const result = await query(
        `SELECT * FROM cloud_providers 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const providers = result.rows.map(row => CloudController.mapDbRowToCloudProvider(row));

      res.status(200).json({
        success: true,
        data: {
          providers,
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
      logger.error('Failed to list providers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list providers',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get cloud provider details
   */
  public static async getProvider(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;

      const result = await query(
        'SELECT * FROM cloud_providers WHERE id = $1 AND user_id = $2',
        [providerId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Cloud provider not found',
          timestamp: new Date()
        });
        return;
      }

      const provider = CloudController.mapDbRowToCloudProvider(result.rows[0]);

      res.status(200).json({
        success: true,
        data: { provider },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get provider',
        timestamp: new Date()
      });
    }
  }

  /**
   * Test cloud provider connection
   */
  public static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;

      const result = await query(
        'SELECT * FROM cloud_providers WHERE id = $1 AND user_id = $2',
        [providerId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Cloud provider not found',
          timestamp: new Date()
        });
        return;
      }

      const providerData = result.rows[0];
      const provider = await cloudProviderFactory.createProvider(
        providerData.provider_type,
        providerData.config ? JSON.parse(providerData.config) : {}
      );

      await provider.authenticate(
        JSON.parse(providerData.credentials),
        providerData.config ? JSON.parse(providerData.config) : {}
      );

      const isConnected = await provider.testConnection();
      const status = isConnected ? 'connected' : 'error';

      // Update connection status
      await query(
        'UPDATE cloud_providers SET connection_status = $1, last_connected = $2, updated_at = $3 WHERE id = $4',
        [status, isConnected ? new Date() : null, new Date(), providerId]
      );

      res.status(200).json({
        success: true,
        data: { 
          connected: isConnected,
          status 
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Connection test failed:', error);
      
      // Update connection status to error
      await query(
        'UPDATE cloud_providers SET connection_status = $1, error_message = $2, updated_at = $3 WHERE id = $4',
        ['error', error instanceof Error ? error.message : 'Connection test failed', new Date(), req.params.id]
      );

      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Update cloud provider
   */
  public static async updateProvider(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;
      const updates = req.body;

      // Check if provider exists and belongs to user
      const existingResult = await query(
        'SELECT * FROM cloud_providers WHERE id = $1 AND user_id = $2',
        [providerId, userId]
      );

      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Cloud provider not found',
          timestamp: new Date()
        });
        return;
      }

      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.alias) {
        setClause.push(`alias = $${paramIndex++}`);
        values.push(updates.alias);
      }

      if (updates.config) {
        setClause.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(updates.config));
      }

      if (updates.isActive !== undefined) {
        setClause.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      if (setClause.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No valid fields to update',
          timestamp: new Date()
        });
        return;
      }

      setClause.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(providerId);

      const result = await query(
        `UPDATE cloud_providers SET ${setClause.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updatedProvider = CloudController.mapDbRowToCloudProvider(result.rows[0]);

      res.status(200).json({
        success: true,
        data: { provider: updatedProvider },
        message: 'Cloud provider updated successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to update provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update provider',
        timestamp: new Date()
      });
    }
  }

  /**
   * Remove cloud provider
   */
  public static async removeProvider(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;

      // Check if provider has active jobs
      const activeJobsResult = await query(
        `SELECT COUNT(*) as count FROM transfer_jobs 
         WHERE (source_cloud_id = $1 OR destination_cloud_id = $1) 
         AND status IN ('pending', 'running', 'paused')`,
        [providerId]
      );

      const activeSyncJobsResult = await query(
        `SELECT COUNT(*) as count FROM sync_jobs 
         WHERE (source_cloud_id = $1 OR destination_cloud_id = $1) 
         AND is_active = true`,
        [providerId]
      );

      const activeJobs = parseInt(activeJobsResult.rows[0].count);
      const activeSyncJobs = parseInt(activeSyncJobsResult.rows[0].count);

      if (activeJobs > 0 || activeSyncJobs > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot remove provider with active transfer or sync jobs',
          timestamp: new Date()
        });
        return;
      }

      const result = await query(
        'DELETE FROM cloud_providers WHERE id = $1 AND user_id = $2 RETURNING *',
        [providerId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Cloud provider not found',
          timestamp: new Date()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Cloud provider removed successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to remove provider:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove provider',
        timestamp: new Date()
      });
    }
  }

  /**
   * Browse files in cloud provider
   */
  public static async browseFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;
      const path = req.query.path as string || '/';

      // Get provider
      const result = await query(
        'SELECT * FROM cloud_providers WHERE id = $1 AND user_id = $2 AND is_active = true',
        [providerId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Cloud provider not found or inactive',
          timestamp: new Date()
        });
        return;
      }

      const providerData = result.rows[0];
      const provider = await cloudProviderFactory.createProvider(
        providerData.provider_type,
        providerData.config ? JSON.parse(providerData.config) : {}
      );

      await provider.authenticate(
        JSON.parse(providerData.credentials),
        providerData.config ? JSON.parse(providerData.config) : {}
      );

      const files = await provider.listFiles(path);

      res.status(200).json({
        success: true,
        data: { 
          files,
          path,
          provider: {
            id: providerData.id,
            type: providerData.provider_type,
            alias: providerData.alias
          }
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to browse files:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to browse files',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get storage quota for cloud provider
   */
  public static async getQuota(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const providerId = req.params.id;

      // Get provider
      const result = await query(
        'SELECT * FROM cloud_providers WHERE id = $1 AND user_id = $2 AND is_active = true',
        [providerId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Cloud provider not found or inactive',
          timestamp: new Date()
        });
        return;
      }

      const providerData = result.rows[0];
      const provider = await cloudProviderFactory.createProvider(
        providerData.provider_type,
        providerData.config ? JSON.parse(providerData.config) : {}
      );

      await provider.authenticate(
        JSON.parse(providerData.credentials),
        providerData.config ? JSON.parse(providerData.config) : {}
      );

      const quota = await provider.getQuota();

      res.status(200).json({
        success: true,
        data: { 
          quota,
          provider: {
            id: providerData.id,
            type: providerData.provider_type,
            alias: providerData.alias
          }
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to get quota:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quota',
        timestamp: new Date()
      });
    }
  }

  // Helper methods

  private static mapDbRowToCloudProvider(row: any): CloudProvider {
    return {
      id: row.id,
      userId: row.user_id,
      providerType: row.provider_type,
      alias: row.alias,
      credentials: JSON.parse(row.credentials),
      config: row.config ? JSON.parse(row.config) : {},
      isActive: row.is_active,
      lastConnected: row.last_connected,
      connectionStatus: row.connection_status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}