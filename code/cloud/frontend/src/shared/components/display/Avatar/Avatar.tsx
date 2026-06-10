import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { getIconForType, type EntityType, type ChannelType } from './utils.tsx';
import { AvatarStatusBadge, type AvatarStatus } from './AvatarStatusBadge';

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
  /**
   * Show running status indicator
   * @deprecated 改用 status（isRunning 等价于 status='online'）。保留以兼容现有调用（如 AvatarStack 透传）。
   */
  isRunning?: boolean;
  /** 右上角状态胶囊（领域无关的抽象状态，优先级高于 isRunning） */
  status?: AvatarStatus;
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
  status,
  className,
  onClick,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  // 步骤 1：计算生效状态 —— 显式 status 优先；否则回退到 isRunning（兼容旧调用，等价 online）
  const effectiveStatus: AvatarStatus | undefined = status ?? (isRunning ? 'online' : undefined);

  const sizeClass = sizeMap[size].container;
  const iconSize = sizeMap[size].icon;

  // 形状：Channel 使用圆角方形，其他使用圆形
  const shape = type === 'channel' ? 'rounded-lg' : 'rounded-full';

  // 降级：图片 → 类型图标
  const showIcon = !src || imageError;

  return (
    // 外层容器：relative 定位 + 形状（供 className 传入的 ring/border 呈圆形），
    // 关键：外层不再 overflow-hidden，否则会把溢出到边界外的状态胶囊一起裁掉。
    <div
      className={cn(
        'relative flex items-center justify-center flex-shrink-0',
        sizeClass,
        shape,
        onClick && 'cursor-pointer transition-transform hover:scale-105',
        className
      )}
      onClick={onClick}
      title={alt}
    >
      {/* 步骤 2：媒体层 —— 单独承担圆形裁剪与边框，避免裁掉右上角状态胶囊 */}
      <div
        className={cn(
          'w-full h-full overflow-hidden border border-white/10',
          shape
        )}
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
      </div>

      {/* 步骤 3：状态胶囊 —— 处于裁剪层之外，可正常溢出显示；online 与历史绿色脉冲圆点视觉一致 */}
      {effectiveStatus && <AvatarStatusBadge status={effectiveStatus} size={size} />}
    </div>
  );
}
