import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { messageRouter } from './message.router';
import { MessageService } from '../../../application/services/message/message.service';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { MessageNotFoundError, SendMessageDeniedError } from '../../../application/services/message/message.errors';
import { ChannelNotFoundError } from '../../../application/services/channel/channel.errors';

describe('messageRouter - Additional Coverage', () => {
  let mockMessageService: MessageService;
  let mockContext: any;

  let router: ReturnType<typeof messageRouter>;

  beforeEach(() => {
    mockMessageService = {
      sendMessage: vi.fn(),
      getMessagesByChannelCursor: vi.fn(),
      getMessageById: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
      getMessagesByThread: vi.fn(),
    } as unknown as MessageService;


    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      req: {} as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = messageRouter(mockMessageService);
  });

  describe('send - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.sendMessage).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.send({
          channelId: 'channel-1',
          senderId: 'user-1',
          content: 'Test',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
        expect(err.message).toBe('Database error');
      }
    });
  });

  describe('list - additional error cases', () => {
    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockMessageService.getMessagesByChannelCursor).mockRejectedValue(
        new ChannelNotFoundError('channel-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ channelId: 'nonexistent' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.getMessagesByChannelCursor).mockRejectedValue(
        new Error('Database error')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ channelId: 'channel-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getById - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.getMessageById).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.getById({ messageId: 'msg-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('update - additional error cases', () => {
    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.updateMessage).mockRejectedValue(
        new MessageNotFoundError('message-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          messageId: 'nonexistent',
          content: 'Updated',
          editorId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.updateMessage).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          messageId: 'msg-1',
          content: 'Updated',
          editorId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('delete - additional error cases', () => {
    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.deleteMessage).mockRejectedValue(
        new MessageNotFoundError('message-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({
          messageId: 'nonexistent',
          deletedBy: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.deleteMessage).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({
          messageId: 'msg-1',
          deletedBy: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('addReaction - additional error cases', () => {
    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.addReaction).mockRejectedValue(
        new MessageNotFoundError('message-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.addReaction({
          messageId: 'nonexistent',
          userId: 'user-1',
          emoji: '👍',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.addReaction).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.addReaction({
          messageId: 'msg-1',
          userId: 'user-1',
          emoji: '👍',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('removeReaction - additional error cases', () => {
    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.removeReaction).mockRejectedValue(
        new MessageNotFoundError('message-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.removeReaction({
          messageId: 'nonexistent',
          userId: 'user-1',
          emoji: '👍',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.removeReaction).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.removeReaction({
          messageId: 'msg-1',
          userId: 'user-1',
          emoji: '👍',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getThreadMessages - additional error cases', () => {
    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.getMessagesByThread).mockRejectedValue(
        new MessageNotFoundError('message-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.getThreadMessages({ messageId: 'nonexistent' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockMessageService.getMessagesByThread).mockRejectedValue(
        new Error('Database error')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.getThreadMessages({ messageId: 'msg-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('replyToThread - additional error cases', () => {
    it('should throw FORBIDDEN when SendMessageDeniedError', async () => {
      const threadRoot = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Root',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
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

      vi.mocked(mockMessageService.getMessageById).mockResolvedValue(threadRoot);

      const error = new SendMessageDeniedError('user-2', 'channel-1', 'Permission denied');
      vi.mocked(mockMessageService.sendMessage).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.replyToThread({
          messageId: 'msg-1',
          senderId: 'user-2',
          content: 'Reply',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('FORBIDDEN');
      }
    });

    it('should throw NOT_FOUND when thread root not found', async () => {
      vi.mocked(mockMessageService.getMessageById).mockRejectedValue(
        new MessageNotFoundError('message-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.replyToThread({
          messageId: 'nonexistent',
          senderId: 'user-2',
          content: 'Reply',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      const threadRoot = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Root',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
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

      vi.mocked(mockMessageService.getMessageById).mockResolvedValue(threadRoot);
      vi.mocked(mockMessageService.sendMessage).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.replyToThread({
          messageId: 'msg-1',
          senderId: 'user-2',
          content: 'Reply',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });
});
