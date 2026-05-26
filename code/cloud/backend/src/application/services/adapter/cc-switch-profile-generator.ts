/**
 * CC-Switch Profile Generator
 *
 * Generates adapter configurations for each CC-Switch profile.
 */

import {
  IAdapterGenerator,
  DetectionResult,
  GenerationContext,
  AdapterConfigDraft,
} from './adapter-bootstrap.interface';
import { CCSwithProfile, CCSwithProfileDetector } from './cc-switch-profile-detector';

export class CCSwithProfileGenerator implements IAdapterGenerator {
  readonly type = 'claude-code-cli' as const;

  constructor(private readonly detector: CCSwithProfileDetector) {}

  async generate(
    _detection: DetectionResult,
    context: GenerationContext
  ): Promise<AdapterConfigDraft[]> {
    // Get all profiles from CC-Switch database
    const profiles = await this.detector.getProfiles();

    if (profiles.length === 0) {
      throw new Error('No CC-Switch profiles found');
    }

    // Generate an adapter for each profile
    const drafts: AdapterConfigDraft[] = [];

    for (const profile of profiles) {
      const draft = this.generateAdapterForProfile(profile, context);
      drafts.push(draft);
    }

    return drafts;
  }

  /**
   * Generate adapter configuration for a single profile
   */
  private generateAdapterForProfile(
    profile: CCSwithProfile,
    context: GenerationContext
  ): AdapterConfigDraft {
    const env = profile.settings_config.env;

    // Extract model preference (use ANTHROPIC_MODEL or default to sonnet)
    const defaultModel = this.extractModelName(
      env.ANTHROPIC_MODEL || env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'claude-sonnet-4-6'
    );

    return {
      name: `${profile.name} (CC-Switch)`,
      description: `Auto-generated from CC-Switch profile "${profile.name}"${
        profile.is_current ? ' (currently active)' : ''
      }`,
      type: 'claude-code-cli',
      scope: 'private',
      owner_id: context.userId,
      config: {
        cli_path: 'claude',
        model: defaultModel,
        timeout_ms: 120000,
        enable_thinking: true,
        enable_streaming: true,
        retry: {
          max_retries: 3,
          initial_delay_ms: 1000,
        },
        // Store CC-Switch specific config
        cc_switch: {
          profile_id: profile.id,
          profile_name: profile.name,
          is_current: profile.is_current,
        },
        // Store environment variables for this profile
        env: {
          ANTHROPIC_AUTH_TOKEN: env.ANTHROPIC_AUTH_TOKEN,
          ANTHROPIC_BASE_URL: env.ANTHROPIC_BASE_URL,
          ANTHROPIC_MODEL: env.ANTHROPIC_MODEL,
        },
      },
    };
  }

  /**
   * Extract simple model name from full model identifier
   * e.g., "claude-opus-4-6" -> "opus"
   */
  private extractModelName(fullModel: string): string {
    const lower = fullModel.toLowerCase();

    if (lower.includes('opus')) return 'opus';
    if (lower.includes('sonnet')) return 'sonnet';
    if (lower.includes('haiku')) return 'haiku';

    // Default to sonnet if unknown
    return 'sonnet';
  }
}
