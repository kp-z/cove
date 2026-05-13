import { describe, it, expect } from 'vitest';
import { ThreadEntity } from './thread.entity';

describe('ThreadEntity', () => {
  const validProps = {
    threadId: 'msg-001',
    channelId: 'channel-001',
    rootMessageId: 'msg-001',
    participants: ['user-001'],
    replyCount: 0,
    createdAt: new Date('2026-05-02T10:00:00Z'),
  };

  describe('create', () => {
    it('should create a valid thread entity', () => {
      const thread = ThreadEntity.create(validProps);

      expect(thread.threadId).toBe('msg-001');
      expect(thread.channelId).toBe('channel-001');
      expect(thread.rootMessageId).toBe('msg-001');
      expect(thread.replyCount).toBe(0);
      expect(thread.participants).toEqual(['user-001']);
    });

    it('should throw error if threadId is empty', () => {
      expect(() =>
        ThreadEntity.create({ ...validProps, threadId: '', rootMessageId: '' })
      ).toThrow('Thread ID cannot be empty');
    });

    it('should throw error if channelId is empty', () => {
      expect(() =>
        ThreadEntity.create({ ...validProps, channelId: '' })
      ).toThrow('Channel ID cannot be empty');
    });

    it('should throw error if rootMessageId is empty', () => {
      expect(() =>
        ThreadEntity.create({ ...validProps, threadId: 'msg-001', rootMessageId: '' })
      ).toThrow('Root message ID cannot be empty');
    });
  });

  describe('validation: threadId === rootMessageId', () => {
    it('should throw error when threadId does not equal rootMessageId', () => {
      expect(() =>
        ThreadEntity.create({
          ...validProps,
          threadId: 'msg-001',
          rootMessageId: 'msg-002',
        })
      ).toThrow('Thread ID must equal root message ID');
    });

    it('should succeed when threadId equals rootMessageId', () => {
      const thread = ThreadEntity.create({
        ...validProps,
        threadId: 'msg-xyz',
        rootMessageId: 'msg-xyz',
      });
      expect(thread.threadId).toBe('msg-xyz');
    });
  });

  describe('addReply', () => {
    it('should increment replyCount and set lastReplyAt', () => {
      const thread = ThreadEntity.create(validProps);
      const updated = thread.addReply();

      expect(updated.replyCount).toBe(1);
      expect(updated.lastReplyAt).toBeDefined();
      expect(updated.lastReplyAt!.getTime()).toBeGreaterThan(0);
    });

    it('should not mutate original entity', () => {
      const thread = ThreadEntity.create(validProps);
      const updated = thread.addReply();

      expect(thread.replyCount).toBe(0);
      expect(updated.replyCount).toBe(1);
    });
  });

  describe('addParticipant', () => {
    it('should add a new participant', () => {
      const thread = ThreadEntity.create(validProps);
      const updated = thread.addParticipant('user-002');

      expect(updated.participants).toEqual(['user-001', 'user-002']);
    });

    it('should skip duplicate participant', () => {
      const thread = ThreadEntity.create(validProps);
      const updated = thread.addParticipant('user-001');

      expect(updated.participants).toEqual(['user-001']);
      expect(updated).toBe(thread);
    });
  });

  describe('toJSON', () => {
    it('should serialize to snake_case JSON', () => {
      const thread = ThreadEntity.create({
        ...validProps,
        lastReplyAt: new Date('2026-05-02T11:00:00Z'),
      });
      const json = thread.toJSON();

      expect(json.thread_id).toBe('msg-001');
      expect(json.channel_id).toBe('channel-001');
      expect(json.root_message_id).toBe('msg-001');
      expect(json.participants).toEqual(['user-001']);
      expect(json.reply_count).toBe(0);
      expect(json.last_reply_at).toBe('2026-05-02T11:00:00.000Z');
      expect(json.created_at).toBe('2026-05-02T10:00:00.000Z');
    });

    it('should handle undefined lastReplyAt', () => {
      const thread = ThreadEntity.create(validProps);
      const json = thread.toJSON();

      expect(json.last_reply_at).toBeUndefined();
    });
  });

  describe('fromJSON', () => {
    it('should deserialize from JSON', () => {
      const thread = ThreadEntity.create({
        ...validProps,
        lastReplyAt: new Date('2026-05-02T11:00:00Z'),
      });
      const json = thread.toJSON();
      const deserialized = ThreadEntity.fromJSON(json);

      expect(deserialized.threadId).toBe(thread.threadId);
      expect(deserialized.channelId).toBe(thread.channelId);
      expect(deserialized.rootMessageId).toBe(thread.rootMessageId);
      expect(deserialized.replyCount).toBe(thread.replyCount);
      expect(deserialized.lastReplyAt?.toISOString()).toBe(thread.lastReplyAt?.toISOString());
    });

    it('should handle missing lastReplyAt in JSON', () => {
      const json = {
        thread_id: 'msg-001',
        channel_id: 'channel-001',
        root_message_id: 'msg-001',
        participants: ['user-001'] as readonly string[],
        reply_count: 0,
        created_at: '2026-05-02T10:00:00.000Z',
      };
      const thread = ThreadEntity.fromJSON(json);

      expect(thread.lastReplyAt).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for same threadId', () => {
      const a = ThreadEntity.create(validProps);
      const b = ThreadEntity.create(validProps);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different threadId', () => {
      const a = ThreadEntity.create(validProps);
      const b = ThreadEntity.create({
        ...validProps,
        threadId: 'msg-999',
        rootMessageId: 'msg-999',
      });
      expect(a.equals(b)).toBe(false);
    });
  });
});
