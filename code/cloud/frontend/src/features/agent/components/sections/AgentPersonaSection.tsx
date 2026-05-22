import { useState } from 'react';
import { User } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { CollapsibleSectionCard } from '@/shared/components/layout/CollapsibleSectionCard';
import { FormField, CheckboxField } from '@/shared/components/form';
import { Avatar } from '@/shared/components/display/Avatar/Avatar';
import { AvatarSelector } from '@/features/settings/components/AvatarSelector';
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
  agentId?: string;
  agentName?: string;
}

export function AgentPersonaSection({ value, onChange, agentId, agentName }: AgentPersonaSectionProps) {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  return (
    <CollapsibleSectionCard title="Persona Configuration" icon={<User size={20} />} defaultExpanded={true}>
      <div className="space-y-4">
        {/* Avatar Section */}
        {agentId && (
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border/30">
            <button
              type="button"
              onClick={() => setShowAvatarSelector(true)}
              className="relative group cursor-pointer"
            >
              <Avatar
                type="agent"
                id={agentId}
                name={agentName || value.name}
                size="lg"
                className="transition-opacity group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-xs text-white font-medium">Edit</span>
              </div>
            </button>
            <div className="flex-1">
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

      {/* Avatar Selector Modal */}
      {showAvatarSelector && agentId && (
        <AvatarSelector
          entityType="agent"
          entityId={agentId}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </CollapsibleSectionCard>
  );
}
