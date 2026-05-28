// Components
export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';
export { AvatarStack } from './AvatarStack';
export type { AvatarStackProps, AvatarStackItem } from './AvatarStack';
export { AvatarEditor } from './AvatarEditor';

// Hooks
export { useUserAvatarData, useAgentAvatarData, useEntityAvatarData } from './useAvatarData';
export type { AvatarData } from './useAvatarData';

// Utils
export { getAvatarUrl, getIconForType, getChannelIcon } from './utils.tsx';
export type { EntityType, ChannelType } from './utils.tsx';

