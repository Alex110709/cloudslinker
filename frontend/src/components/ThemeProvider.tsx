import React from 'react';
import { ConfigProvider, theme } from 'antd';
import { useAppSelector } from '../store/hooks';
import { selectTheme } from '../store/slices/uiSlice';
import koKR from 'antd/locale/ko_KR';
import enUS from 'antd/locale/en_US';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const currentTheme = useAppSelector(selectTheme);
  
  // Get locale from localStorage or default to Korean
  const locale = localStorage.getItem('locale') || 'ko';
  const antdLocale = locale === 'en' ? enUS : koKR;

  const antdTheme = {
    algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      // Color tokens
      colorPrimary: '#1890ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1890ff',
      
      // Background tokens
      colorBgContainer: currentTheme === 'dark' ? '#141414' : '#ffffff',
      colorBgElevated: currentTheme === 'dark' ? '#1f1f1f' : '#ffffff',
      colorBgLayout: currentTheme === 'dark' ? '#000000' : '#f5f5f5',
      colorBgSpotlight: currentTheme === 'dark' ? '#262626' : '#ffffff',
      
      // Text tokens
      colorText: currentTheme === 'dark' ? '#ffffff' : '#262626',
      colorTextSecondary: currentTheme === 'dark' ? '#bfbfbf' : '#595959',
      colorTextTertiary: currentTheme === 'dark' ? '#8c8c8c' : '#8c8c8c',
      colorTextQuaternary: currentTheme === 'dark' ? '#595959' : '#bfbfbf',
      
      // Border tokens
      colorBorder: currentTheme === 'dark' ? '#434343' : '#d9d9d9',
      colorBorderSecondary: currentTheme === 'dark' ? '#303030' : '#f0f0f0',
      
      // Font tokens
      fontFamily: \"'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, 'Noto Sans', sans-serif\",
      fontSize: 14,
      fontSizeHeading1: 38,
      fontSizeHeading2: 30,
      fontSizeHeading3: 24,
      fontSizeHeading4: 20,
      fontSizeHeading5: 16,
      fontSizeLG: 16,
      fontSizeSM: 12,
      fontSizeXL: 20,
      
      // Size tokens
      sizeStep: 4,
      sizeUnit: 4,
      
      // Border radius tokens
      borderRadius: 6,
      borderRadiusLG: 8,
      borderRadiusSM: 4,
      borderRadiusXS: 2,
      
      // Motion tokens
      motionDurationFast: '0.1s',
      motionDurationMid: '0.2s',
      motionDurationSlow: '0.3s',
      
      // Layout tokens
      wireframe: false,
      
      // Z-index tokens
      zIndexBase: 0,
      zIndexPopupBase: 1000,
    },
    components: {
      Layout: {
        headerBg: currentTheme === 'dark' ? '#001529' : '#ffffff',
        headerColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        siderBg: currentTheme === 'dark' ? '#001529' : '#ffffff',
        bodyBg: currentTheme === 'dark' ? '#000000' : '#f5f5f5',
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: currentTheme === 'dark' ? '#1890ff' : '#e6f7ff',
        itemSelectedColor: currentTheme === 'dark' ? '#ffffff' : '#1890ff',
        itemHoverBg: currentTheme === 'dark' ? '#262626' : '#f5f5f5',
        itemHoverColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        itemActiveBg: currentTheme === 'dark' ? '#096dd9' : '#bae7ff',
        darkItemBg: '#001529',
        darkItemSelectedBg: '#1890ff',
        darkItemHoverBg: '#262626',
      },
      Button: {
        borderRadius: 6,
        controlHeight: 32,
        fontSize: 14,
        primaryColor: '#ffffff',
        colorPrimaryHover: '#40a9ff',
        colorPrimaryActive: '#096dd9',
        ghostBg: 'transparent',
      },
      Card: {
        borderRadius: 8,
        headerBg: 'transparent',
        actionsBg: currentTheme === 'dark' ? '#141414' : '#fafafa',
      },
      Table: {
        headerBg: currentTheme === 'dark' ? '#1f1f1f' : '#fafafa',
        headerColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        rowHoverBg: currentTheme === 'dark' ? '#262626' : '#f5f5f5',
        borderColor: currentTheme === 'dark' ? '#434343' : '#f0f0f0',
      },
      Input: {
        borderRadius: 6,
        controlHeight: 32,
        fontSize: 14,
        activeBorderColor: '#1890ff',
        hoverBorderColor: '#40a9ff',
      },
      Select: {
        borderRadius: 6,
        controlHeight: 32,
        fontSize: 14,
        optionSelectedBg: currentTheme === 'dark' ? '#1890ff' : '#e6f7ff',
        optionActiveBg: currentTheme === 'dark' ? '#262626' : '#f5f5f5',
      },
      Modal: {
        borderRadius: 8,
        headerBg: 'transparent',
        contentBg: currentTheme === 'dark' ? '#141414' : '#ffffff',
        footerBg: 'transparent',
      },
      Drawer: {
        borderRadius: 0,
        headerBg: 'transparent',
        bodyBg: currentTheme === 'dark' ? '#141414' : '#ffffff',
        footerBg: 'transparent',
      },
      Notification: {
        borderRadius: 8,
        fontSize: 14,
      },
      Message: {
        borderRadius: 6,
        fontSize: 14,
      },
      Progress: {
        circleTextColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        remainingColor: currentTheme === 'dark' ? '#434343' : '#f5f5f5',
      },
      Tabs: {
        itemColor: currentTheme === 'dark' ? '#bfbfbf' : '#595959',
        itemHoverColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        itemSelectedColor: '#1890ff',
        itemActiveColor: '#1890ff',
        inkBarColor: '#1890ff',
        cardBg: currentTheme === 'dark' ? '#141414' : '#ffffff',
        cardHeight: 40,
      },
      Typography: {
        titleMarginTop: 16,
        titleMarginBottom: 8,
      },
      Upload: {
        borderRadius: 6,
        actionsColor: currentTheme === 'dark' ? '#bfbfbf' : '#595959',
      },
      Spin: {
        colorPrimary: '#1890ff',
        contentHeight: 400,
      },
      Steps: {
        navArrowColor: currentTheme === 'dark' ? '#434343' : '#bfbfbf',
        iconSize: 32,
        titleLineHeight: 32,
      },
      Form: {
        labelColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        labelRequiredMarkColor: '#ff4d4f',
        itemMarginBottom: 24,
      },
      Divider: {
        colorSplit: currentTheme === 'dark' ? '#434343' : '#f0f0f0',
        orientationMargin: 0.05,
      },
      Tooltip: {
        borderRadius: 6,
        fontSize: 12,
        colorBgSpotlight: currentTheme === 'dark' ? '#434343' : '#262626',
        colorTextLightSolid: '#ffffff',
      },
      Popover: {
        borderRadius: 8,
        fontSize: 14,
        titleMinWidth: 176,
        minWidth: 176,
      },
      Badge: {
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 400,
        indicatorHeight: 16,
        indicatorHeightSM: 6,
        dotSize: 6,
      },
      Alert: {
        borderRadius: 6,
        fontSize: 14,
        withDescriptionIconSize: 24,
        withDescriptionPadding: '15px 15px 15px 64px',
      },
      Breadcrumb: {
        fontSize: 14,
        iconFontSize: 12,
        linkColor: currentTheme === 'dark' ? '#bfbfbf' : '#595959',
        linkHoverColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        itemColor: currentTheme === 'dark' ? '#8c8c8c' : '#8c8c8c',
        lastItemColor: currentTheme === 'dark' ? '#ffffff' : '#262626',
        separatorColor: currentTheme === 'dark' ? '#8c8c8c' : '#8c8c8c',
        separatorMargin: 8,
      },
    },
  };

  return (
    <ConfigProvider
      theme={antdTheme}
      locale={antdLocale}
      componentSize=\"middle\"
      direction=\"ltr\"
      // Enable virtual scrolling for better performance
      virtual
      // Configure wave effect
      wave={{
        disabled: false,
        showEffect: (node, info) => {
          // Custom wave effect logic if needed
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default ThemeProvider;", "original_text": ""}]