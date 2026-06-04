/**
 * Resilient Transmission Strategy
 *
 * Handles network transmission of metadata with error isolation and retry.
 *
 * Key features:
 * - Error isolation: Collection continues even if transmission fails
 * - Retry mechanism: Failed transmissions are retried on final save
 * - Observability: Tracks transmission failures
 * - Non-blocking: Transmission failures don't block metadata collection
 */

import type { BackendGateway } from '../../../infrastructure/gateway/backend-gateway.interface'
import type { MessageTask } from '../message-orchestrator.interface'
import type { ExecutionMetadata, ToolUseMetadata, UsageMetadata } from './types'

/**
 * Transmission strategy configuration
 */
export interface TransmissionStrategyConfig {
  /** Enable retry of failed transmissions */
  enableRetry?: boolean
  /** Maximum retry attempts */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  retryDelayMs?: number
}

/**
 * Failed transmission record
 */
interface FailedTransmission {
  type: 'thinking' | 'tool' | 'usage' | 'status'
  data: any
  attempts: number
}

/**
 * Resilient transmission strategy with error isolation
 */
export class ResilientTransmissionStrategy {
  private failedTransmissions: Map<string, FailedTransmission[]> = new Map()

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly config: TransmissionStrategyConfig = {}
  ) {}

  /**
   * Transmit thinking chunk
   */
  async transmitThinking(task: MessageTask, chunk: string): Promise<void> {
    try {
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'thinking', chunk)
      console.warn('[TransmissionStrategy] Failed to transmit thinking chunk:', error)
      // Don't throw - collection continues
    }
  }

  /**
   * Transmit tool use
   */
  async transmitToolUse(task: MessageTask, toolLog: ToolUseMetadata): Promise<void> {
    try {
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({ type: 'tool_use', data: toolLog })
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'tool', toolLog)
      console.warn('[TransmissionStrategy] Failed to transmit tool use:', error)
    }
  }

  /**
   * Transmit usage
   */
  async transmitUsage(task: MessageTask, usage: UsageMetadata): Promise<void> {
    try {
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({ type: 'usage', data: usage })
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'usage', usage)
      console.warn('[TransmissionStrategy] Failed to transmit usage:', error)
    }
  }

  /**
   * Transmit status change
   */
  async transmitStatus(task: MessageTask, status: string): Promise<void> {
    try {
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({ type: 'status', data: { status } })
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'status', { status })
      console.warn('[TransmissionStrategy] Failed to transmit status:', error)
    }
  }

  /**
   * Transmit final metadata (with retry of failed transmissions)
   */
  async transmitFinalMetadata(
    task: MessageTask,
    metadata: ExecutionMetadata
  ): Promise<void> {
    // Retry failed transmissions if enabled
    if (this.config.enableRetry) {
      await this.retryFailedTransmissions(task)
    }

    // Always include complete metadata in final save
    const hadTransmissionFailures = this.failedTransmissions.has(task.messageId)

    await this.backendGateway.saveAgentResponse({
      channelId: task.channelId,
      messageId: task.messageId,
      content: '', // Content is sent separately
      metadata: {
        execution: metadata,
        hadTransmissionFailures
      }
    })

    // Clean up
    this.failedTransmissions.delete(task.messageId)
  }

  /**
   * Get transmission failure statistics
   */
  getFailureStats(messageId: string): {
    totalFailures: number
    byType: Record<string, number>
  } {
    const failures = this.failedTransmissions.get(messageId) || []
    const byType: Record<string, number> = {}

    for (const failure of failures) {
      byType[failure.type] = (byType[failure.type] || 0) + 1
    }

    return {
      totalFailures: failures.length,
      byType
    }
  }

  /**
   * Record failed transmission
   */
  private recordFailure(messageId: string, type: string, data: any): void {
    const failures = this.failedTransmissions.get(messageId) || []
    failures.push({
      type: type as any,
      data,
      attempts: 0
    })
    this.failedTransmissions.set(messageId, failures)
  }

  /**
   * Retry failed transmissions
   */
  private async retryFailedTransmissions(task: MessageTask): Promise<void> {
    const failures = this.failedTransmissions.get(task.messageId)
    if (!failures || failures.length === 0) return

    const maxRetries = this.config.maxRetries ?? 3
    const retryDelayMs = this.config.retryDelayMs ?? 100

    console.log(`[TransmissionStrategy] Retrying ${failures.length} failed transmissions`)

    // Limit to first 10 failures to avoid overwhelming the backend
    const toRetry = failures.slice(0, 10)

    for (const failure of toRetry) {
      if (failure.attempts >= maxRetries) {
        console.warn(`[TransmissionStrategy] Max retries exceeded for ${failure.type}`)
        continue
      }

      failure.attempts++

      try {
        switch (failure.type) {
          case 'thinking':
            await this.transmitThinking(task, failure.data)
            break
          case 'tool':
            await this.transmitToolUse(task, failure.data)
            break
          case 'usage':
            await this.transmitUsage(task, failure.data)
            break
          case 'status':
            await this.transmitStatus(task, failure.data.status)
            break
        }

        // Success - remove from failures
        const index = failures.indexOf(failure)
        if (index > -1) {
          failures.splice(index, 1)
        }
      } catch (error) {
        console.warn(`[TransmissionStrategy] Retry failed for ${failure.type}:`, error)
      }

      // Rate limiting
      if (retryDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
    }
  }
}
