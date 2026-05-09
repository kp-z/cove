import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Zap,
  FolderOpen,
  Bell,
  X,
  Users,
  Terminal,
  GitBranch,
  Target,
  History,
} from 'lucide-react';
import { Logo } from '../Sidebar/Logo';
import { Navigation } from '../Sidebar/Navigation';

const libraryMenuItems = [
  { name: 'Agents', path: '/agents', icon: Users },
  { name: 'Terminal', path: '/terminal', icon: Terminal },
];

const automationMenuItems = [
  { name: 'Workflows', path: '/workflows', icon: GitBranch },
  { name: 'OKR', path: '/okr', icon: Target },
  { name: 'History', path: '/history', icon: History },
];

function getActiveMenuItem(items: typeof libraryMenuItems, pathname: string) {
  const exact = items.find((item) => pathname === item.path);
  if (exact) return exact;
  const byLen = [...items].sort((a, b) => b.path.length - a.path.length);
  return byLen.find(
    (item) => item.path.length > 1 && pathname.startsWith(item.path + '/')
  );
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 z-50 border-r border-white/5 flex flex-col bg-[#0a0b14]"
          >
            <Logo collapsed={false} />
            <Navigation collapsed={false} />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface SubMenuPopupProps {
  items: typeof libraryMenuItems;
  onClose: () => void;
}

function SubMenuPopup({ items, onClose }: SubMenuPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.9 }}
      transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
      className="absolute bottom-20 left-0 right-0 mx-4 p-2 rounded-2xl backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-2xl bg-white/15"
    >
      <div className="space-y-1">
        {items.map((item, index) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                ${
                  isActive
                    ? 'bg-gradient-to-r from-white/40 to-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'bg-white/5 text-gray-300 hover:bg-white/15 hover:text-white active:scale-[0.98]'
                }
              `}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-sm font-medium">{item.name}</span>
            </NavLink>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function MobileNav() {
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeLibraryItem = getActiveMenuItem(libraryMenuItems, location.pathname);
  const activeAutomationItem = getActiveMenuItem(automationMenuItems, location.pathname);

  const closeAll = () => {
    setActiveMenu(null);
  };

  return (
    <>
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      <nav className="md:hidden fixed left-4 right-4 bottom-[23px] z-50">
        <AnimatePresence>
          {activeMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeAll}
                className="fixed inset-0 bg-black/30 -z-10"
              />
              {activeMenu === 'library' && (
                <SubMenuPopup items={libraryMenuItems} onClose={closeAll} />
              )}
              {activeMenu === 'automation' && (
                <SubMenuPopup items={automationMenuItems} onClose={closeAll} />
              )}
            </>
          )}
        </AnimatePresence>

        <div className="relative">
          <div
            className="absolute top-0 -bottom-[23px] -left-4 -right-4 pointer-events-none rounded-[2.75rem]"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background:
                'linear-gradient(to bottom, rgba(15,17,26,0) 0%, rgba(15,17,26,0.3) 50%, rgba(15,17,26,0.6) 100%)',
            }}
          />

          <div
            className="absolute inset-0 rounded-[2.75rem] overflow-hidden pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          />

          <div className="relative grid grid-cols-5 items-center gap-1 px-2 h-16 rounded-[2.75rem] backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-2xl bg-white/10">
            {/* Dashboard */}
            <NavLink
              to="/"
              onClick={closeAll}
              className={({ isActive }) => `
                relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-[2.75rem] transition-colors duration-300
                ${
                  isActive && !activeMenu
                    ? 'text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }
              `}
            >
              <LayoutDashboard size={20} className="relative z-10" />
              <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
                Dashboard
              </span>
            </NavLink>

            {/* Library */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'library' ? null : 'library')}
              className={`
                relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-[2.75rem] transition-colors duration-300
                ${
                  activeLibraryItem || activeMenu === 'library'
                    ? 'text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }
              `}
            >
              {activeLibraryItem ? (
                <activeLibraryItem.icon size={20} className="relative z-10" />
              ) : (
                <BookOpen size={20} className="relative z-10" />
              )}
              <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
                {activeLibraryItem ? activeLibraryItem.name : 'Library'}
              </span>
            </button>

            {/* Automation */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'automation' ? null : 'automation')}
              className={`
                relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-[2.75rem] transition-colors duration-300
                ${
                  activeAutomationItem || activeMenu === 'automation'
                    ? 'text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }
              `}
            >
              {activeAutomationItem ? (
                <activeAutomationItem.icon size={20} className="relative z-10" />
              ) : (
                <Zap size={20} className="relative z-10" />
              )}
              <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
                {activeAutomationItem ? activeAutomationItem.name : 'Auto'}
              </span>
            </button>

            {/* Projects */}
            <NavLink
              to="/projects"
              onClick={closeAll}
              className={({ isActive }) => `
                relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-[2.75rem] transition-colors duration-300
                ${
                  isActive && !activeMenu
                    ? 'text-white bg-gradient-to-br from-white/40 via-white/20 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'text-gray-400 hover:text-white'
                }
              `}
            >
              <FolderOpen size={20} className="relative z-10" />
              <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
                Projects
              </span>
            </NavLink>

            {/* Notifications */}
            <button
              className="relative flex flex-col items-center justify-center gap-1 p-2 w-full min-w-0 rounded-[2.75rem] transition-colors duration-300 text-gray-400 hover:text-white"
            >
              <Bell size={20} className="relative z-10" />
              <span className="text-[10px] font-medium relative z-10 w-full truncate text-center">
                Alerts
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
