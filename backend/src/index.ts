import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { initializeDatabase, closeDatabase, checkDatabaseHealth } from './database/connection';
import { cloudProviderFactory } from './providers/CloudProviderFactory';
import { queueManager, queueScheduler } from './services/QueueManager';
import apiRouter from './routes/api';
import { handleAuthError } from './middleware/auth';
import winston from 'winston';

// Load environment variables
dotenv.config();

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
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

class CloudsLinkerServer {
  private app: Express;
  private server: any;
  private io: Server;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001');
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for development
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy if behind reverse proxy
    if (process.env.TRUST_PROXY === 'true') {
      this.app.set('trust proxy', 1);
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const dbHealth = await checkDatabaseHealth();
        const queueStats = await queueManager.getAllQueueStats();
        
        res.status(200).json({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date(),
            uptime: process.uptime(),
            database: dbHealth,
            queues: queueStats,
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0'
          }
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          success: false,
          error: 'Service unhealthy',
          timestamp: new Date()
        });
      }
    });

    // API documentation
    if (process.env.ENABLE_SWAGGER === 'true') {
      const swaggerOptions = {
        definition: {
          openapi: '3.0.0',
          info: {
            title: 'CloudsLinker API',
            version: '1.0.0',
            description: 'CloudsLinker - Zero-bandwidth cloud-to-cloud transfer platform',
            contact: {
              name: 'CloudsLinker Support',
              email: 'support@cloudslinker.com'
            }
          },
          servers: [
            {
              url: `http://localhost:${this.port}`,
              description: 'Development server'
            }
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
              }
            }
          }
        },
        apis: ['./src/routes/*.ts', './src/controllers/*.ts']
      };

      const specs = swaggerJsdoc(swaggerOptions);
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    }

    // API routes
    this.app.use('/api', apiRouter);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Route not found',
        timestamp: new Date()
      });
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user-specific room for real-time updates
      socket.on('join', (data) => {
        const { userId } = data;
        if (userId) {
          socket.join(`user:${userId}`);
          logger.debug(`User ${userId} joined room`);
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Set up real-time event listeners
    this.setupRealtimeEvents();
  }

  private setupRealtimeEvents(): void {
    // Transfer events
    const { transferEngine } = require('./services/TransferEngine');
    
    transferEngine.on('jobCreated', (job: any) => {
      this.io.to(`user:${job.userId}`).emit('transferCreated', job);
    });

    transferEngine.on('jobUpdated', (job: any) => {
      this.io.to(`user:${job.userId}`).emit('transferUpdated', job);
    });

    // Sync events
    const { syncEngine } = require('./services/SyncEngine');
    
    syncEngine.on('syncJobCreated', (job: any) => {
      this.io.to(`user:${job.userId}`).emit('syncCreated', job);
    });

    syncEngine.on('syncJobUpdated', (job: any) => {
      this.io.to(`user:${job.userId}`).emit('syncUpdated', job);
    });

    // Queue events
    queueManager.on('jobCompleted', ({ queueName, job, result }) => {
      if (job.data.userId) {
        this.io.to(`user:${job.data.userId}`).emit('jobCompleted', {
          queueName,
          jobId: job.id,
          type: job.data.type,
          result
        });
      }
    });

    queueManager.on('jobFailed', ({ queueName, job, error }) => {
      if (job.data.userId) {
        this.io.to(`user:${job.data.userId}`).emit('jobFailed', {
          queueName,
          jobId: job.id,
          type: job.data.type,
          error: error.message
        });
      }
    });

    queueManager.on('jobProgress', ({ queueName, job, progress }) => {
      if (job.data.userId) {
        this.io.to(`user:${job.data.userId}`).emit('jobProgress', {
          queueName,
          jobId: job.id,
          type: job.data.type,
          progress
        });
      }
    });
  }

  private setupErrorHandling(): void {
    // Authentication error handler
    this.app.use(handleAuthError);

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', error);

      // Don't leak error details in production
      const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error'
        : error.message;

      res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle process signals
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      this.gracefulShutdown('SIGINT');
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await initializeDatabase();
      logger.info('Database initialized successfully');

      // Initialize cloud provider factory
      await cloudProviderFactory.autoRegisterProviders();
      logger.info('Cloud providers registered successfully');

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`CloudsLinker server started on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`API Documentation: http://localhost:${this.port}/api-docs`);
        logger.info(`Health Check: http://localhost:${this.port}/health`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Graceful shutdown initiated (${signal})`);

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Close WebSocket server
      if (this.io) {
        this.io.close();
        logger.info('WebSocket server closed');
      }

      // Shutdown queue manager
      await queueManager.shutdown();
      queueScheduler.shutdown();
      logger.info('Queue manager shutdown complete');

      // Close database connections
      await closeDatabase();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown complete');
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public getApp(): Express {
    return this.app;
  }

  public getIO(): Server {
    return this.io;
  }
}

// Create and start server
const server = new CloudsLinkerServer();

if (require.main === module) {
  server.start();
}

export default server;