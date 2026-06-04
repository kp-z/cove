/**
 * Metadata Collector Factory
 *
 * Manages lifecycle of ExecutionMetadataCollector instances.
 * Supports optional object pooling for high-throughput scenarios.
 *
 * Features:
 * - Object pooling: Reduces GC pressure
 * - Lifecycle management: Create, reuse, release
 * - Observability: Pool statistics for monitoring
 */

import { ExecutionMetadataCollector } from './collector'

/**
 * Factory configuration
 */
export interface MetadataCollectorFactoryConfig {
  /** Enable object pooling */
  enablePooling?: boolean
  /** Maximum pool size */
  maxPoolSize?: number
}

/**
 * Metadata collector factory with optional pooling
 */
export class MetadataCollectorFactory {
  private pool: ExecutionMetadataCollector[] = []
  private readonly maxPoolSize: number
  private readonly enablePooling: boolean

  constructor(config: MetadataCollectorFactoryConfig = {}) {
    this.enablePooling = config.enablePooling ?? false
    this.maxPoolSize = config.maxPoolSize ?? 10
  }

  /**
   * Create or retrieve a collector from pool
   */
  create(
    adapter: string,
    executionMode: 'streaming' | 'batch'
  ): ExecutionMetadataCollector {
    if (this.enablePooling && this.pool.length > 0) {
      const collector = this.pool.pop()!
      collector.clear()
      return collector
    }

    return new ExecutionMetadataCollector(adapter, executionMode)
  }

  /**
   * Release a collector back to pool
   */
  release(collector: ExecutionMetadataCollector): void {
    if (this.enablePooling && this.pool.length < this.maxPoolSize) {
      collector.clear()
      this.pool.push(collector)
    }
    // Otherwise let GC handle it
  }

  /**
   * Drain the pool (for shutdown)
   */
  drain(): void {
    this.pool = []
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; maxPoolSize: number; utilizationRate: number } {
    return {
      poolSize: this.pool.length,
      maxPoolSize: this.maxPoolSize,
      utilizationRate: this.maxPoolSize > 0 ? this.pool.length / this.maxPoolSize : 0
    }
  }
}
