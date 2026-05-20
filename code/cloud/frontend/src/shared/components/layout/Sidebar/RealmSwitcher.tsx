import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealmList } from '@/lib/trpc/hooks/realm.hooks';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { getAvatarUrl } from '@/shared/utils/avatar';

interface RealmSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function RealmSwitcher({ open, onOpenChange, children }: RealmSwitcherProps) {
  const navigate = useNavigate();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { currentRealmId, setCurrentRealmId } = useAuthStore();
  const { data: realmsData } = useRealmList({ status: 'active' });

  const allRealms = realmsData?.realms || [];

  const handleSwitchRealm = (realmId: string) => {
    setCurrentRealmId(realmId);
    onOpenChange(false);
    window.location.reload();
  };

  const handleCreateRealm = () => {
    onOpenChange(false);
    navigate('/realm/create');
  };

  const handleImageError = (realmId: string) => {
    setImageErrors(prev => ({ ...prev, [realmId]: true }));
  };

  const renderRealmAvatar = (realm: any, isSelected: boolean) => {
    const avatarUrl = getAvatarUrl(realm.avatarUrl);
    const displayName = realm.displayName || realm.display_name || 'R';
    const hasError = imageErrors[realm.id];

    if (avatarUrl && !hasError) {
      return (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          onError={() => handleImageError(realm.id)}
        />
      );
    }

    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-600">
        {displayName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        {children}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="w-64 bg-[#111114] border border-white/[0.10] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 z-50"
        >
          {allRealms.length > 0 && (
            <>
              <ScrollArea className="max-h-64">
                <div className="py-1">
                  {allRealms.map((realm) => {
                    const isSelected = realm.id === currentRealmId;
                    const displayName = realm.displayName || realm.display_name || 'Realm';
                    const description = realm.description;

                    return (
                      <DropdownMenu.Item
                        key={realm.id}
                        onClick={isSelected ? undefined : () => handleSwitchRealm(realm.id)}
                        disabled={isSelected}
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer outline-none ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-400 cursor-default'
                            : 'text-white hover:bg-white/[0.08] focus:bg-white/[0.08]'
                        }`}
                      >
                        {renderRealmAvatar(realm, isSelected)}
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="text-sm font-semibold text-white max-w-full break-words">
                            {displayName}
                          </span>
                          {description && (
                            <span className="text-xs text-white/50 max-w-full break-words">
                              {description}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      </DropdownMenu.Item>
                    );
                  })}
                </div>
              </ScrollArea>

              <DropdownMenu.Separator className="h-px bg-white/[0.08] my-1" />
            </>
          )}

          <DropdownMenu.Item
            onClick={handleCreateRealm}
            className="flex items-center gap-3 px-3 py-2 text-sm text-cyan-400 hover:bg-white/[0.08] rounded-lg cursor-pointer outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <span className="font-medium">Create New Realm</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
