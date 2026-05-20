"use strict";
/**
 * Adapter Metadata Service
 *
 * Provides metadata about available adapter types including
 * configuration schemas and default models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterMetadataService = void 0;
class AdapterMetadataService {
    /**
     * Get all available adapter types with their metadata
     */
    getAdapterTypes() {
        return [
            {
                type: 'anthropic-api',
                displayName: 'Anthropic API',
                description: 'Claude models via Anthropic API',
                supportsModelDiscovery: true,
                configSchema: {
                    fields: [
                        {
                            name: 'model',
                            type: 'select',
                            label: 'Model',
                            hint: 'Select Claude model',
                            required: true,
                            defaultValue: 'claude-3-5-sonnet-20241022',
                        },
                        {
                            name: 'api_key',
                            type: 'password',
                            label: 'API Key',
                            hint: 'Leave empty to use environment variable',
                            required: false,
                            validation: { min: 20 },
                        },
                        {
                            name: 'base_url',
                            type: 'string',
                            label: 'Base URL',
                            hint: 'Optional custom API endpoint',
                            required: false,
                            defaultValue: 'https://api.anthropic.com',
                        },
                        {
                            name: 'temperature',
                            type: 'number',
                            label: 'Temperature',
                            hint: '0.0 - 1.0',
                            required: false,
                            defaultValue: 0.7,
                            validation: { min: 0, max: 1, step: 0.1 },
                        },
                        {
                            name: 'max_tokens',
                            type: 'number',
                            label: 'Max Tokens',
                            hint: 'Maximum response length',
                            required: false,
                            defaultValue: 4096,
                            validation: { min: 1 },
                        },
                    ],
                },
            },
            {
                type: 'openai-api',
                displayName: 'OpenAI API',
                description: 'GPT models via OpenAI API',
                supportsModelDiscovery: true,
                configSchema: {
                    fields: [
                        {
                            name: 'model',
                            type: 'select',
                            label: 'Model',
                            hint: 'Select GPT model',
                            required: true,
                            defaultValue: 'gpt-4-turbo',
                        },
                        {
                            name: 'api_key',
                            type: 'password',
                            label: 'API Key',
                            hint: 'Leave empty to use environment variable',
                            required: false,
                            validation: { min: 20 },
                        },
                        {
                            name: 'base_url',
                            type: 'string',
                            label: 'Base URL',
                            hint: 'Optional custom API endpoint (e.g., Azure OpenAI)',
                            required: false,
                            defaultValue: 'https://api.openai.com/v1',
                        },
                        {
                            name: 'temperature',
                            type: 'number',
                            label: 'Temperature',
                            hint: '0.0 - 2.0',
                            required: false,
                            defaultValue: 0.7,
                            validation: { min: 0, max: 2, step: 0.1 },
                        },
                        {
                            name: 'max_tokens',
                            type: 'number',
                            label: 'Max Tokens',
                            hint: 'Maximum response length',
                            required: false,
                            defaultValue: 4096,
                            validation: { min: 1 },
                        },
                    ],
                },
            },
            {
                type: 'claude-code-cli',
                displayName: 'Claude Code CLI',
                description: 'Claude via local CLI',
                supportsModelDiscovery: false,
                configSchema: {
                    fields: [
                        {
                            name: 'cli_path',
                            type: 'string',
                            label: 'CLI Path',
                            hint: 'Path to Claude Code CLI executable',
                            required: false,
                            defaultValue: '/usr/local/bin/claude',
                        },
                        {
                            name: 'model',
                            type: 'string',
                            label: 'Model',
                            hint: 'Optional model override',
                            required: false,
                            defaultValue: 'claude-3-5-sonnet-20241022',
                        },
                        {
                            name: 'context_window',
                            type: 'number',
                            label: 'Context Window',
                            hint: 'Maximum context tokens',
                            required: false,
                            defaultValue: 200000,
                            validation: { min: 1000 },
                        },
                    ],
                },
            },
        ];
    }
    /**
     * Get metadata for a specific adapter type
     */
    getAdapterType(type) {
        return this.getAdapterTypes().find(t => t.type === type) || null;
    }
}
exports.AdapterMetadataService = AdapterMetadataService;
