import { useState } from 'react';
import { Info } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { CollapsibleSectionCard } from '@/shared/components/layout/CollapsibleSectionCard';
import { FormField } from '@/shared/components/form';
import { InfoField } from '@/shared/components/display';
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
  agent?: any; // Full agent object for system info
}

export function AgentBasicInfoSection({ value, onChange, agentId, agentName, agent }: AgentBasicInfoSectionProps) {
  const isEditMode = !!agent;

  return (
    <CollapsibleSectionCard title="Basic Information" icon={<Info size={20} />} defaultExpanded={true} collapsible={false}>
      <div className="space-y-4">
        {/* System Information (Edit Mode Only) */}
        {isEditMode && agent && (
          <div className="pb-4 mb-4 border-b border-border/30">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">System Information</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoField label="Agent ID" value={agent.agent_id} mono />
              <InfoField label="Name" value={agent.name} mono />
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              </div>
              <InfoField label="Created By" value={agent.created_by} />
              <InfoField label="Created At" value={new Date(agent.created_at).toLocaleString()} />
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
    </CollapsibleSectionCard>
  );
}
