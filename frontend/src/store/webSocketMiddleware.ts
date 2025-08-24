import { Middleware } from '@reduxjs/toolkit';
import { webSocketClient } from '../services/webSocketClient';
import { transfersApi } from './api/transfersApi';
import { syncApi } from './api/syncApi';
import type { RootState } from './store';

/**
 * WebSocket middleware to handle real-time updates
 * This middleware connects WebSocket events to Redux store updates
 */
export const webSocketMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);
  
  // Handle authentication state changes
  if (action.type === 'auth/loginSuccess') {
    // Connect to WebSocket after successful login
    setTimeout(() => {
      webSocketClient.connect().then(() => {
        // Subscribe to user's all jobs for general notifications
        webSocketClient.subscribeToUserJobs();
      }).catch((error) => {
        console.error('Failed to connect WebSocket after login:', error);
      });
    }, 1000); // Delay to ensure token is available
  } else if (action.type === 'auth/logout') {
    // Disconnect WebSocket on logout
    webSocketClient.disconnect();
  }

  return result;
};

/**
 * Setup WebSocket event listeners for Redux updates
 */
export const setupWebSocketListeners = (store: any) => {
  // Transfer progress updates
  webSocketClient.on('transfer:progress', (event) => {
    const { data } = event;
    
    // Update the transfer in RTK Query cache
    store.dispatch(
      transfersApi.util.updateQueryData('getTransfers', undefined, (draft) => {
        const transfer = draft.find((t: any) => t.id === data.id);
        if (transfer) {
          Object.assign(transfer, data);
        }
      })
    );

    // Also update individual transfer query if it exists
    store.dispatch(
      transfersApi.util.updateQueryData('getTransferById', data.id, (draft) => {
        if (draft) {
          Object.assign(draft, data);
        }
      })
    );
  });

  // Transfer status updates
  webSocketClient.on('transfer:status', (event) => {
    const { data } = event;
    
    // Update the transfer in RTK Query cache
    store.dispatch(
      transfersApi.util.updateQueryData('getTransfers', undefined, (draft) => {
        const transfer = draft.find((t: any) => t.id === data.id);
        if (transfer) {
          Object.assign(transfer, data);
        }
      })
    );

    // Also update individual transfer query
    store.dispatch(
      transfersApi.util.updateQueryData('getTransferById', data.id, (draft) => {
        if (draft) {
          Object.assign(draft, data);
        }
      })
    );

    // If transfer is completed or failed, invalidate queries to get fresh data
    if (data.status === 'completed' || data.status === 'failed') {
      store.dispatch(transfersApi.util.invalidateTags(['Transfer']));
    }
  });

  // Sync progress updates
  webSocketClient.on('sync:progress', (event) => {
    const { data } = event;
    
    // Update the sync job in RTK Query cache
    store.dispatch(
      syncApi.util.updateQueryData('getSyncJobs', undefined, (draft) => {
        const syncJob = draft.find((s: any) => s.id === data.id);
        if (syncJob) {
          Object.assign(syncJob, data);
        }
      })
    );

    // Also update individual sync job query if it exists
    store.dispatch(
      syncApi.util.updateQueryData('getSyncJobById', data.id, (draft) => {
        if (draft) {
          Object.assign(draft, data);
        }
      })
    );
  });

  // Sync status updates
  webSocketClient.on('sync:status', (event) => {
    const { data } = event;
    
    // Update the sync job in RTK Query cache
    store.dispatch(
      syncApi.util.updateQueryData('getSyncJobs', undefined, (draft) => {
        const syncJob = draft.find((s: any) => s.id === data.id);
        if (syncJob) {
          Object.assign(syncJob, data);
        }
      })
    );

    // Also update individual sync job query
    store.dispatch(
      syncApi.util.updateQueryData('getSyncJobById', data.id, (draft) => {
        if (draft) {
          Object.assign(draft, data);
        }
      })
    );

    // If sync is completed or failed, invalidate queries to get fresh data
    if (data.status === 'completed' || data.status === 'failed') {
      store.dispatch(syncApi.util.invalidateTags(['Sync']));
    }
  });

  // Notification handling is already done in webSocketClient
  // but we can also dispatch custom actions here if needed
  webSocketClient.on('notification', (notification) => {
    // Could dispatch a notification action to store in Redux if needed
    console.log('Received notification:', notification);
  });
};

/**
 * Auto-subscribe to transfer when viewing transfer details
 */
export const subscribeToTransfer = (transferId: string) => {
  webSocketClient.subscribeToTransfer(transferId);
};

/**
 * Auto-unsubscribe from transfer
 */
export const unsubscribeFromTransfer = (transferId: string) => {
  webSocketClient.unsubscribeFromTransfer(transferId);
};

/**
 * Auto-subscribe to sync when viewing sync details
 */
export const subscribeToSync = (syncId: string) => {
  webSocketClient.subscribeToSync(syncId);
};

/**
 * Auto-unsubscribe from sync
 */
export const unsubscribeFromSync = (syncId: string) => {
  webSocketClient.unsubscribeFromSync(syncId);
};

/**
 * Get WebSocket connection status
 */
export const getWebSocketStatus = () => {
  return {
    connected: webSocketClient.isConnected(),
  };
};