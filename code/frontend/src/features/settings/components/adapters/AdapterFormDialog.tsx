import { useState, useMemo } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { FormInput, FormSelect, FormTextarea } from '@/shared/components/ui/FormControls'

type AdapterType = 'anthropic-api' | 'openai-api' | 'claude-code-cli'
type AdapterScope = 'shared' | 'private'

export interface AdapterFormData {
  name: string
  description: string
  type: AdapterType
  scope: AdapterScope
  config: {
    model?: string
    api_key?: string
    base_url?: string
    temperature?: number
    max_tokens?: number
    custom_headers?: Record<string, string>
    cli_path?: string
    context_window?: number
  }
}

interface AdapterFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialData?: Partial<AdapterFormData>
  onSubmit: (data: AdapterFormData) => Promise<void>
  isSubmitting: boolean
}

function getEmptyFormData(): AdapterFormData {
  return {
    name: '',
    description: '',
    type: 'anthropic-api',
    scope: 'private',
    config: {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      max_tokens: 4096,
    },
  }
}

function getDefaultModel(type: AdapterType): string {
  switch (type) {
    case 'anthropic-api':
      return 'claude-3-5-sonnet-20241022'
    case 'openai-api':
      return 'gpt-4-turbo'
    case 'claude-code-cli':
      return 'claude-3-5-sonnet-20241022'
  }
}

export function AdapterFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  isSubmitting,
}: AdapterFormDialogProps) {
  // Compute initial form data to avoid setState in effect
  const initialFormData = useMemo(() => {
    if (open && initialData) {
      return {
        ...getEmptyFormData(),
        ...initialData,
      } as AdapterFormData;
    }
    return getEmptyFormData();
  }, [open, initialData]);

  const [formData, setFormData] = useState<AdapterFormData>(initialFormData);

  // Use a stable key based on open state and initial data to force remount
  const dialogKey = open ? JSON.stringify(initialData) : 'closed';

  const handleConfigChange = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }))
  }

  const handleSubmit = async () => {
    await onSubmit(formData)
  }

  const renderConfigFields = (type: AdapterType) => {
    const commonFields = (
      <>
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Model <span className="text-red-400">*</span>
          </label>
          <FormInput
            type="text"
            value={formData.config.model || ''}
            onChange={e => handleConfigChange('model', e.target.value)}
            placeholder={type === 'anthropic-api' ? 'claude-sonnet-4-20250514' : type === 'openai-api' ? 'gpt-4' : 'claude-3-5-sonnet-20241022'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Temperature
          </label>
          <FormInput
            type="number"
            step="0.1"
            min="0"
            max={type === 'openai-api' ? '2' : '1'}
            value={formData.config.temperature ?? 0.7}
            onChange={e => handleConfigChange('temperature', parseFloat(e.target.value))}
          />
          <p className="text-xs text-white/40 mt-1">Range: 0.0 - {type === 'openai-api' ? '2.0' : '1.0'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Max Tokens
          </label>
          <FormInput
            type="number"
            value={formData.config.max_tokens ?? 4096}
            onChange={e => handleConfigChange('max_tokens', parseInt(e.target.value))}
          />
        </div>
      </>
    )

    switch (type) {
      case 'anthropic-api':
      case 'openai-api':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                API Key
              </label>
              <FormInput
                type="password"
                value={formData.config.api_key || ''}
                onChange={e => handleConfigChange('api_key', e.target.value)}
                placeholder={type === 'anthropic-api' ? 'sk-ant-...' : 'sk-...'}
              />
              <p className="text-xs text-white/40 mt-1">Leave empty to use environment variable</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Base URL
              </label>
              <FormInput
                type="text"
                value={formData.config.base_url || ''}
                onChange={e => handleConfigChange('base_url', e.target.value)}
                placeholder={type === 'anthropic-api' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'}
              />
              <p className="text-xs text-white/40 mt-1">Optional custom API endpoint</p>
            </div>

            {commonFields}
          </>
        )

      case 'claude-code-cli':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                CLI Path
              </label>
              <FormInput
                type="text"
                value={formData.config.cli_path || ''}
                onChange={e => handleConfigChange('cli_path', e.target.value)}
                placeholder="/usr/local/bin/claude"
              />
              <p className="text-xs text-white/40 mt-1">Path to Claude Code CLI executable</p>
            </div>

            {commonFields}

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Context Window
              </label>
              <FormInput
                type="number"
                value={formData.config.context_window ?? 200000}
                onChange={e => handleConfigChange('context_window', parseInt(e.target.value))}
              />
            </div>
          </>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={dialogKey} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Adapter' : 'Edit Adapter'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <FormInput
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Adapter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Description</label>
            <FormTextarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Type <span className="text-red-400">*</span>
            </label>
            <FormSelect
              value={formData.type}
              onChange={e => {
                const newType = e.target.value as AdapterType
                setFormData(prev => ({
                  ...prev,
                  type: newType,
                  config: {
                    ...prev.config,
                    model: getDefaultModel(newType),
                  }
                }))
              }}
              disabled={mode === 'edit'}
            >
              <option value="anthropic-api">Anthropic API</option>
              <option value="openai-api">OpenAI API</option>
              <option value="claude-code-cli">Claude Code CLI</option>
            </FormSelect>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Scope <span className="text-red-400">*</span>
            </label>
            <FormSelect
              value={formData.scope}
              onChange={e => setFormData(prev => ({
                ...prev,
                scope: e.target.value as AdapterScope
              }))}
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
            </FormSelect>
          </div>

          {renderConfigFields(formData.type)}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
