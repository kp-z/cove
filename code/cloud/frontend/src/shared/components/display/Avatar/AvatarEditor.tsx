import { useState } from 'react';
import { Upload, Trash2, Check } from 'lucide-react';
import { Avatar } from './Avatar';
import { Popover } from '@/shared/components/ui/Popover';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { usePresetAvatars, useUploadAvatar, useSetPresetAvatar, useDeleteAvatar } from '@/lib/trpc/hooks/avatar.hooks';
import { cn } from '@/shared/utils/cn';

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
          fileData: base64Data,
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
  const handleSelectPreset = async (presetPath: string) => {
    setSelectedPreset(presetPath);
    try {
      await setPresetMutation.mutateAsync({
        entityType: type,
        entityId: id,
        presetPath,
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

  const isCurrentAvatar = (presetPath: string) => {
    if (!currentAvatar) return false;

    // Handle case where currentAvatar is an object
    if (typeof currentAvatar === 'object' && (currentAvatar as any).url) {
      return (currentAvatar as any).url.includes(presetPath);
    }

    // Ensure currentAvatar is a string
    if (typeof currentAvatar !== 'string') {
      return false;
    }

    return currentAvatar.includes(presetPath);
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
      <Popover.Content className="w-80 p-4" align="start">
        <div className="space-y-4">
          {/* Upload Section */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Upload Custom</h3>
            <input
              id={`avatar-upload-${id}`}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadMutation.isPending}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadMutation.isPending}
              onClick={() => document.getElementById(`avatar-upload-${id}`)?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
            </Button>
            <p className="text-xs text-white/50 mt-1">
              Max 2MB • JPG, PNG, GIF, WebP
            </p>
          </div>

          {/* Preset Avatars */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Choose Preset</h3>
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="grid grid-cols-4 gap-2 pr-2">
                  {presets?.map((presetPath, index) => {
                    const isCurrent = isCurrentAvatar(presetPath);
                    const isSelected = selectedPreset === presetPath;
                    const avatarUrl = `${import.meta.env.VITE_API_URL}/${presetPath}`;

                    return (
                      <button
                        key={`${presetPath}-${index}`}
                        type="button"
                        onClick={() => handleSelectPreset(presetPath)}
                        disabled={setPresetMutation.isPending}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                          'hover:scale-105 hover:border-blue-400/50',
                          isCurrent && 'border-blue-400 ring-2 ring-blue-400/20',
                          isSelected && 'border-blue-400 ring-2 ring-blue-400/20',
                          !isCurrent && !isSelected && 'border-white/10'
                        )}
                      >
                        <img
                          src={avatarUrl}
                          alt="Preset avatar"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {(isCurrent || isSelected) && (
                          <div className="absolute inset-0 bg-blue-400/20 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
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

          {/* Remove Avatar */}
          {currentAvatar && (
            <>
              <div className="h-px bg-white/10" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteAvatar}
                disabled={deleteMutation.isPending}
                className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? 'Removing...' : 'Remove Avatar'}
              </Button>
            </>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
