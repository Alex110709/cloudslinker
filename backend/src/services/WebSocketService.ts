import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { TransferJob, SyncJob, User } from '../types';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

interface SocketUser {
  userId: string;
  socketId: string;
  connectedAt: Date;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser[]> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('WebSocket service initialized');
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // In a real app, you would fetch the user from the database
        const user: User = {
          id: decoded.userId,
          email: decoded.email,
          firstName: decoded.firstName || '사용자',
          lastName: decoded.lastName || '',
          subscriptionTier: decoded.subscriptionTier || 'free',
          isActive: true,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        socket.user = user;
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const user = socket.user!;
    
    logger.info(`User connected via WebSocket: ${user.email} (${socket.id})`);

    // Track connected user
    this.addConnectedUser(user.id, socket.id);

    // Join user-specific room
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);
    
    // Setup user rooms tracking
    if (!this.userRooms.has(user.id)) {
      this.userRooms.set(user.id, new Set());
    }
    this.userRooms.get(user.id)!.add(userRoom);

    // Handle room subscriptions
    this.setupRoomHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      message: '실시간 모니터링에 연결되었습니다.',
      userId: user.id,
      timestamp: new Date().toISOString(),
    });
  }

  private setupRoomHandlers(socket: AuthenticatedSocket): void {
    const user = socket.user!;

    // Subscribe to transfer job updates
    socket.on('subscribe:transfer', (transferId: string) => {
      const room = `transfer:${transferId}`;
      socket.join(room);
      this.userRooms.get(user.id)?.add(room);
      
      logger.debug(`User ${user.id} subscribed to transfer ${transferId}`);
      socket.emit('subscribed', { room, type: 'transfer', id: transferId });
    });

    // Unsubscribe from transfer job updates
    socket.on('unsubscribe:transfer', (transferId: string) => {
      const room = `transfer:${transferId}`;
      socket.leave(room);
      this.userRooms.get(user.id)?.delete(room);
      
      logger.debug(`User ${user.id} unsubscribed from transfer ${transferId}`);
      socket.emit('unsubscribed', { room, type: 'transfer', id: transferId });
    });

    // Subscribe to sync job updates
    socket.on('subscribe:sync', (syncId: string) => {
      const room = `sync:${syncId}`;
      socket.join(room);
      this.userRooms.get(user.id)?.add(room);
      
      logger.debug(`User ${user.id} subscribed to sync ${syncId}`);
      socket.emit('subscribed', { room, type: 'sync', id: syncId });
    });

    // Unsubscribe from sync job updates
    socket.on('unsubscribe:sync', (syncId: string) => {
      const room = `sync:${syncId}`;
      socket.leave(room);
      this.userRooms.get(user.id)?.delete(room);
      
      logger.debug(`User ${user.id} unsubscribed from sync ${syncId}`);
      socket.emit('unsubscribed', { room, type: 'sync', id: syncId });
    });

    // Subscribe to all user's jobs
    socket.on('subscribe:user:all', () => {
      const room = `user:${user.id}:jobs`;
      socket.join(room);
      this.userRooms.get(user.id)?.add(room);
      
      logger.debug(`User ${user.id} subscribed to all user jobs`);
      socket.emit('subscribed', { room, type: 'user_jobs', id: user.id });
    });

    // Request current status
    socket.on('request:status', (data: { type: 'transfer' | 'sync'; id: string }) => {
      // This would fetch current status from database/cache
      socket.emit('status:response', {
        type: data.type,
        id: data.id,
        timestamp: new Date().toISOString(),
        // Add actual status data here
      });
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const user = socket.user!;
    
    logger.info(`User disconnected from WebSocket: ${user.email} (${socket.id})`);

    // Remove from connected users
    this.removeConnectedUser(user.id, socket.id);

    // Clean up user rooms if no more connections
    const userConnections = this.connectedUsers.get(user.id);
    if (!userConnections || userConnections.length === 0) {
      this.userRooms.delete(user.id);
    }
  }

  private addConnectedUser(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, []);
    }
    
    this.connectedUsers.get(userId)!.push({
      userId,
      socketId,
      connectedAt: new Date(),
    });
  }

  private removeConnectedUser(userId: string, socketId: string): void {
    const userConnections = this.connectedUsers.get(userId);
    if (userConnections) {
      const filtered = userConnections.filter(conn => conn.socketId !== socketId);
      if (filtered.length === 0) {
        this.connectedUsers.delete(userId);
      } else {
        this.connectedUsers.set(userId, filtered);
      }
    }
  }

  // Public methods for broadcasting updates

  /**
   * Broadcast transfer job progress update
   */
  public broadcastTransferProgress(transferJob: Partial<TransferJob>): void {
    const room = `transfer:${transferJob.id}`;
    const userRoom = `user:${transferJob.userId}:jobs`;
    
    this.io.to(room).to(userRoom).emit('transfer:progress', {
      type: 'transfer_progress',
      data: transferJob,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Broadcasted transfer progress for job ${transferJob.id}`);
  }

  /**
   * Broadcast transfer job status change
   */
  public broadcastTransferStatus(transferJob: Partial<TransferJob>): void {
    const room = `transfer:${transferJob.id}`;
    const userRoom = `user:${transferJob.userId}:jobs`;
    
    this.io.to(room).to(userRoom).emit('transfer:status', {
      type: 'transfer_status',
      data: transferJob,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Broadcasted transfer status change for job ${transferJob.id}: ${transferJob.status}`);
  }

  /**
   * Broadcast sync job progress update
   */
  public broadcastSyncProgress(syncJob: Partial<SyncJob>): void {
    const room = `sync:${syncJob.id}`;
    const userRoom = `user:${syncJob.userId}:jobs`;
    
    this.io.to(room).to(userRoom).emit('sync:progress', {
      type: 'sync_progress',
      data: syncJob,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Broadcasted sync progress for job ${syncJob.id}`);
  }

  /**
   * Broadcast sync job status change
   */
  public broadcastSyncStatus(syncJob: Partial<SyncJob>): void {
    const room = `sync:${syncJob.id}`;
    const userRoom = `user:${syncJob.userId}:jobs`;
    
    this.io.to(room).to(userRoom).emit('sync:status', {
      type: 'sync_status',
      data: syncJob,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Broadcasted sync status change for job ${syncJob.id}: ${syncJob.status}`);
  }

  /**
   * Broadcast general notification to user
   */
  public broadcastNotification(userId: string, notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    data?: any;
  }): void {
    const userRoom = `user:${userId}`;
    
    this.io.to(userRoom).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Sent notification to user ${userId}: ${notification.title}`);
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get user's connection status
   */
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get all connected users
   */
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Close WebSocket server
   */
  public close(): void {
    this.io.close();
    this.connectedUsers.clear();
    this.userRooms.clear();
    logger.info('WebSocket service closed');
  }
}

// Singleton instance
let webSocketServiceInstance: WebSocketService | null = null;

export const initializeWebSocketService = (httpServer: HTTPServer): WebSocketService => {
  if (!webSocketServiceInstance) {
    webSocketServiceInstance = new WebSocketService(httpServer);
  }
  return webSocketServiceInstance;
};

export const getWebSocketService = (): WebSocketService => {
  if (!webSocketServiceInstance) {
    throw new Error('WebSocket service not initialized. Call initializeWebSocketService first.');
  }
  return webSocketServiceInstance;
};