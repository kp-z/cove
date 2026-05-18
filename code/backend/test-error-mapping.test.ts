import { describe, it, expect } from 'vitest';
import { MessageNotFoundError } from './src/application/services/message/message.errors';
import { mapErrorToTRPC } from './src/common/errors/trpc-mapper';
import { AppError } from './src/common/errors';

describe('Error Mapping Test', () => {
  it('should map MessageNotFoundError to NOT_FOUND', () => {
    const error = new MessageNotFoundError('test-id');

    console.log('Error:', error);
    console.log('Error name:', error.name);
    console.log('Error statusCode:', error.statusCode);
    console.log('Error instanceof AppError:', error instanceof AppError);
    console.log('Error constructor:', error.constructor.name);

    const trpcError = mapErrorToTRPC(error);

    console.log('TRPC Error code:', trpcError.code);

    expect(trpcError.code).toBe('NOT_FOUND');
  });
});
