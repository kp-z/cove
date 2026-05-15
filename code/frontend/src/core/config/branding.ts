/**
 * 品牌配置 - 在所有语言环境下保持英文
 */
export const branding = {
  // 应用信息
  app: {
    name: 'Cove',
    slogan: 'AI Works, You Chill',
    tagline: 'AI Agent Collaboration Platform',
    description: 'Empower your team with intelligent AI agents',
  },

  // Logo 资源
  logo: {
    svg: '/cove-logo.svg',
    png: '/cove-logo.png',
    favicon: '/favicon.svg',
    alt: 'Cove Logo',
  },

  // 社交链接
  social: {
    github: 'https://github.com/your-org/cove',
    twitter: 'https://twitter.com/cove',
    discord: 'https://discord.gg/cove',
  },

  // 元数据
  meta: {
    version: '0.1.0',
    copyright: `© ${new Date().getFullYear()} Cove. All rights reserved.`,
  },
} as const

export type Branding = typeof branding
