import { useParams, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { PageShell } from '@/shared/components/layout/PageShell'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { PageContent } from '@/shared/components/layout/PageContent'
import { SettingsSidebar } from './common/SettingsSidebar'
import { SettingsPanel } from './common/SettingsPanel'
import { settingsCategories } from '../config'

export default function SettingsPage() {
  const { category } = useParams<{ category?: string }>()
  const navigate = useNavigate()

  // Validate category exists, redirect to account if invalid or missing
  const isValidCategory = category && settingsCategories.find(c => c.id === category)
  const activeCategory = isValidCategory ? category : 'account'

  useEffect(() => {
    if (!category || !isValidCategory) {
      navigate('/settings/account', { replace: true })
    }
  }, [category, isValidCategory, navigate])

  const handleCategoryChange = (categoryId: string) => {
    navigate(`/settings/${categoryId}`)
  }

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
            onCategoryChange={handleCategoryChange}
          />
          <SettingsPanel activeCategory={activeCategory} />
        </div>
      </PageContent>
    </PageShell>
  )
}
