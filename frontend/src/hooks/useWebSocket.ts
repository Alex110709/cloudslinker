import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectTokens } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/uiSlice';
import { transfersApi } from '../store/api/transfersApi';
import { syncApi } from '../store/api/syncApi';
import {
  WebSocketMessage,
  TransferProgressMessage,
  TransferCompleteMessage,
  TransferProgress
} from '../types';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  namespace?: string;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { autoConnect = true, namespace = '' } = options;
  const socketRef = useRef<Socket | null>(null);
  const dispatch = useAppDispatch();
  const tokens = useAppSelector(selectTokens);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const socketUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
    
    socketRef.current = io(`${socketUrl}${namespace}`, {
      auth: {
        token: tokens?.accessToken,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      isConnectedRef.current = true;
      
      dispatch(addNotification({
        type: 'success',
        title: '실시간 연결',
        message: '실시간 업데이트가 활성화되었습니다.',
        duration: 3000,
      }));
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      isConnectedRef.current = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, manual reconnection needed
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      
      dispatch(addNotification({
        type: 'error',
        title: '연결 오류',
        message: '실시간 연결에 실패했습니다.',
        duration: 5000,
      }));
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      
      dispatch(addNotification({
        type: 'success',
        title: '연결 복구',
        message: '실시간 연결이 복구되었습니다.',
        duration: 3000,
      }));
    });

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      
      dispatch(addNotification({
        type: 'error',
        title: '연결 실패',
        message: '실시간 연결을 복구할 수 없습니다.',
        duration: 0, // Persistent notification
      }));
    });

    // Transfer progress updates
    socket.on('transfer:progress', (data: TransferProgressMessage['payload']) => {
      // Update transfer progress in RTK Query cache
      dispatch(
        transfersApi.util.updateQueryData('getTransferProgress', data.jobId, () => data)
      );
      
      // Also update the transfer job status
      dispatch(
        transfersApi.util.updateQueryData('getTransferJob', data.jobId, (draft) => {
          if (draft) {
            draft.status = data.status as any;
            draft.progressPercentage = data.progressPercentage;
            draft.filesCompleted = data.filesCompleted;
            draft.filesFailed = data.filesFailed;
            draft.bytesTransferred = data.bytesTransferred;
            draft.updatedAt = data.updatedAt;
          }
        })
      );
    });

    // Transfer completion
    socket.on('transfer:complete', (data: TransferCompleteMessage['payload']) => {
      dispatch(
        transfersApi.util.updateQueryData('getTransferJob', data.jobId, (draft) => {
          if (draft) {
            draft.status = data.status as any;
            if (data.status === 'completed') {
              draft.progressPercentage = 100;
              draft.completedAt = new Date().toISOString();
            }
          }
        })
      );

      dispatch(addNotification({
        type: data.status === 'completed' ? 'success' : 'error',
        title: data.status === 'completed' ? '전송 완료' : '전송 실패',
        message: data.status === 'completed' 
          ? `전송 작업이 성공적으로 완료되었습니다.`
          : `전송 작업이 실패했습니다: ${data.error}`,
        duration: 5000,
      }));

      // Invalidate transfer lists to refresh
      dispatch(transfersApi.util.invalidateTags(['TransferJob']));
    });

    // Sync job updates
    socket.on('sync:started', (data: { jobId: string; startedAt: string }) => {
      dispatch(
        syncApi.util.updateQueryData('getSyncJob', data.jobId, (draft) => {
          if (draft) {
            draft.lastSync = data.startedAt;
          }
        })
      );

      dispatch(addNotification({
        type: 'info',
        title: '동기화 시작',
        message: '동기화 작업이 시작되었습니다.',
        duration: 3000,
      }));
    });

    socket.on('sync:complete', (data: { 
      jobId: string; 
      status: 'completed' | 'failed'; 
      completedAt: string;
      result?: any;
      error?: string;
    }) => {
      dispatch(
        syncApi.util.updateQueryData('getSyncJob', data.jobId, (draft) => {
          if (draft) {
            draft.lastSync = data.completedAt;
            // Calculate next sync based on cron schedule
            // This would need proper cron calculation logic
          }
        })
      );

      dispatch(addNotification({
        type: data.status === 'completed' ? 'success' : 'error',
        title: data.status === 'completed' ? '동기화 완료' : '동기화 실패',
        message: data.status === 'completed'
          ? '동기화 작업이 성공적으로 완료되었습니다.'
          : `동기화 작업이 실패했습니다: ${data.error}`,
        duration: 5000,
      }));

      // Invalidate sync lists to refresh
      dispatch(syncApi.util.invalidateTags(['SyncJob']));
    });

    // Generic notification handler
    socket.on('notification', (data: {
      type: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message?: string;
      duration?: number;
    }) => {
      dispatch(addNotification(data));
    });

  }, [tokens?.accessToken, namespace, dispatch]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, []);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      
      return () => {
        socketRef.current?.off(event, handler);
      };
    }
    return () => {};
  }, []);

  // Auto-connect when tokens are available
  useEffect(() => {
    if (autoConnect && tokens?.accessToken) {
      connect();
    } else if (!tokens?.accessToken) {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, tokens?.accessToken, connect, disconnect]);

  // Update auth token when it changes
  useEffect(() => {
    if (socketRef.current && tokens?.accessToken) {
      socketRef.current.auth = {
        token: tokens.accessToken,
      };
    }
  }, [tokens?.accessToken]);

  return {
    connect,
    disconnect,
    emit,
    subscribe,
    isConnected: isConnectedRef.current,
    socket: socketRef.current,
  };
};

export default useWebSocket;