import { v4 as uuidv4 } from 'uuid';
import { User, APIResponse } from '../types';
import { query } from '../database/connection';
import { PasswordService } from '../utils/password';
import { JWTService, TokenPair } from '../utils/jwt';
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

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: TokenPair;
}

export class UserService {
  /**
   * Create a new user account
   */
  public static async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Validate email format
      if (!this.isValidEmail(userData.email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate and hash password
      PasswordService.validatePassword(userData.password);
      const passwordHash = await PasswordService.hashPassword(userData.password);

      // Create user
      const userId = uuidv4();
      const now = new Date();

      const result = await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          userData.email.toLowerCase(),
          passwordHash,
          userData.firstName || null,
          userData.lastName || null,
          now,
          now
        ]
      );

      const user = this.mapDbRowToUser(result.rows[0]);
      
      logger.info(`User created successfully: ${user.id}`);
      
      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user and return tokens
   */
  public static async loginUser(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(loginData.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await PasswordService.verifyPassword(
        loginData.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check if password needs rehashing
      if (await PasswordService.needsRehashing(user.passwordHash)) {
        const newPasswordHash = await PasswordService.hashPassword(loginData.password);
        await this.updateUserPassword(user.id, newPasswordHash);
      }

      // Generate tokens
      const tokens = JWTService.generateTokenPair(user);

      // Update last login
      await query(
        'UPDATE users SET updated_at = NOW() WHERE id = $1',
        [user.id]
      );

      logger.info(`User logged in successfully: ${user.id}`);

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = JWTService.verifyRefreshToken(refreshToken);

      // Find user
      const user = await this.findUserById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new token pair
      const tokens = JWTService.generateTokenPair(user);

      logger.info(`Tokens refreshed for user: ${user.id}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  public static async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  public static async updateUser(userId: string, updateData: UpdateUserRequest): Promise<User> {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Update basic fields
      if (updateData.firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(updateData.firstName);
      }

      if (updateData.lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(updateData.lastName);
      }

      // Handle password change
      if (updateData.newPassword) {
        if (!updateData.currentPassword) {
          throw new Error('Current password is required to change password');
        }

        const isCurrentPasswordValid = await PasswordService.verifyPassword(
          updateData.currentPassword,
          user.passwordHash
        );

        if (!isCurrentPasswordValid) {
          throw new Error('Current password is incorrect');
        }

        PasswordService.validatePassword(updateData.newPassword);
        const newPasswordHash = await PasswordService.hashPassword(updateData.newPassword);

        updates.push(`password_hash = $${paramIndex++}`);
        values.push(newPasswordHash);
      }

      if (updates.length === 0) {
        return user;
      }

      // Add updated_at and user ID
      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(userId);

      const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updatedUser = this.mapDbRowToUser(result.rows[0]);
      
      logger.info(`User updated successfully: ${userId}`);
      
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  public static async deactivateUser(userId: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      throw error;
    }
  }

  /**
   * Change user subscription tier
   */
  public static async updateSubscriptionTier(
    userId: string,
    tier: 'free' | 'pro' | 'enterprise'
  ): Promise<User> {
    try {
      const result = await query(
        'UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2 AND is_active = true RETURNING *',
        [tier, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const updatedUser = this.mapDbRowToUser(result.rows[0]);
      
      logger.info(`User subscription updated to ${tier}: ${userId}`);
      
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update subscription tier:', error);
      throw error;
    }
  }

  /**
   * Send password reset email (placeholder - implement email service)
   */
  public static async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.findUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      const resetToken = PasswordService.generateResetToken();
      const hashedToken = await PasswordService.hashResetToken(resetToken);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token (you might want a separate table for this)
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`,
        [user.id, hashedToken, expiresAt]
      );

      // TODO: Send email with reset token
      logger.info(`Password reset token generated for user: ${user.id}`);
      
    } catch (error) {
      logger.error('Failed to process password reset request:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  public static async verifyEmail(userId: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      logger.info(`Email verified for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to verify email:', error);
      throw error;
    }
  }

  // Private helper methods

  private static async findUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbRowToUser(result.rows[0]);
  }

  private static async findUserById(userId: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbRowToUser(result.rows[0]);
  }

  private static async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );
  }

  private static mapDbRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      subscriptionTier: row.subscription_tier,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Add password reset tokens table to the schema
export const createPasswordResetTokensTable = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
`;