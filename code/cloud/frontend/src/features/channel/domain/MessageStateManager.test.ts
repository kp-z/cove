import { describe, expect, it } from 'vitest';
import { MessageStateManager } from './MessageStateManager';

describe('MessageStateManager abortAgentProgress', () => {
  it('marks active progress aborted and preserves partial content', () => {
    const manager = new MessageStateManager();
    const channelId = 'channel-abort-test';

    manager.startAgentProgress(channelId, {
      repliesToLocalId: 'local-message-1',
      agentId: 'agent-1',
      agentName: 'Agent',
    });
    manager.promoteAgentProgress({
      agentMessageId: 'agent-message-1',
      agentId: 'agent-1',
      agentName: 'Agent',
      channelId,
    });
    manager.setAgentProgressPhase('agent-message-1', 'responding');
    manager.appendAgentProgressContent('agent-message-1', '部分回复');

    expect(manager.getInFlightAgentMessageIds(channelId)).toEqual(['agent-message-1']);

    manager.abortAgentProgress('agent-message-1');

    const [message] = manager.getMessages(channelId);
    expect(message.streamingPhase).toBe('aborted');
    expect(message.status).toBe('sent');
    expect(message.content).toBe('部分回复');
    expect(message.streamingData?.partialContent).toBe('部分回复');
    expect(manager.getInFlightAgentMessageIds(channelId)).toEqual([]);
  });

  it('includes accepted phase in in-flight agent message ids', () => {
    const manager = new MessageStateManager();
    const channelId = 'channel-accepted-test';

    manager.startAgentProgress(channelId, {
      repliesToLocalId: 'local-message-2',
      agentId: 'agent-1',
      agentName: 'Agent',
    });
    manager.promoteAgentProgress({
      agentMessageId: 'agent-message-2',
      agentId: 'agent-1',
      agentName: 'Agent',
      channelId,
    });

    expect(manager.getInFlightAgentMessageIds(channelId)).toEqual(['agent-message-2']);
  });

  it('keeps provisional pending progress non-abortable until it has an agentMessageId', () => {
    const manager = new MessageStateManager();
    const channelId = 'channel-pending-abort-test';

    manager.startAgentProgress(channelId, {
      repliesToLocalId: 'local-message-3',
      agentId: 'agent-1',
      agentName: 'Agent',
    });

    expect(manager.getInFlightAgentMessageIds(channelId)).toEqual([]);

    const [message] = manager.getMessages(channelId);
    expect(message.streamingPhase).toBe('pending');
    expect(message.status).toBe('streaming');
  });

  it('enables Stop for thinking, tool_use, and responding after an authoritative id exists', () => {
    const manager = new MessageStateManager();
    const channelId = 'channel-phase-abort-test';

    manager.startAgentProgress(channelId, {
      repliesToLocalId: 'local-message-4',
      agentId: 'agent-1',
      agentName: 'Agent',
    });
    manager.promoteAgentProgress({
      agentMessageId: 'agent-message-4',
      agentId: 'agent-1',
      agentName: 'Agent',
      channelId,
    });

    for (const phase of ['thinking', 'tool_use', 'responding'] as const) {
      manager.setAgentProgressPhase('agent-message-4', phase);
      expect(manager.getInFlightAgentMessageIds(channelId)).toEqual(['agent-message-4']);
    }
  });
});
