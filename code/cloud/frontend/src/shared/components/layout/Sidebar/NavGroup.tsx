import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { NavItem } from '../../../../core/config/navigation';

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
      <button
        onClick={onToggle}
        title={collapsed ? item.name : undefined}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors leading-5
          ${collapsed ? 'justify-center' : ''}
          ${
            menuState === 'active'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
              : menuState === 'partial'
              ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }
        `}
      >
        <item.icon size={20} className="shrink-0" />
        {!collapsed && (
          <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            {item.name}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-1 bg-white/[0.03] rounded-xl py-1.5 flex flex-col gap-2"
          >
            {item.subItems?.map((subItem) => (
              <NavLink
                key={subItem.path}
                to={subItem.path}
                title={collapsed ? subItem.name : undefined}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-colors leading-5
                  ${collapsed ? 'justify-center' : ''}
                  ${
                    isActive
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <subItem.icon size={20} className="shrink-0" />
                {!collapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {subItem.name}
                  </span>
                )}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
