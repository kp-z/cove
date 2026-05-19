import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileLockManager } from '../../../src/application/services/lock/file-lock-manager.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FileLockManager', () => {
  let lockManager: FileLockManager;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    lockManager = new FileLockManager();
    // Create a temporary directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lock-test-'));
    testFile = path.join(testDir, 'test.lock');
    // Create the test file
    await fs.writeFile(testFile, 'test content');
  });

  afterEach(async () => {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('acquire and release', () => {
    it('should acquire and release lock successfully', async () => {
      await lockManager.acquire(testFile);
      await lockManager.release(testFile);

      // Should be able to acquire again after release
      await lockManager.acquire(testFile);
      await lockManager.release(testFile);
    });

    it('should throw error when lock cannot be acquired within timeout', async () => {
      // Acquire lock first
      await lockManager.acquire(testFile);

      // Try to acquire again with short timeout
      const lockManager2 = new FileLockManager();
      await expect(
        lockManager2.acquire(testFile, { timeout: 500, retryInterval: 100 })
      ).rejects.toThrow('Failed to acquire lock');

      // Clean up
      await lockManager.release(testFile);
    }, 10000);

    it('should handle release of non-existent lock gracefully', async () => {
      // Should not throw
      await expect(
        lockManager.release('non-existent-file')
      ).resolves.toBeUndefined();
    });
  });

  describe('withLock', () => {
    it('should execute function with lock held', async () => {
      let executed = false;

      const result = await lockManager.withLock(testFile, async () => {
        executed = true;
        return 'success';
      });

      expect(executed).toBe(true);
      expect(result).toBe('success');
    });

    it('should release lock even if function throws', async () => {
      await expect(
        lockManager.withLock(testFile, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      // Should be able to acquire lock again
      await lockManager.acquire(testFile);
      await lockManager.release(testFile);
    });

    it('should prevent concurrent access', async () => {
      const results: number[] = [];

      // Start first operation
      const promise1 = lockManager.withLock(testFile, async () => {
        results.push(1);
        await new Promise(resolve => setTimeout(resolve, 100));
        results.push(2);
      });

      // Wait a bit to ensure first lock is acquired
      await new Promise(resolve => setTimeout(resolve, 50));

      // Start second operation - should wait for first to complete
      const lockManager2 = new FileLockManager();
      const promise2 = lockManager2.withLock(testFile, async () => {
        results.push(3);
        await new Promise(resolve => setTimeout(resolve, 100));
        results.push(4);
      }, { timeout: 2000 });

      await Promise.all([promise1, promise2]);

      // Results should be sequential, not interleaved
      expect(results).toEqual([1, 2, 3, 4]);
    }, 10000);
  });
});
