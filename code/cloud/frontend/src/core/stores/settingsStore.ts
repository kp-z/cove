import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/core/i18n'

export type Language = 'en' | 'zh'
export type Theme = 'light' | 'dark' | 'auto'
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange'
export type ProjectView = 'grid' | 'list'

interface SettingsState {
  // General
  language: Language
  timezone: string
  defaultProjectView: ProjectView

  // Appearance
  theme: Theme
  accentColor: AccentColor
  compactMode: boolean
  showAnimations: boolean

  // Actions
  setLanguage: (language: Language) => void
  setTimezone: (timezone: string) => void
  setDefaultProjectView: (view: ProjectView) => void
  setTheme: (theme: Theme) => void
  setAccentColor: (color: AccentColor) => void
  setCompactMode: (enabled: boolean) => void
  setShowAnimations: (enabled: boolean) => void
  reset: () => void
}

const defaultSettings = {
  language: 'en' as Language,
  timezone: 'auto',
  defaultProjectView: 'grid' as ProjectView,
  theme: 'dark' as Theme,
  accentColor: 'blue' as AccentColor,
  compactMode: false,
  showAnimations: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setLanguage: (language) => {
        i18n.changeLanguage(language)
        set({ language })
      },

      setTimezone: (timezone) => set({ timezone }),
      setDefaultProjectView: (view) => set({ defaultProjectView: view }),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (color) => set({ accentColor: color }),
      setCompactMode: (enabled) => set({ compactMode: enabled }),
      setShowAnimations: (enabled) => set({ showAnimations: enabled }),
      reset: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
      version: 1,
    }
  )
)
