import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form';
import { Avatar } from '@/shared/components/display/Avatar/Avatar';
import { AvatarSelector } from '@/features/settings/components/AvatarSelector';
import type { AgentBasicInfo, AgentScope } from '../../types/agent.types';

const SCOPE_OPTIONS: { value: AgentScope; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'project', label: 'Project' },
  { value: 'built-in', label: 'Built-in' },
  { value: 'admin', label: 'Admin' },
] as const;

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface AgentBasicInfoSectionProps {
  value: AgentBasicInfo;
  onChange: (value: Partial<AgentBasicInfo>) => void;
  agentId?: string;
  agentName?: string;
}

export function AgentBasicInfoSection({ value, onChange, agentId, agentName }: AgentBasicInfoSectionProps) {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  return (
    <SectionCard title="Basic Information" icon={<FileText size={20} />}>
      <div className="space-y-4">
        {/* Avatar Section */}
        {agentId && (
          <div className="flex items-center gap-4 pb-4 border-b border-border/30">
            <button
              type="button"
              onClick={() => setShowAvatarSelector(true)}
              className="relative group cursor-pointer"
            >
              <Avatar
                type="agent"
                id={agentId}
                name={agentName || value.displayName}
                size="lg"
                className="transition-opacity group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-xs text-white font-medium">Edit</span>
              </div>
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium">Agent Avatar</p>
              <p className="text-xs text-muted-foreground">Click to change avatar</p>
            </div>
          </div>
        )}

        <FormField label="Display Name" required>
          <Input
            value={value.displayName}
            onChange={e => onChange({ displayName: e.target.value })}
            placeholder="My Agent"
          />
        </FormField>
        <FormField label="Description">
          <Textarea
            value={value.description}
            onChange={e => onChange({ description: e.target.value })}
            rows={3}
            placeholder="Agent description"
          />
        </FormField>
        <FormField label="Scope">
          <select
            value={value.scope}
            onChange={e => onChange({ scope: e.target.value as AgentScope })}
            className={SELECT_CLASS}
          >
            {SCOPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && agentId && (
        <AvatarSelector
          entityType="agent"
          entityId={agentId}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </SectionCard>
  );
}
