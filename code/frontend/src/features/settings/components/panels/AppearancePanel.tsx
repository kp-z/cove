import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/core/stores/settingsStore'
import { SettingsSection, SettingsItem } from '../common/SettingsItem'

export function AppearancePanel() {
  const { t } = useTranslation('settings')
  const { theme, accentColor, compactMode, showAnimations, setTheme, setAccentColor, setCompactMode, setShowAnimations } = useSettingsStore()

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{t('appearance.title')}</h2>

      <SettingsSection
        title={t('appearance.theme.label')}
        description={t('appearance.theme.description')}
      >
        <SettingsItem
          label={t('appearance.theme.label')}
          description={t('appearance.theme.description')}
        >
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
            className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-white/40"
          >
            <option value="dark">{t('appearance.theme.dark')}</option>
            <option value="light">{t('appearance.theme.light')}</option>
            <option value="auto">{t('appearance.theme.auto')}</option>
          </select>
        </SettingsItem>

        <SettingsItem
          label={t('appearance.accentColor.label')}
          description={t('appearance.accentColor.description')}
        >
          <div className="flex gap-2">
            {(['blue', 'purple', 'green', 'orange'] as const).map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                className={`w-8 h-8 rounded-full hover:scale-110 transition-transform ${
                  accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                }`}
                style={{
                  backgroundColor:
                    color === 'blue' ? '#3b82f6' :
                    color === 'purple' ? '#a855f7' :
                    color === 'green' ? '#22c55e' :
                    '#f97316'
                }}
              />
            ))}
          </div>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title={t('appearance.compactMode.label')}
        description={t('appearance.compactMode.description')}
      >
        <SettingsItem
          label={t('appearance.compactMode.label')}
          description={t('appearance.compactMode.description')}
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
            />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingsItem>

        <SettingsItem
          label={t('appearance.animations.label')}
          description={t('appearance.animations.description')}
        >
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showAnimations}
              onChange={(e) => setShowAnimations(e.target.checked)}
            />
            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </SettingsItem>
      </SettingsSection>
    </div>
  )
}
