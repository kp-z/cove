import { Settings, Palette, Bell, User, Shield, type LucideIcon } from 'lucide-react'

export interface SettingsCategory {
  id: string
  name: string
  icon: LucideIcon
}

export const settingsCategories: SettingsCategory[] = [
  {
    id: 'general',
    name: 'General',
    icon: Settings,
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: Palette,
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
  },
  {
    id: 'account',
    name: 'Account',
    icon: User,
  },
  {
    id: 'security',
    name: 'Security',
    icon: Shield,
  },
]
