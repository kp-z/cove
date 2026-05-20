import { useState } from 'react'
import { PageShell } from '@/shared/components/layout/PageShell'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { PageContent } from '@/shared/components/layout/PageContent'
import { SettingsSidebar } from './common/SettingsSidebar'
import { SettingsPanel } from './common/SettingsPanel'

export default function SettingsPage() {
  const [activeCategory, setActiveCategory] = useState('general')

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        subtitle="Manage your preferences and account settings"
      />
      <PageContent>
        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          <SettingsSidebar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          <SettingsPanel activeCategory={activeCategory} />
        </div>
      </PageContent>
    </PageShell>
  )
}
