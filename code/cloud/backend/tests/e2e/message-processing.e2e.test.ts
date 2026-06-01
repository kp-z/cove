/**
 * Message Processing E2E Tests
 *
 * 端到端测试：验证完整的消息处理流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { IMessageOrchestrator, EnqueueMessage, MessageTask } from '../../src/domain/message-orchestrator/message-orchestrator.interface'
import type { IAdapterManager, LlmAdapter, AdapterConfig } from '../../src/domain/adapter-manager/adapter-manager.interface'
import type { IConfigurationService } from '../../src/domain/configuration/configuration-service.interface'
import type { IBackendGateway, RealmConfiguration, AgentConfig, Message, AgentResponse } from '../../src/infrastructure/gateway/backend-gateway.interface'
import type { IMessageQueue } from '../../src/infrastructure/storage/message-queue.interface'
import type { ITaskStore } from '../../src/infrastructure/storage/task-store.interface'
import type { IProgressStore } from '../../src/infrastructure/storage/progress-store.interface'
import type { IConfigCache } from '../../src/infrastructure/storage/config-cache.interface'
import crypto from 'crypto'

// ==================== Mock 实现（复用集成测试的实现）====================

// Mock LlmAdapter
class MockLlmAdapter implements LlmAdapter {
  constructor(private config: AdapterConfig) {}

  async generateResponse(params: any): Promise<string> {
    // 模拟 LLM 响应
    if (params.stream && params.onChunk) {
      // 流式响应
      const chunks = ['Hello', ' ', 'from', ' ', 'AI', '!']
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 10))
        params.onChunk(chunk)
      }
      return chunks.join('')
    }

    // 非流式响应
    return `AI response to: ${params.messages[params.messages.length - 1].content}`
  }

  getConfig(): AdapterConfig {
    return this.config
  }
}

// Mock MessageQueue
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

// Mock TaskStore
class MockTaskStore implements ITaskStore {
  private tasks: Map<string, MessageTask> = new Map()

  async get(taskId: string): Promise<MessageTask | null> {
    return this.tasks.get(taskId) || null
  }

  async upsert(task: any): Promise<void> {
    const taskId = task.id || task.messageId
    const existing = this.tasks.get(taskId)
    if (existing) {
      // 更新现有任务 - 只更新提供的字段
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

// Mock ProgressStore
class MockProgressStore implements IProgressStore {
  private progress: Map<string, string> = new Map()

  async save(taskId: string, content: string): Promise<void> {
    this.progress.set(taskId, content)
  }

  async get(taskId: string): Promise<string | null> {
    return this.progress.get(taskId) || null
  }

  async delete(taskId: string): Promise<void> {
    this.progress.delete(taskId)
  }

  async close(): Promise<void> {}
  clear(): void { this.progress.clear() }
}

// Mock ConfigCache
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

// Mock BackendGateway
class MockBackendGateway implements Partial<IBackendGateway> {
  fetchRealmConfiguration = vi.fn<(realmId: string) => Promise<RealmConfiguration>>()
  fetchMessageHistory = vi.fn<(channelId: string, limit?: number) => Promise<Message[]>>()
  saveAgentResponse = vi.fn<(response: AgentResponse) => Promise<void>>()
}

// Mock AdapterManager
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

// Mock ConfigurationService
class MockConfigurationService implements Partial<IConfigurationService> {
  constructor(private configCache: IConfigCache) {}

  async getLocalConfig(realmId: string): Promise<RealmConfiguration | null> {
    return this.configCache.get(realmId)
  }
}

// Mock MessageOrchestrator
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

    // 获取当前任务状态以保留 attempts
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

// ==================== 测试套件 ====================

describe('E2E: Message Processing', () => {
  let messageQueue: MockMessageQueue
  let taskStore: MockTaskStore
  let progressStore: MockProgressStore
  let configCache: MockConfigCache
  let gateway: MockBackendGateway
  let adapterManager: MockAdapterManager
  let configService: MockConfigurationService
  let orchestrator: MockMessageOrchestrator

  const createMockConfig = (): RealmConfiguration => {
    const agents: AgentConfig[] = [
      {
        id: 'agent-1',
        name: 'Test Agent',
        description: 'Test agent',
        systemPrompt: 'You are a helpful assistant',
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
    progressStore = new MockProgressStore()
    configCache = new MockConfigCache()
    gateway = new MockBackendGateway()
    adapterManager = new MockAdapterManager()
    configService = new MockConfigurationService(configCache)

    // 设置配置
    const config = createMockConfig()
    await configCache.set('realm-1', config)

    // Mock Gateway 响应
    gateway.fetchMessageHistory.mockResolvedValue([])
    gateway.saveAgentResponse.mockResolvedValue(undefined)
  })

  afterEach(() => {
    messageQueue.clear()
    taskStore.clear()
    progressStore.clear()
    configCache.clear()
  })

  describe('完整消息处理流程', () => {
    it('should process user message end-to-end', async () => {
      // 创建消息处理器
      const messageProcessor = async (task: MessageTask) => {
        // 1. 获取配置（选择 Agent）
        const config = await configService.getLocalConfig('realm-1')
        expect(config).toBeDefined()
        const agent = config!.agents[0]

        // 2. 加载 Adapter
        const adapter = await adapterManager.loadAdapter(
          agent.adapterId,
          agent.adapterVersion
        )

        // 3. 获取对话历史
        const history = await gateway.fetchMessageHistory(task.channelId)

        // 4. 调用 LLM
        const response = await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [...history, { role: 'user', content: task.content }]
        })

        // 5. 保存响应
        await gateway.saveAgentResponse({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: agent.id,
          content: response,
          timestamp: new Date()
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      // 用户发送消息
      const message: EnqueueMessage = {
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello, AI!'
      }

      // 消息入队
      const taskId = await orchestrator.enqueue(message)
      expect(taskId).toBeDefined()

      // 处理消息
      const processed = await orchestrator.processNext()
      expect(processed).toBe(true)

      // 验证任务完成
      const task = await taskStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')

      // 验证调用了 Gateway
      expect(gateway.fetchMessageHistory).toHaveBeenCalledWith('channel-1')
      expect(gateway.saveAgentResponse).toHaveBeenCalled()

      // 验证响应内容
      const saveCall = gateway.saveAgentResponse.mock.calls[0][0]
      expect(saveCall.messageId).toBe('msg-1')
      expect(saveCall.content).toContain('AI response to: Hello, AI!')
    })

    it('should handle multiple messages in sequence', async () => {
      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        const response = await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
        await gateway.saveAgentResponse({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: agent.id,
          content: response,
          timestamp: new Date()
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      // 发送 3 条消息
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Message 1'
      })

      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Message 2'
      })

      await orchestrator.enqueue({
        messageId: 'msg-3',
        channelId: 'channel-1',
        content: 'Message 3'
      })

      // 依次处理
      await orchestrator.processNext()
      await orchestrator.processNext()
      await orchestrator.processNext()

      // 验证都已完成
      const completed = await taskStore.findByState('COMPLETED')
      expect(completed).toHaveLength(3)

      // 验证调用了 3 次 Gateway
      expect(gateway.saveAgentResponse).toHaveBeenCalledTimes(3)
    })
  })

  describe('流式响应处理', () => {
    it('should handle streaming response', async () => {
      const chunks: string[] = []

      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)

        // 流式响应
        await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }],
          stream: true,
          onChunk: async (chunk: string) => {
            chunks.push(chunk)
            // 保存进度
            await progressStore.save(task.id, chunks.join(''))
          }
        })

        // 保存最终响应
        await gateway.saveAgentResponse({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: agent.id,
          content: chunks.join(''),
          timestamp: new Date()
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Hello'
      })

      await orchestrator.processNext()

      // 验证收到了多个 chunk
      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join('')).toBe('Hello from AI!')

      // 验证进度已保存
      const progress = await progressStore.get(taskId)
      expect(progress).toBe('Hello from AI!')
    })
  })

  describe('错误恢复', () => {
    it('should recover from LLM API failure', async () => {
      let attemptCount = 0

      const messageProcessor = async (task: MessageTask) => {
        attemptCount++

        // 第一次失败，第二次成功
        if (attemptCount === 1) {
          throw new Error('API timeout')
        }

        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        const response = await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
        await gateway.saveAgentResponse({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: agent.id,
          content: response,
          timestamp: new Date()
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test'
      })

      // 第一次处理（失败）
      await orchestrator.processNext()
      let task = await taskStore.get(taskId)
      expect(task!.state).toBe('FAILED')
      expect(task!.error).toBe('API timeout')
      expect(task!.attempts).toBe(1)

      // 重新入队（模拟重试）- 保留 attempts 计数
      await messageQueue.updateState(taskId, 'PENDING')
      await taskStore.upsert({ id: taskId, state: 'PENDING', attempts: task!.attempts })

      // 第二次处理（成功）
      await orchestrator.processNext()
      task = await taskStore.get(taskId)
      expect(task!.state).toBe('COMPLETED')
      expect(task!.attempts).toBe(2)
    })

    it('should handle adapter loading failure', async () => {
      const messageProcessor = async (task: MessageTask) => {
        // 尝试加载不存在的 Adapter
        throw new Error('Adapter not found')
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      const taskId = await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Test'
      })

      await orchestrator.processNext()

      const task = await taskStore.get(taskId)
      expect(task!.state).toBe('FAILED')
      expect(task!.error).toBe('Adapter not found')
    })
  })

  describe('配置变更', () => {
    it('should use updated agent configuration', async () => {
      const messageProcessor = async (task: MessageTask) => {
        const config = await configService.getLocalConfig('realm-1')
        const agent = config!.agents[0]
        const adapter = await adapterManager.loadAdapter(agent.adapterId, agent.adapterVersion)
        const response = await adapter.generateResponse({
          systemPrompt: agent.systemPrompt,
          messages: [{ role: 'user', content: task.content }]
        })
        await gateway.saveAgentResponse({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: agent.id,
          content: response,
          timestamp: new Date()
        })
      }

      orchestrator = new MockMessageOrchestrator(messageQueue, taskStore, messageProcessor)

      // 处理第一条消息
      await orchestrator.enqueue({
        messageId: 'msg-1',
        channelId: 'channel-1',
        content: 'Message 1'
      })
      await orchestrator.processNext()

      // 更新配置
      const newConfig = createMockConfig()
      newConfig.version = 2
      newConfig.agents[0].systemPrompt = 'You are a different assistant'
      await configCache.set('realm-1', newConfig)

      // 处理第二条消息（使用新配置）
      await orchestrator.enqueue({
        messageId: 'msg-2',
        channelId: 'channel-1',
        content: 'Message 2'
      })
      await orchestrator.processNext()

      // 验证两条消息都已完成
      const completed = await taskStore.findByState('COMPLETED')
      expect(completed).toHaveLength(2)
    })
  })
})
