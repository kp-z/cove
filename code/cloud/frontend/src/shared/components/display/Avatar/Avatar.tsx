import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { getAgentAvatarUrl, getAgentInitials } from '@/features/agent/utils/avatar';
import { cn } from '@/shared/utils/cn';

export interface AvatarProps {
  type: 'user' | 'agent' | 'channel';
  id: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ type, id, name, size = 'md', className }: AvatarProps) {
  const { data: agent } = useAgent(id, { enabled: type === 'agent' });
  const { data: user } = useUser(type === 'user' ? id : '');

  let avatarUrl: string | undefined;
  let initials: string;

  if (type === 'agent' && agent) {
    avatarUrl = getAgentAvatarUrl(agent.persona?.avatar?.url);
    initials = getAgentInitials(name);
  } else if (type === 'user' && user) {
    avatarUrl = getAvatarUrl(user.avatar);
    initials = getAgentInitials(name);
  } else if (type === 'channel') {
    // TODO: Implement channel avatar logic when needed
    initials = name.slice(0, 2).toUpperCase();
  } else {
    initials = getAgentInitials(name);
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
