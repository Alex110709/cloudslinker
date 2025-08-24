import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import MainLayout from '../components/layout/MainLayout';
import Dashboard from '../components/pages/Dashboard';
import CloudProviderList from '../components/pages/CloudProviderList';
import ConnectCloudProvider from '../components/pages/ConnectCloudProvider';
import EmptyPage from '../components/common/EmptyPage';
import { LoadingSpinner } from '../components/common';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  if (!isAuthenticated) {
    // For now, we'll just show a loading state
    // In a real app, this would redirect to login
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="인증 확인 중..." />
      </div>
    );
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
              <EmptyPage 
                title="로그인 페이지" 
                subtitle="로그인 인터페이스가 곧 구현될 예정입니다." 
                showBackButton={false}
              />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <EmptyPage 
                title="회원가입 페이지" 
                subtitle="회원가입 인터페이스가 곧 구현될 예정입니다." 
                showBackButton={false}
              />
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
                <EmptyPage 
                  title="파일 전송 관리" 
                  subtitle="파일 전송 관리 인터페이스가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfers/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="새 전송 만들기" 
                  subtitle="전송 작업 생성 인터페이스가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="동기화 관리" 
                  subtitle="동기화 작업 관리 인터페이스가 곧 구현될 예정입니다.\"
                />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sync/new"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EmptyPage 
                  title="새 동기화 설정" 
                  subtitle="동기화 설정 인터페이스가 곧 구현될 예정입니다.\"
                />
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
                <EmptyPage 
                  title="프로필" 
                  subtitle="사용자 프로필 페이지가 곧 구현될 예정입니다.\"
                />
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