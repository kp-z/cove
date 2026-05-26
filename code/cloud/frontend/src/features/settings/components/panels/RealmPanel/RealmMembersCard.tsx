import { UserPlus } from 'lucide-react';
import { Avatar } from '@/shared/components/display/Avatar';
import type { RealmMember } from './types';

interface RealmMembersCardProps {
  members: RealmMember[];
  isLoading: boolean;
  canManage: boolean;
  onAddMember: () => void;
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  admin: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  member: 'bg-green-500/20 text-green-300 border border-green-500/30',
  guest: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

export function RealmMembersCard({ members, isLoading, canManage, onAddMember }: RealmMembersCardProps) {
  return (
    <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Members</h3>
        {canManage && (
          <button
            onClick={onAddMember}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Add Member"
          >
            <UserPlus size={18} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-white/60">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-white/60">No members yet</div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <Avatar
                avatarUrl={member.avatar}
                name={member.displayName}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {member.displayName}
                </div>
                <div className="text-xs text-white/50 truncate">
                  @{member.username}
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded ${ROLE_BADGE[member.role] || ROLE_BADGE.guest}`}>
                {member.role.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
