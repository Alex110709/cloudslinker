import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CloudsLinker API',
      version: '1.0.0',
      description: 'CloudsLinker - Cloud Storage Integration Platform API Documentation',
      contact: {
        name: 'CloudsLinker Team',
        email: 'support@cloudslinker.com',
        url: 'https://cloudslinker.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.cloudslinker.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'firstName', 'lastName'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            avatar: {
              type: 'string',
              format: 'uri',
              description: 'User avatar URL',
            },
            isActive: {
              type: 'boolean',
              description: 'User active status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },
        CloudProvider: {
          type: 'object',
          required: ['type', 'name', 'config'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Cloud provider unique identifier',
            },
            type: {
              type: 'string',
              enum: ['pikpak', 'webdav', 'synology'],
              description: 'Cloud provider type',
            },
            name: {
              type: 'string',
              description: 'Cloud provider display name',
            },
            config: {
              type: 'object',
              description: 'Cloud provider configuration',
            },
            isConnected: {
              type: 'boolean',
              description: 'Connection status',
            },
            lastConnectedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last successful connection timestamp',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        TransferJob: {
          type: 'object',
          required: ['sourceCloudId', 'destinationCloudId', 'sourcePath', 'destinationPath'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Transfer job unique identifier',
            },
            sourceCloudId: {
              type: 'string',
              format: 'uuid',
              description: 'Source cloud provider ID',
            },
            destinationCloudId: {
              type: 'string',
              format: 'uuid',
              description: 'Destination cloud provider ID',
            },
            sourcePath: {
              type: 'string',
              description: 'Source file/folder path',
            },
            destinationPath: {
              type: 'string',
              description: 'Destination path',
            },
            status: {
              type: 'string',
              enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
              description: 'Transfer job status',
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Transfer progress percentage',
            },
            totalSize: {
              type: 'number',
              description: 'Total transfer size in bytes',
            },
            transferredSize: {
              type: 'number',
              description: 'Transferred size in bytes',
            },
            speed: {
              type: 'number',
              description: 'Transfer speed in bytes per second',
            },
            estimatedTimeRemaining: {
              type: 'number',
              description: 'Estimated time remaining in seconds',
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Transfer start timestamp',
            },
            completedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Transfer completion timestamp',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        SyncJob: {
          type: 'object',
          required: ['name', 'sourceCloudId', 'destinationCloudId', 'sourcePath', 'destinationPath', 'syncDirection'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Sync job unique identifier',
            },
            name: {
              type: 'string',
              description: 'Sync job display name',
            },
            sourceCloudId: {
              type: 'string',
              format: 'uuid',
              description: 'Source cloud provider ID',
            },
            destinationCloudId: {
              type: 'string',
              format: 'uuid',
              description: 'Destination cloud provider ID',
            },
            sourcePath: {
              type: 'string',
              description: 'Source directory path',
            },
            destinationPath: {
              type: 'string',
              description: 'Destination directory path',
            },
            syncDirection: {
              type: 'string',
              enum: ['bidirectional', 'source_to_destination', 'destination_to_source'],
              description: 'Sync direction',
            },
            status: {
              type: 'string',
              enum: ['active', 'paused', 'disabled', 'running', 'error'],
              description: 'Sync job status',
            },
            schedule: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['manual', 'interval', 'cron'],
                  description: 'Schedule type',
                },
                intervalMinutes: {
                  type: 'number',
                  description: 'Interval in minutes for interval type',
                },
                cronExpression: {
                  type: 'string',
                  description: 'Cron expression for cron type',
                },
              },
            },
            options: {
              type: 'object',
              properties: {
                conflictResolution: {
                  type: 'string',
                  enum: ['newest', 'largest', 'manual', 'skip'],
                  description: 'Conflict resolution strategy',
                },
                deleteOrphaned: {
                  type: 'boolean',
                  description: 'Delete orphaned files',
                },
                preserveTimestamps: {
                  type: 'boolean',
                  description: 'Preserve file timestamps',
                },
                skipHidden: {
                  type: 'boolean',
                  description: 'Skip hidden files',
                },
              },
            },
            lastRunAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last run timestamp',
            },
            nextRunAt: {
              type: 'string',
              format: 'date-time',
              description: 'Next scheduled run timestamp',
            },
            isEnabled: {
              type: 'boolean',
              description: 'Sync job enabled status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CloudsLinker API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  }));

  // Serve swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger UI available at http://localhost:3001/api-docs');
};

export default specs;