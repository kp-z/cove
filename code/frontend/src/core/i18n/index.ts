import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import common from './locales/en/common.json';
import agent from './locales/en/agent.json';
import channel from './locales/en/channel.json';
import layout from './locales/en/layout.json';
import dashboard from './locales/en/dashboard.json';

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'agent', 'channel', 'layout', 'dashboard'],
  resources: {
    en: { common, agent, channel, layout, dashboard },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
