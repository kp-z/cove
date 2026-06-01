/**
 * 端到端集成测试
 *
 * 测试完整的消息流程：
 * 1. Device 连接到 Cloud Backend
 * 2. 通过 tRPC 获取配置
 * 3. 发送和接收消息
 * 4. 验证心跳和重连
 */

import { ConnectionManager } from './domain/device-lifecycle/connection-manager'
import { TrpcWebSocketRequestClient } from './infrastructure/gateway/trpc-websocket-request-client'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration?: number
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  const startTime = Date.now()
  try {
    await testFn()
    const duration = Date.now() - startTime
    return { name, passed: true, duration }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration
    }
  }
}

async function e2eIntegrationTest() {
  console.log('🚀 开始端到端集成测试...\n')
  console.log('=' .repeat(60))
  console.log()

  const results: TestResult[] = []
  const wsUrl = 'ws://localhost:3002/trpc'

  // ============================================
  // 测试 1: ConnectionManager 基础功能
  // ============================================
  results.push(await runTest('ConnectionManager - 连接建立', async () => {
    const cm = new ConnectionManager({ url: wsUrl })
    await cm.connect()
    if (!cm.isConnected()) {
      throw new Error('连接失败')
    }
    await cm.disconnect()
  }))

  results.push(await runTest('ConnectionManager - 消息队列', async () => {
    const cm = new ConnectionManager({ url: wsUrl })

    // 未连接时发送消息，应该进入队列
    await cm.send({ type: 'test', data: 'queued' })
    if (cm.getQueueSize() !== 1) {
      throw new Error(`队列大小应该是 1，实际是 ${cm.getQueueSize()}`)
    }

    // 连接后队列应该被刷新
    await cm.connect()
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (cm.getQueueSize() !== 0) {
      throw new Error(`队列应该被刷新，实际大小是 ${cm.getQueueSize()}`)
    }

    await cm.disconnect()
  }))

  results.push(await runTest('ConnectionManager - 重连机制', async () => {
    const cm = new ConnectionManager({
      url: wsUrl,
      reconnectMaxAttempts: 3,
      reconnectBaseDelay: 500
    })

    await cm.connect()
    await cm.disconnect()

    // 重新连接
    await cm.connect()
    if (!cm.isConnected()) {
      throw new Error('重连失败')
    }

    await cm.disconnect()
  }))

  // ============================================
  // 测试 2: TrpcWebSocketRequestClient 功能
  // ============================================
  results.push(await runTest('TrpcWebSocketClient - 连接和请求', async () => {
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()

    // 调用 realm.list API
    const result = await client.request<{ realms: any[]; total: number }>({
      method: 'query',
      path: 'realm.list',
      input: {}
    })

    if (!result || typeof result !== 'object') {
      throw new Error('响应格式错误')
    }

    await client.disconnect()
  }))

  results.push(await runTest('TrpcWebSocketClient - query 方法', async () => {
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()

    const result = await client.query('realm.list', {})

    if (!result) {
      throw new Error('query 方法失败')
    }

    await client.disconnect()
  }))

  results.push(await runTest('TrpcWebSocketClient - 多个并发请求', async () => {
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()

    // 发送 3 个并发请求
    const promises = [
      client.query('realm.list', {}),
      client.query('realm.list', {}),
      client.query('realm.list', {})
    ]

    const results = await Promise.all(promises)

    if (results.length !== 3) {
      throw new Error('并发请求失败')
    }

    await client.disconnect()
  }))

  // ============================================
  // 测试 3: 错误处理
  // ============================================
  results.push(await runTest('错误处理 - 无效的 tRPC 路径', async () => {
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()

    try {
      await client.query('invalid.path', {})
      throw new Error('应该抛出错误但没有')
    } catch (error) {
      // 预期会抛出错误
      if (error instanceof Error && error.message.includes('应该抛出错误')) {
        throw error
      }
      // 其他错误是预期的
    }

    await client.disconnect()
  }))

  results.push(await runTest('错误处理 - 连接断开后请求', async () => {
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()
    await client.disconnect()

    try {
      await client.query('realm.list', {})
      throw new Error('应该抛出错误但没有')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('not connected')) {
        throw new Error('错误消息不正确')
      }
    }
  }))

  // ============================================
  // 测试 4: 性能测试
  // ============================================
  results.push(await runTest('性能测试 - 连接建立时间', async () => {
    const startTime = Date.now()
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()
    const duration = Date.now() - startTime

    if (duration > 2000) {
      throw new Error(`连接时间过长: ${duration}ms`)
    }

    await client.disconnect()
  }))

  results.push(await runTest('性能测试 - 请求响应时间', async () => {
    const client = new TrpcWebSocketRequestClient(wsUrl)
    await client.connect()

    const startTime = Date.now()
    await client.query('realm.list', {})
    const duration = Date.now() - startTime

    if (duration > 1000) {
      throw new Error(`请求时间过长: ${duration}ms`)
    }

    await client.disconnect()
  }))

  // ============================================
  // 打印测试结果
  // ============================================
  console.log()
  console.log('=' .repeat(60))
  console.log('📊 测试结果汇总')
  console.log('=' .repeat(60))
  console.log()

  let passedCount = 0
  let failedCount = 0

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌'
    const duration = result.duration ? `(${result.duration}ms)` : ''
    console.log(`${index + 1}. ${status} ${result.name} ${duration}`)

    if (result.passed) {
      passedCount++
    } else {
      failedCount++
      if (result.error) {
        console.log(`   错误: ${result.error}`)
      }
    }
  })

  console.log()
  console.log('=' .repeat(60))
  console.log(`总计: ${results.length} 个测试`)
  console.log(`✅ 通过: ${passedCount}`)
  console.log(`❌ 失败: ${failedCount}`)
  console.log(`成功率: ${((passedCount / results.length) * 100).toFixed(1)}%`)
  console.log('=' .repeat(60))
  console.log()

  if (failedCount > 0) {
    console.log('❌ 部分测试失败')
    process.exit(1)
  } else {
    console.log('🎉 所有测试通过！')
  }
}

// 运行测试
e2eIntegrationTest().catch(error => {
  console.error('❌ 测试运行失败:', error)
  process.exit(1)
})
