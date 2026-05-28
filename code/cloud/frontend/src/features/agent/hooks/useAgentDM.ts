/**
 * useAgentDM Hook - 封装 Agent DM 相关逻辑
 *
 * 职责：
 * 1. 查询 Agent 的 DM Channel
 * 2. 确保 DM Channel 存在
 * 3. 打开 DM Channel（响应式）
 *
 * 设计优点：
 * - 高内聚：所有 Agent DM 逻辑封装在一个 Hook 中
 * - 低耦合：组件只需调用 openAgentDM，无需了解实现细节
 * - 响应式：自动处理桌面/移动端的不同行为
 */

import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { useChannelPanelStore } from '@/features/channel/stores/channelStore';
import { useResponsive } from '@/shared/hooks/useResponsive';

export function useAgentDM() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { openChannel } = useChannelPanelStore();
  const utils = trpc.useUtils();

  // 获取当前用户 ID（用于 setData）
  const { data: user } = trpc.user.me.useQuery();

  // 查询 Agent DM
  const getAgentDM = trpc.agentDM.getAgentDM.useQuery;

  // 确保 Agent DM 存在（幂等）
  const ensureAgentDM = trpc.agentDM.ensureAgentDM.useMutation({
    onSuccess: (channel) => {
      // 1. 立即将 channel 添加到 query cache（optimistic update）
      if (user?.user_id) {
        utils.channel.list.setData(
          { userId: user.user_id },
          (old) => {
            if (!old) return old;
            // 检查是否已存在，避免重复
            const exists = old.channels.some(ch => ch.channel_id === channel.channel_id);
            if (exists) return old;
            // 添加新 channel 到列表
            return {
              ...old,
              channels: [...old.channels, channel],
            };
          }
        );
      }

      // 2. 然后 invalidate 触发后台 refetch
      utils.channel.list.invalidate();
    },
  });

  /**
   * 打开 Agent 的 DM Channel
   * - 桌面端：打开 panel
   * - 移动端：导航到 channel 页面
   */
  const openAgentDM = async (agentId: string) => {
    try {
      // 确保 DM Channel 存在（幂等，如果已存在直接返回）
      const channel = await ensureAgentDM.mutateAsync({ agentId });

      // 响应式打开
      if (isMobile) {
        navigate(`/channel/${channel.channel_id}`);
      } else {
        openChannel(channel.channel_id);
      }
    } catch (error) {
      console.error('[ERROR] Failed to open agent DM', error);
      throw error;
    }
  };

  return {
    getAgentDM,
    ensureAgentDM,
    openAgentDM,
    isLoading: ensureAgentDM.isPending,
  };
}
