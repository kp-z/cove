#!/usr/bin/env tsx
/**
 * Migration Script: Convert Agent Runtime Configs to Adapter System
 *
 * This script migrates existing agents from inline runtime configuration
 * to the new Adapter configuration system.
 *
 * What it does:
 * 1. Scans all agents in .cove/agents/
 * 2. For each agent with old-style config (provider, model_name, api, etc.)
 * 3. Creates a private AdapterConfig
 * 4. Updates the agent's runtime.yaml to use adapter_id
 * 5. Keeps old fields for rollback safety (marked as deprecated)
 *
 * Usage:
 *   npm run migrate:adapters [--dry-run] [--agent-id <id>]
 *
 * Options:
 *   --dry-run: Preview changes without writing files
 *   --agent-id: Migrate only a specific agent
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

interface OldRuntimeConfig {
  provider?: string;
  model_name?: string;
  model?: {
    provider?: string;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
  };
  api?: {
    base_url?: string;
    api_key?: string;
  };
  cli?: {
    path?: string;
    working_dir?: string;
  };
  temperature?: number;
  max_tokens?: number;
  context?: {
    max_context_tokens?: number;
  };
  retry?: {
    max_retries?: number;
    initial_delay_ms?: number;
  };
  adapter_id?: string; // New field
}

interface AdapterConfig {
  id: string;
  name: string;
  description?: string;
  type: 'anthropic-api' | 'openai-api' | 'claude-code-cli';
  scope: 'private';
  owner_id?: string;
  created_at: Date;
  updated_at: Date;
  config: any;
}

interface MigrationResult {
  agentId: string;
  agentPath: string;
  status: 'migrated' | 'skipped' | 'error';
  reason?: string;
  adapterId?: string;
  adapterPath?: string;
}

class AgentAdapterMigration {
  private coveDir: string;
  private dryRun: boolean;
  private results: MigrationResult[] = [];

  constructor(coveDir: string, dryRun: boolean = false) {
    this.coveDir = coveDir;
    this.dryRun = dryRun;
  }

  async migrate(specificAgentId?: string): Promise<void> {
    console.log('🚀 Starting Agent to Adapter migration...');
    console.log(`📁 Cove directory: ${this.coveDir}`);
    console.log(`🔍 Dry run: ${this.dryRun ? 'YES' : 'NO'}\n`);

    const agentsDir = path.join(this.coveDir, 'agents');

    try {
      const agentDirs = await fs.readdir(agentsDir);

      for (const agentId of agentDirs) {
        if (agentId.startsWith('.')) continue;
        if (specificAgentId && agentId !== specificAgentId) continue;

        await this.migrateAgent(agentId);
      }

      this.printSummary();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async migrateAgent(agentId: string): Promise<void> {
    const agentPath = path.join(this.coveDir, 'agents', agentId);
    const runtimePath = path.join(agentPath, 'runtime.yaml');

    console.log(`\n📦 Processing agent: ${agentId}`);

    try {
      // Check if runtime.yaml exists
      try {
        await fs.access(runtimePath);
      } catch {
        this.results.push({
          agentId,
          agentPath,
          status: 'skipped',
          reason: 'No runtime.yaml found',
        });
        console.log('  ⏭️  Skipped: No runtime.yaml found');
        return;
      }

      // Read runtime config
      const runtimeContent = await fs.readFile(runtimePath, 'utf-8');
      const runtimeConfig = yaml.load(runtimeContent) as OldRuntimeConfig;

      // Check if already migrated
      if (runtimeConfig.adapter_id) {
        this.results.push({
          agentId,
          agentPath,
          status: 'skipped',
          reason: 'Already migrated (has adapter_id)',
          adapterId: runtimeConfig.adapter_id,
        });
        console.log(`  ✅ Already migrated (adapter_id: ${runtimeConfig.adapter_id})`);
        return;
      }

      // Check if has old-style config (support both flat and nested structure)
      const provider = runtimeConfig.provider || runtimeConfig.model?.provider;
      const modelName = runtimeConfig.model_name || runtimeConfig.model?.model_name;

      if (!provider && !modelName) {
        this.results.push({
          agentId,
          agentPath,
          status: 'skipped',
          reason: 'No provider or model_name found',
        });
        console.log('  ⏭️  Skipped: No provider or model_name found');
        return;
      }

      // Create adapter config
      const adapterConfig = this.createAdapterConfig(agentId, runtimeConfig);
      const adapterPath = path.join(
        this.coveDir,
        'adapters',
        'private',
        `${adapterConfig.id}.yaml`
      );

      console.log(`  🔧 Creating adapter: ${adapterConfig.name}`);
      console.log(`     Type: ${adapterConfig.type}`);
      console.log(`     ID: ${adapterConfig.id}`);

      if (!this.dryRun) {
        // Ensure adapters directory exists
        await fs.mkdir(path.join(this.coveDir, 'adapters', 'private'), { recursive: true });

        // Write adapter config
        const adapterYaml = yaml.dump(adapterConfig, { indent: 2 });
        await fs.writeFile(adapterPath, adapterYaml, 'utf-8');
        console.log(`  ✅ Adapter saved: ${adapterPath}`);

        // Update runtime.yaml
        const updatedRuntime = {
          ...runtimeConfig,
          adapter_id: adapterConfig.id,
        };
        const updatedYaml = yaml.dump(updatedRuntime, { indent: 2 });
        await fs.writeFile(runtimePath, updatedYaml, 'utf-8');
        console.log(`  ✅ Runtime updated with adapter_id`);
      } else {
        console.log(`  🔍 [DRY RUN] Would save adapter to: ${adapterPath}`);
        console.log(`  🔍 [DRY RUN] Would update runtime.yaml with adapter_id`);
      }

      this.results.push({
        agentId,
        agentPath,
        status: 'migrated',
        adapterId: adapterConfig.id,
        adapterPath,
      });

    } catch (error) {
      console.error(`  ❌ Error migrating agent ${agentId}:`, error);
      this.results.push({
        agentId,
        agentPath,
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private createAdapterConfig(agentId: string, oldConfig: OldRuntimeConfig): AdapterConfig {
    const adapterId = uuidv4();
    const now = new Date();

    // Extract values from either flat or nested structure
    const provider = oldConfig.provider || oldConfig.model?.provider;
    const modelName = oldConfig.model_name || oldConfig.model?.model_name;
    const temperature = oldConfig.temperature || oldConfig.model?.temperature;
    const maxTokens = oldConfig.max_tokens || oldConfig.model?.max_tokens;

    // Determine adapter type
    let type: 'anthropic-api' | 'openai-api' | 'claude-code-cli';
    let config: any;

    if (provider === 'claude-code-cli' || oldConfig.cli) {
      type = 'claude-code-cli';
      config = {
        cli_path: oldConfig.cli?.path,
        model: modelName,
        context_window: oldConfig.context?.max_context_tokens,
        retry: oldConfig.retry,
      };
    } else if (provider === 'openai') {
      type = 'openai-api';
      config = {
        api_key_ref: oldConfig.api?.api_key ? `env:OPENAI_API_KEY` : undefined,
        model: modelName || 'gpt-4o',
        base_url: oldConfig.api?.base_url,
        temperature: temperature,
        max_tokens: maxTokens,
        context: oldConfig.context,
        retry: oldConfig.retry,
      };
    } else {
      // Default to anthropic
      type = 'anthropic-api';
      config = {
        api_key_ref: oldConfig.api?.api_key ? `env:ANTHROPIC_API_KEY` : undefined,
        model: modelName || 'claude-sonnet-4-20250514',
        base_url: oldConfig.api?.base_url,
        temperature: temperature,
        max_tokens: maxTokens,
        context: oldConfig.context,
        retry: oldConfig.retry,
      };
    }

    return {
      id: adapterId,
      name: `${agentId}-adapter`,
      description: `Migrated adapter for agent ${agentId}`,
      type,
      scope: 'private',
      owner_id: agentId,
      created_at: now,
      updated_at: now,
      config,
    };
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));

    const migrated = this.results.filter(r => r.status === 'migrated');
    const skipped = this.results.filter(r => r.status === 'skipped');
    const errors = this.results.filter(r => r.status === 'error');

    console.log(`✅ Migrated: ${migrated.length}`);
    console.log(`⏭️  Skipped:  ${skipped.length}`);
    console.log(`❌ Errors:   ${errors.length}`);
    console.log(`📦 Total:    ${this.results.length}\n`);

    if (migrated.length > 0) {
      console.log('Migrated agents:');
      migrated.forEach(r => {
        console.log(`  - ${r.agentId} → ${r.adapterId}`);
      });
      console.log();
    }

    if (skipped.length > 0) {
      console.log('Skipped agents:');
      skipped.forEach(r => {
        console.log(`  - ${r.agentId}: ${r.reason}`);
      });
      console.log();
    }

    if (errors.length > 0) {
      console.log('Errors:');
      errors.forEach(r => {
        console.log(`  - ${r.agentId}: ${r.reason}`);
      });
      console.log();
    }

    if (this.dryRun) {
      console.log('🔍 This was a DRY RUN. No files were modified.');
      console.log('   Run without --dry-run to apply changes.\n');
    } else {
      console.log('✅ Migration complete!\n');
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const agentIdIndex = args.indexOf('--agent-id');
  const agentId = agentIdIndex >= 0 ? args[agentIdIndex + 1] : undefined;

  const projectRoot = path.resolve(process.cwd(), '../..');
  const coveDir = path.join(projectRoot, '.cove');

  const migration = new AgentAdapterMigration(coveDir, dryRun);
  await migration.migrate(agentId);
}

// Run if this is the main module
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { AgentAdapterMigration };
