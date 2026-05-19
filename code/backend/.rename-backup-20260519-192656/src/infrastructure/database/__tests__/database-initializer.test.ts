import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseInitializer } from '../database-initializer';
import { ILogger } from '../../../application/interfaces';

// Mock logger
const mockLogger: ILogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(() => mockLogger),
  setLevel: vi.fn(),
};

describe('DatabaseInitializer', () => {
  const testDir = path.join(__dirname, '../../../../test-data/db-init');
  const testDbPath = path.join(testDir, 'test.db');
  const testMigrationsPath = path.join(__dirname, '../../../../prisma/migrations');

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Reset mock calls
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('needsInitialization detection', () => {
    it('should detect when database file does not exist', async () => {
      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
        autoMigrate: false, // Disable auto-migrate for this test
      });

      const status = initializer.getStatus();
      expect(status.exists).toBe(false);
      expect(status.size).toBe(0);
    });

    it('should detect when database file is empty (0 bytes)', async () => {
      // Create empty database file
      fs.writeFileSync(testDbPath, '');

      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
        autoMigrate: false,
      });

      const status = initializer.getStatus();
      expect(status.exists).toBe(true);
      expect(status.size).toBe(0);
    });

    it('should detect when database file has content', async () => {
      // Create database file with content
      fs.writeFileSync(testDbPath, 'some content');

      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
        autoMigrate: false,
      });

      const status = initializer.getStatus();
      expect(status.exists).toBe(true);
      expect(status.size).toBeGreaterThan(0);
    });
  });

  describe('autoMigrate flag', () => {
    it('should skip initialization when autoMigrate is false', async () => {
      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
        autoMigrate: false,
      });

      const result = await initializer.initialize();
      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Auto-migration is disabled')
      );
    });

    it('should enable autoMigrate by default', () => {
      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
      });

      // Access private property through type assertion for testing
      expect((initializer as any).autoMigrate).toBe(true);
    });
  });

  describe('ensureDatabaseDirectory', () => {
    it('should create database directory if it does not exist', async () => {
      const nestedDbPath = path.join(testDir, 'nested/dir/test.db');

      const initializer = new DatabaseInitializer({
        databasePath: nestedDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
        autoMigrate: false,
      });

      // Call private method through initialize (with autoMigrate false it won't run migrations)
      const dbDir = path.dirname(nestedDbPath);
      expect(fs.existsSync(dbDir)).toBe(false);

      // Manually call the private method for testing
      (initializer as any).ensureDatabaseDirectory();

      expect(fs.existsSync(dbDir)).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status for non-existent database', () => {
      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
      });

      const status = initializer.getStatus();
      expect(status).toEqual({
        exists: false,
        size: 0,
        path: testDbPath,
      });
    });

    it('should return correct status for existing database', () => {
      const content = 'test database content';
      fs.writeFileSync(testDbPath, content);

      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
      });

      const status = initializer.getStatus();
      expect(status).toEqual({
        exists: true,
        size: Buffer.byteLength(content),
        path: testDbPath,
      });
    });
  });

  describe('initialization flow', () => {
    it('should skip initialization if database already exists with content', async () => {
      // Create database with content
      fs.writeFileSync(testDbPath, 'existing database');

      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: testMigrationsPath,
        logger: mockLogger,
        autoMigrate: true,
      });

      const result = await initializer.initialize();
      expect(result).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('already initialized')
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing migrations directory gracefully', async () => {
      const invalidMigrationsPath = path.join(testDir, 'non-existent-migrations');

      const initializer = new DatabaseInitializer({
        databasePath: testDbPath,
        migrationsPath: invalidMigrationsPath,
        logger: mockLogger,
        autoMigrate: true,
      });

      // This should fail when trying to run migrations
      await expect(initializer.initialize()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
