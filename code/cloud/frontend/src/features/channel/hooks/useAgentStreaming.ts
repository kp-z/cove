/**
 * useAgentStreaming Hook
 * 专门处理 Agent 响应的流式更新
 */

import { trpc } from '@/lib/trpc';
import { messageStateManager } from '../domain/MessageStateManager';
import { Message, type StreamingPhase } from '../domain/models/Message';
import { logger } from '@/lib/logger';

const log = logger.scope('useAgentStreaming');

export function useAgentStreaming(channelId: string) {
  const utils = trpc.useUtils();

  // 实时反馈链路：agent 进度叠加层只承载「过程态」，不存最终正文。
  // 最终正文只存在于「落库后的权威消息」中（serverMessages）。
  //
  // 方案A（单一真相源、零 refetch 竞态）：
  //   后端 agent.response.completed 事件已随事件下发刚落库的权威消息正文，
  //   前端在 completed 时直接经 upsertServerMessages 落地为 server 消息——
  //   正文即刻原地显示，不再依赖「失效 message.list → 重新拉取」这条竞态链路。
  //
  // invalidateMessageList 仅作为「兜底 / 加速器」：
  //   1. 旧后端未携带正文时的兜底（仍走 refetch 拉正文）。
  //   2. failed 路径与 useMessageList 的 onMessage 仍用它做最终一致性对账。
  // 注意：必须使用 tRPC 的 useUtils()（生成正确的 query key），而非手写
  // queryKey 偏匹配——后者在本仓库实测无法命中 useQuery({channelId, limit}) 的查询。
  const invalidateMessageList = () => {
    void utils.message.list.invalidate();
  };

  // 方案A 落地：把 completed 事件携带的权威消息写入「单一真相源」。
  // 步骤：
  //   1. 若事件携带 message（新后端）→ 经 Message.fromRemote 解析为权威 server 消息，
  //      调用 upsertServerMessages：写入 serverMessages → 删除同 id 的 agent 进度占位 →
  //      通知重渲染，正文即刻原地出现（不刷新 / 不重复 / 不消失 / 位置正确）。
  //   2. 否则（旧后端无 payload）→ 收敛占位为 completed 并失效列表，靠 refetch 拉正文（兜底）。
  const finalizeAgentResponse = (agentMessageId: string, data: { message?: unknown }) => {
    // 步骤1：若事件携带权威正文（新后端）→ 直接 upsert 进 serverMessages，正文即刻原地出现。
    if (data.message) {
      messageStateManager.upsertServerMessages(channelId, [Message.fromRemote(data.message)]);
    } else {
      // 无 payload（旧后端 / 未携带）→ 先把占位收敛为 completed，正文靠下面的 refetch 拉取。
      messageStateManager.setAgentProgressPhase(agentMessageId, 'completed');
    }

    // 步骤2：始终失效一次 message.list（稳健兜底，必须保留）。
    //   原因：agent.response.completed 是后端在「正文落库之后」发布的权威生命周期事件，
    //   此处 refetch 必能拉到正文，且不会与「落库前上报的 status 心跳」竞态/被去重。
    //   若缺这次失效，当直接落地未生效（后端未带 message / 事件异常）时，React Query 会一直
    //   返回「发 agent 回复之前」的陈旧 message.list 缓存 —— 切频道回来读缓存也不显示，
    //   只有硬刷新（全新 query）才出，正是「即使切换也不显示」的根因。
    invalidateMessageList();
  };

  // 订阅 Agent 响应事件
  trpc.subscription.onAgentResponse.useSubscription(
    {
      channelId,
      events: [
        'agent.response.accepted',
        'agent.response.status',
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

        // 所有 agent.response.* 事件的 data.messageId 即服务端预分配的权威 agentMessageId。
        // 进度叠加层、流式更新、最终落库消息共享同一 id，前端无需任何拼接 id / 模糊匹配。
        const agentMessageId: string | undefined = data.messageId;
        if (!agentMessageId) {
          return;
        }

        switch (eventType) {
          case 'agent.response.accepted': {
            // Agent 接收确认：把发送时建立的 provisional 进度提升为以权威 agentMessageId
            // 为键的 accepted 进度（pending → accepted 始终是同一个派生气泡）。
            // 找不到 provisional（占位已超时 / 非本端触发）时，promote 会按权威 id 新建。
            messageStateManager.promoteAgentProgress({
              agentMessageId,
              inReplyTo: data.inReplyTo,
              agentId: data.agentId,
              agentName: data.agentName,
              channelId,
            });
            break;
          }

          case 'agent.response.status': {
            // 共享事件：后端统一上报 agent 阶段状态。
            // payload: { messageId, channelId, agentId, status }
            // status ∈ thinking | tool_use | responding | completed
            const statusToPhase: Record<string, StreamingPhase> = {
              thinking: 'thinking',
              tool_use: 'tool_use',
              responding: 'responding',
              completed: 'completed',
            };
            const phase = statusToPhase[data.status as string];
            // 注意：status==='completed' 是适配器在「正文落库之前」上报的过程态心跳，
            // 不携带正文。此处仅收敛阶段，绝不在此失效列表——否则会抢跑在落库之前发起一次
            // 取不到正文的 refetch（且可能与后续真正的 completed 失效被 React Query 去重，
            // 导致正文永远不刷新，正是「必须手动刷新」的根因）。
            // 真正的「正文落地」统一由权威生命周期事件 agent.response.completed 负责（见下）。
            // 防闪烁逻辑会把 completed 占位仍以 responding 渲染，故此处为无副作用收敛。
            if (phase) {
              messageStateManager.setAgentProgressPhase(agentMessageId, phase);
            }
            break;
          }

          case 'agent.response.thinking':
            // 思考相位（由 backend 扇出的 agent.response.thinking 真实事件驱动）。
            messageStateManager.setAgentProgressPhase(agentMessageId, 'thinking');
            if (data.thinking) {
              messageStateManager.updateAgentProgress(agentMessageId, {
                thinking: data.thinking,
              });
            }
            break;

          case 'agent.response.tool_use': {
            // 工具相位（data.tool 为结构化工具日志，不污染正文）。
            messageStateManager.setAgentProgressPhase(agentMessageId, 'tool_use');
            const tool: any = data.tool;
            if (tool) {
              messageStateManager.updateAgentProgress(agentMessageId, {
                currentTool: {
                  name: tool.toolName ?? tool.name ?? 'unknown',
                  params: tool.params ?? tool.input,
                },
              });
            }
            break;
          }

          case 'agent.response.streaming': {
            // 正文相位（data.chunk 为正文增量，追加到进度的 partialContent，不进 serverMessages）。
            if (data.chunk) {
              messageStateManager.setAgentProgressPhase(agentMessageId, 'responding');
              messageStateManager.appendAgentProgressContent(agentMessageId, data.chunk);
            }
            break;
          }

          case 'agent.response.completed':
            // 完成（权威生命周期事件，后端在正文落库成功后发布）：
            // 方案A——直接把事件携带的权威正文写入 serverMessages，原地显示完整正文，
            // 派生占位随之自动消失（不刷新 / 不重复 / 不消失 / 位置正确）。
            finalizeAgentResponse(agentMessageId, data);
            break;

          case 'agent.response.failed':
            // 失败：进度置为 failed，并刷新一次列表，确保与服务端落库结果一致。
            messageStateManager.failAgentProgress(agentMessageId, {
              code: 'AGENT_ERROR',
              message: data.error || 'Agent 响应失败',
              retryable: false,
            });
            invalidateMessageList();
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
