import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Plus, Check, UserPlus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useCreateChannel, useUpdateChannel, useAddChannelMember, useRemoveChannelMember } from '@/lib/trpc/hooks/channel.hooks';
import { useAgents } from '@/lib/trpc/hooks/agent.hooks';
import { useUsers } from '@/lib/trpc/hooks/user.hooks';
import type { Channel } from '@/lib/trpc-types';

interface ChannelEditFormProps {
  channel?: Channel;
  onSaved: () => void;
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function ChannelEditForm({ channel, onSaved }: ChannelEditFormProps) {
  const { t } = useTranslation('channel');
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const addMember = useAddChannelMember();
  const removeMember = useRemoveChannelMember();

  const { data: agents } = useAgents();
  const { data: users } = useUsers();

  const isCreateMode = !channel;

  // Basic Info
  const [name, setName] = useState(channel?.name ?? '');
  const [displayName, setDisplayName] = useState(channel?.display_name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [icon, setIcon] = useState(channel?.icon ?? '');
  const [type, setType] = useState<'public' | 'private' | 'dm'>(channel?.type ?? 'public');
  const [status, setStatus] = useState<'active' | 'archived'>(channel?.status ?? 'active');
  const [category, setCategory] = useState(channel?.meta?.category ?? '');
  const [tags, setTags] = useState<string[]>(channel?.meta?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  // Members
  const [members, setMembers] = useState(channel?.members ?? []);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Agent Pool
  const [selectedAgents, setSelectedAgents] = useState<string[]>(channel?.agent_pool ?? []);

  // Communication Rules
  const [allowMentions, setAllowMentions] = useState(channel?.communication_rules?.allow_mentions ?? true);
  const [allowThreads, setAllowThreads] = useState(channel?.communication_rules?.allow_threads ?? true);
  const [allowAttachments, setAllowAttachments] = useState(channel?.communication_rules?.allow_attachments ?? true);
  const [maxMessageLength, setMaxMessageLength] = useState(channel?.communication_rules?.max_message_length ?? 4000);
  const [maxMembers, setMaxMembers] = useState(channel?.communication_rules?.max_members ?? undefined);
  const [rateLimitEnabled, setRateLimitEnabled] = useState(channel?.communication_rules?.rate_limit?.enabled ?? false);
  const [messagesPerMinute, setMessagesPerMinute] = useState(channel?.communication_rules?.rate_limit?.messages_per_minute ?? 60);

  const [saved, setSaved] = useState(false);

  function handleSave() {
    const data = {
      name,
      display_name: displayName,
      description,
      icon,
      type,
      status,
      meta: {
        category,
        tags,
      },
      agent_pool: selectedAgents,
      communication_rules: {
        allow_mentions: allowMentions,
        allow_threads: allowThreads,
        allow_attachments: allowAttachments,
        max_message_length: maxMessageLength,
        max_members: maxMembers,
        rate_limit: {
          enabled: rateLimitEnabled,
          messages_per_minute: messagesPerMinute,
        },
      },
    };

    if (isCreateMode) {
      createChannel.mutate(data, {
        onSuccess: () => {
          setSaved(true);
          setTimeout(onSaved, 600);
        },
      });
    } else {
      updateChannel.mutate(
        {
          channelId: channel.channel_id,
          data,
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(onSaved, 600);
          },
        },
      );
    }
  }

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  function handleAddMember(memberId: string, memberType: 'human' | 'agent') {
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
      },
    );
  }

