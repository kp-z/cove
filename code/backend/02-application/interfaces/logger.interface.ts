/**
 * ILogger - Logger 接口
 *
 * Application Layer 通过此接口记录日志。
 * 遵循依赖倒置原则，不直接依赖 Infrastructure 层的具体实现。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  readonly [key: string]: unknown;
}

export interface ILogger {
  /**
   * 记录 debug 级别日志
   * @param message - 日志消息
   * @param context - 上下文信息
   */
  debug(message: string, context?: LogContext): void;

  /**
   * 记录 info 级别日志
   * @param message - 日志消息
   * @param context - 上下文信息
   */
  info(message: string, context?: LogContext): void;

  /**
   * 记录 warn 级别日志
   * @param message - 日志消息
   * @param context - 上下文信息
   */
  warn(message: string, context?: LogContext): void;

  /**
   * 记录 error 级别日志
   * @param message - 日志消息
   * @param error - 错误对象
   * @param context - 上下文信息
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * 记录 fatal 级别日志
   * @param message - 日志消息
   * @param error - 错误对象
   * @param context - 上下文信息
   */
  fatal(message: string, error?: Error, context?: LogContext): void;

  /**
   * 创建子 Logger（带有固定上下文）
   * @param context - 固定上下文
   * @returns 子 Logger
   */
  child(context: LogContext): ILogger;

  /**
   * 设置日志级别
   * @param level - 日志级别
   */
  setLevel(level: LogLevel): void;
}
