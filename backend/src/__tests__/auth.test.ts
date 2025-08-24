import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { app } from '../app';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';

// Mock the services
jest.mock('../services/AuthService');
jest.mock('../services/UserService');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const mockUserService = UserService as jest.MockedClass<typeof UserService>;

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      };

      const mockToken = 'mock-jwt-token';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      mockAuthService.prototype.validatePassword = jest.fn().mockResolvedValue(true);
      mockAuthService.prototype.generateToken = jest.fn().mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validLoginData.email);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('Invalid email format');
    });

    it('should return 400 for missing password', async () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('Password is required');
    });

    it('should return 401 for invalid credentials', async () => {
      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        isActive: true,
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/register', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
    };

    it('should register a new user with valid data', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        isActive: true,
      };

      const mockToken = 'mock-jwt-token';

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(null);
      mockUserService.prototype.createUser = jest.fn().mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      mockAuthService.prototype.generateToken = jest.fn().mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(validRegisterData.email);
    });

    it('should return 400 for existing email', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'newuser@example.com',
      };

      mockUserService.prototype.getUserByEmail = jest.fn().mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegisterData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = {
        ...validRegisterData,
        password: '123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('Password must be at least 6 characters long');
    });
  });

  describe('GET /api/auth/profile', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
    };

    it('should return user profile for valid token', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = { userId: 'user-1', email: 'test@example.com' };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      mockUserService.prototype.getUserById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(mockUser.id);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Access token is required');
    });

    it('should return 401 for invalid token', async () => {
      const invalidToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const newAccessToken = 'new-access-token';
      const decodedToken = { userId: 'user-1', email: 'test@example.com', type: 'refresh' };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (jwt.sign as jest.Mock).mockReturnValue(newAccessToken);
      mockAuthService.prototype.generateToken = jest.fn().mockReturnValue(newAccessToken);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBe(newAccessToken);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Refresh token is required');
    });
  });
});