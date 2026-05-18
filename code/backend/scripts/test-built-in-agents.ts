#!/usr/bin/env tsx
/**
 * Test script for built-in agents initialization
 *
 * This script tests the automatic creation of built-in agents
 * during database initialization.
 */

import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import { BuiltInAgentsInitializer } from '../src/infrastructure/database/built-in-agents-initializer';
import { ConsoleLogger } from '../src/infrastructure/logging/console-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const logger = new ConsoleLogger();

async function main() {
  console.log('🧪 Testing Built-in Agents Initialization\n');

  try {
    const storageRoot = path.resolve(__dirname, '../../.cove');

    const initializer = new BuiltInAgentsInitializer({
      prisma,
      logger,
      storageRoot,
    });

    // Check if initialization is needed
    const needsInit = await initializer.needsInitialization();
    console.log(`📊 Needs initialization: ${needsInit}\n`);

    // Initialize built-in agents
    console.log('🚀 Initializing built-in agents...\n');
    await initializer.initialize();

    // Verify agents were created
    console.log('\n✅ Verification:\n');
    const agents = await prisma.agent.findMany({
      where: { scope: 'built-in' },
    });

    console.log(`Found ${agents.length} built-in agent(s):\n`);
    for (const agent of agents) {
      console.log(`  - ${agent.displayName} (${agent.name})`);
      console.log(`    ID: ${agent.id}`);
      console.log(`    Scope: ${agent.scope}`);
      console.log(`    Status: ${agent.status}`);
      console.log(`    Created by: ${agent.createdBy}`);
      console.log('');
    }

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
