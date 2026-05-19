/**
 * IDeviceRepository - Device Repository 接口
 *
 * 职责：
 * - 提供 Device 实体的持久化操作
 * - 支持多 Server 数据隔离
 * - 提供查询方法（按 ID、server、status 等）
 */

import { DeviceEntity, DeviceStatus } from '../../../domain/models/device/device.entity';

export interface IDeviceRepository {
  /**
   * 根据 ID 查找 Device
   * @param deviceId - Device ID
   * @returns Device 实体，如果不存在返回 null
   */
  findById(deviceId: string): Promise<DeviceEntity | null>;

  /**
   * 根据 Server ID 查找所有 Device
   * @param serverId - Server ID
   * @returns Device 实体数组
   */
  findByServer(serverId: string): Promise<DeviceEntity[]>;

  /**
   * 根据状态查找 Device
   * @param status - Device 状态
   * @returns Device 实体数组
   */
  findByStatus(status: DeviceStatus): Promise<DeviceEntity[]>;

  /**
   * 根据 Server ID 和状态查找 Device
   * @param serverId - Server ID
   * @param status - Device 状态
   * @returns Device 实体数组
   */
  findByServerAndStatus(serverId: string, status: DeviceStatus): Promise<DeviceEntity[]>;

  /**
   * 查找所有 Device
   * @returns Device 实体数组
   */
  findAll(): Promise<DeviceEntity[]>;

  /**
   * 保存新 Device
   * @param device - Device 实体
   * @param serverId - Server ID（用于数据隔离）
   */
  save(device: DeviceEntity, serverId: string): Promise<void>;

  /**
   * 更新 Device
   * @param device - Device 实体
   * @param serverId - Server ID（用于数据隔离）
   */
  update(device: DeviceEntity, serverId: string): Promise<void>;

  /**
   * 删除 Device
   * @param deviceId - Device ID
   */
  delete(deviceId: string): Promise<void>;

  /**
   * 检查 Device 是否存在
   * @param deviceId - Device ID
   * @returns 是否存在
   */
  exists(deviceId: string): Promise<boolean>;
}
