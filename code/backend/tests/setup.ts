import { beforeAll, afterAll, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  // Setup code that runs once before all tests
  console.log('🧪 Starting test suite...');
});

afterAll(() => {
  // Cleanup code that runs once after all tests
  console.log('✅ Test suite completed');
});

afterEach(() => {
  // Cleanup after each test
  // Clear all mocks
  // Reset any global state
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
