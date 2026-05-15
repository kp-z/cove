import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { threadRouter } from './thread.router';
import { ThreadService } from '../../../application/services/thread/thread.service';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ThreadEntity } from '../../../domain/models/thread/thread.entity';
import { TRPCError } from '@trpc/server';
import { ThreadNotFoundError, NestedThreadError, RootMessageNotFoundError } from '../../../application/services/thread/thread.errors';

describe('threadRouter', () => {
  let mockThreadService: ThreadService;
  let router: ReturnType<typeof threadRouter>;
  let mockContext: any;

  beforeEach(() => {
    mockThreadService = {
      replyInThread: vi.fn(),
      listThreadMessages: vi.fn(),
      getOrCreateThread: vi.fn(),
      listChannelThreads: vi.fn(),
    } as unknown as ThreadService;

    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };

    router = threadRouter(mockThreadService);
  });

  describe('reply', () => {
    it('should reply in thread successfully', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-1-short',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Reply content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
        threadId: 'thread-1',
        attachments: [],
        mentions: [],
        references: [],
        reactions: [],
        isEdited: false,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      vi.mocked(mockThreadService.replyInThread).mockResolvedValue(message);

      const caller = router.createCaller(mockContext);
      const result = await caller.reply({
        threadId: 'thread-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Reply content',
      });

      expect(result).toEqual(message.toJSON());
      expect(mockThreadService.replyInThread).toHaveBeenCalledWith(
        'thread-1',
        'user-1',
        'human',
        'Reply content'
      );
    });

    it('should use default senderType as human', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-1-short',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Reply content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
        threadId: 'thread-1',
        attachments: [],
        mentions: [],
        references: [],
        reactions: [],
        isEdited: false,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      vi.mocked(mockThreadService.replyInThread).mockResolvedValue(message);

      const caller = router.createCaller(mockContext);
      await caller.reply({
        threadId: 'thread-1',
        senderId: 'user-1',
        content: 'Reply content',
      });

      expect(mockThreadService.replyInThread).toHaveBeenCalledWith(
        'thread-1',
        'user-1',
        'human',
        'Reply content'
      );
    });

    it('should throw BAD_REQUEST for nested thread error', async () => {
      const error = new NestedThreadError('msg-1');

      vi.mocked(mockThreadService.replyInThread).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.reply({
          threadId: 'thread-1',
          senderId: 'user-1',
          content: 'Reply content',
        })
      ).rejects.toThrow(TRPCError);

      try {
        await caller.reply({
          threadId: 'thread-1',
          senderId: 'user-1',
          content: 'Reply content',
        });
      } catch (err: any) {
        expect(err.code).toBe('BAD_REQUEST');
        expect(err.message).toContain('Cannot create a thread on a thread reply');
      }
    });

    it('should throw NOT_FOUND for thread not found error', async () => {
      const error = new ThreadNotFoundError('thread-1');
      error.name = 'ThreadNotFoundError';

      vi.mocked(mockThreadService.replyInThread).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.reply({
          threadId: 'thread-1',
          senderId: 'user-1',
          content: 'Reply content',
        });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw NOT_FOUND for root message not found error', async () => {
      const error = new RootMessageNotFoundError('msg-1');

      vi.mocked(mockThreadService.replyInThread).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.reply({
          threadId: 'thread-1',
          senderId: 'user-1',
          content: 'Reply content',
        });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockThreadService.replyInThread).mockRejectedValue(new Error('Unknown error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.reply({
          threadId: 'thread-1',
          senderId: 'user-1',
          content: 'Reply content',
        });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getMessages', () => {
    it('should get thread messages successfully', async () => {
      const messages = [
        MessageEntity.create({
          messageId: 'msg-1',
          msgShortId: 'msg-1-short',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-1',
          senderName: 'User 1',
          senderType: 'human',
          content: 'Message 1',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          isThreadRoot: false,
          threadId: 'thread-1',
          attachments: [],
          mentions: [],
          references: [],
          reactions: [],
          isEdited: false,
          editHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: { client: 'web', isPinned: false, isImportant: false },
        }),
        MessageEntity.create({
          messageId: 'msg-2',
          msgShortId: 'msg-2-short',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-2',
          senderName: 'User 2',
          senderType: 'human',
          content: 'Message 2',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          isThreadRoot: false,
          threadId: 'thread-1',
          attachments: [],
          mentions: [],
          references: [],
          reactions: [],
          isEdited: false,
          editHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: { client: 'web', isPinned: false, isImportant: false },
        }),
      ];

      vi.mocked(mockThreadService.listThreadMessages).mockResolvedValue(messages);

      const caller = router.createCaller(mockContext);
      const result = await caller.getMessages({ threadId: 'thread-1' });

      expect(result.messages).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockThreadService.listThreadMessages).toHaveBeenCalledWith('thread-1', undefined, undefined);
    });

    it('should get thread messages with cursor and limit', async () => {
      const messages = [
        MessageEntity.create({
          messageId: 'msg-1',
          msgShortId: 'msg-1-short',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-1',
          senderName: 'User 1',
          senderType: 'human',
          content: 'Message 1',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          isThreadRoot: false,
          threadId: 'thread-1',
          attachments: [],
          mentions: [],
          references: [],
          reactions: [],
          isEdited: false,
          editHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: { client: 'web', isPinned: false, isImportant: false },
        }),
      ];

      vi.mocked(mockThreadService.listThreadMessages).mockResolvedValue(messages);

      const caller = router.createCaller(mockContext);
      await caller.getMessages({
        threadId: 'thread-1',
        cursor: 'cursor-1',
        limit: 10,
      });

      expect(mockThreadService.listThreadMessages).toHaveBeenCalledWith('thread-1', 'cursor-1', 10);
    });

    it('should throw NOT_FOUND when thread not found', async () => {
      const error = new ThreadNotFoundError('thread-1');
      error.name = 'ThreadNotFoundError';

      vi.mocked(mockThreadService.listThreadMessages).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.getMessages({ threadId: 'thread-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockThreadService.listThreadMessages).mockRejectedValue(new Error('Unknown error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.getMessages({ threadId: 'thread-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getMetadata', () => {
    it('should get thread metadata successfully', async () => {
      const thread = ThreadEntity.create({
        threadId: 'msg-1',
        channelId: 'channel-1',
        rootMessageId: 'msg-1',
        participants: [],
        replyCount: 0,
        createdAt: new Date(),
      });

      vi.mocked(mockThreadService.getOrCreateThread).mockResolvedValue(thread);

      const caller = router.createCaller(mockContext);
      const result = await caller.getMetadata({ threadId: 'thread-1' });

      expect(result).toEqual(thread.toJSON());
      expect(mockThreadService.getOrCreateThread).toHaveBeenCalledWith('thread-1');
    });

    it('should throw NOT_FOUND when thread not found', async () => {
      const error = new ThreadNotFoundError('thread-1');
      error.name = 'ThreadNotFoundError';

      vi.mocked(mockThreadService.getOrCreateThread).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.getMetadata({ threadId: 'thread-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockThreadService.getOrCreateThread).mockRejectedValue(new Error('Unknown error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.getMetadata({ threadId: 'thread-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('listByChannel', () => {
    it('should list channel threads successfully', async () => {
      const threads = [
        ThreadEntity.create({
          threadId: 'msg-1',
          channelId: 'channel-1',
          rootMessageId: 'msg-1',
          participants: [],
          replyCount: 0,
          createdAt: new Date(),
        }),
        ThreadEntity.create({
          threadId: 'msg-2',
          channelId: 'channel-1',
          rootMessageId: 'msg-2',
          participants: [],
          replyCount: 0,
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockThreadService.listChannelThreads).mockResolvedValue(threads);

      const caller = router.createCaller(mockContext);
      const result = await caller.listByChannel({ channelId: 'channel-1' });

      expect(result.threads).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockThreadService.listChannelThreads).toHaveBeenCalledWith('channel-1');
    });

    it('should return empty list when no threads found', async () => {
      vi.mocked(mockThreadService.listChannelThreads).mockResolvedValue([]);

      const caller = router.createCaller(mockContext);
      const result = await caller.listByChannel({ channelId: 'channel-1' });

      expect(result.threads).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should throw INTERNAL_SERVER_ERROR for errors', async () => {
      vi.mocked(mockThreadService.listChannelThreads).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.listByChannel({ channelId: 'channel-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });
});
