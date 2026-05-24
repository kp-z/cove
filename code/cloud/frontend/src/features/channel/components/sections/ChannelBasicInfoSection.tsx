import { Hash, User } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { AvatarEditor } from '@/shared/components/display/Avatar/AvatarEditor';

interface ChannelBasicInfoSectionProps {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  avatar?: { type: 'preset' | 'upload' | 'url'; value: string };
  type: 'public' | 'private' | 'dm';
  status: 'active' | 'archived';
  parentChannelId?: string;
  onNameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onAvatarChange: (avatar: { type: 'preset' | 'upload' | 'url'; value: string }) => void;
  onTypeChange: (value: 'public' | 'private' | 'dm') => void;
  onStatusChange: (value: 'active' | 'archived') => void;
  onParentChannelIdChange?: (value: string) => void;
  isCreateMode: boolean;
  channelId?: string;
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function ChannelBasicInfoSection({
  name,
  displayName,
  description,
  icon,
  avatar,
  type,
  status,
  parentChannelId,
  onNameChange,
  onDisplayNameChange,
  onDescriptionChange,
  onIconChange,
  onAvatarChange,
  onTypeChange,
  onStatusChange,
  onParentChannelIdChange,
  isCreateMode,
  channelId,
}: ChannelBasicInfoSectionProps) {
  return (
    <SectionCard
      title="Basic Information"
      description="Channel identity and settings"
      icon={<Hash className="w-4 h-4" />}
    >
      <div className="space-y-4">
        {/* Row 1: Avatar + Name + Display Name */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <FormField label="Avatar" description="">
              <AvatarEditor
                currentAvatar={avatar}
                onAvatarChange={onAvatarChange}
                entityType="channel"
                entityId={channelId}
                entityName={name}
              />
            </FormField>
          </div>

          {/* Name + Display Name */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <FormField
              label="Name"
              description="Unique identifier"
              required
            >
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="general-chat"
                disabled={!isCreateMode}
              />
            </FormField>

            <FormField
              label="Display Name"
              description="Human-readable name"
              required
            >
              <Input
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="General Chat"
              />
            </FormField>
          </div>
        </div>

        {/* Row 2: Icon + Type + Status */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Icon" description="Emoji">
            <Input
              value={icon}
              onChange={(e) => onIconChange(e.target.value)}
              placeholder="💬"
            />
          </FormField>

          <FormField label="Type" description="Visibility" required>
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as 'public' | 'private' | 'dm')}
              className={selectCls}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="dm">DM</option>
            </select>
          </FormField>

          {!isCreateMode && (
            <FormField label="Status" description="Activity">
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value as 'active' | 'archived')}
                className={selectCls}
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </FormField>
          )}
        </div>

        {/* Row 3: Description */}
        <FormField label="Description" description="Channel purpose">
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="A place for general team discussions"
            rows={3}
          />
        </FormField>

        {/* Row 4: Parent Channel (optional) */}
        {onParentChannelIdChange && (
          <FormField
            label="Parent Channel"
            description="Optional parent channel for threads"
          >
            <Input
              value={parentChannelId || ''}
              onChange={(e) => onParentChannelIdChange(e.target.value)}
              placeholder="parent-channel-id"
            />
          </FormField>
        )}
      </div>
    </SectionCard>
  );
}
