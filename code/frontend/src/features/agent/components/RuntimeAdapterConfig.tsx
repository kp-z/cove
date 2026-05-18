/**
 * Runtime Adapter Configuration Component
 *
 * Allows selecting and configuring different adapter types for agent runtime.
 */

import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import type { AdapterType, AdapterConfig } from '../types/adapter.types';

interface RuntimeAdapterConfigProps {
  value: AdapterConfig | null;
  onChange: (config: AdapterConfig) => void;
}

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const ADAPTER_TYPE_OPTIONS = [
  { value: 'anthropic-api', label: 'Anthropic API' },
  { value: 'openai-api', label: 'OpenAI API' },
  { value: 'claude-code-cli', label: 'Claude Code CLI' },
] as const;

const ANTHROPIC_MODELS = [
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
] as const;

const OPENAI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
] as const;

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function FormField({ label, required, children, hint }: FormFieldProps) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function RuntimeAdapterConfig({ value, onChange }: RuntimeAdapterConfigProps) {
  const adapterType = value?.type || 'anthropic-api';

  const handleTypeChange = (newType: AdapterType) => {
    // Create default config for the new type
    if (newType === 'anthropic-api') {
      onChange({
        type: 'anthropic-api',
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        max_tokens: 4096,
      });
    } else if (newType === 'openai-api') {
      onChange({
        type: 'openai-api',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 4096,
      });
    } else if (newType === 'claude-code-cli') {
      onChange({
        type: 'claude-code-cli',
        cli_path: '/usr/local/bin/claude',
      });
    }
  };

  const updateConfig = <K extends keyof AdapterConfig>(key: K, val: AdapterConfig[K]) => {
    if (value) {
      onChange({ ...value, [key]: val } as AdapterConfig);
    }
  };

  return (
    <div className="space-y-4">
      {/* Adapter Type Selector */}
      <FormField label="Adapter Type" required>
        <select
          value={adapterType}
          onChange={(e) => handleTypeChange(e.target.value as AdapterType)}
          className={SELECT_CLASS}
        >
          {ADAPTER_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Anthropic API Configuration */}
      {adapterType === 'anthropic-api' && value?.type === 'anthropic-api' && (
        <div className="space-y-4 pt-4 border-t">
          <FormField label="Model" required>
            <select
              value={value.model}
              onChange={(e) => updateConfig('model', e.target.value)}
              className={SELECT_CLASS}
            >
              {ANTHROPIC_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Temperature">
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={value.temperature ?? 0.7}
                onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              />
            </FormField>
            <FormField label="Max Tokens">
              <Input
                type="number"
                min="1"
                max="200000"
                value={value.max_tokens ?? 4096}
                onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label="API Key" hint="Leave empty to use environment variable (ANTHROPIC_API_KEY)">
            <Input
              type="password"
              value={value.api_key ?? ''}
              onChange={(e) => updateConfig('api_key', e.target.value || undefined)}
              placeholder="sk-ant-..."
            />
          </FormField>

          <FormField label="Base URL" hint="Optional custom API endpoint">
            <Input
              value={value.base_url ?? ''}
              onChange={(e) => updateConfig('base_url', e.target.value || undefined)}
              placeholder="https://api.anthropic.com"
            />
          </FormField>

          <FormField label="Max Context Tokens" hint="Maximum context window size">
            <Input
              type="number"
              min="1"
              value={value.max_context_tokens ?? ''}
              onChange={(e) => updateConfig('max_context_tokens', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="200000"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Max Retries" hint="Retry attempts on failure">
              <Input
                type="number"
                min="0"
                max="10"
                value={value.max_retries ?? ''}
                onChange={(e) => updateConfig('max_retries', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="3"
              />
            </FormField>
            <FormField label="Initial Delay (ms)" hint="Retry backoff delay">
              <Input
                type="number"
                min="0"
                value={value.initial_delay_ms ?? ''}
                onChange={(e) => updateConfig('initial_delay_ms', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1000"
              />
            </FormField>
          </div>

          <FormField label="Custom Headers (JSON)" hint="Additional HTTP headers as JSON object">
            <Textarea
              value={value.custom_headers ? JSON.stringify(value.custom_headers, null, 2) : ''}
              onChange={(e) => {
                try {
                  const headers = e.target.value ? JSON.parse(e.target.value) : undefined;
                  updateConfig('custom_headers', headers);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              rows={3}
              placeholder='{"x-api-key": "..."}'
            />
          </FormField>
        </div>
      )}

      {/* OpenAI API Configuration */}
      {adapterType === 'openai-api' && value?.type === 'openai-api' && (
        <div className="space-y-4 pt-4 border-t">
          <FormField label="Model" required>
            <select
              value={value.model}
              onChange={(e) => updateConfig('model', e.target.value)}
              className={SELECT_CLASS}
            >
              {OPENAI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Temperature">
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={value.temperature ?? 0.7}
                onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              />
            </FormField>
            <FormField label="Max Tokens">
              <Input
                type="number"
                min="1"
                max="128000"
                value={value.max_tokens ?? 4096}
                onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label="API Key" hint="Leave empty to use environment variable (OPENAI_API_KEY)">
            <Input
              type="password"
              value={value.api_key ?? ''}
              onChange={(e) => updateConfig('api_key', e.target.value || undefined)}
              placeholder="sk-..."
            />
          </FormField>

          <FormField label="Base URL" hint="Optional custom API endpoint (e.g., Azure OpenAI)">
            <Input
              value={value.base_url ?? ''}
              onChange={(e) => updateConfig('base_url', e.target.value || undefined)}
              placeholder="https://api.openai.com/v1"
            />
          </FormField>

          <FormField label="Max Context Tokens" hint="Maximum context window size">
            <Input
              type="number"
              min="1"
              value={value.max_context_tokens ?? ''}
              onChange={(e) => updateConfig('max_context_tokens', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="128000"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Max Retries" hint="Retry attempts on failure">
              <Input
                type="number"
                min="0"
                max="10"
                value={value.max_retries ?? ''}
                onChange={(e) => updateConfig('max_retries', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="3"
              />
            </FormField>
            <FormField label="Initial Delay (ms)" hint="Retry backoff delay">
              <Input
                type="number"
                min="0"
                value={value.initial_delay_ms ?? ''}
                onChange={(e) => updateConfig('initial_delay_ms', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1000"
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Claude Code CLI Configuration */}
      {adapterType === 'claude-code-cli' && value?.type === 'claude-code-cli' && (
        <div className="space-y-4 pt-4 border-t">
          <FormField label="CLI Path" hint="Path to Claude Code CLI executable">
            <Input
              value={value.cli_path ?? ''}
              onChange={(e) => updateConfig('cli_path', e.target.value || undefined)}
              placeholder="/usr/local/bin/claude"
            />
          </FormField>

          <FormField label="Model" hint="Optional model override">
            <Input
              value={value.model ?? ''}
              onChange={(e) => updateConfig('model', e.target.value || undefined)}
              placeholder="claude-3-sonnet-20240229"
            />
          </FormField>

          <FormField label="Context Window" hint="Maximum context window size">
            <Input
              type="number"
              min="1"
              value={value.context_window ?? ''}
              onChange={(e) => updateConfig('context_window', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="200000"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Max Retries" hint="Retry attempts on failure">
              <Input
                type="number"
                min="0"
                max="10"
                value={value.max_retries ?? ''}
                onChange={(e) => updateConfig('max_retries', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="3"
              />
            </FormField>
            <FormField label="Initial Delay (ms)" hint="Retry backoff delay">
              <Input
                type="number"
                min="0"
                value={value.initial_delay_ms ?? ''}
                onChange={(e) => updateConfig('initial_delay_ms', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1000"
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );
}
