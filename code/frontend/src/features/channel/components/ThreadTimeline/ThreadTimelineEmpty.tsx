import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/shared/components/layout/EmptyState';

interface ThreadTimelineEmptyProps {
  message?: string;
}

export function ThreadTimelineEmpty({ message = 'Select a channel' }: ThreadTimelineEmptyProps) {
  return <EmptyState icon={MessageSquare} title={message} />;
}
