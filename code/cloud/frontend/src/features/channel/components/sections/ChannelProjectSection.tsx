import { FolderOpen } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { Input } from '@/shared/components/ui/input';

interface ChannelProjectSectionProps {
  projectId?: string;
  onProjectIdChange: (projectId: string) => void;
}

export function ChannelProjectSection({
  projectId,
  onProjectIdChange,
}: ChannelProjectSectionProps) {
  return (
    <SectionCard
      title="Project Association"
      description="Link this channel to a project"
      icon={<FolderOpen className="w-4 h-4" />}
    >
      <FormField
        label="Project ID"
        description="Optional project identifier"
      >
        <Input
          value={projectId || ''}
          onChange={(e) => onProjectIdChange(e.target.value)}
          placeholder="project-id"
        />
      </FormField>
    </SectionCard>
  );
}
