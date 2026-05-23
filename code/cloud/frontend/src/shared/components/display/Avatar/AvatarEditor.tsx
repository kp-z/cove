import { useState } from 'react';
import { Upload, Trash2, Check } from 'lucide-react';
import { Avatar } from './Avatar';
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
    if (!currentAvatar) return false;

    // Handle case where currentAvatar is an object
    if (typeof currentAvatar === 'object' && (currentAvatar as any).url) {
      return (currentAvatar as any).url.includes(presetId);
    }

    // Ensure currentAvatar is a string
    if (typeof currentAvatar !== 'string') {
      return false;
    }

    return currentAvatar.includes(presetId);
  };

  // If not editable, just show the avatar
  if (!editable) {
    return (
      <div className={cn(sizeClasses[size], className)}>
        <Avatar type={type} id={id} name={name} size={size} />
      </div>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'relative group cursor-pointer rounded-full border-2 border-white/10 hover:border-white/20 transition-colors',
            sizeClasses[size],
            className
          )}
        >
          <Avatar type={type} id={id} name={name} size={size} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <span className="text-xs text-white font-medium">Edit</span>
          </div>
        </button>
      </Popover.Trigger>
      <Popover.Content className="w-72 p-4" align="start">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-sm font-semibold text-white">Choose Avatar</h3>

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
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-56">
              <div className="grid grid-cols-5 gap-2 pr-2">
                {/* Upload Button - First Item */}
                <button
                  type="button"
                  onClick={() => document.getElementById(`avatar-upload-${id}`)?.click()}
                  disabled={uploadMutation.isPending}
                  className={cn(
                    'w-12 h-12 rounded-full border-2 border-dashed border-white/20',
                    'hover:border-blue-400/50 hover:bg-white/5 transition-all',
                    'flex items-center justify-center',
                    uploadMutation.isPending && 'opacity-50 cursor-not-allowed'
                  )}
                  title="Upload custom image"
                >
                  <Upload className="w-5 h-5 text-white/60" />
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
                        'hover:scale-105 hover:border-blue-400/50',
                        isCurrent && 'border-blue-400 ring-2 ring-blue-400/20',
                        isSelected && 'border-blue-400 ring-2 ring-blue-400/20',
                        !isCurrent && !isSelected && 'border-white/10'
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
                        <div className="absolute inset-0 bg-blue-400/20 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-blue-400 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
