/**
 * 功能开关 - 控制功能的启用/禁用
 */
export const features = {
  // 认证相关
  auth: {
    enableSocialLogin: true,
    enableEmailVerification: false,
    enableTwoFactor: false,
  },

  // UI 功能
  ui: {
    enableAnimations: true,
    enableThemeSwitcher: true,
    enableLanguageSwitcher: true,
    enableCompactMode: true,
  },

  // 实验性功能
  experimental: {
    enableNewDashboard: false,
    enableAIAssistant: false,
  },

  // 开发工具
  dev: {
    enableDebugPanel: import.meta.env.DEV,
    enablePerformanceMonitor: import.meta.env.DEV,
  },
} as const

export type Features = typeof features
