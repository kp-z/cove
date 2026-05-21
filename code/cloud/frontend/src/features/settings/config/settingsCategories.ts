import { Settings, Palette, Bell, User, Shield, Cpu, type LucideIcon } from 'lucide-react'

export interface SettingsCategory {
  id: string
  name: string
  icon: LucideIcon
  group: 'user' | 'interface' | 'system'
}

export interface SettingsCategoryGroup {
  id: 'user' | 'interface' | 'system'
  name: string
  categories: SettingsCategory[]
}

export const settingsCategories: SettingsCategory[] = [
  {
    id: 'account',
    name: 'Account',
    icon: User,
    group: 'user',
  },
  {
    id: 'security',
    name: 'Security',
    icon: Shield,
    group: 'user',
  },
  {
    id: 'general',
    name: 'General',
    icon: Settings,
    group: 'interface',
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: Palette,
    group: 'interface',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: Bell,
    group: 'interface',
  },
  {
    id: 'adapters',
    name: 'Adapters',
    icon: Cpu,
    group: 'system',
  },
]

export const settingsCategoryGroups: SettingsCategoryGroup[] = [
  {
    id: 'user',
    name: 'User Settings',
    categories: settingsCategories.filter(c => c.group === 'user'),
  },
  {
    id: 'interface',
    name: 'Interface Settings',
    categories: settingsCategories.filter(c => c.group === 'interface'),
  },
  {
    id: 'system',
    name: 'System Settings',
    categories: settingsCategories.filter(c => c.group === 'system'),
  },
]
