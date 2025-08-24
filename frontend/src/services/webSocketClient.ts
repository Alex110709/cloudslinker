import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { message, notification } from 'antd';
import { TransferJob, SyncJob } from '../types';

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private subscriptions: Set<string> = new Set();

  constructor() {
    this.setupEventHandlers();
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;
      const state = store.getState();
      const token = state.auth.tokens?.accessToken;

      if (!token) {
        this.isConnecting = false;
        reject(new Error('No authentication token available'));
        return;
      }

      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      this.socket = io(serverUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Restore subscriptions
        this.restoreSubscriptions();
        
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection failed:', error);
        this.isConnecting = false;
        this.handleReconnect();
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('WebSocket disconnected:', reason);
        
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connected', (data) => {
        console.log('WebSocket connection confirmed:', data);
        message.success('실시간 모니터링에 연결되었습니다.');
      });

      // Setup event listeners
      this.setupSocketEventListeners();
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.subscriptions.clear();
    this.isConnecting = false;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to transfer job updates
   */
  public subscribeToTransfer(transferId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, queuing subscription');
      this.subscriptions.add(`transfer:${transferId}`);
      return;
    }

    this.socket.emit('subscribe:transfer', transferId);
    this.subscriptions.add(`transfer:${transferId}`);
  }

  /**
   * Unsubscribe from transfer job updates
   */
  public unsubscribeFromTransfer(transferId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:transfer', transferId);
    }
    this.subscriptions.delete(`transfer:${transferId}`);
  }

  /**
   * Subscribe to sync job updates
   */
  public subscribeToSync(syncId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, queuing subscription');
      this.subscriptions.add(`sync:${syncId}`);
      return;
    }

    this.socket.emit('subscribe:sync', syncId);
    this.subscriptions.add(`sync:${syncId}`);
  }

  /**
   * Unsubscribe from sync job updates
   */
  public unsubscribeFromSync(syncId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:sync', syncId);
    }
    this.subscriptions.delete(`sync:${syncId}`);
  }

  /**
   * Subscribe to all user jobs
   */
  public subscribeToUserJobs(): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, queuing subscription');
      this.subscriptions.add('user:all');
      return;
    }

    this.socket.emit('subscribe:user:all');
    this.subscriptions.add('user:all');
  }

  /**
   * Add event listener
   */
  public on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Request current status
   */
  public requestStatus(type: 'transfer' | 'sync', id: string): void {
    if (this.socket?.connected) {
      this.socket.emit('request:status', { type, id });
    }
  }

  private setupEventHandlers(): void {
    // Default event handlers for updating Redux store
    this.on('transfer:progress', (event: WebSocketEvent) => {
      // Dispatch to Redux store to update transfer job
      console.log('Transfer progress update:', event.data);
      // You can dispatch to RTK Query cache update here
    });

    this.on('transfer:status', (event: WebSocketEvent) => {
      console.log('Transfer status update:', event.data);
      // Dispatch to Redux store
    });

    this.on('sync:progress', (event: WebSocketEvent) => {
      console.log('Sync progress update:', event.data);
      // Dispatch to Redux store
    });

    this.on('sync:status', (event: WebSocketEvent) => {
      console.log('Sync status update:', event.data);
      // Dispatch to Redux store
    });
  }

  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Transfer events
    this.socket.on('transfer:progress', (event: WebSocketEvent) => {
      this.emitToHandlers('transfer:progress', event);
    });

    this.socket.on('transfer:status', (event: WebSocketEvent) => {
      this.emitToHandlers('transfer:status', event);
    });

    // Sync events
    this.socket.on('sync:progress', (event: WebSocketEvent) => {
      this.emitToHandlers('sync:progress', event);
    });

    this.socket.on('sync:status', (event: WebSocketEvent) => {
      this.emitToHandlers('sync:status', event);
    });

    // Notification events
    this.socket.on('notification', (notification: WebSocketNotification) => {
      this.handleNotification(notification);
    });

    // Subscription confirmations
    this.socket.on('subscribed', (data) => {
      console.log('Subscribed to:', data);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('Unsubscribed from:', data);
    });

    // Status responses
    this.socket.on('status:response', (data) => {
      this.emitToHandlers('status:response', data);
    });
  }

  private emitToHandlers(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  private handleNotification(notif: WebSocketNotification): void {
    const { type, title, message: msg } = notif;
    
    notification[type]({
      message: title,
      description: msg,
      placement: 'topRight',
      duration: type === 'error' ? 0 : 4.5,
    });

    // Emit to custom handlers
    this.emitToHandlers('notification', notif);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      message.error('실시간 연결이 끊어졌습니다. 페이지를 새로고침해주세요.');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private restoreSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      if (subscription.startsWith('transfer:')) {
        const transferId = subscription.replace('transfer:', '');
        this.socket?.emit('subscribe:transfer', transferId);
      } else if (subscription.startsWith('sync:')) {
        const syncId = subscription.replace('sync:', '');
        this.socket?.emit('subscribe:sync', syncId);
      } else if (subscription === 'user:all') {
        this.socket?.emit('subscribe:user:all');
      }
    }
    
    if (this.subscriptions.size > 0) {
      console.log('Restored subscriptions:', Array.from(this.subscriptions));
    }
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();

// Hook for React components
export const useWebSocket = () => {
  return webSocketClient;
};