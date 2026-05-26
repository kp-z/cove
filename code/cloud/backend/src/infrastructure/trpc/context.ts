import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ILogger } from '../../application/interfaces/logger.interface';
import type { AuthService } from '../../application/services/auth/auth.service';
import type { IRealmMemberVerificationService } from '../../application/services/realm/realm-member-verification.service';

export interface Context {
  realmId?: string;
  userId?: string;
  userType?: 'human' | 'agent';
  userRole?: string;
  logger: ILogger;
  realmMemberVerification: IRealmMemberVerificationService;
  req: IncomingMessage;
  res: ServerResponse;
}

export interface CreateContextOptions {
  logger: ILogger;
  authService: AuthService;
  realmMemberVerification: IRealmMemberVerificationService;
}

export function createContext(opts: CreateContextOptions) {
  return async ({ req, res }: CreateHTTPContextOptions): Promise<Context> => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-type, x-realm-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return {
        realmId: undefined,
        userId: undefined,
        userType: 'human',
        logger: opts.logger,
        realmMemberVerification: opts.realmMemberVerification,
        req,
        res,
      };
    }

    // Extract realm ID from headers
    const realmId = req.headers['x-realm-id'] as string | undefined;

    // Try to authenticate via JWT token first
    const authHeader = req.headers['authorization'] as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = await opts.authService.verifyToken(token);
        return {
          realmId,
          userId: payload.userId,
          userType: 'human',
          userRole: payload.role,
          logger: opts.logger,
          realmMemberVerification: opts.realmMemberVerification,
          req,
          res,
        };
      } catch (_error) {
        // Token invalid, fall through to legacy headers
        opts.logger.debug('JWT verification failed, falling back to legacy headers');
      }
    }

    // Fallback: Extract user info from legacy headers (for backward compatibility)
    const userId = req.headers['x-user-id'] as string | undefined;
    const userType = req.headers['x-user-type'] as 'human' | 'agent' | undefined;

    return {
      realmId,
      userId,
      userType: userType || 'human',
      logger: opts.logger,
      realmMemberVerification: opts.realmMemberVerification,
      req,
      res,
    };
  };
}
