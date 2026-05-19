import { AppError } from './base.errors';

/**
 * Base class for system errors (5xx status codes).
 */
export abstract class SystemError extends AppError {
  constructor(message: string, statusCode: number, context?: Record<string, any>) {
    super(message, statusCode, context);
  }
}

/**
 * Internal server error (500).
 */
export abstract class InternalError extends SystemError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, context);
  }
}

/**
 * External service error (502).
 */
export abstract class ExternalServiceError extends SystemError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 502, context);
  }
}
