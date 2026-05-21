import { FileText } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form';
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
}

export function AgentBasicInfoSection({ value, onChange }: AgentBasicInfoSectionProps) {
  return (
    <SectionCard title="Basic Information" icon={<FileText size={20} />}>
      <div className="space-y-4">
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
    </SectionCard>
  );
}
