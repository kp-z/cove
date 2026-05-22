import { Wrench } from 'lucide-react';
import { CollapsibleSectionCard } from '@/shared/components/layout/CollapsibleSectionCard';
import { TagInput } from '@/shared/components/form';
import type { AgentSkillsInfo } from '../../types/agent-form.types';

interface AgentSkillsToolsSectionProps {
  value: AgentSkillsInfo;
  onChange: (value: Partial<AgentSkillsInfo>) => void;
}

export function AgentSkillsToolsSection({ value, onChange }: AgentSkillsToolsSectionProps) {
  const handleAddSkill = (id: string) => {
    onChange({ skillIds: [...value.skillIds, id] });
  };

  const handleRemoveSkill = (id: string) => {
    onChange({ skillIds: value.skillIds.filter(x => x !== id) });
  };

  const handleAddTool = (id: string) => {
    onChange({ toolIds: [...value.toolIds, id] });
  };

  const handleRemoveTool = (id: string) => {
    onChange({ toolIds: value.toolIds.filter(x => x !== id) });
  };

  return (
    <CollapsibleSectionCard title="Skills & Tools" icon={<Wrench size={20} />} defaultExpanded={true}>
      <div className="space-y-4">
        <TagInput
          label="Skill IDs"
          tags={value.skillIds}
          onAdd={handleAddSkill}
          onRemove={handleRemoveSkill}
          variant="outline"
          className="text-cyan-400 border-cyan-500/25"
        />
        <TagInput
          label="Tool IDs"
          tags={value.toolIds}
          onAdd={handleAddTool}
          onRemove={handleRemoveTool}
        />
      </div>
    </CollapsibleSectionCard>
  );
}
