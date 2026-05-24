import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChannelEntity } from '../../api/client';
import { getAvatarUrl } from '@/shared/utils/avatar';

interface ChannelAvatarProps {
  channel: ChannelEntity;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

interface AvatarStackProps {
  avatars: string[];
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
};

const offsetClasses = {
  sm: '-ml-2',
  md: '-ml-3',
  lg: '-ml-4',
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

export function AvatarStack({ avatars, size = 'md', onClick }: AvatarStackProps) {
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
