/**
 * DeviceLifecycleManager 单元测试
 *
 * 核心场景：启动阶段第一次连接 backend 失败时，start() 不应该致命退出，
 * 而是应该 warn 后继续（交给 ConnectionManager 内部已有的 scheduleReconnect()
 * 后台自动重连）。同时验证 getState() 能正确反映"未真正连上"的降级状态。
 *
 * ConnectionManager / HealthMonitor 依赖真实 WebSocket / 网络请求，
 * 这里用 vi.mock() 替换为可控的假实现，不依赖真实端口。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ITaskStore, TaskRecord } from '../../infrastructure/storage/task-store.interface'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockConnectionGetState = vi.fn()
const mockIsConnected = vi.fn()

vi.mock('./connection-manager', () => {
  class FakeConnectionManager {
    connect = mockConnect
    disconnect = mockDisconnect
    getState = mockConnectionGetState
    isConnected = mockIsConnected
  }
  return { ConnectionManager: FakeConnectionManager }
})

const mockHealthStart = vi.fn()
const mockHealthStop = vi.fn()
const mockGetHealth = vi.fn()

vi.mock('./health-monitor', () => {
  class FakeHealthMonitor {
    start = mockHealthStart
    stop = mockHealthStop
    getHealth = mockGetHealth
  }
  return { HealthMonitor: FakeHealthMonitor }
})

// 必须在 vi.mock() 之后再 import 被测模块，确保 mock 生效
import { DeviceLifecycleManager } from './device-lifecycle-manager'

/**
 * 内存任务存储（recoverPendingTasks() 依赖，默认无待恢复任务）
 */
class FakeTaskStore implements ITaskStore {
  findByStateResult: TaskRecord[] = []
  findByStateError: Error | null = null

  async upsert(): Promise<void> {}
  async get(): Promise<TaskRecord | null> {
    return null
  }
  async findByState(): Promise<TaskRecord[]> {
    if (this.findByStateError) {
      throw this.findByStateError
    }
    return this.findByStateResult
  }
  async delete(): Promise<void> {}
  async clear(): Promise<void> {}
  async close(): Promise<void> {}
}

function createManager(taskStore: FakeTaskStore) {
  return new DeviceLifecycleManager(
    {
      deviceId: 'test-device',
      connection: { url: 'ws://localhost:3002/trpc' },
    },
    {} as BackendGateway,
    taskStore
  )
}

describe('DeviceLifecycleManager', () => {
  let taskStore: FakeTaskStore

  beforeEach(() => {
    taskStore = new FakeTaskStore()
    vi.clearAllMocks()
    // 默认：连接成功、心跳启动正常
    mockConnect.mockResolvedValue(undefined)
    mockConnectionGetState.mockReturnValue('CONNECTED')
    mockIsConnected.mockReturnValue(true)
  })

  describe('start()', () => {
    it('连接失败时不应该抛错，而是 warn 后继续启动', async () => {
      mockConnect.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3002'))

      const manager = createManager(taskStore)

      await expect(manager.start()).resolves.toBeUndefined()

      // 即使未连接成功，健康监控仍应正常启动（与 configSync 失败仍继续的既有风格一致）
      expect(mockHealthStart).toHaveBeenCalledTimes(1)
    })

    it('连接失败后 getState() 应报告 DEGRADED，而不是虚报 RUNNING', async () => {
      mockConnect.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3002'))
      // 连接失败后，ConnectionManager 内部会把状态置为 DISCONNECTED，
      // 并在后台 scheduleReconnect() 中等待下一次重试
      mockConnectionGetState.mockReturnValue('DISCONNECTED')

      const manager = createManager(taskStore)
      await manager.start()

      expect(manager.getState()).toBe('DEGRADED')
    })

    it('连接成功时行为保持不变：resolve 且 getState() 返回 RUNNING', async () => {
      const manager = createManager(taskStore)

      await expect(manager.start()).resolves.toBeUndefined()

      expect(mockConnect).toHaveBeenCalledTimes(1)
      expect(mockHealthStart).toHaveBeenCalledTimes(1)
      expect(manager.getState()).toBe('RUNNING')
    })

    it('连接后台重连成功后，getState() 应该从 DEGRADED 恢复为 RUNNING', async () => {
      mockConnect.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3002'))
      mockConnectionGetState.mockReturnValue('DISCONNECTED')

      const manager = createManager(taskStore)
      await manager.start()
      expect(manager.getState()).toBe('DEGRADED')

      // 模拟 ConnectionManager 内部的 scheduleReconnect() 后台重连成功
      mockConnectionGetState.mockReturnValue('CONNECTED')
      expect(manager.getState()).toBe('RUNNING')
    })

    it('连接失败之外的其他致命错误（如恢复任务失败）仍应继续向上抛错', async () => {
      taskStore.findByStateError = new Error('database is locked')

      const manager = createManager(taskStore)

      await expect(manager.start()).rejects.toThrow('database is locked')
      // 连接失败不该被"吞掉所有错误"误伤：不应该因为这次改动就跳过了恢复任务
      expect(mockConnect).not.toHaveBeenCalled()
      expect(manager.getState()).toBe('ERROR')
    })
  })
})
