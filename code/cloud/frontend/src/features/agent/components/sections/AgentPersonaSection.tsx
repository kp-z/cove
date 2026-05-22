import { User } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { CollapsibleSectionCard } from '@/shared/components/layout/CollapsibleSectionCard';
import { FormField, CheckboxField } from '@/shared/components/form';
import type { AgentPersonaInfo } from '../../types/agent-form.types';

const FORMALITY_OPTIONS = [
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'formal', label: 'Formal' },
] as const;

const VERBOSITY_OPTIONS = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
] as const;

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface AgentPersonaSectionProps {
  value: AgentPersonaInfo;
  onChange: (value: Partial<AgentPersonaInfo>) => void;
}

export function AgentPersonaSection({ value, onChange }: AgentPersonaSectionProps) {
  return (
    <CollapsibleSectionCard title="Persona Configuration" icon={<User size={20} />} defaultExpanded={false}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Persona Name">
            <Input
              value={value.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="Technical Expert"
            />
          </FormField>
          <FormField label="Title">
            <Input
              value={value.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder="Senior Engineer"
            />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea
            value={value.description}
            onChange={e => onChange({ description: e.target.value })}
            rows={3}
            placeholder="Persona description"
          />
        </FormField>

        <div className="pt-4 border-t border-border/30">
          <h4 className="text-sm font-medium mb-3">Language Style</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Formality">
                <select
                  value={value.languageStyle.formality}
                  onChange={e => onChange({
                    languageStyle: { ...value.languageStyle, formality: e.target.value }
                  })}
                  className={SELECT_CLASS}
                >
                  {FORMALITY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Verbosity">
                <select
                  value={value.languageStyle.verbosity}
                  onChange={e => onChange({
                    languageStyle: { ...value.languageStyle, verbosity: e.target.value }
                  })}
                  className={SELECT_CLASS}
                >
                  {VERBOSITY_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <FormField label="Preferred Language">
              <Input
                value={value.languageStyle.preferredLanguage}
                onChange={e => onChange({
                  languageStyle: { ...value.languageStyle, preferredLanguage: e.target.value }
                })}
                placeholder="en, zh-CN"
              />
            </FormField>
          </div>
        </div>

        <div className="pt-4 border-t border-border/30">
          <h4 className="text-sm font-medium mb-3">Behavior</h4>
          <div className="space-y-3">
            <CheckboxField
              id="proactive"
              label="Proactive"
              checked={value.behavior.proactive}
              onChange={checked => onChange({
                behavior: { ...value.behavior, proactive: checked }
              })}
            />
            <CheckboxField
              id="askBeforeAction"
              label="Ask Before Action"
              checked={value.behavior.askBeforeAction}
              onChange={checked => onChange({
                behavior: { ...value.behavior, askBeforeAction: checked }
              })}
            />
          </div>
        </div>
      </div>
    </CollapsibleSectionCard>
  );
}
