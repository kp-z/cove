/**
 * useAgentStreaming Hook
 * 专门处理 Agent 响应的流式更新
 */

import { trpc } from '@/lib/trpc';
import { messageStateManager } from '../domain/MessageStateManager';
import { Message } from '../domain/models/Message';
import { logger } from '@/lib/logger';

const log = logger.scope('useAgentStreaming');

export function useAgentStreaming(channelId: string) {
  // 订阅 Agent 响应事件
  trpc.subscription.onAgentResponse.useSubscription(
    {
      channelId,
      events: [
        'agent.response.accepted',
        'agent.response.thinking',
        'agent.response.tool_use',
        'agent.response.streaming',
        'agent.response.completed',
        'agent.response.failed',
      ],
    },
    {
      enabled: !!channelId,
      onData: (event) => {
        log.debug('Agent response event', event);

        const { eventType, data } = event;

        // 契约1：所有 agent.response.* 事件的 data.messageId 即服务端预分配的
        // 权威 agentMessageId。占位消息、流式更新、最终落库消息共享同一 id，
        // 因此前端无需任何拼接 id / 模糊匹配 / 超时重连逻辑。
        const agentMessageId: string | undefined = data.messageId;
        if (!agentMessageId) {
          return;
        }

        switch (eventType) {
          case 'agent.response.accepted':
            // Agent 接收确认 - 以权威 id 创建占位消息（幂等：已存在则跳过）
            if (data.agentId && data.agentName) {
              const existing = messageStateManager
                .getMessages(channelId)
                .find((m) => m.id === agentMessageId);

              if (!existing) {
                const agentPlaceholder = new Message({
                  id: agentMessageId,
                  messageId: agentMessageId,
                  channelId,
                  senderId: data.agentId,
                  senderName: data.agentName, // 使用后端提供的真实名称
                  senderType: 'agent',
                  content: '',
                  timestamp: new Date(),
                  source: 'local',
                  status: 'streaming',
                  streamingPhase: 'accepted',
                  retryCount: 0,
                });

                messageStateManager.addLocalMessage(agentPlaceholder);
              }
            }
            break;

          case 'agent.response.thinking':
            // 契约2：思考相位（由 backend 扇出的 agent.response.thinking 真实事件驱动）
            messageStateManager.updateStreamingPhase(agentMessageId, 'thinking');
            if (data.thinking) {
              messageStateManager.updateStreamingData(agentMessageId, {
                thinking: data.thinking,
              });
            }
            break;

          case 'agent.response.tool_use': {
            // 契约2：工具相位（data.tool 为结构化工具日志，不污染正文）
            messageStateManager.updateStreamingPhase(agentMessageId, 'tool_use');
            const tool: any = data.tool;
            if (tool) {
              messageStateManager.updateStreamingData(agentMessageId, {
                currentTool: {
                  name: tool.toolName ?? tool.name ?? 'unknown',
                  params: tool.params ?? tool.input,
                },
              });
            }
            break;
          }

          case 'agent.response.streaming':
            // 契约2：正文相位（data.chunk 为正文增量，追加到消息内容）
            if (data.chunk) {
              messageStateManager.updateStreamingPhase(agentMessageId, 'responding');
              messageStateManager.appendStreamingContent(agentMessageId, data.chunk);
            }
            break;

          case 'agent.response.completed':
            // 完成（最终消息到达时会由 syncRemoteMessages 用同一 id 覆盖占位）
            messageStateManager.updateStreamingPhase(agentMessageId, 'completed');
            break;

          case 'agent.response.failed':
            // 失败
            messageStateManager.updateMessageStatus(agentMessageId, 'failed', {
              code: 'AGENT_ERROR',
              message: data.error || 'Agent 响应失败',
              retryable: false,
            });
            break;
        }
      },
      onError: (error) => {
        // 可观测性：带上 channelId，便于与三进程日志按链路对齐
        log.error('Subscription error', { channelId, error });
      },
    }
  );
}
