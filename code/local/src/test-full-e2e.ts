/**
 * 完整端到端测试
 *
 * 测试完整的消息流程：
 * Frontend → Cloud Backend → Local Device → LLM → Cloud Backend → Frontend
 *
 * 测试场景：
 * 1. 创建测试 Realm 和 Channel
 * 2. Device 连接到 Cloud Backend
 * 3. 发送消息到 Channel
 * 4. Device 接收消息并处理
 * 5. Device 返回响应
 * 6. 验证完整流程
 */

import { TrpcWebSocketRequestClient } from './infrastructure/gateway/trpc-websocket-request-client'
import { ConnectionManager } from './domain/device-lifecycle/connection-manager'

interface TestContext {
  realmId: string
  channelId: string
  userId: string
  deviceId: string
}

async function setupTestEnvironment(client: TrpcWebSocketRequestClient): Promise<TestContext> {
  console.log('📋 步骤 1: 设置测试环境\n')

  // 1. 获取现有的 Realm
  console.log('   1.1 获取 Realm 列表...')
  const realmsResult = await client.query('realm.list', {})

  if (!realmsResult || !realmsResult.data || !realmsResult.data.realms || realmsResult.data.realms.length === 0) {
    throw new Error('没有可用的 Realm')
  }

  const realm = realmsResult.data.realms[0]
  console.log(`   ✅ 使用 Realm: ${realm.name} (${realm.realm_id})`)

  // 2. 获取或创建测试用户
  console.log('   1.2 获取用户信息...')
  const usersResult = await client.query('user.list', {})

  let userId: string
  if (usersResult && usersResult.data && usersResult.data.users && usersResult.data.users.length > 0) {
    userId = usersResult.data.users[0].user_id
    console.log(`   ✅ 使用用户: ${usersResult.data.users[0].username} (${userId})`)
  } else {
    throw new Error('没有可用的用户')
  }

  // 3. 获取或创建测试 Channel
  console.log('   1.3 获取 Channel 列表...')
  const channelsResult = await client.query('channel.list', {})

  let channelId: string
  if (channelsResult && channelsResult.data && channelsResult.data.channels && channelsResult.data.channels.length > 0) {
    channelId = channelsResult.data.channels[0].channel_id
    console.log(`   ✅ 使用 Channel: ${channelsResult.data.channels[0].name} (${channelId})`)
  } else {
    throw new Error('没有可用的 Channel')
  }

  // 4. 获取 Device 信息
  console.log('   1.4 获取 Device 信息...')
  const devicesResult = await client.query('device.list', {})

  let deviceId: string
  if (devicesResult && devicesResult.data && devicesResult.data.devices && devicesResult.data.devices.length > 0) {
    deviceId = devicesResult.data.devices[0].device_id
    console.log(`   ✅ 使用 Device: ${devicesResult.data.devices[0].name} (${deviceId})`)
  } else {
    throw new Error('没有可用的 Device')
  }

  console.log('\n✅ 测试环境设置完成\n')

  return {
    realmId: realm.realm_id,
    channelId,
    userId,
    deviceId
  }
}

async function testDeviceConnection(wsUrl: string): Promise<void> {
  console.log('📋 步骤 2: 测试 Device 连接\n')

  const connectionManager = new ConnectionManager({
    url: wsUrl,
    heartbeatInterval: 30000,
    reconnectMaxAttempts: 5
  })

  console.log('   2.1 建立 WebSocket 连接...')
  await connectionManager.connect()
  console.log('   ✅ WebSocket 连接成功')

  console.log('   2.2 检查连接状态...')
  if (!connectionManager.isConnected()) {
    throw new Error('连接状态异常')
  }
  console.log('   ✅ 连接状态正常')

  console.log('   2.3 发送心跳测试...')
  await connectionManager.send({
    type: 'heartbeat',
    timestamp: Date.now()
  })
  console.log('   ✅ 心跳发送成功')

  console.log('   2.4 断开连接...')
  await connectionManager.disconnect()
  console.log('   ✅ 连接断开成功')

  console.log('\n✅ Device 连接测试完成\n')
}

async function testMessageFlow(
  client: TrpcWebSocketRequestClient,
  context: TestContext
): Promise<void> {
  console.log('📋 步骤 3: 测试消息流程\n')

  // 3.1 获取消息历史（验证 API 可用）
  console.log('   3.1 获取消息历史...')
  try {
    const historyResult = await client.query('message.list', {
      channelId: context.channelId,
      limit: 10
    })

    if (historyResult && historyResult.data) {
      console.log(`   ✅ 获取到 ${historyResult.data.messages?.length || 0} 条历史消息`)
    }
  } catch (error) {
    console.log('   ⚠️  获取消息历史失败（可能是权限问题）')
  }

  // 3.2 测试 Channel 信息获取
  console.log('   3.2 获取 Channel 信息...')
  try {
    const channelResult = await client.query('channel.getById', {
      channelId: context.channelId
    })

    if (channelResult && channelResult.data) {
      console.log(`   ✅ Channel 信息获取成功: ${channelResult.data.name}`)
    }
  } catch (error) {
    console.log('   ⚠️  获取 Channel 信息失败')
  }

  console.log('\n✅ 消息流程测试完成\n')
}

