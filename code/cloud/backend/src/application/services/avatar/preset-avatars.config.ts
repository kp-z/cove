/**
 * Preset Avatars Configuration
 *
 * 定义 10 个预设头像,系统启动时会下载并保存到本地
 */

export interface PresetAvatar {
  id: string;
  name: string;
  style: string;
  seed: string;
  description: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'preset-1',
    name: 'Robot Blue',
    style: 'bottts',
    seed: 'preset-robot-blue',
    description: 'Blue robot avatar',
  },
  {
    id: 'preset-2',
    name: 'Robot Red',
    style: 'bottts',
    seed: 'preset-robot-red',
    description: 'Red robot avatar',
  },
  {
    id: 'preset-3',
    name: 'Avatar Classic',
    style: 'avataaars',
    seed: 'preset-avatar-classic',
    description: 'Classic cartoon avatar',
  },
  {
    id: 'preset-4',
    name: 'Avatar Cool',
    style: 'avataaars',
    seed: 'preset-avatar-cool',
    description: 'Cool cartoon avatar',
  },
  {
    id: 'preset-5',
    name: 'Pixel Art',
    style: 'pixel-art',
    seed: 'preset-pixel-art',
    description: 'Pixel art style avatar',
  },
  {
    id: 'preset-6',
    name: 'Adventurer',
    style: 'adventurer',
    seed: 'preset-adventurer',
    description: 'Adventurer style avatar',
  },
  {
    id: 'preset-7',
    name: 'Big Smile',
    style: 'big-smile',
    seed: 'preset-big-smile',
    description: 'Big smile avatar',
  },
  {
    id: 'preset-8',
    name: 'Lorelei',
    style: 'lorelei',
    seed: 'preset-lorelei',
    description: 'Lorelei style avatar',
  },
  {
    id: 'preset-9',
    name: 'Micah',
    style: 'micah',
    seed: 'preset-micah',
    description: 'Micah style avatar',
  },
  {
    id: 'preset-10',
    name: 'Shapes',
    style: 'shapes',
    seed: 'preset-shapes',
    description: 'Abstract shapes avatar',
  },
];
