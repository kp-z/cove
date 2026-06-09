/**
 * 前端统一日志工具
 *
 * 设计目标：
 * 1. 开发环境（import.meta.env.DEV）才输出 debug/info 噪音日志，生产环境静默；
 * 2. warn/error 任何环境都输出，便于线上问题排查；
 * 3. 提供可选 scope 前缀，统一日志格式，替代散落的 console.log('[Xxx] ...')。
 *
 * 用法：
 *   import { logger } from '@/lib/logger'
 *   logger.debug('[useSendMessage] sending', { channelId })
 *   const log = logger.scope('useSendMessage')
 *   log.debug('sending', { channelId })
 */

const isDev = import.meta.env.DEV

/** 单个 scope 的日志接口 */
export interface ScopedLogger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/** 构造带前缀的参数 */
function withPrefix(prefix: string | undefined, args: unknown[]): unknown[] {
  return prefix ? [prefix, ...args] : args
}

/** 创建一个（可选带 scope 前缀的）日志器 */
function createLogger(prefix?: string): ScopedLogger {
  return {
    // debug/info 仅在开发环境输出，避免生产控制台刷屏与泄露内容
    debug: (...args: unknown[]) => {
      if (isDev) console.debug(...withPrefix(prefix, args))
    },
    info: (...args: unknown[]) => {
      if (isDev) console.info(...withPrefix(prefix, args))
    },
    // warn/error 始终输出
    warn: (...args: unknown[]) => {
      console.warn(...withPrefix(prefix, args))
    },
    error: (...args: unknown[]) => {
      console.error(...withPrefix(prefix, args))
    },
  }
}

export const logger = {
  ...createLogger(),
  /** 创建带固定前缀的子日志器，如 logger.scope('useSendMessage') */
  scope: (name: string): ScopedLogger => createLogger(`[${name}]`),
}
