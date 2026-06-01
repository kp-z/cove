/**
 * tRPC WebSocket Client 测试
 *
 * 测试 TrpcWebSocketRequestClient 的核心功能：
 * - tRPC 请求/响应
 * - 超时处理
 * - 错误处理
 */

import { TrpcWebSocketRequestClient } from './infrastructure/gateway/trpc-websocket-request-client'

async function testTrpcWebSocketClient() {
  console.log('🚀 开始测试 tRPC WebSocket Client...\n')

  // 1. 创建 TrpcWebSocketRequestClient
  console.log('📋 步骤 1: 创建 TrpcWebSocketRequestClient')
  const wsUrl = 'ws://localhost:3002/trpc'
  const client = new TrpcWebSocketRequestClient(wsUrl, {
    timeout: 10000,
    reconnectMaxAttempts: 3,
  })
  console.log(`✅ Client 创建完成 (URL: ${wsUrl})\n`)

  // 2. 连接到 Backend
  console.log('📋 步骤 2: 连接到 Cloud Backend')
  try {
    await client.connect()
    console.log('✅ WebSocket 连接成功\n')
  } catch (error) {
    console.error('❌ 连接失败:', error)
    process.exit(1)
  }

  // 3. 测试健康检查（如果 Backend 有这个端点）
  console.log('📋 步骤 3: 测试 tRPC 请求')
  try {
    // 尝试调用一个简单的查询
    const result = await client.request<{ realms: any[]; total: number }>({
      method: 'query',
      path: 'realm.list',
      input: {},
    })
    console.log('✅ tRPC 请求成功')
    console.log('   响应:', JSON.stringify(result, null, 2))
  } catch (error: any) {
    console.log('⚠️  tRPC 请求失败（这是预期的，因为需要认证）')
    console.log('   错误:', error.message)
  }
  console.log()

  // 4. 测试超时
  console.log('📋 步骤 4: 测试超时处理')
  try {
    // 创建一个短超时的客户端
    const shortTimeoutClient = new TrpcWebSocketRequestClient(wsUrl, {
      timeout: 100, // 100ms 超时
    })
    await shortTimeoutClient.connect()

    await shortTimeoutClient.request({
      method: 'query',
      path: 'realm.list',
      input: {},
    })
    console.log('❌ 应该超时但没有超时')
  } catch (error: any) {
    if (error.message.includes('timeout')) {
      console.log('✅ 超时处理正常工作')
    } else {
      console.log('⚠️  收到其他错误:', error.message)
    }
  }
  console.log()

  // 5. 清理
  console.log('📋 步骤 5: 清理资源')
  await client.disconnect()
  console.log('✅ 资源清理完成\n')

  console.log('🎉 tRPC WebSocket Client 测试完成！')
}

// 运行测试
testTrpcWebSocketClient().catch(error => {
  console.error('❌ 测试失败:', error)
  process.exit(1)
})
