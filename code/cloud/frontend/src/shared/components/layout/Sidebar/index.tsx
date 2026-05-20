import { motion, useAnimationControls } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Logo } from './Logo';
import { Navigation } from './Navigation';
import { CollapseButton } from './CollapseButton';
import { useEffect } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const controls = useAnimationControls();

  useEffect(() => {
    controls.start({
      width: collapsed ? 80 : 192,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      },
    });
  }, [collapsed, controls]);

  return (
    <motion.aside
      initial={false}
      animate={controls}
      className="bg-[#0a0b14] border-r border-white/5 flex flex-col relative overflow-hidden"
      style={{
        boxShadow: collapsed
          ? '4px 0 24px rgba(0, 0, 0, 0.1)'
          : '8px 0 32px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={false}
        animate={{
          background: collapsed
            ? 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 70%)'
            : 'radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />

      <motion.div
        initial={false}
        animate={{
          opacity: collapsed ? 0.95 : 1,
        }}
        transition={{ duration: 0.3 }}
        className="relative z-10 flex flex-col h-full"
      >
        <div className="h-12 min-h-12 shrink-0 box-border flex items-center px-4 border-b border-blue-500/20">
          <Logo collapsed={collapsed} />
        </div>
        <Navigation collapsed={collapsed} onToggleSidebar={onToggle} />

        {/* Bottom section: Settings + Collapse button */}
        <motion.div
          className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-1 p-4"
          initial={false}
          animate={{
            y: 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.05,
          }}
        >
          {/* Settings */}
          <NavLink
            to="/settings"
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 leading-5
              ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 shadow-lg shadow-blue-500/10"
                  : "text-gray-400 hover:bg-white/5 hover:text-white hover:scale-105"
              }
            `}
          >
            <motion.div
              className="shrink-0"
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <Settings size={20} />
            </motion.div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="font-medium"
              >
                Settings
              </motion.span>
            )}
          </NavLink>

          {/* Collapse/Expand button */}
          <CollapseButton collapsed={collapsed} onClick={onToggle} />
        </motion.div>
      </motion.div>
    </motion.aside>
  );
}
