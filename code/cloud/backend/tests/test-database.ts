import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

/**
 * Test Database Manager
 *
 * Provides isolated database instances for each test to ensure test independence.
 * Each test gets its own SQLite database file that is automatically cleaned up.
 */

interface TestDatabaseInstance {
  prisma: PrismaClient;
  databasePath: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates an isolated test database instance
 *
 * @returns TestDatabaseInstance with prisma client and cleanup function
 */
export async function createTestDatabase(): Promise<TestDatabaseInstance> {
  const testId = randomUUID();
  const testDir = path.join(process.cwd(), '.test-storage', testId);
  const databasePath = path.join(testDir, 'test.db');

  // Create test directory
  await fs.mkdir(testDir, { recursive: true });

  // Set database URL for this test
  const databaseUrl = `file:${databasePath}`;
  process.env.DATABASE_URL = databaseUrl;

  // Run migrations to create schema
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe'
    });
  } catch (error) {
    console.error('Failed to run migrations:', error);
    throw error;
  }

  // Create Prisma client
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  // Connect to database
  await prisma.$connect();

  // Cleanup function
  const cleanup = async () => {
    try {
      await prisma.$disconnect();
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  };

  return {
    prisma,
    databasePath,
    cleanup
  };
}

/**
 * Creates an isolated test storage directory
 *
 * @returns Object with storage path and cleanup function
 */
export async function createTestStorage(): Promise<{ storagePath: string; cleanup: () => Promise<void> }> {
  const testId = randomUUID();
  const storagePath = path.join(process.cwd(), '.test-storage', testId);

  await fs.mkdir(storagePath, { recursive: true });

  const cleanup = async () => {
    try {
      await fs.rm(storagePath, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup test storage:', error);
    }
  };

  return {
    storagePath,
    cleanup
  };
}
