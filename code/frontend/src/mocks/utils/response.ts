/**
 * MSW 响应构造工具
 */

import { HttpResponse, delay as mswDelay } from 'msw';
import { getDelay, mswConfig } from '../config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface ResponseOptions {
  delay?: boolean;
  customDelay?: number;
  status?: number;
}

export async function createSuccessResponse<T>(
  data: T,
  options: ResponseOptions = {}
): Promise<HttpResponse> {
  const { delay = true, customDelay, status = 200 } = options;

  if (delay) {
    await mswDelay(customDelay ?? getDelay());
  }

  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (mswConfig.logging.responses) {
    console.log('[MSW] Success Response:', response);
  }

  return HttpResponse.json(response, { status });
}

export async function createErrorResponse(
  code: string,
  message: string,
  options: ResponseOptions = {}
): Promise<HttpResponse> {
  const { delay = true, customDelay, status = 400 } = options;

  if (delay) {
    await mswDelay(customDelay ?? getDelay());
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (mswConfig.logging.responses) {
    console.error('[MSW] Error Response:', response);
  }

  return HttpResponse.json(response, { status });
}

export const ErrorResponses = {
  unauthorized: (message = 'Unauthorized') =>
    createErrorResponse('UNAUTHORIZED', message, { status: 401 }),

  forbidden: (message = 'Forbidden') =>
    createErrorResponse('FORBIDDEN', message, { status: 403 }),

  notFound: (resource = 'Resource', id?: string) =>
    createErrorResponse(
      'NOT_FOUND',
      id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      { status: 404 }
    ),

  validationError: (message: string) =>
    createErrorResponse('VALIDATION_ERROR', message, { status: 422 }),

  serverError: (message = 'Internal server error') =>
    createErrorResponse('INTERNAL_ERROR', message, { status: 500 }),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    createErrorResponse('SERVICE_UNAVAILABLE', message, { status: 503 }),
};
