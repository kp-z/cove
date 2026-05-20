#!/usr/bin/env tsx
/**
 * Migration Script: Convert Storage Agent JSON to Directory Structure with Adapters
 *
 * This script migrates agents from the old JSON file format in .cove/storage/agents/
 * to the new directory structure with separate YAML files and adapter configurations.
 *
 * What it does:
 * 1. Scans all JSON files in .cove/storage/agents/
 * 2. For each agent JSON file:
 *    - Creates a directory structure: .cove/storage/agents/{agentId}/
 *    - Extracts runtimeConfig and creates an AdapterConfig
 *    - Writes runtime.yaml with adapter_id
 *    - Writes persona.yaml if persona data exists
 *    - Keeps the original JSON file for rollback safety
 * 3. Creates adapter configurations in .cove/adapters/private/
 *
 * Usage:
 *   npm run migrate:storage-agents [--dry-run] [--agent-id <id>]
 *
 * Options:
 *   --dry-run: Preview changes without writing files
 *   --agent-id: Migrate only a specific agent
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

interface OldAgentJSON {
  description?: string;
  capabilities?: string[];
  tags?: string[];
  runtimeConfig?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    provider?: string;
    api?: {
      base_url?: string;
      api_key?: string;
    };
    context?: {
      max_context_tokens?: number;
    };
    retry?: {
      max_retries?: number;
      initial_delay_ms?: number;
    };
  };
  persona?: {
    name?: string;
    role?: string;
    title?: string;
    description?: string;
  };
  createdBy?: string;
}

interface AdapterConfig {
  id: string;
  name: string;
  description?: string;
  type: 'anthropic-api' | 'openai-api' | 'claude-code-cli';
  scope: 'private';
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  config: any;
}

interface RuntimeConfig {
  adapter_id: string;
  model?: string;
  context?: {
    max_context_tokens?: number;
  };
  retry?: {
    max_retries?: number;
    initial_delay_ms?: number;
  };
}

interface PersonaConfig {
  name: string;
  title?: string;
  description?: string;
  language_style?: {
    formality?: string;
    verbosity?: string;
    preferred_language?: string;
  };
  behavior?: {
    proactive?: boolean;
    ask_before_action?: boolean;
  };
}

interface MigrationResult {
  agentId: string;
  status: 'migrated' | 'skipped' | 'error';
  reason?: string;
  adapterId?: string;
  adapterPath?: string;
}

class StorageAgentMigration {
  private coveDir: string;
  private dryRun: boolean;
  private results: MigrationResult[] = [];

  constructor(coveDir: string, dryRun: boolean = false) {
    this.coveDir = coveDir;
    this.dryRun = dryRun;
  }

  async migrate(specificAgentId?: string): Promise<void> {
    console.log('🚀 Starting Storage Agent migration...');
    console.log(`📁 Cove directory: ${this.coveDir}`);
    console.log(`🔍 Dry run: ${this.dryRun ? 'YES' : 'NO'}\n`);

    const storageAgentsDir = path.join(this.coveDir, 'storage', 'agents');

    try {
      const entries = await fs.readdir(storageAgentsDir);

      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        if (!entry.endsWith('.json')) continue;

        const agentId = entry.replace('.json', '');
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
    const jsonPath = path.join(this.coveDir, 'storage', 'agents', `${agentId}.json`);
    const agentDir = path.join(this.coveDir, 'storage', 'agents', agentId);

    console.log(`\n📦 Processing agent: ${agentId}`);

    try {
      // Check if already migrated (directory exists with runtime.yaml)
      try {
        const runtimePath = path.join(agentDir, 'runtime.yaml');
        await fs.access(runtimePath);

        // Check if it has adapter_id
        const runtimeContent = await fs.readFile(runtimePath, 'utf-8');
        const runtime = yaml.load(runtimeContent) as any;

        if (runtime.adapter_id) {
          this.results.push({
            agentId,
            status: 'skipped',
            reason: 'Already migrated (has runtime.yaml with adapter_id)',
            adapterId: runtime.adapter_id,
          });
          console.log(`  ✅ Already migrated (adapter_id: ${runtime.adapter_id})`);
          return;
        }
      } catch {
        // Directory or runtime.yaml doesn't exist, proceed with migration
      }

      // Read old JSON file
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const oldAgent: OldAgentJSON = JSON.parse(jsonContent);

      // Check if has runtime config
      if (!oldAgent.runtimeConfig || !oldAgent.runtimeConfig.model) {
        this.results.push({
          agentId,
          status: 'skipped',
          reason: 'No runtimeConfig.model found in JSON',
        });
        console.log('  ⏭️  Skipped: No runtimeConfig.model found');
        return;
      }

      // Determine owner
      const ownerId = oldAgent.createdBy || agentId;

      // Create adapter config
      const adapterConfig = this.createAdapterConfig(agentId, oldAgent.runtimeConfig, ownerId);
      const adapterPath = path.join(
        this.coveDir,
        'adapters',
        'private',
        `${adapterConfig.id}.yaml`
      );

      console.log(`  🔧 Creating adapter: ${adapterConfig.name}`);
      console.log(`     Type: ${adapterConfig.type}`);
      console.log(`     ID: ${adapterConfig.id}`);
      console.log(`     Owner: ${ownerId}`);

      // Create runtime config
      const runtimeConfig: RuntimeConfig = {
        adapter_id: adapterConfig.id,
        model: oldAgent.runtimeConfig.model,
      };

      if (oldAgent.runtimeConfig.context) {
        runtimeConfig.context = oldAgent.runtimeConfig.context;
      }

      if (oldAgent.runtimeConfig.retry) {
        runtimeConfig.retry = oldAgent.runtimeConfig.retry;
      }

      // Create persona config if exists
      let personaConfig: PersonaConfig | null = null;
      if (oldAgent.persona) {
        personaConfig = {
          name: oldAgent.persona.name || 'Agent',
          title: oldAgent.persona.title || oldAgent.persona.role || 'AI Assistant',
          description: oldAgent.persona.description || oldAgent.description || 'Cove agent',
          language_style: {
            formality: 'professional',
            verbosity: 'concise',
            preferred_language: 'zh-CN',
          },
          behavior: {
            proactive: false,
            ask_before_action: true,
          },
        };
      }

      if (!this.dryRun) {
        // Create agent directory
        await fs.mkdir(agentDir, { recursive: true });
        console.log(`  ✅ Created directory: ${agentDir}`);

        // Write adapter config
        await fs.mkdir(path.join(this.coveDir, 'adapters', 'private'), { recursive: true });
        const adapterYaml = yaml.dump(adapterConfig, { indent: 2 });
        await fs.writeFile(adapterPath, adapterYaml, 'utf-8');
        console.log(`  ✅ Adapter saved: ${adapterPath}`);

        // Write runtime.yaml
        const runtimeYaml = yaml.dump(runtimeConfig, { indent: 2 });
        await fs.writeFile(path.join(agentDir, 'runtime.yaml'), runtimeYaml, 'utf-8');
        console.log(`  ✅ Runtime saved: ${agentDir}/runtime.yaml`);

        // Write persona.yaml if exists
        if (personaConfig) {
          const personaYaml = yaml.dump(personaConfig, { indent: 2 });
          await fs.writeFile(path.join(agentDir, 'persona.yaml'), personaYaml, 'utf-8');
          console.log(`  ✅ Persona saved: ${agentDir}/persona.yaml`);
        }

        console.log(`  ℹ️  Original JSON kept for rollback: ${jsonPath}`);
      } else {
        console.log(`  🔍 [DRY RUN] Would create directory: ${agentDir}`);
        console.log(`  🔍 [DRY RUN] Would save adapter to: ${adapterPath}`);
        console.log(`  🔍 [DRY RUN] Would save runtime.yaml`);
        if (personaConfig) {
          console.log(`  🔍 [DRY RUN] Would save persona.yaml`);
        }
      }

      this.results.push({
        agentId,
        status: 'migrated',
        adapterId: adapterConfig.id,
        adapterPath,
      });

    } catch (error) {
      console.error(`  ❌ Error migrating agent ${agentId}:`, error);
      this.results.push({
        agentId,
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private createAdapterConfig(
    agentId: string,
    runtimeConfig: OldAgentJSON['runtimeConfig'],
    ownerId: string
  ): AdapterConfig {
    const adapterId = uuidv4();
    const now = new Date();

    const model = runtimeConfig!.model!;
    const provider = runtimeConfig!.provider;
    const temperature = runtimeConfig!.temperature;
    const maxTokens = runtimeConfig!.max_tokens;

    // Determine adapter type based on model name or provider
    let type: 'anthropic-api' | 'openai-api' | 'claude-code-cli';
    let config: any;

    if (model.startsWith('claude') || provider === 'anthropic') {
      type = 'anthropic-api';
      config = {
        api_key_ref: 'env:ANTHROPIC_API_KEY',
        model: model,
        base_url: runtimeConfig!.api?.base_url,
        temperature: temperature,
        max_tokens: maxTokens,
        context: runtimeConfig!.context,
        retry: runtimeConfig!.retry,
      };
    } else if (model.startsWith('gpt') || provider === 'openai') {
      type = 'openai-api';
      config = {
        api_key_ref: 'env:OPENAI_API_KEY',
        model: model,
        base_url: runtimeConfig!.api?.base_url,
        temperature: temperature,
        max_tokens: maxTokens,
        context: runtimeConfig!.context,
        retry: runtimeConfig!.retry,
      };
    } else {
      // Default to anthropic
      type = 'anthropic-api';
      config = {
        api_key_ref: 'env:ANTHROPIC_API_KEY',
        model: model,
        base_url: runtimeConfig!.api?.base_url,
        temperature: temperature,
        max_tokens: maxTokens,
        context: runtimeConfig!.context,
        retry: runtimeConfig!.retry,
      };
    }

    return {
      id: adapterId,
      name: `${agentId}-adapter`,
      description: `Migrated adapter for agent ${agentId}`,
      type,
      scope: 'private',
      owner_id: ownerId,
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

  const migration = new StorageAgentMigration(coveDir, dryRun);
  await migration.migrate(agentId);
}

// Run if this is the main module
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { StorageAgentMigration };
