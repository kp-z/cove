import { motion } from 'framer-motion';
import coveLogo from '@/assets/cove-logo.svg';
import { branding } from '@/core/config';
import { AnimatedShinyText } from '@/shared/components/ui/animated-shiny-text';

interface LogoProps {
  collapsed: boolean;
  onClick?: () => void;
}

export function Logo({ collapsed, onClick }: LogoProps) {
  return (
    <motion.button
      onClick={onClick}
      className="h-[46px] w-full flex items-center justify-center gap-3 rounded-xl"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <img
        src={coveLogo}
        alt={branding.logo.alt}
        className="w-7 h-7 object-contain flex-shrink-0"
      />

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
            {branding.app.name.toUpperCase()}
          </AnimatedShinyText>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-[8px] font-black tracking-tight uppercase leading-tight text-blue-400/50 whitespace-nowrap"
          >
            {branding.app.slogan.toUpperCase()}
          </motion.span>
        </motion.div>
      )}
    </motion.button>
  );
}
