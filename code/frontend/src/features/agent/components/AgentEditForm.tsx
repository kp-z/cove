import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Plus, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { CardGridLayout } from '@/shared/components/layout/CardGridLayout';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useUpdateAgent, useCreateAgent } from '@/lib/trpc/hooks/agent.hooks';
import type {
  Agent, AgentFramework, AgentCategory, AgentPriority, AgentScope, AgentPermissionMode,
} from '../types/agent.types';

interface AgentEditFormProps {
  agent?: Agent;
  onSaved: () => void;
}

const MODEL_OPTIONS = [
  { value: 'claude-3-opus', label: 'Opus' },
  { value: 'claude-3-sonnet', label: 'Sonnet' },
  { value: 'claude-3-haiku', label: 'Haiku' },
];

const FRAMEWORK_OPTIONS: { value: AgentFramework; label: string }[] = [
  { value: 'claude_code', label: 'Claude Code' },
  { value: 'openclaw', label: 'OpenClaw' },
  { value: 'hybrid', label: 'Hybrid' },
];

const CATEGORY_OPTIONS: { value: AgentCategory; label: string }[] = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'operations', label: 'Operations' },
  { value: 'design', label: 'Design' },
  { value: 'qa', label: 'QA' },
  { value: 'research', label: 'Research' },
  { value: 'platform', label: 'Platform' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'custom', label: 'Custom' },
];

const PRIORITY_OPTIONS: { value: AgentPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

const SCOPE_OPTIONS: { value: AgentScope; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'project', label: 'Project' },
  { value: 'builtin', label: 'Built-in' },
  { value: 'plugin', label: 'Plugin' },
];

const PERMISSION_OPTIONS: { value: AgentPermissionMode; label: string; color: string }[] = [
  { value: 'default', label: 'Default', color: 'bg-gray-500/20 border-gray-500/30 text-gray-400' },
  { value: 'acceptEdits', label: 'Accept', color: 'bg-blue-500/20 border-blue-500/30 text-blue-400' },
  { value: 'plan', label: 'Plan', color: 'bg-purple-500/20 border-purple-500/30 text-purple-400' },
  { value: 'bypassPermissions', label: 'Bypass', color: 'bg-red-500/20 border-red-500/30 text-red-400' },
];

