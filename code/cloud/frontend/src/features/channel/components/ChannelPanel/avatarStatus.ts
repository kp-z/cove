import type { StreamingPhase } from '../../domain/models/Message';
import type { AvatarStatus } from '@/shared/components/display/Avatar';

/**
 * 将「消息流式阶段」映射为「头像状态胶囊」的抽象状态（领域映射，纯函数）。
 *
 * 设计说明：
 * - 该函数是聊天领域与展示层之间的适配器，把领域概念 StreamingPhase
 *   翻译成展示层无关的 AvatarStatus。
 * - failed 优先级最高：无论处于哪个阶段，失败一律展示 error。
 * - completed / 无 phase：返回 undefined，表示不显示状态胶囊。
 *
 * @param phase    消息当前流式阶段（可选）
 * @param isFailed 消息是否失败（可选）
 * @returns        对应的 AvatarStatus；无需展示时返回 undefined
 */
export function mapStreamingPhaseToAvatarStatus(
  phase?: StreamingPhase,
  isFailed?: boolean,
): AvatarStatus | undefined {
  // 步骤 1：失败优先 —— 显式失败或 failed 阶段一律映射为 error
  if (isFailed || phase === 'failed') return 'error';

  // 步骤 2：按阶段映射到对应状态
  switch (phase) {
    case 'pending':
    case 'accepted':
      return 'loading';
    case 'thinking':
      return 'thinking';
    case 'tool_use':
      return 'tool';
    case 'responding':
      return 'responding';
    default:
      // 步骤 3：completed / 无 phase → 不显示状态胶囊
      return undefined;
  }
}
