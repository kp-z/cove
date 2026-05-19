/**
 * Transaction Interface
 *
 * Provides a simple transaction abstraction for ensuring atomic operations.
 * This is a placeholder interface that can be implemented with different backends
 * (in-memory, database, etc.)
 */

export interface Transaction {
  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;
}

/**
 * Transaction Manager Interface
 *
 * Manages transaction lifecycle
 */
export interface ITransactionManager {
  /**
   * Begin a new transaction
   */
  begin(): Promise<Transaction>;

  /**
   * Execute a function within a transaction
   * Automatically commits on success, rolls back on error
   */
  withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
