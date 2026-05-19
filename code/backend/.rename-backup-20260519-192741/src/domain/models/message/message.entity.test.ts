import { describe, it, expect } from 'vitest';
import { MessageEntity } from './message.entity';

describe('MessageEntity', () => {
  const validProps = {
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

  describe('create', () => {
    it('should create a valid message entity', () => {
      const message = MessageEntity.create(validProps);

      expect(message.messageId).toBe('msg-001');
      expect(message.content).toBe('Hello world');
      expect(message.status).toBe('sent');
    });

    it('should throw error if messageId is empty', () => {
      expect(() =>
        MessageEntity.create({ ...validProps, messageId: '' })
      ).toThrow('Message ID cannot be empty');
    });

    it('should throw error if senderId is empty', () => {
      expect(() =>
        MessageEntity.create({ ...validProps, senderId: '' })
      ).toThrow('Sender ID cannot be empty');
    });

    it('should throw error if content and attachments are both empty', () => {
      expect(() =>
        MessageEntity.create({ ...validProps, content: '', attachments: [] })
      ).toThrow('Message must have either content or attachments');
    });

    it('should allow empty content if attachments exist', () => {
      const message = MessageEntity.create({
        ...validProps,
        content: '',
        attachments: [
          {
            attachmentId: 'attach-001',
            fileName: 'test.png',
            fileType: 'image/png',
            fileSize: 1024,
            fileUrl: '/attachments/test.png',
          },
        ],
      });

      expect(message.content).toBe('');
      expect(message.attachments.length).toBe(1);
    });
  });

  describe('type checks', () => {
    it('should correctly identify sender type', () => {
      const message = MessageEntity.create(validProps);
      expect(message.isFromHuman()).toBe(true);
      expect(message.isFromAgent()).toBe(false);
      expect(message.isFromSystem()).toBe(false);
    });

    it('should correctly identify status', () => {
      const message = MessageEntity.create(validProps);
      expect(message.isSent()).toBe(true);
      expect(message.isDraft()).toBe(false);
      expect(message.isDeleted()).toBe(false);
    });
  });

  describe('content updates', () => {
    it('should update content and track edit history', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.updateContent('Updated content', 'user-001');

      expect(updated.content).toBe('Updated content');
      expect(updated.isEdited).toBe(true);
      expect(updated.editHistory.length).toBe(1);
      expect(updated.editHistory[0].previousContent).toBe('Hello world');
    });
  });

  describe('reactions', () => {
    it('should add reaction', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.addReaction('👍', 'user-001');

      expect(updated.reactions.length).toBe(1);
      expect(updated.reactions[0].emoji).toBe('👍');
      expect(updated.reactions[0].count).toBe(1);
    });

    it('should add user to existing reaction', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001'], count: 1 }],
      });

      const updated = message.addReaction('👍', 'user-002');
      expect(updated.reactions[0].count).toBe(2);
      expect(updated.reactions[0].userIds).toContain('user-002');
    });

    it('should not add duplicate reaction from same user', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001'], count: 1 }],
      });

      const updated = message.addReaction('👍', 'user-001');
      expect(updated.reactions[0].count).toBe(1);
    });

    it('should remove reaction', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001', 'user-002'], count: 2 }],
      });

      const updated = message.removeReaction('👍', 'user-001');
      expect(updated.reactions[0].count).toBe(1);
      expect(updated.reactions[0].userIds).not.toContain('user-001');
    });

    it('should remove reaction entirely when last user removes it', () => {
      const message = MessageEntity.create({
        ...validProps,
        reactions: [{ emoji: '👍', userIds: ['user-001'], count: 1 }],
      });

      const updated = message.removeReaction('👍', 'user-001');
      expect(updated.reactions.length).toBe(0);
    });
  });

  describe('pin and important', () => {
    it('should pin message', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.pin();
      expect(updated.meta.isPinned).toBe(true);
    });

    it('should unpin message', () => {
      const message = MessageEntity.create({
        ...validProps,
        meta: { ...validProps.meta, isPinned: true },
      });
      const updated = message.unpin();
      expect(updated.meta.isPinned).toBe(false);
    });

    it('should mark as important', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.markAsImportant();
      expect(updated.meta.isImportant).toBe(true);
    });
  });

  describe('status updates', () => {
    it('should update status', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.updateStatus('failed');
      expect(updated.status).toBe('failed');
    });

    it('should mark as deleted', () => {
      const message = MessageEntity.create(validProps);
      const updated = message.markAsDeleted();
      expect(updated.status).toBe('deleted');
      expect(updated.deletedAt).toBeDefined();
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const message = MessageEntity.create(validProps);
      const json = message.toJSON();

      expect(json.message_id).toBe('msg-001');
      expect(json.content).toBe('Hello world');
      expect(json.status).toBe('sent');
    });

    it('should deserialize from JSON', () => {
      const message = MessageEntity.create(validProps);
      const json = message.toJSON();
      const deserialized = MessageEntity.fromJSON(json);

      expect(deserialized.messageId).toBe(message.messageId);
      expect(deserialized.content).toBe(message.content);
    });
  });
});
