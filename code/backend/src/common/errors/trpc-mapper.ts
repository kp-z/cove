import { TRPCError } from '@trpc/server';
import { AppError } from './base.errors';

/**
 * Maps HTTP status codes to tRPC error codes.
 */
const STATUS_TO_TRPC_CODE: Record<number, TRPCError['code']> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_CONTENT',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
};

/**
 * Maps application errors to tRPC errors.
 * Automatically converts AppError instances to appropriate tRPC error codes.
 */
export function mapErrorToTRPC(error: unknown): TRPCError {
  if (error instanceof AppError) {
    return new TRPCError({
      code: STATUS_TO_TRPC_CODE[error.statusCode] || 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  // Fallback for unknown errors
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    cause: error,
  });
}
