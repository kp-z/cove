/**
 * RealmCard - 统一的 Realm 卡片组件
 *
 * 支持多种 variant，确保 UI 统一
 *
 * 复用场景：
 * - FirstLoginWizard (variant='detailed')
 * - RealmSelector (variant='default')
 * - RealmSwitcher (variant='compact')
 */

import { cn } from '@/shared/lib/utils';
import { StatusIndicator } from '@/shared/components';
import type { StatusType } from '@/shared/components';
import { RealmLogo } from './RealmLogo';

export interface RealmInfo {
  realmId: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  status: string;
  deviceStatus: StatusType;
  isDefault?: boolean;
  lastAccessedAt?: Date;
}

interface RealmCardProps {
  realm: RealmInfo;
  selected?: boolean;
  onClick?: () => void;
  showDeviceStatus?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const variantClasses = {
  compact: 'p-2 min-h-[60px]',
  default: 'p-4 min-h-[100px]',
  detailed: 'p-6 min-h-[140px]',
} as const;

const iconSizes = {
  compact: 'w-8 h-8',
  default: 'w-12 h-12',
  detailed: 'w-16 h-16',
} as const;

export function RealmCard({
  realm,
  selected = false,
  onClick,
  showDeviceStatus = true,
  variant = 'default',
  className,
}: RealmCardProps) {
  return (
    <div
      className={cn(
        'realm-card',
        'rounded-lg border-2 cursor-pointer transition-all',
        'hover:shadow-md',
        'bg-white/5 backdrop-blur-sm', // 深色主题背景
        selected
          ? 'border-blue-500 bg-blue-500/20'
          : 'border-white/10 hover:border-white/20',
        realm.isDefault && 'border-blue-400/50 bg-blue-500/10',
        realm.deviceStatus === 'offline' && 'opacity-60',
        variantClasses[variant],
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Realm Logo */}
        <RealmLogo
          logoUrl={realm.logoUrl}
          displayName={realm.displayName}
          size={variant === 'compact' ? 'sm' : variant === 'detailed' ? 'lg' : 'md'}
        />

        {/* Realm Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'font-semibold truncate text-white', // 深色主题文字
                variant === 'compact' ? 'text-sm' : 'text-base'
              )}
            >
              {realm.displayName}
            </h3>
            {realm.isDefault && (
              <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded flex-shrink-0">
                Default
              </span>
            )}
          </div>
          <p
            className={cn(
              'text-white/60 truncate', // 深色主题副标题
              variant === 'compact' ? 'text-xs' : 'text-sm'
            )}
          >
            {realm.name}
          </p>
        </div>

        {/* Device Status */}
        {showDeviceStatus && (
          <div className="flex-shrink-0">
            <StatusIndicator
              status={realm.deviceStatus}
              size={variant === 'compact' ? 'sm' : 'md'}
              showLabel={variant !== 'compact'}
            />
          </div>
        )}
      </div>

      {/* Detailed Info */}
      {variant === 'detailed' && realm.lastAccessedAt && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-sm text-white/60">
            Last accessed: {formatDate(realm.lastAccessedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
