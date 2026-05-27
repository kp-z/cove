/**
 * Check Channel Members Script
 *
 * 检查 Nexus realm 中的 channels 和 members 关系
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

    // 查找所有 channels
    const channels = await prisma.channel.findMany({
      where: { realmId: nexusRealm.id, type: 'public' }
    });

    console.log('\n📊 Public channels:', channels.length);
    channels.forEach(ch => console.log(`   - #${ch.name} (${ch.id})`));

    // 查找所有用户（通过 RealmMember）
    const realmMembers = await prisma.realmMember.findMany({
      where: { realmId: nexusRealm.id },
      include: { user: true }
    });

    const users = realmMembers.map(rm => rm.user);

    console.log('\n👥 Users:', users.length);
    users.forEach(u => console.log(`   - ${u.username} (${u.id})`));

    // 查找所有 channel members
    const members = await prisma.member.findMany({
      where: {
        channel: { realmId: nexusRealm.id }
      },
      include: {
        channel: { select: { name: true } }
      }
    });

    console.log('\n👤 Channel members:', members.length);
    members.forEach(m => console.log(`   - ${m.memberId} in #${m.channel.name}`));

    // 检查每个用户在哪些 channels 中
    console.log('\n🔍 User channel memberships:');
    for (const user of users) {
      const userChannels = members.filter(m => m.memberId === user.id);
      console.log(`\n   ${user.username} (${user.id}):`);
      if (userChannels.length === 0) {
        console.log('     ⚠️  Not a member of any channel!');
      } else {
        userChannels.forEach(m => console.log(`     - #${m.channel.name}`));
      }
    }

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
