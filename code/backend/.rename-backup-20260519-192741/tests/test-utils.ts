import { vi } from 'vitest';

/**
 * Test utilities for backend testing
 */

/**
 * Create a mock function with Vitest
 * Use this instead of jest.fn()
 */
export const createMock = <T extends (...args: any[]) => any>() => {
  return vi.fn<T>();
};

/**
 * Create a mock object with specified methods
 */
export const createMockObject = <T extends Record<string, any>>(
  methods: (keyof T)[]
): jest.Mocked<T> => {
  const mock = {} as jest.Mocked<T>;
  methods.forEach((method) => {
    mock[method] = vi.fn() as any;
  });
  return mock;
};

/**
 * Wait for a specified time (useful for testing async operations)
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mock repository with common CRUD methods
 */
export const createMockRepository = <T>() => {
  return {
    findById: vi.fn<(id: string) => Promise<T | null>>(),
    findAll: vi.fn<() => Promise<T[]>>(),
    create: vi.fn<(data: Partial<T>) => Promise<T>>(),
    update: vi.fn<(id: string, data: Partial<T>) => Promise<T>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
  };
};

/**
 * Create a mock service with common methods
 */
export const createMockService = <T>() => {
  return {
    findById: vi.fn<(id: string) => Promise<T | null>>(),
    findAll: vi.fn<() => Promise<T[]>>(),
    create: vi.fn<(data: Partial<T>) => Promise<T>>(),
    update: vi.fn<(id: string, data: Partial<T>) => Promise<T>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
  };
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};
