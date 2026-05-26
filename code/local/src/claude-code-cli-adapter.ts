/**
 * Claude Code CLI Adapter Configuration
 */

export interface ClaudeCodeCLIConfig {
  baseUrl: string;
  apiKey: string;
}

export function loadClaudeCodeCLIConfig(): ClaudeCodeCLIConfig | null {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}

export function isClaudeCodeCLIAvailable(): boolean {
  return loadClaudeCodeCLIConfig() !== null;
}
