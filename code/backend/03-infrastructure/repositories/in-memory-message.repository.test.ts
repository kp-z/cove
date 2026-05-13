import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMessageRepository } from './in-memory-message.repository';
import { MessageEntity } from '../../01-domain/models/message/message.entity';

describe('InMemoryMessageRepository', () => {
  let repository: InMemoryMessageRepository;

  // Test data factory
  const createTestMessage = (overrides: Partial<any> = {}) => {
    const defaults = {
      messageId: 'msg-001',
      msgShortId: 'a1b2c3d4',
      senderId: 'user-001',
      senderType: 'human' as const,
      senderName: 'kp-user',
      channelId: 'channel-001',
      channelName: '#general',
      threadId: undefined,
      isThreadRoot: false,
      content: 'Hello world',
      contentType: 'text' as const,
      contentFormat: 'plain' as const,
      attachments: [],
      mentions: [],
      references: [],
      status: 'sent' as const,
      isEdited: false,
      editHistory: [],
      reactions: [],
      createdAt: new Date('2026-05-02T10:00:00Z'),
      updatedAt: new Date('2026-05-02T10:00:00Z'),
      meta: {
        client: 'web',
        isPinned: false,
        isImportant: false,
      },
    };

    return MessageEntity.create({ ...defaults, ...overrides });
  };

  beforeEach(() => {
    repository = new InMemoryMessageRepository();
  });

  describe('save', () => {
    it('should save a new message', async () => {
      const message = createTestMessage();

      await repository.save(message);

      const found = await repository.findById(message.messageId);
      expect(found).toBeDefined();
      expect(found?.messageId).toBe(message.messageId);
      expect(found?.content).toBe(message.content);
    });

    it('should throw error when saving duplicate message', async () => {
      const message = createTestMessage();

      await repository.save(message);

      await expect(repository.save(message)).rejects.toThrow(
        'Message with ID msg-001 already exists'
      );
    });

    it('should increment count after save', async () => {
      const message = createTestMessage();

      expect(repository.count()).toBe(0);
      await repository.save(message);
      expect(repository.count()).toBe(1);
    });
  });

  describe('findById', () => {
    it('should find message by id', async () => {
      const message = createTestMessage();
      await repository.save(message);

      const found = await repository.findById('msg-001');

      expect(found).toBeDefined();
      expect(found?.messageId).toBe('msg-001');
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
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        channelId: 'channel-002',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findByChannel('channel-001');

      expect(found).toHaveLength(2);
      expect(found.map(m => m.messageId)).toContain('msg-1');
      expect(found.map(m => m.messageId)).toContain('msg-2');
      expect(found.map(m => m.messageId)).not.toContain('msg-3');
    });

    it('should return messages in descending order by creation time', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findByChannel('channel-001');

      expect(found[0].messageId).toBe('msg-3'); // Most recent first
      expect(found[1].messageId).toBe('msg-2');
      expect(found[2].messageId).toBe('msg-1');
    });

    it('should support pagination with limit', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findByChannel('channel-001', 2);

      expect(found).toHaveLength(2);
      expect(found[0].messageId).toBe('msg-3');
      expect(found[1].messageId).toBe('msg-2');
    });

    it('should support pagination with offset', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        channelId: 'channel-001',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findByChannel('channel-001', 2, 1);

      expect(found).toHaveLength(2);
      expect(found[0].messageId).toBe('msg-2');
      expect(found[1].messageId).toBe('msg-1');
    });

    it('should return empty array for channel with no messages', async () => {
      const found = await repository.findByChannel('non-existent');

      expect(found).toEqual([]);
    });
  });

  describe('findBySender', () => {
    it('should find messages by sender id', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        senderId: 'user-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        senderId: 'user-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        senderId: 'user-002',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findBySender('user-001');

      expect(found).toHaveLength(2);
      expect(found.map(m => m.messageId)).toContain('msg-1');
      expect(found.map(m => m.messageId)).toContain('msg-2');
      expect(found.map(m => m.messageId)).not.toContain('msg-3');
    });

    it('should return messages in descending order by creation time', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        senderId: 'user-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        senderId: 'user-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);

      const found = await repository.findBySender('user-001');

      expect(found[0].messageId).toBe('msg-2'); // Most recent first
      expect(found[1].messageId).toBe('msg-1');
    });

    it('should return empty array for sender with no messages', async () => {
      const found = await repository.findBySender('non-existent');

      expect(found).toEqual([]);
    });
  });

  describe('findByThread', () => {
    it('should find messages by thread id', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        threadId: 'thread-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        threadId: 'thread-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        threadId: 'thread-002',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findByThread('thread-001');

      expect(found).toHaveLength(2);
      expect(found.map(m => m.messageId)).toContain('msg-1');
      expect(found.map(m => m.messageId)).toContain('msg-2');
      expect(found.map(m => m.messageId)).not.toContain('msg-3');
    });

    it('should return messages in ascending order by creation time', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        threadId: 'thread-001',
        createdAt: new Date('2026-05-02T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        threadId: 'thread-001',
        createdAt: new Date('2026-05-02T11:00:00Z'),
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        threadId: 'thread-001',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const found = await repository.findByThread('thread-001');

      expect(found[0].messageId).toBe('msg-1'); // Oldest first in threads
      expect(found[1].messageId).toBe('msg-2');
      expect(found[2].messageId).toBe('msg-3');
    });

    it('should return empty array for thread with no messages', async () => {
      const found = await repository.findByThread('non-existent');

      expect(found).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find messages by status', async () => {
      const msg1 = createTestMessage({
        messageId: 'msg-1',
        status: 'sent',
      });
      const msg2 = createTestMessage({
        messageId: 'msg-2',
        status: 'draft',
      });
      const msg3 = createTestMessage({
        messageId: 'msg-3',
        status: 'sent',
      });

      await repository.save(msg1);
      await repository.save(msg2);
      await repository.save(msg3);

      const sentMessages = await repository.findByStatus('sent');
      const draftMessages = await repository.findByStatus('draft');

      expect(sentMessages).toHaveLength(2);
      expect(sentMessages.map(m => m.messageId)).toContain('msg-1');
      expect(sentMessages.map(m => m.messageId)).toContain('msg-3');

      expect(draftMessages).toHaveLength(1);
      expect(draftMessages[0].messageId).toBe('msg-2');
    });

    it('should return empty array for status with no messages', async () => {
      const found = await repository.findByStatus('failed');

      expect(found).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update existing message', async () => {
      const message = createTestMessage();
      await repository.save(message);

      const updated = message.updateContent('Updated content', 'user-001');
      await repository.update(updated);

      const found = await repository.findById(message.messageId);
      expect(found?.content).toBe('Updated content');
      expect(found?.isEdited).toBe(true);
    });

    it('should throw error when updating non-existent message', async () => {
      const message = createTestMessage();

      await expect(repository.update(message)).rejects.toThrow(
        'Message with ID msg-001 not found'
      );
    });

    it('should not change count after update', async () => {
      const message = createTestMessage();
      await repository.save(message);

      expect(repository.count()).toBe(1);

      const updated = message.updateContent('Updated content', 'user-001');
      await repository.update(updated);

      expect(repository.count()).toBe(1);
    });
  });

  describe('delete', () => {
    it('should soft delete message by marking as deleted', async () => {
      const message = createTestMessage();
      await repository.save(message);

      await repository.delete(message.messageId);

      const found = await repository.findById(message.messageId);
      expect(found).toBeDefined();
      expect(found?.status).toBe('deleted');
    });

    it('should throw error when deleting non-existent message', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow(
        'Message with ID non-existent not found'
      );
    });

    it('should not change count after soft delete', async () => {
      const message = createTestMessage();
      await repository.save(message);

      expect(repository.count()).toBe(1);
      await repository.delete(message.messageId);
      expect(repository.count()).toBe(1); // Soft delete keeps the message
    });
  });

  describe('exists', () => {
    it('should return true for existing message', async () => {
      const message = createTestMessage();
      await repository.save(message);

      const exists = await repository.exists(message.messageId);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent message', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all messages', async () => {
      const msg1 = createTestMessage({ messageId: 'msg-1' });
      const msg2 = createTestMessage({ messageId: 'msg-2' });

      await repository.save(msg1);
      await repository.save(msg2);

      expect(repository.count()).toBe(2);

      repository.clear();

      expect(repository.count()).toBe(0);
      const found = await repository.findByChannel('channel-001');
      expect(found).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return correct count', async () => {
      expect(repository.count()).toBe(0);

      const msg1 = createTestMessage({ messageId: 'msg-1' });
      await repository.save(msg1);
      expect(repository.count()).toBe(1);

      const msg2 = createTestMessage({ messageId: 'msg-2' });
      await repository.save(msg2);
      expect(repository.count()).toBe(2);
    });
  });
});
