/**
 * Tests for Base Error Classes
 */

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

describe('Error Base Classes', () => {
  describe('NotFoundError', () => {
    it('should create error with correct properties', () => {
      const error = new TestNotFoundError('User not found');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe(ERROR_CODES.USER_NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });

    it('should include context when provided', () => {
      const error = new TestNotFoundError('User not found', { userId: 'user-123' });

      expect(error.context).toEqual({ userId: 'user-123' });
    });

    it('should have correct name', () => {
      const error = new TestNotFoundError('User not found');

      expect(error.name).toBe('TestNotFoundError');
    });
  });

  describe('ValidationError', () => {
    it('should create error with HTTP 400', () => {
      const error = new TestValidationError('Invalid email format');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid email format');
      expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(error.statusCode).toBe(400);
    });

    it('should include validation details in context', () => {
      const error = new TestValidationError('Invalid email format', {
        field: 'email',
        value: 'invalid-email',
        rule: 'email'
      });

      expect(error.context).toEqual({
        field: 'email',
        value: 'invalid-email',
        rule: 'email'
      });
    });
  });

  describe('ConflictError', () => {
    it('should create error with HTTP 409', () => {
      const error = new TestConflictError('Username already exists');

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Username already exists');
      expect(error.code).toBe(ERROR_CODES.USERNAME_ALREADY_EXISTS);
      expect(error.statusCode).toBe(409);
    });

    it('should include conflict details in context', () => {
      const error = new TestConflictError('Username already exists', {
        field: 'username',
        value: 'john_doe',
        existingId: 'user-456'
      });

      expect(error.context).toEqual({
        field: 'username',
        value: 'john_doe',
        existingId: 'user-456'
      });
    });
  });

  describe('StateError', () => {
    it('should create error with HTTP 422', () => {
      const error = new TestStateError('Channel is not active');

      expect(error).toBeInstanceOf(StateError);
      expect(error.message).toBe('Channel is not active');
      expect(error.code).toBe(ERROR_CODES.CHANNEL_NOT_ACTIVE);
      expect(error.statusCode).toBe(422);
    });

    it('should include state details in context', () => {
      const error = new TestStateError('Channel is not active', {
        currentState: 'archived',
        requiredState: 'active',
        channelId: 'channel-789'
      });

      expect(error.context).toEqual({
        currentState: 'archived',
        requiredState: 'active',
        channelId: 'channel-789'
      });
    });
  });

  describe('AuthorizationError', () => {
    it('should create error with HTTP 403', () => {
      const error = new TestAuthorizationError('User not authorized');

      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error.message).toBe('User not authorized');
      expect(error.code).toBe(ERROR_CODES.UNAUTHORIZED_ACCESS);
      expect(error.statusCode).toBe(403);
    });

    it('should include authorization details in context', () => {
      const error = new TestAuthorizationError('User not authorized', {
        userId: 'user-123',
        resource: 'channel',
        action: 'delete'
      });

      expect(error.context).toEqual({
        userId: 'user-123',
        resource: 'channel',
        action: 'delete'
      });
    });
  });

  describe('InternalError', () => {
    it('should create error with HTTP 500', () => {
      const error = new TestInternalError('Database connection failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should include error details in context', () => {
      const error = new TestInternalError('Database connection failed', {
        database: 'postgres',
        host: 'localhost',
        port: 5432
      });

      expect(error.context).toEqual({
        database: 'postgres',
        host: 'localhost',
        port: 5432
      });
    });
  });

  describe('ExternalServiceError', () => {
    it('should create error with HTTP 502', () => {
      const error = new TestExternalError('LLM service unavailable');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('LLM service unavailable');
      expect(error.code).toBe(ERROR_CODES.LLM_PROVIDER_ERROR);
      expect(error.statusCode).toBe(502);
    });

    it('should include service details in context', () => {
      const error = new TestExternalError('LLM service unavailable', {
        service: 'anthropic',
        endpoint: '/v1/messages',
        statusCode: 503
      });

      expect(error.context).toEqual({
        service: 'anthropic',
        endpoint: '/v1/messages',
        statusCode: 503
      });
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const notFoundError = new TestNotFoundError('Not found');
      const validationError = new TestValidationError('Invalid');
      const internalError = new TestInternalError('Internal');

      expect(notFoundError).toBeInstanceOf(Error);
      expect(notFoundError).toBeInstanceOf(AppError);
      expect(notFoundError).toBeInstanceOf(NotFoundError);

      expect(validationError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(AppError);
      expect(validationError).toBeInstanceOf(ValidationError);

      expect(internalError).toBeInstanceOf(Error);
      expect(internalError).toBeInstanceOf(AppError);
    });

    it('should have stack traces', () => {
      const error = new TestNotFoundError('User not found');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestNotFoundError');
    });
  });

  describe('Error Context', () => {
    it('should handle undefined context', () => {
      const error = new TestNotFoundError('User not found');

      expect(error.context).toBeUndefined();
    });

    it('should handle empty context', () => {
      const error = new TestNotFoundError('User not found', {});

      expect(error.context).toEqual({});
    });

    it('should handle complex context objects', () => {
      const error = new TestNotFoundError('User not found', {
        userId: 'user-123',
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          source: 'api'
        },
        tags: ['user', 'authentication']
      });

      expect(error.context).toEqual({
        userId: 'user-123',
        metadata: {
          timestamp: '2024-01-01T00:00:00Z',
          source: 'api'
        },
        tags: ['user', 'authentication']
      });
    });
  });
});
