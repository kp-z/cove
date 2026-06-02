/**
 * SQLite Progress Store Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '../../../generated/client'
import { SqliteProgressStore } from '../sqlite-progress-store'

describe('SqliteProgressStore', () => {
  let prisma: PrismaClient
  let store: SqliteProgressStore

  beforeEach(async () => {
    prisma = new PrismaClient()
    store = new SqliteProgressStore(prisma)
    await prisma.progressRecord.deleteMany()
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  describe('saveChunk', () => {
    it('should save a chunk', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Hello'
      })

      const chunks = await store.getChunks('msg-1')
      expect(chunks).toHaveLength(1)
      expect(chunks[0].chunkContent).toBe('Hello')
    })

    it('should save multiple chunks', async () => {
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
    })
  })

  describe('getSummary', () => {
    it('should return summary', async () => {
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

      const summary = await store.getSummary('msg-1')
      expect(summary).toBeDefined()
      expect(summary!.totalChunks).toBe(2)
      expect(summary!.lastChunkIndex).toBe(1)
      expect(summary!.completed).toBe(false)
    })

    it('should return null for non-existent message', async () => {
      const summary = await store.getSummary('non-existent')
      expect(summary).toBeNull()
    })

    it('should show completed status', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Hello',
        completed: true
      })

      const summary = await store.getSummary('msg-1')
      expect(summary!.completed).toBe(true)
    })
  })

  describe('getChunks', () => {
    it('should return chunks in order', async () => {
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 2,
        chunkContent: 'World'
      })
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
        chunkContent: ' '
      })

      const chunks = await store.getChunks('msg-1')
      expect(chunks).toHaveLength(3)
      expect(chunks[0].chunkIndex).toBe(0)
      expect(chunks[1].chunkIndex).toBe(1)
      expect(chunks[2].chunkIndex).toBe(2)
    })
  })

  describe('getChunksFrom', () => {
    it('should return chunks from specified index', async () => {
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
        chunkContent: ' '
      })
      await store.saveChunk({
        messageId: 'msg-1',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 2,
        chunkContent: 'World'
      })

      const chunks = await store.getChunksFrom('msg-1', 1)
      expect(chunks).toHaveLength(2)
      expect(chunks[0].chunkIndex).toBe(1)
      expect(chunks[1].chunkIndex).toBe(2)
    })
  })

  describe('markCompleted', () => {
    it('should mark last chunk as completed', async () => {
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

      await store.markCompleted('msg-1')

      const summary = await store.getSummary('msg-1')
      expect(summary!.completed).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete all chunks for a message', async () => {
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

      await store.delete('msg-1')

      const chunks = await store.getChunks('msg-1')
      expect(chunks).toHaveLength(0)
    })
  })

  describe('cleanupCompleted', () => {
    it('should cleanup old completed records', async () => {
      // Create old completed record
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10)

      await prisma.progressRecord.create({
        data: {
          id: 'old-1',
          messageId: 'msg-old',
          channelId: 'channel-1',
          agentId: 'agent-1',
          chunkIndex: 0,
          chunkContent: 'Old',
          completed: true,
          timestamp: oldDate
        }
      })

      // Create recent completed record
      await store.saveChunk({
        messageId: 'msg-recent',
        channelId: 'channel-1',
        agentId: 'agent-1',
        chunkIndex: 0,
        chunkContent: 'Recent',
        completed: true
      })

      const deleted = await store.cleanupCompleted(7)
      expect(deleted).toBe(1)

      const oldChunks = await store.getChunks('msg-old')
      expect(oldChunks).toHaveLength(0)

      const recentChunks = await store.getChunks('msg-recent')
      expect(recentChunks).toHaveLength(1)
    })
  })
})
