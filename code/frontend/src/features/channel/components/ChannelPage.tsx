import { useState } from 'react';
import { Hash, Users, Lock, MessageSquare } from 'lucide-react';
import { ChannelPanel } from './ChannelPanel';
import type { Channel } from './ChannelPanel';

/**
 * ChannelPage - Channel 列表页面
 *
 * 功能：
 * - 显示 channel 列表（左侧栏）
 * - 点击 channel 弹出侧边栏显示 ChannelPanel
 * - 使用 Mock 数据进行演示
 */

// Mock channel 数据
const mockChannels: Channel[] = [
  {
    channelId: 'channel-1',
    type: 'public',
    name: 'General',
    description: 'General discussion channel',
    unreadCount: 3,
    lastActivity: new Date(Date.now() - 1000 * 60 * 5), // 5分钟前
    isPinned: true,
    metadata: {},
  },
  {
    channelId: 'channel-2',
    type: 'public',
    name: 'Development',
    description: 'Development team channel',
    unreadCount: 0,
    lastActivity: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
    isPinned: false,
    metadata: {},
  },
  {
    channelId: 'channel-3',
    type: 'private',
    name: 'Leadership',
    description: 'Leadership team private channel',
    unreadCount: 1,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
    isPinned: false,
    metadata: {},
  },
  {
    channelId: 'channel-4',
    type: 'dm',
    name: 'Alice',
    description: 'Direct message with Alice',
    unreadCount: 0,
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1天前
    isPinned: false,
    metadata: {},
  },
];

export default function ChannelPage() {
  // 当前选中的 channel（用于显示侧边栏）
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  /**
   * 处理 channel 点击事件
   */
  const handleChannelClick = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  /**
   * 关闭侧边栏
   */
  const handleCloseSidebar = () => {
    setSelectedChannel(null);
  };

  /**
   * 获取 channel 图标
   */
  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'public':
        return <Hash className="w-4 h-4" />;
      case 'private':
        return <Lock className="w-4 h-4" />;
      case 'dm':
        return <MessageSquare className="w-4 h-4" />;
      case 'thread':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  /**
   * 格式化最后活动时间
   */
  const formatLastActivity = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="h-full flex bg-[#0f111a]">
      {/* 左侧 Channel 列表 */}
      <div className="w-80 border-r border-[#2a2d3e] flex flex-col bg-[#1a1d2e]">
        {/* 头部 */}
        <header className="h-14 border-b border-[#2a2d3e] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Channels</h2>
          </div>
          <span className="text-xs text-[#6b7280]">
            {mockChannels.length} channels
          </span>
        </header>

        {/* Channel 列表 */}
        <div className="flex-1 overflow-y-auto">
          {mockChannels.map((channel) => (
            <button
              key={channel.channelId}
              onClick={() => handleChannelClick(channel)}
              className={`
                w-full px-4 py-3 flex items-center gap-3 hover:bg-[#0f111a] transition-colors
                ${selectedChannel?.channelId === channel.channelId ? 'bg-[#0f111a]' : ''}
              `}
            >
              {/* Channel 图标 */}
              <div className="text-[#6b7280]">
                {getChannelIcon(channel.type)}
              </div>

              {/* Channel 信息 */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {channel.name}
                  </span>
                  {channel.isPinned && (
                    <span className="text-xs text-blue-500">📌</span>
                  )}
                </div>
                {channel.description && (
                  <p className="text-xs text-[#6b7280] truncate">
                    {channel.description}
                  </p>
                )}
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {formatLastActivity(channel.lastActivity)}
                </p>
              </div>

              {/* 未读计数 */}
              {channel.unreadCount > 0 && (
                <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {channel.unreadCount}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧主内容区域 */}
      <div className="flex-1 flex items-center justify-center">
        {!selectedChannel ? (
          <div className="text-center">
            <Users className="w-16 h-16 text-[#6b7280] mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a Channel</h3>
            <p className="text-[#6b7280]">
              Choose a channel from the list to start chatting
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-[#6b7280] mb-2">
              {getChannelIcon(selectedChannel.type)}
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {selectedChannel.name}
            </h3>
            <p className="text-[#6b7280]">
              {selectedChannel.description || 'No description'}
            </p>
            <p className="text-sm text-[#6b7280] mt-4">
              Channel panel is open on the right →
            </p>
          </div>
        )}
      </div>

      {/* 右侧 ChannelPanel 侧边栏 */}
      {selectedChannel && (
        <div className="w-[600px] border-l border-[#2a2d3e] bg-[#0f111a]">
          <ChannelPanel
            channelId={selectedChannel.channelId}
            threadId={null}
            onClose={handleCloseSidebar}
          />
        </div>
      )}
    </div>
  );
}
