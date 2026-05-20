import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { AgentEditForm } from './AgentEditForm';

export default function AgentEditPage() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // If no id, this is create mode
  const isCreateMode = !id;

  const { data: agent, isLoading, error } = useAgent(id!, {
    enabled: !isCreateMode,
  });

  // Loading state only applies to edit mode
  if (!isCreateMode && isLoading) return <PageLoader />;
  if (!isCreateMode && (error || !agent)) {
    return <PageError message={error?.message ?? t('error.notFound', { resource: 'Agent' })} backTo="/agents" />;
  }

  return (
    <AgentEditForm
      agent={isCreateMode ? undefined : agent}
      onSaved={() => navigate('/agents')}
    />
  );
}
