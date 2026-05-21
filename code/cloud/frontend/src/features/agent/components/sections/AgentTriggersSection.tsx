import { Zap } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField, CheckboxField, TagInput } from '@/shared/components/form';
import type { AgentTriggersInfo } from '../../types/agent-form.types';

interface AgentTriggersSectionProps {
  value: AgentTriggersInfo;
  onChange: (value: Partial<AgentTriggersInfo>) => void;
}

export function AgentTriggersSection({ value, onChange }: AgentTriggersSectionProps) {
  const handleAddRule = (rule: string) => {
    onChange({ customRules: [...value.customRules, rule] });
  };

  const handleRemoveRule = (rule: string) => {
    onChange({ customRules: value.customRules.filter(x => x !== rule) });
  };

  return (
    <SectionCard title="Triggers" icon={<Zap size={20} />}>
      <div className="space-y-4">
        <CheckboxField
          id="onMention"
          label="Trigger on @mention"
          checked={value.onMention}
          onChange={checked => onChange({ onMention: checked })}
        />
        <CheckboxField
          id="onDirectMessage"
          label="Trigger on direct message"
          checked={value.onDirectMessage}
          onChange={checked => onChange({ onDirectMessage: checked })}
        />
        <FormField label="Schedule (cron)">
          <Input
            value={value.onSchedule}
            onChange={e => onChange({ onSchedule: e.target.value })}
            placeholder="0 9 * * *"
          />
        </FormField>
        <TagInput
          label="Custom Rules"
          tags={value.customRules}
          onAdd={handleAddRule}
          onRemove={handleRemoveRule}
          variant="outline"
        />
      </div>
    </SectionCard>
  );
}
