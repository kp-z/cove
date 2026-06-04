import { motion } from 'framer-motion';
import { branding } from '@/core/config';
import { AnimatedShinyText } from '@/shared/components/ui/animated-shiny-text';
import { useAuthStore } from '@/core/auth/authStore';
import { useRealm } from '@/lib/trpc/hooks/realm.hooks';
import { RealmLogo } from '@/features/realm/components/RealmLogo';
import { getAvatarUrl } from '@/shared/components/display/Avatar';

interface LogoProps {
  collapsed: boolean;
  onClick?: () => void;
  slogan?: string; // Optional custom slogan
}

export function Logo({ collapsed, onClick, slogan }: LogoProps) {
  const { currentRealmId } = useAuthStore();
  const { data: currentRealm } = useRealm(currentRealmId || '', {
    enabled: !!currentRealmId
  });

  const logoUrl = getAvatarUrl(currentRealm?.logo?.url || currentRealm?.logo_url);
  const displayName = currentRealm?.display_name || branding.app.name;
  const displaySlogan = slogan || currentRealm?.description || branding.app.slogan;

  return (
    <motion.button
      onClick={onClick}
      className="h-[46px] w-full flex items-center justify-start gap-3 rounded-xl"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <RealmLogo
        logoUrl={logoUrl}
        displayName={displayName}
        size="sm"
        className="w-7 h-7"
      />

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="flex flex-col items-start min-w-0 flex-1 overflow-hidden"
        >
          <AnimatedShinyText
            shimmerWidth={120}
            className="mx-0 w-full text-sm font-black tracking-wide uppercase italic leading-[0.85] text-white/90 whitespace-nowrap truncate text-left"
          >
            {displayName.toUpperCase()}
          </AnimatedShinyText>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="w-full text-[8px] font-black tracking-tight uppercase leading-tight text-blue-400/50 whitespace-nowrap truncate block text-left"
          >
            {displaySlogan.toUpperCase()}
          </motion.span>
        </motion.div>
      )}
    </motion.button>
  );
}
