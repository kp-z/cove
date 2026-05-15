/**
 * Tests for tRPC Error Mapper
 */

import { TRPCError } from '@trpc/server';
import { mapErrorToTRPC } from './trpc-mapper';
import { AppError } from './base.errors';
import { NotFoundError, ValidationError, ConflictError, StateError, AuthorizationError } from './business.errors';
import { ERROR_CODES } from './error-codes';

// Create concrete test error classes
class TestNotFoundError extends NotFoundError {
  readonly code = ERROR_CODES.USER_NOT_FOUND;
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

class TestValidationError extends ValidationError {
  readonly code = ERROR_CODES.INVALID_INPUT;
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

class TestConflictError extends ConflictError {
  readonly code = ERROR_CODES.USERNAME_ALREADY_EXISTS;
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

class TestStateError extends StateError {
  readonly code = ERROR_CODES.CHANNEL_NOT_ACTIVE;
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

class TestAuthorizationError extends AuthorizationError {
  readonly code = ERROR_CODES.UNAUTHORIZED_ACCESS;
  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }
}

class TestInternalError extends AppError {
  readonly code = ERROR_CODES.DATABASE_ERROR;
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, context);
  }
}

class TestExternalError extends AppError {
  readonly code = ERROR_CODES.LLM_PROVIDER_ERROR;
  constructor(message: string, context?: Record<string, any>) {
    super(message, 502, context);
  }
}

describe('mapErrorToTRPC', () => {
  describe('Business Errors', () => {
    it('should map NotFoundError to NOT_FOUND', () => {
      const error = new TestNotFoundError('User not found');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('User not found');
    });

    it('should map ValidationError to BAD_REQUEST', () => {
      const error = new TestValidationError('Invalid email format');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('BAD_REQUEST');
      expect(result.message).toBe('Invalid email format');
    });

    it('should map ConflictError to CONFLICT', () => {
      const error = new TestConflictError('Username already exists');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('CONFLICT');
      expect(result.message).toBe('Username already exists');
    });

    it('should map StateError to UNPROCESSABLE_CONTENT', () => {
      const error = new TestStateError('Channel is not active');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('UNPROCESSABLE_CONTENT');
      expect(result.message).toBe('Channel is not active');
    });

    it('should map AuthorizationError to FORBIDDEN', () => {
      const error = new TestAuthorizationError('User not authorized');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('User not authorized');
    });
  });

  describe('System Errors', () => {
    it('should map InternalError to INTERNAL_SERVER_ERROR', () => {
      const error = new TestInternalError('Database connection failed');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Database connection failed');
    });

    it('should map ExternalServiceError to BAD_GATEWAY', () => {
      const error = new TestExternalError('LLM service unavailable');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('BAD_GATEWAY');
      expect(result.message).toBe('LLM service unavailable');
    });
  });

  describe('Error Context', () => {
    it('should include error in cause', () => {
      const error = new TestNotFoundError('User not found', { userId: 'user-123' });

      const result = mapErrorToTRPC(error);

      expect(result.cause).toBe(error);
      expect(result.cause).toBeInstanceOf(TestNotFoundError);
    });

    it('should handle errors without context', () => {
      const error = new TestNotFoundError('User not found');

      const result = mapErrorToTRPC(error);

      expect(result.cause).toBe(error);
      expect(result.message).toBe('User not found');
    });
  });

  describe('Unknown Errors', () => {
    it('should handle standard Error objects', () => {
      const error = new Error('Something went wrong');

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle errors without message', () => {
      const error = new Error();

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('');
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Custom error object' };

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Unknown error');
    });

    it('should handle string errors', () => {
      const error = 'String error message';

      const result = mapErrorToTRPC(error);

      expect(result).toBeInstanceOf(TRPCError);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toBe('Unknown error');
    });

    it('should handle null/undefined errors', () => {
      const result1 = mapErrorToTRPC(null);
      const result2 = mapErrorToTRPC(undefined);

      expect(result1).toBeInstanceOf(TRPCError);
      expect(result1.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result1.message).toBe('Unknown error');

      expect(result2).toBeInstanceOf(TRPCError);
      expect(result2.code).toBe('INTERNAL_SERVER_ERROR');
      expect(result2.message).toBe('Unknown error');
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should respect custom HTTP status codes', () => {
      const error = new TestNotFoundError('User not found');

      expect(error.statusCode).toBe(404);
    });

    it('should map 400 to BAD_REQUEST', () => {
      const error = new TestValidationError('Invalid input');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('BAD_REQUEST');
    });

    it('should map 403 to FORBIDDEN', () => {
      const error = new TestAuthorizationError('Not authorized');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('FORBIDDEN');
    });

    it('should map 404 to NOT_FOUND', () => {
      const error = new TestNotFoundError('Resource not found');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should map 409 to CONFLICT', () => {
      const error = new TestConflictError('Resource conflict');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('CONFLICT');
    });

    it('should map 422 to UNPROCESSABLE_CONTENT', () => {
      const error = new TestStateError('Invalid state');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('UNPROCESSABLE_CONTENT');
    });

    it('should map 500 to INTERNAL_SERVER_ERROR', () => {
      const error = new TestInternalError('Internal error');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should map 502 to BAD_GATEWAY', () => {
      const error = new TestExternalError('Service error');

      const result = mapErrorToTRPC(error);
      expect(result.code).toBe('BAD_GATEWAY');
    });
  });
});
