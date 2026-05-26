import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { useChannelNavigation } from '@/features/channel/hooks/useChannelNavigation';
import { useChannelPanelStore } from '@/features/channel/stores/channelStore';
import { Capsule } from '@/shared/components/ui/Capsule';
import { Popover } from '@/shared/components/ui/Popover';
import { ChannelList } from '@/features/channel/components/ChannelList';

interface AgentRunCapsuleProps {
  runningCount?: number;
}

export const AgentRunCapsule = React.memo(({ runningCount = 0 }: AgentRunCapsuleProps) => {
  const [open, setOpen] = useState(false);
  const { channelId } = useChannelNavigation();
  const { openChannel } = useChannelPanelStore();

  const handleChannelSelect = (id: string) => {
    openChannel(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Capsule
          variant={open ? 'active' : 'default'}
          isExpanded={open}
          ariaLabel="Switch channel"
          minWidth="min-w-8"
          gap="gap-1.5"
          padding="px-2"
          justify="center"
        >
          <Bot size={14} className="text-white/55 shrink-0 relative z-10" />
        </Capsule>
      </Popover.Trigger>

      <Popover.Content align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
        <ChannelList
          selectedChannelId={channelId}
          onChannelSelect={handleChannelSelect}
          compact={true}
        />
      </Popover.Content>
    </Popover>
  );
});

AgentRunCapsule.displayName = 'AgentRunCapsule';
