import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { ILogger } from '../../application/interfaces/logger.interface';

export interface Context {
  userId?: string;
  userType?: 'human' | 'agent';
  logger: ILogger;
}

export interface CreateContextOptions {
  logger: ILogger;
}

export function createContext(opts: CreateContextOptions) {
  return ({ req }: CreateExpressContextOptions): Context => {
    // 从 header 或 body 中提取用户信息
    // 当前系统无认证，从 header 中提取（临时方案）
    const userId = req.headers['x-user-id'] as string | undefined;
    const userType = req.headers['x-user-type'] as 'human' | 'agent' | undefined;

    return {
      userId,
      userType,
      logger: opts.logger,
    };
  };
}
