import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HybridMessageRepository } from './hybrid-message.repository';
import { MessageEntity } from '../../domain/models/message/message.entity';
import { TestDatabaseHelper } from './test-database.helper';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('HybridMessageRepository', () => {
  let testDb: TestDatabaseHelper;
  let repository: HybridMessageRepository;
  let storageService: StorageService;
  let mockLogger: ILogger;
  let testStorageRoot: string;

  beforeEach(async () => {
    testDb = new TestDatabaseHelper();
    await testDb.setup();

    // Setup test storage directory
    testStorageRoot = path.join(process.cwd(), '.test-storage', `test-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    storageService = new StorageService(testStorageRoot);
    repository = new HybridMessageRepository(testDb.prisma, storageService, mockLogger);

    // Create test realm first
    await testDb.createTestRealm('test-realm-1');

    // Create test channel for messages
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
    // Cleanup test storage
    try {
      await fs.rm(testStorageRoot, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createTestMessage = (overrides?: Partial<any>): MessageEntity => {
    return MessageEntity.create({
      realmId: 'test-realm-1',
      messageId: 'msg-1',
      msgShortId: 'abc123',
      senderId: 'user-1',
      senderType: 'human',
      senderName: 'Test User',
      channelId: 'channel-1',
      channelName: 'Test Channel',
      threadId: undefined,
      isThreadRoot: false,
      content: 'Test message content',
      contentType: 'text',
      contentFormat: 'plain',
      attachments: [],
      mentions: [],
      references: [],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      reactions: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      deletedAt: undefined,
      meta: {},
      ...overrides,
    });
  };

  describe('save', () => {
    it('should save a new message with content to storage', async () => {
      const message = createTestMessage();

      await repository.save(message, 'realm-1');

      const found = await repository.findById('msg-1');
      expect(found).not.toBeNull();
      expect(found?.messageId).toBe('msg-1');
      expect(found?.msgShortId).toBe('abc123');
      expect(found?.content).toBe('Test message content');
      expect(found?.senderId).toBe('user-1');
      expect(found?.senderType).toBe('human');
      expect(found?.channelId).toBe('channel-1');
    });

    it('should save message with attachments', async () => {
      const message = createTestMessage({
        messageId: 'msg-2',
        msgShortId: 'def456',
        attachments: [
          {
            attachmentId: 'att-1',
            fileName: 'test.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            fileUrl: '/files/test.pdf',
            thumbnailUrl: '/files/test-thumb.jpg',
          },
        ],
      });

      await repository.save(message, 'realm-1');

      const found = await repository.findById('msg-2');
      expect(found?.attachments).toHaveLength(1);
      expect(found?.attachments[0].fileName).toBe('test.pdf');
      expect(found?.attachments[0].fileType).toBe('application/pdf');
    });

    it('should save message with mentions', async () => {
      const message = createTestMessage({
        messageId: 'msg-3',
        msgShortId: 'ghi789',
        content: 'Hello @user-2',
        mentions: [
          {
            mentionType: 'user',
            mentionId: 'user-2',
            mentionName: 'User Two',
            mentionPosition: 6,
          },
        ],
      });

      await repository.save(message, 'realm-1');

      const found = await repository.findById('msg-3');
      expect(found?.mentions).toHaveLength(1);
      expect(found?.mentions[0].mentionId).toBe('user-2');
      expect(found?.mentions[0].mentionName).toBe('User Two');
    });

    it('should save message with reactions', async () => {
      const message = createTestMessage({
        messageId: 'msg-4',
        msgShortId: 'jkl012',
        reactions: [
          {
            emoji: '👍',
            userIds: ['user-1', 'user-2'],
            count: 2,
          },
          {
            emoji: '❤️',
            userIds: ['user-3'],
            count: 1,
          },
        ],
      });

      await repository.save(message, 'realm-1');

      const found = await repository.findById('msg-4');
      expect(found?.reactions).toHaveLength(2);
      expect(found?.reactions[0].emoji).toBe('👍');
      expect(found?.reactions[0].count).toBe(2);
      expect(found?.reactions[1].emoji).toBe('❤️');
    });

    it('should save thread root message', async () => {
      const message = createTestMessage({
        messageId: 'msg-5',
        msgShortId: 'mno345',
        isThreadRoot: true,
      });

      await repository.save(message, 'realm-1');

      const found = await repository.findById('msg-5');
      expect(found?.isThreadRoot).toBe(true);
      expect(found?.threadId).toBeUndefined();
    });

    it('should save thread reply message', async () => {
      // First create thread root
      const rootMessage = createTestMessage({
        messageId: 'msg-root',
        msgShortId: 'root123',
        isThreadRoot: true,
      });
      await repository.save(rootMessage, 'realm-1');

      // Then create reply
      const replyMessage = createTestMessage({
        messageId: 'msg-reply',
        msgShortId: 'reply123',
        threadId: 'msg-root',
        isThreadRoot: false,
      });
      await repository.save(replyMessage, 'realm-1');

      const found = await repository.findById('msg-reply');
      expect(found?.threadId).toBe('msg-root');
      expect(found?.isThreadRoot).toBe(false);
    });
  });

  describe('findById', () => {
    it('should find message by id', async () => {
      const message = createTestMessage();
      await repository.save(message, 'realm-1');

      const found = await repository.findById('msg-1');

      expect(found).not.toBeNull();
      expect(found?.messageId).toBe('msg-1');
    });

    it('should return null for non-existent message', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByChannel', () => {
    it('should find messages by channel id', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        msgShortId: 'abc1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        msgShortId: 'abc2',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        msgShortId: 'abc3',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });

      await repository.save(msg1, 'realm-1');
      await repository.save(msg2, 'realm-1');
      await repository.save(msg3, 'realm-1');

      const found = await repository.findByChannel('channel-1');

      expect(found).toHaveLength(3);
      // Should be ordered by createdAt desc
      expect(found[0].messageId).toBe('msg-3');
      expect(found[1].messageId).toBe('msg-2');
      expect(found[2].messageId).toBe('msg-1');
    });

    it('should support pagination with limit and offset', async () => {
      for (let i = 1; i <= 5; i++) {
        const msg = createTestMessage({
          messageId: `msg-${i}`,
          msgShortId: `abc${i}`,
          createdAt: new Date(`2026-01-0${i}T00:00:00Z`),
        });
        await repository.save(msg, 'realm-1');
      }

      const page1 = await repository.findByChannel('channel-1', 2, 0);
      const page2 = await repository.findByChannel('channel-1', 2, 2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].messageId).toBe('msg-5');
      expect(page1[1].messageId).toBe('msg-4');
      expect(page2[0].messageId).toBe('msg-3');
      expect(page2[1].messageId).toBe('msg-2');
    });

    it('should return empty array when no messages in channel', async () => {
      const found = await repository.findByChannel('non-existent-channel');

      expect(found).toEqual([]);
    });
  });

  describe('findBySender', () => {
    it('should find messages by sender id', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        msgShortId: 'abc1',
        senderId: 'user-1',
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        msgShortId: 'abc2',
        senderId: 'user-1',
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        msgShortId: 'abc3',
        senderId: 'user-2',
      });

      await repository.save(msg1, 'realm-1');
      await repository.save(msg2, 'realm-1');
      await repository.save(msg3, 'realm-1');

      const found = await repository.findBySender('user-1');

      expect(found).toHaveLength(2);
      expect(found.map(m => m.messageId).sort()).toEqual(['msg-1', 'msg-2']);
    });

    it('should return empty array when sender has no messages', async () => {
      const found = await repository.findBySender('non-existent-user');

      expect(found).toEqual([]);
    });
  });

  describe('findByThread', () => {
    it('should find messages by thread id', async () => {
      const rootMsg = createTestMessage({
        messageId: 'msg-root',
        msgShortId: 'root',
        isThreadRoot: true,
      });
      await repository.save(rootMsg, 'realm-1');

      const reply1 = createTestMessage({
        messageId: 'msg-reply-1',
        msgShortId: 'reply1',
        threadId: 'msg-root',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const reply2 = createTestMessage({
        messageId: 'msg-reply-2',
        msgShortId: 'reply2',
        threadId: 'msg-root',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });

      await repository.save(reply1, 'realm-1');
      await repository.save(reply2, 'realm-1');

      const found = await repository.findByThread('msg-root');

      expect(found).toHaveLength(2);
      // Should be ordered by createdAt asc
      expect(found[0].messageId).toBe('msg-reply-1');
      expect(found[1].messageId).toBe('msg-reply-2');
    });

    it('should return empty array when thread has no replies', async () => {
      const found = await repository.findByThread('non-existent-thread');

      expect(found).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find messages by status', async () => {
      const sentMsg = createTestMessage({
        messageId: 'msg-1',
        msgShortId: 'abc1',
        status: 'sent',
      });
      const draftMsg = createTestMessage({
        messageId: 'msg-2',
        msgShortId: 'abc2',
        status: 'draft',
      });
      const failedMsg = createTestMessage({
        messageId: 'msg-3',
        msgShortId: 'abc3',
        status: 'failed',
      });

      await repository.save(sentMsg, 'realm-1');
      await repository.save(draftMsg, 'realm-1');
      await repository.save(failedMsg, 'realm-1');

      const sentMessages = await repository.findByStatus('sent');
      const draftMessages = await repository.findByStatus('draft');

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].status).toBe('sent');
      expect(draftMessages).toHaveLength(1);
      expect(draftMessages[0].status).toBe('draft');
    });
  });

  describe('update', () => {
    it('should update message content', async () => {
      const message = createTestMessage();
      await repository.save(message, 'realm-1');

      const updatedMessage = message.updateContent('Updated content', 'user-1');
      await repository.update(updatedMessage, 'realm-1');

      const found = await repository.findById('msg-1');
      expect(found?.content).toBe('Updated content');
      expect(found?.isEdited).toBe(true);
      expect(found?.editHistory).toHaveLength(1);
    });

    it('should update message reactions', async () => {
      const message = createTestMessage();
      await repository.save(message, 'realm-1');

      const updatedMessage = message.addReaction('👍', 'user-2');
      await repository.update(updatedMessage, 'realm-1');

      const found = await repository.findById('msg-1');
      expect(found?.reactions).toHaveLength(1);
      expect(found?.reactions[0].emoji).toBe('👍');
      expect(found?.reactions[0].userIds).toContain('user-2');
    });

    it('should update message status', async () => {
      const message = createTestMessage({ status: 'draft' });
      await repository.save(message, 'realm-1');

      const updatedMessage = message.updateStatus('sent');
      await repository.update(updatedMessage, 'realm-1');

      const found = await repository.findById('msg-1');
      expect(found?.status).toBe('sent');
    });
  });

  describe('delete', () => {
    it('should delete message', async () => {
      const message = createTestMessage();
      await repository.save(message, 'realm-1');

      await repository.delete('msg-1');

      const found = await repository.findById('msg-1');
      expect(found).toBeNull();
    });

    it('should throw when deleting non-existent message', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when message exists', async () => {
      const message = createTestMessage();
      await repository.save(message, 'realm-1');

      const exists = await repository.exists('msg-1');

      expect(exists).toBe(true);
    });

    it('should return false when message does not exist', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('findByChannelCursor', () => {
    it('should support cursor-based pagination', async () => {
      for (let i = 1; i <= 5; i++) {
        const msg = createTestMessage({
          messageId: `msg-${i}`,
          msgShortId: `abc${i}`,
          createdAt: new Date(`2026-01-0${i}T00:00:00Z`),
        });
        await repository.save(msg, 'realm-1');
      }

      const page1 = await repository.findByChannelCursor('channel-1', null, 2);
      expect(page1.messages).toHaveLength(2);
      expect(page1.messages[0].messageId).toBe('msg-5');
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await repository.findByChannelCursor('channel-1', page1.nextCursor, 2);
      expect(page2.messages).toHaveLength(2);
      expect(page2.messages[0].messageId).toBe('msg-3');
    });

    it('should return null cursor when no more messages', async () => {
      const msg = createTestMessage();
      await repository.save(msg, 'realm-1');

      const result = await repository.findByChannelCursor('channel-1', null, 10);

      expect(result.messages).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('countRecentByChannelAndSender', () => {
    it('should count recent messages by channel and sender', async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      const recentMsg = createTestMessage({
        messageId: 'msg-1',
        msgShortId: 'abc1',
        senderId: 'user-1',
        createdAt: fiveMinutesAgo,
      });
      const oldMsg = createTestMessage({
        messageId: 'msg-2',
        msgShortId: 'abc2',
        senderId: 'user-1',
        createdAt: tenMinutesAgo,
      });

      await repository.save(recentMsg, 'realm-1');
      await repository.save(oldMsg, 'realm-1');

      const count = await repository.countRecentByChannelAndSender('channel-1', 'user-1', 7);

      expect(count).toBe(1); // Only the message from 5 minutes ago
    });

    it('should return 0 when no recent messages', async () => {
      const count = await repository.countRecentByChannelAndSender('channel-1', 'user-1', 5);

      expect(count).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should log errors on save failure', async () => {
      const message = createTestMessage();
      await repository.save(message, 'realm-1');

      // Try to save duplicate
      await expect(repository.save(message, 'realm-1')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log errors on update failure', async () => {
      const message = createTestMessage();

      // Try to update non-existent message
      await expect(repository.update(message, 'realm-1')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
