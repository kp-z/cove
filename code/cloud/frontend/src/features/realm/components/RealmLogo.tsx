/**
 * RealmLogo - Realm Logo 显示组件
 *
 * 优先使用 logo_url，失败时回退到项目默认 logo
 */

import { useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { branding } from '@/core/config';

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

// 默认项目 logo - 使用 branding 配置
const DEFAULT_LOGO = branding.logo.svg;

export function RealmLogo({ logoUrl, displayName, size = 'md', className }: RealmLogoProps) {
  const [imageError, setImageError] = useState(false);

  // 优先使用 realm 的 logo，失败则使用默认 logo
  const finalLogoUrl = (logoUrl && !imageError) ? logoUrl : DEFAULT_LOGO;

  return (
    <img
      src={finalLogoUrl}
      alt={displayName || 'Realm'}
      className={cn('rounded-lg object-cover flex-shrink-0', sizeClasses[size], className)}
      onError={() => setImageError(true)}
    />
  );
}
