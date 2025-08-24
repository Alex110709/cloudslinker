import { useEffect, useCallback, useRef, useState } from 'react';
import { webSocketClient, WebSocketEvent, WebSocketNotification } from '../services/webSocketClient';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/slices/authSlice';

/**
 * Hook for using WebSocket connection status
 */
export const useWebSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const connectAttempted = useRef(false);

  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsConnected(webSocketClient.isConnected());
    };

    // Initial status
    updateConnectionStatus();

    // Connect automatically when authenticated
    if (isAuthenticated && !connectAttempted.current && !webSocketClient.isConnected()) {
      connectAttempted.current = true;
      setIsConnecting(true);
      
      webSocketClient.connect()
        .then(() => {
          setIsConnected(true);
          setIsConnecting(false);
        })
        .catch((error) => {
          console.error('WebSocket connection failed:', error);
          setIsConnecting(false);
          connectAttempted.current = false; // Allow retry
        });
    }

    // Disconnect when not authenticated
    if (!isAuthenticated && webSocketClient.isConnected()) {
      webSocketClient.disconnect();
      setIsConnected(false);
      connectAttempted.current = false;
    }

    // Check connection status periodically
    const interval = setInterval(updateConnectionStatus, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const connect = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsConnecting(true);
    try {
      await webSocketClient.connect();
      setIsConnected(true);
    } catch (error) {
      console.error('Manual WebSocket connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [isAuthenticated]);

  const disconnect = useCallback(() => {
    webSocketClient.disconnect();
    setIsConnected(false);
    connectAttempted.current = false;
  }, []);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };
};

/**
 * Hook for subscribing to transfer updates
 */
export const useTransferUpdates = (transferId?: string) => {
  const [transferData, setTransferData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!transferId) return;

    const handleTransferProgress = (event: WebSocketEvent) => {
      if (event.data.id === transferId) {
        setTransferData(prev => ({ ...prev, ...event.data }));
        setLastUpdate(new Date());
      }
    };

    const handleTransferStatus = (event: WebSocketEvent) => {
      if (event.data.id === transferId) {
        setTransferData(prev => ({ ...prev, ...event.data }));
        setLastUpdate(new Date());
      }
    };

    // Subscribe to events
    webSocketClient.on('transfer:progress', handleTransferProgress);
    webSocketClient.on('transfer:status', handleTransferStatus);

    // Subscribe to transfer updates
    webSocketClient.subscribeToTransfer(transferId);

    return () => {
      // Unsubscribe from events
      webSocketClient.off('transfer:progress', handleTransferProgress);
      webSocketClient.off('transfer:status', handleTransferStatus);
      
      // Unsubscribe from transfer updates
      webSocketClient.unsubscribeFromTransfer(transferId);
    };
  }, [transferId]);

  const requestStatus = useCallback(() => {
    if (transferId) {
      webSocketClient.requestStatus('transfer', transferId);
    }
  }, [transferId]);

  return {
    transferData,
    lastUpdate,
    requestStatus,
  };
};

/**
 * Hook for subscribing to sync job updates
 */
export const useSyncUpdates = (syncId?: string) => {
  const [syncData, setSyncData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!syncId) return;

    const handleSyncProgress = (event: WebSocketEvent) => {
      if (event.data.id === syncId) {
        setSyncData(prev => ({ ...prev, ...event.data }));
        setLastUpdate(new Date());
      }
    };

    const handleSyncStatus = (event: WebSocketEvent) => {
      if (event.data.id === syncId) {
        setSyncData(prev => ({ ...prev, ...event.data }));
        setLastUpdate(new Date());
      }
    };

    // Subscribe to events
    webSocketClient.on('sync:progress', handleSyncProgress);
    webSocketClient.on('sync:status', handleSyncStatus);

    // Subscribe to sync updates
    webSocketClient.subscribeToSync(syncId);

    return () => {
      // Unsubscribe from events
      webSocketClient.off('sync:progress', handleSyncProgress);
      webSocketClient.off('sync:status', handleSyncStatus);
      
      // Unsubscribe from sync updates
      webSocketClient.unsubscribeFromSync(syncId);
    };
  }, [syncId]);

  const requestStatus = useCallback(() => {
    if (syncId) {
      webSocketClient.requestStatus('sync', syncId);
    }
  }, [syncId]);

  return {
    syncData,
    lastUpdate,
    requestStatus,
  };
};

