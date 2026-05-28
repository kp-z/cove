/**
 * Configuration Validator
 *
 * 配置验证器：验证配置的完整性和格式
 */

import type { RealmConfiguration } from '../../infrastructure/gateway/backend-gateway.interface'
import crypto from 'crypto'

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 配置验证器
 */
export class ConfigurationValidator {
  /**
   * 验证配置对象
   */
  validate(config: RealmConfiguration): ValidationResult {
    const errors: string[] = []

    // 验证必填字段
    if (!config.realmId) {
      errors.push('realmId is required')
    }

    if (!config.name) {
      errors.push('name is required')
    }

    if (!config.settings) {
      errors.push('settings is required')
    }

    if (typeof config.version !== 'number' || config.version < 0) {
      errors.push('version must be a non-negative number')
    }

    if (!config.checksum) {
      errors.push('checksum is required')
    }

    // 验证 settings 格式
    if (config.settings && typeof config.settings !== 'object') {
      errors.push('settings must be an object')
    }

    // 验证日期
    if (!(config.createdAt instanceof Date)) {
      errors.push('createdAt must be a Date')
    }

    if (!(config.updatedAt instanceof Date)) {
      errors.push('updatedAt must be a Date')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 计算配置校验和
   */
  calculateChecksum(config: Omit<RealmConfiguration, 'checksum'>): string {
    const data = JSON.stringify({
      realmId: config.realmId,
      name: config.name,
      settings: config.settings,
      version: config.version
    })

    return crypto.createHash('md5').update(data).digest('hex')
  }

  /**
   * 验证校验和
   */
  verifyChecksum(config: RealmConfiguration): boolean {
    const calculated = this.calculateChecksum(config)
    return calculated === config.checksum
  }
}
