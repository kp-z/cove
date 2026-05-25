import React, { useState } from 'react';
import { Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChannelNavigation } from '@/features/channel/hooks/useChannelNavigation';
import { useChannels } from '@/lib/trpc/hooks';
import { Capsule } from '@/shared/components/ui/Capsule';
import { Popover } from '@/shared/components/ui/Popover';
import { ChannelList } from '@/features/channel/components/ChannelList';

interface AgentRunCapsuleProps {
  runningCount?: number;
}

export const AgentRunCapsule = React.memo(({ runningCount = 0 }: AgentRunCapsuleProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { channelId } = useChannelNavigation();
  const { data } = useChannels();

  // Find current channel
  const channels = data?.channels || [];
  const currentChannel = channels.find((ch: any) => ch.channel_id === channelId);

  const handleChannelSelect = (id: string) => {
    navigate(`/channels?channel=${id}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Capsule
          variant={open ? 'active' : 'default'}
          isExpanded={open}
          ariaLabel="Switch channel"
          minWidth="min-w-[120px]"
          gap="gap-1.5"
          padding="px-2"
        >
          <Hash size={16} className="shrink-0" />
          <span className="text-sm font-medium truncate max-w-[100px]">
            {currentChannel?.name || 'Channels'}
          </span>
        </Capsule>
      </Popover.Trigger>

      <Popover.Content align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="w-[280px]">
          <ChannelList
            selectedChannelId={channelId}
            onChannelSelect={handleChannelSelect}
            compact={true}
          />
        </div>
      </Popover.Content>
    </Popover>
  );
});

AgentRunCapsule.displayName = 'AgentRunCapsule';
