/**
 * Task Dispatch Service
 *
 * Handles task scheduling and dispatching to available devices
 *
 * NOTE: This is a simplified version that works with the current TaskEntity.
 * Full implementation requires extending TaskEntity with dispatch-related fields.
 */

import { DeviceEntity } from '../../../domain/models/device/device.entity';
import { ITaskRepository } from '../../interfaces/repositories/task.repository.interface';
import { IDeviceRepository } from '../../interfaces/repositories/device.repository.interface';
import { DeviceConnectionManager } from '../../../infrastructure/websocket/device-connection-manager';
import { getRealmContext } from '../../context/realm-context-store';

export interface TaskDispatchResult {
  taskId: string;
  deviceId: string;
  dispatchedAt: Date;
}

export interface DeviceScore {
  device: DeviceEntity;
  score: number;
}

export class TaskDispatchService {
  constructor(
    private taskRepository: ITaskRepository,
    private deviceRepository: IDeviceRepository,
    private connectionManager: DeviceConnectionManager
  ) {}

  /**
   * Dispatch a task to an available device
   *
   * TODO: Extend TaskEntity to include:
   * - realmId (for realm isolation)
   * - agentId (for agent affinity)
   * - input (task input data)
   * - assignedDeviceId (assigned device)
   * - dispatchedAt (dispatch timestamp)
   */
  async dispatchTask(taskId: string, realmId: string): Promise<TaskDispatchResult> {
    // Get task
    const task = await this.taskRepository.findById(taskId, getRealmContext().realmId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Verify task is in todo state
    if (task.status !== 'todo') {
      throw new Error(`Task is not in todo state: ${task.status}`);
    }

    // Select best device for the realm
    const device = await this.selectDevice(realmId);
    if (!device) {
      throw new Error('No available devices for this realm');
    }

    // Send task to device via WebSocket
    await this.connectionManager.sendToDevice(device.device_id, {
      type: 'task.request',
      payload: {
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        channelId: task.channelId,
        projectId: task.projectId,
      },
    });

    // Update device active task count
    const updatedDevice = DeviceEntity.create({
      device_id: device.device_id,
      name: device.name,
      display_name: device.display_name,
      description: device.description,
      realm_id: device.realm_id,
      type: device.type,
      provider: device.provider,
      specs: device.specs,
      network: device.network,
      location: device.location,
      status: device.status,
      created_at: device.created_at,
      updated_at: new Date(),
      last_seen_at: device.last_seen_at,
      meta: device.meta,
      apiKeyHash: device.apiKeyHash,
      activeTaskCount: device.activeTaskCount + 1,
      totalTasksExecuted: device.totalTasksExecuted,
      averageTaskDuration: device.averageTaskDuration,
      lastExecutedAgentId: device.lastExecutedAgentId,
      region: device.region,
      tags: device.tags,
      cpuUsage: device.cpuUsage,
      memoryUsage: device.memoryUsage,
    });
    await this.deviceRepository.update(updatedDevice, device.realm_id);

    return {
      taskId: task.taskId,
      deviceId: device.device_id,
      dispatchedAt: new Date(),
    };
  }

  /**
   * Select the best device for a realm using scoring algorithm
   */
  private async selectDevice(realmId: string): Promise<DeviceEntity | null> {
    // Get all devices in the realm
    const allDevices = await this.deviceRepository.findAll();
    const realmDevices = allDevices.filter(d => d.realm_id === realmId);

    // Filter online devices
    const onlineDevices = realmDevices.filter(
      (d) => d.status === 'online' && this.connectionManager.isDeviceOnline(d.device_id)
    );

    if (onlineDevices.length === 0) {
      return null;
    }

    // Score each device
    const scores = onlineDevices.map((device) => ({
      device,
      score: this.calculateDeviceScore(device),
    }));

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    return scores[0]?.device || null;
  }

  /**
   * Calculate device score for task assignment
   *
   * Higher score = better match
   */
  private calculateDeviceScore(device: DeviceEntity): number {
    let score = 100;

    // Load factor (60% weight)
    score -= device.activeTaskCount * 10;
    score -= (device.cpuUsage || 0) * 0.3;
    score -= (device.memoryUsage || 0) * 0.1;

    // Performance factor (40% weight)
    if (device.averageTaskDuration) {
      const speedBonus = Math.max(0, 40 - device.averageTaskDuration / 10);
      score += speedBonus;
    }

    return Math.max(0, score);
  }

  /**
   * Handle task result from device
   */
  async handleTaskResult(
    taskId: string,
    deviceId: string
  ): Promise<void> {
    const task = await this.taskRepository.findById(taskId, getRealmContext().realmId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Update device statistics
    const device = await this.deviceRepository.findById(deviceId, getRealmContext().realmId);
    if (device) {
      const newActiveCount = Math.max(0, device.activeTaskCount - 1);
      const newTotalExecuted = device.totalTasksExecuted + 1;

      const updatedDevice = DeviceEntity.create({
        device_id: device.device_id,
        name: device.name,
        display_name: device.display_name,
        description: device.description,
        realm_id: device.realm_id,
        type: device.type,
        provider: device.provider,
        specs: device.specs,
        network: device.network,
        location: device.location,
        status: device.status,
        created_at: device.created_at,
        updated_at: new Date(),
        last_seen_at: device.last_seen_at,
        meta: device.meta,
        apiKeyHash: device.apiKeyHash,
        activeTaskCount: newActiveCount,
        totalTasksExecuted: newTotalExecuted,
        averageTaskDuration: device.averageTaskDuration,
        lastExecutedAgentId: device.lastExecutedAgentId,
        region: device.region,
        tags: device.tags,
        cpuUsage: device.cpuUsage,
        memoryUsage: device.memoryUsage,
      });

      await this.deviceRepository.update(updatedDevice, device.realm_id);
    }

    // TODO: Update task status when TaskEntity supports it
    // For now, we just update device stats
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, deviceId: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId, getRealmContext().realmId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Send cancel message to device
    await this.connectionManager.sendToDevice(deviceId, {
      type: 'task.cancel',
      payload: {
        taskId: task.taskId,
        reason: 'User cancelled',
      },
    });

    // Update device active task count
    const device = await this.deviceRepository.findById(deviceId, getRealmContext().realmId);
    if (device) {
      const updatedDevice = DeviceEntity.create({
        device_id: device.device_id,
        name: device.name,
        display_name: device.display_name,
        description: device.description,
        realm_id: device.realm_id,
        type: device.type,
        provider: device.provider,
        specs: device.specs,
        network: device.network,
        location: device.location,
        status: device.status,
        created_at: device.created_at,
        updated_at: new Date(),
        last_seen_at: device.last_seen_at,
        meta: device.meta,
        apiKeyHash: device.apiKeyHash,
        activeTaskCount: Math.max(0, device.activeTaskCount - 1),
        totalTasksExecuted: device.totalTasksExecuted,
        averageTaskDuration: device.averageTaskDuration,
        lastExecutedAgentId: device.lastExecutedAgentId,
        region: device.region,
        tags: device.tags,
        cpuUsage: device.cpuUsage,
        memoryUsage: device.memoryUsage,
      });
      await this.deviceRepository.update(updatedDevice, device.realm_id);
    }
  }
}
