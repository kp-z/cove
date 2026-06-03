#!/usr/bin/env node

/**
 * Realm API 全面测试脚本
 *
 * 测试所有 11 个 Realm API 端点：
 * - Realm CRUD (5个)
 * - Realm Member 管理 (6个)
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import fetch from 'node-fetch';

// 配置
const BACKEND_URL = 'http://localhost:3002';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 创建 tRPC 客户端
const trpc = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/trpc`,
      fetch,
      headers: async () => {
        if (globalThis.authToken) {
          return {
            authorization: `Bearer ${globalThis.authToken}`,
          };
        }
        return {};
      },
    }),
  ],
});

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// 测试辅助函数
function testCase(name, fn) {
  return async () => {
    stats.total++;
    try {
      console.log(`\n🧪 测试: ${name}`);
      await fn();
      stats.passed++;
      console.log(`✅ 通过: ${name}`);
    } catch (error) {
      stats.failed++;
      stats.errors.push({ test: name, error: error.message });
      console.error(`❌ 失败: ${name}`);
      console.error(`   错误: ${error.message}`);
    }
  };
}

// 测试数据
let testRealmId;
let testUserId;
let testRealm2Id;

// ============================================
// 测试用例
// ============================================

const tests = [
  // 0. 登录获取 token
  testCase('0. 登录获取 token', async () => {
    const result = await trpc.auth.login.mutate({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
    });

    if (!result.token) {
      throw new Error('登录失败：未返回 token');
    }

    globalThis.authToken = result.token;
    testUserId = result.user.user_id;
    console.log(`   Token: ${result.token.substring(0, 20)}...`);
    console.log(`   User ID: ${testUserId}`);
  }),

  // 1. 创建 Realm
  testCase('1. realm.create - 创建 Realm', async () => {
    const result = await trpc.realm.create.mutate({
      name: 'test-realm-' + Date.now(),
      displayName: 'Test Realm',
      description: 'This is a test realm',
      ownerId: testUserId,
      visibility: 'public',
    });

    if (!result.realm_id) {
      throw new Error('创建失败：未返回 realm_id');
    }

    testRealmId = result.realm_id;
    console.log(`   Realm ID: ${testRealmId}`);
    console.log(`   Name: ${result.name}`);
    console.log(`   Display Name: ${result.display_name}`);
  }),

  // 2. 获取 Realm 列表
  testCase('2. realm.list - 获取 Realm 列表', async () => {
    const result = await trpc.realm.list.query();

    if (!result.realms || !Array.isArray(result.realms)) {
      throw new Error('查询失败：未返回 realms 数组');
    }

    console.log(`   总数: ${result.total}`);
    console.log(`   Realms: ${result.realms.map(r => r.name).join(', ')}`);

    // 验证刚创建的 realm 在列表中
    const found = result.realms.find(r => r.realm_id === testRealmId);
    if (!found) {
      throw new Error('刚创建的 realm 不在列表中');
    }
  }),

  // 3. 按 ownerId 过滤
  testCase('3. realm.list - 按 ownerId 过滤', async () => {
    const result = await trpc.realm.list.query({
      ownerId: testUserId,
    });

    if (!result.realms || result.realms.length === 0) {
      throw new Error('查询失败：未找到该用户的 realm');
    }

    console.log(`   用户 ${testUserId} 拥有的 Realms: ${result.total}`);

    // 验证所有 realm 的 owner 都是该用户
    const allOwnedByUser = result.realms.every(r => r.owner_id === testUserId);
    if (!allOwnedByUser) {
      throw new Error('过滤失败：返回了其他用户的 realm');
    }
  }),

  // 4. 获取单个 Realm
  testCase('4. realm.getById - 获取单个 Realm', async () => {
    const result = await trpc.realm.getById.query({
      realmId: testRealmId,
    });

    if (result.realm_id !== testRealmId) {
      throw new Error('查询失败：返回的 realm_id 不匹配');
    }

    console.log(`   Realm ID: ${result.realm_id}`);
    console.log(`   Name: ${result.name}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Visibility: ${result.visibility}`);
  }),

  // 5. 更新 Realm
  testCase('5. realm.update - 更新 Realm', async () => {
    const result = await trpc.realm.update.mutate({
      realmId: testRealmId,
      data: {
        displayName: 'Updated Test Realm',
        description: 'Updated description',
        visibility: 'private',
      },
    });

    if (result.display_name !== 'Updated Test Realm') {
      throw new Error('更新失败：displayName 未更新');
    }

    if (result.visibility !== 'private') {
      throw new Error('更新失败：visibility 未更新');
    }

    console.log(`   Display Name: ${result.display_name}`);
    console.log(`   Visibility: ${result.visibility}`);
  }),

  // 6. 添加成员
  testCase('6. realm.addMember - 添加成员', async () => {
    // 先创建一个测试用户
    const timestamp = Date.now();
    const username = `testuser${timestamp}`.substring(0, 20); // Ensure max 20 chars
    const newUser = await trpc.user.create.mutate({
      username: username,
      email: `testuser${timestamp}@test.com`,
      displayName: 'Test User',
      role: 'user',
    });

    const result = await trpc.realm.addMember.mutate({
      realmId: testRealmId,
      userId: newUser.user_id,
      role: 'member',
    });

    if (result.user_id !== newUser.user_id) {
      throw new Error('添加失败：user_id 不匹配');
    }

    if (result.role !== 'member') {
      throw new Error('添加失败：role 不匹配');
    }

    console.log(`   User ID: ${result.user_id}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Status: ${result.status}`);
  }),

  // 7. 获取成员列表
  testCase('7. realm.getMembers - 获取成员列表', async () => {
    const result = await trpc.realm.getMembers.query({
      realmId: testRealmId,
    });

    if (!result.members || !Array.isArray(result.members)) {
      throw new Error('查询失败：未返回 members 数组');
    }

    console.log(`   总成员数: ${result.total}`);
    console.log(`   成员: ${result.members.map(m => `${m.user_id}(${m.role})`).join(', ')}`);

    // 验证至少有 owner
    const hasOwner = result.members.some(m => m.role === 'owner');
    if (!hasOwner) {
      throw new Error('成员列表中没有 owner');
    }
  }),

  // 8. 按 role 过滤成员
  testCase('8. realm.getMembers - 按 role 过滤', async () => {
    const result = await trpc.realm.getMembers.query({
      realmId: testRealmId,
      role: 'owner',
    });

    if (result.members.length === 0) {
      throw new Error('查询失败：未找到 owner');
    }

    // 验证所有成员都是 owner
    const allOwners = result.members.every(m => m.role === 'owner');
    if (!allOwners) {
      throw new Error('过滤失败：返回了非 owner 成员');
    }

    console.log(`   Owner 数量: ${result.total}`);
  }),

  // 9. 获取单个成员
  testCase('9. realm.getMember - 获取单个成员', async () => {
    const result = await trpc.realm.getMember.query({
      realmId: testRealmId,
      userId: testUserId,
    });

    if (result.user_id !== testUserId) {
      throw new Error('查询失败：user_id 不匹配');
    }

    console.log(`   User ID: ${result.user_id}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Status: ${result.status}`);
  }),

  // 10. 更新成员
  testCase('10. realm.updateMember - 更新成员', async () => {
    // 获取一个非 owner 成员
    const members = await trpc.realm.getMembers.query({
      realmId: testRealmId,
      role: 'member',
    });

    if (members.members.length === 0) {
      console.log('   跳过：没有可更新的 member');
      return;
    }

    const memberId = members.members[0].user_id;

    const result = await trpc.realm.updateMember.mutate({
      realmId: testRealmId,
      userId: memberId,
      role: 'admin',
    });

    if (result.role !== 'admin') {
      throw new Error('更新失败：role 未更新');
    }

    console.log(`   User ID: ${result.user_id}`);
    console.log(`   New Role: ${result.role}`);
  }),

  // 11. 获取用户所属的所有 Realm
  testCase('11. realm.getUserRealms - 获取用户的 Realms', async () => {
    const result = await trpc.realm.getUserRealms.query({
      userId: testUserId,
    });

    if (!result.realms || !Array.isArray(result.realms)) {
      throw new Error('查询失败：未返回 realms 数组');
    }

    console.log(`   用户所属 Realms: ${result.total}`);
    console.log(`   Realms: ${result.realms.map(r => r.name).join(', ')}`);

    // 验证包含测试 realm
    const found = result.realms.find(r => r.realm_id === testRealmId);
    if (!found) {
      throw new Error('用户的 realm 列表中没有测试 realm');
    }
  }),

  // 12. 获取用户在 Realm 中的角色
  testCase('12. realm.getUserRole - 获取用户角色', async () => {
    const result = await trpc.realm.getUserRole.query({
      realmId: testRealmId,
      userId: testUserId,
    });

    if (!result.role) {
      throw new Error('查询失败：未返回 role');
    }

    if (!result.hasAccess) {
      throw new Error('查询失败：hasAccess 应为 true');
    }

    console.log(`   Role: ${result.role}`);
    console.log(`   Has Access: ${result.hasAccess}`);
  }),

  // 13. 创建第二个 Realm（用于测试列表）
  testCase('13. realm.create - 创建第二个 Realm', async () => {
    const result = await trpc.realm.create.mutate({
      name: 'test-realm-2-' + Date.now(),
      displayName: 'Test Realm 2',
      description: 'Second test realm',
      ownerId: testUserId,
      visibility: 'private',
    });

    testRealm2Id = result.realm_id;
    console.log(`   Realm ID: ${testRealm2Id}`);
  }),

  // 14. 删除 Realm
  testCase('14. realm.delete - 删除 Realm', async () => {
    const result = await trpc.realm.delete.mutate({
      realmId: testRealm2Id,
    });

    if (!result.success) {
      throw new Error('删除失败：未返回 success');
    }

    console.log(`   Deleted Realm: ${testRealm2Id}`);

    // 验证已删除
    try {
      await trpc.realm.getById.query({ realmId: testRealm2Id });
      throw new Error('删除失败：realm 仍然存在');
    } catch (error) {
      if (!error.message.includes('not found') && !error.message.includes('NOT_FOUND')) {
        throw error;
      }
      console.log(`   验证：Realm 已成功删除`);
    }
  }),
];

// ============================================
// 运行测试
// ============================================

async function runTests() {
  console.log('🚀 开始 Realm API 全面测试\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`测试用例数: ${tests.length}\n`);
  console.log('='.repeat(60));

  for (const test of tests) {
    await test();
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 测试结果统计:');
  console.log(`   总数: ${stats.total}`);
  console.log(`   通过: ${stats.passed} ✅`);
  console.log(`   失败: ${stats.failed} ❌`);
  console.log(`   成功率: ${((stats.passed / stats.total) * 100).toFixed(2)}%`);

  if (stats.errors.length > 0) {
    console.log('\n❌ 失败的测试:');
    stats.errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err.test}`);
      console.log(`      ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (stats.failed === 0) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查错误信息');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('\n💥 测试运行失败:');
  console.error(error);
  process.exit(1);
});
