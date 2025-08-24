import jwt from 'jsonwebtoken';
import { User } from '../types';
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

export interface JWTPayload {
  userId: string;
  email: string;
  subscriptionTier: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  /**
   * Generate access and refresh token pair
   */
  public static generateTokenPair(user: User): TokenPair {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'cloudslinker',
      audience: 'cloudslinker-users'
    });

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      this.JWT_REFRESH_SECRET,
      {
        expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        issuer: 'cloudslinker',
        audience: 'cloudslinker-users'
      }
    );

    // Calculate expiration time in seconds
    const expiresIn = this.parseTimeToSeconds(this.JWT_EXPIRES_IN);

    logger.info(`Generated JWT tokens for user ${user.id}`);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify and decode access token
   */
  public static verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'cloudslinker',
        audience: 'cloudslinker-users'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      logger.warn('Access token verification failed:', error);
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify and decode refresh token
   */
  public static verifyRefreshToken(token: string): { userId: string; tokenType: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'cloudslinker',
        audience: 'cloudslinker-users'
      }) as { userId: string; tokenType: string };

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.warn('Refresh token verification failed:', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  public static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Generate a secure random token for various purposes
   */
  public static generateSecureToken(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate OAuth state token
   */
  public static generateOAuthState(): string {
    return this.generateSecureToken(16);
  }

  /**
   * Verify OAuth state token
   */
  public static verifyOAuthState(state: string, expectedState: string): boolean {
    return state === expectedState;
  }

  /**
   * Parse time string (1h, 7d, etc.) to seconds
   */
  private static parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 3600;
    }
  }

  /**
   * Check if token is about to expire (within 5 minutes)
   */
  public static isTokenExpiringSoon(payload: JWTPayload): boolean {
    if (!payload.exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    
    return (payload.exp - now) < fiveMinutes;
  }

  /**
   * Get token expiration date
   */
  public static getTokenExpiration(payload: JWTPayload): Date | null {
    if (!payload.exp) return null;
    return new Date(payload.exp * 1000);
  }

  /**
   * Blacklist a token (you would typically store this in Redis)
   */
  public static async blacklistToken(token: string): Promise<void> {
    // In a real implementation, you would store this in Redis
    // with an expiration time equal to the token's remaining life
    logger.info('Token blacklisted (implement Redis storage)');
  }

  /**
   * Check if token is blacklisted
   */
  public static async isTokenBlacklisted(token: string): Promise<boolean> {
    // In a real implementation, check Redis for blacklisted tokens
    return false;
  }
}