/**
 * Hook for handling notifications
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);

  useEffect(() => {
    const handleNotification = (notification: WebSocketNotification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    };

    webSocketClient.on('notification', handleNotification);

    return () => {
      webSocketClient.off('notification', handleNotification);
    };
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    notifications,
    clearNotifications,
    removeNotification,
  };
};

/**
 * Hook for multiple transfer subscriptions
 */
export const useMultipleTransfers = (transferIds: string[]) => {
  const [transfersData, setTransfersData] = useState<Record<string, any>>({});
  const [lastUpdates, setLastUpdates] = useState<Record<string, Date>>({});

  useEffect(() => {
    const handleTransferProgress = (event: WebSocketEvent) => {
      if (transferIds.includes(event.data.id)) {
        setTransfersData(prev => ({
          ...prev,
          [event.data.id]: { ...prev[event.data.id], ...event.data }
        }));
        setLastUpdates(prev => ({
          ...prev,
          [event.data.id]: new Date()
        }));
      }
    };

    const handleTransferStatus = (event: WebSocketEvent) => {
      if (transferIds.includes(event.data.id)) {
        setTransfersData(prev => ({
          ...prev,
          [event.data.id]: { ...prev[event.data.id], ...event.data }
        }));
        setLastUpdates(prev => ({
          ...prev,
          [event.data.id]: new Date()
        }));
      }
    };

    // Subscribe to events
    webSocketClient.on('transfer:progress', handleTransferProgress);
    webSocketClient.on('transfer:status', handleTransferStatus);

    // Subscribe to all transfers
    transferIds.forEach(id => {
      webSocketClient.subscribeToTransfer(id);
    });

    return () => {
      // Unsubscribe from events
      webSocketClient.off('transfer:progress', handleTransferProgress);
      webSocketClient.off('transfer:status', handleTransferStatus);
      
      // Unsubscribe from all transfers
      transferIds.forEach(id => {
        webSocketClient.unsubscribeFromTransfer(id);
      });
    };
  }, [transferIds]);

  return {
    transfersData,
    lastUpdates,
  };
};

/**
 * Hook for real-time connection indicator
 */
export const useConnectionStatus = () => {
  const { isConnected, isConnecting } = useWebSocketConnection();
  
  const getStatusColor = () => {
    if (isConnecting) return 'orange';
    if (isConnected) return 'green';
    return 'red';
  };

  const getStatusText = () => {
    if (isConnecting) return '연결 중...';
    if (isConnected) return '실시간 연결됨';
    return '연결 끊김';
  };

  return {
    isConnected,
    isConnecting,
    statusColor: getStatusColor(),
    statusText: getStatusText(),
  };
};

/**
 * Hook for multiple sync job subscriptions
 */
export const useMultipleSyncs = (syncIds: string[]) => {
  const [syncsData, setSyncsData] = useState<Record<string, any>>({});
  const [lastUpdates, setLastUpdates] = useState<Record<string, Date>>({});

  useEffect(() => {
    const handleSyncProgress = (event: WebSocketEvent) => {
      if (syncIds.includes(event.data.id)) {
        setSyncsData(prev => ({
          ...prev,
          [event.data.id]: { ...prev[event.data.id], ...event.data }
        }));
        setLastUpdates(prev => ({
          ...prev,
          [event.data.id]: new Date()
        }));
      }
    };

    const handleSyncStatus = (event: WebSocketEvent) => {
      if (syncIds.includes(event.data.id)) {
        setSyncsData(prev => ({
          ...prev,
          [event.data.id]: { ...prev[event.data.id], ...event.data }
        }));
        setLastUpdates(prev => ({
          ...prev,
          [event.data.id]: new Date()
        }));
      }
    };

    // Subscribe to events
    webSocketClient.on('sync:progress', handleSyncProgress);
    webSocketClient.on('sync:status', handleSyncStatus);

    // Subscribe to all sync jobs
    syncIds.forEach(id => {
      webSocketClient.subscribeToSync(id);
    });

    return () => {
      // Unsubscribe from events
      webSocketClient.off('sync:progress', handleSyncProgress);
      webSocketClient.off('sync:status', handleSyncStatus);
      
      // Unsubscribe from all sync jobs
      syncIds.forEach(id => {
        webSocketClient.unsubscribeFromSync(id);
      });
    };
  }, [syncIds]);

  return {
    syncsData,
    lastUpdates,
  };
};
