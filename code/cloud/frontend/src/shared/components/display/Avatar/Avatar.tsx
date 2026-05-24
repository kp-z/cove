import { getAgentInitials } from '@/features/agent/utils/avatar';
import { cn } from '@/shared/utils/cn';

/**
 * Pure presentational Avatar component
 *
 * This component is responsible ONLY for displaying an avatar.
 * Data fetching should be handled by the parent component.
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data: user } = useUser(userId);
 *   return (
 *     <Avatar
 *       avatarUrl={user?.avatar}
 *       name={user?.displayName || user?.username || 'Unknown'}
 *       size="md"
 *     />
 *   );
 * }
 * ```
 */
export interface AvatarProps {
  /** Avatar image URL (optional - will show initials if not provided) */
  avatarUrl?: string | null;
  /** Display name (used for initials fallback) */
  name: string;
  /** Avatar size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ avatarUrl, name, size = 'md', className }: AvatarProps) {
  const initials = getAgentInitials(name);

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
