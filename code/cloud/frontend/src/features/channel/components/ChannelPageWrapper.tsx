import { useResponsive } from '@/shared/hooks/useResponsive';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash, Lock, MessageSquare, MoreVertical } from 'lucide-react';
import { useMemo } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useChannels } from '@/lib/trpc/hooks';
import { useChannelNavigation } from '../hooks/useChannelNavigation';
import { ChannelPanel } from './ChannelPanel';
import ChannelPage from './ChannelPage';

export default function ChannelPageWrapper() {
  const { isMobile } = useResponsive();
  const { channelId } = useParams<{ channelId?: string }>();
  const navigate = useNavigate();
  const { threadId } = useChannelNavigation();
  const { data: channelsData } = useChannels();

  // 获取当前 channel 信息（移到条件外，确保 hooks 调用顺序一致）
  const channels = channelsData?.channels || [];
  const currentChannel = channels.find(ch => ch.channel_id === channelId);

  // Debug logging
  console.log('[DEBUG] ChannelPageWrapper - channelId:', channelId);
  console.log('[DEBUG] ChannelPageWrapper - total channels:', channels.length);
  console.log('[DEBUG] ChannelPageWrapper - channel IDs:', channels.map(ch => ch.channel_id));
  console.log('[DEBUG] ChannelPageWrapper - currentChannel:', currentChannel ? 'found' : 'NOT FOUND');

  // 根据 channel 类型选择图标（移到条件外）
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

  // 移动端且有 channelId：显示全屏 ChannelPanel
  if (isMobile && channelId) {

    const handleBack = () => {
      navigate('/channels');
    };

    return (
      <PageShell>
        {/* 移动端 Channel Header */}
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

        {/* Channel Panel Content */}
        <PageContent padded={false} className="flex-1">
          <ChannelPanel
            channel_id={channelId}
            thread_id={threadId}
            hideTabs={true}
          />
        </PageContent>
      </PageShell>
    );
  }

  // 其他情况：显示标准 ChannelPage
  return <ChannelPage />;
}
