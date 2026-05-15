import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface Thread {
  thread_id: string;
  channel_id: string;
  root_message_id: string;
  reply_count: number;
  last_reply_at?: string;
  created_at: string;
}

interface TimelineItemProps {
  thread: Thread;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TimelineItem({ thread, isActive, isFirst, isLast, onClick }: TimelineItemProps) {
  return (
    <div className="relative flex items-start gap-4 group">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-700" />
      )}

      {/* Timeline node */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
          isActive
            ? 'bg-blue-500 ring-4 ring-blue-500/20'
            : 'bg-transparent border-2 border-gray-600 group-hover:border-blue-400'
        }`}
      >
        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
      </motion.div>

      {/* Content card */}
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex-1 text-left p-3 rounded-lg transition-all ${
          isActive
            ? 'bg-blue-500/10 border border-blue-500/20'
            : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10'
        }`}
      >
        <div className="flex items-start gap-2 mb-2">
          <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-white' : 'text-gray-300'}`}>
              Thread #{thread.thread_id.slice(0, 8)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}</span>
          <span>•</span>
          <span>{formatTime(thread.last_reply_at || thread.created_at)}</span>
        </div>
      </motion.button>
    </div>
  );
}
