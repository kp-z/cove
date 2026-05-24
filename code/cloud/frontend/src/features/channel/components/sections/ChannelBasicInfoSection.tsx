import { Hash } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';

interface ChannelBasicInfoSectionProps {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  type: 'public' | 'private' | 'dm';
  status: 'active' | 'archived';
  onNameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onTypeChange: (value: 'public' | 'private' | 'dm') => void;
  onStatusChange: (value: 'active' | 'archived') => void;
  isCreateMode: boolean;
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function ChannelBasicInfoSection({
  name,
  displayName,
  description,
  icon,
  type,
  status,
  onNameChange,
  onDisplayNameChange,
  onDescriptionChange,
  onIconChange,
  onTypeChange,
  onStatusChange,
  isCreateMode,
}: ChannelBasicInfoSectionProps) {
  return (
    <SectionCard
      title="Basic Information"
      description="Channel name, description, and visibility"
      icon={<Hash className="w-4 h-4" />}
    >
      <div className="space-y-5">
        {/* Name (System ID) */}
        <FormField
          label="Name"
          description="Unique identifier (lowercase, no spaces)"
          required
        >
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="general-chat"
            disabled={!isCreateMode}
          />
        </FormField>

        {/* Display Name */}
        <FormField
          label="Display Name"
          description="Human-readable name shown in the UI"
          required
        >
          <Input
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="General Chat"
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          description="Brief description of the channel's purpose"
        >
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="A place for general team discussions"
            rows={3}
          />
        </FormField>

        {/* Icon */}
        <FormField
          label="Icon"
          description="Emoji or icon identifier"
        >
          <Input
            value={icon}
            onChange={(e) => onIconChange(e.target.value)}
            placeholder="💬"
          />
        </FormField>

        {/* Type */}
        <FormField
          label="Type"
          description="Channel visibility and access control"
          required
        >
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as 'public' | 'private' | 'dm')}
            className={selectCls}
          >
            <option value="public">Public - Anyone can join</option>
            <option value="private">Private - Invite only</option>
            <option value="dm">Direct Message</option>
          </select>
        </FormField>

        {/* Status */}
        {!isCreateMode && (
          <FormField
            label="Status"
            description="Channel activity status"
          >
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
    </SectionCard>
  );
}
