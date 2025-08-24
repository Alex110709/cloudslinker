import React, { useEffect } from 'react';
import { useAppDispatch } from './store/hooks';
import { loginSuccess } from './store/slices/authSlice';
import AppRouter from './router/AppRouter';

function App() {
  const dispatch = useAppDispatch();

  // For demo purposes, auto-login a demo user
  // In a real app, this would check for stored tokens and validate them
  useEffect(() => {
    const demoUser = {
      id: 'demo-user-1',
      email: 'demo@cloudslinker.com',
      firstName: '데모',
      lastName: '사용자',
      subscriptionTier: 'pro' as const,
      isActive: true,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const demoTokens = {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      expiresIn: 3600,
    };

    // Auto-login for demo
    dispatch(loginSuccess({ user: demoUser, tokens: demoTokens }));
  }, [dispatch]);

  return <AppRouter />;
}

export default App;
