/**
 * 鍝佺墝閰嶇疆 - 鍦ㄦ墍鏈夎瑷€鐜涓嬩繚鎸佽嫳鏂?
 */
export const branding = {
  // 搴旂敤淇℃伅
  app: {
    name: 'Cove',
    slogan: 'yz',
    tagline: 'AI Agent Collaboration Platform',
    description: 'Empower your team with intelligent AI agents',
  },

  // Logo 璧勬簮
  logo: {
    svg: '/cove-logo.svg',
    png: '/cove-logo.png',
    favicon: '/favicon.svg',
    alt: 'Cove Logo',
  },

  // 绀句氦閾炬帴
  social: {
    github: 'https://github.com/your-org/cove',
    twitter: 'https://twitter.com/cove',
    discord: 'https://discord.gg/cove',
  },

  // 鍏冩暟鎹?
  meta: {
    version: '0.1.0',
    copyright: `漏 ${new Date().getFullYear()} Cove. All rights reserved.`,
  },
} as const

export type Branding = typeof branding
