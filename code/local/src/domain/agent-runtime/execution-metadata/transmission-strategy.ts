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
import type { ILogger } from '../../../infrastructure/logger'

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
  logger?: ILogger
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
  private readonly logger: ILogger

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly config: TransmissionStrategyConfig = {}
  ) {
    this.logger = config.logger ?? {
      debug: () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      setLevel: () => {},
      scope: () => this.logger,
    }
  }

  /**
   * Transmit thinking chunk
   */
  async transmitThinking(task: MessageTask, chunk: string): Promise<void> {
    try {
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        agentId: task.metadata?.agentId || 'unknown',
        chunk
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'thinking', chunk)
      this.logger.warn('⚠️  Failed to transmit thinking chunk', { error: (error as Error).message })
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
        agentId: task.metadata?.agentId || 'unknown',
        chunk: JSON.stringify({ type: 'tool_use', data: toolLog })
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'tool', toolLog)
      this.logger.warn('⚠️  Failed to transmit tool use', { error: (error as Error).message })
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
        agentId: task.metadata?.agentId || 'unknown',
        chunk: JSON.stringify({ type: 'usage', data: usage })
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'usage', usage)
      this.logger.warn('⚠️  Failed to transmit usage', { error: (error as Error).message })
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
        agentId: task.metadata?.agentId || 'unknown',
        chunk: JSON.stringify({ type: 'status', data: { status } })
      })
    } catch (error) {
      this.recordFailure(task.messageId, 'status', { status })
      this.logger.warn('⚠️  Failed to transmit status', { error: (error as Error).message })
    }
  }

  /**
   * Prepare final metadata (with retry of failed transmissions)
   * Returns whether there were any transmission failures
   */
  async prepareFinalization(
    task: MessageTask
  ): Promise<{ hadTransmissionFailures: boolean }> {
    // Retry failed transmissions if enabled
    if (this.config.enableRetry) {
      await this.retryFailedTransmissions(task)
    }

    const hadTransmissionFailures = this.failedTransmissions.has(task.messageId)

    // Clean up
    this.failedTransmissions.delete(task.messageId)

    return { hadTransmissionFailures }
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

    this.logger.debug(`🔄 Retrying ${failures.length} failed transmission(s)`)

    // Limit to first 10 failures to avoid overwhelming the backend
    const toRetry = failures.slice(0, 10)

    for (const failure of toRetry) {
      if (failure.attempts >= maxRetries) {
        this.logger.warn(`⚠️  Max retries exceeded for transmission`, { type: failure.type })
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
        this.logger.warn(`⚠️  Retry failed`, { type: failure.type, error: (error as Error).message })
      }

      // Rate limiting
      if (retryDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
    }
  }
}
