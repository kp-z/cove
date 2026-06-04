/**
 * Metadata Plugin Interface
 *
 * Allows extending metadata collection with custom logic.
 * Plugins can hook into collection events and contribute additional metadata.
 */

import type { ToolUseMetadata, UsageMetadata } from './types'

/**
 * Metadata collection plugin
 */
export interface MetadataPlugin {
  /** Plugin identifier */
  readonly name: string
  /** Execution priority (lower executes first) */
  readonly priority: number

  /**
   * Called when collection starts
   */
  onCollectionStart?(context: { adapter: string; executionMode: string }): Promise<void> | void

  /**
   * Called when a thinking chunk is recorded
   */
  onThinking?(chunk: string): Promise<void> | void

  /**
   * Called when a tool use is recorded
   */
  onToolUse?(toolLog: ToolUseMetadata): Promise<void> | void

  /**
   * Called when usage is recorded
   */
  onUsage?(usage: UsageMetadata): Promise<void> | void

  /**
   * Called when building final metadata
   * @returns Additional metadata to include in the final result
   */
  onBuildMetadata?(): Promise<Record<string, any>> | Record<string, any>
}
