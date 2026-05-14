import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messageRouter } from './message.router';
import { MessageService } from '../../../application/services/message/message.service';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { TRPCError } from '@trpc/server';

describe('messageRouter', () => {
  let mockMessageService: MessageService;
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

    router = messageRouter(mockMessageService);
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Test message',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
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

      vi.mocked(mockMessageService.sendMessage).mockResolvedValue(message);

      const caller = router.createCaller({});
      const result = await caller.send({
        channelId: 'channel-1',
        senderId: 'user-1',
        content: 'Test message',
      });

      expect(result).toHaveProperty('message_id', 'msg-1');
      expect(result).toHaveProperty('content', 'Test message');
    });

    it('should throw FORBIDDEN when SendMessageDeniedError', async () => {
      const error = new Error('Permission denied');
      error.name = 'SendMessageDeniedError';
      vi.mocked(mockMessageService.sendMessage).mockRejectedValue(error);

      const caller = router.createCaller({});

      await expect(
        caller.send({
          channelId: 'channel-1',
          senderId: 'user-1',
          content: 'Test',
        })
      ).rejects.toThrow('Permission denied');
    });

    it('should throw NOT_FOUND when channel not found', async () => {
      vi.mocked(mockMessageService.sendMessage).mockRejectedValue(
        new Error('Channel not found')
      );

      const caller = router.createCaller({});

      await expect(
        caller.send({
          channelId: 'nonexistent',
          senderId: 'user-1',
          content: 'Test',
        })
      ).rejects.toThrow('Channel not found');
    });
  });

  describe('list', () => {
    it('should list messages with pagination', async () => {
      const messages = [
        MessageEntity.create({
          messageId: 'msg-1',
          msgShortId: 'short-1',
          channelId: 'channel-1',
          channelName: 'Test',
          senderId: 'user-1',
          senderName: 'User 1',
          senderType: 'human',
          content: 'Message 1',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          isThreadRoot: false,
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

      vi.mocked(mockMessageService.getMessagesByChannelCursor).mockResolvedValue({
        messages,
        nextCursor: 'cursor-2',
      });

      const caller = router.createCaller({});
      const result = await caller.list({
        channelId: 'channel-1',
        limit: 20,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.nextCursor).toBe('cursor-2');
    });
  });

  describe('getById', () => {
    it('should get message by id', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Test message',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
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

      vi.mocked(mockMessageService.getMessageById).mockResolvedValue(message);

      const caller = router.createCaller({});
      const result = await caller.getById({ messageId: 'msg-1' });

      expect(result).toHaveProperty('message_id', 'msg-1');
    });

    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.getMessageById).mockRejectedValue(
        new Error('Message not found')
      );

      const caller = router.createCaller({});

      await expect(
        caller.getById({ messageId: 'nonexistent' })
      ).rejects.toThrow('Message not found');
    });
  });

  describe('update', () => {
    it('should update message successfully', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Updated content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
        attachments: [],
        mentions: [],
        references: [],
        reactions: [],
        isEdited: true,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      vi.mocked(mockMessageService.updateMessage).mockResolvedValue(message);

      const caller = router.createCaller({});
      const result = await caller.update({
        messageId: 'msg-1',
        content: 'Updated content',
        editorId: 'user-1',
      });

      expect(result).toHaveProperty('content', 'Updated content');
      expect(result).toHaveProperty('is_edited', true);
    });

    it('should throw FORBIDDEN when UnauthorizedMessageEditError', async () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedMessageEditError';
      vi.mocked(mockMessageService.updateMessage).mockRejectedValue(error);

      const caller = router.createCaller({});

      await expect(
        caller.update({
          messageId: 'msg-1',
          content: 'Updated',
          editorId: 'user-2',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('delete', () => {
    it('should delete message successfully', async () => {
      vi.mocked(mockMessageService.deleteMessage).mockResolvedValue(undefined);

      const caller = router.createCaller({});
      const result = await caller.delete({
        messageId: 'msg-1',
        deletedBy: 'user-1',
      });

      expect(result).toEqual({ messageId: 'msg-1', deleted: true });
    });

    it('should throw FORBIDDEN when UnauthorizedMessageDeletionError', async () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedMessageDeletionError';
      vi.mocked(mockMessageService.deleteMessage).mockRejectedValue(error);

      const caller = router.createCaller({});

      await expect(
        caller.delete({
          messageId: 'msg-1',
          deletedBy: 'user-2',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('addReaction', () => {
    it('should add reaction successfully', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Test',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
        attachments: [],
        mentions: [],
        references: [],
        reactions: [{ emoji: '👍', userIds: ['user-2'] }],
        isEdited: false,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      vi.mocked(mockMessageService.addReaction).mockResolvedValue(message);

      const caller = router.createCaller({});
      const result = await caller.addReaction({
        messageId: 'msg-1',
        userId: 'user-2',
        emoji: '👍',
      });

      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0].emoji).toBe('👍');
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction successfully', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Test',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: false,
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

      vi.mocked(mockMessageService.removeReaction).mockResolvedValue(message);

      const caller = router.createCaller({});
      const result = await caller.removeReaction({
        messageId: 'msg-1',
        userId: 'user-2',
        emoji: '👍',
      });

      expect(result.reactions).toHaveLength(0);
    });
  });

  describe('getThreadMessages', () => {
    it('should get thread messages successfully', async () => {
      const messages = [
        MessageEntity.create({
          messageId: 'msg-2',
          msgShortId: 'short-2',
          channelId: 'channel-1',
          channelName: 'Test',
          senderId: 'user-2',
          senderName: 'User 2',
          senderType: 'human',
          content: 'Reply',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          threadId: 'msg-1',
          isThreadRoot: false,
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

      vi.mocked(mockMessageService.getMessagesByThread).mockResolvedValue(messages);

      const caller = router.createCaller({});
      const result = await caller.getThreadMessages({
        messageId: 'msg-1',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('replyToThread', () => {
    it('should reply to thread successfully', async () => {
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

      const reply = MessageEntity.create({
        messageId: 'msg-2',
        msgShortId: 'short-2',
        channelId: 'channel-1',
        channelName: 'Test',
        senderId: 'user-2',
        senderName: 'User 2',
        senderType: 'human',
        content: 'Reply',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        threadId: 'msg-1',
        isThreadRoot: false,
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
      vi.mocked(mockMessageService.sendMessage).mockResolvedValue(reply);

      const caller = router.createCaller({});
      const result = await caller.replyToThread({
        messageId: 'msg-1',
        senderId: 'user-2',
        content: 'Reply',
      });

      expect(result).toHaveProperty('thread_id', 'msg-1');
      expect(result).toHaveProperty('content', 'Reply');
    });
  });
});
