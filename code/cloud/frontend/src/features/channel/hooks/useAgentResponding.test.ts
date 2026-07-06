import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAgentResponding } from './useAgentResponding';
import { messageStateManager } from '../domain/MessageStateManager';
import { Message } from '../domain/models/Message';

// MessageStateManager 是模块级单例，用例之间用不同的 channelId 互相隔离，避免状态串扰。
const CHANNEL_ID = 'channel-agent-responding-test';

describe('useAgentResponding', () => {
  it('returns false when there is no active agent progress', () => {
    const { result } = renderHook(() => useAgentResponding(`${CHANNEL_ID}-1`));
    expect(result.current).toBe(false);
  });

  it('returns true once an agent progress placeholder is started, false after it fails', () => {
    const channelId = `${CHANNEL_ID}-2`;
    const { result } = renderHook(() => useAgentResponding(channelId));

    expect(result.current).toBe(false);

    act(() => {
      messageStateManager.startAgentProgress(channelId, {
        repliesToLocalId: 'temp-1',
        agentId: 'agent-1',
        agentName: 'Agent',
      });
    });

    expect(result.current).toBe(true);

    act(() => {
      messageStateManager.promoteAgentProgress({
        agentMessageId: 'agent-msg-1',
        agentId: 'agent-1',
        agentName: 'Agent',
        channelId,
      });
    });

    expect(result.current).toBe(true);

    act(() => {
      messageStateManager.failAgentProgress('agent-msg-1', {
        code: 'AGENT_ERROR',
        message: 'boom',
        retryable: false,
      });
    });

    // 失败态不应继续阻塞发送。
    expect(result.current).toBe(false);
  });

  it('returns false again once the agent response is upserted as a server message', () => {
    const channelId = `${CHANNEL_ID}-3`;
    const { result } = renderHook(() => useAgentResponding(channelId));

    act(() => {
      messageStateManager.startAgentProgress(channelId, {
        repliesToLocalId: 'temp-2',
        agentId: 'agent-1',
        agentName: 'Agent',
      });
      messageStateManager.promoteAgentProgress({
        agentMessageId: 'agent-msg-2',
        agentId: 'agent-1',
        agentName: 'Agent',
        channelId,
      });
    });

    expect(result.current).toBe(true);

    act(() => {
      messageStateManager.upsertServerMessages(channelId, [
        new Message({
          id: 'agent-msg-2',
          messageId: 'agent-msg-2',
          channelId,
          senderId: 'agent-1',
          senderName: 'Agent',
          senderType: 'agent',
          content: '完成的回复',
          timestamp: new Date(),
          source: 'remote',
          status: 'sent',
          retryCount: 0,
        }),
      ]);
    });

    expect(result.current).toBe(false);
  });
});
