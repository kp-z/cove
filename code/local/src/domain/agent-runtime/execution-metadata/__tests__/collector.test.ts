import { describe, it, expect, beforeEach } from 'vitest'
import { ExecutionMetadataCollector } from '../collector'

describe('ExecutionMetadataCollector', () => {
  let collector: ExecutionMetadataCollector

  beforeEach(() => {
    collector = new ExecutionMetadataCollector('test-adapter', 'streaming')
  })

  describe('Thinking Collection', () => {
    it('should collect streaming thinking chunks', async () => {
      collector.recordThinking('Hello')
      collector.recordThinking(' ')
      collector.recordThinking('World')

      const metadata = await collector.build()

      expect(metadata.thinking?.content).toBe('Hello World')
      expect(metadata.thinking?.chunks).toBe(3)
    })

    it('should set complete thinking in batch mode', async () => {
      collector.setCompleteThinking('Complete thinking content')

      const metadata = await collector.build()

      expect(metadata.thinking?.content).toBe('Complete thinking content')
      expect(metadata.thinking?.chunks).toBe(1)
    })

    it('should return undefined when no thinking recorded', async () => {
      const metadata = await collector.build()

      expect(metadata.thinking).toBeUndefined()
    })
  })

  describe('Tool Use Collection', () => {
    it('should collect tool use logs', async () => {
      collector.recordToolUse({
        id: 'tool-1',
        toolName: 'file_reader',
        action: 'read',
        status: 'success',
        duration: 100
      })

      collector.recordToolUse({
        id: 'tool-2',
        toolName: 'file_writer',
        action: 'write',
        status: 'success',
        duration: 150
      })

      const metadata = await collector.build()

      expect(metadata.toolUses).toHaveLength(2)
      expect(metadata.toolUses[0].id).toBe('tool-1')
      expect(metadata.toolUses[1].id).toBe('tool-2')
    })

    it('should handle empty tool uses', async () => {
      const metadata = await collector.build()

      expect(metadata.toolUses).toHaveLength(0)
    })
  })

  describe('Usage Collection', () => {
    it('should record usage statistics', async () => {
      collector.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        model: 'test-model'
      })

      const metadata = await collector.build()

      expect(metadata.usage?.inputTokens).toBe(100)
      expect(metadata.usage?.outputTokens).toBe(200)
      expect(metadata.usage?.totalTokens).toBe(300)
      expect(metadata.usage?.model).toBe('test-model')
    })

    it('should handle usage with cost and cache', async () => {
      collector.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        cache: {
          creationTokens: 50,
          readTokens: 30,
          hitRate: 0.3
        },
        cost: {
          inputCost: 0.01,
          outputCost: 0.02,
          cacheCost: 0.005,
          totalCost: 0.035
        }
      })

      const metadata = await collector.build()

      expect(metadata.usage?.cache?.readTokens).toBe(30)
      expect(metadata.usage?.cost?.totalCost).toBe(0.035)
    })
  })

  describe('Status History', () => {
    it('should record status transitions', async () => {
      collector.recordStatus('thinking')
      collector.recordStatus('tool_use')
      collector.recordStatus('responding')
      collector.recordStatus('completed')

      const metadata = await collector.build()

      expect(metadata.statusHistory).toHaveLength(4)
      expect(metadata.statusHistory[0].status).toBe('thinking')
      expect(metadata.statusHistory[3].status).toBe('completed')
    })
  })

  describe('Metadata Build', () => {
    it('should build complete metadata', async () => {
      collector.recordThinking('Test thinking')
      collector.recordToolUse({
        id: 'tool-1',
        toolName: 'test_tool',
        action: 'test',
        status: 'success'
      })
      collector.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300
      })
      collector.recordStatus('completed')

      const metadata = await collector.build()

      expect(metadata.executionMode).toBe('streaming')
      expect(metadata.adapter).toBe('test-adapter')
      expect(metadata.timestamp).toBeDefined()
      expect(metadata.processingTime).toBeGreaterThanOrEqual(0)
      expect(metadata.thinking).toBeDefined()
      expect(metadata.toolUses).toHaveLength(1)
      expect(metadata.usage).toBeDefined()
      expect(metadata.statusHistory).toHaveLength(1)
    })
  })

  describe('Clear and Reuse', () => {
    it('should clear all state', async () => {
      collector.recordThinking('Test')
      collector.recordUsage({
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300
      })

      collector.clear()

      const metadata = await collector.build()

      expect(metadata.thinking).toBeUndefined()
      expect(metadata.usage).toBeUndefined()
      expect(metadata.toolUses).toHaveLength(0)
      expect(metadata.statusHistory).toHaveLength(0)
    })
  })
})
