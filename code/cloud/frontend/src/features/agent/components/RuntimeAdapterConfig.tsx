import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Slider } from '@/shared/components/ui/slider';
import { ChevronDown, ChevronUp, Settings, AlertCircle } from 'lucide-react';

interface RuntimeAdapterConfigProps {
  agentId: string;
  currentConfig?: {
    adapterId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseUrl?: string;
  };
  onConfigChange?: (config: any) => void;
}

export const RuntimeAdapterConfig: React.FC<RuntimeAdapterConfigProps> = ({
  agentId,
  currentConfig,
  onConfigChange,
}) => {
  const queryClient = useQueryClient();
  const [selectedAdapterId, setSelectedAdapterId] = useState<string | undefined>(
    currentConfig?.adapterId
  );
  const [model, setModel] = useState(currentConfig?.model || '');
  const [temperature, setTemperature] = useState(currentConfig?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(currentConfig?.maxTokens || 4096);
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch available adapters
  const { data: adapters, isLoading: adaptersLoading } = useQuery({
    queryKey: ['adapters'],
    queryFn: async () => {
      const result = await trpc.adapter.list.query();
      return result;
    },
  });

  // Fetch available models for selected adapter
  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['adapter-models', selectedAdapterId],
    queryFn: async () => {
      if (!selectedAdapterId) return [];
      const result = await trpc.adapter.getModels.query({ adapterId: selectedAdapterId });
      return result;
    },
    enabled: !!selectedAdapterId,
  });

  // Update agent runtime config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      return trpc.agent.updateRuntimeConfig.mutate({
        agentId,
        config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      onConfigChange?.({
        adapterId: selectedAdapterId,
        model,
        temperature,
        maxTokens,
        apiKey,
        baseUrl,
      });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({
      adapterId: selectedAdapterId,
      model,
      temperature,
      maxTokens,
      apiKey,
      baseUrl,
    });
  };

  const selectedAdapter = adapters?.find((a: any) => a.id === selectedAdapterId);
  const hasChanges =
    selectedAdapterId !== currentConfig?.adapterId ||
    model !== currentConfig?.model ||
    temperature !== currentConfig?.temperature ||
    maxTokens !== currentConfig?.maxTokens ||
    apiKey !== currentConfig?.apiKey ||
    baseUrl !== currentConfig?.baseUrl;

  return (
    <GlassCard className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-white">Runtime Configuration</h3>
      </div>

      {/* Adapter Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Adapter Selection
        </label>

        {adaptersLoading ? (
          <div className="animate-pulse bg-gray-700/50 h-20 rounded-lg" />
        ) : (
          <div className="space-y-2">
            {adapters?.map((adapter: any) => (
              <button
                key={adapter.id}
                onClick={() => setSelectedAdapterId(adapter.id)}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all text-left
                  ${
                    selectedAdapterId === adapter.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{adapter.icon || '🌐'}</span>
                      <div>
                        <div className="font-medium text-white">{adapter.name}</div>
                        <div className="text-sm text-gray-400">
                          {adapter.scope === 'shared' ? 'Shared' : 'Private'} • {adapter.model || 'No model set'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedAdapterId === adapter.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700" />

      {/* Model Configuration */}
      {selectedAdapterId && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">
            Model Configuration
          </label>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={modelsLoading}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select a model</option>
              {models?.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm text-gray-400">Temperature</label>
              <span className="text-sm text-gray-500">{temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-400">Max Tokens</label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={1}
              max={200000}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Divider */}
      {selectedAdapterId && <div className="border-t border-gray-700" />}

      {/* Advanced Settings */}
      {selectedAdapterId && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <span>Advanced Settings</span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2">
              {/* API Key */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key (optional)"
                  className="w-full"
                />
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Base URL</label>
                <Input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.anthropic.com"
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Message */}
      {hasChanges && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-300">
            Changes will create a new private adapter configuration
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateConfigMutation.isPending}
          variant="primary"
        >
          {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </GlassCard>
  );
};
