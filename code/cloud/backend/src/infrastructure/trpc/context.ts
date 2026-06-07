import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ILogger } from '../../application/interfaces/logger.interface';
import type { AuthService } from '../../application/services/auth/auth.service';
import type { DeviceAuthService } from '../../application/services/device/device-auth.service';
import type { IRealmMemberVerificationService } from '../../application/services/realm/realm-member-verification.service';
import type { IRealmPermissionService } from '../../application/interfaces/services/realm-permission.service.interface';
import { TRPCError } from '@trpc/server';

export interface Context {
  realmId?: string;
  userId?: string;
  userType?: 'human' | 'agent';
  userRole?: string;
  logger: ILogger;
  realmMemberVerification: IRealmMemberVerificationService;
  permissionService: IRealmPermissionService;
  req: IncomingMessage;
  res: ServerResponse;
}

export interface CreateContextOptions {
  logger: ILogger;
  authService: AuthService;
  deviceAuthService: DeviceAuthService;
  realmMemberVerification: IRealmMemberVerificationService;
  permissionService: IRealmPermissionService;
}

export function createContext(opts: CreateContextOptions) {
  return async ({ req, res }: CreateHTTPContextOptions): Promise<Context> => {
    // Debug logging for incoming request
    console.log('[Context Creation] Headers:', {
      authorization: req.headers.authorization ? 'Bearer ***' : undefined,
      'x-realm-id': req.headers['x-realm-id'],
      'x-user-id': req.headers['x-user-id'],
      'x-device-id': req.headers['x-device-id'],
    });

    // Set CORS headers - use specific origin instead of wildcard when credentials are included
    const origin = req.headers.origin || 'http://localhost:5174';
    res.setHeader('Access-Control-Allow-Origin', origin);
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
        permissionService: opts.permissionService,
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
          permissionService: opts.permissionService,
          req,
          res,
        };
      } catch (_error) {
        // Token invalid, fall through to device auth or legacy headers
        opts.logger.debug('JWT verification failed, trying device auth');
      }
    }

    // Try device authentication (for Local Device connections)
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (deviceId && apiKey) {
      // Device credentials provided - must authenticate successfully or fail
      if (!realmId) {
        opts.logger.error('Device auth failed: missing realm ID');
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Device authentication requires x-realm-id header',
        });
      }

      opts.logger.info('Attempting device authentication');

      try {
        const authResult = await opts.deviceAuthService.authenticateDevice(
          deviceId,
          apiKey,
          realmId
        );

        opts.logger.info('Device auth result');

        if (!authResult.isValid) {
          opts.logger.error('Device auth failed: invalid credentials');
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid device credentials',
          });
        }

        // Check if device has API key (not revoked)
        if (!authResult.device.apiKeyHash) {
          opts.logger.error('Device auth failed: API key revoked');
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Device API key has been revoked',
          });
        }

        opts.logger.info('Device authenticated successfully');

        console.log('[Context Creation] Device authenticated:', {
          userId: deviceId,
          realmId,
          userType: 'agent',
        });

        return {
          realmId,
          userId: deviceId,
          userType: 'agent',
          logger: opts.logger,
          realmMemberVerification: opts.realmMemberVerification,
          permissionService: opts.permissionService,
          req,
          res,
        };
      } catch (error) {
        // Device authentication failed - throw error instead of falling back
        if (error instanceof TRPCError) {
          throw error;
        }
        opts.logger.error('Device authentication error', error as Error);
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Device authentication failed',
        });
      }
    }

    // Fallback: Extract user info from legacy headers (for backward compatibility)
    const userId = req.headers['x-user-id'] as string | undefined;
    const userType = req.headers['x-user-type'] as 'human' | 'agent' | undefined;

    console.log('[Context Creation] Using legacy headers:', {
      userId,
      realmId,
      userType: userType || 'human',
    });

    return {
      realmId,
      userId,
      userType: userType || 'human',
      logger: opts.logger,
      realmMemberVerification: opts.realmMemberVerification,
      permissionService: opts.permissionService,
      req,
      res,
    };
  };
}
