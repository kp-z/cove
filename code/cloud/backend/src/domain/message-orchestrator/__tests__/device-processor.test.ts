/**
 * Device Processor Tests
 *
 * 测试 Device 模式处理器
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeviceProcessor } from '../device-processor'
import type { MessageTask } from '../message-orchestrator.interface'
import type { IMessageRepository } from '../../../application/interfaces/repositories/message.repository.interface'
import type { DeviceConnectionManager } from '../../../infrastructure/websocket/device-connection-manager'

describe('DeviceProcessor', () => {
  let processor: DeviceProcessor
  let mockDeviceConnectionManager: DeviceConnectionManager
  let mockMessageRepository: IMessageRepository

  const createMockTask = (): MessageTask => ({
    id: 'task-1',
    messageId: 'msg-1',
    channelId: 'channel-1',
    content: 'Hello',
    realmId: 'realm-1',
    state: 'PROCESSING',
    executionMode: 'device',
    attempts: 1,
    maxAttempts: 3,
    priority: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  beforeEach(() => {
    // Mock DeviceConnectionManager
    mockDeviceConnectionManager = {
      getOnlineDevices: vi.fn().mockReturnValue(['device-1', 'device-2']),
      getConnection: vi.fn().mockReturnValue({
        deviceId: 'device-1',
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
        metadata: { realmId: 'realm-1' }
      }),
      sendToDevice: vi.fn().mockResolvedValue(true)
    } as any

    // Mock MessageRepository
    mockMessageRepository = {
      findByChannel: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined)
    } as any

    processor = new DeviceProcessor(
      {
        deviceConnectionManager: mockDeviceConnectionManager,
        messageRepository: mockMessageRepository
      },
      {
        timeout: 5000,
        pollInterval: 100
      }
    )
  })

  describe('process', () => {
    it('should find available device and send message', async () => {
      const task = createMockTask()

      // Simulate device response
      setTimeout(() => {
        processor.handleDeviceResponse('msg-1', { success: true })
      }, 50)

      const result = await processor.process(task)

      expect(result.success).toBe(true)
      expect(mockDeviceConnectionManager.getOnlineDevices).toHaveBeenCalled()
      expect(mockDeviceConnectionManager.sendToDevice).toHaveBeenCalledWith(
        'device-1',
        expect.objectContaining({
          type: 'message.process',
          payload: expect.objectContaining({
            messageId: 'msg-1',
            channelId: 'channel-1',
            content: 'Hello'
          })
        })
      )
    })

    it('should return error when no device available', async () => {
      mockDeviceConnectionManager.getOnlineDevices = vi.fn().mockReturnValue([])

      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No available device')
    })

    it('should return error when send to device fails', async () => {
      mockDeviceConnectionManager.sendToDevice = vi.fn().mockResolvedValue(false)

      const task = createMockTask()

      const result = await processor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to send message')
    })

    it('should handle device response timeout', async () => {
      const shortTimeoutProcessor = new DeviceProcessor(
        {
          deviceConnectionManager: mockDeviceConnectionManager,
          messageRepository: mockMessageRepository
        },
        {
          timeout: 100
        }
      )

      const task = createMockTask()

      const result = await shortTimeoutProcessor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')
    })

    it('should match device by realmId', async () => {
      mockDeviceConnectionManager.getConnection = vi.fn()
        .mockReturnValueOnce({
          deviceId: 'device-1',
          metadata: { realmId: 'realm-2' }
        })
        .mockReturnValueOnce({
          deviceId: 'device-2',
          metadata: { realmId: 'realm-1' }
        })

      const task = createMockTask()

      setTimeout(() => {
        processor.handleDeviceResponse('msg-1', { success: true })
      }, 50)

      await processor.process(task)

      expect(mockDeviceConnectionManager.sendToDevice).toHaveBeenCalledWith(
        'device-2',
        expect.any(Object)
      )
    })

    it('should fallback to first device if no realm match', async () => {
      mockDeviceConnectionManager.getConnection = vi.fn().mockReturnValue({
        deviceId: 'device-1',
        metadata: { realmId: 'realm-other' }
      })

      const task = createMockTask()

      setTimeout(() => {
        processor.handleDeviceResponse('msg-1', { success: true })
      }, 50)

      await processor.process(task)

      expect(mockDeviceConnectionManager.sendToDevice).toHaveBeenCalledWith(
        'device-1',
        expect.any(Object)
      )
    })

    it('should handle device response with error', async () => {
      const task = createMockTask()

      setTimeout(() => {
        processor.handleDeviceResponse('msg-1', {
          success: false,
          error: 'Device processing failed'
        })
      }, 50)

      const result = await processor.process(task)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Device processing failed')
    })

    it('should clean up resources on destroy', async () => {
      const task = createMockTask()

      const processPromise = processor.process(task)

      // Destroy immediately
      setTimeout(() => processor.destroy(), 10)

      const result = await processPromise

      expect(result.success).toBe(false)
      expect(result.error).toContain('destroyed')
    }, 10000) // 增加超时时间

    it('should handle multiple concurrent tasks', async () => {
      const task1 = { ...createMockTask(), messageId: 'msg-1' }
      const task2 = { ...createMockTask(), messageId: 'msg-2' }

      setTimeout(() => {
        processor.handleDeviceResponse('msg-1', { success: true })
        processor.handleDeviceResponse('msg-2', { success: true })
      }, 50)

      const [result1, result2] = await Promise.all([
        processor.process(task1),
        processor.process(task2)
      ])

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    it('should include task metadata in device message', async () => {
      const task = {
        ...createMockTask(),
        metadata: { customField: 'value' }
      }

      setTimeout(() => {
        processor.handleDeviceResponse('msg-1', { success: true })
      }, 50)

      await processor.process(task)

      expect(mockDeviceConnectionManager.sendToDevice).toHaveBeenCalledWith(
        'device-1',
        expect.objectContaining({
          payload: expect.objectContaining({
            metadata: { customField: 'value' }
          })
        })
      )
    })
  })
})
