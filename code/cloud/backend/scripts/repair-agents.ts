#!/usr/bin/env tsx
/**
 * Agent Repair Tool
 *
 * Audits and repairs agent consistency issues (missing or corrupted agent.md files).
 *
 * Usage:
 *   npm run repair:agents -- --dry-run              # Audit only
 *   npm run repair:agents                           # Repair all issues
 *   npm run repair:agents -- --agent-id=agent-123   # Repair specific agent
 *   npm run repair:agents -- --realm-id=realm-456   # Repair agents in specific realm
 */

import { PrismaClient } from '@prisma/client';
import { HybridAgentRepository } from '../src/infrastructure/repositories/hybrid-agent.repository';
import { StorageService } from '../src/infrastructure/storage/storage.service';
import { ConsoleLogger } from '../src/infrastructure/logging/console-logger';
import * as path from 'path';
import * as os from 'os';

interface CliArgs {
  dryRun: boolean;
  agentId?: string;
  realmId?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    agentId: args.find(arg => arg.startsWith('--agent-id='))?.split('=')[1],
    realmId: args.find(arg => arg.startsWith('--realm-id='))?.split('=')[1],
  };
}

async function main() {
  const args = parseArgs();

  console.log('🔍 Agent Repair Tool\n');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN (audit only)' : 'REPAIR'}`);
  if (args.agentId) {
    console.log(`Filter: agent-id=${args.agentId}`);
  }
  if (args.realmId) {
    console.log(`Filter: realm-id=${args.realmId}`);
  }
  console.log('');

  // Initialize dependencies
  const prisma = new PrismaClient();
  const coveRoot = path.join(os.homedir(), '.cove');
  const storageService = new StorageService(coveRoot);
  const logger = new ConsoleLogger();
  const agentRepository = new HybridAgentRepository(
    prisma,
    storageService,
    logger,
    coveRoot
  );

  try {
    console.log('🔍 Scanning agents...\n');

    // Get all agents matching filters
    const agents = await prisma.agent.findMany({
      where: {
        ...(args.agentId && { id: args.agentId }),
        ...(args.realmId && { realmId: args.realmId }),
      },
    });

    if (agents.length === 0) {
      console.log('No agents found matching filters.');
      return;
    }

    let issuesFound = 0;
    let repaired = 0;

    for (const agent of agents) {
      const validation = await agentRepository['validateEntityConsistency'](
        agent.id,
        agent.realmId
      );

      if (!validation.valid) {
        issuesFound++;
        console.log(`❌ ${agent.displayName} (${agent.name})`);
        console.log(`   ID: ${agent.id}`);
        validation.issues.forEach(issue => console.log(`   - ${issue}`));

        if (!args.dryRun) {
          try {
            await agentRepository['repairEntityFiles'](agent.id, agent.realmId);
            console.log(`   ✅ Repaired`);
            repaired++;
          } catch (error: any) {
            console.log(`   ❌ Repair failed: ${error.message}`);
          }
        }
        console.log('');
      }
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total agents: ${agents.length}`);
    console.log(`   Issues found: ${issuesFound}`);
    if (!args.dryRun) {
      console.log(`   Repaired: ${repaired}`);
      console.log(`   Failed: ${issuesFound - repaired}`);
    } else {
      console.log('\n💡 Run without --dry-run to repair issues');
    }

    if (issuesFound === 0) {
      console.log('\n✅ All agents are healthy!');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
