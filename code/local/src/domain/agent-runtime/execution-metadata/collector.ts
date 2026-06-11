/**
 * Execution Metadata Collector
 *
 * Collects and aggregates execution metadata during agent runtime.
 * Supports both streaming (incremental) and batch (complete) modes.
 *
 * Key features:
 * - Memory-efficient: Uses array for thinking chunks
 * - Plugin support: Extensible via MetadataPlugin interface
 * - Reusable: Can be cleared and reused via object pooling
 * - Type-safe: Strongly typed metadata structures
 */

import type {
  ExecutionMetadata,
  ThinkingMetadata,
  ToolUseMetadata,
  UsageMetadata,
  StatusEvent
} from './types'
import type { MetadataPlugin } from './plugin.interface'

/**
 * Execution metadata collector
 */
export class ExecutionMetadataCollector {
  private thinkingBuffer: string[] = []
  private thinkingChunks = 0
  private firstTokenTimestamp?: number
  // 正文块计数（onContent 通道）。正文最终以 generateResponse 返回值/落库为权威，
  // collector 仅统计块数与首块时间，不缓存正文内容、不污染 thinking。
  private contentChunks = 0
  private toolUses: Map<string, ToolUseMetadata> = new Map()
  private usage?: UsageMetadata
  private statusHistory: StatusEvent[] = []
  private startTime: number
  private plugins: MetadataPlugin[] = []

  constructor(
    private readonly adapter: string,
    private readonly executionMode: 'streaming' | 'batch'
  ) {
    this.startTime = Date.now()
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: MetadataPlugin): void {
    this.plugins.push(plugin)
    this.plugins.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Record thinking chunk (streaming mode)
   */
  recordThinking(chunk: string): void {
    if (!this.firstTokenTimestamp) {
      this.firstTokenTimestamp = Date.now()
    }
    this.thinkingBuffer.push(chunk)
    this.thinkingChunks++

    // Trigger plugins
    for (const plugin of this.plugins) {
      try {
        plugin.onThinking?.(chunk)
      } catch (error) {
        console.warn(`Plugin ${plugin.name} failed on thinking:`, error)
      }
    }
  }

  /**
   * Set complete thinking (batch mode)
   */
  setCompleteThinking(content: string): void {
    this.thinkingBuffer = [content]
    this.thinkingChunks = 1
  }

  /**
   * Record content chunk (streaming mode, body text via onContent channel)
   *
   * 记录正文增量统计：累计块数，并在首块时设置 first-token 时间戳（用于首字延迟）。
   * 注意：不缓存正文内容，最终正文以 adapter 返回值/落库为权威，避免重复存储与污染 thinking。
   */
  recordContent(_chunk: string): void {
    if (!this.firstTokenTimestamp) {
      this.firstTokenTimestamp = Date.now()
    }
    this.contentChunks++
  }

  /**
   * Record tool use
   */
  recordToolUse(toolLog: ToolUseMetadata): void {
    this.toolUses.set(toolLog.id, toolLog)

    // Trigger plugins
    for (const plugin of this.plugins) {
      try {
        plugin.onToolUse?.(toolLog)
      } catch (error) {
        console.warn(`Plugin ${plugin.name} failed on tool use:`, error)
      }
    }
  }

  /**
   * Record usage statistics
   */
  recordUsage(usage: UsageMetadata): void {
    this.usage = usage

    // Trigger plugins
    for (const plugin of this.plugins) {
      try {
        plugin.onUsage?.(usage)
      } catch (error) {
        console.warn(`Plugin ${plugin.name} failed on usage:`, error)
      }
    }
  }

  /**
   * Record status change
   */
  recordStatus(status: StatusEvent['status']): void {
    this.statusHistory.push({
      status,
      timestamp: Date.now() - this.startTime
    })
  }

  /**
   * Build final metadata object
   */
  async build(): Promise<ExecutionMetadata> {
    const thinking: ThinkingMetadata | undefined =
      this.thinkingBuffer.length > 0
        ? {
            content: this.thinkingBuffer.join(''),
            chunks: this.thinkingChunks,
            firstTokenMs: this.firstTokenTimestamp
              ? this.firstTokenTimestamp - this.startTime
              : undefined
          }
        : undefined

    // Collect plugin metadata
    const pluginMetadata: Record<string, any> = {}
    for (const plugin of this.plugins) {
      if (plugin.onBuildMetadata) {
        try {
          const data = await plugin.onBuildMetadata()
          if (data) {
            pluginMetadata[plugin.name] = data
          }
        } catch (error) {
          console.warn(`Plugin ${plugin.name} failed on build:`, error)
        }
      }
    }

    return {
      thinking,
      toolUses: Array.from(this.toolUses.values()),
      usage: this.usage,
      statusHistory: this.statusHistory,
      executionMode: this.executionMode,
      adapter: this.adapter,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - this.startTime,
      plugins: Object.keys(pluginMetadata).length > 0 ? pluginMetadata : undefined
    }
  }

  /**
   * Clear collected data (for reuse in object pooling)
   */
  clear(): void {
    this.thinkingBuffer = []
    this.thinkingChunks = 0
    this.contentChunks = 0
    this.firstTokenTimestamp = undefined
    this.toolUses.clear()
    this.usage = undefined
    this.statusHistory = []
    this.startTime = Date.now()
    // Note: plugins are not cleared - they persist across reuses
  }
}
