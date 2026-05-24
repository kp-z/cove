import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar } from '@/shared/components/display/Avatar';
import { InfoCard } from '@/shared/components/display/InfoCard';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import type { ChannelMember } from '@/lib/trpc-types';

interface MemberListItemProps {
  member: ChannelMember;
  onRemove: (memberId: string) => void;
}

export function MemberListItem({ member, onRemove }: MemberListItemProps) {
  const { data: user } = useUser(
    member.member_type === 'human' ? member.member_id : '',
    { enabled: member.member_type === 'human' }
  );

  const { data: agent } = useAgent(
    member.member_type === 'agent' ? member.member_id : '',
    { enabled: member.member_type === 'agent' }
  );

  const displayName = member.member_type === 'human'
    ? user?.name || member.member_id
    : agent?.display_name || agent?.name || member.member_id;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-white/5 transition-colors">
      <InfoCard
        type={member.member_type === 'human' ? 'user' : 'agent'}
        id={member.member_id}
        name={displayName}
        role={member.role}
        joinedAt={member.joined_at}
      >
        <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
          <Avatar
            type={member.member_type === 'human' ? 'user' : 'agent'}
            id={member.member_id}
            name={displayName}
            size="sm"
          />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{displayName}</span>
            <Badge variant={member.member_type === 'human' ? 'default' : 'secondary'} className="shrink-0">
              {member.member_type}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">• {member.role}</span>
          </div>
        </div>
      </InfoCard>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(member.member_id)}
        className="shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
