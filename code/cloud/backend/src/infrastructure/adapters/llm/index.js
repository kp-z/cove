"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeCLIAdapter = exports.OpenAIAdapter = exports.AnthropicAdapter = void 0;
exports.createLlmAdapter = createLlmAdapter;
var anthropic_adapter_1 = require("./anthropic-adapter");
Object.defineProperty(exports, "AnthropicAdapter", { enumerable: true, get: function () { return anthropic_adapter_1.AnthropicAdapter; } });
var openai_adapter_1 = require("./openai-adapter");
Object.defineProperty(exports, "OpenAIAdapter", { enumerable: true, get: function () { return openai_adapter_1.OpenAIAdapter; } });
var claude_code_cli_adapter_1 = require("./claude-code-cli-adapter");
Object.defineProperty(exports, "ClaudeCodeCLIAdapter", { enumerable: true, get: function () { return claude_code_cli_adapter_1.ClaudeCodeCLIAdapter; } });
const anthropic_adapter_2 = require("./anthropic-adapter");
const openai_adapter_2 = require("./openai-adapter");
const claude_code_cli_adapter_2 = require("./claude-code-cli-adapter");
function createLlmAdapter() {
    const provider = process.env.LLM_PROVIDER || 'anthropic';
    const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4096', 10);
    switch (provider) {
        case 'anthropic': {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey || apiKey.includes('your-key-here')) {
                throw new Error('ANTHROPIC_API_KEY is not configured. Set it in .env');
            }
            return new anthropic_adapter_2.AnthropicAdapter(apiKey, process.env.ANTHROPIC_MODEL, maxTokens);
        }
        case 'openai': {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey || apiKey.includes('your-key-here')) {
                throw new Error('OPENAI_API_KEY is not configured. Set it in .env');
            }
            return new openai_adapter_2.OpenAIAdapter(apiKey, process.env.OPENAI_MODEL, maxTokens);
        }
        case 'claude-code-cli': {
            const cliPath = process.env.CLAUDE_CLI_PATH || 'claude';
            const model = process.env.CLAUDE_CLI_MODEL;
            const workingDir = process.env.CLAUDE_CLI_WORKING_DIR;
            const timeout = process.env.CLAUDE_CLI_TIMEOUT
                ? parseInt(process.env.CLAUDE_CLI_TIMEOUT, 10)
                : undefined;
            return new claude_code_cli_adapter_2.ClaudeCodeCLIAdapter(cliPath, model, workingDir, timeout);
        }
        default:
            throw new Error(`Unknown LLM provider: ${provider}. Use "anthropic", "openai", or "claude-code-cli".`);
    }
}
