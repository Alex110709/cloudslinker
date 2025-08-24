import bcrypt from 'bcrypt';
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

export class PasswordService {
  private static readonly SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly MAX_PASSWORD_LENGTH = 128;

  /**
   * Hash a password using bcrypt
   */
  public static async hashPassword(password: string): Promise<string> {
    try {
      this.validatePassword(password);
      
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      logger.debug('Password hashed successfully');
      
      return hashedPassword;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   */
  public static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      logger.debug('Password verification completed', { isValid });
      
      return isValid;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  public static validatePassword(password: string): void {
    if (!password) {
      throw new Error('Password is required');
    }

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > this.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be no more than ${this.MAX_PASSWORD_LENGTH} characters long`);
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const commonWeakPatterns = [
      /(.)\1{2,}/, // Three or more consecutive identical characters
      /123456/, // Sequential numbers
      /abcdef/, // Sequential letters
      /qwerty/i, // Common keyboard patterns
      /password/i, // Contains "password"
      /admin/i, // Contains "admin"
    ];

    for (const pattern of commonWeakPatterns) {
      if (pattern.test(password)) {
        throw new Error('Password contains weak patterns and is not secure');
      }
    }
  }

  /**
   * Generate a secure random password
   */
  public static generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs rehashing (if bcrypt rounds have increased)
   */
  public static async needsRehashing(hashedPassword: string): Promise<boolean> {
    try {
      // Extract the salt rounds from the hash
      const rounds = bcrypt.getRounds(hashedPassword);
      return rounds < this.SALT_ROUNDS;
    } catch (error) {
      logger.warn('Failed to check if password needs rehashing:', error);
      return false;
    }
  }

  /**
   * Calculate password strength score (0-100)
   */
  public static calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Length score (up to 25 points)
    score += Math.min(password.length * 2, 25);
    
    // Character variety (up to 40 points)
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Patterns (up to 35 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);
    
    // No repeated patterns
    if (!/(.)\1{2,}/.test(password)) score += 5;
    
    // No sequential patterns
    if (!/123|abc|qwe/i.test(password)) score += 5;
    
    // No common words
    if (!/password|admin|user|login/i.test(password)) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Get password strength description
   */
  public static getPasswordStrengthDescription(score: number): string {
    if (score < 25) return 'Very Weak';
    if (score < 50) return 'Weak';
    if (score < 75) return 'Good';
    if (score < 90) return 'Strong';
    return 'Very Strong';
  }

  /**
   * Generate password reset token
   */
  public static generateResetToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a reset token for storage
   */
  public static async hashResetToken(token: string): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}