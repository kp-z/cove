import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChannelNavigation } from '../hooks/useChannelNavigation';
import { useChannelPanelStore } from '../stores/channelStore';
import { ChannelList } from './ChannelList';
import { ButtonGroup } from '@/shared/components/ui/ButtonGroup';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useResponsive } from '@/shared/hooks/useResponsive';

export default function ChannelPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { channelId, selectChannel } = useChannelNavigation();
  const { openChannel } = useChannelPanelStore();
  const { isMobile } = useResponsive();

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

  return (
    <PageShell>
      <PageHeader
        title="Channels"
        subtitle="Collaborate with your team"
        actions={
          <ButtonGroup
            options={[
              {
                label: 'New Channel',
                value: 'new',
                onClick: () => navigate('/channels/new'),
              },
            ]}
          />
        }
      />

      <PageContent padded={false} className="flex h-full">
        {/* ChannelList only - Timeline moved to ChannelPageWrapper */}
        <div className="flex-1 overflow-y-auto">
          <ChannelList
            selectedChannelId={channelId}
            onChannelSelect={handleChannelSelect}
          />
        </div>
      </PageContent>
    </PageShell>
  );
}