  function handleRemoveMember(memberId: string) {
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
      },
    );
  }

  function toggleAgent(agentId: string) {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  }

  // Filter available users/agents for adding
  const availableUsers = users?.users?.filter(
    u => !members.some(m => m.member_id === u.user_id && m.member_type === 'human')
  ) ?? [];

  const availableAgents = agents?.filter(
    a => !members.some(m => m.member_id === a.agent_id && m.member_type === 'agent')
  ) ?? [];

  const filteredAvailableUsers = memberSearchQuery
    ? availableUsers.filter(u => u.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
    : availableUsers;

  const filteredAvailableAgents = memberSearchQuery
    ? availableAgents.filter(a => a.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
    : availableAgents;

  return (
    <PageShell>
      <PageHeader
        title={channel?.name ?? t('edit.createTitle')}
        subtitle={t('edit.title')}
        actions={
          <Button onClick={handleSave} disabled={createChannel.isPending || updateChannel.isPending || saved}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? t('common:actions.saved') : t('edit.save')}
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>📋 {t('edit.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('edit.form.name')} *</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('edit.form.nameRequired')}
                  />
                </div>
                <div>
                  <Label>{t('edit.form.displayName')}</Label>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder={t('edit.form.displayNamePlaceholder')}
                  />
                </div>
              </div>

              <div>
                <Label>{t('edit.form.description')}</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder={t('edit.form.descriptionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('edit.form.icon')}</Label>
                  <Input
                    value={icon}
                    onChange={e => setIcon(e.target.value)}
                    placeholder="🔍"
                  />
                </div>
                <div>
                  <Label>{t('edit.form.category')}</Label>
                  <Input
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder={t('edit.form.categoryPlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('edit.form.type')}</Label>
                  <select className={selectCls} value={type} onChange={e => setType(e.target.value as any)}>
                    <option value="public">{t('edit.form.typePublic')}</option>
                    <option value="private">{t('edit.form.typePrivate')}</option>
                    <option value="dm">{t('edit.form.typeDM')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('edit.form.status')}</Label>
                  <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as any)}>
                    <option value="active">{t('edit.form.statusActive')}</option>
                    <option value="archived">{t('edit.form.statusArchived')}</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>{t('edit.form.tags')}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-foreground transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder={t('edit.form.tagPlaceholder')}
                  />
                  <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Management - Only in Edit Mode */}
          {!isCreateMode && (
            <Card>
              <CardHeader>
                <CardTitle>👥 {t('edit.members.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder={t('edit.members.search')}
                    className="flex-1"
                  />
                </div>

                {/* Current Members */}
                <div className="space-y-2">
                  <Label>{t('edit.members.current')}</Label>
                  <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                    {members.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {t('edit.members.noMembers')}
                      </div>
                    ) : (
                      members.map(member => (
                        <div key={member.member_id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <span>{member.member_type === 'human' ? '👤' : '🤖'}</span>
                            <span className="text-sm">{member.member_id}</span>
                            <Badge variant="outline" className="text-xs">
                              {member.role}
                            </Badge>
                          </div>
                          {member.role !== 'owner' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMember(member.member_id)}
                              disabled={removeMember.isPending}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Members */}
                {(filteredAvailableUsers.length > 0 || filteredAvailableAgents.length > 0) && (
                  <div className="space-y-2">
                    <Label>{t('edit.members.available')}</Label>
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {filteredAvailableUsers.map(user => (
                        <div key={user.user_id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <span>👤</span>
                            <span className="text-sm">{user.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddMember(user.user_id, 'human')}
                            disabled={addMember.isPending}
                          >
                            <UserPlus size={14} />
                          </Button>
                        </div>
                      ))}
                      {filteredAvailableAgents.map(agent => (
                        <div key={agent.agent_id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <span>🤖</span>
                            <span className="text-sm">{agent.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddMember(agent.agent_id, 'agent')}
                            disabled={addMember.isPending}
                          >
                            <UserPlus size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agent Pool */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 {t('edit.agentPool.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {agents && agents.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {agents.map(agent => (
                      <label key={agent.agent_id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={selectedAgents.includes(agent.agent_id)}
                          onChange={() => toggleAgent(agent.agent_id)}
                          className="w-4 h-4 rounded border-input"
                        />
                        <span className="text-sm">{agent.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {t('edit.agentPool.noAgents')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Communication Rules */}
          <Card>
            <CardHeader>
              <CardTitle>⚙️ {t('edit.communicationRules.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowMentions}
                    onChange={e => setAllowMentions(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  {t('edit.communicationRules.allowMentions')}
                </Label>

                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowThreads}
                    onChange={e => setAllowThreads(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  {t('edit.communicationRules.allowThreads')}
                </Label>

                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowAttachments}
                    onChange={e => setAllowAttachments(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  {t('edit.communicationRules.allowAttachments')}
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('edit.communicationRules.maxMessageLength')}</Label>
                  <Input
                    type="number"
                    value={maxMessageLength}
                    onChange={e => setMaxMessageLength(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div>
                  <Label>{t('edit.communicationRules.maxMembers')}</Label>
                  <Input
                    type="number"
                    value={maxMembers ?? ''}
                    onChange={e => setMaxMembers(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={t('edit.communicationRules.maxMembersPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rateLimitEnabled}
                    onChange={e => setRateLimitEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  {t('edit.communicationRules.rateLimitEnabled')}
                </Label>

                {rateLimitEnabled && (
                  <div>
                    <Label>{t('edit.communicationRules.messagesPerMinute')}</Label>
                    <Input
                      type="number"
                      value={messagesPerMinute}
                      onChange={e => setMessagesPerMinute(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workspace - Read Only */}
          {!isCreateMode && channel?.workspace && (
            <Card>
              <CardHeader>
                <CardTitle>📁 {t('edit.workspace.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-1">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-24">Root:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{channel.workspace.root}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-24">Shared:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{channel.workspace.shared_files}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-24">Attachments:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{channel.workspace.attachments}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContent>
    </PageShell>
  );
}
