import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CollapseButtonProps {
  collapsed: boolean;
  onClick: () => void;
}

export function CollapseButton({ collapsed, onClick }: CollapseButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
        text-gray-400 hover:bg-white/5 hover:text-white hover:scale-105 relative overflow-hidden
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />

      <motion.div
        className="shrink-0"
        animate={{
          rotate: collapsed ? [0, -10, 10, 0] : 0,
        }}
        transition={{
          duration: 0.5,
          ease: 'easeInOut',
        }}
      >
        {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
      </motion.div>

      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="font-medium relative z-10"
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </motion.span>
      )}
    </motion.button>
  );
}
