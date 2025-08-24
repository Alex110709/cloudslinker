import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import koKR from 'antd/locale/ko_KR';

import { authSlice } from '../store/slices/authSlice';
import { uiSlice } from '../store/slices/uiSlice';
import { api } from '../store/api';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: EnhancedStore;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        ui: uiSlice.reducer,
        api: api.reducer,
      },
      preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
          },
        }).concat(api.middleware),
    }),
    initialEntries = ['/'],
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & { store: EnhancedStore } {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <ConfigProvider locale={koKR}>
            {children}
          </ConfigProvider>
        </BrowserRouter>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store };
}

// Mock user data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock authentication state
export const mockAuthState = {
  user: mockUser,
  token: 'mock-jwt-token',
  isAuthenticated: true,
  isLoading: false,
  error: null,
};

// Mock cloud providers
export const mockCloudProviders = [
  {
    id: 'provider-1',
    name: 'Test PikPak',
    type: 'pikpak',
    isConnected: true,
    config: {},
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'provider-2',
    name: 'Test WebDAV',
    type: 'webdav',
    isConnected: false,
    config: {},
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// Mock transfer data
export const mockTransfer = {
  id: 'transfer-1',
  sourceCloudId: 'provider-1',
  destinationCloudId: 'provider-2',
  sourcePath: '/test/source',
  destinationPath: '/test/destination',
  status: 'pending',
  progress: 0,
  totalSize: 1000000,
  transferredSize: 0,
  speed: 0,
  remainingTime: null,
  startedAt: null,
  completedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock sync job data
export const mockSyncJob = {
  id: 'sync-1',
  name: 'Test Sync',
  sourceCloudId: 'provider-1',
  destinationCloudId: 'provider-2',
  sourcePath: '/sync/source',
  destinationPath: '/sync/destination',
  syncDirection: 'bidirectional',
  status: 'active',
  lastRunAt: '2024-01-01T00:00:00Z',
  nextRunAt: '2024-01-02T00:00:00Z',
  isEnabled: true,
  schedule: {
    type: 'interval',
    intervalMinutes: 60,
  },
  options: {
    conflictResolution: 'newest',
    deleteOrphaned: false,
    preserveTimestamps: true,
    skipHidden: true,
  },
  createdAt: '2024-01-01T00:00:00Z',
};

// Helper function to create mock API responses
export const createMockApiResponse = <T>(data: T, status = 200) => {
  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
  });
};

// Helper function to create mock API error
export const createMockApiError = (message: string, status = 400) => {
  const error = new Error(message) as any;
  error.response = {
    data: { message },
    status,
    statusText: 'Bad Request',
    headers: {},
    config: {},
  };
  return Promise.reject(error);
};

// Custom matchers for common assertions
export const customMatchers = {
  toBeInTheDocument: (received: any) => {
    const pass = received !== null;
    return {
      message: () => `Expected element ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  },
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';