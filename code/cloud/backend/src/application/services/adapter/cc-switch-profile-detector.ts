/**
 * CC-Switch Profile Detector
 *
 * Detects Claude Code CLI profiles from CC-Switch database.
 * CC-Switch stores multiple provider configurations in ~/.cc-switch/cc-switch.db
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { IAdapterDetector, DetectionResult } from './adapter-bootstrap.interface';

const execAsync = promisify(exec);

export interface CCSwithProfile {
  id: string;
  name: string;
  app_type: string;
  settings_config: {
    env: {
      ANTHROPIC_AUTH_TOKEN?: string;
      ANTHROPIC_BASE_URL?: string;
      ANTHROPIC_MODEL?: string;
      ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
      ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
      ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
    };
  };
  is_current: boolean;
}

export class CCSwithProfileDetector implements IAdapterDetector {
  readonly type = 'claude-code-cli' as const;

  private readonly dbPath: string;

  constructor() {
    this.dbPath = join(homedir(), '.cc-switch', 'cc-switch.db');
  }

  async detect(): Promise<DetectionResult> {
    try {
      // 1. Check if CC-Switch database exists
      if (!existsSync(this.dbPath)) {
        return {
          available: false,
          reason: 'CC-Switch database not found',
        };
      }

      // 2. Check if sqlite3 command is available
      try {
        await execAsync('which sqlite3');
      } catch {
        return {
          available: false,
          reason: 'sqlite3 command not found (required to read CC-Switch database)',
        };
      }

      // 3. Query all Claude providers from database
      const profiles = await this.queryProfiles();

      if (profiles.length === 0) {
        return {
          available: false,
          reason: 'No Claude providers found in CC-Switch database',
        };
      }

      return {
        available: true,
        version: 'cc-switch',
        path: this.dbPath,
        metadata: {
          detectedAt: new Date().toISOString(),
          platform: process.platform,
          profileCount: profiles.length,
          profiles: profiles.map((p) => ({
            id: p.id,
            name: p.name,
            is_current: p.is_current,
            base_url: p.settings_config.env.ANTHROPIC_BASE_URL,
            model: p.settings_config.env.ANTHROPIC_MODEL,
          })),
        },
      };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : 'Detection failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Query all Claude providers from CC-Switch database
   */
  private async queryProfiles(): Promise<CCSwithProfile[]> {
    const query = `
      SELECT id, name, app_type, settings_config, is_current
      FROM providers
      WHERE app_type = 'claude'
      ORDER BY sort_index, created_at;
    `;

    const { stdout } = await execAsync(
      `sqlite3 "${this.dbPath}" "${query.replace(/\n/g, ' ')}"`
    );

    if (!stdout.trim()) {
      return [];
    }

    const lines = stdout.trim().split('\n');
    const profiles: CCSwithProfile[] = [];

    for (const line of lines) {
      try {
        // SQLite output format: id|name|app_type|settings_config|is_current
        const parts = line.split('|');
        if (parts.length < 5) continue;

        const id = parts[0];
        const name = parts[1];
        const app_type = parts[2];
        const settings_config_str = parts[3];
        const is_current_str = parts[4];

        if (!id || !name || !app_type || !settings_config_str) continue;

        const settings_config = JSON.parse(settings_config_str);
        const is_current = is_current_str === '1';

        profiles.push({
          id,
          name,
          app_type,
          settings_config,
          is_current,
        });
      } catch (error) {
        // Skip invalid lines
        continue;
      }
    }

    return profiles;
  }

  /**
   * Get all profiles (public method for generator to use)
   */
  async getProfiles(): Promise<CCSwithProfile[]> {
    if (!existsSync(this.dbPath)) {
      return [];
    }

    return this.queryProfiles();
  }
}
