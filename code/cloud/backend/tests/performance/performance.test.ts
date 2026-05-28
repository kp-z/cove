/**
 * Performance Tests
 *
 * 性能测试：验证系统性能指标
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { IMessageOrchestrator, EnqueueMessage, MessageTask } from '../../src/domain/message-orchestrator/message-orchestrator.interface'
import type { IAdapterManager, LlmAdapter, AdapterConfig } from '../../src/domain/adapter-manager/adapter-manager.interface'
import type { IConfigurationService } from '../../src/domain/configuration/configuration-service.interface'
import type { IMessageQueue } from '../../src/infrastructure/storage/message-queue.interface'
import type { ITaskStore } from '../../src/infrastructure/storage/task-store.interface'
import type { IConfigCache } from '../../src/infrastructure/storage/config-cache.interface'
import type { RealmConfiguration, AgentConfig } from '../../src/infrastructure/gateway/backend-gateway.interface'

// ==================== Mock 实现（复用 E2E 测试的实现）====================

class MockLlmAdapter implements LlmAdapter {
  constructor(private config: AdapterConfig) {}

  async generateResponse(params: any): Promise<string> {
    // 模拟快速响应（10ms）
    await new Promise(resolve => setTimeout(resolve, 10))
    return `Response from ${this.config.id}`
  }

  getConfig(): AdapterConfig {
    return this.config
  }
}

class MockMessageQueue implements IMessageQueue {
  private messages: Map<string, MessageTask> = new Map()

  async enqueue(message: EnqueueMessage): Promise<string> {
    const task: MessageTask = {
      id: `task-${Date.now()}-${Math.random()}`,
      messageId: message.messageId,
      channelId: message.channelId,
      content: message.content,
      state: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      priority: message.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    this.messages.set(task.id, task)
    return task.id
  }

  async dequeue(): Promise<MessageTask | null> {
    const pending = Array.from(this.messages.values())
      .filter(t => t.state === 'PENDING')
      .sort((a, b) => b.priority - a.priority)
    return pending[0] || null
  }

  async findByState(state: any): Promise<MessageTask[]> {
    return Array.from(this.messages.values()).filter(t => t.state === state)
  }

  async updateState(taskId: string, state: any): Promise<void> {
    const task = this.messages.get(taskId)
    if (task) {
      task.state = state
      task.updatedAt = new Date()
    }
  }

  async close(): Promise<void> {}
  clear(): void { this.messages.clear() }
}

class MockTaskStore implements ITaskStore {
  private tasks: Map<string, MessageTask> = new Map()

  async get(taskId: string): Promise<MessageTask | null> {
    return this.tasks.get(taskId) || null
  }

  async upsert(task: any): Promise<void> {
    const taskId = task.id || task.messageId
    const existing = this.tasks.get(taskId)
    if (existing) {
      Object.assign(existing, task, { updatedAt: new Date() })
    } else {
      const newTask: MessageTask = {
        id: taskId,
        messageId: task.messageId || taskId,
        channelId: task.channelId || '',
        content: task.content || '',
        state: task.state || 'PENDING',
        attempts: task.attempts || 0,
        maxAttempts: task.maxAttempts || 3,
        priority: task.priority || 0,
        createdAt: task.createdAt || new Date(),
        updatedAt: new Date(),
        lastAttemptAt: task.lastAttemptAt,
        completedAt: task.completedAt,
        error: task.error
      }
      this.tasks.set(taskId, newTask)
    }
  }

  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId)
  }

  async findByState(state: any): Promise<MessageTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.state === state)
  }

  async close(): Promise<void> {}
  clear(): void { this.tasks.clear() }
}

class MockConfigCache implements IConfigCache {
  private cache: Map<string, RealmConfiguration> = new Map()

  async get(realmId: string): Promise<RealmConfiguration | null> {
    return this.cache.get(realmId) || null
  }

  async set(realmId: string, config: RealmConfiguration): Promise<void> {
    this.cache.set(realmId, config)
  }

  async delete(realmId: string): Promise<void> {
    this.cache.delete(realmId)
  }

  async getVersion(realmId: string): Promise<number> {
    const config = this.cache.get(realmId)
    return config?.version || 0
  }

  async close(): Promise<void> {}
  clear(): void { this.cache.clear() }
}

class MockAdapterManager implements IAdapterManager {
  private adapters: Map<string, LlmAdapter> = new Map()

  async loadAdapter(adapterId: string, adapterVersion: string): Promise<LlmAdapter> {
    const key = `${adapterId}@${adapterVersion}`
    if (!this.adapters.has(key)) {
      const adapter = new MockLlmAdapter({
        id: adapterId,
        type: 'mock',
        version: adapterVersion,
        config: {}
      })
      this.adapters.set(key, adapter)
    }
    return this.adapters.get(key)!
  }

  getAdapter(adapterId: string): LlmAdapter | null {
    for (const [key, adapter] of this.adapters.entries()) {
      if (key.startsWith(`${adapterId}@`)) {
        return adapter
      }
    }
    return null
  }

  async unloadAdapter(adapterId: string): Promise<void> {
    for (const key of this.adapters.keys()) {
      if (key.startsWith(`${adapterId}@`)) {
        this.adapters.delete(key)
      }
    }
  }

  async reloadAdapter(adapterId: string, adapterVersion: string): Promise<void> {
    await this.unloadAdapter(adapterId)
    await this.loadAdapter(adapterId, adapterVersion)
  }

  listLoadedAdapters(): string[] {
    return Array.from(this.adapters.keys())
  }

  async cleanup(): Promise<void> {
    this.adapters.clear()
  }
}

class MockConfigurationService implements Partial<IConfigurationService> {
  constructor(private configCache: IConfigCache) {}

  async getLocalConfig(realmId: string): Promise<RealmConfiguration | null> {
    return this.configCache.get(realmId)
  }
}

class MockMessageOrchestrator implements IMessageOrchestrator {
  constructor(
    private messageQueue: IMessageQueue,
    private taskStore: ITaskStore,
    private messageProcessor?: (task: MessageTask) => Promise<void>
  ) {}

  async enqueue(message: EnqueueMessage): Promise<string> {
    const taskId = await this.messageQueue.enqueue(message)
    await this.taskStore.upsert({
      id: taskId,
      messageId: message.messageId,
      channelId: message.channelId,
      content: message.content,
      state: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      priority: message.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    return taskId
  }

  async processNext(): Promise<boolean> {
    const task = await this.messageQueue.dequeue()
    if (!task) return false

    const currentTask = await this.taskStore.get(task.id)
    const currentAttempts = currentTask?.attempts || task.attempts

    await this.taskStore.upsert({
      id: task.id,
      state: 'PROCESSING',
      attempts: currentAttempts + 1,
      lastAttemptAt: new Date()
    })
    await this.messageQueue.updateState(task.id, 'PROCESSING')

    try {
      if (this.messageProcessor) {
        await this.messageProcessor(task)
      }

      await this.taskStore.upsert({
        id: task.id,
        state: 'COMPLETED',
        completedAt: new Date()
      })
      await this.messageQueue.updateState(task.id, 'COMPLETED')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.taskStore.upsert({
        id: task.id,
        state: 'FAILED',
        error: errorMessage
      })
      await this.messageQueue.updateState(task.id, 'FAILED')
      return true
    }
  }

  async getTask(taskId: string): Promise<MessageTask | null> {
    return this.taskStore.get(taskId)
  }

  async getPendingTasks(): Promise<MessageTask[]> {
    return this.taskStore.findByState('PENDING')
  }

  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}

// ==================== 辅助函数 ====================

function calculateP95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor(sorted.length * 0.95)
  return sorted[index]
}

// ==================== 测试套件 ====================

describe('Performance Tests', () => {
  let messageQueue: MockMessageQueue
  let taskStore: MockTaskStore
  let configCache: MockConfigCache
  let adapterManager: MockAdapterManager
  let configService: MockConfigurationService
  let orchestrator: MockMessageOrchestrator

  const createMockConfig = (): RealmConfiguration => {
    const agents: AgentConfig[] = [
      {
        id: 'agent-1',
        name: 'Test Agent',
        description: 'Test agent',
        systemPrompt: 'You are helpful',
        adapterId: 'anthropic-adapter',
        adapterVersion: '1.0.0',
        enabled: true,
        priority: 1
      }
    ]

    return {
      realmId: 'realm-1',
      version: 1,
      checksum: 'abc123',
      agents,
      settings: {
        maxConcurrentAgents: 5,
        messageTimeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000
        }
      },
      updatedAt: new Date()
    }
  }

  beforeEach(async () => {
    messageQueue = new MockMessageQueue()
    taskStore = new MockTaskStore()
    configCache = new MockConfigCache()
    adapterManager = new MockAdapterManager()
    configService = new MockConfigurationService(configCache)

    const config = createMockConfig()
    await configCache.set('realm-1', config)
  })

  afterEach(() => {
    messageQueue.clear()
    taskStore.clear()
    configCache.clear()
  })

  describe('消息处理延迟', () => {
    it('should process message within 2s (p95)', async () => {
      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      const latencies: number[] = []

      // 处理 100 条消息
      for (let i = 0; i < 100; i++) {
        const start = Date.now()

        await orchestrator.enqueue({
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`
        })

        await orchestrator.processNext()

        const latency = Date.now() - start
        latencies.push(latency)
      }

      // 计算 p95
      const p95 = calculateP95(latencies)

      console.log(`Message processing latency p95: ${p95}ms`)
      expect(p95).toBeLessThan(2000) // < 2s
    }, 30000) // 30s timeout

    it('should process messages with low average latency', async () => {
      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      const latencies: number[] = []

      for (let i = 0; i < 50; i++) {
        const start = Date.now()
        await orchestrator.enqueue({
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`
        })
        await orchestrator.processNext()
        latencies.push(Date.now() - start)
      }

      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
      console.log(`Average latency: ${avg.toFixed(2)}ms`)
      expect(avg).toBeLessThan(100) // < 100ms average
    }, 15000)
  })

  describe('配置加载性能', () => {
    it('should load config within 200ms', async () => {
      const latencies: number[] = []

      for (let i = 0; i < 100; i++) {
        const start = Date.now()
        await configService.getLocalConfig('realm-1')
        latencies.push(Date.now() - start)
      }

      const p95 = calculateP95(latencies)
      console.log(`Config loading latency p95: ${p95}ms`)
      expect(p95).toBeLessThan(200) // < 200ms
    })
  })

  describe('Adapter 加载性能', () => {
    it('should load adapter within 500ms', async () => {
      const latencies: number[] = []

      for (let i = 0; i < 50; i++) {
        // 清理缓存
        await adapterManager.cleanup()

        const start = Date.now()
        await adapterManager.loadAdapter('anthropic-adapter', '1.0.0')
        latencies.push(Date.now() - start)
      }

      const p95 = calculateP95(latencies)
      console.log(`Adapter loading latency p95: ${p95}ms`)
      expect(p95).toBeLessThan(500) // < 500ms
    })

    it('should use cached adapter efficiently', async () => {
      // 第一次加载
      const start1 = Date.now()
      await adapterManager.loadAdapter('anthropic-adapter', '1.0.0')
      const firstLoad = Date.now() - start1

      // 第二次加载（使用缓存）
      const start2 = Date.now()
      await adapterManager.loadAdapter('anthropic-adapter', '1.0.0')
      const cachedLoad = Date.now() - start2

      console.log(`First load: ${firstLoad}ms, Cached load: ${cachedLoad}ms`)

      // 验证缓存加载非常快（< 10ms）
      expect(cachedLoad).toBeLessThan(10)

      // 如果两次加载时间都可测量，验证缓存更快
      if (firstLoad > 0 && cachedLoad > 0) {
        expect(cachedLoad).toBeLessThanOrEqual(firstLoad)
      }
    })
  })

  describe('并发处理性能', () => {
    it('should handle 100 concurrent messages', async () => {
      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      // 并发入队 100 条消息
      const enqueuePromises = Array.from({ length: 100 }, (_, i) =>
        orchestrator.enqueue({
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`
        })
      )

      await Promise.all(enqueuePromises)

      // 并发处理（10 个并发）
      const start = Date.now()
      const processPromises = Array.from({ length: 10 }, async () => {
        for (let i = 0; i < 10; i++) {
          await orchestrator.processNext()
        }
      })

      await Promise.all(processPromises)
      const duration = Date.now() - start

      // 计算吞吐量
      const throughput = 100 / (duration / 1000)
      console.log(`Throughput: ${throughput.toFixed(2)} msg/s`)
      expect(throughput).toBeGreaterThan(10) // > 10 msg/s
    }, 30000)
  })

  describe('内存占用', () => {
    it('should keep memory usage reasonable', async () => {
      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      const initialMemory = process.memoryUsage().heapUsed

      // 处理 1000 条消息
      for (let i = 0; i < 1000; i++) {
        await orchestrator.enqueue({
          messageId: `msg-${i}`,
          channelId: 'channel-1',
          content: `Message ${i}`
        })
        await orchestrator.processNext()

        // 每 100 条消息清理一次已完成的任务
        if (i % 100 === 0) {
          const completed = await taskStore.findByState('COMPLETED')
          for (const task of completed) {
            await taskStore.delete(task.id)
          }
        }
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`)
      expect(memoryIncrease).toBeLessThan(500) // < 500MB
    }, 60000) // 60s timeout
  })
})
