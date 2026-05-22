import { useState } from 'react';
import { Upload, Trash2, Check } from 'lucide-react';
import { usePresetAvatars, useUploadAvatar, useSetPresetAvatar, useDeleteAvatar } from '@/lib/trpc/hooks/avatar.hooks';
import { useCurrentUser } from '@/core/auth/useCurrentUser';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/utils/cn';

interface AvatarSelectorProps {
  entityType: 'user' | 'agent' | 'channel' | 'realm';
  entityId: string;
  currentAvatar?: string;
  onClose?: () => void;
}

export function AvatarSelector({ entityType, entityId, currentAvatar, onClose }: AvatarSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const { user } = useCurrentUser();

  const { data: presets, isLoading } = usePresetAvatars(entityType);
  const uploadMutation = useUploadAvatar();
  const setPresetMutation = useSetPresetAvatar();
  const deleteMutation = useDeleteAvatar();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix

      try {
        await uploadMutation.mutateAsync({
          entityType,
          entityId,
          fileData: base64Data,
          mimeType: file.type,
        });
        onClose?.();
      } catch (error) {
        console.error('Failed to upload avatar:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = async (presetPath: string) => {
    setSelectedPreset(presetPath);
    try {
      await setPresetMutation.mutateAsync({
        entityType,
        entityId,
        presetPath,
      });
      onClose?.();
    } catch (error) {
      console.error('Failed to set preset avatar:', error);
      setSelectedPreset(null);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteMutation.mutateAsync({
        entityType,
        entityId,
      });
      onClose?.();
    } catch (error) {
      console.error('Failed to delete avatar:', error);
    }
  };

  const isCurrentAvatar = (presetPath: string) => {
    return currentAvatar?.includes(presetPath);
  };

  return (
    <div className="space-y-6">
      {/* Upload Custom Avatar */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Upload Custom Avatar</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <input
              id="avatar-upload"
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
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
            </Button>
          </div>

          {currentAvatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeleteAvatar}
              disabled={deleteMutation.isPending}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Avatar'}
            </Button>
          )}
        </div>
        <p className="text-xs text-white/50 mt-2">
          Max file size: 2MB. Supported formats: JPG, PNG, GIF, WebP
        </p>
      </div>

      {/* Preset Avatars */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Choose from Presets</h3>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-4 gap-3">
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
                      'hover:scale-105 hover:border-cyan-400/50',
                      isCurrent && 'border-cyan-400 ring-2 ring-cyan-400/20',
                      isSelected && 'border-cyan-400 ring-2 ring-cyan-400/20',
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
                      <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
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
    </div>
  );
}
