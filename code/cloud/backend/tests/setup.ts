import { beforeAll, afterAll, afterEach } from 'vitest';
import { execSync } from 'child_process';

// Global test setup
beforeAll(() => {
  // Setup code that runs once before all tests
  console.log('🧪 Starting test suite...');

  // Sync test database schema with Prisma schema
  console.log('📦 Syncing test database schema...');
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      cwd: __dirname + '/..',
    });
    console.log('✅ Test database schema synced');
  } catch (error) {
    console.error('❌ Failed to sync test database schema:', error);
    throw error;
  }
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