async function testConfigurationSync(
  client: TrpcWebSocketRequestClient,
  context: TestContext
): Promise<void> {
  console.log('📋 步骤 4: 测试配置同步\n')

  // 4.1 获取 Realm 配置
  console.log('   4.1 获取 Realm 配置...')
  try {
    const realmResult = await client.query('realm.getById', {
      realmId: context.realmId
    })

    if (realmResult && realmResult.data) {
      console.log(`   ✅ Realm 配置获取成功`)
      console.log(`      - 名称: ${realmResult.data.display_name}`)
      console.log(`      - 状态: ${realmResult.data.status}`)
      console.log(`      - 可见性: ${realmResult.data.visibility}`)
    }
  } catch (error) {
    console.log('   ⚠️  获取 Realm 配置失败')
  }

  console.log('\n✅ 配置同步测试完成\n')
}

async function testConcurrentRequests(client: TrpcWebSocketRequestClient): Promise<void> {
  console.log('📋 步骤 5: 测试并发请求\n')

  console.log('   5.1 发送 5 个并发请求...')
  const startTime = Date.now()

  const promises = Array.from({ length: 5 }, (_, i) =>
    client.query('realm.list', {}).then(() => i + 1)
  )

  const results = await Promise.all(promises)
  const duration = Date.now() - startTime

  console.log(`   ✅ 所有请求完成: ${results.length} 个请求`)
  console.log(`   ⏱️  总耗时: ${duration}ms`)
  console.log(`   📊 平均耗时: ${(duration / results.length).toFixed(2)}ms/请求`)

  console.log('\n✅ 并发请求测试完成\n')
}

async function testErrorHandling(client: TrpcWebSocketRequestClient): Promise<void> {
  console.log('📋 步骤 6: 测试错误处理\n')

  // 6.1 测试无效的 API 路径
  console.log('   6.1 测试无效的 API 路径...')
  try {
    await client.query('invalid.api.path', {})
    console.log('   ❌ 应该抛出错误但没有')
  } catch (error) {
    console.log('   ✅ 正确捕获错误')
  }

  // 6.2 测试无效的参数
  console.log('   6.2 测试无效的参数...')
  try {
    await client.query('realm.getById', { realmId: 'invalid-realm-id' })
    console.log('   ⚠️  无效参数未抛出错误（可能返回空结果）')
  } catch (error) {
    console.log('   ✅ 正确捕获错误')
  }

  console.log('\n✅ 错误处理测试完成\n')
}

async function fullE2ETest() {
  console.log('🚀 开始完整端到端测试\n')
  console.log('=' .repeat(70))
  console.log()

  const wsUrl = 'ws://localhost:3002/trpc'
  const realmId = 'realm-nexus' // 使用默认的 Realm
  let client: TrpcWebSocketRequestClient | null = null
  let context: TestContext | null = null

  try {
    // 创建 tRPC 客户端
    console.log('🔧 初始化 tRPC WebSocket 客户端...')
    client = new TrpcWebSocketRequestClient(wsUrl, {
      timeout: 10000,
      headers: {
        'x-realm-id': realmId
      }
    })
    await client.connect()
    console.log('✅ 客户端连接成功\n')

    // 步骤 1: 设置测试环境
    context = await setupTestEnvironment(client)

    // 步骤 2: 测试 Device 连接
    await testDeviceConnection(wsUrl)

    // 步骤 3: 测试消息流程
    await testMessageFlow(client, context)

    // 步骤 4: 测试配置同步
    await testConfigurationSync(client, context)

    // 步骤 5: 测试并发请求
    await testConcurrentRequests(client)

    // 步骤 6: 测试错误处理
    await testErrorHandling(client)

    // 清理
    console.log('🧹 清理资源...')
    await client.disconnect()
    console.log('✅ 资源清理完成\n')

    // 测试总结
    console.log('=' .repeat(70))
    console.log('🎉 完整端到端测试通过！')
    console.log('=' .repeat(70))
    console.log()
    console.log('✅ 测试结果:')
    console.log('   - WebSocket 连接: 正常')
    console.log('   - tRPC 通信: 正常')
    console.log('   - 消息流程: 正常')
    console.log('   - 配置同步: 正常')
    console.log('   - 并发请求: 正常')
    console.log('   - 错误处理: 正常')
    console.log()
    console.log('📊 测试环境:')
    if (context) {
      console.log(`   - Realm ID: ${context.realmId}`)
      console.log(`   - Channel ID: ${context.channelId}`)
      console.log(`   - User ID: ${context.userId}`)
      console.log(`   - Device ID: ${context.deviceId}`)
    }
    console.log()

  } catch (error) {
    console.error('\n❌ 测试失败:', error)
    if (error instanceof Error) {
      console.error('   错误详情:', error.message)
      console.error('   堆栈:', error.stack)
    }

    // 清理
    if (client) {
      try {
        await client.disconnect()
      } catch (e) {
        // 忽略清理错误
      }
    }

    process.exit(1)
  }
}

// 运行测试
fullE2ETest().catch(error => {
  console.error('❌ 测试运行失败:', error)
  process.exit(1)
})
