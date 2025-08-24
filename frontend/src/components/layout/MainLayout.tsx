import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  CloudOutlined,
  SwapOutlined,
  SyncOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectSidebarCollapsed, selectUser, selectNotifications } from '../../store';
import { toggleSidebar, logout } from '../../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { ConnectionIndicator } from '../ConnectionIndicator';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useI18n } from '../../hooks/useI18n';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const user = useAppSelector(selectUser);
  const notifications = useAppSelector(selectNotifications);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Menu items for sidebar
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
    },
    {
      key: '/clouds',
      icon: <CloudOutlined />,
      label: t('navigation.cloudManagement'),
    },
    {
      key: '/transfers',
      icon: <SwapOutlined />,
      label: t('navigation.fileTransfer'),
    },
    {
      key: '/sync',
      icon: <SyncOutlined />,
      label: t('navigation.synchronization'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('navigation.settings'),
    },
  ];

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: t('common.profile'),
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('common.accountSettings'),
      onClick: () => navigate('/account'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      onClick: () => {
        dispatch(logout());
        navigate('/login');
      },
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const toggleSidebarCollapse = () => {
    dispatch(toggleSidebar());
  };

  return (
    <Layout className="min-h-screen">
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        className="shadow-lg"
        theme="light"
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          {collapsed ? (
            <CloudOutlined className="text-2xl text-primary-500" />
          ) : (
            <div className="flex items-center space-x-2">
              <CloudOutlined className="text-2xl text-primary-500" />
              <Text strong className="text-lg">
                CloudsLinker
              </Text>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-r-0 h-full pt-4"
        />
      </Sider>

      <Layout>
        {/* Header */}
        <Header className="bg-white shadow-sm px-4 flex items-center justify-between">
          {/* Left side - Collapse button */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleSidebarCollapse}
            className="text-lg"
          />

          {/* Right side - Language switcher, real-time status, notifications, and user menu */}
          <div className="flex items-center space-x-4">
            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Real-time connection status */}
            <ConnectionIndicator 
              size="small" 
              placement="header" 
              showText={!collapsed}
            />

            {/* Notifications */}
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="text-lg"
                onClick={() => navigate('/notifications')}
              />
            </Badge>

            {/* User dropdown */}
            <Dropdown
              menu={{
                items: userMenuItems,
              }}
              placement="bottomRight"
              arrow
            >
              <div className="flex items-center space-x-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-50">
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  src={user?.avatar}
                />
                {!collapsed && (
                  <div className="hidden sm:block">
                    <Text className="text-sm font-medium">
                      {user?.firstName || user?.email}
                    </Text>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Main Content */}
        <Content className="bg-gray-50 min-h-0">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;