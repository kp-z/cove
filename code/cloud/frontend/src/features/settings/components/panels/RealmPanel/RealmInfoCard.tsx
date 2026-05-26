import { Settings } from 'lucide-react';
import { getAvatarUrl } from '@/shared/utils/avatar';
import type { Realm } from '@/lib/trpc-types';

interface RealmInfoCardProps {
  realm: Realm;
  onEdit?: () => void;
  canEdit: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/20 text-green-300 border border-green-500/30',
  suspended: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  archived: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const VISIBILITY_BADGE: Record<string, string> = {
  public: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  private: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
};

export function RealmInfoCard({ realm, onEdit, canEdit }: RealmInfoCardProps) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
      <div className="flex items-start gap-4">
        {/* Logo */}
        {realm.logo_url ? (
          <img
            src={getAvatarUrl(realm.logo_url)}
            alt={realm.display_name}
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-semibold text-2xl bg-gradient-to-br from-purple-500 to-pink-600 shrink-0">
            {(realm.display_name || 'R').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-white truncate">
              {realm.display_name}
            </h3>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded ${STATUS_BADGE[realm.status] || STATUS_BADGE.active}`}>
              {realm.status.toUpperCase()}
            </span>
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded ${VISIBILITY_BADGE[realm.visibility] || VISIBILITY_BADGE.private}`}>
              {realm.visibility.toUpperCase()}
            </span>
          </div>
          {realm.description && (
            <p className="text-sm text-white/60 mb-3 line-clamp-2">
              {realm.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>ID: <span className="text-white/80 font-mono">{realm.realm_id}</span></span>
            <span>•</span>
            <span>Name: <span className="text-white/80">{realm.name}</span></span>
          </div>
        </div>

        {/* Edit Button */}
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="shrink-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Edit Realm"
          >
            <Settings size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
