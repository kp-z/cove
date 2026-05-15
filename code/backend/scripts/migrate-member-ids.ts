#!/usr/bin/env ts-node
/**
 * 数据迁移脚本：填充 Channel.memberIds 冗余字段
 *
 * 目的：从 .cove/storage/channels/{id}.json 文件中提取成员 ID，
 *      填充到数据库的 memberIds 字段，用于优化 findByMember 查询
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

interface ChannelContent {
  members?: Array<{
    userId: string;
    role: string;
    status: string;
  }>;
}

async function migrateChannelMemberIds() {
  console.log('开始迁移 Channel.memberIds 字段...\n');

  try {
    // 1. 获取所有 Channel 记录
    const channels = await prisma.channel.findMany({
      select: {
        id: true,
        name: true,
        metadataPath: true,
        memberIds: true,
      },
    });

    console.log(`找到 ${channels.length} 个频道\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 2. 遍历每个频道
    for (const channel of channels) {
      try {
        // 跳过已经有 memberIds 的频道（非空数组）
        if (channel.memberIds && channel.memberIds !== '[]') {
          console.log(`⏭️  跳过 ${channel.name} (${channel.id}) - 已有 memberIds`);
          skipCount++;
          continue;
        }

        // 3. 读取 JSON 文件
        const projectRoot = process.env.COVE_PROJECT_ROOT || path.resolve(__dirname, '../../../../');
        const absolutePath = path.join(projectRoot, channel.metadataPath);

        let content: ChannelContent;
        try {
          const fileContent = await fs.readFile(absolutePath, 'utf-8');
          content = JSON.parse(fileContent);
        } catch (fileError) {
          console.warn(`⚠️  无法读取文件 ${channel.name} (${channel.id}): ${absolutePath}`);
          errorCount++;
          continue;
        }

        // 4. 提取成员 ID
        const memberIds: string[] = [];
        if (content.members && Array.isArray(content.members)) {
          for (const member of content.members) {
            if (member.userId && member.status === 'active') {
              memberIds.push(member.userId);
            }
          }
        }

        // 5. 更新数据库
        await prisma.channel.update({
          where: { id: channel.id },
          data: { memberIds: JSON.stringify(memberIds) },
        });

        console.log(`✅ ${channel.name} (${channel.id}) - ${memberIds.length} 个成员`);
        successCount++;

      } catch (error) {
        console.error(`❌ 处理频道 ${channel.name} (${channel.id}) 失败:`, error);
        errorCount++;
      }
    }

    // 6. 输出统计
    console.log('\n迁移完成！');
    console.log(`✅ 成功: ${successCount}`);
    console.log(`⏭️  跳过: ${skipCount}`);
    console.log(`❌ 失败: ${errorCount}`);
    console.log(`📊 总计: ${channels.length}`);

    // 7. 验证数据一致性
    console.log('\n验证数据一致性...');
    const updatedChannels = await prisma.channel.findMany({
      select: {
        id: true,
        memberIds: true,
        memberCount: true,
      },
    });

    let inconsistentCount = 0;
    for (const channel of updatedChannels) {
      const memberIds = JSON.parse(channel.memberIds || '[]');
      if (memberIds.length !== channel.memberCount) {
        console.warn(`⚠️  数据不一致: ${channel.id} - memberIds: ${memberIds.length}, memberCount: ${channel.memberCount}`);
        inconsistentCount++;
      }
    }

    if (inconsistentCount === 0) {
      console.log('✅ 数据一致性验证通过');
    } else {
      console.warn(`⚠️  发现 ${inconsistentCount} 个不一致的记录`);
    }

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行迁移
migrateChannelMemberIds()
  .then(() => {
    console.log('\n✅ 迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 迁移脚本执行失败:', error);
    process.exit(1);
  });
