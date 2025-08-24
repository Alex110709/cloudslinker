import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { initializeAuth } from './slices/authSlice';
import { initializeUI } from './slices/uiSlice';

interface ReduxProviderProps {
  children: React.ReactNode;
}

export const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize auth and UI state from localStorage
    store.dispatch(initializeAuth());
    store.dispatch(initializeUI());
  }, []);

  return <Provider store={store}>{children}</Provider>;
};

export default ReduxProvider;