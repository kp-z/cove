/**
 * Add Users to Default Channels Script
 *
 * 将所有用户添加到默认 channels (#general, #welcome)
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

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
    const channels = await prisma.channel.findMany({
      where: {
        realmId: nexusRealm.id,
        type: 'public',
        name: { in: ['general', 'welcome'] }
      }
    });

    console.log('\n📊 Default channels:', channels.length);
    channels.forEach(ch => console.log(`   - #${ch.name} (${ch.id})`));

    if (channels.length === 0) {
      console.log('\n❌ No default channels found. Run fix:nexus first.');
      return;
    }

    // 查找所有用户
    const realmMembers = await prisma.realmMember.findMany({
      where: { realmId: nexusRealm.id },
      include: { user: true }
    });

    const users = realmMembers.map(rm => rm.user);

    console.log('\n👥 Users:', users.length);
    users.forEach(u => console.log(`   - ${u.username} (${u.id})`));

    if (users.length === 0) {
      console.log('\n❌ No users found in realm.');
      return;
    }

    // 为每个用户添加到每个 channel
    console.log('\n🔧 Adding users to channels...\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      for (const channel of channels) {
        // 检查是否已经是成员
        const existing = await prisma.member.findUnique({
          where: {
            userId_channelId: {
              userId: user.id,
              channelId: channel.id
            }
          }
        });

        if (existing) {
          console.log(`   ⏭️  ${user.username} already in #${channel.name}`);
          skippedCount++;
          continue;
        }

        // 添加成员
        await prisma.member.create({
          data: {
            id: `member-${channel.id}-${user.id}`,
            userId: user.id,
            channelId: channel.id,
            role: 'member',
            status: 'active',
            joinedAt: new Date()
          }
        });

        console.log(`   ✅ Added ${user.username} to #${channel.name}`);
        addedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Added: ${addedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);

    // 验证结果
    const totalMembers = await prisma.member.count({
      where: {
        channel: { realmId: nexusRealm.id }
      }
    });

    console.log(`   - Total members: ${totalMembers}`);

    console.log('\n✅ Users added to channels successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh the frontend');
    console.log('   2. You should now see channels in the sidebar');

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
