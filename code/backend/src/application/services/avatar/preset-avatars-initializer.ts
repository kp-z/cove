/**
 * Preset Avatars Initializer
 *
 * 负责在系统启动时下载并保存预设头像到本地
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ILogger } from '../../interfaces/logger.interface';
import { PRESET_AVATARS, PresetAvatar } from './preset-avatars.config';

export interface PresetAvatarsInitializerOptions {
  storageRoot: string; // Path to .cove directory
  logger: ILogger;
}

export class PresetAvatarsInitializer {
  private readonly storageRoot: string;
  private readonly logger: ILogger;
  private readonly presetsDir: string;

  constructor(options: PresetAvatarsInitializerOptions) {
    this.storageRoot = options.storageRoot;
    this.logger = options.logger;
    this.presetsDir = path.join(this.storageRoot, 'storage', 'avatars', 'presets');
  }

  /**
   * 初始化所有预设头像
   * 下载并保存到本地，幂等操作
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing preset avatars...', {
      count: PRESET_AVATARS.length,
    });

    // 创建预设头像目录
    await fs.mkdir(this.presetsDir, { recursive: true });

    let downloadedCount = 0;
    let skippedCount = 0;

    for (const preset of PRESET_AVATARS) {
      try {
        const existed = await this.downloadPresetAvatar(preset);
        if (existed) {
          skippedCount++;
        } else {
          downloadedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to download preset avatar: ${preset.id}`, error as Error);
        // Continue with other presets even if one fails
      }
    }

    this.logger.info('Preset avatars initialization complete', {
      downloaded: downloadedCount,
      skipped: skippedCount,
      total: PRESET_AVATARS.length,
    });
  }

  /**
   * 下载单个预设头像
   * @returns true if file already existed, false if downloaded
   */
  private async downloadPresetAvatar(preset: PresetAvatar): Promise<boolean> {
    const filePath = path.join(this.presetsDir, `${preset.id}.svg`);

    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      this.logger.debug(`Preset avatar already exists: ${preset.id}`);
      return true;
    } catch {
      // File doesn't exist, download it
    }

    // 生成 DiceBear URL
    const dicebearUrl = `https://api.dicebear.com/9.x/${preset.style}/svg?seed=${preset.seed}`;

    this.logger.debug(`Downloading preset avatar: ${preset.id}`, {
      url: dicebearUrl,
    });

    // 下载 SVG
    const response = await fetch(dicebearUrl);
    if (!response.ok) {
      throw new Error(`Failed to download avatar: ${response.statusText}`);
    }

    const svgContent = await response.text();

    // 保存到本地
    await fs.writeFile(filePath, svgContent, 'utf-8');

    this.logger.info(`Preset avatar downloaded: ${preset.id}`);
    return false;
  }

  /**
   * 获取预设头像的本地路径
   */
  getPresetAvatarPath(presetId: string): string {
    return path.join('storage', 'avatars', 'presets', `${presetId}.svg`);
  }

  /**
   * 检查预设头像是否存在
   */
  async presetExists(presetId: string): Promise<boolean> {
    const filePath = path.join(this.presetsDir, `${presetId}.svg`);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
