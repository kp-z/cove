import { useLocation } from 'react-router-dom';
import { navItems } from '../../../../core/config/navigation';
import { useNavigation } from '../../../hooks/useNavigation';
import { NavItem } from './NavItem';
import { NavGroup } from './NavGroup';

interface NavigationProps {
  collapsed: boolean;
  onToggleSidebar?: () => void;
}

export function Navigation({ collapsed, onToggleSidebar }: NavigationProps) {
  const location = useLocation();
  const { expandedMenus, toggleMenu } = useNavigation();

  return (
    <nav className="flex flex-col gap-2 flex-1 p-4 overflow-y-auto">
      {navItems.map((item) => {
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedMenus.has(item.id || '');

        if (hasSubItems) {
          const isDirectActive = location.pathname === item.path;
          const hasActiveChild = item.subItems?.some((sub) => {
            return (
              location.pathname === sub.path ||
              (sub.path.length > 1 && location.pathname.startsWith(sub.path + '/'))
            );
          });

          const menuState = isDirectActive ? 'active' : hasActiveChild ? 'partial' : 'inactive';

          return (
            <NavGroup
              key={item.path}
              item={item}
              collapsed={collapsed}
              isExpanded={isExpanded}
              onToggle={() => toggleMenu(item.id!)}
              onToggleSidebar={onToggleSidebar}
              menuState={menuState}
            />
          );
        }

        return <NavItem key={item.path} item={item} collapsed={collapsed} />;
      })}
    </nav>
  );
}
