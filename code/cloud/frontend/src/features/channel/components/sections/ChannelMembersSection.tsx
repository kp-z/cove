import { Users, UserPlus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { MemberListItem } from './MemberListItem';
import type { ChannelMember } from '@/lib/trpc-types';

interface ChannelMembersSectionProps {
  members: ChannelMember[];
  availableUsers: Array<{ user_id: string; name: string; email?: string }>;
  availableAgents: Array<{ agent_id: string; name: string; display_name?: string }>;
  onAddMember: (memberId: string, memberType: 'human' | 'agent') => void;
  onRemoveMember: (memberId: string) => void;
  isCreateMode: boolean;
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function ChannelMembersSection({
  members,
  availableUsers,
  availableAgents,
  onAddMember,
  onRemoveMember,
  isCreateMode,
}: ChannelMembersSectionProps) {
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMemberType, setSelectedMemberType] = useState<'human' | 'agent'>('human');

  const filteredUsers = memberSearchQuery
    ? availableUsers.filter(u => u.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
    : availableUsers;

  const filteredAgents = memberSearchQuery
    ? availableAgents.filter(a => a.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
    : availableAgents;

  const handleAddMember = () => {
    if (selectedMemberId) {
      onAddMember(selectedMemberId, selectedMemberType);
      setSelectedMemberId('');
      setMemberSearchQuery('');
    }
  };

  return (
    <SectionCard
      title="Members"
      description="Manage channel members and permissions"
      icon={<Users className="w-4 h-4" />}
    >
      <div className="space-y-5">
        {/* Add Member */}
        <FormField
          label="Add Member"
          description="Add users or agents to this channel"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={selectedMemberType}
                onChange={(e) => setSelectedMemberType(e.target.value as 'human' | 'agent')}
                className={`${selectCls} w-32`}
              >
                <option value="human">User</option>
                <option value="agent">Agent</option>
              </select>
              <Input
                placeholder="Search..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {memberSearchQuery && (
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                {selectedMemberType === 'human' ? (
                  filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <button
                        key={user.user_id}
                        onClick={() => {
                          setSelectedMemberId(user.user_id);
                          handleAddMember();
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
                      >
                        <div className="font-medium">{user.name}</div>
                        {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">No users found</div>
                  )
                ) : (
                  filteredAgents.length > 0 ? (
                    filteredAgents.map(agent => (
                      <button
                        key={agent.agent_id}
                        onClick={() => {
                          setSelectedMemberId(agent.agent_id);
                          handleAddMember();
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
                      >
                        <div className="font-medium">{agent.display_name || agent.name}</div>
                        <div className="text-xs text-muted-foreground">@{agent.name}</div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">No agents found</div>
                  )
                )}
              </div>
            )}
          </div>
        </FormField>

        {/* Current Members */}
        <FormField
          label="Current Members"
          description={`${members.length} member${members.length !== 1 ? 's' : ''}`}
        >
          <div className="space-y-2">
            {members.length > 0 ? (
              members.map((member) => (
                <MemberListItem
                  key={member.member_id}
                  member={member}
                  onRemove={onRemoveMember}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No members yet
              </div>
            )}
          </div>
        </FormField>
      </div>
    </SectionCard>
  );
}
