#!/usr/bin/env tsx
/**
 * Fix Nexus Realm Script
 *
 * 检查并修复 Nexus realm 的 built-in agents 和 channels 初始化问题
 *
 * Usage:
 *   npm run fix:nexus
 */

import { PrismaClient } from '@prisma/client';
import { BuiltInAgentsInitializer } from '../src/infrastructure/database/built-in-agents-initializer';
import { ILogger } from '../src/application/interfaces/logger.interface';
import * as path from 'path';
import * as os from 'os';

// Simple console logger implementation
class ConsoleLogger implements ILogger {
  debug(message: string): void {
    console.log(`[DEBUG] ${message}`);
  }
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }
  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }
  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error || '');
  }
}

async function main() {
  const prisma = new PrismaClient();
  const logger = new ConsoleLogger();
  const storageRoot = path.join(os.homedir(), '.cove');

  console.log('🔍 Checking Nexus realm...\n');

  try {
    // 检查 Nexus realm
    const nexusRealm = await prisma.realm.findFirst({
      where: { name: 'nexus' },
    });

    if (!nexusRealm) {
      console.log('❌ Nexus realm not found');
      console.log('💡 The Nexus realm should be created automatically on first startup');
      return;
    }

    console.log(`✅ Found Nexus realm: ${nexusRealm.id}`);
    console.log(`   Name: ${nexusRealm.name}`);
    console.log(`   Display Name: ${nexusRealm.displayName}`);
    console.log('');

    // 检查 agents
    const agents = await prisma.agent.findMany({
      where: { realmId: nexusRealm.id },
    });

    console.log(`📊 Current agents: ${agents.length}`);
    if (agents.length > 0) {
      agents.forEach(agent => {
        console.log(`   - ${agent.displayName} (${agent.name}) [${agent.scope}]`);
      });
    } else {
      console.log('   (no agents found)');
    }
    console.log('');

    if (agents.length === 0) {
      console.log('🔧 Initializing built-in agents...\n');

      const initializer = new BuiltInAgentsInitializer({
        prisma,
        logger,
        storageRoot,
      });

      await initializer.initialize();

      console.log('\n✅ Built-in agents initialized successfully');

      // 验证结果
      const updatedAgents = await prisma.agent.findMany({
        where: { realmId: nexusRealm.id },
      });

      console.log(`\n📊 Updated agents: ${updatedAgents.length}`);
      updatedAgents.forEach(agent => {
        console.log(`   - ${agent.displayName} (${agent.name}) [${agent.scope}]`);
      });
    } else {
      console.log('✅ Agents already exist, no action needed');
    }

    // 检查 channels
    console.log('\n🔍 Checking channels...\n');
    const channels = await prisma.channel.findMany({
      where: { realmId: nexusRealm.id },
    });

    console.log(`📊 Current channels: ${channels.length}`);
    if (channels.length > 0) {
      channels.forEach(channel => {
        console.log(`   - #${channel.name} (${channel.displayName}) [${channel.type}]`);
      });
      console.log('\n✅ Channels already exist, no action needed');
    } else {
      console.log('   (no channels found)');
      console.log('\n🔧 Creating default channels...\n');

      // 创建 #general channel
      await prisma.channel.create({
        data: {
          id: 'channel-nexus-general',
          realmId: nexusRealm.id,
          name: 'general',
          displayName: 'General',
          description: 'General discussion channel',
          type: 'public',
          status: 'active',
          createdById: 'system',
          createdByType: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('   ✅ Created #general channel');

      // 创建 #welcome channel
      await prisma.channel.create({
        data: {
          id: 'channel-nexus-welcome',
          realmId: nexusRealm.id,
          name: 'welcome',
          displayName: 'Welcome',
          description: 'Welcome new members',
          type: 'public',
          status: 'active',
          createdById: 'system',
          createdByType: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('   ✅ Created #welcome channel');

      console.log('\n✅ Default channels created successfully');

      // 验证结果
      const updatedChannels = await prisma.channel.findMany({
        where: { realmId: nexusRealm.id },
      });

      console.log(`\n📊 Updated channels: ${updatedChannels.length}`);
      updatedChannels.forEach(channel => {
        console.log(`   - #${channel.name} (${channel.displayName}) [${channel.type}]`);
      });
    }

    console.log('\n✅ Nexus realm check complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the backend if it\'s running');
    console.log('   2. Refresh the frontend');
    console.log('   3. You should now see channels in the sidebar');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
