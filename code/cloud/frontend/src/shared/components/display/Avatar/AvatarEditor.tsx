import { useState } from 'react';
import { Upload, Trash2, Check } from 'lucide-react';
import { Avatar } from './Avatar';
import { useEntityAvatarData } from './useAvatarData';
import { Popover } from '@/shared/components/ui/Popover';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { usePresetAvatars, useUploadAvatar, useSetPresetAvatar, useDeleteAvatar } from '@/lib/trpc/hooks/avatar.hooks';
import { cn } from '@/shared/utils/cn';
import { env } from '@/core/config/env';

interface AvatarEditorProps {
  type: 'user' | 'agent' | 'channel' | 'realm';
  id: string;
  name: string;
  currentAvatar?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-20 h-20',
};

export function AvatarEditor({
  type,
  id,
  name,
  currentAvatar,
  size = 'xl',
  editable = true,
  className,
}: AvatarEditorProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Fetch avatar data using the hook
  const avatarData = useEntityAvatarData(type, id);

  const { data: presets, isLoading } = usePresetAvatars(type);
  const uploadMutation = useUploadAvatar();
  const setPresetMutation = useSetPresetAvatar();
  const deleteMutation = useDeleteAvatar();

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix

      try {
        await uploadMutation.mutateAsync({
          entityType: type,
          entityId: id,
          file: base64Data,
          mimeType: file.type,
        });
        setPopoverOpen(false);
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        alert('Failed to upload avatar');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle preset selection
  const handleSelectPreset = async (presetId: string) => {
    setSelectedPreset(presetId);
    try {
      await setPresetMutation.mutateAsync({
        entityType: type,
        entityId: id,
        presetId,
      });
      setPopoverOpen(false);
    } catch (error) {
      console.error('Failed to set preset avatar:', error);
      alert('Failed to set preset avatar');
      setSelectedPreset(null);
    }
  };

  // Handle delete avatar
  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to remove your avatar?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        entityType: type,
        entityId: id,
      });
      setPopoverOpen(false);
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      alert('Failed to delete avatar');
    }
  };

  const isCurrentAvatar = (presetId: string) => {
    const currentAvatarUrl = avatarData.avatarUrl;
    if (!currentAvatarUrl) return false;

    // Handle case where currentAvatarUrl is an object
    if (typeof currentAvatarUrl === 'object' && (currentAvatarUrl as any).url) {
      return (currentAvatarUrl as any).url.includes(presetId);
    }

    // Ensure currentAvatarUrl is a string
    if (typeof currentAvatarUrl !== 'string') {
      return false;
    }

    return currentAvatarUrl.includes(presetId);
  };

  // If not editable, just show the avatar
  if (!editable) {
    return (
      <Avatar
        src={currentAvatar || avatarData.avatarUrl}
        alt={name || avatarData.name}
        type={type}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'relative group cursor-pointer inline-block',
            className
          )}
        >
          {/* Avatar - 纯展示，保持独立 */}
          <Avatar
            src={currentAvatar || avatarData.avatarUrl}
            alt={name || avatarData.name}
            type={type}
            size={size}
          />

          {/* 悬停遮罩层 - 绝对定位覆盖，动态匹配形状 */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity",
            "ring-0 group-hover:ring-2 group-hover:ring-blue-400/50 transition-all",
            type === 'channel' ? 'rounded-lg' : 'rounded-full'
          )}>
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-4 h-4 text-white" />
              <span className="text-xs text-white font-medium">Edit</span>
            </div>
          </div>
        </button>
      </Popover.Trigger>
      <Popover.Content className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Choose Avatar</h3>
            <span className="text-xs text-gray-400">Click to select</span>
          </div>

          {/* Hidden file input */}
          <input
            id={`avatar-upload-${id}`}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadMutation.isPending}
          />

          {/* Avatar Grid: Upload + Presets */}
          {isLoading ? (
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="grid grid-cols-6 gap-3 pr-2">
                {/* Upload Button - First Item */}
                <button
                  type="button"
                  onClick={() => document.getElementById(`avatar-upload-${id}`)?.click()}
                  disabled={uploadMutation.isPending}
                  className={cn(
                    'w-12 h-12 rounded-full border-2 border-dashed border-white/30',
                    'hover:border-blue-400 hover:bg-blue-400/10 transition-all',
                    'flex items-center justify-center group',
                    uploadMutation.isPending && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Upload custom image"
                >
                  <Upload className="w-5 h-5 text-white/60 group-hover:text-blue-400 transition-colors" />
                </button>

                {/* Preset Avatars */}
                {presets?.map((preset) => {
                  const isCurrent = isCurrentAvatar(preset.id);
                  const isSelected = selectedPreset === preset.id;
                  // Add API URL prefix to previewUrl
                  const avatarUrl = preset.previewUrl.startsWith('http')
                    ? preset.previewUrl
                    : `${env.apiUrl}${preset.previewUrl}`;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      disabled={setPresetMutation.isPending}
                      className={cn(
                        'relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all',
                        'hover:scale-110 hover:shadow-lg',
                        isCurrent && 'border-blue-400 ring-2 ring-blue-400/30 shadow-lg shadow-blue-400/20',
                        isSelected && 'border-blue-400 ring-2 ring-blue-400/30',
                        !isCurrent && !isSelected && 'border-white/20 hover:border-blue-400/50'
                      )}
                      title={preset.name}
                    >
                      <img
                        src={avatarUrl}
                        alt={preset.description}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {(isCurrent || isSelected) && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Hint Text */}
          <p className="text-xs text-center text-gray-400 pt-2 border-t border-white/10">
            Upload your own image or choose from presets
          </p>
        </div>
      </Popover.Content>
    </Popover>
  );
}
