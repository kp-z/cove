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
      stdio: 'pipe',
      cwd: __dirname + '/..',
    });
    console.log('✅ Test database schema synced');
  } catch (error) {
    // Ignore error if database is already in sync
    console.log('ℹ️  Database already in sync or error occurred (continuing anyway)');
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
