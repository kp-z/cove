/**
 * Runtime Adapter Configuration Component
 *
 * Select an existing adapter and optionally override its configuration.
 * Changes will create a new private adapter on save.
 */

import { useState, useEffect, useMemo } from 'react';
import { Cpu, Check } from 'lucide-react';
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

// Adapter type icons
const ADAPTER_ICONS: Record<string, string> = {
  anthropic: '🤖',
  openai: '🧠',
  ollama: '🦙',
  default: '⚡',
};

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

      {/* Adapter Selection - Card Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Select Adapter</label>
          <span className="text-xs text-muted-foreground">
            {adapters.length} available
          </span>
        </div>

        {adaptersLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse bg-background/50 h-20 rounded-lg border border-border" />
            ))}
          </div>
        ) : adaptersError ? (
          <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <p className="text-sm text-red-500">Failed to load adapters</p>
          </div>
        ) : adapters.length === 0 ? (
          <div className="p-4 rounded-lg border border-border bg-background/30">
            <p className="text-sm text-muted-foreground">
              No adapters found. Create one in Settings first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {adapters.map((adapter: any) => {
              const isSelected = selectedAdapterId === adapter.id;
              const icon = ADAPTER_ICONS[adapter.type] || ADAPTER_ICONS.default;

              return (
                <button
                  key={adapter.id}
                  onClick={() => handleAdapterChange(adapter.id)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all text-left
                    hover:border-primary/50
                    ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background/30'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0">{icon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {adapter.name}
                        </span>
                        {adapter.scope === 'shared' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Shared
                          </span>
                        )}
                        {adapter.scope === 'private' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Private
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {adapter.type}
                      </div>
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Configuration Override Section */}
      {selectedAdapter && (
        <div className="space-y-4 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
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
    </GlassCard>
  );
}
