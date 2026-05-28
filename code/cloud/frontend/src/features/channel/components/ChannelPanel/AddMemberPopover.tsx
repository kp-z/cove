import { useState, useMemo } from 'react';
import { Search, UserPlus, Users as UsersIcon, Bot, Loader2 } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useAgents } from '@/lib/trpc/hooks/agent.hooks';
import { useUsers } from '@/lib/trpc/hooks/user.hooks';
import { useAddChannelMember } from '@/lib/trpc/hooks/channel.hooks';
import { getAvatarUrl } from '@/shared/components/display/Avatar';
import type { Agent, User } from '@/lib/trpc-types';

interface AddMemberPopoverProps {
  channelId: string;
  existingMemberIds: string[];
  trigger: React.ReactNode;
}

export function AddMemberPopover({ channelId, existingMemberIds, trigger }: AddMemberPopoverProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const addMember = useAddChannelMember();

  const agents = agentsData?.agents || [];
  const users = usersData?.users || [];

  // Filter out existing members
  const availableAgents = useMemo(() => {
    return agents.filter(agent => !existingMemberIds.includes(agent.agent_id));
  }, [agents, existingMemberIds]);

  const availableUsers = useMemo(() => {
    return users.filter(user => !existingMemberIds.includes(user.user_id));
  }, [users, existingMemberIds]);

  // Filter by search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return availableAgents;
    const query = searchQuery.toLowerCase();
    return availableAgents.filter(agent =>
      (agent.display_name || agent.name).toLowerCase().includes(query) ||
      agent.name.toLowerCase().includes(query)
    );
  }, [availableAgents, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(user =>
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const handleAddMember = (memberId: string) => {
    addMember.mutate(
      { channelId, memberId },
      {
        onSuccess: () => {
          setOpen(false);
          setSearchQuery('');
        },
      }
    );
  };

  const isLoading = agentsLoading || usersLoading;
  const hasResults = filteredAgents.length > 0 || filteredUsers.length > 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {trigger}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-80 bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          sideOffset={5}
          align="end"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus size={16} />
              Add Member
            </h3>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents or users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : !hasResults ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {searchQuery ? 'No members found' : 'All members already added'}
              </div>
            ) : (
              <>
                {/* Agents Section */}
                {filteredAgents.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 flex items-center gap-2">
                      <Bot size={12} />
                      Agents ({filteredAgents.length})
                    </div>
                    {filteredAgents.map((agent) => (
                      <MemberItem
                        key={agent.agent_id}
                        id={agent.agent_id}
                        name={agent.display_name || agent.name}
                        avatarUrl={getAvatarUrl(agent.persona?.avatar?.url)}
                        type="agent"
                        onAdd={handleAddMember}
                        isAdding={addMember.isPending}
                      />
                    ))}
                  </div>
                )}

                {/* Users Section */}
                {filteredUsers.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 flex items-center gap-2">
                      <UsersIcon size={12} />
                      Users ({filteredUsers.length})
                    </div>
                    {filteredUsers.map((user) => (
                      <MemberItem
                        key={user.user_id}
                        id={user.user_id}
                        name={user.username || user.email}
                        avatarUrl={getAvatarUrl(user.avatar)}
                        type="user"
                        onAdd={handleAddMember}
                        isAdding={addMember.isPending}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface MemberItemProps {
  id: string;
  name: string;
  avatarUrl?: string | null;
  type: 'agent' | 'user';
  onAdd: (id: string) => void;
  isAdding: boolean;
}

function MemberItem({ id, name, avatarUrl, type, onAdd, isAdding }: MemberItemProps) {
  return (
    <button
      onClick={() => onAdd(id)}
      disabled={isAdding}
      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-white text-sm font-semibold ${
            type === 'agent'
              ? 'bg-gradient-to-br from-blue-500 to-purple-600'
              : 'bg-gradient-to-br from-cyan-500 to-teal-600'
          }`}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-sm text-gray-300 truncate flex-1 text-left">{name}</span>

      {/* Add Icon */}
      {isAdding ? (
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
      ) : (
        <UserPlus className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
    </button>
  );
}
