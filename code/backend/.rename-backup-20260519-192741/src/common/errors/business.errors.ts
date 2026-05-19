import { AppError } from './base.errors';

/**
 * Base class for business logic errors (4xx status codes).
 */
export abstract class BusinessError extends AppError {
  constructor(message: string, statusCode: number, context?: Record<string, any>) {
    super(message, statusCode, context);
  }
}

/**
 * Resource not found error (404).
 */
export abstract class NotFoundError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 404, context);
  }
}

/**
 * Validation error (400).
 */
export abstract class ValidationError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, context);
  }
}

/**
 * Conflict error (409).
 */
export abstract class ConflictError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, context);
  }
}

/**
 * Invalid state transition error (422).
 */
export abstract class StateError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 422, context);
  }
}

/**
 * Authorization error (403).
 */
export abstract class AuthorizationError extends BusinessError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 403, context);
  }
}
