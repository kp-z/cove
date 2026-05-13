import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgent } from '../hooks/useAgents';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { AgentEditForm } from './AgentEditForm';

export default function AgentEditPage() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading, error } = useAgent(id!);

  if (isLoading) return <PageLoader />;
  if (error || !agent) return <PageError message={error?.message ?? t('error.notFound', { resource: 'Agent' })} backTo="/agents" />;

  return <AgentEditForm agent={agent} onSaved={() => navigate('/agents')} />;
}
