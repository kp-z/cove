/**
 * Avatar Service - 头像管理服务
 *
 * 职责：
 * - 头像业务逻辑（上传、删除）
 * - 预设头像管理
 * - 头像类型管理（uploaded vs preset vs default）
 *
 * 依赖：
 * - StorageService: 处理文件存储
 */

import { ILogger } from '../../interfaces/logger.interface';
import { StorageService } from '../storage/storage.service';
import { PRESET_AVATARS } from './preset-avatars.config';

export type EntityType = 'user' | 'agent' | 'channel' | 'realm';

export interface UploadAvatarOptions {
  entityType: EntityType;
  entityId: string;
  fileBuffer: Buffer;
  mimeType: string;
}

export interface SetPresetAvatarOptions {
  entityType: EntityType;
  entityId: string;
  presetId: string;
}

export interface AvatarInfo {
  avatarUrl: string;
  avatarType: 'uploaded' | 'preset' | 'default';
}

export interface PresetAvatarInfo {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
}

export class AvatarService {
  private readonly maxAvatarSize = 2 * 1024 * 1024; // 2MB
  private readonly allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  constructor(
    private readonly storageService: StorageService,
    private readonly logger: ILogger
  ) {}

  /**
   * 上传头像
   */
  async uploadAvatar(options: UploadAvatarOptions): Promise<AvatarInfo> {
    const { entityType, entityId, fileBuffer, mimeType } = options;

    // 验证文件大小
    if (fileBuffer.length > this.maxAvatarSize) {
      throw new Error(
        `Avatar size exceeds maximum allowed size of ${this.maxAvatarSize / 1024 / 1024}MB`
      );
    }

    // 验证文件类型
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid avatar type. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // 使用 StorageService 上传文件
    const fileInfo = await this.storageService.upload({
      category: 'avatars',
      subPath: `${entityType}s/${entityId}`,
      fileBuffer,
      mimeType,
      fileName: `avatar.${this.getExtension(mimeType)}`,
      overwrite: true, // 覆盖旧头像
    });

    this.logger.info('Avatar uploaded successfully', {
      entityType,
      entityId,
      size: fileInfo.size,
    });

    return {
      avatarUrl: fileInfo.relativePath,
      avatarType: 'uploaded',
    };
  }

  /**
   * 设置预设头像
   */
  async setPresetAvatar(options: SetPresetAvatarOptions): Promise<AvatarInfo> {
    const { presetId } = options;

    // 验证预设头像是否存在
    const preset = PRESET_AVATARS.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Invalid preset avatar ID: ${presetId}`);
    }

    // 返回预设头像的路径
    const avatarUrl = `storage/avatars/presets/${presetId}.svg`;

    this.logger.info('Preset avatar set successfully', {
      entityType: options.entityType,
      entityId: options.entityId,
      presetId,
    });

    return {
      avatarUrl,
      avatarType: 'preset',
    };
  }

  /**
   * 删除上传的头像
   */
  async deleteUploadedAvatar(entityType: EntityType, entityId: string): Promise<void> {
    const avatarPath = `storage/avatars/${entityType}s/${entityId}`;

    await this.storageService.deleteDirectory(avatarPath);

    this.logger.info('Avatar deleted successfully', {
      entityType,
      entityId,
    });
  }

  /**
   * 获取头像 URL
   */
  getAvatarUrl(avatarType: string, avatarUrl?: string): string {
    if ((avatarType === 'uploaded' || avatarType === 'preset') && avatarUrl) {
      return this.storageService.getUrl(avatarUrl);
    }

    // 返回默认头像
    return this.getDefaultAvatarUrl();
  }

  /**
   * 获取所有预设头像
   */
  getPresetAvatars(): PresetAvatarInfo[] {
    return PRESET_AVATARS.map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      previewUrl: this.storageService.getUrl(`storage/avatars/presets/${preset.id}.svg`),
    }));
  }

  /**
   * 获取默认头像 URL（使用第一个预设头像）
   */
  private getDefaultAvatarUrl(): string {
    const firstPreset = PRESET_AVATARS[0];
    if (!firstPreset) {
      throw new Error('No preset avatars available');
    }
    return this.storageService.getUrl(`storage/avatars/presets/${firstPreset.id}.svg`);
  }

  /**
   * 根据 MIME 类型获取文件扩展名
   */
  private getExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
    };

    return mimeToExt[mimeType] || 'png';
  }
}
