import { motion } from 'framer-motion';
import coveLogo from '@/assets/cove-logo.svg';

interface LogoProps {
  collapsed: boolean;
  onClick?: () => void;
}

export function Logo({ collapsed, onClick }: LogoProps) {
  return (
    <motion.button
      onClick={onClick}
      className="h-[46px] w-full flex items-center justify-center gap-3 rounded-xl transition-colors duration-500 hover:bg-white/5 group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <img
        src={coveLogo}
        alt="Cove"
        className="w-5 h-5 object-contain flex-shrink-0"
      />

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col text-left items-start"
        >
          <span className="text-sm font-black tracking-wide uppercase italic leading-[0.85] text-white whitespace-nowrap">
            COVE
          </span>
          <span className="text-[8px] font-black tracking-tight uppercase leading-tight text-blue-400/50 whitespace-nowrap">
            AI BUILD SPACE
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}
