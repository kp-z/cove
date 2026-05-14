import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService, SendMessageDTO, UpdateMessageDTO, AddReactionDTO, RemoveReactionDTO, DeleteMessageDTO } from './message.service';
import { MessageEntity, MessageMention } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IMessageRepository,
  IChannelQueryService,
  IEventBus,
  ILogger,
} from '../../interfaces';
import {
  MessageNotFoundError,
  UnauthorizedMessageDeletionError,
  UnauthorizedMessageEditError,
  SendMessageDeniedError,
} from './message.errors';

describe('MessageService', () => {
  let messageService: MessageService;
  let mockMessageRepository: IMessageRepository;
  let mockChannelQueryService: IChannelQueryService;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockMessageRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByChannel: vi.fn(),
      findByChannelCursor: vi.fn(),
      findByThread: vi.fn(),
      findBySender: vi.fn(),
    } as unknown as IMessageRepository;

    mockChannelQueryService = {
      canSendMessage: vi.fn(),
      getChannelById: vi.fn(),
    } as unknown as IChannelQueryService;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    messageService = new MessageService(
      mockMessageRepository,
      mockChannelQueryService,
      mockEventBus,
      mockLogger
    );
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        channelType: 'public',
        projectId: 'project-1',
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockChannelQueryService.canSendMessage).mockResolvedValue({ allowed: true });
      vi.mocked(mockChannelQueryService.getChannelById).mockResolvedValue(mockChannel);

      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello, world!',
      };

      const result = await messageService.sendMessage(dto);

      expect(result).toBeInstanceOf(MessageEntity);
      expect(result.content).toBe(dto.content);
      expect(result.channelId).toBe(dto.channelId);
      expect(result.senderId).toBe(dto.senderId);
      expect(result.status).toBe('sent');
      expect(mockMessageRepository.save).toHaveBeenCalledWith(expect.any(MessageEntity));
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.created',
          aggregateType: 'Message',
        })
      );
    });

    it('should throw SendMessageDeniedError when permission denied', async () => {
      vi.mocked(mockChannelQueryService.canSendMessage).mockResolvedValue({
        allowed: false,
        reason: 'User is banned',
      });

      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
      };

      await expect(messageService.sendMessage(dto)).rejects.toThrow(SendMessageDeniedError);
    });

    it('should send message with thread ID', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        channelType: 'public',
        projectId: 'project-1',
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockChannelQueryService.canSendMessage).mockResolvedValue({ allowed: true });
      vi.mocked(mockChannelQueryService.getChannelById).mockResolvedValue(mockChannel);

      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Reply in thread',
        threadId: 'thread-1',
      };

      const result = await messageService.sendMessage(dto);

      expect(result.threadId).toBe('thread-1');
      expect(result.isThreadRoot).toBe(false);
    });

    it('should send message with explicit mentions', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        channelType: 'public',
        projectId: 'project-1',
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockChannelQueryService.canSendMessage).mockResolvedValue({ allowed: true });
      vi.mocked(mockChannelQueryService.getChannelById).mockResolvedValue(mockChannel);

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

      const result = await messageService.sendMessage(dto);

      expect(result.mentions).toEqual(mentions);
    });

    it('should auto-parse mentions from content', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        projectId: 'project-1',
        status: 'active',
        members: [
          { memberId: 'user-2', memberType: 'human', role: 'member', joinedAt: new Date() },
        ],
        agentPool: ['agent-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockChannelQueryService.canSendMessage).mockResolvedValue({ allowed: true });
      vi.mocked(mockChannelQueryService.getChannelById).mockResolvedValue(mockChannel);

      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@user-2 @agent Hello!',
      };

      const result = await messageService.sendMessage(dto);

      expect(result.mentions.length).toBeGreaterThan(0);
    });
  });

  describe('getMessageById', () => {
    it('should return message when found', async () => {
      const mockMessage = MessageEntity.create({
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const result = await messageService.getMessageById('msg-1');

      expect(result).toBe(mockMessage);
    });

    it('should throw MessageNotFoundError when message not found', async () => {
      vi.mocked(mockMessageRepository.findById).mockResolvedValue(null);

      await expect(messageService.getMessageById('nonexistent')).rejects.toThrow(
        MessageNotFoundError
      );
    });
  });

  describe('getMessagesByChannel', () => {
    it('should return top-level messages only', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        channelType: 'public',
        projectId: 'project-1',
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      const topLevelMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Top level',
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

      const threadReply = MessageEntity.create({
        messageId: 'msg-2',
        msgShortId: 'short-2',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Thread reply',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        threadId: 'thread-1',
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

      vi.mocked(mockChannelQueryService.getChannelById).mockResolvedValue(mockChannel);
      vi.mocked(mockMessageRepository.findByChannel).mockResolvedValue([topLevelMessage, threadReply]);

      const result = await messageService.getMessagesByChannel('channel-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(topLevelMessage);
    });
  });

  describe('updateMessage', () => {
    it('should update message content successfully', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Old content',
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const dto: UpdateMessageDTO = {
        messageId: 'msg-1',
        content: 'New content',
        editorId: 'user-1',
      };

      const result = await messageService.updateMessage(dto);

      expect(result.content).toBe('New content');
      expect(result.isEdited).toBe(true);
      expect(mockMessageRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.updated',
        })
      );
    });

    it('should throw UnauthorizedMessageEditError when editor is not sender', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Content',
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const dto: UpdateMessageDTO = {
        messageId: 'msg-1',
        content: 'New content',
        editorId: 'user-2',
      };

      await expect(messageService.updateMessage(dto)).rejects.toThrow(
        UnauthorizedMessageEditError
      );
    });
  });

  describe('addReaction', () => {
    it('should add reaction successfully', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Content',
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const dto: AddReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-2',
        emoji: '👍',
      };

      const result = await messageService.addReaction(dto);

      expect(result.reactions).toHaveLength(1);
      expect(result.reactions[0]?.emoji).toBe('👍');
      expect(mockMessageRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.reaction_added',
        })
      );
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction successfully', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        attachments: [],
        mentions: [],
        references: [],
        reactions: [{ emoji: '👍', userIds: ['user-2'], count: 1 }],
        isEdited: false,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const dto: RemoveReactionDTO = {
        messageId: 'msg-1',
        userId: 'user-2',
        emoji: '👍',
      };

      const result = await messageService.removeReaction(dto);

      expect(result.reactions).toHaveLength(0);
      expect(mockMessageRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.reaction_removed',
        })
      );
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Content',
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const dto: DeleteMessageDTO = {
        messageId: 'msg-1',
        deletedBy: 'user-1',
      };

      const result = await messageService.deleteMessage(dto);

      expect(result.status).toBe('deleted');
      expect(mockMessageRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.deleted',
        })
      );
    });

    it('should throw UnauthorizedMessageDeletionError when deleter is not sender', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Content',
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

      const dto: DeleteMessageDTO = {
        messageId: 'msg-1',
        deletedBy: 'user-2',
      };

      await expect(messageService.deleteMessage(dto)).rejects.toThrow(
        UnauthorizedMessageDeletionError
      );
    });
  });

  describe('getReactionStats', () => {
    it('should return reaction statistics', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Content',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        isThreadRoot: true,
        attachments: [],
        mentions: [],
        references: [],
        reactions: [
          { emoji: '👍', userId: 'user-2', createdAt: new Date() },
          { emoji: '👍', userId: 'user-3', createdAt: new Date() },
          { emoji: '❤️', userId: 'user-4', createdAt: new Date() },
        ],
        isEdited: false,
        editHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);

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
          msgShortId: 'short-1',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-1',
          senderName: 'User 1',
          senderType: 'human',
          content: 'Hello world',
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
        }),
        MessageEntity.create({
          messageId: 'msg-2',
          msgShortId: 'short-2',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-1',
          senderName: 'User 1',
          senderType: 'human',
          content: 'Goodbye',
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
        }),
      ];

      vi.mocked(mockMessageRepository.findByChannel).mockResolvedValue(mockMessages);

      const result = await messageService.searchMessages('hello', 'channel-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe('Hello world');
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        channelType: 'public',
        projectId: 'project-1',
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockChannelQueryService.canSendMessage).mockResolvedValue({ allowed: true });
      vi.mocked(mockChannelQueryService.getChannelById).mockResolvedValue(mockChannel);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      const dto: SendMessageDTO = {
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Test',
      };

      await expect(messageService.sendMessage(dto)).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'message.created',
        })
      );
    });
  });
});
