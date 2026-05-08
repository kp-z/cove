import { motion } from 'framer-motion';
import { Logo } from '../ui/Logo';
import { Navigation } from './Navigation';
import { UserSection } from './UserSection';
import { CollapseButton } from '../ui/CollapseButton';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 192 }}
      transition={{ duration: 0.2 }}
      className="bg-[#0a0b14] border-r border-white/5 flex flex-col relative"
    >
      <Logo collapsed={collapsed} />
      <CollapseButton collapsed={collapsed} onClick={onToggle} />
      <Navigation collapsed={collapsed} />
      <UserSection collapsed={collapsed} />
    </motion.aside>
  );
}
