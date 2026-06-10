import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, loggerLink, splitLink, wsLink, createWSClient, TRPCClientError } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { TRPCLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';
import { env } from '../core/config/env';
import { useAuthStore } from '../core/auth/authStore';
import { getCurrentUser } from '../core/auth/useCurrentUser';
import { logger } from './logger';

const log = logger.scope('trpc');

export const trpc = createTRPCReact<AppRouter>();

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

const authErrorLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (
            err instanceof TRPCClientError &&
            err.data?.code === 'UNAUTHORIZED' &&
            op.path !== 'auth.login' &&
            op.path !== 'auth.verifyToken'
          ) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

let wsClient: ReturnType<typeof createWSClient> | null = null;

function getOrCreateWSClient() {
  // 延迟访问 useAuthStore，避免循环依赖
  let isAuthenticated = false;
  try {
    isAuthenticated = useAuthStore.getState().isAuthenticated;
  } catch (error) {
    // useAuthStore 还未初始化，返回 dummy client
    log.debug('AuthStore not ready, skipping WebSocket connection');
    return createWSClient({
      url: () => {
        throw new Error('WebSocket not available - auth store not ready');
      },
      lazy: true,
    });
  }

  if (!isAuthenticated) {
    // 未认证时返回一个不会真正连接的 dummy client
    log.debug('User not authenticated, skipping WebSocket connection');
    return createWSClient({
      url: () => {
        throw new Error('WebSocket not available for unauthenticated users');
      },
      lazy: true, // 懒加载，不立即连接
    });
  }

  if (!wsClient) {
    wsClient = createWSClient({
      url: () => {
        const { userId } = getCurrentUser();
        const params = new URLSearchParams({
          userId: userId || 'anonymous',
          userType: 'human',
        });
        return `${env.wsUrl}?${params.toString()}`;
      },
      onClose: () => {
        // 当 WebSocket 连接关闭时，检查是否是因为后端断开
        try {
          const { currentRealmId, isAuthenticated } = useAuthStore.getState();

          // 如果用户已认证且已选择 realm，说明后端断开了
          if (isAuthenticated && currentRealmId) {
            log.debug('Connection closed, clearing realm selection');

            // 清除当前 realm
            useAuthStore.getState().setCurrentRealmId(null);

            // 显示通知
            setTimeout(() => {
              const event = new CustomEvent('realm:disconnected');
              window.dispatchEvent(event);
            }, 100);
          }
        } catch (error) {
          log.error('Error handling WebSocket close', error);
        }
      },
    });
  }
  return wsClient;
}

export const trpcClient = trpc.createClient({
  links: [
    loggerLink({
      // 日志策略：
      // 1) 始终记录错误（无论 dev/prod），便于线上排障。
      // 2) 生产环境只记录错误，不输出正常请求日志。
      // 3) 开发环境记录 query/mutation，但跳过 subscription 的数据帧——
      //    device 心跳/消息广播会高频触发 `<< subscription #N` 刷屏，
      //    且在 StrictMode 下成对出现，极易被误认为报错。订阅的错误仍会记录（见第1条）。
      enabled: (opts) => {
        // 步骤1：错误始终记录
        if (opts.direction === 'down' && opts.result instanceof Error) {
          return true;
        }
        // 步骤2：生产环境静默正常日志
        if (!env.isDevelopment) {
          return false;
        }
        // 步骤3：开发环境跳过 subscription 的数据帧噪音
        if (opts.type === 'subscription') {
          return false;
        }
        return true;
      },
    }),
    authErrorLink,
    splitLink({
      condition: (op) => {
        // 只有在认证状态下才使用 WebSocket
        const { isAuthenticated } = useAuthStore.getState();
        return op.type === 'subscription' && isAuthenticated;
      },
      true: wsLink({
        client: getOrCreateWSClient(),
      }),
      false: httpBatchLink({
        url: `${env.apiUrl}/trpc`,
        maxURLLength: 2083,
        headers() {
          const token = getAuthToken();
          const { userId } = getCurrentUser();
          const currentRealmId = localStorage.getItem('current_realm_id') ||
                                 sessionStorage.getItem('current_realm_id') ||
                                 'realm-nexus';

          // 认证数据缺失时仅在开发环境提示（启动/登录阶段可能短暂缺失，避免刷屏）
          if (!token || !userId || !currentRealmId) {
            log.debug('Missing authentication data', {
              hasToken: !!token,
              hasUserId: !!userId,
              hasRealmId: !!currentRealmId,
            });
          }

          return {
            authorization: token ? `Bearer ${token}` : '',
            'x-user-id': userId || '',
            'x-realm-id': currentRealmId,
          };
        },
      }),
    }),
  ],
});
