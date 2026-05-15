/**
 * 应用常量 - 超时、限制、默认值等
 */
export const constants = {
  // API 配置
  api: {
    timeout: 30000, // 30 秒
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // 分页
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  // 文件上传
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocTypes: ['application/pdf', 'text/plain'],
  },

  // UI 限制
  ui: {
    maxProjectNameLength: 50,
    maxDescriptionLength: 500,
    toastDuration: 3000,
  },

  // 本地存储键
  storage: {
    authToken: 'auth-token',
    settings: 'settings-storage',
    theme: 'theme-preference',
  },
} as const

export type Constants = typeof constants
