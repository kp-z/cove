import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/core/stores/settingsStore'
import { SettingsSection, SettingsItem } from '../common/SettingsItem'
import { FormSelect } from '@/shared/components/ui/FormControls'

export function GeneralPanel() {
  const { t } = useTranslation('settings')
  const { language, timezone, defaultProjectView, setLanguage, setTimezone, setDefaultProjectView } = useSettingsStore()

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">{t('general.title')}</h2>

      <SettingsSection
        title={t('general.language.label')}
        description={t('general.language.description')}
      >
        <SettingsItem
          label={t('general.language.label')}
          description={t('general.language.description')}
        >
          <FormSelect
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
          >
            <option value="en">{t('general.language.options.en')}</option>
            <option value="zh">{t('general.language.options.zh')}</option>
          </FormSelect>
        </SettingsItem>

        <SettingsItem
          label={t('general.timezone.label')}
          description={t('general.timezone.description')}
        >
          <FormSelect
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            <option value="auto">{t('general.timezone.auto')}</option>
            <option value="utc">UTC</option>
          </FormSelect>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title={t('general.projectView.label')}
        description={t('general.projectView.description')}
      >
        <SettingsItem
          label={t('general.projectView.label')}
          description={t('general.projectView.description')}
        >
          <FormSelect
            value={defaultProjectView}
            onChange={(e) => setDefaultProjectView(e.target.value as 'grid' | 'list')}
          >
            <option value="grid">{t('general.projectView.grid')}</option>
            <option value="list">{t('general.projectView.list')}</option>
          </FormSelect>
        </SettingsItem>
      </SettingsSection>
    </div>
  )
}
