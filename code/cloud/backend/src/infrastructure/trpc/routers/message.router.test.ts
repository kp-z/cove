import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { messageRouter } from './message.router';
import { MessageService } from '../../../application/services/message/message.service';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { TRPCError } from '@trpc/server';

describe('messageRouter', () => {
  let mockMessageService: MessageService;
  let router: ReturnType<typeof messageRouter>;
  let mockContext: any;

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
      userId: 'user-1',
      realmId: 'realm-1',
      userType: 'human',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      realmMemberVerification: {
        isMember: vi.fn().mockResolvedValue(true),
        verifyMembership: vi.fn().mockResolvedValue(undefined),
        clearCache: vi.fn(),
        clearAllCache: vi.fn(),
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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);

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

      const caller = router.createCaller(mockContext);

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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ messageId: 'msg-1' });

      expect(result).toHaveProperty('message_id', 'msg-1');
    });

    it('should throw NOT_FOUND when message not found', async () => {
      vi.mocked(mockMessageService.getMessageById).mockRejectedValue(
        new Error('Message not found')
      );

      const caller = router.createCaller(mockContext);

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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);

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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);

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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);
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

      const caller = router.createCaller(mockContext);
      const result = await caller.replyToThread({
        messageId: 'msg-1',
        senderId: 'user-2',
        content: 'Reply',
      });

      expect(result).toHaveProperty('thread_id', 'msg-1');
      expect(result).toHaveProperty('content', 'Reply');
    });
  });

  // 契约2 回归：pushChunk 按 phase 扇出到不同的 agent.response.* 事件
  describe('pushChunk fan-out（契约2 类型化信封）', () => {
    let eventBus: { publish: ReturnType<typeof vi.fn> };
    let routerWithBus: ReturnType<typeof messageRouter>;

    beforeEach(() => {
      eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
      routerWithBus = messageRouter(mockMessageService, undefined, eventBus as any);
    });

    function lastPublishedEvent() {
      const calls = eventBus.publish.mock.calls;
      return calls.length > 0 ? (calls[calls.length - 1][0] as any) : undefined;
    }

    it('phase=thinking → 发布 agent.response.thinking，payload.thinking 取自 data.text', async () => {
      const caller = routerWithBus.createCaller(mockContext);
      await caller.pushChunk({
        channelId: 'realm-1:channel-1',
        messageId: 'msg-agent-1',
        agentId: 'agent-1',
        phase: 'thinking',
        data: { text: '思考中...' },
      });

      const evt = lastPublishedEvent();
      expect(evt.eventType).toBe('agent.response.thinking');
      expect(evt.payload.messageId).toBe('msg-agent-1');
      // 契约3：channelId 归一化为裸 id
      expect(evt.payload.channelId).toBe('channel-1');
      expect(evt.payload.thinking).toBe('思考中...');
    });

    it('phase=content → 发布 agent.response.streaming，payload.chunk 取自 data.chunk', async () => {
      const caller = routerWithBus.createCaller(mockContext);
      await caller.pushChunk({
        channelId: 'channel-1',
        messageId: 'msg-agent-1',
        agentId: 'agent-1',
        phase: 'content',
        data: { chunk: 'Hello' },
      });

      const evt = lastPublishedEvent();
      expect(evt.eventType).toBe('agent.response.streaming');
      expect(evt.payload.chunk).toBe('Hello');
    });

    it('phase=tool → 发布 agent.response.tool_use，payload.tool 为结构化数据', async () => {
      const caller = routerWithBus.createCaller(mockContext);
      const tool = { toolName: 'search', status: 'success' };
      await caller.pushChunk({
        channelId: 'channel-1',
        messageId: 'msg-agent-1',
        agentId: 'agent-1',
        phase: 'tool',
        data: tool,
      });

      const evt = lastPublishedEvent();
      expect(evt.eventType).toBe('agent.response.tool_use');
      expect(evt.payload.tool).toMatchObject(tool);
    });

    it('phase=status / usage → 不扇出独立事件（仅作元数据）', async () => {
      const caller = routerWithBus.createCaller(mockContext);
      await caller.pushChunk({
        channelId: 'channel-1',
        messageId: 'msg-agent-1',
        agentId: 'agent-1',
        phase: 'status',
        data: { status: 'responding' },
      });
      await caller.pushChunk({
        channelId: 'channel-1',
        messageId: 'msg-agent-1',
        agentId: 'agent-1',
        phase: 'usage',
        data: { inputTokens: 1, outputTokens: 2 },
      });

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('abort lifecycle', () => {
    const deviceCaller = {
      userId: 'device-1',
      realmId: 'realm-1',
      userType: 'agent' as const,
    };

    function channelInRealm(overrides: Record<string, unknown> = {}) {
      return {
        realmId: 'realm-1',
        hasMember: vi.fn().mockReturnValue(true),
        ...overrides,
      };
    }

    it('broadcasts message.abort only to online devices in the channel realm', async () => {
      const channelService = {
        getChannelById: vi.fn().mockResolvedValue(channelInRealm()),
      };
      const deviceConnectionManager = {
        getOnlineDevices: vi.fn().mockReturnValue(['device-1', 'device-2']),
        getConnection: vi.fn((deviceId: string) => ({
          metadata: { realmId: deviceId === 'device-1' ? 'realm-1' : 'realm-2' },
        })),
        broadcastToDevices: vi.fn().mockResolvedValue(1),
      };
      const abortRouter = messageRouter(
        mockMessageService,
        channelService as any,
        undefined,
        deviceConnectionManager as any
      );

      const result = await abortRouter.createCaller(mockContext).abort({
        agentMessageId: 'agent-message-1',
        channelId: 'channel-1',
        reason: 'user',
      });

      expect(result).toEqual({ ok: true, dispatched: true });
      expect(channelService.getChannelById).toHaveBeenCalledWith('channel-1');
      expect(deviceConnectionManager.broadcastToDevices).toHaveBeenCalledWith(
        ['device-1'],
        expect.objectContaining({
          type: 'message.abort',
          payload: expect.objectContaining({
            agentMessageId: 'agent-message-1',
            reason: 'user',
          }),
        })
      );
    });

    it('rejects unauthenticated abort requests', async () => {
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn() } as any,
        undefined,
        {
          getOnlineDevices: vi.fn(),
          getConnection: vi.fn(),
          broadcastToDevices: vi.fn(),
        } as any
      );

      await expect(
        abortRouter.createCaller({ ...mockContext, userId: undefined }).abort({
          agentMessageId: 'agent-message-1',
          channelId: 'channel-1',
          reason: 'user',
        })
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('rejects abort when the channel belongs to another realm', async () => {
      const deviceConnectionManager = {
        getOnlineDevices: vi.fn(),
        getConnection: vi.fn(),
        broadcastToDevices: vi.fn(),
      };
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockResolvedValue(channelInRealm({ realmId: 'realm-2' })) } as any,
        undefined,
        deviceConnectionManager as any
      );

      await expect(
        abortRouter.createCaller(mockContext).abort({
          agentMessageId: 'agent-message-1',
          channelId: 'channel-other-realm',
          reason: 'user',
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(deviceConnectionManager.broadcastToDevices).not.toHaveBeenCalled();
    });

    it('rejects abort when the caller is not a channel member', async () => {
      const deviceConnectionManager = {
        getOnlineDevices: vi.fn(),
        getConnection: vi.fn(),
        broadcastToDevices: vi.fn(),
      };
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockResolvedValue(channelInRealm({ hasMember: () => false })) } as any,
        undefined,
        deviceConnectionManager as any
      );

      await expect(
        abortRouter.createCaller(mockContext).abort({
          agentMessageId: 'agent-message-1',
          channelId: 'channel-1',
          reason: 'user',
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(deviceConnectionManager.broadcastToDevices).not.toHaveBeenCalled();
    });

    it('rejects abort when the agent message belongs to another channel', async () => {
      vi.mocked(mockMessageService.getMessageById).mockResolvedValue({
        channelId: 'channel-other',
      } as any);
      const deviceConnectionManager = {
        getOnlineDevices: vi.fn(),
        getConnection: vi.fn(),
        broadcastToDevices: vi.fn(),
      };
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockResolvedValue(channelInRealm()) } as any,
        undefined,
        deviceConnectionManager as any
      );

      await expect(
        abortRouter.createCaller(mockContext).abort({
          agentMessageId: 'agent-message-1',
          channelId: 'channel-1',
          reason: 'user',
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(deviceConnectionManager.broadcastToDevices).not.toHaveBeenCalled();
    });

    it('does not broadcast when the channel cannot be resolved in the authenticated realm', async () => {
      const deviceConnectionManager = {
        getOnlineDevices: vi.fn(),
        getConnection: vi.fn(),
        broadcastToDevices: vi.fn(),
      };
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockRejectedValue(new Error('Channel not found')) } as any,
        undefined,
        deviceConnectionManager as any
      );

      await expect(
        abortRouter.createCaller(mockContext).abort({
          agentMessageId: 'agent-message-1',
          channelId: 'channel-other-realm',
          reason: 'user',
        })
      ).rejects.toThrow('Channel not found');
      expect(deviceConnectionManager.broadcastToDevices).not.toHaveBeenCalled();
    });

    it('persists and publishes an abort before resolving the user-message wait', async () => {
      const eventBus = { publish: vi.fn().mockResolvedValue(undefined) };
      const messageOrchestrator = { notifyAborted: vi.fn() };
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockResolvedValue(channelInRealm()) } as any,
        eventBus as any,
        undefined,
        messageOrchestrator as any
      );

      await abortRouter.createCaller({ ...mockContext, ...deviceCaller }).reportAbort({
        channelId: 'realm-1:channel-1',
        messageId: 'agent-message-1',
        userMessageId: 'user-message-1',
        agentId: 'agent-1',
        reason: 'user',
        partialContent: 'partial',
      });

      expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'agent-message-1',
          channelId: 'channel-1',
          content: 'partial',
          agentExecutionMetadata: {
            aborted: true,
            abort_reason: 'user',
          },
        })
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'agent.response.aborted',
          payload: expect.objectContaining({
            messageId: 'agent-message-1',
            channelId: 'channel-1',
          }),
        })
      );
      expect(messageOrchestrator.notifyAborted).toHaveBeenCalledWith('user-message-1');
    });

    it('rejects abort reports without the user message id used to release cloud pending state', async () => {
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockResolvedValue(channelInRealm()) } as any
      );

      await expect(
        abortRouter.createCaller({ ...mockContext, ...deviceCaller }).reportAbort({
          channelId: 'channel-1',
          messageId: 'agent-message-1',
        } as any)
      ).rejects.toThrow();
    });

    it('rejects unauthenticated abort reports', async () => {
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn() } as any
      );

      await expect(
        abortRouter.createCaller({ ...mockContext, userId: undefined, userType: 'agent' }).reportAbort({
          channelId: 'channel-1',
          messageId: 'agent-message-1',
          userMessageId: 'user-message-1',
        })
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('rejects human callers on reportAbort', async () => {
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn() } as any
      );

      await expect(
        abortRouter.createCaller(mockContext).reportAbort({
          channelId: 'channel-1',
          messageId: 'agent-message-1',
          userMessageId: 'user-message-1',
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('rejects abort reports for a channel in another realm', async () => {
      const abortRouter = messageRouter(
        mockMessageService,
        { getChannelById: vi.fn().mockResolvedValue(channelInRealm({ realmId: 'realm-2' })) } as any
      );

      await expect(
        abortRouter.createCaller({ ...mockContext, ...deviceCaller }).reportAbort({
          channelId: 'channel-1',
          messageId: 'agent-message-1',
          userMessageId: 'user-message-1',
        })
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(mockMessageService.sendMessage).not.toHaveBeenCalled();
    });
  });
});
