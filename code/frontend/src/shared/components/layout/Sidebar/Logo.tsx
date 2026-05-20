import { useState } from 'react';
import { motion } from 'framer-motion';
import coveLogo from '@/assets/cove-logo.svg';
import { branding } from '@/core/config';
import { AnimatedShinyText } from '@/shared/components/ui/animated-shiny-text';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealmList } from '@/lib/trpc/hooks/realm.hooks';
import { getAvatarUrl } from '@/shared/utils/avatar';
import { RealmSwitcher } from './RealmSwitcher';

interface LogoProps {
  collapsed: boolean;
  onClick?: () => void;
}

export function Logo({ collapsed }: LogoProps) {
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { currentRealmId } = useAuthStore();
  const { data: realmsData, isLoading } = useRealmList({ status: 'active' });

  const currentRealm = realmsData?.realms.find((r) => r.id === currentRealmId);

  // Get realm info or fallback to COVE branding
  const avatarUrl = currentRealm?.avatarUrl ? getAvatarUrl(currentRealm.avatarUrl) : null;
  const displayName = currentRealm?.displayName || currentRealm?.display_name || branding.app.name;
  const subtitle = currentRealm?.name || branding.app.slogan;

  if (isLoading) {
    return (
      <motion.button className="h-[46px] w-full flex items-center justify-center gap-3 rounded-xl">
        <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
        {!collapsed && <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />}
      </motion.button>
    );
  }

  return (
    <RealmSwitcher open={open} onOpenChange={setOpen}>
      <motion.button
        className="h-[46px] w-full flex items-center justify-center gap-3 rounded-xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Logo/Avatar */}
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 object-contain flex-shrink-0"
            onError={() => setImageError(true)}
          />
        ) : currentRealm ? (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <img
            src={coveLogo}
            alt={branding.logo.alt}
            className="w-7 h-7 object-contain flex-shrink-0"
          />
        )}

        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="flex flex-col items-start"
          >
            <AnimatedShinyText
              shimmerWidth={120}
              className="mx-0 max-w-none text-sm font-black tracking-wide uppercase italic leading-[0.85] text-white/90 whitespace-nowrap"
            >
              {displayName.toUpperCase()}
            </AnimatedShinyText>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-[8px] font-black tracking-tight uppercase leading-tight text-blue-400/50 whitespace-nowrap"
            >
              {subtitle.toUpperCase()}
            </motion.span>
          </motion.div>
        )}
      </motion.button>
    </RealmSwitcher>
  );
}
