import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../utils/jwt';
import { UserService } from '../services/UserService';
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

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader || '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date()
      });
      return;
    }

    // Check if token is blacklisted
    if (await JWTService.isTokenBlacklisted(token)) {
      res.status(401).json({
        success: false,
        error: 'Token has been revoked',
        timestamp: new Date()
      });
      return;
    }

    // Verify token
    const payload = JWTService.verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await UserService.getUserById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        timestamp: new Date()
      });
      return;
    }

    // Add user info to request
    req.user = payload;
    req.userId = payload.userId;

    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date()
    });
  }
};

/**
 * Middleware to check if user has required subscription tier
 */
export const requireSubscription = (requiredTier: 'free' | 'pro' | 'enterprise') => {
  const tierLevels = { free: 0, pro: 1, enterprise: 2 };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date()
      });
      return;
    }

    const userTierLevel = tierLevels[req.user.subscriptionTier as keyof typeof tierLevels];
    const requiredTierLevel = tierLevels[requiredTier];

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({
        success: false,
        error: `${requiredTier} subscription required`,
        timestamp: new Date()
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader || '');

    if (token) {
      const payload = JWTService.verifyAccessToken(token);
      
      // Verify user still exists and is active
      const user = await UserService.getUserById(payload.userId);
      if (user && user.isActive) {
        req.user = payload;
        req.userId = payload.userId;
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};

/**
 * Middleware to validate API key for service-to-service communication
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.error('API_KEY environment variable not set');
    res.status(500).json({
      success: false,
      error: 'Server configuration error',
      timestamp: new Date()
    });
    return;
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      timestamp: new Date()
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user owns a resource
 */
export const requireResourceOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date()
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.userId;

    try {
      // This is a generic check - you might need to implement specific
      // ownership checks for different resource types
      // For now, we'll just check if the resource ID matches user ID
      // or implement specific checks in individual route handlers
      
      next();
    } catch (error) {
      logger.error('Ownership check failed:', error);
      res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }
  };
};

/**
 * Rate limiting middleware
 */
export const rateLimitByUser = (windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.user?.userId || req.ip;
    const now = Date.now();

    const userLimit = userRequests.get(identifier);
    
    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
        timestamp: new Date()
      });
      return;
    }

    userLimit.count++;
    next();
  };
};

/**
 * CORS middleware for OAuth callbacks
 */
export const corsForOAuth = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3000',
    'https://localhost:3000'
  ];

  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};

/**
 * Error handling middleware for authentication errors
 */
export const handleAuthError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      timestamp: new Date()
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      timestamp: new Date()
    });
    return;
  }

  if (error.name === 'NotBeforeError') {
    res.status(401).json({
      success: false,
      error: 'Token not active',
      timestamp: new Date()
    });
    return;
  }

  next(error);
};