/**
 * Runtime Adapter Configuration Component (Simplified)
 *
 * Single dropdown to select adapter, then show all editable fields.
 * Save logic automatically determines whether to reference or create new adapter.
 */

import { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { FormField } from '@/shared/components/form/FormField';
import { useAdapters } from '@/lib/trpc/hooks';

const INPUT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';
const SELECT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';

// Predefined model lists
const ANTHROPIC_MODELS = [
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

interface RuntimeAdapterConfigProps {
  value?: {
    adapter_id?: string;
    overrides?: any;
  };
  onChange: (value: { adapter_id?: string; overrides?: any }) => void;
}

export function RuntimeAdapterConfig({ value, onChange }: RuntimeAdapterConfigProps) {
  const { data: adaptersData } = useAdapters();
  const adapters = adaptersData?.adapters || [];

  // Selected adapter ID (or 'new:type' for creating new adapter)
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(value?.adapter_id || '');

  // Current config values (editable)
  const [config, setConfig] = useState<any>({});

  // Original adapter config (for comparison)
  const [originalConfig, setOriginalConfig] = useState<any>({});

  // Parse selection: check if creating new adapter
  const isCreatingNew = selectedAdapterId.startsWith('new:');
  const newAdapterType = isCreatingNew ? selectedAdapterId.replace('new:', '') as 'anthropic-api' | 'openai-api' | 'claude-code-cli' : null;

  // Get selected adapter (only if not creating new)
  const selectedAdapter = !isCreatingNew ? adapters.find(a => a.id === selectedAdapterId) : null;

  // Group adapters by scope
  const sharedAdapters = adapters.filter(a => a.scope === 'shared');
  const privateAdapters = adapters.filter(a => a.scope === 'private');

  // Initialize config when adapter is selected
  useEffect(() => {
    if (selectedAdapter) {
      const adapterConfig = (selectedAdapter as any).config || {};
      setConfig({ ...adapterConfig });
      setOriginalConfig({ ...adapterConfig });
    } else if (isCreatingNew && newAdapterType) {
      // Initialize with default config for new adapter
      const defaultConfig = {
        model: newAdapterType === 'anthropic-api' ? 'claude-3-5-sonnet-20241022' :
               newAdapterType === 'openai-api' ? 'gpt-4-turbo' : '',
        temperature: 0.7,
        max_tokens: 4096,
      };
      setConfig(defaultConfig);
      setOriginalConfig({});
    }
  }, [selectedAdapter, isCreatingNew, newAdapterType]);

  // Notify parent of changes
  useEffect(() => {
    if (!selectedAdapterId) {
      onChange({ adapter_id: undefined, overrides: undefined });
      return;
    }

    if (isCreatingNew && newAdapterType) {
      // Creating new adapter: send config with type
      onChange({ adapter_id: undefined, overrides: { type: newAdapterType, ...config } });
      return;
    }

    // Check if config has been modified
    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

    if (hasChanges) {
      // Modified: will create new adapter on save
      onChange({ adapter_id: selectedAdapterId, overrides: config });
    } else {
      // Unchanged: reference existing adapter
      onChange({ adapter_id: selectedAdapterId, overrides: undefined });
    }
  }, [selectedAdapterId, config, originalConfig, isCreatingNew, newAdapterType]);

  const handleAdapterChange = (adapterId: string) => {
    setSelectedAdapterId(adapterId);
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const adapterType = selectedAdapter?.type || newAdapterType;

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Cpu size={20} />
        Runtime Configuration
      </h3>

      <div className="space-y-4">
        {/* Adapter Selection */}
        <FormField label="Select Adapter" hint="Choose an adapter configuration as starting point">
          <select
            value={selectedAdapterId}
            onChange={e => handleAdapterChange(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">-- Select an adapter --</option>

            {/* Create New Options */}
            <optgroup label="➕ Create New">
              <option value="new:anthropic-api">Anthropic API</option>
              <option value="new:openai-api">OpenAI API</option>
              <option value="new:claude-code-cli">Claude Code CLI</option>
            </optgroup>

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

        {/* Configuration Fields (shown when adapter is selected or creating new) */}
        {(selectedAdapter || isCreatingNew) && (
          <div className="space-y-4 pt-4 border-t border-border">
            {!isCreatingNew && (
              <p className="text-sm text-muted-foreground">
                💡 Edit any field below. Changes will create a new private adapter on save.
              </p>
            )}
            {isCreatingNew && (
              <p className="text-sm text-muted-foreground">
                💡 Configure your new {newAdapterType} adapter below.
              </p>
            )}

            {/* Anthropic API Config */}
            {adapterType === 'anthropic-api' && (
              <>
                <FormField label="Model" hint="Select Claude model">
                  <select
                    value={config.model || ''}
                    onChange={e => handleConfigChange('model', e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">-- Select model --</option>
                    {ANTHROPIC_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="API Key" hint="Leave empty to use environment variable">
                  <input
                    type="password"
                    value={config.api_key || ''}
                    onChange={e => handleConfigChange('api_key', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="sk-ant-..."
                  />
                </FormField>

                <FormField label="Base URL" hint="Optional custom API endpoint">
                  <input
                    type="text"
                    value={config.base_url || ''}
                    onChange={e => handleConfigChange('base_url', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="https://api.anthropic.com"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Temperature" hint="0.0 - 1.0">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={config.temperature ?? 0.7}
                      onChange={e => handleConfigChange('temperature', parseFloat(e.target.value))}
                      className={INPUT_CLASS}
                    />
                  </FormField>

                  <FormField label="Max Tokens" hint="Maximum response length">
                    <input
                      type="number"
                      value={config.max_tokens ?? 4096}
                      onChange={e => handleConfigChange('max_tokens', parseInt(e.target.value))}
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>
              </>
            )}

            {/* OpenAI API Config */}
            {adapterType === 'openai-api' && (
              <>
                <FormField label="Model" hint="Select GPT model">
                  <select
                    value={config.model || ''}
                    onChange={e => handleConfigChange('model', e.target.value)}
                    className={SELECT_CLASS}
                  >
                    <option value="">-- Select model --</option>
                    {OPENAI_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="API Key" hint="Leave empty to use environment variable">
                  <input
                    type="password"
                    value={config.api_key || ''}
                    onChange={e => handleConfigChange('api_key', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="sk-..."
                  />
                </FormField>

                <FormField label="Base URL" hint="Optional custom API endpoint (e.g., Azure OpenAI)">
                  <input
                    type="text"
                    value={config.base_url || ''}
                    onChange={e => handleConfigChange('base_url', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="https://api.openai.com/v1"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Temperature" hint="0.0 - 2.0">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={config.temperature ?? 0.7}
                      onChange={e => handleConfigChange('temperature', parseFloat(e.target.value))}
                      className={INPUT_CLASS}
                    />
                  </FormField>

                  <FormField label="Max Tokens" hint="Maximum response length">
                    <input
                      type="number"
                      value={config.max_tokens ?? 4096}
                      onChange={e => handleConfigChange('max_tokens', parseInt(e.target.value))}
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>
              </>
            )}

            {/* Claude Code CLI Config */}
            {adapterType === 'claude-code-cli' && (
              <>
                <FormField label="CLI Path" hint="Path to Claude Code CLI executable">
                  <input
                    type="text"
                    value={config.cli_path || ''}
                    onChange={e => handleConfigChange('cli_path', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="/usr/local/bin/claude"
                  />
                </FormField>

                <FormField label="Model" hint="Optional model override">
                  <input
                    type="text"
                    value={config.model || ''}
                    onChange={e => handleConfigChange('model', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="claude-3-5-sonnet-20241022"
                  />
                </FormField>

                <FormField label="Context Window" hint="Maximum context tokens">
                  <input
                    type="number"
                    value={config.context_window ?? 200000}
                    onChange={e => handleConfigChange('context_window', parseInt(e.target.value))}
                    className={INPUT_CLASS}
                  />
                </FormField>
              </>
            )}
          </div>
        )}

        {/* Selected Adapter Info */}
        {selectedAdapter && !isCreatingNew && (
          <div className="bg-muted/30 p-4 rounded-md text-sm">
            <div className="font-medium mb-2">Selected: {selectedAdapter.name}</div>
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
