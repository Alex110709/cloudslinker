import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';
import winston from 'winston';

// Logger setup
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

// PostgreSQL connection configuration
const pgConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://cloudslinker:cloudslinker123@localhost:5432/cloudslinker',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool
export const db = new Pool(pgConfig);

// Redis connection configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
export const redis: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

// Database connection initialization
export async function initializeDatabase(): Promise<void> {
  try {
    // Test PostgreSQL connection
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connection established successfully');

    // Connect to Redis
    if (!redis.isOpen) {
      await redis.connect();
      logger.info('Redis connection established successfully');
    }

    // Set up Redis error handling
    redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redis.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await db.end();
    logger.info('PostgreSQL connection pool closed');

    if (redis.isOpen) {
      await redis.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections:', error);
    throw error;
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{ postgres: boolean; redis: boolean }> {
  const health = { postgres: false, redis: false };

  try {
    // Check PostgreSQL
    const client = await db.connect();
    await client.query('SELECT 1');
    client.release();
    health.postgres = true;
  } catch (error) {
    logger.error('PostgreSQL health check failed:', error);
  }

  try {
    // Check Redis
    await redis.ping();
    health.redis = true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }

  return health;
}

// Query helper function with logging
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', {
      query: text,
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query error', {
      query: text,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

// Redis cache helper functions
export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch (error) {
      logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (ttlSeconds) {
        await redis.setEx(key, ttlSeconds, value);
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache DEL error for key ${key}:`, error);
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }
};

export default {
  db,
  redis,
  query,
  cache,
  initializeDatabase,
  closeDatabase,
  checkDatabaseHealth
};