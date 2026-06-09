import { ILogger, LogLevel, LogContext } from './logger.interface';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',   // cyan
  info:  '\x1b[32m',   // green
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
};

const RESET_COLOR = '\x1b[0m';
const DIM_COLOR   = '\x1b[2m';

/** HH:MM:SS.mmm — 比完整 ISO 时间戳更易阅读 */
function shortTimestamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export class ConsoleLogger implements ILogger {
  private currentLevel: LogLevel;
  private readonly prefix: string;

  constructor(level: LogLevel = 'info', prefix = '') {
    this.currentLevel = level;
    this.prefix = prefix;
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /** 返回带 [name] 前缀的子 logger，继承当前 level */
  scope(name: string): ILogger {
    const child = new ConsoleLogger(this.currentLevel, `[${name}] `);
    return child;
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        ...(process.env.LOG_LEVEL === 'debug' && { errorStack: error.stack }),
      }),
    };
    this.log('error', message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.currentLevel]) {
      return;
    }

    const ts    = shortTimestamp();
    const color = LOG_COLORS[level];
    const lvl   = level.toUpperCase().padEnd(5);

    let line = `${DIM_COLOR}${ts}${RESET_COLOR} ${color}${lvl}${RESET_COLOR} ${this.prefix}${message}`;

    if (context && Object.keys(context).length > 0) {
      line += ` ${JSON.stringify(context)}`;
    }

    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
