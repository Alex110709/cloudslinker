import { Request, Response } from 'express';
import { UserService, CreateUserRequest, LoginRequest, UpdateUserRequest } from '../services/UserService';
import { JWTService } from '../utils/jwt';
import { PasswordService } from '../utils/password';
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

export class AuthController {
  /**
   * Register a new user
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;

      // Validate required fields
      if (!userData.email || !userData.password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
          timestamp: new Date()
        });
        return;
      }

      const user = await UserService.createUser(userData);
      
      // Generate tokens for immediate login
      const tokens = JWTService.generateTokenPair(user);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          tokens
        },
        message: 'User registered successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Registration failed:', error);
      
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * User login
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;

      // Validate required fields
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
          timestamp: new Date()
        });
        return;
      }

      const authResponse = await UserService.loginUser(loginData);

      res.status(200).json({
        success: true,
        data: authResponse,
        message: 'Login successful',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Login failed:', error);
      
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Refresh access token
   */
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          timestamp: new Date()
        });
        return;
      }

      const tokens = await UserService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
        message: 'Tokens refreshed successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Token refresh failed:', error);
      
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        timestamp: new Date()
      });
    }
  }

  /**
   * User logout
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = JWTService.extractTokenFromHeader(authHeader || '');

      if (token) {
        // Add token to blacklist
        await JWTService.blacklistToken(token);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get current user profile
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
        return;
      }

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        data: { user: userWithoutPassword },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get profile failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        timestamp: new Date()
      });
    }
  }

  /**
   * Update user profile
   */
  public static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const updateData: UpdateUserRequest = req.body;

      const updatedUser = await UserService.updateUser(userId, updateData);

      // Remove password hash from response
      const { passwordHash, ...userWithoutPassword } = updatedUser;

      res.status(200).json({
        success: true,
        data: { user: userWithoutPassword },
        message: 'Profile updated successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Update profile failed:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Change password
   */
  public static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
          timestamp: new Date()
        });
        return;
      }

      await UserService.updateUser(userId, {
        currentPassword,
        newPassword
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Change password failed:', error);
      
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Password change failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Request password reset
   */
  public static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
          timestamp: new Date()
        });
        return;
      }

      await UserService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Password reset request failed:', error);
      
      // Always return success to prevent information disclosure
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date()
      });
    }
  }

  /**
   * Verify email address
   */
  public static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      await UserService.verifyEmail(userId);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Email verification failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Email verification failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Deactivate user account
   */
  public static async deactivateAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password confirmation is required',
          timestamp: new Date()
        });
        return;
      }

      // Get user and verify password
      const user = await UserService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          timestamp: new Date()
        });
        return;
      }

      const isPasswordValid = await PasswordService.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid password',
          timestamp: new Date()
        });
        return;
      }

      await UserService.deactivateUser(userId);

      res.status(200).json({
        success: true,
        message: 'Account deactivated successfully',
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Account deactivation failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Account deactivation failed',
        timestamp: new Date()
      });
    }
  }

  /**
   * Check password strength
   */
  public static async checkPasswordStrength(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;

      if (!password) {
        res.status(400).json({
          success: false,
          error: 'Password is required',
          timestamp: new Date()
        });
        return;
      }

      const score = PasswordService.calculatePasswordStrength(password);
      const description = PasswordService.getPasswordStrengthDescription(score);

      let isValid = true;
      let errors: string[] = [];

      try {
        PasswordService.validatePassword(password);
      } catch (error) {
        isValid = false;
        if (error instanceof Error) {
          errors.push(error.message);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          score,
          description,
          isValid,
          errors
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Password strength check failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Password strength check failed',
        timestamp: new Date()
      });
    }
  }
}