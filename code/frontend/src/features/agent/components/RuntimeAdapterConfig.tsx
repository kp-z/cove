/**
 * Runtime Adapter Configuration Component
 *
 * Select an existing adapter and optionally override its configuration.
 * Changes will create a new private adapter on save.
 */

import { useState, useEffect, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import { GlassCard } from '@/shared/components/ui/GlassCard';
import { FormField } from '@/shared/components/form/FormField';
import { useAdapters, useAdapterModels } from '@/lib/trpc/hooks';

const INPUT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';
const SELECT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';

type AdapterConfig = Record<string, unknown>;

interface RuntimeAdapterConfigProps {
  value?: {
    adapter_id?: string;
    overrides?: AdapterConfig;
  };
  onChange: (value: { adapter_id?: string; overrides?: AdapterConfig }) => void;
}

export function RuntimeAdapterConfig({ value, onChange }: RuntimeAdapterConfigProps) {
  const { data: adaptersData, isLoading: adaptersLoading, error: adaptersError } = useAdapters();
  const adapters = adaptersData?.adapters || [];

  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(value?.adapter_id || '');

  // Get selected adapter
  const selectedAdapter = adapters.find(a => a.id === selectedAdapterId);
  const adapterType = selectedAdapter?.type;

  // Compute config from selected adapter
  const adapterConfig = useMemo(() => {
    if (selectedAdapter) {
      const config = (selectedAdapter as { config?: AdapterConfig }).config;
      return config ? { ...config } : {};
    }
    return {};
  }, [selectedAdapter]);

  const [config, setConfig] = useState<AdapterConfig>(() => adapterConfig);
  const [originalConfig] = useState<AdapterConfig>(() => adapterConfig);

  // Use key to force remount when adapter changes instead of useEffect
  const componentKey = selectedAdapterId || 'no-adapter';

  // Discover models for the selected adapter
  const {
    data: discoveredModels,
    isLoading: modelsLoading,
  } = useAdapterModels(selectedAdapter?.id, !!selectedAdapter);

  // Use discovered models if available, otherwise empty
  const availableModels = useMemo(() => {
    if (discoveredModels?.models && discoveredModels.models.length > 0) {
      return discoveredModels.models.map(m => ({
        value: m.id,
        label: m.display_name || m.id,
      }));
    }
    return [];
  }, [discoveredModels]);

  // Group adapters by scope
  const sharedAdapters = adapters.filter(a => a.scope === 'shared');
  const privateAdapters = adapters.filter(a => a.scope === 'private');

  // Notify parent of changes
  useEffect(() => {
    if (!selectedAdapterId) {
      onChange({ adapter_id: undefined, overrides: undefined });
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
  }, [selectedAdapterId, config, originalConfig, onChange]);

  const handleAdapterChange = (adapterId: string) => {
    setSelectedAdapterId(adapterId);
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setConfig((prev: AdapterConfig) => ({ ...prev, [key]: value }));
  };

  return (
    <GlassCard className="p-6" key={componentKey}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Cpu size={20} />
        Runtime Configuration
      </h3>

      <div className="space-y-4">
        {/* Adapter Selection */}
        <FormField label="Select Adapter" hint="Choose an adapter configuration">
          <select
            value={selectedAdapterId}
            onChange={e => handleAdapterChange(e.target.value)}
            className={SELECT_CLASS}
            disabled={adaptersLoading}
          >
            <option value="">
              {adaptersLoading ? 'Loading adapters...' : '-- Select an adapter --'}
            </option>

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

          {adaptersError && (
            <p className="text-sm text-red-500 mt-1">
              Failed to load adapters
            </p>
          )}

          {!adaptersLoading && !adaptersError && adapters.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              No adapters found. Create one in Settings first.
            </p>
          )}
        </FormField>

        {/* Configuration Fields (shown when adapter is selected) */}
        {selectedAdapter && (
          <div className="space-y-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              💡 Edit any field below. Changes will create a new private adapter on save.
            </p>

            {/* Anthropic API Config */}
            {adapterType === 'anthropic-api' && (
              <>
                <FormField label="Model" hint="Select Claude model">
                  <select
                    value={config.model || ''}
                    onChange={e => handleConfigChange('model', e.target.value)}
                    className={SELECT_CLASS}
                    disabled={modelsLoading}
                  >
                    <option value="">
                      {modelsLoading ? 'Loading...' : '-- Select model --'}
                    </option>
                    {availableModels.map(m => (
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
              </>
            )}

            {/* OpenAI API Config */}
            {adapterType === 'openai-api' && (
              <>
                <FormField label="Model" hint="Select OpenAI model">
                  <select
                    value={config.model || ''}
                    onChange={e => handleConfigChange('model', e.target.value)}
                    className={SELECT_CLASS}
                    disabled={modelsLoading}
                  >
                    <option value="">
                      {modelsLoading ? 'Loading...' : '-- Select model --'}
                    </option>
                    {availableModels.map(m => (
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

                <FormField label="Base URL" hint="Optional custom API endpoint">
                  <input
                    type="text"
                    value={config.base_url || ''}
                    onChange={e => handleConfigChange('base_url', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="https://api.openai.com/v1"
                  />
                </FormField>

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
              </>
            )}

            {/* Claude Code CLI Config */}
            {adapterType === 'claude-code-cli' && (
              <>
                <FormField label="Model" hint="Claude model to use">
                  <input
                    type="text"
                    value={config.model || ''}
                    onChange={e => handleConfigChange('model', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="claude-3-5-sonnet-20241022"
                  />
                </FormField>

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
              </>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
