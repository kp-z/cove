/**
 * Progress Store Tests
 *
 * TDD: 测试流式进度存储
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type {
  IProgressStore,
  ProgressRecord,
  ProgressSummary,
  SaveChunkData
} from '../progress-store.interface'

// Mock 实现用于测试
class MockProgressStore implements IProgressStore {
  private chunks: Map<string, ProgressRecord[]> = new Map()
  private summaries: Map<string, ProgressSummary> = new Map()

  async saveChunk(data: SaveChunkData): Promise<void> {
    const chunks = this.chunks.get(data.messageId) || []

    const chunk: ProgressRecord = {
      id: `chunk-${Date.now()}-${Math.random()}`,
      messageId: data.messageId,
      channelId: data.channelId,
      agentId: data.agentId,
      chunkIndex: data.chunkIndex,
      chunkContent: data.chunkContent,
      timestamp: new Date(),
      completed: data.completed ?? false
    }

    chunks.push(chunk)
    this.chunks.set(data.messageId, chunks)

    // 更新摘要
    const summary = this.summaries.get(data.messageId)
    if (summary) {
      summary.totalChunks = chunks.length
      summary.completedChunks = chunks.filter(c => c.completed).length
      summary.lastChunkIndex = Math.max(...chunks.map(c => c.chunkIndex))
      summary.completed = data.completed ?? false
      if (data.completed) {
        summary.completedAt = new Date()
      }
    } else {
      this.summaries.set(data.messageId, {
        messageId: data.messageId,
        totalChunks: 1,
        completedChunks: data.completed ? 1 : 0,
        lastChunkIndex: data.chunkIndex,
        completed: data.completed ?? false,
        startedAt: new Date(),
        completedAt: data.completed ? new Date() : undefined
      })
    }
  }

  async getSummary(messageId: string): Promise<ProgressSummary | null> {
    return this.summaries.get(messageId) || null
  }

  async getChunks(messageId: string): Promise<ProgressRecord[]> {
    return (this.chunks.get(messageId) || [])
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
  }

  async getChunksFrom(messageId: string, fromIndex: number): Promise<ProgressRecord[]> {
    return (this.chunks.get(messageId) || [])
      .filter(c => c.chunkIndex >= fromIndex)
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
  }

  async markCompleted(messageId: string): Promise<void> {
    const summary = this.summaries.get(messageId)
    if (summary) {
      summary.completed = true
      summary.completedAt = new Date()
    }

    const chunks = this.chunks.get(messageId) || []
    chunks.forEach(c => c.completed = true)
  }

  async delete(messageId: string): Promise<void> {
    this.chunks.delete(messageId)
    this.summaries.delete(messageId)
  }

  async cleanupCompleted(daysOld: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    let deletedCount = 0
    for (const [messageId, summary] of this.summaries.entries()) {
      if (summary.completed && summary.completedAt && summary.completedAt < cutoffDate) {
        await this.delete(messageId)
        deletedCount++
      }
    }

    return deletedCount
  }

  async close(): Promise<void> {
    // Mock 实现不需要关闭连接
  }
}

describe('ProgressStore', () => {
  let store: MockProgressStore

  beforeEach(() => {
    store = new MockProgressStore()
  })

  afterEach(async () => {
    await store.close()
  })

  describe('保存进度 chunk', () => {
    it('should save chunk', async () => {
      const data: SaveChunkData = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Hello'
      }

      await store.saveChunk(data)

      const chunks = await store.getChunks('msg-1')
      expect(chunks).toHaveLength(1)
      expect(chunks[0].chunkContent).toBe('Hello')
      expect(chunks[0].chunkIndex).toBe(0)
    })

    it('should save multiple chunks in order', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Hello'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 1,
        chunkContent: ' World'
      })

      const chunks = await store.getChunks('msg-1')
      expect(chunks).toHaveLength(2)
      expect(chunks[0].chunkContent).toBe('Hello')
      expect(chunks[1].chunkContent).toBe(' World')
    })

    it('should save chunk with completed flag', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Final chunk',
        completed: true
      })

      const summary = await store.getSummary('msg-1')
      expect(summary?.completed).toBe(true)
      expect(summary?.completedAt).toBeDefined()
    })
  })

  describe('进度摘要', () => {
    it('should get progress summary', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Chunk 1'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 1,
        chunkContent: 'Chunk 2'
      })

      const summary = await store.getSummary('msg-1')
      expect(summary).toBeDefined()
      expect(summary?.totalChunks).toBe(2)
      expect(summary?.lastChunkIndex).toBe(1)
      expect(summary?.completed).toBe(false)
    })

    it('should return null for non-existent message', async () => {
      const summary = await store.getSummary('invalid')
      expect(summary).toBeNull()
    })

    it('should track completion status', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Chunk 1'
      })

      let summary = await store.getSummary('msg-1')
      expect(summary?.completed).toBe(false)

      await store.markCompleted('msg-1')

      summary = await store.getSummary('msg-1')
      expect(summary?.completed).toBe(true)
      expect(summary?.completedAt).toBeDefined()
    })
  })

  describe('获取 chunks', () => {
    it('should get all chunks', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'A'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 1,
        chunkContent: 'B'
      })

      const chunks = await store.getChunks('msg-1')
      expect(chunks).toHaveLength(2)
      expect(chunks[0].chunkContent).toBe('A')
      expect(chunks[1].chunkContent).toBe('B')
    })

    it('should return empty array for non-existent message', async () => {
      const chunks = await store.getChunks('invalid')
      expect(chunks).toHaveLength(0)
    })

    it('should return chunks in order', async () => {
      // 乱序保存
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 2,
        chunkContent: 'C'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'A'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 1,
        chunkContent: 'B'
      })

      const chunks = await store.getChunks('msg-1')
      expect(chunks[0].chunkContent).toBe('A')
      expect(chunks[1].chunkContent).toBe('B')
      expect(chunks[2].chunkContent).toBe('C')
    })
  })

  describe('断点续传', () => {
    it('should get chunks from specific index', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'A'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 1,
        chunkContent: 'B'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 2,
        chunkContent: 'C'
      })

      const chunks = await store.getChunksFrom('msg-1', 1)
      expect(chunks).toHaveLength(2)
      expect(chunks[0].chunkContent).toBe('B')
      expect(chunks[1].chunkContent).toBe('C')
    })

    it('should support resuming from last chunk', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'A'
      })

      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 1,
        chunkContent: 'B'
      })

      const summary = await store.getSummary('msg-1')
      const lastIndex = summary?.lastChunkIndex ?? 0

      // 从最后一个 chunk 之后继续
      const remainingChunks = await store.getChunksFrom('msg-1', lastIndex + 1)
      expect(remainingChunks).toHaveLength(0)

      // 添加新 chunk
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 2,
        chunkContent: 'C'
      })

      const newChunks = await store.getChunksFrom('msg-1', lastIndex + 1)
      expect(newChunks).toHaveLength(1)
      expect(newChunks[0].chunkContent).toBe('C')
    })
  })

  describe('进度删除', () => {
    it('should delete progress', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'A'
      })

      await store.delete('msg-1')

      const chunks = await store.getChunks('msg-1')
      const summary = await store.getSummary('msg-1')

      expect(chunks).toHaveLength(0)
      expect(summary).toBeNull()
    })
  })

  describe('清理已完成的进度', () => {
    it('should cleanup old completed progress', async () => {
      // 创建旧的已完成进度
      await store.saveChunk({
        messageId: 'msg-old',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Old',
        completed: true
      })

      // 手动设置完成时间为 10 天前
      const oldSummary = await store.getSummary('msg-old')
      if (oldSummary) {
        const oldDate = new Date()
        oldDate.setDate(oldDate.getDate() - 10)
        oldSummary.completedAt = oldDate
      }

      // 创建新的已完成进度
      await store.saveChunk({
        messageId: 'msg-new',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'New',
        completed: true
      })

      // 清理 7 天前的记录
      const deletedCount = await store.cleanupCompleted(7)

      expect(deletedCount).toBe(1)

      const oldProgress = await store.getSummary('msg-old')
      const newProgress = await store.getSummary('msg-new')

      expect(oldProgress).toBeNull()
      expect(newProgress).toBeDefined()
    })

    it('should not cleanup incomplete progress', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Incomplete'
      })

      const deletedCount = await store.cleanupCompleted(0)
      expect(deletedCount).toBe(0)

      const summary = await store.getSummary('msg-1')
      expect(summary).toBeDefined()
    })
  })

  describe('流式响应场景', () => {
    it('should handle streaming response', async () => {
      const chunks = ['Hello', ' ', 'World', '!']

      for (let i = 0; i < chunks.length; i++) {
        await store.saveChunk({
          messageId: 'msg-1',
          channelId: 'channel-1',
          agentId: 'agent-1',
          chunkIndex: i,
          chunkContent: chunks[i],
          completed: i === chunks.length - 1
        })
      }

      const allChunks = await store.getChunks('msg-1')
      expect(allChunks).toHaveLength(4)

      const fullContent = allChunks.map(c => c.chunkContent).join('')
      expect(fullContent).toBe('Hello World!')

      const summary = await store.getSummary('msg-1')
      expect(summary?.completed).toBe(true)
    })
  })
})
