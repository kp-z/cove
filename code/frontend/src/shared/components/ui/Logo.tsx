import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoProps {
  collapsed: boolean;
  onClick?: () => void;
}

export function Logo({ collapsed, onClick }: LogoProps) {
  return (
    <button
      onClick={onClick}
      className={`
        h-12 flex items-center transition-colors duration-500 hover:bg-white/5 group
        ${collapsed ? 'px-2 justify-center' : 'px-4 gap-3'}
        border-b border-blue-500/20
      `}
    >
      <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center relative overflow-hidden shadow-lg">
        <Zap
          size={16}
          fill="currentColor"
          className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.6)] animate-pulse relative z-10"
        />
        <div className="absolute inset-0 blur-xl scale-150 rounded-full bg-blue-400/20" />
      </div>

      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
          >
            <span className="text-sm font-black tracking-tighter uppercase italic leading-[0.85] text-white">
              Open
            </span>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase leading-tight text-blue-400/80">
              Adventure
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
