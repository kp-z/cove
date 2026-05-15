/**
 * Base error class for all application errors.
 * Provides structured error handling with status codes and context.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly statusCode: number;
  readonly context?: Record<string, any>;

  constructor(message: string, statusCode: number, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}
