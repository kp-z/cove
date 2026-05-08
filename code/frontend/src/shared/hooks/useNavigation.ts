import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { navItems } from '../../core/config/navigation';

export function useNavigation() {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.subItems && item.id) {
        const hasActiveChild = item.subItems.some(
          (sub) =>
            location.pathname === sub.path ||
            (sub.path.length > 1 && location.pathname.startsWith(sub.path + '/'))
        );
        if (hasActiveChild) {
          setExpandedMenus((prev) => new Set(prev).add(item.id!));
        }
      }
    });
  }, [location.pathname]);

  return { expandedMenus, toggleMenu };
}
