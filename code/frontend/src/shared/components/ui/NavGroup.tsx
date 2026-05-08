import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { NavItem } from '../../../core/config/navigation';

interface NavGroupProps {
  item: NavItem;
  collapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  menuState: 'active' | 'partial' | 'inactive';
}

export function NavGroup({ item, collapsed, isExpanded, onToggle, menuState }: NavGroupProps) {
  return (
    <div>
      {!collapsed ? (
        <>
          <button
            onClick={onToggle}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
              ${
                menuState === 'active'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                  : menuState === 'partial'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            <item.icon size={20} />
            <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              {item.name}
            </span>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden ml-4 mt-1 bg-white/[0.03] rounded-xl p-1.5 flex flex-col gap-1"
              >
                {item.subItems?.map((subItem) => (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors
                      ${
                        isActive
                          ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <subItem.icon size={18} />
                    <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                      {subItem.name}
                    </span>
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <>
          <button
            onClick={onToggle}
            title={item.name}
            className={`
              w-full flex items-center justify-center py-3 rounded-xl transition-colors
              ${
                menuState === 'active'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                  : menuState === 'partial'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            <item.icon size={20} />
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-1 bg-white/[0.03] rounded-xl p-1.5 flex flex-col gap-1"
              >
                {item.subItems?.map((subItem) => (
                  <NavLink
                    key={subItem.path}
                    to={subItem.path}
                    title={subItem.name}
                    className={({ isActive }) => `
                      flex items-center justify-center py-2.5 rounded-xl transition-colors
                      ${
                        isActive
                          ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                          : 'text-gray-400 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <subItem.icon size={18} />
                  </NavLink>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
