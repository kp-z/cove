/**
 * Claude Code CLI Generator
 *
 * Generates adapter configuration for Claude Code CLI.
 */

import {
  IAdapterGenerator,
  DetectionResult,
  GenerationContext,
  AdapterConfigDraft,
} from './adapter-bootstrap.interface';

export class ClaudeCodeCLIGenerator implements IAdapterGenerator {
  readonly type = 'claude-code-cli' as const;

  async generate(
    detection: DetectionResult,
    context: GenerationContext
  ): Promise<AdapterConfigDraft> {
    const deviceName = context.deviceName || context.deviceId;

    return {
      name: `Claude CLI (${deviceName})`,
      description: `Auto-generated Claude Code CLI adapter for device ${deviceName}${
        detection.version ? ` (v${detection.version})` : ''
      }`,
      type: 'claude-code-cli',
      scope: 'private',
      owner_id: context.userId,
      config: {
        cli_path: detection.path || 'claude',
        model: 'sonnet', // Default model
        timeout_ms: 120000, // 2 minutes
        enable_thinking: true,
        enable_streaming: true,
        retry: {
          max_retries: 3,
          initial_delay_ms: 1000,
        },
      },
    };
  }
}
