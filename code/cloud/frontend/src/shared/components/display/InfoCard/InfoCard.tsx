import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Avatar, useEntityAvatarData } from '@/shared/components/display/Avatar';
import { Badge } from '@/shared/components/ui/badge';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { Calendar, Mail, Shield, User as UserIcon, Bot } from 'lucide-react';

type EntityType = 'user' | 'agent' | 'channel';

interface InfoCardProps {
  type: EntityType;
  id: string;
  name: string;
  children: React.ReactNode;
  role?: string;
  joinedAt?: string;
}

export function InfoCard({ type, id, name, children, role, joinedAt }: InfoCardProps) {
  const [open, setOpen] = useState(false);

  const { data: user } = useUser(
    type === 'user' ? id : '',
    { enabled: type === 'user' && open }
  );

  const { data: agent } = useAgent(
    type === 'agent' ? id : '',
    { enabled: type === 'agent' && open }
  );

  // Get avatar data when tooltip is open
  const avatarData = useEntityAvatarData(type, id);

  const displayName = type === 'user'
    ? user?.name || name
    : type === 'agent'
    ? agent?.display_name || agent?.name || name
    : name;

  const email = type === 'user' ? user?.email : undefined;
  const description = type === 'agent' ? agent?.description : undefined;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="start"
            sideOffset={5}
            className="w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-4 z-50 animate-in fade-in-0 zoom-in-95"
          >
            <div className="flex flex-col gap-3">
              {/* Header with Avatar and Name */}
              <div className="flex items-center gap-3">
                <Avatar
                  avatarUrl={avatarData.avatarUrl}
                  name={displayName}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {displayName}
                    </h3>
                    <Badge variant={type === 'agent' ? 'secondary' : 'default'} className="shrink-0">
                      {type}
                    </Badge>
                  </div>
                  {description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{description}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-700" />

              {/* Details */}
              <div className="space-y-2">
                {email && (
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}

                {role && (
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Shield className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>Role: {role}</span>
                  </div>
                )}

                {joinedAt && (
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>Joined: {new Date(joinedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {type === 'user' && user?.id && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <UserIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="font-mono text-[10px] truncate">{user.id}</span>
                  </div>
                )}

                {type === 'agent' && agent?.agent_id && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Bot className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span className="font-mono text-[10px] truncate">{agent.agent_id}</span>
                  </div>
                )}
              </div>
            </div>

            <Tooltip.Arrow className="fill-gray-700" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
