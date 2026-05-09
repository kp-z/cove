import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogoProps {
  collapsed: boolean;
  onClick?: () => void;
}

export function Logo({ collapsed, onClick }: LogoProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        h-full w-full flex items-center gap-3 pl-2.5 pr-4 rounded-xl transition-colors duration-500 hover:bg-white/5 group
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon - same size and style as navigation icons */}
      <motion.div
        className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center relative overflow-hidden shadow-lg flex-shrink-0"
        animate={{
          scale: collapsed ? [1, 1.05, 1] : 1,
          rotate: collapsed ? [0, 5, -5, 0] : 0,
        }}
        transition={{
          scale: {
            repeat: collapsed ? Infinity : 0,
            duration: 3,
            ease: 'easeInOut',
          },
          rotate: {
            repeat: collapsed ? Infinity : 0,
            duration: 4,
            ease: 'easeInOut',
          },
        }}
      >
        <motion.div
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut',
          }}
        >
          <Zap
            size={20}
            fill="currentColor"
            className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)] relative z-10"
          />
        </motion.div>
        <div className="absolute inset-0 blur-xl scale-150 rounded-full bg-blue-400/20" />
      </motion.div>

      {/* Text - fades in/out like navigation items */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col text-left"
        >
          <span className="text-sm font-black tracking-wide uppercase italic leading-[0.85] text-white whitespace-nowrap">
            COVE
          </span>
          <span className="text-[8px] font-black tracking-tight uppercase leading-tight text-blue-400/50 whitespace-nowrap">
            AI build You chill
          </span>
        </motion.div>
      )}
    </motion.button>
  );
}
