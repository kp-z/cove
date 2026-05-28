import { Avatar } from './Avatar';
import { cn } from '@/shared/utils/cn';
import type { EntityType } from './utils.tsx';

export interface AvatarStackItem {
  id: string;
  name: string;
  avatarUrl?: string | null;
  type: EntityType;
  isRunning?: boolean;
}

export interface AvatarStackProps {
  items: AvatarStackItem[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  max?: number;
  onClick?: (item: AvatarStackItem) => void;
}

const sizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
};

const offsetClasses = {
  xs: '-ml-1',
  sm: '-ml-2',
  md: '-ml-2',
  lg: '-ml-3',
  xl: '-ml-4',
};

/**
 * 多头像堆叠组件
 *
 * 特性：
 * - 支持最多显示 N 个头像
 * - 超出部分显示 +N
 * - 支持运行状态指示
 * - 支持点击事件
 *
 * @example
 * ```tsx
 * <AvatarStack
 *   items={[
 *     { id: '1', name: 'Agent 1', type: 'agent', avatarUrl: '...', isRunning: true },
 *     { id: '2', name: 'User 1', type: 'user', avatarUrl: '...' },
 *   ]}
 *   size="sm"
 *   max={3}
 *   onClick={(item) => console.log(item)}
 * />
 * ```
 */
export function AvatarStack({
  items,
  size = 'sm',
  max = 3,
  onClick,
}: AvatarStackProps) {
  if (items.length === 0) return null;

  const visible = items.slice(0, max);
  const overflow = items.length - max;
  const offsetClass = offsetClasses[size];

  return (
    <div className="flex items-center">
      {visible.map((item, index) => (
        <div
          key={item.id}
          className={cn(index > 0 && offsetClass)}
          style={{ zIndex: visible.length - index }}
        >
          <Avatar
            src={item.avatarUrl}
            alt={item.name}
            type={item.type}
            size={size}
            isRunning={item.isRunning}
            onClick={() => onClick?.(item)}
            className="ring-1 ring-[#0f111a] border border-white/10"
          />
        </div>
      ))}

      {overflow > 0 && (
        <div
          className={cn(
            'flex items-center justify-center bg-white/10 ring-1 ring-[#0f111a] text-gray-400 font-bold flex-shrink-0 rounded-lg',
            sizeClasses[size],
            'text-[9px]',
            offsetClass
          )}
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
