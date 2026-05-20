import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChannel } from '@/lib/trpc/hooks/channel.hooks';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { ChannelEditForm } from './ChannelEditForm';

export default function ChannelEditPage() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 创建模式：id 为 undefined
  const isCreateMode = !id;

  // 只在编辑模式下查询 channel
  const { data: channel, isLoading, error } = useChannel(id!, {
    enabled: !isCreateMode,
  });

  if (!isCreateMode) {
    if (isLoading) return <PageLoader />;
    if (error || !channel) {
      return (
        <PageError
          message={error?.message ?? t('error.notFound', { resource: 'Channel' })}
          backTo="/channels"
        />
      );
    }
  }

  return (
    <ChannelEditForm
      channel={isCreateMode ? undefined : channel}
      onSaved={() => navigate('/channels')}
    />
  );
}
