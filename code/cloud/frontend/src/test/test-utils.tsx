import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Render component with React Router
 */
export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    ),
    ...options,
  });
}

/**
 * Render component with React Query
 */
export function renderWithQuery(
  ui: ReactElement,
  options?: RenderOptions
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
    ...options,
  });
}

/**
 * Render component with both Router and Query
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    ),
    ...options,
  });
}

/**
 * Create a mock API response
 */
export const createMockApiResponse = <T,>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as Record<string, unknown>,
});

/**
 * Create a mock API error
 */
export const createMockApiError = (message: string, status = 500) => ({
  response: {
    data: { message },
    status,
    statusText: 'Error',
    headers: {},
    config: {} as Record<string, unknown>,
  },
  message,
  name: 'AxiosError',
  config: {} as Record<string, unknown>,
  isAxiosError: true,
  toJSON: () => ({}),
});

