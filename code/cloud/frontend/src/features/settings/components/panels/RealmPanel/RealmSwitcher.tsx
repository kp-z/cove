import { Check, ChevronRight } from 'lucide-react';
import { getAvatarUrl } from '@/shared/utils/avatar';
import type { Realm } from '@/lib/trpc-types';

interface RealmSwitcherProps {
  realms: Realm[];
  currentRealmId: string;
  onSwitch: (realmId: string) => void;
}

export function RealmSwitcher({ realms, currentRealmId, onSwitch }: RealmSwitcherProps) {
  if (realms.length === 0) {
    return (
      <div className="text-center py-8 text-white/50 text-sm">
        No realms available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {realms.map((realm) => {
        const isCurrent = realm.realm_id === currentRealmId;

        return (
          <button
            key={realm.realm_id}
            onClick={() => !isCurrent && onSwitch(realm.realm_id)}
            disabled={isCurrent}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
              isCurrent
                ? 'bg-white/[0.08] border border-white/[0.12] cursor-default'
                : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.10]'
            }`}
          >
            {/* Logo */}
            {realm.logo_url ? (
              <img
                src={getAvatarUrl(realm.logo_url)}
                alt={realm.display_name}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold bg-gradient-to-br from-purple-500 to-pink-600 shrink-0">
                {(realm.display_name || 'R').charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">
                {realm.display_name}
              </p>
              {realm.description && (
                <p className="text-xs text-white/50 truncate">
                  {realm.description}
                </p>
              )}
            </div>

            {/* Status */}
            {isCurrent ? (
              <div className="flex items-center gap-1 text-xs font-medium text-green-400 shrink-0">
                <Check size={14} />
                <span>Current</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-white/50 shrink-0">
                <span>Switch</span>
                <ChevronRight size={14} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
