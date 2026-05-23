import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { Capsule } from '@/shared/components/ui/Capsule';
import { HoverGradient } from '@/shared/components/ui/HoverGradient';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  user: 'User',
  guest: 'Guest',
};

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  user: 'bg-green-500/20 text-green-300 border border-green-500/30',
  guest: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

interface UserAvatarProps {
  user: { username: string; avatar?: string };
  className?: string;
  showRing?: boolean;
}

function UserAvatar({ user, className = '', showRing = false }: UserAvatarProps) {
  const initial = user.username.charAt(0).toUpperCase();

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className={`${className} rounded-full object-cover ${showRing ? 'ring-1 ring-white/10' : ''}`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white font-semibold ${showRing ? 'ring-1 ring-white/10' : ''}`}
    >
      {initial}
    </div>
  );
}

export const UserMenu = React.memo(() => {
  const { t } = useTranslation('layout');
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  if (!isAuthenticated || !user) {
    return (
      <Capsule
        onClick={() => navigate('/login')}
        className="items-center justify-center gap-0 p-0 text-[12px] font-medium text-white/80 hover:text-white sm:justify-start sm:gap-2 sm:px-3"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
          <User size={14} />
        </div>
        <span className="hidden sm:inline">{t('userMenu.login')}</span>
      </Capsule>
    );
  }

  const displayName = user.username;
  const role = 'user';
  const roleDisplayLabel = ROLE_LABEL[role] ?? role;
  const badgeClass = ROLE_BADGE[role] ?? ROLE_BADGE.guest;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={displayName}
        aria-label={t('userMenu.ariaLabel')}
        aria-expanded={open}
        className={`group relative flex shrink-0 items-center gap-0 rounded-full p-0 transition-all duration-150 ease-out ${
          open ? 'bg-white/[0.08] border border-white/[0.12] ring-1 ring-white/20 pl-3 pr-2 gap-2' : 'bg-transparent border-0'
        } hover:bg-white/[0.04] hover:border hover:border-white/[0.08] hover:gap-2 hover:pl-3 hover:pr-2`}
      >
        <HoverGradient rounded="rounded-full" />
        <div className={`pointer-events-none max-w-0 min-w-0 flex flex-row items-center justify-start overflow-hidden pl-0 opacity-0 transition-all duration-150 ease-out ${
          open ? 'max-w-[120px] pl-1 opacity-100' : 'group-hover:max-w-[120px] group-hover:pl-1 group-hover:opacity-100'
        }`}>
          <p className="truncate text-left text-[11px] font-semibold leading-none text-white whitespace-nowrap">
            {displayName}
          </p>
        </div>
        <UserAvatar user={user} className="h-7 w-7 shrink-0" showRing />
      </button>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="w-52 bg-[#111114] border border-white/[0.10] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 z-50"
        >
          <div className="flex flex-col gap-0.5 py-2 px-3 border-b border-white/10 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{user.username}</span>
              <span className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium ${badgeClass}`}>
                {roleDisplayLabel}
              </span>
            </div>
            <span className="text-xs font-normal text-gray-400">{user.email}</span>
          </div>

          <DropdownMenu.Item
            onClick={() => navigate('/settings?tab=profile')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/90 rounded-lg cursor-pointer outline-none hover:bg-white/[0.08] focus:bg-white/[0.08]"
          >
            <Settings className="w-4 h-4" />
            {t('userMenu.accountSettings')}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 rounded-lg cursor-pointer outline-none hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-red-300"
          >
            <LogOut className="w-4 h-4" />
            {t('userMenu.logout')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

UserMenu.displayName = 'UserMenu';
