import { useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { getAvatarUrl } from '@/shared/components/display/Avatar';
import type { Realm } from '@/lib/trpc-types';

interface RealmSelectorDropdownProps {
  currentRealm: Realm | null;
  allRealms: Realm[];
  onSwitch: (realmId: string) => void;
  onCreateClick: () => void;
  canEdit: boolean;
}

export function RealmSelectorDropdown({
  currentRealm,
  allRealms,
  onSwitch,
  onCreateClick,
  canEdit,
}: RealmSelectorDropdownProps) {
  const [open, setOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (realmId: string) => {
    setImageErrors(prev => ({ ...prev, [realmId]: true }));
  };

  const handleSwitchRealm = (realmId: string) => {
    onSwitch(realmId);
    setOpen(false);
  };

  const handleCreateClick = () => {
    onCreateClick();
    setOpen(false);
  };

  const renderRealmLogo = (realm: Realm) => {
    const logoUrl = realm.logo?.url || realm.logo_url;
    const displayName = realm.display_name || 'R';
    const hasError = imageErrors[realm.realm_id];

    if (logoUrl && !hasError) {
      return (
        <img
          src={getAvatarUrl(logoUrl)}
          alt={displayName}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          onError={() => handleImageError(realm.realm_id)}
        />
      );
    }

    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-600">
        {displayName.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="w-full max-w-md h-12 flex items-center gap-3 px-4 bg-white/[0.02] border border-white/[0.10] rounded-lg hover:bg-white/[0.05] hover:border-white/[0.15] transition-colors"
        >
          {currentRealm ? (
            <>
              {renderRealmLogo(currentRealm)}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate">
                  {currentRealm.display_name}
                </p>
                {currentRealm.description && (
                  <p className="text-xs text-white/50 truncate">
                    {currentRealm.description}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 text-left">
              <p className="text-sm text-white/60">Select a realm</p>
            </div>
          )}
          <ChevronDown className="w-4 h-4 text-white/60 flex-shrink-0" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="w-80 bg-[#111114] border border-white/[0.10] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 z-50"
        >
          {allRealms.length > 0 && (
            <>
              <ScrollArea className="max-h-96">
                <div className="py-1">
                  {allRealms.map((realm) => {
                    const isSelected = realm.realm_id === currentRealm?.realm_id;

                    return (
                      <DropdownMenu.Item
                        key={realm.realm_id}
                        onClick={isSelected ? undefined : () => handleSwitchRealm(realm.realm_id)}
                        disabled={isSelected}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-400 cursor-default'
                            : 'text-white hover:bg-white/[0.08] focus:bg-white/[0.08]'
                        }`}
                      >
                        {renderRealmLogo(realm)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {realm.display_name}
                          </p>
                          {realm.description && (
                            <p className="text-xs text-white/50 line-clamp-2 mt-0.5">
                              {realm.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        )}
                      </DropdownMenu.Item>
                    );
                  })}
                </div>
              </ScrollArea>

              {canEdit && <DropdownMenu.Separator className="h-px bg-white/[0.08] my-1" />}
            </>
          )}

          {canEdit && (
            <DropdownMenu.Item
              onClick={handleCreateClick}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-cyan-400 hover:bg-cyan-500/10 rounded-lg cursor-pointer outline-none transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-medium">Create New Realm</span>
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
