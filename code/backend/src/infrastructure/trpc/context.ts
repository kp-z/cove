import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ILogger } from '../../application/interfaces/logger.interface';

export interface Context {
  userId?: string;
  userType?: 'human' | 'agent';
  logger: ILogger;
  req: IncomingMessage;
  res: ServerResponse;
}

export interface CreateContextOptions {
  logger: ILogger;
}

export function createContext(opts: CreateContextOptions) {
  return ({ req, res }: CreateHTTPContextOptions): Context => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return {
        userId: undefined,
        userType: 'human',
        logger: opts.logger,
        req,
        res,
      };
    }

    // Extract user info from headers
    const userId = req.headers['x-user-id'] as string | undefined;
    const userType = req.headers['x-user-type'] as 'human' | 'agent' | undefined;

    return {
      userId,
      userType: userType || 'human',
      logger: opts.logger,
      req,
      res,
    };
  };
}
