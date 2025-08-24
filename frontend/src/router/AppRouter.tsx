import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../components/pages/Dashboard';
import CloudProviderList from '../components/pages/CloudProviderList';
import ConnectCloudProvider from '../components/pages/ConnectCloudProvider';
import TransferList from '../components/pages/TransferList';
import CreateTransfer from '../components/pages/CreateTransfer';
import TransferDetails from '../components/pages/TransferDetails';
import SyncList from '../components/pages/SyncList';
import CreateSync from '../components/pages/CreateSync';
import SyncDetails from '../components/pages/SyncDetails';
import Login from '../components/pages/Login';
import Register from '../components/pages/Register';
import ForgotPassword from '../components/pages/ForgotPassword';
import Profile from '../components/pages/Profile';
import EmptyPage from '../components/common/EmptyPage';
import { LoadingSpinner } from '../components/common';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (for login, register, etc.)
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Navigate to="/dashboard" replace />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clouds"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CloudProviderList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clouds/connect"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ConnectCloudProvider />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TransferList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CreateTransfer />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers/:transferId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TransferDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SyncList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CreateSync />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync/:syncId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SyncDetails />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="설정" 
                  subtitle="설정 페이지가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Profile />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="계정 설정" 
                  subtitle="계정 설정 페이지가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="알림" 
                  subtitle="알림 센터가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="활동 기록" 
                  subtitle="활동 기록 페이지가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        {/* 404 Page */}
        <Route
          path="*"
          element={
            <EmptyPage 
              title="페이지를 찾을 수 없습니다" 
              subtitle="요청하신 페이지가 존재하지 않습니다."
              showBackButton={true}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;", "original_text": ""}]