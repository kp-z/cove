import {
  LayoutDashboard,
  Users,
  GitBranch,
  Target,
  MessagesSquare,
  FolderOpen,
  BookOpen,
  Terminal,
  Zap,
  History,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  id?: string;
  subItems?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Library',
    path: '/library',
    icon: BookOpen,
    id: 'library',
    subItems: [
      {
        name: 'Agents',
        path: '/agents',
        icon: Users,
      },
      {
        name: 'Terminal',
        path: '/terminal',
        icon: Terminal,
      },
    ],
  },
  {
    name: 'Automation',
    path: '/automation',
    icon: Zap,
    id: 'automation',
    subItems: [
      {
        name: 'Workflows',
        path: '/workflows',
        icon: GitBranch,
      },
      {
        name: 'OKR',
        path: '/okr',
        icon: Target,
      },
      {
        name: 'History',
        path: '/history',
        icon: History,
      },
    ],
  },
  {
    name: 'Channels',
    path: '/channel',
    icon: MessagesSquare,
  },
  {
    name: 'Projects',
    path: '/projects',
    icon: FolderOpen,
  },
];
