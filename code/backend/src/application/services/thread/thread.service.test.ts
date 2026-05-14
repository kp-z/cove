import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThreadService, RootMessageNotFoundError, NestedThreadError } from './thread.service';
import { ThreadEntity } from '../../../domain/models/thread/thread.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import {
  IThreadRepository,
  IMessageRepository,
  ILogger,
} from '../../interfaces';

describe('ThreadService', () => {
  let threadService: ThreadService;
  let mockThreadRepository: IThreadRepository;
  let mockMessageRepository: IMessageRepository;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockThreadRepository = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByChannel: vi.fn(),
    } as unknown as IThreadRepository;

    mockMessageRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByThread: vi.fn(),
    } as unknown as IMessageRepository;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    threadService = new ThreadService(
      mockThreadRepository,
      mockMessageRepository,
      mockLogger
    );
  });

  describe('getOrCreateThread', () => {
    it('should return existing thread if found', async () => {
      const existingThread = ThreadEntity.create({
        threadId: 'msg-1',
        channelId: 'channel-1',
        rootMessageId: 'msg-1',
        participants: ['user-1'],
        replyCount: 5,
        createdAt: new Date(),
      });

      vi.mocked(mockThreadRepository.findById).mockResolvedValue(existingThread);

      const result = await threadService.getOrCreateThread('msg-1');

      expect(result).toBe(existingThread);
      expect(mockThreadRepository.save).not.toHaveBeenCalled();
    });

    it('should create new thread if not found', async () => {
      const rootMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Root message',
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

      vi.mocked(mockThreadRepository.findById).mockResolvedValue(null);
      vi.mocked(mockMessageRepository.findById).mockResolvedValue(rootMessage);

      const result = await threadService.getOrCreateThread('msg-1');

      expect(result).toBeInstanceOf(ThreadEntity);
      expect(result.threadId).toBe('msg-1');
      expect(result.channelId).toBe('channel-1');
      expect(result.participants).toContain('user-1');
      expect(mockThreadRepository.save).toHaveBeenCalledWith(expect.any(ThreadEntity));
    });

    it('should throw RootMessageNotFoundError when root message not found', async () => {
      vi.mocked(mockThreadRepository.findById).mockResolvedValue(null);
      vi.mocked(mockMessageRepository.findById).mockResolvedValue(null);

      await expect(threadService.getOrCreateThread('nonexistent')).rejects.toThrow(
        RootMessageNotFoundError
      );
    });
  });

  describe('replyInThread', () => {
    it('should create reply in thread successfully', async () => {
      const rootMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Root message',
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

      const thread = ThreadEntity.create({
        threadId: 'msg-1',
        channelId: 'channel-1',
        rootMessageId: 'msg-1',
        participants: ['user-1'],
        replyCount: 0,
        createdAt: new Date(),
      });

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(rootMessage);
      vi.mocked(mockThreadRepository.findById).mockResolvedValue(thread);

      const result = await threadService.replyInThread('msg-1', 'user-2', 'human', 'Reply content');

      expect(result).toBeInstanceOf(MessageEntity);
      expect(result.threadId).toBe('msg-1');
      expect(result.isThreadRoot).toBe(false);
      expect(result.senderId).toBe('user-2');
      expect(result.content).toBe('Reply content');
      expect(mockMessageRepository.save).toHaveBeenCalledWith(expect.any(MessageEntity));
      expect(mockThreadRepository.update).toHaveBeenCalled();
    });

    it('should throw RootMessageNotFoundError when root message not found', async () => {
      vi.mocked(mockMessageRepository.findById).mockResolvedValue(null);

      await expect(
        threadService.replyInThread('nonexistent', 'user-1', 'human', 'Reply')
      ).rejects.toThrow(RootMessageNotFoundError);
    });

    it('should throw NestedThreadError when replying to a thread reply', async () => {
      const threadReply = MessageEntity.create({
        messageId: 'msg-2',
        msgShortId: 'short-2',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-2',
        senderName: 'User 2',
        senderType: 'human',
        content: 'Thread reply',
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

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(threadReply);

      await expect(
        threadService.replyInThread('msg-2', 'user-3', 'human', 'Nested reply')
      ).rejects.toThrow(NestedThreadError);
    });

    it('should add participant to thread when replying', async () => {
      const rootMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'short-1',
        channelId: 'channel-1',
        channelName: 'Test Channel',
        senderId: 'user-1',
        senderName: 'User 1',
        senderType: 'human',
        content: 'Root message',
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

      const thread = ThreadEntity.create({
        threadId: 'msg-1',
        channelId: 'channel-1',
        rootMessageId: 'msg-1',
        participants: ['user-1'],
        replyCount: 0,
        createdAt: new Date(),
      });

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(rootMessage);
      vi.mocked(mockThreadRepository.findById).mockResolvedValue(thread);

      await threadService.replyInThread('msg-1', 'user-2', 'human', 'Reply');

      expect(mockThreadRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          participants: expect.arrayContaining(['user-1', 'user-2']),
          replyCount: 1,
        })
      );
    });
  });

  describe('listThreadMessages', () => {
    it('should return all messages in thread', async () => {
      const messages = [
        MessageEntity.create({
          messageId: 'msg-2',
          msgShortId: 'short-2',
          channelId: 'channel-1',
          channelName: 'Test Channel',
          senderId: 'user-2',
          senderName: 'User 2',
          senderType: 'human',
          content: 'Reply 1',
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

      vi.mocked(mockMessageRepository.findByThread).mockResolvedValue(messages);

      const result = await threadService.listThreadMessages('msg-1');

      expect(result).toEqual(messages);
      expect(mockMessageRepository.findByThread).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('listChannelThreads', () => {
    it('should return all threads in channel', async () => {
      const threads = [
        ThreadEntity.create({
          threadId: 'msg-1',
          channelId: 'channel-1',
          rootMessageId: 'msg-1',
          participants: ['user-1', 'user-2'],
          replyCount: 3,
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockThreadRepository.findByChannel).mockResolvedValue(threads);

      const result = await threadService.listChannelThreads('channel-1');

      expect(result).toEqual(threads);
      expect(mockThreadRepository.findByChannel).toHaveBeenCalledWith('channel-1');
    });
  });
});
