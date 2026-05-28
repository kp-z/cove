import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/core/stores/settingsStore'
import { Button } from '@/shared/components/ui/button'
import { SettingsCard } from '../common/SettingsCard'
import { SettingsRow, SettingsSelect, SettingsToggle } from '../common/SettingsControls'

export function AppearancePanel() {
  const { t } = useTranslation('settings')
  const { theme, accentColor, compactMode, showAnimations, setTheme, setAccentColor, setCompactMode, setShowAnimations } = useSettingsStore()

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{t('appearance.title')}</h2>

      <SettingsCard
        title={t('appearance.theme.title')}
        description={t('appearance.theme.description')}
      >
        <SettingsRow
          label={t('appearance.theme.label')}
          description={t('appearance.theme.description')}
        >
          <SettingsSelect
            value={theme}
            onChange={(value) => setTheme(value as 'light' | 'dark' | 'auto')}
            options={[
              { value: 'dark', label: t('appearance.theme.dark') },
              { value: 'light', label: t('appearance.theme.light') },
              { value: 'auto', label: t('appearance.theme.auto') },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label={t('appearance.accentColor.label')}
          description={t('appearance.accentColor.description')}
        >
          <div className="flex gap-2">
            {(['blue', 'purple', 'green', 'orange'] as const).map((color) => (
              <Button
                key={color}
                onClick={() => setAccentColor(color)}
                variant="ghost"
                size="icon-sm"
                className={`w-8 h-8 rounded-full hover:scale-110 transition-transform p-0 ${
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
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        title={t('appearance.interface.title')}
        description={t('appearance.interface.description')}
      >
        <SettingsRow
          label={t('appearance.compactMode.label')}
          description={t('appearance.compactMode.description')}
        >
          <SettingsToggle
            checked={compactMode}
            onChange={setCompactMode}
          />
        </SettingsRow>

        <SettingsRow
          label={t('appearance.animations.label')}
          description={t('appearance.animations.description')}
        >
          <SettingsToggle
            checked={showAnimations}
            onChange={setShowAnimations}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
