import { Tag } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { TagInput } from '@/shared/components/form';
import type { AgentCapabilitiesInfo } from '../../types/agent-form.types';

interface AgentCapabilitiesSectionProps {
  value: AgentCapabilitiesInfo;
  onChange: (value: Partial<AgentCapabilitiesInfo>) => void;
}

export function AgentCapabilitiesSection({ value, onChange }: AgentCapabilitiesSectionProps) {
  const handleAddCapability = (cap: string) => {
    onChange({ capabilities: [...value.capabilities, cap] });
  };

  const handleRemoveCapability = (cap: string) => {
    onChange({ capabilities: value.capabilities.filter(x => x !== cap) });
  };

  const handleAddTag = (tag: string) => {
    onChange({ tags: [...value.tags, tag] });
  };

  const handleRemoveTag = (tag: string) => {
    onChange({ tags: value.tags.filter(x => x !== tag) });
  };

  return (
    <SectionCard title="Capabilities & Tags" icon={<Tag size={20} />}>
      <div className="space-y-5">
        <TagInput
          label="Capabilities"
          tags={value.capabilities}
          onAdd={handleAddCapability}
          onRemove={handleRemoveCapability}
        />
        <TagInput
          label="Tags"
          tags={value.tags}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          variant="outline"
        />
      </div>
    </SectionCard>
  );
}
