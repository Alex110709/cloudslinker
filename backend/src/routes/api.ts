import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { CloudController } from '../controllers/CloudController';
import { TransferController } from '../controllers/TransferController';
import { SyncController } from '../controllers/SyncController';
import { 
  authenticateToken, 
  optionalAuth, 
  requireSubscription,
  rateLimitByUser,
  corsForOAuth 
} from '../middleware/auth';

// Auth routes
export const authRoutes = Router();

authRoutes.post('/register', AuthController.register);
authRoutes.post('/login', AuthController.login);
authRoutes.post('/refresh', AuthController.refreshToken);
authRoutes.post('/logout', AuthController.logout);
authRoutes.post('/forgot-password', AuthController.requestPasswordReset);
authRoutes.post('/check-password-strength', AuthController.checkPasswordStrength);

// Protected auth routes
authRoutes.get('/profile', authenticateToken, AuthController.getProfile);
authRoutes.put('/profile', authenticateToken, AuthController.updateProfile);
authRoutes.post('/change-password', authenticateToken, AuthController.changePassword);
authRoutes.post('/verify-email', authenticateToken, AuthController.verifyEmail);
authRoutes.post('/deactivate', authenticateToken, AuthController.deactivateAccount);

// Cloud provider routes
export const cloudRoutes = Router();

cloudRoutes.get('/supported', CloudController.getSupportedProviders);
cloudRoutes.get('/', authenticateToken, CloudController.listProviders);
cloudRoutes.post('/connect', authenticateToken, CloudController.connectProvider);
cloudRoutes.get('/:id', authenticateToken, CloudController.getProvider);
cloudRoutes.put('/:id', authenticateToken, CloudController.updateProvider);
cloudRoutes.delete('/:id', authenticateToken, CloudController.removeProvider);
cloudRoutes.post('/:id/test', authenticateToken, CloudController.testConnection);
cloudRoutes.get('/:id/browse', authenticateToken, CloudController.browseFiles);
cloudRoutes.get('/:id/quota', authenticateToken, CloudController.getQuota);

// Transfer routes
export const transferRoutes = Router();

transferRoutes.get('/stats', authenticateToken, TransferController.getTransferStats);
transferRoutes.get('/', authenticateToken, TransferController.listTransfers);
transferRoutes.post('/', authenticateToken, TransferController.createTransfer);
transferRoutes.get('/:id', authenticateToken, TransferController.getTransfer);
transferRoutes.post('/:id/start', authenticateToken, TransferController.startTransfer);
transferRoutes.post('/:id/pause', authenticateToken, TransferController.pauseTransfer);
transferRoutes.post('/:id/resume', authenticateToken, TransferController.resumeTransfer);
transferRoutes.post('/:id/cancel', authenticateToken, TransferController.cancelTransfer);
transferRoutes.get('/:id/progress', authenticateToken, TransferController.getTransferProgress);
transferRoutes.delete('/:id', authenticateToken, TransferController.deleteTransfer);

// Sync routes
export const syncRoutes = Router();

syncRoutes.get('/stats', authenticateToken, SyncController.getSyncStats);
syncRoutes.post('/validate-cron', authenticateToken, SyncController.validateCron);
syncRoutes.get('/', authenticateToken, SyncController.listSyncs);
syncRoutes.post('/', authenticateToken, SyncController.createSync);
syncRoutes.get('/:id', authenticateToken, SyncController.getSync);
syncRoutes.put('/:id', authenticateToken, SyncController.updateSync);
syncRoutes.post('/:id/start', authenticateToken, SyncController.startSync);
syncRoutes.post('/:id/stop', authenticateToken, SyncController.stopSync);
syncRoutes.post('/:id/toggle', authenticateToken, SyncController.toggleSync);
syncRoutes.get('/:id/history', authenticateToken, SyncController.getSyncHistory);
syncRoutes.delete('/:id', authenticateToken, SyncController.deleteSync);

// System/Admin routes (optional)
export const systemRoutes = Router();

systemRoutes.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

systemRoutes.get('/version', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Queue management routes (admin only)
systemRoutes.get('/queues', authenticateToken, requireSubscription('enterprise'), async (req, res) => {
  try {
    const { queueManager } = await import('../services/QueueManager');
    const stats = await queueManager.getAllQueueStats();
    
    res.status(200).json({
      success: true,
      data: { queues: stats },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      timestamp: new Date()
    });
  }
});

systemRoutes.get('/queues/:queueName', authenticateToken, requireSubscription('enterprise'), async (req, res) => {
  try {
    const { queueManager } = await import('../services/QueueManager');
    const queueName = req.params.queueName;
    const stats = await queueManager.getQueueStats(queueName);
    
    res.status(200).json({
      success: true,
      data: { queue: queueName, stats },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      timestamp: new Date()
    });
  }
});

systemRoutes.post('/queues/:queueName/pause', authenticateToken, requireSubscription('enterprise'), async (req, res) => {
  try {
    const { queueManager } = await import('../services/QueueManager');
    const queueName = req.params.queueName;
    await queueManager.pauseQueue(queueName);
    
    res.status(200).json({
      success: true,
      message: `Queue ${queueName} paused successfully`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
      timestamp: new Date()
    });
  }
});

systemRoutes.post('/queues/:queueName/resume', authenticateToken, requireSubscription('enterprise'), async (req, res) => {
  try {
    const { queueManager } = await import('../services/QueueManager');
    const queueName = req.params.queueName;
    await queueManager.resumeQueue(queueName);
    
    res.status(200).json({
      success: true,
      message: `Queue ${queueName} resumed successfully`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
      timestamp: new Date()
    });
  }
});

// Combined API router
export const apiRouter = Router();

// Apply rate limiting to all API routes
apiRouter.use(rateLimitByUser(15 * 60 * 1000, 1000)); // 1000 requests per 15 minutes

// Mount route modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/clouds', cloudRoutes);
apiRouter.use('/transfers', transferRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/system', systemRoutes);

export default apiRouter;