import { Bot } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { TagInput } from '@/shared/components/form';

interface ChannelAgentPoolSectionProps {
  agentPool: string[];
  onAgentPoolChange: (agentPool: string[]) => void;
}

export function ChannelAgentPoolSection({
  agentPool,
  onAgentPoolChange,
}: ChannelAgentPoolSectionProps) {
  const handleAddAgent = (agentId: string) => {
    if (!agentPool.includes(agentId)) {
      onAgentPoolChange([...agentPool, agentId]);
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    onAgentPoolChange(agentPool.filter(id => id !== agentId));
  };

  return (
    <SectionCard
      title="Agent Pool"
      description="Agents available in this channel"
      icon={<Bot className="w-4 h-4" />}
    >
      <FormField
        label="Agent IDs"
        description="Add agents to this channel's pool"
      >
        <TagInput
          tags={agentPool}
          onAdd={handleAddAgent}
          onRemove={handleRemoveAgent}
          placeholder="Enter agent ID"
        />
      </FormField>
    </SectionCard>
  );
}
