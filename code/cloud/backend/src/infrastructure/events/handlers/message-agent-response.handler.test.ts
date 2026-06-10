/**
 * MessageAgentResponseHandler 单元测试
 *
 * 重点验证「契约 0」：agentPool 中的 agent 在任意 channel 类型（public/private/dm）
 * 收到用户消息都应自动触发响应（对齐 commit 653e869），同时保留 @mention、
 * 状态过滤、防自回复、防 agent 消息循环等护栏。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageAgentResponseHandler } from './message-agent-response.handler';
import type { DomainEvent } from '../../../application/interfaces/event-bus.interface';
import type { IAgentRepository } from '../../../application/interfaces/repositories/agent.repository.interface';
import type { IChannelRepository } from '../../../application/interfaces/repositories/channel.repository.interface';
import type { IMessageRepository } from '../../../application/interfaces/repositories/message.repository.interface';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';
import type { ILogger } from '../../../application/interfaces/logger.interface';
import type { IMessageOrchestrator } from '../../../domain/message-orchestrator/message-orchestrator.interface';

// --- 轻量测试替身：仅构造 handler 实际读取的字段 ---

interface BuildMessageOptions {
  senderId?: string;
  senderType?: 'human' | 'agent';
  status?: string;
  mentions?: Array<{ mentionType: string; mentionId: string }>;
  content?: string;
}

function buildMessage(opts: BuildMessageOptions = {}) {
  return {
    messageId: 'msg-1',
    senderId: opts.senderId ?? 'user-1',
    senderType: opts.senderType ?? 'human',
    status: opts.status ?? 'sent',
    mentions: opts.mentions ?? [],
    content: opts.content ?? 'Hello',
  } as any;
}

interface BuildChannelOptions {
  type?: 'public' | 'private' | 'dm';
  agentPool?: string[];
  members?: Array<{ memberId: string; memberType: 'human' | 'agent' }>;
}

function buildChannel(opts: BuildChannelOptions = {}) {
  return {
    channelId: 'channel-1',
    realmId: 'realm-1',
    type: opts.type ?? 'public',
    agentPool: opts.agentPool ?? ['agent-1'],
    members: opts.members ?? [],
  } as any;
}

function buildAgent(status: string = 'active', agentId: string = 'agent-1') {
  return {
    agentId,
    name: 'test-agent',
    displayName: 'Test Agent',
    status,
  } as any;
}

function buildEvent(): DomainEvent {
  return {
    eventId: 'evt-1',
    eventType: 'message.created',
    aggregateId: 'msg-1',
    aggregateType: 'Message',
    occurredAt: new Date(),
    payload: {
      messageId: 'msg-1',
      channelId: 'channel-1',
      realmId: 'realm-1',
      senderType: 'human',
    },
  } as any;
}

describe('MessageAgentResponseHandler', () => {
  let handler: MessageAgentResponseHandler;
  let agentRepository: IAgentRepository;
  let channelRepository: IChannelRepository;
  let messageRepository: IMessageRepository;
  let messageOrchestrator: IMessageOrchestrator;
  let eventBus: IEventBus;
  let logger: ILogger;

  beforeEach(() => {
    agentRepository = { findById: vi.fn() } as unknown as IAgentRepository;
    channelRepository = { findById: vi.fn() } as unknown as IChannelRepository;
    messageRepository = { findById: vi.fn() } as unknown as IMessageRepository;
    messageOrchestrator = { enqueue: vi.fn().mockResolvedValue('task-1') } as unknown as IMessageOrchestrator;
    eventBus = { publish: vi.fn().mockResolvedValue(undefined) } as unknown as IEventBus;
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as ILogger;

    handler = new MessageAgentResponseHandler(
      agentRepository,
      channelRepository,
      messageRepository,
      messageOrchestrator,
      eventBus,
      logger
    );
  });

  /**
   * 断言：agent 被触发（发布 accepted 事件 + 入队）
   */
  function expectTriggered() {
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'agent.response.accepted' })
    );
    expect(messageOrchestrator.enqueue).toHaveBeenCalled();
  }

  function expectNotTriggered() {
    expect(eventBus.publish).not.toHaveBeenCalled();
    expect(messageOrchestrator.enqueue).not.toHaveBeenCalled();
  }

  it.each(['public', 'private', 'dm'] as const)(
    '应在 %s channel 中对 agentPool 内的 agent 自动响应（对齐 653e869）',
    async (channelType) => {
      vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage());
      vi.mocked(channelRepository.findById).mockResolvedValue(
        buildChannel({ type: channelType, agentPool: ['agent-1'] })
      );
      vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('active'));

      await handler.handle(buildEvent());

      expectTriggered();
    }
  );

  it('应在 idle 状态下仍然响应', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage());
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('idle'));

    await handler.handle(buildEvent());

    expectTriggered();
  });

  it('agent 非 active/idle 时不响应', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage());
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('error'));

    await handler.handle(buildEvent());

    expectNotTriggered();
  });

  it('消息状态非 sent 时不响应', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage({ status: 'deleted' }));
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('active'));

    await handler.handle(buildEvent());

    expectNotTriggered();
  });

  it('不响应 agent 自己发送的消息', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(
      buildMessage({ senderId: 'agent-1' })
    );
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('active'));

    await handler.handle(buildEvent());

    expectNotTriggered();
  });

  it('@mention 命中时响应', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(
      buildMessage({ mentions: [{ mentionType: 'agent', mentionId: 'agent-1' }] })
    );
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('active'));

    await handler.handle(buildEvent());

    expectTriggered();
  });

  it('agent 不在 agentPool 中则跳过（channel.agentPool 为空时直接返回）', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage());
    vi.mocked(channelRepository.findById).mockResolvedValue(
      buildChannel({ agentPool: [] })
    );

    await handler.handle(buildEvent());

    expectNotTriggered();
  });

  it('senderType 为 agent 的事件直接跳过（防循环）', async () => {
    const agentEvent = {
      ...buildEvent(),
      payload: { ...buildEvent().payload, senderType: 'agent' },
    } as DomainEvent;

    await handler.handle(agentEvent);

    expect(messageRepository.findById).not.toHaveBeenCalled();
    expectNotTriggered();
  });

  it('非 message.created 事件直接跳过', async () => {
    const otherEvent = { ...buildEvent(), eventType: 'message.updated' } as DomainEvent;

    await handler.handle(otherEvent);

    expect(messageRepository.findById).not.toHaveBeenCalled();
    expectNotTriggered();
  });

  // 契约1：服务端权威消息 ID 回归测试。
  // accepted 事件的 payload.messageId 必须等于 enqueue.metadata.agentMessageId，
  // 即「占位 id == 流式/落库 id」的源头一致性，前端据此无需任何模糊匹配。
  it('契约1：accepted.messageId 与 enqueue.metadata.agentMessageId 一致，且 inReplyTo 为用户消息 id', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage());
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('active'));

    await handler.handle(buildEvent());

    // 取出 accepted 事件
    const publishCalls = vi.mocked(eventBus.publish).mock.calls;
    const acceptedCall = publishCalls.find(
      ([e]) => (e as DomainEvent).eventType === 'agent.response.accepted'
    );
    expect(acceptedCall).toBeDefined();
    const acceptedPayload = (acceptedCall![0] as DomainEvent).payload as Record<string, unknown>;

    // 取出 enqueue 调用
    const enqueueArg = vi.mocked(messageOrchestrator.enqueue).mock.calls[0][0] as {
      messageId: string;
      metadata?: { agentMessageId?: string; userMessageId?: string };
    };

    const agentMessageId = acceptedPayload.messageId as string;
    expect(typeof agentMessageId).toBe('string');
    expect(agentMessageId.length).toBeGreaterThan(0);

    // 源头一致性：accepted.messageId === enqueue.metadata.agentMessageId
    expect(enqueueArg.metadata?.agentMessageId).toBe(agentMessageId);

    // inReplyTo / userMessageId 指向触发的用户消息
    expect(acceptedPayload.inReplyTo).toBe('msg-1');
    expect(enqueueArg.metadata?.userMessageId).toBe('msg-1');

    // agentMessageId 不应等于用户消息 id（是新分配的权威 id）
    expect(agentMessageId).not.toBe('msg-1');
  });

  // 契约3：accepted 事件 payload 的 channelId 必须是裸 id（与前端订阅过滤一致）
  it('契约3：accepted 事件 channelId 为裸 id（无 realm 前缀）', async () => {
    vi.mocked(messageRepository.findById).mockResolvedValue(buildMessage());
    vi.mocked(channelRepository.findById).mockResolvedValue(buildChannel());
    vi.mocked(agentRepository.findById).mockResolvedValue(buildAgent('active'));

    await handler.handle(buildEvent());

    const acceptedCall = vi.mocked(eventBus.publish).mock.calls.find(
      ([e]) => (e as DomainEvent).eventType === 'agent.response.accepted'
    );
    const payload = (acceptedCall![0] as DomainEvent).payload as Record<string, unknown>;
    expect(payload.channelId).toBe('channel-1');
  });
});
