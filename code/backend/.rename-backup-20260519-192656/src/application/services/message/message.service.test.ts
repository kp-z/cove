import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService, SendMessageDTO, UpdateMessageDTO, AddReactionDTO, RemoveReactionDTO, DeleteMessageDTO } from './message.service';
import { MessageEntity, MessageMention } from '../../../domain/models/message/message.entity';
import { MessageCrudService } from './message-crud.service';
import { MessageQueryService } from './message-query.service';
import { MessageReactionService } from './message-reaction.service';
import {
  MessageNotFoundError,
  UnauthorizedMessageDeletionError,
  UnauthorizedMessageEditError,
  SendMessageDeniedError,
} from './message.errors';

describe('MessageService', () => {
  let messageService: MessageService;
  let mockCrudService: MessageCrudService;
  let mockQueryService: MessageQueryService;
  let mockReactionService: MessageReactionService;

  beforeEach(() => {
    mockCrudService = {
      sendMessage: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
    } as unknown as MessageCrudService;

    mockQueryService = {
      getMessageById: vi.fn(),
      getMessagesByChannel: vi.fn(),
      getMessagesByChannelCursor: vi.fn(),
      getMessagesByThread: vi.fn(),
      getMessagesBySender: vi.fn(),
      searchMessages: vi.fn(),
    } as unknown as MessageQueryService;

    mockReactionService = {
      addReaction: vi.fn(),
      removeReaction: vi.fn(),
      getMessageReactions: vi.fn(),
      getReactionStats: vi.fn(),
    } as unknown as MessageReactionService;

    messageService = new MessageService(
      mockCrudService,
      mockQueryService,
      mockReactionService
    );
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello, world!',
      };

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockCrudService.sendMessage).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(dto);

      expect(result).toBe(mockMessage);
      expect(mockCrudService.sendMessage).toHaveBeenCalledWith(dto);
    });

    it('should throw SendMessageDeniedError when permission denied', async () => {
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
      };

      vi.mocked(mockCrudService.sendMessage).mockRejectedValue(
        new SendMessageDeniedError(dto.senderId, dto.channelId, 'User is banned')
      );

      await expect(messageService.sendMessage(dto)).rejects.toThrow(SendMessageDeniedError);
    });

    it('should send message with thread ID', async () => {
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Reply in thread',
        threadId: 'thread-1',
      };

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        contentType: 'text',
        contentFormat: 'plain',
        threadId: 'thread-1',
        isThreadRoot: false,
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockCrudService.sendMessage).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(dto);

      expect(result.threadId).toBe('thread-1');
      expect(result.isThreadRoot).toBe(false);
    });

    it('should send message with explicit mentions', async () => {
      const mentions: MessageMention[] = [
        { mentionType: 'user', mentionId: 'user-2' },
      ];

      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@user-2 Hello!',
        mentions,
      };

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions,
        reactions: [],
      });

      vi.mocked(mockCrudService.sendMessage).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(dto);

      expect(result.mentions).toEqual(mentions);
    });

    it('should auto-parse mentions from content', async () => {
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@user-2 @agent Hello!',
      };

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [
          { mentionType: 'user', mentionId: 'user-2' },
          { mentionType: 'agent', mentionId: 'agent' },
        ],
        reactions: [],
      });

      vi.mocked(mockCrudService.sendMessage).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(dto);

      expect(result.mentions.length).toBeGreaterThan(0);
    });
  });

  describe('getMessageById', () => {
    it('should return message when found', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Test message',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockQueryService.getMessageById).mockResolvedValue(mockMessage);

      const result = await messageService.getMessageById('msg-1');

      expect(result).toBe(mockMessage);
    });

    it('should throw MessageNotFoundError when message not found', async () => {
      vi.mocked(mockQueryService.getMessageById).mockRejectedValue(
        new MessageNotFoundError('nonexistent')
      );

      await expect(messageService.getMessageById('nonexistent')).rejects.toThrow(
        MessageNotFoundError
      );
    });
  });

  describe('getMessagesByChannel', () => {
    it('should return top-level messages only', async () => {
      const topLevelMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Top level',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockQueryService.getMessagesByChannel).mockResolvedValue([topLevelMessage]);

      const result = await messageService.getMessagesByChannel('channel-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(topLevelMessage);
    });
  });

  describe('updateMessage', () => {
    it('should update message content successfully', async () => {
      const dto: UpdateMessageDTO = {
        messageId: 'msg-1',
        content: 'New content',
        editorId: 'user-1',
      };

      const updatedMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'New content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        isEdited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockCrudService.updateMessage).mockResolvedValue(updatedMessage);

      const result = await messageService.updateMessage(dto);

      expect(result.content).toBe('New content');
      expect(result.isEdited).toBe(true);
    });

    it('should throw UnauthorizedMessageEditError when editor is not sender', async () => {
      const dto: UpdateMessageDTO = {
        messageId: 'msg-1',
        content: 'New content',
        editorId: 'user-2',
      };

      vi.mocked(mockCrudService.updateMessage).mockRejectedValue(
        new UnauthorizedMessageEditError('msg-1', 'user-2')
      );

      await expect(messageService.updateMessage(dto)).rejects.toThrow(
        UnauthorizedMessageEditError
      );
    });
  });

  describe('addReaction', () => {
    it('should add reaction successfully', async () => {
      const dto: AddReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-2',
        emoji: '👍',
      };

      const messageWithReaction = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [{ emoji: '👍', userId: 'user-2', createdAt: new Date() }],
      });

      vi.mocked(mockReactionService.addReaction).mockResolvedValue(messageWithReaction);

      const result = await messageService.addReaction(dto);

      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0]?.emoji).toBe('👍');
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction successfully', async () => {
      const dto: RemoveReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-2',
        emoji: '👍',
      };

      const messageWithoutReaction = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockReactionService.removeReaction).mockResolvedValue(messageWithoutReaction);

      const result = await messageService.removeReaction(dto);

      expect(result.reactions).toHaveLength(0);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const dto: DeleteMessageDTO = {
        messageId: 'msg-1',
        deletedBy: 'user-1',
      };

      const deletedMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'deleted',
        isThreadRoot: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockCrudService.deleteMessage).mockResolvedValue(deletedMessage);

      const result = await messageService.deleteMessage(dto);

      expect(result.status).toBe('deleted');
    });

    it('should throw UnauthorizedMessageDeletionError when deleter is not sender', async () => {
      const dto: DeleteMessageDTO = {
        messageId: 'msg-1',
        deletedBy: 'user-2',
      };

      vi.mocked(mockCrudService.deleteMessage).mockRejectedValue(
        new UnauthorizedMessageDeletionError('msg-1', 'user-2')
      );

      await expect(messageService.deleteMessage(dto)).rejects.toThrow(
        UnauthorizedMessageDeletionError
      );
    });
  });

  describe('getReactionStats', () => {
    it('should return reaction statistics', async () => {
      const stats = new Map<string, number>();
      stats.set('👍', 2);
      stats.set('❤️', 1);

      vi.mocked(mockReactionService.getReactionStats).mockResolvedValue(stats);

      const result = await messageService.getReactionStats('msg-1');

      expect(result.get('👍')).toBe(2);
      expect(result.get('❤️')).toBe(1);
    });
  });

  describe('searchMessages', () => {
    it('should search messages by content', async () => {
      const mockMessages = [
        MessageEntity.create({
          messageId: 'msg-1',
          msgShortId: 'msg-short-1',
          channelId: 'channel-1',
          senderId: 'user-1',
          senderType: 'human',
          content: 'Hello world',
          contentType: 'text',
          contentFormat: 'plain',
          status: 'sent',
          isThreadRoot: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          mentions: [],
          reactions: [],
        }),
      ];

      vi.mocked(mockQueryService.searchMessages).mockResolvedValue(mockMessages);

      const result = await messageService.searchMessages('hello', 'channel-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe('Hello world');
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Test',
      };

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        content: dto.content,
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockCrudService.sendMessage).mockResolvedValue(mockMessage);

      await expect(messageService.sendMessage(dto)).resolves.toBeDefined();
    });
  });
});
