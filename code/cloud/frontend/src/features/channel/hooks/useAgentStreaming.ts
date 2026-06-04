/**
 * useAgentStreaming Hook
 * 专门处理 Agent 响应的流式更新
 */

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { messageStateManager } from '../domain/MessageStateManager';

export function useAgentStreaming(channelId: string) {
  // 订阅 Agent 响应事件
  trpc.subscription.onAgentResponse.useSubscription(
    {
      channelId,
      events: [
        'agent.response.accepted',
        'agent.response.thinking',
        'agent.response.streaming',
        'agent.response.completed',
        'agent.response.failed',
      ],
    },
    {
      enabled: !!channelId,
      onData: (event) => {
        console.log('[useAgentStreaming] Agent response event:', event);

        const { eventType, data } = event;

        switch (eventType) {
          case 'agent.response.accepted':
            // Agent 接收确认
            if (data.messageId) {
              messageStateManager.updateStreamingPhase(data.messageId, 'accepted');
            }
            break;

          case 'agent.response.thinking':
            // 思考中
            if (data.messageId) {
              messageStateManager.updateStreamingPhase(data.messageId, 'thinking');
              if (data.thinking) {
                messageStateManager.updateStreamingData(data.messageId, {
                  thinking: data.thinking,
                });
              }
            }
            break;

          case 'agent.response.streaming':
            // 流式内容
            if (data.messageId && data.chunk) {
              messageStateManager.updateStreamingPhase(data.messageId, 'responding');
              messageStateManager.appendStreamingContent(data.messageId, data.chunk);
            }
            break;

          case 'agent.response.completed':
            // 完成
            if (data.messageId) {
              messageStateManager.updateStreamingPhase(data.messageId, 'completed');
            }
            break;

          case 'agent.response.failed':
            // 失败
            if (data.messageId) {
              messageStateManager.updateMessageStatus(data.messageId, 'failed', {
                code: 'AGENT_ERROR',
                message: data.error || 'Agent 响应失败',
                retryable: false,
              });
            }
            break;
        }
      },
      onError: (error) => {
        console.error('[useAgentStreaming] Subscription error:', error);
      },
    }
  );

  // 订阅消息流式更新（thinking, tool_log, usage, status）
  trpc.subscription.onMessageStreaming.useSubscription(
    {
      messageId: '', // 这里需要动态的 messageId，暂时留空
    },
    {
      enabled: false, // 暂时禁用，需要配合具体的 messageId
      onData: (event) => {
        console.log('[useAgentStreaming] Message streaming event:', event);

        const { eventType, data } = event;

        switch (eventType) {
          case 'message.streaming.thinking':
            if (data.messageId && data.thinking) {
              messageStateManager.updateStreamingData(data.messageId, {
                thinking: data.thinking,
              });
            }
            break;

          case 'message.streaming.tool_log':
            if (data.messageId && data.toolName) {
              messageStateManager.updateStreamingPhase(data.messageId, 'tool_use');
              messageStateManager.updateStreamingData(data.messageId, {
                currentTool: {
                  name: data.toolName,
                  params: data.toolParams,
                },
              });
            }
            break;

          case 'message.streaming.status':
            if (data.messageId && data.streamingStatus) {
              const phaseMap: Record<string, any> = {
                thinking: 'thinking',
                tool_use: 'tool_use',
                responding: 'responding',
                completed: 'completed',
              };
              const phase = phaseMap[data.streamingStatus];
              if (phase) {
                messageStateManager.updateStreamingPhase(data.messageId, phase);
              }
            }
            break;
        }
      },
    }
  );
}
