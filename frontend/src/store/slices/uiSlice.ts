import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, Notification } from '../types';

const initialState: UIState = {
  sidebarCollapsed: false,
  theme: 'light',
  notifications: [],
  loading: {},
  modals: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      
      // Persist theme preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', action.payload);
      }
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
    clearLoading: (state, action: PayloadAction<string>) => {
      delete state.loading[action.payload];
    },
    setModal: (state, action: PayloadAction<{ key: string; open: boolean }>) => {
      state.modals[action.payload.key] = action.payload.open;
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key] = false;
      });
    },
    initializeUI: (state) => {
      // Load theme preference from localStorage
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          state.theme = savedTheme;
        } else {
          // Check system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          state.theme = prefersDark ? 'dark' : 'light';
        }

        // Load sidebar preference
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed');
        if (sidebarCollapsed !== null) {
          state.sidebarCollapsed = sidebarCollapsed === 'true';
        }
      }
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
  clearLoading,
  setModal,
  closeModal,
  closeAllModals,
  initializeUI,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectLoading = (state: { ui: UIState }) => (key: string) => state.ui.loading[key] || false;
export const selectModal = (state: { ui: UIState }) => (key: string) => state.ui.modals[key] || false;

// Helper action creators for notifications
export const showSuccessNotification = (title: string, message?: string) =>
  addNotification({ type: 'success', title, message });

export const showErrorNotification = (title: string, message?: string) =>
  addNotification({ type: 'error', title, message });

export const showWarningNotification = (title: string, message?: string) =>
  addNotification({ type: 'warning', title, message });

export const showInfoNotification = (title: string, message?: string) =>
  addNotification({ type: 'info', title, message });