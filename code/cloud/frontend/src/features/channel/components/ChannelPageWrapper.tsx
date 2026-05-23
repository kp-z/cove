import { useResponsive } from '@/shared/hooks/useResponsive';
import ChannelPage from './ChannelPage';
import MobileChannelPage from './MobileChannelPage';
import { useParams } from 'react-router-dom';

export default function ChannelPageWrapper() {
  const { isMobile } = useResponsive();
  const { channelId } = useParams<{ channelId?: string }>();

  // 移动端且有 channelId：显示 MobileChannelPage
  if (isMobile && channelId) {
    return <MobileChannelPage />;
  }

  // 其他情况：显示标准 ChannelPage
  return <ChannelPage />;
}
