/**
 * Runtime Adapter Configuration Component
 *
 * Two-part design:
 * 1. Base Adapter Selection: Choose from shared/private adapters or create inline
 * 2. Override Settings: Optionally override specific parameters (creates derived config)
 */

import { useState, useEffect } from 'react';
import { Cpu, Plus, Settings } from 'lucide-react';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { FormField } from '@/shared/components/form/FormField';
import { useAdapters } from '@/lib/trpc/hooks';
import type { AdapterConfig } from '../types/adapter.types';

const INPUT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';
const SELECT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';

interface RuntimeAdapterConfigProps {
  value?: {
    adapter_id?: string;
    overrides?: Partial<AdapterConfig['config']>;
  };
  onChange: (value: { adapter_id?: string; overrides?: Partial<AdapterConfig['config']> }) => void;
}

type SelectionMode = 'reference' | 'inline';

export function RuntimeAdapterConfig({ value, onChange }: RuntimeAdapterConfigProps) {
  const [mode, setMode] = useState<SelectionMode>(value?.adapter_id ? 'reference' : 'inline');
  const [selectedAdapterId, setSelectedAdapterId] = useState<string | undefined>(value?.adapter_id);
  const [overrides, setOverrides] = useState<Partial<AdapterConfig['config']>>(value?.overrides || {});
  const [showOverrides, setShowOverrides] = useState(false);

  // Inline adapter config (when mode === 'inline')
  const [inlineType, setInlineType] = useState<'anthropic-api' | 'openai-api' | 'claude-code-cli'>('anthropic-api');
  const [inlineConfig, setInlineConfig] = useState<any>({
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 4096,
  });

  const { data: adaptersData } = useAdapters();
  const adapters = adaptersData?.adapters || [];

  // Group adapters by scope
  const sharedAdapters = adapters.filter(a => a.scope === 'shared');
  const privateAdapters = adapters.filter(a => a.scope === 'private');

  // Get selected adapter details
  const selectedAdapter = adapters.find(a => a.id === selectedAdapterId);

  useEffect(() => {
    if (mode === 'reference' && selectedAdapterId) {
      onChange({ adapter_id: selectedAdapterId, overrides: showOverrides ? overrides : undefined });
    } else if (mode === 'inline') {
      onChange({ adapter_id: undefined, overrides: { type: inlineType, ...inlineConfig } });
    }
  }, [mode, selectedAdapterId, overrides, showOverrides, inlineType, inlineConfig]);

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
    if (newMode === 'inline') {
      setSelectedAdapterId(undefined);
      setShowOverrides(false);
    }
  };

  const handleAdapterSelect = (adapterId: string) => {
    setSelectedAdapterId(adapterId);
    setShowOverrides(false);
    setOverrides({});
  };

  const handleOverrideChange = (key: string, value: any) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  };

  const handleInlineConfigChange = (key: string, value: any) => {
    setInlineConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Cpu size={20} />
        Runtime Configuration
      </h3>

      <div className="space-y-6">
        {/* Part 1: Base Adapter Selection */}
        <div className="space-y-4">
          <FormField label="Configuration Mode">
            <select value={mode} onChange={e => handleModeChange(e.target.value as SelectionMode)} className={SELECT_CLASS}>
              <option value="reference">Reference Existing Adapter</option>
              <option value="inline">Create Inline Configuration</option>
            </select>
          </FormField>

          {mode === 'reference' && (
            <FormField
              label="Select Adapter"
              hint="Choose a shared or private adapter configuration"
            >
              <select
                value={selectedAdapterId || ''}
                onChange={e => handleAdapterSelect(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">-- Select an adapter --</option>

                {sharedAdapters.length > 0 && (
                  <optgroup label="🌐 Shared Adapters">
                    {sharedAdapters.map(adapter => (
                      <option key={adapter.id} value={adapter.id}>
                        {adapter.name} ({adapter.type})
                      </option>
                    ))}
                  </optgroup>
                )}

                {privateAdapters.length > 0 && (
                  <optgroup label="🔒 Private Adapters">
                    {privateAdapters.map(adapter => (
                      <option key={adapter.id} value={adapter.id}>
                        {adapter.name} ({adapter.type})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </FormField>
          )}

          {mode === 'inline' && (
            <>
              <FormField label="Adapter Type">
                <select
                  value={inlineType}
                  onChange={e => setInlineType(e.target.value as any)}
                  className={SELECT_CLASS}
                >
                  <option value="anthropic-api">Anthropic API</option>
                  <option value="openai-api">OpenAI API</option>
                  <option value="claude-code-cli">Claude Code CLI</option>
                </select>
              </FormField>

              {(inlineType === 'anthropic-api' || inlineType === 'openai-api') && (
                <>
                  <FormField label="API Key" hint="Your API key for authentication">
                    <input
                      type="password"
                      value={inlineConfig.api_key || ''}
                      onChange={e => handleInlineConfigChange('api_key', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="sk-..."
                    />
                  </FormField>

                  <FormField label="Model" hint="Model identifier">
                    <input
                      type="text"
                      value={inlineConfig.model || ''}
                      onChange={e => handleInlineConfigChange('model', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={inlineType === 'anthropic-api' ? 'claude-3-5-sonnet-20241022' : 'gpt-4'}
                    />
                  </FormField>

                  <FormField label="Base URL" hint="Optional custom API endpoint">
                    <input
                      type="text"
                      value={inlineConfig.base_url || ''}
                      onChange={e => handleInlineConfigChange('base_url', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder={inlineType === 'anthropic-api' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Temperature" hint="0.0 - 1.0">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={inlineConfig.temperature || 0.7}
                        onChange={e => handleInlineConfigChange('temperature', parseFloat(e.target.value))}
                        className={INPUT_CLASS}
                      />
                    </FormField>

                    <FormField label="Max Tokens" hint="Maximum response length">
                      <input
                        type="number"
                        value={inlineConfig.max_tokens || 4096}
                        onChange={e => handleInlineConfigChange('max_tokens', parseInt(e.target.value))}
                        className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>
                </>
              )}

              {inlineType === 'claude-code-cli' && (
                <>
                  <FormField label="CLI Path" hint="Path to Claude Code CLI executable">
                    <input
                      type="text"
                      value={inlineConfig.cli_path || ''}
                      onChange={e => handleInlineConfigChange('cli_path', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="/usr/local/bin/claude"
                    />
                  </FormField>

                  <FormField label="Model" hint="Optional model override">
                    <input
                      type="text"
                      value={inlineConfig.model || ''}
                      onChange={e => handleInlineConfigChange('model', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="claude-3-5-sonnet-20241022"
                    />
                  </FormField>

                  <FormField label="Context Window" hint="Maximum context tokens">
                    <input
                      type="number"
                      value={inlineConfig.context_window || 200000}
                      onChange={e => handleInlineConfigChange('context_window', parseInt(e.target.value))}
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </>
              )}
            </>
          )}
        </div>

        {/* Part 2: Override Settings (only for reference mode) */}
        {mode === 'reference' && selectedAdapter && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <h4 className="font-medium">Override Settings</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrides(!showOverrides)}
                className="text-sm text-primary hover:underline"
              >
                {showOverrides ? 'Hide' : 'Show'} Overrides
              </button>
            </div>

            {showOverrides && (
              <div className="space-y-4 bg-background/30 p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-4">
                  Override specific parameters from the base adapter. This creates a derived configuration.
                </p>

                {(selectedAdapter.type === 'anthropic-api' || selectedAdapter.type === 'openai-api') && (
                  <>
                    <FormField label="Model Override">
                      <input
                        type="text"
                        value={overrides.model || ''}
                        onChange={e => handleOverrideChange('model', e.target.value)}
                        className={INPUT_CLASS}
                        placeholder={`Leave empty to use base: ${(selectedAdapter.config as any).model}`}
                      />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Temperature Override">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={overrides.temperature ?? ''}
                          onChange={e => handleOverrideChange('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className={INPUT_CLASS}
                          placeholder={`Base: ${(selectedAdapter.config as any).temperature || 0.7}`}
                        />
                      </FormField>

                      <FormField label="Max Tokens Override">
                        <input
                          type="number"
                          value={overrides.max_tokens ?? ''}
                          onChange={e => handleOverrideChange('max_tokens', e.target.value ? parseInt(e.target.value) : undefined)}
                          className={INPUT_CLASS}
                          placeholder={`Base: ${(selectedAdapter.config as any).max_tokens || 4096}`}
                        />
                      </FormField>
                    </div>
                  </>
                )}

                {selectedAdapter.type === 'claude-code-cli' && (
                  <>
                    <FormField label="Model Override">
                      <input
                        type="text"
                        value={overrides.model || ''}
                        onChange={e => handleOverrideChange('model', e.target.value)}
                        className={INPUT_CLASS}
                        placeholder={`Leave empty to use base: ${(selectedAdapter.config as any).model || 'default'}`}
                      />
                    </FormField>

                    <FormField label="Context Window Override">
                      <input
                        type="number"
                        value={overrides.context_window ?? ''}
                        onChange={e => handleOverrideChange('context_window', e.target.value ? parseInt(e.target.value) : undefined)}
                        className={INPUT_CLASS}
                        placeholder={`Base: ${(selectedAdapter.config as any).context_window || 200000}`}
                      />
                    </FormField>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Adapter Info */}
        {mode === 'reference' && selectedAdapter && (
          <div className="bg-muted/30 p-4 rounded-md text-sm">
            <div className="font-medium mb-2">Selected Adapter: {selectedAdapter.name}</div>
            <div className="text-muted-foreground space-y-1">
              <div>Type: {selectedAdapter.type}</div>
              <div>Scope: {selectedAdapter.scope}</div>
              {selectedAdapter.description && <div>Description: {selectedAdapter.description}</div>}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
