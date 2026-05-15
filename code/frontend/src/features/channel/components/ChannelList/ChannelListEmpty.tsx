import { Users } from 'lucide-react';
import { EmptyState } from '@/shared/components/layout/EmptyState';

export function ChannelListEmpty() {
  return <EmptyState icon={Users} title="No channels yet" />;
}
