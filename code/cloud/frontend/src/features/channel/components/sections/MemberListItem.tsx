import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar } from '@/shared/components/display/Avatar';
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

  const email = member.member_type === 'human' ? user?.email : undefined;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar
          type={member.member_type === 'human' ? 'user' : 'agent'}
          id={member.member_id}
          name={displayName}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium truncate">{displayName}</div>
            <Badge variant={member.member_type === 'human' ? 'default' : 'secondary'}>
              {member.member_type}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {email && <span>{email} • </span>}
            Role: {member.role} • Joined: {new Date(member.joined_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(member.member_id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
