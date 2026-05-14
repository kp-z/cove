import { TRPCClientError } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';

export function handleTRPCError(error: unknown): string {
  if (error instanceof TRPCClientError<AppRouter>) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export function isTRPCNotFoundError(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND';
}

export function isTRPCUnauthorizedError(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED';
}
