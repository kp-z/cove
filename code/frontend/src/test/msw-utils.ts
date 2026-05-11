/**
 * MSW 测试工具
 */

import { http } from 'msw';
import { server } from '@/mocks/server';
import { db } from '@/mocks/utils/database';
import { ErrorResponses } from '@/mocks/utils/response';

export function resetMsw(): void {
  server.resetHandlers();
  db.reset();
}

export function mockEndpointError(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  errorType: keyof typeof ErrorResponses
): void {
  server.use(
    http[method](url, async () => {
      const errorFn = ErrorResponses[errorType];
      return errorFn();
    })
  );
}
