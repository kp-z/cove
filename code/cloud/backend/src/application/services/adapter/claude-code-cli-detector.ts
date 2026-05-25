/**
 * Claude Code CLI Detector
 *
 * Detects if Claude Code CLI is available in the local environment.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { IAdapterDetector, DetectionResult } from './adapter-bootstrap.interface';

const execAsync = promisify(exec);

export class ClaudeCodeCLIDetector implements IAdapterDetector {
  readonly type = 'claude-code-cli' as const;

  async detect(): Promise<DetectionResult> {
    try {
      // 1. Check if 'claude' command exists
      const { stdout: whichOutput } = await execAsync('which claude');
      const cliPath = whichOutput.trim();

      if (!cliPath) {
        return {
          available: false,
          reason: 'Claude Code CLI not found in PATH',
        };
      }

      // 2. Check version
      let version: string | undefined;
      try {
        const { stdout: versionOutput } = await execAsync('claude --version');
        version = versionOutput.trim();
      } catch (error) {
        // Version check failed, but CLI exists
        version = 'unknown';
      }

      return {
        available: true,
        version,
        path: cliPath,
        metadata: {
          detectedAt: new Date().toISOString(),
          platform: process.platform,
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
}
