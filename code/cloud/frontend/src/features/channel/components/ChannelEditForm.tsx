import { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { ButtonGroup } from '@/shared/components/ui/ButtonGroup';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useCreateChannel, useUpdateChannel, useAddChannelMember, useRemoveChannelMember } from '@/lib/trpc/hooks/channel.hooks';
import { useAgents } from '@/lib/trpc/hooks/agent.hooks';
import { useUsers } from '@/lib/trpc/hooks/user.hooks';
import { useAuthStore } from '@/core/auth/authStore';
import {
  ChannelBasicInfoSection,
  ChannelMembersSection,
  ChannelAgentPoolSection,
  ChannelProjectSection,
  ChannelCommunicationRulesSection,
  ChannelMetadataSection
} from './sections';
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
  const [avatar, setAvatar] = useState(channel?.avatar);
  const [type, setType] = useState<'public' | 'private' | 'dm'>(channel?.type ?? 'public');
  const [status, setStatus] = useState<'active' | 'archived'>(channel?.status ?? 'active');
  const [parentChannelId, setParentChannelId] = useState(channel?.parent_channel_id ?? '');

  // Project State
  const [projectId, setProjectId] = useState(channel?.project_id ?? '');

  // Members State
  const [members, setMembers] = useState<ChannelMember[]>(channel?.members ?? []);

  // Agent Pool State
  const [agentPool, setAgentPool] = useState<string[]>(channel?.agent_pool ?? []);

  // Communication Rules State
  const [communicationRules, setCommunicationRules] = useState({
    allowMentions: channel?.communication_rules?.allow_mentions ?? true,
    allowThreads: channel?.communication_rules?.allow_threads ?? true,
    allowAttachments: channel?.communication_rules?.allow_attachments ?? true,
    maxMessageLength: channel?.communication_rules?.max_message_length ?? 10000,
    maxMembers: channel?.communication_rules?.max_members,
    rateLimit: channel?.communication_rules?.rate_limit ? {
      messagesPerMinute: channel.communication_rules.rate_limit.messages_per_minute,
      enabled: channel.communication_rules.rate_limit.enabled,
    } : undefined,
  });

  // Metadata State
  const [tags, setTags] = useState<string[]>(channel?.meta?.tags ?? []);
  const [category, setCategory] = useState(channel?.meta?.category ?? '');

  // UI State
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const data = {
      name,
      display_name: displayName,
      description,
      icon,
      avatar,
      type,
      status,
      parent_channel_id: parentChannelId || undefined,
      project_id: projectId || undefined,
      agent_pool: agentPool,
      communication_rules: {
        allow_mentions: communicationRules.allowMentions,
        allow_threads: communicationRules.allowThreads,
        allow_attachments: communicationRules.allowAttachments,
        max_message_length: communicationRules.maxMessageLength,
        max_members: communicationRules.maxMembers,
        rate_limit: communicationRules.rateLimit ? {
          messages_per_minute: communicationRules.rateLimit.messagesPerMinute,
          enabled: communicationRules.rateLimit.enabled,
        } : undefined,
      },
      meta: {
        tags,
        category: category || undefined,
      },
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
          <ButtonGroup
            options={[
              {
                label: saved ? 'Saved' : 'Save',
                value: 'save',
                icon: saved ? <Check size={16} /> : <Save size={16} />,
                onClick: handleSave,
                disabled: !canSave,
              },
            ]}
            variant="default"
          />
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            <ChannelBasicInfoSection
              name={name}
              displayName={displayName}
              description={description}
              icon={icon}
              avatar={avatar}
              type={type}
              status={status}
              parentChannelId={parentChannelId}
              onNameChange={setName}
              onDisplayNameChange={setDisplayName}
              onDescriptionChange={setDescription}
              onIconChange={setIcon}
              onAvatarChange={setAvatar}
              onTypeChange={setType}
              onStatusChange={setStatus}
              onParentChannelIdChange={setParentChannelId}
              isCreateMode={isCreateMode}
              channelId={channel?.channel_id}
            />

            <ChannelProjectSection
              projectId={projectId}
              onProjectIdChange={setProjectId}
            />

            <ChannelMembersSection
              members={members}
              availableUsers={availableUsers}
              availableAgents={availableAgents}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              isCreateMode={isCreateMode}
            />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <ChannelAgentPoolSection
              agentPool={agentPool}
              onAgentPoolChange={setAgentPool}
            />

            <ChannelCommunicationRulesSection
              rules={communicationRules}
              onRulesChange={setCommunicationRules}
            />

            <ChannelMetadataSection
              tags={tags}
              category={category}
              onTagsChange={setTags}
              onCategoryChange={setCategory}
            />
          </div>
        </div>
      </PageContent>
    </PageShell>
  );
}
