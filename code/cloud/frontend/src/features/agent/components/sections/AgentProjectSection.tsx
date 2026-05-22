import { FolderOpen } from 'lucide-react';
import { CollapsibleSectionCard } from '@/shared/components/layout/CollapsibleSectionCard';
import { TagInput } from '@/shared/components/form';
import type { AgentProjectInfo } from '../../types/agent-form.types';

interface AgentProjectSectionProps {
  value: AgentProjectInfo;
  onChange: (value: Partial<AgentProjectInfo>) => void;
}

export function AgentProjectSection({ value, onChange }: AgentProjectSectionProps) {
  const handleAddProject = (id: string) => {
    onChange({ projectIds: [...value.projectIds, id] });
  };

  const handleRemoveProject = (id: string) => {
    onChange({ projectIds: value.projectIds.filter(x => x !== id) });
  };

  return (
    <CollapsibleSectionCard title="Project Association" icon={<FolderOpen size={20} />} defaultExpanded={true}>
      <TagInput
        label="Project IDs"
        tags={value.projectIds}
        onAdd={handleAddProject}
        onRemove={handleRemoveProject}
      />
    </CollapsibleSectionCard>
  );
}
