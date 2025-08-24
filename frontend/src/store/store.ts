import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { cloudProvidersApi } from './api/cloudProvidersApi';
import { transfersApi } from './api/transfersApi';
import { syncApi } from './api/syncApi';
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import { webSocketMiddleware, setupWebSocketListeners } from './webSocketMiddleware';

export const store = configureStore({
  reducer: {
    // Slice reducers
    auth: authSlice,
    ui: uiSlice,
    
    // RTK Query API reducers
    [authApi.reducerPath]: authApi.reducer,
    [cloudProvidersApi.reducerPath]: cloudProvidersApi.reducer,
    [transfersApi.reducerPath]: transfersApi.reducer,
    [syncApi.reducerPath]: syncApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore these action types
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }).concat(
      authApi.middleware,
      cloudProvidersApi.middleware,
      transfersApi.middleware,
      syncApi.middleware,
      webSocketMiddleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Setup WebSocket listeners for real-time updates
setupWebSocketListeners(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;