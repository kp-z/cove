import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Hash, Lock, Plus, X, Loader2 } from 'lucide-react';
import type { Channel, Thread } from './types';

interface ChannelTabsProps {
  channel: Channel;
  threads: Thread[];
  activeThreadId: string | null;
  onThreadChange: (threadId: string | null) => void;
  onNewThread: () => void;
  onCloseThread: (threadId: string) => void;
  onRenameThread?: (threadId: string, newTitle: string) => void;
  onPinThread?: (threadId: string) => void;
  leftActions?: React.ReactNode;
  className?: string;
}

function ChannelTab({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  const IconComponent = useMemo(() => {
    switch (channel.type) {
      case 'public':
        return Hash;
      case 'private':
        return Lock;
      case 'dm':
      case 'thread':
        return MessageSquare;
      default:
        return Hash;
    }
  }, [channel.type]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-left text-xs rounded-t transition-colors min-w-0 max-w-[220px] border-b-2 ${
        isActive
          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
          : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="flex items-center gap-1 truncate whitespace-nowrap font-medium text-[11px] leading-tight min-w-0">
        <IconComponent className="w-3 h-3 shrink-0 opacity-80" aria-label="Channel" />
        <span className="truncate">{channel.name}</span>
        {channel.unread_count > 0 && (
          <span className="ml-0.5 px-1 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
            {channel.unread_count > 99 ? '99+' : channel.unread_count}
          </span>
        )}
      </span>
    </button>
  );
}

function ThreadTab({
  thread,
  isActive,
  onClick,
  onClose,
}: {
  thread: Thread;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('channel');
  const isPinned = thread.is_pinned || false;

  return (
    <div className="relative group flex-shrink-0 flex items-stretch rounded-t">
      <button
        type="button"
        onClick={onClick}
        className={`px-2 py-1 pr-6 text-left text-xs rounded-t transition-colors min-w-0 max-w-[220px] border-b-2 ${
          isActive
            ? isPinned
              ? 'bg-amber-500/20 text-amber-300 border-amber-400'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
            : isPinned
              ? 'text-amber-300/90 border-amber-500/60 hover:text-amber-200 hover:bg-amber-500/10'
              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
        }`}
      >
        <span className="flex items-center gap-1 truncate whitespace-nowrap font-medium text-[11px] leading-tight min-w-0">
          <MessageSquare className="w-3 h-3 shrink-0 opacity-80" aria-label="Thread" />
          <span className="truncate">{thread.title}</span>
          {thread.unread_count > 0 && (
            <span className="ml-0.5 px-1 py-0.5 text-[9px] font-bold bg-red-500 text-white rounded-full">
              {thread.unread_count > 9 ? '9+' : thread.unread_count}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
        title={t('tabs.close')}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function NewThreadButton({ onClick, creating }: { onClick: () => void; creating?: boolean }) {
  const { t } = useTranslation('channel');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      className={`px-2 py-1 rounded-t transition-colors shrink-0 ${
        creating
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      title={t('tabs.newThread')}
    >
      {creating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Plus className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export function ChannelTabs({
  channel,
  threads,
  activeThreadId,
  onThreadChange,
  onNewThread,
  onCloseThread,
  leftActions,
  className = '',
}: ChannelTabsProps) {
  const checkScroll = () => {
    // Scroll checking logic (currently unused but kept for future implementation)
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [threads]);

  const sortedThreads = [...threads].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
  });

  return (
    <div className={`relative border-b border-white/10 ${className}`}>
      <div className="flex items-stretch gap-2 px-2 py-1">
        {(leftActions || true) && (
          <div className="shrink-0 flex items-center gap-1">
            {leftActions}
            <NewThreadButton onClick={onNewThread} />
          </div>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <ChannelTab
            channel={channel}
            isActive={activeThreadId === null}
            onClick={() => onThreadChange(null)}
          />

          {sortedThreads.map((thread) => (
            <ThreadTab
              key={thread.thread_id}
              thread={thread}
              isActive={activeThreadId === thread.thread_id}
              onClick={() => onThreadChange(thread.thread_id)}
              onClose={() => onCloseThread(thread.thread_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
