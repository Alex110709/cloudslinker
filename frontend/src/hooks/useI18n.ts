import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

/**
 * Custom hook for internationalization
 * Provides easy access to translation functions and utilities
 */
export const useI18n = () => {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;
  const isKorean = currentLanguage === 'ko';
  const isEnglish = currentLanguage === 'en';

  // Memoized translation functions for common sections
  const translations = useMemo(() => ({
    common: (key: string, options?: any) => t(`common.${key}`, options),
    navigation: (key: string, options?: any) => t(`navigation.${key}`, options),
    auth: (key: string, options?: any) => t(`auth.${key}`, options),
    dashboard: (key: string, options?: any) => t(`dashboard.${key}`, options),
    clouds: (key: string, options?: any) => t(`clouds.${key}`, options),
    transfers: (key: string, options?: any) => t(`transfers.${key}`, options),
    sync: (key: string, options?: any) => t(`sync.${key}`, options),
    profile: (key: string, options?: any) => t(`profile.${key}`, options),
    settings: (key: string, options?: any) => t(`settings.${key}`, options),
    errors: (key: string, options?: any) => t(`errors.${key}`, options),
    messages: (key: string, options?: any) => t(`messages.${key}`, options),
    time: (key: string, options?: any) => t(`time.${key}`, options),
    units: (key: string, options?: any) => t(`units.${key}`, options),
  }), [t]);

  // Language change function
  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  };

  // Get available languages
  const availableLanguages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  // Format relative time based on current language
  const formatRelativeTime = (date: string | Date) => {
    const now = new Date();
    const target = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - target.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return translations.time('now');
    } else if (diffInMinutes < 60) {
      return translations.time('minutesAgo', { count: diffInMinutes });
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return translations.time('hoursAgo', { count: hours });
    } else if (diffInMinutes < 10080) { // 7 days
      const days = Math.floor(diffInMinutes / 1440);
      return translations.time('daysAgo', { count: days });
    } else if (diffInMinutes < 43200) { // 30 days
      const weeks = Math.floor(diffInMinutes / 10080);
      return translations.time('weeksAgo', { count: weeks });
    } else if (diffInMinutes < 525600) { // 365 days
      const months = Math.floor(diffInMinutes / 43200);
      return translations.time('monthsAgo', { count: months });
    } else {
      const years = Math.floor(diffInMinutes / 525600);
      return translations.time('yearsAgo', { count: years });
    }
  };

  // Format file size with proper units
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${translations.units('bytes')}`;
    
    const k = 1024;
    const sizes = ['bytes', 'kb', 'mb', 'gb', 'tb'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1);
    
    return `${size} ${translations.units(sizes[i])}`;
  };

  // Format transfer speed
  const formatTransferSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond === 0) return `0 ${translations.units('bytesPerSecond')}`;
    
    const k = 1024;
    const speeds = ['bytesPerSecond', 'kbPerSecond', 'mbPerSecond', 'gbPerSecond'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    const speed = (bytesPerSecond / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1);
    
    return `${speed} ${translations.units(speeds[i])}`;
  };

  // Format duration in seconds to human readable format
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}초`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}분 ${remainingSeconds}초` : `${minutes}분`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
    }
  };

  return {
    // Core translation function
    t,
    
    // Namespaced translation functions
    ...translations,
    
    // Language info
    currentLanguage,
    isKorean,
    isEnglish,
    availableLanguages,
    
    // Language utilities
    changeLanguage,
    
    // Formatting utilities
    formatRelativeTime,
    formatFileSize,
    formatTransferSpeed,
    formatDuration,
    
    // i18n instance for advanced usage
    i18n,
  };
};

export default useI18n;