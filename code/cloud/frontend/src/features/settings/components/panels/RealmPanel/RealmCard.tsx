import { Settings } from 'lucide-react';
import { getAvatarUrl } from '@/shared/utils/avatar';
import type { Realm } from '@/lib/trpc-types';

interface RealmCardProps {
  realm: Realm;
  userRole?: string;
  onEdit?: () => void;
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  admin: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  member: 'bg-green-500/20 text-green-300 border border-green-500/30',
  guest: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

export function RealmCard({ realm, userRole, onEdit }: RealmCardProps) {
  const badgeClass = userRole ? ROLE_BADGE[userRole] || ROLE_BADGE.guest : '';

  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
      <div className="flex items-start gap-4">
        {/* Logo */}
        {realm.logo_url ? (
          <img
            src={getAvatarUrl(realm.logo_url)}
            alt={realm.display_name}
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-semibold text-xl bg-gradient-to-br from-purple-500 to-pink-600 shrink-0">
            {(realm.display_name || 'R').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-white truncate">
              {realm.display_name}
            </h3>
            {userRole && (
              <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded ${badgeClass}`}>
                {userRole.toUpperCase()}
              </span>
            )}
          </div>
          {realm.description && (
            <p className="text-sm text-white/60 mb-3 line-clamp-2">
              {realm.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>Status: <span className="text-white/80 capitalize">{realm.status}</span></span>
            <span>•</span>
            <span>Visibility: <span className="text-white/80 capitalize">{realm.visibility}</span></span>
          </div>
        </div>

        {/* Edit Button */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="shrink-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Edit Realm"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
