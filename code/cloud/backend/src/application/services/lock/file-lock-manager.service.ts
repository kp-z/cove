import * as lockfile from 'proper-lockfile';
import { ILockManager, LockOptions } from './lock-manager.interface';

/**
 * File Lock Manager
 *
 * Uses proper-lockfile to provide file-based locking
 */
export class FileLockManager implements ILockManager {
  private locks: Map<string, () => Promise<void>> = new Map();

  async acquire(key: string, options?: LockOptions): Promise<void> {
    const timeout = options?.timeout || 5000;
    const retryInterval = options?.retryInterval || 100;

    const startTime = Date.now();

    while (true) {
      try {
        // Try to acquire lock
        const release = await lockfile.lock(key, {
          retries: {
            retries: 0, // We handle retries ourselves
          },
          stale: 10000, // Consider lock stale after 10 seconds
        });

        // Store release function
        this.locks.set(key, release);
        return;
      } catch (error: any) {
        // Check if timeout exceeded
        if (Date.now() - startTime >= timeout) {
          throw new Error(`Failed to acquire lock on ${key} within ${timeout}ms`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }
  }

  async release(key: string): Promise<void> {
    const release = this.locks.get(key);
    if (!release) {
      // Lock not held, nothing to do
      return;
    }

    try {
      await release();
      this.locks.delete(key);
    } catch (error) {
      // Lock might have been released already or file deleted
      this.locks.delete(key);
    }
  }

  async withLock<T>(key: string, fn: () => Promise<T>, options?: LockOptions): Promise<T> {
    await this.acquire(key, options);
    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }
}
