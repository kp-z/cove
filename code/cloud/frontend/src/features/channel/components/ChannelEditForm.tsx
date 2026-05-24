import { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useCreateChannel, useUpdateChannel, useAddChannelMember, useRemoveChannelMember } from '@/lib/trpc/hooks/channel.hooks';
import { useAgents } from '@/lib/trpc/hooks/agent.hooks';
import { useUsers } from '@/lib/trpc/hooks/user.hooks';
import { useAuthStore } from '@/core/auth/authStore';
import { ChannelBasicInfoSection, ChannelMembersSection } from './sections';
import type { Channel, ChannelMember } from '@/lib/trpc-types';

interface ChannelEditFormProps {
  channel?: Channel;
  onSaved: () => void;
}

export function ChannelEditForm({ channel, onSaved }: ChannelEditFormProps) {
  const isCreateMode = !channel;
  const { user } = useAuthStore();

  // Mutations
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const addMember = useAddChannelMember();
  const removeMember = useRemoveChannelMember();

  // Data
  const { data: agents } = useAgents();
  const { data: users } = useUsers();

  // Basic Info State
  const [name, setName] = useState(channel?.name ?? '');
  const [displayName, setDisplayName] = useState(channel?.display_name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [icon, setIcon] = useState(channel?.icon ?? '');
  const [type, setType] = useState<'public' | 'private' | 'dm'>(channel?.type ?? 'public');
  const [status, setStatus] = useState<'active' | 'archived'>(channel?.status ?? 'active');

  // Members State
  const [members, setMembers] = useState<ChannelMember[]>(channel?.members ?? []);

  // UI State
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const data = {
      name,
      display_name: displayName,
      description,
      icon,
      type,
      status,
    };

    if (isCreateMode) {
      const createData = {
        ...data,
        createdBy: user?.id || 'system',
        members,
      };

      createChannel.mutate(createData, {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => {
            onSaved();
          }, 500);
        },
      });
    } else {
      if (!channel) return;

      updateChannel.mutate(
        {
          channelId: channel.channel_id,
          ...data,
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(() => {
              setSaved(false);
            }, 2000);
          },
        }
      );
    }
  };

  const handleAddMember = (memberId: string, memberType: 'human' | 'agent') => {
    if (isCreateMode) {
      // In create mode, just add to local state
      setMembers([
        ...members,
        {
          member_id: memberId,
          member_type: memberType,
          role: 'member',
          joined_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    // In edit mode, call API
    if (!channel) return;

    addMember.mutate(
      {
        channelId: channel.channel_id,
        memberId,
        memberType,
        role: 'member',
      },
      {
        onSuccess: () => {
          setMembers([
            ...members,
            {
              member_id: memberId,
              member_type: memberType,
              role: 'member',
              joined_at: new Date().toISOString(),
            },
          ]);
        },
      }
    );
  };

  const handleRemoveMember = (memberId: string) => {
    if (isCreateMode) {
      setMembers(members.filter(m => m.member_id !== memberId));
      return;
    }

    if (!channel) return;

    removeMember.mutate(
      {
        channelId: channel.channel_id,
        memberId,
      },
      {
        onSuccess: () => {
          setMembers(members.filter(m => m.member_id !== memberId));
        },
      }
    );
  };

  const availableUsers = users?.users?.filter(
    u => !members.some(m => m.member_id === u.user_id && m.member_type === 'human')
  ) ?? [];

  const availableAgents = agents?.agents?.filter(
    a => !members.some(m => m.member_id === a.agent_id && m.member_type === 'agent')
  ) ?? [];

  const canSave = name.trim() && displayName.trim() && !createChannel.isPending && !updateChannel.isPending && !saved;

  return (
    <PageShell>
      <PageHeader
        title={isCreateMode ? 'Create Channel' : (channel?.display_name || channel?.name || 'Edit Channel')}
        subtitle={isCreateMode ? 'Create a new communication channel' : `Channel ID: ${channel?.channel_id}`}
        actions={
          <Button onClick={handleSave} disabled={!canSave}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1400px] mx-auto">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <ChannelBasicInfoSection
              name={name}
              displayName={displayName}
              description={description}
              icon={icon}
              type={type}
              status={status}
              onNameChange={setName}
              onDisplayNameChange={setDisplayName}
              onDescriptionChange={setDescription}
              onIconChange={setIcon}
              onTypeChange={setType}
              onStatusChange={setStatus}
              isCreateMode={isCreateMode}
            />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <ChannelMembersSection
              members={members}
              availableUsers={availableUsers}
              availableAgents={availableAgents}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              isCreateMode={isCreateMode}
            />
          </div>
        </div>
      </PageContent>
    </PageShell>
  );
}
