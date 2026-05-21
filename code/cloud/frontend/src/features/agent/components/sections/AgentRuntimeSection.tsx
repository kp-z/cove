import { Settings, FileText } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/textarea';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { RuntimeAdapterConfig } from '../RuntimeAdapterConfig';
import type { AgentRuntimeConfigInfo } from '../../types/agent-form.types';

interface AgentRuntimeSectionProps {
  value: AgentRuntimeConfigInfo;
  onChange: (value: Partial<AgentRuntimeConfigInfo>) => void;
}

export function AgentRuntimeSection({ value, onChange }: AgentRuntimeSectionProps) {
  return (
    <>
      <RuntimeAdapterConfig
        value={{
          adapter_id: value.adapter_id,
          overrides: value.overrides,
        }}
        onChange={config => onChange({
          adapter_id: config.adapter_id,
          overrides: config.overrides,
        })}
      />

      <SectionCard title="System Prompt" icon={<FileText size={20} />}>
        <Textarea
          value={value.systemPrompt}
          onChange={e => onChange({ systemPrompt: e.target.value })}
          rows={6}
          placeholder="Custom system prompt (optional)"
        />
      </SectionCard>
    </>
  );
}
