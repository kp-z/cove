import { describe, it, expect } from 'vitest';
import { messageActionManager } from './registry';
import { Message } from '../../../../domain/models/Message';

function buildAgentMessage(agentMetadata: Message['agentMetadata']): Message {
  return new Message({
    id: 'msg-1',
    channelId: 'channel-1',
    senderId: 'agent-1',
    senderName: 'Agent',
    senderType: 'agent',
    content: '这是一条纯文本回复，没有工具调用',
    timestamp: new Date(),
    source: 'remote',
    status: 'sent',
    retryCount: 0,
    agentMetadata,
  });
}

describe('registry: details action shouldShow', () => {
  it('should show when message has agentMetadata but no thinking/tool_logs (plain text reply)', () => {
    // 回归用例：Claude CLI 流式适配器不会调用 onThinking，纯文本回复的 thinking 恒为
    // undefined、tool_logs 为空数组，此前的收窄条件会导致「详情」按钮完全不可见。
    const message = buildAgentMessage({
      usage: { totalTokens: 120 },
    });

    const detailsAction = messageActionManager.get('details')!;
    expect(detailsAction.shouldShow?.(message)).toBe(true);
  });

  it('should show when message has thinking content', () => {
    const message = buildAgentMessage({ thinking: '思考过程内容' });
    const detailsAction = messageActionManager.get('details')!;
    expect(detailsAction.shouldShow?.(message)).toBe(true);
  });

  it('should show when message has tool_logs', () => {
    const message = buildAgentMessage({
      tool_logs: [
        {
          id: 'tool-1',
          timestamp: new Date().toISOString(),
          toolName: 'Read',
          action: 'read file',
          status: 'success',
        },
      ],
    });
    const detailsAction = messageActionManager.get('details')!;
    expect(detailsAction.shouldShow?.(message)).toBe(true);
  });

  it('should not show when message has no agentMetadata at all', () => {
    const message = buildAgentMessage(undefined);
    const detailsAction = messageActionManager.get('details')!;
    expect(detailsAction.shouldShow?.(message)).toBe(false);
  });
});
