import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Plus, Check, Settings, FileText, FolderOpen, Tag, Cpu, User, Wrench, Zap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useCreateAgent, useUpdateAgent } from '@/lib/trpc/hooks/agent.hooks';
import type { Agent, AgentScope } from '../types/agent.types';
import { RuntimeAdapterConfig } from './RuntimeAdapterConfig';
import type { AdapterConfig } from '../types/adapter.types';

interface AgentEditFormProps {
  agent?: Agent;
  onSaved: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_OPTIONS = [
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
] as const;

const SCOPE_OPTIONS: { value: AgentScope; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'project', label: 'Project' },
  { value: 'built-in', label: 'Built-in' },
  { value: 'admin', label: 'Admin' },
] as const;

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

// ============================================================================
// Helper Components
// ============================================================================

interface TagInputProps {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

function TagInput({ label, tags, onAdd, onRemove, placeholder = 'Press Enter to add', variant = 'secondary', className }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onAdd(input.trim());
      }
      setInput('');
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
        {tags.map(tag => (
          <Badge key={tag} variant={variant} className={`gap-1 ${className || ''}`}>
            {tag}
            <button
              onClick={() => onRemove(tag)}
              className="hover:text-foreground transition-colors"
              type="button"
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentEditForm({ agent, onSaved }: AgentEditFormProps) {
  const { t } = useTranslation('agent');
  const isCreateMode = !agent;
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  // Basic Info
  const [displayName, setDisplayName] = useState(agent?.display_name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [scope, setScope] = useState<AgentScope>(agent?.scope ?? 'user');

  // Project IDs
  const [projectIds, setProjectIds] = useState<string[]>(agent?.project_ids ? [...agent.project_ids] : []);

  // Capabilities & Tags
  const [capabilities, setCapabilities] = useState<string[]>(agent?.capabilities ? [...agent.capabilities] : []);
  const [tags, setTags] = useState<string[]>(agent?.tags ? [...agent.tags] : []);

  // Runtime Config - Adapter Configuration (two-part: adapter_id + overrides)
  const [runtimeConfig, setRuntimeConfig] = useState<{
    adapter_id?: string;
    overrides?: Partial<AdapterConfig['config']>;
  }>({
    adapter_id: agent?.runtime_config?.adapter_id,
    overrides: agent?.runtime_config?.overrides,
  });
  const [systemPrompt, setSystemPrompt] = useState(agent?.runtime_config?.systemPrompt ?? '');

  // Persona
  const [personaName, setPersonaName] = useState(agent?.persona?.name ?? '');
  const [personaTitle, setPersonaTitle] = useState(agent?.persona?.title ?? '');
  const [personaDescription, setPersonaDescription] = useState(agent?.persona?.description ?? '');
  const [formality, setFormality] = useState(agent?.persona?.language_style?.formality ?? 'professional');
  const [verbosity, setVerbosity] = useState(agent?.persona?.language_style?.verbosity ?? 'balanced');
  const [preferredLanguage, setPreferredLanguage] = useState(agent?.persona?.language_style?.preferred_language ?? 'en');
  const [proactive, setProactive] = useState(agent?.persona?.behavior?.proactive ?? false);
  const [askBeforeAction, setAskBeforeAction] = useState(agent?.persona?.behavior?.ask_before_action ?? true);

  // Skills & Tools
  const [skillIds, setSkillIds] = useState<string[]>(agent?.skills?.skillIds ? [...agent.skills.skillIds] : []);
  const [toolIds, setToolIds] = useState<string[]>(agent?.tools?.toolIds ? [...agent.tools.toolIds] : []);

  // Triggers
  const [onMention, setOnMention] = useState(agent?.triggers?.onMention ?? false);
  const [onDirectMessage, setOnDirectMessage] = useState(agent?.triggers?.onDirectMessage ?? false);
  const [onSchedule, setOnSchedule] = useState(agent?.triggers?.onSchedule ?? '');
  const [customRules, setCustomRules] = useState<string[]>(agent?.triggers?.customRules ? [...agent.triggers.customRules] : []);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (isCreateMode) {
      createAgent.mutate(
        {
          name: displayName.toLowerCase().replace(/\s+/g, '-'),
          displayName,
          description,
          scope,
          projectIds,
          capabilities,
          tags,
          runtimeConfig, // Include adapter_id and overrides
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(onSaved, 600);
          },
        },
      );
    } else {
      updateAgent.mutate(
        {
          agentId: agent.agent_id,
          data: {
            displayName,
            description,
            scope,
            projectIds,
            capabilities,
            tags,
            runtimeConfig, // Include adapter_id and overrides
            systemPrompt: systemPrompt || undefined,
            personaName: personaName || undefined,
            role: personaTitle || undefined,
            tone: formality || undefined,
            instructions: personaDescription || undefined,
            skillIds,
            toolIds,
            onMention,
            onDirectMessage,
            onSchedule: onSchedule || undefined,
            customRules,
          },
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(onSaved, 600);
          },
        },
      );
    }
  };

  const isPending = createAgent.isPending || updateAgent.isPending;
  const canSave = displayName.trim() && !isPending && !saved;

  return (
    <PageShell>
      <PageHeader
        title={isCreateMode ? 'Create Agent' : (agent?.display_name || agent?.name || 'Edit Agent')}
        subtitle={isCreateMode ? 'Create a new AI agent' : `Agent ID: ${agent?.agent_id}`}
        actions={
          <Button onClick={handleSave} disabled={!canSave}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1400px] mx-auto">
          {/* Left Column */}
          <div className="flex flex-col gap-6">
            {/* System Information (Edit Mode Only) */}
            {!isCreateMode && agent && (
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings size={20} />
                  System Information
                </h3>
                <div className="space-y-3">
                  <InfoField label="Agent ID" value={agent.agent_id} mono />
                  <InfoField label="Name" value={agent.name} mono />
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                  <InfoField label="Created By" value={agent.created_by} />
                  <InfoField label="Created At" value={new Date(agent.created_at).toLocaleString()} />
                </div>
              </GlassCard>
            )}

            {/* Basic Information */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText size={20} />
                Basic Information
              </h3>
              <div className="space-y-4">
                <FormField label="Display Name" required>
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="My Agent"
                  />
                </FormField>
                <FormField label="Description">
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Agent description"
                  />
                </FormField>
                <FormField label="Scope">
                  <select value={scope} onChange={e => setScope(e.target.value as AgentScope)} className={SELECT_CLASS}>
                    {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              </div>
            </GlassCard>

            {/* Project Association */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FolderOpen size={20} />
                Project Association
              </h3>
              <TagInput
                label="Project IDs"
                tags={projectIds}
                onAdd={id => setProjectIds([...projectIds, id])}
                onRemove={id => setProjectIds(projectIds.filter(x => x !== id))}
              />
            </GlassCard>

            {/* Capabilities & Tags */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Tag size={20} />
                Capabilities & Tags
              </h3>
              <div className="space-y-5">
                <TagInput
                  label="Capabilities"
                  tags={capabilities}
                  onAdd={cap => setCapabilities([...capabilities, cap])}
                  onRemove={cap => setCapabilities(capabilities.filter(x => x !== cap))}
                />
                <TagInput
                  label="Tags"
                  tags={tags}
                  onAdd={tag => setTags([...tags, tag])}
                  onRemove={tag => setTags(tags.filter(x => x !== tag))}
                  variant="outline"
                />
              </div>
            </GlassCard>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* Runtime Configuration */}
            <RuntimeAdapterConfig
              value={runtimeConfig}
              onChange={setRuntimeConfig}
            />

            {/* System Prompt */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText size={20} />
                System Prompt
              </h3>
              <Textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={6}
                placeholder="Custom system prompt (optional)"
              />
            </GlassCard>

            {/* Persona Configuration */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User size={20} />
                Persona Configuration
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Persona Name">
                    <Input value={personaName} onChange={e => setPersonaName(e.target.value)} placeholder="Technical Expert" />
                  </FormField>
                  <FormField label="Title">
                    <Input value={personaTitle} onChange={e => setPersonaTitle(e.target.value)} placeholder="Senior Engineer" />
                  </FormField>
                </div>
                <FormField label="Description">
                  <Textarea
                    value={personaDescription}
                    onChange={e => setPersonaDescription(e.target.value)}
                    rows={3}
                    placeholder="Persona description"
                  />
                </FormField>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Language Style</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Formality">
                        <select value={formality} onChange={e => setFormality(e.target.value)} className={SELECT_CLASS}>
                          {FORMALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Verbosity">
                        <select value={verbosity} onChange={e => setVerbosity(e.target.value)} className={SELECT_CLASS}>
                          {VERBOSITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </FormField>
                    </div>
                    <FormField label="Preferred Language">
                      <Input
                        value={preferredLanguage}
                        onChange={e => setPreferredLanguage(e.target.value)}
                        placeholder="en, zh-CN"
                      />
                    </FormField>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3">Behavior</h4>
                  <div className="space-y-3">
                    <CheckboxField
                      id="proactive"
                      label="Proactive"
                      checked={proactive}
                      onChange={setProactive}
                    />
                    <CheckboxField
                      id="askBeforeAction"
                      label="Ask Before Action"
                      checked={askBeforeAction}
                      onChange={setAskBeforeAction}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Skills & Tools */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wrench size={20} />
                Skills & Tools
              </h3>
              <div className="space-y-5">
                <TagInput
                  label="Skill IDs"
                  tags={skillIds}
                  onAdd={id => setSkillIds([...skillIds, id])}
                  onRemove={id => setSkillIds(skillIds.filter(x => x !== id))}
                  variant="outline"
                  className="text-cyan-400 border-cyan-500/25"
                />
                <TagInput
                  label="Tool IDs"
                  tags={toolIds}
                  onAdd={id => setToolIds([...toolIds, id])}
                  onRemove={id => setToolIds(toolIds.filter(x => x !== id))}
                />
              </div>
            </GlassCard>

            {/* Triggers */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap size={20} />
                Triggers
              </h3>
              <div className="space-y-4">
                <CheckboxField
                  id="onMention"
                  label="Trigger on @mention"
                  checked={onMention}
                  onChange={setOnMention}
                />
                <CheckboxField
                  id="onDirectMessage"
                  label="Trigger on direct message"
                  checked={onDirectMessage}
                  onChange={setOnDirectMessage}
                />
                <FormField label="Schedule (cron)">
                  <Input
                    value={onSchedule}
                    onChange={e => setOnSchedule(e.target.value)}
                    placeholder="0 9 * * *"
                  />
                </FormField>
                <TagInput
                  label="Custom Rules"
                  tags={customRules}
                  onAdd={rule => setCustomRules([...customRules, rule])}
                  onRemove={rule => setCustomRules(customRules.filter(x => x !== rule))}
                  variant="outline"
                />
              </div>
            </GlassCard>
          </div>
        </div>
      </PageContent>
    </PageShell>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function InfoField({ label, value, mono }: InfoFieldProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-input"
      />
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
    </div>
  );
}
