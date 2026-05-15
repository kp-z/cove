import { MessageSquare } from 'lucide-react';
import { useChannelNavigation } from '../hooks/useChannelNavigation';
import { ChannelList } from './ChannelList';
import { ThreadTimeline } from './ThreadTimeline';
import { ThreadTimelineEmpty } from './ThreadTimeline/ThreadTimelineEmpty';
import { ChannelPanel } from './ChannelPanel';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { EmptyState } from '@/shared/components/layout/EmptyState';

export default function ChannelPage() {
  const { channelId, threadId, selectChannel, selectThread } = useChannelNavigation();

  return (
    <PageShell>
      <PageHeader
        title="Channels"
        subtitle="Collaborate with your team"
      />

      <PageContent padded={false} className="flex h-full">
        {/* Left Column - Channel List */}
        <div className="w-[280px] flex-shrink-0 border-r border-white/10 overflow-y-auto">
          <ChannelList
            selectedChannelId={channelId}
            onChannelSelect={selectChannel}
          />
        </div>

        {/* Middle Column - Thread Timeline */}
        <div className="w-[320px] flex-shrink-0 border-r border-white/10 overflow-y-auto">
          {channelId ? (
            <ThreadTimeline
              channelId={channelId}
              selectedThreadId={threadId}
              onThreadSelect={selectThread}
            />
          ) : (
            <ThreadTimelineEmpty message="Select a channel" />
          )}
        </div>

        {/* Right Column - Channel Panel */}
        <div className="flex-1 overflow-y-auto">
          {channelId ? (
            <ChannelPanel channel_id={channelId} thread_id={threadId || null} />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a channel"
              description="Choose a channel from the list to view messages"
            />
          )}
        </div>
      </PageContent>
    </PageShell>
  );
}
