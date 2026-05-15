import { TimelineItem } from './TimelineItem';
import { ThreadTimelineEmpty } from './ThreadTimelineEmpty';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useChannelThreads } from '@/lib/trpc/hooks/thread.hooks';

interface Thread {
  thread_id: string;
  channel_id: string;
  root_message_id: string;
  reply_count: number;
  last_reply_at?: string;
  created_at: string;
}

interface ThreadTimelineProps {
  channelId: string;
  selectedThreadId?: string;
  onThreadSelect: (threadId: string) => void;
}

function groupThreadsByDate(threads: Thread[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { label: string; threads: Thread[] }[] = [
    { label: 'Today', threads: [] },
    { label: 'Yesterday', threads: [] },
    { label: 'Last 7 days', threads: [] },
    { label: 'Older', threads: [] },
  ];

  threads.forEach((thread) => {
    const date = new Date(thread.last_reply_at || thread.created_at);
    if (date >= today) {
      groups[0].threads.push(thread);
    } else if (date >= yesterday) {
      groups[1].threads.push(thread);
    } else if (date >= lastWeek) {
      groups[2].threads.push(thread);
    } else {
      groups[3].threads.push(thread);
    }
  });

  return groups.filter((group) => group.threads.length > 0);
}

export function ThreadTimeline({ channelId, selectedThreadId, onThreadSelect }: ThreadTimelineProps) {
  const { data: response, isLoading, error } = useChannelThreads(channelId);

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message="Failed to load threads" />;

  const threads = response?.threads || [];

  if (threads.length === 0) {
    return <ThreadTimelineEmpty message="No threads yet" />;
  }

  const groups = groupThreadsByDate(threads);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 mb-4 z-20">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </h3>
          </div>
          <div className="space-y-4">
            {group.threads.map((thread, index) => (
              <TimelineItem
                key={thread.thread_id}
                thread={thread}
                isActive={selectedThreadId === thread.thread_id}
                isFirst={index === 0}
                isLast={index === group.threads.length - 1}
                onClick={() => onThreadSelect(thread.thread_id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
