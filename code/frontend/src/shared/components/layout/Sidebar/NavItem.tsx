import { NavLink } from 'react-router-dom';
import type { NavItem as NavItemType } from '../../../../core/config/navigation';

interface NavItemProps {
  item: NavItemType;
  collapsed: boolean;
}

export function NavItem({ item, collapsed }: NavItemProps) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `
        flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
        ${
          isActive
            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }
      `}
      title={collapsed ? item.name : undefined}
    >
      <item.icon size={20} className="shrink-0" />
      {!collapsed && (
        <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {item.name}
        </span>
      )}
    </NavLink>
  );
}
