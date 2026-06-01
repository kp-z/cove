/**
 * RealmLogo - Realm Logo 显示组件
 *
 * 优先使用 logo_url，失败时回退到项目默认 logo
 */

import { useState } from 'react';
import { cn } from '@/shared/lib/utils';

interface RealmLogoProps {
  logoUrl?: string;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-lg',
} as const;

// 默认项目 logo
const DEFAULT_LOGO = '/storage/assets/cove-logo.svg';

export function RealmLogo({ logoUrl, displayName, size = 'md', className }: RealmLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [defaultLogoError, setDefaultLogoError] = useState(false);

  // 优先使用 realm 的 logo
  if (logoUrl && !imageError) {
    return (
      <img
        src={logoUrl}
        alt={displayName || 'Realm'}
        className={cn('rounded-lg object-cover flex-shrink-0', sizeClasses[size], className)}
        onError={() => setImageError(true)}
      />
    );
  }

  // 回退到默认项目 logo
  if (!defaultLogoError) {
    return (
      <img
        src={DEFAULT_LOGO}
        alt={displayName || 'Realm'}
        className={cn('rounded-lg object-cover flex-shrink-0', sizeClasses[size], className)}
        onError={() => setDefaultLogoError(true)}
      />
    );
  }

  // 最终回退：首字母头像
  const firstLetter = displayName && displayName.length > 0
    ? displayName.charAt(0).toUpperCase()
    : '?';

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        'bg-gradient-to-br from-blue-500 to-purple-600',
        'text-white font-bold flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {firstLetter}
    </div>
  );
}
