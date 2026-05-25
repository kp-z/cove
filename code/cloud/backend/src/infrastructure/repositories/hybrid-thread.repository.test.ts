/**
 * HybridThreadRepository Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HybridThreadRepository } from './hybrid-thread.repository';
import { ThreadEntity } from '../../domain/models/thread/thread.entity';
import { TestDatabaseHelper } from './test-database.helper';
import { StorageService } from '../storage/storage.service';
import path from 'path';
import fs from 'fs/promises';

const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('HybridThreadRepository', () => {
  let testDb: TestDatabaseHelper;
  let repository: HybridThreadRepository;
  let storageService: StorageService;
  let testStorageRoot: string;

  beforeEach(async () => {
    testDb = new TestDatabaseHelper();
    await testDb.setup();

    testStorageRoot = path.join(process.cwd(), '.test-storage', `test-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });

    storageService = new StorageService(testStorageRoot);
    repository = new HybridThreadRepository(testDb.prisma, storageService, mockLogger);

    // Create test realm first
    await testDb.createTestRealm('test-realm-1');

    // Create test channel
    await testDb.prisma.channel.create({
      data: {
        id: 'channel-1',
        realmId: 'test-realm-1',
        name: 'test-channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        membersData: JSON.stringify([]),
        agentPool: JSON.stringify({ agents: [], maxAgents: 10 }),
        taskPool: JSON.stringify({ tasks: [], maxTasks: 100 }),
        conversationPool: JSON.stringify([]),
        communicationRules: JSON.stringify({ allowMentions: true }),
        workspace: JSON.stringify({ root: '/workspace' }),
        metaTags: JSON.stringify([]),
        createdById: 'user-1',
        createdByType: 'user',
        messageCount: 0,
        memberCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  const createTestThread = (overrides?: Partial<any>): ThreadEntity => {
    return ThreadEntity.create({
      threadId: 'thread-1',
      channelId: 'channel-1',
      rootMessageId: 'thread-1',
      participants: ['user-1', 'user-2'],
      replyCount: 0,
      lastReplyAt: undefined,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    });
  };

  describe('save', () => {
    it('should save a new thread', async () => {
      const thread = createTestThread();

      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found).not.toBeNull();
      expect(found!.threadId).toBe('thread-1');
      expect(found!.channelId).toBe('channel-1');
      expect(found!.rootMessageId).toBe('thread-1');
      expect(found!.participants).toEqual(['user-1', 'user-2']);
      expect(found!.replyCount).toBe(0);
    });

    it('should save thread with reply count', async () => {
      const thread = createTestThread({ replyCount: 5 });

      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.replyCount).toBe(5);
    });

    it('should save thread with lastReplyAt', async () => {
      const lastReplyAt = new Date('2026-01-02T00:00:00Z');
      const thread = createTestThread({ lastReplyAt });

      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.lastReplyAt).toEqual(lastReplyAt);
    });

    it('should save thread without lastReplyAt', async () => {
      const thread = createTestThread({ lastReplyAt: undefined });

      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.lastReplyAt).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update an existing thread', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      const updatedThread = thread.addReply();
      await repository.update(updatedThread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.replyCount).toBe(1);
      expect(found!.lastReplyAt).toBeDefined();
    });

    it('should update thread participants', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      const updatedThread = thread.addParticipant('user-3');
      await repository.update(updatedThread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.participants).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should handle multiple replies', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      let updated = thread.addReply();
      await repository.update(updated, 'realm-1');

      updated = updated.addReply();
      await repository.update(updated, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.replyCount).toBe(2);
    });
  });

  describe('findById', () => {
    it('should find thread by id', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');

      expect(found).not.toBeNull();
      expect(found!.threadId).toBe('thread-1');
    });

    it('should return null if thread not found', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByChannel', () => {
    beforeEach(async () => {
      // Create multiple threads in the same channel
      const thread1 = createTestThread({
        threadId: 'thread-1',
        rootMessageId: 'thread-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const thread2 = createTestThread({
        threadId: 'thread-2',
        rootMessageId: 'thread-2',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });
      const thread3 = createTestThread({
        threadId: 'thread-3',
        rootMessageId: 'thread-3',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });

      await repository.save(thread1, 'realm-1');
      await repository.save(thread2, 'realm-1');
      await repository.save(thread3, 'realm-1');
    });

    it('should find all threads in a channel', async () => {
      const threads = await repository.findByChannel('channel-1');

      expect(threads).toHaveLength(3);
    });

    it('should return threads in descending order by creation time', async () => {
      const threads = await repository.findByChannel('channel-1');

      expect(threads[0].threadId).toBe('thread-3');
      expect(threads[1].threadId).toBe('thread-2');
      expect(threads[2].threadId).toBe('thread-1');
    });

    it('should return empty array if no threads in channel', async () => {
      const threads = await repository.findByChannel('non-existent-channel');

      expect(threads).toHaveLength(0);
    });
  });

  describe('findByRootMessage', () => {
    it('should find thread by root message id', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      const found = await repository.findByRootMessage('thread-1');

      expect(found).not.toBeNull();
      expect(found!.threadId).toBe('thread-1');
      expect(found!.rootMessageId).toBe('thread-1');
    });

    it('should return null if thread not found', async () => {
      const found = await repository.findByRootMessage('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a thread', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      await repository.delete('thread-1');

      const found = await repository.findById('thread-1');
      expect(found).toBeNull();
    });

    it('should not throw error when deleting non-existent thread', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true if thread exists', async () => {
      const thread = createTestThread();
      await repository.save(thread, 'realm-1');

      const exists = await repository.exists('thread-1');

      expect(exists).toBe(true);
    });

    it('should return false if thread does not exist', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('Thread Participants', () => {
    it('should handle thread with single participant', async () => {
      const thread = createTestThread({ participants: ['user-1'] });
      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.participants).toEqual(['user-1']);
    });

    it('should handle thread with multiple participants', async () => {
      const thread = createTestThread({ participants: ['user-1', 'user-2', 'user-3'] });
      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.participants).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should not add duplicate participants', async () => {
      const thread = createTestThread({ participants: ['user-1', 'user-2'] });
      await repository.save(thread, 'realm-1');

      const updated = thread.addParticipant('user-1');
      await repository.update(updated, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.participants).toEqual(['user-1', 'user-2']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle thread with zero replies', async () => {
      const thread = createTestThread({ replyCount: 0 });
      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.replyCount).toBe(0);
    });

    it('should handle thread with empty participants array', async () => {
      const thread = createTestThread({ participants: [] });
      await repository.save(thread, 'realm-1');

      const found = await repository.findById('thread-1');
      expect(found!.participants).toEqual([]);
    });

    it('should enforce threadId equals rootMessageId constraint', async () => {
      expect(() => {
        ThreadEntity.create({
          threadId: 'thread-1',
          channelId: 'channel-1',
          rootMessageId: 'different-id',
          participants: [],
          replyCount: 0,
          createdAt: new Date(),
        });
      }).toThrow('Thread ID must equal root message ID');
    });
  });
});
