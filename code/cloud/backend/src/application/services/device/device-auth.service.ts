import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { DeviceEntity } from '../../../domain/models/device/device.entity';
import { IDeviceRepository } from '../../interfaces/repositories/device.repository.interface';
import { DeviceNotFoundError } from './device.errors';

const SALT_ROUNDS = 10;
const API_KEY_PREFIX = 'wn_'; // worknode prefix

export interface DeviceAuthResult {
  device: DeviceEntity;
  isValid: boolean;
}

export class DeviceAuthService {
  constructor(private deviceRepository: IDeviceRepository) {}

  /**
   * Generate a new API key for a device
   */
  async generateApiKey(deviceId: string, realmId: string): Promise<string> {
    // Generate random API key
    const randomPart = randomBytes(32).toString('hex');
    const apiKey = `${API_KEY_PREFIX}${randomPart}`;

    // Hash the API key
    const apiKeyHash = await bcrypt.hash(apiKey, SALT_ROUNDS);

    // Update device with hashed API key
    const device = await this.deviceRepository.findById(deviceId, realmId);
    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }

    // Create updated device with new API key hash
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
      apiKeyHash,
      activeTaskCount: device.activeTaskCount,
      totalTasksExecuted: device.totalTasksExecuted,
      averageTaskDuration: device.averageTaskDuration,
      lastExecutedAgentId: device.lastExecutedAgentId,
      region: device.region,
      tags: device.tags,
      cpuUsage: device.cpuUsage,
      memoryUsage: device.memoryUsage,
    });

    await this.deviceRepository.update(updatedDevice, device.realm_id);

    // Return the plain API key (only time it's visible)
    return apiKey;
  }

  /**
   * Authenticate a device using API key
   */
  async authenticateDevice(
    deviceId: string,
    apiKey: string,
    realmId: string
  ): Promise<DeviceAuthResult> {
    // Find device - use provided realmId instead of getRealmContext()
    const device = await this.deviceRepository.findById(deviceId, realmId);
    if (!device) {
      return {
        device: null as any,
        isValid: false,
      };
    }

    // Verify realm isolation
    if (device.realm_id !== realmId) {
      throw new Error('Device does not belong to this realm');
    }

    // Verify API key
    if (!device.apiKeyHash) {
      return {
        device,
        isValid: false,
      };
    }

    const isValid = await bcrypt.compare(apiKey, device.apiKeyHash);

    return {
      device,
      isValid,
    };
  }

  /**
   * Verify API key format
   */
  isValidApiKeyFormat(apiKey: string): boolean {
    return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length > 10;
  }

  /**
   * Revoke device API key
   */
  async revokeApiKey(deviceId: string, realmId: string): Promise<void> {
    const device = await this.deviceRepository.findById(deviceId, realmId);
    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }

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
      apiKeyHash: undefined,
      activeTaskCount: device.activeTaskCount,
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

  /**
   * Rotate device API key (revoke old, generate new)
   */
  async rotateApiKey(deviceId: string, realmId: string): Promise<string> {
    await this.revokeApiKey(deviceId, realmId);
    return this.generateApiKey(deviceId, realmId);
  }
}
