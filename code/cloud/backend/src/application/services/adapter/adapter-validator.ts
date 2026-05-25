/**
 * Adapter Validator
 *
 * Validates adapter configurations and checks for duplicates.
 */

import {
  IAdapterValidator,
  AdapterConfigDraft,
  ValidationResult,
  DuplicateCheckResult,
} from './adapter-bootstrap.interface';
import { AdapterService } from './adapter.service';

export class AdapterValidator implements IAdapterValidator {
  constructor(private readonly adapterService: AdapterService) {}

  async validate(draft: AdapterConfigDraft): Promise<ValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!draft.name || draft.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!draft.type) {
      errors.push('Type is required');
    }

    if (!draft.owner_id) {
      errors.push('Owner ID is required');
    }

    if (!draft.scope) {
      errors.push('Scope is required');
    }

    // Type-specific validation
    if (draft.type === 'claude-code-cli') {
      if (!draft.config.cli_path) {
        errors.push('CLI path is required for Claude Code CLI adapter');
      }
    }

    if (draft.type === 'anthropic-api') {
      if (!draft.config.api_key && !draft.config.api_key_ref && !draft.config.custom_headers) {
        errors.push('API key, API key reference, or custom headers required for Anthropic API adapter');
      }
    }

    if (draft.type === 'openai-api') {
      if (!draft.config.api_key && !draft.config.api_key_ref) {
        errors.push('API key or API key reference required for OpenAI API adapter');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async checkDuplicate(
    draft: AdapterConfigDraft,
    _realmId: string
  ): Promise<DuplicateCheckResult> {
    try {
      // Query existing adapters accessible to the owner
      const existing = await this.adapterService.list(draft.owner_id);

      // Filter by type and scope
      const sameTypeAndScope = existing.filter(
        (a) => a.type === draft.type && a.scope === draft.scope
      );

      // Check for duplicates based on type-specific criteria
      let duplicate;

      if (draft.type === 'claude-code-cli') {
        // Check if same CLI path exists
        duplicate = sameTypeAndScope.find(
          (a) => a.type === 'claude-code-cli' && a.config.cli_path === draft.config.cli_path
        );
      } else if (draft.type === 'anthropic-api') {
        // Check if same API key or base URL exists
        duplicate = sameTypeAndScope.find(
          (a) =>
            a.type === 'anthropic-api' &&
            (a.config.api_key === draft.config.api_key ||
              a.config.api_key_ref === draft.config.api_key_ref)
        );
      } else if (draft.type === 'openai-api') {
        // Check if same API key exists
        duplicate = sameTypeAndScope.find(
          (a) =>
            a.type === 'openai-api' &&
            (a.config.api_key === draft.config.api_key ||
              a.config.api_key_ref === draft.config.api_key_ref)
        );
      }

      return {
        exists: !!duplicate,
        existingId: duplicate?.id,
        existingConfig: duplicate,
      };
    } catch (error) {
      // If query fails, assume no duplicate (fail open)
      return {
        exists: false,
      };
    }
  }
}