const MEMORY_OPTIONS: { value: Agent['memory']; label: string }[] = [
  { value: null, label: 'None' },
  { value: 'user', label: 'User' },
  { value: 'project', label: 'Project' },
  { value: 'local', label: 'Local' },
];

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function AgentEditForm({ agent, onSaved }: AgentEditFormProps) {
  const { t } = useTranslation('agent');
  const updateAgent = useUpdateAgent();
  const createAgent = useCreateAgent();

  const isCreateMode = !agent;

  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [category, setCategory] = useState<AgentCategory>(agent?.category ?? 'engineering');
  const [priority, setPriority] = useState<AgentPriority>(agent?.priority ?? 'normal');
  const [model, setModel] = useState(agent?.model ?? 'claude-3-sonnet');
  const [framework, setFramework] = useState<AgentFramework>(agent?.framework ?? 'claude_code');
  const [scope, setScope] = useState<AgentScope>(agent?.scope ?? 'user');
  const [tools, setTools] = useState<string[]>(agent?.tools ?? []);
  const [skills, setSkills] = useState<string[]>(agent?.skills ?? []);
  const [permissionMode, setPermissionMode] = useState<AgentPermissionMode>(agent?.permission_mode ?? 'default');
  const [memory, setMemory] = useState<Agent['memory']>(agent?.memory ?? null);
  const [toolInput, setToolInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (isCreateMode) {
      createAgent.mutate(
        { name, description, category, priority, model, framework, scope, tools, skills, permission_mode: permissionMode, memory },
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
          id: agent.agent_id,
          data: { name, description, category, priority, model, framework, scope, tools, skills, permission_mode: permissionMode, memory },
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(onSaved, 600);
          },
        },
      );
    }
  }

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) {
    return (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && value.trim()) {
        e.preventDefault();
        if (!list.includes(value.trim())) {
          setList([...list, value.trim()]);
        }
        setInput('');
      }
    };
  }

  // CardGridLayout configuration
  const cardGridConfig = {
    rows: [
      {
        id: 'agent-edit-row',
        cols: 2,
        gap: 6,
        items: [
          // Left Column
          {
            id: 'left-column',
            colSpan: { default: 1, lg: 1 },
            content: (
              <div className="flex flex-col gap-6">
                {/* Basic Info */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('editForm.basicInfo')}</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('editForm.name')}</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t('editForm.description')}</Label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('editForm.category')}</Label>
                        <select value={category} onChange={e => setCategory(e.target.value as AgentCategory)} className={selectCls}>
                          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>{t('editForm.priority')}</Label>
                        <select value={priority} onChange={e => setPriority(e.target.value as AgentPriority)} className={selectCls}>
                          {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Model Config */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('editForm.modelConfig')}</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>{t('editForm.model')}</Label>
                      <select value={model} onChange={e => setModel(e.target.value)} className={selectCls}>
                        {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('editForm.framework')}</Label>
                        <select value={framework} onChange={e => setFramework(e.target.value as AgentFramework)} className={selectCls}>
                          {FRAMEWORK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>{t('editForm.scope')}</Label>
                        <select value={scope} onChange={e => setScope(e.target.value as AgentScope)} className={selectCls}>
                          {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ),
            animation: { delay: 0.1 },
          },
          // Right Column
          {
            id: 'right-column',
            colSpan: { default: 1, lg: 1 },
            content: (
              <div className="flex flex-col gap-6">
                {/* Tools and Skills */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('editForm.toolsAndSkills')}</h3>
                  <div className="space-y-5">
                    <div>
                      <Label>{t('editForm.tools')}</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {tools.map(tool => (
                          <Badge key={tool} variant="secondary" className="gap-1">
                            {tool}
                            <button onClick={() => setTools(tools.filter(x => x !== tool))} className="hover:text-foreground transition-colors">
                              <X size={12} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="relative">
                        <Input
                          value={toolInput}
                          onChange={e => setToolInput(e.target.value)}
                          onKeyDown={addTag(toolInput, tools, setTools, setToolInput)}
                          placeholder={t('editForm.toolPlaceholder')}
                        />
                        <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <Label>{t('editForm.skills')}</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {skills.map(skill => (
                          <Badge key={skill} variant="outline" className="gap-1 text-cyan-400 border-cyan-500/25">
                            {skill}
                            <button onClick={() => setSkills(skills.filter(x => x !== skill))} className="hover:text-foreground transition-colors">
                              <X size={12} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="relative">
                        <Input
                          value={skillInput}
                          onChange={e => setSkillInput(e.target.value)}
                          onKeyDown={addTag(skillInput, skills, setSkills, setSkillInput)}
                          placeholder={t('editForm.skillPlaceholder')}
                        />
                        <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Permissions */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{t('editForm.permissions')}</h3>
                  <div className="space-y-5">
                    <div>
                      <Label>{t('editForm.permissionMode')}</Label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {PERMISSION_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => setPermissionMode(o.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              permissionMode === o.value
                                ? `${o.color} ring-1 ring-white/20`
                                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>{t('editForm.memory')}</Label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {MEMORY_OPTIONS.map(o => (
                          <button
                            key={o.value ?? 'none'}
                            onClick={() => setMemory(o.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              memory === o.value
                                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400 ring-1 ring-white/20'
                                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ),
            animation: { delay: 0.2 },
          },
        ],
      },
    ],
  };

  return (
    <PageShell>
      <PageHeader
        title={agent?.name ?? t('editForm.newAgent')}
        subtitle={t('editForm.subtitle')}
        actions={
          <Button onClick={handleSave} disabled={updateAgent.isPending || createAgent.isPending || saved}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? t('common:actions.saved') : t('common:actions.save')}
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-6xl mx-auto">
          <CardGridLayout {...cardGridConfig} />
        </div>
      </PageContent>
    </PageShell>
  );
}
