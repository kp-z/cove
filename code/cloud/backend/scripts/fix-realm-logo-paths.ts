/**
 * 修复 Realm Logo 路径
 * 
 * 将错误的 /storage/assets/cove-logo.svg 路径修复为 /cove-logo.svg
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRealmLogoPaths() {
  console.log('🔧 开始修复 Realm logo 路径...');

  try {
    // 查找所有使用错误路径的 realm
    const realmsWithWrongPath = await prisma.realm.findMany({
      where: {
        logoUrl: '/storage/assets/cove-logo.svg',
      },
    });

    console.log(`📊 找到 ${realmsWithWrongPath.length} 个需要修复的 realm`);

    if (realmsWithWrongPath.length === 0) {
      console.log('✅ 没有需要修复的 realm');
      return;
    }

    // 批量更新
    const result = await prisma.realm.updateMany({
      where: {
        logoUrl: '/storage/assets/cove-logo.svg',
      },
      data: {
        logoUrl: '/cove-logo.svg',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ 成功修复 ${result.count} 个 realm 的 logo 路径`);

    // 显示修复的 realm 列表
    console.log('\n修复的 realm:');
    realmsWithWrongPath.forEach((realm) => {
      console.log(`  - ${realm.displayName} (${realm.id})`);
    });

  } catch (error) {
    console.error('❌ 修复失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复
fixRealmLogoPaths()
  .then(() => {
    console.log('\n🎉 修复完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 修复过程中出错:', error);
    process.exit(1);
  });
