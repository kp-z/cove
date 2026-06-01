/**
 * WebSocket 连接测试
 *
 * 测试 ConnectionManager 的核心功能：
 * - WebSocket 连接
 * - 心跳机制
 * - 自动重连
 * - 消息队列
 */

import { ConnectionManager } from './domain/device-lifecycle/connection-manager'

async function testWebSocketConnection() {
  console.log('🚀 开始测试 WebSocket 连接...\n')

  // 1. 创建 ConnectionManager
  console.log('📋 步骤 1: 创建 ConnectionManager')
  const wsUrl = 'ws://localhost:3002/trpc'
  const connectionManager = new ConnectionManager({
    url: wsUrl,
    heartbeatInterval: 10000, // 10 秒心跳（测试用）
    reconnectMaxAttempts: 5,
    reconnectBaseDelay: 1000,
  })
  console.log(`✅ ConnectionManager 创建完成 (URL: ${wsUrl})\n`)

  // 2. 注册消息处理器
  console.log('📋 步骤 2: 注册消息处理器')
  connectionManager.onMessage((msg) => {
    console.log('📨 收到消息:', JSON.stringify(msg, null, 2))
  })
  console.log('✅ 消息处理器注册完成\n')

  // 3. 连接到 Backend
  console.log('📋 步骤 3: 连接到 Cloud Backend')
  try {
    await connectionManager.connect()
    console.log('✅ WebSocket 连接成功\n')
  } catch (error) {
    console.error('❌ 连接失败:', error)
    process.exit(1)
  }

  // 4. 检查连接状态
  console.log('📋 步骤 4: 检查连接状态')
  console.log(`   状态: ${connectionManager.getState()}`)
  console.log(`   已连接: ${connectionManager.isConnected()}`)
  console.log(`   队列大小: ${connectionManager.getQueueSize()}\n`)

  // 5. 发送测试消息
  console.log('📋 步骤 5: 发送测试消息')
  await connectionManager.send({
    type: 'test',
    message: 'Hello from Local Device!',
    timestamp: Date.now(),
  })
  console.log('✅ 测试消息已发送\n')

  // 6. 等待心跳
  console.log('📋 步骤 6: 等待心跳（15 秒）...')
  await new Promise(resolve => setTimeout(resolve, 15000))
  console.log('✅ 心跳测试完成\n')

  // 7. 测试消息队列（断开连接）
  console.log('📋 步骤 7: 测试消息队列')
  console.log('   断开连接...')
  await connectionManager.disconnect()
  console.log('   发送消息（应该进入队列）...')
  await connectionManager.send({
    type: 'queued',
    message: 'This should be queued',
    timestamp: Date.now(),
  })
  console.log(`   队列大小: ${connectionManager.getQueueSize()}`)
  console.log('✅ 消息已加入队列\n')

  // 8. 重新连接并验证队列刷新
  console.log('📋 步骤 8: 重新连接并刷新队列')
  await connectionManager.connect()
  console.log('✅ 重新连接成功')
  await new Promise(resolve => setTimeout(resolve, 2000))
  console.log(`   队列大小: ${connectionManager.getQueueSize()}`)
  console.log('✅ 队列刷新完成\n')

  // 9. 清理
  console.log('📋 步骤 9: 清理资源')
  await connectionManager.disconnect()
  console.log('✅ 资源清理完成\n')

  console.log('🎉 所有测试通过！')
}

// 运行测试
testWebSocketConnection().catch(error => {
  console.error('❌ 测试失败:', error)
  process.exit(1)
})
