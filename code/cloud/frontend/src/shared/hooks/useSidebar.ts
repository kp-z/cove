import { useState, useEffect } from 'react';

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar-open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggle = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    localStorage.setItem('sidebar-open', String(isOpen));
  }, [isOpen]);

  return { isOpen, toggle };
}
