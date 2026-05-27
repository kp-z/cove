/**
 * Add Agents to Default Channels Script
 *
 * 将所有现有 agents 添加到默认 channels (#general, #welcome)
 */

import { PrismaClient } from '@prisma/client';
import { ChannelRepository } from '../src/infrastructure/repositories/channel.repository';
import { ILogger } from '../src/application/interfaces/logger.interface';

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
  const channelRepository = new ChannelRepository(prisma, logger);

  try {
    // 查找 nexus realm
    const nexusRealm = await prisma.realm.findFirst({
      where: { name: 'nexus' }
    });

    if (!nexusRealm) {
      console.log('❌ Nexus realm not found');
      return;
    }

    console.log('✅ Found Nexus realm:', nexusRealm.id);

    // 查找默认 channels
    const channels = await channelRepository.findAll(nexusRealm.id);
    const defaultChannels = channels.filter(ch =>
      (ch.name === 'general' || ch.name === 'welcome') && ch.type === 'public'
    );

    console.log('\n📊 Default channels:', defaultChannels.length);
    defaultChannels.forEach(ch => console.log(`   - #${ch.name} (${ch.channelId})`));

    if (defaultChannels.length === 0) {
      console.log('\n❌ No default channels found.');
      return;
    }

    // 查找所有 agents
    const agents = await prisma.agent.findMany({
      where: { realmId: nexusRealm.id }
    });

    console.log('\n🤖 Agents:', agents.length);
    agents.forEach(a => console.log(`   - ${a.name} (${a.id})`));

    if (agents.length === 0) {
      console.log('\n❌ No agents found in realm.');
      return;
    }

    // 为每个 channel 添加所有 agents
    console.log('\n🔧 Adding agents to channels...\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const channel of defaultChannels) {
      let currentChannel = channel;

      for (const agent of agents) {
        // 检查是否已经是成员
        if (currentChannel.hasMember(agent.id)) {
          console.log(`   ⏭️  ${agent.name} already in #${currentChannel.name}`);
          skippedCount++;
          continue;
        }

        // 添加成员到 Channel Entity
        currentChannel = currentChannel.addMember({
          memberId: agent.id,
          memberType: 'agent',
          role: 'member',
          joinedAt: new Date()
        });

        console.log(`   ✅ Added ${agent.name} to #${currentChannel.name}`);
        addedCount++;
      }

      // 一次性保存所有成员到数据库
      await channelRepository.update(currentChannel, nexusRealm.id);
      console.log(`   💾 Saved #${currentChannel.name} with ${currentChannel.members.length} members\n`);
    }

    console.log(`📊 Summary:`);
    console.log(`   - Added: ${addedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);

    // 验证结果
    console.log('\n🔍 Verifying results...\n');

    const updatedChannels = await channelRepository.findAll(nexusRealm.id);
    const updatedDefaultChannels = updatedChannels.filter(ch =>
      ch.name === 'general' || ch.name === 'welcome'
    );

    for (const channel of updatedDefaultChannels) {
      console.log(`#${channel.name}:`);
      console.log(`   - Total members: ${channel.members.length}`);

      const agentMembers = channel.members.filter(m => m.memberType === 'agent');
      console.log(`   - Agent members: ${agentMembers.length}`);

      agentMembers.forEach(m => {
        const agent = agents.find(a => a.id === m.memberId);
        console.log(`     - ${agent?.name || m.memberId} (${m.role})`);
      });
    }

    console.log('\n✅ Agents added to channels successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the backend if it\'s running');
    console.log('   2. New agents will automatically join channels');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
