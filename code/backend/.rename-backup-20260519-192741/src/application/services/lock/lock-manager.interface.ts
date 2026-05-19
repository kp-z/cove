/**
 * Lock Manager Interface
 *
 * Provides file locking to prevent concurrent write conflicts
 */
export interface ILockManager {
  /**
   * Acquire a lock on a resource
   *
   * @param key - Unique identifier for the resource (e.g., file path)
   * @param options - Lock options
   * @returns Promise that resolves when lock is acquired
   * @throws Error if lock cannot be acquired within timeout
   */
  acquire(key: string, options?: LockOptions): Promise<void>;

  /**
   * Release a lock on a resource
   *
   * @param key - Unique identifier for the resource
   */
  release(key: string): Promise<void>;

  /**
   * Execute a function with a lock held
   *
   * @param key - Unique identifier for the resource
   * @param fn - Function to execute while holding the lock
   * @param options - Lock options
   * @returns Result of the function
   */
  withLock<T>(key: string, fn: () => Promise<T>, options?: LockOptions): Promise<T>;
}

/**
 * Lock options
 */
export interface LockOptions {
  /**
   * Maximum time to wait for lock acquisition (ms)
   * Default: 5000 (5 seconds)
   */
  timeout?: number;

  /**
   * Time between retry attempts (ms)
   * Default: 100
   */
  retryInterval?: number;
}
