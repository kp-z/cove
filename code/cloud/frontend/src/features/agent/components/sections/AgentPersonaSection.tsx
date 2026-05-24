import { User } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { CollapsibleSectionCard } from '@/shared/components/layout/CollapsibleSectionCard';
import { FormField, CheckboxField } from '@/shared/components/form';
import { AvatarEditor } from '@/shared/components/display/Avatar';
import type { AgentPersonaInfo } from '../../types/agent-form.types';

interface AgentPersonaSectionProps {
  value: AgentPersonaInfo;
  onChange: (value: Partial<AgentPersonaInfo>) => void;
  agentId?: string;
  agentName?: string;
}

export function AgentPersonaSection({ value, onChange, agentId, agentName }: AgentPersonaSectionProps) {
  return (
    <CollapsibleSectionCard title="Persona Configuration" icon={<User size={20} />} defaultExpanded={true} collapsible={false}>
      <div className="space-y-4">
        {/* Avatar Section - Prominent at top */}
        {agentId && (
          <div className="flex flex-col items-center gap-3 pb-4 mb-4 border-b border-border/30">
            <AvatarEditor
              type="agent"
              id={agentId}
              name={agentName || value.name}
              size="lg"
              editable={true}
            />
            <div className="text-center">
              <p className="text-sm font-medium">Agent Avatar</p>
              <p className="text-xs text-muted-foreground">Click to change avatar</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Persona Name">
            <Input
              value={value.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Technical Expert"
            />
          </FormField>
          <FormField label="Role">
            <Input
              value={value.role}
              onChange={e => onChange({ role: e.target.value })}
              placeholder="Senior Engineer"
            />
          </FormField>
        </div>

        <FormField label="Tone">
          <Input
            value={value.tone || ''}
            onChange={e => onChange({ tone: e.target.value })}
            placeholder="Professional and friendly"
          />
        </FormField>

        <FormField label="Instructions">
          <Textarea
            value={value.instructions || ''}
            onChange={e => onChange({ instructions: e.target.value })}
            rows={4}
            placeholder="Detailed instructions for the agent's behavior and communication style"
          />
        </FormField>
      </div>
    </CollapsibleSectionCard>
  );
}
