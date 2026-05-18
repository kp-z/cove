/**
 * Get API URL based on environment
 * - Uses VITE_API_URL if set
 * - In development: uses localhost:3001
 * - In production: auto-detects from window.location
 */
const getApiUrl = (): string => {
  // Environment variable takes precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Development: use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }

  // Production: auto-detect from current host
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return `${protocol}//${host}:3001`;
};

/**
 * Get WebSocket URL based on environment
 * - Uses VITE_WS_URL if set
 * - In development: uses ws://localhost:3001
 * - In production: auto-detects from window.location (ws:// or wss://)
 */
const getWsUrl = (): string => {
  // Environment variable takes precedence
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // Development: use ws://localhost
  if (import.meta.env.DEV) {
    return 'ws://localhost:3001';
  }

  // Production: auto-detect protocol and host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  return `${protocol}//${host}:3001`;
};

export const env = {
  apiUrl: getApiUrl(),
  wsUrl: getWsUrl(),

  appName: 'Cove',
  appVersion: '0.1.0',

  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

export type Env = typeof env;
