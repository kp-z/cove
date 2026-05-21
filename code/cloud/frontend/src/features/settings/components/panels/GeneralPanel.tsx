import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/core/stores/settingsStore'
import { SettingsCard } from '../common/SettingsCard'
import { SettingsRow, SettingsSelect } from '../common/SettingsControls'

export function GeneralPanel() {
  const { t } = useTranslation('settings')
  const { language, timezone, defaultProjectView, setLanguage, setTimezone, setDefaultProjectView } = useSettingsStore()

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{t('general.title')}</h2>

      <SettingsCard
        title={t('general.preferences.title')}
        description={t('general.preferences.description')}
      >
        <SettingsRow
          label={t('general.language.label')}
          description={t('general.language.description')}
        >
          <SettingsSelect
            value={language}
            onChange={(value) => setLanguage(value as 'en' | 'zh')}
            options={[
              { value: 'en', label: t('general.language.options.en') },
              { value: 'zh', label: t('general.language.options.zh') },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label={t('general.timezone.label')}
          description={t('general.timezone.description')}
        >
          <SettingsSelect
            value={timezone}
            onChange={setTimezone}
            options={[
              { value: 'auto', label: t('general.timezone.auto') },
              { value: 'utc', label: 'UTC' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label={t('general.projectView.label')}
          description={t('general.projectView.description')}
        >
          <SettingsSelect
            value={defaultProjectView}
            onChange={(value) => setDefaultProjectView(value as 'grid' | 'list')}
            options={[
              { value: 'grid', label: t('general.projectView.grid') },
              { value: 'list', label: t('general.projectView.list') },
            ]}
          />
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}
