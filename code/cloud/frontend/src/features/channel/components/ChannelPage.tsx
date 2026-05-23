import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useChannelNavigation } from '../hooks/useChannelNavigation';
import { useChannelPanelStore } from '../stores/channelStore';
import { useResizableRight } from '../hooks/useResizableRight';
import { ChannelList } from './ChannelList';
import { Timeline } from './Timeline';
import { useTimelineNodes } from './Timeline/hooks/useTimelineNodes';
import type { TimelineNode } from './Timeline/NodeRegistry';
import { ButtonGroup } from '@/shared/components/ui/ButtonGroup';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useResponsive } from '@/shared/hooks/useResponsive';

export default function ChannelPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { channelId, threadId, selectChannel, selectThread } = useChannelNavigation();
  const { openChannel } = useChannelPanelStore();
  const { isMobile } = useResponsive();

  // 获取 Timeline 数据
  const { nodes, isLoading, error } = useTimelineNodes({
    channelId: channelId || '',
    limit: 50,
  });

  // Left column resizable (drag handle on RIGHT edge)
  const leftColumn = useResizableRight({
    defaultWidth: 280,
    minWidth: 200,  // Minimum width to comfortably show icon + name
    maxWidth: 400,
    storageKey: 'channel-page-left-width',
  });

  // Open global ChannelPanel when channelId changes (desktop only)
  useEffect(() => {
    if (channelId && !isMobile) {
      openChannel(channelId);
    }
  }, [channelId, isMobile, openChannel]);

  // 处理频道选择
  const handleChannelSelect = (id: string) => {
    if (isMobile) {
      // 移动端：跳转到独立的 ChannelPanel 页面
      navigate(`/channel/${id}`);
    } else {
      // 桌面端：使用原有逻辑
      selectChannel(id);
    }
  };

  // 处理节点点击事件
  const handleNodeClick = (node: TimelineNode) => {
    if (node.type === 'message') {
      // 跳转到消息（打开 ChannelPanel）
      if (channelId) {
        openChannel(channelId);
        // TODO: 需要添加滚动到特定消息的功能
      }
    } else if (node.type === 'thread') {
      // 选择 thread
      selectThread(node.data.thread_id || node.data.parent_message_id);
      // 打开 ChannelPanel
      if (channelId) {
        openChannel(channelId);
      }
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Channels"
        subtitle="Collaborate with your team"
        actions={
          <ButtonGroup
            options={[
              {
                label: t('actions.new'),
                value: 'new',
                onClick: () => navigate('/channels/new'),
              },
            ]}
          />
        }
      />

      <PageContent padded={false} className="flex h-full">
        {isMobile ? (
          // 移动端：只显示 ChannelList
          <div className="flex-1 overflow-y-auto">
            <ChannelList
              selectedChannelId={channelId}
              onChannelSelect={handleChannelSelect}
            />
          </div>
        ) : (
          // 桌面端：显示 ChannelList + Timeline
          <>
            {/* Left Column - Channel List */}
            <div
              className="flex-shrink-0 border-r border-white/10 overflow-y-auto relative"
              style={{ width: leftColumn.width }}
            >
              <ChannelList
                selectedChannelId={channelId}
                onChannelSelect={handleChannelSelect}
              />
              {/* Drag handle for left column */}
              <div
                onMouseDown={leftColumn.onDragStart}
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-10"
              />
            </div>

            {/* Right Column - Timeline (always visible) */}
            <div className="flex-1 overflow-y-auto">
              {channelId ? (
                <Timeline
                  channelId={channelId}
                  nodes={nodes}
                  selectedNodeId={threadId}
                  isLoading={isLoading}
                  error={error}
                  onNodeClick={handleNodeClick}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Select a channel to view timeline</p>
                </div>
              )}
            </div>
          </>
        )}
      </PageContent>
    </PageShell>
  );
}
