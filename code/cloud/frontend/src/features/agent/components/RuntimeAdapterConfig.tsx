/**
 * Runtime Adapter Configuration Component
 *
 * Select an existing adapter and optionally override its configuration.
 * Changes will create a new private adapter on save.
 */

import { useState, useEffect, useMemo } from 'react';
import { Cpu } from 'lucide-react';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { FormField } from '@/shared/components/form/FormField';
import { useAdapters, useAdapterModels } from '@/lib/trpc/hooks';

const INPUT_CLASS = 'w-full px-3 py-2 bg-background/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAdapterId, config, originalConfig]);

  const handleAdapterChange = (adapterId: string) => {
    setSelectedAdapterId(adapterId);
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setConfig((prev: AdapterConfig) => ({ ...prev, [key]: value }));
  };

  return (
    <GlassCard className="p-6 space-y-6" key={componentKey}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Cpu className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Runtime Configuration</h3>
      </div>

      <div className="space-y-4">
        {/* Adapter Selection - Simple Dropdown */}
        <FormField
          label="Select Adapter"
          hint={adaptersLoading ? 'Loading...' : `${adapters.length} available`}
        >
          {adaptersError ? (
            <div className="p-3 rounded-md border border-red-500/20 bg-red-500/5">
              <p className="text-sm text-red-500">Failed to load adapters</p>
            </div>
          ) : (
            <select
              value={selectedAdapterId}
              onChange={e => handleAdapterChange(e.target.value)}
              className={INPUT_CLASS}
              disabled={adaptersLoading}
            >
              <option value="">
                {adaptersLoading ? 'Loading adapters...' : 'Select an adapter...'}
              </option>
              {adapters.map((adapter: any) => {
                const scopeLabel = adapter.scope === 'shared' ? 'shared' : 'private';
                return (
                  <option key={adapter.id} value={adapter.id}>
                    {adapter.name} ({adapter.type}, {scopeLabel})
                  </option>
                );
              })}
            </select>
          )}
        </FormField>

        {/* Configuration Override Section */}
        {selectedAdapter && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Configuration Override
              </h4>
              <span className="text-xs text-muted-foreground">
                {adapterType}
              </span>
            </div>

            {/* Model Selection */}
            {availableModels.length > 0 && (
              <FormField label="Model" hint="Override the model for this agent">
                <select
                  value={(config.model as string) || ''}
                  onChange={e => handleConfigChange('model', e.target.value)}
                  className={INPUT_CLASS}
                  disabled={modelsLoading}
                >
                  <option value="">
                    {modelsLoading ? 'Loading models...' : 'Use adapter default'}
                  </option>
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Temperature */}
            <FormField
              label="Temperature"
              hint="Controls randomness in responses (0 = deterministic, 2 = creative)"
            >
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={(config.temperature as number) ?? 0.7}
                  onChange={e => handleConfigChange('temperature', parseFloat(e.target.value))}
                  className="w-full h-2 bg-background/50 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Precise (0)</span>
                  <span className="font-medium text-foreground">
                    {((config.temperature as number) ?? 0.7).toFixed(1)}
                  </span>
                  <span>Creative (2)</span>
                </div>
              </div>
            </FormField>

            {/* Max Tokens */}
            <FormField
              label="Max Tokens"
              hint="Maximum length of the response"
            >
              <input
                type="number"
                value={(config.max_tokens as number) || ''}
                onChange={e => handleConfigChange('max_tokens', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Use adapter default"
                min="1"
                max="200000"
                className={INPUT_CLASS}
              />
            </FormField>

            {/* API Key Override */}
            <FormField
              label="API Key (Optional)"
              hint="Override the adapter's API key for this agent"
            >
              <input
                type="password"
                value={(config.api_key as string) || ''}
                onChange={e => handleConfigChange('api_key', e.target.value)}
                placeholder="Use adapter default"
                className={INPUT_CLASS}
              />
            </FormField>

            {/* Base URL Override */}
            {adapterType === 'anthropic' && (
              <FormField
                label="Base URL (Optional)"
                hint="Override the API endpoint"
              >
                <input
                  type="text"
                  value={(config.base_url as string) || ''}
                  onChange={e => handleConfigChange('base_url', e.target.value)}
                  placeholder="https://api.anthropic.com"
                  className={INPUT_CLASS}
                />
              </FormField>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
