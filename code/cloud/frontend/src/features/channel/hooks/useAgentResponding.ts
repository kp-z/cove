/**
 * useAgentResponding Hook
 *
 * 判断当前频道是否存在「尚未完成」的 agent 执行中消息。
 *
 * 背景：Local 设备端的消息编排器（MessageOrchestrator）是单一全局队列 + 严格串行处理
 * （见 domain/agent-runtime/message-orchestrator.ts 的 poll → processNext，一次仅处理一个
 * task，等待其完全结束才会取下一条），并不支持真正的并发多轮执行。若前端在 agent 尚未回复
 * 完成时允许用户无感继续发送消息，会营造出「可以并发对话」的假象——实际上后续消息只是被
 * 悄悄排在队列里，用户无法感知等待中的状态。
 *
 * 因此在前端侧做出对应约束：复用 MessageStateManager 已经维护的 agent 进度叠加层
 * （agentProgress，通过 subscribe 拿到的派生 Message 列表即可判断），不新增独立状态源。
 */

import { useEffect, useState } from 'react';
import { messageStateManager } from '../domain/MessageStateManager';

export function useAgentResponding(channelId: string): boolean {
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    const unsubscribe = messageStateManager.subscribe(channelId, (messages) => {
      // agent 进度占位消息始终携带 streamingPhase；失败或中止均不算「响应中」。
      const active = messages.some(
        (message) =>
          message.senderType === 'agent' &&
          !!message.streamingPhase &&
          message.streamingPhase !== 'failed' &&
          message.streamingPhase !== 'aborted'
      );
      setIsResponding(active);
    });
    return unsubscribe;
  }, [channelId]);

  return isResponding;
}

export function useAgentAbortable(channelId: string): boolean {
  const [isAbortable, setIsAbortable] = useState(false);

  useEffect(() => {
    const unsubscribe = messageStateManager.subscribe(channelId, () => {
      setIsAbortable(messageStateManager.getInFlightAgentMessageIds(channelId).length > 0);
    });
    return unsubscribe;
  }, [channelId]);

  return isAbortable;
}
