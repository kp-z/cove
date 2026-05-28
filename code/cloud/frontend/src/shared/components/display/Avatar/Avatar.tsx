import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { getIconForType, type EntityType, type ChannelType } from './utils.tsx';

/**
 * 统一的 Avatar 组件
 *
 * 降级策略：图片 → 类型图标
 * - User: User 图标
 * - Agent: Bot 图标
 * - Channel: Hash/Lock/MessageSquare 图标
 * - Realm: Building 图标
 *
 * 形状规则：
 * - Channel: 圆角方形 (rounded-lg)
 * - 其他: 圆形 (rounded-full)
 *
 * @example
 * ```tsx
 * <Avatar
 *   src={avatarUrl}
 *   alt="John Doe"
 *   type="user"
 *   size="md"
 * />
 * ```
 */
export interface AvatarProps {
  /** Avatar image URL */
  src?: string | null;
  /** Alt text */
  alt: string;
  /** Entity type (determines icon fallback and shape) */
  type: EntityType;
  /** Channel type (only needed when type='channel') */
  channelType?: ChannelType;
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show running status indicator */
  isRunning?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const sizeMap = {
  xs: { container: 'w-5 h-5', icon: 10 },
  sm: { container: 'w-8 h-8', icon: 12 },
  md: { container: 'w-10 h-10', icon: 16 },
  lg: { container: 'w-12 h-12', icon: 20 },
  xl: { container: 'w-16 h-16', icon: 24 },
};

export function Avatar({
  src,
  alt,
  type,
  channelType = 'public',
  size = 'md',
  isRunning = false,
  className,
  onClick,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClass = sizeMap[size].container;
  const iconSize = sizeMap[size].icon;

  // 形状：Channel 使用圆角方形，其他使用圆形
  const shape = type === 'channel' ? 'rounded-lg' : 'rounded-full';

  // 降级：图片 → 类型图标
  const showIcon = !src || imageError;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden flex-shrink-0',
        'border border-white/10',
        sizeClass,
        shape,
        onClick && 'cursor-pointer transition-transform hover:scale-105',
        className
      )}
      onClick={onClick}
      title={alt}
    >
      {showIcon ? (
        <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500">
          {getIconForType(type, channelType, iconSize)}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {/* Running indicator */}
      {isRunning && (
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#0f111a] animate-pulse" />
      )}
    </div>
  );
}
