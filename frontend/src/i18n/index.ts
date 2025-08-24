import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
import en from './locales/en.json';
import ko from './locales/ko.json';

const resources = {
  en: {
    translation: en,
  },
  ko: {
    translation: ko,
  },
};

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next
  .use(initReactI18next)
  // init i18next
  .init({
    resources,
    
    // fallback language
    fallbackLng: 'ko',
    
    // default language
    lng: 'ko',
    
    // detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    interpolation: {
      escapeValue: false, // react already does escaping
    },
    
    // namespace
    defaultNS: 'translation',
    
    // debug mode
    debug: process.env.NODE_ENV === 'development',
    
    // react options
    react: {
      useSuspense: false,
    },
    
    // backend options
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

export default i18n;