/**
 * 环境配置
 */

export const env = {
  // API 配置
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',

  // 应用配置
  appName: 'Cove',
  appVersion: '0.1.0',

  // 开发模式
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type Env = typeof env;
