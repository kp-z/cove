import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English
import commonEn from './locales/en/common.json';
import settingsEn from './locales/en/settings.json';
import agentEn from './locales/en/agent.json';
import channelEn from './locales/en/channel.json';
import layoutEn from './locales/en/layout.json';
import dashboardEn from './locales/en/dashboard.json';

// Chinese
import commonZh from './locales/zh/common.json';
import settingsZh from './locales/zh/settings.json';

// 从 localStorage 读取初始语言
const getInitialLanguage = (): string => {
  const stored = localStorage.getItem('settings-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.state?.language || 'en';
    } catch {
      return 'en';
    }
  }
  return navigator.language.startsWith('zh') ? 'zh' : 'en';
};

i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'settings', 'agent', 'channel', 'layout', 'dashboard'],
  resources: {
    en: {
      common: commonEn,
      settings: settingsEn,
      agent: agentEn,
      channel: channelEn,
      layout: layoutEn,
      dashboard: dashboardEn,
    },
    zh: {
      common: commonZh,
      settings: settingsZh,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
