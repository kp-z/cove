import { describe, it, expect, vi } from 'vitest';
import { MessageNotFoundError } from './src/application/services/message/message.errors';
import { mapErrorToTRPC } from './src/common/errors/trpc-mapper';

describe('Mock Rejection Test', () => {
  it('should preserve error properties through mockRejectedValue', async () => {
    const mockFn = vi.fn();
    const originalError = new MessageNotFoundError('test-id');

    console.log('Original error:', originalError);
    console.log('Original error code:', originalError.code);
    console.log('Original error statusCode:', originalError.statusCode);

    mockFn.mockRejectedValue(originalError);

    try {
      await mockFn();
      expect.fail('Should have thrown');
    } catch (caughtError: any) {
      console.log('Caught error:', caughtError);
      console.log('Caught error code:', caughtError.code);
      console.log('Caught error statusCode:', caughtError.statusCode);
      console.log('Caught error name:', caughtError.name);
      console.log('Caught error constructor:', caughtError.constructor.name);

      const trpcError = mapErrorToTRPC(caughtError);
      console.log('TRPC error code:', trpcError.code);

      expect(trpcError.code).toBe('NOT_FOUND');
    }
  });
});
