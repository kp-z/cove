import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChannelEntity } from '../../api/client';
import { getAvatarUrl } from '@/shared/utils/avatar';

interface ChannelAvatarProps {
  channel: ChannelEntity;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// Enhanced AvatarStack types
export interface AvatarStackItem {
  id: string;
  name: string;
  avatarUrl?: string;
  type: 'agent' | 'user';
  isRunning?: boolean;
}

interface AvatarStackProps {
  items: AvatarStackItem[];
  size?: 'sm' | 'md' | 'lg';
  max?: number;
  onClick?: (item: AvatarStackItem) => void;
}

// Legacy props for backward compatibility
interface LegacyAvatarStackProps {
  avatars: string[];
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

const offsetClasses = {
  sm: '-ml-2',
  md: '-ml-2',
  lg: '-ml-3',
};

const runningDotSize = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export function ChannelAvatar({ channel, size = 'md', onClick }: ChannelAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const sizeClass = sizeClasses[size];
  const avatarUrl = getAvatarUrl(channel.avatar);

  // If avatar URL exists and hasn't errored, show the image
  if (avatarUrl && !imageError) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1, zIndex: 10 }}
        whileTap={{ scale: 0.95 }}
        className={`${sizeClass} rounded-full overflow-hidden cursor-pointer transition-all ring-2 ring-background`}
      >
        <img
          src={avatarUrl}
          alt={channel.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </motion.button>
    );
  }

  // Check if channel name is an emoji
  const isEmoji = /^[\p{Emoji}]+$/u.test(channel.name);

  if (isEmoji) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1, zIndex: 10 }}
        whileTap={{ scale: 0.95 }}
        className={`${sizeClass} rounded-full bg-white/5 flex items-center justify-center cursor-pointer transition-all`}
      >
        <span className="text-2xl">{channel.name}</span>
      </motion.button>
    );
  }

  // For non-emoji channels, show first letter
  const initial = channel.name.charAt(0).toUpperCase();

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      className={`${sizeClass} rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center font-semibold text-white cursor-pointer transition-all ring-2 ring-background`}
    >
      {initial}
    </motion.button>
  );
}

export function AvatarStack(props: AvatarStackProps | LegacyAvatarStackProps) {
  // Check if using new API or legacy API
  if ('items' in props) {
    return <EnhancedAvatarStack {...props} />;
  }
  return <LegacyAvatarStack {...props} />;
}

// Enhanced AvatarStack with full features
function EnhancedAvatarStack({ items, size = 'sm', max = 3, onClick }: AvatarStackProps) {
  const sizeClass = sizeClasses[size];
  const offsetClass = offsetClasses[size];
  const dotSize = runningDotSize[size];

  if (items.length === 0) return null;

  const visible = items.slice(0, max);
  const overflow = items.length - max;

  return (
    <div className="flex items-center">
      {visible.map((item, index) => {
        const initial = item.name.charAt(0).toUpperCase();
        const bgGradient = item.type === 'agent'
          ? 'from-blue-500 to-purple-600'
          : 'from-cyan-500 to-teal-600';

        return (
          <div
            key={item.id}
            className={`relative ${index > 0 ? offsetClass : ''}`}
            style={{ zIndex: visible.length - index }}
          >
            <button
              onClick={() => onClick?.(item)}
              className={`${sizeClass} rounded-lg overflow-hidden flex-shrink-0 border border-white/10 ring-1 ring-[#0f111a] transition-transform hover:scale-110`}
              title={item.name}
            >
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white font-semibold`}>
                  {initial}
                </div>
              )}
            </button>
            {item.isRunning && (
              <div className={`absolute -top-0.5 -right-0.5 ${dotSize} rounded-full bg-emerald-400 ring-1 ring-[#0f111a] animate-pulse`} />
            )}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className={`${sizeClass} ${offsetClass} rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-[#0f111a] text-[9px] text-gray-400 font-bold flex-shrink-0`}
          style={{ zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// Legacy AvatarStack for backward compatibility
function LegacyAvatarStack({ avatars, size = 'md', onClick }: LegacyAvatarStackProps) {
  const sizeClass = sizeClasses[size];
  const offsetClass = offsetClasses[size];

  if (avatars.length === 0) return null;

  if (avatars.length === 1) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1, zIndex: 10 }}
        whileTap={{ scale: 0.95 }}
        className={`${sizeClass} rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center font-semibold text-white cursor-pointer transition-all ring-2 ring-background`}
      >
        {avatars[0].charAt(0).toUpperCase()}
      </motion.button>
    );
  }

  return (
    <div className="flex items-center">
      {avatars.slice(0, 3).map((avatar, index) => (
        <motion.button
          key={index}
          onClick={onClick}
          whileHover={{ scale: 1.1, zIndex: 10 }}
          whileTap={{ scale: 0.95 }}
          className={`${sizeClass} ${index > 0 ? offsetClass : ''} rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center font-semibold text-white cursor-pointer transition-all ring-2 ring-background relative`}
          style={{ zIndex: avatars.length - index }}
        >
          {avatar.charAt(0).toUpperCase()}
        </motion.button>
      ))}
      {avatars.length > 3 && (
        <motion.div
          whileHover={{ scale: 1.1, zIndex: 10 }}
          className={`${sizeClass} ${offsetClass} rounded-full bg-white/10 flex items-center justify-center font-semibold text-gray-400 ring-2 ring-background relative`}
          style={{ zIndex: 0 }}
        >
          +{avatars.length - 3}
        </motion.div>
      )}
    </div>
  );
}
