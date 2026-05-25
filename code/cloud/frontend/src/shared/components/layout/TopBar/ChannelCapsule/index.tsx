import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Capsule } from '@/shared/components/ui/Capsule';
import { ChannelListCompact } from '@/features/channel/components/ChannelList/ChannelListCompact';
import { useChannelNavigation } from '@/features/channel/hooks/useChannelNavigation';
import { useChannels } from '@/lib/trpc/hooks';

/**
 * ChannelCapsule - TopBar 中的 Channel 切换胶囊
 *
 * 功能：
 * - 显示当前选中的 channel 名称
 * - 点击展开 Popover，显示 ChannelListCompact
 * - 选择 channel 后跳转到 /channels?channel={id}
 *
 * 设计：
 * - 使用统一的 Capsule 组件
 * - Popover 宽度 280px，最大高度 400px
 * - 选中状态时 Capsule 高亮
 */
export function ChannelCapsule() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { channelId } = useChannelNavigation();
  const { data } = useChannels();

  // Find current channel
  const channels = data?.channels || [];
  const currentChannel = channels.find((ch: any) => ch.channel_id === channelId);

  const handleChannelSelect = (id: string) => {
    navigate(`/channels?channel=${id}`);
    setIsOpen(false);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <div>
          <Capsule
            variant={isOpen ? 'active' : 'default'}
            ariaLabel="Switch channel"
            ariaExpanded={isOpen}
            minWidth="min-w-[120px]"
          >
            <Hash size={16} className="shrink-0" />
            <span className="text-sm font-medium truncate max-w-[100px]">
              {currentChannel?.name || 'Channels'}
            </span>
          </Capsule>
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="
            w-[280px] bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl
            z-50 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2
          "
        >
          <ChannelListCompact
            selectedChannelId={channelId}
            onChannelSelect={handleChannelSelect}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
