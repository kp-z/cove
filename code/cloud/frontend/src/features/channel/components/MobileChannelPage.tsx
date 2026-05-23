import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash, Lock, MessageSquare, MoreVertical } from 'lucide-react';
import { ChannelPanel } from './ChannelPanel';
import { useChannelNavigation } from '../hooks/useChannelNavigation';
import { useChannels } from '@/lib/trpc/hooks';
import { useMemo } from 'react';

export default function MobileChannelPage() {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const { threadId } = useChannelNavigation();
  const { data: channelsData } = useChannels();

  const handleBack = () => {
    navigate('/channels');
  };

  // 获取当前 channel 信息
  const channels = channelsData?.channels || [];
  const currentChannel = channels.find(ch => ch.channel_id === channelId);

  // 根据 channel 类型选择图标
  const ChannelIcon = useMemo(() => {
    if (!currentChannel) return Hash;
    switch (currentChannel.type) {
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
  }, [currentChannel]);

  if (!channelId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#1a1d2e] flex flex-col">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10 bg-[#1a1d2e]">
        {/* Left: Back button + Channel info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Back to channels"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>

          {currentChannel && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <ChannelIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-white truncate">
                  {currentChannel.name}
                </h1>
                {currentChannel.description && (
                  <p className="text-xs text-gray-400 truncate">
                    {currentChannel.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: More actions */}
        <button
          className="p-2 -mr-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Channel Panel - 隐藏 ChannelTabs */}
      <div className="flex-1 overflow-hidden">
        <ChannelPanel
          channel_id={channelId}
          thread_id={threadId}
          className="h-full"
          hideTabs={true}
        />
      </div>
    </div>
  );
}
